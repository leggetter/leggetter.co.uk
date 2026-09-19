/**
 * One shot, from strike to outcome.
 *
 * Steps the ball and the keeper together and decides when the shot is over.
 * The live game advances this one step at a time so it can be drawn; tests run
 * `simulate` to get straight to the outcome. Both take the identical path, so a
 * test result is evidence about the game and not about a second code path.
 */

import { NO_EVENTS, type EventSink } from './events.ts';
import {
  BALL_RADIUS,
  FLIGHT_TIMEOUT,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  NET_DEPTH,
  NET_DRAG,
  NET_MAX_REBOUND,
  NET_RESTITUTION,
} from './units.ts';
import { step } from './physics.ts';
import { planKeeper, stepKeeper, type KeeperRng, type KeeperSim } from './keeper.ts';
import { classifyCrossing, frameHit, type FrameHit } from './rules.ts';
import type { BallState, KeeperProfile, Outcome, Shot } from './types.ts';
import { addScaled, dot, length, lerp, scale, vec, type Vec3 } from './vec3.ts';

export interface Flight {
  ball: BallState;
  keeper: KeeperSim;
  profile: KeeperProfile;
  elapsed: number;
  /** Frame contacts so far. Capped, so a shot cannot pinball forever. */
  rebounds: number;
  /** Which part of the woodwork it last struck, if any. */
  lastFrame: 'post' | 'bar' | null;
  /** Set once the shot is over. Null while it is still live. */
  outcome: Outcome | null;
  /**
   * The keeper held on to it. Rare: a penalty arrives too fast to catch, and
   * most saves are a hand on it and the ball going somewhere else.
   */
  caught: boolean;
  /** Seconds of aftermath run so far, once the outcome is settled. */
  sinceOutcome: number;
}

/**
 * How long the ball and the keeper keep moving after the outcome is settled.
 *
 * Purely for show, and it does not change anything: the outcome is decided at
 * the line and never revisited. Stopping dead at that instant froze the ball
 * a hand's width from the gloves, which is the one frame in the whole flight
 * that looks least like a save.
 */
const AFTERMATH_SECONDS = 1.1;

/**
 * Below this the ball is done, in m/s.
 *
 * A shot is over when the ball can no longer reach the goal, not when a timer
 * says so. Waiting for the timeout meant a rebound off the post sat there for
 * the best part of four seconds, rolling away, before the game would admit it
 * had finished and let the next penalty be taken.
 */
const SETTLED_SPEED = 1.6;

/** Pace kept when a keeper gets a hand to it. Most of it goes. */
const PARRY_RESTITUTION = 0.42;

/** Fastest a shot can be and still be caught cleanly, m/s. */
const CATCHABLE_SPEED = 17;

/** And even then, usually not. */
const CATCH_CHANCE = 0.18;

/**
 * How many times a shot may come off the woodwork before the referee, so to
 * speak, calls it. Two is enough for the classic post-and-in and for a
 * bar-then-post scramble, and short of a shot rattling around all afternoon.
 */
const MAX_REBOUNDS = 2;

/**
 * How much pace survives a frame contact.
 *
 * A goal frame is stiff aluminium and a ball comes off it hard, which is why
 * hitting the post is such a thin line between a goal and nothing.
 */
const FRAME_RESTITUTION = 0.62;

/** Speed above which a contact counts as flush rather than a clip. */
const FULL_FORCE = 26;

const forceOf = (speed: number): number => Math.min(1, speed / FULL_FORCE);

export function createFlight(
  shot: Shot,
  profile: KeeperProfile,
  rng: KeeperRng,
  /**
   * Where the keeper had shuffled to at the moment of contact. Simulation
   * input, not presentation: it decides how far they have to travel. Recorded
   * in the shot log, and part of the two-player message when that arrives.
   */
  keeperStartX = 0,
  /** Where a person chose to dive, if a person is keeping. */
  chosenDive: { x: number; y: number } | null = null,
  /**
   * Where to put the discrete things that happen. Defaults to nowhere, because
   * tests and the offline tuning scripts run this too and want no list.
   */
  events: EventSink = NO_EVENTS
): Flight {
  events.emit({ kind: 'boot', at: 0, force: forceOf(length(shot.velocity)) });
  return {
    ball: { position: shot.origin, velocity: shot.velocity, spin: shot.spin },
    keeper: planKeeper(profile, rng, shot.aimPoint, keeperStartX, chosenDive),
    profile,
    elapsed: 0,
    rebounds: 0,
    lastFrame: null,
    outcome: null,
    caught: false,
    sinceOutcome: 0,
  };
}

/**
 * Advance one fixed step.
 *
 * Returns the flight unchanged once an outcome exists, so a caller can keep
 * calling this without having to check first.
 */
