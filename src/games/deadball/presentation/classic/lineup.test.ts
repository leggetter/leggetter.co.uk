/**
 * The twenty on the halfway line.
 *
 * Who stands where. The colours they wear are `kits.ts`, and tested there.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildLineup, PER_TEAM } from './lineup.ts';


describe('who stands there', () => {
  test('twenty people, ten a side', () => {
    const people = buildLineup();
    assert.equal(people.length, PER_TEAM * 2);
    assert.equal(people.filter((p) => p.team === 0).length, PER_TEAM);
    assert.equal(people.filter((p) => p.team === 1).length, PER_TEAM);
  });

  test('the same twenty every time it is asked', () => {
    // Drawn from a hash of the index rather than stored, so this is really
    // asking whether anything stateful crept into the build.
    assert.deepEqual(buildLineup(), buildLineup());
  });

  test('the two teams stand on opposite sides of the spot', () => {
    const people = buildLineup();
    assert.ok(people.filter((p) => p.team === 0).every((p) => p.x < 0));
    assert.ok(people.filter((p) => p.team === 1).every((p) => p.x > 0));
  });

  test('nobody is standing inside anybody else', () => {
    // Linked arms put them close on purpose. Closer than half a metre and two
    // figures merge into one wide one.
    const xs = buildLineup()
      .map((p) => p.x)
      .sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      const gap = (xs[i] as number) - (xs[i - 1] as number);
      assert.ok(gap > 0.5, `two of them are ${gap.toFixed(2)} m apart`);
    }
  });

  test('they fit on the pitch', () => {
    // The touchline is 34 m out. A line that ran past it would have people
    // standing in the side stand.
    assert.ok(buildLineup().every((p) => Math.abs(p.x) < 30));
  });

  test('nobody sways in time with anybody else', () => {
    const phases = buildLineup().map((p) => p.phase);
    assert.equal(new Set(phases).size, phases.length);
  });
});
