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
  NET_DEPTH,
  PENALTY_DISTANCE,
  SWEEP_SWEET_ZONE,
} from '../../core/units.ts';
import type { FrameState, KeeperState, Outcome } from '../../core/types.ts';
import type { FullTime, Summary } from '../../telemetry/analyse.ts';
import { vec, type Vec3 } from '../../core/vec3.ts';
import type { Projector } from '../project.ts';
import { ARM_SPAN } from '../../core/keeper.ts';

const HALF_GOAL = GOAL_WIDTH / 2;

/** Roughly how far a full curl moves a penalty, in meters. See MAGNUS_FACTOR. */
const PENALTY_FULL_CURL = 0.5;

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
  keeperGlove: '#f4f6f8',
  ball: '#fbfbfb',
  ballShade: '#c8ccd0',
  shadow: 'rgba(0, 0, 0, 0.3)',
  aim: 'rgba(255, 220, 90, 0.95)',
  skin: '#d9a07a',
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
/**
 * One figure, drawn one way.
 *
 * The taker and the keeper are the same construction with different poses and
 * different kit: two legs from the hip, a torso, two arms, a head. They were
 * written separately at first and immediately drifted - different line weights,
 * different head sizes, one of them with a single arm - so they share this.
 *
 * It is also the seam the pixel art renderer replaces: swap this one function
 * and everybody on the pitch changes together.
 */
interface Figure {
  /** Where the feet are planted on the ground. */
  feet: Vec3;
  /** Top of the torso. */
  shoulder: Vec3;
  head: Vec3;
  /** Both hands. Everyone has two. */
  hands: [Vec3, Vec3];
  /** Both toes. */
  toes: [Vec3, Vec3];
  kit: string;
  trim: string;
  /** Glove radius in meters. Zero for bare hands. */
  gloves?: number;
  alpha?: number;
}

const LIMB = { leg: 0.13, torso: 0.28, arm: 0.12, head: 0.115 };

/**
 * Standing still, breathing.
 *
 * Deliberately below the threshold of looking like an animation: a couple of
 * centimeters of chest, and a centimeter of weight shifting from one foot to
 * the other on a different period so the two never line up into an obvious
 * bob. At the taker's distance that is three or four pixels.
 *
 * Periods are in seconds. A penalty taker waiting to be told to go is keyed
 * up rather than resting, so the breathing is a little quicker than idle.
 */
const BREATH_PERIOD = 3.1;
const SWAY_PERIOD = 5.3;

const wave = (clock: number, period: number, phase = 0): number =>
  Math.sin((clock / period + phase) * Math.PI * 2);

/**
 * Whether anybody is standing about rather than moving.
 *
 * Only before the kick. Carrying the breathing through the follow-through left
 * the taker rising and falling while frozen in mid-air with one boot off the
 * ground, which reads as a bug rather than as somebody alive.
 */
const isIdle = (phase: string): boolean => phase === 'ready';

