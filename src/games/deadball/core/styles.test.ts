/**
 * Which ball you chose to hit.
 *
 * The numbers live in `content/shots.js`, so most of this is about that file
 * being a file people are invited to edit by hand - and about the one property
 * everything else rests on: a shot nobody styled must be struck plainly.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { NO_EVENTS } from './events.ts';
import { advance, createFlight } from './flight.ts';
import { createRng } from './rng.ts';
import { resolveShot } from './shot.ts';
import { defaultStyleId, nextStyle, PLAIN, styleFor, STYLES } from './styles.ts';
import type { KeeperProfile, Player } from './types.ts';
import { vec } from './vec3.ts';
import { KEEPERS } from '../content/keepers.js';
import { SQUAD } from '../content/players.js';

const player = SQUAD[0] as Player;
const spot = vec(0, 0.11, -20.5);
const strike = (style: string | undefined) =>
  resolveShot(
    { aim: { x: 0.3, y: 1 }, power: 0.8, curve: 0.5, lift: 0.5, timing: 0, style },
    player,
    createRng(7),
    { origin: spot, loft: 0.8 }
  );

describe('a shot nobody styled', () => {
  test('is struck plainly, not with the default selection', () => {
    // The bug this replaced: absent meant "finesse", so every shot in the game
    // that had never heard of styles quietly gained 1.7x the bend. Three
    // keeper tests said so within a minute of it landing.
    assert.equal(styleFor(undefined).id, PLAIN.id);
    for (const value of [1, 1, 1, 1]) void value;
    assert.deepEqual(
      [PLAIN.curve, PLAIN.power, PLAIN.loft, PLAIN.height, PLAIN.wobble],
      [1, 1, 1, 1, 0]
    );
  });

  test('and an id that no longer exists is plain too, not a crash', () => {
    // An older build, or a hand-edited store.
    for (const junk of ['volley', '', 'FINESSE']) {
      assert.equal(styleFor(junk).id, PLAIN.id);
    }
  });

  test('but the game opens on a real choice', () => {
    assert.notEqual(defaultStyleId(), PLAIN.id);
    assert.ok(STYLES.some((s) => s.id === defaultStyleId()));
  });
});

describe('the three of them', () => {
  test('are all there and all different', () => {
    assert.ok(STYLES.length >= 3);
    assert.equal(new Set(STYLES.map((s) => s.id)).size, STYLES.length);
    for (const style of STYLES) {
      assert.ok(style.label.length > 0, `${style.id} has no label`);
      assert.ok(style.hint.length > 0, `${style.id} has no hint to show under the button`);
    }
  });

  test('none of them is the same shot as another', () => {
    // Three buttons that do the same thing is worse than one button.
    const shape = (s: (typeof STYLES)[number]) =>
      [s.curve, s.power, s.loft, s.height, s.wobble].join('/');
    assert.equal(new Set(STYLES.map(shape)).size, STYLES.length);
  });

  test('the button cycles all the way round and back', () => {
    let id = defaultStyleId();
    const seen = new Set([id]);
    for (let i = 0; i < STYLES.length - 1; i++) {
      id = nextStyle(id);
      seen.add(id);
    }
    assert.equal(seen.size, STYLES.length, 'cycling does not reach every style');
    assert.equal(nextStyle(id), defaultStyleId(), 'cycling does not come back round');
  });
});

describe('what the styles actually do to a shot', () => {
  test('finesse bends it more than driven does', () => {
    // Measured as where the ball ends up, not as how much spin is on it. The
    // two are not the same: lofting scales the spin back down on purpose, so
    // that going over a wall does not multiply the bend. Spin is an
    // implementation detail and deflection is what somebody playing can see.
    const bend = (id: string) => {
      const shot = strike(id);
      let flight = createFlight(shot, KEEPERS[0] as KeeperProfile, createRng(3), 0, null, NO_EVENTS);
      for (let step = 0; step < 900; step++) {
        const before = flight.ball.position;
        flight = advance(flight, 1 / 120, NO_EVENTS);
        if (before.z < 0 && flight.ball.position.z >= 0) {
          return Math.abs(flight.ball.position.x - shot.aimPoint.x);
        }
      }
      return 0;
    };
    assert.ok(
      bend('finesse') > bend('driven') * 2,
      `finesse bent ${bend('finesse').toFixed(2)} m, driven ${bend('driven').toFixed(2)} m`
    );
  });

  test('driven is harder and lower', () => {
    const speed = (id: string) => {
      const v = strike(id).velocity;
      return Math.hypot(v.x, v.y, v.z);
    };
    assert.ok(speed('driven') > speed('finesse'), 'driven is not the hard one');
    assert.ok(
      strike('driven').aimPoint.y < strike('finesse').aimPoint.y,
      'driven does not stay low'
    );
  });

  test('a knuckleball is not aimable, by anybody', () => {
    // The point of it: fixed for one flight so it replays, but not derived
    // from anything the taker chose, so neither they nor the keeper can read
    // which way it will break.
    const spins = [1, 2, 3, 4, 5, 6].map((seed) =>
      resolveShot(
        { aim: { x: 0, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0, style: 'knuckle' },
        player,
        createRng(seed),
        { origin: spot }
      ).spin.y
    );
    assert.ok(new Set(spins).size > 1, 'every knuckleball breaks the same way');
    assert.ok(
      spins.some((s) => s > 0) && spins.some((s) => s < 0),
      'it only ever breaks one way, which is a hook and not a knuckleball'
    );
  });

  test('the same seed still gives the same knuckleball', () => {
    // Unreadable is not the same as unrepeatable. Replay and two devices both
    // need this one.
    const one = () =>
      resolveShot(
        { aim: { x: 0, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0, style: 'knuckle' },
        player,
        createRng(99),
        { origin: spot }
      ).spin.y;
    assert.equal(one(), one());
  });
});

describe('how far up the drag went is the float', () => {
  const alongTheGround = {
    aim: { x: 0.3, y: 0 },
    power: 0.8,
    curve: 0,
    lift: 0.5,
    timing: 0,
  };
  const atTheBar = {
    aim: { x: 0.3, y: 1 },
    power: 0.8,
    curve: 0,
    lift: 0.5,
    timing: 0,
  };

  test('aimed along the ground stays the flat solve, specialist or not', () => {
    const cap = resolveShot(alongTheGround, player, createRng(7), { origin: spot, loft: 0.85 });
    const flat = resolveShot(alongTheGround, player, createRng(7), { origin: spot, loft: 0 });
    assert.deepEqual(cap.velocity, flat.velocity);
  });

  test('aimed higher spends more of the cap going up', () => {
    const floated = resolveShot(atTheBar, player, createRng(7), { origin: spot, loft: 0.85 });
    const flat = resolveShot(atTheBar, player, createRng(7), { origin: spot, loft: 0 });
    const share = (shot: ReturnType<typeof resolveShot>) => {
      const speed = Math.hypot(shot.velocity.x, shot.velocity.y, shot.velocity.z);
      return shot.velocity.y / speed;
    };
    assert.ok(
      share(floated) > share(flat),
      `high aim with a cap went ${share(floated).toFixed(3)} up, flat ${share(flat).toFixed(3)}`
    );
  });

  test('a penalty with a high aim still has zero loft', () => {
    const fromTheSpot = vec(0, 0.11, -11);
    const asPenalty = resolveShot(atTheBar, player, createRng(7), { origin: fromTheSpot, loft: 0 });
    const ifItFloated = resolveShot(atTheBar, player, createRng(7), {
      origin: fromTheSpot,
      loft: 0.85,
    });
    assert.notDeepEqual(asPenalty.velocity, ifItFloated.velocity);
    const unset = resolveShot(atTheBar, player, createRng(7), { origin: fromTheSpot });
    assert.deepEqual(asPenalty.velocity, unset.velocity);
  });
});
