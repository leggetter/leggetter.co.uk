/**
 * Phase 2 of #72: the jointed body replaces the old figure without moving
 * anything the old figure put somewhere on purpose.
 *
 * The one that matters is the keeper. Saves are decided at the simulated
 * hands, and classic draws two gloves straddling that point. The new body has
 * real shoulders and fixed-length arms, so there are dives where a glove the
 * old figure drew would be out of the new arm's reach - and a glove drawn in
 * the wrong place shows a save being made by nothing. These run real flights
 * through `core/` and check every frame.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KEEPERS } from '../../content/keepers.js';
import { SQUAD } from '../../content/players.js';
import { NO_EVENTS } from '../../core/events.ts';
import { advance, createFlight } from '../../core/flight.ts';
import { createRng } from '../../core/rng.ts';
import { resolveShot, spotBall } from '../../core/shot.ts';
import type { Dive, KeeperProfile, Player } from '../../core/types.ts';
import { PENALTY_DISTANCE } from '../../core/units.ts';
import { distance, vec, type Vec3 } from '../../core/vec3.ts';
import { ARM_SPAN } from '../../core/keeper.ts';
import { BODY } from './body/skeleton.ts';
import { figureBody, keeperFigure, type Figure } from './draw.ts';

/** Every frame of a flight, including the landing afterwards. */
function* keeperFrames(aim: { x: number; y: number }, dive: Dive | null, seed: number) {
  const profile = KEEPERS[seed % KEEPERS.length] as KeeperProfile;
  const shot = resolveShot(
    { aim, power: 0.85, curve: 0, lift: 0.5, timing: 0 },
    SQUAD[0] as Player,
    createRng(seed),
    { origin: spotBall(PENALTY_DISTANCE) }
  );
  let flight = createFlight(shot, profile, createRng(seed + 1), 0, dive, NO_EVENTS);
  for (let step = 0; step < 360; step++) {
    yield { state: flight.keeper.state, reach: profile.reach };
    flight = advance(flight, 1 / 120, NO_EVENTS);
  }
}

/** Every aim and every chosen dive worth trying: all four corners, low and high, and the middle. */
const aims = [-0.95, -0.6, -0.2, 0, 0.2, 0.6, 0.95].flatMap((x) =>
  [0.05, 0.5, 0.95].map((y) => ({ x, y }))
);
const dives: (Dive | null)[] = [null, { x: -3.4, y: 0.3 }, { x: 3.4, y: 2.2 }, { x: 0, y: 1.2 }, { x: -1.8, y: 2.3 }];

describe("the keeper's gloves", () => {
  test('land exactly where the pose puts them, in every frame of every dive', () => {
    let frames = 0;
    let worst = 0;
    let seed = 0;
    for (const aim of aims) {
      for (const dive of dives) {
        for (const { state, reach } of keeperFrames(aim, dive, seed++)) {
          const figure = keeperFigure(state, reach, 0, 'flight');
          const body = figureBody(figure);
          for (const target of figure.hands) {
            const nearest = Math.min(distance(body.left.hand, target), distance(body.right.hand, target));
            worst = Math.max(worst, nearest);
          }
          frames++;
        }
      }
    }
    // Within a millimetre, per the acceptance check on #72.
    assert.ok(worst < 1e-3, `a glove was drawn ${(worst * 1000).toFixed(1)} mm from its target`);
    assert.ok(frames > 30_000, `only ${frames} frames checked`);
  });

  test('two gloves, one on each hand - never both on the same arm', () => {
    for (const { state, reach } of keeperFrames({ x: 0.9, y: 0.9 }, { x: 3.3, y: 2.1 }, 3)) {
      const figure = keeperFigure(state, reach, 0, 'flight');
      const body = figureBody(figure);
      assert.ok(distance(body.left.hand, body.right.hand) > 0.05);
    }
  });

  test('the body keeps its proportions however far it is thrown, and its arm still reaches ARM_SPAN', () => {
    // Carrying the body toward an out-of-reach glove moves it; it must never
    // stretch it. And a keeper is never scaled small enough that its arm falls
    // short of how far core/ lets its hands go - it came out at 0.70 m against
    // 0.72 m before that was guarded, and full-stretch saves missed their gloves.
    for (const { state, reach } of keeperFrames({ x: -0.95, y: 0.95 }, { x: -3.4, y: 2.3 }, 5)) {
      const body = figureBody(keeperFigure(state, reach, 0, 'flight'));
      for (const side of [body.left, body.right]) {
        const upper = distance(side.shoulder, side.elbow) / BODY.upperArm;
        const fore = distance(side.elbow, side.wrist) / BODY.forearm;
        const hand = distance(side.wrist, side.hand) / BODY.hand;
        assert.ok(Math.abs(upper - fore) < 1e-9 && Math.abs(fore - hand) < 1e-9, 'the arm stretched unevenly');
        const arm = distance(side.shoulder, side.elbow) + distance(side.elbow, side.wrist) + distance(side.wrist, side.hand);
        assert.ok(arm >= ARM_SPAN, `a keeper's arm is ${arm.toFixed(3)} m, short of ARM_SPAN`);
      }
    }
  });
});

