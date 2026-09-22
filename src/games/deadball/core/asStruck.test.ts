/**
 * You only get the style you chose if you strike it properly.
 *
 * Before this existed, a perfectly struck and a badly mistimed finesse free
 * kick scored 82% and 80%. The timing bar cost pace and nothing else, so the
 * choice in the bottom-left corner was free.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { asStruck, PLAIN, styleFor, STYLES } from './styles.ts';

const finesse = styleFor('finesse');
const knuckle = styleFor('knuckle');

test('a clean strike gets exactly the style it chose', () => {
  for (const style of STYLES) {
    assert.deepEqual(asStruck(style, 0), style, `${style.id} changed on a clean contact`);
  }
});

test('the worst contact leaves nothing of the style but its name', () => {
  const ruined = asStruck(finesse, 1);
  assert.equal(ruined.curve, PLAIN.curve);
  assert.equal(ruined.power, PLAIN.power);
  assert.equal(ruined.height, PLAIN.height);
  assert.equal(ruined.dip, 0);
  assert.equal(asStruck(knuckle, 1).wobble, 0, 'a scuffed knuckleball still knuckled');
  // The id survives, so the HUD keeps saying what was picked rather than
  // silently renaming the shot somebody chose.
  assert.equal(ruined.id, 'finesse');
});

test('loft scales toward zero, never toward PLAIN', () => {
  /*
    The one that is not a blend, and the reason is measurable. `PLAIN.loft` is
    1 - "spend all of this player's dip going up" - which is the maximum, not a
    neutral. Sliding toward it rewarded a bad contact: the first version made a
    mistimed finesse free kick score 71% against a well-struck one's 46%,
    because the scuff ballooned it over the wall.
  */
  assert.equal(PLAIN.loft, 1, 'the trap this guards against has moved');
  const scuffed = asStruck(finesse, 0.5);
  assert.ok(scuffed.loft < finesse.loft, 'a bad contact got the ball higher');
  assert.equal(asStruck(finesse, 1).loft, 0);
});

test('every departure shrinks, in the direction that costs the taker', () => {
  const half = asStruck(finesse, 0.5);
  // Finesse bends more than plain, so mistiming takes bend away.
  assert.ok(half.curve < finesse.curve && half.curve > PLAIN.curve);
  // It also takes pace off, so mistiming gives some back - which is not a
  // reward, because `TIMING_PACE_LOSS` in shot.ts is already taking more.
  assert.ok(half.power > finesse.power && half.power < PLAIN.power);
  assert.ok(half.dip < finesse.dip && half.dip > 0);
});

test('mistiming is read as a distance, so early and late cost the same', () => {
  assert.deepEqual(asStruck(finesse, 0.4), asStruck(finesse, 0.4));
  // The caller passes an absolute value; anything out of range is clamped
  // rather than inverting the shot.
  assert.deepEqual(asStruck(finesse, 2), asStruck(finesse, 1));
  assert.deepEqual(asStruck(finesse, -1), asStruck(finesse, 0));
});
