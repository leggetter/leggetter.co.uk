/**
 * The wall as drawn: whether you can see it is going to jump.
 *
 * You should not be able to, while you aim. A wall that squatted from the
 * moment the kick was set up made the jump a certainty rather than a risk, so
 * a wall that will jump now stands exactly like one that will not, and the
 * only tell is the load for the jump in the last part of the run-up. And the
 * hands stay low in front the whole way: arms in the air are a handball.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SQUAD } from '../../content/players.js';
import { setPieceFor } from '../../core/setpiece.ts';
import type { FrameState, MatchPhase, Player } from '../../core/types.ts';
import { dot, normalize, sub, vec } from '../../core/vec3.ts';
import { AIRTIME, buildWall, JUMP_DELAY, wallPoseAt } from '../../core/wall.ts';
import { JUMPING_WALL } from '../../content/poses.js';
import type { Side, Skeleton } from '../toolkit/body/skeleton.ts';
import { BOOT_RADIUS, poseSize } from '../toolkit/pose/figure.ts';
import { figureBody, wallFigures } from './draw.ts';

const origin = vec(-8.5, 0.11, -17);
const piece = { ...setPieceFor(31337, 0, 'freekicks'), wallCount: 4, covering: -1 as const, origin };

/** Only what the wall reads. The view gets a snapshot, so this is one. */
const frame = (jumps: boolean, sinceStrike: number, phase: MatchPhase = sinceStrike > 0 ? 'flight' : 'ready', runUp = 0, clock = 0): FrameState =>
  ({
    wall: buildWall({ ...piece, wallJumps: jumps }),
    spot: origin,
    clock,
    sinceStrike,
    phase,
    runUp,
    player: SQUAD[0] as Player,
    kits: {},
    mode: 'solo',
    taker: 0,
  }) as unknown as FrameState;

const feet = (f: FrameState) => wallFigures(f).map((fig) => fig.feet.y);
const bodies = (f: FrameState): Skeleton[] => wallFigures(f).map(figureBody);
/** The last frame of the run-up, fully loaded for the jump. */
const loaded = (jumps: boolean) => frame(jumps, 0, 'runup', 1);

/** How far a knee is bent: 0 for a straight leg. */
const kneeBend = (side: Side): number => {
  const thigh = normalize(sub(side.hip, side.knee));
  const shin = normalize(sub(side.ankle, side.knee));
  return 180 - (Math.acos(Math.max(-1, Math.min(1, dot(thigh, shin)))) * 180) / Math.PI;
};

describe('while you aim, you cannot tell', () => {
  test('a wall that will jump is drawn exactly like one that will not', () => {
    for (const clock of [0, 0.4, 2.7, 11.3]) {
      assert.deepEqual(wallFigures(frame(true, 0, 'ready', 0, clock)), wallFigures(frame(false, 0, 'ready', 0, clock)), `at clock ${clock}`);
    }
  });

  test('and still exactly like it for the first part of the run-up', () => {
    const until = JUMPING_WALL.load.from;
    for (const runUp of [0.1, until / 2, until]) {
      assert.deepEqual(wallFigures(frame(true, 0, 'runup', runUp)), wallFigures(frame(false, 0, 'runup', runUp)), `at run-up ${runUp}`);
    }
  });

  test('a standing wall is drawn exactly as it always was', () => {
    for (const fig of wallFigures(frame(false, 0))) {
      assert.equal(fig.feet.y, 0);
      assert.ok(Math.abs(fig.shoulder.y - (fig.stature ?? 0)) < 0.013);
    }
  });
});

describe('loading for the jump, at the end of the run-up', () => {
  test('dips at the knees by the strike', () => {
    const set = bodies(loaded(true));
    const tall = bodies(loaded(false));
    set.forEach((s, i) => {
      const drop = tall[i]!.head.y - s.head.y;
      assert.ok(drop >= 0.1, `figure ${i}: head only ${(drop * 100).toFixed(0)} cm lower`);
      for (const side of ['left', 'right'] as const) {
        assert.ok(kneeBend(s[side]) > kneeBend(tall[i]![side]) + 15, `figure ${i} ${side} knee barely bent`);
      }
    });
  });

  test('and the dip is bent knees, not a shorter person', () => {
    const [crouched] = wallFigures(loaded(true));
    const [upright] = wallFigures(loaded(false));
    assert.ok(crouched && upright);
    assert.equal(crouched.stature, upright.stature);
    const bent = figureBody(crouched);
    for (const side of [bent.left, bent.right]) assert.ok(side.ankle.y < 0.12, 'a foot came off the grass');
    assert.ok(bent.reached.leftFoot && bent.reached.rightFoot);
  });

  test('starts from where the standing wall is, without a jump in the picture', () => {
    // The first frame of the load must not snap: a pop is a tell too.
    const from = JUMPING_WALL.load.from;
    const a = bodies(frame(true, 0, 'runup', from + 0.01));
    const b = bodies(frame(false, 0, 'runup', from + 0.01));
    a.forEach((s, i) => assert.ok(Math.abs(s.head.y - b[i]!.head.y) < 0.02, `figure ${i} jumped ${((b[i]!.head.y - s.head.y) * 100).toFixed(1)} cm`));
  });
});

