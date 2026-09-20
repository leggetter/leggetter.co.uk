/**
 * Where the ball is, and what is standing in front of it.
 *
 * A penalty is a free kick with everything fixed: one distance, one angle, no
 * wall. That was the argument for building penalties first, and this is the
 * other end of it - the same shot model with the three constants turned back
 * into variables.
 *
 * Pure, and deterministic from the match seed. The same seed gives the same
 * sequence of spots and the same walls, which is what makes a shootout
 * replayable and what will let two devices agree without sending any of it.
 */

import { createRng, shotSeed } from './rng.ts';
import type { Vec3 } from './vec3.ts';
import { vec } from './vec3.ts';
import { BALL_RADIUS, GOAL_WIDTH, PENALTY_DISTANCE } from './units.ts';

/**
 * What you are playing.
 *
 * A choice rather than a mode, so it composes with all three of solo, versus
 * and duel rather than multiplying them. `mixed` decides per kick.
 */
export type Discipline = 'penalties' | 'freekicks' | 'mixed';

export const DISCIPLINES: readonly { id: Discipline; label: string }[] = [
  { id: 'penalties', label: 'Penalties' },
  { id: 'freekicks', label: 'Free kicks' },
  { id: 'mixed', label: 'Both' },
];

/** Anything else out of storage means the game people already know. */
export const cleanDiscipline = (raw: unknown): Discipline =>
  raw === 'freekicks' || raw === 'mixed' ? raw : 'penalties';

/** Which side of the pitch the kick is taken from. */
export type SpotId = 'left' | 'middle' | 'right';

export const SPOT_IDS: readonly SpotId[] = ['left', 'middle', 'right'];

/**
 * The three positions, in metres.
 *
 * Far enough out that the wall matters and the curve has room to work - the
 * whole reason free kicks are worth building. Sideways deflection grows with
 * the square of the flight, so the 20 cm a realistic Magnus gives over a
 * penalty becomes most of a metre from here. See "Physics that is right and
 * useless" in the spec, which is the bug this phase repays.
 *
 * The angled ones are wider than they are deep, so the near post is genuinely
 * threatened and the wall has a job to do.
 */
const PLACES: Record<SpotId, { x: number; z: number }> = {
  left: { x: -8.5, z: -17 },
  middle: { x: 0, z: -20.5 },
  right: { x: 8.5, z: -17 },
};

/** Ten yards, which is what the laws say and what a referee paces out. */
export const WALL_DISTANCE = 9.15;

/** Fewest and most in a wall. A one-man wall is not a wall. */
export const MIN_WALL = 2;
export const MAX_WALL = 4;

export interface SetPiece {
  /** A penalty is a free kick with the wall, the angle and the distance all
   *  turned off, so it is the same shape of thing rather than a special case. */
  penalty: boolean;
  id: SpotId;
  /** Where the ball sits. */
  origin: Vec3;
  /** How many are in the wall. */
  wallCount: number;
  /**
   * Which post the wall is lining up to cover, -1 for the left one.
   *
   * From an angle this is forced - you cover the near post and the keeper
   * takes the rest of the goal. From the middle there is no near post, so it
   * is chosen, and a taker who learns which side the wall favours has learned
   * something real about this particular kick.
   */
  covering: -1 | 1;
}

/** The penalty spot, as a set piece. No wall, straight on. */
export const penaltySpot = (): SetPiece => ({
  penalty: true,
  id: 'middle',
  origin: vec(0, BALL_RADIUS, -PENALTY_DISTANCE),
  wallCount: 0,
  covering: 1,
});

/**
 * The three spots in a shuffled order, reshuffled every three kicks.
 *
 * A bag rather than an independent roll per kick. Rolling each one on its own
 * gives the same spot three times in a row often enough to feel broken, and
 * the point of moving the ball is that you have to read a different picture
 * each time. A bag guarantees all three inside every set of three.
 *
 * The one thing a bag gets wrong is the seam - the last of one bag and the
 * first of the next can match - so a shuffle that would repeat across it is
 * turned over.
 */
export function spotOrder(seed: number, cycle: number): SpotId[] {
  const rng = createRng(shotSeed(seed, cycle * 101 + 7));
  const bag = [...SPOT_IDS];

  for (let attempt = 0; attempt < 8; attempt++) {
    // Fisher-Yates, which is the only shuffle that is actually uniform.
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [bag[i], bag[j]] = [bag[j] as SpotId, bag[i] as SpotId];
    }
    if (cycle === 0) break;
    // Would this bag open on the spot the last one closed with?
    const previous = spotOrder(seed, cycle - 1);
    if (bag[0] !== previous[previous.length - 1]) break;
  }

  return bag;
}

/**
 * The set piece for one kick of a shootout.
 *
 * Everything about it - which spot, how many in the wall, which post they
 * cover - comes off the match seed and the kick number, so nothing here has to
 * be stored, sent, or kept in step between two machines.
 */
export function setPieceFor(
  seed: number,
  shotIndex: number,
  discipline: Discipline = 'penalties'
): SetPiece {
  if (discipline === 'penalties') return penaltySpot();
  // Mixed decides per kick, off the same seed as everything else, so a mixed
  // shootout replays exactly like a fixed one.
  if (discipline === 'mixed' && createRng(shotSeed(seed, shotIndex * 31 + 5)).next() < 0.5) {
    return penaltySpot();
  }

  const cycle = Math.floor(shotIndex / SPOT_IDS.length);
  const id = spotOrder(seed, cycle)[shotIndex % SPOT_IDS.length] as SpotId;
  const place = PLACES[id];

  const rng = createRng(shotSeed(seed, shotIndex));
  const wallCount = MIN_WALL + Math.floor(rng.next() * (MAX_WALL - MIN_WALL + 1));

  // From the side, the near post is the one on your side of the pitch. From
  // the middle there is no near post and the wall picks an end.
  const covering: -1 | 1 =
    place.x === 0 ? (rng.next() < 0.5 ? -1 : 1) : place.x < 0 ? -1 : 1;

  return {
    penalty: false,
    id,
    origin: vec(place.x, BALL_RADIUS, place.z),
    wallCount,
    covering,
  };
}

/** Where the wall is lining up against: the inside of the post it covers. */
export const postCovered = (piece: SetPiece): Vec3 =>
  vec((piece.covering * GOAL_WIDTH) / 2, 0, 0);
