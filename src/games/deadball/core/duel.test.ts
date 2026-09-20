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

  test('runs ten shots and then completes, when it stays close', () => {
    // Rewritten twice, each time because the rules got more like a real
    // shootout. It first scored every third shot, which alternates to 2-2 and
    // goes to sudden death. It then scored every other one, which is 5-0 and
    // is decided after six. This sequence ends 3-2, which genuinely needs all
    // ten - the side behind can equalise right up to the last kick.
    const results = [true, true, true, false, true, true, false, false, false, false];
    let state = duel();
    for (const [i, scored] of results.entries()) {
      assert.notEqual(state.phase, 'complete', `finished early at shot ${i}`);
      state = shot(state, scored ? 'goal' : 'saved');
    }
    assert.equal(state.phase, 'complete');
    assert.equal(state.outcomes.length, 10);
    assert.deepEqual(shotsTaken(state), [5, 5], 'five each');
    assert.deepEqual(state.scores, [3, 2]);
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

  test('a decided shootout ends, and now it ends as soon as it is decided', () => {
    // This used to assert 5-0 after ten, from the days when every shootout ran
    // the full distance. Side 0 scoring three unanswered puts it beyond reach
    // with two each left, so the last four penalties are never taken.
    const done = play([true, false, true, false, true, false, true, false, true, false]);
    assert.equal(done.phase, 'complete');
    assert.deepEqual(done.scores, [3, 0]);
    assert.equal(done.outcomes.length, 6);
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

describe('a shootout that is already decided', () => {
  /** Take one shot with a known result and move on. */
  const take = (state: MatchState, scored: boolean): MatchState => {
    let next = state;
    if (next.phase === 'keeping') {
      next = reduce(next, { type: 'SET_DIVE', dive: { x: 0, y: 1 } });
    }
    if (next.phase === 'handover') next = reduce(next, { type: 'HANDED_OVER' });
    next = reduce(next, { type: 'TAKE_SHOT' });
    next = reduce(next, { type: 'STRIKE' });
    next = reduce(next, { type: 'RESOLVE', outcome: scored ? 'goal' : 'saved' });
    return reduce(next, { type: 'NEXT' });
  };

  /** Play a list of results in order, stopping if the match finishes. */
  const play = (results: boolean[]): MatchState => {
    let state = initialMatch(3, 5, 'duel');
    for (const scored of results) {
      if (state.phase === 'complete') break;
      state = take(state, scored);
    }
    return state;
  };

  test('the reported case: 5-3 with one still to take ends there', () => {
    // Found by playing. One side scored all five; the other had taken four and
    // scored three, so four was the most they could reach - and they were
    // still sent up to take a tenth penalty that could not change anything.
    const state = play([true, true, true, true, true, false, true, true, true]);
    assert.equal(state.outcomes.length, 9, 'the tenth must never be taken');
    assert.equal(state.phase, 'complete');
    assert.deepEqual(state.scores, [5, 3]);
  });

  test('three from three against none from three is over', () => {
    // Both have two left; the side on nothing can reach two at most.
    const state = play([true, false, true, false, true, false, true, false]);
    assert.equal(state.phase, 'complete');
    assert.equal(state.outcomes.length, 6);
    assert.deepEqual(state.scores, [3, 0]);
  });

  test('it can end mid-round, before the other side walks up', () => {
    // The reported case is exactly this: it ended on the ninth, which is side
    // 0's fifth, leaving side 1 with four taken and one they never took. An
    // uneven count is the visible sign that a shootout stopped the moment it
    // was decided rather than at the end of a round.
    const state = play([true, true, true, true, true, false, true, true, true]);
    const [a, b] = shotsTaken(state);
    assert.deepEqual([a, b], [5, 4]);
    assert.equal(state.phase, 'complete');
  });

  test('a shootout still alive is not stopped', () => {
    // 3-2 after eight, with one each left. The side behind can still equalise,
    // so both take their fifth.
    const state = play([true, true, true, false, true, true, false, false, false, false]);
    assert.equal(state.outcomes.length, 10);
    assert.deepEqual(state.scores, [3, 2]);
    assert.equal(state.phase, 'complete');
  });

  test('level after ten still goes to sudden death', () => {
    const state = play(Array.from({ length: 10 }, () => true));
    assert.equal(state.outcomes.length, 10);
    assert.notEqual(state.phase, 'complete');
    assert.equal(inSuddenDeath(state), true);
  });

  test('every finished shootout has a winner, and none runs on', () => {
    // Exhaustive over all 1,024 ways ten penalties can go. Two properties:
    // a completed match is never level, and no match ever takes a penalty
    // after it was already decided.
    for (let bits = 0; bits < 1024; bits++) {
      const results = Array.from({ length: 10 }, (_, i) => Boolean(bits & (1 << i)));
      const state = play(results);
      if (state.phase !== 'complete') {
        assert.equal(state.scores[0], state.scores[1], `unfinished but not level at ${bits}`);
        continue;
      }
      assert.notEqual(state.scores[0], state.scores[1], `finished level at ${bits}`);

      // Rebuild the score after every prefix; none but the last may be decided.
      let a = 0;
      let b = 0;
      for (let i = 0; i < state.outcomes.length; i++) {
        if (state.outcomes[i] === 'goal') {
          if (i % 2 === 0) a += 1;
          else b += 1;
        }
        const taken = i + 1;
        const leftA = 5 - Math.ceil(taken / 2);
        const leftB = 5 - Math.floor(taken / 2);
        const over = a > b + leftB || b > a + leftA;
        if (over) {
          assert.equal(taken, state.outcomes.length, `played on after ${taken} at ${bits}`);
        }
      }
    }
  });
});
