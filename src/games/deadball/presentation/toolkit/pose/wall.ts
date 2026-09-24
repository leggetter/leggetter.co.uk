/**
 * The wall: standing, loading, jumping and landing.
 *
 * **While you aim, a wall that is going to jump looks exactly like one that
 * is not.** It used to squat 38 cm with its arms swung back from the moment
 * the kick was set up (#65), which made the jump a certainty to read off the
 * screen rather than a risk to take: "It's too obvious that the wall is going
 * to jump as their starting position is different." Now the only tell is the
 * load for the jump, in the last part of the run-up - about a fifth of a
 * second before the strike, which is there for anybody watching closely and
 * too late to change the shot.
 *
 * **Hands stay down, crossed low in front, the whole way through.** A wall
 * that throws its arms up is giving away a penalty for handball, and drawn
 * that way it looked as if the ball hit their hands going over.
 *
 * **Only the drawing changed.** core/'s wall - the cylinder `wallHit` tests
 * against, `CROUCH`, the jump's rise and tuck - is untouched, and the tuning
 * fingerprint with it. Once they are in the air, the drawn feet and heads
 * follow `wallPoseAt` exactly, so the gap you see under a jumping wall is the
 * gap the ball gets.
 */

import { JUMPING_WALL } from '../../../content/poses.js';
import type { FrameState } from '../../../core/types.ts';
import { add, normalize, scale, vec, type Vec3 } from '../../../core/vec3.ts';
import { AIRTIME, JUMP_DELAY, wallPoseAt } from '../../../core/wall.ts';
import { BODY, scaleProportions } from '../body/skeleton.ts';
import { ANKLE_LIFT, STANDING_SHOULDER, TOWARD_TAKER, type Pose } from './figure.ts';
import { easeIn, easeInOut, progress, springKnock } from './motion.ts';

const tuned = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const LOAD = {
  from: tuned(JUMPING_WALL?.load?.from, 0.5),
  drop: tuned(JUMPING_WALL?.load?.drop, 0.16),
  back: tuned(JUMPING_WALL?.load?.back, 0.05),
  lean: tuned(JUMPING_WALL?.load?.lean, 0.25),
  kneesOut: tuned(JUMPING_WALL?.load?.kneesOut, 0.2),
};
const PUSH = Math.max(0.01, tuned(JUMPING_WALL?.push, 0.08));
const ABSORB = tuned(JUMPING_WALL?.absorb, 0.18);

/** The small flinch a braced wall makes. The same for a wall that will jump, or that would be the tell. */
const braceAt = (clock: number, index: number): number => Math.sin(clock * 0.7 + index * 1.9) * 0.012;

/** What the wall is drawn from. All of it is on the frame. */
export type WallInput = Pick<FrameState, 'wall' | 'spot' | 'clock' | 'sinceStrike'> &
  Partial<Pick<FrameState, 'phase' | 'runUp'>>;

/** How tall each person in the wall is, to the top of the head. The same person every kick. */
const heightOf = (index: number): number => 1.78 + ((index * 37) % 11) / 100;

/**
 * The wall's poses, back to front, in the pose the simulation says.
 *
 * Furthest from the goal first. They stand on an arc, so depth is distance
 * from the ball rather than z.
 */
export function wallPoses(frame: WallInput): Pose[] {
  const people = frame.wall.people;
  if (people.length === 0) return [];

  const order = [...people.keys()].sort((a, b) => {
    const da = Math.hypot(people[a]!.at.x - frame.spot.x, people[a]!.at.z - frame.spot.z);
    const db = Math.hypot(people[b]!.at.x - frame.spot.x, people[b]!.at.z - frame.spot.z);
    return db - da;
  });

  return order.map((index) =>
    frame.wall.jumps ? jumpingPerson(frame, index) : standingPerson(frame, index)
  );
}

/**
 * Somebody in a wall that is not going to jump: braced, arms crossed low.
 *
 * Exactly as it always was. A wall that stays down is the other half of the
 * read, and it is the contrast with this that makes the set pose readable.
 */
