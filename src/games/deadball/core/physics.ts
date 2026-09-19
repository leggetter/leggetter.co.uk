/**
 * Ball flight: gravity, drag, and the Magnus effect, integrated at a fixed
 * timestep.
 *
 * Semi-implicit Euler (velocity first, then position from the new velocity)
 * rather than plain Euler. It costs nothing extra and does not gain energy on
 * curved paths the way the explicit form does.
 */

import {
  BALL_MASS,
  BALL_RADIUS,
  DRAG_FACTOR,
  GRAVITY,
  GROUND_FRICTION,
  GROUND_RESTITUTION,
  MAGNUS_FACTOR,
  SPIN_DECAY,
} from './units.ts';
import type { BallState } from './types.ts';
import { addScaled, cross, length, scale, vec, type Vec3 } from './vec3.ts';

/**
 * Total acceleration on the ball, m/s^2.
 *
 * Drag opposes motion and grows with the square of speed. Magnus acts
 * perpendicular to both the spin axis and the direction of travel, which is
 * why sidespin bends the flight sideways and topspin drives it down.
 */
export function acceleration(ball: BallState): Vec3 {
  const speed = length(ball.velocity);

  // F = DRAG_FACTOR * |v| * v, opposing motion.
  const dragK = (-DRAG_FACTOR * speed) / BALL_MASS;

  // F = MAGNUS_FACTOR * (spin x velocity).
  const magnus = scale(cross(ball.spin, ball.velocity), MAGNUS_FACTOR / BALL_MASS);

  return {
    x: ball.velocity.x * dragK + magnus.x,
    y: ball.velocity.y * dragK + magnus.y - GRAVITY,
    z: ball.velocity.z * dragK + magnus.z,
  };
}

/**
 * Advance the ball by one fixed step.
 *
 * Returns a new state rather than mutating, so a caller can keep the previous
 * step around. Finding the exact moment a shot crosses the goal line needs both
 * ends of the step to interpolate between.
 */
export function step(ball: BallState, dt: number, groundContact = true): BallState {
  const a = acceleration(ball);
  const velocity = addScaled(ball.velocity, a, dt);
  const position = addScaled(ball.position, velocity, dt);

  // Spin bleeds off through the flight, so a curl straightens as it slows.
  const spin = scale(ball.spin, 1 - SPIN_DECAY * dt);

  const next: BallState = { position, velocity, spin };
  if (!groundContact) return next;
  return position.y < BALL_RADIUS && velocity.y < 0 ? bounce(next) : next;
}

/**
 * Ground contact. Crude on purpose: place the ball on the surface, invert and
 * damp the vertical component, and scrub some horizontal speed.
 *
 * It exists so a weak low shot rolls or skips toward the goal instead of
 * dropping through the pitch. It is not trying to model a real bounce, and
 * spin is left alone rather than converted into a skid, which a real one does.
 */
function bounce(ball: BallState): BallState {
  return {
    position: vec(ball.position.x, BALL_RADIUS, ball.position.z),
    velocity: vec(
      ball.velocity.x * GROUND_FRICTION,
      -ball.velocity.y * GROUND_RESTITUTION,
      ball.velocity.z * GROUND_FRICTION
    ),
    spin: ball.spin,
  };
}
