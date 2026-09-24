/**
 * The stylised package, held to classic's answers where the two must agree.
 *
 * Both packages look at the same world through the same `CameraSpec`, so for
 * the same camera and canvas they have to put a point in the same place, turn
 * the same drag into the same shot, and read the same pointer as the same
 * dive. Classic does it with a hand-rolled projector and this package with a
 * three.js camera and a raycast, which is exactly why it is worth checking:
 * two correct answers to one camera that disagree by a few pixels are a game
 * that plays differently depending on how it looks.
 *
 * No WebGL here. The camera and the raycast are three.js maths, which runs in
 * Node; what needs a GPU - drawing, and `destroy` releasing the context - is
 * checked in the browser and recorded on the pull request.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { PerspectiveCamera } from 'three';

import { vec, type Vec3 } from '../../core/vec3.ts';
import { CAMERAS, standBehind, type CameraSpec } from '../cameras.ts';
import { ClassicPresentation } from '../classic/ClassicPresentation.ts';
import type { DragGesture } from '../Presentation.ts';
import { createProjector, type Camera } from '../toolkit/project.ts';
import { aimCamera, pointerOnGoal, projectToCanvas } from './camera.ts';
import { FrameBudget } from './quality.ts';
import { StylisedPresentation } from './StylisedPresentation.ts';

/** A phone held upright, a laptop, and a wide monitor. */
const SIZES: [number, number][] = [
  [390, 844],
  [1280, 750],
  [1920, 1080],
];

/** Where free kicks are taken from, as well as the spot, so the camera has been swung round. */
const SPOTS: Vec3[] = [vec(0, 0, -11), vec(-8, 0, -19.5), vec(6.5, 0, -24)];

/** Every camera, stood behind every spot, the way both packages stand them. */
function everyCamera(): { name: string; spec: CameraSpec; camera: Camera; spot: Vec3 }[] {
  return Object.values(CAMERAS).flatMap((spec) =>
    SPOTS.map((spot) => ({ name: `${spec.id} at ${spot.x},${spot.z}`, spec, camera: standBehind(spec, spot), spot }))
  );
}

/** Things worth being in the right place: the goal's corners, the spot, a keeper's hand, the far goal. */
const LANDMARKS: Vec3[] = [
  vec(-3.66, 0, 0),
  vec(3.66, 2.44, 0),
  vec(0, 0, -11),
  vec(-2.8, 1.9, -0.3),
  vec(1.2, 0.11, -9.4),
  vec(0, 2.44, -105),
  vec(-20.16, 0, -16.5),
];

describe('the same camera, the same picture', () => {
  test('every landmark lands on the same pixel as the toolkit projector puts it', () => {
    let checked = 0;
    for (const { name, camera } of everyCamera()) {
      for (const [w, h] of SIZES) {
        const three = new PerspectiveCamera();
        aimCamera(three, camera, w, h);
        const projector = createProjector(camera, w, h);
        for (const point of LANDMARKS) {
          const expected = projector.project(point);
          const actual = projectToCanvas(three, point, w, h);
          assert.equal(actual === null, expected === null, `${name} ${w}x${h}: behind the camera disagrees for ${JSON.stringify(point)}`);
          if (!expected || !actual) continue;
          const off = Math.hypot(actual.x - expected.x, actual.y - expected.y);
          assert.ok(off < 0.01, `${name} ${w}x${h}: ${JSON.stringify(point)} is ${off.toFixed(4)} px out`);
          checked += 1;
        }
      }
    }
    assert.ok(checked > 150, `only ${checked} points were in front of a camera`);
  });
});

/**
 * Classic, configured the way its `configure` would, minus the backdrop - which
 * paints on a canvas, and there is no document in Node. These are the three
 * fields its drag and pointer mappings read.
 */
function classicFor(spec: CameraSpec, spot: Vec3, w: number, h: number): ClassicPresentation {
  const classic = new ClassicPresentation();
  Object.assign(classic, { camera: spec, width: w, height: h, spot, projector: createProjector(standBehind(spec, spot), w, h) });
  return classic;
}

function stylisedFor(spec: CameraSpec, spot: Vec3, w: number, h: number): StylisedPresentation {
  const stylised = new StylisedPresentation();
  Object.assign(stylised, { spot });
  stylised.configure(spec, w, h);
  return stylised;
}

