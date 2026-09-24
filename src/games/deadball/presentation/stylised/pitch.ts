/**
 * The grass, the lines, the goals and the hoardings.
 *
 * All of it generated here: the pitch is painted onto a canvas at start-up -
 * mowing stripes, a goalmouth worn down to the soil, the markings - and used
 * as a texture, so there are no image files and nothing to license. The same
 * painting covers both halves, turned round for the far one, so the far
 * goalmouth is worn too.
 *
 * Everything is in core/'s world metres, inside the mirrored group (see
 * camera.ts), so a post at x = 3.66 is written as x = 3.66.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

import { BOARDS } from '../../content/boards.js';
import { FRAME_RADIUS, GOAL_HEIGHT, GOAL_WIDTH, NET_DEPTH, PENALTY_DISTANCE } from '../../core/units.ts';

export const PITCH_LENGTH = 105;
export const PITCH_HALF_WIDTH = 34;
const HALF_GOAL = GOAL_WIDTH / 2;

/** How much grass is painted either side of the touchlines and behind the goal line. */
const MARGIN_X = 5;
const MARGIN_Z = 7;
const SPAN_X = PITCH_HALF_WIDTH + MARGIN_X;
/** The painted half: from halfway to behind the goal line. */
const HALF_FROM = -PITCH_LENGTH / 2;
const HALF_TO = MARGIN_Z;

/** Anything that has to be let go of when the package is destroyed. */
export type Own = <T extends { dispose(): void }>(thing: T) => T;

/** A canvas to paint on, in the page or off it. */
export function makeCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height);
}

