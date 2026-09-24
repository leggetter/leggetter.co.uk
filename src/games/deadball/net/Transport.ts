/**
 * Two devices, one shootout: what goes on the wire.
 *
 * The interface and the messages, and nothing about how they travel. There are
 * two implementations planned - `local.ts` over `BroadcastChannel`, so two tabs
 * of one browser play each other, and later a Durable Object over fetch - and
 * the point of writing this first is that **the whole protocol gets designed
 * and tested before any infrastructure exists.** See
 * docs/deadball-two-devices.md.
 *
 * Nothing here knows about HTTP, Cloudflare, sockets or polling. If it did,
 * the same-browser implementation could not exist, and that implementation is
 * where most of the bugs are going to be found - with no account, no deploy
 * and no bill.
 *
 * ## What this is not
 *
 * Not an anti-cheat system. Two people who know each other playing a penalty
 * game do not need one. The single rule the format rests on is that **the
 * keeper commits before the taker sees anything and cannot revise afterwards**,
 * and that is enforced by the server simply not telling anybody: the dive goes
 * there and stays there, and the taker is told a boolean.
 */

import type { Dive, Outcome, Player, ShotInput } from '../core/types.ts';
import type { Discipline } from '../core/setpiece.ts';
import type { Kick } from '../core/kick.ts';

import { tuningFingerprint } from '../core/tuning.ts';

/**
 * The shape of the messages. Bump it whenever a message changes shape.
 *
 * 2: the \`shot\` message carries the whole kick - seed, shot number,
 * discipline, the taker and keeper themselves - so both devices fly the room's
 * version of it rather than their own.
 */
export const PROTOCOL = 2;

/**
 * What a client and a room must agree on before they can play: the physics,
 * and the message shapes.
 *
 * The join check used to compare the physics fingerprint alone, which covers a
 * stale bundle whose numbers differ but not one whose *messages* differ. The
 * shot message changed shape without the physics changing, so an old page
 * would have joined a new room and quietly gone back to disagreeing with it,
 * and a new page would have joined an old room and read fields that did not
 * exist. Folding the protocol into the same string refuses both, in both
 * directions, with the existing "one of you needs to refresh" - including an
 * old room, which knows nothing about protocols but will not match a string it
 * has never seen.
 */
export const wireVersion = (): string => `${tuningFingerprint()}/p${PROTOCOL}`;

/** Which side of the tie somebody is. The host is always 0. */
export type Side = 0 | 1;

/**
 * A team, as it crosses the wire.
 *
 * The squad travels at `join` rather than per kick, because the plan is that
 * **every penalty is taken by a different member of it** - so a shot needs to
 * name a taker, and naming one is only cheap if the list is already there.
 */
export interface TeamOnTheWire {
  /** What they call themselves. Chosen by them, never by the other side. */
  name: string;
  /**
   * Who is available, in the order they will take them.
   *
   * One today, because a shootout is one player taking all five. A list from
   * the start so that stops being a protocol change later.
   */
  squad: Player[];
  /** Outfield strip. The keeper's is derived from it, as it is locally. */
  kit: { kit: string; trim: string };
}

/** What a client sends. Six of them, and three of those are one word. */
export type Outbound =
  | {
      kind: 'join';
      /**
       * Minted once per browser and kept. It is what makes a reload survivable:
       * close the tab, reopen the link, and you are still the keeper with your
       * three saves. Without it a refresh mid-shootout means losing your seat
       * to yourself.
       */
      token: string;
      /**
       * The fingerprint of the physics constants.
       *
       * A mismatch refuses the join with "one of you needs to refresh". The
       * realistic cause of two clients disagreeing is not floating point, it is
       * **one of them running a stale bundle** in which the same numbers
       * honestly produce a different shot. Better caught at the door than
       * logged as an inexplicable divergence halfway through.
       */
      tuning: string;
      team: TeamOnTheWire;
    }
  | { kind: 'dive'; at: Dive; idempotency: string }
  | {
      kind: 'shoot';
      input: ShotInput;
      /** Which member of the squad is taking this one. */
      taker: string;
      /**
       * What this client's own simulation made of it, when it has one.
       *
       * **Optional, because the taker cannot have one.** The idea was that a
       * client sends its own answer so a disagreement is noticed rather than
       * discovered, and it cannot work at this moment by construction: the
       * keeper's dive is sealed, the taker has not been told it, and an
       * outcome cannot be computed without it. That is the whole format.
       *
       * The page sent a hard-coded `'goal'` here for every shot, so the
       * counter it fed was measuring "shots that were not goals" and calling
       * them divergences. The dataset said so the first time anybody looked at
       * it: 25 kicks, 18 goals, 7 divergences - the same 7.
       *
       * So nothing sends it now, and the count stays honestly at zero rather
       * than dishonestly at seven. The real check has to happen when a client
       * *replays* the shot, which is the first moment it knows the dive; see
       * the open question in the spec.
       */
      outcome?: Outcome;
      idempotency: string;
    }
  | { kind: 'next' }
  /**
   * Still here.
   *
   * Nothing but a sign of life, and the room answers with the state. A polled
   * transport gets this for free - a poll *is* a heartbeat - and the
   * same-browser one has to send it on a timer, because otherwise "are we
   * still together" is only ever recomputed when somebody does something, and
   * a player who has gone away is exactly the player who is not doing
   * anything.
   */
  | { kind: 'ping' }
  | { kind: 'leave' };

