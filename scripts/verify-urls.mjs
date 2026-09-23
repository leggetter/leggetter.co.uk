/**
 * Post-build verification: every legacy URL 301s to a page that exists,
 * every expected route was emitted, and no legacy cruft leaked into dist/.
 * Run after `npm run build` via `npm run verify`.
 */

import { readFile, access, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRedirectMap, collectPosts } from '../src/lib/redirects.mjs';
import { postPath } from '../src/lib/urls.mjs';
import { HIDDEN_PATHS } from '../src/lib/hidden.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL: ${msg}`);
};

async function exists(urlPath) {
  // /foo/ -> dist/foo/index.html ; /foo.xml -> dist/foo.xml
  const rel = urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath;
  try {
    await access(path.join(dist, decodeURIComponent(rel)));
    return true;
  } catch {
    return false;
  }
}

// --- 1. redirect map: sources absent, targets present, no chains ----------
const redirects = await buildRedirectMap();
for (const [from, to] of redirects) {
  if (!to.startsWith('/blog/') && !to.startsWith('/page/')) {
    fail(`unexpected redirect target ${from} -> ${to}`);
  }
  if (redirects.has(to)) fail(`redirect chain: ${from} -> ${to} -> ${redirects.get(to)}`);
  if (to.startsWith('/blog/') && !(await exists(to))) {
    fail(`redirect target missing in dist: ${from} -> ${to}`);
  }
}

// --- 2. the emitted _redirects file matches the map -----------------------
const redirectsFile = await readFile(path.join(dist, '_redirects'), 'utf8');
const fileLines = redirectsFile.trim().split('\n');
if (fileLines.length !== redirects.size) {
  fail(`_redirects has ${fileLines.length} lines, expected ${redirects.size}`);
}
for (const line of fileLines) {
  if (!/^\S+ \S+ 301$/.test(line)) fail(`malformed _redirects line: ${line}`);
}

// --- 3. every post page exists; slugs unique ------------------------------
// Drafts are built (reviewable on a preview URL) but unlisted, so the count
// guard tracks published posts only and is unaffected by drafts in flight.
const posts = await collectPosts();
const drafts = posts.filter(({ fm }) => fm.draft);
const published = posts.filter(({ fm }) => !fm.draft);
if (published.length !== 186) {
  fail(`expected 186 published posts, found ${published.length}`);
}
const slugs = new Set();
let externalCount = 0;
for (const { id, fm } of posts) {
  const p = postPath(id);
  if (slugs.has(p)) fail(`duplicate slug ${p}`);
  slugs.add(p);
  if (!(await exists(p))) fail(`post page missing: ${p} (${id})`);
  if (/^https?:\/\//.test(fm.permalink ?? '')) externalCount += 1;
}
console.log(
  `posts: ${published.length} published + ${drafts.length} draft, ` +
    `ex-external "link posts" now local: ${externalCount}`
);

// --- 4. expected static routes --------------------------------------------
const expected = [
  '/',
  '/rss.xml',
  '/sitemap-index.xml',
  '/aaarrrp/',
  '/blog/',
  '/talks/',
  '/talks/hackference-2013/',
  '/talks/realtime-web-apps-in-the-wild.html',
  '/about-phil-leggetter/',
  '/contact-me/',
  '/mygoffice/',
  '/iss/',
  '/leggetter-family-tree/',
  '/leggetter-family-tree/view/',
  '/leggetter-family-tree/0001tree.gen',
  '/real-time-web-technologies-guide/',
  '/real-time-web-technologies-guide/developer-tools/',
  '/real-time-web-technologies-guide/realtime-data-sources/',
  '/real-time-web-technologies-guide/realtime-hosted-service-latency/',
  '/real-time-web-technologies-guide/realtime-web-technology-transport-mechanisms/',
  '/real-time-web-technologies-guide/images/', // submodule images copied in
  '/images/1500x500-loveism.jpeg',
  '/wp-content/uploads/2012/11/mygoffice-1024x613.jpg',
  '/favicon.ico',
];
for (let n = 2; n <= Math.ceil(published.length / 10); n++) expected.push(`/page/${n}/`);
for (const p of expected) {
  const rel = p.endsWith('/') && !p.endsWith('.gen') ? p : p;
  const target = p.endsWith('/')
    ? p === '/real-time-web-technologies-guide/images/'
      ? 'dir'
      : 'page'
    : 'file';
  if (target === 'dir') {
    try {
      const entries = await readdir(path.join(dist, rel));
      if (entries.length === 0) fail(`empty dir ${p}`);
    } catch {
      fail(`missing dir ${p}`);
    }
  } else if (!(await exists(p))) {
    fail(`missing route ${p}`);
  }
}

// --- 5. guide TOC anchors resolve -----------------------------------------
const guideHtml = await readFile(
  path.join(dist, 'real-time-web-technologies-guide/index.html'),
  'utf8'
);
for (const anchor of ['hosted-services', 'hosted-client', 'self-hosted', 'websocket-client-libraries']) {
  if (!guideHtml.includes(`name="${anchor}"`) && !guideHtml.includes(`id="${anchor}"`)) {
    fail(`guide anchor #${anchor} missing`);
  }
}
if (!/<h\d id="[^"]+"><a href="#/.test(guideHtml)) {
  fail('legacy heading anchor ids missing from guide');
}

