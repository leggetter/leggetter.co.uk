/**
 * Which presentation packages exist, and which one to use.
 *
 * One entry per look. Adding `pixel` later is one line here and one directory,
 * and nothing under `core/` moves - which is the test of whether the boundary
 * held, the same test a new camera passes in `cameras.ts`.
 */

import { ClassicPresentation } from './classic/ClassicPresentation.ts';
import type { Presentation, PresentationFactory } from './Presentation.ts';

export const PACKAGES: Record<string, PresentationFactory> = {
  classic: () => new ClassicPresentation(),
};

export const DEFAULT_PACKAGE = 'classic';

export interface PackageChoice {
  id: string;
  label: string;
}

export const listPackages = (): PackageChoice[] =>
  Object.entries(PACKAGES).map(([id, make]) => ({ id, label: make().label }));

/**
 * Pick a package: an explicit `?look=` wins, then a stored preference, then
 * the default.
 *
 * Spelled `look` rather than `package` because that is what it is to whoever
 * is typing it, and because `?view=` already means the camera.
 */
export function resolvePackageId(search: string, stored: string | null): string {
  const requested = new URLSearchParams(search).get('look');
  if (requested && requested in PACKAGES) return requested;
  if (stored && stored in PACKAGES) return stored;
  return DEFAULT_PACKAGE;
}

export function createPackage(id: string): Presentation {
  const make = PACKAGES[id] ?? PACKAGES[DEFAULT_PACKAGE]!;
  return make();
}

// Cameras are a separate axis and live in their own file. Re-exported so that
// callers wiring up the game have one import rather than two.
export {
  CAMERAS,
  DEFAULT_CAMERA,
  cameraFor,
  listCameras,
  resolveCameraId,
  type CameraSpec,
} from './cameras.ts';
