/**
 * What the shot log says about how somebody plays.
 *
 * One implementation, two readers: the full-time screen renders this, and the
 * offline script prints it. Writing "what happened" twice would produce two
 * answers that disagreed within a week.
 *
 * Pure functions over records. No DOM, no storage, no canvas.
 */

import type { Outcome } from '../core/types.ts';
import type { ShotRecord } from './log.ts';

export interface Summary {
  shots: number;
  goals: number;
  /** 0..1, or null when there is nothing to divide by. */
  rate: number | null;
  outcomes: Partial<Record<Outcome, number>>;

  timing: {
    clean: number;
    cleanRate: number | null;
    scuffedRate: number | null;
  };

  sides: {
    left: number;
    right: number;
    centre: number;
    /** Shots that went the same way as the one before. */
    repeats: number;
    repeatRate: number | null;
  };

  keeper: {
    saves: number;
    /** Crossed beyond where the keeper could physically have got to. */
    outOfReach: number;
  };

  /** Ranked observations worth showing a player. Most interesting first. */
  notes: string[];
}

const rate = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null);
const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** Shots below this and a percentage is noise dressed up as a finding. */
const MIN_FOR_A_NOTE = 4;

export function summarise(records: ShotRecord[]): Summary {
  const shots = records.length;
  const goals = records.filter((r) => r.outcome === 'goal').length;

  const outcomes: Partial<Record<Outcome, number>> = {};
  for (const r of records) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;

  const clean = records.filter((r) => r.input.timing === 0);
  const scuffed = records.filter((r) => r.input.timing !== 0);

  const side = (r: ShotRecord): number => (Math.abs(r.input.aim.x) <= 0.15 ? 0 : Math.sign(r.input.aim.x));
  let repeats = 0;
  for (let i = 1; i < records.length; i++) {
    if (side(records[i]!) !== 0 && side(records[i]!) === side(records[i - 1]!)) repeats += 1;
  }

  const summary: Summary = {
    shots,
    goals,
    rate: rate(goals, shots),
    outcomes,
    timing: {
      clean: clean.length,
      cleanRate: rate(clean.filter((r) => r.outcome === 'goal').length, clean.length),
      scuffedRate: rate(scuffed.filter((r) => r.outcome === 'goal').length, scuffed.length),
    },
    sides: {
      left: records.filter((r) => side(r) < 0).length,
      right: records.filter((r) => side(r) > 0).length,
      centre: records.filter((r) => side(r) === 0).length,
      repeats,
      repeatRate: rate(repeats, Math.max(0, shots - 1)),
    },
    keeper: {
      saves: outcomes.saved ?? 0,
      outOfReach: records.filter(
        (r) => r.keeperEnvelope !== undefined && Math.abs(r.crossing.x) > r.keeperEnvelope
      ).length,
    },
    notes: [],
  };

  summary.notes = observations(summary, records);
  return summary;
}

/**
 * Things worth telling the player, best first.
 *
 * Each has a threshold, and a note that fires on three shots is a coincidence
 * being reported as a habit. The point of these is to teach the mechanics
 * without a tutorial, and to say out loud that the game is watching where you
 * shoot before a keeper ever starts reading it.
 */
function observations(s: Summary, records: ShotRecord[]): string[] {
  const notes: { weight: number; text: string }[] = [];
  const frame = (s.outcomes.post ?? 0) + (s.outcomes.bar ?? 0);
  const missed = frame + (s.outcomes.wide ?? 0) + (s.outcomes.over ?? 0);

  // Where they shoot. The one the pattern-reading keeper will punish later.
  const lopsided = Math.max(s.sides.left, s.sides.right);
  if (s.shots >= MIN_FOR_A_NOTE && lopsided / s.shots >= 0.7) {
    const way = s.sides.right > s.sides.left ? 'right' : 'left';
    notes.push({
      weight: 10,
      text: `You went ${way} ${lopsided} times out of ${s.shots}. A keeper will notice that before you do.`,
    });
  }

  if (s.shots >= 6 && (s.sides.repeatRate ?? 0) >= 0.66) {
    notes.push({
      weight: 6,
      text: `You picked the same side as your last shot ${s.sides.repeats} times. Mixing it up is free.`,
    });
  }

  // Whether the sweep is landing.
  const { cleanRate, scuffedRate, clean } = s.timing;
  if (clean >= MIN_FOR_A_NOTE && cleanRate !== null && scuffedRate !== null) {
    if (cleanRate - scuffedRate >= 0.2) {
      notes.push({
        weight: 9,
        text: `Clean strikes went in ${pct(cleanRate)} of the time. Scuffed ones ${pct(scuffedRate)}.`,
      });
    }
  }
  if (s.shots >= MIN_FOR_A_NOTE && clean / s.shots >= 0.8) {
    notes.push({ weight: 4, text: `${clean} of ${s.shots} struck cleanly. The timing is not your problem.` });
  } else if (s.shots >= MIN_FOR_A_NOTE && clean / s.shots <= 0.35) {
    notes.push({
      weight: 8,
      text:
        clean === 0
          ? `Not one of your ${s.shots} was struck cleanly. Wait for the green before you let go.`
          : `Only ${clean} of ${s.shots} were struck cleanly. Wait for the green before you let go.`,
    });
  }

  // What actually stopped them.
  if (missed > s.keeper.saves && missed >= 2) {
    notes.push({
      weight: 7,
      text: `The frame beat you more often than the keeper did: ${missed} off target, ${s.keeper.saves} saved.`,
    });
  }

  // Whether the keeper was ever really in it.
  if (s.shots >= MIN_FOR_A_NOTE && s.keeper.outOfReach / s.shots >= 0.5) {
    notes.push({
      weight: 5,
      text: `${s.keeper.outOfReach} of ${s.shots} were placed beyond what the keeper could reach.`,
    });
  }

  // Power, which nobody ever varies.
  const full = records.filter((r) => r.input.power > 0.95).length;
  if (s.shots >= 6 && full / s.shots >= 0.6) {
    notes.push({ weight: 3, text: `Nearly every shot was hit flat out. Placement beats power here.` });
  }

  return notes
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((n) => n.text);
}

