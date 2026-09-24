/**
 * A package that is only downloaded once somebody picks it.
 *
 * The stylised package brings three.js with it, which is several times the
 * size of the rest of the game put together. Somebody playing classic should
 * never download a byte of it, so the registry cannot import it: the bundler
 * would put it in the page's own chunk. It is reached through `import()`
 * instead, which the bundler splits into chunks of their own that are only
 * fetched when that call runs.
 *
 * That makes the package asynchronous to create, and the `Presentation`
 * contract is synchronous - `createPackage` hands one back and the game mounts
 * it on the next line. Rather than make every caller await (the game, and the
 * frame-by-frame viewer that creates a second copy), this stands in for the
 * real package until it arrives: it remembers what it was told, draws a
 * holding frame, and passes everything on the moment the real one exists.
 *
 * Once the module has loaded, every later copy is created on the spot, so a
 * second instance made while the game is running - the viewer's - never sees
 * a holding frame at all.
 *
 * **If the real package cannot start** - the download fails, or the device has
 * no WebGL - this falls back to the package it was given as a fallback, with
 * the same camera, sky and sound settings. A preview that fails should leave a
 * game you can still play, not a black rectangle.
 */

import type { GameEvent } from '../core/events.ts';
import type { Dive, FrameState, ShotInput } from '../core/types.ts';
import type { CameraSpec } from './cameras.ts';
import type {
  DragGesture,
  DragPoint,
  Presentation,
  PresentationContext,
  PresentationFactory,
} from './Presentation.ts';
import type { SoundSet } from './sounds/Sounds.ts';
import { dragToShot } from './toolkit/aim.ts';

export interface LazyPackage {
  id: string;
  label: string;
  /** Fetch the package. Called once, however many copies are made. */
  load: () => Promise<PresentationFactory>;
  /** What to become if `load` or the package's own `mount` fails. */
  fallback: PresentationFactory;
  /** Told when that happens, so it can be said somewhere. */
  onFallback?: (reason: unknown) => void;
}

/** A factory whose packages arrive later, and a way to start fetching early. */
export interface LazyFactory extends PresentationFactory {
  /** Start the download without creating anything. Resolves when it is done. */
  preload(): Promise<void>;
  /** True once the real package can be created synchronously. */
  ready(): boolean;
}

export function lazyPackage(spec: LazyPackage): LazyFactory {
  let factory: PresentationFactory | null = null;
  let failed: unknown = null;
  let loading: Promise<PresentationFactory> | null = null;

  const load = (): Promise<PresentationFactory> => {
    loading ??= spec.load().then(
      (made) => (factory = made),
      (error: unknown) => {
        failed = error ?? new Error('failed to load');
        throw failed;
      }
    );
    return loading;
  };

  const make = (): Presentation => new Standin(spec, () => factory, () => failed, load);
  return Object.assign(make, {
    preload: () => load().then(
      () => undefined,
      () => undefined
    ),
    ready: () => factory !== null,
  });
}

/** What the game has told the package, so it can be told again to whichever package turns up. */
interface Told {
  context: PresentationContext | null;
  configured: { camera: CameraSpec; width: number; height: number } | null;
  sky: string | null;
  muted: boolean | null;
  unlocked: boolean;
}

class Standin implements Presentation {
  readonly id: string;
  readonly label: string;

  private inner: Presentation | null = null;
  private destroyed = false;
  private readonly told: Told = { context: null, configured: null, sky: null, muted: null, unlocked: false };

  private readonly spec: LazyPackage;

  constructor(
    spec: LazyPackage,
    factory: () => PresentationFactory | null,
    failed: () => unknown,
    load: () => Promise<PresentationFactory>
  ) {
    this.spec = spec;
    this.id = spec.id;
    this.label = spec.label;
    const ready = factory();
    if (ready) this.become(ready);
    else if (failed()) this.fallBack(failed());
    else {
      load().then(
        (made) => {
          if (!this.destroyed && !this.inner) this.become(made);
        },
        (error: unknown) => {
          if (!this.destroyed && !this.inner) this.fallBack(error);
        }
      );
    }
  }

  /** Take on the real package, and tell it everything it missed. */
  private become(make: PresentationFactory): void {
    let next: Presentation | null = null;
    try {
      next = make();
      this.replay(next);
      this.inner = next;
    } catch (error) {
      // Whatever it managed to set up before failing - a context, a sound
      // graph - is let go of before the fallback takes the canvas.
      try {
        next?.destroy();
      } catch {
        // Already broken; nothing more to release.
      }
      this.fallBack(error);
    }
  }

  private fallBack(reason: unknown): void {
    this.spec.onFallback?.(reason);
    if (typeof console !== 'undefined') console.warn(`${this.spec.id}: falling back`, reason);
    const next = this.spec.fallback();
    this.replay(next);
    this.inner = next;
  }

  private replay(next: Presentation): void {
    const { context, configured, sky, muted, unlocked } = this.told;
    if (context) next.mount(context);
    if (muted !== null) next.setMuted(muted);
    if (sky !== null) next.setSky(sky);
    if (configured) next.configure(configured.camera, configured.width, configured.height);
    if (unlocked) next.unlock();
  }

  mount(context: PresentationContext): void {
    this.told.context = context;
    if (!this.inner) return;
    try {
      this.inner.mount(context);
    } catch (error) {
      // No WebGL, most likely. Classic needs nothing a canvas cannot give it.
      this.inner.destroy();
      this.inner = null;
      this.fallBack(error);
    }
  }

  configure(camera: CameraSpec, width: number, height: number): void {
    this.told.configured = { camera, width, height };
    this.inner?.configure(camera, width, height);
  }

  render(frame: FrameState, events: readonly GameEvent[]): void {
    if (this.inner) {
      this.inner.render(frame, events);
      return;
    }
    // Still downloading. A plain holding frame rather than whatever was last
    // on the canvas, which would look like the game had frozen.
    const ctx = this.told.context?.ctx;
    const size = this.told.configured;
    if (!ctx || !size) return;
    ctx.save();
    ctx.fillStyle = '#0d1f33';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '600 15px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Loading ${this.label}...`, size.width / 2, size.height / 2);
    ctx.restore();
  }

  aimFromDrag(gesture: DragGesture): ShotInput {
    if (this.inner) return this.inner.aimFromDrag(gesture);
    // Every package maps a drag this way, so there is no reason to refuse one.
    const size = this.told.configured;
    return dragToShot(gesture, size?.width ?? 0, size?.height ?? 0, {
      mirrored: size?.camera.mirrored ?? false,
    });
  }

  diveFromPointer(point: DragPoint): Dive | null {
    return this.inner?.diveFromPointer(point) ?? null;
  }

  sounds(): Partial<SoundSet> {
    return this.inner?.sounds?.() ?? {};
  }

  unlock(): void {
    this.told.unlocked = true;
    this.inner?.unlock();
  }

  setMuted(muted: boolean): void {
    this.told.muted = muted;
    this.inner?.setMuted(muted);
  }

  setSky(id: string): void {
    this.told.sky = id;
    this.inner?.setSky(id);
  }

  destroy(): void {
    this.destroyed = true;
    this.inner?.destroy();
    this.inner = null;
  }
}
