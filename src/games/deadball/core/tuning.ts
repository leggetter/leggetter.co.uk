/**
 * A fingerprint of the numbers the simulation is currently tuned to.
 *
 * A shot is reproducible from its input and its seed, which is what makes
 * replay nearly free - but only against the same physics. These constants have
 * moved a great deal, several of them by a factor of two, and a shot logged
 * under one set replayed under another is a different shot. Worse, it is a
 * plausible-looking different shot, which is the hardest kind of wrong to
 * notice.
 *
 * So every record carries the fingerprint it was taken under, and a replay can
 * refuse rather than quietly lie. This has to exist before the replay feature
 * does, or every log recorded in the meantime is worthless to it.
 *
 * Computed rather than hand-maintained. A version number somebody has to
 * remember to bump is a version number that is wrong.
 */

import {
  AIM_MARGIN,
  BALL_MASS,
  BALL_RADIUS,
  DRAG_COEFFICIENT,
  FLIGHT_TIMEOUT,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  GRAVITY,
  GROUND_FRICTION,
  GROUND_RESTITUTION,
  MAGNUS_FACTOR,
  MAX_LIFT_SPIN,
  MAX_SIDE_SPIN,
  MAX_STRIKE_SPEED,
  MIN_STRIKE_SPEED,
  NET_DEPTH,
  NET_DRAG,
  NET_MAX_REBOUND,
  NET_RESTITUTION,
  PENALTY_DISTANCE,
  SPIN_DECAY,
  SWEEP_PERIOD,
  SWEEP_SWEET_ZONE,
  TIMING_CENTRE_PULL,
  TIMING_PACE_LOSS,
  TIMING_PULL,
  TIMING_SCATTER,
  TIMING_SPREAD,
} from './units.ts';
import { AIM_TUNING } from './shot.ts';
import { KEEPER_TUNING } from './keeper.ts';

/**
 * Everything that changes what a given input does.
 *
 * Constants that live outside these three modules are not covered, which is a
 * reason for anything tuning-relevant to live in one of them.
 */
const TUNED: readonly number[] = [
  GRAVITY,
  DRAG_COEFFICIENT,
  MAGNUS_FACTOR,
  SPIN_DECAY,
  BALL_RADIUS,
  BALL_MASS,
  GOAL_WIDTH,
  GOAL_HEIGHT,
  PENALTY_DISTANCE,
  AIM_MARGIN,
  MIN_STRIKE_SPEED,
  MAX_STRIKE_SPEED,
  MAX_SIDE_SPIN,
  MAX_LIFT_SPIN,
  SWEEP_PERIOD,
  SWEEP_SWEET_ZONE,
  TIMING_PULL,
  TIMING_SPREAD,
  TIMING_SCATTER,
  TIMING_CENTRE_PULL,
  TIMING_PACE_LOSS,
  GROUND_RESTITUTION,
  GROUND_FRICTION,
  NET_DEPTH,
  NET_RESTITUTION,
  NET_MAX_REBOUND,
  NET_DRAG,
  FLIGHT_TIMEOUT,
  ...AIM_TUNING,
  ...KEEPER_TUNING,
];

/** FNV-1a over the constants, as eight hex characters. */
export function tuningFingerprint(): string {
  let hash = 0x811c9dc5;
  for (const value of TUNED) {
    for (const char of value.toPrecision(12)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
