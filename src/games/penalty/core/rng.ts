/**
 * Seeded pseudo-random numbers.
 *
 * The simulation must never reach for Math.random. Everything random in a shot
 * comes from here, seeded per shot, so the same input and the same seed produce
 * the same result on any machine. That is what makes replays free, tests exact,
 * and two-player over the wire a matter of sending a seed rather than a
 * trajectory.
 *
 * mulberry32: small, fast, and good enough for aim wobble and keeper guesses.
 * Not for anything where randomness has to be unguessable.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Approximately normal, in [-1, 1], standard deviation about 0.29. */
  nextBell(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Current internal state, so a shot can be rewound or logged. */
  state(): number;
}

export function createRng(seed: number): Rng {
  // Coerce to a 32-bit integer so a float seed can't produce a different
  // stream on a different engine.
  let s = seed | 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,

    /**
     * Sum of four uniforms, recentered. The usual Box-Muller transform would be
     * a better bell, but it needs Math.log and Math.cos, and those are
     * implementation-defined, which would put cross-browser determinism at the
     * mercy of the engine. Four additions are not.
     */
    nextBell: () => (next() + next() + next() + next() - 2) / 2,

    range: (min, max) => min + next() * (max - min),

    state: () => s,
  };
}

/**
 * Derive a per-shot seed from a match seed and a shot index, so every shot in a
 * match is independent but the match as a whole replays from one number.
 */
export const shotSeed = (matchSeed: number, shotIndex: number): number =>
  (Math.imul(matchSeed | 0, 0x9e3779b1) + Math.imul(shotIndex + 1, 0x85ebca6b)) | 0;
