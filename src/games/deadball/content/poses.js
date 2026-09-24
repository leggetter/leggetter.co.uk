/**
 * How the players move: key poses, and the numbers that time them.
 *
 * Phase 3 of #72. Like `shots.js`, this is meant to be edited: change a
 * number, refresh, take five penalties and see whether it looks better.
 * Nothing here can change an outcome. It is read only by the jointed figure
 * in presentation/classic/pose/, and a package that draws sprites would have
 * a sprite sheet where this file is.
 *
 * **The kick.** Positions are `[out, up, forward]` in metres, measured from
 * the grass under the ball, for a 1.80 m body - a smaller taker has them
 * scaled down with the rest of them.
 *
 *   out       toward the side the taker runs in from, which is where the
 *             planted foot goes. Mirrored for a left-footer, so one set of
 *             numbers does both.
 *   up        off the grass.
 *   forward   toward the goal.
 *
 * `chest` and `head` are directions rather than positions: which way the
 * spine leans from the hips, and which way the head sits on the neck.
 *
 * Each key is either `runUp` - how far through the run-up, 0 to 1, where 1 is
 * the instant the boot meets the ball - or `after`, seconds after that. **A
 * key leaves out whatever has not moved since the key before it**, which is
 * how the planted foot stays planted: it is given once, in `plant`, and held
 * exactly from there on.
 *
 * Two things are worked out rather than written here, because they have to be
 * exact: where the kicking boot is at `strike` and `contact` (it is put on the
 * ball, from `contact` below), and where it is at `plant` (still on the grass
 * where the last stride of the run-up left it).
 */

/** @typedef {[number, number, number]} Triple */

/**
 * @typedef {{
 *   name: string,
 *   runUp?: number,
 *   after?: number,
 *   pelvis?: Triple,
 *   chest?: Triple,
 *   head?: Triple,
 *   plantAnkle?: Triple,
 *   plantToe?: Triple,
 *   kickAnkle?: Triple,
 *   kickToe?: Triple,
 *   plantHand?: Triple,
 *   kickHand?: Triple,
 * }} KickKey
 */

export const KICK = {
  /**
   * The run-up, before the planted foot lands.
   *
   *   strides      footfalls between standing and the plant: the planted
   *                foot's, then the kicking foot's.
   *   lastStride   how far behind the hips at the plant the kicking foot's
   *                last footfall is. The long last stride that loads a kick.
   *   landsAhead   how far in front of the hips a foot lands, metres.
   *   liftsBehind  how far behind them it leaves the grass. Between the two
   *                it does not move at all - see `pose.test.ts`.
   *   stepHeight   how high a foot comes up through a stride.
   *   bob          how much the hips drop onto each footfall.
   *   lean         how far forward the chest is thrown while running.
   *   armSwing     arms against legs: how much of a foot's stride the
   *                opposite hand swings through.
   *   stance       how far apart the feet are, standing waiting.
   */
  approach: {
    lastStride: 0.42,
    landsAhead: 0.24,
    liftsBehind: 0.28,
    stepHeight: 0.16,
    bob: 0.03,
    lean: 0.22,
    armSwing: 0.6,
    stance: 0.3,
  },

  /**
   * Which part of the boot meets the ball, and how the foot is turned.
   *
   *   yaw        degrees the toe turns out from straight at the goal. 90 is
   *              a pure side-foot; 0 would be a toe-poke.
   *   pitch      degrees the toe points down.
   *   strikeAt   where along the boot, 0 the ankle and 1 the toe.
   *   push       metres the boot travels through the ball between `strike`
   *              and `contact`, which is how long it is seen on it.
   */
  contact: {
    // Somewhere between a side-foot and the laces, which is most penalties.
    // The boot is drawn as thick as the ball's radius, so much more pitch than
    // this puts the toe into the grass at contact, and a test says so.
    yaw: 45,
    pitch: 12,
    strikeAt: 0.62,
    push: 0.03,
  },

  /** @type {KickKey[]} */
  keys: [
    {
      // The last stride lands: planted foot beside the ball, hips still
      // behind it and low, the arm on that side swung back.
      name: 'plant',
      runUp: 0.66,
      pelvis: [0.36, 0.84, -0.46],
      chest: [0.04, 1, 0.14],
      head: [0, 1, 0.3],
      plantAnkle: [0.27, 0.09, -0.08],
      plantToe: [-0.08, 0, 1],
      plantHand: [0.52, 0.78, -0.66],
      kickHand: [-0.02, 0.98, -0.06],
    },
    {
      // Heel up behind, knee leading. The balancing arm is on its way out.
      name: 'backswing',
      runUp: 0.84,
      pelvis: [0.31, 0.82, -0.3],
      chest: [0.1, 1, 0.04],
      head: [0.04, 1, 0.34],
      kickAnkle: [0.1, 0.52, -0.8],
      kickToe: [0, -1, -0.5],
      plantHand: [0.86, 1.08, -0.34],
      kickHand: [-0.2, 0.88, -0.24],
    },
    {
      // The boot arrives on the ball, a couple of frames early. It is placed
      // there rather than written here - see `contact`.
      name: 'strike',
      runUp: 0.94,
      pelvis: [0.28, 0.8, -0.22],
      chest: [0.18, 1, -0.06],
      head: [0.05, 1, 0.36],
      plantHand: [1.02, 1.18, -0.12],
      kickHand: [-0.2, 0.86, -0.46],
    },
    {
      // Contact. Leaning away from the kicking leg with that arm out wide
      // for balance, the other swung back against the leg.
      name: 'contact',
      runUp: 1,
      pelvis: [0.27, 0.8, -0.19],
      chest: [0.2, 1, -0.08],
      head: [0.05, 1, 0.36],
      plantHand: [1.05, 1.2, -0.08],
      kickHand: [-0.2, 0.85, -0.5],
    },
    {
      // Follow-through: the leg carries on up toward the goal, the hips come
      // through over the planted foot, and the arms swap.
      name: 'follow',
      after: 0.14,
      pelvis: [0.2, 0.86, 0.02],
      chest: [0.1, 1, -0.2],
      head: [0, 1, 0.2],
      kickAnkle: [-0.1, 0.62, 0.56],
      kickToe: [-0.12, 0.4, 1],
      plantHand: [0.56, 1.02, 0.3],
      kickHand: [-0.46, 0.92, -0.3],
    },
    {
      // The kicking foot comes down in front, and the weight goes onto it.
      name: 'land',
      after: 0.42,
      pelvis: [0.12, 0.86, 0.2],
      chest: [0.02, 1, 0.08],
      head: [0, 1, 0.12],
      kickAnkle: [-0.08, 0.09, 0.5],
      kickToe: [-0.04, 0, 1],
      plantHand: [0.44, 0.64, 0.26],
      kickHand: [-0.2, 0.64, 0.2],
    },
    {
      // Stood watching it go.
      name: 'watch',
      after: 0.9,
      pelvis: [0.12, 0.92, 0.18],
      chest: [0, 1, 0],
      head: [0, 1, 0],
      plantHand: [0.37, 0.5, 0.22],
      kickHand: [-0.13, 0.5, 0.22],
    },
  ],
};

