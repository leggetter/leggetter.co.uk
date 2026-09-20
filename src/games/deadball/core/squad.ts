/**
 * Who is taking the penalty, and inventing somebody new to take it.
 *
 * The squad shipped in `content/players.js` is the low-barrier contribution
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

/**
 * Points to spend across the four skills. Everybody gets the same.
 *
 * Without this, the best player is whoever had the highest numbers typed in,
 * and inventing one means inventing a better one than anybody shipped - which
 * makes the picker a formality rather than a choice.
 *
 * 375 of a possible 500, so the average player is 75 in everything and any
 * strength has to be paid for out of something else. The shipped squad was
 * rebalanced onto it; a test holds them there.
 *
 * It was 300 of 400 until `dip` arrived with free kicks. A fifth skill on the
 * old budget would have quietly made everybody worse at the four they already
 * had, so the budget moved with it - same average, same share of the maximum,
 * and the same feeling of having to give something up.
 */
export const SKILL_BUDGET = 375;

/** What a player has spent. */
export const spentOn = (player: {
  power: number;
  accuracy: number;
  curve: number;
  composure: number;
  dip: number;
}): number =>
  player.power + player.accuracy + player.curve + player.composure + player.dip;

/**
 * Four skills, scaled down together until they fit the budget.
 *
 * Only over-budget input gets here, and only from a disk - the form cannot go
 * over, and the shipped squad is checked by a test instead of being quietly
 * rewritten, because a file somebody hand-edited should tell them it is wrong
 * rather than silently show them numbers they did not type.
 *
 * Scaled rather than truncated so a hand-edited store loses a player's shape
 * last: a power merchant stays a power merchant, just a legal one.
 */
function fitBudget(skills: number[]): number[] {
  const total = skills.reduce((sum, n) => sum + n, 0);
  if (total <= SKILL_BUDGET) return skills;

  const exact = skills.map((n) => (n * SKILL_BUDGET) / total);
  const fitted = exact.map((n) => Math.floor(n));
  // Hand the rounding remainder back, largest fraction first, so the result
  // sums to the budget exactly rather than a point or three under it.
  let left = SKILL_BUDGET - fitted.reduce((sum, n) => sum + n, 0);
  const order = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    fitted[i] = (fitted[i] as number) + 1;
    left--;
  }
  return fitted;
}

export interface SquadMember extends Player {
  /** True for anybody invented here, which is the only sort that can be
   *  deleted. The shipped squad is not editable from the game. */
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
 *
 * Exported because the kits have the same problem and there should be one
 * answer to it. A stored kit is the same sort of input a stored player is:
 * older than a typed one, not more trustworthy, and a browser console away
 * from holding anything at all. Reused rather than reimplemented in the
 * presentation, which is where it would have drifted.
 */
export function cleanColour(value: unknown, fallback: string): string {
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
 * browser console can write to, and a shipped squad is a file somebody is
 * invited to edit by hand, so both are inputs rather than promises.
 */
export function cleanPlayer(raw: unknown, id: string, custom: boolean): SquadMember {
  const source = (raw ?? {}) as Record<string, unknown>;
  const colours = (source.colors ?? {}) as Record<string, unknown>;
  const skills = [source.power, source.accuracy, source.curve, source.composure, source.dip].map(
    clampSkill
  );
  // The budget is enforced here only for invented players, whose numbers come
  // off a disk that a browser console can write to. A shipped player over the
  // budget is a mistake in a file somebody is editing on purpose, and gets a
  // failing test rather than a silent nerf.
  const [power, accuracy, curve, composure, dip] = custom ? fitBudget(skills) : skills;
  return {
    id,
    name: cleanPlayerName(source.name),
    power: power as number,
    accuracy: accuracy as number,
    curve: curve as number,
    composure: composure as number,
    dip: dip as number,
    foot: source.foot === 'left' ? 'left' : 'right',
    colors: {
      kit: cleanColour(colours.kit, '#2f6fd0'),
      trim: cleanColour(colours.trim, '#f4f6f8'),
    },
    custom,
  };
}

/**
 * The shipped squad and anybody invented, in one list.
 *
 * Shipped first, so the order does not shuffle when somebody adds one, and a
 * custom player can never take a shipped player's id - the shipped ones are
 * claimed before the custom ones are read.
 */
export function buildSquad(shipped: unknown, stored: unknown): SquadMember[] {
  const squad: SquadMember[] = [];
  const taken: string[] = [];

  for (const entry of Array.isArray(shipped) ? shipped : []) {
    const source = (entry ?? {}) as Record<string, unknown>;
    const id = typeof source.id === 'string' && source.id.length > 0 ? source.id : makeId('', taken);
    if (taken.includes(id)) continue;
    taken.push(id);
    squad.push(cleanPlayer(source, id, false));
  }

  for (const entry of Array.isArray(stored) ? stored : []) {
    if (squad.filter((p) => p.custom).length >= MAX_CUSTOM) break;
    const source = (entry ?? {}) as Record<string, unknown>;
    const wanted = typeof source.id === 'string' ? source.id : '';
    const id = wanted && !taken.includes(wanted) ? wanted : makeId(String(source.name ?? ''), taken);
    taken.push(id);
    squad.push(cleanPlayer(source, id, true));
  }

  return squad;
}

/** The named player, or the first one. Never undefined, because the caller
 *  has a shot to resolve either way. */
export function playerFor(squad: readonly SquadMember[], id: string | undefined): SquadMember {
  return squad.find((p) => p.id === id) ?? (squad[0] as SquadMember);
}

/** Just the invented ones, in the shape that goes to storage. */
export const customOf = (squad: readonly SquadMember[]): SquadMember[] =>
  squad.filter((p) => p.custom);
