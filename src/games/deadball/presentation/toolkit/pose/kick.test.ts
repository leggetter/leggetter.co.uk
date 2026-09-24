/**
 * The kick, measured. Phase 3 of #72.
 *
 * Nothing here can say whether a kick looks good - that is judged by eye, on
 * a phone. What these can say is whether it breaks the physical rules that
 * make a body look wrong however well it is drawn: a boot that never touches
 * the ball, a planted foot that slides, a leg that cannot reach its foot.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KICK } from '../../../content/poses.js';
import { SQUAD } from '../../../content/players.js';
import { createRng } from '../../../core/rng.ts';
import { resolveShot, spotBall } from '../../../core/shot.ts';
import { STYLES } from '../../../core/styles.ts';
import type { Player } from '../../../core/types.ts';
import { BALL_RADIUS, PENALTY_DISTANCE } from '../../../core/units.ts';
import { add, distance, dot, scale, sub, vec, type Vec3 } from '../../../core/vec3.ts';
import type { Side, Skeleton } from '../body/skeleton.ts';
import { BOOT_RADIUS, poseBody, poseSize } from './figure.ts';
import { kickKeys, takerPose, type KickInput } from './kick.ts';

const penalty = spotBall(PENALTY_DISTANCE);
const freeKick = vec(-8.5, BALL_RADIUS, -17);

const input = (over: Partial<KickInput>): KickInput => ({
  spot: penalty,
  foot: 'right',
  phase: 'runup',
  runUp: 0,
  sinceStrike: 0,
  clock: 0,
  power: 0,
  standOff: 1.55,
  ...over,
});

/** The skeleton for a moment of the kick, and how big the taker is. */
function at(over: Partial<KickInput>): { body: Skeleton; size: number } {
  const pose = takerPose(input(over));
  return { body: poseBody(pose), size: poseSize(pose) };
}

/** Every moment of a kick from standing to watching, finely enough to catch a slide. */
function* wholeKick(over: Partial<KickInput>) {
  yield { ...over, phase: 'ready', runUp: 0 };
  for (let i = 0; i <= 1000; i++) yield { ...over, phase: 'runup', runUp: i / 1000 };
  for (let i = 0; i <= 240; i++) yield { ...over, phase: i < 120 ? 'flight' : 'resolved', runUp: 1, sinceStrike: i / 120 };
}

/** Closest distance from a point to a segment. */
function toSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  return distance(p, add(a, scale(ab, t)));
}

/** The gap between the drawn edge of a boot and the ball's surface. Negative is inside it. */
function gap(boot: Side, ball: Vec3, size: number): number {
  return toSegment(ball, boot.ankle, boot.toe) - BALL_RADIUS - BOOT_RADIUS * size;
}

const kicking = (body: Skeleton, foot: 'left' | 'right'): Side => (foot === 'right' ? body.right : body.left);
const planted = (body: Skeleton, foot: 'left' | 'right'): Side => (foot === 'right' ? body.left : body.right);

const feet = ['right', 'left'] as const;
const spots = [penalty, freeKick];
const standOffs = [0.3, 0.9, 1.55];

