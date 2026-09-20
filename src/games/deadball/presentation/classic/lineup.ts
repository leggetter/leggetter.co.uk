/**
 * The other twenty, waiting on the halfway line.
 *
 * In a real shootout everybody who is not taking the penalty or keeping goal
 * stands in the centre circle with their arms round each other, watching. It
 * is one of the few things about a shootout that reads instantly, and the
 * pitch has looked empty without it since the far half started being drawn.
 *
 * Presentation only, like the crowd. Nobody here can touch an outcome, none of
 * it is game state, and `core/` does not know they exist.
 *
 * **They are visible from one camera.** The halfway line is 52.5 m from the
 * goal and both of the cameras at the penalty end look the other way, so from
 * behind the taker these twenty are behind you - which is exactly where they
 * are in life. From behind the goal they are the middle distance, which is
 * where a television camera puts them.
 */

import { vec, type Vec3 } from '../../core/vec3.ts';
import { drawFigure } from './draw.ts';
import type { Projector } from './project.ts';
import { PITCH_LENGTH, type Reaction } from './stand.ts';

/** Ten a side, which is the eleven minus whoever is taking it. */
export const PER_TEAM = 10;

/** They stand on the halfway line, because that is where they stand. */
const HALFWAY_Z = -PITCH_LENGTH / 2;

/** Shoulder to shoulder, arms linked. Closer than this and they merge. */
const SPACING = 1.15;

/** Clear of the spot, so the two teams read as two teams. */
const CENTRE_GAP = 2.4;

/** How far out of the ground a celebration takes somebody. */
const JUMP = 0.42;

export interface LineupPerson {
  /** Across the pitch, metres. Negative is the same side the crowd calls left. */
  x: number;
  /** 0 is the taker's team, 1 is the opposition. */
  team: 0 | 1;
  /** Standing height. People are not all one size. */
  height: number;
  /** Build, roughly shoulder width. */
  width: number;
  /** Own phase, so no two sway together. */
  phase: number;
  /** Own delay and amplitude, the same idea as a crowd rising. */
  delay: number;
  amplitude: number;
}

/** Four numbers per person from their index, the same trick the crowd uses. */
function hash(i: number, salt: number): number {
  let h = (i + 1) * 916391711 + salt * 284331269;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Twenty people, built once.
 *
 * Deterministic from the index, so the same person is the same person on every
 * frame and after every resize, with nothing to keep in step.
 */
export function buildLineup(): LineupPerson[] {
  const people: LineupPerson[] = [];

  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < PER_TEAM; i++) {
      const n = team * PER_TEAM + i;
      const side = team === 0 ? -1 : 1;
      // Out from the centre, so the gap in the middle stays the gap whatever
      // the team size, and a shorter line does not drift off toward a corner.
      const along = CENTRE_GAP + i * SPACING + (hash(n, 1) - 0.5) * 0.18;

      people.push({
        x: side * along,
        team: team as 0 | 1,
        height: 1.72 + hash(n, 2) * 0.2,
        width: 0.2 + hash(n, 3) * 0.07,
        phase: hash(n, 4) * Math.PI * 2,
        // Nobody reacts on the whistle. The spread is smaller than the
        // crowd's because twenty people standing together see it at once.
        delay: hash(n, 5) * 0.42,
        amplitude: 0.72 + hash(n, 6) * 0.56,
      });
    }
  }

  return people;
}

/** Kit colours for the two lines. */
export interface LineupKits {
  /** The taker's team. */
  own: { kit: string; trim: string };
  /** Whoever they are playing. */
  other: { kit: string; trim: string };
}

/**
 * The opposition's kit, derived rather than chosen.
 *
 * A fixed second colour would eventually be the same colour as somebody's
 * invented kit, and two teams in one strip is the one thing a football
 * picture must never be. Rotating the hue guarantees a difference for any kit
 * anybody writes, including ones that do not exist yet.
 *
 * Greys and whites have no hue to rotate, so they get a colour outright.
 */
