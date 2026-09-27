/**
 * The aiming guide bends the way the ball does, and ends in the crosshair.
 *
 * Two reports. "The ball seems to bend the opposite way of the indicator
 * arrow": the guide was a bow that came back to where the shot was pointed,
 * while the ball leaves along that line and is pushed to one side the whole
 * way. Then, "it's possible for the dotted yellow shot line not to meet with
 * the center of the crosshair": the crosshair marked where the shot was
 * pointed, not where it goes. These fly real shots through core/.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KEEPERS } from '../../content/keepers.js';
import { SQUAD } from '../../content/players.js';
import { cleanArrival } from '../../core/arrival.ts';
import { NO_EVENTS } from '../../core/events.ts';
import { advance, createFlight } from '../../core/flight.ts';
import { createRng } from '../../core/rng.ts';
import { resolveShot, spotBall } from '../../core/shot.ts';
import type { KeeperProfile, Player, ShotInput } from '../../core/types.ts';
import { PENALTY_DISTANCE } from '../../core/units.ts';
import { vec, type Vec3 } from '../../core/vec3.ts';
import { CAMERAS, standBehind } from '../cameras.ts';
import { createProjector } from '../toolkit/project.ts';
import { aimPath, screenCurl } from './draw.ts';

const spot = spotBall(PENALTY_DISTANCE);
const player = SQUAD[0] as Player;
const context = { origin: spot };
/** A keeper who never moves, so nothing but the spin changes the path. */
const statue = { ...(KEEPERS[0] as KeeperProfile), reach: 0, diveSpeed: 0, reactionMs: 1e6 };

// Aimed away from where the keeper stands, so the keeper's body never gets
// in the way of a shot that is being measured.
const input = (curve: number, style: string): ShotInput => ({ aim: { x: 0.55, y: 0.45 }, power: 0.8, curve, lift: 0.5, timing: 0, style });

/** A real kick, luck and all. */
function flight(curve: number, style: string, seed: number): Vec3[] {
  const shot = resolveShot(input(curve, style), player, createRng(seed), context);
  let f = createFlight(shot, statue, createRng(seed + 1), 0, { x: 9, y: 0.1 }, NO_EVENTS);
  const path: Vec3[] = [];
  for (let i = 0; i < 480 && f.ball.position.z < 0; i++) {
    path.push(f.ball.position);
    f = advance(f, 1 / 120, NO_EVENTS);
  }
  path.push(f.ball.position);
  return path;
}

/** How far the middle of a path sits off the straight line joining its ends, along x. */
function bow(path: Vec3[]): number {
  const start = path[0]!;
  const end = path[path.length - 1]!;
  const mid = path[Math.floor(path.length / 2)]!;
  const k = (mid.z - start.z) / (end.z - start.z);
  return mid.x - (start.x + (end.x - start.x) * k);
}

const at = (p: { x: number; y: number } | null): Vec3 => vec(p!.x, p!.y, 0);
/** The guide the game draws for this input: pointed straight, landing with the curl. */
const guide = (curve: number, style = 'finesse', steps = 32): Vec3[] =>
  aimPath(spot, at(cleanArrival(input(0, style), player, context)), at(cleanArrival(input(curve, style), player, context)), steps);

describe('where a clean strike lands', () => {
  test('is the middle of where real strikes land', () => {
    // The real kick adds scatter around it and nothing else, on a clean strike.
    for (const curve of [1, 0, -1]) {
      const clean = cleanArrival(input(curve, 'finesse'), player, context)!;
      let sum = 0;
      let n = 0;
      for (let seed = 0; seed < 40; seed++) {
        const end = flight(curve, 'finesse', seed * 7 + 1).at(-1)!;
        if (end.z < 0) continue;
        sum += end.x;
        n += 1;
      }
      assert.ok(n >= 30, `only ${n} of 40 reached the line`);
      assert.ok(Math.abs(sum / n - clean.x) < 0.25, `curve ${curve}: clean ${clean.x.toFixed(2)}, real average ${(sum / n).toFixed(2)}`);
    }
  });

  test('moves with the curl, the way the ball does', () => {
    const right = cleanArrival(input(1, 'finesse'), player, context)!.x;
    const left = cleanArrival(input(-1, 'finesse'), player, context)!.x;
    assert.ok(right - left > 1, `a full curl each way is only ${(right - left).toFixed(2)} m apart`);
  });
});

describe('the aiming guide', () => {
  test('ends exactly where the crosshair goes', () => {
    for (const curve of [1, 0.4, 0, -0.7]) {
      const end = guide(curve).at(-1)!;
      const landing = cleanArrival(input(curve, 'finesse'), player, context)!;
      assert.ok(Math.abs(end.x - landing.x) < 1e-9 && Math.abs(end.y - landing.y) < 1e-9, `curve ${curve}`);
    }
  });

  test('bows the same way off the straight line as the ball, for either curl and every style', () => {
    for (const style of ['driven', 'finesse', 'knuckle']) {
      for (const curve of [1, 0.5, -0.5, -1]) {
        for (const seed of [3, 11, 29]) {
          const ball = bow(flight(curve, style, seed));
          const drawn = bow(guide(curve, style));
          // Knuckle adds a break nobody chose, and a driven shot barely bends:
          // compare only where the chosen curl is clearly what is bending it.
          if (Math.abs(ball) < 0.03 || Math.abs(drawn) < 0.01) continue;
          assert.equal(Math.sign(drawn), Math.sign(ball), `${style}, curve ${curve}, seed ${seed}: guide ${drawn.toFixed(2)} m, ball ${ball.toFixed(2)} m`);
        }
      }
    }
  });

  test('leaves the boot along the pointed line', () => {
    // The ball does not jink sideways off the boot; the curl builds.
    const bent = guide(1);
    const straight = guide(0);
    const early = Math.abs(bent[2]!.x - straight[2]!.x);
    const late = Math.abs(bent.at(-1)!.x - straight.at(-1)!.x);
    assert.ok(early < late / 50, `early ${early.toFixed(3)} m, late ${late.toFixed(3)} m`);
  });

  test('is straight with no curl, and with nowhere to land goes where it is pointed', () => {
    assert.ok(Math.abs(bow(guide(0))) < 1e-9);
    const pointed = vec(1, 1, 0);
    assert.deepEqual(aimPath(spot, pointed, null).at(-1)!.x, pointed.x);
  });
});

describe('the bend dial and its arrow', () => {
  /*
    From behind the goal the camera looks back at the taker, so the taker's
    right is the left of the screen. The dial drew straight from `curve` and
    pointed the wrong way there. Checked for every camera against where the
    ball lands on screen.
  */
  test('point the way the ball goes on screen, from every camera', () => {
    for (const spec of Object.values(CAMERAS)) {
      const proj = createProjector(standBehind(spec, spot), 1280, 800);
      for (const curve of [1, -1]) {
        const bent = proj.project(guide(curve).at(-1)!);
        const straight = proj.project(guide(0).at(-1)!);
        assert.ok(bent && straight, `${spec.id}: the goal is off screen`);
        assert.equal(Math.sign(screenCurl(proj, spot, curve)), Math.sign(bent.x - straight.x), `${spec.id}, curve ${curve}`);
      }
    }
  });
});
