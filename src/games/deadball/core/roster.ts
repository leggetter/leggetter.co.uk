/**
 * Who is taking the penalty, and inventing somebody new to take it.
 *
 * The roster shipped in `content/players.js` is the low-barrier contribution
 * surface this project keeps talking about: copy a block, change the numbers,
 * refresh. Until now that was only half true, because seeing your footballer
 * meant editing `DEFAULT_PLAYER_ID` at the bottom of the same file - a code
 * change standing between somebody's first contribution and looking at it.
 *
 * This is the other half: pick one, or make one up, from the game.
 *
 * Pure, like everything else here - a custom player is data, and data that
 * came from a text box and was kept on a disk between visits, which is the
 * definition of something that has to be checked before it is believed.
 */

import type { Player } from './types.ts';

/** Every skill runs 0 to 100, the convention anyone who has played a football
 *  game already knows. */
export const MIN_SKILL = 0;
export const MAX_SKILL = 100;

/** Long enough for a name, short enough for the HUD. */
export const MAX_PLAYER_NAME = 18;

/** How many somebody may invent. High enough never to be met by accident. */
export const MAX_CUSTOM = 12;

export interface RosterEntry extends Player {
  /** True for anybody invented here, which is the only sort that can be
   *  deleted. The shipped roster is not editable from the game. */
  custom: boolean;
}

const clampSkill = (value: unknown): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 50;
  return Math.min(MAX_SKILL, Math.max(MIN_SKILL, n));
};

/**
 * A colour, or a fallback.
 *
 * Only the two shapes a colour input produces, because this string goes
 * straight into `ctx.fillStyle`, and a canvas silently ignores a value it
 * cannot parse - so a bad colour would not throw, it would leave the figure
 * drawn in whatever colour happened to be set last.
 */
function cleanColour(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

/**
 * Trim, cap, and strip anything that would move text that is not its own.
 *
 * Same rules as a duel name - see `names.ts` - because it is drawn onto the
 * same canvas and a stray right-to-left override does the same damage.
 */
export function cleanPlayerName(raw: unknown): string {
  const text = typeof raw === 'string' ? raw : '';
  const stripped = text
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '')
    .trim()
    .slice(0, MAX_PLAYER_NAME)
    .trim();
  return stripped.length > 0 ? stripped : 'New Player';
}

/**
 * An id nothing else is using.
 *
 * Derived from the name so it reads in a URL or a log, and suffixed if it
 * collides - which it will, because two people inventing a striker both call
 * it something obvious.
 */
export function makeId(name: string, taken: readonly string[]): string {
  const base =
    cleanPlayerName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'player';

  if (!taken.includes(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${base}-${taken.length}`;
}

/**
 * Whatever came out of the form or off the disk, as a player.
 *
 * Never throws and never returns a half-built one. Storage is a text file a
 * browser console can write to, and a shipped roster is a file somebody is
 * invited to edit by hand, so both are inputs rather than promises.
 */
export function cleanPlayer(raw: unknown, id: string, custom: boolean): RosterEntry {
  const source = (raw ?? {}) as Record<string, unknown>;
  const colours = (source.colors ?? {}) as Record<string, unknown>;
  return {
    id,
    name: cleanPlayerName(source.name),
    power: clampSkill(source.power),
    accuracy: clampSkill(source.accuracy),
    curve: clampSkill(source.curve),
    composure: clampSkill(source.composure),
    foot: source.foot === 'left' ? 'left' : 'right',
    colors: {
      kit: cleanColour(colours.kit, '#2f6fd0'),
      trim: cleanColour(colours.trim, '#f4f6f8'),
    },
    custom,
  };
}

/**
 * The shipped roster and anybody invented, in one list.
 *
 * Shipped first, so the order does not shuffle when somebody adds one, and a
 * custom player can never take a shipped player's id - the shipped ones are
 * claimed before the custom ones are read.
 */
export function buildRoster(shipped: unknown, stored: unknown): RosterEntry[] {
  const roster: RosterEntry[] = [];
  const taken: string[] = [];

  for (const entry of Array.isArray(shipped) ? shipped : []) {
    const source = (entry ?? {}) as Record<string, unknown>;
    const id = typeof source.id === 'string' && source.id.length > 0 ? source.id : makeId('', taken);
    if (taken.includes(id)) continue;
    taken.push(id);
    roster.push(cleanPlayer(source, id, false));
  }

  for (const entry of Array.isArray(stored) ? stored : []) {
    if (roster.filter((p) => p.custom).length >= MAX_CUSTOM) break;
    const source = (entry ?? {}) as Record<string, unknown>;
    const wanted = typeof source.id === 'string' ? source.id : '';
    const id = wanted && !taken.includes(wanted) ? wanted : makeId(String(source.name ?? ''), taken);
    taken.push(id);
    roster.push(cleanPlayer(source, id, true));
  }

  return roster;
}

/** The named player, or the first one. Never undefined, because the caller
 *  has a shot to resolve either way. */
export function playerFor(roster: readonly RosterEntry[], id: string | undefined): RosterEntry {
  return roster.find((p) => p.id === id) ?? (roster[0] as RosterEntry);
}

/** Just the invented ones, in the shape that goes to storage. */
export const customOf = (roster: readonly RosterEntry[]): RosterEntry[] =>
  roster.filter((p) => p.custom);
