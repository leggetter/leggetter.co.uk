/**
 * How you are striking it.
 *
 * The same drag, struck three ways. This file is meant to be edited: change a
 * number, refresh, take five and see whether it feels better. Nothing here can
 * break the game and nothing else needs to change with it.
 *
 * Every field is a multiplier on what the gesture already said, so 1 means
 * "leave it alone". They are deliberately not attributes: a player's `curve`
 * is how well *they* bend a ball, and this is which ball they chose to hit.
 *
 *   curve      how much of your hook actually goes on the ball
 *   power      how hard it leaves the boot
 *   loft       how much of the player's `dip` is used, so how high it arcs
 *   dip        topspin the style adds, so how hard it comes back down.
 *              `loft` and `dip` together are a shape rather than a height:
 *              loft with no dip is a balloon, dip with no loft is flat and
 *              falling, and the two in balance is a ball that goes up over
 *              something and drops behind it
 *   height     scales where in the goal the aim lands, so a driven shot stays
 *              low no matter how far up you drag
 *   wobble     unpredictable spin, the same each flight but different every
 *              shot. This is the knuckleball: nobody knows where it is going,
 *              including the person who hit it and the keeper reading it.
 *
 * **None of it is free.** Every number here slides back toward 1 as the strike
 * is mistimed - see `asStruck` in core/styles.ts - so a scuffed finesse is not
 * a worse finesse, it is an ordinary shot. Get the marker in the middle of the
 * green and you get the style you picked; miss it and you get whatever your
 * boot did.
 */

/** @typedef {import('../core/styles.ts').ShotStyle} ShotStyle */

/** @type {ShotStyle[]} */
export const SHOT_STYLES = [
  {
    id: 'finesse',
    label: 'Finesse',
    hint: 'placed and bent, with the pace taken off',
    curve: 1.7,
    power: 0.88,
    /*
      Was 1 with no dip, which apexed at 4.84 m over a 2.44 m crossbar and hung
      in the air for 1.76 seconds. Not a placed shot - a clearance. It scored
      82% against driven's 46%, so the balloon was also the correct answer,
      which is the worse half of the problem.

      Swept against a curled free kick from all three spots, both directions,
      500 each. `apex` and `goal%` are for a clean strike; the last column is
      the same shot mistimed by 0.5:

        loft   apex   goal%   mistimed
        0.44   1.98      43         40
        0.70   2.53      60         40
        0.85   3.03      81          0 blocked - the exploit is back
        1.00   3.77      81          0 blocked

      0.70 clears a 2.15 m wall, drops under the bar, and leaves the timing bar
      worth twenty points. Below it the style is barely better than a scuff;
      above it the wall stops mattering at all.
    */
    loft: 0.7,
    dip: 0.34,
    height: 1,
    wobble: 0,
  },
  {
    id: 'driven',
    label: 'Driven',
    hint: 'low and hard, under the wall rather than over it',
    curve: 0.35,
    power: 1.12,
    loft: 0.1,
    // A little, so it still falls under the bar at the end of a long one.
    dip: 0.14,
    height: 0.72,
    wobble: 0,
  },
  {
    id: 'knuckle',
    label: 'Knuckle',
    hint: 'struck flat, and it drops out of the sky at the end',
    curve: 0.15,
    power: 1.06,
    // Flat, and then it falls off a cliff. Where finesse goes up and comes
    // down, this one barely rises and drops late - which is the shot, and is
    // why its loft came down and its dip went well past everything else.
    loft: 0.16,
    dip: 0.52,
    height: 1,
    wobble: 0.38,
  },
];

/** What you are striking it with until you say otherwise. */
export const DEFAULT_STYLE_ID = 'finesse';
