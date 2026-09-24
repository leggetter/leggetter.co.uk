/**
 * How a footballer is built.
 *
 * Bone lengths in metres for somebody about 1.80 m tall, read by the jointed
 * figure in presentation/toolkit/body/. Like everything else in content/, this
 * is meant to be edited: make the shins longer, refresh, and see whether it
 * reads better. Anything missing or nonsensical falls back to the value here.
 *
 *   spine          pelvis to the top of the torso, where the shoulders hang
 *   neck           top of the torso to the middle of the head
 *   headRadius     the head is drawn as a ball of this size
 *   shoulderWidth  one shoulder joint to the other
 *   hipWidth       one hip joint to the other
 *   upperArm       shoulder to elbow
 *   forearm        elbow to wrist
 *   hand           wrist to the middle of the hand, where a glove is drawn
 *   thigh          hip to knee
 *   shin           knee to ankle
 *   foot           ankle to toe
 *
 * **One of these is not a free choice.** `upperArm + forearm + hand` must be at
 * least ARM_SPAN in core/keeper.ts (0.72 m). That is how far the simulation
 * lets a keeper's hands get from the shoulder, and an arm drawn shorter than
 * that would show a save being made by an empty glove. A test holds the line.
 */

/** @typedef {import('../presentation/toolkit/body/skeleton.ts').Proportions} Proportions */

/** @type {Proportions} */
export const PROPORTIONS = {
  spine: 0.5,
  neck: 0.23,
  headRadius: 0.115,
  shoulderWidth: 0.4,
  hipWidth: 0.2,
  upperArm: 0.31,
  forearm: 0.27,
  hand: 0.16,
  thigh: 0.46,
  shin: 0.44,
  foot: 0.24,
};
