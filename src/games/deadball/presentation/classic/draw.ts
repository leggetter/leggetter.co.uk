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
import type { SkyPalette } from './sky.ts';
import { PITCH_LENGTH } from './stand.ts';
import type { Projector } from './project.ts';
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

export function drawSky(ctx: Ctx, proj: Projector, palette?: SkyPalette): void {
  const horizon = proj.horizon();
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(horizon, 1));
  sky.addColorStop(0, palette?.top ?? COLORS.skyTop);
  sky.addColorStop(1, palette?.bottom ?? COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, proj.width, Math.max(horizon, 0));

  // Everything below the horizon is grass until the stripes go over it.
  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(0, Math.max(horizon, 0), proj.width, proj.height - Math.max(horizon, 0));
}

/** Mown stripes, running across the pitch so they read as depth. */
/**
 * A circle lying flat on the grass.
 *
 * Drawn as a ring of segments rather than an ellipse, because an ellipse is
 * only right when the camera is square to the pitch - from the angled camera
 * the centre circle is a skewed oval and `ctx.ellipse` cannot express that.
 * Sixteen points through the projector is correct from anywhere.
 */
function circleOnGrass(
  ctx: Ctx,
  proj: Projector,
  cx: number,
  cz: number,
  radius: number,
  fill = false
): void {
  const points: Vec3[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    points.push(vec(cx + Math.cos(a) * radius, 0.01, cz + Math.sin(a) * radius));
  }
  if (fill) {
    fillWorld(ctx, proj, points, COLORS.line);
    return;
  }
  strokeWorld(ctx, proj, [...points, points[0]!], COLORS.line, 2);
}

/** The same markings as `box`, at the other end of the pitch. */
function farBox(ctx: Ctx, proj: Projector, halfWidth: number, depth: number): void {
  const z = -PITCH_LENGTH;
  strokeWorld(
    ctx,
    proj,
    [
      vec(-halfWidth, 0, z),
      vec(-halfWidth, 0, z + depth),
      vec(halfWidth, 0, z + depth),
      vec(halfWidth, 0, z),
    ],
    COLORS.line,
    2
  );
}

