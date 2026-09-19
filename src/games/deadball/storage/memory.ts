/**
 * In-memory storage. Forgets everything on reload.
 *
 * What Phase 1 runs on, and what tests run on. The localStorage implementation
 * arrives in Phase 4 and has to satisfy the same interface, which is the only
 * reason this exists rather than the game reaching for localStorage directly.
 */

import type { Storage } from './Storage.ts';

export function createMemoryStorage(seed: Record<string, unknown> = {}): Storage {
  const store = new Map<string, unknown>(Object.entries(seed));

  return {
    async get<T>(key: string): Promise<T | null> {
      return store.has(key) ? (store.get(key) as T) : null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async remove(key: string): Promise<void> {
      store.delete(key);
    },
    async keys(prefix = ''): Promise<string[]> {
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    },
  };
}
