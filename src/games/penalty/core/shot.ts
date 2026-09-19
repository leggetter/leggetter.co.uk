/**
 * Turning player intent into a struck ball.
 *
 * This is the only place error enters the simulation, and the only place player
 * attributes are read. Keeping it in one function is what makes attributes mean
 * something without the physics knowing that players exist.
 */

import {
  AIM_HALF_WIDTH,
  AIM_HEIGHT,
  BALL_RADIUS,
  GRAVITY,
  MAX_LIFT_SPIN,
  MAX_SIDE_SPIN,
  MAX_STRIKE_SPEED,
  MIN_STRIKE_SPEED,
  SWEEP_PERIOD,
  SWEEP_SWEET_ZONE,
  TIMING_PACE_LOSS,
  TIMING_PULL,
  TIMING_SPREAD,
} from './units.ts';
import type { Player, Shot, ShotInput } from './types.ts';
import type { Rng } from './rng.ts';
import { flyToLine } from './predict.ts';
import { vec, type Vec3 } from './vec3.ts';

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Attributes are 0..100; most of them want to be a 0..1 multiplier. */
const unit = (attribute: number): number => clamp(attribute, 0, 100) / 100;

/**
 * Widest the aim can stray at accuracy 0, in meters on the goal plane. At
 * accuracy 100 a shot goes exactly where it was aimed, which makes 100 a
 * deliberate ceiling rather than a number to hand out.
 */
const MAX_AIM_ERROR = 1.25;

/** Extra error at full power. A hard shot is a less precise one. */
const POWER_ERROR = 0.45;

/** Extra error added under pressure, before composure reduces it. */
const PRESSURE_ERROR = 0.55;

export interface ShotContext {
  /** Where the ball is being struck from. */
  origin: Vec3;
  /** 0..1. Sudden death and match point push this up. Phase 1 passes 0. */
  pressure?: number;
}

/**
 * Resolve intent into a struck ball.
 *
 * Same input, same player, same seed, same shot, on any machine.
 */
export function resolveShot(
  input: ShotInput,
  player: Player,
  rng: Rng,
  context: ShotContext
): Shot {
  const origin = context.origin;
  const pressure = clamp(context.pressure ?? 0, 0, 1);
  const power = clamp(input.power, 0, 1);

  // Where the player meant to put it, on the plane of the goal.
  const intendedX = clamp(input.aim.x, -1, 1) * AIM_HALF_WIDTH;
  const intendedY = clamp(input.aim.y, 0, 1) * AIM_HEIGHT;

  // How badly this one was struck. Independent of the footballer's attributes
  // on purpose: this is the person holding the mouse, not the player on the
  // pitch, and a 100-accuracy striker should still be punished for hitting it
  // with their shin.
  const timing = clamp(input.timing, -1, 1);
  const mistimed = Math.abs(timing);

  // How far it may stray. Accuracy sets the floor, power and pressure add to
  // it, and composure only offsets the pressure part - a composed player is
  // not a more accurate one, they are one who stays as accurate as usual.
  const spread =
    ((1 - unit(player.accuracy)) * MAX_AIM_ERROR +
      power * POWER_ERROR * (1 - unit(player.accuracy)) +
      pressure * PRESSURE_ERROR * (1 - unit(player.composure))) *
    (1 + mistimed * TIMING_SPREAD);

  // A mistimed contact drags the ball off in a consistent direction as well as
  // scattering it, so releasing early repeatedly pulls it left every time.
  const targetX = intendedX + timing * TIMING_PULL + rng.nextBell() * spread;
  const targetY = Math.max(0, intendedY + rng.nextBell() * spread);

  // Strike speed, scaled by the player's power and cut by a poor contact.
  const speed =
    (MIN_STRIKE_SPEED + (MAX_STRIKE_SPEED - MIN_STRIKE_SPEED) * power) *
    (0.85 + 0.3 * unit(player.power)) *
    (1 - mistimed * TIMING_PACE_LOSS);

  const velocity = launchVelocity(origin, targetX, targetY, speed);

  // Spin about +y bends the flight along +x, so a positive curve input pushes
  // the ball to the taker's right. A left foot naturally opens the other way.
  const footBias = player.foot === 'left' ? -0.08 : 0.08;
  const sideSpin =
    (clamp(input.curve, -1, 1) + footBias) * MAX_SIDE_SPIN * (0.6 + 0.4 * unit(player.curve));

  // Spin about +x drives the ball down, so lift above 0.5 is topspin.
  const liftSpin = (clamp(input.lift, 0, 1) * 2 - 1) * MAX_LIFT_SPIN;

  return { origin, velocity, spin: vec(liftSpin, sideSpin, 0) };
}

