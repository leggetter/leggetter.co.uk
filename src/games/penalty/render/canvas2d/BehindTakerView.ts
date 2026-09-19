/**
 * The classic penalty camera: behind the taker, ball in the foreground, goal
 * and keeper ahead.
 *
 * This is the reference implementation the other views are measured against.
 * It is deliberately thin: a camera, an aim mapping, and a call into the shared
 * drawing code. If a second view needs anything more than that, the split
 * between this file and draw.ts is in the wrong place.
 */

import { PENALTY_DISTANCE } from '../../core/units.ts';
import type { FrameState, ShotInput } from '../../core/types.ts';
import { vec } from '../../core/vec3.ts';
import { createProjector, type Camera, type Projector } from '../project.ts';
import type { DragGesture, View, ViewContext } from '../View.ts';
import {
  drawAim,
  drawBall,
  drawGoalFrame,
  drawHud,
  drawKeeper,
  drawNet,
  drawPitch,
  drawShotDial,
  drawSky,
} from './draw.ts';

/**
 * Behind and above the taker's shoulder.
 *
 * Set back 6.5 m rather than tucked in at 3.4 m. Close in, the ball sat on the
 * bottom edge of the canvas with nowhere left to start a drag, and the penalty
 * spot rendered as a 28 px disc: both correct at 0.11 m, both useless. The
 * narrower field of view keeps the goal a decent size from further back.
 */
const CAMERA: Camera = {
  position: vec(0, 2.4, -PENALTY_DISTANCE - 6.5),
  yaw: 0,
  pitch: 0.16,
  fov: 0.62,
};

/**
 * Drag length, in CSS pixels, that means a fully committed shot.
 *
 * Scaled against the canvas so the gesture feels the same on a laptop and a
 * phone rather than being four times harder on the smaller screen.
 */
const REFERENCE_DRAG = 0.34;

/** Sideways hook, as a fraction of the reference, that means maximum curve. */
const REFERENCE_HOOK = 0.14;

export class BehindTakerView implements View {
  readonly id = 'behind-taker';
  readonly label = 'Behind the taker';

  private ctx!: CanvasRenderingContext2D;
  private projector!: Projector;
  private width = 0;
  private height = 0;

  mount(context: ViewContext): void {
    this.ctx = context.ctx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.projector = createProjector(CAMERA, width, height);
  }

  render(frame: FrameState): void {
    const { ctx, projector } = this;
    if (!projector) return;

    drawSky(ctx, projector);
    drawPitch(ctx, projector);
    drawNet(ctx, projector);
    drawKeeper(ctx, projector, frame.keeper.hands, frame.keeperProfile.reach);
    drawGoalFrame(ctx, projector);
    drawAim(ctx, projector, frame);
    drawBall(ctx, projector, frame.ball.position);
    drawShotDial(ctx, projector, frame);
    drawHud(ctx, frame, this.width, this.height);
  }

  /**
   * Drag vector to shot.
   *
   * Direction and power come from the same vector, which means aiming at the
   * top corner and hitting it softly is not a thing you can do. That is a
   * deliberate coupling rather than an oversight: it is one gesture, it is
   * learnable, and it works identically with a thumb. The spec flags this as
   * the most likely part of the game to need redesign once it has been played.
   *
   * Curve is separate, and comes from how far the drag was hooked away from
   * the straight line between where it started and where it ended. A straight
   * drag is a straight shot.
   */
  aimFromDrag(gesture: DragGesture): ShotInput {
    const reference = Math.min(this.width, this.height) * REFERENCE_DRAG || 1;

    const dx = gesture.current.x - gesture.start.x;
    // Screen y grows downward; dragging up should lift the ball.
    const dy = gesture.start.y - gesture.current.y;

    const aimX = clamp(dx / reference, -1, 1);
    const aimY = clamp(dy / reference, 0, 1);
    const power = clamp(Math.sqrt(dx * dx + dy * dy) / reference, 0, 1);

    return {
      aim: { x: aimX, y: aimY },
      power,
      curve: clamp(hook(gesture) / (reference * REFERENCE_HOOK), -1, 1),
      lift: 0.5,
      // Stamped by the game at release: the view maps the gesture, the game
      // owns the clock the timing sweep runs on.
      timing: 0,
    };
  }

  destroy(): void {}
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
  const length = Math.sqrt(cx * cx + cy * cy);
  if (length < 1e-3 || path.length < 3) return 0;

  // Unit normal to the chord.
  const nx = -cy / length;
  const ny = cx / length;

  let peak = 0;
  for (const point of path) {
    const deviation = (point.x - start.x) * nx + (point.y - start.y) * ny;
    if (Math.abs(deviation) > Math.abs(peak)) peak = deviation;
  }
  return peak;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
