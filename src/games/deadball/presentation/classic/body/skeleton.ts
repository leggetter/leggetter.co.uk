/**
 * A jointed body, from a handful of targets.
 *
 * Phase 1 of issue #72. The figures `classic` draws today are six points -
 * feet, shoulder, head, two hands, two toes - joined by thick lines, with no
 * hips, knees or elbows. This works out where all of those go, so a figure can
 * bend like a body instead of pivoting like a compass.
 *
 * **Pure, and deliberately kept apart from the rest of `classic`.** No canvas,
 * no drawing, nothing imported from the package around it: it takes targets in
 * world metres and returns joints in world metres. That is what lets it move
 * out into a shared toolkit when a second package needs it (phase 4 of #72)
 * without being rewritten. `body.test.ts` enforces the separation.
 *
 * It takes *targets*, not a frame. Turning a frame into targets - where the
 * keeper's hands are mid-dive, how far into the run-up the taker is - is what
 * `drawKeeper` and `drawTaker` already do, tangled up with the drawing. Pulling
 * that out is phase 2, when `classic` starts drawing these joints.
 */

import { PROPORTIONS } from '../../../content/proportions.js';
import {
  add,
  cross,
  distance,
  dot,
  length,
  normalize,
  scale,
  sub,
  vec,
  type Vec3,
} from '../../../core/vec3.ts';
import { perpendicularTo, twoBone } from './ik.ts';

/** Bone lengths in metres. See content/proportions.js for what each one is. */
export interface Proportions {
  spine: number;
  neck: number;
  headRadius: number;
  shoulderWidth: number;
  hipWidth: number;
  upperArm: number;
  forearm: number;
  hand: number;
  thigh: number;
  shin: number;
  foot: number;
}

/** What a 1.80 m footballer is built like, when the content file says nothing useful. */
export const DEFAULT_PROPORTIONS: Proportions = {
  spine: 0.5,
  neck: 0.23,
  headRadius: 0.115,
  shoulderWidth: 0.4,
  hipWidth: 0.2,
  upperArm: 0.31,
  forearm: 0.27,
  hand: 0.16,
  thigh: 0.46,
  shin: 0.44,
  foot: 0.24,
};

/**
 * Proportions, cleaned.
 *
 * content/ is edited by hand, so every field is checked on its own: a typo in
 * one bone costs that bone its custom length, not the whole body. Anything
 * that is not a positive, finite length under two metres falls back.
 */
export function cleanProportions(raw: unknown): Proportions {
  const source = (raw ?? {}) as Record<string, unknown>;
  const clean = { ...DEFAULT_PROPORTIONS };
  for (const key of Object.keys(DEFAULT_PROPORTIONS) as (keyof Proportions)[]) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 2) {
      clean[key] = value;
    }
  }
  return clean;
}

/** The proportions everybody is drawn with. */
export const BODY: Proportions = cleanProportions(PROPORTIONS);

/**
 * The same body, bigger or smaller.
 *
 * Every length scales together, so a 1.60 m player is a 1.80 m one shrunk
 * rather than one with short legs. Anything that must not scale - a keeper's
 * glove is the save radius, not a body part - is the caller's to leave alone.
 */
export function scaleProportions(body: Proportions, factor: number): Proportions {
  const scaled = { ...body };
  for (const key of Object.keys(body) as (keyof Proportions)[]) scaled[key] = body[key] * factor;
  return scaled;
}

/** Where a body should end up. Every point is in world metres. */
export interface BodyTargets {
  /** The middle of the hips. The body hangs off this. */
  pelvis: Vec3;
  /**
   * Which way the spine points: somewhere toward the top of the torso.
   *
   * A direction, not a position - the spine keeps its length, so the chest
   * lands `spine` metres from the pelvis along the line to this point.
   */
  chest: Vec3;
  /** Which way the chest faces. Only the part at right angles to the spine counts. */
  facing: Vec3;
  /**
   * Where the hands should be, in either order.
   *
   * Each goes to whichever shoulder makes the pair nearest, so a caller that
   * only knows "two hands" - which is all `classic` knows today - does not
   * have to decide which is which.
   */
  hands: readonly [Vec3, Vec3];
  /** Where the ankles should be, in either order, on the same terms as the hands. */
  ankles: readonly [Vec3, Vec3];
  /** Which way the head sits from the chest. Straight on up the spine if left out. */
  head?: Vec3;
  /**
   * Which way each boot points: a point the toe aims at, one per ankle and
   * paired with it.
   *
   * Left out, a boot lies flat along the ground in the direction the body
   * faces, which is right for somebody standing and wrong for a kick. A boot
   * swinging through a ball points down and turns out, a trailing foot points
   * back, and a foot pushing off the grass has its heel up. Phase 3 of #72.
   */
  toes?: readonly [Vec3, Vec3];
  /**
   * The hands and ankles are `[left, right]` exactly as given, with no pairing.
   *
   * Pairing by reach is right for a keeper, whose hands are two points either
   * of which could be either glove. It is wrong for a kick: the kicking foot
   * swings past the standing one, and a pairing that swapped the legs over as
   * it did would draw the planted foot leaving the ground.
   */
  sided?: boolean;
  /**
   * How far the knees turn out, 0 straight ahead and 1 about 45 degrees.
   *
   * A deep squat with the knees straight ahead is foreshortened to nothing
   * from in front; turned out, it is the wide, low shape anybody reads as
   * "about to jump". Only the bend direction changes, not where the feet go.
   */
  kneesOut?: number;
  /**
   * The hands must land on their targets, even if the body has to move.
   *
   * For a keeper, whose hands are where saves are decided. Normally the body
   * stays put and a hand out of reach is drawn at full stretch toward its
   * target; with this set, the whole body is carried toward the hand instead.
   * It is the rule `core/keeper.ts` already states for ARM_SPAN - "an arm is
   * an arm; the body covers whatever the arm does not" - applied to drawing.
   */
  keepHands?: boolean;
}

