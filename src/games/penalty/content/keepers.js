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
 *                 second. This one number decides more than it looks like it
 *                 should, because of a bit of arithmetic:
 *
 *                   how far they can get = diveSpeed x 0.43 + reach + 0.11
 *
 *                 0.43 s is roughly a penalty's flight. The goal is 3.66 m
 *                 from centre to post. Set diveSpeed so that lands a little
 *                 SHORT of 3.66 and the very corner stays unreachable no
 *                 matter how well they read it, which is what makes precise
 *                 shooting worth anything. Push it past and they cover the
 *                 whole goal, a good read becomes an automatic save, and
 *                 aiming carefully starts losing to scuffing it. Both failure
 *                 modes turned up in testing; around 5 to 6 is the window.
 *   reach         how big a circle their hands cover, in meters. 0.5 is normal.
 *   guessBias     0 to 1. How often they pick a side before you hit it and go,
 *                 seeing nothing. Lethal when right, helpless when wrong, so
 *                 this makes a keeper swingy rather than better.
 *   anticipation  0 to 1. How often they go at the moment of contact, reading
 *                 your run-up and body shape. This is what real keepers mostly
 *                 do, because a corner is further away than 450 ms of diving.
 *                 Whatever is left after guessBias and anticipation is how
 *                 often they hang back and watch the ball instead - which
 *                 looks patient and is usually too late.
 *   readAccuracy  0 to 1. How good the read is, whichever way they went. At 1
 *                 they know exactly where a straight ball is going.
 *
 * guessBias + anticipation should not add up to more than 1.
 *
 * Worth knowing: no keeper can see the curve. Whether they read your body or
 * the ball, they get the line it is on and not where the spin will take it.
 * That is not a setting, it is how the game works, and it is the reason
 * bending it is worth learning.
 */

/** @typedef {import('../core/types.ts').KeeperProfile} KeeperProfile */

/** @type {KeeperProfile[]} */
export const KEEPERS = [
  {
    id: 'sunday',
    name: 'Sunday League Dave',
    reactionMs: 400,
    diveSpeed: 4.3,
    reach: 0.45,
    guessBias: 0.5,
    anticipation: 0.3,
    readAccuracy: 0.45,
  },
  {
    id: 'steady',
    name: 'Ruth Delaney',
    reactionMs: 255,
    diveSpeed: 5.3,
    reach: 0.55,
    guessBias: 0.15,
    anticipation: 0.7,
    readAccuracy: 0.6,
  },
  {
    id: 'wall',
    name: 'Kasper Nowak',
    reactionMs: 215,
    diveSpeed: 5.8,
    reach: 0.62,
    guessBias: 0.06,
    anticipation: 0.86,
    readAccuracy: 0.78,
  },
];

/** Who stands in the goal until there is a way to choose. */
export const DEFAULT_KEEPER_ID = 'steady';
