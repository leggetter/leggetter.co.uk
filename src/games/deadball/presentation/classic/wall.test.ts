/**
 * The wall as drawn: whether you can see it is going to jump.
 *
 * Issue #65. A wall that jumps on a coin you cannot see is a tax on the one
 * shot that needs the gap, so the design rests on the cue - a wall set to jump
 * is crouched while you aim, and one that is not stands up straight. The
 * simulation's half of that is tested in core/setpiece.test.ts. This is the
 * half a player actually sees.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SQUAD } from '../../content/players.js';
import { setPieceFor } from '../../core/setpiece.ts';
import type { FrameState, Player } from '../../core/types.ts';
import { distance, dot, normalize, sub, vec, type Vec3 } from '../../core/vec3.ts';
import { AIRTIME, buildWall, JUMP_DELAY, wallPoseAt } from '../../core/wall.ts';
import { JUMPING_WALL } from '../../content/poses.js';
import type { Side, Skeleton } from './body/skeleton.ts';
import { BOOT_RADIUS, poseSize } from './pose/figure.ts';
import { figureBody, wallFigures } from './draw.ts';

const origin = vec(-8.5, 0.11, -17);
const piece = { ...setPieceFor(31337, 0, 'freekicks'), wallCount: 4, covering: -1 as const, origin };

/** Only what the wall reads. The view gets a snapshot, so this is one. */
const frame = (jumps: boolean, sinceStrike: number): FrameState =>
  ({
    wall: buildWall({ ...piece, wallJumps: jumps }),
    spot: origin,
    clock: 0,
    sinceStrike,
    player: SQUAD[0] as Player,
    kits: {},
    mode: 'solo',
    taker: 0,
  }) as unknown as FrameState;

const shoulders = (f: FrameState) => wallFigures(f).map((fig) => fig.shoulder.y);
const feet = (f: FrameState) => wallFigures(f).map((fig) => fig.feet.y);

describe('the wall as you see it', () => {
  test('a wall set to jump is crouched while you aim, and one that is not is not', () => {
    const set = shoulders(frame(true, 0));
    const tall = shoulders(frame(false, 0));
    assert.equal(set.length, 4);
    set.forEach((y, i) => {
      assert.ok(y < (tall[i] as number) - 0.15, `figure ${i} is not visibly crouched`);
    });
  });

  test('and the crouch is bent knees, not a shorter person', () => {
    // `stature` is fixed per person, so a lower shoulder over planted feet has
    // to be taken up by the legs. If this ever reads as a shrunken figure the
    // cue is gone, because nobody reads "about to jump" off a small man.
    const [crouched] = wallFigures(frame(true, 0));
    const [upright] = wallFigures(frame(false, 0));
    assert.ok(crouched && upright);
    assert.equal(crouched.stature, upright.stature);
    const bent = figureBody(crouched);
    const straight = figureBody(upright);
    assert.ok(bent.pelvis.y < straight.pelvis.y - 0.1, 'the hips did not drop');
  });

  test('goes up when the ball is struck, and comes back down', () => {
    const top = JUMP_DELAY + AIRTIME / 2;
    for (const y of feet(frame(true, top))) assert.ok(y > 0.5, `feet only ${y.toFixed(2)} m up`);
    for (const y of feet(frame(true, JUMP_DELAY + AIRTIME + 0.2))) assert.equal(y, 0);
    // A standing wall never leaves the ground.
    for (const y of feet(frame(false, top))) assert.equal(y, 0);
  });

  test('a standing wall is drawn exactly as it always was', () => {
    // Nothing about the wall that does not jump should have moved.
    for (const fig of wallFigures(frame(false, 0))) {
      assert.equal(fig.feet.y, 0);
      assert.ok(Math.abs(fig.shoulder.y - (fig.stature ?? 0)) < 0.013);
    }
  });
});

describe('about to jump, from a single screenshot', () => {
  /*
    You only ever see one wall at a time, so "set" has to be readable with
    nothing to compare it to. These compare it with a standing wall anyway,
    because that is the only way to put a number on "unmistakable": the head
    well down, the knees well bent, and the arms somewhere else entirely.
  */
  const bodies = (jumps: boolean, t = 0): Skeleton[] => wallFigures(frame(jumps, t)).map(figureBody);

  /** How far a knee is bent: 0 for a straight leg. */
  const kneeBend = (side: Side): number => {
    const thigh = normalize(sub(side.hip, side.knee));
    const shin = normalize(sub(side.ankle, side.knee));
    return 180 - (Math.acos(Math.max(-1, Math.min(1, dot(thigh, shin)))) * 180) / Math.PI;
  };

  test('the head is at least 30 cm lower', () => {
    const set = bodies(true);
    const tall = bodies(false);
    set.forEach((s, i) => {
      const drop = tall[i]!.head.y - s.head.y;
      assert.ok(drop >= 0.3, `figure ${i}: head only ${(drop * 100).toFixed(0)} cm lower`);
    });
  });

  test('the knees are bent at least 40 degrees more', () => {
    const set = bodies(true);
    const tall = bodies(false);
    set.forEach((s, i) => {
      for (const side of ['left', 'right'] as const) {
        const more = kneeBend(s[side]) - kneeBend(tall[i]![side]);
        assert.ok(more >= 40, `figure ${i} ${side} knee: only ${more.toFixed(0)} degrees more`);
      }
    });
  });

  test('the arms are swung back behind the hips instead of crossed in front', () => {
    // Facing the taker is -z, so behind them is +z.
    for (const s of bodies(true)) for (const side of [s.left, s.right]) assert.ok(side.hand.z > s.pelvis.z + 0.1);
    for (const s of bodies(false)) for (const side of [s.left, s.right]) assert.ok(side.hand.z < s.pelvis.z);
  });

  test('the feet stay on the grass and every leg reaches its foot', () => {
    for (const s of bodies(true)) {
      assert.ok(s.reached.leftFoot && s.reached.rightFoot);
      for (const side of [s.left, s.right]) assert.ok(side.ankle.y < 0.12, 'a foot came off the grass');
    }
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
