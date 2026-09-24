import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { GameEvent } from '../core/events.ts';
import type { FrameState, MatchPhase } from '../core/types.ts';
import { AFTER_RESULT, createRecorder, MAX_FRAMES } from './record.ts';

/** Only the fields the recorder reads. The rest is carried, never looked at. */
const frame = (phase: MatchPhase, clock: number, shotIndex = 0): FrameState =>
  ({ phase, clock, shotIndex, kits: { home: '#c00' } }) as unknown as FrameState;

const boot: GameEvent = { kind: 'boot' } as GameEvent;
const resolved: GameEvent = { kind: 'resolved' } as GameEvent;

/** A shot at 60 Hz: half a second of run-up, a second in the air, two seconds of result. */
function shoot(recorder: ReturnType<typeof createRecorder>, shotIndex = 0, from = 0): number {
  let clock = from;
  const step = (phase: MatchPhase, seconds: number, first: GameEvent[] = []) => {
    for (let i = 0; i < seconds * 60; i++) {
      recorder.offer(frame(phase, clock, shotIndex), i === 0 ? first : []);
      clock += 1 / 60;
    }
  };
  step('ready', 0.5);
  step('runup', 0.5);
  step('flight', 1, [boot]);
  step('resolved', 2, [resolved]);
  return clock;
}

describe('recording the last shot', () => {
  test('nothing before anybody has shot', () => {
    const recorder = createRecorder();
    recorder.offer(frame('ready', 0), []);
    assert.equal(recorder.last(), null);
  });

  test('every frame from the run-up, stopping just after the shot is decided', () => {
    const recorder = createRecorder();
    shoot(recorder);
    recorder.offer(frame('ready', 9, 1), []);
    const take = recorder.last()!;
    const phases = take.frames.map((f) => f.phase);
    assert.equal(phases.filter((p) => p === 'runup').length, 30);
    assert.equal(phases.filter((p) => p === 'flight').length, 60);
    // Two seconds of result were offered; only AFTER_RESULT of them are kept.
    const after = take.frames.filter((f) => f.phase === 'resolved');
    const kept = after.at(-1)!.clock - after[0]!.clock;
    assert.ok(kept <= AFTER_RESULT + 1e-9 && kept > AFTER_RESULT - 1 / 30, `${kept.toFixed(3)} s kept after the result`);
  });

  test('the shot in progress stops growing once it is over, even before the next kick', () => {
    // Pressing F during the hold after a goal must not show the celebration.
    const recorder = createRecorder();
    shoot(recorder);
    const before = recorder.last()!.frames.length;
    recorder.offer(frame('resolved', 99), []);
    assert.equal(recorder.last()!.frames.length, before);
  });

  test('frames and events stay index for index', () => {
    const recorder = createRecorder();
    shoot(recorder);
    const take = recorder.last()!;
    assert.equal(take.frames.length, take.events.length);
    const at = take.events.findIndex((e) => e.some((x) => x.kind === 'boot'));
    assert.equal(take.frames[at]!.phase, 'flight');
  });

  test('the next shot replaces the last one, once it starts', () => {
    const recorder = createRecorder();
    const clock = shoot(recorder, 0);
    // Setting up the next kick: the last one is still there to watch.
    recorder.offer(frame('ready', clock, 1), []);
    assert.equal(recorder.last()!.shotIndex, 0);
    shoot(recorder, 1, clock);
    assert.equal(recorder.last()!.shotIndex, 1);
  });

  test('a shot still in progress can be watched', () => {
    const recorder = createRecorder();
    recorder.offer(frame('runup', 0), []);
    recorder.offer(frame('flight', 0.1), [boot]);
    assert.equal(recorder.last()!.frames.length, 2);
  });

  test('stops at the cap rather than growing without end', () => {
    const recorder = createRecorder();
    for (let i = 0; i < MAX_FRAMES + 100; i++) recorder.offer(frame('flight', i / 60), []);
    assert.equal(recorder.last()!.frames.length, MAX_FRAMES);
  });

  test('keeps the kit colours as they were', () => {
    // The one part of a frame the game edits in place.
    const recorder = createRecorder();
    const f = frame('runup', 0);
    recorder.offer(f, []);
    (f.kits as Record<string, string>).home = '#00c';
    assert.equal((recorder.last()!.frames[0]!.kits as Record<string, string>).home, '#c00');
  });
});

describe('which frame is contact', () => {
  test('the frame before the boot event, when the ball has not yet moved', async () => {
    // develop.ts imports nothing from the browser at module level, so this runs in node.
    const { contactFrame } = await import('./develop.ts');
    const recorder = createRecorder();
    shoot(recorder);
    const take = recorder.last()!;
    const struck = take.events.findIndex((e) => e.some((x) => x.kind === 'boot'));
    assert.equal(contactFrame(take), struck - 1);
    assert.equal(take.frames[contactFrame(take)]!.phase, 'runup');
  });

  test('none, before anybody has struck the ball', async () => {
    const { contactFrame } = await import('./develop.ts');
    const recorder = createRecorder();
    recorder.offer(frame('runup', 0), []);
    assert.equal(contactFrame(recorder.last()!), -1);
  });
});
