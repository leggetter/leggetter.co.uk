/**
 * Copies build-input assets that live outside public/ into public/ so Astro
 * ships them:
 *  - the realtime-web-technologies-guide submodule's images
 *    (replaces the old Jekyll keep_files + copy-images machinery)
 *  - the raw family tree .gen data file, downloadable from
 *    /leggetter-family-tree/ ("Raw Data" section)
 * Runs via the predev/prebuild npm hooks. Destinations are gitignored.
 */

import { cp, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const copies = [
  {
    from: `${root}vendor/realtime-web-technologies-guide/images`,
    to: `${root}public/real-time-web-technologies-guide/images`,
    required: true,
    hint: 'Run: git submodule update --init',
  },
  {
    from: `${root}leggetter-family-tree/0001tree.gen`,
    to: `${root}public/leggetter-family-tree/0001tree.gen`,
    required: true,
  },
];

for (const { from, to, required, hint } of copies) {
  try {
    await access(from);
  } catch {
    const message = `[copy-guide-images] missing ${from}${hint ? ` — ${hint}` : ''}`;
    if (required) {
      console.error(message);
      process.exit(1);
    }
    console.warn(message);
    continue;
  }
  await mkdir(new URL('.', `file://${to}`).pathname, { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`[copy-guide-images] ${from} -> ${to}`);
}
