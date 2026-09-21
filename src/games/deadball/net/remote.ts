/**
 * The other player, on another device.
 *
 * The same `Transport` the same-browser implementation satisfies, over fetch
 * and polling instead of a `BroadcastChannel`. `Game.ts` cannot tell the
 * difference, which is the whole reason the interface was written before
 * either of them.
 *
 * ## Polling, not sockets
 *
 * On purpose, and it is the trade the plan argues for: polling cannot get
 * stuck in a state nobody thought about, and that is worth more at the start
 * than the second it costs. The known upgrade path is a WebSocket, and the
 * reason to take it eventually is that the moment the ball is struck is the
 * best moment in the game and up to a poll of dead air before it is the one
 * place the delay is felt.
 *
 * A poll doubles as the heartbeat. Asking "anything for me?" is the same
 * message as "I am still here", which is why `ping` exists at all.
 */

import { tuningFingerprint } from '../core/tuning.ts';
import { mintId, tokenFor } from './local.ts';
import { OFFLINE_AFTER_MS, PING_EVERY_MS } from './Transport.ts';
import type {
  Connection,
  Inbound,
  Outbound,
  RoomSettings,
  TeamOnTheWire,
  Transport,
  TransportFactory,
} from './Transport.ts';

/** A seed for the room, from the client that opened it. */
const freshSeed = (): number => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 1;

interface Wiring {
  listeners: ((message: Inbound) => void)[];
  connections: ((state: Connection) => void)[];
}

function connect(base: string, id: string, token: string, join: Outbound): Transport {
  const wiring: Wiring = { listeners: [], connections: [] };
  let connection: Connection = 'connecting';
  let lastHeard = Date.now();
  /**
   * Messages waiting to go, in order.
   *
   * Sent one at a time rather than in parallel: the room applies what it is
   * given in the order it arrives, and two overlapping requests would let a
   * shot reach it before the dive that was sent first.
   */
  const queue: Outbound[] = [];
  let sending = false;

  const announce = (next: Connection): void => {
    if (next === connection) return;
    connection = next;
    for (const listener of wiring.connections) listener(next);
  };

  const deliver = (messages: Inbound[]): void => {
    if (messages.length > 0) lastHeard = Date.now();
    for (const message of messages) {
      for (const listener of wiring.listeners) listener(message);
      if (message.kind === 'state') announce(message.together ? 'together' : 'alone');
      if (message.kind === 'error' && message.fatal) announce('closed');
    }
  };

  const drain = async (): Promise<void> => {
    if (sending || connection === 'closed') return;
    sending = true;
    try {
      while (queue.length > 0) {
        const message = queue.shift() as Outbound;
        const reply = await fetch(`${base}/room/${id}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, message }),
        });
        if (!reply.ok) continue;
        const body = (await reply.json()) as { messages?: Inbound[] };
        deliver(body.messages ?? []);
      }
    } catch {
      // A failed request is a silence, and silence is already handled below.
      // Nothing is dropped that matters: the next poll asks for everything
      // waiting, and anything this client sent carries an idempotency key.
    } finally {
      sending = false;
    }
  };

  const send = (message: Outbound): void => {
    if (connection === 'closed') return;
    queue.push(message);
    void drain();
  };

  send(join);

  const beat = setInterval(() => {
    if (connection === 'closed') return;
    send({ kind: 'ping' });
    // The room can say the *other* side has gone quiet. Only this can notice
    // that nothing at all is coming back - a dead network, or a server that is
    // not there - because in that case the room is not saying anything either.
    if (Date.now() - lastHeard > OFFLINE_AFTER_MS) announce('alone');
  }, PING_EVERY_MS);

  return {
    onMessage(listener) {
      wiring.listeners.push(listener);
      return () => {
        wiring.listeners = wiring.listeners.filter((l) => l !== listener);
      };
    },
    onConnection(listener) {
      wiring.connections.push(listener);
      return () => {
        wiring.connections = wiring.connections.filter((l) => l !== listener);
      };
    },
    send,
    close() {
      send({ kind: 'leave' });
      announce('closed');
      clearInterval(beat);
    },
    get connection() {
      return connection;
    },
  };
}

/**
 * Reaching a room on the server.
 *
 * `base` is where the game server lives, which is a different origin from the
 * page - the site is static files and this is the one thing with a runtime.
 */
export function createRemoteTransport(
  base: string,
  storage: Pick<Storage, 'getItem' | 'setItem'>
): TransportFactory {
  // localStorage here, unlike the same-browser transport: two devices are two
  // browsers and cannot collide, and a token that survives closing the tab is
  // what lets somebody reopen the link and still be the keeper with their
  // three saves.
  const token = tokenFor(storage);

  return {
    async host(settings: RoomSettings, team: TeamOnTheWire) {
      const id = mintId();
      const made = await fetch(`${base}/room`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // `play` says a person opened this, and it is the only thing that
        // does. The first version left real games untagged and treated an
        // empty tag as real - which quietly counted every room a script ever
        // minted, because a bare curl sends no tag either. Sixty-one abandoned
        // rooms from a rate-limit test turned up in the numbers looking
        // exactly like sixty-one people who never finished a shootout.
        //
        // Inverted, so the game has to declare itself and silence means noise.
        // Not tamper-proof and not meant to be: anybody can send `play`, and
        // the worst they achieve is adding themselves to a graph.
        body: JSON.stringify({ id, settings, seed: freshSeed(), tag: 'play' }),
      });
      if (!made.ok) throw new Error('Could not open a game.');
      return {
        id,
        transport: connect(base, id, token, {
          kind: 'join',
          token,
          tuning: tuningFingerprint(),
          team,
        }),
      };
    },

    async guest(id: string, team: TeamOnTheWire) {
      return connect(base, id, token, {
        kind: 'join',
        token,
        tuning: tuningFingerprint(),
        team,
      });
    },

    async peek(id: string) {
      try {
        const reply = await fetch(`${base}/room/${id}`);
        if (!reply.ok) return null;
        return (await reply.json()) as { settings: RoomSettings; host: TeamOnTheWire };
      } catch {
        // Offline, or the server is not there. Both mean the same thing to
        // somebody looking at an invitation: it cannot be joined right now.
        return null;
      }
    },
  };
}
