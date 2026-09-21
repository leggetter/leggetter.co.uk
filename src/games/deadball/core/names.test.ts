import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  cleanName,
  cleanNames,
  cleanTeam,
  DEFAULT_NAMES,
  DEFAULT_TEAM,
  MAX_NAME,
  unnamed,
} from './names.ts';

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
  // Written against MAX_NAME rather than against its value. The previous
  // version spelled out twelve characters in three places, so raising the cap
  // failed three assertions that were not about the behaviour being tested.
  //
  // Trimmed after slicing as well as before: cutting at the cap can land mid
  // gap, and a name ending in a space draws with a hole before the score.
  // Cutting mid-word keeps the full cap.
  const oneLongWord = 'A'.repeat(MAX_NAME + 6);
  assert.equal(cleanName(oneLongWord, 0), 'A'.repeat(MAX_NAME));

  // Cutting on a gap leaves it one short, which is the point: a name ending in
  // a space draws with a hole between it and the score.
  const gapAtTheCap = `${'A'.repeat(MAX_NAME - 1)} Reserves`;
  const capped = cleanName(gapAtTheCap, 0);
  assert.equal(capped, 'A'.repeat(MAX_NAME - 1));
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

test('a team keeps its own default when nobody says', () => {
  assert.equal(cleanTeam('Northgate'), 'Northgate');
  assert.equal(cleanTeam(''), DEFAULT_TEAM);
  assert.equal(cleanTeam(null), DEFAULT_TEAM);
});

test('an unnamed opponent is the taker profile, not a blank and not a placeholder', () => {
  // The name on the scoreboard has to be the profile's own, because the
  // profile is what is actually playing: Phase 4.5 swaps in teams with
  // different abilities, and a side nobody renamed should arrive called
  // whatever that side is called.
  const profile = 'The Steady One';
  assert.equal(cleanTeam('', profile), profile);
  assert.equal(cleanTeam('   ', profile), profile);
  assert.equal(cleanTeam(undefined, profile), profile);
  assert.equal(cleanTeam(null, profile), profile);
  assert.equal(cleanTeam(42, profile), profile);
  // Strippable characters only is the same as saying nothing.
  assert.equal(cleanTeam('\u200b\u202e', profile), profile);
  // And the profile's own name is passed through rather than capped: it comes
  // from content/, not from a text field. Checked with one longer than the cap
  // rather than with a shipped profile, because every shipped profile is now
  // comfortably shorter than MAX_NAME and the assertion would be testing the
  // content file instead of the rule.
  const longProfile = 'The Unreadable One From Далеко';
  assert.ok(longProfile.length > MAX_NAME);
  assert.equal(cleanTeam('', longProfile), longProfile);
});

test('an opponent name is cleaned as hard as a person is', () => {
  // Drawn onto the same canvas as everything else, so the same rules: no
  // newlines, no direction overrides, and the same length cap.
  const profile = 'The Steady One';
  assert.equal(cleanTeam('North\ngate', profile), 'Northgate');
  assert.equal(cleanTeam('A\u202eB\u200bC', profile), 'ABC');
  // Cut at the cap mid-word, like a person's name is.
  const long = cleanTeam('Northgate Athletic Reserves and Colts', profile);
  assert.equal(long, 'Northgate Athletic Reser');
  assert.ok(long.length <= MAX_NAME);
  // The names this was raised for now survive intact, which is the point.
  assert.equal(cleanTeam('Manchester United', profile), 'Manchester United');
  assert.equal(cleanTeam('Brighton and Hove Albion', profile), 'Brighton and Hove Albion');
  assert.equal(long, long.trim());
});

test('a named opponent is kept, whichever side it belongs to', () => {
  assert.equal(cleanTeam('  Rovers  ', 'The Steady One'), 'Rovers');
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
  // The log is saved from the settings dialog and handed to somebody else to
  // read, so it is the one file in this game that leaves the device a name was
  // typed on.
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
