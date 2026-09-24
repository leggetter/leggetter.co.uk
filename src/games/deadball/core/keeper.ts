/**
 * The keeper.
 *
 * It never sees the ShotInput. Everything about how hard it is to beat lives in
 * its profile, so a new keeper is a data file rather than a code change.
 *
 * It goes one of three ways on any given shot, and which one is the most
 * important thing about it. A penalty is airborne for about 450 ms and a corner
 * is further than that, so a keeper who waits for the ball has already lost:
 * most of the time it has to commit at or before contact and read the taker
 * instead. Reacting is the exception. The first version had that backwards,
 * with reaction as the default, and it showed - the keeper visibly hung about
 * waiting to see where the ball went.
 *
 * What holds across all three: none of them can see spin. An anticipating
 * keeper reads where the boot sent the ball, a reacting one reads the line it
 * is travelling on now, and Magnus takes it somewhere neither accounted for.
 * That is why bending it round a committed keeper works, and nothing
 * special-cases curve to make it happen.
 */

import { GOAL_HEIGHT, GOAL_WIDTH } from './units.ts';
import { flyToLine } from './predict.ts';
import type { BallState, KeeperProfile, KeeperState, KeeperStyle } from './types.ts';
import { distance as apart, vec, type Vec3 } from './vec3.ts';

/** Hands at rest: on the line, centered, about waist height. */
const STANDING: Vec3 = vec(0, 0.95, 0);

/**
 * The shuffle along the line while the taker is settling.
 *
 * Small on purpose: a keeper shifts their weight and edges a step either way,
 * they do not wander to a post. And it is driven by nothing except time and the
 * shot seed - never by where the shot is aimed, because the keeper cannot see
 * that and a keeper that drifted toward your corner would be cheating.
 *
 * It is not decoration. Wherever they have drifted to is where the dive starts
 * from, so a keeper caught leaning left has further to travel going right. That
 * gives the player something to watch and react to before releasing, which is
 * the decision the game otherwise does not have.
 */
const IDLE_RANGE = 0.42;
const IDLE_PERIOD = 2.6;

/** Torso height when upright, and how far it drops at full stretch. */
const BODY_STANDING_Y = 0.9;
const BODY_DIVE_DROP = 0.42;

/**
 * Shoulder to fingertips, in meters.
 *
 * A constant, which is the thing it was not. The torso used to travel a
 * FRACTION of the way to the hands, so the further the keeper reached the
 * longer its arm had to be - and once the dive was allowed to cover the whole
 * goal, a save in the top corner grew an arm over a meter and a half long.
 *
 * An arm is an arm. The body covers whatever the arm does not.
 */
export const ARM_SPAN = 0.72;

/** Body travel at which the keeper is flat out, for the extra torso drop. */
const MAX_BODY_TRAVEL = 2.6;

/**
 * Furthest the hands travel sideways from where the keeper is standing.
 *
 * Generous on purpose. There should be no part of the goal a keeper simply
 * cannot get to: the corners are hard because they are rarely where the keeper
 * went, not because the geometry forbids it. Keeping this short left a band at
 * each post that was free by construction, and a shot placed there was never a
 * contest.
 */
const MAX_DIVE_X = 3.95;

/**
 * How far past the frame the hands may finish.
 *
 * Some overshoot is right: a keeper diving for the top corner ends up with an
 * arm outside the post, and stopping them dead on the line looks like they hit
 * a wall. Far past it is not a save, it is a keeper leaving the pitch, which is
 * what an unbounded dive produced.
 */
const BEYOND_FRAME = 0.35;
const KEEPER_LIMIT_X = GOAL_WIDTH / 2 + BEYOND_FRAME;
const KEEPER_LIMIT_Y = GOAL_HEIGHT + BEYOND_FRAME * 0.5;

/** Vertical span the hands can cover, from a low dive to a full stretch. */
const MIN_HAND_Y = 0.18;
const MAX_HAND_Y = 2.52;

/**
 * Standard deviation of a keeper's misread at readAccuracy 0, in meters.
 * Scales linearly to zero at readAccuracy 1.
 *
 * Expressed as a sigma rather than a spread because the first version quietly
 * multiplied by `nextBell`, whose standard deviation is 0.29 and not 1. The
 * keeper's read was therefore about a fifth as wide as intended, it reached
 * almost everything, and the release timing had nothing left to influence.
 */
