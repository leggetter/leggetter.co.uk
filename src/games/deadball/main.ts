/**
 * Browser entry point. Imported by src/pages/deadball/index.astro.
 *
 * Picks the player and keeper out of the content files and hands them to the
 * game. Choosing either from the UI is Phase 4; until then this is where the
 * defaults are read.
 */

import { startGame, type Game } from './Game.ts';
import { createLocalStorage } from './storage/local.ts';
import { DEFAULT_PLAYER_ID, ROSTER } from './content/players.js';
import { DEFAULT_KEEPER_ID, KEEPERS } from './content/keepers.js';
import type { KeeperProfile, Player } from './core/types.ts';

export async function start(canvas: HTMLCanvasElement): Promise<Game> {
  const player: Player = ROSTER.find((p) => p.id === DEFAULT_PLAYER_ID) ?? ROSTER[0]!;
  const keeper: KeeperProfile = KEEPERS.find((k) => k.id === DEFAULT_KEEPER_ID) ?? KEEPERS[0]!;

  const game = await startGame({
    canvas,
    player,
    keeper,
    storage: createLocalStorage(),
  });

  // Press L to save the shot log. Deliberately a key rather than a button:
  // it keeps the pitch clean, and nothing about the game depends on it.
  window.addEventListener('keydown', (event) => {
    if (event.key === 'l' || event.key === 'L') game.log.download();
  });

  // A console handle, for poking at the log without saving a file.
  // Nothing is sent anywhere; see telemetry/log.ts.
  Object.defineProperty(window, 'penaltyLog', { value: game.log, configurable: true });

  return game;
}
