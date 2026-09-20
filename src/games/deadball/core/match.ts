/**
 * Match state: whose turn, how many shots left, what the score is.
 *
 * A pure reducer over messages, deliberately. It is what makes a human
 * opponent, an AI opponent and a replay the same code: the only difference
 * between them is where the messages come from. Nothing here knows about
 * physics, canvases or the clock.
 */

import type { Dive, MatchPhase, Outcome } from './types.ts';
import { isGoal } from './rules.ts';

/** Penalties per side in a shootout, before sudden death. */
export const SHOTS_PER_ROUND = 5;

export type MatchMode =
  /** One player, taking penalties against the computer keeper. */
  | 'solo'
  /** Two players on one device: one shoots, the other saves. */
  | 'duel'
  /**
   * One player against the computer, alternating like a duel does.
   *
   * The reason this is not just "solo with more shots": it is the only mode
   * where a single player gets to **keep**. Solo has you taking all five and
   * never standing in the goal, and until this existed the keeper's half of
   * the game needed a second person in the room.
   */
  | 'versus';

export type Side = 0 | 1;

export interface MatchState {
  mode: MatchMode;
  phase: MatchPhase;
  seed: number;
  /** Index of the shot being taken, 0-based, counting both sides in a duel. */
  shotIndex: number;
  shotsTotal: number;
  outcomes: Outcome[];
  /** Solo score. In a duel, read `scores` instead. */
  score: number;

  /** Who is taking this one. Always 0 in a solo game. */
  taker: Side;
  /** Goals scored by each side. */
  scores: [number, number];
  /**
   * Where the keeper has committed to dive, or null if they have not yet.
   *
   * Set before the taker has touched anything, and cleared at the end of every
   * shot. A keeper who could change their mind after seeing the aim would not
   * be guessing, which is the whole game.
   */
  dive: Dive | null;
}

export type MatchMessage =
  | { type: 'START'; seed: number; mode?: MatchMode; shots?: number }
  /** The keeper has picked a corner. Duel only, and before anything else. */
  | { type: 'SET_DIVE'; dive: Dive }
  /** The device has changed hands and the keeper's pick is off the screen. */
  | { type: 'HANDED_OVER' }
  /** Released the drag. The taker starts their run-up; the ball has not moved. */
  | { type: 'TAKE_SHOT' }
  /** Boot meets ball. This is where the flight begins. */
  | { type: 'STRIKE' }
  | { type: 'RESOLVE'; outcome: Outcome }
  | { type: 'NEXT' };

/**
 * What happens at the start of a turn.
 *
 * `keeping` means a person has to choose a corner before anything else can
 * move. That is true in a duel every time, and in `versus` only when the
 * computer is taking it - when the player is taking it, the computer keeper
 * plans invisibly and there is nothing to wait for, exactly as in solo.
 */
function openingPhase(mode: MatchMode, taker: Side): MatchPhase {
  if (mode === 'duel') return 'keeping';
  if (mode === 'versus' && taker === 1) return 'keeping';
  return 'ready';
}

/** Both sides alternate unless there is only one of them. */
const alternates = (mode: MatchMode): boolean => mode !== 'solo';

export function initialMatch(
  seed: number,
  shots: number = SHOTS_PER_ROUND,
  mode: MatchMode = 'solo'
): MatchState {
  return {
    mode,
    phase: openingPhase(mode, 0),
    seed,
    shotIndex: 0,
    // Five each when there are two sides, so ten shots and they alternate.
    shotsTotal: alternates(mode) ? shots * 2 : shots,
    outcomes: [],
    score: 0,
    taker: 0,
    scores: [0, 0],
    dive: null,
  };
}

