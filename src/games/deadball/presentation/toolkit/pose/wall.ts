/**
 * The wall: standing, set to spring, jumping and landing.
 *
 * **A wall that is going to jump has to look like it from a single glance**
 * (#65). It used to crouch 14 cm - core/'s `CROUCH`, the depth the hit test
 * uses - and since you only ever see one wall at a time, with nothing beside
 * it to compare against, 14 cm lower read as "slightly shorter people".
 *
 * So the set is now a pose, not a depth: a deep squat with the knees turned
 * out, hips back, chest over the knees and arms swung back ready to throw.
 * Wide and low where a standing wall is tall and narrow, which reads from
 * the default camera without anything to compare it to.
 *
 * **Only the drawing changed.** core/'s wall - the cylinder `wallHit` tests
 * against, `CROUCH`, the jump's rise and tuck - is untouched, and the tuning
 * fingerprint with it. The set is deeper than the physical crouch, which is
 * safe because the crouch only exists while the ball is still on the spot:
 * once they are in the air, the drawn feet and heads follow `wallPoseAt`
 * exactly, so the gap you see under a jumping wall is the gap the ball gets.
 */

import { JUMPING_WALL } from '../../../content/poses.js';
import type { FrameState } from '../../../core/types.ts';
import { add, normalize, scale, vec, type Vec3 } from '../../../core/vec3.ts';
import { AIRTIME, JUMP_DELAY, wallPoseAt } from '../../../core/wall.ts';
import { BODY, scaleProportions } from '../body/skeleton.ts';
import { ANKLE_LIFT, STANDING_SHOULDER, TOWARD_TAKER, type Pose } from './figure.ts';
import { easeIn, easeInOut, easeOut, progress, springKnock, springTo } from './motion.ts';

const tuned = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const SET = {
  drop: tuned(JUMPING_WALL?.set?.drop, 0.38),
  back: tuned(JUMPING_WALL?.set?.back, 0.14),
  lean: tuned(JUMPING_WALL?.set?.lean, 0.6),
  wide: tuned(JUMPING_WALL?.set?.wide, 0.07),
  kneesOut: tuned(JUMPING_WALL?.set?.kneesOut, 0.45),
  handsBack: tuned(JUMPING_WALL?.set?.handsBack, 0.48),
  handsOut: tuned(JUMPING_WALL?.set?.handsOut, 0.16),
  handsDown: tuned(JUMPING_WALL?.set?.handsDown, 0.42),
};
const BOUNCE = tuned(JUMPING_WALL?.bounce, 0.012);
const DIP = tuned(JUMPING_WALL?.dip, 0.05);
const PUSH = Math.max(0.01, tuned(JUMPING_WALL?.push, 0.08));
const ABSORB = tuned(JUMPING_WALL?.absorb, 0.18);

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
  const brace = Math.sin(frame.clock * 0.7 + index * 1.9) * 0.012;
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
 * Four poses, blended on the frame clock:
 *
 * - **set**, from the moment the kick is set up: the deep squat. It rocks a
 *   centimetre on the balls of the feet, and dips a little further as the
 *   taker runs in - the last bit of load before the spring.
 * - **pushing**, from the strike to `push` seconds after: legs driving
 *   straight, arms throwing up.
 * - **in the air**, following `wallPoseAt` to the centimetre: bodies up by
 *   `lift`, feet up by `lift + tuck` with the knees drawn up to make room.
 * - **landed**, the standing pose, arriving with the knees taking the weight
 *   and springing back.
 */
