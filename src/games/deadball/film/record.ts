/**
 * The last shot, kept frame by frame, so it can be watched again one frame at
 * a time.
 *
 * What is kept is exactly what the presentation was handed: the FrameState and
 * the events that arrived with it. Nothing about how it was drawn. That is what
 * makes a replay work for any package, and it is why a replay draws what was
 * on the screen rather than something close to it - every package in this game
 * animates off `frame.clock` and the events, never off the wall clock.
 *
 * Pure, and in its own module, so the rules about what to keep can be tested
 * without a canvas.
 */

import type { GameEvent } from '../core/events.ts';
import type { FrameState } from '../core/types.ts';

export interface Take {
  shotIndex: number;
  frames: readonly FrameState[];
  /** The events handed over with each frame, index for index. */
  events: readonly (readonly GameEvent[])[];
}

export interface Recorder {
  /** Every frame the presentation is given, with its events. */
  offer(frame: FrameState, events: readonly GameEvent[]): void;
  /** The shot in progress if there is one, otherwise the last one. */
  last(): Take | null;
}

/** From the run-up until just after the shot is decided. See AFTER_RESULT. */
const FILMED = new Set(['runup', 'flight', 'resolved']);

/**
 * How long the film runs on once the shot has been decided.
 *
 * The shot is decided the moment the ball crosses the line, hits the wall, or
 * can no longer go in - that is when `resolved` fires. Stopping on that frame
 * would cut off the ball hitting the net and the parry. Half a second shows
 * both, and stops before the celebration, which is the game's and not the
 * shot's. The film used to run for the whole two-second hold after a result.
 */
export const AFTER_RESULT = 0.5;

/** About ten seconds at 60 Hz, which is longer than any shot. */
export const MAX_FRAMES = 600;

export function createRecorder(): Recorder {
  let current: {
    shotIndex: number;
    frames: FrameState[];
    events: GameEvent[][];
    /** On the frame clock. Null until the shot has been decided. */
    endsAt: number | null;
  } | null = null;
  let finished: Take | null = null;

  const finish = (): void => {
    if (current && current.frames.length > 0) finished = current;
    current = null;
  };

  return {
    offer(frame, events) {
      const filmed = FILMED.has(frame.phase);
      if (current && (!filmed || frame.shotIndex !== current.shotIndex)) finish();
      if (!filmed) return;

      if (!current) current = { shotIndex: frame.shotIndex, frames: [], events: [], endsAt: null };
      if (current.frames.length >= MAX_FRAMES) return;
      if (current.endsAt !== null && frame.clock > current.endsAt) return;

      if (current.endsAt === null && events.some((event) => event.kind === 'resolved')) {
        current.endsAt = frame.clock + AFTER_RESULT;
      }
      // The match is immutable, but the kit colours are edited in place.
      current.frames.push(frame.kits ? { ...frame, kits: { ...frame.kits } } : frame);
      current.events.push([...events]);
    },

    last() {
      if (current && current.frames.length > 0) {
        return { shotIndex: current.shotIndex, frames: [...current.frames], events: [...current.events] };
      }
      return finished;
    },
  };
}
