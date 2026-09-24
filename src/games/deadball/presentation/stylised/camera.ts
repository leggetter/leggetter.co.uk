/**
 * A `CameraSpec`, as a three.js camera.
 *
 * The same camera has to show the same picture in both packages, or comparing
 * them is comparing lenses. So this arrives at exactly the answer the toolkit's
 * hand-rolled projector does - same position, same orientation, same focal
 * length from the same framing rule - and `camera.test.ts` holds it to that to
 * a hundredth of a pixel for every camera. That is also what lets the stylised
 * package draw classic's HUD over the 3D scene and have the aim line land on
 * the ball.
 *
 * **The world is mirrored on its way in.** core/ puts +x on the taker's right
 * as seen from behind them, with +y up and +z toward the goal. That is a
 * left-handed frame, and three.js is right-handed, so a world point (x, y, z)
 * sits at (-x, y, z) in the scene. The whole pitch hangs off one group with
 * `scale.x = -1` (see `MIRROR`), which three handles by flipping each object's
 * winding, so nothing inside it ever has to know. Only the camera, which lives
 * outside that group, and the pointer, which comes back out of it, are
 * converted here.
 */

import { MathUtils, PerspectiveCamera, Plane, Ray, Vector3 } from 'three';

import type { Dive } from '../../core/types.ts';
import { focalLength, type Camera } from '../toolkit/project.ts';

/** Scale for the group the world hangs off. See the note at the top. */
export const MIRROR = new Vector3(-1, 1, 1);

const toScene = (x: number, y: number, z: number): Vector3 => new Vector3(-x, y, z);

/** Nearer than this is inside the lens; the toolkit's projector draws nothing nearer either. */
export const NEAR = 0.05;
/** Far enough for the far stand, with the sky dome inside it. */
export const FAR = 420;

/**
 * Point `three` where `camera` points, with the lens `camera`'s framing asks
 * for on a `width` by `height` canvas in CSS pixels.
 *
 * The orientation is the projector's, worked backwards: its camera-space
 * forward, up and right axes, as world directions, from the same yaw and pitch.
 */
export function aimCamera(three: PerspectiveCamera, camera: Camera, width: number, height: number): void {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const focal = focalLength(camera, w, h);

  const cy = Math.cos(camera.yaw);
  const sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const forward = toScene(cp * sy, -sp, cp * cy);
  const up = toScene(sp * sy, cp, sp * cy);

  const { x, y, z } = camera.position;
  three.position.copy(toScene(x, y, z));
  three.up.copy(up);
  three.lookAt(three.position.clone().add(forward));

  three.fov = MathUtils.radToDeg(2 * Math.atan(h / 2 / focal));
  three.aspect = w / h;
  three.near = NEAR;
  three.far = FAR;
  three.updateProjectionMatrix();
  three.updateMatrixWorld(true);
}

/** Where a world point lands on the canvas, in CSS pixels. Null behind the camera. */
export function projectToCanvas(
  three: PerspectiveCamera,
  point: { x: number; y: number; z: number },
  width: number,
  height: number
): { x: number; y: number } | null {
  const v = toScene(point.x, point.y, point.z);
  // Behind the lens has no screen position, the same as the projector says.
  if (v.clone().applyMatrix4(three.matrixWorldInverse).z >= -NEAR) return null;
  v.project(three);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
}

/** The goal's plane, z = 0. The mirror leaves z alone, so it is the same plane in the scene. */
const GOAL_PLANE = new Plane(new Vector3(0, 0, 1), 0);

/**
 * Where a pointer is pointing on the goal plane, for a keeper choosing a dive.
 *
 * A ray from the lens through the pixel, and where it meets z = 0. Null when
 * the ray runs parallel to the goal or meets its plane behind the camera,
 * which is when the toolkit's `toPlane` says null too.
 */
export function pointerOnGoal(
  three: PerspectiveCamera,
  point: { x: number; y: number },
  width: number,
  height: number
): Dive | null {
  if (width <= 0 || height <= 0) return null;
  const ndc = new Vector3((point.x / width) * 2 - 1, 1 - (point.y / height) * 2, 0.5);
  const through = ndc.unproject(three);
  const origin = three.getWorldPosition(new Vector3());
  const ray = new Ray(origin, through.sub(origin).normalize());
  if (Math.abs(ray.direction.z) < 1e-9) return null;
  const hit = ray.intersectPlane(GOAL_PLANE, new Vector3());
  if (!hit) return null;
  // Back out of the mirror. Written so the middle of the goal is 0, not -0.
  return { x: hit.x === 0 ? 0 : -hit.x, y: hit.y };
}
