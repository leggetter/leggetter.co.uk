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

import { inSuddenDeath } from '../../src/games/deadball/core/match.ts';
import { handle, openRoom, type Room } from '../../src/games/deadball/net/room.ts';
import type { Inbound, Outbound, RoomSettings, Side } from '../../src/games/deadball/net/Transport.ts';

interface Env {
  ROOMS: DurableObjectNamespace<RoomObject>;
  /**
   * One row per finished shootout.
   *
   * Optional on purpose. Analytics Engine bindings do not exist in local
   * development, and a game that will not start because nobody is counting it
   * would be a poor trade.
   */
  RESULTS?: AnalyticsEngineDataset;
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

  /** Written once. A completed match that keeps being polled is still one match. */
  private recorded = false;

  /** When the room opened, for how long a shootout actually takes. */
  private opened = Date.now();

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
    this.opened = Date.now();
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
    this.record();

    const mine = ([0, 1] as Side[]).find((side) => this.room?.seats[side]?.token === token);
    if (mine === undefined) {
      // Not seated: hand back whatever the room said about it and nothing else.
      return handled.out.filter((m) => m.to === null).map((m) => m.message);
    }
    const waiting = this.post[mine];
    this.post[mine] = { token, messages: [] };
    return waiting?.token === token ? waiting.messages : [];
  }

  /**
   * What happened, once, when it is over.
   *
   * **Outcomes, never names.** No team name, no token, no room id and no kit
   * goes in here. The rule was written down before there was anywhere to break
   * it, in the privacy section of docs/deadball-two-devices.md, and the reason
   * is that names are the one thing this project has protected from the start -
   * the naming form carries `ph-no-capture` and the shot log records a side
   * rather than a name with a test to keep it so.
   *
   * What is here answers the question that made analytics worth having at all:
   * **do hosts win more?** If they do, the coin flip earned its place; if they
   * do not, it was worth knowing that too.
   *
   * Written from the room rather than from a browser, because the room is the
   * thing that actually resolved every shot. A client reporting its own result
   * is a client being asked to mark its own homework.
   */
  private record(): void {
    if (this.recorded || !this.room || this.room.match.phase !== 'complete') return;
    this.recorded = true;

    const { match, settings, first, diverged } = this.room;
    // Scores are by side of the tie; the coin says which seat each was.
    const hostScore = match.scores[first === 0 ? 0 : 1];
    const guestScore = match.scores[first === 0 ? 1 : 0];
    const winner = hostScore === guestScore ? 'draw' : hostScore > guestScore ? 'host' : 'guest';

    this.env.RESULTS?.writeDataPoint({
      indexes: [settings.discipline],
      blobs: [settings.discipline, winner],
      doubles: [
        match.outcomes.length,
        // Derived rather than stored: sudden death is a question you ask of a
        // match, not a flag it carries.
        inSuddenDeath(match) ? 1 : 0,
        hostScore,
        guestScore,
        // How often a client's own answer differed from this one. Near zero is
        // the expectation; anything else means somebody is on a stale build.
        diverged,
        Math.round((Date.now() - this.opened) / 1000),
      ],
    });
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
