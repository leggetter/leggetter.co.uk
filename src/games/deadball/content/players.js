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
 *   dip        free kicks only. How much they can loft it over a wall and
 *              still bring it down under the bar. Below about 50 a four-man
 *              wall that jumps is rarely cleared; from about 60 it usually
 *              is. A wall that stands is lower and most players clear it.
 *   foot       'left' or 'right'. Changes which way the ball naturally drifts.
 *   colors     kit is the shirt, trim is the shorts and socks.
 *
 * You get 375 points to spread across power, accuracy, curve, composure and
 * dip - not 500. Everybody on this list spends exactly 375, and so does anybody
 * invented in the game, so a strength has to be paid for out of something
 * else. A test will tell you if your player does not add up.
 *
 * That is the whole game of this file. Making everyone 100 was the boring
 * version, and now it is not available.
 */

/** @typedef {import('../core/types.ts').Player} Player */

/** @type {Player[]} */
export const SQUAD = [
  {
    id: 'marchetti',
    name: 'Dario Marchetti',
    power: 55,
    accuracy: 85,
    curve: 93,
    composure: 57,
    dip: 85,
    foot: 'left',
    colors: { kit: '#2f6fd0', trim: '#f4f6f8' },
  },
  {
    id: 'okafor',
    name: 'Ade Okafor',
    power: 99,
    accuracy: 70,
    curve: 45,
    composure: 96,
    dip: 65,
    foot: 'right',
    colors: { kit: '#e03131', trim: '#1d1d1d' },
  },
  {
    id: 'lindqvist',
    name: 'Nils Lindqvist',
    power: 48,
    accuracy: 96,
    curve: 62,
    composure: 95,
    dip: 74,
    foot: 'right',
    colors: { kit: '#f5b301', trim: '#1b3a6b' },
  },
  {
    id: 'moreau',
    name: 'Yann Moreau',
    power: 86,
    accuracy: 80,
    curve: 88,
    composure: 48,
    dip: 73,
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