export function reduce(state: MatchState, message: MatchMessage): MatchState {
  switch (message.type) {
    case 'START':
      return initialMatch(message.seed, message.shots ?? SHOTS_PER_ROUND, message.mode ?? state.mode);

    case 'SET_DIVE':
      // Only while the keeper is on the clock. A dive chosen at any other point
      // is a dive chosen with something visible that should not have been.
      if (state.phase !== 'keeping') return state;
      // Straight past the handover in `versus`. That screen exists to hide a
      // choice from the other person while the device changes hands, and there
      // is no other person: the computer cannot peek and nothing is passed.
      return {
        ...state,
        phase: state.mode === 'versus' ? 'ready' : 'handover',
        dive: message.dive,
      };

    case 'HANDED_OVER':
      return state.phase === 'handover' ? { ...state, phase: 'ready' } : state;

    case 'TAKE_SHOT':
      // Ignored unless a shot is actually waiting to be taken, so a second
      // pointer release mid-run cannot fire the same penalty twice.
      return state.phase === 'ready' ? { ...state, phase: 'runup' } : state;

    case 'STRIKE':
      return state.phase === 'runup' ? { ...state, phase: 'flight' } : state;

    case 'RESOLVE': {
      if (state.phase !== 'flight') return state;
      const scored = isGoal(message.outcome) ? 1 : 0;
      const scores: [number, number] = [...state.scores];
      scores[state.taker] += scored;
      return {
        ...state,
        phase: 'resolved',
        outcomes: [...state.outcomes, message.outcome],
        score: state.score + scored,
        scores,
      };
    }

    case 'NEXT': {
      if (state.phase !== 'resolved') return state;
      const shotIndex = state.shotIndex + 1;
      if (isOver(state, shotIndex)) return { ...state, phase: 'complete' };

      // Sides swap every shot, so each takes one then keeps one, the way a
      // real shootout alternates rather than giving somebody all five in a row.
      const taker: Side = alternates(state.mode) ? (state.taker === 0 ? 1 : 0) : 0;
      return {
        ...state,
        phase: openingPhase(state.mode, taker),
        shotIndex,
        taker,
        dive: null,
      };
    }
  }
}

/**
 * Is that it?
 *
 * A solo round is over when the five are gone. A duel is over when both have
 * had the same number *and* one is ahead - which for the regulation five is the
 * same thing most of the time, and is sudden death the rest of the time.
 *
 * The pair is the unit, not the shot. Ending the moment somebody goes ahead
 * mid-round would end it while the other player still had theirs to take,
 * which is not a shootout, it is a race.
 */
function isOver(state: MatchState, shotIndex: number): boolean {
  if (!alternates(state.mode)) return shotIndex >= state.shotsTotal;

  // Sudden death, where both have had their five and the pair is the unit.
  if (shotIndex >= state.shotsTotal) {
    // Mid-round: the other one still has to answer, however far behind.
    if (shotIndex % 2 !== 0) return false;
    return state.scores[0] !== state.scores[1];
  }

  // Regulation. Over the moment one side cannot be caught, which is how a
  // shootout actually ends and is why most of them do not reach ten.
  return decided(state.scores, shotIndex, state.shotsTotal);
}

/**
 * Can the side that is behind still catch up?
 *
 * The rule every shootout uses and this one did not: if somebody's score is
 * already higher than the other's *plus every penalty they have left*, the
 * rest are dead rubbers and nobody takes them.
 *
 * Checked after every single penalty rather than at the end of a round,
 * because it can fall either way round. Scoring your fifth to go 5-3 up with
 * one of theirs left ends it before they walk up; missing your fifth to stay
 * 3-3 does not.
 *
 * Found by playing: a shootout was won 5-3 and the losing side was still sent
 * up to take a tenth penalty that could not change anything.
 */
function decided(scores: readonly [number, number], taken: number, total: number): boolean {
  const perSide = total / 2;
  // Side 0 takes the even-numbered shots, so with an odd number gone it is one
  // ahead on attempts.
  const attempts: [number, number] = [Math.ceil(taken / 2), Math.floor(taken / 2)];
  const left: [number, number] = [perSide - attempts[0], perSide - attempts[1]];

  return scores[0] > scores[1] + left[1] || scores[1] > scores[0] + left[0];
}

/**
 * True once the regulation five each are gone and nobody has won.
 *
 * Presentation reads this to say so. Nothing in the rules branches on it - the
 * rules are the same shootout continuing, which is exactly what sudden death
 * is - so it is derived rather than stored, and cannot fall out of step with
 * the score it is derived from.
 */
export const inSuddenDeath = (state: MatchState): boolean =>
  alternates(state.mode) && state.shotIndex >= state.shotsTotal;

/** Shots left to take, including the one in progress. */
export const shotsRemaining = (state: MatchState): number =>
  Math.max(0, state.shotsTotal - state.outcomes.length);

/** Whoever is not taking this one is in goal. */
export const keeperSide = (state: MatchState): Side => (state.taker === 0 ? 1 : 0);

/** How many each side has taken so far, for a duel scoreboard. */
export function shotsTaken(state: MatchState): [number, number] {
  const taken: [number, number] = [0, 0];
  for (let i = 0; i < state.outcomes.length; i++) {
    // Shot 0 is side 0, shot 1 is side 1, and so on.
    taken[(i % 2) as Side] += 1;
  }
  return taken;
}
