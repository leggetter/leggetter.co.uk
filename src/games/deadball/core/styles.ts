/**
 * Which ball you chose to hit.
 *
 * A style is not an attribute. `curve` is how well a player bends a ball;
 * this is whether they tried to bend this one. The same drag struck three
 * ways, so the gesture stays the one gesture and the decision sits beside it.
 *
 * Pure, like the rest of `core/`, and the numbers live in `content/shots.js`
 * where they can be argued with by anybody.
 */

import { DEFAULT_STYLE_ID, SHOT_STYLES } from '../content/shots.js';

export type ShotStyleId = string;

export interface ShotStyle {
  id: ShotStyleId;
  label: string;
  /** One line, shown under the button. */
  hint: string;
  /** Multiplier on the hook the gesture asked for. */
  curve: number;
  /** Multiplier on how hard it leaves the boot. */
  power: number;
  /** How much of the player's `dip` is spent arcing it over a wall. */
  loft: number;
  /**
   * Topspin the style puts on regardless of the gesture, so the ball falls.
   *
   * Separate from `loft`, and the pair is what makes a trajectory a shape
   * rather than a height. `loft` is how much of the pace is spent going up;
   * this is how hard it is pulled back down. A shot with loft and no dip is a
   * balloon - which is what finesse was, apexing at 4.84 m over a 2.44 m
   * crossbar and hanging for 1.76 seconds.
   */
  dip: number;
  /** Scales where in the goal the aim lands, so driven stays low. */
  height: number;
  /**
   * Unpredictable spin, as a fraction of the maximum.
   *
   * Fixed for one flight and different on the next, which is the whole point:
   * a knuckleball is not inaccurate, it is *unreadable*. The keeper commits on
   * where the ball is pointed and the ball does not go there, and neither the
   * taker nor the keeper knows which way it will break.
   */
  wobble: number;
}

const clamp01 = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(3, v)) : fallback;

/** A style, cleaned. `content/` is a file people are invited to edit by hand. */
function cleanStyle(raw: unknown): ShotStyle | null {
  const source = (raw ?? {}) as Record<string, unknown>;
  if (typeof source.id !== 'string' || source.id.length === 0) return null;
  return {
    id: source.id,
    label: typeof source.label === 'string' && source.label ? source.label : source.id,
    hint: typeof source.hint === 'string' ? source.hint : '',
    curve: clamp01(source.curve, 1),
    power: clamp01(source.power, 1),
    loft: clamp01(source.loft, 1),
    dip: clamp01(source.dip, 0),
    height: clamp01(source.height, 1),
    wobble: clamp01(source.wobble, 0),
  };
}

/** Struck plainly: what a shot with no style at all does. */
export const PLAIN: ShotStyle = {
  id: 'plain',
  label: 'Plain',
  hint: '',
  curve: 1,
  power: 1,
  loft: 1,
  dip: 0,
  height: 1,
  wobble: 0,
};

/**
 * The style you actually got, given how well it was struck.
 *
 * **You only get the shot you chose if you hit it properly.** Every multiplier
 * slides back toward `PLAIN` as the contact worsens, so a mistimed finesse is
 * not a worse finesse, it is an ordinary strike - and the timing bar stops
 * being a tax on pace and starts being the thing that decides whether the
 * choice in the bottom-left meant anything.
 *
 * Measured before it existed: perfect and badly mistimed finesse free kicks
 * scored 82% and 80%. The bar was almost decorative.
 *
 * `mistimed` is 0 for a clean strike and 1 for the worst possible.
 */
export function asStruck(style: ShotStyle, mistimed: number): ShotStyle {
  const sharp = 1 - Math.max(0, Math.min(1, mistimed));
  // A clean strike is the style itself, not a rounding of it. Interpolating at
  // full weight turns 1.7 into 1.7000000000000002, which changes nothing you
  // could see and everything about whether this is testable.
  if (sharp >= 1) return style;
  const toward = (v: number): number => 1 + (v - 1) * sharp;
  return {
    ...style,
    curve: toward(style.curve),
    power: toward(style.power),
    /*
      Loft scales *down*, and does not slide toward `PLAIN` like the rest.

      `PLAIN.loft` is 1, meaning "spend all of this player's dip going up",
      which is the maximum rather than a neutral. Sliding toward it rewarded a
      scuff: the first version of this made a mistimed finesse free kick score
      71% against a well-struck one's 46%, because the bad contact ballooned it
      over the wall. Measured, not spotted by reading.

      Scaling toward zero is both fairer and more like football. You get under
      a dead ball by hitting it properly; miss the middle of the green and it
      stays low, which against a wall is its own punishment.
    */
    loft: style.loft * sharp,
    height: toward(style.height),
    // These two are departures from zero rather than from one, so they scale
    // straight down: a scuffed knuckleball does not knuckle.
    dip: style.dip * sharp,
    wobble: style.wobble * sharp,
  };
}

/** Every style there is, in the order they were written. */
export const STYLES: ShotStyle[] = (Array.isArray(SHOT_STYLES) ? SHOT_STYLES : [])
  .map(cleanStyle)
  .filter((s): s is ShotStyle => s !== null);

/**
 * The named style, or a plain strike.
 *
 * **Absent means plain, not the default selection.** Every style is a
 * departure from something, and if "no style given" quietly meant finesse then
 * a shot nobody had styled would arrive with 1.7x the bend on it - which is
 * exactly what happened, and three keeper tests said so within a minute.
 *
 * The *game* opens on `DEFAULT_STYLE_ID`, which is a choice the player is
 * making. A `ShotInput` with no style on it has not made one.
 *
 * Never undefined either way: a shot has to be struck somehow, and an id that
 * no longer exists - an older build, a hand-edited store - must not stop the
 * game.
 */
export const styleFor = (id: ShotStyleId | undefined): ShotStyle =>
  id === undefined ? PLAIN : (STYLES.find((s) => s.id === id) ?? PLAIN);

/** The one to start on. */
export const defaultStyleId = (): ShotStyleId =>
  STYLES.find((s) => s.id === DEFAULT_STYLE_ID)?.id ?? STYLES[0]?.id ?? PLAIN.id;

/** The next one round, for a button that cycles rather than three buttons. */
export function nextStyle(id: ShotStyleId | undefined): ShotStyleId {
  if (STYLES.length === 0) return PLAIN.id;
  const at = STYLES.findIndex((s) => s.id === styleFor(id).id);
  return (STYLES[(at + 1) % STYLES.length] as ShotStyle).id;
}
