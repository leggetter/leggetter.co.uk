/**
 * What `classic` wants instead of the default sounds.
 *
 * Six samples, and the shape of the list is the point: the crowd bed, the
 * cheer, the "oooh" of a save and the groan of a miss all come off one
 * afternoon's recording at one ground, by one person, through one microphone.
 * That is why they sit together. A cheer borrowed from a different crowd in a
 * different building always sounds borrowed, however good it is on its own -
 * the reverb tail disagrees with the bed underneath it and the ear hears the
 * edit. The boot and the netting are close-mic'd one-shots where none of that
 * applies, so they come from wherever they were best.
 *
 * What is left synthesised: the glove, the woodwork, and the referee's
 * whistle. Those are impacts and a pitch, which synthesis does honestly and
 * which nothing is gained by fetching.
 *
 * Every sample is CC0. The repo is public, so committing one redistributes it;
 * `public/deadball/sounds/CREDITS.md` records where each came from and under
 * what, which is the evidence the check happened rather than a licence
 * requirement.
 *
 * Three rules hold this together, and all three are about not making the game
 * worse than the synth it replaces:
 *
 *  - Nothing blocks. The files are fetched after the first gesture and the
 *    game is already running by then; until they land, and forever if they
 *    never do, the synth plays.
 *  - Nothing throws. A 404, a decode failure, a browser that will not parse
 *    mp3 - each one ends in the same place, which is the synthesised sound
 *    nobody had to change anything to keep.
 *  - Nothing bypasses the mute. Every node connects to the shared master gain
 *    the mute button ramps, never to `ctx.destination`.
 */

import type { GameEvent } from '../../core/events.ts';
import type { Mood, SoundSet } from '../sounds/Sounds.ts';
import type { AudioGraph, Synth } from '../sounds/synth.ts';

/** Served from `public/`, so these are site-root paths and not imports. */
const DIRECTORY = '/deadball/sounds/';

const FILES = {
  crowd: 'crowd.mp3',
  goal: 'goal.mp3',
  save: 'save.mp3',
  groan: 'groan.mp3',
  boot: 'boot.mp3',
  net: 'net.mp3',
} as const;

type SampleName = keyof typeof FILES;

/**
 * Where the bed sits, per mood.
 *
 * Same idea as the synthesised bed it replaces: the murmur *tightens* rather
 * than gets louder. Almost all of the movement between these is in the cutoff,
 * and a held breath reads as brighter and slightly further away, not bigger.
 */
const BED: Record<Mood, { gain: number; cutoff: number; seconds: number }> = {
  idle: { gain: 0.3, cutoff: 1400, seconds: 1.6 },
  waiting: { gain: 0.34, cutoff: 2600, seconds: 1.2 },
  flight: { gain: 0.32, cutoff: 4200, seconds: 0.25 },
};

/** The intake at the strike: a sharp breath on the bed, not a new sound. */
const RISE = { gain: 0.5, cutoff: 7000, attack: 0.08, hold: 0.1, fall: 0.5 };

/**
 * How loud each one-shot sits against the others.
 *
 * The files are already loudness-matched to each other, so these are relative
 * judgements about the game and not corrections to the recordings: the goal is
 * allowed to be the loudest thing that happens, and the netting is a detail
 * rather than an event.
 */
// The cheer carries a goal on its own, and the replacement file is about 3 dB
// quieter than the one it succeeded, so it needs the headroom back here rather
// than a louder encode. A goal should be the loudest thing in the game.
const LEVEL = { goal: 1, save: 0.8, groan: 0.8, boot: 0.7, net: 0.5 };

/** Long enough that the handover from the synthesised bed is not a cut. */
const HANDOVER = 1.5;

/**
 * mp3 decoding can leave a sliver of encoder padding at either end of the
 * buffer. The loop is seamless in the file; looping just inside the edges is
 * what keeps a decoder's padding from putting a click in it.
 */
const PADDING = 0.04;

/** Force scales an impact, 0..1, the way the synthesised bursts always did. */
const byForce = (level: number, force: number | undefined): number =>
  level * (0.35 + (force ?? 0.6) * 0.65);

interface Bed {
  filter: BiquadFilterNode;
  gain: GainNode;
}

/**
 * The overrides, built around a synth rather than instead of one.
 *
 * A factory and not a constant because these need the context and the master
 * gain, and both belong to the synth - it is the thing the first gesture
 * starts. Holding the synth is also what makes the fallback free: every branch
 * that cannot play a sample calls straight through to the sound that was
 * always there.
 */
