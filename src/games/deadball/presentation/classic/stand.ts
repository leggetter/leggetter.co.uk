/**
 * What is behind the goal: hoardings, a raked stand, and the people in it.
 *
 * All of it decoration. Nothing here can change an outcome, nothing in `core/`
 * knows it exists, and it touches no seeded generator - the crowd randomises
 * from `Math.random` on purpose, because nothing downstream of it can be
 * wrong and every crowd being the same crowd would be worse.
 *
 * This is the `classic` package's answer, not a shared one. A package drawing
 * another way owes none of it: an interface answering "where is person 412 and
 * how high" would be a call per person per frame, which is precisely what a
 * WebGL crowd exists to avoid.
 *
 * ## What it costs, and how that is paid
 *
 * The scene was a goal, a net, two figures and a ball. This is several hundred
 * people, each at their own offset, sixty times a second, on a phone.
 *
 * The split that makes it affordable: **the stand does not move and the people
 * do.** Terracing and hoardings render once to an offscreen canvas and are
 * blitted. Each person is one `drawImage` from a small atlas of pre-rendered
 * figures, which is the cheap call in canvas2d and the one that scales.
 */

import { BOARDS } from '../../content/boards.js';
import { GOAL_WIDTH, NET_DEPTH } from '../../core/units.ts';
import { vec } from '../../core/vec3.ts';
import type { Projector } from './project.ts';

type Ctx = CanvasRenderingContext2D;

/**
 * Distances, in meters behind the goal line.
 *
 * These were all far too close on the first attempt, which put the front row
 * about five meters behind the net and made each person eighty pixels tall.
 * The camera is necessarily telephoto - it has to frame a 7.32 m goal from
 * 17.5 m - so anything near the goal line comes out enormous.
 */
const BOARD_Z = NET_DEPTH + 5.1;
const BOARD_HEIGHT = 1.05;
const BOARD_WIDTH = 3.4;
const BOARD_GAP = 0.14;
/** Wider than the goal by a good margin, or the run ends inside the frame. */
const RUN_HALF_WIDTH = GOAL_WIDTH / 2 + 22;

const STAND_Z = BOARD_Z + 2.4;
const ROWS = 30;
/** Rise and depth per row. A stand rakes; a bank of people does not. */
const ROW_RISE = 0.42;
const ROW_DEPTH = 0.8;
const ROW_SEATS = 128;
const STAND_HALF_WIDTH = RUN_HALF_WIDTH + 4;

/**
 * How much of a person is drawn, in meters.
 *
 * Head and shoulders above the seat in front, not a whole body. Anybody in a
 * stand is mostly hidden by the row ahead of them, and drawing full figures
 * made the crowd read as people standing on a hillside.
 */
const PERSON_HEIGHT = 1.02;
/** How far out of the seat a reaction lifts somebody, at full commitment. */
const JUMP_HEIGHT = 0.55;

/**
 * Muted on purpose.
 *
 * The first pass used full-saturation primaries, which at this distance read
 * as confetti rather than as people - a crowd seen across a pitch is a dim
 * speckle, and the eye reads density and movement rather than colour.
 */
const SHIRTS = [
  '#7f1d1d',
  '#cbd5e1',
  '#1e3a5f',
  '#854d0e',
  '#14532d',
  '#3b0764',
  '#111827',
  '#475569',
  '#78350f',
  '#0c4a6e',
];
const SKINS = ['#a78868', '#8f6c4d', '#6f4f35', '#523723', '#3a2618'];

/**
 * Four numbers per person, from their index.
 *
 * Hashed rather than stored: same index, same person, every frame, with
 * nothing to allocate, nothing to keep in step and nothing to reset between
 * shots. A stored array of six hundred objects would do the same job and would
 * have to be rebuilt on every resize.
 */
function hash(i: number, salt: number): number {
  let h = (i + 1) * 374761393 + salt * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface Person {
  x: number;
  y: number;
  z: number;
  shirt: number;
  skin: number;
  /** Idle bob, so nobody is ever perfectly still. */
  phase: number;
  /** Seconds before this person reacts. What makes the rise ragged. */
  delay: number;
  /** How far out of the seat they get, 0..1. Some people barely bother. */
  amplitude: number;
  /** How long their jump takes. */
  duration: number;
  /** Where along the stand they are, -1..1, for a reaction that spreads. */
  across: number;
}

/**
 * Everybody, once.
 *
 * Built at mount rather than per frame, because the positions never change -
 * only the offsets do. Gaps are left where a gangway would be, since an
 * unbroken wall of people reads as wallpaper.
 */
export function buildCrowd(): Person[] {
  const people: Person[] = [];
  let i = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let seat = 0; seat < ROW_SEATS; seat++) {
      const across = (seat / (ROW_SEATS - 1)) * 2 - 1;
      // Two gangways and a scatter of empty seats. A full house looks painted.
      const gangway = Math.abs(Math.abs(across) - 0.42) < 0.012;
      if (gangway || hash(i, 11) < 0.05) {
        i++;
        continue;
      }
      people.push({
        x: across * STAND_HALF_WIDTH + (hash(i, 1) - 0.5) * 0.12,
        y: 0.9 + row * ROW_RISE,
        z: STAND_Z + row * ROW_DEPTH,
        shirt: Math.floor(hash(i, 2) * SHIRTS.length),
        skin: Math.floor(hash(i, 3) * SKINS.length),
        phase: hash(i, 4) * Math.PI * 2,
        delay: hash(i, 5) * 0.5,
        amplitude: 0.25 + hash(i, 6) * 0.75,
        duration: 0.55 + hash(i, 7) * 0.7,
        across,
      });
      i++;
    }
  }
  return people;
}

