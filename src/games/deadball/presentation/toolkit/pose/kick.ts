/**
 * The taker: waiting, running in, striking the ball, and watching it go.
 *
 * Phase 3 of #72. Classic's taker used to slide both feet along the grass
 * toward the ball and swap to a follow-through on the frame after the strike,
 * so the boot was never drawn on the ball at all - at the strike the planted
 * leg was beside it and the next frame the kicking foot was 36 cm past it.
 * Now:
 *
 * - **The run-up is strides.** Each foot lands, stays exactly where it landed
 *   while the hips pass over it, and lifts; the hips bob onto each footfall.
 *   A foot that slides is the loudest tell in animation, so it cannot here.
 * - **The kick is key poses** from `content/poses.js` - plant, backswing,
 *   strike, contact, follow-through, landing - eased between with a curve
 *   that keeps the speed through each key rather than stopping at it.
 * - **The boot is put on the ball**, not drawn near it. At the strike its
 *   edge touches the ball's, from a few frames before the `STRIKE` event
 *   until the event itself, so at least one frame at 60 Hz shows the contact.
 * - **The arms balance the legs**: swinging against the stride on the way in,
 *   and at the strike the arm on the planted side goes out wide.
 *
 * Driven entirely by what the frame already carries - `runUp`, `phase`,
 * `sinceStrike` and `clock` - so nothing about it touches `FrameState`.
 */

import { KICK } from '../../../content/poses.js';
import { BALL_RADIUS } from '../../../core/units.ts';
import { add, cross, dot, length, normalize, scale, sub, vec, type Vec3 } from '../../../core/vec3.ts';
import { BODY, scaleProportions, type Proportions } from '../body/skeleton.ts';
import {
  ANKLE_LIFT,
  BOOT_RADIUS,
  BREATH_PERIOD,
  isIdle,
  STANDING_SHOULDER,
  SWAY_PERIOD,
  wave,
  type Pose,
} from './figure.ts';
import { clamp01, easeInOut, hump, progress, sampleKeys, springKnock, type Key } from './motion.ts';

/** What the kick is drawn from. All of it is on the frame already, or is the view's to decide. */
export interface KickInput {
  /** Where the ball sits, on the grass. */
  spot: Vec3;
  foot: 'left' | 'right';
  phase: string;
  /** 0 standing, 1 at the strike. See `FrameState.runUp`. */
  runUp: number;
  sinceStrike: number;
  clock: number;
  /** How hard the shot being aimed is, 0 to 1, while the drag is held. */
  power: number;
  /**
   * How far to the side of the ball the taker waits, in metres.
   *
   * The view's call, because it depends on how much screen there is - see
   * `sidewaysRoom` in classic/draw.ts.
   */
  standOff: number;
}

/**
 * The taker's shoulder height standing up straight, which sets their size.
 *
 * About 0.87 of the 1.80 m body. The camera sits 6.5 m behind the ball and a
 * figure over it comes out about twice the apparent height of the goal, so
 * the taker has always been drawn a little small.
 */
export const TAKER_STATURE = 1.3 - 0.04;

/** How far behind the ball the taker waits. */
const WAITING_BACK = 1.35;

/**
 * Nominal seconds for the run-up, used only to space the keys before the
 * strike against the ones after it when the curve through them is drawn.
 *
 * The run-up's real length is the game's (`RUN_UP_SECONDS` in Game.ts) and
 * the keys are fractions of it, so the contact lands on the strike whatever
 * that is set to. If the two drifted apart, the only cost would be a slightly
 * different speed through the moment of contact.
 */
const NOMINAL_RUN_UP = 0.42;

type Channel =
  | 'pelvis'
  | 'chest'
  | 'head'
  | 'plantAnkle'
  | 'plantToe'
  | 'kickAnkle'
  | 'kickToe'
  | 'plantHand'
  | 'kickHand';

