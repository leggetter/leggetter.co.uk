/**
 * The keeper: shuffling, set, diving, and coming down.
 *
 * The dive itself is core/'s. The simulation moves the hands and the body
 * through a save, and saves are decided at those hands, so **the animation
 * dresses the simulation and never leads it**: the gloves go exactly where
 * core/ puts the hands, and the body hangs off them - `figure.test.ts` runs
 * 37,800 frames of real dives to hold that to a millimetre. What phase 3 of
 * #72 adds is everything around the hands:
 *
 * - **Shuffling steps** instead of sliding. The keeper drifts along the line
 *   while the taker settles; the feet now step after the body, one at a
 *   time, and stay put in between.
 * - **The set.** As the taker runs in, the keeper sinks at the knees with the
 *   hands forward and out: the small crouch before a push that tells you a
 *   dive is coming.
 * - **The push.** The foot on the side of the dive stays planted while the
 *   body goes, and only leaves the grass once the keeper is well on the way.
 *   The other leg lags and catches up - it is dragged, not flown.
 * - **The landing.** A full-length dive comes down, slides on a little along
 *   the grass and the legs bounce once. A jump straight up lands on its feet
 *   and the knees take it.
 */

import { KEEPER } from '../../../content/poses.js';
import { ARM_SPAN } from '../../../core/keeper.ts';
import type { KeeperState } from '../../../core/types.ts';
import { vec, type Vec3 } from '../../../core/vec3.ts';
import { BREATH_PERIOD, isIdle, TOWARD_TAKER, wave, type Pose } from './figure.ts';
import { clamp01, easeInOut, hump, progress } from './motion.ts';
import { keeperSetting, keeperThrow } from '../doing/doing.ts';

/**
 * How far in front of the goal line the keeper is drawn, in meters.
 *
 * Standing exactly on the line puts the keeper in the same plane as the posts,
 * so which one is in front comes down to draw order and reads as a keeper set
 * back into the woodwork. Real ones stand just off it. Drawing only: saves are
 * still decided where the ball crosses, so this moves nobody's hands.
 */
export const KEEPER_STANDS_OFF = 0.3;

const tuned = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const SET = {
  depth: tuned(KEEPER?.set?.depth, 0.2),
  handsOut: tuned(KEEPER?.set?.handsOut, 0.4),
  handsHeight: tuned(KEEPER?.set?.handsHeight, 0.8),
  handsForward: tuned(KEEPER?.set?.handsForward, 0.22),
  wide: tuned(KEEPER?.set?.wide, 0.06),
  kneesOut: clamp01(tuned(KEEPER?.set?.kneesOut, 0.7)),
};
const PUSH_UNTIL = clamp01(tuned(KEEPER?.push, 0.32));
const LEG_LAG = Math.max(1, tuned(KEEPER?.legLag, 1.7));
const LANDING = {
  slide: tuned(KEEPER?.landing?.slide, 0.2),
  bounce: tuned(KEEPER?.landing?.bounce, 0.07),
  absorb: tuned(KEEPER?.landing?.absorb, 0.2),
};
const SHUFFLE = {
  step: Math.max(0.05, tuned(KEEPER?.shuffle?.step, 0.2)),
  lift: tuned(KEEPER?.shuffle?.lift, 0.05),
};

/** How far either side of the stance each foot is, standing. */
const FOOT_LANE = 0.16;

/**
 * Where one foot is while the keeper shuffles along the line.
 *
 * Stateless foot locking. The simulation only says where the keeper's stance
 * is now, not where the feet were a moment ago, so the foot's position is a
 * staircase of the stance: flat - the foot stays exactly where it is - for
 * most of each step's width, then a quick lifted step to the next stair as the
 * body passes. The two feet's stairs are offset by half a step, so they take
 * turns. Same stance in, same feet out, on every frame and every device.
 */
export function shuffleFoot(stance: number, lane: number, offset: number): { x: number; lift: number } {
  const step = SHUFFLE.step;
  const band = 0.35;
  // Shifted by half the flat part, so each stair's flat straddles the moment
  // the body is over the foot rather than the foot running a step behind.
  const position = (stance + offset) / step + (1 - band) / 2;
  const stair = Math.floor(position);
  const within = position - stair;
  if (within < 1 - band) return { x: stair * step - offset + lane, lift: 0 };
  const q = (within - (1 - band)) / band;
  return { x: (stair + easeInOut(q)) * step - offset + lane, lift: hump(q) * SHUFFLE.lift };
}