describe('a keeper choosing a dive', () => {
  test('the raycast onto z = 0 lands where classic says the pointer is pointing', () => {
    let checked = 0;
    for (const { name, spec, spot } of everyCamera()) {
      for (const [w, h] of SIZES) {
        const classic = classicFor(spec, spot, w, h);
        const stylised = stylisedFor(spec, spot, w, h);
        for (let i = 0; i <= 8; i++) {
          for (let j = 0; j <= 8; j++) {
            const point = { x: (w * i) / 8, y: (h * j) / 8 };
            const expected = classic.diveFromPointer(point);
            const actual = stylised.diveFromPointer(point);
            assert.equal(actual === null, expected === null, `${name} ${w}x${h} at ${point.x},${point.y}`);
            if (!expected || !actual) continue;
            // Relative, because a ray skimming the plane lands a long way off
            // and a millimetre there is a rounding error.
            const scale = Math.max(1, Math.hypot(expected.x, expected.y));
            const off = Math.hypot(actual.x - expected.x, actual.y - expected.y) / scale;
            assert.ok(off < 1e-6, `${name} ${w}x${h} at ${point.x},${point.y}: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
            checked += 1;
          }
        }
      }
    }
    assert.ok(checked > 1000, `only ${checked} pointers checked`);
  });

  test('the middle of the goal is the middle of the goal', () => {
    // Straight down the camera's axis from behind the taker and aimed at the
    // goal mouth: x must be 0, and not -0, which prints as a surprise.
    const spec = CAMERAS['behind-taker']!;
    const stylised = stylisedFor(spec, vec(0, 0, -11), 1280, 750);
    const projector = createProjector(standBehind(spec, vec(0, 0, -11)), 1280, 750);
    const centre = projector.project(vec(0, 1.22, 0))!;
    const dive = stylised.diveFromPointer({ x: centre.x, y: centre.y })!;
    assert.ok(Math.abs(dive.x) < 1e-9);
    assert.ok(Math.abs(dive.y - 1.22) < 1e-9);
  });

  test('a camera looking away from the goal has nothing to point at', () => {
    const away: Camera = { position: vec(0, 2, 5), yaw: 0, pitch: 0.1, fov: 0.62, frame: { halfWidth: 5, halfHeight: 2, depth: 10 } };
    const three = new PerspectiveCamera();
    aimCamera(three, away, 800, 600);
    assert.equal(pointerOnGoal(three, { x: 400, y: 300 }, 800, 600), null);
    assert.equal(createProjector(away, 800, 600).toPlane(400, 300, 0), null, 'and the projector agrees');
  });
});

/** A drag from `start` to `end` through `via`, as the input layer reports it. */
const drag = (start: [number, number], end: [number, number], via: [number, number][] = []): DragGesture => {
  const point = ([x, y]: [number, number]) => ({ x, y });
  return { start: point(start), current: point(end), path: [start, ...via, end].map(point), active: false };
};

describe('a drag is the same shot in either look', () => {
  const gestures = [
    drag([200, 700], [260, 520]),
    drag([200, 700], [120, 480], [[190, 600]]),
    drag([640, 700], [700, 420], [[760, 560]]),
    drag([300, 600], [300, 590]),
    drag([100, 800], [900, 100], [[300, 700], [600, 300]]),
  ];

  test("aimFromDrag gives exactly classic's ShotInput, for every camera and screen", () => {
    for (const { name, spec, spot } of everyCamera()) {
      for (const [w, h] of SIZES) {
        const classic = classicFor(spec, spot, w, h);
        const stylised = stylisedFor(spec, spot, w, h);
        for (const gesture of gestures) {
          assert.deepEqual(stylised.aimFromDrag(gesture), classic.aimFromDrag(gesture), `${name} ${w}x${h}`);
        }
      }
    }
  });

  test('including the mirrored camera behind the goal', () => {
    const spec = CAMERAS['keeper-cam']!;
    assert.equal(spec.mirrored, true);
    const stylised = stylisedFor(spec, vec(0, 0, -11), 390, 844);
    const straight = stylisedFor(CAMERAS['behind-taker']!, vec(0, 0, -11), 390, 844);
    const gesture = drag([200, 700], [300, 500]);
    assert.equal(stylised.aimFromDrag(gesture).aim.x, -straight.aimFromDrag(gesture).aim.x);
  });
});

describe('the frame budget', () => {
  const run = (gap: number, frames: number, budget = new FrameBudget()): boolean[] => {
    const said: boolean[] = [];
    for (let i = 0; i < frames; i++) said.push(budget.tick(i * gap));
    return said;
  };

  test('a phone managing 60 fps keeps the high tier', () => {
    assert.ok(!run(16.7, 400).includes(true));
  });

  test('one managing 30 fps is told once, and only once', () => {
    const said = run(33.3, 400);
    assert.equal(said.filter(Boolean).length, 1);
  });

  test('the first frames, and a tab in the background, do not count against it', () => {
    const budget = new FrameBudget();
    // Slow while shaders compile, then a long pause, then fine.
    for (let i = 0; i < 40; i++) budget.tick(i * 60);
    budget.tick(40 * 60 + 5000);
    let now = 40 * 60 + 5000;
    let told = false;
    for (let i = 0; i < 300; i++) told ||= budget.tick((now += 16.7));
    assert.equal(told, false);
  });
});

describe('what the stylised package may import', () => {
  const here = new URL('.', import.meta.url);
  const sources = readdirSync(here)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ name, code: readFileSync(new URL(name, here), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') }));

  test('classic, only through hud.ts', () => {
    // The one borrowing is the HUD, and it goes through one file so it can be
    // seen and removed in one place. See hud.ts.
    for (const { name, code } of sources) {
      const fromClassic = [...code.matchAll(/from\s+'([^']*classic[^']*)'/g)].map((m) => m[1]);
      if (name === 'hud.ts') assert.deepEqual(fromClassic, ['../classic/draw.ts']);
      else assert.deepEqual(fromClassic, [], `${name} imports classic directly`);
    }
  });

  test('and from classic, only the 2D overlays', () => {
    const hud = sources.find((s) => s.name === 'hud.ts')!;
    const names = hud.code.match(/export\s*{([^}]*)}/)?.[1]?.split(',').map((n) => n.trim()).filter(Boolean);
    assert.deepEqual(names, ['drawAim', 'drawAway', 'drawHandover', 'drawHud', 'drawKeepersTurn', 'drawShotDial']);
  });
});
