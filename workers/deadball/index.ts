/**
 * The Dead Ball game server.
 *
 * One Durable Object per room, reached by the room's id. The object holds the
 * room and a queue of messages for each seat; clients poll, which doubles as
 * the heartbeat that tells each of them whether the other is still there.
 *
 * **Almost none of the thinking is here.** `net/room.ts` decides everything -
 * who is seated, whose turn it is, whether a shot went in, and what the taker
 * is allowed to know - and it has been running in a browser against two tabs
 * since before this file existed. This is the part that moves bytes.
 *
 * That is the whole point of having built the same-browser transport first:
 * the protocol arrived here already debugged.
 */

import { DurableObject } from 'cloudflare:workers';

import { handle, openRoom, type Room } from '../../src/games/deadball/net/room.ts';
import type { Inbound, Outbound, RoomSettings, Side } from '../../src/games/deadball/net/Transport.ts';

interface Env {
  ROOMS: DurableObjectNamespace<RoomObject>;
}

/** An hour. Generous for a shootout and short enough that nothing piles up. */
const ROOM_TTL_MS = 60 * 60 * 1000;

/** Kept, because it is what a player's own messages are addressed to. */
interface Waiting {
  token: string;
  messages: Inbound[];
}

export class RoomObject extends DurableObject<Env> {
  /**
   * The room, in memory.
   *
   * Durable Objects keep this between requests for as long as the object is
   * alive, and two people polling every couple of seconds keep it alive for
   * the length of a game. Storage is for surviving an eviction, not for being
   * the source of truth.
   */
  private room: Room | null = null;

  /** One queue per seat, drained by whoever polls for it. */
  private post: [Waiting | null, Waiting | null] = [null, null];

  private loaded = false;

  /**
   * Read the room back after an eviction.
   *
   * Only the room, not the queues: a message nobody collected is a message
   * whose client has gone away, and the next `state` tells them everything
   * anyway.
   */
  private async wake(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    this.room = (await this.ctx.storage.get<Room>('room')) ?? null;
  }

  /**
   * Write it down, when something actually happened.
   *
   * **Not on every poll.** A `put` is billed as a row written and the free
   * plan allows a hundred thousand a day; two clients polling every two
   * seconds would spend eight thousand of them an hour doing nothing. Saved
   * when the room changes, which is a handful of times per kick.
   */
  private async remember(): Promise<void> {
    if (this.room) await this.ctx.storage.put('room', this.room);
  }

  /** Open the room. Called once, by whoever minted the id. */
  async create(settings: RoomSettings, seed: number): Promise<void> {
    await this.wake();
    if (this.room) return;
    this.room = openRoom(settings, seed);
    await this.remember();
    // Nothing accumulates: an abandoned room deletes itself rather than
    // waiting to be noticed.
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  /** What this room is, for somebody deciding whether to join it. */
  async peek(): Promise<{ settings: RoomSettings; host: unknown } | null> {
    await this.wake();
    const host = this.room?.seats[0]?.team;
    return this.room && host ? { settings: this.room.settings, host } : null;
  }

  /**
   * One message in, everything waiting for that client out.
   *
   * The reply carries the sender's own queue, so a poll is both "I am still
   * here" and "what have I missed" in one round trip.
   */
  async speak(token: string, message: Outbound): Promise<Inbound[]> {
    await this.wake();
    if (!this.room) return [{ kind: 'error', reason: 'That game is not there.', fatal: true }];

    const before = this.room;
    const handled = handle(this.room, token, message, Date.now());
    this.room = handled.room;

    for (const { to, message: out } of handled.out) {
      for (const side of to === null ? ([0, 1] as Side[]) : [to]) {
        const seat = this.room.seats[side];
        if (!seat) continue;
        const queue = this.post[side];
        if (queue?.token === seat.token) queue.messages.push(out);
        else this.post[side] = { token: seat.token, messages: [out] };
      }
    }

    // A ping that changed nothing is not worth a write.
    if (message.kind !== 'ping' || before !== this.room) await this.remember();

    const mine = ([0, 1] as Side[]).find((side) => this.room?.seats[side]?.token === token);
    if (mine === undefined) {
      // Not seated: hand back whatever the room said about it and nothing else.
      return handled.out.filter((m) => m.to === null).map((m) => m.message);
    }
    const waiting = this.post[mine];
    this.post[mine] = { token, messages: [] };
    return waiting?.token === token ? waiting.messages : [];
  }

  /** The hour is up. */
  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
    this.room = null;
    this.post = [null, null];
  }
}

/** Anything else is not a room id, and never becomes one. */
const ID = /^[0-9A-HJKMNP-TV-Z]{8}$/;

/**
 * The page is on the site and this is not, so everything needs these.
 *
 * Open to any origin deliberately: there is nothing here worth protecting by
 * origin. A room id is the only key, it is unguessable, and knowing one gets
 * you a seat in a penalty game - which is what a link is *for*.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
} as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    // POST /room  -> mint one
    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'room') {
      const body = (await request.json().catch(() => null)) as {
        id?: string;
        settings?: RoomSettings;
        seed?: number;
      } | null;
      const id = body?.id ?? '';
      if (!ID.test(id) || !body?.settings) return json({ error: 'Bad room.' }, 400);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(id));
      await stub.create(body.settings, (body.seed ?? 1) | 0);
      return json({ id });
    }

    if (parts.length !== 2 || parts[0] !== 'room' || !ID.test(parts[1] ?? '')) {
      return json({ error: 'Not a room.' }, 404);
    }
    const stub = env.ROOMS.get(env.ROOMS.idFromName(parts[1] as string));

    // GET /room/:id -> what am I being invited to
    if (request.method === 'GET') {
      const seen = await stub.peek();
      return seen ? json(seen) : json({ error: 'No such game.' }, 404);
    }

    // POST /room/:id -> a message, and everything waiting
    if (request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as {
        token?: string;
        message?: Outbound;
      } | null;
      if (!body?.token || !body.message) return json({ error: 'Bad message.' }, 400);
      return json({ messages: await stub.speak(body.token, body.message) });
    }

    return json({ error: 'No.' }, 405);
  },
};