/** What a client receives. */
export type Inbound =
  | {
      kind: 'state';
      /** The whole match, every time it changes. */
      match: unknown;
      you: Side;
      teams: [TeamOnTheWire, TeamOnTheWire];
      /** Who shoots first, decided by a flip nobody is asked about. */
      first: Side;
      /** Whether the other side is currently connected. */
      together: boolean;
      /**
       * The keeper has committed, and that is all anybody is told.
       *
       * A boolean rather than a position. This is the sealed dive, and it is
       * the entire reason the server holds the state rather than relaying
       * messages between two clients.
       */
      dived: boolean;
    }
  /**
   * A shot, resolved, with everything needed to replay it.
   *
   * The whole `Kick` rather than the input and a seed: kick number,
   * discipline, the taker's attributes, the keeper and where they stood. It
   * used to carry less, and each client filled the gaps from its own state -
   * its own keeper, its own discipline setting, its own squad - so the same
   * shot flew differently on each screen. A client replays this and nothing
   * else. See core/kick.ts.
   *
   * The dive travels here and nowhere earlier. This is the moment it stops
   * being sealed.
   */
  | ({
      kind: 'shot';
      /** The squad id the taker named, kept for the log. `player` is who. */
      taker: string;
      /** The room's verdict. What both screens show, whatever they worked out. */
      outcome: Outcome;
    } & Kick)
  | { kind: 'error'; reason: string; fatal: boolean };

/** How a room is set up. Fixed when the id is minted and never after. */
export interface RoomSettings {
  discipline: Discipline;
  shots: number;
}

export type Connection = 'connecting' | 'together' | 'alone' | 'closed';

/**
 * How long a silence has to last before the other player is called away.
 *
 * Ten seconds. Long enough to ride out a tunnel, a lock screen or a handful of
 * dropped polls without flickering; short enough that somebody who has put
 * their phone down is not left looking at a board that says everything is fine.
 *
 * Deliberately a first guess rather than a measurement, and marked as one. The
 * right number is a feel question and the honest way to find it is to play it
 * with the wire actually flapping - so this is a constant with a name, in one
 * place, rather than a `10000` somewhere in a polling loop.
 */
export const OFFLINE_AFTER_MS = 10_000;

/**
 * How often to say nothing in particular.
 *
 * A fifth of the silence that counts as gone, so three can be missed before
 * anybody is called away.
 */
export const PING_EVERY_MS = 2_000;

export interface Transport {
  /** Everything that arrives. Returns a function that stops listening. */
  onMessage(listener: (message: Inbound) => void): () => void;
  /** Connection changes: joining, together, alone, gone. */
  onConnection(listener: (state: Connection) => void): () => void;
  send(message: Outbound): void;
  /** Stop, and tell the other side if there is a way to. */
  close(): void;
  readonly connection: Connection;
}

/**
 * Making one, without saying what it is.
 *
 * Both implementations are reached through this, so `Game.ts` never learns
 * whether the other player is in another tab or another country.
 */
export interface TransportFactory {
  /** Start a room. Returns its id, which becomes the URL. */
  host(settings: RoomSettings, team: TeamOnTheWire): Promise<{ id: string; transport: Transport }>;
  /** Join one. Fails if it is full, gone, or on different physics. */
  guest(id: string, team: TeamOnTheWire): Promise<Transport>;
  /** What a room is set up for, so a guest can be shown what they are
   *  accepting before they accept it. */
  peek(id: string): Promise<{ settings: RoomSettings; host: TeamOnTheWire } | null>;
}
