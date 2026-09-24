/**
 * Two devices, one kick: the replay has to land where the room says it did.
 *
 * The room resolves every shot and broadcasts it; each client then animates
 * the same shot from that message. A two-person playtest found the two
 * disagreeing - one saw a goal, the other saw the wall block it, and one
 * player's first shot arrived "from basically off to the left" instead of from
 * the spot. The cause was the client rebuilding the flight from its *own*
 * state: its own keeper, its own discipline setting, its own idea of which
 * kick this was, its own squad and its own idle keeper position. On a single
 * machine all of those happen to agree with the room, which is why nothing
 * caught it.
 *
 * So this puts the client in the worst state it could plausibly be in - every
 * one of those beliefs wrong at once, and each of them wrong on its own - and
 * asserts the replay does not care. The room is driven through `handle()`
 * exactly as the Worker drives it, over whole matches of penalties, free kicks
 * and mixed, with a spread of aims, powers, curls and all three strikes.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KEEPERS } from '../content/keepers.js';
import { SQUAD } from '../content/players.js';
import { NO_EVENTS } from '../core/events.ts';
import { advance, createFlight, type Flight } from '../core/flight.ts';
import { createRng, shotSeed } from '../core/rng.ts';
import { setPieceFor, type Discipline } from '../core/setpiece.ts';
import { resolveShot } from '../core/shot.ts';
import { buildWall } from '../core/wall.ts';
import { STYLES } from '../core/styles.ts';
import { tuningFingerprint } from '../core/tuning.ts';
import type { Dive, KeeperProfile, Player, ShotInput } from '../core/types.ts';
import { GOAL_HEIGHT, GOAL_WIDTH, STEP } from '../core/units.ts';
import { handle, keeperSide, openRoom, refereeFlight, takerSide, type Room } from './room.ts';
import { replayShot, strikeReplay, verdict, type LocalView } from './replay.ts';
import type { Inbound, Outbound, Side, TeamOnTheWire } from './Transport.ts';

const player = (i: number): Player => SQUAD[i] as Player;
const keeperCalled = (id: string): KeeperProfile =>
  KEEPERS.find((k) => k.id === id) as KeeperProfile;

/** Each side brings somebody different, so the wrong taker is a different shot. */
const TEAMS: [TeamOnTheWire, TeamOnTheWire] = [
  { name: 'Rovers', squad: [player(0), player(1)], kit: { kit: '#2f6fd0', trim: '#f4f6f8' } },
  { name: 'County', squad: [player(3)], kit: { kit: '#e03131', trim: '#1d1d1d' } },
];
const TOKENS = ['host', 'guest'] as const;

function seated(seed: number, discipline: Discipline): Room {
  let room = openRoom({ discipline, shots: 5 }, seed);
  for (const side of [0, 1] as Side[]) {
    const join: Outbound = {
      kind: 'join',
      token: TOKENS[side],
      tuning: tuningFingerprint(),
      team: TEAMS[side],
    };
    room = handle(room, TOKENS[side], join, 0).room;
  }
  return room;
}

/** A spread of strikes, reproducible, covering every style and both feet of curl. */
function inputFor(kick: number, seed: number): ShotInput {
  const wave = (k: number) => Math.sin(kick * k + seed * 0.001);
  return {
    aim: { x: 0.95 * wave(1.7), y: 0.5 + 0.45 * wave(2.3) },
    power: 0.45 + 0.55 * Math.abs(wave(0.9)),
    curve: wave(3.1),
    lift: 0.5 + 0.5 * wave(1.3),
    timing: 0.4 * wave(4.7),
    style: STYLES[kick % STYLES.length]?.id,
  };
}

const DIVES: Dive[] = [
  { x: -2.6, y: 0.5 },
  { x: 2.2, y: 1.9 },
  { x: 0, y: 1 },
  { x: -1.1, y: 2.1 },
  { x: 3.1, y: 0.3 },
];

/**
 * Where the keeper goes: a guess, or somewhere close to where it is about to
 * be hit.
 *
 * Mostly close. A keeper nowhere near the ball makes every keeper setting
 * irrelevant, so a replay with the wrong keeper, the wrong keeper seed or the
 * wrong starting position would agree with the room by accident. A dive that
 * is nearly right is where those differences decide the kick.
 */
function diveFor(kick: number, input: ShotInput): Dive {
  if (kick % 4 === 3) return DIVES[kick % DIVES.length] as Dive;
  const miss = [0, 0.35, -0.6, 0.9][kick % 4] as number;
  return {
    x: Math.max(-3.4, Math.min(3.4, input.aim.x * (GOAL_WIDTH / 2) + miss)),
    y: Math.max(0.2, Math.min(2.3, input.aim.y * GOAL_HEIGHT)),
  };
}

/**
 * What a client might believe when the shot arrives, each wrong in one way,
 * and one wrong in all of them. The first is a client that happens to agree
 * with the room on everything, as a control.
 */
