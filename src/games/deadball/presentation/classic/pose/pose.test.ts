/**
 * pose/ stays pure: no drawing, no canvas, nothing from draw.ts.
 *
 * The rule from #72 for phase 3: poses and pose-derivation may live in their
 * own module inside `classic`, if that helps testing, but must not import the
 * drawing code. That is what lets a test run 37,800 frames of dives, or every
 * millisecond of a kick, without a canvas - and what keeps the "what is this
 * figure doing" layer extractable when a second package needs it.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { sampleKeys, springKnock, springTo } from './motion.ts';

describe('the pose module stands apart from the drawing', () => {
  const here = new URL('.', import.meta.url);
  const sources = readdirSync(here)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ name, code: readFileSync(new URL(name, here), 'utf8') }));
  const stripped = (code: string): string => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  test('there are source files to check', () => {
    assert.ok(sources.length >= 3, `only found ${sources.length} files in pose/`);
  });

  test('it imports only from itself, body/, core/ and content/', () => {
    for (const { name, code } of sources) {
      for (const match of stripped(code).matchAll(/from\s+'([^']+)'/g)) {
        const from = match[1]!;
        assert.ok(
          from.startsWith('./') ||
            from.startsWith('../body/') ||
            from.startsWith('../../../core/') ||
            from.startsWith('../../../content/'),
          `${name} imports ${from} - pose/ must not depend on the drawing`
        );
      }
    }
  });

  test('it never touches a canvas or the page', () => {
    for (const { name, code } of sources) {
      assert.doesNotMatch(
        stripped(code),
        /\b(document|window|CanvasRenderingContext2D|HTMLCanvasElement|requestAnimationFrame|Projector)\b/,
        `${name} reaches for the browser`
      );
    }
  });
});

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
