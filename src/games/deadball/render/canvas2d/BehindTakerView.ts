/**
 * The classic penalty camera: behind the taker, ball in the foreground, goal
 * and keeper ahead.
 *
 * The reference the others are measured against, and now a camera and nothing
 * else. Everything it used to do itself - the drag mapping, the drawing - is
 * shared, so the three views differ only in where they stand.
 */

import { GOAL_HEIGHT, GOAL_WIDTH, PENALTY_DISTANCE } from '../../core/units.ts';
import type { FrameState, ShotInput } from '../../core/types.ts';
import { vec } from '../../core/vec3.ts';
import { dragToShot } from '../aim.ts';
import { createProjector, type Camera, type Projector } from '../project.ts';
import type { DragGesture, View, ViewContext } from '../View.ts';
import { drawScene } from './scene.ts';

/**
 * Behind and above the taker's shoulder.
 *
 * Set back 6.5 m rather than tucked in at 3.4 m. Close in, the ball sat on the
 * bottom edge of the canvas with nowhere left to start a drag, and the penalty
 * spot rendered as a 28 px disc: both correct at 0.11 m, both useless.
 */
const CAMERA: Camera = {
  position: vec(0, 2.4, -PENALTY_DISTANCE - 6.5),
  yaw: 0,
  pitch: 0.16,
  fov: 0.62,
  frame: {
    halfWidth: GOAL_WIDTH / 2 + 1.25,
    halfHeight: GOAL_HEIGHT / 2 + 0.6,
    depth: PENALTY_DISTANCE + 6.5,
  },
};

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
    if (!this.projector) return;
    drawScene(this.ctx, this.projector, frame, this.width, this.height);
  }

  aimFromDrag(gesture: DragGesture): ShotInput {
    return dragToShot(gesture, this.width, this.height);
  }

  destroy(): void {}
}