const CHANNELS: readonly Channel[] = [
  'pelvis',
  'chest',
  'head',
  'plantAnkle',
  'plantToe',
  'kickAnkle',
  'kickToe',
  'plantHand',
  'kickHand',
];

type Triple = readonly [number, number, number];
interface RawKey {
  name?: string;
  runUp?: number;
  after?: number;
  [channel: string]: unknown;
}

const isTriple = (v: unknown): v is Triple =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

const finite = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/**
 * The kick's keys, cleaned, on one clock: seconds from the strike, negative
 * before it.
 *
 * content/ is edited by hand. A key that leaves something out holds what the
 * key before it had, which is the file's own rule; a value that is not three
 * finite numbers is treated the same way, so a typo costs one pose one part
 * rather than drawing nothing at all. Keys out of order are sorted.
 */
export function kickKeys(raw: unknown = KICK.keys): { name: string; at: number; values: Partial<Record<Channel, Triple>> }[] {
  const list = (Array.isArray(raw) ? raw : []) as RawKey[];
  const timed = list
    .map((key, index) => {
      const at =
        typeof key.after === 'number' && Number.isFinite(key.after)
          ? Math.max(0, key.after)
          : (clamp01(finite(key.runUp, 1)) - 1) * NOMINAL_RUN_UP;
      const values: Partial<Record<Channel, Triple>> = {};
      for (const channel of CHANNELS) if (isTriple(key[channel])) values[channel] = key[channel];
      return { name: typeof key.name === 'string' ? key.name : `key ${index}`, at, values };
    })
    .sort((a, b) => a.at - b.at);
  return timed;
}

/** When the planted foot lands, as a fraction of the run-up. Everything before it is strides. */
function plantRunUp(keys: { name: string; at: number }[]): number {
  const plant = keys.find((k) => k.name === 'plant') ?? keys[0];
  return plant ? Math.max(0.05, 1 + plant.at / NOMINAL_RUN_UP) : 0.66;
}

const APPROACH = {
  lastStride: finite(KICK.approach?.lastStride, 0.42),
  landsAhead: finite(KICK.approach?.landsAhead, 0.24),
  liftsBehind: finite(KICK.approach?.liftsBehind, 0.28),
  stepHeight: finite(KICK.approach?.stepHeight, 0.16),
  bob: finite(KICK.approach?.bob, 0.03),
  lean: finite(KICK.approach?.lean, 0.22),
  armSwing: finite(KICK.approach?.armSwing, 0.6),
  stance: finite(KICK.approach?.stance, 0.3),
};

const CONTACT = {
  yaw: (finite(KICK.contact?.yaw, 45) * Math.PI) / 180,
  pitch: (finite(KICK.contact?.pitch, 12) * Math.PI) / 180,
  strikeAt: clamp01(finite(KICK.contact?.strikeAt, 0.62)),
  push: finite(KICK.contact?.push, 0.03),
};

/** Secondary motion: what lags, overshoots and settles. See content/poses.js. */
const SECONDARY = {
  gather: finite(KICK.secondary?.gather, 0.035),
  carry: finite(KICK.secondary?.carry, 0.18),
  settle: finite(KICK.secondary?.settle, 0.045),
  arms: finite(KICK.secondary?.arms, 0.07),
};

const KEYS = kickKeys();
const PLANT_AT = plantRunUp(KEYS);

/** Ankle height when the boot is flat on the grass, for the 1.80 m body. */
const GROUNDED = 0.03 + ANKLE_LIFT;

const UP = vec(0, 1, 0);
const FORWARD = vec(0, 0, 1);

/**
 * Where the kicking boot is at the moment of contact.
 *
 * Worked out rather than keyed, because it has to be exact: the boot is
 * pointed as `contact` in content/poses.js says - turned out, toe down - and
 * then slid along the line from the ball's centre that is square to it, until
 * its drawn edge touches the ball's. The point that touches is `strikeAt`
 * along the boot, and the ball meets it from behind.
 *
 * `outward` is the direction the kicking side is, from the body's middle.
 */
