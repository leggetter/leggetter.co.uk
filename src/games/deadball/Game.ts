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

import { BALL_RADIUS, GOAL_HEIGHT, GOAL_WIDTH, PENALTY_DISTANCE, STEP } from './core/units.ts';
export { STEP };
import type { Vec3 } from './core/vec3.ts';
import { createRng, shotSeed } from './core/rng.ts';
import { tuningFingerprint } from './core/tuning.ts';
import { resolveShot, spotBall, sweepAt, timingFromSweep } from './core/shot.ts';
import { advance, createFlight, type Flight } from './core/flight.ts';
import {
  cleanDiscipline,
  setPieceFor,
  type Discipline,
  type SetPiece,
} from './core/setpiece.ts';
import { buildWall, type Wall } from './core/wall.ts';
import type { Inbound, Side, Transport } from './net/Transport.ts';

/**
 * Playing somebody who is not in the room.
 *
 * The match stops being this client's to decide. The three places a local game
 * changes it - a dive, a shot, tapping through - send a message instead, and
 * the room says what happened. Everything else is unchanged: the same
 * reducer, the same physics, the same animation, driven from the same seed.
 */
interface Link {
  transport: Transport;
  /** Which seat this client is in. */
  side: Side;
  /** Which seat shoots first, so a match `taker` can be read as a side. */
  first: Side;
}
import { defaultStyleId, nextStyle, styleFor, STYLES } from './core/styles.ts';

/** 0..1 from a 0..100 attribute. */
const unit = (v: number): number => Math.max(0, Math.min(1, v / 100));

/**
 * How much less the aim strays on a free kick.
 *
 * The aim sigmas were tuned against a penalty: eleven metres, an open goal and
 * nothing in the way. The same numbers from twenty metres, with four people
 * across the half of the goal you want, read as a ball that goes wherever it
 * likes - which is exactly how it was reported.
 */
const FREE_KICK_AIM_EASE = 0.62;
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
  KitOverrides,
  KitSlot,
  Player,
  Shot,
  ShotInput,
} from './core/types.ts';
import { attachDragInput, type DragInput } from './input/drag.ts';
import { TAKERS, DEFAULT_TAKER_ID } from './content/takers.js';
import { SQUAD } from './content/players.js';
import { DEFAULT_SKY_ID } from './content/skies.js';
import {
  buildSquad,
  cleanColour,
  cleanPlayer,
  customOf,
  makeId,
  playerFor,
  MAX_CUSTOM,
  type SquadMember,
} from './core/squad.ts';
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
import { cleanNames, cleanTeam, type DuelNames } from './core/names.ts';
import { KEYS, type Settings, type Storage } from './storage/Storage.ts';
import { createShotLog, newSessionId, type ShotLog } from './telemetry/log.ts';
import { forMatch, summarise, summariseDuel, type FullTime } from './telemetry/analyse.ts';

