/**
 * What the two sides wear.
 *
 * There are exactly two teams in a shootout and the picture only works if you
 * can tell them apart at a glance - the taker, the keeper facing them, the ten
 * on the halfway line, and the computer when it is taking its turn. One colour
 * means *them*, everywhere it appears.
 *
 * Four strips now rather than two: an outfield strip and a keeper strip each.
 * All four are settable and all four have a default, and a setting is an
 * override rather than a replacement - absent means "work it out", and a blank
 * never wins.
 *
 * Presentation, not game state. Nothing here can change an outcome, and the
 * simulation has never known what anybody is wearing.
 */

import { cleanColour } from '../../core/squad.ts';
import type { FrameState, KitOverrides } from '../../core/types.ts';

/**
 * The away side's colour. Named for the keeper, which it no longer only means.
 *
 * This used to be the whole argument: keepers deliberately did *not* get a
 * strip of their own, because the convention exists so a referee can pick the
 * keeper out of a crowded box, there is no crowded box in a shootout, and what
 * the game needed instead was for a child to know instantly which of the two
 * figures on screen was on their side.
 *
 * **That is reversed, on the repo owner's instruction.** The reasoning above
 * was sound while the only two figures on the pitch were a taker and a keeper.
 * The halfway line changed the frame: it put a keeper and their own ten
 * outfield players on screen together for the first time, all in one colour,
 * and a keeper who is indistinguishable from the line behind them is not a
 * keeper, it is an eleventh outfield player standing in the goal. So each side
 * now has a keeper strip as well - see `OWN_KEEPER_KIT` and
 * `OTHER_KEEPER_KIT`.
 *
 * What survives the reversal is the readability rule that motivated it: one
 * colour still means *them*. This yellow is the away side's outfield strip -
 * the far half of the halfway line, and the figure on the spot when it is
 * their turn - rather than the keeper's, and the export keeps its old name
 * because that is what it has always been called.
 */
export const KEEPER_KIT = '#ffd23f';

/**
 * The two keeper strips.
 *
 * Green and magenta because those are the two that clear every other shirt on
 * the pitch by a distance, checked in RGB rather than by eye: violet was the
 * obvious pick for the away keeper and sits about 80 from the default blue,
 * which is inside `TOO_CLOSE` and would have been nudged off it on every
 * single frame. Magenta is about 200 from the blue, the yellow and the green.
 */
export const OWN_KEEPER_KIT = '#2f9e44';
export const OTHER_KEEPER_KIT = '#d6336c';

export interface TeamKit {
  kit: string;
  trim: string;
}

