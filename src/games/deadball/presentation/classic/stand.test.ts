/**
 * Which end of the ground is enjoying this.
 *
 * The stand used to rise at everything, which is wrong in the one direction
 * that matters: a save is the single moment when most of a stadium is silent
 * and one end of it has lost its mind.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { allegiance, AWAY_END, STANDS, type Reaction } from './stand.ts';

const on = (celebrating: 'home' | 'away'): Reaction => ({
  elapsed: 0.2,
  from: 0,
  strength: 1,
  celebrating,
});

describe('the away end', () => {
  test('is the stand behind the far goal', () => {
    // Furthest from the penalty spot, and the end you look straight at from
    // behind your own goal - so the split is visible from the one camera that
    // can see both ends at once.
    const away = STANDS[AWAY_END];
    const others = STANDS.filter((_, i) => i !== AWAY_END);
    assert.ok(away);
    assert.ok(
      others.every((s) => Math.abs(s.front) < Math.abs(away.front)),
      'something else is further away than the away end'
    );
  });

  test('when the home side is celebrating, the away end is not', () => {
    assert.ok(allegiance({ stand: AWAY_END }, on('home')) < 0.3);
    for (let i = 0; i < STANDS.length; i++) {
      if (i === AWAY_END) continue;
      assert.equal(allegiance({ stand: i }, on('home')), 1);
    }
  });

  test('and when the away side is, the rest of the ground is not', () => {
    assert.equal(allegiance({ stand: AWAY_END }, on('away')), 1);
    for (let i = 0; i < STANDS.length; i++) {
      if (i === AWAY_END) continue;
      assert.ok(allegiance({ stand: i }, on('away')) < 0.3);
    }
  });

  test('nobody freezes', () => {
    // A crowd that stops dead reads as a crowd that has been switched off. The
    // people whose penalty was just saved do move - they just do not jump.
    for (const side of ['home', 'away'] as const) {
      for (let i = 0; i < STANDS.length; i++) {
        assert.ok(allegiance({ stand: i }, on(side)) > 0, `stand ${i} went completely still`);
      }
    }
  });

  test('the two never celebrate together', () => {
    for (const side of ['home', 'away'] as const) {
      const homeStand = STANDS.findIndex((_, i) => i !== AWAY_END);
      const home = allegiance({ stand: homeStand }, on(side));
      const away = allegiance({ stand: AWAY_END }, on(side));
      assert.notEqual(home === 1, away === 1);
    }
  });
});
