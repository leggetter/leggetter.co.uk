/**
 * Which presentation packages exist, and which one to use.
 *
 * One entry per look. Adding `pixel` later is one line here and one directory,
 * and nothing under `core/` moves - which is the test of whether the boundary
 * held, the same test a new camera passes in `cameras.ts`.
 */

import { ClassicPresentation } from './classic/ClassicPresentation.ts';
import { lazyPackage } from './lazy.ts';
import type { Presentation, PresentationFactory } from './Presentation.ts';

export interface PackageEntry {
  label: string;
  /**
   * Not finished, and said so wherever it can be picked. Never the default,
   * and never chosen for anybody who did not ask for it.
   */
  preview?: boolean;
  make: PresentationFactory;
}

const classic: PresentationFactory = () => new ClassicPresentation();

/**
 * `stylised` is the one entry that is not imported here: see lazy.ts. The
 * dynamic import below is the only way anything reaches it, and a test walks
 * the page's static imports to make sure it stays that way - one ordinary
 * import of it anywhere and every classic player downloads three.js.
 */
export const PACKAGES: Record<string, PackageEntry> = {
  classic: { label: 'Classic', make: classic },
  stylised: {
    label: 'Stylised 3D',
    preview: true,
    make: lazyPackage({
      id: 'stylised',
      label: 'Stylised 3D',
      load: async () => {
        const { StylisedPresentation } = await import('./stylised/StylisedPresentation.ts');
        return () => new StylisedPresentation();
      },
      fallback: classic,
    }),
  },
};

export const DEFAULT_PACKAGE = 'classic';

export interface PackageChoice {
  id: string;
  label: string;
  preview: boolean;
}

// Labels come from the table rather than from making each package and asking
// it, which is what this used to do: making the stylised one starts a download.
export const listPackages = (): PackageChoice[] =>
  Object.entries(PACKAGES).map(([id, { label, preview }]) => ({ id, label, preview: preview === true }));

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
  const entry = PACKAGES[id] ?? PACKAGES[DEFAULT_PACKAGE]!;
  return entry.make();
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
