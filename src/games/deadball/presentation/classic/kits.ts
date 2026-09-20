/**
 * What the two sides wear.
 *
 * There are exactly two teams in a shootout and the picture only works if you
 * can tell them apart at a glance - the taker, the keeper facing them, the ten
 * on the halfway line, and the computer when it is taking its turn. One colour
 * means *them*, everywhere it appears.
 *
 * Presentation, not game state. Nothing here can change an outcome, and the
 * simulation has never known what anybody is wearing.
 */

/**
 * The opposition's colour, and the keeper's.
 *
 * Real keepers wear a different strip from their own outfield players, and
 * this deliberately does not. The convention exists so a referee can pick the
 * keeper out of a crowded box; there is no crowded box in a penalty shootout,
 * and what this game needs instead is for a child to know instantly which of
 * the two figures on screen is on their side. Readability wins.
 */
export const KEEPER_KIT = '#ffd23f';

export interface TeamKit {
  kit: string;
  trim: string;
}

export interface TeamKits {
  /** The taker's team. Whatever they picked. */
  own: TeamKit;
  /** Whoever they are playing: the keeper, the far line, the computer. */
  other: TeamKit;
}

/** How far apart two colours are in RGB. Crude, and enough to catch a clash. */
function apart(a: string, b: string): number {
  const at = channels(a);
  const bt = channels(b);
  if (!at || !bt) return Number.POSITIVE_INFINITY;
  return Math.hypot(at[0] - bt[0], at[1] - bt[1], at[2] - bt[2]);
}

/** Below this, two shirts read as one team in the same strip. */
const TOO_CLOSE = 110;

/**
 * Both teams' colours, from the one the player chose.
 *
 * The opposition wear the keeper's yellow, because the keeper *is* the
 * opposition - unless the player has picked something close to that yellow
 * themselves, in which case the hue is rotated instead. A fixed second colour
 * on its own would eventually be somebody's invented kit, and two teams in one
 * strip is the one thing a football picture must never be.
 */
export function teamKits(kit: string, trim: string): TeamKits {
  const hsl = toHsl(kit);
  const clash = apart(kit, KEEPER_KIT) < TOO_CLOSE;

  const shirt = !clash
    ? KEEPER_KIT
    : hsl && hsl.s > 0.18
      ? fromHsl((hsl.h + 0.5) % 1, Math.max(0.5, hsl.s), clamp(hsl.l, 0.34, 0.6))
      : '#b4322e';

  // The opposition's shorts are set against the *other side's shorts*, not
  // against their own shirt. Keyed off the shirt, a blue kit with white shorts
  // put both teams in white and the two lines only differed above the waist.
  const ownTrim = toHsl(trim);

  return {
    own: { kit, trim },
    other: { kit: shirt, trim: ownTrim && ownTrim.l > 0.5 ? '#1d1d20' : '#eef2f6' },
  };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** 0..255 per channel, or null for anything a canvas could not parse either. */
function channels(colour: string): [number, number, number] | null {
  const hex = typeof colour === 'string' ? colour.trim() : '';
  const full = /^#[0-9a-f]{3}$/i.test(hex)
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : /^#[0-9a-f]{6}$/i.test(hex)
      ? hex
      : null;
  if (!full) return null;
  return [
    parseInt(full.slice(1, 3), 16),
    parseInt(full.slice(3, 5), 16),
    parseInt(full.slice(5, 7), 16),
  ];
}

export function toHsl(colour: string): { h: number; s: number; l: number } | null {
  const rgb = channels(colour);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255) as [number, number, number];

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 1 / 6
      ? [c, x, 0]
      : h < 2 / 6
        ? [x, c, 0]
        : h < 3 / 6
          ? [0, c, x]
          : h < 4 / 6
            ? [0, x, c]
            : h < 5 / 6
              ? [x, 0, c]
              : [c, 0, x];
  const byte = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}
