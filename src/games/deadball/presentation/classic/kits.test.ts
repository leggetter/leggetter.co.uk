/**
 * What the two sides wear.
 *
 * The rule this has to hold is simple and the input is not: the opposition
 * must be tellable apart from the taker for *any* kit anybody ever writes,
 * including the ones that do not exist yet. `content/players.js` is a file
 * people are invited to edit by hand, and the custom player editor hands them
 * a colour picker.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ROSTER } from '../../content/players.js';
import { awayTaking, keeperColours, takerColours } from './draw.ts';
import { KEEPER_KIT, teamKits } from './kits.ts';

/** Perceived lightness, for judging whether two colours are tellable apart. */
function luma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Straight-line distance in RGB. Crude, and enough to catch two of a colour. */
function apart(a: string, b: string): number {
  const at = channels(a);
  const bt = channels(b);
  return Math.hypot(...at.map((v, i) => v - (bt[i] as number)));
}

/** Handles the short form, because `own.kit` comes back exactly as written. */
function channels(hex: string): number[] {
  const full =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  return [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16));
}

describe('the opposition kit', () => {
  test("they wear the keeper's colour, unless the taker is already in it", () => {
    // One colour means "them" everywhere it appears - the keeper, the far half
    // of the halfway line, and the computer when it is taking its turn. Two
    // different derived colours for the same side read as three teams.
    //
    // Nils Lindqvist ships in amber, which is close enough to the keeper's
    // yellow to count as the same strip, so he is the roster's own worked
    // example of the exception rather than a case somebody has to imagine.
    let asKeeper = 0;
    for (const player of ROSTER) {
      const { own, other } = teamKits(player.colors.kit, player.colors.trim);
      if (other.kit === KEEPER_KIT) asKeeper++;
      else assert.ok(apart(own.kit, KEEPER_KIT) < 110, `${player.name} was moved off yellow for no reason`);
      assert.ok(apart(own.kit, other.kit) > 90, `${player.name} is playing against their own strip`);
    }
    assert.ok(asKeeper >= ROSTER.length - 1, 'the keeper kit should be the usual answer');
  });

  test('unless the player picked that colour themselves', () => {
    // A yellow taker against a yellow opposition is the one thing this must
    // never produce, and somebody will pick yellow.
    for (const yellow of ['#ffd23f', '#fc0', '#f5c400']) {
      const { own, other } = teamKits(yellow, '#1b3a6b');
      assert.notEqual(other.kit, KEEPER_KIT);
      assert.ok(apart(own.kit, other.kit) > 90, `${yellow} got ${other.kit}`);
    }
  });

  test('every shipped player gets an opposition they can be told apart from', () => {
    for (const player of ROSTER) {
      const { own, other } = teamKits(player.colors.kit, player.colors.trim);
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
      const { own, other } = teamKits(flat, '#ffffff');
      assert.ok(apart(own.kit, other.kit) > 90, `${flat} got ${other.kit}`);
    }
  });

  test('a colour a canvas could not parse still gets an opposition', () => {
    // cleanPlayer should never let one through, but this runs on whatever the
    // frame happens to hold and a fallback is cheaper than a white pitch.
    for (const junk of ['', 'rebeccapurple', 'not a colour', '#12']) {
      const { other } = teamKits(junk, '#ffffff');
      assert.match(other.kit, /^#[0-9a-f]{6}$/i);
    }
  });

  test('short hex is understood, because people write it', () => {
    assert.deepEqual(teamKits('#09f', '#fff').other, teamKits('#0099ff', '#ffffff').other);
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
      const { own, other } = teamKits(kit as string, trim as string);
      assert.ok(
        Math.abs(luma(own.trim) - luma(other.trim)) > 0.3,
        `${own.trim} and ${other.trim} are the same shorts`
      );
    }
  });

  test('the taker keeps exactly the kit they were given', () => {
    const { own } = teamKits('#2f6fd0', '#f4f6f8');
    assert.equal(own.kit, '#2f6fd0');
    assert.equal(own.trim, '#f4f6f8');
  });
});

