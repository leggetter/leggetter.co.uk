/**
 * The reducer, played across two devices.
 *
 * `remote` is a duel whose two people are not in the same room. Every rule is
 * a duel's; what changes is that nothing is being handed over, so the screen
 * that exists to cover a handover must not appear.
 *
 * This is the half of the two-device plan that can be tested before any of it
 * exists, because `core/` does not know what a wire is.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { initialMatch, reduce } from './match.ts';
import type { MatchState } from './match.ts';

const dive = { x: 1, y: 1 };
const start = (mode: 'duel' | 'remote' | 'versus') => initialMatch(42, 5, mode);
const afterDive = (state: MatchState) => reduce(state, { type: 'SET_DIVE', dive });

describe('a remote duel is a duel', () => {
  test('the keeper still picks first, before the taker sees anything', () => {
    assert.equal(start('remote').phase, 'keeping');
    assert.equal(start('duel').phase, 'keeping');
  });

  test('both sides alternate, so it is five each', () => {
    assert.equal(start('remote').shotsTotal, start('duel').shotsTotal);
  });

  test('a second pick is still ignored once one is in', () => {
    // The rule the whole format rests on, and it does not care where the two
    // people are standing.
    const committed = afterDive(start('remote'));
    const again = reduce(committed, { type: 'SET_DIVE', dive: { x: -1, y: 2 } });
    assert.deepEqual(again.dive, dive);
  });
});

describe('except that nothing is being handed over', () => {
  test('a duel goes to the handover screen and a remote one does not', () => {
    assert.equal(afterDive(start('duel')).phase, 'handover');
    assert.equal(afterDive(start('remote')).phase, 'ready');
  });

  test('versus skips it too, for its own reason', () => {
    // Nobody to hide from rather than nobody to hide behind: the computer
    // cannot peek. Same screen skipped, different argument.
    assert.equal(afterDive(start('versus')).phase, 'ready');
  });

  test('the pick is still recorded, it just does not wait', () => {
    // Skipping the screen must not skip the commitment. If it did, the taker
    // would be shooting at a keeper who had not chosen.
    assert.deepEqual(afterDive(start('remote')).dive, dive);
  });

  test('handing over a game nobody is handing over does nothing', () => {
    const ready = afterDive(start('remote'));
    assert.deepEqual(reduce(ready, { type: 'HANDED_OVER' }), ready);
  });
});
