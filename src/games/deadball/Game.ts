/**
 * Wiring: input to match to presentation.
 *
 * This is the only file that knows about all four layers at once, and it is
 * deliberately the thinnest thing that can hold them together. It owns the
 * clock and the canvas; core/ owns the rules; the view owns the pixels.
 *
 * The frame loop runs a fixed 120 Hz simulation with an accumulator, decoupled
 * from however often the browser decides to paint. See Phase 0 in
 * docs/deadball-spec.md for why that is not negotiable.
 */

import { BALL_RADIUS, GOAL_HEIGHT, GOAL_WIDTH, PENALTY_DISTANCE } from './core/units.ts';
import type { Vec3 } from './core/vec3.ts';
import { createRng, shotSeed } from './core/rng.ts';
import { tuningFingerprint } from './core/tuning.ts';
import { resolveShot, spotBall, sweepAt, timingFromSweep } from './core/shot.ts';
import { advance, createFlight, type Flight } from './core/flight.ts';
import { idleDrift, planKeeper } from './core/keeper.ts';
import {
  inSuddenDeath,
  initialMatch,
  keeperSide,
  reduce,
  SHOTS_PER_ROUND,
  type MatchMode,
  type MatchState,
} from './core/match.ts';
import type {
  Dive,
  FrameState,
  KeeperProfile,
  Player,
  Shot,
  ShotInput,
} from './core/types.ts';
import { attachDragInput, type DragInput } from './input/drag.ts';
import { TAKERS, DEFAULT_TAKER_ID } from './content/takers.js';
import { createEventLog } from './core/events.ts';
import { decideShot, type TakerProfile } from './core/taker.ts';
import {
  cameraFor,
  createPackage,
  resolveCameraId,
  resolvePackageId,
  type CameraSpec,
} from './presentation/registry.ts';
import type { DragGesture, DragPoint, Presentation } from './presentation/Presentation.ts';
import { cleanNames, type DuelNames } from './core/names.ts';
import { KEYS, type Settings, type Storage } from './storage/Storage.ts';
import { createShotLog, newSessionId, type ShotLog } from './telemetry/log.ts';
import { forMatch, summarise, summariseDuel, type FullTime } from './telemetry/analyse.ts';

/** Simulation step. Fixed so a shot is reproducible; see core/rng.ts. */
export const STEP = 1 / 120;

/** Cap on catch-up steps, so a backgrounded tab does not spiral on return. */
const MAX_STEPS_PER_FRAME = 8;

/**
 * How long the outcome stays up before the next penalty can be taken.
 *
 * Long enough for the aftermath to play: the keeper finishing its dive and
 * coming down, and the ball going wherever it went off the gloves.
 */
const RESOLVE_HOLD_SECONDS = 1.0;

/**
 * How long the computer stands over the ball before striking.
 *
 * Long enough to look at the goal after committing to a corner, short enough
 * not to feel like waiting. A person takes about this long from placing the
 * ball to running up.
 */
