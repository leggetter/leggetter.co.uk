/**
 * The keeper.
 *
 * It never sees the ShotInput. It watches the ball, and after its reaction time
 * has passed it predicts where the shot will cross the line and commits to a
 * dive. Everything about how hard it is to beat lives in its profile, so a new
 * keeper is a data file rather than a code change.
 *
 * One consequence is deliberate and is the most interesting thing here: the
 * prediction extrapolates the ball's current velocity and ignores the Magnus
 * force. A curled shot therefore ends up somewhere the keeper never accounted
 * for, so bending it round a committed keeper works for the same reason it
 * works in life. Nothing special-cases curve to make that happen.
 */

import { flyToLine } from './predict.ts';
import type { BallState, KeeperProfile, KeeperState } from './types.ts';
import { vec, type Vec3 } from './vec3.ts';

/** Hands at rest: on the line, centered, about waist height. */
const STANDING: Vec3 = vec(0, 0.95, 0);

/** Furthest the hands travel sideways from standing. A dive has a limit. */
const MAX_DIVE_X = 2.75;

/** Vertical span the hands can cover, from a low dive to a full stretch. */
const MIN_HAND_Y = 0.18;
const MAX_HAND_Y = 2.35;

/** How wide a misread can be, in meters, at readAccuracy 0. */
const READ_SPREAD = 2.2;

/**
 * Everything random about this keeper on this shot, sampled once when the shot
 * starts. Deciding it all up front keeps the number of RNG draws independent of
 * how the flight plays out, which is what keeps a replay identical.
 */
export interface KeeperPlan {
  guesses: boolean;
  guessX: number;
  guessY: number;
  readErrorX: number;
  readErrorY: number;
}

export interface KeeperSim {
  state: KeeperState;
  plan: KeeperPlan;
}

export interface KeeperRng {
  next(): number;
  nextBell(): number;
}

export function planKeeper(profile: KeeperProfile, rng: KeeperRng): KeeperSim {
  const guesses = rng.next() < profile.guessBias;
  // A guess is a committed dive to one side, picked before the ball moves.
  const side = rng.next() < 0.5 ? -1 : 1;
  return {
    state: { hands: STANDING, target: null, committed: false },
    plan: {
      guesses,
      guessX: side * MAX_DIVE_X * (0.55 + rng.next() * 0.45),
      guessY: MIN_HAND_Y + rng.next() * (MAX_HAND_Y - MIN_HAND_Y) * 0.7,
      readErrorX: rng.nextBell(),
      readErrorY: rng.nextBell(),
    },
  };
}

/**
 * Advance the keeper by one step.
 *
 * `elapsed` is seconds since the ball was struck. Pure: the same arguments
 * always give the same result.
 */
export function stepKeeper(
  sim: KeeperSim,
  profile: KeeperProfile,
  ball: BallState,
  elapsed: number,
  dt: number
): KeeperSim {
  let { target, committed } = sim.state;

  if (!committed) {
    if (sim.plan.guesses) {
      // Already moving before the ball was struck. Beatable down the middle.
      target = vec(sim.plan.guessX, sim.plan.guessY, 0);
      committed = true;
    } else if (elapsed * 1000 >= profile.reactionMs) {
      target = readShot(sim.plan, profile, ball);
      committed = true;
    }
  }

  if (!target) return sim;

  return {
    plan: sim.plan,
    state: { hands: moveToward(sim.state.hands, target, profile.diveSpeed * dt), target, committed },
  };
}

/**
 * Predict the crossing point and add the keeper's misread.
 *
 * Uses the shared spin-blind predictor, so the keeper accounts for drag (which
 * it can see, in how fast the ball is travelling) but not for Magnus (which it
 * cannot). See core/predict.ts for why that split is the design.
 *
 * If the read fails because the ball is not heading goalward, the keeper holds
 * its ground rather than diving at nothing.
 */
function readShot(plan: KeeperPlan, profile: KeeperProfile, ball: BallState): Vec3 {
  const arrival = flyToLine(ball.position, ball.velocity);
  if (!arrival) return STANDING;

  const miss = (1 - clamp01(profile.readAccuracy)) * READ_SPREAD;

  return vec(
    clamp(arrival.x + plan.readErrorX * miss, -MAX_DIVE_X, MAX_DIVE_X),
    clamp(arrival.y + plan.readErrorY * miss * 0.6, MIN_HAND_Y, MAX_HAND_Y),
    0
  );
}

function moveToward(from: Vec3, to: Vec3, maxStep: number): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= maxStep || distance === 0) return vec(to.x, to.y, from.z);
  const k = maxStep / distance;
  return vec(from.x + dx * k, from.y + dy * k, from.z);
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number): number => clamp(v, 0, 1);

export { STANDING as KEEPER_STANDING, MAX_DIVE_X };