export function contactBoot(
  ball: Vec3,
  outward: Vec3,
  body: Proportions,
  size: number
): { ankle: Vec3; toe: Vec3; direction: Vec3 } {
  const { yaw, pitch, strikeAt } = CONTACT;
  const level = add(scale(FORWARD, Math.cos(yaw)), scale(outward, Math.sin(yaw)));
  const direction = normalize(add(scale(level, Math.cos(pitch)), scale(UP, -Math.sin(pitch))));
  // Behind the ball, square to the boot, so the boot is a tangent to it.
  const back = scale(FORWARD, -1);
  const square = normalize(sub(back, scale(direction, dot(back, direction))));
  const touching = add(ball, scale(square, BALL_RADIUS + BOOT_RADIUS * size));
  const ankle = sub(touching, scale(direction, strikeAt * body.foot));
  return { ankle, toe: add(ankle, scale(direction, body.foot)), direction };
}

/** The taker, from the frame. */
export function takerPose(input: KickInput): Pose {
  const size = TAKER_STATURE / STANDING_SHOULDER;
  const body = scaleProportions(BODY, size);
  const side = input.foot === 'left' ? 1 : -1;
  const ground = vec(input.spot.x, 0, input.spot.z);

  // The ball's frame, for reading content/poses.js: out, up and forward.
  const OUT = vec(side, 0, 0);
  const at = (t: readonly number[]): Vec3 =>
    add(ground, vec(side * (t[0] ?? 0) * size, (t[1] ?? 0) * size, (t[2] ?? 0) * size));
  const toward = (t: readonly number[]): Vec3 => vec(side * (t[0] ?? 0), t[1] ?? 0, t[2] ?? 1);
  const flat = (y = 0): number => GROUNDED * size + y;

  /*
    Where the run-up starts and ends.

    Starts where the taker has always waited - well off to one side, because
    the camera sits 6.5 m back and a figure there costs far more screen than
    the goal does - and ends at the hips of the `plant` key.
  */
  const waiting = vec(input.spot.x + side * input.standOff, 0, input.spot.z - WAITING_BACK);
  const standingHips = flat() + (body.thigh + body.shin) * 0.985;
  const start = vec(waiting.x, standingHips, waiting.z);

  // The keys, in world metres, with the two worked-out boots filled in.
  const struck = input.phase === 'flight' || input.phase === 'resolved' || input.phase === 'complete';
  const running = input.phase === 'runup';
  const u = running ? clamp01(input.runUp) : struck ? 1 : 0;
  const t = struck ? Math.max(0, input.sinceStrike) : (u - 1) * NOMINAL_RUN_UP;

  const plantKey = KEYS.find((k) => k.name === 'plant') ?? KEYS[0]!;
  const plantPelvis = at(plantKey.values.pelvis ?? [0.36, 0.84, -0.46]);
  const path = sub(vec(plantPelvis.x, 0, plantPelvis.z), vec(start.x, 0, start.z));
  const distance = length(path);
  const heading = distance > 1e-3 ? scale(path, 1 / distance) : FORWARD;

  // Which way the taker faces along the run: along it at first, squaring up
  // to the goal by the plant.
  const facingAt = (s: number): Vec3 => {
    const blended = add(scale(heading, 1 - easeInOut(s)), scale(FORWARD, easeInOut(s)));
    return length(blended) > 1e-6 ? normalize(blended) : FORWARD;
  };
  const rightOf = (facing: Vec3): Vec3 => cross(UP, facing);
  // The planted foot is the body's left for a right-footer: `side` either way.
  const lane = (facing: Vec3, foot: 'plant' | 'kick'): Vec3 =>
    scale(rightOf(facing), (foot === 'plant' ? side : -side) * (APPROACH.stance / 2) * size);
  const onPath = (s: number): Vec3 => add(vec(start.x, 0, start.z), scale(path, s));
  const footfall = (s: number, foot: 'plant' | 'kick'): Vec3 =>
    add(add(onPath(s), lane(facingAt(s), foot)), vec(0, flat(), 0));

  // The strides. The kicking foot's last footfall is a long stride behind the
  // hips at the plant, and the planted foot's first one is halfway to it.
  const lastStride = Math.min(APPROACH.lastStride * size, distance * 0.45);
  const kickFall = distance > 1e-3 ? 1 - lastStride / distance : 0.5;
  const plantFall = kickFall / 2;
  const ahead = distance > 1e-3 ? Math.min(0.2, (APPROACH.landsAhead * size) / distance) : 0.2;
  const behind = distance > 1e-3 ? Math.min(0.2, (APPROACH.liftsBehind * size) / distance) : 0.2;

  const plantLand = at(plantKey.values.plantAnkle ?? [0.27, 0.09, -0.08]);
  const plantLandToe = toward(plantKey.values.plantToe ?? [-0.08, 0, 1]);
  const kickLastFall = footfall(kickFall, 'kick');

  const keys: Key<Channel>[] = [];
  const held: Partial<Record<Channel, Vec3>> = {};
  for (const key of KEYS) {
    const v = key.values;
    const pick = (channel: Channel, make: (t: Triple) => Vec3): Vec3 | undefined =>
      v[channel] ? make(v[channel]!) : undefined;
    const next: Partial<Record<Channel, Vec3>> = {
      pelvis: pick('pelvis', at),
      chest: pick('chest', toward),
      head: pick('head', toward),
      plantAnkle: pick('plantAnkle', at),
      plantToe: pick('plantToe', toward),
      kickAnkle: pick('kickAnkle', at),
      kickToe: pick('kickToe', toward),
      plantHand: pick('plantHand', at),
      kickHand: pick('kickHand', at),
    };
    if (key.name === 'plant') {
      // Still on the grass where the run-up's last stride put it. The next
      // key has the toe pointing down and back, so on its way there the boot
      // turns through pointing at the grass - a heel coming up - rather than
      // through nothing.
      next.kickAnkle = kickLastFall;
      next.kickToe = flatten(facingAt(kickFall));
    }
    if (key.name === 'strike' || key.name === 'contact') {
      const boot = contactBoot(input.spot, scale(OUT, -1), body, size);
      const push = key.name === 'strike' ? -CONTACT.push * size : 0;
      next.kickAnkle = add(boot.ankle, scale(FORWARD, push));
      next.kickToe = boot.direction;
    }
    for (const channel of CHANNELS) {
      const value = next[channel] ?? held[channel];
      if (value) held[channel] = value;
    }
    const values = {} as Record<Channel, readonly number[]>;
    for (const channel of CHANNELS) {
      const value = held[channel] ?? vec(0, 0, 0);
      values[channel] = [value.x, value.y, value.z];
    }
    keys.push({ at: key.at, values });
  }

  const vecOf = (n: readonly number[]): Vec3 => vec(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0);

  let pelvis: Vec3;
  let chestDir: Vec3;
  let headDir: Vec3;
  let facing: Vec3;
  let plant: { ankle: Vec3; toe: Vec3 };
  let kick: { ankle: Vec3; toe: Vec3 };
  let plantHand: Vec3 | null = null;
  let kickHand: Vec3 | null = null;

  const approaching = !struck && u < PLANT_AT;
  if (approaching) {
    // How far along the run the hips are: from standing, gathering pace, and
    // still moving when the planted foot lands.
    const x = u / PLANT_AT;
    const s = x * x * (2 - x);
    facing = facingAt(s);

    const plantSteps: Step[] = [
      { at: footfall(0, 'plant'), toe: flatten(facingAt(0)), land: -1, lift: Math.min(0.03, behind) },
      {
        at: footfall(plantFall, 'plant'),
        toe: flatten(facingAt(plantFall)),
        land: Math.max(0.05, plantFall - ahead),
        lift: Math.min(plantFall + behind, 0.9),
      },
      { at: plantLand, toe: plantLandToe, land: 1, lift: 2 },
    ];
    const kickSteps: Step[] = [
      { at: footfall(0, 'kick'), toe: flatten(facingAt(0)), land: -1, lift: Math.min(behind, Math.max(0.04, plantFall - ahead)) },
      { at: kickLastFall, toe: flatten(facingAt(kickFall)), land: Math.max(0.1, kickFall - ahead), lift: 2 },
    ];
    plant = stepping(plantSteps, s, APPROACH.stepHeight * size);
    kick = stepping(kickSteps, s, APPROACH.stepHeight * size);

    // Hips: along the run, dropping onto each footfall.
    const hips = add(vec(start.x, 0, start.z), scale(path, s));
    const planted = [plantSteps, kickSteps].reduce((sum, steps) => sum + footing(steps, s), 0);
    // Anticipation: before the first stride the knees load, a few centimetres
    // down and back, so the run starts from a push rather than from nowhere.
    const gather = SECONDARY.gather * size * hump(progress(u, 0, 0.14));
    const height =
      start.y + (plantPelvis.y - start.y) * easeInOut(s) - APPROACH.bob * size * Math.min(1, planted) - gather;
    pelvis = vec(hips.x, height, hips.z);
    // Thrown forward while running, into the plant key's lean by the end.
    const plantChest = toward(plantKey.values.chest ?? [0, 1, 0.1]);
    const runLean = normalize(add(UP, scale(facing, APPROACH.lean * hump(s))));
    const settleIn = easeInOut(progress(s, 0.6, 1));
    chestDir = normalize(add(scale(runLean, 1 - settleIn), scale(normalize(plantChest), settleIn)));
    headDir = normalize(add(UP, scale(facing, 0.25)));
  } else {
    const sampled = sampleKeys(keys, t);
    pelvis = vecOf(sampled.pelvis);
    chestDir = normalize(vecOf(sampled.chest));
    headDir = normalize(vecOf(sampled.head));
    facing = FORWARD;
    plant = { ankle: vecOf(sampled.plantAnkle), toe: normalize(vecOf(sampled.plantToe)) };
    kick = { ankle: vecOf(sampled.kickAnkle), toe: normalize(vecOf(sampled.kickToe)) };
    plantHand = vecOf(sampled.plantHand);
    kickHand = vecOf(sampled.kickHand);

    /*
      Settling after the kicking foot comes down: the weight arrives on it and
      the knees take it, a few centimetres down and back up. A spring from the
      moment it lands rather than one more key, so it overshoots and settles
      the way a body does.
    */
    const landKey = KEYS.find((k) => k.name === 'land');
    if (struck && landKey) {
      const landed = t - landKey.at + 0.06;
      pelvis = add(pelvis, vec(0, -SECONDARY.settle * size * springKnock(landed, 2.2, 0.45), 0));
      // The arms arrive a beat after the body and swing past where they stop.
      const swing = SECONDARY.arms * size * springKnock(landed - 0.05, 1.8, 0.35);
      plantHand = add(plantHand, vec(0, 0, swing));
      kickHand = add(kickHand, vec(0, 0, -swing));
    }

    /*
      The weight carrying on over the planted foot. The hips stop at the
      plant; the chest, head and arms are still going, so they tip forward
      past the keyed lean and come back. A knock from the moment of the plant,
      on the same clock as everything else.
    */
    const carry = SECONDARY.carry * springKnock(t - plantKey.at, 3.2, 0.4);
    chestDir = normalize(add(chestDir, vec(0, 0, carry)));
    headDir = normalize(add(headDir, vec(0, 0, carry * 1.4)));
  }

  // Waiting: breathing, weight shifting, and leaning in as the drag builds.
  const idle = isIdle(input.phase);
  const lean = idle ? input.power * 0.25 : 0;
  const alive = idle ? 1 - Math.min(1, lean * 3) : 0;
  const breath = wave(input.clock, BREATH_PERIOD) * 0.019 * alive;
  const sway = wave(input.clock, SWAY_PERIOD, 0.37) * 0.012 * alive;
  if (idle || (!running && !struck)) {
    pelvis = add(pelvis, vec(sway, breath * 0.6 - lean * 0.14, 0));
    chestDir = normalize(add(chestDir, scale(facing, lean * 0.7)));
  }

  // Never let the hips leave a planted foot behind: if a foot on the grass is
  // out of the leg's reach, the hips come down until it is not.
  pelvis = keepFeetPlanted(pelvis, [plant.ankle, kick.ankle], facing, side, body, flat());
  // A foot in the air that the leg cannot quite reach - just after it leaves
  // the grass, while the hips run on - is brought in to the end of the leg.
  // Nobody can see where a swinging foot "should" have been; they can see a
  // leg that does not reach its boot.
  plant = { ...plant, ankle: withinReach(plant.ankle, pelvis, facing, side, body, flat()) };
  kick = { ...kick, ankle: withinReach(kick.ankle, pelvis, facing, -side, body, flat()) };

  const chest = add(pelvis, scale(chestDir, body.spine));
  const head = add(chest, scale(headDir, body.neck));

  // Arms: against the legs on the way in, into the keys' balancing positions
  // by the plant.
  const right = rightOf(facing);
  const shoulderOf = (foot: 'plant' | 'kick'): Vec3 =>
    add(chest, scale(right, (foot === 'plant' ? side : -side) * (body.shoulderWidth / 2)));
  const swingingHand = (foot: 'plant' | 'kick', ankle: Vec3): Vec3 => {
    const level = flatten(facing);
    // The hand on this side goes the opposite way to the foot on this side.
    const stride = dot(sub(ankle, pelvis), level);
    const swing = Math.max(-0.3 * size, Math.min(0.3 * size, -APPROACH.armSwing * stride));
    const out = scale(right, (foot === 'plant' ? side : -side) * 0.06 * size);
    // Nearly the arm's full length below the shoulder, and a touch forward.
    // Much higher and the arm has to fold, and the elbow folds back - straight
    // at the camera behind the taker, where it reads as an arm across the back.
    return add(add(add(shoulderOf(foot), vec(0, -0.66 * size, 0)), scale(level, swing + 0.06 * size)), out);
  };
  if (!plantHand || !kickHand) {
    const x = u / PLANT_AT;
    const s = approaching ? x * x * (2 - x) : 0;
    const into = approaching ? easeInOut(progress(s, 0.7, 1)) : 0;
    const plantKeyHand = at(plantKey.values.plantHand ?? [0.5, 0.8, -0.6]);
    const kickKeyHand = at(plantKey.values.kickHand ?? [0, 1, -0.1]);
    const a = swingingHand('plant', plant.ankle);
    const b = swingingHand('kick', kick.ankle);
    plantHand = add(scale(a, 1 - into), scale(plantKeyHand, into));
    kickHand = add(scale(b, 1 - into), scale(kickKeyHand, into));
  }

  const toeOf = (foot: { ankle: Vec3; toe: Vec3 }): Vec3 => add(foot.ankle, scale(foot.toe, body.foot));
  // [left, right]: the planted foot is the left one for a right-footer.
  const plantIsLeft = input.foot === 'right';
  const pair = <T>(plantSide: T, kickSide: T): [T, T] =>
    plantIsLeft ? [plantSide, kickSide] : [kickSide, plantSide];

  return {
    feet: vec(pelvis.x, 0, pelvis.z),
    pelvis,
    shoulder: chest,
    head,
    hands: pair(plantHand, kickHand),
    ankles: pair(plant.ankle, kick.ankle),
    toes: pair(toeOf(plant), toeOf(kick)),
    facing,
    stature: TAKER_STATURE,
    sided: true,
  };
}

