/**
 * Where anything that outlives a page load goes.
 *
 * Async even though localStorage is not. That costs a little awkwardness now
 * and saves a rewrite of every call site later: two-player needs a shared
 * store, a shared store is over the network, and a network store is async. The
 * interface is the cheap half of that decision, so it is made now.
 *
 * Keys are namespaced `deadball:v1:*`, and the version in the key is the schema, not
 * the game. See schema.ts for how it moves.
 */

import type { KitOverrides } from '../core/types.ts';

export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

/**
 * Renamed from `ps:` (penalty shootout) when the game became Dead Ball, since
 * free kicks are coming and it was never going to be only penalties. Anything
 * already stored under the old prefix is not read: that is a shot log from
 * before the physics was retuned several times over, which a replay could not
 * have used anyway.
 */
export const NAMESPACE = 'deadball:v1:';

export const key = (...parts: string[]): string => NAMESPACE + parts.join(':');

/** Keys the game reads and writes. Kept together so nothing invents one. */
export const KEYS = {
  settings: key('settings'),
  profile: key('profile'),
  stats: key('stats'),
  customRoster: key('roster', 'custom'),
} as const;

export interface Settings {
  /** Which camera the player last used. */
  viewId?: string;
  /**
   * What the two people in the last duel were called, so nobody retypes them
   * every game.
   *
   * Local, like the rest of this store: it is read by the page it was typed on
   * and by nothing else. Names are kept out of the shot log on purpose, which
   * is the file that leaves the device - see core/names.ts.
   */
  duelNames?: [string, string];
  /**
   * What your side is called against the computer.
   *
   * Stored apart from `duelNames` on purpose. A duel asks for two people in a
   * room; this asks for a team. Sharing one slot meant naming your team and
   * then finding it in a person's place on the two-player scoreboard.
   */
  teamName?: string;
  /**
   * What you have decided to call the computer's side, when you have said.
   *
   * An override rather than the name itself: absent means the taker profile's
   * own name, which is the real one - Phase 4.5 gives different AI teams
   * different abilities, and this field must not freeze a name onto one of
   * them. Cleaned on the way in and on the way out, like every other name
   * here, because this store is a browser console away from holding anything.
   */
  opponentTeam?: string;
  /**
   * What the four strips have been set to, where anything has been.
   *
   * Overrides, for the same reason `opponentTeam` is one: every key is absent
   * until somebody changes that strip, and absent means the derived default -
   * your side from the roster player, theirs from the away colour, a keeper
   * strip each. Phase 4.5 brings AI teams with kits of their own, and a colour
   * stored today must not freeze onto one of them.
   *
   * Cleaned on the way out as well as in. This store is a browser console away
   * from holding anything, and a colour goes straight into `ctx.fillStyle`,
   * which ignores what it cannot parse *silently* - so a bad one does not
   * throw, it draws the figure in whoever's colour was set last.
   */
  kits?: KitOverrides;
  /** Which presentation package was last used. */
  packageId?: string;
  /** Sound off. Stored, because having to mute it every visit is worse than
   *  having to unmute it once. */
  muted?: boolean;
  /** Day, dusk or night. */
  skyId?: string;
  /** Who is taking the penalties. */
  playerId?: string;
}
