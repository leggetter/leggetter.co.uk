/**
 * Browser entry point. Imported by src/pages/deadball/index.astro.
 *
 * Picks the keeper out of the content files and hands it to the game, along
 * with a default player for a first visit. Choosing a player is now done in
 * the game itself; choosing a keeper is still Phase 4's unfinished half.
 */

import { startGame, type Game } from './Game.ts';
import { createLocalStorage } from './storage/local.ts';
import { DEFAULT_PLAYER_ID, ROSTER } from './content/players.js';
import { DEFAULT_KEEPER_ID, KEEPERS } from './content/keepers.js';
import type { KeeperProfile, Player } from './core/types.ts';

export async function start(canvas: HTMLCanvasElement): Promise<Game> {
  // Only a starting point now: the game reads a stored choice over this, and
  // the picker changes it at runtime. Kept so a first visit has somebody.
  const player: Player = ROSTER.find((p) => p.id === DEFAULT_PLAYER_ID) ?? ROSTER[0]!;
  const keeper: KeeperProfile = KEEPERS.find((k) => k.id === DEFAULT_KEEPER_ID) ?? KEEPERS[0]!;

  const game = await startGame({
    canvas,
    player,
    keeper,
    storage: createLocalStorage(),
  });

  // Press L to save the shot log. The discoverable way is the button in the
  // settings dialog; this stays because it costs nothing and it is already in
  // the fingers of the people who have been reading the files.
  window.addEventListener('keydown', (event) => {
    if (event.key === 'l' || event.key === 'L') game.log.download();
  });

  // A console handle, for poking at the log without saving a file.
  // Nothing is sent anywhere; see telemetry/log.ts.
  Object.defineProperty(window, 'penaltyLog', { value: game.log, configurable: true });

  return game;
}