/** Level, and unit length. */
function flatten(v: Vec3): Vec3 {
  const level = vec(v.x, 0, v.z);
  return length(level) > 1e-9 ? normalize(level) : FORWARD;
}

/**
 * One footfall in the run-up: where the foot is put, which way it points, and
 * between which points of the run (0 at the start, 1 at the plant) it is on
 * the grass. A foot is in the air between one footfall's `lift` and the
 * next one's `land`.
 */
interface Step {
  at: Vec3;
  toe: Vec3;
  land: number;
  lift: number;
}

/**
 * Where a foot is, `s` of the way along the run.
 *
 * On the grass, it is exactly where it was put - not near it. In the air, it
 * travels to the next footfall slow-fast-slow, rising through the stride, with
 * the heel up as it leaves and the toe up as it lands.
 */
function stepping(steps: Step[], s: number, height: number): { ankle: Vec3; toe: Vec3 } {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (s >= step.land && s <= step.lift) return { ankle: step.at, toe: step.toe };
    const next = steps[i + 1];
    if (next && s > step.lift && s < next.land) {
      const q = progress(s, step.lift, next.land);
      const e = easeInOut(q);
      const ankle = add(add(step.at, scale(sub(next.at, step.at), e)), vec(0, height * hump(q), 0));
      // Toe down pushing off, level through the middle, a touch up to land.
      const pitch = -0.8 * (1 - q) * (1 - q) + 0.5 * q * (1 - q);
      const level = flatten(add(scale(step.toe, 1 - e), scale(next.toe, e)));
      return { ankle, toe: normalize(add(level, vec(0, pitch, 0))) };
    }
  }
  const last = steps[steps.length - 1]!;
  return { ankle: last.at, toe: last.toe };
}

