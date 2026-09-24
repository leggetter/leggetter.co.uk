/**
 * The room, without a wire.
 *
 * `room.ts` is a pure function of its state and one message, so all of this
 * runs with no transport, no browser and no infrastructure - which is the
 * whole argument for building it before any of those exist.
 *
 * The test that matters most is the sealed dive. Everything else here is
 * bookkeeping; that one is the rule the format rests on.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { wireVersion } from './Transport.ts';
import { tuningFingerprint } from '../core/tuning.ts';
import type { Player } from '../core/types.ts';
import { SQUAD } from '../content/players.js';
import { handle, keeperSide, openRoom, takerSide, type Room } from './room.ts';
import type { Outbound, Side, TeamOnTheWire } from './Transport.ts';

const team = (name: string): TeamOnTheWire => ({
  name,
  squad: [SQUAD[0] as Player],
  kit: { kit: '#2f6fd0', trim: '#f4f6f8' },
});

const joinMessage = (token: string, name: string): Outbound => ({
  kind: 'join',
  token,
  tuning: wireVersion(),
  team: team(name),
});

/** A room with both seats taken. */
function seated(): Room {
  let room = openRoom({ discipline: 'penalties', shots: 5 }, 4242);
  room = handle(room, 'host', joinMessage('host', 'Rovers'), 0).room;
  room = handle(room, 'guest', joinMessage('guest', 'County'), 0).room;
  return room;
}

/** The dive the keeper is about to be asked for, and who has to send it. */
const pick = (room: Room, id = 'd1'): { side: Side; message: Outbound } => ({
  side: keeperSide(room),
  message: { kind: 'dive', at: { x: 1.4, y: 1 }, idempotency: id },
});

describe('getting in', () => {
  test('the first two are seated and the third is turned away', () => {
    let room = seated();
    const third = handle(room, 'other', joinMessage('other', 'Athletic'), 0);
    const refusal = third.out[0]?.message;
    assert.equal(refusal?.kind, 'error');
    assert.match((refusal as { reason: string }).reason, /two players/i);
    assert.equal(third.room.seats.filter(Boolean).length, 2);
  });

  test('a stale build is refused at the door, not halfway through', () => {
    // The realistic cause of two clients disagreeing is one of them running an
    // old bundle in which the same numbers honestly produce a different shot.
    const room = openRoom({ discipline: 'penalties', shots: 5 }, 1);
    const out = handle(room, 'a', { ...joinMessage('a', 'Rovers'), tuning: 'deadbeef' } as Outbound, 0);
    assert.equal(out.out[0]?.message.kind, 'error');
    assert.equal(out.room.seats.filter(Boolean).length, 0);
  });


  test('a page from before the shot message changed is refused, and says why', () => {
    // Same physics, older messages. Comparing the physics alone let this
    // through: the old page would have played on, flying its own version of
    // every kick. The protocol is part of what has to match now.
    const room = openRoom({ discipline: 'penalties', shots: 5 }, 1);
    const old = { ...joinMessage('a', 'Rovers'), tuning: tuningFingerprint() } as Outbound;
    const out = handle(room, 'a', old, 0);
    const reply = out.out[0]?.message;
    assert.equal(reply?.kind, 'error');
    assert.match((reply as { reason: string }).reason, /refresh/);
    assert.equal(out.room.seats[0], null, 'an old page was seated');
  });
  test('rejoining with the same token gets the same seat back', () => {
    // A reload mid-shootout must not cost somebody their seat to themselves.
    const room = seated();
    const again = handle(room, 'guest', joinMessage('guest', 'County'), 500);
    assert.equal(again.room.seats.filter(Boolean).length, 2);
    assert.equal(again.room.seats[1]?.token, 'guest');
  });

  test('somebody who is not in the room cannot do anything in it', () => {
    const room = seated();
    const out = handle(room, 'stranger', { kind: 'next' }, 0);
    assert.equal(out.out[0]?.message.kind, 'error');
  });
});

