/**
 * What `classic` wants instead of the default sounds.
 *
 * Nothing, and that is the case worth having work. A package inherits the
 * whole set unless it says otherwise, so arriving silent is not a thing that
 * can happen by forgetting. `pixel` will fill this in with something chiptune
 * for the crowd and keep the woodwork, which is the point of it being partial.
 */

import type { SoundSet } from '../sounds/Sounds.ts';

export const OVERRIDES: Partial<SoundSet> = {};
