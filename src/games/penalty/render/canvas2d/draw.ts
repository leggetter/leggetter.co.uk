/**
 * Canvas primitives shared by every 2D view.
 *
 * The views own a camera and an aim mapping; everything drawn is here. That is
 * what keeps a new camera angle down to a small file: `angled-behind` will draw
 * the identical world through a different projector.
 *
 * Everything is drawn from world coordinates through the projector, so nothing
 * in this file has a hardcoded screen position except the HUD, which genuinely
 * belongs in screen space.
 */

import {
  AIM_HALF_WIDTH,
  AIM_HEIGHT,
  BALL_RADIUS,
  FRAME_RADIUS,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  PENALTY_DISTANCE,
  SWEEP_SWEET_ZONE,
} from '../../core/units.ts';
import type { FrameState, Outcome } from '../../core/types.ts';
import { vec, type Vec3 } from '../../core/vec3.ts';
import type { Projector } from '../project.ts';

const HALF_GOAL = GOAL_WIDTH / 2;

/** How far the net hangs behind the line. */
const NET_DEPTH = 1.7;

/** Half-width of the visible pitch. Beyond this is out of frame anyway. */
const PITCH_HALF = 34;

const COLORS = {
  skyTop: '#0d1f33',
  skyBottom: '#2b4c6b',
  grassLight: '#2f6b41',
  grassDark: '#2a6039',
  line: 'rgba(255, 255, 255, 0.8)',
  frame: '#f2f4f5',
  frameShade: '#c3c9cc',
  net: 'rgba(255, 255, 255, 0.22)',
  keeperKit: '#ffd23f',
  keeperTrim: '#1d1d1d',
  ball: '#fbfbfb',
  ballShade: '#c8ccd0',
  shadow: 'rgba(0, 0, 0, 0.3)',
  aim: 'rgba(255, 220, 90, 0.95)',
};

type Ctx = CanvasRenderingContext2D;

/**
 * Stroke a run of world points.
 *
 * A point behind the camera has no screen position, so the path is broken
 * there and picked up again after. Abandoning the whole line instead is what
 * made the eighteen-yard box vanish silently: one corner fell behind the
 * camera and took the other three with it.
 */
