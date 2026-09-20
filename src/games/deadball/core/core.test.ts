/**
 * Tests for the simulation. Run with `npm run test:game`.
 *
 * These are the regression net for every physics or tuning change. The point of
 * the seeded RNG and the fixed timestep is that "the same shot" is a thing that
 * can be asserted rather than eyeballed.
 */

import { NO_EVENTS } from './events.ts';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createRng, shotSeed } from './rng.ts';
import { resolveShot, spotBall, sweepAt, timingFromSweep } from './shot.ts';
import { advance, createFlight, simulate } from './flight.ts';
import { classifyCrossing } from './rules.ts';
import { initialMatch, reduce } from './match.ts';
import { acceleration } from './physics.ts';
import { ARM_SPAN, bodyFor, diveExtension, idleDrift, planKeeper } from './keeper.ts';
import { cross, vec } from './vec3.ts';
import {
  BALL_RADIUS,
  GOAL_HEIGHT,
  FLIGHT_TIMEOUT,
  GOAL_WIDTH,
  GRAVITY,
  NET_DEPTH,
  PENALTY_DISTANCE,
  SWEEP_PERIOD,
  SWEEP_SWEET_ZONE,
} from './units.ts';
import type { KeeperProfile, Player, Shot, ShotInput } from './types.ts';
import type { Rng } from './rng.ts';

const STEP = 1 / 120;

/** simulate(), but with the keeper starting somewhere other than centre. */
const fromLine = (shot: Shot, keeper: KeeperProfile, rng: Rng, startX: number) => {
  let flight = createFlight(shot, keeper, rng, startX, null, NO_EVENTS);
  while (!flight.outcome) flight = advance(flight, STEP, NO_EVENTS);
  return flight;
};

const striker: Player = {
  id: 'test',
  name: 'Test Striker',
  power: 75,
  accuracy: 100, // perfect, so aim tests measure the model and not the wobble
  curve: 80,
  composure: 70,
  dip: 70,
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
  anticipation: 0,
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
    // Averaged over seeds, because a bad contact scatters as well as drags and
    // on any single shot the scatter is the larger of the two. The learnable
    // part is the bias, which only shows in the mean.
    const meanX = (timing: number) => {
      let total = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const shot = resolveShot(aim(0, 0.4, { timing }), striker, createRng(seed), {
          origin: spotBall(PENALTY_DISTANCE),
        });
        const t = -shot.origin.z / shot.velocity.z;
        total += shot.origin.x + shot.velocity.x * t;
      }
      return total / 300;
    };
    assert.ok(meanX(-1) < meanX(0) - 0.2, 'early release must pull left on average');
    assert.ok(meanX(1) > meanX(0) + 0.2, 'late release must push right on average');
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
    // An accuracy-100 player puts a clean strike in exactly the same place
    // every time, and a scuffed one all over the place.
    const perfect: Player = { ...striker, accuracy: 100 };
    const spreadOf = (timing: number) => {
      const xs = Array.from({ length: 120 }, (_, i) =>
        take(aim(0.5, 0.4, { timing }), statue, i + 1, perfect).ball.position.x
      );
      return Math.max(...xs) - Math.min(...xs);
    };
    assert.ok(spreadOf(0) < 0.001, 'a clean strike from accuracy 100 is exact');
    assert.ok(spreadOf(1) > 1.0, 'a bad contact must spray it regardless');
  });

  test('a scuff drags the ball back toward the middle of the goal', () => {
    // The actual punishment: a mistimed shot stops finding the corners.
    const meanOffset = (timing: number) => {
      let total = 0;
      for (let seed = 1; seed <= 300; seed++) {
        total += Math.abs(
          take(aim(0.85, 0.5, { timing }), statue, seed).ball.position.x
        );
      }
      return total / 300;
    };
    assert.ok(meanOffset(1) < meanOffset(0) - 0.5, 'a scuff should end up more central');
  });
});

