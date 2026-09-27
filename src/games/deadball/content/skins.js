/**
 * Skin tones a footballer can have, light to dark.
 *
 * What the player editor offers as swatches. Like everything in content/,
 * meant to be edited: add a tone, refresh, and it is in the editor. The
 * crowd's own tones are the stand's business and are not these.
 *
 * Nothing here is tuned or sent anywhere as a number. A player's chosen tone
 * travels with the player to the other device, and a device that does not
 * recognise it still draws it, because it is a colour and not a name.
 */

/** @type {readonly string[]} */
export const SKINS = ['#f6d7c3', '#eabf9f', '#d9a07a', '#c4865b', '#a86d42', '#8a5634', '#6b4027', '#4b2b1b'];

/** Anybody who has not chosen, and every figure that is not a footballer you picked. */
export const DEFAULT_SKIN = '#d9a07a';
