/**
 * What the two people in a duel are called.
 *
 * Presentation only. Nothing in the simulation reads a name, and nothing
 * writes one to the shot log - see the note on `DuelNames` below, which is the
 * important half of this file.
 */

/**
 * A name each, in side order: index 0 takes the first shot.
 *
 * Deliberately absent from `ShotRecord`. The log is exported by keypress and
 * handed to somebody else to read, which makes it the one place in this game
 * where a name would leave the device it was typed on. `takerSide` already
 * says who did what, and a side is meaningless to anyone without the export in
 * front of them, so the log stays anonymous and loses nothing.
 */
export type DuelNames = [string, string];

/** Longer than this and the score line stops fitting on a phone. */
export const MAX_NAME = 12;

export const DEFAULT_NAMES: DuelNames = ['Player 1', 'Player 2'];

/**
 * What your side is called against the computer, when you have not said.
 *
 * Separate from the duel defaults because it is a different question. A duel
 * asks who is in the room; the computer is a side rather than a person, so the
 * thing facing it is a team.
 */
export const DEFAULT_TEAM = 'Your Team';

/**
 * Trim, cap, and fall back.
 *
 * Whitespace-only counts as not answering, because a blank name would render
 * as an empty score line rather than as a choice. Control characters go
 * because a name is drawn straight onto a canvas and a stray newline or
 * direction override would move text that is not its own.
 */
export function cleanName(raw: string, side: 0 | 1): string {
  const stripped = raw
    // Control characters, zero-width joiners and the bidi overrides. A name is
    // drawn straight onto a canvas, where a stray newline or a right-to-left
    // override moves text that is not its own.
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '')
    .trim()
    .slice(0, MAX_NAME)
    .trim();
  return stripped.length > 0 ? stripped : DEFAULT_NAMES[side];
}

/**
 * A team name, through the same cleaning as a person's.
 *
 * Same length cap and the same stripping - a team name is drawn onto the same
 * canvas and a stray right-to-left override moves the same text. Only the
 * fallback differs.
 */
export function cleanTeam(raw: unknown): string {
  const typed = typeof raw === 'string' ? cleanName(raw, 0) : DEFAULT_NAMES[0];
  return typed === DEFAULT_NAMES[0] ? DEFAULT_TEAM : typed;
}

/** Both at once, for whatever arrives from storage or from the form. */
export function cleanNames(raw: unknown): DuelNames {
  const pair = Array.isArray(raw) ? raw : [];
  return [
    cleanName(typeof pair[0] === 'string' ? pair[0] : '', 0),
    cleanName(typeof pair[1] === 'string' ? pair[1] : '', 1),
  ];
}

/**
 * True when both names are still the defaults, so callers can tell "nobody has
 * said" from "somebody typed Player 1".
 */
export function unnamed(names: DuelNames): boolean {
  return names[0] === DEFAULT_NAMES[0] && names[1] === DEFAULT_NAMES[1];
}
