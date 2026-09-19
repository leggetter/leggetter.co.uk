/**
 * The shot log: one record per penalty, kept on this device.
 *
 * Tuning this game by feel does not scale past one person's opinion. Five
 * numbers decide whether it is fun - how often people score, where they aim,
 * how well they time the release, how much curve they actually use, and which
 * keeper style beats them - and none of them can be guessed from watching one
 * player take five penalties.
 *
 * **Nothing here is transmitted.** Records are written to this browser's
 * localStorage and go nowhere until somebody presses L and chooses to send the
 * file. No network call, no analytics endpoint, no identifiers beyond a random
 * per-session string that exists only to tell one sitting from another. The
 * page has PostHog on it like every page on the site; this deliberately does
 * not use it, because a log worth analysing is a log nobody has to think about
 * before letting their kids play.
 */

import type { KeeperStyle, Outcome, ShotInput } from '../core/types.ts';
import { key, type Storage } from '../storage/Storage.ts';

export const LOG_KEY = key('log', 'shots');

/** Kept per device. Roughly a hundred shootouts, and a few hundred KB. */
const MAX_RECORDS = 600;

export interface ShotRecord {
  /** Wall clock, ISO. Only used for ordering and for spotting a long session. */
  at: string;
  /** Random per page load. Distinguishes sittings, identifies nobody. */
  session: string;

  playerId: string;
  keeperId: string;
  viewId: string;

  /** With shotIndex, enough to replay the shot exactly. */
  matchSeed: number;
  shotIndex: number;

  /** Exactly what the player did. */
  input: ShotInput;

  outcome: Outcome;
  flightSeconds: number;
  /** Where the ball crossed the line, meters. */
  crossing: { x: number; y: number };

  /** How the keeper went, and where it ended up. */
  keeperStyle: KeeperStyle;
  keeperHands: { x: number; y: number };
  /**
   * How far from centre the keeper could have reached on this shot, in meters:
   * dive speed times the flight, plus reach. Stored rather than recomputed,
   * because working it out later needs the keeper's profile, and profiles get
   * edited. A record should still mean what it meant when it was written.
   */
  keeperEnvelope: number;
  /** Where along the line the keeper was standing at contact. */
  keeperStartX: number;

  viewport: { width: number; height: number };
}

export interface ShotLog {
  record(entry: ShotRecord): void;
  all(): ShotRecord[];
  clear(): void;
  /** Pretty-printed JSON, for pasting or saving. */
  toJSON(): string;
  /** Hand the browser a file to save. */
  download(): void;
}

export async function createShotLog(storage: Storage, session: string): Promise<ShotLog> {
  // Loaded once and held in memory; writes go back through storage but reads
  // never do, so a full log cannot slow the frame that finishes a shot.
  let records = (await storage.get<ShotRecord[]>(LOG_KEY)) ?? [];
  if (!Array.isArray(records)) records = [];

  const persist = (): void => {
    void storage.set(LOG_KEY, records);
  };

  const toJSON = (): string =>
    JSON.stringify({ session, exportedAt: new Date().toISOString(), records }, null, 2);

  return {
    record(entry) {
      records.push(entry);
      if (records.length > MAX_RECORDS) records = records.slice(-MAX_RECORDS);
      persist();
    },

    all: () => [...records],

    clear() {
      records = [];
      persist();
    },

    toJSON,

    download() {
      const blob = new Blob([toJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `penalty-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking immediately can cancel the save in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
  };
}

/** A throwaway id for this page load. Not stored, not stable, not a user. */
export const newSessionId = (): string =>
  Math.floor(Math.random() * 0xffffffff).toString(36) + Date.now().toString(36);
