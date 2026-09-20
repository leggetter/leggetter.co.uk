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

import type { SetPiece } from './setpiece.ts';
import { postCovered, WALL_DISTANCE } from './setpiece.ts';
import { BALL_RADIUS } from './units.ts';
import type { Vec3 } from './vec3.ts';
import { sub, vec } from './vec3.ts';

/**
 * Shoulder to shoulder, and how high they get.
 *
 * `HEIGHT` is a jumping player rather than a standing one, because a wall
 * jumps and a free kick that clears a standing wall and not a jumping one is
 * the single most common thing that happens to a free kick.
 */
export const SHOULDER = 0.52;
export const PERSON_RADIUS = 0.26;
export const HEIGHT = 2.15;

export interface WallPerson {
  /** Feet, on the ground. */
  at: Vec3;
}

export interface Wall {
  people: WallPerson[];
  /** How high anybody in it can get. */
  height: number;
  /** How wide one of them is. The view draws a figure this size. */
  radius: number;
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
  if (piece.wallCount <= 0) return { people, height: HEIGHT, radius: PERSON_RADIUS };

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

  return { people, height: HEIGHT, radius: PERSON_RADIUS };
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
 */
export function wallHit(from: Vec3, to: Vec3, wall: Wall): boolean {
  if (wall.people.length === 0) return false;

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

    // It passed through their ground position. Over their heads or not?
    const y = from.y + (to.y - from.y) * t;
    if (y - BALL_RADIUS < wall.height) return true;
  }

  return false;
}