describe('the boot meets the ball', () => {
  test('at the strike, the kicking boot is on the ball - every foot, every style, every spot', () => {
    // The pose does not know the style: nothing on the frame says what it was
    // until the ball is already moving. What it does know is where the ball is,
    // and every style starts from the same place - checked here from the shot
    // core/ actually builds, rather than assumed.
    for (const style of STYLES) {
      for (const spot of spots) {
        const shot = resolveShot(
          { aim: { x: 0.5, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0, style: style.id },
          SQUAD[0] as Player,
          createRng(3),
          { origin: spot }
        );
        const ball = shot.origin;
        for (const foot of feet) {
          for (const standOff of standOffs) {
            const { body, size } = at({ spot, foot, standOff, phase: 'flight', runUp: 1, sinceStrike: 0 });
            const g = gap(kicking(body, foot), ball, size);
            assert.ok(g <= 0.05 && g >= -0.01, `${style.id} ${foot}: boot is ${(g * 100).toFixed(1)} cm from the ball`);
          }
        }
      }
    }
  });

  test('and it is there for the last stretch of the run-up, so a 60 Hz frame always shows it', () => {
    // At 60 Hz a frame is 17 ms. The strike itself is one simulation step,
    // and the ball has already moved by the time the next frame is drawn, so
    // the contact has to be visible *before* it: from `strike` to the event.
    const strike = KICK.keys.find((k) => k.name === 'strike')?.runUp ?? 1;
    assert.ok((1 - strike) * 0.42 > 1 / 60, 'the contact is shorter than a frame');
    for (const foot of feet) {
      for (let u = strike; u <= 1; u += 0.005) {
        const { body, size } = at({ foot, runUp: u });
        const g = gap(kicking(body, foot), penalty, size);
        assert.ok(g <= 0.05 && g >= -0.01, `${foot} at runUp ${u.toFixed(3)}: ${(g * 100).toFixed(1)} cm`);
      }
    }
  });

  test('the boot never goes through the ball on the way in', () => {
    for (const foot of feet) {
      for (let u = 0; u <= 1; u += 0.002) {
        const { body, size } = at({ foot, runUp: u });
        for (const side of [body.left, body.right]) {
          assert.ok(gap(side, penalty, size) > -0.01, `${foot} at runUp ${u.toFixed(3)} is inside the ball`);
        }
      }
    }
  });

  test('the boot stays out of the grass at contact', () => {
    for (const foot of feet) {
      const { body, size } = at({ foot, phase: 'flight', runUp: 1 });
      const boot = kicking(body, foot);
      const lowest = Math.min(boot.ankle.y, boot.toe.y) - BOOT_RADIUS * size;
      assert.ok(lowest > -0.02, `the boot is ${(-lowest * 100).toFixed(1)} cm into the pitch`);
    }
  });

  test('after the strike the boot carries on through, toward the goal and up', () => {
    for (const foot of feet) {
      const contact = kicking(at({ foot, phase: 'flight', runUp: 1 }).body, foot);
      const follow = kicking(at({ foot, phase: 'flight', runUp: 1, sinceStrike: 0.14 }).body, foot);
      assert.ok(follow.ankle.z > contact.ankle.z + 0.4, 'no follow-through');
      assert.ok(follow.ankle.y > contact.ankle.y + 0.2, 'the follow-through stays on the grass');
    }
  });
});

describe('feet that stay where they are put', () => {
  test('the planted foot does not move from the plant to the end of the kick', () => {
    for (const foot of feet) {
      for (const spot of spots) {
        let first: Vec3 | null = null;
        const plantAt = KICK.keys.find((k) => k.name === 'plant')?.runUp ?? 0.66;
        for (const moment of wholeKick({ foot, spot })) {
          if (moment.phase === 'runup' && moment.runUp < plantAt) continue;
          if (moment.phase === 'ready') continue;
          const ankle = planted(at(moment).body, foot).ankle;
          first ??= ankle;
          assert.ok(distance(ankle, first) < 1e-9, `${foot}: the planted foot moved ${(distance(ankle, first) * 1000).toFixed(2)} mm`);
        }
      }
    }
  });

  test('every foot on the grass through the run-up stays exactly where it landed', () => {
    // A foot is on the grass when its ankle is at standing height. Between two
    // such frames with no lift in between, it must not have moved at all.
    for (const foot of feet) {
      for (const standOff of standOffs) {
        const grounded: (Vec3 | null)[] = [null, null];
        let slides = 0;
        let footfalls = 0;
        for (const moment of wholeKick({ foot, standOff })) {
          const { body, size } = at(moment);
          const lowest = 0.09 * size + 1e-6;
          [body.left, body.right].forEach((side, i) => {
            if (side.ankle.y <= lowest) {
              const was = grounded[i];
              if (was && distance(was, side.ankle) > 1e-9) slides++;
              if (!was) footfalls++;
              grounded[i] = side.ankle;
            } else {
              grounded[i] = null;
            }
          });
        }
        assert.equal(slides, 0, `${foot}, stand-off ${standOff}: a foot on the grass slid`);
        // Standing, two strides, the plant, and the kicking foot coming down.
        assert.ok(footfalls >= 5, `${foot}, stand-off ${standOff}: only ${footfalls} footfalls`);
      }
    }
  });

  test('every leg reaches its foot, all the way through', () => {
    // A leg that falls short draws the foot somewhere it was not put, which
    // is the slide the previous test would miss if it only checked targets.
    for (const foot of feet) {
      for (const standOff of standOffs) {
        for (const moment of wholeKick({ foot, standOff })) {
          const { body } = at(moment);
          assert.ok(body.reached.leftFoot && body.reached.rightFoot, `${foot} ${moment.phase} ${moment.runUp} ${moment.sinceStrike ?? 0}`);
        }
      }
    }
  });
});

describe('arms that balance the legs', () => {
  test('running in, each hand swings against the foot on its own side', () => {
    // Measured along the way the taker is running, which is diagonal: the
    // direction the hips move between one moment and the next.
    for (const foot of feet) {
      let agree = 0;
      let against = 0;
      for (let u = 0.05; u < 0.55; u += 0.01) {
        const { body } = at({ foot, runUp: u });
        const next = at({ foot, runUp: u + 0.005 }).body;
        const run = sub(next.pelvis, body.pelvis);
        const heading = scale(vec(run.x, 0, run.z), 1 / Math.hypot(run.x, run.z));
        for (const side of [body.left, body.right]) {
          const handAhead = dot(sub(side.hand, side.shoulder), heading);
          const footAhead = dot(sub(side.ankle, body.pelvis), heading);
          if (Math.abs(footAhead) < 0.1) continue;
          if (handAhead * footAhead < 0) against++;
          else agree++;
        }
      }
      assert.ok(against > agree * 3, `${foot}: ${against} against, ${agree} with`);
    }
  });

  test('at the strike, the arm on the planted side is out wide for balance', () => {
    for (const foot of feet) {
      const { body } = at({ foot, phase: 'flight', runUp: 1 });
      const arm = planted(body, foot);
      const outward = Math.abs(arm.hand.x - body.chest.x) - Math.abs(arm.shoulder.x - body.chest.x);
      assert.ok(outward > 0.3, `${foot}: the balancing hand is only ${outward.toFixed(2)} m out`);
      assert.ok(arm.hand.y > body.pelvis.y + 0.2, 'the balancing hand is down by the hip');
    }
  });

  test('standing, the arms hang by the sides rather than out like wings', () => {
    for (const foot of feet) {
      const { body } = at({ foot, phase: 'ready' });
      for (const side of [body.left, body.right]) {
        const out = Math.abs(side.hand.x - side.shoulder.x);
        assert.ok(out < 0.15, `a hand is ${out.toFixed(2)} m out from its shoulder`);
        assert.ok(side.hand.y < side.elbow.y && side.elbow.y < side.shoulder.y, 'an arm is not hanging');
      }
    }
  });
});

describe('weight', () => {
  test('when the hips stop at the plant, the chest carries on and comes back', () => {
    const plantAt = KICK.keys.find((k) => k.name === 'plant')?.runUp ?? 0.66;
    for (const foot of feet) {
      const lean = (u: number): number => {
        const { body } = at({ foot, runUp: u });
        return body.chest.z - body.pelvis.z;
      };
      // The keyed lean eases one way; the carry pushes it the other, then lets go.
      const carried = Math.max(...[0.02, 0.04, 0.06, 0.08].map((d) => lean(plantAt + d) - lean(plantAt)));
      assert.ok(carried > 0.02, `${foot}: the chest only carried ${(carried * 100).toFixed(1)} cm`);
    }
  });

  test('after the kick the body dips as the foot comes down, and settles still', () => {
    for (const foot of feet) {
      const hips = (t: number): number => at({ foot, phase: 'resolved', runUp: 1, sinceStrike: t }).body.pelvis.y;
      const settled = hips(3);
      // The keys alone never take the hips below the \`land\` key's height:
      // the curve through them does not overshoot. Anything lower is the
      // knees giving.
      const land = KICK.keys.find((k) => k.name === 'land')!;
      const keyed = (land.pelvis?.[1] ?? 0) * at({ foot }).size;
      let lowest = Infinity;
      for (let t = 0.3; t < 1; t += 0.01) lowest = Math.min(lowest, hips(t));
      assert.ok(lowest < keyed - 0.02, `${foot}: no give as the weight arrives`);
      assert.ok(Math.abs(hips(2.5) - settled) < 1e-3, `${foot}: still moving 2.5 s after the kick`);
    }
  });
});

describe('the content file', () => {
  test('every key is on the clock in order, with nothing falling back', () => {
    const keys = kickKeys();
    assert.equal(keys.length, KICK.keys.length);
    for (let i = 1; i < keys.length; i++) assert.ok(keys[i]!.at > keys[i - 1]!.at, `${keys[i]!.name} is not after ${keys[i - 1]!.name}`);
    for (const raw of KICK.keys as Record<string, unknown>[]) {
      for (const [name, value] of Object.entries(raw)) {
        if (name === 'name' || name === 'runUp' || name === 'after') continue;
        assert.ok(
          Array.isArray(value) && value.length === 3 && value.every(Number.isFinite),
          `${String(raw.name)}.${name} is not three numbers`
        );
      }
    }
  });

  test('a broken key costs that key one part, not the whole kick', () => {
    const broken = kickKeys([
      { name: 'plant', runUp: 0.66, pelvis: [0, 1, 0] },
      { name: 'contact', runUp: 1, pelvis: 'oops' },
    ]);
    assert.equal(broken.length, 2);
    assert.deepEqual(broken[0]!.values.pelvis, [0, 1, 0]);
    assert.equal(broken[1]!.values.pelvis, undefined);
  });
});
