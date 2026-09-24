/**
 * What the two sides wear.
 *
 * The rule this has to hold is simple and the input is not: every strip on the
 * pitch must be tellable apart from every other for *any* kit anybody ever
 * writes, including the ones that do not exist yet. `content/players.js` is a
 * file people are invited to edit by hand, the custom player editor hands them
 * a colour picker, and there are now six of those.
 *
 * Four strips is six pairs, and **all six can share a screen.** Five always
 * could. The sixth - one keeper against the other - arrived with the resting
 * keeper standing beside the goal, and it is the reason every pair is checked
 * here rather than only the ones that obviously meet.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SQUAD } from '../../content/players.js';
import {
  awayTaking,
  KEEPER_KIT,
  keeperColours,
  OTHER_KEEPER_KIT,
  OWN_KEEPER_KIT,
  restingKeeperColours,
  takerColours,
  teamKits,
} from './kits.ts';

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
    // yellow to count as the same strip, so he is the squad's own worked
    // example of the exception rather than a case somebody has to imagine.
    let asKeeper = 0;
    for (const player of SQUAD) {
      const { own, other } = teamKits(player.colors.kit, player.colors.trim);
      if (other.kit === KEEPER_KIT) asKeeper++;
      else assert.ok(apart(own.kit, KEEPER_KIT) < 110, `${player.name} was moved off yellow for no reason`);
      assert.ok(apart(own.kit, other.kit) > 90, `${player.name} is playing against their own strip`);
    }
    assert.ok(asKeeper >= SQUAD.length - 1, 'the keeper kit should be the usual answer');
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
    for (const player of SQUAD) {
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

  const turns = [
    ['solo', 0],
    ['versus', 0],
    ['versus', 1],
    ['duel', 0],
    ['duel', 1],
  ] as const;

  test('you take in your kit and the keeper facing you is theirs', () => {
    // The keeper wears a keeper strip rather than their side's outfield one.
    // That is a reversal: keepers used to share the away shirt on purpose, and
    // the halfway line is what ended it - it put a keeper and their own ten in
    // the same frame, all in one colour. See KEEPER_KIT.
    assert.equal(takerColours(frame('solo', 0)).kit, '#2f6fd0');
    assert.equal(keeperColours(frame('solo', 0)).kit, OTHER_KEEPER_KIT);
  });

  test('when the computer takes, the shirts swap over', () => {
    // You go in goal for theirs, and you go in goal in your own side's keeper
    // strip. Before the swap the keeper stayed yellow while the computer ran
    // up in yellow too, and both figures on the screen were the opposition.
    assert.equal(takerColours(frame('versus', 1)).kit, KEEPER_KIT);
    assert.equal(keeperColours(frame('versus', 1)).kit, OWN_KEEPER_KIT);
  });

  test('the two figures are never in the same shirt', () => {
    for (const [mode, taker] of turns) {
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
    assert.equal(keeperColours(frame('duel', 0)).kit, OTHER_KEEPER_KIT);
    assert.equal(takerColours(frame('duel', 1)).kit, KEEPER_KIT);
    assert.equal(keeperColours(frame('duel', 1)).kit, OWN_KEEPER_KIT);
  });

  test('the keeper waiting beside the goal belongs to whoever is taking', () => {
    // Your turn, your keeper is the one with nothing to do. Their turn, theirs
    // is - which is the whole of the rule, and it is the opposite of the one
    // that decides who is in goal.
    assert.equal(restingKeeperColours(frame('solo', 0)).kit, OWN_KEEPER_KIT);
    assert.equal(restingKeeperColours(frame('versus', 0)).kit, OWN_KEEPER_KIT);
    assert.equal(restingKeeperColours(frame('versus', 1)).kit, OTHER_KEEPER_KIT);
    assert.equal(restingKeeperColours(frame('duel', 1)).kit, OTHER_KEEPER_KIT);
  });

  test('the keeper in goal and the one beside it are never the same figure twice', () => {
    // Both are on screen at once from the angled camera, both are keeper
    // shaped, and both are near the goal. Two of them in one strip is a
    // picture with two working keepers in it.
    for (const [mode, taker] of turns) {
      const f = frame(mode, taker);
      assert.ok(
        apart(keeperColours(f).kit, restingKeeperColours(f).kit) >= 110,
        `${mode} taker ${taker}: ${keeperColours(f).kit} and ${restingKeeperColours(f).kit}`
      );
    }
  });
});

describe('four strips, and the six pairs between them', () => {
  /** Every pair of the four, which is what has to hold now. */
  const pairs = (kit: string, trim: string, chosen = {}) => {
    const kits = teamKits(kit, trim, chosen);
    const shirts = [
      ['your outfield', kits.own.kit],
      ['their outfield', kits.other.kit],
      ['your keeper', kits.ownKeeper.kit],
      ['their keeper', kits.otherKeeper.kit],
    ] as const;
    const found: { label: string; gap: number }[] = [];
    for (let i = 0; i < shirts.length; i++) {
      for (let j = i + 1; j < shirts.length; j++) {
        const a = shirts[i] as (typeof shirts)[number];
        const b = shirts[j] as (typeof shirts)[number];
        found.push({ label: `${a[0]} v ${b[0]} (${a[1]} v ${b[1]})`, gap: apart(a[1], b[1]) });
      }
    }
    return found;
  };

  test('the four defaults are all tellable apart from each other', () => {
    // Six pairs, not five. The keepers never used to share a screen, which is
    // exactly the assumption the resting keeper broke.
    const found = pairs('#2f6fd0', '#f4f6f8');
    assert.equal(found.length, 6);
    for (const { label, gap } of found) {
      assert.ok(gap >= 110, `${label} are only ${gap.toFixed(0)} apart`);
    }
  });

  test('and so are the four every shipped player gets', () => {
    for (const player of SQUAD) {
      for (const { label, gap } of pairs(player.colors.kit, player.colors.trim)) {
        assert.ok(gap >= 110, `${player.name}: ${label} are only ${gap.toFixed(0)} apart`);
      }
    }
  });

  test('the keepers keep their own colours when nothing is in the way', () => {
    const kits = teamKits('#2f6fd0', '#f4f6f8');
    assert.equal(kits.ownKeeper.kit, OWN_KEEPER_KIT);
    assert.equal(kits.otherKeeper.kit, OTHER_KEEPER_KIT);
  });

  test('a keeper in the way of the outfield is moved, and the outfield is not', () => {
    // Somebody picks the green their own keeper wears. The squad player's kit
    // is the one thing that is never taken off them, so the keeper moves.
    const kits = teamKits(OWN_KEEPER_KIT, '#f4f6f8');
    assert.equal(kits.own.kit, OWN_KEEPER_KIT);
    assert.notEqual(kits.ownKeeper.kit, OWN_KEEPER_KIT);
    for (const { label, gap } of pairs(OWN_KEEPER_KIT, '#f4f6f8')) {
      assert.ok(gap >= 110, `${label} are only ${gap.toFixed(0)} apart`);
    }
  });

  test("a keeper's shorts come off their own shirt, not off a question", () => {
    // Six colour inputs, not eight. A light shirt gets dark shorts and a dark
    // one gets light, which is all the second colour was ever doing.
    assert.equal(teamKits('#2f6fd0', '#f4f6f8', { ownKeeper: '#f8f9fa' }).ownKeeper.trim, '#1d1d20');
    assert.equal(teamKits('#2f6fd0', '#f4f6f8', { ownKeeper: '#101418' }).ownKeeper.trim, '#eef2f6');
  });
});