function standingPerson(frame: WallInput, index: number): Pose {
  const { x, z } = frame.wall.people[index]!.at;
  // Braced rather than idling. A wall is a row of people who have been told
  // where to stand and are about to be hit by a ball, and a gentle sway
  // reads as a queue. What little movement there is, is a flinch.
  const brace = braceAt(frame.clock, index);
  const stature = heightOf(index) * 0.82;
  const shoulderY = stature + brace;
  return {
    feet: vec(x, 0, z),
    shoulder: vec(x, shoulderY, z),
    head: vec(x, shoulderY + 0.24, z),
    // Arms down and crossed in front, which is what a wall does and what
    // makes it read as a wall rather than as ten-yards-away spectators.
    hands: [vec(x - 0.1, shoulderY - 0.52, z - 0.14), vec(x + 0.1, shoulderY - 0.52, z - 0.14)],
    toes: [vec(x - 0.16, 0.03, z - 0.05), vec(x + 0.16, 0.03, z + 0.05)],
    facing: TOWARD_TAKER,
    stature,
  };
}

/** A body described joint by joint, so two of them can be blended. */
interface Joints {
  pelvis: Vec3;
  chest: Vec3;
  head: Vec3;
  hands: [Vec3, Vec3];
  ankles: [Vec3, Vec3];
  toes: [Vec3, Vec3];
  kneesOut: number;
}

const mix = (a: Vec3, b: Vec3, k: number): Vec3 => add(a, scale(add(b, scale(a, -1)), k));
const mixJoints = (a: Joints, b: Joints, k: number): Joints => ({
  pelvis: mix(a.pelvis, b.pelvis, k),
  chest: mix(a.chest, b.chest, k),
  head: mix(a.head, b.head, k),
  hands: [mix(a.hands[0], b.hands[0], k), mix(a.hands[1], b.hands[1], k)],
  ankles: [mix(a.ankles[0], b.ankles[0], k), mix(a.ankles[1], b.ankles[1], k)],
  toes: [mix(a.toes[0], b.toes[0], k), mix(a.toes[1], b.toes[1], k)],
  kneesOut: a.kneesOut + (b.kneesOut - a.kneesOut) * k,
});

/**
 * Somebody in a wall that is going to jump, at this moment.
 *
 * - **Aiming, and the first part of the run-up:** exactly `standingPerson`.
 * - **Loading**, from `load.from` of the way through the run-up to the
 *   strike: a quick dip at the knees, hips back a little, chest over.
 * - **Pushing**, from the strike to `push` seconds after: legs driving
 *   straight.
 * - **In the air**, following `wallPoseAt` to the centimetre: bodies up by
 *   `lift`, feet up by `lift + tuck` with the knees drawn up to make room.
 * - **Landed**, standing again, the knees taking the weight and springing back.
 *
 * The hands are crossed low in front of the hips in every one of them.
 */