describe('hands down, the whole way through', () => {
  /*
    A wall with its arms in the air is giving away a handball, and drawn that
    way the ball looked as if it hit their hands going over. Checked in every
    frame from the run-up to well after landing.
  */
  const moments: [string, FrameState][] = [
    ['aiming', frame(true, 0)],
    ...[0.6, 0.8, 1].map((r): [string, FrameState] => [`run-up ${r}`, frame(true, 0, 'runup', r)]),
    ...Array.from({ length: 80 }, (_, i): [string, FrameState] => [`+${(i * 0.02).toFixed(2)} s`, frame(true, i * 0.02 + 0.001)]),
  ];

  test('never above the hips', () => {
    for (const [when, f] of moments) {
      for (const s of bodies(f)) {
        for (const side of [s.left, s.right]) assert.ok(side.hand.y <= s.pelvis.y + 0.05, `${when}: a hand is ${((side.hand.y - s.pelvis.y) * 100).toFixed(0)} cm above the hips`);
      }
    }
  });

  test('in front of the body and close in, never out to the side', () => {
    // Facing the taker is -z, so in front of them is lower z.
    for (const [when, f] of moments) {
      for (const s of bodies(f)) {
        for (const side of [s.left, s.right]) {
          assert.ok(side.hand.z < s.pelvis.z, `${when}: a hand is behind the body`);
          assert.ok(Math.abs(side.hand.x - s.pelvis.x) < 0.2, `${when}: a hand is out to the side`);
        }
      }
    }
  });
});

describe('the jump', () => {
  test('goes up when the ball is struck, and comes back down', () => {
    const top = JUMP_DELAY + AIRTIME / 2;
    for (const y of feet(frame(true, top))) assert.ok(y > 0.5, `feet only ${y.toFixed(2)} m up`);
    for (const y of feet(frame(true, JUMP_DELAY + AIRTIME + 0.2))) assert.equal(y, 0);
    // A standing wall never leaves the ground.
    for (const y of feet(frame(false, top))) assert.equal(y, 0);
  });
});

describe('in the air, the drawn wall is the wall the ball meets', () => {
  const push = JUMPING_WALL.push;
  const landsAt = JUMP_DELAY + AIRTIME;

  test('once the push is done, the boots are never below the gap core/ leaves under them', () => {
    // A low, hard shot through the gap under a jumping wall has to be seen
    // going through a gap, not through somebody's boots.
    for (let t = push + 0.01; t < landsAt - 0.01; t += 0.005) {
      const f = frame(true, t);
      const band = wallPoseAt(f.wall, t);
      const bottom = band.lift + band.tuck;
      for (const fig of wallFigures(f)) {
        const s = figureBody(fig);
        const size = poseSize(fig);
        for (const side of [s.left, s.right]) {
          const lowest = Math.min(side.ankle.y, side.toe.y) - BOOT_RADIUS * size;
          assert.ok(lowest > bottom - 0.03, `at ${t.toFixed(3)} s a boot is ${((bottom - lowest) * 100).toFixed(1)} cm into the gap`);
        }
      }
    }
  });

  test('and the shoulders ride exactly on core/\'s rise', () => {
    for (let t = push + 0.01; t < landsAt; t += 0.01) {
      const f = frame(true, t);
      const lift = wallPoseAt(f.wall, t).lift;
      for (const fig of wallFigures(f)) {
        assert.ok(Math.abs(fig.shoulder.y - (lift + (fig.stature ?? 0))) < 1e-9, `at ${t.toFixed(2)} s`);
      }
    }
  });

  test('landing, the knees take the weight and spring back', () => {
    const hips = (t: number): number => figureBody(wallFigures(frame(true, t))[0]!).pelvis.y;
    const settled = hips(landsAt + 1.5);
    let lowest = Infinity;
    for (let t = landsAt; t < landsAt + 0.4; t += 0.01) lowest = Math.min(lowest, hips(t));
    assert.ok(lowest < settled - 0.08, `the knees only gave ${((settled - lowest) * 100).toFixed(0)} cm`);
  });
});