/**
 * The keeper's pose, from the simulated keeper.
 *
 * `runUp` is the frame's: how far the taker is into the run-up, which is when
 * the keeper sets.
 */
export function keeperPose(
  keeper: KeeperState,
  reach: number,
  clock: number,
  phase: string,
  runUp = 0
): Pose {
  const { hands, body, stance } = keeper;

  // How far the keeper has thrown itself, and which way: `doing/`'s answer,
  // so the pose and the name a package gives this moment are the same number.
  // `along` is the unit vector from the standing hands toward where they are
  // now, and the whole body lies along it at full stretch.
  const { extension, along } = keeperThrow(keeper);
  // The legs follow the body rather than going with it: behind early in the
  // dive, caught up by full stretch.
  const legExtension = Math.pow(extension, LEG_LAG);

  // Bigger than the taker's, because the keeper is twice as far away and the
  // same two centimeters would land inside a single pixel.
  const alive = isIdle(phase) ? 1 - extension * 4 : 0;
  const breath = wave(clock, BREATH_PERIOD, 0.5) * 0.032 * Math.max(0, alive);

  /*
    Set: sinking at the knees as the taker runs in, and staying there until
    the dive takes over. Gone again by the time anybody has landed.
  */
  const setting = easeInOut(keeperSetting({ phase, runUp }));
  const set = setting * (1 - keeper.landed);

  const z = -KEEPER_STANDS_OFF;
  const sink = SET.depth * set;
  const stand = {
    feet: vec(stance, 0.06, z),
    shoulder: vec(stance, 1.42 + breath - sink, z),
    head: vec(stance, 1.68 + breath * 1.3 - sink * 0.95, z),
  };

  // Shoulder sits exactly one arm behind the hands, so the arm is always an
  // arm. Everything else hangs off the body, which is where the simulation
  // says it is and is one of the two volumes that decides a save.
  const shoulderX = hands.x - along.x * ARM_SPAN;
  const shoulderY = hands.y - along.y * ARM_SPAN;
  const dive = {
    feet: vec(body.x - along.x * 0.95, Math.max(0.08, body.y - along.y * 0.95), 0),
    shoulder: vec(shoulderX, shoulderY, 0),
    head: vec(shoulderX + along.x * 0.2, shoulderY + along.y * 0.2 + 0.1, 0),
  };

  const blend = (a: Vec3, b: Vec3, k = extension): Vec3 =>
    vec(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, z);

  /*
    How the keeper comes down: on the ground, or on their feet.

    core/ only lands a keeper once the shot is over, and it lands every one the
    same way - hands pulled to the floor, whatever the dive was. The body here is
    built from the hands, so a keeper who had only jumped straight up had its
    hands dragged down and folded onto itself. Reported as "crumbling".

    The outcome is already decided by the time anybody lands, so this is
    animation and it is classic's to choose. How far the dive went sideways
    decides it: a keeper who went full length finishes on the ground, one who
    jumped more or less straight up comes back down on their feet, and the ones
    in between finish somewhere near a crouch.
  */
  const sideways = clamp01((Math.abs(hands.x - stance) - 0.8) / 0.9);
  const flat = keeper.landed * sideways;
  const onFeet = keeper.landed * (1 - sideways);
  // Landing on their feet, the knees give and come back: the most they give
  // is halfway through coming down, and none of it is left at the end.
  const absorb = LANDING.absorb * hump(keeper.landed) * (1 - sideways);
  const upright = {
    feet: stand.feet,
    shoulder: vec(stance, 1.42 - absorb, z),
    head: vec(stance, 1.68 - absorb * 0.95, z),
  };
  const settle = (from: Vec3, to: Vec3): Vec3 =>
    vec(from.x + (to.x - from.x) * onFeet, from.y + (to.y - from.y) * onFeet, z);

  // A full-length dive does not stop where it lands: the body slides on along
  // the grass toward the hands, which are already down.
  const slide = LANDING.slide * easeInOut(flat) * Math.sign(along.x);
  const slid = (p: Vec3): Vec3 => vec(p.x + slide, p.y, p.z);

  const feet = settle(slid(grounded(blend(stand.feet, dive.feet), 0.1, flat)), upright.feet);
  const shoulder = settle(slid(grounded(blend(stand.shoulder, dive.shoulder), 0.32, flat)), upright.shoulder);
  const head = settle(slid(grounded(blend(stand.head, dive.head), 0.46, flat)), upright.head);

  // Standing, the arms hang either side; set, they come forward and out,
  // palms to the ball. Diving, both go with the ball, straddling the point
  // the save test actually uses.
  const spread = 0.24 - extension * 0.1;
  const reaching: [Vec3, Vec3] = [
    vec(hands.x + spread, hands.y + 0.05, z),
    vec(hands.x - spread * 0.7, hands.y - 0.09, z),
  ];
  const hangOut = 0.34 + (SET.handsOut - 0.34) * set;
  const hangY = 0.92 + (SET.handsHeight - 0.92) * set;
  const hangZ = z - SET.handsForward * set;
  const idle: [Vec3, Vec3] = [vec(stance + hangOut, hangY, hangZ), vec(stance - hangOut, hangY, hangZ)];
  const held: [Vec3, Vec3] = [
    settle(grounded(reaching[0], 0.18, flat), idle[0]),
    settle(grounded(reaching[1], 0.14, flat), idle[1]),
  ];

  /*
    Feet.

    Standing, each is on its shuffle stair (see `shuffleFoot`), a little wider
    when set. Diving, they trail back down the dive line and scissor open - the
    trailing one on `legExtension`, so it lags - except the foot on the side
    of the dive, which is the one pushing: it stays exactly where it was on the
    grass until the keeper is `push` of the way out, then lets go.
  */
  const wide = SET.wide * set;
  const footing = [
    shuffleFoot(stance, FOOT_LANE + wide, 0),
    shuffleFoot(stance, -FOOT_LANE - wide, SHUFFLE.step / 2),
  ] as const;
  /*
    Only lifted while the keeper is actually shuffling. core/ stops the drift
    the moment the run-up starts, so a foot caught mid-step would otherwise
    hang in the air for the rest of the kick; instead it comes down where it
    is over the run-up, with the stance - and so the foot's x - already still.
  */
  const shuffling = isIdle(phase) ? 1 : phase === 'runup' ? 1 - easeInOut(runUp) : 0;
  const standingToe = (i: 0 | 1): Vec3 => vec(footing[i].x, 0.04 + footing[i].lift * shuffling, z);

  const trail = (k: number, spreadX: number, e: number): Vec3 =>
    vec(
      feet.x - along.x * e * k + spreadX * (1 - e),
      Math.max(0.04, feet.y - along.y * e * k),
      z
    );
  // Which foot pushes: the one on the side the dive is going.
  const pushing = along.x > 0 ? 0 : 1;
  const release = easeInOut(progress(extension, PUSH_UNTIL, PUSH_UNTIL + 0.25));
  const diving = (i: 0 | 1): Vec3 => {
    const free = i === 0 ? trail(0.14, 0.16, extension) : trail(0.3, -0.16, legExtension);
    const from = standingToe(i);
    // The trailing leg also starts from its stair, not from wherever the body is.
    const leave = i === pushing ? release : easeInOut(progress(extension, 0, 0.35));
    return blend(from, free, leave);
  };
  // Coming down flat, the legs hit the grass and bounce once.
  const bounce = LANDING.bounce * Math.max(0, Math.sin(2 * Math.PI * flat)) * (1 - flat) * 2;
  const toes: [Vec3, Vec3] = [0, 1].map((i) => {
    const toe = diving(i as 0 | 1);
    const down = slid(vec(toe.x, toe.y + bounce * (i === 0 ? 0.6 : 1), z));
    return settle(down, standingToe(i as 0 | 1));
  }) as [Vec3, Vec3];

  return {
    feet,
    shoulder,
    head,
    hands: extension < 0.04 ? idle : held,
    toes,
    gloves: reach * 0.34,
    facing: TOWARD_TAKER,
    // Set, the knees go out as well as down. Straight ahead, they bend
    // toward a camera behind the taker and the crouch all but disappears.
    kneesOut: SET.kneesOut * set * (1 - extension),
    // The standing pose's shoulder height, held through the dive: a keeper
    // lying flat is the same size as one standing up.
    stature: 1.42 - 0.06,
  };
}

/**
 * Settle a point down onto the turf as the keeper lands.
 *
 * Applied to the whole figure, not just the hands. Dropping the hands alone
 * left the gloves on the grass with the body still in the air above them.
 */
function grounded(point: Vec3, restingY: number, landed: number): Vec3 {
  return landed <= 0 ? point : vec(point.x, point.y + (restingY - point.y) * landed, point.z);
}
