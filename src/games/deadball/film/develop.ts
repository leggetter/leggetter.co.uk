/**
 * Turn a recorded shot back into pictures.
 *
 * A second copy of the same presentation package is handed the recorded frames
 * in order, drawing to a canvas nobody sees, and each drawing is kept as a
 * small image. In order, and every one of them, because a package may carry
 * state from one frame to the next - classic's crowd is still on its feet from
 * the goal - and skipping frames would draw a different crowd from the one
 * that was on the screen.
 *
 * Kept as images rather than redrawn on demand so that stepping backwards is
 * as cheap as stepping forwards. A second of WebP stills is a few hundred KB;
 * the same second as raw pixels would be hundreds of MB on a phone.
 *
 * Silent: the copy is muted and never unlocked, so it cannot make a sound
 * even though it is handed every goal and every post.
 */

import type { CameraSpec } from '../presentation/cameras.ts';
import type { Presentation } from '../presentation/Presentation.ts';
import type { Take } from './record.ts';

export interface Still {
  /** An object URL. Hand the whole list to `discard` when finished. */
  url: string;
  /** Seconds from the boot meeting the ball: negative in the run-up. */
  fromStrike: number | null;
  /** The frame the boot met the ball on. */
  contact: boolean;
}

export interface DevelopOptions {
  make: () => Presentation;
  camera: CameraSpec;
  sky: string;
  /** The game canvas's size in CSS pixels, so the replay is framed the same. */
  width: number;
  height: number;
  /** Stills are no wider than this, in pixels. */
  maxWidth?: number;
  onProgress?: (done: number, total: number) => void;
}

/** When the boot met the ball, on the frame clock, if it has. */
export function strikeClock(take: Take): number | null {
  for (const frame of take.frames) {
    if (frame.sinceStrike > 0) return frame.clock - frame.sinceStrike;
  }
  return null;
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No image'))), 'image/webp', 0.82)
  );

/** Let the page breathe between frames, so a long shot does not freeze it. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function develop(take: Take, options: DevelopOptions): Promise<Still[]> {
  const { width, height } = options;
  const scale = Math.min(1, (options.maxWidth ?? 960) / width) * Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const presentation = options.make();
  presentation.mount({ canvas, ctx });
  presentation.setMuted(true);
  presentation.setSky(options.sky);
  presentation.configure(options.camera, width, height);

  const struck = strikeClock(take);
  const stills: Still[] = [];
  try {
    for (let i = 0; i < take.frames.length; i++) {
      const frame = take.frames[i]!;
      const events = take.events[i] ?? [];
      presentation.render(frame, events);
      stills.push({
        url: URL.createObjectURL(await toBlob(canvas)),
        fromStrike: struck === null ? null : frame.clock - struck,
        contact: events.some((event) => event.kind === 'boot'),
      });
      options.onProgress?.(i + 1, take.frames.length);
      if (i % 8 === 7) await breathe();
    }
  } catch (error) {
    discard(stills);
    throw error;
  } finally {
    presentation.destroy();
  }
  return stills;
}

export function discard(stills: readonly Still[]): void {
  for (const still of stills) URL.revokeObjectURL(still.url);
}
