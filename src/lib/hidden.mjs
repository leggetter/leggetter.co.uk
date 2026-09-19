/**
 * Pages that are built and reachable but pointed at by nothing: no nav link,
 * no sitemap entry, and a `noindex` meta on the page itself. The same contract
 * `draft: true` gives a post (see src/lib/posts.ts), applied to a page.
 *
 * Obscurity is not access control. Anyone with the URL can open these, and
 * that is the intent - the point is to keep them out of search results and
 * out of the site's own navigation, not to stop anyone reading them.
 *
 * Imported by astro.config.mjs (to drop them from the sitemap) and by
 * scripts/verify-urls.mjs (to assert both halves actually hold).
 */
export const HIDDEN_PATHS = ['/penalty/'];
