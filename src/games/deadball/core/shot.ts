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
  LOFT_SHARE,
  MAX_LIFT_SPIN,
  MAX_SIDE_SPIN,
  MAX_STRIKE_SPEED,
  MIN_STRIKE_SPEED,
  SWEEP_PERIOD,
  SWEEP_SWEET_ZONE,
  TIMING_CENTRE_PULL,
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
 * Aim error, as a standard deviation in meters at the goal.
 *
 * Every one of these is a sigma, and `scatter` below divides the bell draw by
 * its own standard deviation so the number you write is the number you get.
 * The first version treated them as half-ranges and multiplied by a draw whose
 * sd is 0.29, which made an accuracy-88 striker land within four centimeters
 * of the aim point every time. Twenty logged shots put sixteen of them beyond
 * the keeper's maximum possible reach, and it never made a save.
 */
const MAX_AIM_SIGMA = 1.0;

/**
 * Square-rooted rather than linear, so precision falls off fast at the top of
 * the scale. Linear made everything above about 80 indistinguishable from
 * perfect, which collapsed the whole attribute into a binary.
 */
const aimSigma = (accuracy: number): number => MAX_AIM_SIGMA * Math.sqrt(1 - unit(accuracy));

/** Vertical scatter, as a fraction of the lateral. Height is easier to keep. */
const VERTICAL_SCATTER = 0.62;

/** Extra sigma at full power. A hard shot is a less precise one. */
const POWER_SIGMA = 0.28;

/** Extra sigma under full pressure, before composure offsets it. */
const PRESSURE_SIGMA = 0.4;

/** Extra sigma from the worst possible contact, whoever is taking it. */
const TIMING_SIGMA = 0.7;

/** Standard deviation of Rng.nextBell, which is four uniforms recentered. */
const BELL_SD = 0.2887;

/** The aim numbers, for the tuning fingerprint. See core/tuning.ts. */
export const AIM_TUNING: readonly number[] = [
  MAX_AIM_SIGMA,
  VERTICAL_SCATTER,
  POWER_SIGMA,
  PRESSURE_SIGMA,
  TIMING_SIGMA,
  BELL_SD,
  LOFT_SHARE,
];

export interface ShotContext {
  /** Where the ball is being struck from. */
  origin: Vec3;
  /** 0..1. Sudden death and match point push this up. Phase 1 passes 0. */
  pressure?: number;
  /**
   * How much of the shot goes up rather than forward, 0 to 1.
   *
   * A penalty passes 0 and is unchanged by any of this. A free kick passes the
   * taker's `dip`, which is what lets one player go over a wall and another
   * drive it into the second man.
   */
  loft?: number;
  /**
   * The target is further away and half of it is behind four people.
   *
   * Scales the aim error. The sigmas were tuned against a penalty with a clear
   * sight of an open goal from eleven metres, and the same numbers from twenty
   * with a wall across the near post are a different proposition entirely.
   */
  aimEase?: number;
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
  // Sigmas add. Accuracy sets the floor, power and pressure widen it, and a
  // bad contact adds on top regardless of who is taking it. Composure offsets
  // only the pressure part: a composed player is not a more accurate one, they
  // are one who stays as accurate as usual when it matters.
  const sigma =
    aimSigma(player.accuracy) * (1 + mistimed * TIMING_SPREAD) +
    power * POWER_SIGMA * (1 - unit(player.accuracy)) +
    pressure * PRESSURE_SIGMA * (1 - unit(player.composure)) +
    mistimed * TIMING_SIGMA;

  const spread = sigma * clamp(context.aimEase ?? 1, 0.2, 1);

  const scatter = (): number => (rng.nextBell() / BELL_SD) * spread;

  // A scuff squirts back toward the middle of the goal and stays low. This is
  // the real cost of bad timing: not that the ball goes somewhere random, but
  // that it stops finding the corners, where the goals are.
  const centred = 1 - mistimed * TIMING_CENTRE_PULL;

