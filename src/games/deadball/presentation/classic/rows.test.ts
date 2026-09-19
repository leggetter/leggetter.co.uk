/**
 * Splitting a duel's shots into a row each.
 *
 * The drawing is not worth testing and this is: it is the arithmetic that
 * decides whose football goes where, and getting it wrong would put somebody
 * else's miss on your row.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Outcome } from '../../core/types.ts';
import { shotsBySide } from './draw.ts';

const G: Outcome = 'goal';
const S: Outcome = 'saved';

describe('a row each', () => {
  test('alternating shots split into two rows in taker order', () => {
    const [first, second] = shotsBySide([G, S, S, G], 10, false);
    // Even indices are whoever shoots first.
    assert.deepEqual(first, [G, S, undefined, undefined, undefined]);
    assert.deepEqual(second, [S, G, undefined, undefined, undefined]);
  });

  test('both rows are five long before a shot is taken', () => {
    const [first, second] = shotsBySide([], 10, false);
    assert.equal(first.length, 5);
    assert.equal(second.length, 5);
    assert.ok(first.every((o) => o === undefined));
  });

  test('a full regulation shootout fills both rows exactly', () => {
    const outcomes = Array.from({ length: 10 }, (_, i) => (i % 3 === 0 ? G : S));
    const [first, second] = shotsBySide(outcomes, 10, false);
    assert.equal(first.length, 5);
    assert.equal(second.length, 5);
    assert.ok([...first, ...second].every((o) => o !== undefined));
    assert.deepEqual(
      [...first, ...second].filter((o) => o === G).length,
      outcomes.filter((o) => o === G).length
    );
  });

  test('sudden death grows both rows a round at a time', () => {
    const ten = Array.from({ length: 10 }, () => G);
    const [first, second] = shotsBySide([...ten, G, S], 10, true);
    assert.equal(first.length, 6);
    assert.equal(second.length, 6);
    assert.equal(first[5], G);
    assert.equal(second[5], S);
  });

  test('a sudden death round in progress shows the answer still to come', () => {
    // The state the whole format turns on: one has taken theirs and the other
    // has not. An empty slot is the honest way to draw that, and dropping it
    // would make an 11-shot shootout look like a finished 10-shot one.
    const ten = Array.from({ length: 10 }, () => G);
    const [first, second] = shotsBySide([...ten, G], 10, true);
    assert.equal(first.length, 6);
    assert.equal(second.length, 6);
    assert.equal(first[5], G);
    assert.equal(second[5], undefined);
  });

  test('several rounds of sudden death keep the rows equal', () => {
    const many = Array.from({ length: 26 }, () => G);
    const [first, second] = shotsBySide(many, 10, true);
    assert.equal(first.length, 13);
    assert.equal(second.length, 13);
  });

  test('without sudden death the rows never grow past the regulation five', () => {
    // Defensive: a stale flag must not silently truncate a longer shootout,
    // nor invent rounds that did not happen.
    const [first] = shotsBySide(Array.from({ length: 10 }, () => G), 10, false);
    assert.equal(first.length, 5);
  });
});
