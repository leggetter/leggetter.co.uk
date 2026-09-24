/**
 * The toolkit is a library packages opt into, not a layer they sit on.
 *
 * Phase 4 of #72 moved the skeleton and the poses out of `classic` so the
 * stylised package could use them too. The rule that made that a move rather
 * than a rewrite is the one that has to keep holding: **the toolkit imports
 * only from itself, `core/` and `content/`, and nothing from any package.** If
 * a toolkit file ever reaches into `classic/` or `stylised/`, the two packages
 * are no longer two users of a library, they are one package in two
 * directories.
 *
 * Nor from the contract around the packages - `Presentation.ts`, `cameras.ts`,
 * the registry. The toolkit is below all of that. Where it needs the shape of
 * something defined there (a drag, a camera) it declares the part it reads,
 * and the real thing satisfies it structurally.
 *
 * Tests are held to the same rule, with Node's own modules allowed on top.
 * This replaces the separate checks body/ and pose/ each carried while they
 * lived inside `classic`, which asked the same question of one directory each.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const deadball = resolve(here, '../..');

/** Every .ts file under the toolkit, with its path relative to the toolkit. */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

const files = walk(here).map((path) => ({
  path,
  name: relative(here, path),
  test: path.endsWith('.test.ts'),
  code: readFileSync(path, 'utf8'),
}));

/** Comments describe the world; code touches it. Only the code counts. */
const stripped = (code: string): string => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

const importsOf = (code: string): string[] =>
  [...stripped(code).matchAll(/(?:from\s+|import\s*\(\s*)'([^']+)'/g)].map((m) => m[1]!);

/** Which top-level area of the game an import lands in: `toolkit`, `core`, `classic`... */
function areaOf(from: string, importer: string): string {
  const target = resolve(dirname(importer), from);
  const inside = relative(deadball, target);
  if (inside.startsWith('..')) return 'outside the game';
  const parts = inside.split(sep);
  if (parts[0] === 'presentation') {
    if (parts[1] === 'toolkit') return 'toolkit';
    return `presentation/${parts[1]}`;
  }
  return parts[0]!;
}

describe('the toolkit stands on its own', () => {
  test('there are files to check', () => {
    // A walk that found nothing would pass everything below while proving nothing.
    assert.ok(files.filter((f) => !f.test).length >= 10, `only found ${files.length} files`);
    assert.ok(files.some((f) => f.name.startsWith(`body${sep}`)), 'body/ was not found');
    assert.ok(files.some((f) => f.name.startsWith(`pose${sep}`)), 'pose/ was not found');
  });

  test('it imports only from itself, core/ and content/', () => {
    const allowed = new Set(['toolkit', 'core', 'content']);
    for (const file of files) {
      for (const from of importsOf(file.code)) {
        if (file.test && from.startsWith('node:')) continue;
        assert.ok(from.startsWith('.'), `${file.name} imports the package ${from}`);
        const area = areaOf(from, file.path);
        assert.ok(allowed.has(area), `${file.name} imports ${from}, which is in ${area}`);
      }
    }
  });

  test('it never touches a canvas, a GPU or the page', () => {
    for (const file of files.filter((f) => !f.test)) {
      assert.doesNotMatch(
        stripped(file.code),
        /\b(document|window|CanvasRenderingContext2D|HTMLCanvasElement|WebGLRenderingContext|requestAnimationFrame|AudioContext)\b/,
        `${file.name} reaches for the browser`
      );
    }
  });

  test('doing/ stands apart from the skeleton', () => {
    // "What is it doing" is for every package, including ones with no bodies:
    // a pixel package picks a sprite from it. So it may not pull the skeleton
    // in behind it; the poses build on it, not the other way round.
    const doing = files.filter((f) => f.name.startsWith(`doing${sep}`));
    assert.ok(doing.length >= 1, 'doing/ was not found');
    for (const file of doing) {
      for (const from of importsOf(file.code)) {
        assert.doesNotMatch(from, /\/(body|pose)\//, `${file.name} imports ${from}`);
      }
    }
  });

  test('the check can see a bad import', () => {
    // The rule above is only as good as `areaOf`, so it is checked against
    // the three mistakes it exists to catch.
    const importer = join(here, 'pose', 'kick.ts');
    assert.equal(areaOf('../../classic/draw.ts', importer), 'presentation/classic');
    assert.equal(areaOf('../../Presentation.ts', importer), 'presentation/Presentation.ts');
    assert.equal(areaOf('../../../core/vec3.ts', importer), 'core');
    assert.equal(areaOf('../body/skeleton.ts', importer), 'toolkit');
  });
});
