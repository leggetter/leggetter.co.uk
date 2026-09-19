/**
 * From behind the goal, looking back down the pitch. The keeper's back is to
 * you, the taker is away in the distance, and the ball comes at the screen.
 *
 * The angle that was asked for first and speced last, and the natural one for
 * the keeper's turn when two-player arrives in Phase 5.
 *
 * Two things are genuinely different here and they are exactly the two the
 * View interface exists for:
 *
 * - **The drag is mirrored.** Having gone round behind the goal, the taker's
 *   right is on your left. Dragging right has to send the ball right on the
 *   screen, which is the other side of the goal.
 * - **The order is reversed.** The netting and the frame are the nearest
 *   things in shot rather than the furthest, so they are drawn last.
 */

import { GOAL_HEIGHT, GOAL_WIDTH, NET_DEPTH } from '../../core/units.ts';
import type { FrameState, ShotInput } from '../../core/types.ts';
import { vec } from '../../core/vec3.ts';
import { dragToShot } from '../aim.ts';
import { createProjector, type Camera, type Projector } from '../project.ts';
import type { DragGesture, View, ViewContext } from '../View.ts';
import { drawScene } from './scene.ts';

/** Behind the net, high enough to see over the crossbar and the keeper. */
const BEHIND = NET_DEPTH + 4.2;

const CAMERA: Camera = {
  position: vec(0, 3.1, BEHIND),
  // Turned all the way round: yaw 0 looks along +z, and this looks along -z.
  yaw: Math.PI,
  pitch: 0.2,
  fov: 0.62,
  // Framed on the goal, which from here is the nearest thing rather than the
  // furthest, so it needs rather more room than it does from the spot.
  frame: {
    halfWidth: GOAL_WIDTH / 2 + 0.7,
    halfHeight: GOAL_HEIGHT / 2 + 0.5,
    depth: BEHIND,
  },
};

export class KeeperCamView implements View {
  readonly id = 'keeper-cam';
  readonly label = 'Behind the goal';

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
    drawScene(this.ctx, this.projector, frame, this.width, this.height, {
      fromBehindTheGoal: true,
    });
  }

  aimFromDrag(gesture: DragGesture): ShotInput {
    return dragToShot(gesture, this.width, this.height, { mirrored: true });
  }

  destroy(): void {}
}