// --- 6. no legacy cruft in emitted HTML -----------------------------------
const grep = (pattern) => {
  try {
    return execFileSync('grep', ['-rl', pattern, dist, '--include=*.html'], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return []; // grep exits 1 on no matches
  }
};
// Patterns match the old layout's actual loader code, not incidental mentions
// of these tools inside historical post content.
for (const pattern of [
  '/skel/assets',
  'src="/js/jquery',
  'font-awesome',
  'dropotron',
  'disqus.com/embed',
  'disqus_shortname',
  'google-analytics.com/analytics.js',
  'googletagmanager.com',
  'UA-513034',
]) {
  // Old static one-off pages (public/talks, public/pusher, ...) are exempt —
  // they are preserved verbatim. Only the Astro-rendered pages must be clean.
  const hits = grep(pattern).filter(
    (f) =>
      !f.includes('/talks/') &&
      !f.includes('/pusher/') &&
      !f.includes('/gis/') &&
      !f.includes('/stackoverflow/') &&
      !f.includes('/wp-content/') &&
      !f.includes('/pres/')
  );
  if (hits.length > 0) fail(`legacy reference "${pattern}" in: ${hits.slice(0, 3).join(', ')}`);
}

const posthogHits = grep('posthog.init');
if (posthogHits.length === 0) fail('PostHog snippet missing from rendered pages');

// --- 7. drafts are built but unlisted -------------------------------------
// The whole point of `draft: true` is that the page exists and nothing points
// at it. Assert both halves, or the flag is decoration.
if (drafts.length > 0) {
  const feed = await readFile(path.join(dist, 'rss.xml'), 'utf8');
  const blogIndex = await readFile(path.join(dist, 'blog/index.html'), 'utf8');
  const home = await readFile(path.join(dist, 'index.html'), 'utf8');
  const sitemapFiles = (await readdir(dist)).filter((f) => /^sitemap.*\.xml$/.test(f));
  const sitemaps = (
    await Promise.all(sitemapFiles.map((f) => readFile(path.join(dist, f), 'utf8')))
  ).join('\n');

  for (const { id } of drafts) {
    const p = postPath(id);
    if (!(await exists(p))) fail(`draft page not built: ${p}`);
    const html = await readFile(path.join(dist, `${p}index.html`), 'utf8');
    if (!/<meta name="robots" content="noindex/.test(html)) {
      fail(`draft page is missing its noindex meta: ${p}`);
    }
    if (feed.includes(p)) fail(`draft in rss.xml: ${p}`);
    if (blogIndex.includes(p)) fail(`draft linked from /blog/: ${p}`);
    if (home.includes(p)) fail(`draft linked from /: ${p}`);
    if (sitemaps.includes(p)) fail(`draft in sitemap: ${p}`);
    if (redirects.has(p) || [...redirects.values()].includes(p)) {
      fail(`draft appears in the redirect map: ${p}`);
    }
  }
  console.log(`drafts: ${drafts.length} built, unlisted and noindex`);
}

// --- 8. hidden pages are built but pointed at by nothing ------------------
// Same contract as drafts, one level up: the page exists, carries noindex, is
// absent from the sitemap, and nothing on the site links to it. Assert every
// half, or "hidden" is decoration the same way an unenforced draft flag is.
{
  const sitemapFiles = (await readdir(dist)).filter((f) => /^sitemap.*\.xml$/.test(f));
  const sitemaps = (
    await Promise.all(sitemapFiles.map((f) => readFile(path.join(dist, f), 'utf8')))
  ).join('\n');

  for (const p of HIDDEN_PATHS) {
    if (!(await exists(p))) {
      fail(`hidden page not built: ${p}`);
      continue;
    }
    const own = path.join(dist, `${p}index.html`);
    const html = await readFile(own, 'utf8');
    if (!/<meta name="robots" content="noindex/.test(html)) {
      fail(`hidden page is missing its noindex meta: ${p}`);
    }
    if (sitemaps.includes(p)) fail(`hidden page in sitemap: ${p}`);
    // A page may link to itself (a restart button, say); anything else linking
    // to it means it has leaked into the site's navigation.
    const linkers = grep(`href="${p}"`).filter((f) => path.resolve(f) !== own);
    if (linkers.length > 0) {
      fail(`hidden page ${p} is linked from: ${linkers.slice(0, 3).join(', ')}`);
    }
  }
  console.log(`hidden pages: ${HIDDEN_PATHS.length} built, unlinked and noindex`);
}

if (failures) {
  console.error(`\n${failures} verification failure(s)`);
  process.exit(1);
}
console.log(`\nAll checks passed: ${redirects.size} redirects, ${slugs.size} post pages.`);