const COMPUTER_THINKS = 1.1;

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
  /** 'duel' puts two people on one device: one shoots, the other saves. */
  mode?: MatchMode;
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
  /** Start again in this mode. */
  restart(mode: MatchMode, names?: DuelNames): void;
  currentMode(): MatchMode;
  /** What the two sides are called. Cleaned, so never empty. */
  currentNames(): DuelNames;
  /** The shot log for this device. Nothing in it leaves the machine. */
  log: ShotLog;
  /** Swap the camera at runtime. Phase 2 hangs a control off this. */
  useView(id: string): void;
  currentViewId(): string;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export async function startGame(options: GameOptions): Promise<Game> {
  const { canvas, player, keeper, storage } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('penalty: 2d canvas context unavailable');

  // Mutable, and every write goes through `remember`. It used to be a const
  // snapshot spread into each write, which is correct only while there is one
  // setting: adding a second means changing the camera and then the names
  // would write the names on top of the stale camera and lose it.
  let settings = (await storage.get<Settings>(KEYS.settings)) ?? {};
  const remember = (patch: Partial<Settings>): void => {
    settings = { ...settings, ...patch };
    void storage.set<Settings>(KEYS.settings, settings);
  };
  // Whatever was typed last time, put back through the same cleaning as fresh
  // input: a stored name is not more trustworthy than a typed one, it is just
  // older, and this store is editable from a browser console.
  let names: DuelNames = cleanNames(settings.duelNames);

  // Who the computer is when it takes its turn. A profile rather than a
  // difficulty slider, so it has a name to put on the scoreboard.
  const takerProfile: TakerProfile =
    ((TAKERS as TakerProfile[]).find((t) => t.id === DEFAULT_TAKER_ID) ??
      (TAKERS as TakerProfile[])[0]) as TakerProfile;

  /**
   * What the computer has already tried this shootout.
   *
   * Passed back in so it can avoid repeating itself. This is the whole of its
   * memory: it never sees where the player dived, because a computer that
   * reads you is a different and much harder thing, and one this document
   * files under Later.
   */
  let computerShots: ShotInput[] = [];

  /** Seconds the computer waits before striking, so its turn is watchable. */
  let computerDelay = 0;
  const session = newSessionId();
  // Constant for the life of the page; the physics cannot change under it.
  const tuning = tuningFingerprint();
  const log = await createShotLog(storage, session);
  const search = options.search ?? window.location.search;

  // A camera is where you stand and a package is how it looks, so they are
  // resolved separately and neither knows about the other.
  let camera: CameraSpec = cameraFor(resolveCameraId(search, settings.viewId ?? null));
  const presentation: Presentation = createPackage(
    resolvePackageId(search, settings.packageId ?? null)
  );
  presentation.mount({ canvas, ctx });

  let muted = settings.muted ?? false;
  presentation.setMuted(muted);

  // What the simulation said happened, drained once per rendered frame. The
  // loop may step several times between frames, so collecting rather than
  // polling is what makes one woodwork contact one event instead of four.
  const events = createEventLog();

  // A time-derived seed is fine here: it is captured once and then never read
  // again, so the match stays reproducible from the number itself.
  let match: MatchState = initialMatch(
    options.seed ?? (Date.now() & 0x7fffffff),
    SHOTS_PER_ROUND,
    options.mode ?? 'solo'
  );

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

  /** Where the keeper is pointing while choosing. Not their commitment. */
  let choosing: Dive | null = null;

  /** Computed once at full time, not every frame. */
  let summary: FullTime | null = null;

  /** Seconds since the game started. Drives idle animation, nothing else. */
  let clock = 0;
  /** Clock reading at the moment of contact, or null before it. */
  let struckAt: number | null = null;

  /** Recent ball positions for the trail, oldest first. */
  let trail: Vec3[] = [];
  const TRAIL_LENGTH = 14;

  /** Seconds into the run-up, and the shot waiting at the end of it. */
  let runUp = 0;
  let pending: { shot: Shot; keeperStartX: number; dive: Dive | null } | null = null;
  // Kept past the strike, because `pending` is cleared there and the shot is
  // not logged until the ball has finished.
  let struckDive: Dive | null = null;

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
    trail,
    runUp: match.phase === 'ready' ? 0 : match.phase === 'runup' ? runUp / RUN_UP_SECONDS : 1,
    clock,
    sinceStrike: struckAt === null ? 0 : clock - struckAt,
    shotIndex: match.shotIndex,
    shotsTotal: match.shotsTotal,
    score: match.score,
    outcomes: match.outcomes,
    lastOutcome: match.outcomes[match.outcomes.length - 1] ?? null,
    mode: match.mode,
    taker: match.taker,
    keeperSide: keeperSide(match),
    scores: match.scores,
    names: match.mode === 'versus' ? [names[0], takerProfile.name] : names,
    suddenDeath: inSuddenDeath(match),
    // Hidden from the taker on purpose: the dive is only ever drawn while its
    // owner is choosing it, never once the device has changed hands.
    dive: match.phase === 'keeping' ? match.dive : null,
    choosing: match.phase === 'keeping' ? choosing : null,
    aiming,
    summary,
    timingMarker: aiming ? sweepMarker : null,
  });

  /** True when this shot belongs to the computer and it has not gone yet. */
  const computerIsTaking = (): boolean =>
    match.mode === 'versus' && match.taker === 1 && match.phase === 'ready';

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
    pending = { shot, keeperStartX: keeperSim.state.hands.x, dive: match.dive };
    runUp = 0;
    match = reduce(match, { type: 'TAKE_SHOT' });
    aiming = null;
  }

  function advanceToNext(): void {
    if (match.phase === 'complete') {
      // Through the reducer, which carries the mode across. Calling
      // initialMatch directly meant relying on remembering to pass it, and the
      // argument was missing: playing again after a duel dropped you into a
      // solo game while the 2 players button still read as selected.
      match = reduce(match, { type: 'START', seed: Date.now() & 0x7fffffff, shots: SHOTS_PER_ROUND });
      summary = null;
      choosing = null;
      computerShots = [];
      computerDelay = COMPUTER_THINKS;
    } else if (match.phase === 'resolved' && holdRemaining <= 0) {
      match = reduce(match, { type: 'NEXT' });
      computerDelay = COMPUTER_THINKS;
      // Read across everything ever played on this device, not just these five
      // shots. A habit needs more than five shots to be a habit, and the whole
      // point of keeping the log is that the evidence accumulates.
      if (match.phase === 'complete') {
        const all = log.all();
        const thisMatch = forMatch(all, match.seed);
        summary = {
          match: summarise(thisMatch),
          lifetime: summarise(all),
          // This shootout only. All-time would mix in solo shots and, worse,
          // every previous duel played by different people on the same device -
          // sides carry across a log, the people holding them do not.
          // Both modes have two sides to compare, and the log records which
          // side took each shot either way.
          duel: match.mode === 'solo' ? null : summariseDuel(thisMatch),
        };
      }
    } else {
      return;
    }
    flight = null;
    trail = [];
    pending = null;
    struckAt = null;
    runUp = 0;
    settling = 0;
    ballPosition = spotBall(PENALTY_DISTANCE);
    keeperSim = idleKeeper();
  }

  /** The view maps the gesture; the game stamps it with the release timing. */
  const intent = (gesture: DragGesture): ShotInput => ({
    ...presentation.aimFromDrag(gesture),
    timing: timingFromSweep(sweepMarker),
  });

  const input: DragInput = attachDragInput(canvas, {
    onStart: (gesture: DragGesture) => {
      // The first press is the only moment a browser will let audio start.
      // Cheap and idempotent after that, so it is not worth a flag.
      presentation.unlock();
      if (match.phase === 'keeping') {
        choosing = presentation.diveFromPointer(gesture.current);
        return;
      }
      if (match.phase !== 'ready') return;
      held = 0;
      sweepMarker = sweepAt(0);
      aiming = intent(gesture);
    },

    onMove: (gesture: DragGesture) => {
      if (match.phase === 'keeping') {
        choosing = presentation.diveFromPointer(gesture.current);
        return;
      }
      if (match.phase === 'ready') aiming = intent(gesture);
    },

    onRelease: (gesture: DragGesture) => {
      if (match.phase === 'keeping') {
        commitDive(gesture.current);
        return;
      }
      if (match.phase === 'ready') take(intent(gesture));
      else aiming = null;
    },

    onClick: (point) => {
      // A tap is enough to pick a dive, and is the only thing that moves the
      // handover on. Everywhere else it is "next".
      if (match.phase === 'keeping') {
        commitDive(point);
        return;
      }
      if (match.phase === 'handover') {
        match = reduce(match, { type: 'HANDED_OVER' });
        return;
      }
      aiming = null;
      advanceToNext();
    },
  });

  /**
   * Lock the keeper's pick in.
   *
   * Clamped to somewhere inside the goal, because a pointer can be anywhere on
   * the pitch and "I dive at the corner flag" is not a choice worth offering.
   */
  function commitDive(point: DragPoint): void {
    const spot = presentation.diveFromPointer(point) ?? { x: 0, y: 1 };
    const dive = {
      x: clamp(spot.x, -GOAL_WIDTH / 2, GOAL_WIDTH / 2),
      y: clamp(spot.y, 0.1, GOAL_HEIGHT),
    };
    choosing = null;
    match = reduce(match, { type: 'SET_DIVE', dive });
  }

  const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

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
    presentation.configure(camera, width, height);
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
    clock += STEP;
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

      // The computer's turn. It is in `ready` like a person would be, and
      // nothing is going to drag the ball, so it takes it itself after a beat.
      //
      // The beat is not decoration: the player has just picked a corner and
      // needs a moment to look at the goal before the ball moves. Striking on
      // the same frame as the pick makes the save feel like it happened to
      // them rather than something they did.
      if (computerIsTaking()) {
        computerDelay -= STEP;
        if (computerDelay <= 0) {
          const input = decideShot(
            takerProfile,
            player,
            createRng(shotSeed(match.seed, match.shotIndex) ^ 0x5f3759df),
            computerShots
          );
          computerShots = [...computerShots, input];
          take(input);
        }
      }
    }

    // Boot meets ball at the end of the run-up.
    if (pending && match.phase === 'runup') {
      runUp += STEP;
      if (runUp >= RUN_UP_SECONDS) {
        const rng = createRng(shotSeed(match.seed, match.shotIndex));
            // A human keeper's pick overrides the computer's read entirely.
        // The sink matters here and not only in `advance`: the boot is emitted
        // as the flight is built, so leaving it off defaulted it to NO_EVENTS
        // and silently dropped the one event that starts every shot.
        flight = createFlight(
          pending.shot,
          keeper,
          rng,
          pending.keeperStartX,
          pending.dive,
          events
        );
        struckDive = pending.dive;
        pending = null;
        struckAt = clock;
        match = reduce(match, { type: 'STRIKE' });
      }
    }

    if (!flight) return;

    // Keep advancing after the outcome is settled. The result was decided at
    // the line and `advance` will not revisit it; this is the second in which
    // a save looks like a save rather than like a freeze frame.
    const settled = flight.outcome !== null;

    flight = advance(flight, STEP, events);
    trail = [...trail.slice(-(TRAIL_LENGTH - 1)), flight.ball.position];
    if (!settled && flight.outcome) {
      log.record({
        at: new Date().toISOString(),
        tuning,
        session,
        playerId: player.id,
        keeperId: keeper.id,
        viewId: camera.id,
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
        // The tap as it was made, not plan.chosen — that is already clamped to
        // what the keeper could reach, so logging it would say the same thing
        // as keeperHands and lose the only question worth asking: was the
        // corner they went for one they could actually get to?
        keeperDive: struckDive ? { x: struckDive.x, y: struckDive.y } : null,
        mode: match.mode,
        takerSide: match.taker,
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

    // Drained here and handed on, rather than fetched by whatever happens to
    // be looking: one list, one owner, and nothing left in it between frames.
    presentation.render(frameState(), events.drain());
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return {
    log,

    restart(mode: MatchMode, duelNames?: DuelNames): void {
      if (duelNames) {
        names = cleanNames(duelNames);
        remember({ duelNames: names });
      }
      match = initialMatch(Date.now() & 0x7fffffff, SHOTS_PER_ROUND, mode);
      flight = null;
      trail = [];
      pending = null;
      struckAt = null;
      choosing = null;
      summary = null;
      runUp = 0;
      settling = 0;
      keeperSim = idleKeeper();
      ballPosition = spotBall(PENALTY_DISTANCE);
      computerShots = [];
      computerDelay = COMPUTER_THINKS;
    },

    currentMode: () => match.mode,

    currentNames: () => [names[0], names[1]],

    stop(): void {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      input.destroy();
      presentation.destroy();
    },

    useView(id: string): void {
      // A camera change is not a package change: the same look from a different
      // place to stand, so nothing is torn down and rebuilt.
      camera = cameraFor(id);
      presentation.configure(camera, width, height);
      remember({ viewId: camera.id });
    },

    currentViewId: () => camera.id,

    setMuted(next: boolean): void {
      muted = next;
      presentation.setMuted(next);
      remember({ muted: next });
    },

    isMuted: () => muted,
  };
}