describe('the sealed dive', () => {
  test('nobody is ever told where the keeper went', () => {
    // The rule the whole format rests on. The room does not tell you, which is
    // sufficient, because it is the thing both players already trust with the
    // score. No hashing, no reveal, nothing to get wrong.
    const room = seated();
    const { side, message } = pick(room);
    const out = handle(room, side === 0 ? 'host' : 'guest', message, 0);

    assert.deepEqual(out.room.dive, { x: 1.4, y: 1 }, 'the room did not keep it');
    for (const { message: sent } of out.out) {
      assert.equal(
        JSON.stringify(sent).includes('1.4'),
        false,
        `a dive leaked in a ${sent.kind} message`
      );
    }
  });

  test('the taker is told that it happened, and only that', () => {
    const room = seated();
    const { side, message } = pick(room);
    const out = handle(room, side === 0 ? 'host' : 'guest', message, 0);
    const toTaker = out.out.find((m) => m.to === takerSide(out.room))?.message;
    assert.equal(toTaker?.kind, 'state');
    assert.equal((toTaker as { dived: boolean }).dived, true);
  });

  test('the taker cannot pick the corner they are about to shoot at', () => {
    const room = seated();
    const wrongSide = takerSide(room);
    const out = handle(room, wrongSide === 0 ? 'host' : 'guest', pick(room).message, 0);
    assert.equal(out.out[0]?.message.kind, 'error');
    assert.equal(out.room.dive, null);
  });

  test('a second pick is ignored once one is in', () => {
    const room = seated();
    const { side, message } = pick(room);
    const who = side === 0 ? 'host' : 'guest';
    const first = handle(room, who, message, 0).room;
    const second = handle(first, who, { kind: 'dive', at: { x: -2, y: 2 }, idempotency: 'd2' }, 0);
    assert.deepEqual(second.room.dive, { x: 1.4, y: 1 });
  });
});

