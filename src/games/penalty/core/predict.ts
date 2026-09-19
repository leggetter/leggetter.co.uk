/**
 * Where a ball is going, if nobody puts spin on it.
 *
 * Used twice, for opposite reasons. The striker uses it to work out how hard to
 * lift a shot so it arrives at the height it was aimed at. The keeper uses it
 * to read a shot already in flight.
 *
 * Both run the real integrator with spin zeroed, so both account for drag and
 * neither accounts for Magnus. That split is the whole design:
 *
 * - Accounting for drag is not cheating. A taker knows in their legs how hard
 *   to hit a 25 m free kick, and a keeper can see how fast a ball is travelling.
 * - Not accounting for Magnus is the mechanic. A curled shot finishes somewhere
 *   other than where it was pointed, which is what beats a keeper who committed
 *   to the line it was on. Nothing special-cases curve to make that happen; it
 *   falls out of this function being blind to spin.
 *
 * Arithmetic only, so it stays deterministic across engines.
 */

import { FLIGHT_TIMEOUT } from './units.ts';
import { step } from './physics.ts';
import type { BallState } from './types.ts';
import { vec, type Vec3 } from './vec3.ts';

/** Coarser than the live step: this needs centimeters, not exactness. */
const PREDICT_STEP = 1 / 60;

export interface Arrival {
  x: number;
  y: number;
  /** Seconds from the given state to the goal plane. */
  time: number;
}

export interface PredictOptions {
  /**
   * Whether the ball bounces off the pitch on the way.
   *
   * On (the default) for the keeper, because a low shot really does skip up off
   * the turf and it has to read the ball it is actually going to face.
   *
   * Off for the striker's elevation solver, which needs the height a trial
   * trajectory *would* arrive at, including a negative one. With the bounce in,
   * every under-hit trial reports back at ground level, the solver sees a much
   * smaller error than it really has, and it creeps toward the answer instead
   * of converging on it. That showed up as low shots from range landing a third
   * of a meter under where they were aimed.
   */
  ground?: boolean;
}

/**
 * Fly a spin-free ball from `position` at `velocity` to the goal plane at
 * z = 0. Returns null if it never gets there.
 */
export function flyToLine(
  position: Vec3,
  velocity: Vec3,
  options: PredictOptions = {}
): Arrival | null {
  const ground = options.ground ?? true;
  let ball: BallState = { position, velocity, spin: vec(0, 0, 0) };
  let time = 0;

  while (time < FLIGHT_TIMEOUT) {
    const before = ball;
    ball = step(ball, PREDICT_STEP, ground);
    time += PREDICT_STEP;

    if (before.position.z < 0 && ball.position.z >= 0) {
      const t = (0 - before.position.z) / (ball.position.z - before.position.z);
      return {
        x: before.position.x + (ball.position.x - before.position.x) * t,
        y: before.position.y + (ball.position.y - before.position.y) * t,
        time,
      };
    }
  }
  return null;
}
