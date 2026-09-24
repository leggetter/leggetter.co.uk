/**
 * The wall, and whether it jumps.
 *
 * This file is meant to be edited, like `shots.js`: change a number, refresh,
 * take five free kicks and see whether it feels better. Nothing else needs to
 * change with it. **Two devices have to agree on every number here** - the
 * tuning fingerprint includes them, so a room refuses a player whose copy is
 * different rather than letting the two of you watch different kicks.
 *
 * Some walls jump and some do not, and **you can't tell which while you
 * aim.** A wall that is going to jump is drawn exactly like one that is not,
 * with only a quick dip at the knees at the end of the run-up. It used to be
 * crouched the whole time you aimed, which made the jump a certainty to read
 * rather than a risk to take, so going under the wall is now a bet, as it is
 * in a real match. How it is drawn is in content/poses.js and pose/wall.ts;
 * nothing in this file changed with it.
 *
 * What each wall does to the ball:
 *
 *   jumping    hit it low and hard (driven) and it goes under them as they
 *              rise. Going over is harder than usual, because a jumping wall
 *              is taller than a standing one.
 *   standing   it stays down. Nothing goes under it, but it is lower to go
 *              over, so float it (finesse) or go round it.
 *
 * There is no evidence to tune any of this against yet - only a handful of
 * free kicks have ever been taken - so every number is a starting point.
 * Measured with these numbers, clean strikes aimed straight at the post a
 * four-man wall is covering, 2,000 a row:
 *
 *                 driven, aimed low   finesse, aimed high
 *   standing              0%                 33%
 *   jumping              30%                 26%
 *
 *   chance     how often a wall jumps, 0 to 1. Decided per kick from the
 *              match seed, so both halves of a round face the same wall and
 *              both devices agree without sending anything.
 *   standing   metres to the top of their heads, standing still. Tall people
 *              are put in walls, and they stand on their toes. Below about 2
 *              nearly anybody can float it over, whatever their `dip`.
 *   crouch     how far down they sink before the jump, as a fraction of
 *              `standing`. It only matters to the ball in the moment between
 *              the strike and leaving the ground.
 *   jump       metres the whole body rises at the top of the jump. How much
 *              taller a jumping wall is to go over.
 *   tuck       metres the feet come up beneath them on top of that, because
 *              nobody jumps with straight legs. `jump` plus `tuck` is the gap
 *              underneath at the top. Generous on purpose: a real driven free
 *              kick under a wall is struck along the ground, and this ball
 *              cannot be - the flattest arc to the bottom of the net passes
 *              the wall 30 to 50 cm up. Much below 0.4 and nothing gets under.
 *   delay      seconds after the strike before their feet leave the ground.
 *              A wall jumps on the kick, not before it, and the top of the
 *              jump lands about when a driven shot arrives.
 */

/** @typedef {{ chance: number, standing: number, crouch: number, jump: number, tuck: number, delay: number }} WallTuning */

/** @type {WallTuning} */
export const WALL = {
  chance: 0.5,
  standing: 2.02,
  crouch: 0.14,
  jump: 0.35,
  tuck: 0.55,
  delay: 0.03,
};
