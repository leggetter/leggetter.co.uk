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
import { setPieceFor } from '../../src/games/deadball/core/setpiece.ts';
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
  /**
   * How fast one address may mint rooms.
   *
   * There is no account and no key here - the room id *is* the key - so an
   * address is the only thing to count by, and Cloudflare's own advice is to
   * prefer a stable identifier over an IP. There isn't one. What this catches
   * is the realistic case, which is one machine in a loop; anybody spread
   * across addresses walks past it, and so does anybody in a different
   * Cloudflare location, because the counters are per-location rather than
   * global. A speed bump, named as one.
   *
   * Optional, and absent means no limit, which is the same bargain `RESULTS`
   * makes and for the same reason: a binding that has gone missing should cost
   * the speed bump, not the game. Two brothers should not be unable to play
   * because a piece of configuration is wrong.
   */
  MINTING?: RateLimit;
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
   * Written once, whatever happened.
   *
   * A completed match that keeps being polled is still one match, and a match
   * that completes and *then* times out is still one match. The flag is what
   * stops the alarm writing a second row for a game that already reported.
   */
  private recorded = false;

  /** When the room opened, for how long a shootout actually takes. */
  private opened = Date.now();

  /**
   * What ties a game's rows together.
   *
   * **Not the room id.** The room id is the invite link, and a link belongs in
   * a message to somebody rather than in a table - even one that expires in an
   * hour. This is random, means nothing outside these rows, and exists only so
   * twelve kicks can be recognised as one shootout.
   */
  private key = '';

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

    /*
      These two have to survive an eviction with the room, and it took writing
      the alarm to see why.

      `recorded` in memory only means an evicted room wakes up believing it has
      never reported - so the TTL alarm writes a second row, marked abandoned,
      for a game that finished an hour ago. And `opened` in memory only means
      the duration of every evicted game is measured from whenever it happened
      to be woken, which is a number that looks plausible and is nonsense.
    */
    const meta = await this.ctx.storage.get<{
      recorded: boolean;
      opened: number;
      key: string;
    }>('meta');
    if (meta) {
      this.recorded = meta.recorded;
      this.opened = meta.opened;
      this.key = meta.key;
    }
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
    if (!this.room) return;
    await this.ctx.storage.put('room', this.room);
    await this.ctx.storage.put('meta', {
      recorded: this.recorded,
      opened: this.opened,
      key: this.key,
    });
  }

  /** Open the room. Called once, by whoever minted the id. */
  async create(settings: RoomSettings, seed: number): Promise<void> {
    await this.wake();
    if (this.room) return;
    this.room = openRoom(settings, seed);
    this.opened = Date.now();
    this.recorded = false;
    this.key = crypto.randomUUID();
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
    for (const { message: out } of handled.out) {
      if (out.kind === 'shot') this.recordShot(before, out);
    }

    const wasRecorded = this.recorded;
    this.record();
    // Saved after recording, not before, or the flag that stops a second row
    // never reaches storage and an eviction undoes it.
    if (message.kind !== 'ping' || before !== this.room || this.recorded !== wasRecorded) {
      await this.remember();
    }

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

    this.write(winner);
  }

  /**
   * One row per kick.
   *
   * **The objection to this was weaker than it looked.** The shot log is local
   * only and deliberately never sent anywhere - but that is a rule about a
   * *browser's* log, and in a two-device game the room has already been sent
   * every shot, because it is the thing that resolves them. Nothing new
   * crosses a wire here. The only question was whether to keep what is already
   * in memory, and keeping it answers things the spec has had open for
   * phases: whether everybody still shoots at the same spot, whether the three
   * shot styles get used, whether `dip` earns its place, whether a wall is
   * beatable by people rather than by a simulation.
   *
   * Still no names, and still nothing that identifies a person: which side,
   * never who. Read off the message on its way out rather than by reaching
   * into the room, so `room.ts` keeps not knowing that analytics exist.
   *
   * **It only sees two-device games.** Solo and hotseat never touch a server,
   * so this is a sample of the rarest way the game is played, and any
   * conclusion drawn from it should say so.
   */
  private recordShot(before: Room, shot: Extract<Inbound, { kind: 'shot' }>): void {
    if (!this.env.RESULTS) return;
    const { settings, first } = before;
    const index = before.match.shotIndex;
    const piece = setPieceFor(shot.seed, index, settings.discipline, true);
    const takerSeat = before.match.taker === 0 ? first : 1 - first;

    this.env.RESULTS.writeDataPoint({
      indexes: [settings.discipline],
      blobs: [
        this.key,
        'kick',
        shot.outcome,
        piece.penalty ? 'penalty' : piece.id,
        shot.input.style ?? 'plain',
      ],
      doubles: [
        index,
        shot.input.aim.x,
        shot.input.aim.y,
        shot.input.power,
        shot.input.curve,
        shot.input.timing,
        piece.wallCount,
        // Which seat took it, so "do hosts win more" can be asked of kicks as
        // well as of results. A seat, never a person.
        takerSeat,
      ],
    });
  }

  /**
   * The row itself.
   *
   * `winner` is 'host', 'guest', 'draw' or 'abandoned', and the last of those
   * is the reason this is a separate method - see `alarm`.
   */
  private write(winner: string): void {
    if (!this.room) return;
    const { match, settings, diverged } = this.room;
    const first = this.room.first;
    this.env.RESULTS?.writeDataPoint({
      indexes: [settings.discipline],
      blobs: [this.key, 'result', winner, settings.discipline],
      doubles: [
        match.outcomes.length,
        // Derived rather than stored: sudden death is a question you ask of a
        // match, not a flag it carries.
        inSuddenDeath(match) ? 1 : 0,
        match.scores[first === 0 ? 0 : 1],
        match.scores[first === 0 ? 1 : 0],
        // How often a client's own answer differed from this one. Near zero is
        // the expectation; anything else means somebody is on a stale build.
        diverged,
        Math.round((Date.now() - this.opened) / 1000),
        // How many seats were ever filled. An abandoned game that nobody
        // joined is a different failure from one somebody walked out of.
        this.room.seats.filter(Boolean).length,
      ],
    });
  }

  /**
   * The hour is up.
   *
   * **A game that never finished still counts.** Recording only completions
   * would have meant the numbers described games that went well rather than
   * games - and "how many get started and abandoned" is the more useful
   * question, for a link somebody has to be bothered to open.
   *
   * So a room that reaches its TTL without completing writes a row saying so,
   * with however many kicks it managed and how many seats were ever filled:
   * nobody joined is a different failure from somebody walking out at 2-2.
   */
  async alarm(): Promise<void> {
    await this.wake();
    if (!this.recorded && this.room) {
      this.recorded = true;
      this.write('abandoned');
    }
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
      // Only minting is limited. Not the message endpoint below it: a client
      // polls every two seconds, so two players in one house are sixty
      // requests a minute from a single address before anybody has done
      // anything wrong, and a limit loose enough to allow a few households is
      // too loose to be worth having. A room, by contrast, is one per game.
      const from = request.headers.get('cf-connecting-ip') ?? 'unknown';
      const { success } = (await env.MINTING?.limit({ key: from })) ?? { success: true };
      if (!success) return json({ error: 'Too many new games at once. Try again in a minute.' }, 429);

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