function strokeWorld(ctx: Ctx, proj: Projector, points: Vec3[], color: string, width = 2): void {
  ctx.beginPath();
  let pen = false;
  for (const point of points) {
    const p = proj.project(point);
    if (!p) {
      pen = false;
      continue;
    }
    if (pen) ctx.lineTo(p.x, p.y);
    else {
      ctx.moveTo(p.x, p.y);
      pen = true;
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/**
 * Fill a world-space polygon, or draw nothing.
 *
 * Unlike a line, a partly-visible polygon cannot be salvaged: dropping a
 * corner silently changes the shape. Callers pass shapes that are either
 * wholly in front of the camera or not worth drawing.
 */
function fillWorld(ctx: Ctx, proj: Projector, points: Vec3[], color: string): void {
  ctx.beginPath();
  let started = false;
  for (const point of points) {
    const p = proj.project(point);
    if (!p) return;
    if (started) ctx.lineTo(p.x, p.y);
    else {
      ctx.moveTo(p.x, p.y);
      started = true;
    }
  }
  if (!started) return;
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawSky(ctx: Ctx, proj: Projector): void {
  const horizon = proj.horizon();
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(horizon, 1));
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, proj.width, Math.max(horizon, 0));

  // Everything below the horizon is grass until the stripes go over it.
  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(0, Math.max(horizon, 0), proj.width, proj.height - Math.max(horizon, 0));
}

/** Mown stripes, running across the pitch so they read as depth. */
export function drawPitch(ctx: Ctx, proj: Projector): void {
  const STRIPE = 3.5;
  for (let i = -8; i < 12; i++) {
    const z0 = i * STRIPE;
    const z1 = z0 + STRIPE;
    fillWorld(
      ctx,
      proj,
      [vec(-PITCH_HALF, 0, z0), vec(PITCH_HALF, 0, z0), vec(PITCH_HALF, 0, z1), vec(-PITCH_HALF, 0, z1)],
      i % 2 === 0 ? COLORS.grassLight : COLORS.grassDark
    );
  }

  // Goal line, six-yard box, eighteen-yard box, penalty spot.
  strokeWorld(ctx, proj, [vec(-PITCH_HALF, 0, 0), vec(PITCH_HALF, 0, 0)], COLORS.line, 2);

  box(ctx, proj, 9.16, 5.5);
  box(ctx, proj, 20.16, 16.5);

  // The spot lies flat on the grass, so it projects to a squashed ellipse, not
  // a circle. Drawn as a circle it reads as a second ball sitting on the pitch.
  // The vertical radius is measured rather than guessed: project a point one
  // radius further down the pitch and see how far up the screen it lands.
  const spot = proj.project(vec(0, 0.01, -PENALTY_DISTANCE));
  const spotEdge = proj.project(vec(0, 0.01, -PENALTY_DISTANCE + 0.11));
  if (spot && spotEdge) {
    ctx.beginPath();
    ctx.ellipse(
      spot.x,
      spot.y,
      Math.max(1.5, 0.11 * spot.scale),
      Math.max(1, Math.abs(spot.y - spotEdge.y)),
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = COLORS.line;
    ctx.fill();
  }
}

function box(ctx: Ctx, proj: Projector, halfWidth: number, depth: number): void {
  strokeWorld(
    ctx,
    proj,
    [
      vec(-halfWidth, 0, 0),
      vec(-halfWidth, 0, -depth),
      vec(halfWidth, 0, -depth),
      vec(halfWidth, 0, 0),
    ],
    COLORS.line,
    2
  );
}

export function drawNet(ctx: Ctx, proj: Projector): void {
  const step = 0.36;

  // Back panel.
  for (let x = -HALF_GOAL; x <= HALF_GOAL + 1e-6; x += step) {
    strokeWorld(ctx, proj, [vec(x, 0, NET_DEPTH), vec(x, GOAL_HEIGHT, NET_DEPTH)], COLORS.net, 1);
  }
  for (let y = 0; y <= GOAL_HEIGHT + 1e-6; y += step) {
    strokeWorld(
      ctx,
      proj,
      [vec(-HALF_GOAL, y, NET_DEPTH), vec(HALF_GOAL, y, NET_DEPTH)],
      COLORS.net,
      1
    );
  }

  // Side panels and roof, which are what sell the depth.
  for (const side of [-HALF_GOAL, HALF_GOAL]) {
    for (let y = 0; y <= GOAL_HEIGHT + 1e-6; y += step) {
      strokeWorld(ctx, proj, [vec(side, y, 0), vec(side, y, NET_DEPTH)], COLORS.net, 1);
    }
    strokeWorld(ctx, proj, [vec(side, 0, 0), vec(side, GOAL_HEIGHT, 0)], COLORS.net, 1);
  }
  for (let x = -HALF_GOAL; x <= HALF_GOAL + 1e-6; x += step) {
    strokeWorld(ctx, proj, [vec(x, GOAL_HEIGHT, 0), vec(x, GOAL_HEIGHT, NET_DEPTH)], COLORS.net, 1);
  }
}

export function drawGoalFrame(ctx: Ctx, proj: Projector): void {
  const r = FRAME_RADIUS;
  for (const x of [-HALF_GOAL, HALF_GOAL]) {
    fillWorld(
      ctx,
      proj,
      [vec(x - r, 0, 0), vec(x + r, 0, 0), vec(x + r, GOAL_HEIGHT + r, 0), vec(x - r, GOAL_HEIGHT + r, 0)],
      COLORS.frame
    );
  }
  fillWorld(
    ctx,
    proj,
    [
      vec(-HALF_GOAL - r, GOAL_HEIGHT - r, 0),
      vec(HALF_GOAL + r, GOAL_HEIGHT - r, 0),
      vec(HALF_GOAL + r, GOAL_HEIGHT + r, 0),
      vec(-HALF_GOAL - r, GOAL_HEIGHT + r, 0),
    ],
    COLORS.frame
  );
}

/**
 * The keeper: feet, torso, head, and an arm out to the gloves.
 *
 * The body drops and leans as the dive extends, so a full-stretch save reads
 * as a dive rather than as a standing figure with a long arm. Crude, and meant
 * to be: this is the part a pixel art renderer replaces wholesale.
 */
export function drawKeeper(ctx: Ctx, proj: Projector, hands: Vec3, reach: number): void {
  /** 0 standing, 1 at full stretch. */
  const extension = Math.min(1, Math.abs(hands.x) / 2.75);
  const lean = Math.sign(hands.x) * extension;

  const feet = vec(hands.x * 0.34, 0.06, 0);
  const shoulderY = 1.42 - 0.72 * extension;
  const shoulder = vec(feet.x + lean * 0.38, shoulderY, 0);
  const head = vec(shoulder.x + lean * 0.16, shoulderY + 0.24, 0);

  const f = proj.project(feet);
  const s = proj.project(shoulder);
  const hd = proj.project(head);
  const g = proj.project(hands);
  if (!f || !s || !hd || !g) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Torso.
  ctx.strokeStyle = COLORS.keeperKit;
  ctx.lineWidth = Math.max(4, 0.32 * s.scale);
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.lineTo(s.x, s.y);
  ctx.stroke();

  // Arm out to the gloves.
  ctx.lineWidth = Math.max(3, 0.14 * s.scale);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(g.x, g.y);
  ctx.stroke();

  // Legs, trailing the dive.
  ctx.strokeStyle = COLORS.keeperTrim;
  ctx.lineWidth = Math.max(2, 0.11 * s.scale);
  for (const spread of [-0.16, 0.16]) {
    const toe = proj.project(vec(feet.x - lean * 0.3 + spread, 0.05, 0));
    if (!toe) continue;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(toe.x, toe.y);
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.keeperTrim;
  ctx.beginPath();
  ctx.arc(hd.x, hd.y, Math.max(3, 0.13 * s.scale), 0, Math.PI * 2);
  ctx.fill();

  // Gloves, drawn at the size of the reach that decides a save.
  ctx.fillStyle = COLORS.keeperKit;
  ctx.beginPath();
  ctx.arc(g.x, g.y, Math.max(3, reach * 0.5 * g.scale), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * How much bigger than life to draw the ball, by distance.
 *
 * At the goal line the ball is 17 m away and honestly about 7 px across, which
 * is accurate and impossible to follow: the shot reads as the ball vanishing
 * and a word appearing. Every sports game cheats this. Nothing before the
 * penalty spot is touched, so the ball at your feet stays the right size and
 * only the far half of the flight is flattered.
 */
function ballBoost(depth: number): number {
  return Math.min(2.2, 1 + Math.max(0, depth - 7) * 0.085);
}

export function drawBall(ctx: Ctx, proj: Projector, position: Vec3): void {
  // Shadow first, on the ground directly beneath.
  const ground = proj.project(vec(position.x, 0.01, position.z));
  if (ground) {
    const lift = Math.max(0, position.y - BALL_RADIUS);
    ctx.save();
    ctx.globalAlpha = Math.max(0.08, 0.34 - lift * 0.06);
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(
      ground.x,
      ground.y,
      BALL_RADIUS * ground.scale * 1.3,
      BALL_RADIUS * ground.scale * 0.45,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  const p = proj.project(position);
  if (!p) return;
  const radius = Math.max(3, BALL_RADIUS * p.scale * ballBoost(p.depth));

  const shade = ctx.createRadialGradient(
    p.x - radius * 0.3,
    p.y - radius * 0.35,
    radius * 0.1,
    p.x,
    p.y,
    radius
  );
  shade.addColorStop(0, COLORS.ball);
  shade.addColorStop(1, COLORS.ballShade);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The aiming guide: where the shot is pointed, and how the curve will bend it.
 *
 * The bend drawn here is an illustration of the input, not a prediction from
 * the simulation. Showing the true trajectory would remove the reason to learn
 * what a given drag does.
 */
export function drawAim(ctx: Ctx, proj: Projector, frame: FrameState): void {
  const input = frame.aiming;
  if (!input) return;

  const from = frame.ball.position;
  const target = vec(input.aim.x * AIM_HALF_WIDTH, input.aim.y * AIM_HEIGHT, 0);

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = COLORS.aim;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55 + 0.45 * input.power;

  const points: Vec3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    // Lateral bend peaks mid-flight, which is roughly what Magnus does.
    const bend = input.curve * 0.9 * t * (1 - t) * 4;
    points.push(
      vec(
        from.x + (target.x - from.x) * t + bend,
        from.y + (target.y - from.y) * t + Math.sin(Math.PI * t) * 0.25,
        from.z + (target.z - from.z) * t
      )
    );
  }
  strokeWorld(ctx, proj, points, COLORS.aim, 2);

  const reticle = proj.project(target);
  if (reticle) {
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.aim;
    ctx.lineWidth = 2.5;
    const r = Math.max(8, 0.24 * reticle.scale);
    ctx.beginPath();
    ctx.arc(reticle.x, reticle.y, r, 0, Math.PI * 2);
    ctx.moveTo(reticle.x - r * 1.5, reticle.y);
    ctx.lineTo(reticle.x + r * 1.5, reticle.y);
    ctx.moveTo(reticle.x, reticle.y - r * 1.5);
    ctx.lineTo(reticle.x, reticle.y + r * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The shot dial: power, bend and release timing, drawn at the ball.
 *
 * All three sit where the eye already is during a drag. The first version put
 * power in a thin strip at the bottom of the screen and gave bend no readout
 * at all, and the honest feedback was that it was not clear what was being
 * controlled.
 */
export function drawShotDial(ctx: Ctx, proj: Projector, frame: FrameState): void {
  const input = frame.aiming;
  if (!input) return;

  const at = proj.project(frame.ball.position);
  if (!at) return;

  const radius = Math.max(38, BALL_RADIUS * at.scale * 2.6);
  const TAU = Math.PI * 2;

  ctx.save();
  ctx.lineCap = 'round';

  // Power, filling clockwise from the top.
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, TAU);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, input.power));
  ctx.strokeStyle = COLORS.aim;
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(`${Math.round(input.power * 100)}%`, at.x, at.y + radius + 20);

  // Bend, as a needle sliding along a short track above the ring.
  const trackY = at.y - radius - 18;
  const trackHalf = radius * 0.85;
  ctx.beginPath();
  ctx.moveTo(at.x - trackHalf, trackY);
  ctx.lineTo(at.x + trackHalf, trackY);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(at.x, trackY);
  ctx.lineTo(at.x + trackHalf * Math.max(-1, Math.min(1, input.curve)), trackY);
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Centre tick, so straight is visibly a position and not just "small".
  ctx.beginPath();
  ctx.moveTo(at.x, trackY - 6);
  ctx.lineTo(at.x, trackY + 6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawSweep(ctx, at.x, at.y + radius + 40, trackHalf * 1.5, frame.timingMarker);
  ctx.restore();
}

/**
 * The timing sweep: release while the marker is in the green to strike it
 * cleanly. Released off-centre the shot drags that way, so the bar is laid out
 * left-to-right to match the direction the error will take.
 */
function drawSweep(ctx: Ctx, cx: number, cy: number, half: number, marker: number | null): void {
  if (marker === null) return;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - half, cy - 6, half * 2, 12, 6);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  const sweetHalf = half * SWEEP_SWEET_ZONE;
  ctx.beginPath();
  ctx.roundRect(cx - sweetHalf, cy - 6, sweetHalf * 2, 12, 6);
  ctx.fillStyle = 'rgba(74, 222, 128, 0.85)';
  ctx.fill();

  const x = cx + half * Math.max(-1, Math.min(1, marker));
  ctx.beginPath();
  ctx.moveTo(x, cy - 12);
  ctx.lineTo(x, cy + 12);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

const OUTCOME_TEXT: Record<Outcome, string> = {
  goal: 'GOAL',
  saved: 'SAVED',
  post: 'OFF THE POST',
  bar: 'OFF THE BAR',
  wide: 'WIDE',
  over: 'OVER',
  short: 'NEVER GOT THERE',
  blocked: 'BLOCKED',
};

export function drawHud(ctx: Ctx, frame: FrameState, width: number, height: number): void {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = '600 15px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(`${frame.player.name}  ${frame.score}/${frame.shotsTotal}`, 18, 16);

  // One pip per penalty, filled as they are taken.
  const pipY = 44;
  for (let i = 0; i < frame.shotsTotal; i++) {
    const outcome = frame.outcomes[i];
    ctx.beginPath();
    ctx.arc(26 + i * 22, pipY, 7, 0, Math.PI * 2);
    if (!outcome) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = outcome === 'goal' ? '#4ade80' : 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    }
  }

  ctx.textAlign = 'center';

  // Kept high, above the crossbar. Anything lower lands on top of the goal at
  // the moment the player most wants to see what happened in it.
  const bannerY = height * 0.1;

  const banner = (headline: string, sub: string, color: string): void => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    ctx.font = '700 44px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(headline, width / 2, bannerY);
    ctx.font = '500 15px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(sub, width / 2, bannerY + 56);
    ctx.restore();
  };

  if (frame.phase === 'resolved' && frame.lastOutcome) {
    banner(
      OUTCOME_TEXT[frame.lastOutcome],
      'click to continue',
      frame.lastOutcome === 'goal' ? '#6ee7a0' : 'rgba(255, 255, 255, 0.95)'
    );
  }

  if (frame.phase === 'complete') {
    banner(
      `${frame.score} of ${frame.shotsTotal}`,
      'click to play again',
      'rgba(255, 255, 255, 0.95)'
    );
  }

  if (frame.phase === 'ready') {
    ctx.font = '500 14px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.fillText(
      'drag to aim  ·  further is harder  ·  hook the drag to bend it  ·  release in the green',
      width / 2,
      height - 40
    );
  }

  ctx.restore();
}

export { COLORS, NET_DEPTH };
