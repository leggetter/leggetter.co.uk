/**
 * The ground around the pitch: the sky, four stands with their crowd, and the
 * floodlights.
 *
 * **The crowd is one draw call, animated on the GPU.** Several thousand people
 * as one instanced box each, with where they sit and which end they support
 * baked into per-instance attributes once. Jumping for a goal is a few lines
 * of vertex shader driven by three numbers - when the reaction started, how
 * big it is, which end is pleased - so nothing about any one person is touched
 * from JavaScript after start-up. That is the shape Presentation.ts says a
 * WebGL crowd exists for, and why the crowd is not shared with classic.
 *
 * The reaction runs off the frame clock, not the wall clock, so a replay of the
 * same frames draws the same crowd.
 */

import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  AdditiveBlending,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { NET_DEPTH } from '../../core/units.ts';
import { makeCanvas, PITCH_HALF_WIDTH, PITCH_LENGTH, type Own } from './pitch.ts';

/** One of the entries in content/skies.js, as far as this package reads it. */
export interface Sky {
  id: string;
  top: string;
  bottom: string;
  floodlight: number;
}

/** Stable noise, so the crowd sits in the same places every time it is built. */
function hash(i: number, salt: number): number {
  let h = (i + 1) * 2246822519 + salt * 3266489917;
  h = (h ^ (h >>> 15)) * 2654435761;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/**
 * A dome of sky, graded from the horizon colour to the overhead one.
 *
 * Vertex colours on a sphere rather than a background texture, so the horizon
 * is where the horizon is from every camera rather than a stripe across the
 * screen.
 */
export function buildSky(own: Own): Mesh {
  const geometry = own(new SphereGeometry(380, 32, 16));
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3));
  const dome = new Mesh(
    geometry,
    own(new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }))
  );
  dome.renderOrder = -1;
  return dome;
}

export function paintSky(dome: Mesh, sky: Sky): void {
  const position = dome.geometry.getAttribute('position');
  const colour = dome.geometry.getAttribute('color') as BufferAttribute;
  const top = new Color(sky.top);
  const bottom = new Color(sky.bottom);
  const mixed = new Color();
  for (let i = 0; i < position.count; i++) {
    const up = Math.max(0, position.getY(i) / 380);
    // Most of the change near the horizon, the way a real sky grades.
    mixed.copy(bottom).lerp(top, Math.pow(up, 0.55));
    colour.setXYZ(i, mixed.r, mixed.g, mixed.b);
  }
  colour.needsUpdate = true;
}

interface StandSpec {
  /** Where the middle of the front edge is. */
  x: number;
  z: number;
  /** Which way is back, away from the pitch: a unit vector on the ground. */
  back: [number, number];
  length: number;
  depth: number;
  rise: number;
  /** 0 the home end, 1 the away end, 2 down the sides. */
  end: 0 | 1 | 2;
}

const BEHIND = NET_DEPTH + 7;
const MAST = 30;
const SIDE = PITCH_HALF_WIDTH + 8;

/**
 * Four stands: one behind each goal and one down each side. The home end is
 * behind the goal the penalties are taken at, as in classic, so a goal for
 * the side taking them is cheered from the stand you are looking at.
 */
const STANDS: StandSpec[] = [
  { x: 0, z: BEHIND, back: [0, 1], length: 72, depth: 24, rise: 13, end: 0 },
  { x: 0, z: -PITCH_LENGTH - BEHIND, back: [0, -1], length: 72, depth: 24, rise: 13, end: 1 },
  { x: -SIDE, z: -PITCH_LENGTH / 2, back: [-1, 0], length: 112, depth: 20, rise: 11, end: 2 },
  { x: SIDE, z: -PITCH_LENGTH / 2, back: [1, 0], length: 112, depth: 20, rise: 11, end: 2 },
];