/** Passes of the elevation solver, and when to stop early. */
const SOLVER_PASSES = 6;
const SOLVER_TOLERANCE = 0.01;

/**
 * Launch velocity that puts a spin-free ball on the target point.
 *
 * The naive ballistic formula assumes the ball holds its speed, and it does
 * not: drag sheds a third of it over a long free kick, the flight lasts longer
 * than the estimate, and gravity gets that much longer to work. Aimed at
 * 1.15 m from 25 m out, the closed-form answer arrives at 0.11 m. That is not
 * a skill gap, it is the model being wrong, and no amount of play would teach
 * anyone to compensate for it.
 *
 * So the elevation is solved against the real integrator instead. Horizontal
 * velocity is fixed from the speed, and only the vertical component is
 * adjusted, which keeps the strike speed the player asked for.
 *
 * The solve deliberately runs with **no spin**. Correcting for drag models what
 * a taker knows in their legs about how hard to hit it. Correcting for Magnus
 * would cancel the curve the player just chose to put on the ball, and the
 * whole point is that a curled shot finishes somewhere other than where it was
 * pointed. Lift is left uncompensated for the same reason.
 */
function launchVelocity(origin: Vec3, targetX: number, targetY: number, speed: number): Vec3 {
  const dx = targetX - origin.x;
  // The goal plane is at z = 0 and the ball starts behind it.
  const dz = -origin.z;

  const horizontal = Math.sqrt(dx * dx + dz * dz);
  const flat = Math.max(horizontal / speed, 1e-3);

  const vx = dx / flat;
  const vz = dz / flat;
  let vy = (targetY - origin.y) / flat + 0.5 * GRAVITY * flat;

  for (let pass = 0; pass < SOLVER_PASSES; pass++) {
    const arrival = flyToLine(origin, vec(vx, vy, vz), { ground: false });
    if (!arrival) break;
    const error = targetY - arrival.y;
    if (Math.abs(error) < SOLVER_TOLERANCE) break;
    vy += error / arrival.time;
  }

  return vec(vx, vy, vz);
}


/** Where the ball sits before a penalty is struck. */
export const spotBall = (distance: number): Vec3 => vec(0, BALL_RADIUS, -distance);

/**
 * Where the timing marker sits after holding the drag for `heldSeconds`.
 *
 * A triangle wave from -1 to 1 and back. Triangle rather than a sine so the
 * marker moves at a constant speed and the sweet spot is as hard to hit at one
 * end of the sweep as the other: with a sine it dawdles at the extremes and
 * races through the middle, which would make the window feel arbitrary.
 */
export function sweepAt(heldSeconds: number): number {
  const phase = (heldSeconds / SWEEP_PERIOD) % 1;
  return phase < 0.5 ? -1 + 4 * phase : 3 - 4 * phase;
}

/**
 * Turn a marker position into the timing penalty that goes into the shot.
 *
 * Anywhere inside the sweet zone is a clean strike and scores exactly 0, so
 * there is a real reward for hitting it rather than a continuous gradient that
 * never quite lets you off.
 */
export function timingFromSweep(marker: number): number {
  const magnitude = Math.abs(marker);
  if (magnitude <= SWEEP_SWEET_ZONE) return 0;
  const over = (magnitude - SWEEP_SWEET_ZONE) / (1 - SWEEP_SWEET_ZONE);
  return marker < 0 ? -over : over;
}
