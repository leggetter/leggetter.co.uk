/**
 * Turning a drag into a shot.
 *
 * Shared by every view, because the point of having more than one camera is to
 * compare *cameras*. Three copies of this would drift into three slightly
 * different control schemes, and then nobody could say which angle they
 * preferred - only which one they had got used to.
 *
 * What a view supplies is the mapping, not the mechanic: whether the drag has
 * to be mirrored, and how far a committed drag is. The gesture itself is the
 * same everywhere.
 */

import type { ShotInput } from '../../core/types.ts';
import type { DragGesture } from '../Presentation.ts';

/**
 * Drag length that means a fully committed shot, as a fraction of the smaller
 * canvas dimension.
 *
 * Scaled against the canvas so the gesture feels the same on a laptop and a
 * phone rather than being four times harder on the smaller screen.
 */
const REFERENCE_DRAG = 0.34;

/** Sideways hook, as a fraction of the reference, that means maximum curve. */
const REFERENCE_HOOK = 0.14;

/**
 * Hook below this many pixels is not a hook.
 *
 * Nobody drags in a perfectly straight line, and neither does the arithmetic:
 * a dead straight drag came out with 1.4e-15 of curl on it. Without a deadzone
 * "straight" is not a shot anybody can actually play.
 */
const HOOK_DEADZONE = 2;

export interface AimMapping {
  /**
   * Screen right is the taker's left.
   *
   * True for any camera that has gone round behind the goal and is looking
   * back at the taker. Dragging right should send the ball to the right of the
   * screen, which is the other side of the goal from the taker's point of
   * view, and the same is true of which way a hooked drag bends it.
   */
  mirrored?: boolean;
}

export function dragToShot(
  gesture: DragGesture,
  width: number,
  height: number,
  mapping: AimMapping = {}
): ShotInput {
  const reference = Math.min(width, height) * REFERENCE_DRAG || 1;
  const flip = mapping.mirrored ? -1 : 1;

  const dx = (gesture.current.x - gesture.start.x) * flip;
  // Screen y grows downward; dragging up should lift the ball.
  const dy = gesture.start.y - gesture.current.y;

  const rawX = gesture.current.x - gesture.start.x;

  return {
    aim: { x: clamp(dx / reference, -1, 1), y: clamp(dy / reference, 0, 1) },
    // Direction and power come from the same vector, so aiming at the top
    // corner and hitting it softly is not a thing you can do. A deliberate
    // coupling: one gesture, learnable, and it works with a thumb.
    power: clamp(Math.hypot(rawX, dy) / reference, 0, 1),
    curve: clamp((hook(gesture) * flip) / (reference * REFERENCE_HOOK), -1, 1),
    lift: 0.5,
    // Stamped by the game at release: the view maps the gesture, the game owns
    // the clock the timing sweep runs on.
    timing: 0,
  };
}

/**
 * Signed peak deviation of the drag path from the straight line between its
 * ends, in pixels. Positive means the path bowed to the right.
 *
 * This is why the gesture carries its path and not just two points: the chord
 * alone cannot tell a straight drag from a hooked one, because both can end in
 * the same place.
 */
function hook(gesture: DragGesture): number {
  const { start, current, path } = gesture;
  const cx = current.x - start.x;
  const cy = current.y - start.y;
  const length = Math.hypot(cx, cy);
  if (length < 1e-3 || path.length < 3) return 0;

  // Unit normal to the chord.
  const nx = -cy / length;
  const ny = cx / length;

  let peak = 0;
  for (const point of path) {
    const deviation = (point.x - start.x) * nx + (point.y - start.y) * ny;
    if (Math.abs(deviation) > Math.abs(peak)) peak = deviation;
  }
  return Math.abs(peak) < HOOK_DEADZONE ? 0 : peak;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
