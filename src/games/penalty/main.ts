/**
 * Browser entry point. Imported by src/pages/penalty/index.astro.
 *
 * Picks the player and keeper out of the content files and hands them to the
 * game. Choosing either from the UI is Phase 4; until then this is where the
 * defaults are read.
 */

import { startGame, type Game } from './Game.ts';
import { createMemoryStorage } from './storage/memory.ts';
import { DEFAULT_PLAYER_ID, ROSTER } from './content/players.js';
import { DEFAULT_KEEPER_ID, KEEPERS } from './content/keepers.js';
import type { KeeperProfile, Player } from './core/types.ts';

export async function start(canvas: HTMLCanvasElement): Promise<Game> {
  const player: Player = ROSTER.find((p) => p.id === DEFAULT_PLAYER_ID) ?? ROSTER[0]!;
  const keeper: KeeperProfile = KEEPERS.find((k) => k.id === DEFAULT_KEEPER_ID) ?? KEEPERS[0]!;

  return startGame({
    canvas,
    player,
    keeper,
    // Phase 4 swaps this for the localStorage implementation. Nothing else
    // changes, which is the point of there being an interface at all.
    storage: createMemoryStorage(),
  });
}