/** Simulation step. Fixed so a shot is reproducible; see core/rng.ts. */


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
  /**
   * Start again in this mode.
   *
   * The pair is the two sides in scoreboard order, whoever they are: two
   * people in a duel, your team and theirs against the computer.
   */
  restart(mode: MatchMode, names?: DuelNames): void;
  currentMode(): MatchMode;
  /** What the two sides are called. Cleaned, so never empty. */
  currentNames(): DuelNames;

  /** Everybody available: the shipped squad plus anybody invented here. */
  squad(): SquadMember[];
  currentPlayerId(): string;
  /** Take the next penalties as somebody else. Remembered. */
  usePlayer(id: string): void;
  /**
   * Invent one. Returns the id it was given, which is derived from the name
   * and made unique, or null when there is no room for another.
   */
  addPlayer(draft: unknown): string | null;
  /** Only ever an invented one; the shipped squad is not editable here. */
  removePlayer(id: string): void;
  /** Your side's name against the computer. Not a person; a team. */
  currentTeam(): string;
  /** What the computer is called, for a screen that has to name it. */
  opponentName(): string;
  /**
   * What the computer is called when nobody has renamed it.
   *
   * Separate from `opponentName` so a form can offer it as a placeholder
   * without typing it into the field: an empty field means "whatever this
   * opponent is called", which is not the same answer once the opponent
   * changes.
   */
  defaultOpponentName(): string;
  /**
   * What the four strips have been set to, where anything has been.
   *
   * Only the keys somebody has changed. Absent means the derived default, so a
   * dialog showing these has to resolve them before it can paint a swatch -
   * which is the point: the default moves when the squad player does.
   */
  kitOverrides(): KitOverrides;
  /** Set one strip, or hand back the default for it by passing null. */
  setKit(slot: KitSlot, colour: string | null): void;
  /** All six back to their defaults. */
  resetKits(): void;
  /** The shot log for this device. Nothing in it leaves the machine. */
  log: ShotLog;
  /** Swap the camera at runtime. Phase 2 hangs a control off this. */
  useView(id: string): void;
  currentViewId(): string;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Day, dusk or night. Remembered, like the camera. */
  useSky(id: string): void;
  currentSkyId(): string;
  useDiscipline(id: string): void;
  currentDiscipline(): string;
  /** Hand the match over to a room. See docs/deadball-two-devices.md. */
  connect(transport: Transport, side: Side, first: Side, teams: DuelNames): void;
  disconnect(): void;
  connectedAs(): Side | null;
  /** A read-only look at where the match is, for the console. */
  snapshot(): {
    mode: string;
    phase: string;
    taker: 0 | 1;
    shotIndex: number;
    scores: [number, number];
    names: [string, string];
    connectedAs: Side | null;
    yourShot: boolean;
    yourGoal: boolean;
    outcomes: string[];
  };
  /**
   * Tell me when this device's turn starts or ends.
   *
   * The page draws HTML *over* the canvas - the shot-style button, the camera
   * switcher - and none of it had any idea whose turn it was, because the page
   * has no tick of its own and nothing to subscribe to. Gating the drag made
   * the pitch inert and left a live shot-style control sitting on top of it,
   * on the screen of somebody who could not take a shot.
   *
   * One callback rather than a second animation loop in the page: this one is
   * already running, and the listener fires only when the answer changes.
   */
  onTurn(listener: (yours: boolean) => void): () => void;
  /** A kick has been taken and the shootout is not over. */
  inProgress(): boolean;
  kicksTaken(): number;
  /** Cycle to the next way of striking it, and what that is now. */
  cycleStyle(): string;
  currentStyle(): { id: string; label: string; hint: string };
}

