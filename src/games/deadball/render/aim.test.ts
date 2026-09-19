import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { dragToShot } from './aim.ts';
import { createView, DEFAULT_VIEW, listViews, resolveViewId, VIEWS } from './registry.ts';
import type { DragGesture, DragPoint } from './View.ts';

const W = 1280;
const H = 750;

/** A drag from `start` through `via` to `end`, as the input layer reports it. */
const drag = (start: DragPoint, end: DragPoint, via: DragPoint[] = []): DragGesture => ({
  start,
  current: end,
  path: [start, ...via, end],
  active: false,
});

const straight = (dx: number, dy: number) =>
  drag({ x: 400, y: 600 }, { x: 400 + dx, y: 600 + dy }, [
    { x: 400 + dx * 0.33, y: 600 + dy * 0.33 },
    { x: 400 + dx * 0.66, y: 600 + dy * 0.66 },
  ]);

describe('drag to shot', () => {
  test('right and up is right and up', () => {
    const shot = dragToShot(straight(120, -120), W, H);
    assert.ok(shot.aim.x > 0, 'dragging right should aim right');
    assert.ok(shot.aim.y > 0, 'dragging up should lift it');
  });

  test('a longer drag is a harder shot', () => {
    const soft = dragToShot(straight(40, -40), W, H).power;
    const hard = dragToShot(straight(160, -160), W, H).power;
    assert.ok(hard > soft);
  });

  test('power never exceeds one, however far the drag goes', () => {
    assert.equal(dragToShot(straight(4000, -4000), W, H).power, 1);
  });

  test('a straight drag is a straight shot', () => {
    assert.equal(dragToShot(straight(120, -160), W, H).curve, 0);
  });

  test('hooking the drag bends it, and which way depends on the hook', () => {
    const bowRight = drag({ x: 400, y: 600 }, { x: 520, y: 440 }, [{ x: 500, y: 560 }]);
    const bowLeft = drag({ x: 400, y: 600 }, { x: 520, y: 440 }, [{ x: 420, y: 480 }]);
    assert.ok(dragToShot(bowRight, W, H).curve > 0.1);
    assert.ok(dragToShot(bowLeft, W, H).curve < -0.1);
  });

  test('the gesture scales with the canvas, not with pixels', () => {
    // The same fraction of the screen has to mean the same shot, or the game
    // is four times harder on a phone.
    const big = dragToShot(straight(200, -200), 1280, 1000).power;
    const small = dragToShot(straight(100, -100), 640, 500).power;
    assert.ok(Math.abs(big - small) < 1e-9);
  });

  describe('from behind the goal', () => {
    test('left and right swap, and so does the bend', () => {
      const gesture = drag({ x: 400, y: 600 }, { x: 520, y: 440 }, [{ x: 500, y: 560 }]);
      const forward = dragToShot(gesture, W, H);
      const mirrored = dragToShot(gesture, W, H, { mirrored: true });

      assert.ok(Math.abs(forward.aim.x + mirrored.aim.x) < 1e-9, 'aim should invert');
      assert.ok(Math.abs(forward.curve + mirrored.curve) < 1e-9, 'and so should the curl');
    });

    test('height and power are unchanged', () => {
      const gesture = straight(120, -160);
      const forward = dragToShot(gesture, W, H);
      const mirrored = dragToShot(gesture, W, H, { mirrored: true });
      assert.equal(forward.aim.y, mirrored.aim.y);
      assert.equal(forward.power, mirrored.power, 'a mirror does not change how hard it was hit');
    });
  });
});

describe('the view registry', () => {
  test('carries all three cameras, each with a label', () => {
    const views = listViews();
    assert.equal(views.length, 3);
    for (const { id, label } of views) {
      assert.ok(id.length > 0 && label.length > 0, `${id} needs a label`);
      assert.equal(createView(id).id, id, 'a view must know its own id');
    }
  });

  test('the URL wins, then what was stored, then the default', () => {
    assert.equal(resolveViewId('?view=keeper-cam', 'angled-behind'), 'keeper-cam');
    assert.equal(resolveViewId('', 'angled-behind'), 'angled-behind');
    assert.equal(resolveViewId('', null), DEFAULT_VIEW);
  });

  test('nonsense falls back rather than breaking the page', () => {
    assert.equal(resolveViewId('?view=from-the-blimp', null), DEFAULT_VIEW);
    assert.equal(resolveViewId('', 'from-the-blimp'), DEFAULT_VIEW);
    assert.equal(createView('from-the-blimp').id, DEFAULT_VIEW);
  });

  test('every registered view is reachable by its own key', () => {
    for (const id of Object.keys(VIEWS)) {
      assert.equal(resolveViewId(`?view=${id}`, null), id);
    }
  });
});