describe('kits somebody set', () => {
  test('absent means the default, key by key', () => {
    // The whole point of an override: a strip nobody has touched follows
    // whatever the default is now, not whatever it was when they last looked.
    const derived = teamKits('#2f6fd0', '#f4f6f8');
    assert.deepEqual(teamKits('#2f6fd0', '#f4f6f8', {}), derived);
    assert.deepEqual(
      teamKits('#2f6fd0', '#f4f6f8', { ownKeeper: OWN_KEEPER_KIT }).other,
      derived.other
    );
    // And the one key that was set is the only one that moved.
    const one = teamKits('#2f6fd0', '#f4f6f8', { otherKeeper: '#e8590c' });
    assert.equal(one.otherKeeper.kit, '#e8590c');
    assert.deepEqual(one.own, derived.own);
    assert.deepEqual(one.other, derived.other);
    assert.deepEqual(one.ownKeeper, derived.ownKeeper);
  });

  test('changing the squad player still changes what your side wears', () => {
    // The reason absence has to mean "work it out" rather than "here is a
    // colour": Phase 4.5 hands the opposition an identity of its own, and a
    // value stored today must not freeze onto it.
    assert.equal(teamKits('#e03131', '#1d1d1d').own.kit, '#e03131');
    assert.equal(teamKits('#2f6fd0', '#f4f6f8').own.kit, '#2f6fd0');
  });

  test('a chosen colour is kept exactly when nothing clashes with it', () => {
    const kits = teamKits('#2f6fd0', '#f4f6f8', {
      own: '#1b1f3b',
      ownTrim: '#c92a2a',
      other: '#f59f00',
      otherTrim: '#0b7285',
      ownKeeper: '#2f9e44',
      otherKeeper: '#d6336c',
    });
    assert.equal(kits.own.kit, '#1b1f3b');
    assert.equal(kits.own.trim, '#c92a2a');
    assert.equal(kits.other.kit, '#f59f00');
    assert.equal(kits.other.trim, '#0b7285');
    assert.equal(kits.ownKeeper.kit, '#2f9e44');
    assert.equal(kits.otherKeeper.kit, '#d6336c');
  });

  test('a chosen colour that clashes is nudged apart rather than obeyed', () => {
    // Both keepers set to the same shirt. They stand a few metres from each
    // other from the angled camera, so one of them has to move - and it is the
    // one settled later, so the answer is the same every time.
    const kits = teamKits('#2f6fd0', '#f4f6f8', {
      ownKeeper: '#ae3ec9',
      otherKeeper: '#ae3ec9',
    });
    assert.equal(kits.ownKeeper.kit, '#ae3ec9');
    assert.notEqual(kits.otherKeeper.kit, '#ae3ec9');
    assert.ok(apart(kits.ownKeeper.kit, kits.otherKeeper.kit) >= 110);
  });

  test('violet is the one that looks fine and measures wrong', () => {
    // The obvious pick for the away keeper, and 80 from the default blue -
    // inside the threshold, and close enough on screen that two figures a few
    // metres apart read as the same side. Checked in RGB rather than by eye,
    // which is the whole reason this file measures anything.
    assert.ok(apart('#7048e8', '#2f6fd0') < 110);
    const kits = teamKits('#2f6fd0', '#f4f6f8', { otherKeeper: '#7048e8' });
    assert.notEqual(kits.otherKeeper.kit, '#7048e8');
    assert.ok(apart(kits.otherKeeper.kit, kits.own.kit) >= 110);
  });

  test('every strip set to one colour still comes out as four', () => {
    // The worst thing a colour picker can be asked to do, and somebody will.
    const kits = teamKits('#2f6fd0', '#f4f6f8', {
      own: '#2f6fd0',
      other: '#2f6fd0',
      ownKeeper: '#2f6fd0',
      otherKeeper: '#2f6fd0',
    });
    const shirts = [kits.own.kit, kits.other.kit, kits.ownKeeper.kit, kits.otherKeeper.kit];
    assert.equal(new Set(shirts).size, 4, shirts.join(' '));
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        assert.ok(
          apart(shirts[i] as string, shirts[j] as string) >= 110,
          `${shirts[i]} and ${shirts[j]}`
        );
      }
    }
  });

  test('junk out of storage falls back rather than reaching a canvas', () => {
    // `ctx.fillStyle` ignores what it cannot parse silently, so a bad colour
    // does not throw - it draws the figure in whoever's colour was set last.
    // A blank is the one that matters most: a stored blank must never win.
    for (const junk of ['', '   ', 'rebeccapurple', 'not a colour', '#12', null, 42, {}]) {
      const kits = teamKits('#2f6fd0', '#f4f6f8', {
        own: junk as string,
        ownTrim: junk as string,
        other: junk as string,
        otherTrim: junk as string,
        ownKeeper: junk as string,
        otherKeeper: junk as string,
      });
      assert.deepEqual(kits, teamKits('#2f6fd0', '#f4f6f8'), `${JSON.stringify(junk)} got through`);
    }
  });

  test('short hex is accepted from a setting too, because people write it', () => {
    assert.equal(teamKits('#2f6fd0', '#f4f6f8', { ownKeeper: '#0a0' }).ownKeeper.kit, '#0a0');
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