/** One side of a body. */
export interface Side {
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  toe: Vec3;
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  /** The middle of the hand: where a glove is drawn, and what a save is measured to. */
  hand: Vec3;
}

export interface Skeleton {
  pelvis: Vec3;
  /** The top of the torso, between the shoulders. */
  chest: Vec3;
  /** The middle of the head. */
  head: Vec3;
  /** The body's own left and right, not the viewer's. */
  left: Side;
  right: Side;
  /**
   * Whether each hand and foot got to its target.
   *
   * Phase 2 will lean on this: the keeper's drawn hands have to be where the
   * simulation says they are, and a false here means they are not.
   */
  reached: { leftHand: boolean; rightHand: boolean; leftFoot: boolean; rightFoot: boolean };
}

const UP = vec(0, 1, 0);

/**
 * Split two targets between a left and a right anchor.
 *
 * **Reachable first, nearest second.** The pairing that leaves the limbs
 * least out of reach wins, and only when that is a tie does the shorter total
 * distance decide - which is what uncrosses crossed-over input.
 *
 * Nearest-only was the first version and it was wrong in a way that only
 * showed across real dives. Early in a dive a keeper's glove can sit almost on
 * one shoulder, closer than an arm can fold; nearest-only gave that shoulder
 * that glove anyway, which pushed the other glove out of the other arm's
 * reach, when swapping them had both comfortably in range. With the body being
 * carried toward whichever glove was missed, the pairing then flipped on every
 * pass and never settled.
 */
function pairUp(
  targets: readonly [Vec3, Vec3],
  left: Vec3,
  right: Vec3,
  closest: number,
  furthest: number
): [Vec3, Vec3] {
  const [a, b] = targets;
  const outOfReach = (target: Vec3, anchor: Vec3): number => {
    const d = distance(target, anchor);
    return Math.max(0, d - furthest) + Math.max(0, closest - d);
  };
  const missAsGiven = outOfReach(a, left) + outOfReach(b, right);
  const missSwapped = outOfReach(a, right) + outOfReach(b, left);
  if (Math.abs(missAsGiven - missSwapped) > 1e-9) return missSwapped < missAsGiven ? [b, a] : [a, b];
  const asGiven = distance(a, left) + distance(b, right);
  const swapped = distance(a, right) + distance(b, left);
  return swapped < asGiven ? [b, a] : [a, b];
}

/** Solve the whole body. Same targets in, same joints out, every time. */
export function solveBody(targets: BodyTargets, body: Proportions = BODY): Skeleton {
  let { skeleton: solved, handTargets } = solveInPlace(targets, body);
  if (!targets.keepHands) return solved;

  // Carry the body toward whichever hand is furthest short, and solve again.
  // A few passes is plenty: after the first, both hands are usually in reach,
  // and a second only happens when they pull in different directions.
  let pelvis = targets.pelvis;
  let chest = targets.chest;
  for (let pass = 0; pass < 6; pass++) {
    if (solved.reached.leftHand && solved.reached.rightHand) break;
    // Each hand chases the target the solve gave it. Guessing from which
    // target a drawn hand is nearest to looked equivalent and was not: when
    // both hands fell short toward the same glove, both chose it, the other
    // glove was never chased, and the body was dragged half a metre off
    // course. Caught by running every frame of 105 real dives.
    let gap: Vec3 | null = null;
    for (const [drawn, target] of [
      [solved.left.hand, handTargets[0]],
      [solved.right.hand, handTargets[1]],
    ] as const) {
      const short = sub(target, drawn);
      if (!gap || length(short) > length(gap)) gap = short;
    }
    if (!gap || length(gap) === 0) break;
    // A centimetre past exactly, so the arm ends up just short of locked
    // rather than balanced on the edge of reaching.
    const carry = add(gap, scale(normalize(gap), 0.01));
    pelvis = add(pelvis, carry);
    chest = add(chest, carry);
    ({ skeleton: solved, handTargets } = solveInPlace({ ...targets, pelvis, chest }, body));
  }
  return solved;
}