/** A stand's own frame: along its length, up, and back from the pitch. */
function standFrame(stand: StandSpec): { along: [number, number]; at: (a: number, up: number, back: number) => [number, number, number] } {
  const along: [number, number] = [stand.back[1], -stand.back[0]];
  return {
    along,
    at: (a, up, back) => [stand.x + along[0] * a + stand.back[0] * back, up, stand.z + along[1] * a + stand.back[1] * back],
  };
}

export interface Stadium {
  group: Group;
  /** The lamp heads and their halos, to switch with the sky. */
  lamps: MeshStandardMaterial;
  halos: Sprite[];
  /** Strip lights under each roof: the stands are lit from inside at night. */
  roofLights: MeshStandardMaterial;
  crowd: Crowd;
}

export function buildStadium(own: Own, crowdSize: number, crowdColours: CrowdColours): Stadium {
  const group = new Group();
  // Darker than bare concrete really is. Lit by the floodlights at the front
  // of a stand it came out close to white, as a pale band under the crowd.
  const concrete = own(new MeshStandardMaterial({ color: '#5a6068', roughness: 0.95 }));
  const frontWall = own(new MeshStandardMaterial({ color: '#23282f', roughness: 0.9 }));
  const steel = own(new MeshStandardMaterial({ color: '#3b4450', roughness: 0.6, metalness: 0.3 }));
  const roofLights = own(
    new MeshStandardMaterial({ color: '#20252c', emissive: '#fff4de', emissiveIntensity: 0, roughness: 0.5 })
  );
  const box = own(new BoxGeometry(1, 1, 1));

  for (const stand of STANDS) {
    const { at } = standFrame(stand);
    const yaw = Math.atan2(stand.back[0], stand.back[1]);
    const slope = Math.hypot(stand.depth, stand.rise - 0.8);
    const tilt = Math.atan2(stand.rise - 0.8, stand.depth);

    // The terracing, as one sloped slab: the crowd is what gives it steps.
    const terrace = new Mesh(box, concrete);
    const [cx, , cz] = at(0, 0, stand.depth / 2);
    terrace.position.set(cx, (stand.rise + 0.8) / 2 - 0.3, cz);
    terrace.rotation.set(0, yaw, 0, 'YXZ');
    terrace.rotateX(-tilt);
    terrace.scale.set(stand.length, 0.6, slope);
    terrace.receiveShadow = true;
    group.add(terrace);

    // A wall along the front, as every ground has, up to the chests of the
    // first row. Without it the first 1.2 m of sloped slab showed between the
    // hoardings and the crowd as a white gap.
    const front = new Mesh(box, frontWall);
    const [fx, , fz] = at(0, 0, 0.15);
    const height = FIRST_ROW_Y + 0.45;
    front.position.set(fx, height / 2, fz);
    front.rotation.y = yaw;
    front.scale.set(stand.length, height, 0.3);
    front.receiveShadow = true;
    group.add(front);

    // The back wall and a roof over the back two thirds.
    const wall = new Mesh(box, concrete);
    const [wx, , wz] = at(0, 0, stand.depth + 0.5);
    wall.position.set(wx, (stand.rise + 7) / 2, wz);
    wall.rotation.y = yaw;
    wall.scale.set(stand.length, stand.rise + 7, 1);
    group.add(wall);

    const roof = new Mesh(box, steel);
    const [rx, , rz] = at(0, 0, stand.depth * 0.62);
    roof.position.set(rx, stand.rise + 6.5, rz);
    roof.rotation.y = yaw;
    roof.scale.set(stand.length + 2, 0.5, stand.depth * 0.8);
    group.add(roof);

    const strip = new Mesh(box, roofLights);
    const [lx, , lz] = at(0, 0, stand.depth * 0.26);
    strip.position.set(lx, stand.rise + 6.2, lz);
    strip.rotation.y = yaw;
    strip.scale.set(stand.length, 0.12, 0.5);
    group.add(strip);
  }

  // Floodlights at the corners, beyond the stands. Shorter than a real mast,
  // so the lamps are in shot from the cameras there are rather than just
  // above every one of them.
  const lamps = own(
    new MeshStandardMaterial({ color: '#dfe6ee', emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.4 })
  );
  const pole = own(new CylinderGeometry(0.35, 0.6, MAST, 8));
  const head = own(new BoxGeometry(7, 4, 0.6));
  const glow = own(new CanvasTexture(haloCanvas() as HTMLCanvasElement));
  glow.colorSpace = SRGBColorSpace;
  const haloMaterial = own(
    new SpriteMaterial({ map: glow, color: '#fff6e0', blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true })
  );
  const halos: Sprite[] = [];
  for (const x of [-1, 1]) {
    for (const z of [BEHIND + 14, -PITCH_LENGTH - BEHIND - 14]) {
      const px = x * (SIDE + 8);
      const mast = new Mesh(pole, steel);
      mast.position.set(px, MAST / 2, z);
      group.add(mast);
      const lamp = new Mesh(head, lamps);
      lamp.position.set(px, MAST, z);
      // Turned to face the centre spot.
      lamp.lookAt(0, 0, -PITCH_LENGTH / 2);
      group.add(lamp);
      const halo = new Sprite(haloMaterial);
      halo.position.set(px, MAST, z);
      halo.scale.set(34, 34, 1);
      halo.renderOrder = 2;
      group.add(halo);
      halos.push(halo);
    }
  }

  const crowd = buildCrowd(own, crowdSize, crowdColours);
  group.add(crowd.mesh);
  return { group, lamps, halos, roofLights, crowd };
}