describe('outcomes', () => {
  /** A keeper who is nowhere near it, hands and body alike. */
  const away = {
    stance: 99,
    hands: vec(99, 99, 0),
    body: vec(99, 99, 0),
    target: null,
    committed: true,
    landed: 0,
  };
  /** Keeper diving to (x, y) from a stance at the centre of the goal. */
  const at = (x: number, y: number) => ({
    stance: 0,
    hands: vec(x, y, 0),
    body: bodyFor(vec(x, y, 0), 0),
    target: null,
    committed: true,
    landed: 0,
  });

  test('classifies the goal mouth', () => {
    assert.equal(classifyCrossing(vec(0, 1.2, 0), away, 0.4), 'goal');
    assert.equal(classifyCrossing(vec(5.0, 1.2, 0), away, 0.4), 'wide');
    assert.equal(classifyCrossing(vec(0, 3.2, 0), away, 0.4), 'over');
    assert.equal(classifyCrossing(vec(GOAL_WIDTH / 2, 1.2, 0), away, 0.4), 'post');
    assert.equal(classifyCrossing(vec(0, GOAL_HEIGHT, 0), away, 0.4), 'bar');
  });

  test('a keeper with hands on the ball saves it', () => {
    assert.equal(classifyCrossing(vec(1, 1, 0), at(1, 1), 0.4), 'saved');
    assert.equal(classifyCrossing(vec(2.9, 1.9, 0), at(-2.5, 0.5), 0.4), 'goal');
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
      { origin: spotBall(30), velocity: vec(0, 0, 3), spin: vec(0, 0, 0), aimPoint: { x: 0, y: 1 } },
      statue,
      rng,
      STEP
    );
    assert.equal(dribble.outcome, 'short');
  });
});

describe('the woodwork', () => {
  /** Straight at the frame, with the keeper out of the picture. */
  const atFrame = (targetX: number, targetY: number, speed = 26) => {
    const origin = spotBall(PENALTY_DISTANCE);
    const t = -origin.z / speed;
    const shot = {
      origin,
      velocity: vec((targetX - origin.x) / t, (targetY - origin.y) / t + 0.5 * GRAVITY * t, speed),
      spin: vec(0, 0, 0),
      aimPoint: { x: targetX, y: targetY },
    };
    return simulate(shot, statue, createRng(1), STEP);
  };

  test('a shot into the post comes back off it', () => {
    const flight = atFrame(GOAL_WIDTH / 2, 1.1);
    assert.equal(flight.rebounds, 1, 'should have struck the woodwork once');
    assert.equal(flight.lastFrame, 'post');
  });

  test('a shot into the bar comes back off it', () => {
    const flight = atFrame(0, GOAL_HEIGHT);
    assert.equal(flight.lastFrame, 'bar');
  });

  test('coming off the frame and staying out is reported as the frame', () => {
    const flight = atFrame(GOAL_WIDTH / 2, 1.1);
    assert.ok(
      flight.outcome === 'post' || flight.outcome === 'goal',
      `expected post or goal, got ${flight.outcome}`
    );
  });

  test('a shot can go in off the woodwork', () => {
    // Somewhere across the inside faces there is a contact that deflects in.
    // Which one does not matter; that none of them can would mean the rebound
    // only ever takes the ball away from goal, which is not what a post does.
    let wentIn = 0;
    for (let i = 0; i <= 40; i++) {
      const x = GOAL_WIDTH / 2 - 0.02 - (i / 40) * 0.16;
      for (const y of [0.5, 1.1, 1.8]) {
        const flight = atFrame(x, y);
        if (flight.rebounds > 0 && flight.outcome === 'goal') wentIn += 1;
      }
    }
    assert.ok(wentIn > 0, 'no rebound off the post ever went in');
  });

  test('a rebound off the post settles quickly, not on the timeout', () => {
    // The shot is over when the ball can no longer reach the goal. Waiting for
    // FLIGHT_TIMEOUT meant a ball coming back off the post rolled around for
    // the best part of four seconds before the next penalty could be taken.
    for (const y of [0.5, 1.1, 1.8]) {
      const flight = atFrame(GOAL_WIDTH / 2, y);
      if (flight.rebounds === 0) continue;
      assert.ok(
        flight.elapsed < 1.5,
        `took ${flight.elapsed.toFixed(2)} s to settle, out of a ${FLIGHT_TIMEOUT} s timeout`
      );
    }
  });

  test('a shot cannot rattle around the frame forever', () => {
    for (const y of [0.4, 1.0, 1.6, 2.2]) {
      const flight = atFrame(GOAL_WIDTH / 2, y);
      assert.ok(flight.rebounds <= 2, `rebounded ${flight.rebounds} times`);
      assert.ok(flight.outcome !== null, 'must still reach an outcome');
    }
  });

  test('a clean shot never touches the frame', () => {
    const flight = atFrame(1.2, 1.2);
    assert.equal(flight.rebounds, 0);
    assert.equal(flight.lastFrame, null);
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
      anticipation: 0,
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
      anticipation: 0,
      readAccuracy: 1,
    };
    // Struck down the middle, where the keeper is, and bent away from there.
    // Aiming at the corner and curling further out just misses the goal, which
    // is the whole trade: the curl has to start somewhere the keeper believes.
    const straight = take(aim(0, 0.4, { curve: 0 }), reader, 1, striker, 25);
    const curled = take(aim(0, 0.4, { curve: 1 }), reader, 1, striker, 25);
    assert.equal(straight.outcome, 'saved');
    assert.equal(curled.outcome, 'goal');
  });

  test('the Magnus tuning holds', () => {
    // Locks MAGNUS_FACTOR. The target was a hard curl bending about 1.5 m over
    // a 25 m free kick; anything that moves these numbers is a tuning change
    // and should be a deliberate one.
    // Half a meter over a penalty is the target: most of a keeper's reach, so
    // a curl can beat one who committed, and enough to see. A life-size Magnus
    // gives about 20 cm here, which is inside the gloves and invisible.
    assert.ok(Math.abs(bend(-1, PENALTY_DISTANCE)) > 0.4, 'penalty curl too weak to matter');
    assert.ok(Math.abs(bend(-1, PENALTY_DISTANCE)) < 0.8, 'penalty curl too strong');
    // Deflection goes with the square of the flight, so a free kick bends a
    // long way. Phase 3 will want its own look at this.
    assert.ok(Math.abs(bend(-1, 25)) > 2.2, 'free kick curl too weak');
    assert.ok(Math.abs(bend(-1, 25)) < 3.8, 'free kick curl too strong');
    assert.ok(bend(1, 25) > 0 && bend(-1, 25) < 0, 'curve must bend both ways');
  });
});

