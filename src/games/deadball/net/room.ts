/**
 * The room: who is in it, whose turn it is, and what the keeper picked.
 *
 * This is the half that will eventually live in a Durable Object, and it is
 * deliberately not in one yet. It is a pure function of its state and one
 * message - no transport, no fetch, no storage, no clock it reads for itself -
 * so the same file runs behind a `BroadcastChannel` today and behind a Worker
 * later, and the protocol gets debugged before any infrastructure exists.
 *
 * ## The one rule it defends
 *
 * Not cheating in general. Two people who know each other playing a penalty
 * game do not need an anti-cheat system. What has to hold is that **the keeper
 * commits before the taker sees anything and cannot revise afterwards** - and
 * across two devices that is solved by the room simply not telling anybody.
 * The dive arrives here and stays here. The taker is told a boolean.
 *
 * ## Why it resolves the shot itself
 *
 * A client sends what its own simulation made of the shot. The room works it
 * out again, from `core/`, and its answer is the one that counts. That is only
 * possible because `core/` is platform-free - the same reducer, the same
 * physics, the same seeded RNG - which `core/portable.test.ts` asserts on every
 * run. A disagreement is logged rather than argued with, because the realistic
 * cause is one side running a stale bundle rather than arithmetic drifting.
 */

import { KEEPERS } from '../content/keepers.js';
import { NO_EVENTS } from '../core/events.ts';
import { advance, createFlight } from '../core/flight.ts';
import { initialMatch, reduce, type MatchState } from '../core/match.ts';
import { createRng, shotSeed } from '../core/rng.ts';
import { setPieceFor } from '../core/setpiece.ts';
import { resolveShot } from '../core/shot.ts';
import type { Dive, KeeperProfile, Outcome, Player } from '../core/types.ts';
import { buildWall } from '../core/wall.ts';
import { STEP } from '../core/units.ts';
import type { Inbound, Outbound, RoomSettings, Side, TeamOnTheWire } from './Transport.ts';
import { OFFLINE_AFTER_MS } from './Transport.ts';

/** Two, and the third person who opens the link is turned away. */
export const SEATS = 2;

export interface Seat {
  token: string;
  team: TeamOnTheWire;
  /** When this seat was last heard from, in the room's own clock. */
  seen: number;
}

export interface Room {
  settings: RoomSettings;
  seats: [Seat | null, Seat | null];
  match: MatchState;
  /**
   * Where the keeper went, held and never broadcast.
   *
   * The whole reason the room is an authority rather than a relay. There is no
   * commit-reveal hashing here and none is needed: the room does not tell you,
   * which is sufficient, because it is the thing both players already trust to
   * hold the score.
   */
  dive: Dive | null;
  /** Who shoots first. Flipped, shown to both, chosen by nobody. */
  first: Side;
  /** Message ids already applied, so a retry cannot fire a second penalty. */
  applied: string[];
  /** Divergences between a client's answer and this one. Kept, not acted on. */
  diverged: number;
}

/** What handling a message produced: a new room, and what to send where. */
export interface Handled {
  room: Room;
  /** `to` is null for everybody. */
  out: { to: Side | null; message: Inbound }[];
}

const KEEPER: KeeperProfile = (KEEPERS.find((k) => k.id === 'steady') ??
  KEEPERS[0]) as KeeperProfile;

/**
 * Open a room.
 *
 * The seed is passed in rather than taken from a clock, because everything
 * downstream of it - the spots, the walls, the aim error, the coin - has to be
 * reproducible from the room's own record.
 */
export function openRoom(settings: RoomSettings, seed: number): Room {
  return {
    settings,
    seats: [null, null],
    match: initialMatch(seed, settings.shots, 'remote', settings.discipline),
    dive: null,
    // A coin, from the seed. Nobody is asked, because "winner chooses" adds an
    // interaction at the moment both people are finally ready to play, and one
    // of them would be watching the other decide.
    first: createRng(shotSeed(seed, 0x5eed)).next() < 0.5 ? 0 : 1,
    applied: [],
    diverged: 0,
  };
}

/** Which seat this token is sitting in, if any. */
const seatOf = (room: Room, token: string): Side | null =>
  room.seats[0]?.token === token ? 0 : room.seats[1]?.token === token ? 1 : null;

/** Whose turn it is to take one. */
export const takerSide = (room: Room): Side =>
  (room.match.taker === 0 ? room.first : (1 - room.first)) as Side;

/** Whoever is not taking it. */
export const keeperSide = (room: Room): Side => (1 - takerSide(room)) as Side;

