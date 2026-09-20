/**
 * The data that crosses every boundary in the game.
 *
 * Nothing here is a class and nothing here has a method. Views read these,
 * storage serializes these, and the two-player transport will send these.
 */

import type { Vec3 } from './vec3.ts';

/**
 * What the player did, before any attribute or nerve is applied.
 *
 * This is the two-player network payload: this plus a seed reproduces a shot
 * exactly, which is a few dozen bytes instead of a trajectory.
 */
export interface ShotInput {
  /** Target on the goal plane. x is -1..1 lateral, y is 0..1 height. */
  aim: { x: number; y: number };
  /** 0..1, mapped onto the strike speed range. */
  power: number;
  /** -1..1. Negative bends left as the taker sees it. */
  curve: number;
  /** 0..1. Below 0.5 is backspin and floats, above is topspin and dips. */
  lift: number;
  /**
   * How badly the strike was timed, and in which direction. 0 is a clean
   * contact; negative drags the shot left of where it was aimed, positive
   * pushes it right, and either way it sprays and loses some pace.
   *
   * Signed rather than a plain quality score so the mistake is learnable: a
   * player can see they keep releasing early and pulling it, instead of just
   * being told the shot went somewhere random.
   */
  timing: number;
}

/** What the simulation runs, after `resolveShot` has applied the player. */
export interface Shot {
  origin: Vec3;
  velocity: Vec3;
  /** Spin axis times angular velocity, rad/s. */
  spin: Vec3;
  /**
   * Where on the goal plane the ball was actually struck toward, before spin
   * bends it anywhere. This is what a keeper reads off the taker's body shape,
   * and it is why curve beats an anticipating keeper: they read the line the
   * boot sent it on, and Magnus takes it somewhere else.
   */
  aimPoint: { x: number; y: number };
}

export interface BallState {
  position: Vec3;
  velocity: Vec3;
  spin: Vec3;
}

export type Outcome =
  | 'goal'
  | 'saved'
  | 'post'
  | 'bar'
  | 'wide'
  | 'over'
  /** Never reached the line. A shot too weak to get there, not a miss. */
  | 'short'
  /** Stopped by the free kick wall. Unreachable until Phase 3. */
  | 'blocked';

export interface Player {
  id: string;
  name: string;
  /** All 0..100, the convention anyone who has played a football game knows. */
  power: number;
  accuracy: number;
  curve: number;
  composure: number;
  foot: 'left' | 'right';
  colors: { kit: string; trim: string };
}

/**
 * The four strips, when somebody has said what they should be.
 *
 * Overrides, never replacements. Every key is optional and absent means "work
 * it out" - your side from the roster player, theirs from the away colour, and
 * a keeper strip each. That is the same rule `opponentTeam` follows and it is
 * there for the same reason: Phase 4.5 brings AI teams with identities of
 * their own, and a colour stored today must not freeze onto one of them. A
 * blank must never win, which is why these are absent rather than empty.
 *
 * Six keys rather than eight. A keeper's trim comes off the lightness of their
 * own shirt, because eight colour pickers in one dialog is a paint program.
 */
export interface KitOverrides {
  /** Your outfield shirt. Defaults to the roster player's. */
  own?: string;
  /** Your outfield shorts. Defaults to the roster player's trim. */
  ownTrim?: string;
  /** Their outfield shirt. Defaults to the away colour. */
  other?: string;
  /** Their outfield shorts. Defaults to whatever yours are not. */
  otherTrim?: string;
  /** Your keeper's shirt. */
  ownKeeper?: string;
  /** Their keeper's shirt. */
  otherKeeper?: string;
}

/** Which of the six a setting is for. */
export type KitSlot = keyof KitOverrides;

/**
 * How a keeper decided to go, on this shot.
 *
 * A penalty is in the air for about 450 ms and a corner is more than a dive
 * away, so a keeper who waits to see the ball has already lost. Real ones
 * commit at or before contact, off the run-up and the plant foot. Reacting is
 * the exception, not the default, and modelling it the other way round is why
 * the keeper looked like it was always waiting.
 */
export type KeeperStyle =
  /** A person picked the corner. No read, no guess: exactly as good as they are. */
  | 'human'
  /** Picks a side before the ball is struck and goes, seeing nothing. */
  | 'guess'
  /** Commits at contact, reading the taker's body shape. */
  | 'anticipate'
  /** Holds, watches the ball, and goes late. Works only on a slow shot. */
  | 'react';

export interface KeeperProfile {
  id: string;
  name: string;
  /** How long before a reacting keeper moves at all. 180 sharp, 420 slow. */
  reactionMs: number;
  /** Lateral hand speed once committed, m/s. */
  diveSpeed: number;
  /** Radius the hands cover, m. */
  reach: number;
  /** 0..1 share of shots it simply guesses on. */
  guessBias: number;
  /** 0..1 share it commits at contact on. Whatever is left over, it reacts. */
  anticipation: number;
  /** 0..1 quality of the read, whether off body shape or off the ball. */
  readAccuracy: number;
}

