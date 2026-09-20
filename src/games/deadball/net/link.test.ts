/**
 * The link somebody sends their brother.
 *
 * A query string rather than a path, because this site is static assets and a
 * path segment that is not a file cannot resolve without a server.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { linkTo, roomFrom } from './link.ts';

const at = (href: string) => new URL(href);

describe('making one', () => {
  test('carries the id and nothing else from where you were', () => {
    const link = linkTo('7K2P9XQM', at('https://www.leggetter.co.uk/deadball/?view=keeper#top'));
    assert.equal(link, 'https://www.leggetter.co.uk/deadball/?g=7K2P9XQM');
  });

  test('works from a dev server as well as the real one', () => {
    assert.equal(linkTo('ABCDEFGH', at('http://localhost:4321/deadball/')),
      'http://localhost:4321/deadball/?g=ABCDEFGH');
  });
});

describe('reading one', () => {
  test('an id comes back', () => {
    assert.equal(roomFrom(at('https://x.test/deadball/?g=7K2P9XQM')), '7K2P9XQM');
  });

  test('lower case is accepted, because people retype links', () => {
    assert.equal(roomFrom(at('https://x.test/deadball/?g=7k2p9xqm')), '7K2P9XQM');
  });

  test('no room is null rather than empty', () => {
    assert.equal(roomFrom(at('https://x.test/deadball/')), null);
    assert.equal(roomFrom(at('https://x.test/deadball/?g=')), null);
  });

  test('anything that is not an id is refused', () => {
    // It becomes a channel name and goes on a screen, and it arrives from an
    // address bar anybody can type into.
    for (const bad of ['../../etc', '<script>', 'SHORT', 'TOOLONGFORTHIS', 'ILOU0000']) {
      assert.equal(roomFrom(at(`https://x.test/deadball/?g=${encodeURIComponent(bad)}`)), null, bad);
    }
  });
});
