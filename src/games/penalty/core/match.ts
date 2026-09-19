/**
 * Match state: whose turn, how many shots left, what the score is.
 *
 * A pure reducer over messages, deliberately. It is what makes a human
 * opponent, an AI opponent and a replay the same code: the only difference
 * between them is where TAKE_SHOT comes from. Nothing here knows about
 * physics, canvases or the clock.
 */

import type { MatchPhase, Outcome } from './types.ts';
import { isGoal } from './rules.ts';

/** Penalties per side in a shootout, before sudden death. */
export const SHOTS_PER_ROUND = 5;

export interface MatchState {
  phase: MatchPhase;
  seed: number;
  /** Index of the shot being taken, 0-based. */
  shotIndex: number;
  shotsTotal: number;
  outcomes: Outcome[];
  score: number;
}

export type MatchMessage =
  | { type: 'START'; seed: number; shots?: number }
  | { type: 'TAKE_SHOT' }
  | { type: 'RESOLVE'; outcome: Outcome }
  | { type: 'NEXT' };

export function initialMatch(seed: number, shots: number = SHOTS_PER_ROUND): MatchState {
  return { phase: 'ready', seed, shotIndex: 0, shotsTotal: shots, outcomes: [], score: 0 };
}

export function reduce(state: MatchState, message: MatchMessage): MatchState {
  switch (message.type) {
    case 'START':
      return initialMatch(message.seed, message.shots ?? SHOTS_PER_ROUND);

    case 'TAKE_SHOT':
      // Ignored unless a shot is actually waiting to be taken, so a second
      // pointer release mid-flight cannot fire the same penalty twice.
      return state.phase === 'ready' ? { ...state, phase: 'flight' } : state;

    case 'RESOLVE': {
      if (state.phase !== 'flight') return state;
      const outcomes = [...state.outcomes, message.outcome];
      return {
        ...state,
        phase: 'resolved',
        outcomes,
        score: state.score + (isGoal(message.outcome) ? 1 : 0),
      };
    }

    case 'NEXT': {
      if (state.phase !== 'resolved') return state;
      const shotIndex = state.shotIndex + 1;
      return shotIndex >= state.shotsTotal
        ? { ...state, phase: 'complete' }
        : { ...state, phase: 'ready', shotIndex };
    }
  }
}

/** Shots left to take, including the one in progress. */
export const shotsRemaining = (state: MatchState): number =>
  Math.max(0, state.shotsTotal - state.outcomes.length);
