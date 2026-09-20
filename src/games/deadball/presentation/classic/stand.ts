/**
 * The stadium: four raked stands around the pitch, the hoardings in front of
 * them, the floodlights at the corners, and the people in the seats.
 *
 * It was one stand behind the goal, which left `keeper-cam` looking out at
 * sky and grass. Three more is not three times the work at runtime, because a
 * camera can only look one way: the stand behind it is culled on a comparison,
 * and the two beside it are seen edge-on with most of each off the frame.
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
import { vec, type Vec3 } from '../../core/vec3.ts';
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
const BOARD_HEIGHT = 1.05;
const BOARD_WIDTH = 3.4;
const BOARD_GAP = 0.14;

/** Rise and depth per row. A stand rakes; a bank of people does not. */
const ROW_RISE = 0.42;
const ROW_DEPTH = 0.8;
/** Meters of bench per person, which sets how dense a stand looks. */
const SEAT_PITCH = 0.46;

/**
 * A full-size pitch, so that the far goal is where a far goal should be.
 *
 * The game only ever uses one end of it - the goal being shot at is on the
 * line at z = 0 and play runs toward negative z - but `keeper-cam` looks down
 * the length of it, and a pitch that stopped twenty meters away was the reason
 * that view read as a practice ground.
 */
export const PITCH_LENGTH = 105;
export const PITCH_HALF_WIDTH = 34;

/** How far the hoardings sit outside the playing surface. */
const END_GAP = NET_DEPTH + 5.1;
const SIDE_GAP = 6.5;
/** And the front row, a little further back again. */
const STAND_SET_BACK = 2.4;

/**
 * Which way a stand runs, and where.
 *
 * `along` is the axis its rows run down; `front` is the fixed coordinate on
 * the other axis, where the hoardings stand; `away` is the direction the rows
 * recede in, which is always outward from the pitch.
 */
export interface StandSpec {
  id: string;
  along: 'x' | 'z';
  front: number;
  away: 1 | -1;
  centre: number;
  halfLength: number;
  rows: number;
}

/**
 * Behind each goal and down each side.
 *
 * The ends are deeper than the sides because that is what grounds look like,
 * and because the end behind the goal being shot at is the one the default
 * camera stares at for the whole game.
 */
export const STANDS: StandSpec[] = [
  {
    id: 'near-end',
    along: 'x',
    front: END_GAP + STAND_SET_BACK,
    away: 1,
    centre: 0,
    halfLength: PITCH_HALF_WIDTH - 4,
    rows: 30,
  },
  {
    id: 'far-end',
    along: 'x',
    front: -PITCH_LENGTH - END_GAP - STAND_SET_BACK,
    away: -1,
    centre: 0,
    halfLength: PITCH_HALF_WIDTH - 4,
    rows: 30,
  },
  {
    id: 'left-side',
    along: 'z',
    front: -PITCH_HALF_WIDTH - SIDE_GAP - STAND_SET_BACK,
    away: -1,
    centre: -PITCH_LENGTH / 2,
    halfLength: PITCH_LENGTH / 2 - 2,
    // Shallower than the ends. A side stand is seen edge-on from every camera
    // this game has, so rows behind the first few are a cost with no picture.
    rows: 20,
  },
  {
    id: 'right-side',
    along: 'z',
    front: PITCH_HALF_WIDTH + SIDE_GAP + STAND_SET_BACK,
    away: 1,
    centre: -PITCH_LENGTH / 2,
    halfLength: PITCH_LENGTH / 2 - 2,
    rows: 20,
  },
];

/** Where the hoardings for a stand sit: in front of its first row. */
const boardLine = (stand: StandSpec): number => stand.front - stand.away * STAND_SET_BACK;

