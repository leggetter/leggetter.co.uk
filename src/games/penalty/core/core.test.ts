/**
 * Tests for the simulation. Run with `npm run test:game`.
 *
 * These are the regression net for every physics or tuning change. The point of
 * the seeded RNG and the fixed timestep is that "the same shot" is a thing that
 * can be asserted rather than eyeballed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createRng, shotSeed } from './rng.ts';
import { resolveShot, spotBall, sweepAt, timingFromSweep } from './shot.ts';
import { simulate } from './flight.ts';
import { classifyCrossing } from './rules.ts';
import { initialMatch, reduce } from './match.ts';
import { acceleration } from './physics.ts';
import { cross, vec } from './vec3.ts';
import {
  BALL_RADIUS,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  GRAVITY,
  PENALTY_DISTANCE,
  SWEEP_PERIOD,
  SWEEP_SWEET_ZONE,
} from './units.ts';
import type { KeeperProfile, Player, ShotInput } from './types.ts';

const STEP = 1 / 120;

const striker: Player = {
  id: 'test',
  name: 'Test Striker',
  power: 75,
  accuracy: 100, // perfect, so aim tests measure the model and not the wobble
  curve: 80,
  composure: 70,
  foot: 'right',
  colors: { kit: '#fff', trim: '#000' },
};

/** A keeper who cannot move, so shot placement is the only variable. */
const statue: KeeperProfile = {
  id: 'statue',
  name: 'Statue',
  reactionMs: 10_000,
  diveSpeed: 0,
  reach: 0.4,
  guessBias: 0,
  readAccuracy: 0,
};

const aim = (x: number, y: number, extra: Partial<ShotInput> = {}): ShotInput => ({
  aim: { x, y },
  power: 0.7,
  curve: 0,
  lift: 0.5,
  // Cleanly struck unless a test says otherwise, so timing is not silently
  // mixed into results that are measuring something else.
  timing: 0,
  ...extra,
});

const take = (
  input: ShotInput,
  keeper = statue,
  seed = 1,
  player = striker,
  distance = PENALTY_DISTANCE
) => {
  const rng = createRng(seed);
  const shot = resolveShot(input, player, rng, { origin: spotBall(distance) });
  return simulate(shot, keeper, rng, STEP);
};

/** How far Magnus moved the ball off the straight line it was struck along. */
const bend = (curve: number, distance: number): number => {
  const rng = createRng(1);
  const shot = resolveShot(aim(0.4, 0.4, { curve }), striker, rng, {
    origin: spotBall(distance),
  });
  const flight = simulate(shot, statue, rng, STEP);
  const t = -shot.origin.z / shot.velocity.z;
  return flight.ball.position.x - (shot.origin.x + shot.velocity.x * t);
};

describe('rng', () => {
  test('is reproducible from a seed', () => {
    const a = Array.from({ length: 5 }, () => createRng(42).next());
    assert.equal(new Set(a).size, 1, 'same seed must give the same first draw');

    const stream = createRng(42);
    const first = [stream.next(), stream.next(), stream.next()];
    const again = createRng(42);
    assert.deepEqual([again.next(), again.next(), again.next()], first);
  });

  test('derives independent per-shot seeds', () => {
    const seeds = new Set([0, 1, 2, 3, 4].map((i) => shotSeed(7, i)));
    assert.equal(seeds.size, 5);
  });

  test('nextBell stays in range and centers on zero', () => {
    const rng = createRng(3);
    let sum = 0;
    for (let i = 0; i < 4000; i++) {
      const v = rng.nextBell();
      assert.ok(v >= -1 && v <= 1, `out of range: ${v}`);
      sum += v;
    }
    assert.ok(Math.abs(sum / 4000) < 0.02, 'mean should sit near zero');
  });
});

describe('physics', () => {
  test('a still ball falls at g', () => {
    const a = acceleration({ position: vec(0, 1, 0), velocity: vec(0, 0, 0), spin: vec(0, 0, 0) });
    assert.deepEqual(a, vec(0, -GRAVITY, 0));
  });

  test('drag opposes motion', () => {
    const a = acceleration({
      position: vec(0, 1, -5),
      velocity: vec(0, 0, 25),
      spin: vec(0, 0, 0),
    });
    assert.ok(a.z < 0, 'a ball moving toward goal must be decelerated');
  });

  test('spin about +y pushes a forward-moving ball along +x', () => {
    // The sign convention the whole curve mechanic rests on.
    assert.ok(cross(vec(0, 10, 0), vec(0, 0, 20)).x > 0);

    const a = acceleration({
      position: vec(0, 1, -5),
      velocity: vec(0, 0, 25),
      spin: vec(0, 50, 0),
    });
    assert.ok(a.x > 0, 'positive side spin must bend to the taker right');
  });

  test('topspin drives the ball down harder than gravity alone', () => {
    const a = acceleration({
      position: vec(0, 1, -5),
      velocity: vec(0, 0, 25),
      spin: vec(40, 0, 0),
    });
    assert.ok(a.y < -GRAVITY, 'topspin should add downward force');
  });
});

