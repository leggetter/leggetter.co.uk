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
  inSuddenDeath,
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

  test('runs ten shots and then completes, when somebody has won', () => {
    // This used to score every third shot, which alternates to 2-2 and now
    // goes to sudden death rather than ending. The old pattern was fine under
    // the old rule and is a tie under the new one.
    let state = duel();
    for (let i = 0; i < 10; i++) {
      assert.notEqual(state.phase, 'complete', `finished early at shot ${i}`);
      state = shot(state, i % 2 === 0 ? 'goal' : 'saved');
    }
    assert.equal(state.phase, 'complete');
    assert.equal(state.outcomes.length, 10);
    assert.deepEqual(shotsTaken(state), [5, 5], 'five each');
    assert.deepEqual(state.scores, [5, 0]);
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

describe('playing again', () => {
  test('a restart stays a duel', () => {
    // Reported from play: finishing a duel and starting again dropped you into
    // a solo game while the 2 players button still read as selected. The
    // reducer was never wrong - the restart went around it, straight to
    // initialMatch, whose mode argument defaults to solo and was not passed.
    const done = initialMatch(7, 10, 'duel');
    const again = reduce(done, { type: 'START', seed: 99, shots: 10 });

    assert.equal(again.mode, 'duel');
    assert.equal(again.phase, 'keeping');
    assert.equal(again.taker, 0);
    assert.deepEqual(again.scores, [0, 0]);
    assert.equal(again.seed, 99);
  });

  test('a restart stays solo', () => {
    const again = reduce(initialMatch(7, 5, 'solo'), { type: 'START', seed: 99 });
    assert.equal(again.mode, 'solo');
    assert.equal(again.phase, 'ready');
  });

  test('an explicit mode still wins, which is what the toggle needs', () => {
    const swapped = reduce(initialMatch(7, 10, 'duel'), { type: 'START', seed: 99, mode: 'solo' });
    assert.equal(swapped.mode, 'solo');
  });
});

describe('sudden death', () => {
  /** Take one shot with a known result and move on. */
  const take = (state: MatchState, scored: boolean): MatchState => {
    let next = reduce(state, { type: 'SET_DIVE', dive: { x: 0, y: 1 } });
    next = reduce(next, { type: 'HANDED_OVER' });
    next = reduce(next, { type: 'TAKE_SHOT' });
    next = reduce(next, { type: 'STRIKE' });
    next = reduce(next, { type: 'RESOLVE', outcome: scored ? 'goal' : 'saved' });
    return reduce(next, { type: 'NEXT' });
  };

  /** Play out a whole list of results, one per shot, alternating takers. */
  const play = (results: boolean[]): MatchState =>
    results.reduce<MatchState>((state, scored) => take(state, scored), initialMatch(3, 5, 'duel'));

  test('a decided shootout still ends after ten', () => {
    // Side 0 scores all five, side 1 none.
    const done = play([true, false, true, false, true, false, true, false, true, false]);
    assert.equal(done.phase, 'complete');
    assert.deepEqual(done.scores, [5, 0]);
  });

  test('a level shootout does not end', () => {
    const level = play(Array.from({ length: 10 }, () => true));
    assert.deepEqual(level.scores, [5, 5]);
    assert.notEqual(level.phase, 'complete');
    assert.equal(inSuddenDeath(level), true);
    // And it is side 0's turn again, so the pairs keep alternating cleanly.
    assert.equal(level.taker, 0);
  });

  test('going ahead mid-round does not win it', () => {
    // The whole point. Side 0 scores the eleventh; side 1 must still get the
    // twelfth, or it is a race rather than a shootout.
    const level = play(Array.from({ length: 10 }, () => true));
    const ahead = take(level, true);
    assert.deepEqual(ahead.scores, [6, 5]);
    assert.notEqual(ahead.phase, 'complete');
    assert.equal(ahead.taker, 1, 'the other one still has theirs to take');
  });

  test('scoring and then missing decides it', () => {
    const level = play(Array.from({ length: 10 }, () => true));
    const decided = take(take(level, true), false);
    assert.equal(decided.phase, 'complete');
    assert.deepEqual(decided.scores, [6, 5]);
  });

  test('missing and then scoring decides it the other way', () => {
    const level = play(Array.from({ length: 10 }, () => true));
    const decided = take(take(level, false), true);
    assert.equal(decided.phase, 'complete');
    assert.deepEqual(decided.scores, [5, 6]);
  });

  test('both scoring, or both missing, goes round again', () => {
    const level = play(Array.from({ length: 10 }, () => true));
    for (const both of [true, false]) {
      const again = take(take(level, both), both);
      assert.notEqual(again.phase, 'complete');
      assert.equal(again.taker, 0);
      assert.equal(again.scores[0], again.scores[1]);
    }
  });

  test('it can run for a while', () => {
    // Nothing caps it, and nothing should: a shootout goes until somebody
    // blinks. This one goes eight extra rounds.
    let state = play(Array.from({ length: 10 }, () => true));
    for (let round = 0; round < 8; round++) state = take(take(state, true), true);
    assert.notEqual(state.phase, 'complete');
    assert.deepEqual(state.scores, [13, 13]);
    assert.deepEqual(shotsTaken(state), [13, 13]);

    const decided = take(take(state, true), false);
    assert.equal(decided.phase, 'complete');
    assert.deepEqual(decided.scores, [14, 13]);
  });

  test('solo is untouched by any of it', () => {
    let state = initialMatch(3, 5, 'solo');
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: 'TAKE_SHOT' });
      state = reduce(state, { type: 'STRIKE' });
      state = reduce(state, { type: 'RESOLVE', outcome: 'goal' });
      state = reduce(state, { type: 'NEXT' });
    }
    assert.equal(state.phase, 'complete');
    assert.equal(inSuddenDeath(state), false);
  });
});