export interface KeeperState {
  /**
   * Where along the line the feet are planted.
   *
   * Separate from the hands because the two move for different reasons. Idling,
   * the whole keeper steps sideways and stance, body and hands travel together.
   * Diving, the feet stay put and the hands go; the body trails between them.
   * Deriving the body from the hands alone made an idling keeper lean from side
   * to side like a pendulum instead of moving along the line.
   */
  stance: number;
  /** Where the hands are now. */
  hands: Vec3;
  /**
   * Torso and trailing legs. Lags well behind the hands, so a keeper at full
   * stretch still occupies the middle of the goal for part of the flight.
   *
   * Modelling the keeper as a single point of hands made a slow ball down the
   * middle unsaveable the moment they committed either way, which made
   * deliberately scuffing it the best strategy in the game.
   */
  body: Vec3;
  /** Where the hands are heading, or null while still standing. */
  target: Vec3 | null;
  /** True once a dive has been committed to, guessed or read. */
  committed: boolean;
  /**
   * How far through landing, 0 still in the air and 1 flat on the turf.
   *
   * Only moves once the shot is settled. Bringing the hands down on their own
   * left the keeper with its gloves on the grass and its body still up in the
   * air, which is not a landing, it is a hover.
   */
  landed: number;
}

/** Why a shot stopped. Rules turns this into an Outcome. */
export interface Impact {
  kind: 'crossed' | 'frame' | 'wide' | 'over' | 'timeout';
  /** Ball position at the moment it stopped. */
  at: Vec3;
  /** Which part of the frame, when kind is 'frame'. */
  frame?: 'post' | 'bar';
}

/**
 * A read-only snapshot handed to the view once per rendered frame. The view
 * gets no reference to the match or the simulation, which is what stops a
 * renderer from ever being able to change the result of a shot.
 */
export interface FrameState {
  phase: MatchPhase;
  ball: BallState;
  keeper: KeeperState;
  keeperProfile: KeeperProfile;
  player: Player;
  /** Seconds since the ball was struck, 0 while aiming. */
  elapsed: number;
  /** Where this penalty is being taken from. Varies once free kicks land. */
  spot: Vec3;
  /**
   * Recent ball positions, oldest first. Drawn as a trail.
   *
   * This exists so the ball can be drawn at its true size. It used to be
   * inflated with distance to stay followable, which made it overlap a
   * crossbar it had cleared by seven centimeters and read as a frame hit that
   * the rules, correctly, had not called.
   */
  trail: Vec3[];
  /** Run-up progress, 0 to 1. Sits at 1 after contact so the taker stays put. */
  runUp: number;
  /**
   * Seconds since the game started, advancing on simulation steps.
   *
   * Presentation only: idle animation needs a clock that keeps running when
   * nothing is happening, and nothing in core/ reads this. It ticks on
   * simulation steps rather than frames so a breath is the same length on a
   * 60 Hz laptop and a 120 Hz phone.
   */
  clock: number;
  /**
   * Seconds since the boot met the ball, or 0 before it has. Unlike `elapsed`
   * this keeps running after the shot resolves, which is what a follow-through
   * needs in order to settle instead of freezing where the ball left it.
   */
  sinceStrike: number;
  shotIndex: number;
  shotsTotal: number;
  score: number;
  outcomes: Outcome[];
  /** 'solo' or 'duel'. A duel is two people on one device. */
  mode: string;
  /** Duel: which side is taking this one. */
  taker: 0 | 1;
  /** Duel: whoever is not taking it. */
  keeperSide: 0 | 1;
  /** Duel: goals each. */
  scores: [number, number];
  /** Duel: what to call each side. Never reaches the simulation or the log. */
  names: [string, string];
  /**
   * What the four strips have been set to, where anything has been.
   *
   * Optional because absent is the normal state and means the derived
   * defaults. Presentation, like `player.colors`: nothing here can change an
   * outcome and the simulation has never known what anybody is wearing.
   */
  kits?: KitOverrides;
  /** Duel: the regulation five each are gone and nobody has won yet. */
  suddenDeath: boolean;
  /** Duel: where the keeper has committed, once they have. */
  dive: Dive | null;
  /** Duel: where the keeper is pointing while they choose. */
  choosing: Dive | null;
  lastOutcome: Outcome | null;
  /** Live aim while a drag is in progress, for the preview. */
  aiming: ShotInput | null;
  /**
   * What the shot log knows, computed once when the shootout ends rather than
   * every frame. Typed loosely here because core/ must not import telemetry:
   * the simulation has no business knowing that a log exists.
   */
  summary: unknown | null;
  /**
   * Where the timing marker is right now, -1 to 1, or null when not aiming.
   * Raw sweep position rather than the derived penalty, because this is what
   * gets drawn and the player needs to see the thing they are reacting to.
   */
  timingMarker: number | null;
}

/** Where a human keeper has chosen to dive, on the plane of the goal. */
export interface Dive {
  /** Meters either side of the middle. */
  x: number;
  /** Meters above the ground. */
  y: number;
}

export type MatchPhase =
  /** Duel only: the keeper is picking a corner, before the taker sees anything. */
  | 'keeping'
  /** Duel only: the pick is hidden and the device is changing hands. */
  | 'handover'
  | 'ready'
  /** Drag released, taker running in. The ball is still on the spot. */
  | 'runup'
  | 'flight'
  | 'resolved'
  | 'complete';
