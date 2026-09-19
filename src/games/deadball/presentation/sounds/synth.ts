/**
 * The default sound set, generated at runtime. The repo ships no audio files.
 *
 * Why synthesis: this repo is public, so committing a sample redistributes it
 * and every one would need a licence permitting that plus a source anyone can
 * check - nothing to get wrong beats a rule to follow. The whole site is text,
 * and a usable crowd loop would be the largest thing in it by an order of
 * magnitude. And everything else here is drawn rather than imported, so sound
 * being the one thing fetched from elsewhere would be the odd decision.
 *
 * The risk, stated where it can be seen: a synthesised crowd can sound cheap,
 * and this one might. It gets judged by listening, not by reasoning. If it
 * loses, a package that ships samples overrides these and inherits the weight
 * and the licence question along with the sounds.
 *
 * The only file in the game that knows what an AudioContext is.
 */

import { BOOT, CROWD, FRAME, GLOVE, NET, WHISTLE } from '../../content/sounds.js';
import type { GameEvent } from '../../core/events.ts';
import type { Mood, SoundSet } from './Sounds.ts';

/** Noise, made once and reused. Generating it per hit was audibly a click. */
function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Deliberately Math.random: this is presentation, nothing downstream of it
  // can be wrong, and it must not be reproducible or every crowd would be the
  // same crowd.
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export interface Synth extends SoundSet {
  /**
   * Start the context. Browsers will not make a sound until the user has
   * interacted, so this is called from the first pointer down and not before.
   */
  unlock(): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}

export function createSynth(): Synth {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;

  // The crowd bed: two noise sources through a lowpass, one steady and one
  // that swells. A murmur is filtered noise; a cheer is the same noise with
  // the filter opened and the gain up, which is why they are one signal path
  // rather than two sounds.
  let bedGain: GainNode | null = null;
  let bedFilter: BiquadFilterNode | null = null;
  let bedSource: AudioBufferSourceNode | null = null;

  const now = (): number => ctx?.currentTime ?? 0;

  /** Ramp a parameter rather than set it, or every change is a click. */
  const ramp = (param: AudioParam, to: number, seconds: number): void => {
    param.cancelScheduledValues(now());
    param.setValueAtTime(param.value, now());
    param.linearRampToValueAtTime(to, now() + seconds);
  };

  function ensure(): boolean {
    if (!ctx) return false;
    if (ctx.state === 'suspended') void ctx.resume();
    return !muted;
  }

  /** One short burst of filtered noise. Every impact in the game is this. */
  function burst(
    spec: { cutoff: number; q: number; decay: number; gain: number; type?: string },
    force: number
  ): void {
    if (!ctx || !master || !noise) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = 0.8 + force * 0.5;

    const filter = ctx.createBiquadFilter();
    filter.type = (spec.type ?? 'bandpass') as BiquadFilterType;
    filter.frequency.value = spec.cutoff;
    filter.Q.value = spec.q;

    const gain = ctx.createGain();
    const level = spec.gain * (0.35 + force * 0.65);
    gain.gain.setValueAtTime(level, now());
    gain.gain.exponentialRampToValueAtTime(0.0001, now() + spec.decay);

    source.connect(filter).connect(gain).connect(master);
    source.start(now());
    source.stop(now() + spec.decay + 0.02);
  }

  /**
   * A struck goal frame rings. Aluminium, so a damped sine with a long tail
   * rather than a noise burst - which is the one impact here that is a pitch
   * and not a thump, and the reason a post is recognisable with your eyes shut.
   */
  function ring(force: number): void {
    if (!ctx || !master) return;
    for (const [i, partial] of FRAME.partials.entries()) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = partial;
      const gain = ctx.createGain();
      const level = (FRAME.gain * (0.4 + force * 0.6)) / (i + 1.6);
      gain.gain.setValueAtTime(level, now());
      gain.gain.exponentialRampToValueAtTime(0.0001, now() + FRAME.decay);
      osc.connect(gain).connect(master);
      osc.start(now());
      osc.stop(now() + FRAME.decay + 0.02);
    }
    // A little contact noise on top, or it reads as a bell rather than a hit.
    burst({ cutoff: 2600, q: 0.7, decay: 0.05, gain: FRAME.gain * 0.5 }, force);
  }

  /** The crowd reacting. Same path as the bed, opened up for a moment. */
  function swell(spec: { cutoff: number; gain: number; attack: number; hold: number; fall: number }): void {
    if (!bedGain || !bedFilter) return;
    const t = now();
    for (const [param, peak, rest] of [
      [bedGain.gain, spec.gain, CROWD.bed.gain],
      [bedFilter.frequency, spec.cutoff, CROWD.bed.cutoff],
    ] as const) {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(peak, t + spec.attack);
      param.setValueAtTime(peak, t + spec.attack + spec.hold);
      param.linearRampToValueAtTime(rest, t + spec.attack + spec.hold + spec.fall);
    }
  }

  return {
    unlock(): void {
      if (ctx) {
        if (ctx.state === 'suspended') void ctx.resume();
        return;
      }
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      noise = makeNoise(ctx, 2);

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      bedSource = ctx.createBufferSource();
      bedSource.buffer = noise;
      bedSource.loop = true;
      bedFilter = ctx.createBiquadFilter();
      bedFilter.type = 'lowpass';
      bedFilter.frequency.value = CROWD.bed.cutoff;
      bedFilter.Q.value = 0.6;
      bedGain = ctx.createGain();
      bedGain.gain.value = CROWD.bed.gain;
      bedSource.connect(bedFilter).connect(bedGain).connect(master);
      bedSource.start();
    },

    setMuted(next: boolean): void {
      muted = next;
      if (master) ramp(master.gain, muted ? 0 : 1, 0.08);
    },

    bed(mood: Mood): void {
      if (!ensure() || !bedGain || !bedFilter) return;
      const spec = CROWD.moods[mood] ?? CROWD.moods.idle;
      ramp(bedGain.gain, spec.gain, spec.seconds);
      ramp(bedFilter.frequency, spec.cutoff, spec.seconds);
    },

    play(event: GameEvent): void {
      if (!ensure()) return;
      const force = event.force ?? 0.6;
      switch (event.kind) {
        case 'boot':
          burst(BOOT, force);
          swell(CROWD.rise);
          break;
        case 'glove':
          burst(GLOVE, force);
          break;
        case 'frame':
          ring(force);
          break;
        case 'net':
          burst(NET, force);
          break;
        case 'resolved':
          // The crowd is the only thing that distinguishes these, which is the
          // point: a goal and a save sound different because of the people, not
          // because of the ball.
          if (event.outcome === 'goal') swell(CROWD.goal);
          else if (event.outcome === 'saved') swell(CROWD.save);
          else swell(CROWD.groan);
          if (event.outcome !== 'goal' && event.outcome !== 'saved') {
            burst(WHISTLE, 0.5);
          }
          break;
      }
    },

    destroy(): void {
      bedSource?.stop();
      void ctx?.close();
      ctx = null;
      master = null;
      bedGain = null;
      bedFilter = null;
      bedSource = null;
    },
  };
}
