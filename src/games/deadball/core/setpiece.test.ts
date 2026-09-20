/**
 * Free kicks: where the ball is, who is in front of it, and what stops it.
 *
 * All of this is decided from the match seed and the kick number, which is the
 * property everything downstream leans on - the shot log can replay a free
 * kick without storing the wall, and two devices can agree on where twenty
 * people are standing without sending a single one of them.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { NO_EVENTS } from './events.ts';
import { advance, createFlight } from './flight.ts';
import { createRng } from './rng.ts';
import {
  cleanDiscipline,
  MAX_WALL,
  MIN_WALL,
  penaltySpot,
  setPieceFor,
  spotOrder,
  SPOT_IDS,
  WALL_DISTANCE,
  type Discipline,
} from './setpiece.ts';
import { resolveShot } from './shot.ts';
import type { KeeperProfile, Player } from './types.ts';
import { GOAL_WIDTH } from './units.ts';
import { buildWall, HEIGHT, wallHit } from './wall.ts';
import { distance, vec } from './vec3.ts';

import { KEEPERS } from '../content/keepers.js';
import { ROSTER } from '../content/players.js';

describe('which kick you are taking', () => {
  test('penalties are penalties, every time', () => {
    for (let i = 0; i < 20; i++) {
      const piece = setPieceFor(99, i, 'penalties');
      assert.equal(piece.penalty, true);
      assert.equal(piece.wallCount, 0);
      assert.deepEqual(piece.origin, penaltySpot().origin);
    }
  });

  test('free kicks are never penalties', () => {
    for (let i = 0; i < 20; i++) assert.equal(setPieceFor(99, i, 'freekicks').penalty, false);
  });

  test('both means both, and not all of one', () => {
    // A coin that never lands on one side is not a coin, and "Both" that gives
    // ten penalties in a row is indistinguishable from having picked wrong.
    const kinds = Array.from({ length: 40 }, (_, i) => setPieceFor(7, i, 'mixed').penalty);
    assert.ok(kinds.some(Boolean), 'no penalties in forty mixed kicks');
    assert.ok(kinds.some((k) => !k), 'no free kicks in forty mixed kicks');
  });

  test('anything else out of storage is penalties', () => {
    for (const junk of [undefined, null, '', 'corners', 42, {}]) {
      assert.equal(cleanDiscipline(junk), 'penalties');
    }
    for (const good of ['penalties', 'freekicks', 'mixed'] as Discipline[]) {
      assert.equal(cleanDiscipline(good), good);
    }
  });

  test('the same seed gives the same kick, every time', () => {
    // What replay and two devices both rest on.
    for (const d of ['freekicks', 'mixed'] as Discipline[]) {
      for (let i = 0; i < 12; i++) {
        assert.deepEqual(setPieceFor(1234, i, d), setPieceFor(1234, i, d));
      }
    }
  });

  test('a different seed gives a different shootout', () => {
    const a = Array.from({ length: 9 }, (_, i) => setPieceFor(1, i, 'freekicks').id);
    const b = Array.from({ length: 9 }, (_, i) => setPieceFor(2, i, 'freekicks').id);
    assert.notDeepEqual(a, b);
  });
});

describe('where the ball is put', () => {
  test('all three spots inside every three kicks', () => {
    // The point of moving the ball is reading a different picture each time,
    // and an independent roll per kick gives three of the same often enough
    // to feel broken.
    for (const seed of [1, 2, 3, 77, 9001]) {
      for (let cycle = 0; cycle < 5; cycle++) {
        const bag = spotOrder(seed, cycle);
        assert.deepEqual([...bag].sort(), [...SPOT_IDS].sort(), `seed ${seed} cycle ${cycle}`);
      }
    }
  });

  test('and never the same spot twice running, across the seam', () => {
    // The one thing a bag gets wrong on its own: the end of one and the start
    // of the next.
    for (const seed of [1, 2, 3, 77, 9001, 424242]) {
      const ids = Array.from({ length: 30 }, (_, i) => setPieceFor(seed, i, 'freekicks').id);
      for (let i = 1; i < ids.length; i++) {
        assert.notEqual(ids[i], ids[i - 1], `seed ${seed} repeated ${ids[i]} at ${i}`);
      }
    }
  });

  test('the order is not the same order every time', () => {
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => spotOrder(seed, 0).join('-'))
    );
    assert.ok(orders.size > 1, 'every seed shuffled to the same order');
  });

  test('the angled spots are wide enough to threaten the near post', () => {
    const left = setPieceFor(5, 0, 'freekicks');
    void left;
    for (const id of ['left', 'right'] as const) {
      // Found by walking the sequence rather than reaching into the table, so
      // this fails if the spots ever stop being reachable.
      const piece = Array.from({ length: 12 }, (_, i) => setPieceFor(5, i, 'freekicks')).find(
        (p) => p.id === id
      );
      assert.ok(piece, `${id} never came up`);
      assert.ok(Math.abs(piece.origin.x) > GOAL_WIDTH / 2, `${id} is inside the posts`);
    }
  });
});

describe('the wall', () => {
  const pieces = Array.from({ length: 30 }, (_, i) => setPieceFor(31337, i, 'freekicks'));

  test('is two to four people', () => {
    for (const piece of pieces) {
      assert.ok(piece.wallCount >= MIN_WALL && piece.wallCount <= MAX_WALL, `${piece.wallCount}`);
      assert.equal(buildWall(piece).people.length, piece.wallCount);
    }
  });

  test('is not always the same size', () => {
    assert.ok(new Set(pieces.map((p) => p.wallCount)).size > 1);
  });

  test('stands ten yards from the ball', () => {
    // What a referee paces out, and the number the whole geometry hangs on.
    for (const piece of pieces.slice(0, 10)) {
      for (const person of buildWall(piece).people) {
        const away = Math.hypot(person.at.x - piece.origin.x, person.at.z - piece.origin.z);
        assert.ok(away > WALL_DISTANCE - 0.05, `somebody is at ${away.toFixed(2)} m`);
        assert.ok(away < WALL_DISTANCE + 2.6, `somebody is at ${away.toFixed(2)} m`);
      }
    }
  });

  test('lines up on the near post, not on the middle of the goal', () => {
    // The whole geometry of a free kick: the wall takes the near post and the
    // keeper takes the rest. A wall centred on the goal would leave the one
    // shot you would most like to take wide open.
    for (const piece of pieces.filter((p) => p.id !== 'middle').slice(0, 8)) {
      const wall = buildWall(piece);
      const post = vec((piece.covering * GOAL_WIDTH) / 2, 0, 0);
      const outer = wall.people[0];
      assert.ok(outer);
      // The outermost person sits on the ball-to-post line, so the straight
      // shot at that post runs through them.
      assert.equal(
        wallHit(piece.origin, vec(post.x, 0.4, post.z), wall),
        true,
        `${piece.id} wall does not block the near post`
      );
    }
  });

  test('nobody is standing inside anybody else', () => {
    for (const piece of pieces.slice(0, 12)) {
      const people = buildWall(piece).people;
      for (let i = 1; i < people.length; i++) {
        const gap = distance(people[i]!.at, people[i - 1]!.at);
        assert.ok(gap > 0.4, `two of the wall are ${gap.toFixed(2)} m apart`);
      }
    }
  });

  test('is between the ball and the goal, never behind the ball', () => {
    for (const piece of pieces.slice(0, 12)) {
      for (const person of buildWall(piece).people) {
        assert.ok(person.at.z > piece.origin.z, 'somebody is behind the ball');
        assert.ok(person.at.z < 0, 'somebody is standing in the goal');
      }
    }
  });
});

describe('getting past it', () => {
  const piece = setPieceFor(31337, 0, 'freekicks');
  const wall = buildWall({ ...piece, wallCount: 4, covering: -1, origin: vec(-8.5, 0.11, -17) });

  test('a ball at head height is charged down', () => {
    const person = wall.people[0]!;
    const from = vec(person.at.x - 1, 1.2, person.at.z - 1);
    const to = vec(person.at.x + 0.3, 1.2, person.at.z + 0.3);
    assert.equal(wallHit(from, to, wall), true);
  });

  test('a ball over the top is not', () => {
    const person = wall.people[0]!;
    const over = HEIGHT + 0.6;
    assert.equal(
      wallHit(vec(person.at.x - 1, over, person.at.z - 1), vec(person.at.x + 0.3, over, person.at.z + 0.3), wall),
      false
    );
  });

  test('a ball round the end is not', () => {
    const last = wall.people[wall.people.length - 1]!;
    const outside = last.at.x + 3;
    assert.equal(
      wallHit(vec(outside, 0.4, last.at.z - 1), vec(outside, 0.4, last.at.z + 1), wall),
      false
    );
  });

  test('a ball that steps clean over somebody in one go is still charged down', () => {
    // Insurance rather than a fix for anything observed. At the shipped 120 Hz
    // the hardest shot moves 27 cm a step and a person is 74 cm across, so
    // sampling the end of each step would catch it anyway - I wrote the
    // opposite in a comment here first and the planted-bug check found me out.
    //
    // It matters at a coarser step: a quarter of the tick rate puts the ball
    // clean through, and the tick rate is a constant somebody may well change.
    const person = wall.people[0]!;
    const from = vec(person.at.x, 1.0, person.at.z - 0.55);
    const to = vec(person.at.x, 1.0, person.at.z + 0.55);
    assert.equal(wallHit(from, to, wall), true, 'the ball teleported through somebody');
  });

  test('a penalty has nothing in the way', () => {
    const none = buildWall(penaltySpot());
    assert.equal(none.people.length, 0);
    assert.equal(wallHit(vec(0, 0.2, -11), vec(0, 0.2, 0), none), false);
  });
});

describe('a free kick, start to finish', () => {
  test('a straight one into the wall is blocked, and the flight ends', () => {
    const player = ROSTER[0] as Player;
    const keeper = KEEPERS[0] as KeeperProfile;
    const piece = setPieceFor(2024, 0, 'freekicks');
    const wall = buildWall(piece);

    // `aim` is -1..1 across the aim box, not metres - the box is 1.18x the
    // goal, so the post sits at about 0.85 and anything past 1 is clamped to
    // the edge and goes wide. Worth saying out loud: the first version of this
    // test passed the post's x in metres, got 4.32 m and a wide shot, and read
    // as the wall failing to block when it was never in the way.
    const atThePost = piece.covering * 0.8;
    const shot = resolveShot(
      { aim: { x: atThePost, y: 0.1 }, power: 0.95, curve: 0, lift: 0.15, timing: 0 },
      { ...player, accuracy: 100 },
      createRng(1),
      { origin: piece.origin }
    );
    let flight = createFlight(shot, keeper, createRng(2), 0, null, NO_EVENTS, wall);
    for (let i = 0; i < 900 && !flight.outcome; i++) flight = advance(flight, 1 / 120, NO_EVENTS);

    assert.equal(flight.outcome, 'blocked');
  });

  test('a penalty in the same engine is unaffected', () => {
    // The wall is new code on the hot path of every shot ever taken. This is
    // the guard that it changed nothing for the game that already existed.
    const player = ROSTER[0] as Player;
    const keeper = KEEPERS[0] as KeeperProfile;
    const shot = resolveShot(
      { aim: { x: 0.4, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0 },
      player,
      createRng(42),
      { origin: penaltySpot().origin }
    );
    let flight = createFlight(shot, keeper, createRng(7), 0, null, NO_EVENTS);
    for (let i = 0; i < 900 && !flight.outcome; i++) flight = advance(flight, 1 / 120, NO_EVENTS);

    assert.ok(flight.outcome);
    assert.notEqual(flight.outcome, 'blocked');
  });
});