/** A reaction in progress: when it started, and how far from the ball. */
export interface Reaction {
  /** Seconds since it was set off, or null when nothing has happened. */
  elapsed: number | null;
  /** Where the ball crossed, -1..1 across the goal. Spreads the wave. */
  from: number;
  /** How hard the crowd took it. A save lifts fewer people than a goal. */
  strength: number;
}

/**
 * How far out of their seat somebody is, right now.
 *
 * The delay is what matters here. Everybody rising together reads as one
 * cut-out being translated upward, which is worse than not animating at all.
 * Each person's own delay, plus a term for how far they sit from where the
 * ball went, makes the reaction start near the ball and spread outward.
 */
function lift(person: Person, reaction: Reaction): number {
  if (reaction.elapsed === null) return 0;
  const spread = Math.abs(person.across - reaction.from) * 0.34;
  const t = reaction.elapsed - person.delay - spread;
  if (t <= 0 || t >= person.duration) return 0;
  // Up fast, down slower, which is what a jump looks like.
  const u = t / person.duration;
  const shape = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
  return shape * person.amplitude * reaction.strength * JUMP_HEIGHT;
}

/**
 * Pre-rendered figures: one sprite per shirt and skin pair.
 *
 * Six hundred `beginPath`/`arc`/`fill` triples a frame is the thing that would
 * cost; six hundred `drawImage` calls is not. Rebuilt on resize because the
 * sprite has to be drawn at roughly the size it will be used.
 */
export interface CrowdAtlas {
  sprites: HTMLCanvasElement[];
  /** Pixels tall, as drawn. */
  size: number;
}

export function buildAtlas(pixelsPerPerson: number): CrowdAtlas {
  // Drawn at twice the size it is used at and scaled down, which costs nothing
  // once and stops the smallest figures turning into three grey pixels.
  const size = Math.max(6, Math.min(64, Math.round(pixelsPerPerson * 2)));
  const sprites: HTMLCanvasElement[] = [];
  for (const shirt of SHIRTS) {
    for (const skin of SKINS) {
      const sprite = document.createElement('canvas');
      const w = Math.max(4, Math.round(size * 0.78));
      sprite.width = w;
      sprite.height = size;
      const c = sprite.getContext('2d');
      if (c) {
        // Shoulders, tapering in at the top. A plain rectangle tiled into a
        // brick wall, which is exactly what a crowd must not look like.
        c.fillStyle = shirt;
        c.beginPath();
        c.moveTo(0, size);
        c.lineTo(w * 0.1, size * 0.38);
        c.lineTo(w * 0.9, size * 0.38);
        c.lineTo(w, size);
        c.closePath();
        c.fill();

        // A third of the figure, not a half. At 0.44 the heads were the only
        // thing the eye could pick out and the whole stand read as polka dots;
        // a crowd at this distance is mostly shoulders.
        c.fillStyle = skin;
        const head = size * 0.34;
        c.beginPath();
        c.ellipse(w / 2, head * 0.62, head * 0.38, head * 0.46, 0, 0, Math.PI * 2);
        c.fill();
      }
      sprites.push(sprite);
    }
  }
  return { sprites, size };
}

const spriteIndex = (person: Person): number => person.shirt * SKINS.length + person.skin;

/**
 * The stand and the hoardings, drawn once to an offscreen canvas.
 *
 * Neither moves, so neither has any business being redrawn sixty times a
 * second. This is regenerated only when the size or the camera changes, which
 * is when it can afford to be.
 */
