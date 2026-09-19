/**
 * localStorage, behind the same interface as everything else.
 *
 * Brought forward from Phase 4 because the shot log needs to survive a reload
 * to be worth anything. Nothing else about Phase 4 came with it.
 *
 * Every call is wrapped: localStorage throws in private browsing, when the
 * quota is full, and when a site is opened from a file:// URL. A game that
 * cannot remember your best score is a much smaller problem than a game that
 * will not start, so failures degrade to null rather than propagating.
 */

import type { Storage } from './Storage.ts';

export function createLocalStorage(prefix = ''): Storage {
  const backing = (): globalThis.Storage | null => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      const store = backing();
      if (!store) return null;
      try {
        const raw = store.getItem(prefix + key);
        return raw === null ? null : (JSON.parse(raw) as T);
      } catch {
        // Corrupt or hand-edited JSON. Treat it as absent rather than dying.
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      const store = backing();
      if (!store) return;
      try {
        store.setItem(prefix + key, JSON.stringify(value));
      } catch {
        // Over quota. Dropping the write is the right failure here.
      }
    },

    async remove(key: string): Promise<void> {
      try {
        backing()?.removeItem(prefix + key);
      } catch {
        /* nothing useful to do */
      }
    },

    async keys(keyPrefix = ''): Promise<string[]> {
      const store = backing();
      if (!store) return [];
      const found: string[] = [];
      try {
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          if (key === null || !key.startsWith(prefix)) continue;
          const unprefixed = key.slice(prefix.length);
          if (unprefixed.startsWith(keyPrefix)) found.push(unprefixed);
        }
      } catch {
        return [];
      }
      return found;
    },
  };
}
