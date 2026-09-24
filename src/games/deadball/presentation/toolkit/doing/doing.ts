/**
 * What each figure is doing, and how far through it.
 *
 * "Taker planted, contact in 0.1 s." "Keeper mid-dive, 40% through." Small,
 * renderer-neutral, and derived from nothing but the frame. #72 names this as
 * the second of two things to extract, separately from the skeleton, because
 * it is the one *every* package needs: a pixel package picks its sprite frame
 * from it, the skeleton picks its pose from it, and a package with no bodies
 * at all can still time a puff of grass to a boot.
 *
 * So it stands apart from body/ and pose/ inside the toolkit - `toolkit.test.ts`
 * holds it to importing neither - and they build on it rather than the other
 * way round. The kick's clock and the keeper's throw used to be worked out
 * inline in pose/kick.ts and pose/keeper.ts; they are worked out here now, and
 * the poses read them, so the name a package gives a moment and the pose the
 * skeleton is in at that moment cannot drift apart.
 *
 * Everything is a pure function of the frame, like the poses: the same frame
 * always says the same thing, which is what lets a replay or a frame-by-frame
 * viewer draw what was on the screen.
 */

import { KICK } from '../../../content/poses.js';
import type { FrameState, KeeperState } from '../../../core/types.ts';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Where a value sits between two others, 0 to 1. */
const between = (value: number, from: number, to: number): number =>
  to > from ? clamp01((value - from) / (to - from)) : value >= to ? 1 : 0;

/**
 * Nominal seconds for the run-up, used only to put the keys before the strike
 * on the same clock as the ones after it.
 *
 * The run-up's real length is the game's (`RUN_UP_SECONDS` in Game.ts) and the
 * keys before the strike are fractions of it, so contact lands on the strike
 * whatever that is set to. If the two drifted apart, the only cost would be a
 * slightly different speed through the moment of contact.
 */
export const NOMINAL_RUN_UP = 0.42;

/**
 * When a key in content/poses.js happens: seconds from the strike, negative
 * before it.
 *
 * content/ is edited by hand, so anything that is not a finite number falls
 * back - `after` to being absent, `runUp` to the strike itself.
 */
export function keyTime(key: { runUp?: unknown; after?: unknown }): number {
  if (typeof key.after === 'number' && Number.isFinite(key.after)) return Math.max(0, key.after);
  const runUp = typeof key.runUp === 'number' && Number.isFinite(key.runUp) ? key.runUp : 1;
  return (clamp01(runUp) - 1) * NOMINAL_RUN_UP;
}

/** The kick's named moments, in order, on the strike's clock. */
export function kickMoments(raw: unknown = KICK.keys): { name: string; at: number }[] {
  const list = (Array.isArray(raw) ? raw : []) as { name?: unknown; runUp?: unknown; after?: unknown }[];
  return list
    .map((key, index) => ({
      name: typeof key.name === 'string' ? key.name : `key ${index}`,
      at: keyTime(key),
    }))
    .sort((a, b) => a.at - b.at);
}

const MOMENTS = kickMoments();

/** The fraction of the run-up at which the planted foot lands. Everything before it is strides. */
export function plantRunUp(moments: { name: string; at: number }[] = MOMENTS): number {
  const plant = moments.find((k) => k.name === 'plant') ?? moments[0];
  return plant ? Math.max(0.05, 1 + plant.at / NOMINAL_RUN_UP) : 0.66;
}

const PLANT_AT = plantRunUp();

/**
 * The frame, as far as the kick is concerned. `phase` is any string rather
 * than `MatchPhase` so a pose's own input, which has always carried it as one,
 * can be passed straight in.
 */
export interface KickFrame {
  phase: string;
  runUp: number;
  sinceStrike: number;
}

/** Where the kick is, on one clock. */
export interface KickClock {
  /** The ball has been struck: flight, resolved or complete. */
  struck: boolean;
  /** Running in. */
  running: boolean;
  /** How far through the run-up, 0 standing and 1 at the strike. */
  runUp: number;
  /** Seconds from the strike: negative in the run-up, and nominal there. */
  fromStrike: number;
}

export function kickClock(frame: KickFrame): KickClock {
  const struck = frame.phase === 'flight' || frame.phase === 'resolved' || frame.phase === 'complete';
  const running = frame.phase === 'runup';
  const runUp = running ? clamp01(frame.runUp) : struck ? 1 : 0;
  const fromStrike = struck ? Math.max(0, frame.sinceStrike) : (runUp - 1) * NOMINAL_RUN_UP;
  return { struck, running, runUp, fromStrike };
}

export interface Doing {
  /**
   * What the figure is doing. For the taker, `waiting`, `running`, or the name
   * of the last key in content/poses.js it has passed - `plant`, `backswing`,
   * `strike`, `contact`, `follow`, `land`, `watch` - so a sprite sheet can be
   * keyed by the same names the skeleton's poses are.
   */
  action: string;
  /** How far through that action, 0 to 1. Held at 1 by an action with no end. */
  progress: number;
}

