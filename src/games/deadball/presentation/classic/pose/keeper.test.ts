/**
 * The keeper's motion, measured. Phase 3 of #72.
 *
 * The gloves are held to the simulation in figure.test.ts. These are about
 * the rest of the body: feet that do not slide while shuffling or pushing
 * off, a set you can see, and landings that are absorbed.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KEEPERS } from '../../../content/keepers.js';
import { SQUAD } from '../../../content/players.js';
import { NO_EVENTS } from '../../../core/events.ts';
import { advance, createFlight } from '../../../core/flight.ts';
import { idleDrift } from '../../../core/keeper.ts';
import { createRng } from '../../../core/rng.ts';
import { resolveShot, spotBall } from '../../../core/shot.ts';
import type { Dive, KeeperProfile, KeeperState, Player } from '../../../core/types.ts';
import { PENALTY_DISTANCE } from '../../../core/units.ts';
import { distance, vec, type Vec3 } from '../../../core/vec3.ts';
import type { Skeleton } from '../body/skeleton.ts';
import { poseBody } from './figure.ts';
import { keeperPose } from './keeper.ts';

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

const standing = (stance: number): KeeperState => ({
  stance,
  hands: vec(stance, 0.95, 0),
  body: vec(stance, 0.9, 0),
  target: null,
  committed: false,
  landed: 0,
});

const bodyOf = (state: KeeperState, phase: string, runUp = 0): Skeleton =>
  poseBody(keeperPose(state, 1, 0, phase, runUp));

/** Both ankles, lowest first, so a foot is followed whichever side it is drawn on. */
const ankles = (s: Skeleton): Vec3[] => [s.left.ankle, s.right.ankle].sort((a, b) => a.x - b.x);

describe('shuffling along the line', () => {
  test('a foot on the grass stays where it is; feet only move by stepping', () => {
    // The stance drifts continuously while the taker settles. The feet used to
    // slide along with it.
    let before: Vec3[] | null = null;
    let steps = 0;
    for (let t = 0; t < 20; t += 1 / 120) {
      const s = bodyOf(standing(idleDrift(t, 11)), 'ready');
      const now = ankles(s);
      if (before) {
        for (let i = 0; i < 2; i++) {
          const a = before[i]!;
          const b = now[i]!;
          const onGrass = a.y < 0.1 + 1e-9 && b.y < 0.1 + 1e-9;
          if (onGrass) assert.ok(distance(a, b) < 1e-9, `a foot slid ${(distance(a, b) * 1000).toFixed(2)} mm at ${t.toFixed(2)} s`);
          else if (distance(a, b) > 0) steps++;
        }
      }
      before = now;
    }
    assert.ok(steps > 20, 'the feet never stepped');
  });

  test('and the feet stay under the body', () => {
    for (let t = 0; t < 20; t += 0.05) {
      const stance = idleDrift(t, 11);
      for (const a of ankles(bodyOf(standing(stance), 'ready'))) {
        assert.ok(Math.abs(a.x - stance) < 0.45, `a foot is ${(a.x - stance).toFixed(2)} m from the stance`);
      }
    }
  });
});

describe('the set', () => {
  test('as the taker runs in, the keeper sinks at the knees - visibly', () => {
    const upright = bodyOf(standing(0), 'ready');
    const set = bodyOf(standing(0), 'runup', 1);
    assert.ok(set.head.y < upright.head.y - 0.15, `the head only dropped ${(upright.head.y - set.head.y).toFixed(2)} m`);
    // Knees out, so the bend is seen from in front and not only from the side.
    const kneeGap = (s: Skeleton): number => Math.abs(s.left.knee.x - s.right.knee.x);
    assert.ok(kneeGap(set) > kneeGap(upright) + 0.1, 'the knees did not go out');
    for (const a of ankles(set)) assert.ok(a.y < 0.1 + 1e-9, 'a foot left the grass to set');
    // Wherever the shuffle had got to: a foot caught mid-step comes down.
    for (let stance = -0.4; stance <= 0.4; stance += 0.01) {
      for (const a of ankles(bodyOf(standing(stance), 'runup', 1))) {
        assert.ok(a.y < 0.1 + 1e-9, `a foot is left hanging at stance ${stance.toFixed(2)}`);
      }
    }
  });
});

describe('the push', () => {
  test('the foot on the side of the dive stays planted as the body goes, then leaves', () => {
    for (const [dive, pushSide] of [
      [{ x: -3.3, y: 0.3 }, 'left'],
      [{ x: 3.3, y: 2.2 }, 'right'],
    ] as const) {
      const states = flight({ x: dive.x > 0 ? 0.9 : -0.9, y: 0.4 }, dive);
      const pick = (s: Skeleton): Vec3 => (pushSide === 'left' ? ankles(s)[0]! : ankles(s)[1]!);
      const start = pick(bodyOf(states[0]!, 'flight', 1));
      let held = 0;
      let left = false;
      for (const state of states.slice(0, 60)) {
        const s = bodyOf(state, 'flight', 1);
        const moved = distance(pick(s), start);
        if (!left && moved < 1e-9) held++;
        else left = true;
        if (!left) assert.ok(s.reached.leftFoot && s.reached.rightFoot, 'the push leg could not reach its foot');
      }
      assert.ok(held >= 4, `the push foot only stayed down for ${held} steps`);
      assert.ok(left, 'the push foot never left the grass');
    }
  });
});

describe('landing', () => {
  test('a full-length dive slides on along the grass after it lands', () => {
    // The same keeper - same hands, same body - touching down and fully down.
    // Everything that moves the hips sideways between the two is the slide.
    const states = flight({ x: -0.95, y: 0.1 }, { x: -3.3, y: 0.3 });
    const down = states[states.length - 1]!;
    assert.ok(down.landed >= 1);
    const hips = (landed: number): number => bodyOf({ ...down, landed }, 'resolved').pelvis.x;
    assert.ok(hips(1) < hips(0) - 0.1, `the body slid ${(hips(0) - hips(1)).toFixed(2)} m`);
  });

  test('landing on the feet, the knees give and come back', () => {
    // A keeper who went nowhere, coming down: without the absorb, nothing
    // would move at all.
    const hips = (landed: number): number => bodyOf({ ...standing(0), landed }, 'resolved').pelvis.y;
    assert.ok(hips(0.5) < hips(1) - 0.1, `the knees only gave ${(hips(1) - hips(0.5)).toFixed(2)} m`);
    assert.ok(Math.abs(hips(1) - hips(0)) < 1e-9, 'the keeper did not come back up');
  });
});
