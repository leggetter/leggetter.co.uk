/**
 * The timing tools the poses are built from. Whether pose/ stays pure - no
 * drawing, no canvas, nothing from any package - is ../toolkit.test.ts's job
 * now, for the whole toolkit at once.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sampleKeys, springKnock, springTo } from './motion.ts';

describe('timing', () => {
  const keys = [
    { at: 0, values: { a: [0, 5] } },
    { at: 1, values: { a: [1, 5] } },
    { at: 2, values: { a: [3, 5] } },
    { at: 3, values: { a: [2, 5] } },
  ];

  test('keys pass through every key exactly', () => {
    for (const key of keys) assert.deepEqual(sampleKeys(keys, key.at).a, key.values.a);
  });

  test('two keys that agree hold exactly still between them - a planted foot does not creep', () => {
    for (let t = 0; t <= 3; t += 0.01) assert.equal(sampleKeys(keys, t).a[1], 5);
  });

  test('never overshoots a key, so nothing swings past where it was put', () => {
    for (let t = 0; t <= 3; t += 0.001) {
      const v = sampleKeys(keys, t).a[0]!;
      assert.ok(v >= -1e-12 && v <= 3 + 1e-12, `${v} at ${t}`);
    }
  });

  test('is not a straight line between keys: it gathers speed and carries it through', () => {
    // Linear timing is one of the tells #72 lists. Halfway between 1 and 3
    // (rising from 1 to 3, with 0 before and 2 after), a straight line says 2.
    const mid = sampleKeys(keys, 1.5).a[0]!;
    assert.ok(Math.abs(mid - 2) > 0.01, `${mid} is the linear answer`);
  });

  test('a spring overshoots once and settles where it was sent', () => {
    let peak = 0;
    for (let t = 0; t < 3; t += 0.001) peak = Math.max(peak, springTo(t, 2, 0.4));
    assert.ok(peak > 1.05 && peak < 1.5, `peak ${peak}`);
    assert.ok(Math.abs(springTo(5, 2, 0.4) - 1) < 1e-3);
    assert.equal(springTo(-1, 2, 0.4), 0);
  });

  test('a knock peaks at exactly 1 and dies away', () => {
    let peak = 0;
    for (let t = 0; t < 3; t += 0.0005) peak = Math.max(peak, springKnock(t, 2, 0.4));
    assert.ok(Math.abs(peak - 1) < 1e-3, `peak ${peak}`);
    assert.ok(Math.abs(springKnock(5, 2, 0.4)) < 1e-3);
  });
});
