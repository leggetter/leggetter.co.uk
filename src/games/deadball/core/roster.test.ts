/**
 * Picking a footballer, and inventing one.
 *
 * Most of this is about not trusting input. A custom player comes from a form
 * and then from a disk, and the shipped roster is a file people are invited to
 * edit by hand - so every value here has been through somebody's fingers.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ROSTER } from '../content/players.js';
import {
  buildRoster,
  cleanPlayer,
  cleanPlayerName,
  customOf,
  makeId,
  MAX_CUSTOM,
  MAX_PLAYER_NAME,
  playerFor,
} from './roster.ts';

describe('the shipped roster', () => {
  test('every player in content/players.js survives cleaning unchanged', () => {
    // If cleaning altered a shipped player, either the file is wrong or the
    // rules are - and either way somebody's footballer is not what they wrote.
    const built = buildRoster(ROSTER, []);
    assert.equal(built.length, ROSTER.length);
    for (const [i, player] of built.entries()) {
      const source = ROSTER[i];
      assert.equal(player.id, source.id, 'id changed');
      assert.equal(player.name, source.name, `${source.id} name changed`);
      assert.equal(player.power, source.power, `${source.id} power changed`);
      assert.equal(player.accuracy, source.accuracy);
      assert.equal(player.curve, source.curve);
      assert.equal(player.composure, source.composure);
      assert.equal(player.foot, source.foot);
      assert.deepEqual(player.colors, source.colors, `${source.id} colours changed`);
      assert.equal(player.custom, false);
    }
  });

  test('none of them is marked custom, so none can be deleted from the game', () => {
    assert.equal(customOf(buildRoster(ROSTER, [])).length, 0);
  });
});

describe('cleaning a name', () => {
  test('a typed name survives', () => {
    assert.equal(cleanPlayerName('Ada Fenwick'), 'Ada Fenwick');
  });

  test('blank falls back rather than leaving an empty scoreboard', () => {
    assert.equal(cleanPlayerName(''), 'New Player');
    assert.equal(cleanPlayerName('   '), 'New Player');
    assert.equal(cleanPlayerName(undefined), 'New Player');
    assert.equal(cleanPlayerName(42), 'New Player');
  });

  test('control characters and bidi overrides go', () => {
    // Drawn with fillText onto the same canvas as everything else, so a
    // right-to-left override moves text that is not its own.
    assert.equal(cleanPlayerName('A\nB'), 'AB');
    assert.equal(cleanPlayerName('A‮B'), 'AB');
    assert.equal(cleanPlayerName('​​'), 'New Player');
  });

  test('long names are capped and do not end in a space', () => {
    const capped = cleanPlayerName('Wolfeschlegelsteinhausenbergerdorff');
    assert.ok(capped.length <= MAX_PLAYER_NAME);
    assert.equal(capped, capped.trim());
  });
});

describe('cleaning a player', () => {
  test('anything at all can arrive, and a player comes out', () => {
    const player = cleanPlayer(null, 'x', true);
    assert.equal(player.id, 'x');
    assert.equal(player.custom, true);
    for (const skill of [player.power, player.accuracy, player.curve, player.composure]) {
      assert.ok(skill >= 0 && skill <= 100);
    }
  });

  test('skills are clamped and rounded', () => {
    const player = cleanPlayer(
      { power: 9000, accuracy: -40, curve: 71.6, composure: Number.NaN },
      'x',
      true
    );
    assert.equal(player.power, 100);
    assert.equal(player.accuracy, 0);
    assert.equal(player.curve, 72);
    assert.equal(player.composure, 50, 'NaN falls back rather than propagating');
  });

  test('a colour that a canvas cannot parse is replaced', () => {
    // ctx.fillStyle ignores what it cannot read, silently, leaving whatever
    // colour was set last - so a bad value would not throw, it would draw the
    // figure in somebody else's kit.
    const bad = cleanPlayer({ colors: { kit: 'orange; drop table', trim: 'nope' } }, 'x', true);
    assert.match(bad.colors.kit, /^#[0-9a-f]{6}$/i);
    assert.match(bad.colors.trim, /^#[0-9a-f]{6}$/i);

    const good = cleanPlayer({ colors: { kit: '#ABC', trim: '#123456' } }, 'x', true);
    assert.equal(good.colors.kit, '#ABC');
    assert.equal(good.colors.trim, '#123456');
  });

  test('foot is one of two things', () => {
    assert.equal(cleanPlayer({ foot: 'left' }, 'x', true).foot, 'left');
    assert.equal(cleanPlayer({ foot: 'right' }, 'x', true).foot, 'right');
    assert.equal(cleanPlayer({ foot: 'both' }, 'x', true).foot, 'right');
  });
});

describe('ids', () => {
  test('an id is made from the name and reads as one', () => {
    assert.equal(makeId('Ada Fenwick', []), 'ada-fenwick');
    assert.equal(makeId("O'Brien!!", []), 'o-brien');
  });

  test('collisions get a suffix rather than overwriting', () => {
    assert.equal(makeId('Striker', ['striker']), 'striker-2');
    assert.equal(makeId('Striker', ['striker', 'striker-2']), 'striker-3');
  });

  test('a name with nothing usable in it still yields an id', () => {
    // Two different routes to the same idea. '!!!' survives name cleaning -
    // it is not blank - but slugs to nothing, so the id falls back. An empty
    // name never gets that far: it becomes "New Player" first, and its id
    // follows the name it will actually be shown under.
    assert.equal(makeId('!!!', []), 'player');
    assert.equal(makeId('', []), 'new-player');
    assert.equal(makeId('', ['new-player']), 'new-player-2');
  });

  test('a custom player can never take a shipped id', () => {
    // Shipped ids are claimed first, so storage cannot shadow a real player -
    // which would silently replace somebody's footballer with a forgery.
    const built = buildRoster(ROSTER, [{ id: ROSTER[0].id, name: 'Impostor' }]);
    const shipped = built.filter((p) => !p.custom);
    const custom = built.filter((p) => p.custom);
    assert.equal(shipped[0].id, ROSTER[0].id);
    assert.equal(shipped[0].name, ROSTER[0].name, 'the shipped player is untouched');
    assert.equal(custom.length, 1);
    assert.notEqual(custom[0].id, ROSTER[0].id);
  });
});

describe('building the roster', () => {
  test('rubbish in storage does not break the game', () => {
    // This store is a browser console away from holding anything at all.
    for (const junk of [null, undefined, 'nope', 42, {}, [null, 'x', 7]]) {
      const built = buildRoster(ROSTER, junk);
      assert.ok(built.length >= ROSTER.length, `${JSON.stringify(junk)} lost the roster`);
      for (const p of built) assert.ok(p.name.length > 0);
    }
  });

  test('a missing shipped roster still leaves somebody to take the penalty', () => {
    const built = buildRoster(null, [{ name: 'Only One' }]);
    assert.equal(built.length, 1);
    assert.equal(playerFor(built, undefined).name, 'Only One');
  });

  test('custom players are capped', () => {
    const many = Array.from({ length: MAX_CUSTOM + 8 }, (_, i) => ({ name: `P${i}` }));
    assert.equal(customOf(buildRoster(ROSTER, many)).length, MAX_CUSTOM);
  });

  test('shipped players come first, so the order does not shuffle', () => {
    const built = buildRoster(ROSTER, [{ name: 'Late Arrival' }]);
    assert.deepEqual(
      built.slice(0, ROSTER.length).map((p) => p.id),
      ROSTER.map((p) => p.id)
    );
    assert.equal(built[built.length - 1].custom, true);
  });

  test('picking falls back rather than returning nothing', () => {
    const built = buildRoster(ROSTER, []);
    assert.equal(playerFor(built, ROSTER[1].id).id, ROSTER[1].id);
    assert.equal(playerFor(built, 'nobody').id, built[0].id);
    assert.equal(playerFor(built, undefined).id, built[0].id);
  });
});
