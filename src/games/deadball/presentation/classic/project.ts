/**
 * Perspective projection: world meters to screen pixels.
 *
 * This is the piece that makes a camera angle a setting rather than a rewrite.
 * Every camera goes through this projector and differs only in where it sits
 * and which way it points, so `behind-taker` and `angled-behind` are the same
 * few numbers apart.
 *
 * Package-local, because projection is a package's own business: a matrix and
 * this are both correct answers to the same `CameraSpec`.
 *
 * Math.sin and Math.cos appear here and nowhere in core/. Rendering has no
 * determinism requirement: two machines may draw the same shot a pixel apart
 * and it changes nothing about the result.
 */

import type { Vec3 } from '../../core/vec3.ts';
import type { CameraSpec } from '../cameras.ts';

/**
 * Kept as a structural alias rather than deleted: everything below needs is a
 * position, an orientation and a frame, and taking the whole `CameraSpec`
 * would mean a projector that knows about mirroring and draw order, which are
 * not its business.
 */
export type Camera = Pick<CameraSpec, 'position' | 'yaw' | 'pitch' | 'fov' | 'frame'>;

export interface Projected {
  x: number;
  y: number;
  /** Distance along the view axis, meters. Useful for draw ordering. */
  depth: number;
  /** Pixels per meter at that depth, for sizing the ball and the keeper. */
  scale: number;
}

export interface Projector {
  /** Null when the point is behind the camera and has no screen position. */
  project(point: Vec3): Projected | null;
  /** Screen y of the horizon, which is where the ground gets drawn to. */
  horizon(): number;
  /**
   * Where a screen point lands on a vertical plane at the given z.
   * The inverse of `project` for one plane, which is all aiming needs.
   */
  toPlane(screenX: number, screenY: number, planeZ: number): { x: number; y: number } | null;
  readonly width: number;
  readonly height: number;
}

export function createProjector(camera: Camera, width: number, height: number): Projector {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  const halfW = width / 2;
  const halfH = height / 2;

  /**
   * Focal length in pixels: the tightest of what the field of view allows and
   * what keeps the framed rectangle on screen in each axis. Smallest wins,
   * because a smaller focal length is a wider view.
   */
  const focal = Math.min(
    halfH / Math.tan(camera.fov / 2),
    (halfW * camera.frame.depth) / camera.frame.halfWidth,
    (halfH * camera.frame.depth) / camera.frame.halfHeight
  );

  /** World point into camera space: translate, then yaw, then pitch. */
  const toCamera = (point: Vec3) => {
    const dx = point.x - camera.position.x;
    const dy = point.y - camera.position.y;
    const dz = point.z - camera.position.z;

    const x = dx * cosYaw - dz * sinYaw;
    const z = dx * sinYaw + dz * cosYaw;

    return {
      x,
      y: dy * cosPitch + z * sinPitch,
      z: -dy * sinPitch + z * cosPitch,
    };
  };

  /** Nearer than this and the perspective divide blows up. */
  const NEAR = 0.05;

  return {
    width,
    height,

    project(point) {
      const c = toCamera(point);
      if (c.z <= NEAR) return null;
      const scale = focal / c.z;
      return {
        x: halfW + c.x * scale,
        y: halfH - c.y * scale,
        depth: c.z,
        scale,
      };
    },

    /**
     * As a ground point recedes, its camera-space y/z tends to tan(pitch), so
     * the horizon sits at a fixed height regardless of how far you can see.
     */
    horizon() {
      return halfH - focal * (sinPitch / cosPitch);
    },

    toPlane(screenX, screenY, planeZ) {
      // Direction through the pixel, in camera space, then rotated back into
      // world space by undoing pitch and yaw.
      const cx = screenX - halfW;
      const cy = halfH - screenY;

      const dirCam = { x: cx / focal, y: cy / focal, z: 1 };

      const y = dirCam.y * cosPitch - dirCam.z * sinPitch;
      const zAfterPitch = dirCam.y * sinPitch + dirCam.z * cosPitch;

      const x = dirCam.x * cosYaw + zAfterPitch * sinYaw;
      const z = -dirCam.x * sinYaw + zAfterPitch * cosYaw;

      if (Math.abs(z) < 1e-6) return null;

      const t = (planeZ - camera.position.z) / z;
      if (t <= 0) return null;

      return { x: camera.position.x + x * t, y: camera.position.y + y * t };
    },
  };
}
