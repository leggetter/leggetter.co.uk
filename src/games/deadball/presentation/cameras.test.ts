/**
 * Standing behind the ball, wherever it has been put.
 *
 * Every camera spec is written against the penalty spot. Free kicks move the
 * ball up to eight metres across and nine further out, so the specs are read
 * as offsets from the ball rather than as fixed positions - and the one thing
 * that must not change is the game that already existed.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { penaltySpot, setPieceFor } from '../core/setpiece.ts';
import { GOAL_WIDTH } from '../core/units.ts';
import { vec } from '../core/vec3.ts';
import { CAMERAS, listCameras, standBehind } from './cameras.ts';

const specs = listCameras().map((c) => CAMERAS[c.id]!);

describe('a penalty is left exactly alone', () => {
  test('every camera comes back unchanged at the penalty spot', () => {
    // The guard on the whole idea. Five phases of camera work were tuned
    // against these numbers and none of it is up for renegotiation because
    // free kicks arrived.
    for (const spec of specs) {
      const camera = standBehind(spec, penaltySpot().origin);
      assert.deepEqual(camera.position, spec.position, `${spec.id} moved`);
      assert.ok(Math.abs(camera.yaw - spec.yaw) < 1e-9, `${spec.id} turned`);
      assert.equal(camera.pitch, spec.pitch);
      assert.equal(camera.fov, spec.fov);
      assert.ok(Math.abs(camera.frame.depth - spec.frame.depth) < 1e-6, `${spec.id} reframed`);
    }
  });
});

describe('a free kick', () => {
  const kicks = Array.from({ length: 12 }, (_, i) => setPieceFor(31337, i, 'freekicks'));
  const angled = kicks.filter((k) => k.id !== 'middle');

  test('the camera ends up behind the ball, not beside it', () => {
    for (const spec of specs.filter((s) => !s.fromBehindTheGoal)) {
      for (const kick of angled.slice(0, 4)) {
        const camera = standBehind(spec, kick.origin);
        // Further from the goal than the ball is: that is what "behind" means.
        const toGoal = (p: { x: number; z: number }) => Math.hypot(p.x, p.z);
        assert.ok(
          toGoal(camera.position) > toGoal(kick.origin),
          `${spec.id} ended up in front of the ball at ${kick.id}`
        );
      }
    }
  });

  test('and it is pointed at the goal', () => {
    for (const spec of specs.filter((s) => !s.fromBehindTheGoal)) {
      for (const kick of angled) {
        const camera = standBehind(spec, kick.origin);
        // The angle from the camera to the goal, against where it is looking.
        const bearing = Math.atan2(-camera.position.x, -camera.position.z);
        const off = Math.abs(((bearing - camera.yaw + Math.PI) % (2 * Math.PI)) - Math.PI);
        assert.ok(off < 0.5, `${spec.id} at ${kick.id} is looking ${off.toFixed(2)} rad off the goal`);
      }
    }
  });

  test('the goal is framed at the distance it is actually at', () => {
    // Without this a kick from twenty metres frames the goal at the size it is
    // from eleven, and the picture is wrong by exactly how far the ball moved.
    for (const spec of specs.filter((s) => !s.fromBehindTheGoal)) {
      const near = standBehind(spec, vec(0, 0.11, -11));
      const far = standBehind(spec, vec(0, 0.11, -20.5));
      assert.ok(far.frame.depth > near.frame.depth + 8, `${spec.id} did not reframe`);
    }
  });

  test('the camera behind the goal does not move', () => {
    const behind = specs.find((s) => s.fromBehindTheGoal);
    assert.ok(behind);
    for (const kick of kicks.slice(0, 5)) {
      assert.deepEqual(standBehind(behind, kick.origin).position, behind.position);
    }
  });

  test('a kick from the left puts the camera left of the goal', () => {
    const spec = specs.find((s) => s.id === 'behind-taker')!;
    const left = kicks.find((k) => k.id === 'left')!;
    const camera = standBehind(spec, left.origin);
    assert.ok(camera.position.x < -GOAL_WIDTH / 2, 'the camera stayed in the middle');
  });
});
