# leggetter.co.uk website

Personal website and blog, built with [Astro](https://astro.build) and deployed
on [Cloudflare Pages](https://pages.cloudflare.com/).

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

Pushing to `main` deploys automatically — Cloudflare Pages builds the site
(`npm run build`, output `dist/`) and publishes it. Pull requests get preview
URLs. There is no manual deploy step.

### One-time Cloudflare Pages setup

1. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the
   `leggetter/leggetter.co.uk` GitHub repo.
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
2. Add the custom domain `www.leggetter.co.uk` to the Pages project (the DNS
   zone is already on Cloudflare) and make sure an apex → www redirect rule
   exists for `leggetter.co.uk`.
3. Once verified, disable GitHub Pages in the repo settings and delete the old
   `gh-pages` branch.

## URLs and redirects

The Jekyll-era post URLs (dated `/2010/07/22/....html`, category-prefixed, and
`/pageN/` pagination) were replaced with clean `/blog/{slug}/` URLs. Every old
local URL gets a real **301** via `dist/_redirects` (Cloudflare Pages format),
generated at build time by `src/lib/redirects.mjs` from the posts' legacy
`permalink` front matter. `npm run verify` asserts every redirect targets a
page that exists.

Old "link posts" (whose permalink pointed at external blogs such as
blog.kwwika.com) are now hosted locally with an "Originally published on …"
attribution — their full content was always in this repo.

## Analytics

- **PostHog** is active (see `src/lib/site.mjs`).
- **Google Analytics** is dormant: the old Universal Analytics property
  (`UA-513034-10`) died with Google's UA shutdown. To re-enable, create/locate
  the GA4 property at analytics.google.com and put its `G-XXXXXXXXXX`
  measurement ID in `GA4_MEASUREMENT_ID` in `src/lib/site.mjs`. The GA snippet
  is omitted from the site until that ID is set.

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