/** How firmly a foot is on the grass at `s`, 0 in the air and 1 mid-stance, for the bob. */
function footing(steps: Step[], s: number): number {
  for (const step of steps) {
    if (s >= step.land && s <= step.lift) {
      const span = Math.min(step.lift, 1) - Math.max(step.land, 0);
      if (span <= 0) return 1;
      return hump((s - Math.max(step.land, 0)) / span);
    }
  }
  return 0;
}

/**
 * Lower the hips until every foot on the grass is within its leg's reach.
 *
 * A planted foot the leg cannot reach would be drawn at the end of a straight
 * leg somewhere short of it - which is a foot sliding. Dropping the hips is
 * what a body does instead: the knee bends and the foot stays.
 */
function keepFeetPlanted(
  pelvis: Vec3,
  ankles: Vec3[],
  facing: Vec3,
  side: number,
  body: Proportions,
  groundedY: number
): Vec3 {
  const right = cross(UP, facing);
  const leg = (body.thigh + body.shin) * 0.995;
  let y = pelvis.y;
  ankles.forEach((ankle, i) => {
    if (ankle.y > groundedY + 1e-6) return;
    const sign = i === 0 ? side : -side;
    const hip = add(vec(pelvis.x, y, pelvis.z), scale(right, sign * (body.hipWidth / 2)));
    const across = Math.hypot(hip.x - ankle.x, hip.z - ankle.z);
    if (across >= leg) return;
    y = Math.min(y, ankle.y + Math.sqrt(leg * leg - across * across));
  });
  return vec(pelvis.x, y, pelvis.z);
}

/** A foot in the air, pulled in to where its leg can reach. A foot on the grass is left alone. */
function withinReach(
  ankle: Vec3,
  pelvis: Vec3,
  facing: Vec3,
  sign: number,
  body: Proportions,
  groundedY: number
): Vec3 {
  if (ankle.y <= groundedY + 1e-6) return ankle;
  const hip = add(pelvis, scale(cross(UP, facing), sign * (body.hipWidth / 2)));
  const leg = (body.thigh + body.shin) * 0.995;
  const reach = sub(ankle, hip);
  const far = length(reach);
  if (far <= leg) return ankle;
  const pulled = add(hip, scale(reach, leg / far));
  // Pulled toward the hip, but never down into the grass.
  return vec(pulled.x, Math.max(pulled.y, groundedY + 1e-3), pulled.z);
}