function beliefs(room: Room): { why: string; local: LocalView }[] {
  const { seed, shotIndex } = room.match;
  const discipline = room.settings.discipline;
  const agrees: LocalView = {
    seed,
    shotIndex,
    discipline,
    keeper: keeperCalled('steady'),
    squad: TEAMS[takerSide(room)].squad,
    player: TEAMS[takerSide(room)].squad[0] as Player,
    keeperX: 0,
  };
  const otherDiscipline: Discipline = discipline === 'penalties' ? 'freekicks' : 'penalties';
  const stale = shotIndex > 0 ? shotIndex - 1 : shotIndex + 1;
  const stranger = { squad: [player(2)], player: player(2) };
  return [
    { why: 'agrees with the room', local: agrees },
    { why: 'picked a different keeper', local: { ...agrees, keeper: keeperCalled('wall') } },
    { why: 'is set to another discipline', local: { ...agrees, discipline: otherDiscipline } },
    { why: 'has not heard about the last NEXT', local: { ...agrees, shotIndex: stale } },
    { why: 'does not have the taker in its squad', local: { ...agrees, ...stranger } },
    { why: 'caught the keeper mid-shuffle', local: { ...agrees, keeperX: 0.83 } },
    {
      why: 'is wrong about everything',
      local: {
        seed: seed + 1,
        shotIndex: stale,
        discipline: otherDiscipline,
        keeper: keeperCalled('sunday'),
        ...stranger,
        keeperX: -0.6,
      },
    },
  ];
}

/** Run a flight to its verdict, the way the frame loop would. */
function playOut(flight: Flight): Flight {
  let f = flight;
  for (let step = 0; step < 1200 && !f.outcome; step++) f = advance(f, STEP, NO_EVENTS);
  return f;
}

/**
 * The flight a client built before this was fixed: the message's input and
 * seed, and everything else from its own state. Kept here, and only here, as
 * the thing the test has to be able to catch.
 */
function naiveFlight(message: Kick['message'], local: LocalView): Flight {
  const piece = setPieceFor(message.seed, local.shotIndex, local.discipline, true);
  const taker =
    (message.taker === local.player.id
      ? local.player
      : local.squad.find((p) => p.id === message.taker)) ?? local.player;
  const shot = resolveShot(message.input, taker, createRng(shotSeed(message.seed, local.shotIndex)), {
    origin: piece.origin,
    loft: piece.penalty ? 0 : Math.max(0, Math.min(1, taker.dip / 100)),
    aimEase: piece.penalty ? 1 : 0.62,
  });
  return createFlight(
    shot,
    local.keeper,
    createRng(shotSeed(local.seed, local.shotIndex)),
    local.keeperX,
    message.dive,
    NO_EVENTS,
    buildWall(piece)
  );
}

interface Kick {
  where: string;
  message: Extract<Inbound, { kind: 'shot' }>;
  spot: { x: number; y: number; z: number };
  /** The room's own flight, run to its verdict: the thing to agree with. */
  truth: Flight;
  room: Room;
}

/** Every kick of a whole match, as the room resolved and broadcast it. */
function playMatch(seed: number, discipline: Discipline): Kick[] {
  let room = seated(seed, discipline);
  const kicks: Kick[] = [];
  for (let kick = 0; kick < 40 && room.match.phase !== 'complete'; kick++) {
    const input = inputFor(kick, seed);
    const dive = diveFor(kick, input);
    room = handle(room, TOKENS[keeperSide(room)], { kind: 'dive', at: dive, idempotency: `d${kick}` }, 0).room;

    const side = takerSide(room);
    const before = room;
    const taker = TEAMS[side].squad[kick % TEAMS[side].squad.length] as Player;
    const shoot: Outbound = {
      kind: 'shoot',
      input,
      taker: taker.id,
      idempotency: `s${kick}`,
    };
    const out = handle(room, TOKENS[side], shoot, 0);
    const truth = refereeFlight(room, side, shoot as Extract<Outbound, { kind: 'shoot' }>);
    const message = out.out.find((m) => m.message.kind === 'shot')?.message;
    assert.ok(message, `no shot came back for kick ${kick}`);
    kicks.push({
      where: `${discipline} seed ${seed} kick ${before.match.shotIndex}`,
      message: message as Kick['message'],
      // Worked out here from the room's own record, not read off the message,
      // so a message that lies about where the ball was is caught too.
      spot: setPieceFor(before.match.seed, before.match.shotIndex, discipline, true).origin,
      truth,
      room: before,
    });
    room = handle(out.room, TOKENS[side], { kind: 'next' }, 0).room;
  }
  return kicks;
}

const MATCHES: [number, Discipline][] = [
  [11, 'penalties'],
  [4242, 'freekicks'],
  [90210, 'freekicks'],
  [7, 'mixed'],
  [31337, 'mixed'],
];

