/**
 * What a figure is doing, as positions in world metres, and the jointed body
 * that puts it on the pitch.
 *
 * Phase 3 of #72. The poses used to be worked out inside draw.ts, tangled up
 * with the drawing, which meant the only way to see whether a kick put the
 * boot on the ball was to play one and squint. They live here now, in a
 * module that imports nothing from draw.ts and never touches a canvas, so the
 * tests can run a whole kick through them and measure it. `pose.test.ts`
 * enforces the separation, the same way body.test.ts does for body/.
 *
 * `classic` still draws every figure through one function, `drawFigure`, and
 * that function still starts from `poseBody` below.
 */

import { add, length, normalize, scale, sub, vec, type Vec3 } from '../../../core/vec3.ts';
import { BODY, scaleProportions, solveBody, type Skeleton } from '../body/skeleton.ts';

/**
 * Where a person's body parts go.
 *
 * The first six fields are classic's original figure - feet, a shoulder point,
 * a head, two hands and two toes - and everybody who is only standing about
 * still uses just those. The optional ones below them are for poses that need
 * more than six points can say: a kick has to put one particular boot in one
 * particular place, and a squat has to push the hips back.
 */
export interface Pose {
  /** Where the feet are planted on the ground. */
  feet: Vec3;
  /** Top of the torso. */
  shoulder: Vec3;
  head: Vec3;
  /** Both hands. Everyone has two. */
  hands: [Vec3, Vec3];
  /**
   * Both toes.
   *
   * With `ankles` given, these are where each boot points rather than where it
   * ends: the boot keeps its length and aims at them.
   */
  toes: [Vec3, Vec3];
  /**
   * Glove radius in meters. Zero for bare hands.
   *
   * Never scaled with the body: it is the keeper's save radius, drawn, and a
   * smaller keeper does not save less.
   */
  gloves?: number;
  /** Which way the chest faces. Toward the taker (-z) if left out. */
  facing?: Vec3;
  /**
   * How high the shoulders are above the feet when this person stands up
   * straight, in meters. Sets the size of the body.
   *
   * A constant per person, not read off the current pose - otherwise a taker
   * crouching over the ball would shrink instead of bending their knees.
   * Worked out from the pose if left out, which is only right for somebody
   * who is standing still.
   */
  stature?: number;
  /** The middle of the hips. A spine's length below the shoulder, toward the feet, if left out. */
  pelvis?: Vec3;
  /**
   * The ankles themselves, instead of working them back from the toes.
   *
   * For a foot that is not flat on the grass - swinging, pushing off, or
   * striking a ball - where the toe alone does not say where the ankle is.
   */
  ankles?: [Vec3, Vec3];
  /**
   * `hands`, `toes` and `ankles` are `[left, right]` - the body's own - as
   * given, rather than whichever pairing is nearest. See `BodyTargets.sided`.
   */
  sided?: boolean;
  /** How far the knees turn out, 0 to 1. See `BodyTargets.kneesOut`. */
  kneesOut?: number;
}

/**
 * A pose, dressed.
 *
 * The taker and the keeper are the same construction with different poses and
 * different kit: two legs from the hip, a torso, two arms, a head. They were
 * written separately at first and immediately drifted - different line weights,
 * different head sizes, one of them with a single arm - so they share this.
 *
 * It is also the seam the pixel art renderer replaces: swap the one function
 * that draws it and everybody on the pitch changes together.
 */
export interface Figure extends Pose {
  kit: string;
  trim: string;
  alpha?: number;
}

/**
 * How thick each part is drawn, in metres for the 1.80 m body.
 *
 * Here rather than with the drawing because a kick needs it: "the boot is on
 * the ball" means the drawn edge of the boot touches the drawn edge of the
 * ball, and the boot is the width of a line.
 */
export const LIMB = { leg: 0.13, torso: 0.28, arm: 0.12, head: 0.115 };

/** Half the drawn thickness of a boot on the 1.80 m body. */
export const BOOT_RADIUS = (LIMB.leg * 0.95) / 2;

/**
 * How far an ankle sits above the toe it rests on, for a 1.80 m body.
 *
 * `Pose` gives toes on the grass; the skeleton solves to ankles. Lifting the
 * ankle by this much puts the boot's lower edge back on the grass once it is
 * drawn at its thickness, instead of the whole boot sinking into the pitch.
 */