export function advance(flight: Flight, dt: number, events: EventSink = NO_EVENTS): Flight {
  if (flight.outcome) return aftermath(flight, dt);

  const before = flight.ball;
  const ball = step(before, dt);
  const elapsed = flight.elapsed + dt;
  const keeper = stepKeeper(flight.keeper, flight.profile, ball, elapsed, dt);

  // Off the woodwork, and still live. The shot carries on from the frame, so a
  // post can put it in as easily as it can keep it out.
  const hit = frameHit(before.position, ball.position);
  if (hit && flight.rebounds < MAX_REBOUNDS) {
    events.emit({ kind: 'frame', at: elapsed, force: forceOf(length(before.velocity)) });
    return {
      ...flight,
      ball: rebound(ball, hit),
      keeper,
      elapsed,
      rebounds: flight.rebounds + 1,
      lastFrame: hit.part,
      outcome: null,
    };
  }

  // The ball reached the line somewhere inside this step. Interpolate to the
  // crossing rather than judging it at the end of the step, or the verdict
  // depends on the step size and a shot could pass a post by centimeters it
  // never actually had.
  if (before.position.z < 0 && ball.position.z >= 0) {
    const t = (0 - before.position.z) / (ball.position.z - before.position.z);
    const at = lerp(before.position, ball.position, t);
    // Interpolate the keeper to the same instant as the ball, or a fast shot
    // is judged against where the keeper got to a whole step later.
    const atCrossing = {
      ...keeper.state,
      hands: lerp(flight.keeper.state.hands, keeper.state.hands, t),
      body: lerp(flight.keeper.state.body, keeper.state.body, t),
    };
    const outcome = classifyCrossing(at, atCrossing, flight.profile.reach);
    const stopped: BallState = { ...ball, position: at };

    // A save is a hand on it, not a full stop. Send the ball back off the
    // gloves so the next second shows what happened rather than a freeze.
    const handled =
      outcome === 'saved' ? parry(stopped, atCrossing.hands, flight.keeper.plan) : null;

    if (handled) {
      events.emit({ kind: 'glove', at: elapsed, force: forceOf(length(before.velocity)) });
    }
    // Only on a goal. The netting used to catch anything past the line, which
    // put wide shots in the back of the net, and a sound would have announced
    // it every time.
    if (outcome === 'goal') {
      events.emit({ kind: 'net', at: elapsed, force: forceOf(length(before.velocity)) });
    }
    events.emit({ kind: 'resolved', at: elapsed, outcome });

    return {
      ...flight,
      ball: handled?.ball ?? stopped,
      caught: handled?.caught ?? false,
      keeper,
      elapsed,
      outcome,
    };
  }

  // Nothing more is going to happen. Either the ball is in front of the line
  // and moving away from it, so it can never cross, or it has stopped. Both
  // are far more common than the timeout after a rebound off the woodwork.
  const receding = ball.position.z < 0 && ball.velocity.z <= 0;
  const stopped = length(ball.velocity) < SETTLED_SPEED;

  if (receding || stopped || elapsed >= FLIGHT_TIMEOUT) {
    // Came off the frame and stayed out. That is what beat the shot, and it is
    // a great deal more interesting to be told than "never got there".
    const outcome = flight.lastFrame ?? 'short';
    events.emit({ kind: 'resolved', at: elapsed, outcome });
    return { ...flight, ball, keeper, elapsed, outcome };
  }

  return { ...flight, ball, keeper, elapsed, outcome: null };
}

/**
 * Keep everything moving once the outcome is settled.
 *
 * The ball carries on under the same physics, the keeper finishes its dive and
 * comes down, and nothing here can change the result. A caught ball stays in
 * the gloves and travels with them.
 */
function aftermath(flight: Flight, dt: number): Flight {
  const sinceOutcome = flight.sinceOutcome + dt;
  const restingBall = length(flight.ball.velocity) < SETTLED_SPEED;
  const restingKeeper = flight.keeper.state.landed >= 1;

  // Stop as soon as there is nothing left to watch, rather than running the
  // clock down while a settled ball sits still.
  if (sinceOutcome > AFTERMATH_SECONDS || (restingBall && restingKeeper)) return flight;

  const elapsed = flight.elapsed + dt;
  const keeper = stepKeeper(flight.keeper, flight.profile, flight.ball, elapsed, dt, true);

  // A held ball travels with the gloves. Everything else carries on falling,
  // and only a ball that actually went in meets the net.
  const flying = step(flight.ball, dt);
  const ball = flight.caught
    ? { ...flight.ball, position: keeper.state.hands, velocity: vec(0, 0, 0) }
    : flight.outcome === 'goal'
      ? intoTheNet(flying)
      : flying;

  return { ...flight, ball, keeper, elapsed, sinceOutcome };
}