describe('keeper commitment', () => {
  const profile = (over: Partial<KeeperProfile>): KeeperProfile => ({
    id: 'k',
    name: 'K',
    reactionMs: 250,
    diveSpeed: 9,
    reach: 0.55,
    guessBias: 0,
    anticipation: 0,
    readAccuracy: 0.9,
    ...over,
  });

  /** Seconds before the keeper's hands first leave the standing position. */
  const movesAt = (keeper: KeeperProfile, seed: number): number => {
    const rng = createRng(seed);
    const shot = resolveShot(aim(0.55, 0.4), striker, rng, {
      origin: spotBall(PENALTY_DISTANCE),
    });
    let flight = createFlight(shot, keeper, rng, 0, null, NO_EVENTS);
    const start = flight.keeper.state.hands.x;
    while (!flight.outcome) {
      flight = advance(flight, STEP, NO_EVENTS);
      if (Math.abs(flight.keeper.state.hands.x - start) > 0.01) return flight.elapsed;
    }
    return Infinity;
  };

  test('an anticipating keeper is moving at contact, not halfway through', () => {
    // The bug this replaced: reaction was the default, so the keeper always
    // set off around the midpoint of a 450 ms flight and visibly waited.
    const anticipating = movesAt(profile({ anticipation: 1 }), 1);
    const reacting = movesAt(profile({ anticipation: 0 }), 1);
    assert.ok(anticipating <= 2 * STEP, `expected immediate, moved at ${anticipating}`);
    assert.ok(reacting > 0.2, `expected a late reaction, moved at ${reacting}`);
  });

  test('the three styles are shared out by their weights', () => {
    const styles = (keeper: KeeperProfile) => {
      const counts: Record<string, number> = { guess: 0, anticipate: 0, react: 0, human: 0 };
      for (let seed = 1; seed <= 400; seed++) {
        counts[planKeeper(keeper, createRng(seed)).plan.style] += 1;
      }
      return counts;
    };

    const mostly = styles(profile({ guessBias: 0.1, anticipation: 0.7 }));
    assert.ok(mostly.anticipate > mostly.react, 'anticipation should dominate');
    assert.ok(mostly.anticipate > mostly.guess, 'anticipation should beat guessing');
    assert.ok(mostly.react > 0 && mostly.guess > 0, 'the tails should still happen');

    // A profile setting neither weight gets the old always-reacting keeper,
    // which is a legitimate choice and should stay available.
    const patient = styles(profile({ guessBias: 0, anticipation: 0 }));
    assert.equal(patient.react, 400);
  });

  test('an idling keeper stands up straight wherever it is on the line', () => {
    // The bug this pins: the body was derived from the hands alone, as a
    // fraction of their offset from the CENTRE of the goal. A keeper who had
    // shuffled two steps left therefore had its feet drawn a third of the way
    // back toward the middle, so it leaned from side to side like a pendulum
    // instead of walking along its line.
    for (const stance of [-0.42, -0.1, 0, 0.25, 0.42]) {
      const hands = vec(stance, 0.95, 0);
      const body = bodyFor(hands, stance);
      assert.ok(
        Math.abs(body.x - stance) < 1e-9,
        `standing at ${stance} the body should be at ${stance}, got ${body.x}`
      );
      assert.equal(diveExtension(hands.x, stance), 0, 'standing is not diving');
    }
  });

  test('a dive is measured from the feet, not from the centre of the goal', () => {
    // Same reach in both cases, so the same extension, wherever they started.
    assert.equal(diveExtension(2.0, 0), diveExtension(2.4, 0.4));
    assert.ok(diveExtension(2.0, 0) > 0.5);
  });

  test('diving, the body trails the hands', () => {
    const body = bodyFor(vec(2.2, 1.6, 0), 0);
    assert.ok(body.x > 0 && body.x < 2.2, 'body should sit between the stance and the hands');
  });

  test('the arm is always an arm', () => {
    // The invariant the whole pose rests on. The body used to travel a
    // fraction of the way to the hands, so the further the keeper reached the
    // longer its arm grew: a save in the top corner drew one over a meter and
    // a half long. Anything past one arm has to be covered by going there.
    for (const hands of [
      vec(0.4, 1.2, 0),
      vec(1.8, 0.5, 0),
      vec(2.6, 1.9, 0),
      vec(3.9, 2.4, 0),
      vec(-3.5, 0.3, 0),
    ]) {
      const body = bodyFor(hands, 0);
      const reach = Math.hypot(hands.x - body.x, hands.y - body.y);
      assert.ok(
        reach <= ARM_SPAN + 0.35,
        `reaching (${hands.x}, ${hands.y}) needed ${reach.toFixed(2)} m of arm`
      );
    }
  });

  test('the torso rises for a high ball and drops for a low one', () => {
    const high = bodyFor(vec(2.4, 2.2, 0), 0);
    const low = bodyFor(vec(2.4, 0.3, 0), 0);
    assert.ok(high.y > low.y + 0.5, 'a save up top is not the same shape as one at the boot');
  });

  test('the idle shuffle stays near the middle and never reaches a post', () => {
    // A keeper shifts their weight; they do not wander to a post. If this ever
    // grows past about half a meter the shuffle stops being a tell to read and
    // starts being the whole shot.
    let peak = 0;
    for (let t = 0; t < 30; t += 0.01) peak = Math.max(peak, Math.abs(idleDrift(t, 12345)));
    assert.ok(peak > 0.15, `should actually move, peaked at ${peak.toFixed(2)}`);
    assert.ok(peak < 0.5, `drifted too far: ${peak.toFixed(2)}`);
  });

  test('the shuffle is blind to where the shot is going', () => {
    // It takes time and a seed and nothing else. A keeper that drifted toward
    // the corner you picked would be reading a mind, not a run-up.
    assert.equal(idleDrift(1.4, 7), idleDrift(1.4, 7));
    assert.notEqual(idleDrift(1.4, 7), idleDrift(1.4, 9));
  });

  test('a keeper caught leaning has further to go the other way', () => {
    const keeper = profile({ anticipation: 1, readAccuracy: 1, diveSpeed: 5.3 });
    const rng = () => createRng(11);
    const shot = resolveShot(aim(0.72, 0.4), striker, createRng(11), {
      origin: spotBall(PENALTY_DISTANCE),
    });
    // Same shot, same seed; only where the keeper was standing differs.
    const leaningAway = fromLine(shot, keeper, rng(), -0.42);
    const leaningInto = fromLine(shot, keeper, rng(), 0.42);
    assert.ok(
      Math.abs(leaningInto.keeper.state.hands.x) > Math.abs(leaningAway.keeper.state.hands.x),
      'starting nearer the shot must end up nearer the shot'
    );
  });

  test('an anticipating keeper reads the boot, so curve still beats it', () => {
    const keeper = profile({ anticipation: 1, readAccuracy: 1, diveSpeed: 12 });
    const straight = take(aim(0, 0.4, { curve: 0 }), keeper, 1, striker, 25);
    const curled = take(aim(0, 0.4, { curve: 1 }), keeper, 1, striker, 25);
    assert.equal(straight.outcome, 'saved');
    assert.equal(curled.outcome, 'goal');
  });
});

