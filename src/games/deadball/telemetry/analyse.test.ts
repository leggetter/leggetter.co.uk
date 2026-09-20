import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { summarise, summariseDuel } from './analyse.ts';
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
  mode?: string;
  takerSide?: 0 | 1;
  dive?: { x: number; y: number } | null;
} = {}): ShotRecord => ({
  at: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence++)).toISOString(),
  tuning: 'deadbeef',
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
  keeperStartX: 0,
  keeperDive: over.dive === undefined ? null : over.dive,
  mode: over.mode ?? 'solo',
  takerSide: over.takerSide ?? 0,
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

describe('a duel, read as a contest', () => {
  const duelShot = (
    takerSide: 0 | 1,
    outcome: Outcome,
    over: { timing?: number; crossX?: number; dive?: { x: number; y: number } } = {}
  ) => shot({ mode: 'duel', takerSide, outcome, ...over });

  test('each side is credited with its own shots, not the average of both', () => {
    // The whole reason this exists: `summarise` would report 5/10 scored, a
    // figure describing neither player.
    const { sides } = summariseDuel([
      duelShot(0, 'goal'),
      duelShot(1, 'saved'),
      duelShot(0, 'goal'),
      duelShot(1, 'saved'),
      duelShot(0, 'goal'),
      duelShot(1, 'goal'),
    ]);

    assert.deepEqual(
      [sides[0].taking.shots, sides[0].taking.goals, sides[0].taking.rate],
      [3, 3, 1]
    );
    assert.deepEqual(
      [sides[1].taking.shots, sides[1].taking.goals, sides[1].taking.rate],
      [3, 1, 1 / 3]
    );
  });

  test('a keeper is credited with the shots the other one took', () => {
    const { sides } = summariseDuel([
      duelShot(0, 'goal'),
      duelShot(0, 'saved'),
      duelShot(1, 'goal'),
    ]);

    // Side 1 was in goal for both of side 0's, and saved one of them.
    assert.equal(sides[1].keeping.faced, 2);
    assert.equal(sides[1].keeping.saves, 1);
    assert.equal(sides[1].keeping.rate, 0.5);

    assert.equal(sides[0].keeping.faced, 1);
    assert.equal(sides[0].keeping.saves, 0);
  });

  test('a shot that never reached the line is not held against the keeper', () => {
    // Otherwise putting it over the bar flatters whoever is in goal, and the
    // save rate measures the other player's aim rather than their keeping.
    const { sides } = summariseDuel([
      duelShot(0, 'over'),
      duelShot(0, 'wide'),
      duelShot(0, 'post'),
      duelShot(0, 'goal'),
    ]);

    assert.equal(sides[1].keeping.faced, 1);
    assert.equal(sides[1].keeping.rate, 0);
  });

  test('the pick is measured against where the ball actually went', () => {
    const { sides } = summariseDuel([
      // 3 m out along the line from a ball that crossed at 0, and 4 m out.
      duelShot(0, 'goal', { crossX: 0, dive: { x: 3, y: 1.4 } }),
      duelShot(0, 'saved', { crossX: 0, dive: { x: 4, y: 1.4 } }),
    ]);

    assert.equal(sides[1].keeping.meanPick, 3.5);
  });

  test('no pick recorded means no figure, rather than a zero', () => {
    // A zero would read as a perfect pick, which is the opposite of unknown.
    const { sides } = summariseDuel([duelShot(0, 'goal')]);
    assert.equal(sides[1].keeping.meanPick, null);
  });

  test('a game against the computer is summarised too', () => {
    // The mode filter used to name 'duel' specifically, which meant every
    // versus shootout ended on a panel of zeroes with the data sitting right
    // there in the log.
    const { sides } = summariseDuel([
      shot({ mode: 'versus', takerSide: 0, outcome: 'goal' }),
      shot({ mode: 'versus', takerSide: 1, outcome: 'saved' }),
      shot({ mode: 'versus', takerSide: 0, outcome: 'goal' }),
    ]);
    assert.equal(sides[0].taking.shots, 2);
    assert.equal(sides[0].taking.goals, 2);
    assert.equal(sides[1].taking.shots, 1);
    assert.equal(sides[1].keeping.faced, 2);
  });

  test('solo shots in the same log are ignored', () => {
    const { sides } = summariseDuel([shot({ outcome: 'goal' }), duelShot(0, 'goal')]);
    assert.equal(sides[0].taking.shots, 1);
  });

  test('an empty log gives nulls, not divisions by zero', () => {
    const { sides } = summariseDuel([]);
    assert.equal(sides[0].taking.rate, null);
    assert.equal(sides[0].keeping.rate, null);
    assert.equal(sides[0].keeping.meanPick, null);
  });
});
