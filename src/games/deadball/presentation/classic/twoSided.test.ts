/**
 * Every mode but solo has two sides, and the score line has to know.
 *
 * This exists because of a bug that shipped: `twoSided` was written as a list
 * of the modes that had two sides at the time, `remote` was added to
 * `MatchMode` a long way away, and nothing connected the two. Two-device games
 * then drew the solo score line - one name and `1/10`, with the opponent and
 * both scores simply absent - and suppressed the "X SHOOTING" banner, which is
 * the one thing on screen that says whose turn it is.
 *
 * Nothing failed. There was no test to fail, and a list that is merely
 * incomplete type-checks perfectly.
 *
 * So the rule is asserted against `MatchMode` itself rather than against the
 * modes that happen to exist today: add a fifth mode and this fails until
 * somebody has decided which side of the line it belongs on.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { twoSided } from './draw.ts';
import type { MatchMode } from '../../core/match.ts';
import type { FrameState } from '../../core/types.ts';

/** Every mode there is. Listed once, here, so the compiler polices the rest. */
const EVERY_MODE = ['solo', 'duel', 'versus', 'remote'] as const;

// If a mode is added to MatchMode and not to EVERY_MODE, this stops compiling.
const _exhaustive: readonly MatchMode[] = EVERY_MODE;
type _Covered = Exclude<MatchMode, (typeof EVERY_MODE)[number]> extends never ? true : never;
const _covered: _Covered = true;

const frameIn = (mode: MatchMode): FrameState => ({ mode }) as FrameState;

test('every mode except solo draws two names and two scores', () => {
  for (const mode of EVERY_MODE) {
    assert.equal(
      twoSided(frameIn(mode)),
      mode !== 'solo',
      `${mode} is on the wrong side of twoSided`
    );
  }
});

test('remote in particular, because that is the one that shipped wrong', () => {
  assert.equal(twoSided(frameIn('remote')), true);
  assert.equal(twoSided(frameIn('solo')), false);
});
