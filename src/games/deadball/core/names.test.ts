import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanName, cleanNames, DEFAULT_NAMES, MAX_NAME, unnamed } from './names.ts';

test('a typed name survives intact', () => {
  assert.equal(cleanName('Ama', 0), 'Ama');
  assert.equal(cleanName("O'Brien", 1), "O'Brien");
  assert.equal(cleanName('Zoë', 0), 'Zoë');
});

test('surrounding space goes, inner space stays', () => {
  assert.equal(cleanName('  Ama  ', 0), 'Ama');
  assert.equal(cleanName('Ama B', 0), 'Ama B');
});

test('nothing typed falls back to the side it belongs to', () => {
  assert.equal(cleanName('', 0), DEFAULT_NAMES[0]);
  assert.equal(cleanName('', 1), DEFAULT_NAMES[1]);
  assert.equal(cleanName('   ', 1), DEFAULT_NAMES[1]);
});

test('a long name is capped, and the cap does not leave a trailing space', () => {
  // Trimmed after slicing as well as before: cutting at the cap can land mid
  // gap, and a name ending in a space draws with a hole before the score.
  // Cutting mid-word keeps the full cap.
  assert.equal(cleanName('Abcdefghijklmnop', 0), 'Abcdefghijkl');

  // Cutting on a gap leaves it one short, which is the point: a name ending in
  // a space draws with a hole between it and the score.
  const capped = cleanName('Abcdefghijk Lmnop', 0);
  assert.equal(capped, 'Abcdefghijk');
  assert.ok(capped.length <= MAX_NAME);
  assert.equal(capped, capped.trim());
});

test('control characters and bidi overrides are removed', () => {
  // A name is drawn onto a canvas with fillText. A newline or a right-to-left
  // override in one would move text that belongs to the rest of the HUD.
  assert.equal(cleanName('A\nB', 0), 'AB');
  assert.equal(cleanName('A\u202eB', 0), 'AB');
  assert.equal(cleanName('A\u200bB', 0), 'AB');
});

test('a name made only of strippable characters falls back rather than blanking', () => {
  assert.equal(cleanName('\u0007', 0), DEFAULT_NAMES[0]);
  assert.equal(cleanName('\u200b\u200b', 1), DEFAULT_NAMES[1]);
});

test('anything at all can arrive from storage', () => {
  // This store is a browser console away from holding whatever somebody likes,
  // and the shape is a promise from last release, not a guarantee.
  assert.deepEqual(cleanNames(null), DEFAULT_NAMES);
  assert.deepEqual(cleanNames('Ama'), DEFAULT_NAMES);
  assert.deepEqual(cleanNames([]), DEFAULT_NAMES);
  assert.deepEqual(cleanNames(['Ama']), ['Ama', DEFAULT_NAMES[1]]);
  assert.deepEqual(cleanNames([1, 2]), DEFAULT_NAMES);
  assert.deepEqual(cleanNames(['Ama', 'Bo', 'Cai']), ['Ama', 'Bo']);
});

test('unnamed only holds while both are untouched', () => {
  assert.equal(unnamed(DEFAULT_NAMES), true);
  assert.equal(unnamed(['Ama', DEFAULT_NAMES[1]]), false);
  assert.equal(unnamed([DEFAULT_NAMES[0], 'Bo']), false);
});

test('a name never reaches the shot log', async () => {
  // The log is exported by keypress and handed to somebody else to read, so it
  // is the one file in this game that leaves the device a name was typed on.
  // `takerSide` already says who did what. This test is here to fail if a
  // future field quietly adds one back.
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../telemetry/log.ts', import.meta.url), 'utf8')
  );
  // Any field whose identifier contains "name", not a whole-word `name:` -
  // the first version of this only matched the latter, so it sat there passing
  // while a `takerName: string` was added two lines above it.
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const leaked = code.match(/^\s*(\w*[Nn]ame\w*)\s*\??:/gm);
  assert.equal(leaked, null, `ShotRecord must not carry a name: ${leaked?.join(', ')}`);
});
