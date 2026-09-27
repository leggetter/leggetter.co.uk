/**
 * The aiming guide bends the way the ball does.
 *
 * Reported as "the ball seems to bend the opposite way of the indicator
 * arrow". It did: the guide was a bow that peaked mid-flight and came back to
 * the aim point, while the ball leaves along the aim line and is pushed to one
 * side the whole way. These fly real shots through core/ and compare the
 * shape of the flight with the shape the guide draws.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KEEPERS } from '../../content/keepers.js';
import { SQUAD } from '../../content/players.js';
import { NO_EVENTS } from '../../core/events.ts';
import { advance, createFlight } from '../../core/flight.ts';
import { createRng } from '../../core/rng.ts';
import { resolveShot, spotBall } from '../../core/shot.ts';
import type { KeeperProfile, Player } from '../../core/types.ts';
import { PENALTY_DISTANCE } from '../../core/units.ts';
import { vec, type Vec3 } from '../../core/vec3.ts';
import { CAMERAS, standBehind } from '../cameras.ts';
import { createProjector } from '../toolkit/project.ts';
import { aimPath, screenCurl } from './draw.ts';

const spot = spotBall(PENALTY_DISTANCE);
/** A keeper who never moves, so nothing but the spin changes the path. */
const statue = { ...(KEEPERS[0] as KeeperProfile), reach: 0, diveSpeed: 0, reactionMs: 1e6 };

function flight(curve: number, style: string, seed: number): Vec3[] {
  const shot = resolveShot(
    { aim: { x: 0, y: 0.4 }, power: 0.8, curve, lift: 0.5, timing: 0, style },
    SQUAD[0] as Player,
    createRng(seed),
    { origin: spot }
  );
  let f = createFlight(shot, statue, createRng(seed + 1), 0, { x: 9, y: 0.1 }, NO_EVENTS);
  const path: Vec3[] = [];
  for (let i = 0; i < 400 && !f.outcome; i++) {
    path.push(f.ball.position);
    f = advance(f, 1 / 120, NO_EVENTS);
  }
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

describe('the aiming guide and the ball', () => {
  const guide = (curve: number) => aimPath(spot, vec(0, 0.9, 0), curve, 32);

  test('bow the same way off the straight line, for either curl and every style', () => {
    for (const style of ['driven', 'finesse', 'knuckle']) {
      for (const curve of [1, 0.5, -0.5, -1]) {
        for (const seed of [3, 11, 29]) {
          const ball = bow(flight(curve, style, seed));
          // Knuckle adds a break nobody chose; only compare where the chosen
          // curl is clearly the bigger part of the bow.
          if (style === 'knuckle' && Math.abs(ball) < 0.05) continue;
          assert.equal(
            Math.sign(bow(guide(curve))),
            Math.sign(ball),
            `${style}, curve ${curve}, seed ${seed}: the guide bows ${bow(guide(curve)).toFixed(2)} m, the ball ${ball.toFixed(2)} m`
          );
        }
      }
    }
  });

  test('and finish on the same side of the aim', () => {
    // More curl to the right ends further right, in the ball and in the guide.
    const ballRight = flight(1, 'finesse', 3).at(-1)!.x - flight(-1, 'finesse', 3).at(-1)!.x;
    const guideRight = guide(1).at(-1)!.x - guide(-1).at(-1)!.x;
    assert.ok(ballRight > 0 && guideRight > 0, `ball ${ballRight.toFixed(2)} m, guide ${guideRight.toFixed(2)} m`);
  });

  test('leaves the boot along the aim line', () => {
    // The ball does not jink sideways off the boot; the curl builds.
    const path = guide(1);
    const early = path[2]!.x - spot.x;
    const late = path[path.length - 1]!.x - path[path.length - 3]!.x;
    assert.ok(Math.abs(early) < Math.abs(late) / 4, `early ${early.toFixed(3)}, late ${late.toFixed(3)}`);
  });

  test('a straight drag draws a straight guide', () => {
    assert.equal(bow(guide(0)), 0);
  });
});

describe('the bend dial and its arrow', () => {
  /*
    From behind the goal the camera looks back at the taker, so the taker's
    right is the left of the screen. The dial drew straight from \`curve\` and
    pointed the wrong way there. Checked for every camera against where the
    guide's end lands on screen, which is where the ball goes.
  */
  test('point the way the ball goes on screen, from every camera', () => {
    const target = vec(0, 0.9, 0);
    for (const spec of Object.values(CAMERAS)) {
      const proj = createProjector(standBehind(spec, spot), 1280, 800);
      for (const curve of [1, -1]) {
        const bent = proj.project(aimPath(spot, target, curve).at(-1)!);
        const straight = proj.project(aimPath(spot, target, 0).at(-1)!);
        assert.ok(bent && straight, `${spec.id}: the goal is off screen`);
        assert.equal(
          Math.sign(screenCurl(proj, spot, curve)),
          Math.sign(bent.x - straight.x),
          `${spec.id}, curve ${curve}: the dial points the other way to the bend`
        );
      }
    }
  });
});
