/**
 * What the game has looked like since Phase 1: a drawn pitch, drawn figures,
 * and synthesised sound.
 *
 * One implementation for every camera. This was three classes - one per angle -
 * which were identical but for a camera constant and two booleans, and the
 * duplication was invisible until a second package made it three copies to keep
 * in step rather than one. The cameras are now data in `../cameras.ts` and this
 * is told which one it is looking through.
 */

import type { GameEvent } from '../../core/events.ts';
import type { Dive, FrameState, ShotInput } from '../../core/types.ts';
import type { CameraSpec } from '../cameras.ts';
import type {
  DragGesture,
  DragPoint,
  Presentation,
  PresentationContext,
} from '../Presentation.ts';
import { createSynth, type Synth } from '../sounds/synth.ts';
import { withOverrides } from '../sounds/Sounds.ts';
import type { Mood, SoundSet } from '../sounds/Sounds.ts';
import { dragToShot } from './aim.ts';
import { OVERRIDES } from './sounds.ts';
import { createProjector, type Projector } from './project.ts';
import { drawScene } from './scene.ts';

export class ClassicPresentation implements Presentation {
  readonly id = 'classic';
  readonly label = 'Classic';

  private ctx!: CanvasRenderingContext2D;
  private camera: CameraSpec | null = null;
  // The default set with this package's overrides layered over it. Classic has
  // none, which is the case worth having work: a package that says nothing
  // about sound is not a silent package.
  private readonly synth: Synth = createSynth();
  private readonly sound: SoundSet = withOverrides(this.synth, OVERRIDES);
  private mood: Mood | null = null;
  private projector: Projector | null = null;
  private width = 0;
  private height = 0;

  mount(context: PresentationContext): void {
    this.ctx = context.ctx;
  }

  configure(camera: CameraSpec, width: number, height: number): void {
    this.camera = camera;
    this.width = width;
    this.height = height;
    this.projector = createProjector(camera, width, height);
  }

  render(frame: FrameState, events: readonly GameEvent[]): void {
    if (!this.projector || !this.camera) return;
    for (const event of events) this.sound.play(event);

    // Called on a change rather than every frame, so a package is free to
    // cross-fade at its own pace without being interrupted sixty times a
    // second by the same instruction.
    const mood = moodOf(frame.phase);
    if (mood !== this.mood) {
      this.mood = mood;
      this.sound.bed(mood);
    }
    drawScene(this.ctx, this.projector, frame, this.width, this.height, {
      fromBehindTheGoal: this.camera.fromBehindTheGoal,
    });
  }

  aimFromDrag(gesture: DragGesture): ShotInput {
    return dragToShot(gesture, this.width, this.height, {
      mirrored: this.camera?.mirrored ?? false,
    });
  }

  /** The goal sits on the plane z = 0, which is all the unprojection needs. */
  diveFromPointer(point: DragPoint): Dive | null {
    return this.projector?.toPlane(point.x, point.y, 0) ?? null;
  }

  /** Browsers make no sound until the user has touched something. */
  unlock(): void {
    this.synth.unlock();
    if (this.mood) this.sound.bed(this.mood);
  }

  setMuted(muted: boolean): void {
    this.synth.setMuted(muted);
  }

  destroy(): void {
    this.synth.destroy();
  }
}

/** What the crowd is doing, given what the game is doing. */
function moodOf(phase: string): Mood {
  if (phase === 'flight') return 'flight';
  if (phase === 'ready' || phase === 'runup') return 'waiting';
  return 'idle';
}
