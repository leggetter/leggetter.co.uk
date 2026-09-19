/**
 * Wiring: input to match to view.
 *
 * This is the only file that knows about all four layers at once, and it is
 * deliberately the thinnest thing that can hold them together. It owns the
 * clock and the canvas; core/ owns the rules; the view owns the pixels.
 *
 * The frame loop runs a fixed 120 Hz simulation with an accumulator, decoupled
 * from however often the browser decides to paint. See Phase 0 in
 * docs/penalty-shootout-spec.md for why that is not negotiable.
 */

import { PENALTY_DISTANCE } from './core/units.ts';
import { createRng, shotSeed } from './core/rng.ts';
import { resolveShot, spotBall, sweepAt, timingFromSweep } from './core/shot.ts';
import { advance, createFlight, type Flight } from './core/flight.ts';
import { planKeeper } from './core/keeper.ts';
import { initialMatch, reduce, SHOTS_PER_ROUND, type MatchState } from './core/match.ts';
import type { FrameState, KeeperProfile, Player, ShotInput } from './core/types.ts';
import { attachDragInput, type DragInput } from './input/drag.ts';
import { createView, resolveViewId } from './render/registry.ts';
import type { DragGesture, View } from './render/View.ts';
import { KEYS, type Settings, type Storage } from './storage/Storage.ts';

/** Simulation step. Fixed so a shot is reproducible; see core/rng.ts. */
export const STEP = 1 / 120;

/** Cap on catch-up steps, so a backgrounded tab does not spiral on return. */
const MAX_STEPS_PER_FRAME = 8;

/** How long the outcome stays up before the next penalty can be taken. */
const RESOLVE_HOLD_SECONDS = 0.4;

export interface GameOptions {
  canvas: HTMLCanvasElement;
  player: Player;
  keeper: KeeperProfile;
  storage: Storage;
  /** Defaults to the current URL, so `?view=` works. */
  search?: string;
  /** Fixed seed, for a reproducible match. Otherwise time-derived. */
  seed?: number;
}

export interface Game {
  stop(): void;
  /** Swap the camera at runtime. Phase 2 hangs a control off this. */
  useView(id: string): void;
  currentViewId(): string;
}

