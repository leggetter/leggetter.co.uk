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

/** From the run-up to the next kick being set up. */
const FILMED = new Set(['runup', 'flight', 'resolved']);

/**
 * After the result, one frame in every this many seconds.
 *
 * Up to the result every rendered frame is kept. The boot is on the ball for
 * about a frame and a half at 60 Hz, and that is the frame anybody stepping
 * through is looking for. The celebration afterwards runs for seconds and
 * changes slowly, so it is thinned to save memory.
 */
export const AFTERWARDS = 1 / 30;

/** Frame times jitter, and two 60 Hz frames rarely add up to exactly 1/30. */
const SLACK = 0.9;

/** About ten seconds at 60 Hz, which is longer than any shot. */
export const MAX_FRAMES = 600;

export function createRecorder(): Recorder {
  let current: { shotIndex: number; frames: FrameState[]; events: GameEvent[][] } | null = null;
  let finished: Take | null = null;
  /** Events from frames that were not kept, so none go missing. */
  let carried: GameEvent[] = [];
  let lastKept = -Infinity;

  const finish = (): void => {
    if (current && current.frames.length > 0) finished = current;
    current = null;
    carried = [];
  };

  return {
    offer(frame, events) {
      const filmed = FILMED.has(frame.phase);
      if (current && (!filmed || frame.shotIndex !== current.shotIndex)) finish();
      if (!filmed) return;

      if (!current) {
        current = { shotIndex: frame.shotIndex, frames: [], events: [] };
        lastKept = -Infinity;
      }
      if (current.frames.length >= MAX_FRAMES) return;

      carried.push(...events);
      if (frame.phase === 'resolved' && frame.clock - lastKept < AFTERWARDS * SLACK && carried.length === 0) return;

      // The match is immutable, but the kit colours are edited in place.
      current.frames.push(frame.kits ? { ...frame, kits: { ...frame.kits } } : frame);
      current.events.push(carried);
      carried = [];
      lastKept = frame.clock;
    },

    last() {
      if (current && current.frames.length > 0) {
        return { shotIndex: current.shotIndex, frames: [...current.frames], events: [...current.events] };
      }
      return finished;
    },
  };
}