export function renderBackdrop(
  projector: Projector,
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (width <= 0 || height <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawTerracing(ctx, projector);
  drawBoards(ctx, projector);
  return canvas;
}

/**
 * The structure, back to front: the roof shadow, then the rows.
 *
 * Rows rise *and* recede, so a row further back is genuinely higher and
 * genuinely further away. The projector then puts it higher and smaller on
 * screen because of the arithmetic that already draws everything else, rather
 * than because of a 2D trick that would have to be redone for the angled
 * camera.
 */
function drawTerracing(ctx: Ctx, projector: Projector): void {
  for (let row = ROWS - 1; row >= 0; row--) {
    const y = 0.9 + row * ROW_RISE;
    const z = STAND_Z + row * ROW_DEPTH;

    const left = projector.project(vec(-STAND_HALF_WIDTH, y, z));
    const right = projector.project(vec(STAND_HALF_WIDTH, y, z));
    const footLeft = projector.project(vec(-STAND_HALF_WIDTH, y - ROW_RISE, z));
    if (!left || !right || !footLeft) continue;

    // The vertical face between this row and the one in front. Darker at the
    // back, which is the whole of the depth cue a flat stand would be missing.
    const shade = 0.12 + (row / ROWS) * 0.1;
    ctx.fillStyle = `rgba(15, 23, 42, ${0.75 - shade})`;
    ctx.fillRect(left.x, left.y, right.x - left.x, Math.max(1, footLeft.y - left.y));

    ctx.fillStyle = `rgba(51, 65, 85, ${0.5 + shade})`;
    ctx.fillRect(left.x, left.y - 1, right.x - left.x, 2);
  }
}

/**
 * The hoardings.
 *
 * They do more work than their size suggests: they are the depth cue that
 * makes the stand read as behind the goal rather than floating above it, they
 * give the netting something to be seen against, and they occlude the feet of
 * the front row, which is what stops the bottom of the stand looking like it
 * is standing on the pitch.
 */
function drawBoards(ctx: Ctx, projector: Projector): void {
  const pitch = BOARD_WIDTH + BOARD_GAP;
  const count = Math.ceil((RUN_HALF_WIDTH * 2) / pitch);
  const startX = -RUN_HALF_WIDTH;

  for (let i = 0; i < count; i++) {
    const board = BOARDS[i % BOARDS.length];
    if (!board) continue;
    const x0 = startX + i * pitch;
    const x1 = Math.min(x0 + BOARD_WIDTH, RUN_HALF_WIDTH);

    const topLeft = projector.project(vec(x0, BOARD_HEIGHT, BOARD_Z));
    const topRight = projector.project(vec(x1, BOARD_HEIGHT, BOARD_Z));
    const bottomLeft = projector.project(vec(x0, 0, BOARD_Z));
    if (!topLeft || !topRight || !bottomLeft) continue;

    const w = topRight.x - topLeft.x;
    const h = bottomLeft.y - topLeft.y;
    if (w <= 1 || h <= 1) continue;

    ctx.fillStyle = board.panel;
    ctx.fillRect(topLeft.x, topLeft.y, w, h);

    // Knocked back a shade. A hoarding is in the shade of the stand behind it
    // and faces away from the light; at full brightness the run of them pulled
    // the eye off the goal, which is the one thing on screen that matters.
    ctx.fillStyle = 'rgba(2, 8, 20, 0.22)';
    ctx.fillRect(topLeft.x, topLeft.y, w, h);

    // A thin rail along the top, which is what makes it a hoarding rather than
    // a coloured rectangle lying on the grass.
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(topLeft.x, topLeft.y, w, Math.max(1, h * 0.14));

    const fontSize = h * 0.3;
    if (fontSize >= 4) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(topLeft.x, topLeft.y, w, h);
      ctx.clip();
      ctx.fillStyle = board.ink;
      ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(board.text, topLeft.x + w / 2, topLeft.y + h * 0.6, w * 0.82);
      ctx.restore();
    }
  }
}

/**
 * The people, every frame.
 *
 * Back row first, so somebody in front overlaps somebody behind rather than
 * the other way round. Draw order is depth, the same rule the rest of the
 * scene follows.
 */
export function drawCrowd(
  ctx: Ctx,
  projector: Projector,
  people: Person[],
  atlas: CrowdAtlas,
  clock: number,
  reaction: Reaction,
  still = false
): void {
  for (let i = people.length - 1; i >= 0; i--) {
    const person = people[i]!;
    // Nobody is ever perfectly still, and everybody breathes at their own rate.
    // Unless the reader has asked for no motion, in which case everybody is:
    // several hundred independently moving figures is the most motion on the
    // page by a distance, and the stand and hoardings are furniture either way.
    const bob = still ? 0 : Math.sin(clock * 1.6 + person.phase) * 0.018;
    const y = person.y + bob + (still ? 0 : lift(person, reaction));

    const head = projector.project(vec(person.x, y + PERSON_HEIGHT, person.z));
    if (!head) continue;
    // Culled before the second projection, because the stand is far wider than
    // any screen and most of it lands nowhere. Roughly three of every four
    // people are rejected here on one multiply and a comparison.
    if (head.x < -32 || head.x > ctx.canvas.width + 32) continue;
    if (head.y > ctx.canvas.height + 32) continue;

    const feet = projector.project(vec(person.x, y, person.z));
    if (!feet) continue;

    const h = feet.y - head.y;
    if (h < 1.5) continue;
    const w = h * 0.78;
    const sprite = atlas.sprites[spriteIndex(person)];
    if (!sprite) continue;
    ctx.drawImage(sprite, head.x - w / 2, head.y, w, h);
  }
}

/** How tall a person will be on screen, for sizing the atlas. */
export function crowdPixelHeight(projector: Projector): number {
  const head = projector.project(vec(0, 0.9 + PERSON_HEIGHT, STAND_Z));
  const feet = projector.project(vec(0, 0.9, STAND_Z));
  if (!head || !feet) return 12;
  return Math.max(4, feet.y - head.y);
}
