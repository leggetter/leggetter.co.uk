/**
 * A computer player taking a penalty.
 *
 * The counterpart to `keeper.ts`, and the thing that lets one person stand in
 * the goal. Until this existed, keeping needed a second person in the room.
 *
 * Pure and seeded, like everything else here: the same seed and the same
 * profile give the same `ShotInput` every time, so a shot the computer took
 * can be replayed, logged, and sent over a wire in a few dozen bytes.
 *
 * ## The one thing this must not do
 *
 * **It must not find the dominant strategy.** Two logged human sessions both
 * converged on aim ≈ 0.7 to one side, and 65% of all shots crossed beyond
 * where the keeper could physically reach. That was a flaw in the game and it
 * was fixed - but a computer taker that hunts for the best spot would rebuild
 * it instantly, and it would be unbeatable rather than merely good, because a
 * human keeper guessing against a machine that always picks the same corner is
 * not a contest.
 *
 * So the aim is drawn from a spread rather than optimised, and the spread is
 * deliberately wider than a good player's. The computer misses the target
 * sometimes because a shootout in which nobody ever misses is not a shootout.
 */

import type { Rng } from './rng.ts';
import type { Player, ShotInput } from './types.ts';

export interface TakerProfile {
  id: string;
  name: string;
  /**
   * 0..1. How near the corners it aims.
   *
   * Not "how good it is" - a taker that always finds the top corner is easier
   * to keep against than one that mixes, because the keeper only has to cover
   * the corners. This is how far from centre it likes to go, not how well it
   * gets there.
   */
  ambition: number;
  /** 0..1. How often it strikes cleanly. The rest scatter and lose pace. */
  technique: number;
  /** 0..1. How much it varies. Low is readable, high is scattergun. */
  variety: number;
}

/**
 * How far from the middle of the goal a shot may be aimed, as a fraction.
 *
 * Just past 1 on purpose, because `AIM_MARGIN` puts 1.0 slightly outside the
 * frame - so the far end of this range is a shot that misses by inches.
 *
 * Measured, not guessed. At 0.88 the computer put 1% of its shots off target,
 * which deletes a whole outcome from the game: no groan, no woodwork, no
 * relief. Real penalties miss the target around one time in ten, and the
 * misses are most of what makes the ones that go in feel earned.
 */
const MAX_AIM = 1.02;

/** Never aims at the very bottom of the goal; the ball would hit the grass. */
const MIN_HEIGHT = 0.12;
const MAX_HEIGHT = 0.82;

/**
 * Decide a penalty.
 *
 * `previous` is what this taker has already done in this shootout, newest
 * last. It is used only to avoid repeating itself, never to read the keeper -
 * a computer that learns where you dive is [a Later
 * item](../../../docs/deadball-spec.md) and a different, harder thing.
 */
export function decideShot(
  profile: TakerProfile,
  player: Player,
  rng: Rng,
  previous: readonly ShotInput[] = []
): ShotInput {
  const side = pickSide(rng, previous, profile.variety);

  // How far out, within what this taker's ambition allows. The bell keeps most
  // shots in a believable band rather than spreading them evenly, which would
  // look random rather than intentional.
  const reach = profile.ambition * MAX_AIM;
  const spread = 0.12 + profile.variety * 0.22;
  const x = clamp(side * (reach + rng.nextBell() * spread), -MAX_AIM, MAX_AIM);

  // Height rises with how wide it is going: a shot into the side netting is
  // usually lifted, and one down the middle is usually kept down because the
  // keeper's legs are there.
  const lean = Math.abs(x) / MAX_AIM;
  const height = clamp(
    MIN_HEIGHT + lean * 0.34 + profile.ambition * 0.22 + rng.nextBell() * 0.16,
    MIN_HEIGHT,
    MAX_HEIGHT
  );

  // Pace follows placement. A corner needs to get there before the keeper; a
  // placed shot inside the post does not, and hitting everything flat out is
  // the habit the full-time summary tells human players off for.
  const power = clamp(0.52 + lean * 0.3 + rng.nextBell() * 0.14, 0.3, 1);

  // Bend, and only sometimes. Curve is the most interesting thing in the game
  // and a taker that never uses it is teaching the keeper nothing.
  const bends = rng.next() < 0.35 + profile.variety * 0.3;
  const curve = bends ? clamp(-side * (0.4 + rng.next() * 0.6), -1, 1) : 0;

  // Mistiming, which is where the computer's misses come from. Technique is
  // the odds of a clean strike; everything else sprays and loses pace exactly
  // as it does for a person, through the same `resolveShot` path.
  const clean = rng.next() < profile.technique;
  const timing = clean ? 0 : clamp(rng.nextBell() * 2.4, -1, 1);

  // A mishit penalty goes UP.
  //
  // Measured: without this, `technique` was a dead parameter - 73 to 75% scored
  // whatever it was set to. The reason is that `resolveShot`'s timing scatter
  // moves a shot sideways by centimeters, and against a keeper who has already
  // committed to the wrong corner a moved shot is no less likely to go in. So
  // technique changed nothing anybody could see.
  //
  // Leaning back and skying it is what a mistimed penalty actually looks like,
  // and it is the honest source of a miss: the computer misses by mishitting
  // rather than by aiming at the corner flag, which was the only other lever
  // and made it look like it was not trying.
  const skied = clean ? 0 : Math.abs(timing) * (0.34 + rng.next() * 0.3);

  return {
    // Clamped to 1, which is as high as a person can aim: the drag mapping
    // bounds human input to 0..1 and the computer plays the same game through
    // the same type. 1 is already `AIM_MARGIN` above the bar, so a skied
    // penalty still goes over - it just cannot go over by an amount nobody
    // could have hit.
    aim: { x, y: clamp(height + skied, MIN_HEIGHT, 1) },
    power: clamp(power * (0.85 + player.power / 200), 0.3, 1),
    curve,
    lift: 0.5,
    timing,
  };
}

/**
 * Which side to go.
 *
 * Weighted against whatever it did last, because the one habit worth designing
 * out is the one the logs found in everybody: going the same way every time.
 * A keeper who can read the computer after three shots has beaten the game
 * rather than the taker.
 */
function pickSide(rng: Rng, previous: readonly ShotInput[], variety: number): number {
  const last = previous[previous.length - 1];
  const roll = rng.next();
  if (!last) return roll < 0.5 ? -1 : 1;

  const lastSide = last.aim.x === 0 ? 0 : last.aim.x < 0 ? -1 : 1;
  // A high-variety taker almost always switches; a low-variety one is readable
  // on purpose, which is what makes an easy computer easy.
  const switches = 0.5 + variety * 0.35;
  return roll < switches ? -lastSide || 1 : lastSide || 1;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));
