/**
 * Two tabs, playing each other, with no infrastructure at all.
 *
 * `BroadcastChannel` is a global in Node as well as the browser, so the
 * same-browser transport is testable headlessly - which a Durable Object is
 * not, and which is most of the argument for building this step first.
 *
 * What is being tested is the *seam*: real serialisation, a real message
 * boundary, and the host tab serving the room. The room's own rules are
 * covered in `room.test.ts`; this is about whether they survive the wire.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SQUAD } from '../content/players.js';
import type { Player } from '../core/types.ts';
import { createLocalTransport, mintId, tokenFor } from './local.ts';
import type { Inbound, TeamOnTheWire, Transport } from './Transport.ts';

/** A localStorage that lives in a Map, so each test gets its own browser. */
const fakeStore = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

const team = (name: string): TeamOnTheWire => ({
  name,
  squad: [SQUAD[0] as Player],
  kit: { kit: '#2f6fd0', trim: '#f4f6f8' },
});

/** Collect what a transport receives. */
function inbox(transport: Transport): Inbound[] {
  const seen: Inbound[] = [];
  transport.onMessage((m) => seen.push(m));
  return seen;
}

/** BroadcastChannel delivers on a later tick, so let it. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

/** A hosted room with a guest in it, each with their own browser. */
async function together() {
  const hostFactory = createLocalTransport(fakeStore(), () => 0);
  const guestFactory = createLocalTransport(fakeStore(), () => 0);
  const { id, transport: host } = await hostFactory.host(
    { discipline: 'penalties', shots: 5 },
    team('Rovers')
  );
  const hostIn = inbox(host);
  const guest = await guestFactory.guest(id, team('County'));
  const guestIn = inbox(guest);
  await settle();
  return { id, host, guest, hostIn, guestIn, hostFactory };
}

describe('ids and tokens', () => {
  test('an id is eight characters and not guessable by reading the last one', () => {
    const ids = new Set(Array.from({ length: 200 }, mintId));
    assert.equal(ids.size, 200, 'two ids collided in two hundred');
    for (const id of ids) assert.match(id, /^[0-9A-HJKMNP-TV-Z]{8}$/);
  });

  test('the alphabet leaves out the characters people misread', () => {
    // I, L and O against 1 and 0, on a screen somebody is copying from.
    const all = Array.from({ length: 400 }, mintId).join('');
    for (const letter of ['I', 'L', 'O', 'U']) {
      assert.equal(all.includes(letter), false, `${letter} is in the alphabet`);
    }
  });

  test('a token is minted once and kept', () => {
    const store = fakeStore();
    assert.equal(tokenFor(store), tokenFor(store));
  });
});

describe('two tabs', () => {
  test('both sides are seated and told about each other', async () => {
    const { hostIn, guestIn } = await together();
    const hostState = [...hostIn].reverse().find((m) => m.kind === 'state');
    const guestState = [...guestIn].reverse().find((m) => m.kind === 'state');
    assert.ok(hostState && guestState, 'somebody never got a state');
    assert.equal((hostState as { you: number }).you, 0);
    assert.equal((guestState as { you: number }).you, 1);
    assert.equal((hostState as { together: boolean }).together, true);
  });

  test('each side sees both team names, including the one it did not pick', async () => {
    const { guestIn } = await together();
    const state = [...guestIn].reverse().find((m) => m.kind === 'state') as {
      teams: TeamOnTheWire[];
    };
    assert.deepEqual(
      state.teams.map((t) => t.name),
      ['Rovers', 'County']
    );
  });

  test('the squad travels, so a shot can name who took it', async () => {
    const { guestIn } = await together();
    const state = [...guestIn].reverse().find((m) => m.kind === 'state') as {
      teams: TeamOnTheWire[];
    };
    assert.ok((state.teams[0] as TeamOnTheWire).squad.length > 0);
  });

  test('a third tab is turned away rather than seated', async () => {
    const { id } = await together();
    const third = await createLocalTransport(fakeStore(), () => 0).guest(id, team('Athletic'));
    const thirdIn = inbox(third);
    await settle();
    const error = thirdIn.find((m) => m.kind === 'error');
    assert.ok(error, 'the third tab was let in');
    assert.match((error as { reason: string }).reason, /two players/i);
  });

  test('peek answers what a guest is being invited to, before they accept', async () => {
    const { id, hostFactory } = await together();
    const seen = await hostFactory.peek(id);
    assert.equal(seen?.settings.discipline, 'penalties');
    assert.equal(seen?.host.name, 'Rovers');
  });

  test('peeking at a room that does not exist is null, not a crash', async () => {
    const factory = createLocalTransport(fakeStore(), () => 0);
    assert.equal(await factory.peek('ZZZZZZZZ'), null);
  });
});

