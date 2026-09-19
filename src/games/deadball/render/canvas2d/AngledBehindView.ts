/**
 * Behind the taker but raised and swung out to one side, so the pitch recedes
 * and the goal is seen at an angle.
 *
 * The view that should show a curl best, because a shot bending across the
 * face of the goal moves against the frame rather than straight at it. It is
 * also the angle a free kick will want in Phase 3, where the ball has to be
 * seen going round a wall rather than through it.
 *
 * The drag is not rotated to match the camera. A drag right still means aim
 * right, because the goal still faces you and what you are aiming at is a
 * place in it - not a direction in the world. Rotating the gesture per camera
 * would make the three angles different control schemes, and then comparing
 * them would tell you which one you had got used to rather than which one is
 * better to look at.
 */

import { GOAL_HEIGHT, GOAL_WIDTH, PENALTY_DISTANCE } from '../../core/units.ts';
import type { FrameState, ShotInput } from '../../core/types.ts';
import { vec } from '../../core/vec3.ts';
import { dragToShot } from '../aim.ts';
import { createProjector, type Camera, type Projector } from '../project.ts';
import type { DragGesture, View, ViewContext } from '../View.ts';
import { drawScene } from './scene.ts';

/** Out to the taker's right, above head height, aimed down the pitch. */
const OFFSET_X = 3.6;
const BACK = PENALTY_DISTANCE + 8;
const HEIGHT = 3.6;

/**
 * Aimed between the goal and the ball rather than at the goal.
 *
 * Pointed straight at the goal, the composition is right and the shot is not:
 * the ball and the taker sit far nearer the camera, so centring the goal pushes
 * them into the bottom corner and off the edge. A look-at point a third of the
 * way back up the pitch holds the goal in the upper middle and the ball in the
 * lower, which is what you want to see at once.
 */
const LOOK_AT = { x: 0, y: 1.3, z: -3.5 };

const TO_TARGET = {
  x: LOOK_AT.x - OFFSET_X,
  y: LOOK_AT.y - HEIGHT,
  z: LOOK_AT.z + BACK,
};

/**
 * Worked out rather than eyeballed. tan(yaw) = dx/dz, matching the rotation in
 * project.ts, and pitch is the vertical angle once the yaw has been taken out.
 * A sign slip here swings the camera the wrong way by twice the angle, which is
 * how the first attempt ended up looking at an empty stretch of grass.
 */
const YAW = Math.atan2(TO_TARGET.x, TO_TARGET.z);
const FORWARD = Math.hypot(TO_TARGET.x, TO_TARGET.z);
const PITCH = Math.atan2(-TO_TARGET.y, FORWARD);

const CAMERA: Camera = {
  position: vec(OFFSET_X, HEIGHT, -BACK),
  yaw: YAW,
  pitch: PITCH,
  fov: 0.62,
  // The goal is off to one side of the axis from here, so it needs room for
  // its own half-width plus how far off-centre it sits.
  frame: {
    halfWidth: GOAL_WIDTH / 2 + OFFSET_X + 1.2,
    halfHeight: GOAL_HEIGHT / 2 + 0.8,
    depth: BACK,
  },
};

export class AngledBehindView implements View {
  readonly id = 'angled-behind';
  readonly label = 'Angled, from above';

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
