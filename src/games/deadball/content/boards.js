/**
 * What the advertising hoardings say.
 *
 * A Tier 1 file: a list of short strings, edit and refresh. Nothing here can
 * break the game.
 *
 * Two things worth knowing before you change it:
 *
 * - **No real people's names.** This repo is public and a board is a short
 *   string that renders straight onto the pitch, which makes it the easiest
 *   place in the whole project to put a real name on the internet without
 *   meaning to.
 * - **Short.** A board is a wide, shallow rectangle seen from a long way off.
 *   Ten or twelve characters read; twenty do not.
 *
 * Brands are a separate question and an allowed one. Whether a real one goes
 * in is the repo owner's call - somebody else's mark is theirs to license, so
 * it is a permission question rather than a technical one, and nothing here
 * depends on the answer.
 */

/**
 * Drawn left to right, repeating if the run is wider than the list. Keep it a
 * number that does not divide neatly into the run, or the same board lands in
 * the same place behind each post and the repeat becomes obvious.
 */
export const BOARDS = [
  { text: 'DEAD BALL', ink: '#f8fafc', panel: '#1d4ed8' },
  { text: 'THE SWEEP', ink: '#0f172a', panel: '#fbbf24' },
  { text: 'OFF THE BAR', ink: '#f8fafc', panel: '#b91c1c' },
  { text: 'TOP BINS', ink: '#0f172a', panel: '#34d399' },
  { text: 'SIX YARDS', ink: '#f8fafc', panel: '#7c3aed' },
  { text: 'GOOD CONTACT', ink: '#0f172a', panel: '#e2e8f0' },
  { text: 'INTO THE NET', ink: '#f8fafc', panel: '#0f766e' },
];
