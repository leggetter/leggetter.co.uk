/**
 * The twenty on the halfway line.
 *
 * Two things here are worth a test and the rest is drawing. The lineup has to
 * be built the same way every frame, and the opposition's kit has to differ
 * from the taker's for *any* kit anybody ever writes - including the ones that
 * do not exist yet, because `content/players.js` is a file people are invited
 * to edit and the custom player editor takes a colour picker.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ROSTER } from '../../content/players.js';
import { buildLineup, opposingKit, PER_TEAM } from './lineup.ts';

/** Perceived lightness, for judging whether two colours are tellable apart. */
function luma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Straight-line distance in RGB. Crude, and enough to catch two of a colour. */
function apart(a: string, b: string): number {
  const at = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const bt = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return Math.hypot(...at.map((v, i) => v - (bt[i] as number)));
}

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

describe('the opposition kit', () => {
  test('every shipped player gets an opposition they can be told apart from', () => {
    for (const player of ROSTER) {
      const { own, other } = opposingKit(player.colors.kit, player.colors.trim);
      assert.ok(
        apart(own.kit, other.kit) > 90,
        `${player.name}'s kit and the opposition's are too close: ${own.kit} vs ${other.kit}`
      );
    }
  });

  test('a colour with no hue to rotate still gets an opposition', () => {
    // White, black and grey all sit on the axis where rotating the hue does
    // nothing at all, and a custom player in a white kit is the likeliest kit
    // anybody will invent.
    for (const flat of ['#ffffff', '#000000', '#808080', '#f4f6f8']) {
      const { own, other } = opposingKit(flat, '#ffffff');
      assert.ok(apart(own.kit, other.kit) > 90, `${flat} got ${other.kit}`);
    }
  });

  test('a colour a canvas could not parse still gets an opposition', () => {
    // cleanPlayer should never let one through, but this runs on whatever the
    // frame happens to hold and a fallback is cheaper than a white pitch.
    for (const junk of ['', 'rebeccapurple', 'not a colour', '#12']) {
      const { other } = opposingKit(junk, '#ffffff');
      assert.match(other.kit, /^#[0-9a-f]{6}$/i);
    }
  });

  test('short hex is understood, because people write it', () => {
    assert.deepEqual(opposingKit('#09f', '#fff').other, opposingKit('#0099ff', '#ffffff').other);
  });

  test('the two lines never wear the same shorts', () => {
    // The bug this replaced: the opposition's shorts were picked off their own
    // shirt, so a blue kit with white shorts put both teams in white and the
    // lines only differed above the waist.
    for (const [kit, trim] of [
      ['#2f6fd0', '#f4f6f8'],
      ['#e03131', '#1d1d1d'],
      ['#f5b301', '#1b3a6b'],
      ['#ffffff', '#ffffff'],
      ['#101010', '#101010'],
    ]) {
      const { own, other } = opposingKit(kit as string, trim as string);
      assert.ok(
        Math.abs(luma(own.trim) - luma(other.trim)) > 0.3,
        `${own.trim} and ${other.trim} are the same shorts`
      );
    }
  });

  test('the taker keeps exactly the kit they were given', () => {
    const { own } = opposingKit('#2f6fd0', '#f4f6f8');
    assert.equal(own.kit, '#2f6fd0');
    assert.equal(own.trim, '#f4f6f8');
  });
});