describe('shot resolution', () => {
  test('a perfectly accurate player hits what they aimed at', () => {
    const rng = createRng(9);
    const shot = resolveShot(aim(0.5, 0.5), striker, rng, {
      origin: spotBall(PENALTY_DISTANCE),
    });
    // Straight-line extrapolation to the goal plane, before drag bends it.
    const t = -shot.origin.z / shot.velocity.z;
    const x = shot.origin.x + shot.velocity.x * t;
    assert.ok(Math.abs(x - 0.5 * (GOAL_WIDTH / 2) * 1.18) < 0.01);
  });

  test('an inaccurate player sprays, a perfect one does not', () => {
    const wild: Player = { ...striker, accuracy: 0 };
    const spread = (player: Player) => {
      const xs = Array.from({ length: 60 }, (_, i) => {
        const rng = createRng(i + 1);
        const shot = resolveShot(aim(0, 0.4), player, rng, {
          origin: spotBall(PENALTY_DISTANCE),
        });
        const t = -shot.origin.z / shot.velocity.z;
        return shot.origin.x + shot.velocity.x * t;
      });
      return Math.max(...xs) - Math.min(...xs);
    };
    assert.ok(spread(striker) < 0.001, 'accuracy 100 must be deterministic');
    assert.ok(spread(wild) > 1.0, 'accuracy 0 must actually spray');
  });

  test('a shot arrives at the height it was aimed at, at any range', () => {
    // Regression. The closed-form ballistic launch assumed the ball holds its
    // speed; drag means it does not, so shots arrived low, and the error grew
    // with distance. Aimed at 1.15 m from 25 m out, the old model landed at
    // 0.11 m. The elevation solver in shot.ts exists for this.
    for (const distance of [PENALTY_DISTANCE, 18, 25, 30]) {
      for (const aimY of [0.2, 0.4, 0.7]) {
        const flight = take(aim(0.2, aimY), statue, 1, striker, distance);
        const intended = aimY * GOAL_HEIGHT * 1.18;
        const off = Math.abs(flight.ball.position.y - intended);
        assert.ok(
          off < 0.12,
          `${distance} m aimed at ${intended.toFixed(2)} m arrived at ` +
            `${flight.ball.position.y.toFixed(2)} m (off by ${off.toFixed(2)} m)`
        );
      }
    }
  });

  test('more power means more speed', () => {
    const rng = () => createRng(5);
    const soft = resolveShot(aim(0, 0.4, { power: 0.2 }), striker, rng(), {
      origin: spotBall(PENALTY_DISTANCE),
    });
    const hard = resolveShot(aim(0, 0.4, { power: 1 }), striker, rng(), {
      origin: spotBall(PENALTY_DISTANCE),
    });
    assert.ok(hard.velocity.z > soft.velocity.z);
  });

  test('composure only matters under pressure', () => {
    const calm: Player = { ...striker, accuracy: 50, composure: 100 };
    const nervous: Player = { ...striker, accuracy: 50, composure: 0 };
    const spread = (player: Player, pressure: number) => {
      const xs = Array.from({ length: 80 }, (_, i) => {
        const shot = resolveShot(aim(0, 0.4), player, createRng(i + 1), {
          origin: spotBall(PENALTY_DISTANCE),
          pressure,
        });
        const t = -shot.origin.z / shot.velocity.z;
        return shot.origin.x + shot.velocity.x * t;
      });
      return Math.max(...xs) - Math.min(...xs);
    };
    assert.ok(
      Math.abs(spread(calm, 0) - spread(nervous, 0)) < 0.001,
      'with no pressure the two are the same player'
    );
    assert.ok(spread(nervous, 1) > spread(calm, 1), 'under pressure composure should tell');
  });
});

