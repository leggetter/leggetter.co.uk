import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rehypeLegacyHeadingAnchors } from './src/lib/legacy-heading-anchors.mjs';
import { collectDraftIds, writeRedirects } from './src/lib/redirects.mjs';
import { postPath } from './src/lib/urls.mjs';
import { HIDDEN_PATHS } from './src/lib/hidden.mjs';

// Draft posts are built (so they can be read on a preview URL) but must stay
// out of the sitemap, same as they stay out of the listings and the feed.
// Hidden pages (src/lib/hidden.mjs) are the same deal for pages rather than posts.
const unlistedPaths = new Set([...(await collectDraftIds()).map(postPath), ...HIDDEN_PATHS]);

export default defineConfig({
  site: 'https://www.leggetter.co.uk',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !unlistedPaths.has(new URL(page).pathname),
    }),
    {
      name: 'generate-redirects',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          await writeRedirects(dir);
        },
      },
    },
  ],
  markdown: {
    // Astro 7 defaults to the Sätteri Markdown processor; we stay on the
    // classic remark/rehype pipeline because the legacy heading-anchor slugs
    // (see src/lib/legacy-heading-anchors.mjs) depend on a rehype plugin.
    processor: unified({ rehypePlugins: [rehypeLegacyHeadingAnchors] }),
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
