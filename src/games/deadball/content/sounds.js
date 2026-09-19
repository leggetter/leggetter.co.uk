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
 * The bed is filtered noise: a murmur is that filter mostly closed and the
 * gain low. Reactions are more than that, and the first attempt got it wrong -
 * opening the same filter gave a whoosh, not a cheer.
 *
 * What tells a cheer from a groan is the **vowel**. A crowd is a few thousand
 * voices, which is noise, and a vowel is noise shaped by two or three
 * resonances at particular frequencies. A cheer is bright and open, roughly
 * "aaah", and it slides up. A save is dark and round, an "ooooh", and it
 * slides down - which is the sound of a thing not happening.
 *
 * Per reaction:
 *
 * - `formants` - `[hz, q]` pairs, the resonances that make the vowel. Two is
 *   enough to be recognisable, three is better. Moving the first one up and
 *   down is the fastest way to hear this working.
 * - `glide` - what the formants multiply by across the sound. Above 1 rises,
 *   below 1 falls.
 * - `flutter` - a wobble on the volume. Thousands of people are never quite
 *   together, and without this it sounds like one enormous person.
 * - `air` - how much unshaped bright noise sits on top. This is the applause
 *   and the whistling; a groan has almost none.
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

  /**
   * The intake at the strike. Still a filter swell on the bed rather than a
   * vowel, because it is a sharp breath in and not a word.
   */
  rise: { cutoff: 1500, gain: 0.16, attack: 0.08, hold: 0.1, fall: 0.5 },

  /**
   * A goal. Open, bright, and rising - "aaaay". The one that is allowed to be
   * loud, and the only one with much air on it.
   */
  goal: {
    formants: [
      [760, 5],
      [1320, 4.5],
      [2700, 3],
    ],
    glide: 1.22,
    attack: 0.06,
    hold: 1.05,
    release: 2.3,
    gain: 0.5,
    flutter: { rate: 7.5, depth: 0.28 },
    air: 0.2,
  },

  /**
   * A save. Not a quieter cheer - a different sound. Round, dark and falling:
   * "ooooh". Slower to arrive, because a crowd takes a moment to realise.
   */
  save: {
    formants: [
      [330, 9],
      [790, 7],
    ],
    glide: 0.74,
    attack: 0.2,
    hold: 0.75,
    release: 2.0,
    // Far higher than the goal's, and it comes out quieter. A narrow
    // resonance low down passes a fraction of what a wide bright one does, so
    // matching these by eye in the source gets you an inaudible groan. Tuned
    // against a rendered peak instead: a cheer is meant to be the loudest
    // thing in the game, but only by about half again.
    gain: 1.15,
    flutter: { rate: 5.5, depth: 0.32 },
    air: 0.05,
  },

  /**
   * Off target. The same vowel as a save but lower, slower and flatter -
   * disappointment rather than surprise.
   */
  groan: {
    formants: [
      [250, 10],
      [640, 8],
    ],
    glide: 0.78,
    attack: 0.26,
    hold: 0.6,
    release: 2.1,
    gain: 1.05,
    flutter: { rate: 4.2, depth: 0.22 },
    air: 0.02,
  },
};