export interface TeamKits {
  /** The taker's team. Whatever they picked. */
  own: TeamKit;
  /** Whoever they are playing: the far line, the computer on its turn. */
  other: TeamKit;
  /** Your keeper. In goal on their turn, beside the goal on yours. */
  ownKeeper: TeamKit;
  /** Theirs. In goal on your turn, beside the goal on theirs. */
  otherKeeper: TeamKit;
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
 * Where to try next when a strip is too close to one already on the pitch.
 *
 * The opposite hue first, because that is the biggest move there is and it is
 * the one this file has always made. Then out from there in twelfths,
 * alternating sides, so the answer stays near the colour somebody asked for
 * when a smaller turn is enough.
 */
const TURNS = [6, 5, 7, 4, 8, 3, 9, 2, 10, 1, 11].map((twelfth) => twelfth / 12);

/**
 * Where to go when there is no hue to turn.
 *
 * White, black and grey all sit on the axis where rotating the hue does
 * nothing at all, and a keeper in white is a kit somebody will pick. Ordered,
 * so the answer is the same every time rather than the first one that happens
 * to fit.
 */
const FALLBACK_KITS = ['#b4322e', '#2f6fd0', '#f5c400', '#2f9e44', '#8338ec', '#f2f4f5', '#141418'];

/**
 * Everybody's colours, from the one the player chose and anything overridden.
 *
 * Four strips, and **all six pairs of them can share a screen.** Five always
 * could; the sixth - one keeper against the other - arrived with the resting
 * keeper standing beside the goal, and it is the reason all four have to be
 * mutually distinct rather than only the pairs that obviously meet.
 *
 * They are settled in priority order, each one moved clear of everything
 * already settled: your outfield first and never moved, because it is the
 * squad player's own kit and the one thing on the pitch nobody should have
 * taken off them; then theirs, then your keeper, then theirs. A fixed second
 * colour on its own would eventually be somebody's invented kit, and two teams
 * in one strip is the one thing a football picture must never be.
 */
export function teamKits(kit: string, trim: string, chosen: KitOverrides = {}): TeamKits {
  // The player's own kit is the fallback rather than a constant, so choosing a
  // different footballer still changes what your side wears. The fallback is
  // passed through exactly as written, short hex and all.
  const own = cleanColour(chosen.own, kit);
  const ownTrim = cleanColour(chosen.ownTrim, trim);

  const other = separate(cleanColour(chosen.other, KEEPER_KIT), [own]);
  // The opposition's shorts are set against the *other side's shorts*, not
  // against their own shirt. Keyed off the shirt, a blue kit with white shorts
  // put both teams in white and the two lines only differed above the waist.
  const otherTrim = cleanColour(chosen.otherTrim, contrasting(ownTrim));

  const ownKeeper = separate(cleanColour(chosen.ownKeeper, OWN_KEEPER_KIT), [own, other]);
  const otherKeeper = separate(cleanColour(chosen.otherKeeper, OTHER_KEEPER_KIT), [
    own,
    other,
    ownKeeper,
  ]);

  return {
    own: { kit: own, trim: ownTrim },
    other: { kit: other, trim: otherTrim },
    // A keeper's shorts come off the lightness of their own shirt rather than
    // being asked for. Nobody is standing next to them in the other keeper
    // strip, so the argument that put the outfield shorts against the *other*
    // team's does not apply, and it is two fewer colour pickers in a dialog
    // that already has six.
    ownKeeper: { kit: ownKeeper, trim: contrasting(ownKeeper) },
    otherKeeper: { kit: otherKeeper, trim: contrasting(otherKeeper) },
  };
}

/** Dark shorts under a light shirt and light under a dark one. */
function contrasting(colour: string): string {
  const hsl = toHsl(colour);
  return hsl && hsl.l > 0.5 ? '#1d1d20' : '#eef2f6';
}

/**
 * The colour asked for, or the nearest turn of the hue that clears the rest.
 *
 * `clearOf` is everything already on the pitch. An unparseable colour measures
 * as infinitely far away, which is deliberate: it is somebody else's problem
 * to fall back, and a junk value should not drag a good one off its hue.
 *
 * If nothing clears the threshold - which needs a deliberately cornered
 * palette - the furthest candidate wins rather than the request, because a
 * shirt that is merely close is better than two teams in the same one.
 */
function separate(wanted: string, clearOf: readonly string[]): string {
  let best = wanted;
  let bestGap = -1;

  for (const candidate of [wanted, ...rotations(wanted), ...FALLBACK_KITS]) {
    const gap = clearOf.reduce(
      (closest, other) => Math.min(closest, apart(candidate, other)),
      Number.POSITIVE_INFINITY
    );
    if (gap >= TOO_CLOSE) return candidate;
    if (gap > bestGap) {
      best = candidate;
      bestGap = gap;
    }
  }

  return best;
}

/** The same colour turned round the wheel. Empty for anything without a hue. */
function rotations(colour: string): string[] {
  const hsl = toHsl(colour);
  if (!hsl || hsl.s <= 0.18) return [];
  // Saturation floored and lightness pulled toward the middle, or turning the
  // hue of a pale wash produces another pale wash and moves nothing visible.
  const s = Math.max(0.5, hsl.s);
  const l = clamp(hsl.l, 0.34, 0.6);
  return TURNS.map((turn) => fromHsl((hsl.h + turn) % 1, s, l));
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

/**
 * The four strips this frame, settings and all.
 *
 * One call site for the derivation, so the taker, the two keepers and the
 * halfway line cannot disagree about who is wearing what.
 */
export const kitsFor = (frame: FrameState): TeamKits =>
  teamKits(frame.player.colors.kit, frame.player.colors.trim, frame.kits);

/**
 * What the figure on the spot is wearing.
 *
 * The away side is side 1, so on their turn the taker wears the shirt the far
 * half of the halfway line is already wearing. One colour means *them*,
 * wherever they happen to be standing.
 */
export function takerColours(frame: FrameState): { kit: string; trim: string } {
  const kits = kitsFor(frame);
  return awayTaking(frame) ? kits.other : kits.own;
}

/**
 * What the figure in the goal is wearing.
 *
 * The keeper is on whichever side is not taking, so the strips swap over when
 * the away side's turn comes round: you go in goal, and you go in goal in your
 * own side's keeper strip. Without the swap the keeper stayed yellow while the
 * computer ran up in yellow too, and both figures on the screen were the
 * opposition.
 *
 * A keeper strip rather than the side's outfield one, since the halfway line
 * started putting a keeper and their own ten in the same frame. See
 * `KEEPER_KIT`.
 */
export function keeperColours(frame: FrameState): { kit: string; trim: string } {
  const kits = kitsFor(frame);
  return awayTaking(frame) ? kits.ownKeeper : kits.otherKeeper;
}

/**
 * What the keeper who is *not* working is wearing.
 *
 * The other one: whoever is taking this penalty has a keeper with nothing to
 * do, and they are the figure standing beside the goal. So on your turn it is
 * yours waiting and theirs in goal, and on theirs it is the other way round.
 */
export function restingKeeperColours(frame: FrameState): { kit: string; trim: string } {
  const kits = kitsFor(frame);
  return awayTaking(frame) ? kits.otherKeeper : kits.ownKeeper;
}

/**
 * Whether the away side is the one taking this penalty.
 *
 * Side 1 is the away team in both two-sided modes: the computer in `versus`,
 * and the second person in a duel. Solo has no side 1. Keeping it one rule
 * rather than a `versus` special case means the shirt somebody is wearing and
 * the end that rises for them cannot disagree.
 */
export const awayTaking = (frame: Pick<FrameState, 'mode' | 'taker'>): boolean =>
  frame.mode !== 'solo' && frame.taker === 1;

/**
 * What the wall is wearing: the side that is not taking it.
 *
 * The same strip as the keeper's outfield team, because that is who they are.
 */
export function wallColours(frame: FrameState): { kit: string; trim: string } {
  const kits = kitsFor(frame);
  return awayTaking(frame) ? kits.own : kits.other;
}
