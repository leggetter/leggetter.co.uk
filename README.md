# leggetter.co.uk website

Personal website and blog, built with [Astro](https://astro.build) and deployed
to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)
(static assets) via the Workers Builds git integration.

## Prerequisites

- Node.js 20+ (and npm)
- Git

## Local development

```sh
git submodule update --init   # first time only: pulls the Realtime Web Technologies Guide content
npm install
npm run dev
```

The site runs at http://localhost:4321 with hot reload.

Other commands:

```sh
npm run build     # production build into dist/ (also regenerates dist/_redirects)
npm run preview   # serve the production build locally
npm run verify    # post-build checks: legacy 301s, expected routes, no legacy cruft
```

## Deployment

Pushing to `main` deploys automatically — Cloudflare Workers Builds runs
`npm run build` then `npx wrangler deploy`, which publishes `dist/` as static
assets (see `wrangler.jsonc`). Non-production branches get preview URLs.
There is no manual deploy step.

### One-time Cloudflare setup

1. Cloudflare dashboard → Workers & Pages → Create → import the
   `leggetter/leggetter.co.uk` GitHub repo.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Keep "Builds for non-production branches" enabled for preview URLs
2. In the Worker → Settings → Domains & Routes, add the custom domain
   `www.leggetter.co.uk` (the DNS zone is already on Cloudflare) and make sure
   an apex → www redirect rule exists for `leggetter.co.uk`.
3. Once verified, disable GitHub Pages in the repo settings and delete the old
   `gh-pages` branch.

## URLs and redirects

The Jekyll-era post URLs (dated `/2010/07/22/....html`, category-prefixed, and
`/pageN/` pagination) were replaced with clean `/blog/{slug}/` URLs. Every old
local URL gets a real **301** via `dist/_redirects` (Cloudflare format),
generated at build time by `src/lib/redirects.mjs` from the posts' legacy
`permalink` front matter. `npm run verify` asserts every redirect targets a
page that exists.

Old "link posts" (whose permalink pointed at external blogs such as
blog.kwwika.com) are now hosted locally with an "Originally published on …"
attribution — their full content was always in this repo.

## Analytics

**PostHog** only (see `src/lib/site.mjs`). Google Analytics was removed in the
Astro migration: the old Universal Analytics property (`UA-513034-10`) had
captured nothing since Google's UA shutdown on 1 July 2023, so PostHog (added
Sept 2023) was already the only working analytics.

## Family tree

`/leggetter-family-tree/view/` is generated from `leggetter-family-tree/0001tree.gen`
(Geneo format). After changing the data, regenerate the committed fragment and
commit it:

```sh
npm run generate-family-tree   # rewrites src/generated/family-tree.html
```

CI/deploys don't need Python — only this local authoring step does.

## Repository layout

- `src/content/blog/` — all blog posts (markdown, one file per post)
- `src/pages/` — routes: homepage + pagination, blog post route, static pages
- `src/layouts/`, `src/components/`, `src/styles/` — the design
- `src/lib/` — URL scheme + legacy-redirect generation, legacy heading-anchor slugs
- `public/` — static passthrough (legacy `wp-content/` uploads, `images/`,
  old one-off sites: `talks/`, `pusher/`, `gis/`, …)
- `vendor/realtime-web-technologies-guide/` — git submodule with the guide content
