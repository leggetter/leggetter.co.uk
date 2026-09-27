/**
 * In a two-device game, each side wears the strip it chose, on both phones.
 *
 * Each phone used to dress both sides from its own Kits, so you saw your
 * friend in whatever you had set as "Theirs", and they saw you in theirs.
 * These build the frame each phone would build from the same room state, with
 * different Kits on each, and check they draw the same two teams.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SQUAD } from '../../content/players.js';
import type { FrameState, KitOverrides, Player } from '../../core/types.ts';
import { shootoutStrips } from '../../net/strips.ts';
import type { Side, TeamOnTheWire } from '../../net/Transport.ts';
import { kitsFor, takerColours } from '../toolkit/kits.ts';

const team = (name: string, kit: string, trim: string): TeamOnTheWire => ({ name, squad: [], kit: { kit, trim } });

/** What one phone draws: its own Kits settings, plus whatever the room said. */
const phone = (teams: [TeamOnTheWire, TeamOnTheWire], first: Side, kits: KitOverrides, taker: 0 | 1 = 0): FrameState =>
  ({
    mode: 'remote',
    taker,
    player: SQUAD[0] as Player,
    kits,
    strips: shootoutStrips(teams, first),
  }) as unknown as FrameState;

// Two phones that have set up Kits quite differently.
const mine: KitOverrides = { own: '#2f6fd0', other: '#f5c400' };
const yours: KitOverrides = { own: '#14967f', other: '#8338ec', otherTrim: '#000000' };

describe('each side in its own strip', () => {
  const host = team('Reds', '#e03131', '#f4f6f8');
  const guest = team('Greens', '#2f9e44', '#141418');

  for (const first of [0, 1] as const) {
    test(`both phones dress the two sides the same, whoever shoots first (seat ${first})`, () => {
      const a = kitsFor(phone([host, guest], first, mine));
      const b = kitsFor(phone([host, guest], first, yours));
      assert.deepEqual(a.own, b.own);
      assert.deepEqual(a.other, b.other);
    });

    test(`and the taker wears their own side's strip (seat ${first})`, () => {
      const firstUp = first === 0 ? host : guest;
      const second = first === 0 ? guest : host;
      for (const kits of [mine, yours]) {
        assert.deepEqual(takerColours(phone([host, guest], first, kits, 0)), firstUp.kit);
        assert.deepEqual(takerColours(phone([host, guest], first, kits, 1)), second.kit);
      }
    });
  }

  test('two sides in the same shirt: the second is adjusted, the same way on both phones', () => {
    const red = team('One', '#e03131', '#f4f6f8');
    const alsoRed = team('Two', '#e03131', '#141418');
    const a = kitsFor(phone([red, alsoRed], 0, mine));
    const b = kitsFor(phone([red, alsoRed], 0, yours));
    assert.equal(a.own.kit, '#e03131', 'the first side keeps its shirt');
    assert.notEqual(a.other.kit, '#e03131', 'the second was not adjusted');
    assert.equal(a.other.kit, b.other.kit, 'the phones adjusted it differently');
  });
});

describe('until both sides are known', () => {
  test("the phone's own Kits dress the sides, as before", () => {
    const half = team('Waiting', '', '');
    const frame = phone([team('Reds', '#e03131', '#f4f6f8'), half], 0, mine);
    assert.equal(frame.strips, undefined);
    assert.equal(kitsFor(frame).own.kit, '#2f6fd0');
  });

  test('anything that is not a colour is ignored rather than drawn', () => {
    assert.equal(shootoutStrips([team('A', 'red', '#fff'), team('B', '#000', '#fff')], 0), undefined);
  });
});