/** A soft white disc, fading to nothing: the glare round a lamp. */
function haloCanvas(): HTMLCanvasElement | OffscreenCanvas {
  const size = 128;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.12, 'rgba(255, 250, 235, 0.75)');
    g.addColorStop(0.4, 'rgba(255, 240, 210, 0.16)');
    g.addColorStop(1, 'rgba(255, 240, 210, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

/** What the stands are wearing: the home end in one side's colours, the away end in the other's. */
export interface CrowdColours {
  home: [string, string];
  away: [string, string];
}

export interface Crowd {
  mesh: InstancedMesh;
  /** Set a reaction going, on the frame clock. */
  react(clock: number, strength: number, celebrating: 'home' | 'away', from: number): void;
  /** Called every frame with the frame clock. */
  tick(clock: number): void;
  recolour(colours: CrowdColours): void;
  /** Draw only the first `n` of them: the low tier's crowd. */
  limit(n: number): void;
}

/** How far back from the front wall the first row sits, and how high. */
const FIRST_ROW = 0.8;
const FIRST_ROW_Y = 0.8 + ((13 - 0.8) * FIRST_ROW) / 24;

/** Everyone who could be in the ground, before the budget decides how many are. */
interface Seat {
  x: number;
  y: number;
  z: number;
  yaw: number;
  end: 0 | 1 | 2;
  /** Along the stand, -1 to 1: where a reaction reaches first. */
  along: number;
}

function seats(): Seat[] {
  const all: Seat[] = [];
  for (const stand of STANDS) {
    const { at } = standFrame(stand);
    const yaw = Math.atan2(stand.back[0], stand.back[1]);
    // A seat is half a metre wide and a row is 0.8 m deep, as in a real ground.
    for (let back = FIRST_ROW; back < stand.depth - 0.6; back += 0.8) {
      const y = 0.8 + ((stand.rise - 0.8) * back) / stand.depth;
      for (let a = -stand.length / 2 + 0.5; a < stand.length / 2 - 0.5; a += 0.5) {
        const [x, , z] = at(a, 0, back);
        all.push({ x, y, z, yaw, end: stand.end, along: a / (stand.length / 2) });
      }
    }
  }
  return all;
}

/** Where an arm hangs from, and pivots from when it goes up. */
const SHOULDER_X = 0.215;
const SHOULDER_Y = 0.47;
const HEAD_Y = 0.66;
/** Above this on the head is hair. A little above the middle, so it reads as a hairline and not a hat. */
const HAIRLINE = HEAD_Y + 0.035;

/**
 * One person in the crowd, as a single geometry: a torso, a head and two arms.
 *
 * It used to be two boxes, and the square heads were the first thing anybody
 * noticed. It has to stay cheap because it is drawn up to 20,000 times: 118
 * triangles against the boxes' 24, so 2.4 million on the high tier. A 7 by 5
 * sphere for the head, which still reads as round from the stands; a tapered
 * cylinder flattened front to back for the torso; a neck with no end caps,
 * since nobody sees them; and a thin box per arm. `aPart` tells the shader which is which (0 torso, 1 head, 2 arm), so
 * one instance can have skin, hair, a shirt and arms that go up.
 */
function person() {
  const tag = <T extends BufferGeometry>(geometry: T, part: number): T => {
    const count = geometry.getAttribute('position').count;
    geometry.setAttribute('aPart', new BufferAttribute(new Float32Array(count).fill(part), 1));
    return geometry;
  };
  const torso = new CylinderGeometry(0.19, 0.15, 0.48, 7).scale(1, 1, 0.68).translate(0, 0.24, 0);
  const neck = new CylinderGeometry(0.05, 0.055, 0.08, 5, 1, true).translate(0, 0.52, 0);
  const head = new SphereGeometry(0.105, 7, 5).scale(0.92, 1.05, 1).translate(0, HEAD_Y, 0);
  const arm = (side: number) => new BoxGeometry(0.08, 0.42, 0.09).translate(side * SHOULDER_X, SHOULDER_Y - 0.2, 0);
  return mergeGeometries([
    tag(torso.toNonIndexed(), 0),
    tag(neck.toNonIndexed(), 1),
    tag(head.toNonIndexed(), 1),
    tag(arm(-1).toNonIndexed(), 2),
    tag(arm(1).toNonIndexed(), 2),
  ])!;
}

function buildCrowd(own: Own, size: number, colours: CrowdColours): Crowd {
  // Shuffled with stable noise, then cut to size, so a smaller crowd is the
  // same crowd with gaps rather than one stand full and the others empty.
  const everyone = seats()
    .map((seat, i) => ({ seat, order: hash(i, 9) }))
    .sort((a, b) => a.order - b.order)
    .map(({ seat }) => seat);
  const count = Math.min(size, everyone.length);
  const body = own(person());

  const phase = new Float32Array(count * 4);
  const matrix = new Matrix4();
  const material = own(new MeshLambertMaterial({ color: '#ffffff' }));
  const uniforms = {
    uClock: { value: 0 },
    uStart: { value: -1000 },
    uStrength: { value: 0 },
    uHome: { value: 1 },
    uFrom: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aSeat;
        uniform float uClock;
        uniform float uStart;
        uniform float uStrength;
        uniform float uHome;
        uniform float uFrom;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // aSeat: x a random 0-1, y the end (0 home, 1 away, 2 sides), z where
        // along the stand they sit, -1 to 1.
        float pleased = aSeat.y < 0.5 ? uHome : (aSeat.y < 1.5 ? 1.0 - uHome : 0.45);
        // Strength decides how many get up, not how high: a save lifts fewer.
        float up = step(aSeat.x, uStrength * pleased);
        float t = uClock - uStart - abs(aSeat.z - uFrom) * 0.35 - aSeat.x * 0.2;
        float jump = t > 0.0 && t < 3.2 ? abs(sin(t * 6.5 + aSeat.x * 6.2831)) * (1.0 - t / 3.2) : 0.0;
        // Arms go up with the first jump and come down as the jumping dies
        // away: the one gesture that reads as a goal from the far end.
        float raise = up * (t > 0.0 && t < 3.2 ? smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(2.2, 3.2, t)) : 0.0);
        if (aPart > 1.5) {
          float side = sign(position.x);
          vec2 pivot = vec2(side * ${SHOULDER_X.toFixed(3)}, ${SHOULDER_Y.toFixed(3)});
          float a = side * raise * 2.6;
          vec2 p = transformed.xy - pivot;
          transformed.xy = pivot + vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
        }
        vPart = aPart;
        vLocalY = position.y;
        vLook = vec2(aSeat.w, fract(aSeat.x * 7.13));
        transformed.y += up * jump * 0.42 + sin(uClock * 1.7 + aSeat.x * 40.0) * 0.015;`
      )
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aPart;\nvarying float vPart;\nvarying float vLocalY;\nvarying vec2 vLook;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPart;\nvarying float vLocalY;\nvarying vec2 vLook;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Skin anywhere from pale to dark, a continuous range rather than a
        // few fixed tones, so no two neighbours are obviously the same.
        vec3 skin = mix(vec3(0.94, 0.78, 0.66), vec3(0.33, 0.21, 0.15), vLook.x);
        // Dark, brown, fair and grey, roughly in the proportions a crowd has.
        vec3 hair = vLook.y < 0.45 ? vec3(0.09, 0.07, 0.06)
          : vLook.y < 0.75 ? vec3(0.28, 0.18, 0.11)
          : vLook.y < 0.88 ? vec3(0.70, 0.56, 0.34)
          : vec3(0.62, 0.62, 0.64);
        bool head = vPart > 0.5 && vPart < 1.5;
        if (head) diffuseColor.rgb = vLocalY > ${HAIRLINE.toFixed(3)} ? hair : skin;`
      );
  };

  const mesh = new InstancedMesh(body, material, count);
  for (let i = 0; i < count; i++) {
    const seat = everyone[i]!;
    matrix.makeRotationY(seat.yaw).setPosition(seat.x, seat.y, seat.z);
    mesh.setMatrixAt(i, matrix);
    phase.set([hash(i, 3), seat.end, seat.along, hash(i, 11)], i * 4);
  }
  mesh.geometry = body;
  body.setAttribute('aSeat', new InstancedBufferAttribute(phase, 4));
  mesh.instanceMatrix.needsUpdate = true;
  // A stand of people far from the camera is never worth culling test by test.
  mesh.frustumCulled = false;

  const recolour = (next: CrowdColours): void => {
    const colour = new Color();
    const neutral = ['#d9dde3', '#2b2f36', '#8a5a44', '#c9b28b', '#4a5d7a'];
    for (let i = 0; i < count; i++) {
      const seat = everyone[i]!;
      const pick = hash(i, 5);
      const shirt =
        seat.end === 2
          ? pick < 0.3
            ? next.home[0]
            : pick < 0.55
              ? next.away[0]
              : neutral[Math.floor(hash(i, 6) * neutral.length)]!
          : pick < 0.62
            ? (seat.end === 0 ? next.home : next.away)[0]
            : pick < 0.8
              ? (seat.end === 0 ? next.home : next.away)[1]
              : neutral[Math.floor(hash(i, 6) * neutral.length)]!;
      // A little variation in every shirt, so a block of one colour does not
      // read as a painted wall.
      colour.set(shirt).multiplyScalar(0.82 + hash(i, 7) * 0.3);
      mesh.setColorAt(i, colour);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  recolour(colours);

  return {
    mesh,
    react(clock, strength, celebrating, from) {
      uniforms.uStart.value = clock;
      uniforms.uStrength.value = strength;
      uniforms.uHome.value = celebrating === 'home' ? 1 : 0;
      uniforms.uFrom.value = from;
    },
    tick(clock) {
      uniforms.uClock.value = clock;
    },
    recolour,
    limit(n) {
      mesh.count = Math.max(0, Math.min(count, n));
    },
  };
}
