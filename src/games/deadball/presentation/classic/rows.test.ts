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

  test('the empty pair appears the moment it goes to sudden death', () => {
    // Reported from play: the sixth pair only turned up once somebody had
    // taken the eleventh penalty, so the instant a shootout went level after
    // ten the scoreboard still showed a full five each and nothing to say what
    // was coming. The empty pair is the announcement that there is another
    // round, so it has to be there before the round is.
    const ten = Array.from({ length: 10 }, () => G);
    const [first, second] = shotsBySide(ten, 10, true);
    assert.equal(first.length, 6);
    assert.equal(second.length, 6);
    assert.equal(first[5], undefined);
    assert.equal(second[5], undefined);
  });

  test('and again for the round after that', () => {
    const twelve = Array.from({ length: 12 }, () => G);
    const [first, second] = shotsBySide(twelve, 10, true);
    assert.equal(first.length, 7);
    assert.equal(second.length, 7);
    assert.equal(first[5], G, 'the round just played is filled in');
    assert.equal(first[6], undefined, 'and the next one is waiting');
  });

  test('a finished shootout shows no round nobody will take', () => {
    // The flag is false at full time, or the panel would promise a seventh
    // round after a shootout that ended in the sixth.
    const [first, second] = shotsBySide([...Array.from({ length: 12 }, () => G)], 10, false);
    assert.equal(first.length, 6);
    assert.equal(second.length, 6);
    assert.equal(first[5], G);
  });

  test('sudden death grows both rows a round at a time', () => {
    const ten = Array.from({ length: 10 }, () => G);

    // Round six settled it, so the match is over and nothing is awaited.
    const [decidedA, decidedB] = shotsBySide([...ten, G, S], 10, false);
    assert.equal(decidedA.length, 6);
    assert.equal(decidedB.length, 6);
    assert.equal(decidedA[5], G);
    assert.equal(decidedB[5], S);

    // Round six was level, so a seventh is coming and its pair is already up.
    const [levelA, levelB] = shotsBySide([...ten, G, G], 10, true);
    assert.equal(levelA.length, 7);
    assert.equal(levelB.length, 7);
    assert.equal(levelA[5], G);
    assert.equal(levelA[6], undefined);
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
    assert.equal(second[5], undefined, 'the answer is still to come');
  });

  test('several rounds of sudden death keep the rows equal', () => {
    // Thirteen rounds all level, so a fourteenth is waiting. However long it
    // runs, the two rows stay the same length as each other - a row that grew
    // ahead of the other would read as somebody having an extra penalty.
    const many = Array.from({ length: 26 }, () => G);
    const [first, second] = shotsBySide(many, 10, true);
    assert.equal(first.length, second.length);
    assert.equal(first.length, 14);
    assert.equal(first[13], undefined);
  });

  test('without sudden death the rows never grow past the regulation five', () => {
    // Defensive: a stale flag must not silently truncate a longer shootout,
    // nor invent rounds that did not happen.
    const [first] = shotsBySide(Array.from({ length: 10 }, () => G), 10, false);
    assert.equal(first.length, 5);
  });
});
