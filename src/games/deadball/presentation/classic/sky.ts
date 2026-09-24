/**
 * What is beyond the stadium: sky, cloud, and a tree line at the corners.
 *
 * All of it static, so all of it goes into the same pre-rendered backdrop as
 * the terracing and costs nothing per frame. Unlike the crowd, that needed no
 * measuring - it is one blit either way.
 *
 * The brief was "fill in where it should be", not "move things so more of it
 * shows". So nothing here changes where a stand is or how tall it is: from
 * behind the taker the stand still fills the frame and none of this is
 * visible, which is correct, because in that seat you cannot see the sky
 * either.
 */

import { vec, type Vec3 } from '../../core/vec3.ts';
import type { Projector } from '../toolkit/project.ts';
import { PITCH_HALF_WIDTH, PITCH_LENGTH } from './stand.ts';

type Ctx = CanvasRenderingContext2D;

/** One of the entries in `content/skies.js`. */
export interface SkyPalette {
  id: string;
  label: string;
  top: string;
  bottom: string;
  cloud: string;
  clouds: number;
  trees: string;
  grassShade: string;
  floodlight: number;
}

/**
 * Stable noise, so the same sky is the same sky.
 *
 * Clouds and trees are placed from this rather than from `Math.random`: a
 * backdrop is rebuilt on every resize and every camera change, and a random
 * one would mean the trees jumping to new positions when you switched camera,
 * which reads as a glitch rather than as weather.
 */
function hash(i: number, salt: number): number {
  let h = (i + 1) * 2246822519 + salt * 3266489917;
  h = (h ^ (h >>> 15)) * 2654435761;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/**
 * Cloud, placed in the world rather than on the screen.
 *
 * Screen-space clouds would be cheaper and would sit in exactly the same place
 * whichever way you were facing, which is the one thing a sky must not do.
 * Putting them at a distance and projecting them means each camera gets its
 * own piece of sky for free, through the arithmetic that already draws
 * everything else.
 */
export function drawClouds(ctx: Ctx, projector: Projector, sky: SkyPalette): void {
  if (sky.clouds <= 0) return;
  const horizon = projector.horizon();

  for (let i = 0; i < sky.clouds; i++) {
    // Ringed around the ground rather than spread across it, so there is cloud
    // behind you as well as ahead. Far enough out to sit near the horizon.
    const angle = (i / sky.clouds) * Math.PI * 2 + hash(i, 1) * 0.4;
    const radius = 320 + hash(i, 2) * 260;
    const cx = Math.sin(angle) * radius;
    const cz = -PITCH_LENGTH / 2 + Math.cos(angle) * radius;
    const cy = 55 + hash(i, 3) * 95;

    const at = projector.project(vec(cx, cy, cz));
    if (!at) continue;
    // Below the horizon is ground, whatever the arithmetic says.
    if (at.y > horizon) continue;

    const w = (60 + hash(i, 4) * 110) * at.scale;
    const h = w * (0.16 + hash(i, 5) * 0.12);
    if (w < 8) continue;

    // A cloud is three or four overlapping lumps, not an ellipse. One ellipse
    // reads as a balloon; the lumps are what make it read as weather.
    ctx.save();
    ctx.fillStyle = sky.cloud;
    const lumps = 3 + Math.floor(hash(i, 6) * 3);
    for (let j = 0; j < lumps; j++) {
      const t = (j / (lumps - 1) - 0.5) * 2;
      const lx = at.x + t * w * 0.34;
      const ly = at.y - hash(i * 7 + j, 8) * h * 0.5;
      const lr = h * (0.75 + hash(i * 7 + j, 9) * 0.6);
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr * 1.9, lr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * A tree line at the four corners of the pitch.
 *
 * At this distance a tree is a silhouette and nothing else, so it is drawn as
 * one: a trunk and a few overlapping blobs in a flat colour. Anything more
 * detailed is invisible from here and costs draw calls to be invisible with.
 *
 * They go at the corners because that is where the gaps between the stands
 * are, and gaps are what this is for - the alternative to a tree line there is
 * a wedge of empty sky between two stands.
 */
export function drawTrees(ctx: Ctx, projector: Projector, sky: SkyPalette): void {
  // Beyond the stands, not beside them.
  //
  // The first attempt put these at 58 m out, which is *inside* the side stands
  // - they run to about 59 - so the near pair towered over the whole ground
  // from twenty metres away. Trees outside a stadium are behind the stands and
  // show through the gaps, which is the only place there was a hole to fill.
  //
  // Side stands reach x = +/-59, end stands reach z = 33 and -138.
  const outX = PITCH_HALF_WIDTH + 36;
  const outZ = [46, -PITCH_LENGTH - 46];

  const clumps: { x: number; z: number }[] = [];
  for (const [ci, corner] of (
    [
      [-outX, outZ[0]!],
      [outX, outZ[0]!],
      [-outX, outZ[1]!],
      [outX, outZ[1]!],
    ] as [number, number][]
  ).entries()) {
    // A stand of trees, not a tree. Scattered around the corner so the line
    // has a ragged top, which is what a treeline looks like.
    for (let i = 0; i < 14; i++) {
      clumps.push({
        x: corner[0] + (hash(ci * 31 + i, 1) - 0.5) * 52,
        z: corner[1] + (hash(ci * 31 + i, 2) - 0.5) * 52,
      });
    }
  }

  // Furthest first, so a near tree overlaps a far one rather than the reverse.
  const placed = clumps
    .map((c, i) => ({ c, i, at: projector.project(vec(c.x, 0, c.z)) }))
    .filter((p) => p.at)
    .sort((a, b) => b.at!.depth - a.at!.depth);

  ctx.save();
  ctx.fillStyle = sky.trees;
  for (const { c, i } of placed) {
    const height = 8 + hash(i, 3) * 6;
    const base = projector.project(vec(c.x, 0, c.z));
    const top = projector.project(vec(c.x, height, c.z));
    if (!base || !top) continue;

    const h = base.y - top.y;
    if (h < 3) continue;
    const w = h * (0.5 + hash(i, 4) * 0.3);

    ctx.fillRect(base.x - Math.max(0.8, w * 0.07), top.y + h * 0.45, Math.max(1.6, w * 0.14), h * 0.55);

    const lumps = 3 + Math.floor(hash(i, 5) * 3);
    for (let j = 0; j < lumps; j++) {
      const lx = base.x + (hash(i * 13 + j, 6) - 0.5) * w * 0.8;
      const ly = top.y + h * (0.1 + hash(i * 13 + j, 7) * 0.32);
      const lr = w * (0.3 + hash(i * 13 + j, 8) * 0.22);
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Wash the pitch with whatever colour the light is.
 *
 * One rectangle over the grass, and most of what makes floodlit turf read as
 * floodlit: a night pitch is not dark green, it is green with a lot of blue
 * over it.
 */
export function shadeGrass(ctx: Ctx, projector: Projector, sky: SkyPalette): void {
  if (!sky.grassShade) return;
  const horizon = Math.max(0, projector.horizon());
  ctx.fillStyle = sky.grassShade;
  ctx.fillRect(0, horizon, projector.width, projector.height - horizon);
}

/** Every point of a quad, for callers that want the world-space corners. */
export const skyQuad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3): Vec3[] => [a, b, c, d];