export function opposingKit(kit: string, trim: string): LineupKits {
  const hsl = toHsl(kit);
  const other =
    hsl && hsl.s > 0.18
      ? fromHsl((hsl.h + 0.5) % 1, Math.max(0.5, hsl.s), clamp(hsl.l, 0.34, 0.6))
      : '#b4322e';

  // The opposition's shorts are set against the *other line's shorts*, not
  // against their own shirt. Keyed off the shirt, a blue kit with white shorts
  // put both teams in white and the two lines only differed above the waist.
  const ownTrim = toHsl(trim);
  const other_trim = ownTrim && ownTrim.l > 0.5 ? '#1d1d20' : '#eef2f6';

  return {
    own: { kit, trim },
    other: { kit: other, trim: other_trim },
  };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function toHsl(colour: string): { h: number; s: number; l: number } | null {
  const hex = colour.trim();
  const full =
    /^#[0-9a-f]{3}$/i.test(hex)
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : /^#[0-9a-f]{6}$/i.test(hex)
        ? hex
        : null;
  if (!full) return null;

  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 1 / 6
      ? [c, x, 0]
      : h < 2 / 6
        ? [x, c, 0]
        : h < 3 / 6
          ? [0, c, x]
          : h < 4 / 6
            ? [0, x, c]
            : h < 5 / 6
              ? [x, 0, c]
              : [c, 0, x];
  const byte = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/**
 * How far off the ground somebody is, right now.
 *
 * Only one team celebrates. A goal is the taker's team; anything else is the
 * keeper's, which is the half of a shootout the scoreline never shows.
 */
function lift(person: LineupPerson, reaction: Reaction): number {
  if (reaction.elapsed === null) return 0;
  const celebrating = reaction.scored ? 0 : 1;
  if (person.team !== celebrating) return 0;

  const t = reaction.elapsed - person.delay;
  const duration = 1.1;
  if (t <= 0 || t >= duration) return 0;
  const u = t / duration;
  // Up fast, down slower. Twice, because one hop reads as a stumble.
  const hop = Math.abs(Math.sin(u * Math.PI * 2));
  const fade = 1 - u * 0.45;
  return hop * fade * person.amplitude * reaction.strength * JUMP;
}

/**
 * Twenty figures, arms round each other.
 *
 * The linked arms are the whole silhouette. Twenty people standing separately
 * on a line is a bus queue; the same twenty with a hand on each neighbour's
 * shoulder is a team watching a penalty, and it costs two vectors a person.
 */
export function drawLineup(
  ctx: CanvasRenderingContext2D,
  proj: Projector,
  people: readonly LineupPerson[],
  kits: LineupKits,
  clock: number,
  reaction: Reaction
): void {
  // Furthest across first, so a nearer figure paints over the arm of the one
  // behind them rather than under it.
  const order = [...people.keys()].sort((a, b) => {
    const pa = people[a] as LineupPerson;
    const pb = people[b] as LineupPerson;
    return Math.abs(pb.x) - Math.abs(pa.x);
  });

  for (const index of order) {
    const person = people[index] as LineupPerson;
    const colours = person.team === 0 ? kits.own : kits.other;

    // Weight shifting, not bouncing. They are watching, not warming up.
    const sway = Math.sin(clock * 0.9 + person.phase) * 0.035;
    const breath = Math.sin(clock * 1.35 + person.phase * 1.7) * 0.012;
    const up = lift(person, reaction);

    const x = person.x + sway;
    const feet: Vec3 = vec(x, up, HALFWAY_Z);
    const shoulderY = up + person.height * 0.82 + breath;
    const shoulder: Vec3 = vec(x, shoulderY, HALFWAY_Z);

    // A hand rests on the neighbour's shoulder where there is one, and hangs
    // at their own side at the end of the line.
    const neighbour = (step: -1 | 1): Vec3 => {
      const next = people[index + step];
      const linked = next && next.team === person.team;
      const reach = linked ? SPACING * 0.52 : person.width * 1.5;
      const drop = linked ? 0.04 : 0.3;
      return vec(x + step * reach, shoulderY - drop, HALFWAY_Z + (linked ? 0.12 : 0));
    };

    drawFigure(ctx, proj, {
      feet,
      shoulder,
      head: vec(x, shoulderY + 0.24 + breath * 1.8, HALFWAY_Z),
      hands: [neighbour(-1), neighbour(1)],
      toes: [
        vec(x - person.width * 0.7, up + 0.03, HALFWAY_Z - 0.06),
        vec(x + person.width * 0.7, up + 0.03, HALFWAY_Z + 0.06),
      ],
      kit: colours.kit,
      trim: colours.trim,
    });
  }
}
