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

export interface KeeperProfile {
  id: string;
  name: string;
  /** How long before it reacts to the ball at all. 180 hard, 420 easy. */
  reactionMs: number;
  /** Lateral hand speed once committed, m/s. */
  diveSpeed: number;
  /** Radius the hands cover, m. */
  reach: number;
  /** 0..1 chance of committing before the ball is struck, and guessing. */
  guessBias: number;
  /** 0..1 quality of the read once it does commit. */
  readAccuracy: number;
}

export interface KeeperState {
  /** Where the hands are now. */
  hands: Vec3;
  /** Where the hands are heading, or null while still standing. */
  target: Vec3 | null;
  /** True once a dive has been committed to, guessed or read. */
  committed: boolean;
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
  shotIndex: number;
  shotsTotal: number;
  score: number;
  outcomes: Outcome[];
  lastOutcome: Outcome | null;
  /** Live aim while a drag is in progress, for the preview. */
  aiming: ShotInput | null;
  /**
   * Where the timing marker is right now, -1 to 1, or null when not aiming.
   * Raw sweep position rather than the derived penalty, because this is what
   * gets drawn and the player needs to see the thing they are reacting to.
   */
  timingMarker: number | null;
}

export type MatchPhase = 'ready' | 'flight' | 'resolved' | 'complete';
