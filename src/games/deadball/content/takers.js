/**
 * The computers you have to save from.
 *
 * Used only in **v computer** mode, where the sides alternate and you spend
 * half the shootout in goal. Meant to be edited: a taker is entirely described
 * by the three numbers below, so inventing one is copying a block and changing
 * them.
 *
 *   ambition    0 to 1. How far from the middle of the goal it likes to aim.
 *               Higher is nearer the corners.
 *
 *               Careful with this one, because it is not "how good it is". A
 *               taker pinned at 1 aims at a corner every single time, which is
 *               *easier* to keep against than one that mixes - you only have
 *               to cover the corners. Somewhere around 0.6 is harder to face
 *               than 0.95.
 *
 *   technique   0 to 1. The odds of a clean strike. Whatever is left over
 *               mistimes, sprays and loses pace, through exactly the same code
 *               that punishes a person for releasing early. This is where the
 *               computer's misses come from.
 *
 *   variety     0 to 1. How much it varies, and how willing it is to switch
 *               sides after the shot before. Low is readable on purpose -
 *               that is what makes an easy opponent easy, and a keeper who
 *               spots the pattern has earned the save.
 *
 * The one rule: **do not try to make a taker that always scores.** The game
 * already had a dominant strategy once, both testers found it, and it made the
 * whole thing boring. A computer that hunts for the best corner would rebuild
 * that flaw and be unbeatable with it. Missing sometimes is the point.
 *
 * ## What these are tuned against
 *
 * Not a difficulty that sounded about right. The shot log knows what a *person*
 * does against this keeper: **63% scored, 15% saved, 18% off target.** So the
 * default taker is tuned to land near that, which makes the computer an
 * opponent rather than a wall, and makes "am I better than it" a fair question.
 *
 * Measured over 2,000 shots per profile against a keeper diving to a random
 * corner, which is what a person in goal amounts to - they commit before the
 * ball is struck, so they are guessing however hard they concentrate. The
 * logged duel bears that out: human keepers saved about 22%.
 */

export const TAKERS = [
  {
    id: 'steady',
    name: 'The Steady One',
    ambition: 0.7,
    technique: 0.5,
    variety: 0.45,
  },
  {
    // Aims wide and sacrifices pace for it. Beatable if you go early.
    id: 'placer',
    name: 'The Placer',
    ambition: 0.76,
    technique: 0.74,
    variety: 0.35,
  },
  {
    id: 'hammer',
    // Flat out, middle-ish, and mistimes more than anyone. Hard to reach even
    // when you go the right way, and puts one in the stand every so often.
    name: 'The Hammer',
    ambition: 0.56,
    technique: 0.34,
    variety: 0.3,
  },
  {
    id: 'unreadable',
    // The hardest to keep against, and not because it is accurate.
    name: 'The Unreadable',
    ambition: 0.68,
    technique: 0.58,
    variety: 0.92,
  },
];

export const DEFAULT_TAKER_ID = 'steady';
