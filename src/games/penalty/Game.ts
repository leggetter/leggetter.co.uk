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

import { BALL_RADIUS, PENALTY_DISTANCE } from './core/units.ts';
import { createRng, shotSeed } from './core/rng.ts';
import { resolveShot, spotBall, sweepAt, timingFromSweep } from './core/shot.ts';
import { advance, createFlight, type Flight } from './core/flight.ts';
import { idleDrift, planKeeper } from './core/keeper.ts';
import { initialMatch, reduce, SHOTS_PER_ROUND, type MatchState } from './core/match.ts';
import type { FrameState, KeeperProfile, Player, Shot, ShotInput } from './core/types.ts';
import { attachDragInput, type DragInput } from './input/drag.ts';
import { createView, resolveViewId } from './render/registry.ts';
import type { DragGesture, View } from './render/View.ts';
import { KEYS, type Settings, type Storage } from './storage/Storage.ts';
import { createShotLog, newSessionId, type ShotLog } from './telemetry/log.ts';
import { forMatch, summarise, type FullTime } from './telemetry/analyse.ts';

/** Simulation step. Fixed so a shot is reproducible; see core/rng.ts. */
export const STEP = 1 / 120;

/** Cap on catch-up steps, so a backgrounded tab does not spiral on return. */
const MAX_STEPS_PER_FRAME = 8;

/** How long the outcome stays up before the next penalty can be taken. */
const RESOLVE_HOLD_SECONDS = 0.4;

/**
 * How long the taker takes to run in after the drag is released.
 *
 * The shot is fully decided at release; this is the beat between deciding and
 * finding out, and it is the only moment the keeper's shuffle can still be
 * read. Long enough to see, short enough not to be in the way.
 */
const RUN_UP_SECONDS = 0.42;

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
  /** The shot log for this device. Nothing in it leaves the machine. */
  log: ShotLog;
  /** Swap the camera at runtime. Phase 2 hangs a control off this. */
  useView(id: string): void;
  currentViewId(): string;
}

export async function startGame(options: GameOptions): Promise<Game> {
  const { canvas, player, keeper, storage } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('penalty: 2d canvas context unavailable');

  const settings = (await storage.get<Settings>(KEYS.settings)) ?? {};
  const session = newSessionId();
  const log = await createShotLog(storage, session);
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

  /** What was struck, kept until the shot resolves so it can be logged. */
  let lastInput: ShotInput | null = null;

  /** Computed once at full time, not every frame. */
  let summary: FullTime | null = null;

  /** Seconds into the run-up, and the shot waiting at the end of it. */
  let runUp = 0;
  let pending: { shot: Shot; keeperStartX: number } | null = null;

  /** Seconds the keeper has been waiting on the line for this penalty. */
  let settling = 0;

  /** Keeper on the line, shuffling, before a shot is struck. */
  const idleKeeper = () =>
    planKeeper(
      keeper,
      createRng(shotSeed(match.seed, match.shotIndex)),
      { x: 0, y: 1 },
      idleDrift(settling, match.seed + match.shotIndex)
    );
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
    spot: spotBall(PENALTY_DISTANCE),
    runUp: match.phase === 'ready' ? 0 : match.phase === 'runup' ? runUp / RUN_UP_SECONDS : 1,
    shotIndex: match.shotIndex,
    shotsTotal: match.shotsTotal,
    score: match.score,
    outcomes: match.outcomes,
    lastOutcome: match.outcomes[match.outcomes.length - 1] ?? null,
    aiming,
    summary,
    timingMarker: aiming ? sweepMarker : null,
  });

  function take(input: ShotInput): void {
    if (match.phase !== 'ready') return;
    lastInput = input;

    // One stream per shot, drawn from the match seed, so a shot can be
    // reproduced from (matchSeed, shotIndex) alone.
    const rng = createRng(shotSeed(match.seed, match.shotIndex));

    // Pressure rises on the last penalty, which is what composure reads.
    const pressure = match.shotIndex >= match.shotsTotal - 1 ? 1 : 0;
    const shot = resolveShot(input, player, rng, {
      origin: spotBall(PENALTY_DISTANCE),
      pressure,
    });

    // The shot is decided here, but the ball does not move until the taker
    // gets to it. Captured at release: wherever the shuffle had reached is
    // where the dive begins, and the flight records it or a replay would
    // differ from the shot it replays.
    pending = { shot, keeperStartX: keeperSim.state.hands.x };
    runUp = 0;
    match = reduce(match, { type: 'TAKE_SHOT' });
    aiming = null;
  }

  function advanceToNext(): void {
    if (match.phase === 'complete') {
      match = initialMatch(Date.now() & 0x7fffffff, SHOTS_PER_ROUND);
      summary = null;
    } else if (match.phase === 'resolved' && holdRemaining <= 0) {
      match = reduce(match, { type: 'NEXT' });
      // Read across everything ever played on this device, not just these five
      // shots. A habit needs more than five shots to be a habit, and the whole
      // point of keeping the log is that the evidence accumulates.
      if (match.phase === 'complete') {
        const all = log.all();
        summary = {
          match: summarise(forMatch(all, match.seed)),
          lifetime: summarise(all),
        };
      }
    } else {
      return;
    }
    flight = null;
    pending = null;
    runUp = 0;
    settling = 0;
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

    // Keep shuffling while the taker settles. The keeper holds its ground once
    // the run-up starts, which is what makes the lean worth reading.
    if (!flight && match.phase === 'ready') {
      settling += STEP;
      keeperSim = idleKeeper();
    }

    // Boot meets ball at the end of the run-up.
    if (pending && match.phase === 'runup') {
      runUp += STEP;
      if (runUp >= RUN_UP_SECONDS) {
        const rng = createRng(shotSeed(match.seed, match.shotIndex));
        flight = createFlight(pending.shot, keeper, rng, pending.keeperStartX);
        pending = null;
        match = reduce(match, { type: 'STRIKE' });
      }
    }

    if (!flight || flight.outcome) return;

    flight = advance(flight, STEP);
    if (flight.outcome) {
      log.record({
        at: new Date().toISOString(),
        session,
        playerId: player.id,
        keeperId: keeper.id,
        viewId: view.id,
        matchSeed: match.seed,
        shotIndex: match.shotIndex,
        input: lastInput ?? { aim: { x: 0, y: 0 }, power: 0, curve: 0, lift: 0.5, timing: 0 },
        outcome: flight.outcome,
        flightSeconds: flight.elapsed,
        crossing: { x: flight.ball.position.x, y: flight.ball.position.y },
        keeperStyle: flight.keeper.plan.style,
        keeperHands: { x: flight.keeper.state.hands.x, y: flight.keeper.state.hands.y },
        keeperEnvelope: keeper.diveSpeed * flight.elapsed + keeper.reach + BALL_RADIUS,
        keeperStartX: flight.keeper.plan.startX,
        viewport: { width, height },
      });
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
    log,

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
