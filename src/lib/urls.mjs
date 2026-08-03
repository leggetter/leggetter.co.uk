/**
 * URL model for the blog migration.
 *
 * New scheme: every post lives at /blog/{slug}/ where slug is derived from the
 * source filename (date prefix stripped, percent-encoded WordPress leftovers
 * decoded, normalised to [a-z0-9-]).
 *
 * Old scheme(s), needed to generate 301s (Cloudflare Pages _redirects):
 *  - explicit local permalink, e.g. /2005/06/30/a-career-using-javascript.html
 *  - explicit extensionless permalink, e.g. /blog/devex-devrel-my-next-role-2021
 *  - no permalink -> Jekyll default /:categories/:year/:month/:day/:title.html
 *    with categories downcased, spaces preserved (e.g. "/social media/...")
 *  - external permalink (old "link posts") -> no local URL existed; the post
 *    gains a local page and an "originally published at" attribution instead.
 */

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})-/;

export function isExternalPermalink(permalink) {
  return typeof permalink === 'string' && /^https?:\/\//.test(permalink);
}

/** Filename (or collection entry id) without extension or date prefix. */
export function fileSlug(id) {
  const base = id.replace(/\.(md|markdown)$/, '');
  return base.replace(DATE_PREFIX, '');
}

/** New clean slug: decode %XX leftovers, normalise to [a-z0-9-]. */
export function postSlug(id) {
  let s = fileSlug(id);
  try {
    s = decodeURIComponent(s);
  } catch {
    // leave undecodable sequences as-is; they get stripped below
  }
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function postPath(id) {
  return `/blog/${postSlug(id)}/`;
}

/** Literal Y/M/D from the front-matter date string, else the filename date. */
export function postDateParts(id, dateValue) {
  const str =
    dateValue instanceof Date
      ? dateValue.toISOString()
      : typeof dateValue === 'string'
        ? dateValue
        : '';
  const m = str.match(/^"?(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { year: m[1], month: m[2], day: m[3] };
  const f = id.match(DATE_PREFIX);
  if (f) return { year: f[1], month: f[2], day: f[3] };
  throw new Error(`No date found for post ${id}`);
}

export function postDate(id, dateValue) {
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string' && dateValue.trim()) {
    const d = new Date(dateValue);
    if (!Number.isNaN(d.valueOf())) return d;
  }
  const { year, month, day } = postDateParts(id, dateValue);
  return new Date(`${year}-${month}-${day}T12:00:00Z`);
}

/**
 * Every OLD local URL this post was served at (empty for old external
 * "link posts", which never had a local page).
 */
export function oldLocalUrls({ id, permalink, date, categories }) {
  if (isExternalPermalink(permalink)) return [];
  if (permalink) {
    const urls = [permalink];
    if (!permalink.endsWith('.html') && !permalink.endsWith('/')) {
      // GitHub Pages also served the emitted .html file directly.
      urls.push(`${permalink}.html`);
    }
    return urls;
  }
  // Jekyll default: /:categories/:year/:month/:day/:title.html
  const { year, month, day } = postDateParts(id, date);
  const cats = (categories ?? [])
    .map((c) => String(c).toLowerCase())
    .join('/');
  const prefix = cats ? `/${cats}` : '';
  return [`${prefix}/${year}/${month}/${day}/${fileSlug(id)}.html`];
}

/** Hostname for the "originally published at" attribution line. */
export function originalSourceHost(permalink) {
  if (!isExternalPermalink(permalink)) return null;
  try {
    return new URL(permalink).hostname;
  } catch {
    return null;
  }
}

/**
 * Listing/RSS excerpt: explicit front-matter excerpt, else the first
 * paragraph of the body (Jekyll's excerpt_separator: "\n\n"), tags stripped.
 */
export function excerptOf(frontmatterExcerpt, body) {
  const source =
    (frontmatterExcerpt ?? '').trim() ||
    (body ?? '').trim().split(/\n\s*\n/)[0] ||
    '';
  return source
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
