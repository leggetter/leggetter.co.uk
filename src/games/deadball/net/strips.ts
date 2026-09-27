/**
 * What each side of a two-device shootout is wearing: the strip they chose.
 *
 * Each device sends its side's outfield strip when it joins, and the room
 * hands both back in every state. Nothing read them. Each phone dressed the
 * two sides from its own Kits instead, so you saw your friend in whatever you
 * had set as "Theirs", and they saw you in theirs. Now both phones dress each
 * side in the strip that side chose.
 *
 * In shootout order - whoever shoots first, then the other - because that is
 * how the drawing already tells the sides apart (`awayTaking`), and because
 * it is the same order on both devices. That matters when the two strips
 * clash: the drawing adjusts the second one, and both phones have to adjust
 * the same one or they would disagree about who is wearing what.
 *
 * Undefined until both sides are known, and for anything that is not a
 * colour: the drawing then falls back to this device's own Kits, as before.
 */

import { cleanColour } from '../core/squad.ts';
import type { Side, TeamOnTheWire } from './Transport.ts';

export interface Strip {
  kit: string;
  trim: string;
}

const strip = (team: TeamOnTheWire | undefined): Strip | null => {
  const kit = cleanColour(team?.kit?.kit, '');
  const trim = cleanColour(team?.kit?.trim, '');
  return kit && trim ? { kit, trim } : null;
};

export function shootoutStrips(
  teams: readonly [TeamOnTheWire, TeamOnTheWire],
  first: Side
): [Strip, Strip] | undefined {
  const firstUp = strip(teams[first]);
  const second = strip(teams[(1 - first) as Side]);
  return firstUp && second ? [firstUp, second] : undefined;
}
