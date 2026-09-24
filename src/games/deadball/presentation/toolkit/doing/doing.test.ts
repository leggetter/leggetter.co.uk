/**
 * The names `doing/` gives each moment, checked against a real kick and real
 * dives rather than against themselves.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KEEPERS } from '../../../content/keepers.js';
import { SQUAD } from '../../../content/players.js';
import { NO_EVENTS } from '../../../core/events.ts';
import { advance, createFlight } from '../../../core/flight.ts';
import { createRng } from '../../../core/rng.ts';
import { resolveShot, spotBall } from '../../../core/shot.ts';
import type { Dive, KeeperProfile, KeeperState, Player } from '../../../core/types.ts';
import { PENALTY_DISTANCE } from '../../../core/units.ts';
import { vec } from '../../../core/vec3.ts';
import { keeperDoing, keeperThrow, kickClock, kickMoments, takerDoing } from './doing.ts';

/** A whole kick, frame by frame at 120 Hz: standing, the run-up, and 1.2 s after the strike. */
function kick(): { phase: string; runUp: number; sinceStrike: number }[] {
  const frames: { phase: string; runUp: number; sinceStrike: number }[] = [];
  for (let i = 0; i < 30; i++) frames.push({ phase: 'ready', runUp: 0, sinceStrike: 0 });
  for (let u = 0; u <= 1 + 1e-9; u += 1 / 60) frames.push({ phase: 'runup', runUp: Math.min(1, u), sinceStrike: 0 });
  for (let t = 0; t <= 1.2; t += 1 / 120) frames.push({ phase: 'flight', runUp: 1, sinceStrike: t });
  return frames;
}

describe("the taker's moments", () => {
  const order = ['waiting', 'running', ...kickMoments().map((m) => m.name)];

  test('the content file names the moments this expects', () => {
    // If somebody renames a key in content/poses.js, a sprite sheet keyed by
    // the old name silently stops animating. Better to hear it here.
    assert.deepEqual(
      kickMoments().map((m) => m.name),
      ['plant', 'backswing', 'strike', 'contact', 'follow', 'land', 'watch']
    );
  });

  test('a kick passes through every moment, in order, and never goes back', () => {
    let last = -1;
    const seen = new Set<string>();
    for (const frame of kick()) {
      const doing = takerDoing(frame);
      const at = order.indexOf(doing.action);
      assert.ok(at >= 0, `unknown action ${doing.action}`);
      assert.ok(at >= last, `went back from ${order[last]} to ${doing.action}`);
      assert.ok(doing.progress >= 0 && doing.progress <= 1, `${doing.action} progress ${doing.progress}`);
      last = at;
      seen.add(doing.action);
    }
    assert.deepEqual([...seen], order);
  });

  test('contact is the strike: zero to go on the frame the ball leaves', () => {
    const atStrike = takerDoing({ phase: 'flight', runUp: 1, sinceStrike: 0 });
    assert.equal(atStrike.action, 'contact');
    assert.equal(atStrike.toContact, 0);
    const lastRunUp = takerDoing({ phase: 'runup', runUp: 1, sinceStrike: 0 });
    assert.equal(lastRunUp.action, 'contact');
  });

  test('planted, with the contact still to come', () => {
    const planted = kick()
      .map((frame) => takerDoing(frame))
      .filter((d) => d.action === 'plant');
    assert.ok(planted.length > 0);
    for (const d of planted) assert.ok(d.toContact > 0 && d.toContact < 0.2, `contact in ${d.toContact}`);
  });

  test('the time to contact only ever runs down', () => {
    let before = Infinity;
    for (const frame of kick().filter((f) => f.phase !== 'ready')) {
      const { toContact } = takerDoing(frame);
      assert.ok(toContact <= before + 1e-12, `toContact went up to ${toContact}`);
      before = toContact;
    }
  });

  test('waiting, the progress is how hard the shot being aimed is', () => {
    const aiming = { aim: { x: 0, y: 0 }, power: 0.6, curve: 0, lift: 0.5, timing: 0 };
    assert.equal(takerDoing({ phase: 'ready', runUp: 0, sinceStrike: 0, aiming }).progress, 0.6);
  });

  test('the clock is the one the poses use', () => {
    // pose/kick.ts reads `kickClock` too, so this is only checking the clock
    // is continuous across the strike, which is where the two halves meet.
    const before = kickClock({ phase: 'runup', runUp: 1, sinceStrike: 0 }).fromStrike;
    const after = kickClock({ phase: 'flight', runUp: 1, sinceStrike: 0 }).fromStrike;
    assert.equal(before, 0);
    assert.equal(after, 0);
  });
});

/** Every step of a real flight, landing included. */
function flight(aim: { x: number; y: number }, dive: Dive | null, seed = 5): KeeperState[] {
  const profile = KEEPERS[0] as KeeperProfile;
  const shot = resolveShot(
    { aim, power: 0.85, curve: 0, lift: 0.5, timing: 0 },
    SQUAD[0] as Player,
    createRng(seed),
    { origin: spotBall(PENALTY_DISTANCE) }
  );
  let f = createFlight(shot, profile, createRng(seed + 1), 0, dive, NO_EVENTS);
  const states: KeeperState[] = [];
  for (let i = 0; i < 360; i++) {
    states.push(f.keeper.state);
    f = advance(f, 1 / 120, NO_EVENTS);
  }
  return states;
}

describe("the keeper's moments", () => {
  const order = ['waiting', 'set', 'diving', 'landing', 'down'];

  test('a full-length dive goes set, diving, landing, down, and never back', () => {
    const states = flight({ x: -0.8, y: 0.2 }, { x: -3, y: 0.6 });
    let last = order.indexOf('set');
    const seen = new Set<string>();
    for (const keeper of states) {
      const doing = keeperDoing({ phase: 'flight', runUp: 1, keeper });
      const at = order.indexOf(doing.action);
      assert.ok(at >= last, `went back from ${order[last]} to ${doing.action}`);
      assert.ok(doing.progress >= 0 && doing.progress <= 1);
      last = at;
      seen.add(doing.action);
    }
    for (const action of ['diving', 'landing', 'down']) assert.ok(seen.has(action), `never ${action}`);
  });

  test('diving, the progress is how far along the dive the body is', () => {
    for (const keeper of flight({ x: 0.8, y: 0.7 }, { x: 3, y: 1.8 })) {
      const doing = keeperDoing({ phase: 'flight', runUp: 1, keeper });
      if (doing.action === 'diving') assert.equal(doing.progress, keeperThrow(keeper).extension);
    }
  });

  test('before the run-up, waiting; during it, set with the run-up', () => {
    const keeper = { stance: 0.1, hands: vec(0.1, 0.95, 0), landed: 0 };
    assert.equal(keeperDoing({ phase: 'ready', runUp: 0, keeper }).action, 'waiting');
    assert.deepEqual(keeperDoing({ phase: 'runup', runUp: 0.4, keeper }), { action: 'set', progress: 0.4 });
  });
});
