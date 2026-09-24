/**
 * Classic's scoreboard and overlays, borrowed.
 *
 * The one place the stylised package imports another package, and on purpose
 * the only one: `stylised.test.ts` fails if anything else in stylised/ reaches
 * into classic/, or if this file starts borrowing more than the 2D overlays.
 *
 * Why borrow at all: the HUD is several hundred lines of game - whose turn it
 * is, the timing sweep, the keeper's reticle, full time, the handover between
 * two people on one phone - and none of it is what this preview is about. It
 * draws in screen space over whatever is underneath, so it sits over a 3D
 * scene exactly as it sits over classic's, and it projects the aim line with
 * the toolkit's projector, which `camera.ts` makes agree with the 3D camera.
 *
 * Why it is a debt, not a pattern: #72's own rule is that nothing is shared
 * until a second package uses it, and this is the second package using it.
 * The next extraction is the HUD into a library of its own beside `toolkit/`,
 * at which point this file goes.
 */

export {
  drawAim,
  drawAway,
  drawHandover,
  drawHud,
  drawKeepersTurn,
  drawShotDial,
} from '../classic/draw.ts';