/** World position of a seat, whichever way its stand runs. */
function seatAt(stand: StandSpec, t: number, row: number, jitter: number): [number, number] {
  const alongPos = stand.centre + t * stand.halfLength + jitter;
  const outPos = stand.front + stand.away * row * ROW_DEPTH;
  return stand.along === 'x' ? [alongPos, outPos] : [outPos, alongPos];
}

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
 * Below this many pixels tall, a person is painted into the backdrop once
 * instead of being drawn every frame.
 *
 * Measured, after four stands took `keeper-cam` to 27 fps at four times CPU
 * throttling where one stand had held 60 at six. Looking down the length of
 * the pitch puts nearly seven thousand people in shot, and most of them are
 * the far end at over a hundred metres - two or three pixels each, where a
 * bob of two centimetres moves them by nothing at all.
 *
 * So they stop being animated and become texture. They are still *there*,
 * drawn once into the same offscreen canvas as the terracing, which costs
 * nothing per frame.
 *
 * The number is measured rather than picked. The first guess was 3.4 px and
 * cut nothing at all: every camera here is telephoto - it has to frame a
 * 7.32 m goal - so even the far stand at 110 m projects people 6 to 10 px
 * tall. Profiling the view found 4,940 people in that band and 2,047 above
 * it, which is where the threshold went. At 9.5 px a person is about nine
 * pixels of shoulders, an idle bob moves them by a sixth of a pixel, and what
 * is lost is the far end joining a celebration a hundred metres away.
 */
