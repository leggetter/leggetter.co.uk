/**
 * Both packages sound exactly the same, and a copy nobody unlocked is silent.
 *
 * The recorded samples and the moods moved here out of classic so the stylised
 * package could have them too. Three things have to stay true for that to have
 * been worth doing:
 *
 * - Both packages take their sound from this directory and nowhere else - no
 *   package-local copy of the moods drifting from the shared one.
 * - Unlocked, both ask for exactly the same files.
 * - Before `unlock`, nothing: no AudioContext and no fetch. The frame-by-frame
 *   viewer makes a second, muted copy of the running package and never unlocks
 *   it, and it is handed every goal and every post.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { GameEvent } from '../../core/events.ts';
import { ClassicPresentation } from '../classic/ClassicPresentation.ts';
import { StylisedPresentation } from '../stylised/StylisedPresentation.ts';
import { DIRECTORY, FILES, recordedSounds } from './recorded.ts';
import { moodOf, withOverrides } from './Sounds.ts';
import { createSynth } from './synth.ts';

/**
 * A stand-in for the Web Audio API that accepts anything and does nothing.
 * Every property is a callable that returns another one, numbers read as 0,
 * and a buffer's channel data is a real array so the synth can fill its noise.
 */
function inert(): unknown {
  const target = function () {} as unknown as Record<PropertyKey, unknown>;
  return new Proxy(target, {
    get: (_, key) => {
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === 'then') return undefined;
      if (key === 'getChannelData') return () => new Float32Array(16);
      if (key === 'length' || key === 'sampleRate') return 8;
      if (key === 'state') return 'running';
      return inert();
    },
    apply: () => inert(),
    set: () => true,
  });
}

let contexts = 0;
let fetched: string[] = [];
const globals = globalThis as Record<string, unknown>;
const saved = { window: globals.window, fetch: globals.fetch };

beforeEach(() => {
  contexts = 0;
  fetched = [];
  class FakeContext {
    constructor() {
      contexts += 1;
      return inert() as FakeContext;
    }
  }
  globals.window = { AudioContext: FakeContext };
  // Never resolves: this is about what is asked for, not what arrives.
  globals.fetch = (url: string) => {
    fetched.push(url);
    return new Promise(() => {});
  };
});

afterEach(() => {
  globals.window = saved.window;
  globals.fetch = saved.fetch;
});

const events: GameEvent[] = (['boot', 'glove', 'frame', 'net', 'resolved'] as const).map(
  (kind) => ({ kind, force: 0.8, outcome: 'goal' }) as unknown as GameEvent
);

/** The sound set a package built, reached past `private`: this is a test of what it built. */
const soundOf = (presentation: object): { play(e: GameEvent): void; bed(m: string): void } =>
  (presentation as { sound: { play(e: GameEvent): void; bed(m: string): void } }).sound;

describe('a copy nobody unlocked', () => {
  test('the shared set makes no context and fetches nothing, whatever it is told', () => {
    const synth = createSynth();
    const sound = withOverrides(synth, recordedSounds(synth));
    synth.setMuted(true);
    for (const mood of ['idle', 'waiting', 'flight'] as const) sound.bed(mood);
    for (const event of events) sound.play(event);
    assert.equal(contexts, 0, 'an AudioContext was made before unlock');
    assert.deepEqual(fetched, [], 'a sample was fetched before unlock');
  });

  test('nor does either package, muted and handed a whole shot', () => {
    for (const presentation of [new ClassicPresentation(), new StylisedPresentation()]) {
      presentation.setMuted(true);
      const sound = soundOf(presentation);
      for (const mood of ['waiting', 'flight', 'idle']) sound.bed(mood);
      for (const event of events) sound.play(event);
      presentation.destroy();
    }
    assert.equal(contexts, 0);
    assert.deepEqual(fetched, []);
  });
});

describe('both packages sound the same', () => {
  test('unlocked, each asks for exactly the recorded files', () => {
    const expected = Object.values(FILES)
      .map((file) => DIRECTORY + file)
      .sort();
    const heard: string[][] = [];
    for (const presentation of [new ClassicPresentation(), new StylisedPresentation()]) {
      fetched = [];
      presentation.unlock();
      heard.push([...fetched].sort());
      presentation.destroy();
    }
    assert.deepEqual(heard[0], expected, 'classic');
    assert.deepEqual(heard[1], expected, 'stylised');
  });

  test('the moods are one rule, for every phase', () => {
    const phases = ['keeping', 'handover', 'ready', 'runup', 'flight', 'resolved', 'complete'];
    assert.deepEqual(
      phases.map(moodOf),
      ['idle', 'idle', 'waiting', 'waiting', 'flight', 'idle', 'idle']
    );
  });

  test('and both take their sound only from presentation/sounds/', () => {
    const code = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    for (const path of ['../classic/ClassicPresentation.ts', '../stylised/StylisedPresentation.ts']) {
      const source = code(path);
      assert.match(source, /from '\.\.\/sounds\/recorded\.ts'/, `${path} does not use the recorded set`);
      assert.match(source, /\bmoodOf\b[^;]*from '\.\.\/sounds\/Sounds\.ts'/, `${path} does not use the shared moods`);
      assert.doesNotMatch(source, /function moodOf/, `${path} has its own moods`);
      for (const [, from] of source.matchAll(/from '([^']*)'/g)) {
        if (/sound|synth|audio/i.test(from!)) assert.match(from!, /^\.\.\/sounds\//, `${path} imports sound from ${from}`);
      }
    }
  });
});