export function createOverrides(synth: Synth): Partial<SoundSet> {
  const buffers = new Map<SampleName, AudioBuffer>();
  let requested = false;
  let bed: Bed | null = null;
  let mood: Mood = 'idle';

  const graph = (): AudioGraph | null => {
    const found = synth.graph();
    if (found && found.ctx.state === 'suspended') void found.ctx.resume();
    return found;
  };

  const ramp = (ctx: AudioContext, param: AudioParam, to: number, seconds: number): void => {
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(to, ctx.currentTime + seconds);
  };

  /**
   * Fetch and decode, once, after the context exists.
   *
   * Called from both members rather than from a lifecycle hook of its own,
   * because the first of them to run is the first moment there is a context to
   * decode into, and which one that is depends on what the player did first.
   */
  function request(): void {
    const audio = graph();
    if (requested || !audio) return;
    requested = true;
    for (const [name, file] of Object.entries(FILES) as [SampleName, string][]) {
      void fetch(DIRECTORY + file)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.arrayBuffer();
        })
        .then((bytes) => audio.ctx.decodeAudioData(bytes))
        .then((buffer) => {
          buffers.set(name, buffer);
          if (name === 'crowd') startBed();
        })
        // Deliberately silent. A sample that does not arrive is not an error
        // the player can do anything about, and the synthesised sound it was
        // going to replace is still there.
        .catch(() => {});
    }
  }

  /** Start the sampled bed and walk the synthesised one out from under it. */
  function startBed(): void {
    const audio = graph();
    const buffer = buffers.get('crowd');
    if (!audio || !buffer || bed) return;

    const source = audio.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = PADDING;
    source.loopEnd = Math.max(PADDING * 2, buffer.duration - PADDING);

    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = BED[mood].cutoff;
    filter.Q.value = 0.6;

    const gain = audio.ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter).connect(gain).connect(audio.master);
    source.start();
    bed = { filter, gain };

    ramp(audio.ctx, gain.gain, BED[mood].gain, HANDOVER);
    synth.fadeBed(0, HANDOVER);
  }

  /** One sample, now. False when there is nothing to play it with. */
  function shot(name: SampleName, level: number): boolean {
    const audio = graph();
    const buffer = buffers.get(name);
    if (!audio || !buffer) return false;
    const source = audio.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = audio.ctx.createGain();
    gain.gain.value = level;
    source.connect(gain).connect(audio.master);
    source.start();
    return true;
  }

  /** The swell at the strike, on whichever bed is currently carrying. */
  function rise(): void {
    const audio = graph();
    if (!audio || !bed) return;
    const t = audio.ctx.currentTime;
    const at = mood;
    for (const [param, peak, rest] of [
      [bed.gain.gain, RISE.gain, BED[at].gain],
      [bed.filter.frequency, RISE.cutoff, BED[at].cutoff],
    ] as const) {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(peak, t + RISE.attack);
      param.setValueAtTime(peak, t + RISE.attack + RISE.hold);
      param.linearRampToValueAtTime(rest, t + RISE.attack + RISE.hold + RISE.fall);
    }
  }

  /** What a finished shot sounds like, given how it finished. */
  function resolved(event: GameEvent): void {
    if (event.outcome === 'goal') {
      if (!shot('goal', LEVEL.goal)) synth.play(event);
      return;
    }
    if (event.outcome === 'saved') {
      if (!shot('save', LEVEL.save)) synth.play(event);
      return;
    }
    // A miss is the crowd *and* the official. Taking over the groan is not a
    // reason to swallow the whistle that came bundled with it.
    if (shot('groan', LEVEL.groan)) synth.whistle();
    else synth.play(event);
  }

  return {
    bed(next: Mood): void {
      mood = next;
      request();
      const audio = graph();
      // Before the loop has arrived - and for good, if it never does - this is
      // the synthesised bed's job, and it is still running.
      if (!bed || !audio) {
        synth.bed(next);
        return;
      }
      ramp(audio.ctx, bed.gain.gain, BED[next].gain, BED[next].seconds);
      ramp(audio.ctx, bed.filter.frequency, BED[next].cutoff, BED[next].seconds);
    },

    /**
     * One method for every kind of event, so replacing some of them means
     * naming the rest and handing them back. Not a chore worth removing: the
     * delegation is what the fallback is made of, and it reads as a list of
     * what this package did and did not decide to own.
     */
    play(event: GameEvent): void {
      request();
      switch (event.kind) {
        case 'boot':
          // The swell is on this bed now, so it happens either way - but the
          // synthesised boot brings its own, which is why it is an else.
          if (shot('boot', byForce(LEVEL.boot, event.force))) rise();
          else synth.play(event);
          break;
        case 'net':
          // Force scales it because a ball rolled in and one smashed in are
          // the same event, as the synthesised burst it replaces always knew.
          if (!shot('net', byForce(LEVEL.net, event.force))) synth.play(event);
          break;
        case 'resolved':
          resolved(event);
          break;
        // The glove and the woodwork, still made rather than fetched.
        default:
          synth.play(event);
      }
    },
  };
}
