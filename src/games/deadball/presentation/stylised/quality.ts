/**
 * How much the stylised package spends, and when it spends less.
 *
 * Budgeted for a mid-range phone, which is the device most people will play
 * this on and the one that cannot be assumed to cope. Two tiers rather than a
 * slider, because every setting here trades against the others and a player
 * has no way to know which one is costing them:
 *
 * - **high**: up to 2x pixel ratio, soft shadows from one light (the ball's
 *   shadow is a depth cue, not decoration), glowing floodlights, the full crowd.
 * - **low**: 1x pixel ratio, no shadow maps - a flat disc under the ball keeps
 *   the depth cue for almost nothing - no floodlight glow, a third of the crowd,
 *   thinned evenly so it is the same crowd with empty seats.
 *
 * It starts high and drops, once, if the frames it is getting say it should.
 * `?quality=low` or `?quality=high` pins it, for testing and for anyone who
 * would rather choose.
 */

export type Quality = 'high' | 'low';

export interface QualitySettings {
  /** Cap on devicePixelRatio. Fill rate is what a phone runs out of first. */
  pixelRatio: number;
  shadows: boolean;
  /** Shadow map size, when there are shadows. */
  shadowMap: number;
  /** Additive halos on the floodlights: a cheap stand-in for bloom. */
  halos: boolean;
  /** How many of the crowd are drawn. They are one draw call either way. */
  crowd: number;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, halos: true, crowd: 20000 },
  low: { pixelRatio: 1, shadows: false, shadowMap: 0, halos: false, crowd: 6000 },
};

/** `?quality=` if it names a tier, else null, meaning "decide for me". */
export function pinnedQuality(search: string): Quality | null {
  const asked = new URLSearchParams(search).get('quality');
  return asked === 'high' || asked === 'low' ? asked : null;
}

/**
 * Watches the gap between frames and says when to drop a tier.
 *
 * The gap rather than the time spent in `render`, because on a phone most of
 * the cost of a WebGL frame is on the GPU and never shows up in a JavaScript
 * timer; the gap is where it shows. The first frames are ignored - shaders
 * compile and textures upload on them, and judging a device by its slowest
 * second would drop everybody. Gaps longer than a tenth of a second are a
 * backgrounded tab or a paused debugger, not a slow phone, and are ignored too.
 *
 * Decides once. A tier that went up again as soon as the frames recovered would
 * flicker between the two, and they look different enough to notice.
 */
export class FrameBudget {
  private seen = 0;
  private last: number | null = null;
  private readonly gaps: number[] = [];
  private decided = false;

  /** Median gap, in ms, above which the frames are too slow. 20 ms is 50 fps. */
  private readonly limit: number;
  private readonly warmup: number;
  private readonly sample: number;

  constructor(limit = 20, warmup = 45, sample = 90) {
    this.limit = limit;
    this.warmup = warmup;
    this.sample = sample;
  }

  /**
   * Called once per frame with a timestamp in ms. True exactly once, on the
   * frame the budget is judged to have been blown.
   */
  tick(now: number): boolean {
    if (this.decided) return false;
    const gap = this.last === null ? null : now - this.last;
    this.last = now;
    this.seen += 1;
    if (this.seen <= this.warmup || gap === null || gap > 100) return false;
    this.gaps.push(gap);
    if (this.gaps.length < this.sample) return false;
    this.decided = true;
    const sorted = [...this.gaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    return median > this.limit;
  }

  /** The median gap it judged on, for the console. Null until it has judged. */
  median(): number | null {
    if (!this.decided) return null;
    const sorted = [...this.gaps].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? null;
  }
}
