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
 *   height     scales where in the goal the aim lands, so a driven shot stays
 *              low no matter how far up you drag
 *   wobble     unpredictable spin, the same each flight but different every
 *              shot. This is the knuckleball: nobody knows where it is going,
 *              including the person who hit it and the keeper reading it.
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
    loft: 1,
    height: 1,
    wobble: 0,
  },
  {
    id: 'driven',
    label: 'Driven',
    hint: 'low and hard, under the wall rather than over it',
    curve: 0.35,
    power: 1.12,
    loft: 0.12,
    height: 0.72,
    wobble: 0,
  },
  {
    id: 'knuckle',
    label: 'Knuckle',
    hint: 'struck flat with no spin on it, and nobody knows where it goes',
    curve: 0.15,
    power: 1.06,
    loft: 0.45,
    height: 1,
    wobble: 0.38,
  },
];

/** What you are striking it with until you say otherwise. */
export const DEFAULT_STYLE_ID = 'finesse';
