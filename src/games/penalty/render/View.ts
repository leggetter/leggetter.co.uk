/**
 * The boundary between the simulation and anything that draws it.
 *
 * A view may read a FrameState and may turn a drag into player intent. It gets
 * no reference to the match, the flight or the RNG, so no renderer can ever
 * change the result of a shot. Adding a camera angle, or the pixel art look
 * later, is one file plus one line in the registry; if either needs a change
 * under core/, this boundary was drawn in the wrong place.
 */

import type { FrameState, ShotInput } from '../core/types.ts';

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

export interface ViewContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface View {
  readonly id: string;
  readonly label: string;

  mount(context: ViewContext): void;

  /** Width and height in CSS pixels; the context is already DPR-scaled. */
  resize(width: number, height: number): void;

  /** Draw one frame. Must not mutate what it is given. */
  render(frame: FrameState): void;

  /**
   * Turn a drag into player intent.
   *
   * This lives on the view because a drag means different things under
   * different projections: 100 pixels right is a different shot when the
   * camera is square to the goal than when it is angled to it. Putting the
   * mapping anywhere else would force the input layer to know about cameras.
   */
  aimFromDrag(gesture: DragGesture): ShotInput;

  destroy(): void;
}

export type ViewFactory = () => View;
