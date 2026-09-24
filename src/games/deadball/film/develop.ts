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
 * as cheap as stepping forwards. A second of JPEG stills is a few MB; the same
 * second as raw pixels would be hundreds of MB on a phone.
 *
 * JPEG rather than WebP: measured on a 900px still, WebP took 35 ms to encode
 * and JPEG 8, and encoding was nearly all of the wait. And the encodes are not
 * awaited one by one. `toBlob` copies the pixels when it is called, so the next
 * frame can be drawn over the canvas while the last is still being encoded.
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
  /**
   * The last frame before the ball moved: the boot on the ball.
   *
   * Not the frame the `boot` event arrives with. That frame is drawn after the
   * simulation has stepped past the strike, so the ball has already left the
   * boot in it - found stepping through a real penalty.
   */
  contact: boolean;
}

export interface DevelopOptions {
  make: () => Presentation;
  camera: CameraSpec;
  sky: string;
  /** The game canvas's size in CSS pixels, so the replay is framed the same. */
  width: number;
  height: number;
  /** Stills are no wider than this, in device pixels. */
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

/** Which frame shows the boot on the ball, or -1 if nobody has struck it. See `Still.contact`. */
export function contactFrame(take: Take): number {
  const struck = take.events.findIndex((events) => events.some((event) => event.kind === 'boot'));
  return struck < 0 ? -1 : Math.max(0, struck - 1);
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No image'))), 'image/jpeg', 0.85)
  );

/** Let the page breathe between frames, so a long shot does not freeze it. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function develop(take: Take, options: DevelopOptions): Promise<Still[]> {
  const { width, height } = options;
  // Pixels, not CSS pixels: on a Retina screen the old sum made every still
  // 1,800px wide and encoding them was most of the wait.
  const scale = Math.min((options.maxWidth ?? 960) / width, window.devicePixelRatio || 1);
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
  const total = take.frames.length;
  let encoded = 0;
  const pending: Promise<Blob>[] = [];
  try {
    for (let i = 0; i < total; i++) {
      presentation.render(take.frames[i]!, take.events[i] ?? []);
      pending.push(
        toBlob(canvas).then((blob) => {
          options.onProgress?.(++encoded, total);
          return blob;
        })
      );
      if (i % 8 === 7) await breathe();
    }
  } finally {
    presentation.destroy();
  }
  const blobs = await Promise.all(pending);
  const contact = contactFrame(take);
  return blobs.map((blob, i) => {
    const frame = take.frames[i]!;
    return {
      url: URL.createObjectURL(blob),
      fromStrike: struck === null ? null : frame.clock - struck,
      contact: i === contact,
    };
  });
}

export function discard(stills: readonly Still[]): void {
  for (const still of stills) URL.revokeObjectURL(still.url);
}
