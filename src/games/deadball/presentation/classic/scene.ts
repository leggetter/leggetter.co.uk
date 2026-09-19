/**
 * The whole pitch, drawn once, for every camera.
 *
 * Every view draws the identical world; they differ in where they stand. So
 * the drawing lives here and a view is a camera, a mapping and a call to this.
 * That is the claim the projection boundary was drawn to make, and adding the
 * second and third cameras is what tests it.
 *
 * The one thing a camera does change is the order, because order is depth: a
 * camera that has gone round behind the goal sees the netting nearest and the
 * taker furthest, which is the reverse of standing behind the ball.
 */

import type { FrameState } from '../../core/types.ts';
import type { Projector } from './project.ts';
import {
  drawAim,
  drawBall,
  drawBallTrail,
  drawGoalFrame,
  drawHud,
  drawKeeper,
  drawNet,
  drawPitch,
  drawHandover,
  drawKeepersTurn,
  drawShotDial,
  drawSky,
  drawTaker,
} from './draw.ts';

export interface SceneOptions {
  /**
   * The camera is behind the goal looking back, so the netting and the frame
   * are in front of everything rather than behind it.
   */
  fromBehindTheGoal?: boolean;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  proj: Projector,
  frame: FrameState,
  width: number,
  height: number,
  options: SceneOptions = {}
): void {
  drawSky(ctx, proj);
  drawPitch(ctx, proj);

  if (options.fromBehindTheGoal) {
    // Furthest first: the taker is away down the pitch, the ball is coming
    // toward us, and the goal we are standing in is the nearest thing there is.
    drawTaker(ctx, proj, frame);
    drawAim(ctx, proj, frame);
    drawBallTrail(ctx, proj, frame.trail);
    drawBall(ctx, proj, frame.ball.position);
    drawKeeper(ctx, proj, frame.keeper, frame.keeperProfile.reach, frame.clock, frame.phase);
    drawGoalFrame(ctx, proj);
    drawNet(ctx, proj);
  } else {
    // Net, then the frame, then the keeper. The keeper stands in front of the
    // posts, not behind them: drawn the other way round the woodwork was
    // painted over their arms, which reads as a keeper stuck in the netting.
    drawNet(ctx, proj);
    drawGoalFrame(ctx, proj);
    drawKeeper(ctx, proj, frame.keeper, frame.keeperProfile.reach, frame.clock, frame.phase);
    drawAim(ctx, proj, frame);
    drawTaker(ctx, proj, frame);
    drawBallTrail(ctx, proj, frame.trail);
    drawBall(ctx, proj, frame.ball.position);
  }

  // A keeper choosing sees a reticle the taker never will; the handover then
  // covers the lot before the device changes hands.
  if (frame.phase === 'keeping') drawKeepersTurn(ctx, proj, frame, width);
  else drawShotDial(ctx, proj, frame);

  drawHud(ctx, frame, width, height);
  if (frame.phase === 'handover') drawHandover(ctx, frame, width, height);
}
