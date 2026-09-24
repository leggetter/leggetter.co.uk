/**
 * Two-bone inverse kinematics: where the elbow goes, given a shoulder, a hand,
 * and how long the two bones between them are. The same solve places a knee
 * between a hip and an ankle.
 *
 * No trigonometry. The law of cosines gives the cosine of the angle at the
 * root directly, and its sine is one square root away, so the whole solve is
 * arithmetic and `Math.sqrt` - which IEEE 754 defines exactly, unlike
 * `Math.cos`. Nothing here decides an outcome, so determinism is not required
 * of it, but it costs nothing to have.
 */

import { add, cross, dot, length, normalize, scale, sub, vec, type Vec3 } from '../../../core/vec3.ts';

export interface TwoBone {
  /** The middle joint: an elbow or a knee. */
  mid: Vec3;
  /** Where the chain ends. The target, when it could be reached. */
  end: Vec3;
  /**
   * Whether the end is on the target.
   *
   * False when the target is further away than the two bones can stretch, or
   * closer than they can fold. The chain then points at it from as near as it
   * can get - a keeper at full stretch, rather than an arm that grows.
   */
  reached: boolean;
}

/** Below this, a length is treated as zero. A tenth of a millimetre. */
const EPS = 1e-4;

/**
 * A unit vector at right angles to `v`.
 *
 * Crossed with whichever world axis `v` is least aligned with, so the result
 * never collapses to zero. Only used when the caller's own hint is useless.
 */
export function perpendicularTo(v: Vec3): Vec3 {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  const axis = ax <= ay && ax <= az ? vec(1, 0, 0) : ay <= az ? vec(0, 1, 0) : vec(0, 0, 1);
  return normalize(cross(v, axis));
}

/**
 * Solve one limb.
 *
 * `pole` is a *direction*, not a point: the way the middle joint should bend.
 * Knees bend forward, elbows back and out. Only the part of it at right angles
 * to the limb matters, so it does not need to be exact.
 */
export function twoBone(
  root: Vec3,
  target: Vec3,
  upper: number,
  lower: number,
  pole: Vec3
): TwoBone {
  const toTarget = sub(target, root);
  const distance = length(toTarget);

  // A target sitting on the root has no direction to point in, so the limb
  // folds along something at right angles to the pole instead.
  const along = distance > EPS ? scale(toTarget, 1 / distance) : perpendicularTo(pole);

  const longest = upper + lower;
  const shortest = Math.max(Math.abs(upper - lower), EPS);
  const reach = Math.min(Math.max(distance, shortest), longest);
  const reached = Math.abs(reach - distance) <= EPS;

  // Law of cosines, for the angle between the upper bone and the line to the
  // end. Clamped because rounding can push it a hair past 1 at full stretch.
  const cosine = Math.min(
    1,
    Math.max(-1, (upper * upper + reach * reach - lower * lower) / (2 * upper * reach))
  );
  const sine = Math.sqrt(1 - cosine * cosine);

  // The bend direction: the pole, with the part along the limb removed.
  const sideways = sub(pole, scale(along, dot(pole, along)));
  const bend = length(sideways) > EPS ? normalize(sideways) : perpendicularTo(along);

  return {
    mid: add(add(root, scale(along, upper * cosine)), scale(bend, upper * sine)),
    end: add(root, scale(along, reach)),
    reached,
  };
}