export interface TakerDoing extends Doing {
  /**
   * Seconds until the boot meets the ball: positive in the run-up, zero at the
   * strike, negative after it. Nominal before the strike, see `NOMINAL_RUN_UP`.
   */
  toContact: number;
  /** Seconds since the current action began, on the same clock. */
  since: number;
}

/**
 * What the taker is doing.
 *
 * Standing, the taker is `waiting`, and `progress` is how hard the shot being
 * aimed is - the lean into it is the only thing that changes. Running in
 * before the plant it is `running`. From the plant on, it is whichever key it
 * last passed, and progress is the way to the next one.
 */
export function takerDoing(
  frame: KickFrame & Partial<Pick<FrameState, 'aiming'>>,
  moments: { name: string; at: number }[] = MOMENTS
): TakerDoing {
  const clock = kickClock(frame);
  const t = clock.fromStrike;
  // Zero rather than -0 at the strike, which prints and compares as a surprise.
  const toContact = t === 0 ? 0 : -t;

  if (!clock.running && !clock.struck) {
    const power = frame.phase === 'ready' ? (frame.aiming?.power ?? 0) : 0;
    return { action: 'waiting', progress: clamp01(power), toContact, since: 0 };
  }

  const plantAt = moments === MOMENTS ? PLANT_AT : plantRunUp(moments);
  if (!clock.struck && clock.runUp < plantAt) {
    return {
      action: 'running',
      progress: between(clock.runUp, 0, plantAt),
      toContact,
      since: clock.runUp * NOMINAL_RUN_UP,
    };
  }

  let index = 0;
  for (let i = 0; i < moments.length; i++) if (moments[i]!.at <= t) index = i;
  const current = moments[index];
  if (!current) return { action: 'running', progress: 1, toContact, since: 0 };
  const next = moments[index + 1];
  return {
    action: current.name,
    progress: next ? between(t, current.at, next.at) : 1,
    toContact,
    since: Math.max(0, t - current.at),
  };
}

/** Standing hands-at-rest height in core/, which a throw is measured from. */
const HANDS_AT_REST = 0.95;

/**
 * How far the keeper has thrown itself.
 *
 * Measured from where its hands rest when standing, and in both axes.
 * Measuring only the lateral part called a save up and across "barely moving",
 * so the torso stayed vertical and the keeper reached up with a long arm
 * instead of diving. A save is a save whichever direction it is in.
 *
 * Zero while idling, because the hands travel with the stance, so shuffling
 * along the line never reads as a dive.
 */
export interface KeeperThrow {
  /** Metres from the hands at rest. */
  thrown: number;
  /**
   * 0 to 1: committed by about 1.9 m of reach. A full stretch is further than
   * that, but the body is already flat out well before it.
   */
  extension: number;
  /** Unit direction of the throw, in the goal's plane: x across, y up. */
  along: { x: number; y: number };
}

export function keeperThrow(keeper: Pick<KeeperState, 'hands' | 'stance'>): KeeperThrow {
  const dx = keeper.hands.x - keeper.stance;
  const dy = keeper.hands.y - HANDS_AT_REST;
  const thrown = Math.sqrt(dx * dx + dy * dy);
  return {
    thrown,
    extension: clamp01(thrown / 1.9),
    along: thrown > 1e-4 ? { x: dx / thrown, y: dy / thrown } : { x: 0, y: 1 },
  };
}

/**
 * How far into the set the keeper is, 0 to 1: sinking at the knees as the
 * taker runs in, and holding it until the dive takes over. Not eased - a
 * package eases it however suits its look.
 */
export function keeperSetting(frame: { phase: string; runUp: number }): number {
  return frame.phase === 'runup' ? clamp01(frame.runUp) : frame.phase === 'flight' ? 1 : 0;
}

/** Below this much extension the keeper has not gone anywhere yet. */
const DIVING_FROM = 0.04;

/**
 * What the keeper is doing.
 *
 * - `waiting`: shuffling on the line before the run-up. No progress to speak of.
 * - `set`: sinking as the taker runs in, progress with the run-up.
 * - `diving`: progress is the extension, so 0.4 is "40% of the way to full
 *   stretch" - the number the body lies along.
 * - `landing`: progress is core/'s `landed`, 0 in the air to 1 down.
 * - `down`: finished, on the grass or back on their feet.
 */
export function keeperDoing(
  frame: { phase: string; runUp: number; keeper: Pick<KeeperState, 'hands' | 'stance' | 'landed'> }
): Doing {
  const { keeper } = frame;
  if (keeper.landed >= 1) return { action: 'down', progress: 1 };
  if (keeper.landed > 0) return { action: 'landing', progress: keeper.landed };
  const { extension } = keeperThrow(keeper);
  if (extension >= DIVING_FROM) return { action: 'diving', progress: extension };
  if (frame.phase === 'runup' || frame.phase === 'flight') {
    return { action: 'set', progress: keeperSetting(frame) };
  }
  return { action: 'waiting', progress: 0 };
}
