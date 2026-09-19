import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { tuningFingerprint } from './tuning.ts';

describe('tuning fingerprint', () => {
  test('is stable across calls', () => {
    assert.equal(tuningFingerprint(), tuningFingerprint());
  });

  test('is eight hex characters', () => {
    assert.match(tuningFingerprint(), /^[0-9a-f]{8}$/);
  });

  test('is what it is today', () => {
    // A literal, not a value computed from the thing under test, or this
    // passes forever and says nothing.
    //
    // Not a number worth defending on its merits. It is here so that changing
    // the physics shows up as a deliberate edit to this line, rather than as
    // replays that quietly stop matching the shots they came from. If it fails
    // and you meant to retune: update it, and know that every shot logged
    // before now replays under different physics. If you did not mean to
    // retune, something moved that should not have.
    assert.equal(tuningFingerprint(), 'aea33c58', 'the physics changed');
  });

  test('notices a constant moving', () => {
    // The fingerprint is only worth anything if it actually changes. Hashing
    // the same list with one number nudged must not collide.
    const bump = (values: readonly number[]) => {
      let hash = 0x811c9dc5;
      for (const value of values) {
        for (const char of value.toPrecision(12)) {
          hash ^= char.charCodeAt(0);
          hash = Math.imul(hash, 0x01000193);
        }
      }
      return (hash >>> 0).toString(16).padStart(8, '0');
    };
    assert.notEqual(bump([9.81, 0.25]), bump([9.81, 0.26]));
    assert.notEqual(bump([9.81, 0.25]), bump([9.8, 0.25]));
    assert.equal(bump([9.81, 0.25]), bump([9.81, 0.25]));
  });
});