function jumpingPerson(frame: WallInput, index: number): Pose {
  const t = Math.max(0, frame.sinceStrike);
  const struck = t > 0 || frame.phase === 'flight' || frame.phase === 'resolved';
  const loading = frame.phase === 'runup' ? easeIn(progress(frame.runUp ?? 0, LOAD.from, 1)) : 0;
  if (!struck && loading <= 0) return standingPerson(frame, index);

  const { x, z } = frame.wall.people[index]!.at;
  const stature = heightOf(index) * 0.82;
  const size = stature / STANDING_SHOULDER;
  const body = scaleProportions(BODY, size);
  const forward = TOWARD_TAKER;
  const backward = scale(forward, -1);
  const up = vec(0, 1, 0);
  const lift = ANKLE_LIFT * size;
  const pose = wallPoseAt(frame.wall, t);
  const landsAt = JUMP_DELAY + AIRTIME;

  /**
   * Crossed low in front of the hips: where `standingPerson` puts them,
   * carried with the hips wherever they go.
   */
  const handsLow = (pelvis: Vec3): [Vec3, Vec3] => {
    const at = (side: -1 | 1): Vec3 => add(add(pelvis, vec(side * 0.1, body.spine - 0.52, 0)), scale(forward, 0.14));
    return [at(-1), at(1)];
  };

  // Feet flat on the grass `feetY` up, `wide` either side of the middle.
  const planted = (feetY: number, wide: number): Pick<Joints, 'ankles' | 'toes'> => {
    const toe = (side: -1 | 1): Vec3 => vec(x + side * wide, feetY + 0.03, z + side * 0.05 * (1 - wide));
    const ankleOf = (t: Vec3): Vec3 => add(add(t, scale(forward, -body.foot)), vec(0, lift, 0));
    // Turned out a little, the way anybody squatting stands.
    const aim = (a: Vec3, side: -1 | 1): Vec3 => add(a, normalize(add(forward, vec(side * 0.35, 0, 0))));
    const [left, right] = [ankleOf(toe(-1)), ankleOf(toe(1))];
    return { ankles: [left, right], toes: [aim(left, -1), aim(right, 1)] };
  };
  const upright = (shoulderY: number, feetY: number): Joints => {
    const chest = vec(x, shoulderY, z);
    const pelvis = vec(x, shoulderY - body.spine, z);
    return {
      pelvis,
      chest,
      head: add(chest, vec(0, 0.24, 0)),
      hands: handsLow(pelvis),
      ...planted(feetY, 0.16),
      kneesOut: 0,
    };
  };

  // Standing as a braced wall stands, and loaded for the jump: see
  // content/poses.js for what each number moves.
  const standing = upright(stature + braceAt(frame.clock, index), 0);
  const loadedPelvis = add(
    vec(x, stature - body.spine - LOAD.drop * size, z),
    scale(backward, LOAD.back * size)
  );
  const loadedChest = add(loadedPelvis, scale(normalize(add(up, scale(forward, LOAD.lean))), body.spine));
  const loaded: Joints = {
    pelvis: loadedPelvis,
    chest: loadedChest,
    head: add(loadedChest, scale(normalize(add(up, scale(forward, 0.1))), body.neck)),
    hands: handsLow(loadedPelvis),
    ...planted(0, 0.16),
    kneesOut: LOAD.kneesOut,
  };

  let joints: Joints;
  if (!struck) {
    joints = mixJoints(standing, loaded, loading);
  } else {
    // In the air, exactly where core/ says: shoulders up by the rise, feet up
    // by the rise and the tuck. Hands still low.
    const air = upright(pose.lift + stature, pose.lift + pose.tuck);

    // The push: from the load to straight legs in `push` seconds, which is
    // done before the ball could be anywhere near.
    const push = easeInOut(progress(t, 0, PUSH));
    joints = mixJoints(loaded, air, push);

    // Landing: the knees take it, overshoot a little, and come back.
    if (t >= landsAt) {
      const give = ABSORB * size * springKnock(t - landsAt, 2.2, 0.5);
      const down = vec(0, -give, 0);
      joints = {
        ...joints,
        pelvis: add(joints.pelvis, down),
        chest: add(joints.chest, down),
        head: add(joints.head, down),
        hands: [add(joints.hands[0], down), add(joints.hands[1], down)],
      };
    }
  }

  // Everything above is built -x first. Facing the taker, a wall's own left
  // is +x, and `sided` means [left, right], so each pair is turned round.
  const theirs = <T>([minusX, plusX]: [T, T]): [T, T] => [plusX, minusX];
  return {
    feet: vec(x, pose.airborne ? pose.lift + pose.tuck : 0, z),
    pelvis: joints.pelvis,
    shoulder: joints.chest,
    head: joints.head,
    hands: theirs(joints.hands),
    ankles: theirs(joints.ankles),
    toes: theirs(joints.toes),
    facing: forward,
    stature,
    sided: true,
    ...(joints.kneesOut > 0.01 ? { kneesOut: joints.kneesOut } : {}),
  };
}
