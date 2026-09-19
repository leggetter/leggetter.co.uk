/**
 * What happened to a shot.
 *
 * Pure geometry against the goal frame and the keeper's hands at the moment the
 * ball crosses the line. No simulation state, no scoring, no side effects.
 */

import { BALL_RADIUS, FRAME_RADIUS, GOAL_HEIGHT, GOAL_WIDTH } from './units.ts';
import type { KeeperState, Outcome } from './types.ts';
import type { Vec3 } from './vec3.ts';

/** Half the goal mouth, measured to the inside face of the posts. */
const HALF_WIDTH = GOAL_WIDTH / 2;

/** A ball is touching the frame once its surface reaches it. */
const FRAME_CONTACT = FRAME_RADIUS + BALL_RADIUS;

/**
 * Classify a shot at the instant it reaches the goal line.
 *
 * Order matters. The frame is checked first, because a ball clipping the inside
 * of a post is neither cleanly in nor cleanly wide, and that band has to be
 * claimed by something before the wide test gets to it.
 *
 * A shot that hits the frame ends there. In a real shootout it might rebound
 * in off the far post; here it is a miss. Simulating frame rebounds is a
 * candidate feature and not a correction to this.
 */
export function classifyCrossing(at: Vec3, keeper: KeeperState, reach: number): Outcome {
  const insideWidth = Math.abs(at.x) < HALF_WIDTH;
  const underBar = at.y < GOAL_HEIGHT;

  if (Math.abs(Math.abs(at.x) - HALF_WIDTH) < FRAME_CONTACT && at.y < GOAL_HEIGHT + FRAME_CONTACT) {
    return 'post';
  }
  if (Math.abs(at.y - GOAL_HEIGHT) < FRAME_CONTACT && Math.abs(at.x) < HALF_WIDTH + FRAME_CONTACT) {
    return 'bar';
  }
  if (!insideWidth) return 'wide';
  if (!underBar) return 'over';

  return saved(at, keeper, reach) ? 'saved' : 'goal';
}

/** Radius the torso and legs cover. Smaller than the hands, and lower down. */
const BODY_REACH = 0.52;

/**
 * Whether the keeper got something on it.
 *
 * Two volumes, not one. The hands are the thing that reaches a corner; the
 * body is the thing that stops a slow ball down the middle from a keeper who
 * has already dived. Without the second, scuffing it deliberately was the
 * strongest way to play, because committing either way left the goal empty.
 */
export function saved(at: Vec3, keeper: KeeperState, reach: number): boolean {
  return within(at, keeper.hands, reach) || within(at, keeper.body, BODY_REACH);
}

function within(at: Vec3, part: Vec3, radius: number): boolean {
  const dx = at.x - part.x;
  const dy = at.y - part.y;
  return Math.sqrt(dx * dx + dy * dy) < radius + BALL_RADIUS;
}

/** Whether an outcome puts the ball in the net. The only thing scoring asks. */
export const isGoal = (outcome: Outcome): boolean => outcome === 'goal';

