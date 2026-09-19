/**
 * Nothing, on purpose.
 *
 * Used by tests, which have no AudioContext, and as the honest answer before
 * the first gesture: browsers will not start audio until the user has
 * interacted, and a set of no-ops says that more clearly than a synth that is
 * running but inaudible.
 */

import type { SoundSet } from './Sounds.ts';

export const SILENT: SoundSet = {
  bed: () => {},
  play: () => {},
};
