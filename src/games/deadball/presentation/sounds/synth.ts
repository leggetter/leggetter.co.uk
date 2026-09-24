/**
 * The default sound set, generated at runtime. Nothing here is a file.
 *
 * Why synthesis, still, for the defaults: a synthesised set cannot 404, cannot
 * be the wrong licence, and weighs nothing, so a package that says nothing
 * about sound is never silent and never costs a download. It is the floor, and
 * a floor should have no dependencies.
 *
 * The risk was always that a synthesised crowd sounds cheap, and it got judged
 * by listening rather than by reasoning: `classic` and the stylised package
 * replace the cheer, the bed and the net with the samples in `recorded.ts`,
 * and inherit the weight and the licence paperwork along with them.
 * Everything else they hit is still made here.
 *
 * This file owns the AudioContext. Anything else that needs one asks for
 * `graph()` rather than opening a second - two contexts would be two mutes,
 * and only one of them is wired to the button.
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

/** The context and the one node everything audible passes through. */
export interface AudioGraph {
  ctx: AudioContext;
  /**
   * The master gain. The mute is a ramp on this, so anything that wants to be
   * mutable - a package's samples included - connects here and not to
   * `ctx.destination`.
   */
  master: GainNode;
}

export interface Synth extends SoundSet {
  /**
   * Start the context. Browsers will not make a sound until the user has
   * interacted, so this is called from the first pointer down and not before.
   */
  unlock(): void;
  setMuted(muted: boolean): void;

  /**
   * The shared graph, or null before the first gesture.
   *
   * Exposed so a package that plays its own audio uses this context and this
   * master rather than building a second one. Two contexts would be two
   * mutes, and the second one would not be wired to the button.
   */
  graph(): AudioGraph | null;

  /**
   * Scale the synthesised crowd bed, 0..1, over `seconds`.
   *
   * A scale rather than a mute because the handover has to be gradual: a
   * package shipping its own crowd loop still wants this bed for the seconds
   * before the file has arrived, and wants to walk away from it rather than
   * cut, once it has.
   */
  fadeBed(scale: number, seconds: number): void;

  /**
   * The referee's whistle, on its own.
   *
   * A miss is one event and two reactions - the crowd groans and the official
   * blows up - and a package is entitled to replace the first without
   * replacing the second. Without this the only way to keep the whistle is to
   * keep the groan that comes bundled with it.
   */
  whistle(): void;

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
  /** How much of this bed to use. A package with its own crowd loop takes it
   *  to zero once the file has actually arrived. */
  let bedScale = 1;
  /** Remembered so a scale change lands on the right resting level, and
   *  recorded even while muted, when nothing is ramped at all. */
  let bedMood: Mood = 'idle';

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

  /**
   * A crowd reacting, as a vowel.
   *
   * Noise through two or three resonances is what makes "aaah" rather than a
   * whoosh, which is all the first version of this managed: it opened the bed
   * filter and hoped. A cheer and a groan are the same machinery at different
   * frequencies, which is exactly how a mouth works.
   */
  function voices(spec: {
    formants: number[][];
    glide: number;
    attack: number;
    hold: number;
    release: number;
    gain: number;
    flutter: { rate: number; depth: number };
    air: number;
  }): void {
    if (!ctx || !master || !noise) return;
    const t = now();
    const total = spec.attack + spec.hold + spec.release;

    // One envelope for the whole reaction, with a wobble on it. Thousands of
    // people are never quite together, and without the wobble it is one
    // enormous person.
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.linearRampToValueAtTime(spec.gain, t + spec.attack);
    envelope.gain.setValueAtTime(spec.gain, t + spec.attack + spec.hold);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + total);
    envelope.connect(master);

    const flutter = ctx.createOscillator();
    flutter.frequency.value = spec.flutter.rate;
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = spec.gain * spec.flutter.depth;
    flutter.connect(flutterDepth).connect(envelope.gain);
    flutter.start(t);
    flutter.stop(t + total);

    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;

    for (const pair of spec.formants) {
      const hz = pair[0] ?? 500;
      const q = pair[1] ?? 6;
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.Q.value = q;
      // Sliding the resonances is the difference between a shout and a word.
      // Up for a goal, down for everything else.
      formant.frequency.setValueAtTime(hz, t);
      formant.frequency.linearRampToValueAtTime(hz * spec.glide, t + total);
      source.connect(formant).connect(envelope);
    }

    // Applause and whistling: unshaped and bright, and almost absent from a
    // groan, which is most of what separates delight from disappointment.
    if (spec.air > 0.001) {
      const air = ctx.createBiquadFilter();
      air.type = 'highpass';
      air.frequency.value = 2600;
      const airGain = ctx.createGain();
      airGain.gain.value = spec.air;
      source.connect(air).connect(airGain).connect(envelope);
    }

    source.start(t);
    source.stop(t + total + 0.05);
  }

  /** A swell on the bed itself. Used for the intake at the strike, which is a
   *  sharp breath rather than a word. */
  function swell(spec: { cutoff: number; gain: number; attack: number; hold: number; fall: number }): void {
    if (!bedGain || !bedFilter) return;
    const t = now();
    for (const [param, peak, rest] of [
      [bedGain.gain, spec.gain * bedScale, CROWD.bed.gain * bedScale],
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

    whistle(): void {
      if (!ensure()) return;
      burst(WHISTLE, 0.5);
    },

    graph(): AudioGraph | null {
      return ctx && master ? { ctx, master } : null;
    },

    fadeBed(scale: number, seconds: number): void {
      bedScale = Math.max(0, Math.min(1, scale));
      if (!bedGain) return;
      const spec = CROWD.moods[bedMood] ?? CROWD.moods.idle;
      ramp(bedGain.gain, spec.gain * bedScale, seconds);
    },

    bed(mood: Mood): void {
      bedMood = mood;
      if (!ensure() || !bedGain || !bedFilter) return;
      const spec = CROWD.moods[mood] ?? CROWD.moods.idle;
      ramp(bedGain.gain, spec.gain * bedScale, spec.seconds);
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
          if (event.outcome === 'goal') voices(CROWD.goal);
          else if (event.outcome === 'saved') voices(CROWD.save);
          else {
            voices(CROWD.groan);
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
