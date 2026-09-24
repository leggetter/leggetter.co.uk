import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createRng } from '../../../core/rng.ts';
import { add, distance, dot, normalize, scale, sub, vec, type Vec3 } from '../../../core/vec3.ts';
import { twoBone } from './ik.ts';

const close = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;
const finite = (v: Vec3): boolean => [v.x, v.y, v.z].every(Number.isFinite);

describe('two-bone IK', () => {
  test('bones keep their length, whatever the target', () => {
    // Stretching a bone to make a reach is the one thing a limb must never do,
    // so this throws two thousand targets at it: near, far, behind, overhead.
    const rng = createRng(72);
    const r = (): number => rng.next() * 4 - 2;
    for (let i = 0; i < 2000; i++) {
      const root = vec(r(), r(), r());
      const target = vec(r(), r(), r());
      const upper = 0.1 + rng.next();
      const lower = 0.1 + rng.next();
      const { mid, end } = twoBone(root, target, upper, lower, vec(r(), r(), r()));
      assert.ok(close(distance(root, mid), upper), `upper bone is ${distance(root, mid)}, not ${upper}`);
      assert.ok(close(distance(mid, end), lower), `lower bone is ${distance(mid, end)}, not ${lower}`);
    }
  });

  test('a reachable target is reached exactly', () => {
    const target = vec(0.3, -0.4, 0.2);
    const { end, reached } = twoBone(vec(0, 0, 0), target, 0.4, 0.4, vec(0, 0, -1));
    assert.equal(reached, true);
    assert.ok(distance(end, target) < 1e-9);
  });

  test('out of reach, the limb stretches toward it and says so', () => {
    // A keeper at full stretch, not an arm that grows to meet the ball.
    const target = vec(3, 0, 0);
    const { mid, end, reached } = twoBone(vec(0, 0, 0), target, 0.4, 0.3, vec(0, 1, 0));
    assert.equal(reached, false);
    assert.ok(close(end.x, 0.7) && close(end.y, 0) && close(end.z, 0));
    // Fully straight: the middle joint lies on the line.
    assert.ok(close(mid.y, 0) && close(mid.z, 0));
  });

  test('too close to fold into, it gets as near as the bones allow', () => {
    const { end, reached } = twoBone(vec(0, 0, 0), vec(0.01, 0, 0), 0.5, 0.3, vec(0, 1, 0));
    assert.equal(reached, false);
    assert.ok(close(distance(vec(0, 0, 0), end), 0.2));
  });

  test('the middle joint bends toward the pole', () => {
    // Knees bend forward. Asked the other way, they bend the other way.
    for (const pole of [vec(0, 0, 1), vec(0, 0, -1), vec(1, 0, 0)]) {
      const root = vec(0, 1, 0);
      const target = vec(0, 0.2, 0);
      const { mid } = twoBone(root, target, 0.46, 0.44, pole);
      const along = normalize(sub(target, root));
      const onLine = add(root, scale(along, dot(sub(mid, root), along)));
      assert.ok(dot(sub(mid, onLine), pole) > 0, `bent away from ${JSON.stringify(pole)}`);
    }
  });

  test('a target on the root, or a pole along the limb, still gives a limb', () => {
    // The two cases with no direction in them. Neither may produce NaN, which
    // would draw nothing at all and fail silently on a canvas.
    const onRoot = twoBone(vec(1, 1, 1), vec(1, 1, 1), 0.4, 0.4, vec(0, 1, 0));
    const poleAlong = twoBone(vec(0, 0, 0), vec(0, -0.6, 0), 0.4, 0.4, vec(0, -1, 0));
    for (const { mid, end } of [onRoot, poleAlong]) {
      assert.ok(finite(mid) && finite(end));
    }
    assert.ok(close(distance(poleAlong.mid, vec(0, 0, 0)), 0.4));
  });
});
