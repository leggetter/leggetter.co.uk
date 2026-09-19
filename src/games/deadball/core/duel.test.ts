/**
 * Two players on one device.
 *
 * The rules that matter here are about *order*, not about football. Both
 * players share a screen, so the game has to guarantee that the keeper commits
 * before the taker can do anything, and cannot revise afterwards. A keeper who
 * has seen the aim is not guessing, and that is the whole contest.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  initialMatch,
  keeperSide,
  reduce,
  shotsTaken,
  type MatchMessage,
  type MatchState,
} from './match.ts';
import { planKeeper } from './keeper.ts';
import { createRng } from './rng.ts';
import type { KeeperProfile, Outcome } from './types.ts';

const duel = () => initialMatch(1, 5, 'duel');

const play = (state: MatchState, ...messages: MatchMessage[]): MatchState =>
  messages.reduce(reduce, state);

/** One complete shot, from the keeper picking to the next one being ready. */
const shot = (state: MatchState, outcome: Outcome): MatchState =>
  play(
    state,
    { type: 'SET_DIVE', dive: { x: 1.5, y: 1 } },
    { type: 'HANDED_OVER' },
    { type: 'TAKE_SHOT' },
    { type: 'STRIKE' },
    { type: 'RESOLVE', outcome },
    { type: 'NEXT' }
  );

describe('a duel', () => {
  test('starts with the keeper, not the taker', () => {
    const state = duel();
    assert.equal(state.phase, 'keeping');
    assert.equal(state.mode, 'duel');
    assert.equal(state.shotsTotal, 10, 'five each');
  });

  test('the taker cannot do anything until the keeper has committed', () => {
    const state = duel();
    // Every one of these would let the taker act before the keeper has picked.
    for (const message of [
      { type: 'TAKE_SHOT' },
      { type: 'STRIKE' },
      { type: 'RESOLVE', outcome: 'goal' },
      { type: 'HANDED_OVER' },
    ] as MatchMessage[]) {
      assert.equal(reduce(state, message).phase, 'keeping', `${message.type} got through`);
    }
  });

  test('the keeper cannot change their mind once the device has moved', () => {
    const committed = play(duel(), { type: 'SET_DIVE', dive: { x: 1, y: 1 } });
    assert.equal(committed.phase, 'handover');

    const revised = reduce(committed, { type: 'SET_DIVE', dive: { x: -3, y: 2 } });
    assert.deepEqual(revised.dive, { x: 1, y: 1 }, 'the first pick has to stand');

    const aiming = play(committed, { type: 'HANDED_OVER' });
    assert.deepEqual(
      reduce(aiming, { type: 'SET_DIVE', dive: { x: -3, y: 2 } }).dive,
      { x: 1, y: 1 },
      'and still has to stand once the taker is up'
    );
  });

  test('the pick is cleared between shots', () => {
    const next = shot(duel(), 'goal');
    assert.equal(next.dive, null, 'a new keeper must start from nothing');
    assert.equal(next.phase, 'keeping');
  });

  test('sides alternate every shot', () => {
    let state = duel();
    const takers = [];
    for (let i = 0; i < 6; i++) {
      takers.push(state.taker);
      state = shot(state, 'goal');
    }
    assert.deepEqual(takers, [0, 1, 0, 1, 0, 1]);
  });

  test('whoever is not taking is in goal', () => {
    let state = duel();
    assert.equal(keeperSide(state), 1);
    state = shot(state, 'goal');
    assert.equal(keeperSide(state), 0);
  });

  test('goals go to whoever took them', () => {
    let state = duel();
    state = shot(state, 'goal'); // side 0 scores
    state = shot(state, 'saved'); // side 1 does not
    state = shot(state, 'goal'); // side 0 again
    assert.deepEqual(state.scores, [2, 0]);
  });

  test('runs ten shots and then completes', () => {
    let state = duel();
    for (let i = 0; i < 10; i++) {
      assert.notEqual(state.phase, 'complete', `finished early at shot ${i}`);
      state = shot(state, i % 3 === 0 ? 'goal' : 'saved');
    }
    assert.equal(state.phase, 'complete');
    assert.equal(state.outcomes.length, 10);
    assert.deepEqual(shotsTaken(state), [5, 5], 'five each');
    assert.equal(state.scores[0] + state.scores[1], state.outcomes.filter((o) => o === 'goal').length);
  });

  test('a solo game is untouched by any of this', () => {
    const solo = initialMatch(1);
    assert.equal(solo.mode, 'solo');
    assert.equal(solo.phase, 'ready', 'no keeper to wait for');
    assert.equal(solo.shotsTotal, 5);

    const afterShot = play(
      solo,
      { type: 'TAKE_SHOT' },
      { type: 'STRIKE' },
      { type: 'RESOLVE', outcome: 'goal' },
      { type: 'NEXT' }
    );
    assert.equal(afterShot.phase, 'ready', 'straight back to the taker');
    assert.equal(afterShot.taker, 0, 'and nobody swaps');
    assert.equal(afterShot.score, 1);
  });
});

describe('a keeper somebody is controlling', () => {
  const profile: KeeperProfile = {
    id: 'human',
    name: 'You',
    reactionMs: 250,
    diveSpeed: 7.3,
    reach: 0.55,
    // Deliberately set so the AI would guess or react: a chosen dive has to
    // override all of it rather than being blended with it.
    guessBias: 1,
    anticipation: 0,
    readAccuracy: 0,
  };

  test('goes exactly where they said, ignoring the profile', () => {
    const sim = planKeeper(profile, createRng(1), { x: 0, y: 1 }, 0, { x: 2.2, y: 1.6 });
    assert.equal(sim.plan.style, 'human');
    assert.ok(sim.plan.chosen);
    assert.ok(Math.abs(sim.plan.chosen.x - 2.2) < 1e-9);
    assert.ok(Math.abs(sim.plan.chosen.y - 1.6) < 1e-9);
  });

  test('has no read error, however bad the profile says the read is', () => {
    // readAccuracy 0 would scatter an AI keeper across the goal. A person's
    // pick is their pick.
    const picks = [1, 2, 3, 4, 5].map(
      (seed) => planKeeper(profile, createRng(seed), { x: 0, y: 1 }, 0, { x: -2, y: 0.8 }).plan.chosen
    );
    for (const pick of picks) {
      assert.ok(pick && Math.abs(pick.x + 2) < 1e-9, 'every seed must give the same dive');
    }
  });

  test('still cannot dive somewhere a keeper cannot get to', () => {
    const silly = planKeeper(profile, createRng(1), { x: 0, y: 1 }, 0, { x: 40, y: 40 });
    assert.ok(silly.plan.chosen);
    assert.ok(Math.abs(silly.plan.chosen.x) < 5, `clamped to ${silly.plan.chosen.x}`);
    assert.ok(silly.plan.chosen.y < 3, `clamped to ${silly.plan.chosen.y}`);
  });

  test('without a pick, the computer keeper behaves as before', () => {
    const sim = planKeeper(profile, createRng(1), { x: 0, y: 1 }, 0);
    assert.notEqual(sim.plan.style, 'human');
    assert.equal(sim.plan.chosen, null);
  });
});