/** One solve, with the body exactly where it was put, and which hand target went to which side. */
function solveInPlace(
  targets: BodyTargets,
  body: Proportions
): { skeleton: Skeleton; handTargets: [Vec3, Vec3] } {
  // The body's own frame: up the spine, forward out of the chest, and right.
  const spineLine = sub(targets.chest, targets.pelvis);
  const up = length(spineLine) > 0 ? normalize(spineLine) : UP;

  // Facing, with any lean along the spine taken out. If it pointed straight
  // up the spine there is nothing left, so fall back to the world's forward -
  // toward the goal - and failing that to anything at right angles.
  const flatten = (v: Vec3): Vec3 => sub(v, scale(up, dot(v, up)));
  let forward = normalize(flatten(targets.facing));
  if (length(forward) === 0) forward = normalize(flatten(vec(0, 0, 1)));
  if (length(forward) === 0) forward = perpendicularTo(up);

  // Facing +z with up +y, this is +x - the same way the camera behind the
  // taker sees right, so a taker's right hand is on the right of the screen.
  const right = cross(up, forward);

  const pelvis = targets.pelvis;
  const chest = add(pelvis, scale(up, body.spine));
  const headLine = targets.head ? sub(targets.head, chest) : up;
  const head = add(chest, scale(length(headLine) > 0 ? normalize(headLine) : up, body.neck));

  const shoulders = {
    left: add(chest, scale(right, -body.shoulderWidth / 2)),
    right: add(chest, scale(right, body.shoulderWidth / 2)),
  };
  const hips = {
    left: add(pelvis, scale(right, -body.hipWidth / 2)),
    right: add(pelvis, scale(right, body.hipWidth / 2)),
  };

  const armOut = body.upperArm + body.forearm + body.hand;
  const armIn = Math.abs(body.upperArm - body.forearm - body.hand);
  const [leftHandTarget, rightHandTarget] = targets.sided
    ? [targets.hands[0], targets.hands[1]]
    : pairUp(targets.hands, shoulders.left, shoulders.right, armIn, armOut);
  const [leftAnkleTarget, rightAnkleTarget] = targets.sided
    ? [targets.ankles[0], targets.ankles[1]]
    : pairUp(
        targets.ankles, hips.left, hips.right, Math.abs(body.thigh - body.shin), body.thigh + body.shin
      );
  // A toe goes with its ankle, whichever side the pairing gave that ankle to.
  const toeTargets = targets.toes
    ? leftAnkleTarget === targets.ankles[0]
      ? [targets.toes[0], targets.toes[1]]
      : [targets.toes[1], targets.toes[0]]
    : null;

  // Toes point along the ground in the direction the body faces. A body lying
  // flat still has feet, and they still point somewhere sensible.
  const level = normalize(vec(forward.x, 0, forward.z));
  const toeward = length(level) > 0 ? level : forward;
  const turnOut = Math.min(1, Math.max(0, targets.kneesOut ?? 0));

  const side = (sign: -1 | 1, handTarget: Vec3, ankleTarget: Vec3, toeTarget: Vec3 | null) => {
    const outward = scale(right, sign);
    const shoulder = sign < 0 ? shoulders.left : shoulders.right;
    const hip = sign < 0 ? hips.left : hips.right;

    // Elbows fold back, out and a little down; knees fold forward, and out as
    // far as `kneesOut` turns them.
    const elbowPole = add(add(scale(forward, -1), scale(outward, 0.25)), scale(up, -0.4));
    const kneePole = add(forward, scale(outward, turnOut));
    const arm = twoBone(shoulder, handTarget, body.upperArm, body.forearm + body.hand, elbowPole);
    const leg = twoBone(hip, ankleTarget, body.thigh, body.shin, kneePole);

    // The hand continues the forearm, so the wrist sits a hand's length back
    // from the end of the chain along the same line.
    const wrist = sub(arm.end, scale(normalize(sub(arm.end, arm.mid)), body.hand));

    // From where the ankle actually ended up, so a boot keeps its length and
    // its direction even when the leg fell short of the target.
    const pointed = toeTarget ? normalize(sub(toeTarget, leg.end)) : null;
    const toeDirection = pointed && length(pointed) > 0 ? pointed : toeward;

    return {
      joints: {
        hip,
        knee: leg.mid,
        ankle: leg.end,
        toe: add(leg.end, scale(toeDirection, body.foot)),
        shoulder,
        elbow: arm.mid,
        wrist,
        hand: arm.end,
      } satisfies Side,
      handReached: arm.reached,
      footReached: leg.reached,
    };
  };

  const left = side(-1, leftHandTarget, leftAnkleTarget, toeTargets?.[0] ?? null);
  const rightSide = side(1, rightHandTarget, rightAnkleTarget, toeTargets?.[1] ?? null);

  return {
    skeleton: {
      pelvis,
      chest,
      head,
      left: left.joints,
      right: rightSide.joints,
      reached: {
        leftHand: left.handReached,
        rightHand: rightSide.handReached,
        leftFoot: left.footReached,
        rightFoot: rightSide.footReached,
      },
    },
    handTargets: [leftHandTarget, rightHandTarget],
  };
}
