/**
 * What everything sounds like, as numbers.
 *
 * A Tier 1 file: change a number, refresh, hear the difference. No build step
 * and nothing here can break the game, because none of it reaches the
 * simulation - the worst a bad value can do is sound wrong.
 *
 * Frequencies are in hertz and times in seconds. `gain` is a linear multiplier
 * where 1 is as loud as the mixer goes, so most of these are small.
 *
 * Every impact is a burst of noise through a filter. What makes a boot sound
 * like a boot and a glove like a glove is almost entirely `cutoff` and
 * `decay`: low and short is a thump, higher and shorter is a slap, higher and
 * longer is a hiss.
 */

/** Boot on ball. Low, loud, and over almost before it started. */
export const BOOT = {
  cutoff: 260,
  q: 0.8,
  decay: 0.11,
  gain: 0.55,
};

/**
 * A hand on the ball. The same shape as the boot but duller and shorter,
 * because a glove absorbs where a boot strikes.
 */
export const GLOVE = {
  cutoff: 420,
  q: 0.9,
  decay: 0.07,
  gain: 0.32,
};

/**
 * The goal frame. The one impact here that is a pitch rather than a thump.
 *
 * Post and bar share this. It is the same aluminium either way, and anything
 * that wants to tell them apart can read the outcome instead.
 *
 * `partials` are the ringing frequencies, loudest first. Three is enough to
 * read as metal; more just muddies it.
 */
export const FRAME = {
  partials: [438, 1170, 2360],
  decay: 1.15,
  gain: 0.3,
};

/** The ball arriving in the netting. Brief, high, and soft. */
export const NET = {
  cutoff: 3400,
  q: 0.5,
  decay: 0.16,
  gain: 0.22,
  type: 'highpass',
};

/** Blown for anything that was neither a goal nor a save. */
export const WHISTLE = {
  cutoff: 2100,
  q: 14,
  decay: 0.3,
  gain: 0.12,
};

/**
 * The crowd.
 *
 * All of it is one signal path: noise through a lowpass filter. A murmur is
 * that filter mostly closed and the gain low; a cheer is the same noise with
 * the filter opened and the gain up. They are one sound at different settings
 * rather than two sounds, which is why a reaction can swell out of the bed
 * instead of being laid on top of it.
 */
export const CROWD = {
  /** Where it sits when nothing is happening. */
  bed: { cutoff: 520, gain: 0.05 },

  /** Where it goes, and how long it takes to get there. */
  moods: {
    idle: { cutoff: 520, gain: 0.05, seconds: 1.6 },
    /** Somebody is over the ball. The murmur tightens rather than quietens. */
    waiting: { cutoff: 700, gain: 0.08, seconds: 1.2 },
    /** In the air. Held breath: brighter, not louder. */
    flight: { cutoff: 900, gain: 0.07, seconds: 0.25 },
  },

  /** The intake at the strike. Short and sharp. */
  rise: { cutoff: 1500, gain: 0.16, attack: 0.08, hold: 0.1, fall: 0.5 },

  /** A goal. The one that is allowed to be loud. */
  goal: { cutoff: 3200, gain: 0.42, attack: 0.09, hold: 0.9, fall: 2.4 },

  /**
   * A save. Not a quieter cheer - a different one. Darker and shorter, because
   * half the ground is celebrating and the other half is not.
   */
  save: { cutoff: 1700, gain: 0.3, attack: 0.07, hold: 0.55, fall: 1.7 },

  /** Off target. A groan is dark, slow to arrive and slow to go. */
  groan: { cutoff: 700, gain: 0.2, attack: 0.22, hold: 0.45, fall: 1.9 },
};
