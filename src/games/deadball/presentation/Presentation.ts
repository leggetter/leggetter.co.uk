/**
 * The boundary between the simulation and everything that presents it.
 *
 * A presentation package is a whole look, sound included: how the pitch is drawn,
 * how many people are in the stand, when each one of them stands up, and what
 * a post sounds like. None of that is game data, none of it can change an
 * outcome, and all of it is a matter of taste another package is entitled to
 * answer differently.
 *
 * Called presentation rather than render because the whole point of the split
 * is that a package owns its sound as well as its drawing. Naming it after the
 * drawing would send the next person looking for somewhere else to put a noise.
 *
 * Named for what it is rather than how it is built - `classic` now, `pixel`
 * later. WebGL is a technique and not a look, and a package that wants it can
 * use it without that appearing here.
 *
 * A package may read a FrameState and may turn a drag into player intent. It
 * gets no reference to the match, the flight or the RNG, so nothing that draws
 * can ever change the result of a shot. If a package needs a change under
 * `core/`, this boundary was drawn in the wrong place.
 *
 * Packages do share code, but only as libraries a package opts into, never
 * as layers every package is pushed through:
 *
 * - `toolkit/` - the jointed body, the poses, what each figure is doing, the
 *   drag mapping, who wears which strip. A pixel package would never touch
 *   the skeleton, and nothing makes it.
 * - `sounds/` - the synth, and the recorded samples and moods layered over it.
 *   Classic and the stylised package both take all of it, so they sound
 *   exactly the same; a package wanting its own voice takes less, or
 *   overrides it.
 *
 * Nothing goes into either until a second package actually uses it (#72).
 *
 * Packages do not import each other, with one exception while `stylised` is a
 * preview: it borrows classic's 2D scoreboard and overlays through a single
 * file, `stylised/hud.ts`, which a test holds to exactly that. Moving the HUD
 * into a library of its own is the next extraction, not a pattern.
 *
 * Not the crowd, though: an interface answering "where is person 412 and how
 * high" is a call per person per frame, which is precisely the shape a WebGL
 * crowd exists to avoid. Two packages drawing crowds differently is two
 * crowds; two packages computing an outcome differently is a bug, and only one
 * of those is worth an abstraction.
 */

import type { GameEvent } from '../core/events.ts';
import type { Dive, FrameState, ShotInput } from '../core/types.ts';
import type { CameraSpec } from './cameras.ts';
import type { SoundSet } from './sounds/Sounds.ts';

export interface DragPoint {
  x: number;
  y: number;
}

export interface DragGesture {
  /** Where the press landed, in CSS pixels relative to the canvas. */
  start: DragPoint;
  current: DragPoint;
  /**
   * Sampled path from press to now. Needed because curve comes from how much
   * the drag was hooked away from a straight line, which the endpoints alone
   * cannot tell you.
   */
  path: DragPoint[];
  active: boolean;
}

export interface PresentationContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface Presentation {
  readonly id: string;
  readonly label: string;

  mount(context: PresentationContext): void;

  /**
   * Camera and canvas size both change the projection, so both arrive here.
   * Called on a resize and on a camera change, and cheap enough to be.
   */
  configure(camera: CameraSpec, width: number, height: number): void;

  /**
   * Draw one frame, and react to whatever happened since the last one.
   *
   * The events arrive here rather than being fetched, so there is one owner and
   * nothing is left in the list between frames. A package uses them for the
   * crowd and for sound alike: a cheer and a stand rising are one event with
   * two responses, and keeping them in one place is what stops them drifting.
   *
   * Must not mutate what it is given.
   */
  render(frame: FrameState, events: readonly GameEvent[]): void;

  /**
   * Turn a drag into player intent.
   *
   * This lives on the package because a drag means different things under
   * different projections: 100 pixels right is a different shot when the
   * camera is square to the goal than when it is angled to it. Putting the
   * mapping anywhere else would force the input layer to know about cameras.
   */
  aimFromDrag(gesture: DragGesture): ShotInput;

  /**
   * Where on the goal a pointer is pointing, for a keeper choosing a dive.
   *
   * Here for the same reason the drag mapping is: only the projection knows
   * what a screen position means in the world. Null when the pointer is not
   * looking at the goal plane at all.
   */
  diveFromPointer(point: DragPoint): Dive | null;

  /**
   * Sounds this package wants instead of the defaults, if any.
   *
   * Partial on purpose. Inheriting the shared set is what stops a new package
   * arriving silent, and overriding part of it is what lets a package have its
   * own voice without reinventing a crowd. A package with nothing to say here
   * omits it entirely.
   */
  sounds?(): Partial<SoundSet>;

  /**
   * Start making noise. Called from the first pointer down and not before,
   * because browsers will not start audio until the user has interacted and
   * there is nothing to hear about before then anyway.
   */
  unlock(): void;

  setMuted(muted: boolean): void;

  /**
   * Day, dusk or night.
   *
   * On the package rather than on the game, because what time it is is a
   * question about how the thing looks. A package that drew a scoreboard and
   * nothing else would be entitled to ignore it.
   */
  setSky(id: string): void;

  destroy(): void;
}

export type PresentationFactory = () => Presentation;
