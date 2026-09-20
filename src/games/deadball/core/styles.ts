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
  height: 1,
  wobble: 0,
};

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