const MAX_READ_SIGMA = 2.6;

/** Standard deviation of Rng.nextBell, which is four uniforms recentered. */
const BELL_SD = 0.2887;

/** Vertical reads are better than lateral ones: height is easier to judge. */
const VERTICAL_READ_FACTOR = 0.6;

/**
 * How much worse a body-shape read is than watching the ball. Guessing from
 * the run-up is genuinely harder than reading a ball already in flight; the
 * compensation is getting to start moving a fifth of a second earlier.
 */
const ANTICIPATION_PENALTY = 1.45;

/**
 * How much of a keeper's misread a fully telegraphed contact takes away.
 *
 * A scuffed penalty is the easiest kind to read: the taker leans away from it,
 * it comes off the wrong part of the boot, and it arrives slowly. So the
 * shot's `tell` - 0 for a clean strike, 1 for a plainly bad one - shrinks the
 * read error by up to this fraction, for a keeper reading the taker and for
 * one reading the ball alike.
 *
 * Not all of it. A keeper who knew exactly where every scuff was going would
 * save every one, and a mistimed penalty should be a worse penalty rather than
 * a certain miss. Measured against the default keeper, 2,000 penalties a row
 * over a spread of aims, powers and all three styles: clean 64%, mistimed by
 * 0.3 49%, by 0.6 32%, where it was 64%, 66% and 68% before - the bar used to
 * pay you for missing it.
 *
 * A person in goal ignores this entirely: they chose where to go before the
 * ball was struck and read nothing. Against them a bad contact costs only in
 * how often it misses the target, which is `TIMING_SIGMA` and
 * `TIMING_CENTRE_PULL`.
 */
const TELL_READ = 0.65;

/** How long it takes to come down and finish flat. */
const LANDING_SECONDS = 0.38;

/** The keeper numbers, for the tuning fingerprint. See core/tuning.ts. */
export const KEEPER_TUNING: readonly number[] = [
  MAX_READ_SIGMA,
  ANTICIPATION_PENALTY,
  VERTICAL_READ_FACTOR,
  MAX_DIVE_X,
  BEYOND_FRAME,
  MIN_HAND_Y,
  MAX_HAND_Y,
  ARM_SPAN,
  MAX_BODY_TRAVEL,
  BODY_STANDING_Y,
  BODY_DIVE_DROP,
  IDLE_RANGE,
  IDLE_PERIOD,
  TELL_READ,
];

/**
 * Everything random about this keeper on this shot, sampled once when the shot
 * starts. Deciding it all up front keeps the number of RNG draws independent of
 * how the flight plays out, which is what keeps a replay identical.
 */
export interface KeeperPlan {
  style: KeeperStyle;
  guessX: number;
  guessY: number;
  readErrorX: number;
  readErrorY: number;
  /** Where the boot sent it, for an anticipating keeper to read. */
  aimPoint: { x: number; y: number };
  /** Where along the line the keeper was standing when the ball was struck. */
  startX: number;
  /** Where a person chose to dive, already clamped to somewhere reachable. */
  chosen: Vec3 | null;
  /** How plainly the contact gave itself away, 0 to 1. See `TELL_READ`. */
  tell: number;
}

export interface KeeperSim {
  state: KeeperState;
  plan: KeeperPlan;
}

export interface KeeperRng {
  next(): number;
  nextBell(): number;
}

/**
 * Where the keeper has shuffled to after `seconds` of the taker settling.
 *
 * Two offset sine waves rather than one, so the drift does not read as a
 * metronome the player can simply count. Sine is fine here: this is the idle,
 * and `startX` is captured into the flight at the moment of contact, so a
 * replay reads the recorded number and never runs this.
 */
export function idleDrift(seconds: number, seed: number): number {
  const phase = (seed % 1000) / 1000;
  const a = Math.sin((seconds / IDLE_PERIOD + phase) * Math.PI * 2);
  const b = Math.sin((seconds / (IDLE_PERIOD * 0.41) + phase * 2) * Math.PI * 2);
  return (a * 0.7 + b * 0.3) * IDLE_RANGE;
}

