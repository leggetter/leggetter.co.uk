import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { PROPORTIONS } from '../../../content/proportions.js';
import { ARM_SPAN } from '../../../core/keeper.ts';
import { add, distance, dot, normalize, scale, sub, vec, type Vec3 } from '../../../core/vec3.ts';
import {
  BODY,
  cleanProportions,
  DEFAULT_PROPORTIONS,
  solveBody,
  type BodyTargets,
  type Skeleton,
} from './skeleton.ts';

const close = (a: number, b: number, tolerance = 1e-9): boolean => Math.abs(a - b) <= tolerance;

/** Somebody standing on the spot, facing the goal. */
const standing: BodyTargets = {
  pelvis: vec(0, 0.95, 0),
  chest: vec(0, 1.45, 0),
  facing: vec(0, 0, 1),
  hands: [vec(-0.26, 0.9, 0.08), vec(0.26, 0.9, 0.08)],
  ankles: [vec(-0.12, 0.08, 0), vec(0.12, 0.08, 0)],
};

/** Every bone, and the length it should be. */
function bones(s: Skeleton): [string, Vec3, Vec3, number][] {
  const list: [string, Vec3, Vec3, number][] = [
    ['spine', s.pelvis, s.chest, BODY.spine],
    ['neck', s.chest, s.head, BODY.neck],
    ['shoulders', s.left.shoulder, s.right.shoulder, BODY.shoulderWidth],
    ['hips', s.left.hip, s.right.hip, BODY.hipWidth],
  ];
  for (const [name, side] of [['left', s.left], ['right', s.right]] as const) {
    list.push(
      [`${name} upper arm`, side.shoulder, side.elbow, BODY.upperArm],
      [`${name} forearm`, side.elbow, side.wrist, BODY.forearm],
      [`${name} hand`, side.wrist, side.hand, BODY.hand],
      [`${name} thigh`, side.hip, side.knee, BODY.thigh],
      [`${name} shin`, side.knee, side.ankle, BODY.shin],
      [`${name} foot`, side.ankle, side.toe, BODY.foot]
    );
  }
  return list;
}

function allFinite(s: Skeleton): boolean {
  const points = [s.pelvis, s.chest, s.head, ...Object.values(s.left), ...Object.values(s.right)];
  return points.every((p) => [p.x, p.y, p.z].every(Number.isFinite));
}

/** How far `point` sits from the line through `a` and `b`, measured along `direction`. */
function offLine(point: Vec3, a: Vec3, b: Vec3, direction: Vec3): number {
  const along = normalize(sub(b, a));
  const nearest = add(a, scale(along, dot(sub(point, a), along)));
  return dot(sub(point, nearest), direction);
}

describe('a jointed body', () => {
  test('every bone is the length the proportions say', () => {
    const s = solveBody(standing);
    for (const [name, a, b, length] of bones(s)) {
      assert.ok(close(distance(a, b), length), `${name} is ${distance(a, b)}, not ${length}`);
    }
  });

  test('standing, every hand and foot reaches its target', () => {
    const s = solveBody(standing);
    assert.deepEqual(s.reached, { leftHand: true, rightHand: true, leftFoot: true, rightFoot: true });
    assert.ok(distance(s.left.hand, standing.hands[0]) < 1e-9);
    assert.ok(distance(s.right.ankle, standing.ankles[1]) < 1e-9);
  });

  test("left and right are the body's own, and match the camera behind the taker", () => {
    // Facing the goal, +x is the taker's right and the right of the screen.
    const s = solveBody(standing);
    assert.ok(s.left.shoulder.x < 0 && s.right.shoulder.x > 0);
    assert.ok(s.left.hip.x < 0 && s.right.hip.x > 0);
  });

  test('knees bend forward and elbows bend back', () => {
    // The first thing anybody would notice if it were wrong.
    const s = solveBody(standing);
    const forward = vec(0, 0, 1);
    for (const side of [s.left, s.right]) {
      assert.ok(offLine(side.knee, side.hip, side.ankle, forward) > 0, 'a knee bent backwards');
      assert.ok(offLine(side.elbow, side.shoulder, side.hand, forward) < 0, 'an elbow bent forwards');
    }
  });

  test('toes point where the body faces, along the ground', () => {
    const s = solveBody(standing);
    for (const side of [s.left, s.right]) {
      assert.ok(side.toe.z > side.ankle.z);
      assert.ok(close(side.toe.y, side.ankle.y));
    }
  });

  test('hands given in either order land on the same sides', () => {
    // `classic` only knows "two hands". Which is which is this module's job.
    const swapped = solveBody({
      ...standing,
      hands: [standing.hands[1], standing.hands[0]],
      ankles: [standing.ankles[1], standing.ankles[0]],
    });
    assert.deepEqual(swapped, solveBody(standing));
  });

  test("a diving keeper's hands are exactly where the simulation put them", () => {
    // The acceptance check for phase 2, tried out here first: body laid out
    // sideways and off the ground, facing the taker, arms at full reach toward
    // a top corner. Saves are decided at the simulated hands, so the drawn
    // ones must be there too - within a millimetre, per #72.
    const pelvis = vec(1.1, 0.85, -0.3);
    const along = normalize(vec(1, 0.35, 0));
    const chest = add(pelvis, scale(along, BODY.spine));
    const reach = add(chest, scale(along, ARM_SPAN * 0.95));
    const hands: [Vec3, Vec3] = [add(reach, vec(0, 0.1, 0)), add(reach, vec(0, -0.1, 0))];
    const dive = solveBody({
      pelvis,
      chest,
      facing: vec(0, 0, -1),
      hands,
      ankles: [add(pelvis, vec(-0.85, -0.2, 0.1)), add(pelvis, vec(-0.8, -0.35, -0.1))],
    });
    assert.ok(dive.reached.leftHand && dive.reached.rightHand);
    for (const target of hands) {
      const nearest = Math.min(distance(dive.left.hand, target), distance(dive.right.hand, target));
      assert.ok(nearest < 1e-3, `a hand missed its target by ${nearest} m`);
    }
    for (const [name, a, b, length] of bones(dive)) {
      assert.ok(close(distance(a, b), length), `${name} stretched in the dive`);
    }
  });

  test('keepHands carries the body to a hand it cannot reach, and stretches nothing', () => {
    // Out of the left arm's reach, but close enough to the other hand that a
    // body can have both: two arms and the shoulders span 1.88 m at most.
    const far: BodyTargets = { ...standing, hands: [vec(-1.1, 1.3, 0.2), standing.hands[1]] };
    const left = solveBody(far);
    assert.equal(left.reached.leftHand, false, 'out of reach without keepHands');
    assert.ok(Math.abs(left.chest.x) < 1e-9, 'moved without keepHands');

    const carried = solveBody({ ...far, keepHands: true });
    assert.ok(carried.reached.leftHand && carried.reached.rightHand);
    assert.ok(distance(carried.left.hand, far.hands[0]) < 1e-3);
    assert.ok(carried.chest.x < -0.1, 'the body did not move toward the hand');
    for (const [name, a, b, length] of bones(carried)) {
      assert.ok(close(distance(a, b), length), `${name} stretched while being carried`);
    }
  });

  test('hands pair by what each arm can reach before by what is nearest', () => {
    // Both targets off to the left, one of them almost on the left shoulder.
    // The shorter total distance hands that one to the left arm, which cannot
    // fold that tight; the other way round, both arms reach. Found by search
    // rather than drawn, after two hand-built attempts turned out to be cases
    // no pairing could reach.
    const s = solveBody({
      ...standing,
      hands: [vec(-0.5, 1.0, 0.1), vec(-1 / 3, 1.4, 0.25)],
    });
    assert.ok(s.reached.leftHand && s.reached.rightHand, JSON.stringify(s.reached));
  });

  test('the same targets always give the same body', () => {
    assert.deepEqual(solveBody(standing), solveBody(standing));
  });

  test('facing straight up the spine, or no spine at all, still gives a body', () => {
    // Directions that cancel out entirely. NaN would draw nothing, silently.
    assert.ok(allFinite(solveBody({ ...standing, facing: vec(0, 1, 0) })));
    assert.ok(allFinite(solveBody({ ...standing, chest: standing.pelvis })));
    assert.ok(allFinite(solveBody({ ...standing, facing: vec(0, 0, 0) })));
  });
});