type Paint = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Stable noise, so the same worn patch is the same worn patch on every visit. */
function hash(i: number, salt: number): number {
  let h = (i + 1) * 2246822519 + salt * 3266489917;
  h = (h ^ (h >>> 15)) * 2654435761;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/**
 * Half a pitch, painted in metres: x across, z from halfway (-52.5) to behind
 * the goal line.
 */
function paintHalf(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d') as Paint | null;
  if (!ctx) return canvas;
  const sx = width / (SPAN_X * 2);
  const sz = height / (HALF_TO - HALF_FROM);
  ctx.setTransform(sx, 0, 0, sz, SPAN_X * sx, -HALF_FROM * sz);

  // Mowing stripes, 3.5 m wide like classic's, square to the goal line.
  const STRIPE = 3.5;
  for (let i = Math.floor(HALF_FROM / STRIPE) - 1; i * STRIPE < HALF_TO; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3a7a45' : '#326b3c';
    ctx.fillRect(-SPAN_X, i * STRIPE, SPAN_X * 2, STRIPE);
  }

  // Wear. The goalmouth takes a keeper's weight every kick and goes to soil
  // in front of the line; the spot is scuffed bald. Radial washes of earth,
  // then a scatter of darker and lighter flecks so it reads as ground rather
  // than as a brown shape.
  const wash = (x: number, z: number, rx: number, rz: number, alpha: number): void => {
    ctx.save();
    ctx.translate(x, z);
    ctx.scale(rx, rz);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(122, 98, 60, ${alpha})`);
    g.addColorStop(0.55, `rgba(110, 96, 58, ${alpha * 0.55})`);
    g.addColorStop(1, 'rgba(110, 96, 58, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  wash(0, -1.1, 3.6, 1.7, 0.75);
  wash(0, -3.2, 5.5, 2.6, 0.35);
  wash(0, -PENALTY_DISTANCE, 0.9, 0.7, 0.7);
  wash(0, -PENALTY_DISTANCE - 1.4, 1.1, 1.6, 0.3);
  for (let i = 0; i < 2400; i++) {
    const x = (hash(i, 1) - 0.5) * 11;
    const z = -hash(i, 2) * 6.5;
    const fall = Math.exp(-((x / 4.2) ** 2) - ((z + 1.4) / 2.6) ** 2);
    if (hash(i, 3) > fall) continue;
    ctx.fillStyle = hash(i, 4) < 0.5 ? 'rgba(84, 66, 40, 0.5)' : 'rgba(92, 128, 70, 0.45)';
    ctx.fillRect(x, z, 0.09 + hash(i, 5) * 0.12, 0.05 + hash(i, 6) * 0.1);
  }

  // The markings. 12 cm, as real ones are.
  ctx.strokeStyle = 'rgba(244, 246, 240, 0.88)';
  ctx.fillStyle = 'rgba(244, 246, 240, 0.88)';
  ctx.lineWidth = 0.12;
  const line = (points: [number, number][]): void => {
    ctx.beginPath();
    points.forEach(([x, z], i) => (i === 0 ? ctx.moveTo(x, z) : ctx.lineTo(x, z)));
    ctx.stroke();
  };
  line([
    [-PITCH_HALF_WIDTH, HALF_FROM],
    [-PITCH_HALF_WIDTH, 0],
    [PITCH_HALF_WIDTH, 0],
    [PITCH_HALF_WIDTH, HALF_FROM],
  ]);
  line([
    [-PITCH_HALF_WIDTH, HALF_FROM],
    [PITCH_HALF_WIDTH, HALF_FROM],
  ]);
  const box = (halfWidth: number, depth: number): void =>
    line([
      [-halfWidth, 0],
      [-halfWidth, -depth],
      [halfWidth, -depth],
      [halfWidth, 0],
    ]);
  box(9.16, 5.5);
  box(20.16, 16.5);
  // The arc on the edge of the box: the part of a 9.15 m circle round the
  // spot that is outside it.
  const clear = Math.asin((16.5 - PENALTY_DISTANCE) / 9.15);
  ctx.beginPath();
  ctx.arc(0, -PENALTY_DISTANCE, 9.15, Math.PI + clear, Math.PI * 2 - clear);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -PENALTY_DISTANCE, 0.11, 0, Math.PI * 2);
  ctx.fill();
  // The centre circle's near half, and the centre spot.
  ctx.beginPath();
  ctx.arc(0, HALF_FROM, 9.15, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, HALF_FROM, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // A little wear over the lines too, so the goal line in the goalmouth is
  // scuffed rather than freshly painted across the soil.
  wash(0, -0.3, 2.4, 0.5, 0.35);
  return canvas;
}

/** One half of the grass, with UVs worked out from where each corner is. */
function halfGeometry(towardFar: boolean): BufferGeometry {
  const length = HALF_TO - HALF_FROM;
  const geometry = new PlaneGeometry(SPAN_X * 2, length, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  // Near half: from halfway to behind the near goal. Far half: the same
  // painting, turned end for end about the halfway line.
  const centre = (HALF_FROM + HALF_TO) / 2;
  geometry.translate(0, 0, towardFar ? -PITCH_LENGTH - centre : centre);
  const position = geometry.getAttribute('position') as BufferAttribute;
  const uv = geometry.getAttribute('uv') as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const worldZ = position.getZ(i);
    const z = towardFar ? -PITCH_LENGTH - worldZ : worldZ;
    // The canvas's top row is v = 1 once three has flipped it for upload.
    uv.setXY(i, (x + SPAN_X) / (SPAN_X * 2), 1 - (z - HALF_FROM) / length);
  }
  uv.needsUpdate = true;
  return geometry;
}

export interface PitchOptions {
  /** Texture height in pixels, along the pitch. Its width is half that. */
  texture: number;
  anisotropy: number;
}

export function buildPitch(own: Own, options: PitchOptions): Group {
  const group = new Group();

  const painted = own(new CanvasTexture(paintHalf(options.texture / 2, options.texture) as HTMLCanvasElement));
  painted.colorSpace = SRGBColorSpace;
  painted.anisotropy = options.anisotropy;
  const grass = own(new MeshStandardMaterial({ map: painted, roughness: 0.95, metalness: 0 }));
  for (const far of [false, true]) {
    const half = new Mesh(own(halfGeometry(far)), grass);
    half.receiveShadow = true;
    group.add(half);
  }

  // Beyond the painted grass, out to the stands: plainer and a little darker.
  const surround = new Mesh(
    own(new PlaneGeometry(240, 300).rotateX(-Math.PI / 2).translate(0, -0.02, -PITCH_LENGTH / 2)),
    own(new MeshStandardMaterial({ color: '#2b5a34', roughness: 1 }))
  );
  surround.receiveShadow = true;
  group.add(surround);

  group.add(buildGoal(own, 0, false), buildGoal(own, -PITCH_LENGTH, true));
  group.add(buildHoardings(own));
  return group;
}

/** Posts, bar and net. `far` builds the other end's, facing the other way. */
function buildGoal(own: Own, z: number, far: boolean): Group {
  const goal = new Group();
  const white = own(new MeshStandardMaterial({ color: '#f2f4f5', roughness: 0.35, metalness: 0.05 }));
  const post = own(new CylinderGeometry(FRAME_RADIUS, FRAME_RADIUS, GOAL_HEIGHT + FRAME_RADIUS, 16));
  for (const x of [-HALF_GOAL, HALF_GOAL]) {
    const mesh = new Mesh(post, white);
    mesh.position.set(x, (GOAL_HEIGHT + FRAME_RADIUS) / 2, 0);
    mesh.castShadow = !far;
    goal.add(mesh);
  }
  const bar = new Mesh(own(new CylinderGeometry(FRAME_RADIUS, FRAME_RADIUS, GOAL_WIDTH + FRAME_RADIUS * 2, 16)), white);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, GOAL_HEIGHT, 0);
  bar.castShadow = !far;
  goal.add(bar);

  // The net: a box of lines 36 cm apart, like classic's. One draw call.
  const step = 0.36;
  const points: number[] = [];
  const seg = (a: [number, number, number], b: [number, number, number]): void => {
    points.push(...a, ...b);
  };
  for (let x = -HALF_GOAL; x <= HALF_GOAL + 1e-6; x += step) {
    seg([x, 0, NET_DEPTH], [x, GOAL_HEIGHT, NET_DEPTH]);
    seg([x, GOAL_HEIGHT, 0], [x, GOAL_HEIGHT, NET_DEPTH]);
  }
  for (let y = 0; y <= GOAL_HEIGHT + 1e-6; y += step) {
    seg([-HALF_GOAL, y, NET_DEPTH], [HALF_GOAL, y, NET_DEPTH]);
    for (const side of [-HALF_GOAL, HALF_GOAL]) seg([side, y, 0], [side, y, NET_DEPTH]);
  }
  for (let d = 0; d <= NET_DEPTH + 1e-6; d += step) {
    seg([-HALF_GOAL, GOAL_HEIGHT, d], [HALF_GOAL, GOAL_HEIGHT, d]);
    for (const side of [-HALF_GOAL, HALF_GOAL]) seg([side, 0, d], [side, GOAL_HEIGHT, d]);
  }
  const net = new BufferGeometry();
  net.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  goal.add(
    new LineSegments(
      own(net),
      own(new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false }))
    )
  );

  goal.position.z = z;
  if (far) goal.rotation.y = Math.PI;
  return goal;
}

/** The boards round the pitch, with content/boards.js painted on them. */
function buildHoardings(own: Own): Group {
  const group = new Group();
  const boards = (BOARDS as { text: string; ink: string; panel: string }[]).slice(0, 16);
  const count = Math.max(1, boards.length);
  const W = 512;
  const H = 64;
  const canvas = makeCanvas(W, H * count);
  const ctx = canvas.getContext('2d') as Paint | null;
  if (ctx) {
    boards.forEach((board, i) => {
      ctx.fillStyle = board.panel;
      ctx.fillRect(0, i * H, W, H);
      ctx.fillStyle = board.ink;
      ctx.font = '800 38px ui-sans-serif, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(board.text, W / 2, i * H + H / 2 + 2, W - 24);
    });
  }
  const atlas = own(new CanvasTexture(canvas as HTMLCanvasElement));
  atlas.colorSpace = SRGBColorSpace;
  // Lit from inside at night: a board is a lightbox, which is also what
  // makes it readable at the far end of a floodlit pitch.
  const face = own(
    new MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.6 })
  );
  const back = own(new MeshStandardMaterial({ color: '#1f2933', roughness: 0.8 }));

  const BOARD = 6;
  const TALL = 0.9;
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  let made = 0;
  /** A run of boards from (x0, z0) to (x1, z1), facing `facing`. */
  const run = (x0: number, z0: number, x1: number, z1: number, facing: [number, number]): void => {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(length / BOARD));
    for (let i = 0; i < n; i++) {
      const a = i / n;
      const b = (i + 1) / n;
      const ax = x0 + (x1 - x0) * a;
      const az = z0 + (z1 - z0) * a;
      const bx = x0 + (x1 - x0) * b;
      const bz = z0 + (z1 - z0) * b;
      const which = (made * 7 + i * 3) % count;
      const v0 = 1 - (which + 1) / count;
      const v1 = 1 - which / count;
      const base = positions.length / 3;
      positions.push(ax, 0, az, bx, 0, bz, bx, TALL, bz, ax, TALL, az);
      uvs.push(0, v0, 1, v0, 1, v1, 0, v1);
      for (let k = 0; k < 4; k++) normals.push(facing[0], 0, facing[1]);
      // Wound so the face points along `facing`. For the triangle (a, b, b-up)
      // the right-handed normal is (-ez, 0, ex); three undoes the mirror.
      const ex = bx - ax;
      const ez = bz - az;
      const agrees = -ez * facing[0] + ex * facing[1] > 0;
      if (agrees) index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else index.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
    made += 1;
    // The frame behind the run.
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const frame = new Mesh(
      own(new BoxGeometry(Math.abs(x1 - x0) || 0.08, TALL, Math.abs(z1 - z0) || 0.08)),
      back
    );
    frame.position.set(cx - facing[0] * 0.05, TALL / 2, cz - facing[1] * 0.05);
    group.add(frame);
  };
  const behind = NET_DEPTH + 2.6;
  // Each run goes left to right as seen from the pitch, so the text reads.
  run(-30, behind, 30, behind, [0, -1]);
  run(-PITCH_HALF_WIDTH - 3.5, -PITCH_LENGTH, -PITCH_HALF_WIDTH - 3.5, 0, [1, 0]);
  run(PITCH_HALF_WIDTH + 3.5, 0, PITCH_HALF_WIDTH + 3.5, -PITCH_LENGTH, [-1, 0]);
  run(30, -PITCH_LENGTH - behind, -30, -PITCH_LENGTH - behind, [0, 1]);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(index);
  const faces = new Mesh(own(geometry), face);
  faces.position.y = 0.001;
  group.add(faces);
  group.userData.face = face;
  return group;
}

/** How bright the boards glow: a little by day, properly at night. */
export function lightBoards(hoardings: Group | undefined, floodlight: number): void {
  const face = hoardings?.userData.face as MeshStandardMaterial | undefined;
  if (face) face.emissiveIntensity = 0.12 + 0.5 * floodlight;
}