/**
 * The match, with the one field nobody may see taken out.
 *
 * `MatchState` carries `dive`, because on one device the reducer is the thing
 * that remembers where the keeper went. Sending the state whole therefore sent
 * the dive to the taker - **the exact thing this entire design exists to
 * prevent** - and it did it in the first version of this file. A test caught
 * it within a minute of being written, which is the best argument for having
 * written it.
 *
 * Redacted for *both* sides rather than only the taker. The keeper's client
 * knows where it pointed because it pointed there; nothing needs to be sent
 * back to tell it. A rule with no per-side branch in it is a rule with nowhere
 * for a mistake to hide.
 */
function published(match: MatchState): Omit<MatchState, 'dive'> {
  const { dive: _sealed, ...rest } = match;
  return rest;
}

/** Everything a client is allowed to know. */
function stateFor(room: Room, you: Side, now: number): Inbound {
  const other = room.seats[1 - you];
  return {
    kind: 'state',
    match: published(room.match),
    you,
    teams: [
      room.seats[0]?.team ?? emptyTeam(),
      room.seats[1]?.team ?? emptyTeam(),
    ] as [TeamOnTheWire, TeamOnTheWire],
    first: room.first,
    together: other !== null && now - other.seen < OFFLINE_AFTER_MS,
    // A boolean. Never the position.
    dived: room.dive !== null,
  };
}

const emptyTeam = (): TeamOnTheWire => ({ name: '', squad: [], kit: { kit: '', trim: '' } });

/** Tell both seats where things stand. */
const broadcast = (room: Room, now: number): Handled['out'] =>
  ([0, 1] as Side[])
    .filter((side) => room.seats[side] !== null)
    .map((side) => ({ to: side, message: stateFor(room, side, now) }));

const refuse = (room: Room, reason: string, fatal = true): Handled => ({
  room,
  out: [{ to: null, message: { kind: 'error', reason, fatal } }],
});

/**
 * One message in, a new room and some messages out.
 *
 * `now` is passed rather than read: a room that reads a clock cannot be
 * replayed, and replay is how a disagreement between two devices would ever be
 * diagnosed.
 */
export function handle(room: Room, from: string, message: Outbound, now: number): Handled {
  if (message.kind === 'join') return join(room, message, now);

  const side = seatOf(room, from);
  if (side === null) return refuse(room, 'You are not in this game.');

  // Any message is a sign of life, whatever it turns out to say.
  const seats = [...room.seats] as Room['seats'];
  seats[side] = { ...(seats[side] as Seat), seen: now };
  const alive: Room = { ...room, seats };

  switch (message.kind) {
    case 'dive':
      return setDive(alive, side, message.at, message.idempotency, now);
    case 'shoot':
      return shoot(alive, side, message, now);
    case 'ping':
      // The sign of life was recorded above; this is the answer to it.
      return { room: alive, out: broadcast(alive, now) };
    case 'next':
      return { room: { ...alive, match: reduce(alive.match, { type: 'NEXT' }) }, out: [] };
    case 'leave':
      return leave(alive, side, now);
    default:
      return { room: alive, out: [] };
  }
}

function join(room: Room, message: Extract<Outbound, { kind: 'join' }>, now: number): Handled {
  // A stale bundle is the realistic cause of two clients disagreeing, not
  // floating point. Caught at the door with something a person can act on.
  if (message.tuning !== TUNING) {
    return refuse(room, 'One of you needs to refresh - you are on different versions.');
  }

  const existing = seatOf(room, message.token);
  if (existing !== null) {
    // A reload, not a third person. The token is what makes a refresh
    // survivable: reopen the link and you are still the keeper with your saves.
    const seats = [...room.seats] as Room['seats'];
    seats[existing] = { token: message.token, team: message.team, seen: now };
    const back: Room = { ...room, seats };
    return { room: back, out: broadcast(back, now) };
  }

  const free = room.seats[0] === null ? 0 : room.seats[1] === null ? 1 : null;
  if (free === null) {
    // Not made a spectator. Spectators sound free and are not: the sealed dive
    // would have to stay sealed from them too, and there is a new question
    // about who may see what.
    return refuse(room, 'This game already has two players.');
  }

  const seats = [...room.seats] as Room['seats'];
  seats[free] = { token: message.token, team: message.team, seen: now };
  const joined: Room = { ...room, seats };
  return { room: joined, out: broadcast(joined, now) };
}

function setDive(
  room: Room,
  side: Side,
  at: Dive,
  idempotency: string,
  now: number
): Handled {
  // Same reasoning as a retried shot: answer, do not go quiet.
  if (room.applied.includes(idempotency)) return { room, out: broadcast(room, now) };
  if (side !== keeperSide(room)) return refuse(room, 'It is not your turn in goal.', false);
  if (room.match.phase !== 'keeping') return refuse(room, 'Too late to pick a corner.', false);

  const committed: Room = {
    ...room,
    // Held here. This is the line the whole format rests on.
    dive: at,
    match: reduce(room.match, { type: 'SET_DIVE', dive: at }),
    applied: [...room.applied, idempotency],
  };
  return { room: committed, out: broadcast(committed, now) };
}

