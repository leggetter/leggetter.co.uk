/**
 * The players you can take penalties with.
 *
 * This file is meant to be edited. Add a player by copying one of the blocks
 * below and changing the numbers. Nothing here needs any other file to change,
 * and you cannot break the game from in here.
 *
 * All the skills go from 0 to 100:
 *
 *   power      how hard they can hit it. 100 is a rocket, 20 is a pass.
 *   accuracy   how close it goes to where you aimed. 100 is exact, every time.
 *              Below about 60 the ball starts wandering off on its own.
 *   curve      how much bend they get when you hook the drag.
 *   composure   only matters when it is the last penalty and it is all on them.
 *              Low composure players get worse when it counts.
 *   foot       'left' or 'right'. Changes which way the ball naturally drifts.
 *   colors     kit is the shirt, trim is the shorts and socks.
 *
 * Making everyone 100 makes the game boring, which is worth trying once so you
 * can see why.
 */

/** @typedef {import('../core/types.ts').Player} Player */

/** @type {Player[]} */
export const ROSTER = [
  {
    id: 'marchetti',
    name: 'Dario Marchetti',
    power: 72,
    accuracy: 88,
    curve: 91,
    composure: 84,
    foot: 'left',
    colors: { kit: '#2f6fd0', trim: '#f4f6f8' },
  },
  {
    id: 'okafor',
    name: 'Ade Okafor',
    power: 94,
    accuracy: 64,
    curve: 48,
    composure: 71,
    foot: 'right',
    colors: { kit: '#e03131', trim: '#1d1d1d' },
  },
  {
    id: 'lindqvist',
    name: 'Nils Lindqvist',
    power: 61,
    accuracy: 93,
    curve: 70,
    composure: 95,
    foot: 'right',
    colors: { kit: '#f5b301', trim: '#1b3a6b' },
  },
  {
    id: 'moreau',
    name: 'Yann Moreau',
    power: 80,
    accuracy: 76,
    curve: 83,
    composure: 52,
    foot: 'left',
    colors: { kit: '#14967f', trim: '#f4f6f8' },
  },
];

/**
 * Who you play as on a first visit, before anybody has picked.
 *
 * You do not need to change this to play as somebody you added - open the cog
 * and choose them. This is only the one the game starts on.
 */
export const DEFAULT_PLAYER_ID = 'marchetti';