describe('a remote kick replays the same on every device', () => {
  const kicks = MATCHES.flatMap(([seed, discipline]) => playMatch(seed, discipline));

  test('the matches actually covered what they claim to', () => {
    // Guards the rest: a loop that played no free kicks, or only saw goals,
    // would pass everything below while proving very little.
    assert.ok(kicks.length >= 40, `only ${kicks.length} kicks`);
    const outcomes = new Set(kicks.map((k) => k.message.outcome));
    assert.ok(outcomes.size >= 3, `only saw ${[...outcomes].join(', ')}`);
    assert.ok(kicks.some((k) => k.spot.x !== 0), 'no free kick from off centre');
    assert.ok(kicks.some((k) => k.spot.x === 0 && k.spot.z === setPieceFor(0, 0).origin.z));
  });

  test('whatever this device believes, the ball starts where the room put it', () => {
    const wrong: string[] = [];
    for (const kick of kicks) {
      for (const { why, local } of beliefs(kick.room)) {
        const flight = strikeReplay(replayShot(kick.message, local), NO_EVENTS);
        const at = flight.ball.position;
        if (at.x !== kick.spot.x || at.z !== kick.spot.z) {
          wrong.push(`${kick.where}, a client that ${why}: from x ${at.x.toFixed(2)} z ${at.z.toFixed(2)}`);
        }
      }
    }
    assert.deepEqual(wrong.slice(0, 8), [], `${wrong.length} replays started somewhere else`);
  });

  test('whatever this device believes, the replay lands on the room\'s verdict', () => {
    const wrong: string[] = [];
    for (const kick of kicks) {
      for (const { why, local } of beliefs(kick.room)) {
        const landed = playOut(strikeReplay(replayShot(kick.message, local), NO_EVENTS)).outcome;
        if (landed !== kick.message.outcome) {
          wrong.push(`${kick.where}, a client that ${why}: ${landed}, room said ${kick.message.outcome}`);
        }
      }
    }
    assert.deepEqual(wrong.slice(0, 8), [], `${wrong.length} replays disagreed with the room`);
  });

  test('and it gets there by the same flight, not merely the same word', () => {
    /*
      An outcome is a coarse check. Against a keeper who has picked a corner,
      the keeper's own seed barely touches the verdict - it decides whether a
      save is held or pushed away, and both are 'saved' - so a replay with the
      wrong seed agrees about the result while the ball goes somewhere else
      afterwards on each screen. Compared where the verdict was reached: the
      ball, the keeper's hands, and whether it was held.
    */
    const wrong: string[] = [];
    const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    for (const kick of kicks) {
      const want = kick.truth;
      for (const { why, local } of beliefs(kick.room)) {
        const got = playOut(strikeReplay(replayShot(kick.message, local), NO_EVENTS));
        const agrees =
          got.outcome === want.outcome &&
          got.caught === want.caught &&
          same(got.elapsed, want.elapsed) &&
          same(got.ball.position.x, want.ball.position.x) &&
          same(got.ball.position.y, want.ball.position.y) &&
          same(got.ball.position.z, want.ball.position.z) &&
          same(got.keeper.state.hands.x, want.keeper.state.hands.x) &&
          same(got.keeper.state.hands.y, want.keeper.state.hands.y);
        if (!agrees) wrong.push(`${kick.where}, a client that ${why}`);
      }
    }
    assert.deepEqual(wrong.slice(0, 8), [], `${wrong.length} replays flew a different flight`);
  });

  test('every way of being wrong is one this test can see', () => {
    /*
      A guard on the guard. Each belief above is only worth listing if, fed
      naively into the flight, it would change something - otherwise a client
      that ignored the message and used it anyway would pass. So each is run
      through the flight the pre-fix client built, straight from its own
      state, and has to disagree with the room at least once.
    */
    const blind: string[] = [];
    const whys = beliefs(kicks[0]!.room).map((b) => b.why).filter((w) => w !== 'agrees with the room');
    for (const why of whys) {
      const seen = kicks.some((kick) => {
        const local = beliefs(kick.room).find((b) => b.why === why)!.local;
        const naive = playOut(naiveFlight(kick.message, local));
        return (
          naive.outcome !== kick.truth.outcome ||
          naive.caught !== kick.truth.caught ||
          naive.ball.position.x !== kick.truth.ball.position.x ||
          naive.keeper.state.hands.x !== kick.truth.keeper.state.hands.x
        );
      });
      if (!seen) blind.push(why);
    }
    assert.deepEqual(blind, [], 'these wrong beliefs never changed a flight');
  });
});

describe('what is shown', () => {
  const [kick] = playMatch(4242, 'freekicks');
  const local = beliefs(kick!.room)[0]!.local;

  test('is the room\'s verdict, even when this device worked out another', (t) => {
    // Should never happen now both sides fly the same kick. If a stale bundle
    // makes it happen anyway, the label must still agree with the other
    // player's screen and with the score, and the disagreement must be loud.
    const warn = t.mock.method(console, 'warn', () => {});
    const replay = replayShot(kick!.message, local);
    const other = kick!.message.outcome === 'goal' ? 'blocked' : 'goal';
    assert.equal(verdict(replay, other), kick!.message.outcome);
    assert.equal(warn.mock.callCount(), 1, 'a disagreement went unsaid');
  });

  test('and agreeing with it says nothing', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const replay = replayShot(kick!.message, local);
    assert.equal(verdict(replay, kick!.message.outcome), kick!.message.outcome);
    assert.equal(warn.mock.callCount(), 0);
  });
});