function shoot(
  room: Room,
  side: Side,
  message: Extract<Outbound, { kind: 'shoot' }>,
  now: number
): Handled {
  // A retried `shoot` without this is a second penalty, and that shows up as a
  // mysteriously wrong score rather than as an error.
  //
  // It answers rather than going quiet. The reason a client retries is that it
  // did not hear back, so silence is the one response guaranteed not to help -
  // it would sit there having already been counted, waiting for a reply that
  // was never coming. Sending the state again costs a few hundred bytes and
  // ends the retry.
  //
  // Worth knowing that the phase check below hides this in the common case:
  // once a shot has resolved the match is no longer `ready`, so a duplicate
  // would be refused anyway - with an error, which is exactly the wrong answer
  // to "I think you missed my message". A planted-bug check found that, by
  // failing to fail.
  if (room.applied.includes(message.idempotency)) return { room, out: broadcast(room, now) };
  if (side !== takerSide(room)) return refuse(room, 'It is not your turn to shoot.', false);
  if (room.match.phase !== 'ready') return refuse(room, 'Not ready for a shot.', false);

  const taker = takerFrom(room, side, message.taker);
  const { outcome, seed } = resolve(room, taker, message.input);

  const after = ['TAKE_SHOT', 'STRIKE'].reduce(
    (state, type) => reduce(state, { type } as never),
    room.match
  );
  const settled: Room = {
    ...room,
    match: reduce(after, { type: 'RESOLVE', outcome }),
    applied: [...room.applied, message.idempotency],
    // Only when a client actually offered an answer. Counting a missing one as
    // a disagreement is how this came to report seven divergences in five
    // games that had never disagreed about anything.
    diverged: room.diverged + (message.outcome && outcome !== message.outcome ? 1 : 0),
    // Unsealed only now, with the shot it belonged to, and cleared for the next.
    dive: null,
  };

  const shot: Inbound = {
    kind: 'shot',
    input: message.input,
    taker: message.taker,
    seed,
    keeperStartX: 0,
    dive: room.dive,
    outcome,
  };
  return {
    room: settled,
    out: [{ to: null, message: shot }, ...broadcast(settled, now)],
  };
}

/** Who is taking it, out of the squad that arrived at `join`. */
function takerFrom(room: Room, side: Side, id: string): Player {
  const squad = room.seats[side]?.team.squad ?? [];
  return (squad.find((p) => p.id === id) ?? squad[0]) as Player;
}

/**
 * Work the shot out again, here.
 *
 * The same functions the client ran, from the same seed. This is the thing
 * that makes the room an authority rather than a scoreboard, and it is only
 * possible because nothing in `core/` needs a browser.
 */
function resolve(
  room: Room,
  taker: Player,
  input: Extract<Outbound, { kind: 'shoot' }>['input']
): { outcome: Outcome; seed: number } {
  const { seed, shotIndex } = room.match;
  const piece = setPieceFor(seed, shotIndex, room.settings.discipline, true);
  const shot = resolveShot(input, taker, createRng(shotSeed(seed, shotIndex)), {
    origin: piece.origin,
    loft: piece.penalty ? 0 : Math.max(0, Math.min(1, taker.dip / 100)),
    aimEase: piece.penalty ? 1 : 0.62,
  });

  let flight = createFlight(
    shot,
    KEEPER,
    createRng(shotSeed(seed, shotIndex) ^ 0x5f3759df),
    0,
    room.dive,
    NO_EVENTS,
    buildWall(piece)
  );
  // Bounded: a shot that never resolves must not hang the room.
  for (let step = 0; step < 1200 && !flight.outcome; step++) {
    flight = advance(flight, STEP, NO_EVENTS);
  }
  return { outcome: (flight.outcome ?? 'short') as Outcome, seed };
}

function leave(room: Room, side: Side, now: number): Handled {
  // The seat is kept, not cleared. Their token still owns it, so reopening the
  // link gets it back - and the other player is told they are alone rather
  // than told nothing.
  const seats = [...room.seats] as Room['seats'];
  const seat = seats[side];
  if (seat) seats[side] = { ...seat, seen: now - OFFLINE_AFTER_MS };
  const left: Room = { ...room, seats };
  return { room: left, out: broadcast(left, now) };
}

/**
 * The physics fingerprint this build agrees with.
 *
 * Read once at module load rather than per join: it cannot change while the
 * process is running, and reading it per message would invite somebody to make
 * it configurable.
 */
import { tuningFingerprint } from '../core/tuning.ts';
const TUNING = tuningFingerprint();
