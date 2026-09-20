/**
 * What the simulation says happened.
 *
 * Audio is not testable and this is, which is the whole reason the events are
 * a list from `core/` rather than something the renderer works out. Every test
 * here is one a bug this project has already had would have failed.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createEventLog, NO_EVENTS, type GameEvent } from './events.ts';
import { advance, createFlight } from './flight.ts';
import { KEEPERS } from '../content/keepers.js';
import { createRng } from './rng.ts';
import { resolveShot, spotBall } from './shot.ts';
import { SQUAD } from '../content/players.js';
import type { KeeperProfile, Player, ShotInput } from './types.ts';
import { PENALTY_DISTANCE } from './units.ts';

const STEP = 1 / 120;

const player = SQUAD[0] as Player;
const keeper = KEEPERS[0] as KeeperProfile;

/** Run one shot to the end and return everything it emitted, in order. */
function eventsFor(input: ShotInput, seed = 1): { events: GameEvent[]; outcome: string | null } {
  const log = createEventLog();
  const collected: GameEvent[] = [];
  const shot = resolveShot(input, player, createRng(seed), { origin: spotBall(PENALTY_DISTANCE) });
  let flight = createFlight(shot, keeper, createRng(seed), 0, null, log);
  collected.push(...log.drain());

  for (let i = 0; i < 1200; i++) {
    flight = advance(flight, STEP, log);
    collected.push(...log.drain());
    if (flight.outcome && flight.sinceOutcome > 1) break;
  }
  return { events: collected, outcome: flight.outcome };
}

const shot = (over: Partial<ShotInput> = {}): ShotInput => ({
  aim: { x: 0, y: 0.45 },
  power: 0.85,
  curve: 0,
  lift: 0.5,
  timing: 0,
  ...over,
});

describe('the event stream', () => {
  test('a shot always starts with exactly one boot', () => {
    const { events } = eventsFor(shot());
    assert.equal(events.filter((e) => e.kind === 'boot').length, 1);
    assert.equal(events[0]!.kind, 'boot', 'the boot is the first thing that happens');
    assert.equal(events[0]!.at, 0);
  });

  test('every shot resolves exactly once', () => {
    // However it ended. A shot that emitted two would announce the result
    // twice, and a shot that emitted none would end in silence.
    for (const input of [
      shot(),
      shot({ aim: { x: 0.95, y: 0.95 } }),
      shot({ power: 0.05 }),
      shot({ aim: { x: -0.9, y: 0.2 }, curve: 1 }),
    ]) {
      const { events } = eventsFor(input);
      assert.equal(events.filter((e) => e.kind === 'resolved').length, 1);
    }
  });

  test('the net only ever rings on a goal', () => {
    // The netting used to catch anything past the line, which put wide shots
    // in the back of it. That took playing the game to notice; a sound would
    // have announced it on every miss.
    for (let seed = 1; seed <= 40; seed++) {
      const { events, outcome } = eventsFor(
        shot({ aim: { x: (seed % 7) / 3 - 1, y: (seed % 5) / 4 }, power: 0.5 + (seed % 5) / 8 }),
        seed
      );
      const nets = events.filter((e) => e.kind === 'net').length;
      assert.equal(nets, outcome === 'goal' ? 1 : 0, `seed ${seed} ended ${outcome}`);
    }
  });

  test('one woodwork contact is one event, not one per step', () => {
    // The thing the whole design exists for. The ball is near the post for
    // several steps at 120 Hz, and anything polling state would fire on each.
    let found = 0;
    for (let seed = 1; seed <= 120 && found === 0; seed++) {
      const { events, outcome } = eventsFor(
        shot({ aim: { x: 0.82, y: 0.3 }, power: 0.8 + (seed % 9) / 60 }),
        seed
      );
      const frames = events.filter((e) => e.kind === 'frame');
      if (frames.length === 0) continue;
      found = frames.length;
      assert.ok(frames.length <= 3, `${frames.length} frame events for one ${outcome}`);
      // Two contacts cannot happen at the same instant.
      const times = frames.map((f) => f.at);
      assert.equal(new Set(times).size, times.length, 'two contacts at the same instant');
    }
    assert.ok(found > 0, 'no seed in 120 hit the woodwork, so this tested nothing');
  });

  test('events arrive in time order', () => {
    const { events } = eventsFor(shot({ aim: { x: 0.3, y: 0.4 } }));
    const times = events.map((e) => e.at);
    assert.deepEqual([...times].sort((a, b) => a - b), times);
  });

  test('a glove event means the keeper touched it', () => {
    // Emitted on the parry rather than on the outcome, so it cannot appear on
    // a shot nobody got near.
    for (let seed = 1; seed <= 30; seed++) {
      const { events, outcome } = eventsFor(shot({ aim: { x: 0.15, y: 0.2 }, power: 0.4 }), seed);
      const gloves = events.filter((e) => e.kind === 'glove').length;
      if (gloves > 0) assert.equal(outcome, 'saved', `seed ${seed} gloved a ${outcome}`);
    }
  });

  test('force is present on contacts and inside its range', () => {
    const { events } = eventsFor(shot());
    for (const event of events.filter((e) => e.kind !== 'resolved')) {
      assert.ok(event.force !== undefined, `${event.kind} has no force`);
      assert.ok(event.force >= 0 && event.force <= 1, `${event.kind} force ${event.force}`);
    }
  });

  test('the log drains once and comes back empty', () => {
    // Drained by one owner per frame. A second reader taking the same list
    // would play every sound twice.
    const log = createEventLog();
    log.emit({ kind: 'boot', at: 0 });
    assert.equal(log.drain().length, 1);
    assert.equal(log.drain().length, 0);
  });

  test('a flight run with no sink behaves identically', () => {
    // Tests and the offline tuning scripts pass nothing, so the default must
    // not be a special case that changes the simulation.
    const input = shot({ aim: { x: 0.4, y: 0.5 } });
    const run = (sink: Parameters<typeof advance>[2]) => {
      const s = resolveShot(input, player, createRng(9), { origin: spotBall(PENALTY_DISTANCE) });
      let f = createFlight(s, keeper, createRng(9), 0, null, sink);
      for (let i = 0; i < 400 && !f.outcome; i++) f = advance(f, STEP, sink);
      return f;
    };
    const quiet = run(NO_EVENTS);
    const loud = run(createEventLog());
    assert.equal(quiet.outcome, loud.outcome);
    assert.equal(quiet.ball.position.x, loud.ball.position.x);
    assert.equal(quiet.elapsed, loud.elapsed);
  });
});