function drawFigure(ctx: Ctx, proj: Projector, figure: Figure): void {
  const f = proj.project(figure.feet);
  const s = proj.project(figure.shoulder);
  const hd = proj.project(figure.head);
  if (!f || !s || !hd) return;

  /**
   * Hip, part way down the body from the shoulders to the feet.
   *
   * Interpolated in BOTH axes. Taking x from the shoulders and only y from the
   * feet is invisible on an upright figure, where the two share an x, and
   * wrong on a diving one: it put the hip up at the shoulders, so each leg had
   * to span the whole body and the keeper looked planted and stretched no
   * matter how well the torso was posed.
   */
  const hip = {
    x: s.x + (f.x - s.x) * 0.48,
    y: s.y + (f.y - s.y) * 0.48,
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = figure.alpha ?? 1;

  ctx.strokeStyle = figure.trim;
  ctx.lineWidth = Math.max(2, LIMB.leg * s.scale);
  for (const toe of figure.toes) {
    const t = proj.project(toe);
    if (!t) continue;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }

  ctx.strokeStyle = figure.kit;
  ctx.lineWidth = Math.max(4, LIMB.torso * s.scale);
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(s.x, s.y);
  ctx.stroke();

  ctx.lineWidth = Math.max(2, LIMB.arm * s.scale);
  for (const hand of figure.hands) {
    const h = proj.project(hand);
    if (!h) continue;
    ctx.strokeStyle = figure.kit;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(h.x, h.y);
    ctx.stroke();

    if (figure.gloves) {
      ctx.fillStyle = COLORS.keeperGlove;
      ctx.beginPath();
      ctx.arc(h.x, h.y, Math.max(3, figure.gloves * h.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(hd.x, hd.y, Math.max(3, LIMB.head * s.scale), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawKeeper(
  ctx: Ctx,
  proj: Projector,
  keeper: KeeperState,
  reach: number,
  clock: number,
  phase: string
): void {
  const { hands, body, stance } = keeper;

  /**
   * How far the keeper has thrown itself, measured from where its hands rest
   * when standing - and in both axes.
   *
   * Measuring only the lateral part called a save up and across "barely
   * moving", so the torso stayed vertical and the keeper reached up with a
   * long arm instead of diving. A save is a save whichever direction it is in.
   *
   * Zero while idling, because the hands travel with the stance, so shuffling
   * along the line never reads as a dive.
   */
  const dx = hands.x - stance;
  const dy = hands.y - 0.95;
  const thrown = Math.sqrt(dx * dx + dy * dy);
  // Committed by about 1.9 m of reach; a full stretch is further than that but
  // the body is already flat out well before it.
  const extension = clamp01(thrown / 1.9);

  // Unit vector along the dive, from the standing hands toward where they are
  // now. The whole body lies along this at full stretch.
  const along = thrown > 1e-4 ? { x: dx / thrown, y: dy / thrown } : { x: 0, y: 1 };

  // Bigger than the taker's, because the keeper is twice as far away and the
  // same two centimeters would land inside a single pixel.
  const alive = isIdle(phase) ? 1 - extension * 4 : 0;
  const breath = wave(clock, BREATH_PERIOD, 0.5) * 0.032 * Math.max(0, alive);

  const stand = {
    feet: vec(stance, 0.06, 0),
    shoulder: vec(stance, 1.42 + breath, 0),
    head: vec(stance, 1.68 + breath * 1.3, 0),
  };

  // Hip sits on the simulated body, which is one of the two volumes that
  // decides a save, so what is drawn is roughly where the saving happens.
  // Everything else is laid out along the dive from there: feet trailing
  // behind and off the ground, shoulders forward, arms short.
  // Shoulder sits exactly one arm behind the hands, so the arm is always an
  // arm. Everything else hangs off the body, which is where the simulation
  // says it is and is one of the two volumes that decides a save.
  const shoulderX = hands.x - along.x * ARM_SPAN;
  const shoulderY = hands.y - along.y * ARM_SPAN;
  const dive = {
    feet: vec(body.x - along.x * 0.95, Math.max(0.08, body.y - along.y * 0.95), 0),
    shoulder: vec(shoulderX, shoulderY, 0),
    head: vec(shoulderX + along.x * 0.2, shoulderY + along.y * 0.2 + 0.1, 0),
  };

  const blend = (a: Vec3, b: Vec3): Vec3 =>
    vec(a.x + (b.x - a.x) * extension, a.y + (b.y - a.y) * extension, 0);

  const feet = grounded(blend(stand.feet, dive.feet), 0.1, keeper.landed);
  const shoulder = grounded(blend(stand.shoulder, dive.shoulder), 0.32, keeper.landed);
  const head = grounded(blend(stand.head, dive.head), 0.46, keeper.landed);

  // Standing, the arms hang either side. Diving, both go with the ball,
  // straddling the point the save test actually uses.
  const spread = 0.24 - extension * 0.1;
  const reaching: [Vec3, Vec3] = [
    vec(hands.x + spread, hands.y + 0.05, 0),
    vec(hands.x - spread * 0.7, hands.y - 0.09, 0),
  ];
  const idle: [Vec3, Vec3] = [vec(stance + 0.34, 0.92, 0), vec(stance - 0.34, 0.92, 0)];
  const held: [Vec3, Vec3] = [
    grounded(reaching[0], 0.18, keeper.landed),
    grounded(reaching[1], 0.14, keeper.landed),
  ];

  // Legs trail back down the dive line and scissor open as the keeper extends.
  const trail = (k: number, spreadX: number): Vec3 =>
    vec(
      feet.x - along.x * extension * k + spreadX * (1 - extension),
      Math.max(0.04, feet.y - along.y * extension * k),
      0
    );

  drawFigure(ctx, proj, {
    feet,
    shoulder,
    head,
    hands: extension < 0.04 ? idle : held,
    toes: [trail(0.14, 0.16), trail(0.3, -0.16)],
    kit: COLORS.keeperKit,
    trim: COLORS.keeperTrim,
    gloves: reach * 0.34,
  });
}

/**
 * Settle a point down onto the turf as the keeper lands.
 *
 * Applied to the whole figure, not just the hands. Dropping the hands alone
 * left the gloves on the grass with the body still in the air above them.
 */
function grounded(point: Vec3, restingY: number, landed: number): Vec3 {
  return landed <= 0 ? point : vec(point.x, point.y + (restingY - point.y) * landed, point.z);
}

/**
 * The taker, running up to the ball and stopping.
 *
 * Anchored to the spot, never to the ball. Anchoring to the ball meant the
 * taker set off down the pitch with it and arrived in the net.
 */
export function drawTaker(ctx: Ctx, proj: Projector, frame: FrameState): void {
  const spot = frame.spot;
  /**
   * A left-footed taker starts to the right of the ball and comes across it.
   * Well off to one side, because the camera sits 6.5 m back and a figure over
   * the ball comes out about twice the apparent height of the goal.
   */
  const side = frame.player.foot === 'left' ? 1 : -1;

  // Behind the ball means TOWARD the camera, which means bigger. A longer
  // run-up therefore costs frame space rather than buying it, so this is kept
  // short and the distance is spent sideways instead.
  const waiting = vec(spot.x + side * 1.55, 0.04, spot.z - 1.35);
  const planted = vec(spot.x + side * 0.52, 0.04, spot.z - 0.05);

  // 0 waiting, 1 planted next to the ball. Stays at 1 once struck, so the
  // taker stands and watches rather than following the ball in.
  const run = clamp01(frame.runUp);
  // Ease out: quick off the mark, settling onto the plant foot.
  const eased = 1 - (1 - run) * (1 - run);

  const lean = frame.phase === 'ready' ? (frame.aiming?.power ?? 0) * 0.25 : 0;
  const struck = frame.phase === 'flight' || frame.phase === 'resolved';
  // The follow-through settles rather than holding: boot comes back down, and
  // the taker is stood watching by the time the ball reaches the goal.
  const follow = struck ? clamp01(1 - frame.sinceStrike / 0.55) : 0;
  const crouch = lean * 0.2 + follow * 0.12;

  // Breathing, and weight moving from foot to foot. Settles as the drag builds:
  // they steady themselves over the ball rather than breathing harder.
  const alive = isIdle(frame.phase) ? 1 - Math.min(1, lean * 3) : 0;
  const breath = wave(frame.clock, BREATH_PERIOD) * 0.019 * alive;
  const sway = wave(frame.clock, SWAY_PERIOD, 0.37) * 0.012 * alive;

  const feet = vec(
    waiting.x + (planted.x - waiting.x) * eased + sway,
    0.04,
    waiting.z + (planted.z - waiting.z) * eased
  );
  const shoulder = vec(
    feet.x - side * (0.12 + lean * 0.2),
    1.3 - crouch + breath,
    feet.z - 0.08
  );

  // Three strides in 0.42 s, which is about what a penalty run-up is. On
  // contact the kicking leg swings through; after it, they come back together.
  const swing = frame.phase === 'runup' ? Math.sin(run * Math.PI * 3) : 0;

  const toe = (leg: -1 | 1): Vec3 => {
    const reach = 0.3 * swing * leg + (leg === side ? 0 : follow * 0.55);
    const lift = leg === side ? 0 : follow * 0.3;
    // Stance width, or both legs land on the same spot and read as one.
    return vec(feet.x + leg * 0.15 - side * reach, 0.03 + lift, feet.z + reach * 0.5);
  };

  const out = 0.3 + lean * 0.2 + follow * 0.18 + Math.abs(swing) * 0.12;
  const hand = (arm: -1 | 1): Vec3 =>
    vec(shoulder.x + arm * out, shoulder.y - 0.22 + lean * 0.15 - swing * arm * 0.12, shoulder.z);

  drawFigure(ctx, proj, {
    feet,
    shoulder,
    // Head rides a fraction more than the chest, which is what makes a small
    // movement read as breathing rather than as the whole figure floating.
    head: vec(shoulder.x - side * 0.08, shoulder.y + 0.26 + breath * 0.35, shoulder.z),
    hands: [hand(-1), hand(1)],
    toes: [toe(-1), toe(1)],
    kit: frame.player.colors.kit,
    trim: frame.player.colors.trim,
    // He matters while aiming and running in. Once the ball has gone he is a
    // large figure standing between the camera and the only thing worth
    // watching, so he drops back rather than staying at full strength.
    alpha: frame.phase === 'ready' || frame.phase === 'runup' ? 1 : 0.4,
  });
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * How much bigger than life to draw the ball, by distance.
 *
 * Kept small on purpose. A 17 m ball is honestly about 7 px across and the
 * first attempt fixed that by inflating it up to 1.9x, which made it overlap
 * a crossbar it had cleared by seven centimeters. A drawing that disagrees
 * with the rules by ten centimeters at exactly the moment the player is
 * judging a near miss is worse than a small ball, so readability is bought
 * with a trail and an outline instead.
 */
function ballBoost(depth: number): number {
  return Math.min(1.3, 1 + Math.max(0, depth - 7) * 0.03);
}

/** Where the ball has just been, fading out. Cheap to read, honest about size. */
export function drawBallTrail(ctx: Ctx, proj: Projector, trail: Vec3[]): void {
  if (trail.length < 2) return;
  ctx.save();
  trail.forEach((point, i) => {
    const p = proj.project(point);
    if (!p) return;
    const age = i / (trail.length - 1);
    ctx.globalAlpha = age * age * 0.42;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, BALL_RADIUS * p.scale * ballBoost(p.depth) * (0.4 + age * 0.5)), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
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

  // Outline, so a small ball still reads against the net and the grass. This
  // is the readability that used to come from drawing it too big, and unlike
  // size it does not change where the ball appears to be.
  ctx.strokeStyle = 'rgba(20, 30, 24, 0.55)';
  ctx.lineWidth = Math.max(1, radius * 0.16);
  ctx.stroke();
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
    // Lateral bend peaks mid-flight, which is roughly what Magnus does. Scaled
    // to the deflection the ball will actually get, so the guide is a promise
    // rather than decoration: a fixed bow drew the same arc whatever the
    // physics were about to do.
    const bend = input.curve * PENALTY_FULL_CURL * t * (1 - t) * 4;
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

  // Bend, as a needle sliding along a short track above the ring, labelled.
  // Unlabelled it was a blue line that moved, with nothing to say what it was
  // or what moved it.
  const trackY = at.y - radius - 22;
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

  ctx.font = '600 10px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = Math.abs(input.curve) < 0.08 ? 'rgba(255,255,255,0.4)' : '#7dd3fc';
  ctx.fillText(
    Math.abs(input.curve) < 0.08 ? 'STRAIGHT' : `BEND ${input.curve < 0 ? '\u25c4' : '\u25ba'}`,
    at.x,
    trackY - 22
  );

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

/**
 * Full time.
 *
 * The shootout used to end on a score and nothing else. Everything here comes
 * out of the shot log, which was built to answer these questions offline and
 * turns out to answer them better in the game, where the person who just
 * played them is sitting.
 *
 * The notes are deliberately blunt about where somebody keeps shooting. A
 * keeper that reads your pattern is coming, and being told the game is
 * watching is what makes that fair rather than a trick.
 */
function drawFullTime(ctx: Ctx, frame: FrameState, width: number, height: number): void {
  const full = frame.summary as FullTime | null;

  ctx.save();
  ctx.fillStyle = 'rgba(6, 16, 26, 0.85)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  const centre = width / 2;
  let y = Math.max(58, height * 0.1);

  ctx.font = '700 50px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fillText(`${frame.score} of ${frame.shotsTotal}`, centre, y);
  y += 60;

  // This shootout, shot by shot.
  const gap = 30;
  const left = centre - ((frame.outcomes.length - 1) * gap) / 2;
  frame.outcomes.forEach((outcome, i) => {
    ctx.beginPath();
    ctx.arc(left + i * gap, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = outcome === 'goal' ? '#4ade80' : 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
    if (outcome !== 'goal') {
      ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(SHORT_OUTCOME[outcome], left + i * gap, y + 3.5);
    }
  });
  y += 48;

  const heading = (text: string): void => {
    ctx.font = '600 11px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
    ctx.fillText(text.toUpperCase(), centre, y);
    y += 22;
  };

  const stats = (parts: (string | null)[]): void => {
    ctx.font = '500 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillText(parts.filter(Boolean).join('   ·   '), centre, y);
    y += 30;
  };

  if (full) {
    const { match, lifetime } = full;

    // These five. What the player actually remembers taking.
    heading('this shootout');
    stats([
      `${match.timing.clean}/${match.shots} clean`,
      `${match.keeper.saves} saved`,
      `${offTarget(match)} off target`,
      match.sides.left + match.sides.right > 0
        ? `${match.sides.left}L ${match.sides.right}R`
        : null,
    ]);

    // Everything ever played here. Five shots can never show a habit; this can.
    heading('all time');
    stats([
      `${lifetime.shots} shots`,
      lifetime.rate === null ? null : `${Math.round(lifetime.rate * 100)}% scored`,
      `${lifetime.keeper.saves} saved`,
      `${lifetime.timing.clean} clean`,
    ]);

    ctx.font = '500 15px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const maxWidth = Math.min(580, width - 64);
    for (const note of lifetime.notes) {
      for (const line of wrap(ctx, note, maxWidth)) {
        ctx.fillText(line, centre, y);
        y += 23;
      }
      y += 9;
    }
  }

  ctx.font = '500 14px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('click to play again   ·   press L to save the shot log', centre, height - 42);
  ctx.restore();
}

/** Everything that beat you without the keeper touching it. */
function offTarget(s: Summary): number {
  return (s.outcomes.post ?? 0) + (s.outcomes.bar ?? 0) + (s.outcomes.wide ?? 0) + (s.outcomes.over ?? 0);
}

/** Greedy word wrap. Canvas has no text layout, so this is the whole of it. */
function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const SHORT_OUTCOME: Record<Outcome, string> = {
  goal: '',
  saved: 'S',
  post: 'P',
  bar: 'B',
  wide: 'W',
  over: 'O',
  short: '-',
  blocked: 'X',
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
    drawFullTime(ctx, frame, width, height);
  }

  if (frame.phase === 'ready') {
    ctx.font = '500 14px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.fillText(
      'drag to aim  ·  further is harder  ·  release in the green' +
        '  ·  curl the drag sideways on the way out to bend the shot',
      width / 2,
      height - 40
    );
  }

  ctx.restore();
}

export { COLORS };
