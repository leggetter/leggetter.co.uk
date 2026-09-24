/**
 * One kick of a two-device game, from the message to the flight.
 *
 * The room resolves a remote shot and both clients then animate it. That only
 * works if all three build *the same flight*, and for a while they did not:
 * the room built it from its own record, and each client rebuilt it from its
 * own - its own keeper, its own discipline setting, its own idea of which kick
 * this was, its own squad, and wherever its keeper happened to have shuffled
 * to. On one machine those all agree with the room, so nothing noticed. On two
 * they did not, and a two-person playtest reported the result exactly: one
 * player saw a goal while the other saw it blocked by the wall, and one first
 * shot came in "from basically off to the left" instead of from the spot.
 *
 * So the flight is built in one place, from one value, and that value is what
 * travels. A `Kick` is everything the flight depends on and nothing else: if
 * it is not in here, the flight cannot read it, and if it is in here, it was
 * decided by the room. The room calls `kickFlight` and plays it out to a
 * verdict; a client calls the same function on the `Kick` in the shot message
 * and animates it.
 *
 * Solo, hotseat and versus play do not come through here. They build their
 * flight in `Game.ts` exactly as before, with the local keeper and the idle
 * shuffle, because on one device there is nothing to disagree with.
 */

import { NO_EVENTS, type EventSink } from './events.ts';
import { advance, createFlight, type Flight } from './flight.ts';
import { createRng, shotSeed } from './rng.ts';
import { setPieceFor, type Discipline, type SetPiece } from './setpiece.ts';
import { resolveShot } from './shot.ts';
import type { Dive, KeeperProfile, Player, Shot, ShotInput } from './types.ts';
import { STEP } from './units.ts';
import { buildWall, type Wall } from './wall.ts';

export interface Kick {
  /** The match seed. Spots, walls, aim error and the keeper all come off it. */
  seed: number;
  /** Which kick of the match, counting both sides. */
  shotIndex: number;
  /** Fixed when the room was made, and never the viewer's own setting. */
  discipline: Discipline;
  input: ShotInput;
  /** The footballer taking it, attributes and all - not an id to look up. */
  player: Player;
  /** The keeper the room simulated, likewise whole. */
  keeper: KeeperProfile;
  /** Where the keeper stood at contact. The room has no shuffle, so 0. */
  keeperStartX: number;
  /** The keeper's pick, unsealed with the shot it belonged to. */
  dive: Dive | null;
}

/** Everything about the kick that exists before the ball moves. */
export interface Struck {
  piece: SetPiece;
  wall: Wall;
  shot: Shot;
}

/**
 * How much less the aim strays on a free kick.
 *
 * The aim sigmas were tuned against a penalty: eleven metres, an open goal and
 * nothing in the way. The same numbers from twenty metres, with four people
 * across the half of the goal you want, read as a ball that goes wherever it
 * likes - which is exactly how it was reported.
 *
 * Lives here so a local free kick in `Game.ts` and a remote one in the room
 * read the same number. The room used to have its own `0.62` typed in.
 */
export const FREE_KICK_AIM_EASE = 0.62;

/**
 * Salt on the keeper's stream, so it is not the same stream the aim error is
 * drawn from. The room has always used it; a client that left it off got a
 * different keeper from an otherwise identical kick.
 */
const KEEPER_SALT = 0x5f3759df;

/** A shot that never resolves must not hang whoever is asking. */
export const MAX_KICK_STEPS = 1200;

/** Where the ball is, who is in the way, and how it was struck. */
export function strike(kick: Kick): Struck {
  // Always the alternating form: a remote game is two sides taking turns, and
  // both halves of a pair face the same kick. See `setPieceFor`.
  const piece = setPieceFor(kick.seed, kick.shotIndex, kick.discipline, true);
  const shot = resolveShot(kick.input, kick.player, createRng(shotSeed(kick.seed, kick.shotIndex)), {
    origin: piece.origin,
    loft: piece.penalty ? 0 : Math.max(0, Math.min(1, kick.player.dip / 100)),
    aimEase: piece.penalty ? 1 : FREE_KICK_AIM_EASE,
  });
  return { piece, wall: buildWall(piece), shot };
}

/**
 * The flight, at the moment of contact.
 *
 * `struck` is accepted so a client that has already set the pitch up from it
 * - to put the ball on the right spot during the run-up - builds the flight
 * from that same object rather than working it out twice.
 */
export function kickFlight(kick: Kick, events: EventSink, struck: Struck = strike(kick)): Flight {
  return createFlight(
    struck.shot,
    kick.keeper,
    createRng(shotSeed(kick.seed, kick.shotIndex) ^ KEEPER_SALT),
    kick.keeperStartX,
    kick.dive,
    events,
    struck.wall
  );
}

/** Run a flight until it has a verdict, silently. */
export function playOut(flight: Flight): Flight {
  let f = flight;
  for (let step = 0; step < MAX_KICK_STEPS && !f.outcome; step++) {
    f = advance(f, STEP, NO_EVENTS);
  }
  return f;
}