export function drawPitch(ctx: Ctx, proj: Projector): void {
  const STRIPE = 3.5;
  // The whole pitch, not the twenty meters the game is played in. Looking out
  // from the goal, the grass used to stop short and the world ended in a line;
  // a full 105 metres puts the far goal where a far goal belongs.
  const first = Math.ceil(-PITCH_LENGTH / STRIPE) - 3;
  for (let i = first; i < 5; i++) {
    const z0 = i * STRIPE;
    const z1 = z0 + STRIPE;
    fillWorld(
      ctx,
      proj,
      [vec(-PITCH_HALF, 0, z0), vec(PITCH_HALF, 0, z0), vec(PITCH_HALF, 0, z1), vec(-PITCH_HALF, 0, z1)],
      i % 2 === 0 ? COLORS.grassLight : COLORS.grassDark
    );
  }

  // Touchlines down both sides, which is what makes it read as a pitch rather
  // than as mown grass once the far end is in shot.
  strokeWorld(
    ctx,
    proj,
    [vec(-PITCH_HALF, 0, 0), vec(-PITCH_HALF, 0, -PITCH_LENGTH)],
    COLORS.line,
    2
  );
  strokeWorld(
    ctx,
    proj,
    [vec(PITCH_HALF, 0, 0), vec(PITCH_HALF, 0, -PITCH_LENGTH)],
    COLORS.line,
    2
  );

  // Goal line, six-yard box, eighteen-yard box, penalty spot.
  strokeWorld(ctx, proj, [vec(-PITCH_HALF, 0, 0), vec(PITCH_HALF, 0, 0)], COLORS.line, 2);

  box(ctx, proj, 9.16, 5.5);
  box(ctx, proj, 20.16, 16.5);

  // The halfway line and the centre circle.
  const half = -PITCH_LENGTH / 2;
  strokeWorld(ctx, proj, [vec(-PITCH_HALF, 0, half), vec(PITCH_HALF, 0, half)], COLORS.line, 2);
  circleOnGrass(ctx, proj, 0, half, 9.15);
  circleOnGrass(ctx, proj, 0, half, 0.25, true);

  // The far end: goal line, both boxes, and its penalty spot.
  strokeWorld(
    ctx,
    proj,
    [vec(-PITCH_HALF, 0, -PITCH_LENGTH), vec(PITCH_HALF, 0, -PITCH_LENGTH)],
    COLORS.line,
    2
  );
  farBox(ctx, proj, 9.16, 5.5);
  farBox(ctx, proj, 20.16, 16.5);
  circleOnGrass(ctx, proj, 0, -PITCH_LENGTH + PENALTY_DISTANCE, 0.25, true);

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

/**
 * The goal at the other end, a hundred and five metres away.
 *
 * Stroked rather than filled, which is the opposite of the near goal and for
 * a reason: a post is 12 cm across, and at this distance that is a third of a
 * pixel. Filling the quad honestly meant it disappeared into the antialiasing
 * and the far end of the pitch had no goal in it at all. A stroke with a
 * floor on its width keeps it there.
 *
 * The same lie the ball already tells with its outline, and the same defence:
 * it changes how wide something looks by a fraction of a pixel and nothing
 * can be aimed at it, hit it, or be judged against it.
 */
export function drawFarGoal(ctx: Ctx, proj: Projector, z: number): void {
  const w = Math.max(1.4, (FRAME_RADIUS * 2 * (proj.project(vec(0, 0, z))?.scale ?? 0)) || 0);
  for (const x of [-HALF_GOAL, HALF_GOAL]) {
    strokeWorld(ctx, proj, [vec(x, 0, z), vec(x, GOAL_HEIGHT, z)], COLORS.frame, w);
  }
  strokeWorld(
    ctx,
    proj,
    [vec(-HALF_GOAL, GOAL_HEIGHT, z), vec(HALF_GOAL, GOAL_HEIGHT, z)],
    COLORS.frame,
    w
  );
}

export function drawGoalFrame(ctx: Ctx, proj: Projector, z = 0): void {
  const r = FRAME_RADIUS;
  for (const x of [-HALF_GOAL, HALF_GOAL]) {
    fillWorld(
      ctx,
      proj,
      [vec(x - r, 0, z), vec(x + r, 0, z), vec(x + r, GOAL_HEIGHT + r, z), vec(x - r, GOAL_HEIGHT + r, z)],
      COLORS.frame
    );
  }
  fillWorld(
    ctx,
    proj,
    [
      vec(-HALF_GOAL - r, GOAL_HEIGHT - r, z),
      vec(HALF_GOAL + r, GOAL_HEIGHT - r, z),
      vec(HALF_GOAL + r, GOAL_HEIGHT + r, z),
      vec(-HALF_GOAL - r, GOAL_HEIGHT + r, z),
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
 * Below this width the HUD is on a phone and has to be told so.
 *
 * Everything in it was written in fixed pixels against a laptop, so the
 * instruction line ran off both edges at 390 px and the full-time stats were a
 * single row with nowhere to go.
 */
const NARROW = 560;

/**
 * How far down the scrim behind the top bar reaches.
 *
 * Has to clear the lowest thing in the bar, which is the second row of
 * footballs. On a phone the mode buttons sit in that same corner and push
 * everything down, so it needs to reach further there, not less far. A row of
 * small outlined circles over a crowd is invisible without it.
 */
/**
 * Two sides, whoever is playing them.
 *
 * `duel` is two people on one device and `versus` is one person against the
 * computer, and every screen below treats them the same: a row of footballs
 * each, a name on each, a keeper's turn, a caption saying whose shot it is.
 * The only thing that differs is who decides, which is the simulation's
 * business rather than this file's.
 */
const twoSided = (frame: FrameState): boolean =>
  frame.mode === 'duel' || frame.mode === 'versus';

const scrimHeight = (width: number): number => (width < NARROW ? 176 : 130);

const FACE = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

/**
 * Set the font at the largest size that fits, down to a floor.
 *
 * Every banner used to hold a label this file wrote itself, so a size that fit
 * once fit forever. Names are typed by whoever is playing, and twelve
 * characters of "MNOPQRSTUVWX IN GOAL" ran off the side of a phone and under
 * the camera buttons. Shrinking is better than truncating: the name is the
 * point of the line, and a shootout is two people, so a small line is still
 * read by someone sitting right in front of it.
 */
function fitFont(
  ctx: Ctx,
  text: string,
  weight: number,
  size: number,
  maxWidth: number,
  floor = 11
): void {
  let px = size;
  ctx.font = `${weight} ${px}px ${FACE}`;
  while (px > floor && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${FACE}`;
  }
}


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

/**
 * How far in front of the goal line the keeper is drawn, in meters.
 *
 * Standing exactly on the line puts the keeper in the same plane as the posts,
 * so which one is in front comes down to draw order and reads as a keeper set
 * back into the woodwork. Real ones stand just off it. Drawing only: saves are
 * still decided where the ball crosses, so this moves nobody's hands.
 */
const KEEPER_STANDS_OFF = 0.3;

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

  const z = -KEEPER_STANDS_OFF;
  const stand = {
    feet: vec(stance, 0.06, z),
    shoulder: vec(stance, 1.42 + breath, z),
    head: vec(stance, 1.68 + breath * 1.3, z),
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
    vec(a.x + (b.x - a.x) * extension, a.y + (b.y - a.y) * extension, z);

  const feet = grounded(blend(stand.feet, dive.feet), 0.1, keeper.landed);
  const shoulder = grounded(blend(stand.shoulder, dive.shoulder), 0.32, keeper.landed);
  const head = grounded(blend(stand.head, dive.head), 0.46, keeper.landed);

  // Standing, the arms hang either side. Diving, both go with the ball,
  // straddling the point the save test actually uses.
  const spread = 0.24 - extension * 0.1;
  const reaching: [Vec3, Vec3] = [
    vec(hands.x + spread, hands.y + 0.05, z),
    vec(hands.x - spread * 0.7, hands.y - 0.09, z),
  ];
  const idle: [Vec3, Vec3] = [vec(stance + 0.34, 0.92, z), vec(stance - 0.34, 0.92, z)];
  const held: [Vec3, Vec3] = [
    grounded(reaching[0], 0.18, keeper.landed),
    grounded(reaching[1], 0.14, keeper.landed),
  ];

  // Legs trail back down the dive line and scissor open as the keeper extends.
  const trail = (k: number, spreadX: number): Vec3 =>
    vec(
      feet.x - along.x * extension * k + spreadX * (1 - extension),
      Math.max(0.04, feet.y - along.y * extension * k),
      z
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
 * How far from the middle something at this depth can stand and stay on
 * screen, in meters, leaving `margin` meters of air beyond it.
 *
 * Asked of the projector rather than worked out from the camera, so it stays
 * right whatever a view does with its framing.
 */
function sidewaysRoom(proj: Projector, z: number, margin: number): number {
  const centre = proj.project(vec(0, 1, z));
  const metre = proj.project(vec(1, 1, z));
  if (!centre || !metre) return 0;
  const pixelsPerMetre = Math.abs(metre.x - centre.x);
  if (pixelsPerMetre < 1e-6) return 0;
  return Math.max(0, proj.width / 2 / pixelsPerMetre - margin);
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
  //
  // How far sideways depends on how much room there is. The taker stands much
  // nearer the camera than the goal does, so a metre costs him far more screen
  // than it costs the goal: framing the goal to fit a phone still left him off
  // the right-hand edge. So the offset is measured in pixels available rather
  // than in meters, and he steps in on a narrow screen.
  const standOff = Math.min(1.55, sidewaysRoom(proj, spot.z - 1.35, 0.75));
  const waiting = vec(spot.x + side * standOff, 0.04, spot.z - 1.35);
  const planted = vec(spot.x + side * Math.min(0.52, standOff), 0.04, spot.z - 0.05);

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

  /**
   * The sweep normally hangs below the ring. Where the ball sits low in frame -
   * the angled camera, or any narrow screen - there is no room underneath, so
   * it goes above instead and the bend track moves up out of its way.
   *
   * Anchored to the ball either way. Parking it at a fixed spot on the canvas
   * would fix the clipping and undo the reason the dial is at the ball at all.
   */
  const SWEEP_GAP = 40;
  const room = proj.height - (at.y + radius + SWEEP_GAP + 14);
  const sweepBelow = room > 0;
  const sweepY = sweepBelow ? at.y + radius + SWEEP_GAP : at.y - radius - SWEEP_GAP;

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
  // Clamped, because the ring is anchored to a ball that can sit very near the
  // bottom of the frame and the number goes under it.
  ctx.fillText(
    `${Math.round(input.power * 100)}%`,
    at.x,
    Math.min(at.y + radius + (sweepBelow ? 20 : 8), proj.height - 12)
  );

  // Bend, as a needle sliding along a short track above the ring, labelled.
  // Unlabelled it was a blue line that moved, with nothing to say what it was
  // or what moved it.
  const trackY = at.y - radius - (sweepBelow ? 22 : 62);
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

  drawSweep(ctx, at.x, sweepY, trackHalf * 1.5, frame.timingMarker);
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
  const narrow = width < NARROW;
  let y = Math.max(46, height * 0.08);

  if (twoSided(frame)) {
    const [a, b] = frame.scores;
    ctx.font = `700 ${narrow ? 38 : 50}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fillText(`${a} \u2013 ${b}`, centre, y);
    y += narrow ? 46 : 58;

    const result = a === b ? 'Level. Somebody take another.' : `${frame.names[a > b ? 0 : 1]} wins`;
    fitFont(ctx, result, 600, narrow ? 15 : 18, width - 32);
    ctx.fillStyle = a === b ? 'rgba(255, 255, 255, 0.75)' : SIDE_COLOURS[a > b ? 0 : 1];
    ctx.fillText(result, centre, y);
    y += narrow ? 30 : 36;
  } else {
    ctx.font = `700 ${narrow ? 38 : 50}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fillText(`${frame.score} of ${frame.shotsTotal}`, centre, y);
    y += 60;
  }

  // This shootout, shot by shot.
  const duel = twoSided(frame);
  if (duel) {
    /**
     * A row each, one football per shot.
     *
     * This was one interleaved line with the owner on the rim. That was an
     * improvement on colouring only the goals - a miss used to say nothing
     * about who took it - but it still meant reading your own five off every
     * other position. Two rows is the thing that was actually wanted.
     */
    const rows = shotsBySide(
      frame.outcomes,
      frame.shotsTotal,
      frame.suddenDeath && frame.phase !== 'complete'
    );
    const count = rows[0].length;
    const gap = Math.min(narrow ? 26 : 34, (width - (narrow ? 90 : 150)) / Math.max(1, count));
    const radius = Math.max(5, Math.min(narrow ? 9 : 11, gap * 0.38));
    const left = centre - ((count - 1) * gap) / 2;

    rows.forEach((row, side) => {
      const rowY = y + side * (radius * 2 + (narrow ? 9 : 11));
      drawBallRow(ctx, row, left, rowY, radius, gap, SIDE_COLOURS[side]);

      // The name at the end of its own row, so neither needs a separate key.
      ctx.textAlign = 'left';
      fitFont(ctx, frame.names[side].toUpperCase(), 600, narrow ? 10 : 11, narrow ? 70 : 120, 8);
      ctx.fillStyle = SIDE_COLOURS[side];
      ctx.fillText(
        frame.names[side].toUpperCase(),
        left + (count - 1) * gap + radius + (narrow ? 8 : 12),
        rowY + (narrow ? 3 : 4)
      );
      ctx.textAlign = 'center';
    });

    y += radius * 2 + (narrow ? 9 : 11) + (narrow ? 34 : 42);
  } else {
    const gap = 30;
    const left = centre - ((frame.outcomes.length - 1) * gap) / 2;
    frame.outcomes.forEach((outcome, i) => {
      const state = outcome === 'goal' ? 'scored' : 'missed';
      drawScoreBall(ctx, left + i * gap, y, 11, state, SIDE_COLOURS[0]);
      if (outcome !== 'goal') {
        ctx.font = `600 10px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(SHORT_OUTCOME[outcome], left + i * gap, y + 3.5);
      }
    });
    y += 48;
  }


  // Where the two columns of duel figures sit, and where each name is written
  // over its own column. Measured rather than a constant: the gap used to be
  // tuned for "PLAYER 1" and "PLAYER 2", which are the same width as each other
  // and never change, and two typed names are neither.
  const labels = [frame.names[0].toUpperCase(), frame.names[1].toUpperCase()];
  let labelSize = narrow ? 10 : 11;
  let colGap = narrow ? 92 : 124;
  if (duel) {
    for (;;) {
      ctx.font = `600 ${labelSize}px ${FACE}`;
      const widest = Math.max(...labels.map((l) => ctx.measureText(l).width));
      colGap = Math.max(narrow ? 92 : 124, widest + (narrow ? 22 : 30));
      // The row labels sit to the left of the first column and need their own
      // room, so the pair has to fit in rather less than the full width.
      if (colGap + widest <= width - (narrow ? 130 : 200) || labelSize <= 8) break;
      labelSize -= 1;
    }
  }
  const cols = [centre - colGap / 2, centre + colGap / 2];

  if (duel) {
    ctx.font = `600 ${labelSize}px ${FACE}`;
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const half = ctx.measureText(label).width / 2;
      ctx.fillStyle = SIDE_COLOURS[i];
      ctx.beginPath();
      ctx.arc(cols[i] - half - 10, y - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.fillText(label, cols[i], y - 9);
    });
    y += narrow ? 26 : 30;
  }

  const heading = (text: string): void => {
    ctx.font = `600 ${narrow ? 10 : 11}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
    ctx.fillText(text.toUpperCase(), centre, y);
    y += 22;
  };

  const stats = (parts: (string | null)[]): void => {
    const present = parts.filter(Boolean) as string[];
    ctx.font = `500 ${narrow ? 12 : 13}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    // Two per line on a phone, where one row of four runs off both edges.
    const rows = narrow
      ? present.reduce<string[][]>(
          (acc, part, i) => (i % 2 ? acc[acc.length - 1]!.push(part) : acc.push([part]), acc),
          []
        )
      : [present];
    for (const row of rows) {
      ctx.fillText(row.join('   ·   '), centre, y);
      y += narrow ? 19 : 22;
    }
    y += 10;
  };

  if (full?.duel && duel) {
    // Two columns of figures under each name, because the only questions a
    // duel raises are comparative. Averaging the pair into one set of rates, as
    // the solo panel does, describes a player who was not there.
    const [p0, p1] = full.duel.sides;

    const row = (label: string, values: [string, string]): void => {
      ctx.textAlign = 'right';
      ctx.font = `500 ${narrow ? 11 : 12}px ${FACE}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(label, cols[0] - colGap / 2 - (narrow ? 8 : 12), y);

      ctx.textAlign = 'center';
      ctx.font = `600 ${narrow ? 12 : 13}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      values.forEach((value, i) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.fillText(value, cols[i], y);
      });
      y += narrow ? 19 : 22;
    };

    heading('shooting');
    row('scored', [
      `${p0.taking.goals}/${p0.taking.shots}`,
      `${p1.taking.goals}/${p1.taking.shots}`,
    ]);
    row('struck clean', [
      `${p0.taking.clean}/${p0.taking.shots}`,
      `${p1.taking.clean}/${p1.taking.shots}`,
    ]);
    y += 12;

    heading('in goal');
    row('saved', [
      `${p0.keeping.saves}/${p0.keeping.faced}`,
      `${p1.keeping.saves}/${p1.keeping.faced}`,
    ]);
    // How close the corner they picked was to where it actually went. The half
    // of a duel the scoreline never shows: keeping well looks like the other
    // person shooting badly.
    row('pick, off by', [
      p0.keeping.meanPick === null ? '-' : `${p0.keeping.meanPick.toFixed(1)} m`,
      p1.keeping.meanPick === null ? '-' : `${p1.keeping.meanPick.toFixed(1)} m`,
    ]);
    y += 12;
  } else if (full) {
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

    ctx.font = `500 ${narrow ? 13 : 15}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const maxWidth = Math.min(580, width - (narrow ? 28 : 64));
    for (const note of lifetime.notes) {
      for (const line of wrap(ctx, note, maxWidth)) {
        ctx.fillText(line, centre, y);
        y += narrow ? 19 : 23;
      }
      y += narrow ? 7 : 9;
    }
  }

  ctx.font = `500 ${narrow ? 12 : 14}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  // No keyboard on a phone, so do not offer a keyboard shortcut there.
  ctx.fillText(
    narrow ? 'tap to play again' : 'click to play again   ·   press L to save the shot log',
    centre,
    height - 34
  );
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

/**
 * The keeper's turn, and the screen that hides it again.
 *
 * Two people sharing a screen is the whole difficulty of the format, so these
 * two are not decoration: the handover is the only thing standing between the
 * keeper's pick and the person about to shoot at it.
 */
export function drawKeepersTurn(ctx: Ctx, proj: Projector, frame: FrameState, width: number): void {
  const spot = frame.choosing ?? frame.dive;

  ctx.save();
  ctx.textAlign = 'center';
  const narrow = width < NARROW;

  if (spot) {
    const at = proj.project(vec(spot.x, spot.y, 0));
    if (at) {
      const r = Math.max(16, 0.45 * at.scale);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.moveTo(at.x - r * 1.6, at.y);
      ctx.lineTo(at.x + r * 1.6, at.y);
      ctx.moveTo(at.x, at.y - r * 1.6);
      ctx.lineTo(at.x, at.y + r * 1.6);
      ctx.stroke();
    }
  }

  const round = Math.floor(frame.shotIndex / 2) + 1;

  // Below the camera switcher, which stacks into a tall column on a phone and
  // is HTML sitting over this canvas, so it cannot be drawn around - only
  // avoided. Same reason the score line has its own clearance above.
  const headY = narrow ? 126 : 124;

  const inGoal = `${frame.names[frame.keeperSide].toUpperCase()} IN GOAL`;
  fitFont(ctx, inGoal, 700, narrow ? 20 : 26, width - (narrow ? 48 : 32));

  // Its own scrim. The bar at the top has one; this block sits below it, on the
  // crowd, and three lines of text over several hundred moving figures is
  // unreadable however it is coloured. Fades out at both ends so it reads as
  // shade rather than as a panel somebody forgot to style.
  const blockTop = headY - (narrow ? 24 : 30);
  const blockHeight = narrow ? 76 : 88;
  const shade = ctx.createLinearGradient(0, blockTop, 0, blockTop + blockHeight);
  shade.addColorStop(0, 'rgba(2, 8, 20, 0)');
  shade.addColorStop(0.25, 'rgba(2, 8, 20, 0.66)');
  shade.addColorStop(0.75, 'rgba(2, 8, 20, 0.66)');
  shade.addColorStop(1, 'rgba(2, 8, 20, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, blockTop, width, blockHeight);

  ctx.fillStyle = '#f87171';
  ctx.fillText(inGoal, width / 2, headY);

  // Both roles, every time. Naming only the keeper let "Player 2 in goal" read
  // as who Player 2 *is* rather than as what they are doing this turn, so the
  // swap went unnoticed and the winner made no sense.
  const turn = frame.suddenDeath
    ? `sudden death  ·  ${frame.names[frame.taker]} is taking this one`
    : `round ${round} of 5  ·  ${frame.names[frame.taker]} is taking this one`;
  fitFont(ctx, turn, 600, narrow ? 13 : 15, width - 24, 10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(turn, width / 2, headY + (narrow ? 22 : 24));

  ctx.font = `500 ${narrow ? 12 : 14}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(
    spot
      ? 'let go to commit'
      : frame.mode === 'versus'
        ? // Worth saying, because it is the question anybody asks of a
          // computer opponent. It decides its shot after the pick and never
          // reads it, which is a promise the code keeps rather than a claim.
          'pick your corner  ·  it will not see where you went'
        : 'pick your corner  ·  the taker cannot see this',
    width / 2,
    headY + (narrow ? 42 : 46)
  );
  ctx.restore();
}

/**
 * The screen that has to hide everything.
 *
 * Opaque on purpose. A translucent one would be prettier and would leak the
 * reticle the keeper just placed, which is the only secret the format has.
 */
export function drawHandover(ctx: Ctx, frame: FrameState, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = '#06141d';
  ctx.fillRect(0, 0, width, height);

  const narrow = width < NARROW;
  ctx.textAlign = 'center';

  const pass = `PASS TO ${frame.names[frame.taker].toUpperCase()}`;
  fitFont(ctx, pass, 700, narrow ? 26 : 34, width - 32);
  ctx.fillStyle = SIDE_COLOURS[frame.taker];
  ctx.fillText(pass, width / 2, height * 0.42);

  const against = `your turn to shoot  ·  ${frame.names[frame.keeperSide]} is in goal`;
  fitFont(ctx, against, 500, narrow ? 14 : 16, width - 24, 10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.fillText(
    against,
    width / 2,
    height * 0.42 + (narrow ? 34 : 42)
  );

  ctx.font = `500 ${narrow ? 13 : 14}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('tap when you have it', width / 2, height * 0.42 + (narrow ? 62 : 76));
  ctx.restore();
}

/**
 * A colour each, in side order.
 *
 * These were five separate literals until the players had names. That was
 * survivable while a colour was decoration: nobody reads "blue" as an identity
 * when the label says PLAYER 2 anyway. A full-time key naming the sides makes
 * blue mean something, and then a blue "PASS TO AMA" while Ama's key dot is
 * green is simply wrong.
 */
export const SIDE_COLOURS: readonly [string, string] = ['#4ade80', '#7dd3fc'];

/**
 * One shot, drawn as a football.
 *
 * Three states, told apart by fill rather than by colour alone: scored is a
 * white ball with its panels on, missed is a dark ball, and not yet taken is
 * an empty outline. A plain disc could only say scored or not, which is what
 * the row of pips this replaces was doing.
 */
function drawScoreBall(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  state: 'scored' | 'missed' | 'pending',
  tint: string
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);

  if (state === 'pending') {
    // Filled as well as outlined. An outline alone vanished against the stand.
    ctx.fillStyle = 'rgba(2, 8, 20, 0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = Math.max(1.2, r * 0.26);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const scored = state === 'scored';
  ctx.fillStyle = scored ? '#f8fafc' : 'rgba(255, 255, 255, 0.13)';
  ctx.fill();

  // The owner's colour is on the rim rather than the ball, so the ball is free
  // to say what happened to it.
  ctx.strokeStyle = tint;
  ctx.globalAlpha = scored ? 1 : 0.55;
  ctx.lineWidth = Math.max(1.2, r * 0.26);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Panels, so it reads as a football rather than a bubble. Only worth drawing
  // once there is room for them.
  if (r >= 4.5) {
    ctx.fillStyle = scored ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * A player's shots, left to right.
 *
 * Returns where the row ended, so a caller can put something after it.
 */
function drawBallRow(
  ctx: Ctx,
  outcomes: (Outcome | undefined)[],
  x: number,
  y: number,
  r: number,
  gap: number,
  tint: string
): number {
  outcomes.forEach((outcome, i) => {
    const state = !outcome ? 'pending' : outcome === 'goal' ? 'scored' : 'missed';
    drawScoreBall(ctx, x + i * gap, y, r, state, tint);
  });
  return x + Math.max(0, outcomes.length - 1) * gap + r;
}

/**
 * Each side's shots, in taker order.
 *
 * A duel alternates, so the flat list interleaves the two players and reading
 * it means counting positions. Splitting it is what lets each row belong to
 * one person.
 */
export function shotsBySide(
  outcomes: Outcome[],
  shotsTotal: number,
  /**
   * True when another round is coming and its empty slots should already be
   * on screen.
   *
   * Counting the rounds that had *started* meant the sixth pair only appeared
   * once somebody had taken the eleventh penalty - so the moment a shootout
   * went to sudden death, the scoreboard still showed a full five each and
   * nothing to say what happens next. The empty pair is the announcement.
   *
   * False once the match is over, or a finished shootout would show a round
   * nobody is going to take.
   */
  awaitingRound: boolean
): [(Outcome | undefined)[], (Outcome | undefined)[]] {
  // The regulation five each, plus every round sudden death has reached, plus
  // the one being waited for. A round in progress shows the taken shot and an
  // empty slot for the answer, which is the state the whole format turns on.
  const rounds = Math.max(
    shotsTotal / 2,
    awaitingRound ? Math.floor(outcomes.length / 2) + 1 : Math.ceil(outcomes.length / 2)
  );
  const rows: [(Outcome | undefined)[], (Outcome | undefined)[]] = [[], []];
  for (let round = 0; round < rounds; round++) {
    rows[0].push(outcomes[round * 2]);
    rows[1].push(outcomes[round * 2 + 1]);
  }
  return rows;
}

export function drawHud(ctx: Ctx, frame: FrameState, width: number, height: number): void {
  ctx.save();

  // A scrim across the top, under everything in the bar.
  //
  // Before the crowd, the HUD sat on sky and needed nothing. A stand behind
  // the goal fills the upper third with high-contrast speckle, and white text
  // on it is unreadable - as are the mode and camera buttons, which are HTML
  // sitting over this canvas and cannot draw their own backdrop over it. A
  // gradient rather than a band, so it has no edge to notice.
  const scrimTo = scrimHeight(width);
  const scrim = ctx.createLinearGradient(0, 0, 0, scrimTo);
  scrim.addColorStop(0, 'rgba(2, 8, 20, 0.84)');
  scrim.addColorStop(0.62, 'rgba(2, 8, 20, 0.62)');
  scrim.addColorStop(1, 'rgba(2, 8, 20, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, scrimTo);

  ctx.textBaseline = 'top';

  // On a phone the mode buttons move to the top-left corner, which is where
  // this was drawn: the score sat underneath them and was unreadable. The
  // buttons are HTML and the score is canvas, so neither can push the other
  // out of the way and the clearance is a number that has to agree with the
  // page's own breakpoint. See the max-width: 559px block in index.astro.
  const top = width < NARROW ? 48 : 16;

  if (twoSided(frame)) {
    for (const side of [0, 1] as const) {
      const taking = frame.taker === side;
      const line = `${frame.names[side].toUpperCase()}  ${frame.scores[side]}${taking ? '   \u2190 taking' : ''}`;
      // Half the width: the camera switcher owns the other half.
      fitFont(ctx, line, 600, 15, width * 0.5 - 24, 10);
      ctx.fillStyle = taking ? SIDE_COLOURS[side] : 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(line, 18, top + side * 20);
    }
  } else {
    ctx.font = `600 15px ${FACE}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(`${frame.player.name}  ${frame.score}/${frame.shotsTotal}`, 18, top);
  }

  // One football per penalty. In a duel, a row each rather than one
  // interleaved line: a flat row alternates between the two players, so
  // reading your own record off it means counting every other position.
  const tight = width < NARROW;
  if (twoSided(frame)) {
    const rows = shotsBySide(
      frame.outcomes,
      frame.shotsTotal,
      frame.suddenDeath && frame.phase !== 'complete'
    );
    // Two rows and two score lines have to fit above the keeper's banner, and
    // on a phone the mode buttons have already pushed everything down. At the
    // desktop size these overlapped "X IN GOAL" by about fifteen pixels.
    const r = tight ? 5 : 7;
    // Tighter again once sudden death has run long enough to need the room.
    const long = rows[0].length > 7;
    const gap = (tight ? 14 : 21) - (long ? 4 : 0);
    const step = tight ? 14 : 21;
    rows.forEach((row, side) => {
      drawBallRow(ctx, row, 22, top + (tight ? 38 : 44) + side * step, r, gap, SIDE_COLOURS[side]);
    });
  } else {
    const row = Array.from({ length: frame.shotsTotal }, (_, i) => frame.outcomes[i]);
    drawBallRow(ctx, row, 22, top + 28, tight ? 6 : 7, tight ? 17 : 21, SIDE_COLOURS[0]);
  }

  ctx.textAlign = 'center';

  // Kept high, above the crossbar. Anything lower lands on top of the goal at
  // the moment the player most wants to see what happened in it.
  const bannerY = height * 0.1;

  const banner = (headline: string, sub: string, color: string): void => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    ctx.font = `700 ${width < NARROW ? 32 : 44}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
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

  // Who is taking this one, held on screen for the whole shot. The arrow in
  // the score is easy to miss, and missing it is what makes the winner of a
  // duel look wrong: "they were the keeper, how did they win?"
  if (twoSided(frame) && (frame.phase === 'ready' || frame.phase === 'runup')) {
    ctx.save();
    ctx.textAlign = 'center';
    const shooting = frame.suddenDeath
      ? `SUDDEN DEATH  ·  ${frame.names[frame.taker].toUpperCase()}`
      : `${frame.names[frame.taker].toUpperCase()} SHOOTING`;
    fitFont(ctx, shooting, 700, width < NARROW ? 15 : 18, width - 32);
    ctx.fillStyle = SIDE_COLOURS[frame.taker];
    ctx.fillText(shooting, width / 2, width < NARROW ? 108 : 120);
    ctx.restore();
  }

  // Hidden once a drag is live: the dial is at the ball and says more, and in
  // the angled view the two were drawn on top of each other.
  if (frame.phase === 'ready' && !frame.aiming) {
    // Short form on a phone. The long one is four clauses and does not fit.
    const lines =
      width < NARROW
        ? ['drag to aim, further is harder', 'release in the green  ·  curl the drag to bend it']
        : [
            'drag to aim  ·  further is harder  ·  release in the green' +
              '  ·  curl the drag sideways on the way out to bend the shot',
          ];
    ctx.font = `500 ${width < NARROW ? 12 : 14}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, height - 42 + i * 17);
    });
  }

  ctx.restore();
}

export { COLORS };