describe('release timing', () => {
  test('the sweep runs corner to corner and back at a constant speed', () => {
    assert.equal(sweepAt(0), -1);
    assert.ok(Math.abs(sweepAt(SWEEP_PERIOD * 0.25)) < 1e-9, 'quarter way is centre');
    assert.ok(Math.abs(sweepAt(SWEEP_PERIOD * 0.5) - 1) < 1e-9, 'half way is the far end');
    assert.ok(Math.abs(sweepAt(SWEEP_PERIOD) + 1) < 1e-9, 'a full period is back to the start');

    for (let t = 0; t < SWEEP_PERIOD * 3; t += 0.01) {
      const v = sweepAt(t);
      assert.ok(v >= -1.000001 && v <= 1.000001, `out of range at ${t}: ${v}`);
    }

    // Constant speed is the point of a triangle over a sine: the sweet spot
    // has to be as hard to hit coming from one side as the other.
    const speed = (t: number) => Math.abs(sweepAt(t + 0.001) - sweepAt(t)) / 0.001;
    assert.ok(Math.abs(speed(0.05) - speed(0.2)) < 0.01);
  });

  test('anywhere in the sweet zone is a clean strike', () => {
    assert.equal(timingFromSweep(0), 0);
    assert.equal(timingFromSweep(SWEEP_SWEET_ZONE * 0.99), 0);
    assert.equal(timingFromSweep(-SWEEP_SWEET_ZONE * 0.99), 0);
    assert.ok(timingFromSweep(SWEEP_SWEET_ZONE + 0.01) > 0, 'just outside must cost something');
    assert.ok(Math.abs(timingFromSweep(1) - 1) < 1e-9);
    assert.ok(Math.abs(timingFromSweep(-1) + 1) < 1e-9);
  });

  test('a mistimed strike drags the ball the way it was mistimed', () => {
    const at = (timing: number) => {
      const shot = resolveShot(aim(0, 0.4, { timing }), striker, createRng(7), {
        origin: spotBall(PENALTY_DISTANCE),
      });
      const t = -shot.origin.z / shot.velocity.z;
      return shot.origin.x + shot.velocity.x * t;
    };
    // Deterministic pull, not just scatter: releasing early should miss left
    // every time, which is the part a player can learn from.
    assert.ok(at(-1) < at(0) - 0.5, 'early release must pull left');
    assert.ok(at(1) > at(0) + 0.5, 'late release must push right');
  });

  test('a mistimed strike takes pace off the ball', () => {
    const speed = (timing: number) =>
      resolveShot(aim(0, 0.4, { timing }), striker, createRng(7), {
        origin: spotBall(PENALTY_DISTANCE),
      }).velocity.z;
    assert.ok(speed(1) < speed(0), 'a poor contact should be slower');
  });

  test('timing punishes an accurate player too', () => {
    // Deliberate: this is the person holding the mouse, not the footballer.
    const perfect: Player = { ...striker, accuracy: 100 };
    const clean = take(aim(0, 0.4, { timing: 0 }), statue, 3, perfect);
    const scuffed = take(aim(0, 0.4, { timing: 1 }), statue, 3, perfect);
    assert.ok(
      Math.abs(scuffed.ball.position.x) > Math.abs(clean.ball.position.x) + 0.5,
      'an accuracy-100 player must still be punished for a bad contact'
    );
  });
});

describe('outcomes', () => {
  const far = vec(99, 99, 0);

  test('classifies the goal mouth', () => {
    assert.equal(classifyCrossing(vec(0, 1.2, 0), far, 0.4), 'goal');
    assert.equal(classifyCrossing(vec(5.0, 1.2, 0), far, 0.4), 'wide');
    assert.equal(classifyCrossing(vec(0, 3.2, 0), far, 0.4), 'over');
    assert.equal(classifyCrossing(vec(GOAL_WIDTH / 2, 1.2, 0), far, 0.4), 'post');
    assert.equal(classifyCrossing(vec(0, GOAL_HEIGHT, 0), far, 0.4), 'bar');
  });

  test('a keeper with hands on the ball saves it', () => {
    assert.equal(classifyCrossing(vec(1, 1, 0), vec(1, 1, 0), 0.4), 'saved');
    assert.equal(classifyCrossing(vec(1, 1, 0), vec(3, 1, 0), 0.4), 'goal');
  });

  test('a well struck penalty beats a statue', () => {
    assert.equal(take(aim(0.55, 0.45)).outcome, 'goal');
  });

  test('a shot aimed outside the frame misses', () => {
    assert.equal(take(aim(1, 0.4)).outcome, 'wide');
    assert.equal(take(aim(0, 1)).outcome, 'over');
  });

  test('a shot that cannot reach the line terminates instead of hanging', () => {
    // Not reachable from the penalty spot: the weakest strike there still
    // arrives in about a second. This is the timeout guard, which exists so a
    // long-range free kick with nothing on it cannot stall the match.
    const rng = createRng(1);
    const dribble = simulate(
      { origin: spotBall(30), velocity: vec(0, 0, 3), spin: vec(0, 0, 0) },
      statue,
      rng,
      STEP
    );
    assert.equal(dribble.outcome, 'short');
  });
});

