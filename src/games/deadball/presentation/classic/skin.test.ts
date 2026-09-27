/**
 * A footballer is drawn in the skin tone chosen for them.
 *
 * Every figure used to be one tone. The taker now wears the one on the
 * frame, and everybody else - keepers, the wall, the halfway line - stays in
 * the default until they have a way to be chosen.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SQUAD } from '../../content/players.js';
import { DEFAULT_SKIN } from '../../content/skins.js';
import { spotBall } from '../../core/shot.ts';
import type { FrameState, Player } from '../../core/types.ts';
import { PENALTY_DISTANCE } from '../../core/units.ts';
import { cameraFor, standBehind } from '../cameras.ts';
import { createProjector } from '../toolkit/project.ts';
import { takerColours } from '../toolkit/kits.ts';
import { drawFigure, takerFigure } from './draw.ts';

const spot = spotBall(PENALTY_DISTANCE);
const proj = createProjector(standBehind(cameraFor('behind-taker'), spot), 1280, 800);

/** Only what the taker reads. */
const frame = (takerSkin?: string): FrameState =>
  ({
    spot,
    player: SQUAD[0] as Player,
    phase: 'ready',
    runUp: 0,
    sinceStrike: 0,
    clock: 1,
    aiming: null,
    kits: {},
    mode: 'solo',
    taker: 0,
    ...(takerSkin ? { takerSkin } : {}),
  }) as unknown as FrameState;

/** Every colour anything was stroked or filled with. */
function coloursDrawn(draw: (ctx: CanvasRenderingContext2D) => void): Set<string> {
  const used = new Set<string>();
  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    globalAlpha: 1,
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    closePath() {},
    stroke() { used.add(String(this.strokeStyle)); },
    fill() { used.add(String(this.fillStyle)); },
  };
  draw(ctx as unknown as CanvasRenderingContext2D);
  return used;
}

describe("the taker's skin", () => {
  test('comes with the strip every look dresses the taker in', () => {
    // The 3D look builds its own taker from takerColours, not from classic's
    // takerFigure, and drew everyone in the default until the skin moved here.
    assert.equal(takerColours(frame('#4b2b1b')).skin, '#4b2b1b');
    assert.equal(takerColours(frame()).skin, undefined);
  });

  test('is the tone on the frame', () => {
    const figure = takerFigure(frame('#6b4027'), 1.55);
    assert.equal(figure.skin, '#6b4027');
    const drawn = coloursDrawn((ctx) => drawFigure(ctx, proj, figure));
    assert.ok(drawn.has('#6b4027'), 'the chosen tone was never drawn');
    assert.ok(!drawn.has(DEFAULT_SKIN), 'the default tone was drawn as well');
  });

  test('is the default when nobody chose one', () => {
    const figure = takerFigure(frame(), 1.55);
    assert.equal(figure.skin, undefined);
    assert.ok(coloursDrawn((ctx) => drawFigure(ctx, proj, figure)).has(DEFAULT_SKIN));
  });
});
