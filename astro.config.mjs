import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { rehypeLegacyHeadingAnchors } from './src/lib/legacy-heading-anchors.mjs';
import { writeRedirects } from './src/lib/redirects.mjs';

export default defineConfig({
  site: 'https://www.leggetter.co.uk',
  trailingSlash: 'ignore',
  integrations: [
    sitemap(),
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
    rehypePlugins: [rehypeLegacyHeadingAnchors],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