describe('keeper', () => {
  test('one who reacts too late never saves', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const flight = take(aim(0.2, 0.3), statue, seed);
      assert.notEqual(flight.outcome, 'saved', `seed ${seed} should not be saved`);
    }
  });

  test('a perfect reader saves what a statue cannot', () => {
    const wall: KeeperProfile = {
      id: 'wall',
      name: 'Wall',
      reactionMs: 0,
      diveSpeed: 40,
      reach: 1.2,
      guessBias: 0,
      readAccuracy: 1,
    };
    assert.equal(take(aim(0.3, 0.3), wall).outcome, 'saved');
  });

  test('curve beats a keeper who reads the straight line', () => {
    // The keeper extrapolates velocity and ignores Magnus, so a shot that
    // reads as covered and then bends away is exactly what it cannot cover.
    //
    // At free kick range, not from the spot. Over 11 m a full curl moves the
    // ball about 20 cm, which no keeper needs to care about; over 25 m it moves
    // more than a meter. That difference is the whole reason free kicks are
    // worth building (Phase 3), and it falls out of the physics rather than
    // being written in anywhere.
    const reader: KeeperProfile = {
      id: 'reader',
      name: 'Reader',
      reactionMs: 0,
      diveSpeed: 9,
      reach: 0.55,
      guessBias: 0,
      readAccuracy: 1,
    };
    const straight = take(aim(0.4, 0.4, { curve: 0 }), reader, 1, striker, 25);
    const curled = take(aim(0.4, 0.4, { curve: -1 }), reader, 1, striker, 25);
    assert.equal(straight.outcome, 'saved');
    assert.equal(curled.outcome, 'goal');
  });

  test('the Magnus tuning holds', () => {
    // Locks MAGNUS_FACTOR. The target was a hard curl bending about 1.5 m over
    // a 25 m free kick; anything that moves these numbers is a tuning change
    // and should be a deliberate one.
    assert.ok(Math.abs(bend(-1, PENALTY_DISTANCE)) > 0.15, 'penalty curl too weak');
    assert.ok(Math.abs(bend(-1, PENALTY_DISTANCE)) < 0.4, 'penalty curl too strong');
    assert.ok(Math.abs(bend(-1, 25)) > 0.9, 'free kick curl too weak');
    assert.ok(Math.abs(bend(-1, 25)) < 1.8, 'free kick curl too strong');
    assert.ok(bend(1, 25) > 0 && bend(-1, 25) < 0, 'curve must bend both ways');
  });
});

describe('determinism', () => {
  test('the same input and seed give an identical flight', () => {
    const a = take(aim(0.4, 0.5, { curve: 0.6 }), statue, 1234);
    const b = take(aim(0.4, 0.5, { curve: 0.6 }), statue, 1234);
    assert.equal(a.outcome, b.outcome);
    assert.deepEqual(a.ball.position, b.ball.position);
    assert.equal(a.elapsed, b.elapsed);
  });

  test('a different seed can give a different flight', () => {
    const sprayer: Player = { ...striker, accuracy: 20 };
    const xs = new Set(
      [1, 2, 3, 4, 5].map((s) => take(aim(0, 0.4), statue, s, sprayer).ball.position.x.toFixed(4))
    );
    assert.ok(xs.size > 1, 'seeds must actually change the shot');
  });
});

describe('match', () => {
  test('runs five shots and then completes', () => {
    let state = initialMatch(1);
    for (let i = 0; i < 5; i++) {
      assert.equal(state.phase, 'ready');
      state = reduce(state, { type: 'TAKE_SHOT' });
      state = reduce(state, { type: 'RESOLVE', outcome: i < 3 ? 'goal' : 'saved' });
      state = reduce(state, { type: 'NEXT' });
    }
    assert.equal(state.phase, 'complete');
    assert.equal(state.score, 3);
    assert.equal(state.outcomes.length, 5);
  });

  test('ignores a second strike on the same shot', () => {
    const ready = initialMatch(1);
    const flight = reduce(ready, { type: 'TAKE_SHOT' });
    assert.equal(reduce(flight, { type: 'TAKE_SHOT' }), flight);
  });

  test('only goals score', () => {
    let state = reduce(initialMatch(1), { type: 'TAKE_SHOT' });
    state = reduce(state, { type: 'RESOLVE', outcome: 'post' });
    assert.equal(state.score, 0);
  });
});

test('a ball on the ground does not fall through the pitch', () => {
  const flight = take(aim(0, 0, { power: 0.25 }));
  assert.ok(flight.ball.position.y >= BALL_RADIUS - 1e-9);
});
