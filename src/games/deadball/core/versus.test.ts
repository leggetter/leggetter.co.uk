/**
 * One player against the computer, alternating.
 *
 * The rules that matter are about *turn order*, because this mode is the only
 * one where a single player both takes and keeps. Getting it wrong does not
 * crash anything - it silently hands somebody the wrong half of the game.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { TAKERS } from '../content/takers.js';
import { ROSTER } from '../content/players.js';
import { initialMatch, inSuddenDeath, keeperSide, reduce, type MatchState } from './match.ts';
import { createRng } from './rng.ts';
import { decideShot, type TakerProfile } from './taker.ts';
import type { Player, ShotInput } from './types.ts';

const player = ROSTER[0] as Player;

describe('versus turn order', () => {
  const versus = () => initialMatch(5, 5, 'versus');

  test('the player shoots first, with nothing to wait for', () => {
    // The computer keeper plans invisibly, exactly as in solo, so there is no
    // corner to pick and no screen to tap through.
    const match = versus();
    assert.equal(match.mode, 'versus');
    assert.equal(match.phase, 'ready');
    assert.equal(match.taker, 0);
    assert.equal(keeperSide(match), 1);
  });

  test('ten shots, five each, like a duel', () => {
    assert.equal(versus().shotsTotal, 10);
  });

  const resolveOne = (state: MatchState, outcome: 'goal' | 'saved'): MatchState => {
    let next = state;
    if (next.phase === 'keeping') {
      next = reduce(next, { type: 'SET_DIVE', dive: { x: 0, y: 1 } });
    }
    if (next.phase === 'handover') next = reduce(next, { type: 'HANDED_OVER' });
    next = reduce(next, { type: 'TAKE_SHOT' });
    next = reduce(next, { type: 'STRIKE' });
    next = reduce(next, { type: 'RESOLVE', outcome });
    return reduce(next, { type: 'NEXT' });
  };

  test('the computer takes the second one, and the player has to keep', () => {
    const afterFirst = resolveOne(versus(), 'goal');
    assert.equal(afterFirst.taker, 1, 'the computer is taking it');
    assert.equal(keeperSide(afterFirst), 0, 'which puts the player in goal');
    assert.equal(afterFirst.phase, 'keeping', 'and the player has to choose first');
  });

  test('there is never a handover, because there is nobody to hide it from', () => {
    // The handover screen exists so a person can pass the device without the
    // other one seeing the reticle. A computer cannot peek.
    let state = versus();
    for (let i = 0; i < 10; i++) {
      assert.notEqual(state.phase, 'handover', `handover appeared at shot ${i}`);
      if (state.phase === 'keeping') {
        state = reduce(state, { type: 'SET_DIVE', dive: { x: 1, y: 1 } });
        assert.equal(state.phase, 'ready', 'a pick goes straight to the shot');
      }
      state = reduce(state, { type: 'TAKE_SHOT' });
      state = reduce(state, { type: 'STRIKE' });
      state = reduce(state, { type: 'RESOLVE', outcome: i % 2 === 0 ? 'goal' : 'saved' });
      state = reduce(state, { type: 'NEXT' });
    }
  });

  test('the sides alternate all the way through', () => {
    let state = versus();
    const takers: number[] = [];
    for (let i = 0; i < 10; i++) {
      takers.push(state.taker);
      state = resolveOne(state, i % 3 === 0 ? 'goal' : 'saved');
    }
    assert.deepEqual(takers, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
  });

  test('a dive picked outside the keeping phase is still refused', () => {
    // Same guarantee as a duel: the pick has to come before anything visible.
    const ready = versus();
    assert.equal(ready.phase, 'ready');
    const ignored = reduce(ready, { type: 'SET_DIVE', dive: { x: 2, y: 1 } });
    assert.equal(ignored.dive, null);
  });

  test('sudden death applies, because there are two sides', () => {
    let state = versus();
    for (let i = 0; i < 10; i++) state = resolveOne(state, 'goal');
    assert.deepEqual(state.scores, [5, 5]);
    assert.notEqual(state.phase, 'complete');
    assert.equal(inSuddenDeath(state), true);
  });

  test('solo is untouched: still five shots and never in goal', () => {
    const solo = initialMatch(5, 5, 'solo');
    assert.equal(solo.shotsTotal, 5);
    assert.equal(solo.phase, 'ready');
    let state = solo;
    for (let i = 0; i < 5; i++) {
      assert.equal(state.taker, 0, 'the solo player never keeps');
      state = resolveOne(state, 'goal');
    }
    assert.equal(state.phase, 'complete');
  });
});

describe('the computer taker', () => {
  const profile = TAKERS[0] as TakerProfile;

  const many = (p: TakerProfile, count: number): ShotInput[] => {
    const shots: ShotInput[] = [];
    for (let i = 0; i < count; i++) {
      shots.push(decideShot(p, player, createRng(i + 1), shots));
    }
    return shots;
  };

  test('the same seed gives the same shot', () => {
    const a = decideShot(profile, player, createRng(7));
    const b = decideShot(profile, player, createRng(7));
    assert.deepEqual(a, b);
  });

  test('every shot is inside the ranges resolveShot expects', () => {
    for (const p of TAKERS as TakerProfile[]) {
      for (const shot of many(p, 60)) {
        assert.ok(Math.abs(shot.aim.x) <= 1, `${p.id} aim.x ${shot.aim.x}`);
        assert.ok(shot.aim.y >= 0 && shot.aim.y <= 1, `${p.id} aim.y ${shot.aim.y}`);
        assert.ok(shot.power > 0 && shot.power <= 1, `${p.id} power ${shot.power}`);
        assert.ok(Math.abs(shot.curve) <= 1, `${p.id} curve ${shot.curve}`);
        assert.ok(Math.abs(shot.timing) <= 1, `${p.id} timing ${shot.timing}`);
      }
    }
  });

  test('it does not find one spot and stay there', () => {
    // The flaw the logs found in every human session, and the one thing a
    // computer taker must not rebuild. Both sides, repeatedly.
    for (const p of TAKERS as TakerProfile[]) {
      const shots = many(p, 80);
      const left = shots.filter((s) => s.aim.x < -0.1).length;
      const right = shots.filter((s) => s.aim.x > 0.1).length;
      assert.ok(left >= 15, `${p.id} only went left ${left} times in 80`);
      assert.ok(right >= 15, `${p.id} only went right ${right} times in 80`);
    }
  });

  test('a varied taker switches sides more often than a readable one', () => {
    // What `variety` is for. If this does not hold, the number does nothing
    // and the easy opponent is not actually easier to read.
    const switches = (p: TakerProfile): number => {
      const shots = many(p, 120);
      let count = 0;
      for (let i = 1; i < shots.length; i++) {
        if (Math.sign(shots[i]!.aim.x) !== Math.sign(shots[i - 1]!.aim.x)) count++;
      }
      return count;
    };
    const readable = TAKERS.find((t) => t.id === 'hammer') as TakerProfile;
    const varied = TAKERS.find((t) => t.id === 'unreadable') as TakerProfile;
    assert.ok(
      switches(varied) > switches(readable),
      `varied ${switches(varied)} vs readable ${switches(readable)}`
    );
  });

  test('it mistimes sometimes, which is where its misses come from', () => {
    const scuffed = many(profile, 100).filter((s) => s.timing !== 0).length;
    assert.ok(scuffed > 5, `only ${scuffed} of 100 were mistimed`);
    assert.ok(scuffed < 70, `${scuffed} of 100 mistimed, which is not a footballer`);
  });

  test('technique is what decides that, not luck', () => {
    const clean = (technique: number): number =>
      many({ ...profile, technique }, 120).filter((s) => s.timing === 0).length;
    assert.ok(clean(0.95) > clean(0.35), `${clean(0.95)} vs ${clean(0.35)}`);
  });

  test('it bends some of them', () => {
    // Curve is the most interesting thing in the game; a taker that never uses
    // it teaches the keeper nothing.
    const bent = many(profile, 100).filter((s) => s.curve !== 0).length;
    assert.ok(bent > 10, `only ${bent} of 100 were bent`);
  });
});
