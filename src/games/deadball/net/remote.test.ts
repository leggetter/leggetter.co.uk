/**
 * Starting a two-device game says why, when it can't.
 *
 * It used to fail in silence: reported from a school as the QR code and link
 * "not appearing". These stand in for the network and check that each way it
 * can fail comes back as something the page can say to a person.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { createRemoteTransport, HostError, REFUSED, UNREACHABLE } from './remote.ts';
import type { TeamOnTheWire } from './Transport.ts';

const team: TeamOnTheWire = { name: 'Test', squad: [], kit: { kit: '#2f6fd0', trim: '#f4f6f8' } };
const memory = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const kept = new Map<string, string>();
  return { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => void kept.set(k, v) };
};
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

async function failure(): Promise<HostError> {
  const wire = createRemoteTransport('https://rooms.invalid', memory());
  try {
    await wire.host({ discipline: 'penalties', shots: 5 } as never, team);
  } catch (error) {
    assert.ok(error instanceof HostError, `threw ${String(error)}, not a HostError`);
    return error;
  }
  assert.fail('starting a game succeeded');
}

describe('when a two-device game cannot be started', () => {
  test('no answer at all: says the network may be blocking it', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    const error = await failure();
    assert.equal(error.reason, 'unreachable');
    assert.equal(error.message, UNREACHABLE);
  });

  test('the rate limit: passes on what the server said', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Too many new games at once. Try again in a minute.' }), { status: 429 });
    const error = await failure();
    assert.equal(error.reason, 'refused');
    assert.equal(error.message, 'Too many new games at once. Try again in a minute.');
  });

  test("a refusal that explains nothing, like a filter's block page: the general message", async () => {
    globalThis.fetch = async () => new Response('<html>Blocked by your school</html>', { status: 403 });
    const error = await failure();
    assert.equal(error.reason, 'refused');
    assert.equal(error.message, REFUSED);
  });
});
