/**
 * Pointer input, as a drag gesture.
 *
 * Pointer Events throughout, so mouse, touch and pen are one code path rather
 * than three. This layer knows nothing about football: it reports where a drag
 * started, where it is now, and the path between. Turning that into a shot is
 * the view's job, because only the view knows what the camera is doing.
 */

import type { DragGesture, DragPoint } from '../render/View.ts';

/** Below this, a drag is a click. Stops a stray pixel becoming a limp penalty. */
const MIN_DRAG_PX = 8;

/** Cap on stored path points, so a slow drag cannot grow without bound. */
const MAX_PATH = 120;

export interface DragHandlers {
  onStart?(gesture: DragGesture): void;
  onMove?(gesture: DragGesture): void;
  /** Fired on release after a real drag. */
  onRelease?(gesture: DragGesture): void;
  /** Fired on release when the pointer barely moved. */
  onClick?(point: DragPoint): void;
}

export interface DragInput {
  destroy(): void;
}

export function attachDragInput(
  canvas: HTMLCanvasElement,
  handlers: DragHandlers
): DragInput {
  let gesture: DragGesture | null = null;
  let pointerId: number | null = null;

  const pointFrom = (event: PointerEvent): DragPoint => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const distance = (a: DragPoint, b: DragPoint): number =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const onPointerDown = (event: PointerEvent): void => {
    if (pointerId !== null) return; // ignore a second finger mid-drag
    pointerId = event.pointerId;
    // Keep receiving moves even when the pointer leaves the canvas, or a drag
    // that overshoots the edge would silently stop tracking.
    canvas.setPointerCapture(event.pointerId);

    const point = pointFrom(event);
    gesture = { start: point, current: point, path: [point], active: true };
    handlers.onStart?.(gesture);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!gesture || event.pointerId !== pointerId) return;
    const point = pointFrom(event);
    const path = gesture.path.length < MAX_PATH ? [...gesture.path, point] : gesture.path;
    gesture = { ...gesture, current: point, path };
    handlers.onMove?.(gesture);
  };

  const finish = (event: PointerEvent): void => {
    if (!gesture || event.pointerId !== pointerId) return;
    const point = pointFrom(event);
    const final: DragGesture = { ...gesture, current: point, active: false };

    gesture = null;
    pointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);

    if (distance(final.start, point) < MIN_DRAG_PX) handlers.onClick?.(point);
    else handlers.onRelease?.(final);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  return {
    destroy(): void {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', finish);
      canvas.removeEventListener('pointercancel', finish);
    },
  };
}
