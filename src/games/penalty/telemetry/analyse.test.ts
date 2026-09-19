import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { summarise } from './analyse.ts';
import type { ShotRecord } from './log.ts';
import type { Outcome } from '../core/types.ts';

let sequence = 0;

const shot = (over: {
  outcome?: Outcome;
  aimX?: number;
  timing?: number;
  power?: number;
  crossX?: number;
  envelope?: number;
} = {}): ShotRecord => ({
  at: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence++)).toISOString(),
  session: 's',
  playerId: 'p',
  keeperId: 'k',
  viewId: 'behind-taker',
  matchSeed: 1,
  shotIndex: 0,
  input: {
    aim: { x: over.aimX ?? 0.6, y: 0.5 },
    power: over.power ?? 0.8,
    curve: 0,
    lift: 0.5,
    timing: over.timing ?? 0,
  },
  outcome: over.outcome ?? 'goal',
  flightSeconds: 0.43,
  crossing: { x: over.crossX ?? 2.5, y: 1.4 },
  keeperStyle: 'anticipate',
  keeperHands: { x: 1, y: 1 },
  keeperEnvelope: over.envelope ?? 2.94,
  viewport: { width: 1280, height: 750 },
});

describe('summarise', () => {
  test('counts what happened', () => {
    const s = summarise([
      shot({ outcome: 'goal' }),
      shot({ outcome: 'goal' }),
      shot({ outcome: 'saved' }),
      shot({ outcome: 'post' }),
    ]);
    assert.equal(s.shots, 4);
    assert.equal(s.goals, 2);
    assert.equal(s.rate, 0.5);
    assert.equal(s.outcomes.saved, 1);
    assert.equal(s.keeper.saves, 1);
  });

  test('survives an empty log without dividing by zero', () => {
    const s = summarise([]);
    assert.equal(s.shots, 0);
    assert.equal(s.rate, null);
    assert.equal(s.timing.cleanRate, null);
    assert.equal(s.sides.repeatRate, null);
    assert.deepEqual(s.notes, []);
  });

  test('separates clean strikes from scuffed ones', () => {
    const s = summarise([
      shot({ timing: 0, outcome: 'goal' }),
      shot({ timing: 0, outcome: 'goal' }),
      shot({ timing: 0, outcome: 'goal' }),
      shot({ timing: 0, outcome: 'goal' }),
      shot({ timing: 0.7, outcome: 'saved' }),
      shot({ timing: -0.8, outcome: 'wide' }),
    ]);
    assert.equal(s.timing.clean, 4);
    assert.equal(s.timing.cleanRate, 1);
    assert.equal(s.timing.scuffedRate, 0);
    assert.ok(s.notes.some((n) => n.includes('Clean strikes')));
  });

  test('counts sides and repeats, ignoring shots down the middle', () => {
    const s = summarise([
      shot({ aimX: 0.6 }),
      shot({ aimX: 0.7 }),
      shot({ aimX: 0.05 }),
      shot({ aimX: -0.6 }),
    ]);
    assert.equal(s.sides.right, 2);
    assert.equal(s.sides.left, 1);
    assert.equal(s.sides.centre, 1);
    // Only the second shot repeats the first: the centre one breaks the chain.
    assert.equal(s.sides.repeats, 1);
  });

  test('calls out a one-sided player', () => {
    const s = summarise(Array.from({ length: 8 }, () => shot({ aimX: 0.7 })));
    assert.ok(s.notes.some((n) => /went right 8 times/.test(n)), s.notes.join(' | '));
  });

  test('says nothing about a habit it has only seen twice', () => {
    // Three shots one way is a coincidence, not a tell. Reporting it as one is
    // how a summary starts lying to the player.
    const s = summarise([shot({ aimX: 0.7 }), shot({ aimX: 0.7 })]);
    assert.deepEqual(s.notes, []);
  });

  test('counts shots placed beyond the keeper', () => {
    const s = summarise([
      shot({ crossX: 3.4, envelope: 2.94 }),
      shot({ crossX: -3.3, envelope: 2.94 }),
      shot({ crossX: 1.0, envelope: 2.94 }),
      shot({ crossX: 3.2, envelope: 2.94 }),
    ]);
    assert.equal(s.keeper.outOfReach, 3);
  });

  test('tolerates records written before the envelope existed', () => {
    const old = shot();
    delete (old as Partial<ShotRecord>).keeperEnvelope;
    const s = summarise([old, shot({ crossX: 3.4 })]);
    assert.equal(s.keeper.outOfReach, 1);
  });

  test('shows at most three notes, most interesting first', () => {
    const s = summarise(
      Array.from({ length: 12 }, (_, i) =>
        shot({ aimX: 0.7, timing: i % 3 ? 0.9 : 0, power: 1, outcome: i % 2 ? 'wide' : 'goal' })
      )
    );
    assert.ok(s.notes.length <= 3);
    assert.ok(s.notes.length > 0);
    // The side habit outranks everything else, because it is the one a keeper
    // will eventually punish.
    assert.match(s.notes[0]!, /went right/);
  });
});
