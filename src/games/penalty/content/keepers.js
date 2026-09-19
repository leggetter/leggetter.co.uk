/**
 * The keepers you have to beat.
 *
 * Also meant to be edited. A keeper is entirely described by the numbers below,
 * so inventing a new one is copying a block and changing them. This is the
 * fastest way to change how hard the game is.
 *
 *   reactionMs    how long before they move at all, in milliseconds. A penalty
 *                 is in the air for about 450 ms, so 200 is frighteningly
 *                 sharp and 450 means they never get going.
 *   diveSpeed     how fast their hands travel once they go, in meters per
 *                 second. About 8 is human. 20 is not.
 *   reach         how big a circle their hands cover, in meters. 0.5 is normal.
 *   guessBias     0 to 1. How often they pick a side before you even hit it.
 *                 A guesser is lethal if they guess right and helpless if not,
 *                 so high guessBias makes the game swingy rather than harder.
 *   readAccuracy  0 to 1. How well they read the shot once they commit. At 1
 *                 they know exactly where a straight ball is going - which is
 *                 why bending it is the answer.
 *
 * Worth knowing: no keeper can see the curve. They all read the line the ball
 * is travelling on right now. That is not a setting, it is how the game works.
 */

/** @typedef {import('../core/types.ts').KeeperProfile} KeeperProfile */

/** @type {KeeperProfile[]} */
export const KEEPERS = [
  {
    id: 'sunday',
    name: 'Sunday League Dave',
    reactionMs: 400,
    diveSpeed: 6.2,
    reach: 0.48,
    guessBias: 0.55,
    readAccuracy: 0.35,
  },
  {
    id: 'steady',
    name: 'Ruth Delaney',
    reactionMs: 300,
    diveSpeed: 8.4,
    reach: 0.55,
    guessBias: 0.2,
    readAccuracy: 0.72,
  },
  {
    id: 'wall',
    name: 'Kasper Nowak',
    reactionMs: 215,
    diveSpeed: 10.5,
    reach: 0.62,
    guessBias: 0.08,
    readAccuracy: 0.93,
  },
];

/** Who stands in the goal until there is a way to choose. */
export const DEFAULT_KEEPER_ID = 'steady';
