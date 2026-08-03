/**
 * Generates the Cloudflare Pages `_redirects` file into the build output.
 * Every URL the Jekyll site served a post at gets a real 301 to the post's
 * new /blog/{slug}/ home, and the old jekyll-paginate /pageN/ URLs map to
 * the new /page/N/ scheme. Invoked from astro.config.mjs on astro:build:done.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { oldLocalUrls, postPath, isExternalPermalink } from './urls.mjs';

const BLOG_DIR = fileURLToPath(new URL('../content/blog/', import.meta.url));
const OLD_LAST_PAGE = 19; // jekyll-paginate emitted /page2/../page19/

export async function collectPosts() {
  const files = (await readdir(BLOG_DIR)).filter((f) => /\.(md|markdown)$/.test(f));
  const posts = [];
  for (const file of files) {
    const raw = await readFile(path.join(BLOG_DIR, file), 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) throw new Error(`No front matter in ${file}`);
    const fm = parseYaml(match[1]);
    posts.push({ id: file, fm });
  }
  return posts;
}

export async function buildRedirectMap() {
  const posts = await collectPosts();
  const redirects = new Map();
  for (const { id, fm } of posts) {
    const target = postPath(id);
    for (const oldUrl of oldLocalUrls({
      id,
      permalink: fm.permalink,
      date: fm.date,
      categories: fm.categories,
    })) {
      if (redirects.has(oldUrl) && redirects.get(oldUrl) !== target) {
        throw new Error(`Old URL ${oldUrl} maps to both ${redirects.get(oldUrl)} and ${target}`);
      }
      redirects.set(oldUrl, target);
    }
  }
  for (let n = 2; n <= OLD_LAST_PAGE; n++) {
    redirects.set(`/page${n}/`, `/page/${n}/`);
    redirects.set(`/page${n}`, `/page/${n}/`);
  }
  return redirects;
}

function encodePath(p) {
  return p
    .split('/')
    .map((seg) => encodeURIComponent(seg).replace(/%2F/gi, '/'))
    .join('/');
}

export async function writeRedirects(outDir) {
  const redirects = await buildRedirectMap();
  const lines = [...redirects.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([from, to]) => `${encodePath(from)} ${to} 301`);
  const dir = outDir instanceof URL ? fileURLToPath(outDir) : outDir;
  const file = path.join(dir, '_redirects');
  await writeFile(file, `${lines.join('\n')}\n`);
  console.log(`[redirects] wrote ${lines.length} 301s to ${file}`);
}
