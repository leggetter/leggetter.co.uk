/**
 * Where anything that outlives a page load goes.
 *
 * Async even though localStorage is not. That costs a little awkwardness now
 * and saves a rewrite of every call site later: two-player needs a shared
 * store, a shared store is over the network, and a network store is async. The
 * interface is the cheap half of that decision, so it is made now.
 *
 * Keys are namespaced `ps:v1:*`, and the version in the key is the schema, not
 * the game. See schema.ts for how it moves.
 */

export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

export const NAMESPACE = 'ps:v1:';

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
}