describe('taking one', () => {
  const shoot = (id = 's1'): Outbound => ({
    kind: 'shoot',
    input: { aim: { x: 0.4, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0 },
    taker: (SQUAD[0] as Player).id,
    outcome: 'goal',
    idempotency: id,
  });

  /** Both seats in, keeper committed, ready for a shot. */
  const ready = (): Room => {
    const room = seated();
    const { side, message } = pick(room);
    return handle(room, side === 0 ? 'host' : 'guest', message, 0).room;
  };

  test('the room works the shot out itself rather than believing the client', () => {
    // What makes it an authority rather than a scoreboard, and it is only
    // possible because nothing in core/ needs a browser.
    const room = ready();
    const who = takerSide(room) === 0 ? 'host' : 'guest';
    const out = handle(room, who, shoot(), 0);
    const shot = out.out.find((m) => m.message.kind === 'shot')?.message;
    assert.ok(shot, 'no shot was broadcast');
    assert.ok(typeof (shot as { outcome: string }).outcome === 'string');
    assert.equal(out.room.match.outcomes.length, 1);
  });

  test('a client claiming the wrong outcome is counted, not obeyed', () => {
    const room = ready();
    const who = takerSide(room) === 0 ? 'host' : 'guest';
    const lying: Outbound = { ...(shoot() as object), outcome: 'saved' } as Outbound;
    const honest = handle(room, who, shoot(), 0);
    const crooked = handle(room, who, lying, 0);
    const truth = (honest.out.find((m) => m.message.kind === 'shot')?.message as { outcome: string })
      .outcome;
    const claimed = (crooked.out.find((m) => m.message.kind === 'shot')?.message as {
      outcome: string;
    }).outcome;
    assert.equal(claimed, truth, 'the room took the client at its word');
    if (truth !== 'saved') assert.equal(crooked.room.diverged, 1);
  });

  test('a client that offers no outcome is not counted as disagreeing', () => {
    /*
      The page cannot have an outcome at this moment and never could: it has
      not been told where the keeper went, which is the entire format. It sent
      a hard-coded 'goal' anyway, so every shot that was not a goal was filed
      as a divergence.

      Nothing failed. The existing test above passes an outcome in every case,
      so the missing one had no cover at all, and the number was only ever read
      months later off a dataset - where it said seven divergences across five
      games that had never disagreed about anything. 25 kicks, 18 goals, and
      the difference is exactly the seven.
    */
    const room = ready();
    const who = takerSide(room) === 0 ? 'host' : 'guest';
    const { outcome: _claimed, ...silent } = shoot() as Extract<Outbound, { kind: 'shoot' }>;
    const out = handle(room, who, silent as Outbound, 0);
    assert.equal(out.room.diverged, 0, 'silence was counted as a disagreement');
    // And it still resolved the kick, rather than refusing it for being quiet.
    assert.equal(out.room.match.outcomes.length, 1);
  });

  test('the dive travels with the shot it belonged to, and not before', () => {
    const room = ready();
    const who = takerSide(room) === 0 ? 'host' : 'guest';
    const out = handle(room, who, shoot(), 0);
    const shot = out.out.find((m) => m.message.kind === 'shot')?.message as { dive: unknown };
    assert.deepEqual(shot.dive, { x: 1.4, y: 1 });
    assert.equal(out.room.dive, null, 'the seal was not cleared for the next one');
  });

  test('a retried shot does not fire a second penalty', () => {
    // Without an idempotency key this shows up as a mysteriously wrong score
    // rather than as an error, which is the worst kind of bug to be handed.
    const room = ready();
    const who = takerSide(room) === 0 ? 'host' : 'guest';
    const once = handle(room, who, shoot('same'), 0).room;
    const twice = handle(once, who, shoot('same'), 0).room;
    assert.equal(twice.match.outcomes.length, 1);
  });

  test('and the retry gets an answer rather than silence', () => {
    // The reason a client retries is that it did not hear back, so silence is
    // the one response guaranteed not to help.
    //
    // This is also what stops the phase check standing in for the idempotency
    // key: once a shot has resolved the match is not `ready`, so a duplicate
    // is refused anyway - with an *error*, which is the wrong answer to "I
    // think you missed my message". The first version of this test could not
    // tell the two apart and passed with the key removed.
    const room = ready();
    const who = takerSide(room) === 0 ? 'host' : 'guest';
    const once = handle(room, who, shoot('same'), 0).room;
    const again = handle(once, who, shoot('same'), 0);

    assert.ok(again.out.length > 0, 'the retry got nothing back');
    assert.equal(
      again.out.some((m) => m.message.kind === 'error'),
      false,
      'the retry was answered with an error'
    );
    assert.ok(again.out.some((m) => m.message.kind === 'state'));
  });

  test('the side not taking it cannot shoot', () => {
    const room = ready();
    const who = keeperSide(room) === 0 ? 'host' : 'guest';
    const out = handle(room, who, shoot(), 0);
    assert.equal(out.out[0]?.message.kind, 'error');
    assert.equal(out.room.match.outcomes.length, 0);
  });
});

describe('being left alone', () => {
  test('the other player is reported away after the silence, not before', () => {
    const room = seated();
    const soon = handle(room, 'host', { kind: 'next' }, 5_000);
    const later = handle(room, 'host', { kind: 'next' }, 30_000);
    void soon;
    void later;
    // Read it off a state message rather than the room, because "together" is
    // a thing a client is told rather than a thing the room stores.
    const at = (now: number) => {
      const out = handle(room, 'host', joinMessage('host', 'Rovers'), now);
      const state = out.out.find((m) => m.to === 0)?.message as { together: boolean };
      return state.together;
    };
    assert.equal(at(5_000), true, 'called away too early');
    assert.equal(at(30_000), false, 'never called away');
  });

  test('leaving keeps the seat, so the link still works', () => {
    // No timeout-and-forfeit. This is a game between two people who know each
    // other, and the honest failure is "we stopped playing", not a loss.
    const room = seated();
    const out = handle(room, 'guest', { kind: 'leave' }, 1_000);
    assert.equal(out.room.seats[1]?.token, 'guest');
    const back = handle(out.room, 'guest', joinMessage('guest', 'County'), 2_000);
    assert.equal(back.room.seats.filter(Boolean).length, 2);
  });
});

describe('who shoots first', () => {
  test('is decided by the room, from its own seed', () => {
    const one = openRoom({ discipline: 'penalties', shots: 5 }, 7);
    const same = openRoom({ discipline: 'penalties', shots: 5 }, 7);
    assert.equal(one.first, same.first, 'not reproducible');
  });

  test('and is not always the host', () => {
    const flips = new Set(
      Array.from({ length: 40 }, (_, i) => openRoom({ discipline: 'penalties', shots: 5 }, i).first)
    );
    assert.equal(flips.size, 2, 'the coin only ever lands one way');
  });
});
