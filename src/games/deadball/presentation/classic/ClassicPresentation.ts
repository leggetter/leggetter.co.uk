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
import {
  buildAtlas,
  buildCrowd,
  crowdPixelHeight,
  drawCrowd,
  renderBackdrop,
  type CrowdAtlas,
  type Person,
  type Reaction,
} from './stand.ts';
import { createOverrides } from './sounds.ts';
import { createProjector, type Projector } from './project.ts';
import { drawScene } from './scene.ts';

export class ClassicPresentation implements Presentation {
  readonly id = 'classic';
  readonly label = 'Classic';

  private ctx!: CanvasRenderingContext2D;
  private camera: CameraSpec | null = null;
  // The default set with this package's overrides layered over it. Classic
  // replaces the cheer, the crowd bed and the net with samples and inherits
  // the rest, which is the case worth having work: owning part of the sound
  // should not mean reinventing all of it. The overrides are built around the
  // synth rather than beside it, so anything they cannot play - a file that
  // has not arrived, or never will - falls through to what was always there.
  private readonly synth: Synth = createSynth();
  private readonly sound: SoundSet = withOverrides(this.synth, createOverrides(this.synth));
  private mood: Mood | null = null;

  // Built once. The positions never change; only the offsets do.
  private readonly people: Person[] = buildCrowd();
  private atlas: CrowdAtlas | null = null;
  /** The stand and hoardings, rendered once per size and camera. */
  private backdrop: HTMLCanvasElement | null = null;
  private reaction: Reaction = { elapsed: null, from: 0, strength: 0 };
  private lastClock = 0;
  /**
   * Asked for no animation. Read once at construction rather than per frame,
   * and not watched for changes: somebody who turns this on mid-shootout can
   * reload, and a listener would be more machinery than the case deserves.
   */
  private readonly still =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
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

    // Both are expensive and neither changes between frames, so they are built
    // here - on a resize or a camera change - and blitted after that.
    // A camera looking away from the stand gets neither.
    if (camera.fromBehindTheGoal) {
      this.backdrop = null;
      this.atlas = null;
      return;
    }
    this.backdrop = renderBackdrop(this.projector, width, height);
    this.atlas = buildAtlas(crowdPixelHeight(this.projector));
  }

  render(frame: FrameState, events: readonly GameEvent[]): void {
    if (!this.projector || !this.camera) return;
    for (const event of events) {
      this.sound.play(event);
      // A cheer and a stand rising are one event with two responses, which is
      // why they are set off in the same loop: there is nothing keeping them
      // in step because there is nothing to keep in step.
      if (event.kind === 'resolved') this.react(event.outcome, frame.ball.position.x);
    }

    // Presentation time, not simulation time: the crowd keeps reacting while
    // the ball is settling and the frame clock is the only thing still moving.
    const dt = Math.max(0, Math.min(0.1, frame.clock - this.lastClock));
    this.lastClock = frame.clock;
    const running = this.reaction.elapsed;
    if (running !== null) {
      // Cleared once every jump has finished, so nothing keeps recomputing a
      // lift that is zero for every person in the stand.
      const next = running + dt;
      this.reaction = { ...this.reaction, elapsed: next > 4 ? null : next };
    }

    // Called on a change rather than every frame, so a package is free to
    // cross-fade at its own pace without being interrupted sixty times a
    // second by the same instruction.
    const mood = moodOf(frame.phase);
    if (mood !== this.mood) {
      this.mood = mood;
      this.sound.bed(mood);
    }
    const atlas = this.atlas;
    // Captured after the guard above, so the closure below does not have to
    // re-narrow it on every frame.
    const projector: Projector = this.projector;
    drawScene(this.ctx, projector, frame, this.width, this.height, {
      fromBehindTheGoal: this.camera.fromBehindTheGoal,
      backdrop: this.backdrop,
      crowd: atlas
        ? () =>
            drawCrowd(
              this.ctx,
              projector,
              this.people,
              atlas,
              frame.clock,
              this.reaction,
              this.still
            )
        : null,
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

  /**
   * Set the stand off.
   *
   * A save lifts fewer people than a goal and a miss lifts fewer still, which
   * is most of what tells the three apart without reading the scoreline. The
   * ball's crossing point seeds the spread, so the reaction starts near where
   * it went and travels outward.
   */
  private react(outcome: string | undefined, crossingX: number): void {
    const strength = outcome === 'goal' ? 1 : outcome === 'saved' ? 0.55 : 0.3;
    this.reaction = {
      elapsed: 0,
      from: Math.max(-1, Math.min(1, crossingX / 6)),
      strength,
    };
  }

  /** Browsers make no sound until the user has touched something. */
  unlock(): void {
    this.synth.unlock();
    // Unconditional now, where it used to wait for a mood to have been set.
    // This is the first legal moment there is an AudioContext, and a package
    // that fetches samples wants to start doing it here rather than a frame
    // or two later when the phase happens to change.
    this.sound.bed(this.mood ?? 'idle');
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
