import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isTyping } from './typing.ts';

const on = (target: object | null, isComposing = false) => ({ target: target as EventTarget | null, isComposing });

describe('telling typing from a shortcut', () => {
  test('text fields are typing, whatever kind', () => {
    for (const type of ['text', 'search', 'email', 'url', 'tel', 'number', 'password', '', 'TEXT']) {
      assert.equal(isTyping(on({ tagName: 'INPUT', type })), true, `input type="${type}"`);
    }
    assert.equal(isTyping(on({ tagName: 'TEXTAREA' })), true);
    assert.equal(isTyping(on({ tagName: 'SELECT' })), true);
    assert.equal(isTyping(on({ tagName: 'DIV', isContentEditable: true })), true);
  });

  test('controls that take no text are not', () => {
    // The frame scrubber is a range input: F and C must still work on it.
    for (const type of ['range', 'checkbox', 'radio', 'button', 'submit']) {
      assert.equal(isTyping(on({ tagName: 'INPUT', type })), false, `input type="${type}"`);
    }
    assert.equal(isTyping(on({ tagName: 'BUTTON' })), false);
    assert.equal(isTyping(on({ tagName: 'CANVAS' })), false);
    assert.equal(isTyping(on(null)), false);
  });

  test('a key mid-way through composing a character is typing, wherever it lands', () => {
    assert.equal(isTyping(on({ tagName: 'CANVAS' }, true)), true);
  });
});
