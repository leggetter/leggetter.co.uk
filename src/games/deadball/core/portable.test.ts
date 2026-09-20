/**
 * `core/` runs anywhere.
 *
 * This is the assumption the whole two-devices plan rests on: the match
 * reducer is pure and platform-free, so the *same file* decides the rules in a
 * browser and on a server, and there is no way for the two to disagree because
 * somebody wrote them twice. See docs/deadball-two-devices.md.
 *
 * It has always been an intention - "no DOM, no canvas, no browser APIs" is
 * written at the top of the module layout - and an intention is not a
 * guarantee. One `performance.now()` for a stopwatch, one `localStorage` read
 * for a preference, and the assumption is quietly false. This makes it fail
 * loudly instead, at the moment it is broken rather than at the moment
 * somebody tries to deploy a Worker.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { KEEPERS } from '../content/keepers.js';
import { SQUAD } from '../content/players.js';
import { NO_EVENTS } from './events.ts';
import { advance, createFlight } from './flight.ts';
import { initialMatch, reduce } from './match.ts';
import { createRng } from './rng.ts';
import { resolveShot, spotBall } from './shot.ts';
import type { KeeperProfile, Player } from './types.ts';
import { PENALTY_DISTANCE } from './units.ts';

const here = new URL('.', import.meta.url);

/** Every non-test source file in `core/`. */
const sources = readdirSync(here)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => ({ name, code: readFileSync(new URL(name, here), 'utf8') }));

/** Comments describe the world; code touches it. Only the code counts. */
const stripped = (code: string): string => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

describe('core runs anywhere', () => {
  test('there are source files to check', () => {
    // Guards the rest: a glob that matched nothing would pass every test below
    // while proving precisely nothing.
    assert.ok(sources.length >= 15, `only found ${sources.length} files in core/`);
  });

  test('nothing in core imports a platform', () => {
    // Not Node, not a bundler asset, not anything outside core/ and content/.
    for (const { name, code } of sources) {
      for (const match of stripped(code).matchAll(/from\s+'([^']+)'/g)) {
        const from = match[1]!;
        assert.ok(
          from.startsWith('./') || from.startsWith('../content/'),
          `${name} imports ${from}, which is outside core/ and content/`
        );
      }
    }
  });

  test('nothing in core reaches for a browser or a Node global', () => {
    const forbidden = [
      'window',
      'document',
      'localStorage',
      'sessionStorage',
      'navigator',
      'performance',
      'requestAnimationFrame',
      'fetch',
      'AudioContext',
      'HTMLCanvasElement',
      'process',
      '__dirname',
      'Buffer',
    ];
    for (const { name, code } of sources) {
      const bare = stripped(code);
      for (const global of forbidden) {
        const used = new RegExp(`\\b${global}\\b\\s*[.(\\[]`).test(bare);
        assert.ok(!used, `${name} uses ${global}, which does not exist on a Worker`);
      }
    }
  });

  test('no wall clock anywhere in core', () => {
    // Determinism depends on this as much as portability does: a shot that
    // reads the clock cannot be replayed, and a replay is how a divergence
    // between two devices would ever be diagnosed.
    for (const { name, code } of sources) {
      const bare = stripped(code);
      assert.ok(!/\bDate\.now\b/.test(bare), `${name} reads Date.now`);
      assert.ok(!/\bnew Date\b/.test(bare), `${name} constructs a Date`);
      assert.ok(!/\bMath\.random\b/.test(bare), `${name} uses Math.random`);
    }
  });

  test('a whole shootout runs with nothing but core', () => {
    // The proof rather than the promise: reducer, physics, keeper and rules,
    // start to finish, using no import that a Worker would not have.
    const player = SQUAD[0] as Player;
    const keeper = KEEPERS[0] as KeeperProfile;
    let match = initialMatch(42, 5, 'solo');

    for (let i = 0; i < 5; i++) {
      const rng = createRng(match.seed + match.shotIndex);
      const shot = resolveShot(
        { aim: { x: 0.4, y: 0.5 }, power: 0.8, curve: 0, lift: 0.5, timing: 0 },
        player,
        rng,
        { origin: spotBall(PENALTY_DISTANCE) }
      );
      let flight = createFlight(shot, keeper, createRng(7 + i), 0, null, NO_EVENTS);
      for (let step = 0; step < 900 && !flight.outcome; step++) {
        flight = advance(flight, 1 / 120, NO_EVENTS);
      }
      assert.ok(flight.outcome, `shot ${i} never resolved`);

      match = reduce(match, { type: 'TAKE_SHOT' });
      match = reduce(match, { type: 'STRIKE' });
      match = reduce(match, { type: 'RESOLVE', outcome: flight.outcome });
      match = reduce(match, { type: 'NEXT' });
    }

    assert.equal(match.phase, 'complete');
    assert.equal(match.outcomes.length, 5);
  });
});