const LIVE_HEIGHT_PX = 9.5;

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
  /** Which stand they are in, so the stands can be drawn in depth order. */
  stand: number;
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

  STANDS.forEach((stand, standIndex) => {
    const seats = Math.round((stand.halfLength * 2) / SEAT_PITCH);
    for (let row = 0; row < stand.rows; row++) {
      for (let seat = 0; seat < seats; seat++) {
        const across = (seat / (seats - 1)) * 2 - 1;
        // Gangways and a scatter of empty seats. A full house looks painted.
        const gangway = Math.abs(Math.abs(across) - 0.42) < 0.012;
        if (gangway || hash(i, 11) < 0.05) {
          i++;
          continue;
        }
        const [x, z] = seatAt(stand, across, row, (hash(i, 1) - 0.5) * 0.12);
        people.push({
          stand: standIndex,
          x,
          y: 0.9 + row * ROW_RISE,
          z,
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
  });

  return people;
}

/**
 * The stands, furthest from the camera first.
 *
 * There is no depth buffer here - things are drawn in order and the last one
 * wins - so four stands have to be painted back to front or a near one ends up
 * behind a far one. Sorting the *stands* rather than the twenty thousand
 * people in them is what makes that affordable: four projections a frame
 * against twenty thousand comparisons.
 */
export function standsByDepth(projector: Projector): number[] {
  const order = STANDS.map((stand, index) => {
    const [x, z] = seatAt(stand, 0, stand.rows / 2, 0);
    const at = projector.project(vec(x, 2, z));
    // Behind the camera: sorted to the front so it is drawn first and then
    // culled away person by person, which costs one comparison each.
    return { index, depth: at ? at.depth : -1 };
  });
  order.sort((a, b) => b.depth - a.depth);
  return order.map((o) => o.index);
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
  height: number,
  /** Everybody. Whoever is too small to animate is painted in here. */
  people?: Person[],
  atlas?: CrowdAtlas
): HTMLCanvasElement | null {
  if (width <= 0 || height <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Back to front, so a near stand paints over a far one. The distant crowd
  // goes in with its own stand's terracing rather than all at the end, or a
  // near stand's structure would paint over a far stand's people.
  const order = standsByDepth(projector);
  for (const index of order) {
    const stand = STANDS[index];
    if (!stand) continue;
    drawTerracing(ctx, projector, stand);
    if (people && atlas) drawDistantCrowd(ctx, projector, people, atlas, index);
    drawBoards(ctx, projector, stand, index * 3);
  }
  // Floodlights last: taller than everything, and standing at the corners
  // between the stands rather than in any of them.
  drawFloodlights(ctx, projector);
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
/**
 * Fill a world-space quad.
 *
 * Every surface here used to be drawn with `fillRect` on two projected
 * corners, which is right for a stand square to the camera and wrong for one
 * seen from the side: a rectangle in the world projects to a trapezoid, and
 * the rectangle version sheared off the ends of both side stands. Four corners
 * and a path costs the same and is correct from anywhere.
 */
function quad(ctx: Ctx, projector: Projector, corners: Vec3[], fill: string): void {
  const points = corners.map((c) => projector.project(c));
  if (points.some((p) => !p)) return;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p!.x, p!.y) : ctx.lineTo(p!.x, p!.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * The terracing of one stand, back row first.
 *
 * Rows rise *and* recede, so a row further back is genuinely higher and
 * genuinely further away. The projector then puts it higher and smaller on
 * screen because of the arithmetic that already draws everything else, rather
 * than because of a 2D trick that would have to be redone per camera.
 */
function drawTerracing(ctx: Ctx, projector: Projector, stand: StandSpec): void {
  for (let row = stand.rows - 1; row >= 0; row--) {
    const y = 0.9 + row * ROW_RISE;
    const [xa, za] = seatAt(stand, -1, row, 0);
    const [xb, zb] = seatAt(stand, 1, row, 0);

    // The vertical face between this row and the one in front. Darker at the
    // back, which is the whole of the depth cue a flat stand would be missing.
    const shade = 0.12 + (row / stand.rows) * 0.1;
    quad(
      ctx,
      projector,
      [vec(xa, y, za), vec(xb, y, zb), vec(xb, y - ROW_RISE, zb), vec(xa, y - ROW_RISE, za)],
      `rgba(15, 23, 42, ${0.75 - shade})`
    );
    quad(
      ctx,
      projector,
      [
        vec(xa, y + 0.05, za),
        vec(xb, y + 0.05, zb),
        vec(xb, y - 0.03, zb),
        vec(xa, y - 0.03, za),
      ],
      `rgba(51, 65, 85, ${0.5 + shade})`
    );
  }
}

/**
 * The hoardings in front of one stand.
 *
 * They do more work than their size suggests: they are the depth cue that
 * makes a stand read as *behind* the pitch rather than floating above it, they
 * give the netting something to be seen against, and they occlude the feet of
 * the front row, which is what stops a stand looking like it is standing on
 * the grass.
 */
function drawBoards(ctx: Ctx, projector: Projector, stand: StandSpec, offset: number): void {
  const line = boardLine(stand);
  const step = BOARD_WIDTH + BOARD_GAP;
  const count = Math.ceil((stand.halfLength * 2) / step);

  const at = (t: number, y: number): Vec3 => {
    const along = stand.centre - stand.halfLength + t;
    return stand.along === 'x' ? vec(along, y, line) : vec(line, y, along);
  };

  for (let i = 0; i < count; i++) {
    // Offset per stand so the same board does not land in the same place at
    // every corner, which is what makes a repeating list read as a repeat.
    const board = BOARDS[(i + offset) % BOARDS.length];
    if (!board) continue;
    const a = i * step;
    const b = Math.min(a + BOARD_WIDTH, stand.halfLength * 2);

    const topA = projector.project(at(a, BOARD_HEIGHT));
    const topB = projector.project(at(b, BOARD_HEIGHT));
    const footA = projector.project(at(a, 0));
    if (!topA || !topB || !footA) continue;

    const w = topB.x - topA.x;
    const h = footA.y - topA.y;
    if (Math.abs(w) <= 1 || h <= 1) continue;

    quad(
      ctx,
      projector,
      [at(a, BOARD_HEIGHT), at(b, BOARD_HEIGHT), at(b, 0), at(a, 0)],
      board.panel
    );
    // Knocked back a shade: a hoarding faces away from the light and sits in
    // the shade of the stand behind it. At full brightness the run of them
    // pulled the eye off the goal.
    quad(
      ctx,
      projector,
      [at(a, BOARD_HEIGHT), at(b, BOARD_HEIGHT), at(b, 0), at(a, 0)],
      'rgba(2, 8, 20, 0.22)'
    );
    quad(
      ctx,
      projector,
      [
        at(a, BOARD_HEIGHT),
        at(b, BOARD_HEIGHT),
        at(b, BOARD_HEIGHT * 0.86),
        at(a, BOARD_HEIGHT * 0.86),
      ],
      'rgba(15, 23, 42, 0.4)'
    );

    // Lettering only where it would be legible and roughly face-on. On a
    // stand seen edge-on the text would be a smear a few pixels wide, which
    // costs a text layout per board to draw nothing anybody can read.
    const fontSize = h * 0.3;
    if (fontSize >= 4 && Math.abs(w) > fontSize * 2.2) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.min(topA.x, topB.x), topA.y, Math.abs(w), h);
      ctx.clip();
      ctx.fillStyle = board.ink;
      ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(board.text, (topA.x + topB.x) / 2, topA.y + h * 0.6, Math.abs(w) * 0.82);
      ctx.restore();
    }
  }
}

/**
 * Floodlights, at the four corners.
 *
 * The cheapest thing in this file by a distance and the one that does most:
 * *height* is what makes a place read as a stadium, not seat count. They are
 * tall enough to be in shot from every camera including the one looking out of
 * the goal, and they are static, so they cost nothing per frame.
 */
function drawFloodlights(ctx: Ctx, projector: Projector): void {
  const x = PITCH_HALF_WIDTH + SIDE_GAP + 2;
  const z = [END_GAP + 2, -PITCH_LENGTH - END_GAP - 2];
  const corners: [number, number][] = [
    [-x, z[0]!],
    [x, z[0]!],
    [-x, z[1]!],
    [x, z[1]!],
  ];

  // Furthest first, so a near pylon paints over a far one.
  const sorted = corners
    .map((c) => ({ c, at: projector.project(vec(c[0], 0, c[1])) }))
    .filter((p) => p.at)
    .sort((a, b) => b.at!.depth - a.at!.depth);

  for (const { c } of sorted) {
    const [cx, cz] = c;
    // Seventeen metres, where a real one is thirty or more. Every camera here
    // is telephoto and eats vertical frame, so a true-height pylon put its
    // head off the top of the screen and left a bare pole - which is a pole,
    // not a floodlight. The head is the part that reads.
    const mast = 17;
    const head = 5;

    // The mast, tapering. Two uprights and a lattice would be prettier and is
    // not worth the draw calls at this distance.
    quad(
      ctx,
      projector,
      [vec(cx - 0.55, 0, cz), vec(cx + 0.55, 0, cz), vec(cx + 0.3, mast, cz), vec(cx - 0.3, mast, cz)],
      'rgba(30, 41, 59, 0.92)'
    );

    // The head, and the glow off it. The glow is what sells a floodlight;
    // without it the mast reads as a pole with a box on top.
    quad(
      ctx,
      projector,
      [
        vec(cx - head / 2, mast, cz),
        vec(cx + head / 2, mast, cz),
        vec(cx + head / 2, mast + 3.4, cz),
        vec(cx - head / 2, mast + 3.4, cz),
      ],
      'rgba(51, 65, 85, 0.95)'
    );

    const lamp = projector.project(vec(cx, mast + 1.7, cz));
    if (!lamp) continue;
    const r = Math.max(6, head * lamp.scale * 0.9);
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, r);
    glow.addColorStop(0, 'rgba(255, 252, 232, 0.85)');
    glow.addColorStop(0.35, 'rgba(255, 249, 196, 0.28)');
    glow.addColorStop(1, 'rgba(255, 249, 196, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, r, 0, Math.PI * 2);
    ctx.fill();

    // The lamps themselves, a grid of them, so the head is not a flat slab.
    const across = Math.max(2, Math.round(head * lamp.scale * 0.22));
    for (let i = 0; i < across; i++) {
      for (let j = 0; j < 2; j++) {
        const at = projector.project(
          vec(cx - head / 2 + ((i + 0.5) / across) * head, mast + 0.9 + j * 1.5, cz)
        );
        if (!at) continue;
        ctx.fillStyle = 'rgba(255, 253, 240, 0.9)';
        ctx.beginPath();
        ctx.arc(at.x, at.y, Math.max(0.8, 0.35 * at.scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * The people too far away to be worth animating, painted once.
 *
 * Deliberately the same projection, the same atlas and the same threshold as
 * the live pass, so the two partition the crowd exactly: everybody is drawn,
 * once, by one of them. A different threshold in each would leave a band
 * drawn twice and a band not drawn at all, and both are the kind of bug that
 * looks like a rendering glitch rather than an arithmetic one.
 */
function drawDistantCrowd(
  ctx: Ctx,
  projector: Projector,
  people: Person[],
  atlas: CrowdAtlas,
  standIndex: number
): void {
  for (let i = people.length - 1; i >= 0; i--) {
    const person = people[i]!;
    if (person.stand !== standIndex) continue;

    const head = projector.project(vec(person.x, person.y + PERSON_HEIGHT, person.z));
    if (!head) continue;
    if (head.x < -32 || head.x > ctx.canvas.width + 32) continue;
    if (head.y > ctx.canvas.height + 32) continue;

    const feet = projector.project(vec(person.x, person.y, person.z));
    if (!feet) continue;
    const h = feet.y - head.y;
    if (h < 1 || h >= LIVE_HEIGHT_PX) continue;

    const w = h * 0.78;
    const sprite = atlas.sprites[spriteIndex(person)];
    if (!sprite) continue;
    ctx.drawImage(sprite, head.x - w / 2, head.y, w, h);
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
  still = false,
  /** Stand indices, furthest first. Without it, four stands paint in the
   *  order they were built and a near one ends up behind a far one. */
  order: number[] = [0, 1, 2, 3]
): void {
  const rank = new Array<number>(STANDS.length).fill(0);
  order.forEach((standIndex, at) => (rank[standIndex] = at));

  // Grouped by stand rather than sorted person by person: four numbers to
  // order against twenty thousand, and the stands do not interpenetrate.
  const byStand: Person[][] = STANDS.map(() => []);
  for (const person of people) byStand[person.stand]?.push(person);

  for (const standIndex of order) {
    drawOneStand(ctx, projector, byStand[standIndex] ?? [], atlas, clock, reaction, still);
  }
  void rank;
}

function drawOneStand(
  ctx: Ctx,
  projector: Projector,
  people: Person[],
  atlas: CrowdAtlas,
  clock: number,
  reaction: Reaction,
  still: boolean
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
    // Anyone this small is in the backdrop already; drawing them here would
    // paint them twice and cost the frame the thing this exists to save.
    if (h < LIVE_HEIGHT_PX) continue;
    const w = h * 0.78;
    const sprite = atlas.sprites[spriteIndex(person)];
    if (!sprite) continue;
    ctx.drawImage(sprite, head.x - w / 2, head.y, w, h);
  }
}

/**
 * How tall a person will be on screen, for sizing the atlas.
 *
 * Measured at the front row of the nearest stand that is actually in shot, so
 * the sprites are drawn at about the size they are used. Picking one stand and
 * always measuring there gave a three-pixel atlas from `keeper-cam`, where the
 * stand it measured is behind the camera.
 */
export function crowdPixelHeight(projector: Projector): number {
  let tallest = 0;
  for (const stand of STANDS) {
    const [x, z] = seatAt(stand, 0, 0, 0);
    const head = projector.project(vec(x, 0.9 + PERSON_HEIGHT, z));
    const feet = projector.project(vec(x, 0.9, z));
    if (!head || !feet) continue;
    tallest = Math.max(tallest, feet.y - head.y);
  }
  return Math.max(4, tallest || 12);
}