describe('after the whistle', () => {
  const wall: KeeperProfile = {
    id: 'wall',
    name: 'Wall',
    reactionMs: 0,
    diveSpeed: 12,
    reach: 1.4,
    guessBias: 0,
    anticipation: 1,
    readAccuracy: 1,
    };

  /** Advance past the outcome, the way the live game does. */
  const playOn = (flight: ReturnType<typeof simulate>, seconds: number) => {
    let f = flight;
    for (let t = 0; t < seconds; t += STEP) f = advance(f, STEP, NO_EVENTS);
    return f;
  };

  test('a saved ball comes back off the gloves', () => {
    const saved = take(aim(0.3, 0.4), wall);
    assert.equal(saved.outcome, 'saved');
    assert.ok(!saved.caught, 'a penalty at this pace should not be held');
    // Sent back out of the goal, not stopped dead on the line.
    assert.ok(saved.ball.velocity.z < 0, 'parried ball should be heading back out');
  });

  test('the ball keeps moving after the outcome is settled', () => {
    const saved = take(aim(0.3, 0.4), wall);
    const after = playOn(saved, 0.4);
    assert.ok(
      Math.abs(after.ball.position.z - saved.ball.position.z) > 0.5,
      'the ball should have gone somewhere in the half second after a save'
    );
  });

  test('the outcome is never revisited once settled', () => {
    const saved = take(aim(0.3, 0.4), wall);
    const after = playOn(saved, 1.5);
    assert.equal(after.outcome, 'saved', 'playing on must not change the result');
  });

  test('the keeper comes down rather than hanging in the air', () => {
    const saved = take(aim(0.55, 0.75), wall);
    const after = playOn(saved, 1.0);
    assert.ok(
      after.keeper.state.hands.y < saved.keeper.state.hands.y,
      'hands should be lower after landing'
    );
    assert.equal(after.keeper.state.landed, 1, 'and the keeper should be flat on the turf');
  });

  test('the aftermath stops, rather than running forever', () => {
    const saved = take(aim(0.3, 0.4), wall);
    const a = playOn(saved, 3);
    const b = playOn(a, 3);
    assert.deepEqual(a.ball.position, b.ball.position, 'should have come to rest');
  });

  test('a goal ends up in the net, not through it', () => {
    const scored = take(aim(0.3, 0.4), statue);
    assert.equal(scored.outcome, 'goal');
    const after = playOn(scored, 1.1);
    assert.ok(
      after.ball.position.z <= NET_DEPTH,
      `ball finished ${after.ball.position.z.toFixed(2)} m past the line, beyond the net at ${NET_DEPTH}`
    );
    assert.ok(after.ball.position.z > 0, 'and it should still be in the goal');
  });

  test('the net drops the ball rather than firing it back out', () => {
    const scored = take(aim(0.2, 0.7), statue);
    const after = playOn(scored, 1.1);
    assert.ok(after.ball.velocity.z > -6, 'a net is not a trampoline');
    assert.ok(after.ball.position.y < 1.2, 'the ball should have dropped');
  });

  test('a goal stays inside the frame it went into', () => {
    for (const x of [0.2, 0.5, 0.8]) {
      const after = playOn(take(aim(x, 0.5), statue), 1.1);
      if (after.outcome !== 'goal') continue;
      assert.ok(
        Math.abs(after.ball.position.x) <= GOAL_WIDTH / 2,
        `ball ended up ${after.ball.position.x.toFixed(2)} m across, outside the posts`
      );
    }
  });

  test('a miss does not end up in the goal it missed', () => {
    // The net used to catch anything past the line, so a shot over the bar or
    // wide of the post met netting that is not there, dropped, and came to
    // rest inside a goal it had missed. Both turned up in play.
    const over = playOn(take(aim(0.2, 1), statue), 1.1);
    assert.equal(over.outcome, 'over');
    assert.ok(
      over.ball.position.y > GOAL_HEIGHT || over.ball.position.z > NET_DEPTH,
      `a shot over the bar finished at y=${over.ball.position.y.toFixed(2)}, ` +
        `z=${over.ball.position.z.toFixed(2)}, which is inside the goal`
    );

    const wide = playOn(take(aim(1, 0.4), statue), 1.1);
    assert.equal(wide.outcome, 'wide');
    assert.ok(
      Math.abs(wide.ball.position.x) > GOAL_WIDTH / 2,
      `a wide shot finished ${wide.ball.position.x.toFixed(2)} m across, inside the posts`
    );
  });

  test('a miss keeps travelling instead of being stopped by nothing', () => {
    const wide = take(aim(1, 0.4), statue);
    const after = playOn(wide, 0.5);
    assert.ok(
      after.ball.position.z > wide.ball.position.z + 3,
      'a ball that missed should carry on past the goal'
    );
  });

  test('catching a penalty is rare', () => {
    let caught = 0;
    let saves = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const f = take(aim(0.25, 0.4), wall, seed);
      if (f.outcome !== 'saved') continue;
      saves += 1;
      if (f.caught) caught += 1;
    }
    assert.ok(saves > 20, `not enough saves to judge (${saves})`);
    assert.ok(caught / saves < 0.25, `caught ${caught} of ${saves}, which is not rare`);
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
      assert.equal(state.phase, 'runup', 'the ball waits for the taker');
      state = reduce(state, { type: 'STRIKE' });
      state = reduce(state, { type: 'RESOLVE', outcome: i < 3 ? 'goal' : 'saved' });
      state = reduce(state, { type: 'NEXT' });
    }
    assert.equal(state.phase, 'complete');
    assert.equal(state.score, 3);
    assert.equal(state.outcomes.length, 5);
  });

  test('ignores a second release during the run-up', () => {
    const ready = initialMatch(1);
    const running = reduce(ready, { type: 'TAKE_SHOT' });
    assert.equal(reduce(running, { type: 'TAKE_SHOT' }), running);
  });

  test('a shot cannot resolve before it is struck', () => {
    // The ball is still on the spot through the run-up. Resolving there would
    // score a penalty nobody has kicked yet.
    const running = reduce(initialMatch(1), { type: 'TAKE_SHOT' });
    assert.equal(reduce(running, { type: 'RESOLVE', outcome: 'goal' }), running);
  });

  test('only goals score', () => {
    let state = reduce(initialMatch(1), { type: 'TAKE_SHOT' });
    state = reduce(state, { type: 'STRIKE' });
    state = reduce(state, { type: 'RESOLVE', outcome: 'post' });
    assert.equal(state.score, 0);
  });
});

test('a ball on the ground does not fall through the pitch', () => {
  const flight = take(aim(0, 0, { power: 0.25 }));
  assert.ok(flight.ball.position.y >= BALL_RADIUS - 1e-9);
});