describe('the sealed dive survives the wire', () => {
  test('nothing the taker receives contains the keeper\'s pick', async () => {
    // room.test.ts proves the room does not send it. This proves nothing puts
    // it back on the way out - serialisation included.
    const { host, guest, hostIn, guestIn } = await together();
    const first = [...hostIn].reverse().find((m) => m.kind === 'state') as { first: number };

    const keeper = first.first === 0 ? guest : host;
    const takerInbox = first.first === 0 ? hostIn : guestIn;
    keeper.send({ kind: 'dive', at: { x: 2.75, y: 1.5 }, idempotency: 'd1' });
    await settle();

    for (const message of takerInbox) {
      assert.equal(
        JSON.stringify(message).includes('2.75'),
        false,
        `the dive leaked in a ${message.kind} message`
      );
    }
    const latest = [...takerInbox].reverse().find((m) => m.kind === 'state');
    assert.equal((latest as { dived: boolean }).dived, true, 'the taker was not told it happened');
  });
});

describe('a whole penalty, across the boundary', () => {
  test('both sides are told the same outcome, and the dive arrives with it', async () => {
    const { host, guest, hostIn, guestIn } = await together();
    const first = ([...hostIn].reverse().find((m) => m.kind === 'state') as { first: number }).first;
    const taker = first === 0 ? host : guest;
    const keeper = first === 0 ? guest : host;

    keeper.send({ kind: 'dive', at: { x: 1.2, y: 1 }, idempotency: 'd1' });
    await settle();
    taker.send({
      kind: 'shoot',
      input: { aim: { x: 0.4, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0 },
      taker: (SQUAD[0] as Player).id,
      outcome: 'goal',
      idempotency: 's1',
    });
    await settle();

    const shots = [hostIn, guestIn].map(
      (box) => box.find((m) => m.kind === 'shot') as { outcome: string; dive: unknown } | undefined
    );
    assert.ok(shots[0] && shots[1], 'somebody never saw the shot');
    assert.equal(shots[0].outcome, shots[1].outcome, 'the two sides disagree');
    // Only now, with the shot it belonged to.
    assert.deepEqual(shots[0].dive, { x: 1.2, y: 1 });
  });

  test('a retried shot does not fire twice, even across the wire', async () => {
    const { host, guest, hostIn, guestIn } = await together();
    const first = ([...hostIn].reverse().find((m) => m.kind === 'state') as { first: number }).first;
    const taker = first === 0 ? host : guest;
    const keeper = first === 0 ? guest : host;
    const shot = {
      kind: 'shoot' as const,
      input: { aim: { x: 0.4, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0 },
      taker: (SQUAD[0] as Player).id,
      outcome: 'goal' as const,
      idempotency: 'retry-me',
    };
    keeper.send({ kind: 'dive', at: { x: 1.2, y: 1 }, idempotency: 'd1' });
    await settle();
    taker.send(shot);
    taker.send(shot);
    await settle();

    const seen = [...hostIn, ...guestIn].filter((m) => m.kind === 'shot');
    assert.equal(seen.length, 2, `one shot, two sides, got ${seen.length} messages`);
  });
});