export const ANKLE_LIFT = 0.06;

/** Shoulder height above the feet of the 1.80 m body, standing up straight. */
export const STANDING_SHOULDER = ANKLE_LIFT + (BODY.thigh + BODY.shin) * 0.985 + BODY.spine;

/** Chest facing when a figure does not say: toward the taker and the camera behind them. */
export const TOWARD_TAKER = vec(0, 0, -1);

/** How big this person is next to the 1.80 m body. One answer for the bones and the line widths. */
export function poseSize(pose: Pose): number {
  const stature = pose.stature ?? pose.shoulder.y - pose.feet.y;
  const size = Math.min(1.4, Math.max(0.6, stature / STANDING_SHOULDER));
  /*
    Never smaller than full size for somebody in gloves.

    A keeper's arm has to reach ARM_SPAN, because that is how far core/ lets
    its hands get from the shoulder - content/proportions.js promises it and a
    test holds it. Scaling the body scales the arm, and the keeper's pose is a
    touch shorter than the 1.80 m body, so it came out at 0.70 m against 0.72
    and every full-stretch save was drawn with a glove the arm could not reach.
  */
  return (pose.gloves ?? 0) > 0 ? Math.max(1, size) : size;
}

/**
 * The jointed body for a pose.
 *
 * - The chest goes exactly where the pose put the shoulder point, and the
 *   pelvis hangs a spine's length below it, along the line to the feet -
 *   unless the pose says where the pelvis is.
 * - Toes stay where the pose put them. The ankle target sits a foot's length
 *   back and a little up, so the drawn boot ends on the given toe. A pose that
 *   gives its ankles instead has them used as they are.
 * - A keeper's hands are kept on their targets whatever it costs the body,
 *   because that is where saves are decided. Anybody without gloves keeps
 *   their body where it was put and reaches as far as their arms go.
 */
export function poseBody(pose: Pose): Skeleton {
  const size = poseSize(pose);
  const body = scaleProportions(BODY, size);
  const facing = pose.facing ?? TOWARD_TAKER;

  const spineLine = sub(pose.shoulder, pose.pelvis ?? pose.feet);
  const up = length(spineLine) > 0 ? normalize(spineLine) : vec(0, 1, 0);
  const level = normalize(vec(facing.x, 0, facing.z));
  const toeward = length(level) > 0 ? level : vec(0, 0, 1);
  const ankle = (toe: Vec3): Vec3 =>
    add(sub(toe, scale(toeward, body.foot)), vec(0, ANKLE_LIFT * size, 0));

  return solveBody(
    {
      pelvis: pose.pelvis ?? sub(pose.shoulder, scale(up, body.spine)),
      chest: pose.shoulder,
      facing,
      head: pose.head,
      hands: pose.hands,
      ankles: pose.ankles ?? [ankle(pose.toes[0]), ankle(pose.toes[1])],
      ...(pose.ankles ? { toes: pose.toes } : {}),
      ...(pose.sided ? { sided: true } : {}),
      ...(pose.kneesOut ? { kneesOut: pose.kneesOut } : {}),
      keepHands: (pose.gloves ?? 0) > 0,
    },
    body
  );
}

/**
 * Standing still, breathing.
 *
 * Deliberately below the threshold of looking like an animation: a couple of
 * centimeters of chest, and a centimeter of weight shifting from one foot to
 * the other on a different period so the two never line up into an obvious
 * bob. At the taker's distance that is three or four pixels.
 *
 * Periods are in seconds. A penalty taker waiting to be told to go is keyed
 * up rather than resting, so the breathing is a little quicker than idle.
 */
export const BREATH_PERIOD = 3.1;
export const SWAY_PERIOD = 5.3;

export const wave = (clock: number, period: number, phase = 0): number =>
  Math.sin((clock / period + phase) * Math.PI * 2);

/**
 * Whether anybody is standing about rather than moving.
 *
 * Only before the kick. Carrying the breathing through the follow-through left
 * the taker rising and falling while frozen in mid-air with one boot off the
 * ground, which reads as a bug rather than as somebody alive.
 */
export const isIdle = (phase: string): boolean => phase === 'ready';
