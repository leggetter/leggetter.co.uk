/**
 * Discrete things that happen during a shot.
 *
 * These already happened before this file existed - `flight.ts` has always
 * known about woodwork contact, parries and the ball entering the net - but it
 * knew them as *state*, and the loop steps the simulation several times per
 * rendered frame. Anything watching for "is the ball touching the post" fires
 * repeatedly on one contact, or misses it between two frames entirely.
 *
 * So the simulation says what happened, once, and never decides what it looks
 * or sounds like. That is the same seam the rest of this design uses, one layer
 * down: `core/` says the ball crossed at (1.2, 0.4) and never says how wide to
 * draw it.
 *
 * Presentation reads these for sound *and* for the crowd, which is why they are
 * one list rather than two. A cheer and a stand rising are one event with two
 * responses, and they cannot drift apart because nothing is keeping them in
 * step.
 */

export type GameEventKind =
  /** Boot meets ball. The start of every flight. */
  | 'boot'
  /** The keeper got a hand to it, saved or not. */
  | 'glove'
  /**
   * Post or bar.
   *
   * One kind, not two. It is the same aluminium either way, so anything that
   * wants to tell them apart can read the outcome instead.
   */
  | 'frame'
  /** The ball arriving in the netting. Only ever on a goal. */
  | 'net'
  /** The shot is over and has been judged. Carries the outcome. */
  | 'resolved';

export interface GameEvent {
  kind: GameEventKind;
  /**
   * Seconds since the ball was struck.
   *
   * Simulation time rather than wall clock, so a replay of the same seed emits
   * the same list with the same stamps.
   */
  at: number;
  /**
   * How hard, 0..1, where that means anything. A post clipped at walking pace
   * and one hit flush are the same event and should not be the same noise.
   */
  force?: number;
  /** Present on `resolved`. A string rather than the Outcome type, to keep
   * this file free of anything that would make it circular. */
  outcome?: string;
}

/** Somewhere to put events as a step produces them. */
export interface EventSink {
  emit(event: GameEvent): void;
}

/**
 * The sink used when nobody is listening.
 *
 * `flight.ts` is also run by tests and by the offline tuning scripts, neither
 * of which wants a list. Making the sink required and this the default is what
 * keeps the emit calls unconditional at the call site.
 */
export const NO_EVENTS: EventSink = { emit: () => {} };

/** Collects what a flight emitted, for the loop to drain once per frame. */
export function createEventLog(): EventSink & { drain(): GameEvent[] } {
  let events: GameEvent[] = [];
  return {
    emit(event: GameEvent): void {
      events.push(event);
    },
    drain(): GameEvent[] {
      if (events.length === 0) return [];
      const taken = events;
      events = [];
      return taken;
    },
  };
}