/**
 * The two halves of the full-time screen.
 *
 * Kept separate because they answer different questions. The five shots just
 * taken are what the player remembers; the lifetime numbers are where a habit
 * is visible at all, and five shots can never show one.
 */
export interface FullTime {
  match: Summary;
  lifetime: Summary;
  /** Present only for a duel. Null for solo, where there are no two sides. */
  duel: DuelSummary | null;
}

/**
 * A duel, read as the contest it is.
 *
 * `Summary` answers "how do you play", which is the right question for one
 * person and the wrong one for two: every rate in it averages two different
 * people into a player who does not exist, and the notes address that player
 * as "you". Ten shots split five and five is also too few for any of the habit
 * findings to mean anything.
 *
 * So this asks the only questions a duel raises. Who scored more of theirs,
 * and who kept better - the second being the half the scoreline never shows,
 * because a keeper's work is only visible as shots the other person failed to
 * score.
 */
export interface DuelSummary {
  /** In side order: index 0 took the first shot. */
  sides: [SideSummary, SideSummary];
}

export interface SideSummary {
  taking: {
    shots: number;
    goals: number;
    rate: number | null;
    clean: number;
  };
  keeping: {
    /** Shots faced that reached the line: a save is only possible on those. */
    faced: number;
    saves: number;
    rate: number | null;
    /**
     * Mean distance from the corner they picked to where the ball actually
     * crossed, in meters, over the shots that got there.
     *
     * Measured rather than bucketed into right-way and wrong-way. A keeper who
     * picks the correct side and misses the height by a meter has not read it,
     * and a side-based count would score that identically to a save.
     */
    meanPick: number | null;
  };
}

const mean = (xs: number[]): number | null =>
  xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

export function summariseDuel(records: ShotRecord[]): DuelSummary {
  const duel = records.filter((r) => r.mode === 'duel');

  const side = (who: 0 | 1): SideSummary => {
    const took = duel.filter((r) => r.takerSide === who);
    const goals = took.filter((r) => r.outcome === 'goal').length;

    // Everything the other one took is a shot this side was in goal for. Only
    // the ones that reached the line could have been saved, so a keeper is not
    // credited for the other player putting it over the bar.
    const kept = duel.filter((r) => r.takerSide !== who);
    const onTarget = kept.filter((r) => r.outcome === 'goal' || r.outcome === 'saved');
    const saves = onTarget.filter((r) => r.outcome === 'saved').length;

    return {
      taking: {
        shots: took.length,
        goals,
        rate: rate(goals, took.length),
        clean: took.filter((r) => r.input.timing === 0).length,
      },
      keeping: {
        faced: onTarget.length,
        saves,
        rate: rate(saves, onTarget.length),
        meanPick: mean(
          onTarget
            .filter((r) => r.keeperDive !== null)
            .map((r) => Math.hypot(r.crossing.x - r.keeperDive!.x, r.crossing.y - r.keeperDive!.y))
        ),
      },
    };
  };

  return { sides: [side(0), side(1)] };
}

/** Just the shots from one shootout. */
export const forMatch = (records: ShotRecord[], matchSeed: number): ShotRecord[] =>
  records.filter((r) => r.matchSeed === matchSeed);
