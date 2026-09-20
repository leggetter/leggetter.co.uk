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
       * What this client's own simulation made of it.
       *
       * Sent so a disagreement can be noticed rather than discovered. The
       * server's answer wins; this one gets logged.
       */
      outcome: Outcome;
      idempotency: string;
    }
  | { kind: 'next' }
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
  | {
      kind: 'shot';
      input: ShotInput;
      taker: string;
      seed: number;
      keeperStartX: number;
      dive: Dive | null;
      outcome: Outcome;
    }
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
