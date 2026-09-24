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
import { vec } from '../../core/vec3.ts';
import { AIRTIME, buildWall, JUMP_DELAY } from '../../core/wall.ts';
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
