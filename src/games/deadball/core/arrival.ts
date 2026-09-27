/**
 * Where a cleanly struck shot would cross the goal line, spin and all.
 *
 * For the aiming guide. The crosshair used to mark where the shot was pointed,
 * and the guide bent away from it by a made-up amount - reported as the dotted
 * line not meeting the crosshair. A curled ball does finish somewhere other
 * than where it was pointed: that is the mechanic, and `predict.ts` is blind to
 * spin on purpose so the keeper falls for it. The taker is not the keeper,
 * though, and should be shown where the curl takes it.
 *
 * "Cleanly struck" means the shot as chosen, with none of the luck: the same
 * `resolveShot` with a random source that always returns the middle, so no
 * scatter and no knuckle break, then the real integrator to the line. What
 * the real kick adds on top - a mistimed release, composure, the scatter - is
 * the part a player is meant to learn, not be shown.
 *
 * Arithmetic only, like everything in core/. Nothing here is tuned, so the
 * fingerprint does not include it.
 */

import { FLIGHT_TIMEOUT } from './units.ts';
import { step } from './physics.ts';
import type { Rng } from './rng.ts';
import { resolveShot, type ShotContext } from './shot.ts';
import type { BallState, Player, ShotInput } from './types.ts';

/** The middle of every draw: no scatter, no wobble. */
const NEUTRAL: Rng = {
  next: () => 0.5,
  nextBell: () => 0,
  range: (min, max) => (min + max) / 2,
  state: () => 0,
};

const STEP = 1 / 120;

export function cleanArrival(
  input: ShotInput,
  player: Player,
  context: ShotContext
): { x: number; y: number } | null {
  const shot = resolveShot({ ...input, timing: 0 }, player, NEUTRAL, { ...context, pressure: 0 });
  let ball: BallState = { position: shot.origin, velocity: shot.velocity, spin: shot.spin };
  for (let t = 0; t < FLIGHT_TIMEOUT; t += STEP) {
    const next = step(ball, STEP);
    if (next.position.z >= 0 && ball.position.z < 0) {
      // Between two steps: interpolate to the line itself.
      const k = -ball.position.z / (next.position.z - ball.position.z);
      return {
        x: ball.position.x + (next.position.x - ball.position.x) * k,
        y: ball.position.y + (next.position.y - ball.position.y) * k,
      };
    }
    ball = next;
  }
  return null;
}
