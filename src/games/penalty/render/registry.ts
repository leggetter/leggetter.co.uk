/**
 * Which views exist, and which one to use.
 *
 * Adding a camera angle is one entry here plus one file. That is the test of
 * whether the projection boundary held, and it is why Phase 2 is a small phase.
 */

import { BehindTakerView } from './canvas2d/BehindTakerView.ts';
import type { View, ViewFactory } from './View.ts';

export const VIEWS: Record<string, ViewFactory> = {
  'behind-taker': () => new BehindTakerView(),
};

export const DEFAULT_VIEW = 'behind-taker';

export interface ViewChoice {
  id: string;
  label: string;
}

export const listViews = (): ViewChoice[] =>
  Object.entries(VIEWS).map(([id, make]) => ({ id, label: make().label }));

/**
 * Pick a view: an explicit `?view=` wins, then a stored preference, then the
 * default. The URL wins so a particular camera can be linked to directly.
 */
export function resolveViewId(search: string, stored: string | null): string {
  const requested = new URLSearchParams(search).get('view');
  if (requested && requested in VIEWS) return requested;
  if (stored && stored in VIEWS) return stored;
  return DEFAULT_VIEW;
}

export function createView(id: string): View {
  const make = VIEWS[id] ?? VIEWS[DEFAULT_VIEW]!;
  return make();
}
