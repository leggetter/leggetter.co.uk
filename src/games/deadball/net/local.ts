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
import { OFFLINE_AFTER_MS, PING_EVERY_MS } from './Transport.ts';
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
  /** What is this game? Asked before joining, answered by whoever is hosting. */
  | { wire: 'peek' }
  | { wire: 'peeked'; settings: RoomSettings; host: TeamOnTheWire };

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
 * A token for whoever is sitting here, kept.
 *
 * What makes a reload survivable: refresh the page and you are still the
 * keeper with your three saves. Without it a refresh mid-shootout costs
 * somebody their seat to themselves.
 *
 * **Which storage decides what "here" means, and it matters.** Across two
 * devices, a browser is a player and `localStorage` is right. Across two tabs
 * of one browser - which is this transport's entire purpose - `localStorage`
 * is shared, so both tabs mint the *same* token and the room treats the second
 * join as the first player reloading. One seat, two tabs, and a lobby that
 * waits forever for somebody already in it.
 *
 * So the caller passes the storage. The page hands this `sessionStorage`,
 * which is per tab and still survives a refresh; a real transport would hand
 * it `localStorage`, because two devices cannot share one.
 *
 * Worth recording how this got through: the tests give each factory its own
 * fake store, which is the case that *cannot* collide. It took opening two
 * real tabs.
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

  let lastHeard = now();

  const deliver = (message: Inbound): void => {
    lastHeard = now();
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
      if (envelope.wire === 'peek' && roomRef) {
        const host = roomRef.room.seats[0]?.team;
        if (host) {
          channel.postMessage({
            wire: 'peeked',
            settings: roomRef.room.settings,
            host,
          } satisfies Envelope);
        }
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

  /**
   * Say you are here, and notice when nothing says it back.
   *
   * Two jobs, and the second is the one that is easy to miss. Pinging makes
   * the *room* recompute whether both seats are live, which is what tells a
   * player their opponent has wandered off. The watchdog covers the case the
   * room cannot: if the room itself has gone - in this transport, the host
   * closing their tab - there is nobody left to notice anything, and silence
   * is all there is to go on.
   */
  const heartbeat = setInterval(() => {
    if (connection === 'closed') return;
    send({ kind: 'ping' });
    if (now() - lastHeard > OFFLINE_AFTER_MS) announce('alone');
  }, PING_EVERY_MS);
  (heartbeat as unknown as { unref?: () => void }).unref?.();

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
      clearInterval(heartbeat);
      channel.close();
    },
    get connection() {
      return connection;
    },
  };
}

/**
 * How long to wait for a host to say what their game is.
 *
 * Short, because both tabs are on the same machine and the only thing being
 * waited for is a task queue. If nothing answers in this, nothing is hosting -
 * which is what a link to a closed tab looks like, and is a real case: in this
 * build the host tab *is* the server.
 */
const PEEK_MS = 400;

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
      const ref = {
        room: openRoom(settings, (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 1),
      };
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

    /**
     * Ask the room what it is, before joining it.
     *
     * Over the channel rather than out of a Map. The first version read a
     * module-level Map, which works beautifully in the tab that created the
     * room and returns nothing in the tab that was sent the link - which is
     * every tab that will ever call this. Found by opening two tabs, which is
     * the entire reason this step exists before the Durable Object.
     */
    async peek(id: string) {
      const channel = new BroadcastChannel(channelName(id));
      (channel as { unref?: () => void }).unref?.();
      return new Promise<{ settings: RoomSettings; host: TeamOnTheWire } | null>((resolve) => {
        const done = (answer: { settings: RoomSettings; host: TeamOnTheWire } | null): void => {
          clearTimeout(timer);
          channel.close();
          resolve(answer);
        };
        const timer = setTimeout(() => done(null), PEEK_MS);
        (timer as unknown as { unref?: () => void }).unref?.();
        channel.addEventListener('message', (event: MessageEvent) => {
          const envelope = event.data as Envelope;
          if (envelope.wire === 'peeked') done({ settings: envelope.settings, host: envelope.host });
        });
        channel.postMessage({ wire: 'peek' } satisfies Envelope);
      });
    },
  };
}