describe('how a keeper lands', () => {
  /** The last frame of a flight, once the keeper has finished coming down. */
  const landing = (aim: { x: number; y: number }, dive: Dive) => {
    let last = null as ReturnType<typeof keeperFigure> | null;
    let landed = 0;
    for (const { state, reach } of keeperFrames(aim, dive, 21)) {
      last = keeperFigure(state, reach, 0, 'resolved');
      landed = state.landed;
    }
    assert.ok(landed >= 1, 'the flight ended before the keeper had landed');
    return figureBody(last!);
  };

  test('a keeper who jumps straight up comes down on their feet', () => {
    // Reported as "crumbling": core/ pulls every keeper's hands to the floor
    // once the shot is over, and the body was built from the hands, so a jump
    // straight up folded the keeper onto itself.
    const body = landing({ x: 0, y: 0.95 }, { x: 0.2, y: 2.3 });
    assert.ok(body.head.y > 1.5, `head at ${body.head.y.toFixed(2)} m - not standing`);
    for (const side of [body.left, body.right]) assert.ok(side.ankle.y < 0.2, 'a foot is off the ground');
  });

  test('a keeper who goes full length still finishes on the ground', () => {
    const body = landing({ x: 0.95, y: 0.1 }, { x: -3.3, y: 0.3 });
    assert.ok(body.head.y < 0.7, `head at ${body.head.y.toFixed(2)} m - should be lying down`);
  });
});

describe('everybody else', () => {
  /** Somebody standing still, the way the wall, the halfway line and the spare keeper stand. */
  const standingFigure = (height: number): Figure => {
    const shoulderY = height * 0.82;
    return {
      feet: vec(0, 0, 0),
      shoulder: vec(0, shoulderY, 0),
      head: vec(0, shoulderY + 0.24, 0),
      hands: [vec(-0.28, shoulderY - 0.55, 0.05), vec(0.28, shoulderY - 0.55, 0.05)],
      toes: [vec(-0.15, 0.03, 0.1), vec(0.15, 0.03, 0.1)],
      kit: '#000',
      trim: '#fff',
      facing: vec(0, 0, 1),
      stature: shoulderY,
    };
  };

  test('feet reach the ground at every height on the halfway line', () => {
    // One fixed-size skeleton would leave tall players floating and short
    // ones squatting. The body scales to the person instead.
    for (const height of [1.6, 1.7, 1.8, 1.9, 2.0]) {
      const body = figureBody(standingFigure(height));
      assert.ok(body.reached.leftFoot && body.reached.rightFoot, `a ${height} m player's feet did not reach`);
    }
  });

  test('toes stay where the pose put them', () => {
    // Only lifted by the ankle's height, so the boot sits on the grass.
    const figure = standingFigure(1.8);
    const body = figureBody(figure);
    for (const [drawn, given] of [
      [body.left.toe, figure.toes[0]],
      [body.right.toe, figure.toes[1]],
    ] as [Vec3, Vec3][]) {
      assert.ok(Math.abs(drawn.x - given.x) < 1e-6 && Math.abs(drawn.z - given.z) < 1e-6);
      assert.ok(drawn.y > given.y && drawn.y - given.y < 0.08);
    }
  });

  test('crouching bends the knees instead of shrinking the player', () => {
    // The taker leans over the ball by lowering the shoulder point. With a
    // stature held constant, that has to come out of the legs.
    const upright = standingFigure(1.8);
    const crouched: Figure = { ...upright, shoulder: vec(0, upright.shoulder.y - 0.15, 0) };
    const a = figureBody(upright);
    const b = figureBody(crouched);
    assert.ok(Math.abs(distance(a.pelvis, a.chest) - distance(b.pelvis, b.chest)) < 1e-9, 'the spine shrank');
    const bend = (s: typeof a): number => distance(s.left.hip, s.left.ankle);
    assert.ok(bend(b) < bend(a) - 0.1, 'the knees did not bend');
  });

  test('bare hands out of reach do not drag the body with them', () => {
    // Only a keeper's hands move the body. A player on the halfway line with
    // an arm round a neighbour who is too far away reaches, and stays put.
    const figure = standingFigure(1.8);
    const stretched: Figure = { ...figure, hands: [vec(-1.5, 1.4, 0), vec(0.28, 0.9, 0.05)] };
    const body = figureBody(stretched);
    assert.ok(Math.abs(body.chest.x - figure.shoulder.x) < 1e-9);
    assert.equal(body.reached.leftHand, false);
  });
});