  // It also drags in a consistent direction, so releasing early pulls it left
  // every time rather than scattering unpredictably.
  const targetX = intendedX * centred + timing * TIMING_PULL + scatter();
  // Height is the better-controlled axis. Equal scatter on both put a third of
  // all shots into the bar or over it, because the goal is only 2.44 m tall and
  // a miss upward leaves the frame far sooner than a miss sideways.
  const targetY = Math.max(0, intendedY * centred + scatter() * VERTICAL_SCATTER);

  // Strike speed, scaled by the player's power and cut by a poor contact.
  const speed =
    (MIN_STRIKE_SPEED + (MAX_STRIKE_SPEED - MIN_STRIKE_SPEED) * power) *
    (0.85 + 0.3 * unit(player.power)) *
    (1 - mistimed * TIMING_PACE_LOSS);

  const loft = clamp(context.loft ?? 0, 0, 1);
  const velocity = launchVelocity(origin, targetX, targetY, speed, loft);

  /**
   * Lofting changes the arc, not the swerve.
   *
   * Sideways deflection grows with the square of the flight, and lofting a
   * free kick doubles how long the ball is in the air - so the same hook that
   * bent a penalty 24 cm bent a lofted free kick 1.69 m, and a dead straight
   * drag still finished a third of a metre off the aim. Reported as "the ball
   * goes nowhere near where you aimed", which it did.
   *
   * The distance part of that is wanted and is the whole argument for free
   * kicks: a longer flight should bend more. The *loft* part is not. Choosing
   * to go over a wall is a decision about height and has no business
   * multiplying a decision about direction, so the spin is scaled back by
   * exactly the extra time the loft bought.
   */
  const stretch = 1 - loft * LOFT_SHARE;

  // Spin about +y bends the flight along +x, so a positive curve input pushes
  // the ball to the taker's right. A left foot naturally opens the other way.
  const footBias = player.foot === 'left' ? -0.08 : 0.08;
  const sideSpin =
    (clamp(input.curve, -1, 1) + footBias) *
    MAX_SIDE_SPIN *
    (0.6 + 0.4 * unit(player.curve)) *
    stretch *
    stretch;

  // Spin about +x drives the ball down, so lift above 0.5 is topspin.
  const liftSpin = (clamp(input.lift, 0, 1) * 2 - 1) * MAX_LIFT_SPIN;

  return {
    origin,
    velocity,
    spin: vec(liftSpin, sideSpin, 0),
    // Deliberately the INTENDED target, not where the ball actually went. A
    // keeper reads the run-up and the plant foot, so what they get is where
    // you were trying to put it. Every source of error after this point -
    // accuracy, nerves, a bad contact - moves the ball away from what they
    // read. When the keeper read the struck direction instead, mistiming was
    // invisible to them: the ball moved and they simply followed it.
    aimPoint: { x: intendedX, y: intendedY },
  };
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
function launchVelocity(
  origin: Vec3,
  targetX: number,
  targetY: number,
  speed: number,
  /**
   * How much of the shot goes up rather than forward, 0 to 1.
   *
   * Until this existed there was exactly one trajectory to any target: the
   * horizontal speed was fixed by the distance, so the solver only ever chose
   * how steeply to launch, and the answer was always the flattest arc that
   * arrives. That is the right shape for a penalty and the wrong one for a
   * free kick, where the whole point is to go over four people standing nine
   * metres away and come down again before the crossbar.
   *
   * Lofting spends part of the speed budget going up. The ball takes longer to
   * arrive, so the solver has to launch it higher still, and the arc that
   * results clears the wall and drops onto the same target.
   */
  loft = 0
): Vec3 {
  const dx = targetX - origin.x;
  // The goal plane is at z = 0 and the ball starts behind it.
  const dz = -origin.z;

  const horizontal = Math.sqrt(dx * dx + dz * dz);
  const forward = speed * (1 - clamp(loft, 0, 1) * LOFT_SHARE);
  const flat = Math.max(horizontal / forward, 1e-3);

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
