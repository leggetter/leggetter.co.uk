/**
 * One shot, from strike to outcome.
 *
 * Steps the ball and the keeper together and decides when the shot is over.
 * The live game advances this one step at a time so it can be drawn; tests run
 * `simulate` to get straight to the outcome. Both take the identical path, so a
 * test result is evidence about the game and not about a second code path.
 */

import { FLIGHT_TIMEOUT } from './units.ts';
import { step } from './physics.ts';
import { planKeeper, stepKeeper, type KeeperRng, type KeeperSim } from './keeper.ts';
import { classifyCrossing } from './rules.ts';
import type { BallState, KeeperProfile, Outcome, Shot } from './types.ts';
import { lerp } from './vec3.ts';

export interface Flight {
  ball: BallState;
  keeper: KeeperSim;
  profile: KeeperProfile;
  elapsed: number;
  /** Set once the shot is over. Null while it is still live. */
  outcome: Outcome | null;
}

export function createFlight(
  shot: Shot,
  profile: KeeperProfile,
  rng: KeeperRng,
  /**
   * Where the keeper had shuffled to at the moment of contact. Simulation
   * input, not presentation: it decides how far they have to travel. Recorded
   * in the shot log, and part of the two-player message when that arrives.
   */
  keeperStartX = 0
): Flight {
  return {
    ball: { position: shot.origin, velocity: shot.velocity, spin: shot.spin },
    keeper: planKeeper(profile, rng, shot.aimPoint, keeperStartX),
    profile,
    elapsed: 0,
    outcome: null,
  };
}

/**
 * Advance one fixed step.
 *
 * Returns the flight unchanged once an outcome exists, so a caller can keep
 * calling this without having to check first.
 */
export function advance(flight: Flight, dt: number): Flight {
  if (flight.outcome) return flight;

  const before = flight.ball;
  const ball = step(before, dt);
  const elapsed = flight.elapsed + dt;
  const keeper = stepKeeper(flight.keeper, flight.profile, ball, elapsed, dt);

  // The ball reached the line somewhere inside this step. Interpolate to the
  // crossing rather than judging it at the end of the step, or the verdict
  // depends on the step size and a shot could pass a post by centimeters it
  // never actually had.
  if (before.position.z < 0 && ball.position.z >= 0) {
    const t = (0 - before.position.z) / (ball.position.z - before.position.z);
    const at = lerp(before.position, ball.position, t);
    // Interpolate the keeper to the same instant as the ball, or a fast shot
    // is judged against where the keeper got to a whole step later.
    const atCrossing = {
      ...keeper.state,
      hands: lerp(flight.keeper.state.hands, keeper.state.hands, t),
      body: lerp(flight.keeper.state.body, keeper.state.body, t),
    };
    return {
      ...flight,
      ball: { ...ball, position: at },
      keeper,
      elapsed,
      outcome: classifyCrossing(at, atCrossing, flight.profile.reach),
    };
  }

  if (elapsed >= FLIGHT_TIMEOUT) {
    return { ...flight, ball, keeper, elapsed, outcome: 'short' };
  }

  return { ...flight, ball, keeper, elapsed, outcome: null };
}

/** Run a shot to its outcome without drawing anything. */
export function simulate(
  shot: Shot,
  profile: KeeperProfile,
  rng: KeeperRng,
  dt: number
): Flight {
  let flight = createFlight(shot, profile, rng);
  // The timeout bounds this, so the loop cannot run away.
  while (!flight.outcome) flight = advance(flight, dt);
  return flight;
}