export async function startGame(options: GameOptions): Promise<Game> {
  const { canvas, keeper, storage } = options;

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
  let teamName: string = cleanTeam(settings.teamName);

  // Who the computer is when it takes its turn. A profile rather than a
  // difficulty slider, so it has a name to put on the scoreboard.
  const takerProfile: TakerProfile =
    ((TAKERS as TakerProfile[]).find((t) => t.id === DEFAULT_TAKER_ID) ??
      (TAKERS as TakerProfile[])[0]) as TakerProfile;

  // What you have decided to call them, falling back to the profile's own
  // name. The fallback is the profile rather than a placeholder because the
  // profile is the real name: Phase 4.5 swaps in teams with their own
  // abilities, and a side nobody renamed should arrive called whatever it is.
  let opponentTeam: string = cleanTeam(settings.opponentTeam, takerProfile.name);

  /**
   * What the strips have been set to, if anything.
   *
   * Sieved on the way in rather than trusted: a key holding something a canvas
   * could not parse is dropped entirely, which puts it back to meaning "use
   * the default" instead of leaving a value nothing downstream can use. The
   * presentation cleans again at the point of drawing, because that is the
   * last place a bad colour can still be caught; this exists so the dialog is
   * never showing a swatch the pitch disagrees with.
   */
  let kits: KitOverrides = onlyColours(settings.kits);

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

  let skyId = settings.skyId ?? DEFAULT_SKY_ID;
  presentation.setSky(skyId);

  // The shipped squad plus anybody invented here. Rebuilt rather than mutated
  // whenever it changes, so there is one place ids are made unique.
  let squad: SquadMember[] = buildSquad(
    SQUAD,
    (await storage.get<unknown>(KEYS.customSquad)) ?? []
  );
  // `player` is no longer a constructor argument: it changes while the game is
  // running, which is the whole point of Phase 4.
  let player: Player = playerFor(squad, settings.playerId ?? options.player?.id);

  const saveCustom = (): void => {
    void storage.set(KEYS.customSquad, customOf(squad));
  };

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

  /**
   * Where this device committed to diving, in a game it does not own.
   *
   * On one device the reducer remembers this: `SET_DIVE` puts it on the match
   * and the reticle keeps being drawn from there. In a room it cannot, because
   * `SET_DIVE` also moves the phase on, and a client that moves its own phase
   * is a client that has stopped taking the room's word for anything.
   *
   * So the pick was sent and then forgotten, which is what the keeper saw:
   * tap a corner, watch the crosshair vanish, and read "pick your corner" on a
   * screen that had already taken your answer. The natural response is to tap
   * again, and the room - correctly - keeps the first one. People were
   * defending corners they did not think they had chosen.
   *
   * Safe to hold here and nowhere else: this is the keeper's own device, the
   * taker's client never calls `commitDive`, and `adopt` keeps the room's
   * redaction intact for everybody else.
   */
  let committed: { at: Dive; forShot: number } | null = null;

  /** Whether a pointer is currently held down on the pitch. */
  let pressing = false;

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

  let discipline: Discipline = cleanDiscipline(settings.discipline);
  let link: Link | null = null;
  /** The other side is connected. Told by the room, not guessed at here. */
  let together = true;

  /** Whose seat is taking this one. */
  const takingSide = (): Side =>
    link ? ((match.taker === 0 ? link.first : 1 - link.first) as Side) : 0;

  /** It is this client's turn to shoot. */
  const myShot = (): boolean => !link || takingSide() === link.side;

  /** It is this client's turn in goal. */
  const myGoal = (): boolean => !link || takingSide() !== link.side;

  /**
   * Whether this device may touch the pitch at all right now.
   *
   * On one device the answer is always yes: whoever is holding it is whoever
   * is playing, and that is the whole premise of a hotseat duel.
   *
   * On two it is not, and until now nothing said so. Both clients accepted a
   * drag through every phase, so the waiting player could place a reticle,
   * wind up a power dial and release it into nothing - the room refuses the
   * message, correctly, but only after the screen has spent several seconds
   * behaving exactly like it was their turn. Reported as "quite confusing
   * across the two players", which is generous.
   *
   * Between shots both may tap, because "next" is not a turn - it is either
   * of them saying they have seen the result.
   */
  const myTurn = (): boolean => {
    if (!link) return true;
    if (match.phase === 'keeping') return myGoal();
    if (match.phase === 'ready') return myShot();
    return true;
  };

  /** Something to hang an idempotency key off, so a retry is not a second one. */
  let stamped = 0;
  const stamp = (what: string): string => `${what}:${match.shotIndex}:${stamped++}`;
  let styleId: string = STYLES.some((s) => s.id === settings.styleId)
    ? (settings.styleId as string)
    : defaultStyleId();
  let piece: SetPiece = setPieceFor(
    match.seed,
    match.shotIndex,
    discipline,
    match.mode !== 'solo'
  );
  let wall: Wall = buildWall(piece);
  let ballPosition = piece.origin;

  /**
   * What the room says, applied here.
   *
   * Two kinds of message matter. A `shot` is set up exactly as a local one is
   * and animated by the machinery that already exists - from the room's seed,
   * so both clients watch the same flight rather than each watching their own.
   * A `state` is the truth about the match, adopted whenever there is nothing
   * mid-air to interrupt.
   */
  function follow(message: Inbound): void {
    if (!link) return;

    if (message.kind === 'shot') {
      const piece = setPieceFor(message.seed, match.shotIndex, discipline, true);
      const taker =
        (message.taker === player.id ? player : squadOf(message.taker)) ?? player;
      const shot = resolveShot(message.input, taker, createRng(shotSeed(message.seed, match.shotIndex)), {
        origin: piece.origin,
        loft: piece.penalty ? 0 : unit(taker.dip),
        aimEase: piece.penalty ? 1 : FREE_KICK_AIM_EASE,
      });
      pending = { shot, keeperStartX: keeperSim.state.hands.x, dive: message.dive };
      runUp = 0;
      match = reduce(match, { type: 'TAKE_SHOT' });
      return;
    }

    if (message.kind !== 'state') return;
    together = message.together;
    names = [message.teams[0].name || names[0], message.teams[1].name || names[1]];

    /*
      Not while the ball is on its way.

      The room sends the resolved state in the *same reply* as the shot it
      belongs to - it has finished the kick before the client has started
      drawing it - so applying it on arrival jumps straight to the result and
      the taker never sees their own penalty. Held instead, and applied when
      the flight lands.

      "On its way" starts at `pending`, not at `flight`: there is a run-up
      first, and a shot that is still being walked up to is every bit as
      interrupted by a scoreline as one in mid-air.
    */
    if (pending || (flight && !flight.outcome)) {
      waiting = message.match as MatchState;
      return;
    }
    adopt(message.match as MatchState);
  }

  /** Whatever the room last said, while this client was busy watching a ball. */
  let waiting: MatchState | null = null;

  /**
   * Take the room's word for it.
   *
   * The dive is this client's own business: the room redacts it from every
   * state it sends, because the taker must never see it, and the keeper knows
   * where they pointed because they pointed there.
   */
  function adopt(theirs: MatchState): void {
    /*
      A new kick means putting the pitch back to the start of one.

      The local NEXT path has always done this - clear the flight, the trail,
      the run-up, and stand the keeper back up - and the room-driven path did
      none of it. It swapped the match state and left every bit of animation
      where the last kick had finished.

      So the second kick of a two-device game was set up over the wreckage of
      the first: a keeper lying flat on the grass where they had dived, a taker
      fading out, no ball on the spot, and "pick your corner" written across
      the top of it. Reported as "a strange state", which is putting it kindly
      - it asks somebody to choose a dive while showing them a dive they have
      already made.

      Only on a change of kick. `adopt` runs for every state the room sends,
      several times per kick, and resetting on all of them would wipe the
      flight mid-ball.
    */
    const newKick = theirs.shotIndex !== match.shotIndex;
    // Adopted BEFORE the reset, because `setUpKick` reads `match.shotIndex` to
    // work out which free-kick spot this is. Resetting first set the pitch up
    // for the kick that had just finished.
    match = { ...theirs, dive: match.dive };
    if (newKick) {
      flight = null;
      trail = [];
      struckAt = null;
      runUp = 0;
      settling = 0;
      choosing = null;
      keeperSim = idleKeeper();
      setUpKick();
    }
  }

  /** Somebody on this device's squad, by id. */
  const squadOf = (id: string): Player | undefined => squad.find((p) => p.id === id);

  /** Everything a shootout starts from. */
  const resetMatch = (mode: MatchMode): void => {
    match = initialMatch(Date.now() & 0x7fffffff, SHOTS_PER_ROUND, mode, discipline);
    flight = null;
    trail = [];
    pending = null;
    struckAt = null;
    choosing = null;
    committed = null;
    summary = null;
    runUp = 0;
    settling = 0;
    keeperSim = idleKeeper();
    setUpKick();
    computerShots = [];
    computerDelay = COMPUTER_THINKS;
  };

  /**
   * A new kick: where the ball is and who is standing in front of it.
   *
   * One place, called wherever the ball used to be put back on the penalty
   * spot. Four copies of `spotBall(PENALTY_DISTANCE)` were fine while there
   * was one place to put it; with three spots and a wall they would drift.
   */
  const setUpKick = (): void => {
    // Two sides means kicks come in pairs, and both halves of a pair face the
    // same one. See `setPieceFor`.
    piece = setPieceFor(match.seed, match.shotIndex, discipline, match.mode !== 'solo');
    wall = buildWall(piece);
    ballPosition = piece.origin;
  };

  /** This device's pick for the kick in front of it, or null. */
  const mineThisShot = (): { at: Dive; forShot: number } | null =>
    committed?.forShot === match.shotIndex ? committed : null;

  const frameState = (): FrameState => {
  const mine = mineThisShot();
  return ({
    phase: match.phase,
    ball: flight
      ? flight.ball
      : { position: ballPosition, velocity: { x: 0, y: 0, z: 0 }, spin: { x: 0, y: 0, z: 0 } },
    keeper: flight ? flight.keeper.state : keeperSim.state,
    keeperProfile: keeper,
    player,
    elapsed: flight?.elapsed ?? 0,
    spot: piece.origin,
    piece,
    wall,
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
    remote: link !== null,
    yourShot: myShot(),
    yourGoal: myGoal(),
    together,
    scores: match.scores,
    names: match.mode === 'versus' ? [teamName, opponentTeam] : names,
    kits,
    suddenDeath: inSuddenDeath(match),
    // Hidden from the taker on purpose: the dive is only ever drawn while its
    // owner is choosing it, never once the device has changed hands.
    /**
     * The mark stays up for the rest of the kick, in a room.
     *
     * Reported exactly: "I clicked, saw a crosshair appear briefly, and then
     * it said Waiting for TP1. I didn't really realise I'd made my selection."
     * Committing moves the phase on within a frame, and the mark was nulled
     * the instant it did, so the only feedback for the single most important
     * decision in the game was a crosshair that flashed and vanished.
     *
     * Holding it does not leak anything. The rule it looks like it breaks -
     * "never once the device has changed hands" - is about a hotseat duel,
     * where the *taker* is about to pick up this same phone. Across two
     * devices nobody else is ever going to look at this screen, and the room
     * redacts the dive from the taker's copy regardless.
     *
     * Tied to a shot index so last kick's corner cannot bleed into this one.
     */
    dive:
      match.phase === 'keeping'
        ? (match.dive ?? mine?.at ?? null)
        : link
          ? (mine?.at ?? null)
          : null,
    choosing: match.phase === 'keeping' ? choosing : null,
    pressing,
    /** This device has picked and is waiting. Drives the wording, not the mark. */
    locked: match.phase === 'keeping' && mine !== null,
    aiming,
    summary,
    timingMarker: aiming ? sweepMarker : null,
  });
  };

  /** True when this shot belongs to the computer and it has not gone yet. */
  const computerIsTaking = (): boolean =>
    match.mode === 'versus' && match.taker === 1 && match.phase === 'ready';

  function take(shape: ShotInput): void {
    if (match.phase !== 'ready') return;
    // Stamped here rather than in the view, for the same reason `timing` is:
    // the gesture says where and how hard, the game owns which ball was hit.
    const input: ShotInput = { ...shape, style: styleId };
    lastInput = input;

    // One stream per shot, drawn from the match seed, so a shot can be
    // reproduced from (matchSeed, shotIndex) alone.
    const rng = createRng(shotSeed(match.seed, match.shotIndex));

    // Pressure rises on the last penalty, which is what composure reads.
    const pressure = match.shotIndex >= match.shotsTotal - 1 ? 1 : 0;
    const shot = resolveShot(input, player, rng, {
      origin: piece.origin,
      // Free kicks only. `dip` decides whether this player can go over a wall
      // at all, and the aim is eased because the sigmas were tuned against a
      // penalty with a clear sight of an open goal from eleven metres.
      loft: piece.penalty ? 0 : unit(player.dip),
      aimEase: piece.penalty ? 1 : FREE_KICK_AIM_EASE,
      pressure,
    });

    // The shot is decided here, but the ball does not move until the taker
    // gets to it. Captured at release: wherever the shuffle had reached is
    // where the dive begins, and the flight records it or a replay would
    // differ from the shot it replays.
    if (link) {
      // Not this client's to decide. The room resolves it and sends the shot
      // back to both sides, and *this* client animates it from that message
      // like the other one does - so the two are watching the same thing
      // rather than each watching their own version of it.
      aiming = null;
      if (!myShot()) return;
      link.transport.send({
        kind: 'shoot',
        input,
        taker: player.id,
        outcome: 'goal',
        idempotency: stamp('shoot'),
      });
      return;
    }
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
      match = reduce(match, {
        type: 'START',
        seed: Date.now() & 0x7fffffff,
        shots: SHOTS_PER_ROUND,
        discipline,
      });
      summary = null;
      choosing = null;
      computerShots = [];
      computerDelay = COMPUTER_THINKS;
    } else if (match.phase === 'resolved' && holdRemaining <= 0) {
      if (link) {
        // Either side may tap through; the room applies it once.
        link.transport.send({ kind: 'next' });
        return;
      }
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
    setUpKick();
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
      // Unlocking audio first, deliberately: a browser only allows it on a
      // press, and the player who is waiting presses the screen too. Losing
      // the sound for their whole first turn because they were not the one
      // kicking would be a worse bug than the one this guard fixes.
      if (!myTurn()) return;
      pressing = true;
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
      if (!myTurn()) return;
      if (match.phase === 'keeping') {
        choosing = presentation.diveFromPointer(gesture.current);
        return;
      }
      if (match.phase === 'ready') aiming = intent(gesture);
    },

    onRelease: (gesture: DragGesture) => {
      pressing = false;
      if (!myTurn()) return;
      if (match.phase === 'keeping') {
        commitDive(gesture.current);
        return;
      }
      if (match.phase === 'ready') take(intent(gesture));
      else aiming = null;
    },

    /**
     * Follow the mouse while the keeper is deciding.
     *
     * The crosshair used to appear only once the button was down, so picking a
     * corner was a click into the dark - you found out where you had aimed by
     * having already aimed there. A mark that follows the pointer makes it an
     * aim rather than a guess.
     *
     * Stops the moment the pick is in: the committed mark is drawn from
     * `dive`, and a second crosshair wandering around beside it would suggest
     * the choice was still open.
     */
    onHover: (point) => {
      if (!point || match.phase !== 'keeping' || !myTurn() || mineThisShot() !== null) {
        choosing = null;
        return;
      }
      const spot = presentation.diveFromPointer(point);
      choosing = spot && plausibleDive(spot) ? spot : null;
    },

    onClick: (point) => {
      pressing = false;
      // A tap is enough to pick a dive, and is the only thing that moves the
      // handover on. Everywhere else it is "next".
      if (match.phase === 'keeping') {
        if (myTurn()) commitDive(point);
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
  /**
   * Somewhere a keeper would plausibly go.
   *
   * A metre and a half of slack either side and a metre over the bar: far
   * enough that aiming at a corner and missing it still reads as that corner,
   * close enough that the crowd is not a dive. Shared by the hover mark and
   * the commit, so the crosshair appears in exactly the places a click counts
   * - which is the honest way to teach the rule, rather than explaining it.
   */
  const SLACK = 1.5;
  const plausibleDive = (spot: Dive): boolean =>
    Math.abs(spot.x) <= GOAL_WIDTH / 2 + SLACK && spot.y <= GOAL_HEIGHT + 1 && spot.y >= -0.5;

  function commitDive(point: DragPoint): void {
    const spot = presentation.diveFromPointer(point) ?? { x: 0, y: 1 };
    /*
      A pick has to be somewhere a keeper would plausibly go.

      It used to clamp anything, anywhere, to the nearest legal corner - so a
      click on the crowd, the grass or the hoardings silently became a dive.
      That matters more than it sounds, because of how a person arrives at this
      screen: they alt-tab to the browser, and their first click is the one
      that focuses the window. Chrome delivers it to the page anyway. So the
      single most important decision of the kick was routinely made by a click
      that was only ever meant to say "this window, please".

      A metre and a half of slack either side, and a metre over the bar: far
      enough that aiming at a corner and missing it still reads as that corner,
      close enough that the crowd is not a dive.
    */
    if (!plausibleDive(spot)) {
      choosing = null;
      return;
    }
    const dive = {
      x: clamp(spot.x, -GOAL_WIDTH / 2, GOAL_WIDTH / 2),
      y: clamp(spot.y, 0.1, GOAL_HEIGHT),
    };
    choosing = null;
    if (link) {
      // Sent, not applied. It goes to the room and stays there; this client
      // learns only that it was accepted.
      if (myGoal()) {
        committed = { at: dive, forShot: match.shotIndex };
        link.transport.send({ kind: 'dive', at: dive, idempotency: stamp('dive') });
      }
      return;
    }
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

  /** Whose turn the page was last told about. Starts unset, so the first
   *  frame always announces. */
  let announcedTurn: boolean | null = null;
  let turnListeners: ((yours: boolean) => void)[] = [];
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
          events,
          // Captured when the flight is built rather than read from the closure
          // as it runs: the kick is set up again the moment this one resolves,
          // and a ball still in the air must be judged against the wall it was
          // actually struck past.
          wall
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
      // The ball has landed, so whatever the room said while it was in the air
      // can be applied now. Its answer wins over the one worked out here - and
      // if the two differ, the score was never this client's to decide.
      if (waiting) {
        adopt(waiting);
        waiting = null;
      }
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

    const yours = myTurn();
    if (yours !== announcedTurn) {
      announcedTurn = yours;
      for (const listener of turnListeners) listener(yours);
    }
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return {
    log,

    restart(mode: MatchMode, typed?: DuelNames): void {
      if (typed && mode === 'versus') {
        // Both sides, in the order they sit on the scoreboard: yours, then
        // theirs. The same pair a duel sends, because `versus` has two sides
        // too - they are teams rather than people.
        teamName = cleanTeam(typed[0]);
        opponentTeam = cleanTeam(typed[1], takerProfile.name);
        // Nothing typed stores nothing, rather than storing the profile's name
        // as though it had been chosen. Otherwise leaving the field alone once
        // would freeze today's name onto tomorrow's opponent, and Phase 4.5 is
        // a file full of teams with names of their own.
        remember({
          teamName,
          opponentTeam: opponentTeam === takerProfile.name ? undefined : opponentTeam,
        });
      } else if (typed) {
        names = cleanNames(typed);
        remember({ duelNames: names });
      }
      resetMatch(mode);
    },

    currentMode: () => match.mode,

    currentNames: () => [names[0], names[1]],

    currentTeam: () => teamName,

    opponentName: () => opponentTeam,

    defaultOpponentName: () => takerProfile.name,

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

    useSky(id: string): void {
      skyId = id;
      presentation.setSky(id);
      remember({ skyId: id });
    },

    currentSkyId: () => skyId,

    /**
     * Penalties, free kicks, or both.
     *
     * Stores the choice and stops there. It used to restart, because changing
     * it mid-shootout leaves a scoreboard that cannot say what it counted -
     * but the only way in is now the dialog that starts a game, and that
     * restarts a line later. Two restarts is one too many.
     */
    useDiscipline(id: string): void {
      const next = cleanDiscipline(id);
      if (next === discipline) return;
      discipline = next;
      remember({ discipline: next });
    },

    currentDiscipline: () => discipline,

    /**
     * Hand the match over to a room.
     *
     * After this the client stops deciding anything: a dive, a shot and a tap
     * are sent, and what comes back is what happened. The reducer, the physics
     * and the animation are all unchanged - they are driven from the room's
     * seed rather than from this device's.
     */
    connect(transport: Transport, side: Side, first: Side, teams: DuelNames): void {
      link = { transport, side, first };
      // Named `teams` rather than `names`: the parameter was called `names`
      // and shadowed the closure variable of the same name, so assigning to it
      // set the argument and both sides stayed Player 1 and Player 2.
      names = cleanNames(teams);
      resetMatch('remote');
      transport.onMessage((message) => follow(message));
      // Both, and they answer different questions. The room says whether it
      // has heard from the other seat; the transport says whether *this*
      // client has heard from anything at all - which is the only thing left
      // to go on when the room itself has gone away.
      transport.onConnection((state) => {
        if (state === 'alone' || state === 'closed') together = false;
        if (state === 'together') together = true;
      });
    },

    disconnect(): void {
      link?.transport.close();
      link = null;
      resetMatch('solo');
    },

    /** Which seat this client is in, or null when playing locally. */
    connectedAs: () => link?.side ?? null,

    onTurn(listener) {
      turnListeners.push(listener);
      // Answer straight away rather than leaving the caller to guess until
      // something changes - the first turn is the one being got wrong.
      listener(myTurn());
      return () => {
        turnListeners = turnListeners.filter((l) => l !== listener);
      };
    },

    /**
     * A read-only look at where the match is.
     *
     * For the console and for checking a two-device game from outside the
     * page, which cannot be done by reading a canvas. Same justification as
     * the log handle in `main.ts`, and the same shape: it hands back a copy
     * and there is no way to change anything through it.
     */
    snapshot: () => ({
      mode: match.mode,
      phase: match.phase,
      taker: match.taker,
      shotIndex: match.shotIndex,
      scores: [match.scores[0], match.scores[1]] as [number, number],
      names: [names[0], names[1]] as [string, string],
      connectedAs: link?.side ?? null,
      // `match.taker` is a side of the *tie*, not a seat. Which seat it means
      // depends on what the coin said, so a client cannot work out whether it
      // is shooting without knowing that too - and the screen has to say so.
      yourShot: myShot(),
      yourGoal: myGoal(),
      outcomes: [...match.outcomes],
    }),

    /**
     * There is a shootout going on that starting a new one would end.
     *
     * Not `shotIndex > 0`. That only moves on `NEXT`, which is the tap after a
     * kick has finished - so from the moment the ball was struck until the
     * moment somebody tapped through, a shootout that had visibly been played
     * reported itself as untouched, and switching mode threw it away without
     * asking. Reported from play, and the window is every kick.
     *
     * A shootout has started once the ball has been struck, whether or not
     * anybody has read the result yet. Before that there is nothing to lose;
     * after `complete` the thing on screen is a result rather than a game.
     */
    inProgress: () =>
      match.phase !== 'complete' &&
      (match.outcomes.length > 0 || match.phase === 'runup' || match.phase === 'flight' || match.phase === 'resolved'),

    /**
     * How many kicks have been taken, for saying what is about to be lost.
     *
     * Outcomes rather than `shotIndex`, for the same reason: a kick has been
     * taken once it has an outcome, not once somebody has tapped past it.
     */
    kicksTaken: () => match.outcomes.length,

    cycleStyle(): string {
      styleId = nextStyle(styleId);
      remember({ styleId });
      return styleId;
    },

    currentStyle() {
      const style = styleFor(styleId);
      return { id: style.id, label: style.label, hint: style.hint };
    },

    squad: () => squad.map((entry) => ({ ...entry })),

    currentPlayerId: () => player.id,

    usePlayer(id: string): void {
      player = playerFor(squad, id);
      remember({ playerId: player.id });
    },

    addPlayer(draft: unknown): string | null {
      if (customOf(squad).length >= MAX_CUSTOM) return null;
      const source = (draft ?? {}) as Record<string, unknown>;
      const id = makeId(String(source.name ?? ''), squad.map((p) => p.id));
      squad = [...squad, cleanPlayer(source, id, true)];
      saveCustom();
      return id;
    },

    removePlayer(id: string): void {
      const target = squad.find((p) => p.id === id);
      // The shipped squad is content, not data. Deleting from it here would
      // leave the game disagreeing with the file it was read from.
      if (!target?.custom) return;
      squad = squad.filter((p) => p.id !== id);
      saveCustom();
      // Whoever was taking them has just been deleted, so somebody else is.
      if (player.id === id) {
        player = playerFor(squad, undefined);
        remember({ playerId: player.id });
      }
    },

    kitOverrides: () => ({ ...kits }),

    setKit(slot: KitSlot, colour: string | null): void {
      // A blank is a clear, not a colour. Otherwise the empty string a form
      // can hand back would be stored as though somebody had chosen it, and
      // every reader downstream would have to know that empty means default.
      const clean = colour === null ? null : cleanColour(colour, '');
      const next = { ...kits };
      if (clean) next[slot] = clean;
      else delete next[slot];
      kits = next;
      remember({ kits });
    },

    resetKits(): void {
      kits = {};
      remember({ kits });
    },

    setMuted(next: boolean): void {
      muted = next;
      presentation.setMuted(next);
      remember({ muted: next });
    },

    isMuted: () => muted,
  };
}

/**
 * Whatever is in the store, as kit settings: the keys holding a colour, and
 * nothing else.
 *
 * A key that survives is one somebody set. A key that does not is one nobody
 * did, which is the same thing as a key that was never there - so junk and
 * absence land on the same answer rather than on two different ones.
 */
function onlyColours(stored: unknown): KitOverrides {
  const source = (stored ?? {}) as Record<string, unknown>;
  const kits: KitOverrides = {};
  for (const slot of ['own', 'ownTrim', 'other', 'otherTrim', 'ownKeeper', 'otherKeeper'] as const) {
    const colour = cleanColour(source[slot], '');
    if (colour) kits[slot] = colour;
  }
  return kits;
}
