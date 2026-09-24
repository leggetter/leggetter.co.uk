/**
 * Somebody playing classic never downloads three.js.
 *
 * The bundler splits a module into a chunk of its own only when everything
 * reaches it through `import()`. One ordinary import of the stylised package,
 * or of three.js, from anywhere the page loads up front, and it is folded into
 * the page's own chunk and every classic player pays for it. That mistake
 * makes no error and no visible difference, so this walks the page's static
 * imports - the same graph the bundler follows - and fails if it can reach
 * either.
 *
 * The production build is checked by hand as well, and recorded on the pull
 * request: which chunk three.js lands in, and that the classic page never
 * requests it.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const deadball = resolve(here, '..');
const page = resolve(deadball, '../../pages/deadball/index.astro');

/** Comments describe the world; code touches it. Only the code counts. */
const stripped = (code: string): string => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

/** Static imports and re-exports only. `import()` is exactly what is allowed. */
const staticImports = (code: string): string[] =>
  [...stripped(code).matchAll(/(?:^|[\s;])(?:import|export)\s[^;]*?\sfrom\s+'([^']+)'|(?:^|[\s;])import\s+'([^']+)'/gm)].map(
    (m) => (m[1] ?? m[2])!
  );

function resolveFile(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.js`, `${base}/index.ts`]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      try {
        readFileSync(candidate);
        return candidate;
      } catch {
        // A directory: keep looking.
      }
    }
  }
  return null;
}

/** Every module the page loads up front, and every bare package any of them imports. */
function walk(): { files: Set<string>; packages: Map<string, string> } {
  const files = new Set<string>();
  const packages = new Map<string, string>();
  // The page's own script, which is where the game is started from.
  const script = [...readFileSync(page, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const queue: [string, string][] = staticImports(script).map((spec) => [page, spec]);
  while (queue.length > 0) {
    const [from, spec] = queue.pop()!;
    if (!spec.startsWith('.')) {
      packages.set(spec, relative(deadball, from));
      continue;
    }
    const file = resolveFile(from, spec);
    if (!file || files.has(file)) continue;
    files.add(file);
    for (const next of staticImports(readFileSync(file, 'utf8'))) queue.push([file, next]);
  }
  return { files, packages };
}

describe('the page, before anybody picks a look', () => {
  const { files, packages } = walk();

  test('reaches the game at all', () => {
    // Guards the rest: a walk that found nothing would pass everything below.
    assert.ok(files.has(resolve(deadball, 'main.ts')), 'main.ts was not reached');
    assert.ok(files.has(resolve(here, 'registry.ts')), 'the registry was not reached');
    assert.ok(files.has(resolve(here, 'classic/ClassicPresentation.ts')), 'classic was not reached');
  });

  test('never imports three.js', () => {
    for (const [name, from] of packages) {
      assert.ok(name !== 'three' && !name.startsWith('three/'), `${from} imports ${name}`);
    }
  });

  test('never imports the stylised package', () => {
    for (const file of files) {
      assert.ok(!relative(here, file).startsWith('stylised'), `${relative(deadball, file)} is loaded up front`);
    }
  });

  test('and the registry does reach it, by import()', () => {
    const registry = stripped(readFileSync(resolve(here, 'registry.ts'), 'utf8'));
    assert.match(registry, /import\(\s*'\.\/stylised\/StylisedPresentation\.ts'\s*\)/);
  });
});
