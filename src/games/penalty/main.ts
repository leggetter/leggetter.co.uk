/**
 * Penalty shootout - Phase 0: the harness, not the game.
 *
 * This proves the plumbing the rest of the build sits on, and nothing else:
 * bundled TypeScript reaching an Astro page, a canvas that stays sharp across
 * device pixel ratios and resizes, and a fixed-timestep loop that a
 * deterministic simulation can be dropped into.
 *
 * Nothing here knows anything about football. See docs/penalty-shootout-spec.md
 * for what lands on top of it.
 */

/**
 * Simulation step, in seconds. Fixed rather than frame-derived, because the
 * simulation has to produce the same result from the same input regardless of
 * what the display is doing. That is what makes replays and, later, two-player
 * over the wire possible at all.
 */
export const STEP = 1 / 120;

/**
 * Most steps one frame is allowed to catch up. A backgrounded tab can return
 * with seconds of accumulated time; without a cap it would try to simulate all
 * of it in one frame and lock the page up.
 */
const MAX_STEPS_PER_FRAME = 8;

export interface Harness {
  /** Cancel the loop and release observers. */
  stop(): void;
}

interface Metrics {
  /** Simulation steps run since start. */
  steps: number;
  /** Smoothed frames per second. */
  fps: number;
  /** Drawing surface size in CSS pixels. */
  width: number;
  height: number;
  dpr: number;
  /** Fraction of a step left over, which Phase 1 uses to interpolate. */
  alpha: number;
}

export function start(canvas: HTMLCanvasElement): Harness {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('penalty: 2d canvas context unavailable');

  let width = 0;
  let height = 0;
  let dpr = 1;

  /**
   * Size the backing store to physical pixels but draw in CSS pixels, so every
   * coordinate in the renderers can stay in layout units and still come out
   * sharp on a retina display.
   */
  function fit(): void {
    dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(canvas);
  fit();

  let running = true;
  let frameId = 0;
  let last = performance.now();
  let accumulator = 0;
  let steps = 0;
  let fps = 0;

  function frame(now: number): void {
    if (!running) return;

    // Clamp rather than trust the gap: an alt-tab produces an arbitrarily
    // large one, and the MAX_STEPS cap below would silently eat the rest.
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;

    // Exponential smoothing, so the readout is legible instead of flickering.
    fps += (1 / Math.max(elapsed, 1e-6) - fps) * 0.1;

    accumulator += elapsed;
    let taken = 0;
    while (accumulator >= STEP && taken < MAX_STEPS_PER_FRAME) {
      // Phase 1: step the simulation here.
      accumulator -= STEP;
      steps += 1;
      taken += 1;
    }
    // Hit the cap, so there is a backlog no amount of catching up will clear.
    // Drop it rather than stay permanently behind.
    if (taken === MAX_STEPS_PER_FRAME) accumulator = 0;

    draw({ steps, fps, width, height, dpr, alpha: accumulator / STEP });
    frameId = requestAnimationFrame(frame);
  }

  /**
   * Phase 0 placeholder. Phase 1 replaces this with a call into the selected
   * view, which is the only thing that will be allowed to touch the canvas.
   */
  function draw(m: Metrics): void {
    const c = ctx!;
    c.fillStyle = '#123f1f';
    c.fillRect(0, 0, m.width, m.height);

    c.fillStyle = 'rgba(255, 255, 255, 0.85)';
    c.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    c.textBaseline = 'top';

    const lines = [
      'penalty shootout - phase 0 harness',
      `${Math.round(m.width)} x ${Math.round(m.height)} css px @ ${m.dpr}x`,
      `${m.fps.toFixed(0)} fps`,
      `${m.steps} steps @ ${(1 / STEP).toFixed(0)} hz`,
    ];
    lines.forEach((line, i) => c.fillText(line, 16, 16 + i * 20));
  }

  frameId = requestAnimationFrame(frame);

  return {
    stop(): void {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    },
  };
}
