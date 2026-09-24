/**
 * Is this key press somebody typing, rather than a shortcut?
 *
 * Every keyboard shortcut on the page asks this first. The old L-to-save-the-log
 * shortcut did not, so naming a player "Lionel" saved the log. A shortcut is a
 * letter, and letters are what people type into the naming form, the invite
 * and the squad editor.
 *
 * Read from the element's tag and type rather than `instanceof`, so it can be
 * tested without a browser.
 */

/** Inputs that take no text, so a letter pressed on one is not typing. */
const NOT_TEXT = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

interface KeyLike {
  target: EventTarget | null;
  /** Mid-way through an IME composition, where every key is part of a character. */
  isComposing?: boolean;
}

export function isTyping(event: KeyLike): boolean {
  if (event.isComposing) return true;
  const element = event.target as { tagName?: string; type?: string; isContentEditable?: boolean } | null;
  const tag = element?.tagName?.toUpperCase();
  if (!tag) return false;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NOT_TEXT.has((element!.type || 'text').toLowerCase());
  return element!.isContentEditable === true;
}