describe('proportions', () => {
  test('an arm can reach as far as the simulation lets a keeper reach', () => {
    // ARM_SPAN is how far core/ lets a keeper's hands get from the shoulder.
    // An arm drawn shorter would show saves being made by an empty glove.
    assert.ok(
      BODY.upperArm + BODY.forearm + BODY.hand >= ARM_SPAN,
      `arm is ${BODY.upperArm + BODY.forearm + BODY.hand} m, ARM_SPAN is ${ARM_SPAN} m`
    );
  });

  test('the shipped content file is used as written, with nothing falling back', () => {
    // A typo that quietly reverted a bone to its default would never be noticed.
    assert.deepEqual(cleanProportions(PROPORTIONS), PROPORTIONS);
  });

  test('a bad value costs that bone its custom length, not the whole body', () => {
    const cleaned = cleanProportions({ ...PROPORTIONS, shin: -1, thigh: 'long', foot: 0.3 });
    assert.equal(cleaned.shin, DEFAULT_PROPORTIONS.shin);
    assert.equal(cleaned.thigh, DEFAULT_PROPORTIONS.thigh);
    assert.equal(cleaned.foot, 0.3);
    assert.deepEqual(cleanProportions(undefined), DEFAULT_PROPORTIONS);
    assert.deepEqual(cleanProportions({ spine: Number.NaN, neck: 99 }), DEFAULT_PROPORTIONS);
  });
});

describe('the body module stands on its own', () => {
  /*
    The rule from #72: the skeleton lives inside `classic` for now, but may
    import nothing from the package around it. That is what makes promoting it
    to a shared toolkit in phase 4 a move rather than a rewrite - the same
    guarantee `core/portable.test.ts` gives `core/`, from the other end.
  */
  const here = new URL('.', import.meta.url);
  const sources = readdirSync(here)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ name, code: readFileSync(new URL(name, here), 'utf8') }));
  const stripped = (code: string): string => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  test('there are source files to check', () => {
    assert.ok(sources.length >= 2, `only found ${sources.length} files in body/`);
  });

  test('it imports only from itself, core/ and content/', () => {
    for (const { name, code } of sources) {
      for (const match of stripped(code).matchAll(/from\s+'([^']+)'/g)) {
        const from = match[1]!;
        assert.ok(
          from.startsWith('./') ||
            from.startsWith('../../../core/') ||
            from.startsWith('../../../content/'),
          `${name} imports ${from} - body/ must not depend on the package around it`
        );
      }
    }
  });

  test('it never touches a canvas or the page', () => {
    for (const { name, code } of sources) {
      assert.doesNotMatch(
        stripped(code),
        /\b(document|window|CanvasRenderingContext2D|HTMLCanvasElement|requestAnimationFrame)\b/,
        `${name} reaches for the browser`
      );
    }
  });
});
