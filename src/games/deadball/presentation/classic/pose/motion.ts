/**
 * How a pose gets from one key to the next.
 *
 * Phase 3 of #72 is mostly about *timing*: a body with no weight is one where
 * every movement runs at the same speed, starts at once and stops dead. Three
 * tools here, all pure functions of time so that the same frame always draws
 * the same body, on a 60 Hz laptop or a 120 Hz phone:
 *
 * - **Easing**, for a single movement that starts and settles.
 * - **Keys**, for a sequence of poses: a smooth curve through every key that
 *   never overshoots one, and holds perfectly still between two keys that
 *   agree. That last property is what keeps a planted foot planted.
 * - **Springs**, for what happens after something: a limb that lags and
 *   settles, a landing that is absorbed. Written as the closed-form response
 *   of a damped spring to a step or a knock at a known time, not as a spring
 *   stepped frame by frame - so it needs no memory between frames, cannot
 *   drift with the frame rate, and a replay (#63) draws exactly what the
 *   original did. Whether it should was an open question on #72; this way it
 *   does not have to be decided.
 */

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Slow in, slow out. */
export const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Quick off the mark, settling at the end. */
export const easeOut = (t: number): number => {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
};

/** Gathering speed, fastest at the end: a boot swinging into a ball. */
export const easeIn = (t: number): number => {
  const x = clamp01(t);
  return x * x;
};

/** A sine hump, 0 at both ends and 1 in the middle: a foot lifting through a stride. */
export const hump = (t: number): number => Math.sin(Math.PI * clamp01(t));

/** How far between `from` and `to` a value is, 0 to 1. */
export const progress = (value: number, from: number, to: number): number =>
  to === from ? (value >= to ? 1 : 0) : clamp01((value - from) / (to - from));

/**
 * A damped spring released from 0 toward 1 at `t` = 0.
 *
 * `frequency` in hertz, `damping` below 1 so it overshoots a little and
 * settles, which is what a limb arriving somewhere does. 0 before `t` = 0.
 */
export function springTo(t: number, frequency: number, damping: number): number {
  if (t <= 0) return 0;
  const omega = 2 * Math.PI * frequency;
  const zeta = Math.min(0.999, Math.max(0.01, damping));
  const root = Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  const wd = omega * root;
  return 1 - decay * (Math.cos(wd * t) + (zeta / root) * Math.sin(wd * t));
}

/**
 * A damped spring knocked at `t` = 0: it swings out to 1, comes back through
 * 0, and settles there.
 *
 * The shape of a landing absorbed in the knees, or a trailing leg that goes
 * past where it stops and comes back. Scaled so the first peak is exactly 1,
 * whatever the frequency and damping, so the amplitude is the caller's.
 */
export function springKnock(t: number, frequency: number, damping: number): number {
  if (t <= 0) return 0;
  const omega = 2 * Math.PI * frequency;
  const zeta = Math.min(0.999, Math.max(0.01, damping));
  const root = Math.sqrt(1 - zeta * zeta);
  const wd = omega * root;
  const shape = (s: number): number => Math.exp(-zeta * omega * s) * Math.sin(wd * s);
  const peak = Math.atan2(root, zeta) / wd;
  return shape(t) / shape(peak);
}

/** One key pose: when, and a set of numbers. */
export interface Key<Channel extends string> {
  at: number;
  values: Record<Channel, readonly number[]>;
}

/**
 * Where a set of channels is at time `t`, through a sequence of keys.
 *
 * Each number is interpolated on its own with a monotone cubic (Fritsch and
 * Carlson, 1980): smooth through every key, with the speed carried through a
 * key rather than stopping at it, but never overshooting one. A linear blend
 * would have every movement at constant speed and turning corners at every
 * key; an ordinary spline would swing a planted foot past where it was put.
 *
 * **Two keys that agree give exactly that value between them**, not a value
 * within rounding of it, so a foot held in place across several keys does not
 * move at all. Before the first key and after the last, the end keys hold.
 */
export function sampleKeys<Channel extends string>(
  keys: readonly Key<Channel>[],
  t: number
): Record<Channel, number[]> {
  const first = keys[0];
  if (!first) throw new Error('sampleKeys needs at least one key');
  const out = {} as Record<Channel, number[]>;
  const channels = Object.keys(first.values) as Channel[];
  for (const channel of channels) {
    const width = first.values[channel].length;
    const sampled: number[] = [];
    for (let i = 0; i < width; i++) {
      sampled.push(monotone(keys, channel, i, t));
    }
    out[channel] = sampled;
  }
  return out;
}

function monotone<Channel extends string>(
  keys: readonly Key<Channel>[],
  channel: Channel,
  index: number,
  t: number
): number {
  const n = keys.length;
  const at = (k: number): number => keys[k]!.at;
  const y = (k: number): number => keys[k]!.values[channel][index] ?? 0;
  if (n === 1 || t <= at(0)) return y(0);
  if (t >= at(n - 1)) return y(n - 1);

  let k = 0;
  while (k < n - 2 && t > at(k + 1)) k++;

  const y0 = y(k);
  const y1 = y(k + 1);
  if (y0 === y1) return y0;

  const slope = (a: number): number => (y(a + 1) - y(a)) / (at(a + 1) - at(a));
  const tangent = (a: number): number => {
    if (a === 0) return slope(0);
    if (a === n - 1) return slope(n - 2);
    const before = slope(a - 1);
    const after = slope(a);
    if (before * after <= 0) return 0;
    // Weighted harmonic mean, which is what keeps it from overshooting.
    const h0 = at(a) - at(a - 1);
    const h1 = at(a + 1) - at(a);
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / before + w1 / after);
  };

  const h = at(k + 1) - at(k);
  const s = (t - at(k)) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  // An end key's tangent could otherwise overshoot; clamp it the same way.
  const d = slope(k);
  const clampTangent = (m: number): number =>
    d === 0 ? 0 : Math.sign(m) !== Math.sign(d) ? 0 : Math.min(Math.abs(m), 3 * Math.abs(d)) * Math.sign(d);
  const m0 = clampTangent(tangent(k));
  const m1 = clampTangent(tangent(k + 1));
  return (
    (2 * s3 - 3 * s2 + 1) * y0 +
    (s3 - 2 * s2 + s) * h * m0 +
    (-2 * s3 + 3 * s2) * y1 +
    (s3 - s2) * h * m1
  );
}