export function planKeeper(
  profile: KeeperProfile,
  rng: KeeperRng,
  aimPoint: { x: number; y: number } = { x: 0, y: 1 },
  startX = 0,
  /**
   * Where a person decided to dive, if one is keeping.
   *
   * Replaces the read, not the body. readAccuracy, guessBias and anticipation
   * all fall away - a human keeper is exactly as good as their guess - while
   * the dive speed, the reach and where a keeper can physically get to are
   * unchanged. Picking the top corner and being right still does not save a
   * shot struck hard and low into it.
   */
  chosen: { x: number; y: number } | null = null,
  /** The shot's `tell`: how readable a bad contact made it. */
  tell = 0
): KeeperSim {
  // Guess, anticipate, or react, in that order of the roll. Whatever is not
  // claimed by the first two is a reaction, so a profile that sets neither
  // gets the old always-waiting keeper and that is a visible choice.
  const roll = rng.next();
  const style: KeeperStyle = chosen
    ? 'human'
    : roll < profile.guessBias
      ? 'guess'
      : roll < profile.guessBias + profile.anticipation
        ? 'anticipate'
        : 'react';

  const side = rng.next() < 0.5 ? -1 : 1;
  return {
    // The dive starts from wherever the shuffle had got to, not from centre.
    state: (() => {
      const hands = vec(startX, STANDING.y, 0);
      return {
        stance: startX,
        hands,
        body: bodyFor(hands, startX),
        target: null,
        committed: false,
        landed: 0,
      };
    })(),
    plan: {
      style,
      guessX: side * Math.min(MAX_DIVE_X, KEEPER_LIMIT_X) * (0.55 + rng.next() * 0.45),
      guessY: MIN_HAND_Y + rng.next() * (MAX_HAND_Y - MIN_HAND_Y) * 0.7,
      readErrorX: rng.nextBell(),
      readErrorY: rng.nextBell(),
      aimPoint,
      startX,
      chosen: chosen ? reachable(chosen.x, chosen.y, startX) : null,
      tell: clamp01(tell),
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
  dt: number,
  /** Shot is over: finish the dive and come down, rather than hanging there. */
  landing = false
): KeeperSim {
  let { target, committed } = sim.state;

  if (landing && target) {
    target = vec(target.x, MIN_HAND_Y, 0);
  }
  const landed = landing
    ? Math.min(1, sim.state.landed + dt / LANDING_SECONDS)
    : sim.state.landed;

  if (!committed) {
    if (sim.plan.style === 'human' && sim.plan.chosen) {
      // Committed before the ball was struck, by somebody who could not see
      // where it was going. Exactly where they said, no read error.
      target = sim.plan.chosen;
      committed = true;
    } else if (sim.plan.style === 'guess') {
      // Already going before the ball was struck. Beatable down the middle.
      target = vec(sim.plan.guessX, sim.plan.guessY, 0);
      committed = true;
    } else if (sim.plan.style === 'anticipate') {
      // Moving from the moment of contact, off the taker's body shape rather
      // than off the ball. Blind to spin, so a curled shot beats it.
      target = readAim(sim.plan, profile);
      committed = true;
    } else if (elapsed * 1000 >= profile.reactionMs) {
      target = readShot(sim.plan, profile, ball);
      committed = true;
    }
  }

  if (!target) return { plan: sim.plan, state: { ...sim.state, landed } };

  // The feet stay where they were planted; only the hands travel.
  const { stance } = sim.state;
  const hands = moveToward(
    sim.state.hands,
    target,
    profile.diveSpeed * dt * (landing ? 1 : urgency(sim.state.hands, target, profile, ball))
  );
  return {
    plan: sim.plan,
    state: { stance, hands, body: bodyFor(hands, stance), target, committed, landed },
  };
}

/**
 * How long a keeper wants to be at full stretch before the ball arrives.
 *
 * Not zero: arriving exactly with it means a hand that is still travelling
 * when the ball passes, which reads as a late dive even when the arithmetic
 * says it was in time.
 */
const DIVE_LEAD = 0.08;

/**
 * Whether to go now, or stay set a moment longer.
 *
 * The dive used to run at `diveSpeed` from the instant of commitment, which is
 * right for a penalty and wrong for everything slower. A penalty is in the air
 * for 0.41 s and the hands take about that long to reach a corner, so the two
 * finished together by luck rather than by design. A lofted free kick is in
 * the air for 1.67 s: the keeper reached full stretch after 0.4 s and then
 * **hung there for over a second**, which is exactly how it was reported.
 *
 * So the dive is *paced* to the ball rather than run flat out and parked. The
 * commitment is untouched - a keeper decides where to go at the same moment,
 * off the same information, with the same error - and so is the top speed,
 * which no keeper exceeds. What changes is that one with a second to spare
 * spends it, instead of spending 0.4 s and waiting out the rest.
 *
 * **It keeps moving the whole way.** An earlier attempt held the keeper still
 * and then went flat out, which reads better in prose and broke a property
 * this project protects on purpose: an anticipating keeper is *moving at
 * contact*, because that is the only way to reach a corner in 450 ms, and a
 * test says so. Pacing satisfies both.
 *
 * Returns 1 whenever the ball arrives as fast as the keeper can travel, so
 * nothing about a penalty changes: there, the answer is always "flat out".
 */
function urgency(hands: Vec3, target: Vec3, profile: KeeperProfile, ball: BallState): number {
  const arrival = flyToLine(ball.position, ball.velocity);
  // No read, or the ball is going nowhere near: no reason to hold anything
  // back, and this is also the ball settling after the outcome.
  if (!arrival) return 1;

  const left = arrival.time - DIVE_LEAD;
  if (left <= 0) return 1;

  const needed = apart(hands, target) / left;
  return Math.min(1, needed / Math.max(profile.diveSpeed, 1e-3));
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

  const sigma = readSigma(profile, 1, plan.tell);

  return reachable(
    arrival.x + plan.readErrorX * sigma,
    arrival.y + plan.readErrorY * sigma * VERTICAL_READ_FACTOR,
    plan.startX
  );
}

/**
 * Read the shot off the taker rather than off the ball.
 *
 * Takes the point the boot actually sent the ball toward and blurs it. A
 * body-shape read is worse than watching the ball, so the error is wider here
 * than in `readShot`. The trade is that this keeper is already moving at
 * contact, which is the only way to reach a corner in 450 ms.
 */
function readAim(plan: KeeperPlan, profile: KeeperProfile): Vec3 {
  const sigma = readSigma(profile, ANTICIPATION_PENALTY, plan.tell);
  return reachable(
    plan.aimPoint.x + plan.readErrorX * sigma,
    plan.aimPoint.y + plan.readErrorY * sigma * VERTICAL_READ_FACTOR,
    plan.startX
  );
}

/** Somewhere the keeper can actually get to, and is allowed to be. */
function reachable(x: number, y: number, stance: number): Vec3 {
  return vec(
    clamp(
      clamp(x, stance - MAX_DIVE_X, stance + MAX_DIVE_X),
      -KEEPER_LIMIT_X,
      KEEPER_LIMIT_X
    ),
    clamp(clamp(y, MIN_HAND_Y, MAX_HAND_Y), MIN_HAND_Y, KEEPER_LIMIT_Y),
    0
  );
}

/**
 * How wide this keeper's read is, as a multiplier on a `nextBell` draw.
 * Divided by BELL_SD so the configured sigma is the sigma you actually get,
 * and narrowed by however plainly a bad contact gave the shot away.
 */
function readSigma(profile: KeeperProfile, penalty: number, tell: number): number {
  const blind = (1 - clamp01(profile.readAccuracy)) * MAX_READ_SIGMA * penalty;
  return (blind * (1 - clamp01(tell) * TELL_READ)) / BELL_SD;
}

/**
 * Where the torso and legs are, given where the hands have got to.
 *
 * Derived rather than simulated: the body is always a fixed fraction of the way
 * toward the dive, and drops as the keeper extends. Crude, and enough to mean
 * the middle of the goal is never simply vacated.
 */
export function bodyFor(hands: Vec3, stance: number): Vec3 {
  const dx = hands.x - stance;
  const dy = hands.y - STANDING.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 1e-4) return vec(stance, BODY_STANDING_Y, 0);

  // Everything past one arm's length has to be covered by the body going
  // there, so the torso ends up an arm short of the hands however far the
  // keeper threw itself.
  const travel = Math.max(0, distance - ARM_SPAN);
  const t = travel / distance;
  const flatness = Math.min(1, travel / MAX_BODY_TRAVEL);

  return vec(
    stance + dx * t,
    Math.max(0.2, BODY_STANDING_Y + dy * t - BODY_DIVE_DROP * flatness),
    0
  );
}

/** How far into a dive the keeper is, 0 upright and 1 at full stretch. */
export const diveExtension = (handsX: number, stance: number): number =>
  Math.min(1, Math.abs(handsX - stance) / MAX_DIVE_X);

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
