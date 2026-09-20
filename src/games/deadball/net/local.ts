/**
 * Two tabs of one browser, playing each other.
 *
 * Step 2 of the build order, and the one that would be skipped under time
 * pressure and pays for itself. It is not a toy: it runs the **same
 * `room.ts`** the Durable Object will run, over a real message boundary with
 * real serialisation, and exercises the join handshake, the sealed dive, the
 * idempotency keys and every row of the failure table - with no account, no
 * deploy, no bill, and no operational surface at all.
 *
 * It is also testable, which a Durable Object is not. `BroadcastChannel` is a
 * global in Node as well as the browser, so all of this runs headless.
 *
 * ## The host tab is the server
 *
 * Deliberately, because it is the shape the real thing has. One side owns the
 * room and answers messages; the other only ever sends and receives. Both go
 * through `Transport`, so `Game.ts` never learns which it is talking to.
 *
 * The consequence is honest rather than accidental: **close the host tab and
 * the game is gone.** That is what "the server went away" looks like, and it
 * is better to meet it here than in production.
 */

import { tuningFingerprint } from '../core/tuning.ts';
import { handle, openRoom, type Room } from './room.ts';
import type {
  Connection,
  Inbound,
  Outbound,
  RoomSettings,
  Side,
  TeamOnTheWire,
  Transport,
  TransportFactory,
} from './Transport.ts';

/** One channel per room, so two games in one browser do not hear each other. */
const channelName = (id: string): string => `deadball:room:${id}`;

/** What travels. Wrapped so the room can tell who sent it. */
type Envelope =
  | { wire: 'to-room'; from: string; message: Outbound }
  | { wire: 'to-seat'; to: Side | null; message: Inbound }
  | { wire: 'who-is-there' }
  | { wire: 'here' };

/**
 * A room id somebody can read out loud and nobody can guess.
 *
 * Eight characters of Crockford base32 is forty bits. The alphabet has no I,
 * L, O or U in it - the first three because they are the ones people misread
 * off a screen, and the last because it stops the generator producing a word
 * somebody has to read out to their brother.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function mintId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * A token for this browser, kept.
 *
 * What makes a reload survivable: close the tab, reopen the link, and you are
 * still the keeper with your three saves. Without it a refresh mid-shootout
 * costs somebody their seat to themselves.
 */
export function tokenFor(storage: Pick<Storage, 'getItem' | 'setItem'>): string {
  const KEY = 'deadball:v1:token';
  const existing = storage.getItem(KEY);
  if (existing) return existing;
  const minted = mintId() + mintId();
  storage.setItem(KEY, minted);
  return minted;
}

interface Wiring {
  listeners: ((message: Inbound) => void)[];
  connections: ((state: Connection) => void)[];
}

function makeTransport(
  channel: BroadcastChannel,
  token: string,
  join: Outbound,
  isRoom: boolean,
  roomRef: { room: Room } | null,
  now: () => number
): Transport {
  const wiring: Wiring = { listeners: [], connections: [] };
  let connection: Connection = 'connecting';

  const announce = (next: Connection): void => {
    if (next === connection) return;
    connection = next;
    for (const listener of wiring.connections) listener(next);
  };

  const deliver = (message: Inbound): void => {
    for (const listener of wiring.listeners) listener(message);
    if (message.kind === 'state') announce(message.together ? 'together' : 'alone');
  };

  /** Run a message through the room and post whatever came out. */
  const serve = (from: string, message: Outbound): void => {
    if (!roomRef) return;
    const handled = handle(roomRef.room, from, message, now());
    roomRef.room = handled.room;
    for (const { to, message: out } of handled.out) {
      // The host's own copy is delivered directly. Posting it would not come
      // back: a BroadcastChannel does not echo to the sender, which is the one
      // way this differs from a socket and the one place it would bite.
      if (to === 0 || to === null) deliver(out);
      if (to !== 0) channel.postMessage({ wire: 'to-seat', to, message: out } satisfies Envelope);
    }
  };

  // Node keeps the event loop alive for an open BroadcastChannel, so a test
  // process that opened one never exits - it passes and then hangs, which
  // looks exactly like a deadlock in the protocol and is not one. Browsers
  // have no such method and are unaffected.
  (channel as { unref?: () => void }).unref?.();

  channel.addEventListener('message', (event: MessageEvent) => {
    const envelope = event.data as Envelope;
    if (isRoom) {
      if (envelope.wire === 'to-room') serve(envelope.from, envelope.message);
      if (envelope.wire === 'who-is-there') {
        channel.postMessage({ wire: 'here' } satisfies Envelope);
      }
      return;
    }
    if (envelope.wire === 'to-seat' && (envelope.to === 1 || envelope.to === null)) {
      deliver(envelope.message);
    }
  });

  const send = (message: Outbound): void => {
    if (connection === 'closed') return;
    if (isRoom) serve(token, message);
    else channel.postMessage({ wire: 'to-room', from: token, message } satisfies Envelope);
  };

  send(join);

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
      channel.close();
    },
    get connection() {
      return connection;
    },
  };
}

/**
 * Rooms this tab is hosting, so `peek` can answer without a round trip.
 *
 * Only ever populated in the tab that created the room, which is the same tab
 * that is serving it. A guest in another tab asks over the channel.
 */
const hosted = new Map<string, { room: Room }>();

export function createLocalTransport(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  now: () => number = () => Date.now()
): TransportFactory {
  const token = tokenFor(storage);

  return {
    async host(settings: RoomSettings, team: TeamOnTheWire) {
      const id = mintId();
      // The seed is the room's, not the URL's. Knowing it would tell you the
      // aim error about to be applied to your own shot, which is the one
      // number in the game worth knowing - see the open questions.
      const ref = { room: openRoom(settings, (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 1) };
      hosted.set(id, ref);
      const channel = new BroadcastChannel(channelName(id));
      const transport = makeTransport(
        channel,
        token,
        { kind: 'join', token, tuning: tuningFingerprint(), team },
        true,
        ref,
        now
      );
      return { id, transport };
    },

    async guest(id: string, team: TeamOnTheWire) {
      const channel = new BroadcastChannel(channelName(id));
      return makeTransport(
        channel,
        token,
        { kind: 'join', token, tuning: tuningFingerprint(), team },
        false,
        null,
        now
      );
    },

    async peek(id: string) {
      const ref = hosted.get(id);
      if (!ref) return null;
      const host = ref.room.seats[0]?.team;
      return host ? { settings: ref.room.settings, host } : null;
    },
  };
}
