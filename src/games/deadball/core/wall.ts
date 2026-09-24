/**
 * The wall, and whether the ball got past it.
 *
 * Named in the module layout since the first draft of the spec and empty until
 * now. It is the third of the three things a penalty holds fixed - no wall, one
 * distance, one angle - and the one that changes how a shot is aimed rather
 * than only where it starts from.
 *
 * Pure geometry over plain data, like the rest of `core/`. It knows nothing
 * about who is in the wall or what colour they are; that is the view's
 * business, and `presentation/` decides it from the same numbers.
 */

import { WALL } from '../content/walls.js';
import type { SetPiece } from './setpiece.ts';
import { JUMP_CHANCE, postCovered, WALL_DISTANCE } from './setpiece.ts';
import { BALL_RADIUS, GRAVITY } from './units.ts';
import type { Vec3 } from './vec3.ts';
import { sub, vec } from './vec3.ts';

/** A number from `content/walls.js`, cleaned. It is a file people edit by hand. */
const tuned = (value: unknown, fallback: number, lo: number, hi: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback;

const source = (WALL ?? {}) as Record<string, unknown>;

/** Shoulder to shoulder. */
export const SHOULDER = 0.52;
export const PERSON_RADIUS = 0.26;

/**
 * How tall they are standing, to the top of the head.
 *
 * This used to be a single `HEIGHT` of 2.15 m - a *jumping* player - on the
 * grounds that a wall jumps. So the wall was permanently at its maximum and
 * going under it was never on, and `driven`, the shot built for the gap, was
 * a label. Now some walls jump and some do not, and you can see which.
 */
export const STANDING = tuned(source.standing, 2.02, 1.4, 2.4);

/** How far down a wall set to jump sinks, as a fraction of `STANDING`. */
export const CROUCH = tuned(source.crouch, 0.14, 0, 0.4);

/** How far the whole body rises at the top of the jump, metres. */
export const JUMP = tuned(source.jump, 0.35, 0, 1);

/**
 * How much further the feet come up beneath them at the top, metres.
 *
 * Nobody in a wall jumps with straight legs. The knees come up, so the gap
 * under a jumping wall is the rise plus the tuck, while the heads only go up
 * by the rise. Separate numbers because they trade against different shots:
 * the tuck is how much room a driven shot has underneath, and the rise is how
 * much harder the wall is to go over.
 */
export const TUCK = tuned(source.tuck, 0.55, 0, 1);

/** Seconds after the strike before their feet leave the ground. */
export const JUMP_DELAY = tuned(source.delay, 0.03, 0, 1);

/** Straight up and straight down, under gravity: the speed that reaches `JUMP`. */
const TAKEOFF = Math.sqrt(2 * GRAVITY * JUMP);

/** How long their feet are off the ground. */
export const AIRTIME = (2 * TAKEOFF) / GRAVITY;

/** The wall numbers, for the tuning fingerprint. See core/tuning.ts. */
export const WALL_TUNING: readonly number[] = [
  SHOULDER,
  PERSON_RADIUS,
  STANDING,
  CROUCH,
  JUMP,
  TUCK,
  JUMP_DELAY,
  JUMP_CHANCE,
];

export interface WallPerson {
  /** Feet, on the ground. */
  at: Vec3;
}

export interface Wall {
  people: WallPerson[];
  /** How tall they are standing, to the top of the head. */
  height: number;
  /** How wide one of them is. The view draws a figure this size. */
  radius: number;
  /**
   * Whether this wall jumps when the ball is struck.
   *
   * Decided with the kick (see `setPieceFor`), not at the strike, and shown
   * before it: a wall that is going to jump crouches while the taker aims.
   * See `wallPoseAt`.
   */
  jumps: boolean;
}

/**
 * Where the wall is in its jump, `t` seconds after the strike.
 *
 * `t` is 0 before the ball is struck as well, which is the point: a jumping
 * wall is crouched and set from the moment the kick is set up, so the taker
 * can see what it is going to do before deciding how to hit it. Everything a
 * view needs to draw the wall is here, and the hit test reads the same thing,
 * so what you see is what the ball meets.
 */
export interface WallPose {
  /** 0 standing tall, 1 fully crouched and set to spring. */
  crouch: number;
  /** How far their bodies have risen, metres. */
  lift: number;
  /** How far their feet are drawn up beneath them on top of that, metres. */
  tuck: number;
  /** In the air right now. */
  airborne: boolean;
  /** 0 at take-off, 0.5 at the top, 1 back on the ground. 0 if not jumping. */
  progress: number;
}

const STILL: WallPose = Object.freeze({ crouch: 0, lift: 0, tuck: 0, airborne: false, progress: 0 });

export function wallPoseAt(wall: Wall, t: number): WallPose {
  if (!wall.jumps || wall.people.length === 0) return STILL;
  // Set, and waiting for the kick.
  if (t <= JUMP_DELAY) return { crouch: 1, lift: 0, tuck: 0, airborne: false, progress: 0 };
  const up = t - JUMP_DELAY;
  // Back down. A wall jumps once; it does not bounce.
  if (up >= AIRTIME) return STILL;
  const lift = Math.max(0, TAKEOFF * up - 0.5 * GRAVITY * up * up);
  return {
    crouch: 0,
    lift,
    // In step with the rise: knees up as they go up, down again to land.
    tuck: JUMP > 0 ? TUCK * (lift / JUMP) : 0,
    airborne: true,
    progress: up / AIRTIME,
  };
}

/**
 * The band of height the wall fills at `t` seconds after the strike.
 *
 * A standing wall fills the ground to the top of their heads. A jumping one
 * is shorter while it is crouched, and once it leaves the ground the band
 * lifts: taller at the top, and a gap underneath - the rise and the tuck
 * together - that a low, hard shot can go through.
 */
export function wallBand(wall: Wall, t: number): { bottom: number; top: number } {
  const pose = wallPoseAt(wall, t);
  return {
    bottom: pose.lift + pose.tuck,
    top: pose.lift + wall.height * (1 - pose.crouch * CROUCH),
  };
}

/**
 * Where everybody stands.
 *
 * Real walls do not stand between the ball and the middle of the goal; they
 * line up so their outside edge blocks the path to the near post, and the
 * keeper takes everything on the other side. That is the whole geometry of a
 * free kick and the reason an angled one is a different problem from a central
 * one: from wide, the wall covers the shot you would most like to take.
 *
 * Ten yards from the ball, on the arc, with the outermost player on the
 * ball-to-post line and the rest stepping inward toward the middle.
 */
export function buildWall(piece: SetPiece): Wall {
  const people: WallPerson[] = [];
  const jumps = piece.wallJumps === true;
  if (piece.wallCount <= 0) return { people, height: STANDING, radius: PERSON_RADIUS, jumps: false };

  const post = postCovered(piece);
  const toPost = sub(post, piece.origin);
  const flat = Math.hypot(toPost.x, toPost.z) || 1;
  const dir = { x: toPost.x / flat, z: toPost.z / flat };

  // Along the wall, away from the post it is covering. Of the two
  // perpendiculars, the one pointing at the middle of the goal.
  const side = { x: -dir.z, z: dir.x };
  const outer = {
    x: piece.origin.x + dir.x * WALL_DISTANCE,
    z: piece.origin.z + dir.z * WALL_DISTANCE,
  };
  // Does `side` lead toward the goal's centre line, or away from it?
  const inward = outer.x + side.x > outer.x - side.x === outer.x < 0 ? 1 : -1;

  for (let i = 0; i < piece.wallCount; i++) {
    const along = (i + 0.5) * SHOULDER * inward;
    people.push({
      at: vec(outer.x + side.x * along, 0, outer.z + side.z * along),
    });
  }

  return { people, height: STANDING, radius: PERSON_RADIUS, jumps };
}

/**
 * Did this step of the flight run into anybody?
 *
 * Each person is a standing cylinder rather than a box, which costs nothing
 * and means the wall does not have to be rotated to face the ball - an angled
 * free kick would otherwise need the whole wall re-oriented for a test that
 * cannot tell the difference at this size.
 *
 * Tested against the segment the ball actually travelled rather than its
 * position at the end of the step. At the shipped 120 Hz that is belt and
 * braces - the hardest shot moves 27 cm a step and a person is 74 cm across,
 * so sampling the end of each step would catch it anyway. It stops mattering
 * the moment somebody changes the tick rate, which is one constant in
 * `units.ts`, and a swept test costs one dot product more than a point one.
 *
 * `at` is seconds since the strike at the end of this step, because a jumping
 * wall is a different shape at different moments: crouched, then rising with
 * a gap underneath, then back down. Read once per step rather than at the
 * exact instant of contact - a step is 8 ms, and in 8 ms a jumping wall moves
 * about two centimetres.
 */
export function wallHit(from: Vec3, to: Vec3, wall: Wall, at = 0): boolean {
  if (wall.people.length === 0) return false;

  const band = wallBand(wall, at);
  const reach = wall.radius + BALL_RADIUS;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lenSq = dx * dx + dz * dz;

  for (const person of wall.people) {
    // Closest approach of the step to this person, in the ground plane.
    const px = person.at.x - from.x;
    const pz = person.at.z - from.z;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + pz * dz) / lenSq));
    const cx = from.x + dx * t - person.at.x;
    const cz = from.z + dz * t - person.at.z;
    if (cx * cx + cz * cz > reach * reach) continue;

    // It passed through where they are standing. Over their heads, under
    // their feet, or into them?
    const y = from.y + (to.y - from.y) * t;
    if (y - BALL_RADIUS < band.top && y + BALL_RADIUS > band.bottom) return true;
  }

  return false;
}
