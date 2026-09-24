/**
 * The other device's shot, on this one.
 *
 * What a client does with a `shot` message from the room, pulled out of
 * `Game.ts` so it can be tested without a canvas. It used to be six lines
 * inside the frame loop's message handler, and those six lines read the
 * viewer's own keeper, discipline, kick number, squad and idle keeper position
 * - which is how a two-person playtest came to watch one shot go in on one
 * screen and hit the wall on the other.
 *
 * The rule now is that the flight is built from the message and nothing else.
 * `LocalView` is still passed in, and deliberately: it is read only to say
 * *how* this device was out of step when a replay disagrees with the room,
 * which is the question anybody debugging a report will ask first. It never
 * reaches the flight. `replay.test.ts` holds it to that by handing it a view
 * that is wrong in every way it can be.
 */

import type { EventSink } from '../core/events.ts';
import type { Flight } from '../core/flight.ts';
import { kickFlight, strike, type Kick, type Struck } from '../core/kick.ts';
import type { Discipline } from '../core/setpiece.ts';
import type { KeeperProfile, Outcome, Player } from '../core/types.ts';
import type { Inbound } from './Transport.ts';

export type ShotMessage = Extract<Inbound, { kind: 'shot' }>;

/** What this device believed when the shot arrived. Diagnosis only. */
export interface LocalView {
  seed: number;
  shotIndex: number;
  discipline: Discipline;
  keeper: KeeperProfile;
  squad: readonly Player[];
  player: Player;
  /** Where this device's keeper had shuffled to. */
  keeperX: number;
}

export interface Replay {
  kick: Kick;
  /** The pitch for this kick - spot, wall, struck ball - as the room had it. */
  struck: Struck;
  /** The room's verdict. The one that is shown, whatever the replay makes of it. */
  outcome: Outcome;
  /** Which of this device's beliefs disagreed with the room. Empty is normal. */
  drift: string[];
}

/** Everything the room decided, and nothing this device did. */
export function replayShot(message: ShotMessage, local: LocalView): Replay {
  const kick: Kick = {
    seed: message.seed,
    shotIndex: message.shotIndex,
    discipline: message.discipline,
    input: message.input,
    player: message.player,
    keeper: message.keeper,
    keeperStartX: message.keeperStartX,
    dive: message.dive,
  };
  return { kick, struck: strike(kick), outcome: message.outcome, drift: driftOf(kick, local) };
}

/** The flight to animate, at the moment the boot meets the ball. */
export const strikeReplay = (replay: Replay, events: EventSink): Flight =>
  kickFlight(replay.kick, events, replay.struck);

/**
 * What to show: always the room's verdict.
 *
 * With the flight built from the room's own kick the two should never differ,
 * and if they do the realistic cause is a stale bundle rather than arithmetic.
 * Either way the room holds the score and the other player is being shown the
 * room's answer, so showing anything else here is how two people end up
 * arguing about a kick they both watched. Said out loud in the console rather
 * than swallowed, with what this device believed, so it can be chased.
 */
export function verdict(replay: Replay, landed: Outcome | null): Outcome {
  if (landed !== replay.outcome) {
    console.warn('deadball: replay disagreed with the room; showing the room', {
      room: replay.outcome,
      replay: landed,
      shotIndex: replay.kick.shotIndex,
      drift: replay.drift,
    });
  }
  return replay.outcome;
}

function driftOf(kick: Kick, local: LocalView): string[] {
  const drift: string[] = [];
  if (local.seed !== kick.seed) drift.push('seed');
  if (local.shotIndex !== kick.shotIndex) drift.push('shotIndex');
  if (local.discipline !== kick.discipline) drift.push('discipline');
  if (local.keeper.id !== kick.keeper.id) drift.push('keeper');
  if (!local.squad.some((p) => p.id === kick.player.id) && local.player.id !== kick.player.id) {
    drift.push('taker');
  }
  if (local.keeperX !== kick.keeperStartX) drift.push('keeperX');
  return drift;
}