describe('who wears what, by turn', () => {
  const frame = (mode: string, taker: 0 | 1) =>
    ({ mode, taker, player: { colors: { kit: '#2f6fd0', trim: '#f4f6f8' } } }) as never;

  test('you take in your kit and the keeper facing you is the opposition', () => {
    assert.equal(takerColours(frame('solo', 0)).kit, '#2f6fd0');
    assert.equal(keeperColours(frame('solo', 0)).kit, KEEPER_KIT);
  });

  test('when the computer takes, the shirts swap over', () => {
    // You go in goal for theirs, and you go in goal in your own kit. Before
    // this the keeper stayed yellow while the computer ran up in yellow too,
    // and both figures on the screen were the opposition.
    assert.equal(takerColours(frame('versus', 1)).kit, KEEPER_KIT);
    assert.equal(keeperColours(frame('versus', 1)).kit, '#2f6fd0');
  });

  test('the two figures are never in the same shirt', () => {
    for (const [mode, taker] of [
      ['solo', 0],
      ['versus', 0],
      ['versus', 1],
      ['duel', 0],
      ['duel', 1],
    ] as const) {
      const f = frame(mode, taker);
      assert.notEqual(takerColours(f).kit, keeperColours(f).kit, `${mode} taker ${taker}`);
    }
  });

  test('a duel swaps too, because side 1 is the away side there as well', () => {
    // Both people in a hotseat duel take with the same player, so before this
    // the two turns were drawn identically and the only way to tell whose
    // penalty it was was to read the HUD. One rule for both modes fixes that
    // as a side effect of fixing `versus`.
    assert.equal(takerColours(frame('duel', 0)).kit, '#2f6fd0');
    assert.equal(keeperColours(frame('duel', 0)).kit, KEEPER_KIT);
    assert.equal(takerColours(frame('duel', 1)).kit, KEEPER_KIT);
    assert.equal(keeperColours(frame('duel', 1)).kit, '#2f6fd0');
  });
});

describe('who is celebrating', () => {
  const frame = (mode: string, taker: 0 | 1) => ({ mode, taker }) as never;

  /** The rule, in one place, exactly as ClassicPresentation applies it. */
  const celebrating = (mode: string, taker: 0 | 1, scored: boolean): 'home' | 'away' =>
    !awayTaking(frame(mode, taker)) === scored ? 'home' : 'away';

  test('you score, your side celebrates; you miss, theirs does', () => {
    assert.equal(celebrating('solo', 0, true), 'home');
    assert.equal(celebrating('solo', 0, false), 'away');
    assert.equal(celebrating('versus', 0, true), 'home');
    assert.equal(celebrating('versus', 0, false), 'away');
  });

  test('the computer scores, THEIR side celebrates', () => {
    // The bug this replaced. Keyed on "did it go in" alone, the home end rose
    // when the computer scored and the away end rose when it missed - both
    // exactly backwards, and only in the mode where somebody else takes one.
    assert.equal(celebrating('versus', 1, true), 'away');
    assert.equal(celebrating('versus', 1, false), 'home');
  });

  test('a duel splits the same way, because side 1 is the away side there too', () => {
    assert.equal(celebrating('duel', 1, true), 'away');
    assert.equal(celebrating('duel', 0, true), 'home');
  });

  test('whoever celebrates is wearing the kit that just scored', () => {
    // The two rules are separate pieces of code and have to agree: the shirt
    // the taker is in and the end that goes up for them.
    for (const [mode, taker] of [
      ['versus', 0],
      ['versus', 1],
      ['duel', 1],
    ] as const) {
      const f = frame(mode, taker);
      const takerIsAway = awayTaking(f);
      assert.equal(celebrating(mode, taker, true), takerIsAway ? 'away' : 'home');
    }
  });
});
