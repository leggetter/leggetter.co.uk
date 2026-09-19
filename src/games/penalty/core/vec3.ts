/**
 * Minimal 3D vector math.
 *
 * Every operation returns a new object rather than mutating in place. There is
 * one ball, stepped 120 times a second, so the allocation is irrelevant and the
 * absence of aliasing bugs is not.
 *
 * Deliberately uses only +, - and *, plus Math.sqrt in `length`. IEEE-754
 * guarantees those are correctly rounded, so two browsers agree exactly.
 * Math.sin, Math.cos and Math.exp carry no such guarantee, which is why nothing
 * in core/ uses them. See docs/penalty-shootout-spec.md on determinism.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const ZERO: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });

export const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const scale = (a: Vec3, k: number): Vec3 => ({
  x: a.x * k,
  y: a.y * k,
  z: a.z * k,
});

/** a + b * k, the shape every integration step actually wants. */
export const addScaled = (a: Vec3, b: Vec3, k: number): Vec3 => ({
  x: a.x + b.x * k,
  y: a.y + b.y * k,
  z: a.z + b.z * k,
});

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const lengthSq = (a: Vec3): number => a.x * a.x + a.y * a.y + a.z * a.z;

export const length = (a: Vec3): number => Math.sqrt(lengthSq(a));

export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b));

export const normalize = (a: Vec3): Vec3 => {
  const len = length(a);
  return len === 0 ? { ...ZERO } : scale(a, 1 / len);
};

/** Component-wise linear interpolation. Used to find the exact goal crossing. */
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});
