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
import { shadeGrass, type SkyPalette } from './sky.ts';
import { PITCH_LENGTH } from './stand.ts';
import type { Projector } from './project.ts';
import {
  drawAim,
  drawBall,
  drawBallTrail,
  drawFarGoal,
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
  keeperColours,
} from './draw.ts';

export interface SceneOptions {
  /**
   * The camera is behind the goal looking back, so the netting and the frame
   * are in front of everything rather than behind it.
   */
  fromBehindTheGoal?: boolean;
  /**
   * The stand and hoardings, already drawn. Null when there is nothing to draw
   * them on yet, or when the camera is looking away from them.
   */
  backdrop?: HTMLCanvasElement | null;
  /** Drawn over the backdrop, every frame, because only the people move. */
  crowd?: (() => void) | null;
  /**
   * The twenty on the halfway line. Null from the two cameras at the penalty
   * end, which are facing the other way.
   */
  lineup?: (() => void) | null;
  /** Day, dusk or night. Changes the sky, the light on the grass and
   *  whether the floodlights are on. */
  sky?: SkyPalette;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  proj: Projector,
  frame: FrameState,
  width: number,
  height: number,
  options: SceneOptions = {}
): void {
  drawSky(ctx, proj, options.sky);
  drawPitch(ctx, proj);

  // The light on the grass, before anything standing on it. A night pitch is
  // not dark green, it is green with a lot of blue over it, and that is most
  // of what makes floodlit turf read as floodlit.
  if (options.sky) shadeGrass(ctx, proj, options.sky);

  // After the grass and before everything else. The pitch stripes run well
  // past the stand, so drawing this first would bury it under distant grass;
  // drawing it here means it occludes the grass behind it, which is what
  // something standing on the ground does.
  if (options.backdrop) ctx.drawImage(options.backdrop, 0, 0);
  options.crowd?.();

  // The goal at the other end, after the stand rather than before it. Drawn
  // with the pitch it was invisible: the far hoardings are six metres further
  // away but painted later, and they covered it. It sits here because that is
  // where it sits in depth - nearer than the stand behind it, further than
  // everything at this end.
  drawFarGoal(ctx, proj, -PITCH_LENGTH);

  // Halfway, so: nearer than the far goal and the stand behind it, further
  // than everything at this end. Drawn before the goalmouth rather than with
  // the crowd, because they are standing on the pitch and the crowd is not.
  options.lineup?.();

  if (options.fromBehindTheGoal) {
    // Furthest first: the taker is away down the pitch, the ball is coming
    // toward us, and the goal we are standing in is the nearest thing there is.
    drawTaker(ctx, proj, frame);
    drawAim(ctx, proj, frame);
    drawBallTrail(ctx, proj, frame.trail);
    drawBall(ctx, proj, frame.ball.position);
    drawKeeper(
      ctx,
      proj,
      frame.keeper,
      frame.keeperProfile.reach,
      frame.clock,
      frame.phase,
      keeperColours(frame)
    );
    drawGoalFrame(ctx, proj);
    drawNet(ctx, proj);
  } else {
    // Net, then the frame, then the keeper. The keeper stands in front of the
    // posts, not behind them: drawn the other way round the woodwork was
    // painted over their arms, which reads as a keeper stuck in the netting.
    drawNet(ctx, proj);
    drawGoalFrame(ctx, proj);
    drawKeeper(
      ctx,
      proj,
      frame.keeper,
      frame.keeperProfile.reach,
      frame.clock,
      frame.phase,
      keeperColours(frame)
    );
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