/**
 * Stop the ball in the net.
 *
 * A goal is not the ball leaving the stadium: it hits the back of the net and
 * drops into it. The three panels are the same ones the renderer draws, from
 * the same NET_DEPTH, so what stops the ball is what you can see.
 *
 * A net gives almost nothing back and drags hard at whatever it does not stop,
 * which is why the ball falls out of it rather than rebounding off it.
 *
 * Only ever called on a shot that went in, and that is load-bearing. Applied to
 * everything past the line it caught shots that had gone over the bar or wide
 * of the post - they met a net that is not there, dropped, and came to rest
 * apparently inside a goal they had missed. A ball that misses passes the
 * netting, not through it.
 */
function intoTheNet(ball: BallState): BallState {
  // In front of the line there is nothing to hit.
  if (ball.position.z <= 0) return ball;

  let { position, velocity } = ball;
  const soften = (v: number): number =>
    -Math.sign(v) * Math.min(Math.abs(v) * NET_RESTITUTION, NET_MAX_REBOUND);

  // Back panel.
  if (position.z > NET_DEPTH - BALL_RADIUS && velocity.z > 0) {
    position = vec(position.x, position.y, NET_DEPTH - BALL_RADIUS);
    velocity = vec(velocity.x * NET_DRAG, velocity.y * NET_DRAG, soften(velocity.z));
  }

  // Side panels.
  for (const side of [-1, 1]) {
    const edge = side * (GOAL_WIDTH / 2 - BALL_RADIUS);
    if (side * position.x > side * edge && side * velocity.x > 0) {
      position = vec(edge, position.y, position.z);
      velocity = vec(soften(velocity.x), velocity.y * NET_DRAG, velocity.z * NET_DRAG);
    }
  }

  // Roof.
  if (position.y > GOAL_HEIGHT - BALL_RADIUS && velocity.y > 0) {
    position = vec(position.x, GOAL_HEIGHT - BALL_RADIUS, position.z);
    velocity = vec(velocity.x * NET_DRAG, soften(velocity.y), velocity.z * NET_DRAG);
  }

  return { position, velocity, spin: scale(ball.spin, 0.5) };
}

/**
 * The ball off the keeper's gloves.
 *
 * Not a reflection off a computed surface. The first version mirrored the
 * velocity in a normal built from where on the gloves it struck, and that
 * normal was dominated by the lateral offset, so the reflection flipped the
 * ball sideways and left it still travelling into the goal.
 *
 * A parry is simpler than that and only has to be true to one thing: the ball
 * goes back out, most of its pace gone, deflected toward whichever side of the
 * gloves it hit and usually upward. Catching one is possible and rare: a
 * penalty arrives too fast, and a keeper at full stretch is in no position to
 * hold anything.
 */
function parry(
  ball: BallState,
  hands: Vec3,
  plan: { readErrorX: number }
): { ball: BallState; caught: boolean } {
  const speed = length(ball.velocity);

  // The read error stands in for a coin toss: it is drawn from the seeded
  // stream and already spent, so a replay stays identical.
  const caught = speed < CATCHABLE_SPEED && Math.abs(plan.readErrorX) < CATCH_CHANCE;
  if (caught) return { ball: { ...ball, velocity: vec(0, 0, 0) }, caught: true };

  const dx = ball.position.x - hands.x;
  const dy = ball.position.y - hands.y;
  const off = Math.sqrt(dx * dx + dy * dy);

  return {
    ball: {
      position: ball.position,
      velocity: vec(
        // Away from the gloves, plus a little of whatever it already had.
        ball.velocity.x * 0.25 + (off < 1e-4 ? 0 : dx / off) * speed * 0.3,
        // Parries go up more often than down; a keeper gets under it.
        Math.abs(ball.velocity.y) * 0.25 + speed * 0.12,
        // And always back out of the goal.
        -Math.abs(ball.velocity.z) * PARRY_RESTITUTION
      ),
      spin: scale(ball.spin, 0.4),
    },
    caught: false,
  };
}

/**
 * Bounce the ball off the frame.
 *
 * Mirror the velocity in the contact normal, keep some of the pace, and set
 * the ball just clear of the woodwork so the next step does not find the same
 * contact again. Held in front of the line, so the goal-crossing test stays
 * the one thing that decides whether it went in.
 */
function rebound(ball: BallState, hit: FrameHit): BallState {
  const along = dot(ball.velocity, hit.normal);
  const bounced = scale(addScaled(ball.velocity, hit.normal, -2 * along), FRAME_RESTITUTION);
  const clear = addScaled(hit.at, hit.normal, 0.03);
  return {
    position: vec(clear.x, clear.y, Math.min(clear.z, -0.01)),
    velocity: bounced,
    // Spin survives the contact, so a curled shot keeps curling off the post.
    spin: ball.spin,
  };
}

/** Run a shot to its outcome without drawing anything. */
export function simulate(
  shot: Shot,
  profile: KeeperProfile,
  rng: KeeperRng,
  dt: number
): Flight {
  let flight = createFlight(shot, profile, rng);
  // The timeout bounds this, so the loop cannot run away.
  while (!flight.outcome) flight = advance(flight, dt);
  return flight;
}