/**
 * The keeper. The dive's path is core/'s - these only dress it.
 *
 *   set        the crouch as the taker runs in: how far the shoulders sink,
 *              and where the hands go - out from the middle, up off the
 *              grass, and forward toward the ball - how much wider the feet
 *              go, and how far the knees turn out (0 to 1) so the bend shows
 *              from in front.
 *   push       how far into the dive, 0 to 1, the foot on that side stays
 *              planted before it leaves the grass.
 *   legLag     how far the trailing leg lags the body. 1 is not at all; the
 *              bigger it is, the later the leg catches up.
 *   landing    a full-length dive slides on `slide` metres along the grass
 *              and its legs bounce `bounce` metres once. A keeper landing on
 *              their feet gives `absorb` metres at the knees.
 *   shuffle    the steps along the line while waiting: how long a step is
 *              and how high a foot lifts.
 */
export const KEEPER = {
  set: { depth: 0.2, handsOut: 0.4, handsHeight: 0.8, handsForward: 0.22, wide: 0.06, kneesOut: 0.7 },
  push: 0.32,
  legLag: 1.7,
  landing: { slide: 0.2, bounce: 0.07, absorb: 0.2 },
  shuffle: { step: 0.2, lift: 0.05 },
};

/**
 * A wall that is going to jump. A wall that is not stands as it always has.
 *
 * The set has to say "about to jump" on its own, from the default camera,
 * with no standing wall beside it to compare against - see pose/wall.ts. How
 * high they go and how far their knees come up is core/'s, in walls.js, and
 * the drawing follows it exactly once they leave the ground; nothing here
 * changes what the ball meets.
 *
 *   set        the squat, for the 1.80 m body: how far the hips `drop` and
 *              go `back`, how far the chest leans over the knees, how much
 *              `wide`r the feet go, how far the knees turn out (0 to 1), and
 *              where the hands are swung to - back behind the hips, out to
 *              the side, and down from the shoulder.
 *   bounce     metres they rock on the balls of their feet while set.
 *   dip        metres further down they sink as the taker runs in.
 *   push       seconds from the strike to straight legs.
 *   absorb     metres the knees give on landing, before springing back.
 */
export const JUMPING_WALL = {
  set: {
    drop: 0.38,
    back: 0.14,
    lean: 0.6,
    wide: 0.07,
    kneesOut: 0.45,
    handsBack: 0.48,
    handsOut: 0.16,
    handsDown: 0.42,
  },
  bounce: 0.012,
  dip: 0.05,
  push: 0.08,
  absorb: 0.18,
};
