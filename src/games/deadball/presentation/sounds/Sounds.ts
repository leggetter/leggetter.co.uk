/**
 * What the game sounds like.
 *
 * A default set that every presentation package inherits, and may override any
 * part of. Inheritance is what stops a new package arriving silent; ownership
 * is what lets one have its own voice without reinventing a crowd.
 *
 * Nothing here knows what a canvas is, and nothing in `core/` knows this
 * exists. The simulation emits events and never decides what they sound like -
 * a `core/` that imports an AudioContext would be the same mistake as a
 * `core/` that imports a canvas.
 */

import type { GameEvent } from '../../core/events.ts';

/** How loud the crowd should be, and why, at this moment. */
export type Mood =
  /** Nothing is happening. A murmur. */
  | 'idle'
  /** Somebody is over the ball. The murmur tightens. */
  | 'waiting'
  /** The ball is in the air. */
  | 'flight';

export interface SoundSet {
  /**
   * The crowd bed, always running once unlocked. Called when the mood changes
   * rather than every frame, so a package may cross-fade at its own pace.
   */
  bed(mood: Mood): void;

  /** One discrete thing that happened. */
  play(event: GameEvent): void;
}

/**
 * The sound the game makes, with a package's overrides layered over the
 * defaults.
 *
 * Taking `Partial` and filling the gaps is the whole mechanism: a package that
 * wants chiptune for the crowd and the stock woodwork writes one method.
 */
export function withOverrides(base: SoundSet, overrides: Partial<SoundSet>): SoundSet {
  return {
    bed: overrides.bed ? overrides.bed.bind(overrides) : base.bed.bind(base),
    play: overrides.play ? overrides.play.bind(overrides) : base.play.bind(base),
  };
}

/**
 * What the crowd is doing, given what the game is doing.
 *
 * Shared with the samples in `recorded.ts`, because the bed is tuned per mood
 * and two packages that disagreed about when the ground holds its breath would
 * sound like two different grounds. A package calls `bed` when this changes,
 * not every frame.
 */
export function moodOf(phase: string): Mood {
  if (phase === 'flight') return 'flight';
  if (phase === 'ready' || phase === 'runup') return 'waiting';
  return 'idle';
}
