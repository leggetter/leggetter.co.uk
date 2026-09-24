/**
 * A package that arrives later still has to behave like one that is here now.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { FrameState } from '../core/types.ts';
import { CAMERAS } from './cameras.ts';
import { lazyPackage } from './lazy.ts';
import type { Presentation, PresentationContext, PresentationFactory } from './Presentation.ts';

/** A package that writes down everything it is told. */
function recorder(name: string, log: string[], options: { failMount?: boolean } = {}): PresentationFactory {
  return () => ({
    id: name,
    label: name,
    mount() {
      log.push(`${name}.mount`);
      if (options.failMount) throw new Error('no WebGL');
    },
    configure(camera, width, height) {
      log.push(`${name}.configure ${camera.id} ${width}x${height}`);
    },
    render() {
      log.push(`${name}.render`);
    },
    aimFromDrag: () => ({ aim: { x: 0, y: 0 }, power: 0, curve: 0, lift: 0, timing: 0 }),
    diveFromPointer: () => ({ x: 1, y: 1 }),
    unlock() {
      log.push(`${name}.unlock`);
    },
    setMuted(muted) {
      log.push(`${name}.setMuted ${muted}`);
    },
    setSky(id) {
      log.push(`${name}.setSky ${id}`);
    },
    destroy() {
      log.push(`${name}.destroy`);
    },
  });
}

/** A 2D context that only remembers what text was drawn on it. */
function fakeContext(log: string[]): PresentationContext {
  const ctx = new Proxy(
    {},
    {
      get: (_, key) => (key === 'fillText' ? (text: string) => log.push(`holding: ${text}`) : () => undefined),
      set: () => true,
    }
  ) as CanvasRenderingContext2D;
  return { canvas: {} as HTMLCanvasElement, ctx };
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const frame = {} as FrameState;
const camera = CAMERAS['behind-taker']!;

/** Everything the game tells a package on start-up, in the order it tells it. */
function start(presentation: Presentation, log: string[]): void {
  presentation.mount(fakeContext(log));
  presentation.setMuted(true);
  presentation.setSky('night');
  presentation.configure(camera, 390, 844);
  presentation.unlock();
}

describe('a package that is still downloading', () => {
  test('draws a holding frame, then hands over with everything it was told', async () => {
    const log: string[] = [];
    const arrival = deferred<PresentationFactory>();
    const make = lazyPackage({ id: 'later', label: 'Later', load: () => arrival.promise, fallback: recorder('classic', log) });
    const presentation = make();
    start(presentation, log);
    presentation.render(frame, []);
    assert.deepEqual(log, ['holding: Loading Later...']);

    arrival.resolve(recorder('real', log));
    await settle();
    presentation.render(frame, []);
    assert.deepEqual(log.slice(1), [
      'real.mount',
      'real.setMuted true',
      'real.setSky night',
      `real.configure behind-taker 390x844`,
      'real.unlock',
      'real.render',
    ]);
  });

  test('once it has arrived, the next copy is there at once', async () => {
    // The frame-by-frame viewer makes a second copy and draws with it on the
    // next line. A holding frame there would be a black still in the film.
    const log: string[] = [];
    const make = lazyPackage({ id: 'later', label: 'Later', load: async () => recorder('real', log), fallback: recorder('classic', log) });
    make();
    await make.preload();
    assert.equal(make.ready(), true);
    log.length = 0;
    const second = make();
    second.mount(fakeContext(log));
    second.configure(camera, 100, 100);
    second.render(frame, []);
    assert.deepEqual(log, ['real.mount', 'real.configure behind-taker 100x100', 'real.render']);
  });

  test('is only fetched once, however many copies are made', async () => {
    let fetched = 0;
    const log: string[] = [];
    const make = lazyPackage({
      id: 'later',
      label: 'Later',
      load: async () => {
        fetched += 1;
        return recorder('real', log);
      },
      fallback: recorder('classic', log),
    });
    make();
    make();
    await make.preload();
    make();
    assert.equal(fetched, 1);
  });
});

describe('a package that cannot start', () => {
  test('a failed download falls back, and the fallback is told everything', async () => {
    const log: string[] = [];
    const reasons: unknown[] = [];
    const make = lazyPackage({
      id: 'later',
      label: 'Later',
      load: () => Promise.reject(new Error('offline')),
      fallback: recorder('classic', log),
      onFallback: (reason) => reasons.push(reason),
    });
    const presentation = make();
    start(presentation, log);
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      await settle();
    } finally {
      console.warn = warn;
    }
    presentation.render(frame, []);
    assert.equal(reasons.length, 1);
    assert.deepEqual(log.slice(-6), [
      'classic.mount',
      'classic.setMuted true',
      'classic.setSky night',
      'classic.configure behind-taker 390x844',
      'classic.unlock',
      'classic.render',
    ]);
  });

  test('no WebGL: the real package is let go of and the fallback takes over', async () => {
    const log: string[] = [];
    const make = lazyPackage({
      id: 'later',
      label: 'Later',
      load: async () => recorder('real', log, { failMount: true }),
      fallback: recorder('classic', log),
    });
    await make.preload();
    const warn = console.warn;
    console.warn = () => undefined;
    const presentation = make();
    try {
      presentation.mount(fakeContext(log));
    } finally {
      console.warn = warn;
    }
    presentation.render(frame, []);
    assert.deepEqual(log, ['real.mount', 'real.destroy', 'classic.mount', 'classic.render']);
  });

  test('destroyed before it arrived, it never starts at all', async () => {
    const log: string[] = [];
    const arrival = deferred<PresentationFactory>();
    const make = lazyPackage({ id: 'later', label: 'Later', load: () => arrival.promise, fallback: recorder('classic', log) });
    const presentation = make();
    presentation.mount(fakeContext(log));
    presentation.destroy();
    arrival.resolve(recorder('real', log));
    await settle();
    assert.deepEqual(log, []);
  });
});