export async function startGame(options: GameOptions): Promise<Game> {
  const { canvas, player, keeper, storage } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('penalty: 2d canvas context unavailable');

  const settings = (await storage.get<Settings>(KEYS.settings)) ?? {};
  const search = options.search ?? window.location.search;

  let view: View = createView(resolveViewId(search, settings.viewId ?? null));
  view.mount({ canvas, ctx });

  // A time-derived seed is fine here: it is captured once and then never read
  // again, so the match stays reproducible from the number itself.
  let match: MatchState = initialMatch(options.seed ?? (Date.now() & 0x7fffffff));

  let flight: Flight | null = null;
  let aiming: ShotInput | null = null;
  let holdRemaining = 0;

  /**
   * How long the current drag has been held, in seconds. Drives the timing
   * sweep. The clock lives here rather than in the view because the view maps
   * the gesture and the game owns time; a replay reads the recorded `timing`
   * off the ShotInput and never runs this at all.
   */
  let held = 0;
  let sweepMarker = 0;

  /** Keeper standing on the line, before a shot is struck. */
  const idleKeeper = () => planKeeper(keeper, createRng(shotSeed(match.seed, match.shotIndex)));
  let keeperSim = idleKeeper();

  let ballPosition = spotBall(PENALTY_DISTANCE);

  const frameState = (): FrameState => ({
    phase: match.phase,
    ball: flight
      ? flight.ball
      : { position: ballPosition, velocity: { x: 0, y: 0, z: 0 }, spin: { x: 0, y: 0, z: 0 } },
    keeper: flight ? flight.keeper.state : keeperSim.state,
    keeperProfile: keeper,
    player,
    elapsed: flight?.elapsed ?? 0,
    shotIndex: match.shotIndex,
    shotsTotal: match.shotsTotal,
    score: match.score,
    outcomes: match.outcomes,
    lastOutcome: match.outcomes[match.outcomes.length - 1] ?? null,
    aiming,
    timingMarker: aiming ? sweepMarker : null,
  });

  function take(input: ShotInput): void {
    if (match.phase !== 'ready') return;

    // One stream per shot, drawn from the match seed, so a shot can be
    // reproduced from (matchSeed, shotIndex) alone.
    const rng = createRng(shotSeed(match.seed, match.shotIndex));

    // Pressure rises on the last penalty, which is what composure reads.
    const pressure = match.shotIndex >= match.shotsTotal - 1 ? 1 : 0;
    const shot = resolveShot(input, player, rng, {
      origin: spotBall(PENALTY_DISTANCE),
      pressure,
    });

    flight = createFlight(shot, keeper, rng);
    match = reduce(match, { type: 'TAKE_SHOT' });
    aiming = null;
  }

  function advanceToNext(): void {
    if (match.phase === 'complete') {
      match = initialMatch(Date.now() & 0x7fffffff, SHOTS_PER_ROUND);
    } else if (match.phase === 'resolved' && holdRemaining <= 0) {
      match = reduce(match, { type: 'NEXT' });
    } else {
      return;
    }
    flight = null;
    ballPosition = spotBall(PENALTY_DISTANCE);
    keeperSim = idleKeeper();
  }

  /** The view maps the gesture; the game stamps it with the release timing. */
  const intent = (gesture: DragGesture): ShotInput => ({
    ...view.aimFromDrag(gesture),
    timing: timingFromSweep(sweepMarker),
  });

  const input: DragInput = attachDragInput(canvas, {
    onStart: (gesture: DragGesture) => {
      if (match.phase !== 'ready') return;
      held = 0;
      sweepMarker = sweepAt(0);
      aiming = intent(gesture);
    },
    onMove: (gesture: DragGesture) => {
      if (match.phase === 'ready') aiming = intent(gesture);
    },
    onRelease: (gesture: DragGesture) => {
      if (match.phase === 'ready') take(intent(gesture));
      else aiming = null;
    },
    onClick: () => {
      aiming = null;
      advanceToNext();
    },
  });

  // --- canvas sizing -------------------------------------------------------

  let width = 0;
  let height = 0;

  function fit(): void {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.resize(width, height);
  }

  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(canvas);
  fit();

  // --- frame loop ----------------------------------------------------------

  let running = true;
  let frameId = 0;
  let last = performance.now();
  let accumulator = 0;

  function simulate(): void {
    if (holdRemaining > 0) holdRemaining -= STEP;

    // The sweep runs on simulation steps, not frames, so the window is the
    // same width on a 60 Hz laptop and a 120 Hz phone.
    if (aiming) {
      held += STEP;
      sweepMarker = sweepAt(held);
      aiming = { ...aiming, timing: timingFromSweep(sweepMarker) };
    }

    if (!flight || flight.outcome) return;

    flight = advance(flight, STEP);
    if (flight.outcome) {
      match = reduce(match, { type: 'RESOLVE', outcome: flight.outcome });
      holdRemaining = RESOLVE_HOLD_SECONDS;
    }
  }

  function frame(now: number): void {
    if (!running) return;

    // Clamp rather than trust the gap: an alt-tab produces an arbitrarily
    // large one, and the step cap below would silently swallow the rest.
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;

    accumulator += elapsed;
    let taken = 0;
    while (accumulator >= STEP && taken < MAX_STEPS_PER_FRAME) {
      simulate();
      accumulator -= STEP;
      taken += 1;
    }
    // Hit the cap, so there is a backlog no catching up will clear. Drop it
    // rather than stay permanently behind.
    if (taken === MAX_STEPS_PER_FRAME) accumulator = 0;

    view.render(frameState());
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return {
    stop(): void {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      input.destroy();
      view.destroy();
    },

    useView(id: string): void {
      view.destroy();
      view = createView(id);
      view.mount({ canvas, ctx: ctx! });
      fit();
      void storage.set<Settings>(KEYS.settings, { ...settings, viewId: id });
    },

    currentViewId: () => view.id,
  };
}