function jumpingPerson(frame: WallInput, index: number): Pose {
  const { x, z } = frame.wall.people[index]!.at;
  const stature = heightOf(index) * 0.82;
  const size = stature / STANDING_SHOULDER;
  const body = scaleProportions(BODY, size);
  const forward = TOWARD_TAKER;
  const backward = scale(forward, -1);
  const up = vec(0, 1, 0);
  const lift = ANKLE_LIFT * size;

  const t = Math.max(0, frame.sinceStrike);
  const struck = t > 0 || frame.phase === 'flight' || frame.phase === 'resolved';
  const pose = wallPoseAt(frame.wall, t);
  const landsAt = JUMP_DELAY + AIRTIME;

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
    return {
      pelvis: vec(x, shoulderY - body.spine, z),
      chest,
      head: add(chest, vec(0, 0.24, 0)),
      hands: [vec(x - 0.1, shoulderY - 0.52, z - 0.14), vec(x + 0.1, shoulderY - 0.52, z - 0.14)],
      ...planted(feetY, 0.16),
      kneesOut: 0,
    };
  };

  // The set: see content/poses.js for what each number moves.
  const rock = Math.sin(frame.clock * 2 * Math.PI * 1.6 + index * 1.3) * BOUNCE;
  const load = frame.phase === 'runup' ? DIP * easeIn(frame.runUp ?? 0) : struck ? DIP : 0;
  const standingPelvis = stature - body.spine;
  const setPelvis = add(
    vec(x, standingPelvis - SET.drop * size - load + rock, z),
    scale(backward, SET.back * size)
  );
  const setChest = add(setPelvis, scale(normalize(add(up, scale(forward, SET.lean))), body.spine));
  const shoulders = (chest: Vec3): [Vec3, Vec3] => [
    add(chest, vec(-body.shoulderWidth / 2, 0, 0)),
    add(chest, vec(body.shoulderWidth / 2, 0, 0)),
  ];
  const [setLeft, setRight] = shoulders(setChest);
  const swungBack = (shoulder: Vec3, side: -1 | 1): Vec3 =>
    add(
      add(shoulder, vec(side * SET.handsOut * size, -SET.handsDown * size, 0)),
      scale(backward, SET.handsBack * size)
    );
  const set: Joints = {
    pelvis: setPelvis,
    chest: setChest,
    head: add(setChest, scale(normalize(add(up, scale(forward, 0.15))), body.neck)),
    hands: [swungBack(setLeft, -1), swungBack(setRight, 1)],
    ...planted(0, 0.16 + SET.wide),
    kneesOut: SET.kneesOut,
  };

  let joints: Joints;
  if (!struck) {
    joints = set;
  } else {
    // In the air, exactly where core/ says: shoulders up by the rise, feet up
    // by the rise and the tuck, arms thrown up.
    const shoulderY = pose.lift + stature;
    const air = upright(shoulderY, pose.lift + pose.tuck);
    const [left, right] = shoulders(air.chest);
    const armsUp = easeOut(progress(t, 0, PUSH + 0.06));
    const raised: [Vec3, Vec3] = [
      add(left, vec(-0.12 * size, 0.42 * size, -0.08)),
      add(right, vec(0.12 * size, 0.42 * size, -0.08)),
    ];
    // Down again for the landing, a touch late.
    const armsDown = t > landsAt - 0.12 ? springTo(t - (landsAt - 0.12), 1.6, 0.6) : 0;
    const armsAt = Math.max(0, Math.min(1, armsUp * (1 - armsDown)));
    air.hands = [mix(air.hands[0], raised[0], armsAt), mix(air.hands[1], raised[1], armsAt)];

    // The push: from the squat to straight legs in `push` seconds, which is
    // done before the ball could be anywhere near.
    const push = easeInOut(progress(t, 0, PUSH));
    joints = mixJoints(set, air, push);

    // Landing: the knees take it, overshoot a little, and come back.
    if (t >= landsAt) {
      const give = ABSORB * size * springKnock(t - landsAt, 2.2, 0.5);
      joints = { ...joints, pelvis: add(joints.pelvis, vec(0, -give, 0)), chest: add(joints.chest, vec(0, -give, 0)), head: add(joints.head, vec(0, -give, 0)) };
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
