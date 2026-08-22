# leggetter.co.uk — agent instructions

Personal site and blog for Phil Leggetter. Astro static site, deployed to
Cloudflare Workers.

**This repo is public.** Assume anything committed is published. See
`drafts/AGENTS.md` before touching anything in `drafts/`.

## Layout

| Path | What |
|---|---|
| `src/content/blog/` | Posts, `YYYY-MM-DD-slug.md`. Schema in `src/content.config.ts` (`title` required; `excerpt`, `permalink` conventional). `draft: true` keeps a post unlisted — see below. |
| `drafts/` | **Gitignored.** Raw Claude Code session extracts — source material, not posts. Search tools that honour `.gitignore` will not find these files, so reference them by explicit path. Individual extracts run to hundreds of KB: navigate them with `grep`/targeted reads, or re-extract a narrower slice. Do not read one end to end. |
| `scripts/verify-urls.mjs` | Post-build check: legacy 301s resolve, routes emitted, no cruft in `dist/`. |
| `scripts/check-voice.mjs` | `npm run voice -- <post>`: measures a draft against the published corpus's voice. See [Voice](#voice). |

Legacy WordPress-era frontmatter keys (`wordpress_id`, `status`, `author`)
exist in older files and keep Disqus threads restorable. Do not copy them into
new posts.

## Voice

First-person singular. Phil's own byline, not a company one. Do **not** apply
`hookdeck-voice` or `hookdeck-social-voice` - those govern Hookdeck-branded
content and are the wrong register here.

Specific over generic, opinions framed as opinions, and no hype vocabulary. A
post earns its place by showing reasoning, including where it changed.

### Rules that are actually checkable

These come from measuring the published corpus. `npm run voice -- <post>`
enforces them; the numbers below are what it compares against, recomputed from
the published posts on every run.

**Never use an em-dash.** Across 184 posts and 21 years there are zero. The
habit is a spaced hyphen (`word - word`), or a comma, or two sentences. This is
the single loudest tell that something else wrote the post.

**Don't announce a point, make it.** The worst tic in generated prose is a
sentence that says a point is coming instead of being the point:

> ~~One more thing undercuts the discovery argument, and it's recent.~~
> The current spec revision explicitly blesses caching the tool list.

Test any sentence by deleting it. If nothing is lost, it was scaffolding.
Watch for `One more thing`, `Here's the thing`, `This is where it gets`,
`What's interesting is`, `It's worth noting that`, and for a main clause
followed by a short withholding clause (`..., and it's recent.`) that defers
the fact to manufacture a beat.

**Headings must stand alone.** Readers skim, deep-link and share them, so a
heading that only resolves from the one above it is broken. `How Would You
Signal One?` fails; `How Do You Signal a Breaking Change?` works. Existing
headings are plain and descriptive, and often questions: "What are Components?",
"Is the Reason for Moving on Fundamental?", "Why Build Components?".

**Write to the reader, not at them.** The corpus runs about 21 uses of
"you"/"your" and 4 questions per 1,000 words. Posts ask the reader things
directly: *"do you really want to have to write code to deal with connection
fallback?"*, *"Can you change teams?"* An essay that never addresses anyone
reads like a different author.

**Match the rhythm.** Median sentence is around 18-20 words and only ~7% of
sentences run to six words or fewer. Stacked fragments for rhetorical punch
(`Not rejected.` `Fine.` `There isn't one.`) are a register the corpus doesn't
use. British spelling throughout (authorisation, prioritised, serialising).

Warnings from `npm run voice` are drift worth a look, not automatic faults.
Errors are things the corpus does zero of, or sentences carrying no
information, and should be fixed before publishing.

## Writing a post from a session extract

Extracts in `drafts/` come from `~/leggetter/git/session-mine` (private repo:
`leggetter/session-mine`). Each carries provenance frontmatter — `session_id`,
`source_path`, `extract_command`, `filter`, `exchanges_kept` / `exchanges_total`.

**1. Choose the turn, not the transcript.** Extracts run to hundreds of KB.
A post is usually one decision: a position held, then revised, with reasoning
visible. Find where the mind changes.

**2. Draft it.** Follow the conversion checklist and redaction rules in
`drafts/AGENTS.md`. Redact while drafting, not afterwards.

**3. Audit the draft against the source.** Do this even when the draft reads
well — *especially* then. A post written from a 600 KB extract drifts without
anyone noticing, and a fluent draft is not evidence of a faithful one. Re-read
the source rather than trusting the draft:

```sh
cd ~/leggetter/git/session-mine
./session-mine.py extract <session_id> --grep '<narrower pattern>' --out /tmp/audit.md
```

Check, against the transcript and not from memory:

- **Did the decision actually get made?** Distinguish what was proposed,
  what was rejected, and what shipped. Transcripts contain all three, and
  discarded options read exactly like adopted ones.
- **Are quotes verbatim?** Quote from the extract, not from the draft's
  paraphrase of it.
- **Is the chronology right?** A conclusion reached late must not be narrated
  as the opening position.
- **Are external claims verified?** Subagent reports cite changelogs,
  benchmarks and vendor docs. They are leads gathered by agents, not facts.
  Open the links. Cut what does not check out.
- **Does the post claim more certainty than the session had?** If it was a bet,
  say it was a bet.

Then run the voice check, which catches the tics prose review misses because
they scan perfectly well:

```sh
npm run voice -- src/content/blog/<file>.md
```

**4. Shift emphasis by re-extracting, not by rewriting from memory.** The
frontmatter records the exact `extract_command` and `filter`. To foreground a
different thread, widen or change `--grep` and re-read. Dropping the filter
entirely gives the whole session. `./session-mine.py agents <session_id>` maps
the subagent research, which is usually where unused material is hiding.

**5. Write to `src/content/blog/YYYY-MM-DD-slug.md` with `draft: true`.**
See [Drafts](#drafts) — it stays unlisted but gets a preview URL. Leave the
extract in `drafts/` as provenance. Never move an extract into
`src/content/blog/`.

Note the two senses of "draft": the `drafts/` **directory** holds session
extracts, which are source material and never become posts in place; the
`draft: true` **flag** marks a real post in `src/content/blog/` that is
written but not yet published.

## Drafts

`draft: true` in a post's front matter makes it **unlisted, not unbuilt**. The
page still renders at `/blog/{slug}/`, so a draft can be read on the real
Cloudflare preview URL — but it is kept out of the blog index, the paginated
archive, the homepage count, the RSS feed, the sitemap and the redirect map,
and the page carries `noindex, nofollow` plus a visible draft notice.

The split lives in `src/lib/posts.ts`: `getSortedPosts()` returns everything
and is used **only** by `src/pages/blog/[slug].astro`; `getListedPosts()` drops
drafts and is what every listing uses. Adding a new listing? Use
`getListedPosts()`.

`npm run verify` enforces both halves — that the draft page was built with its
noindex meta, and that its URL appears in no listing, feed, sitemap or
redirect. It will not pass if the flag becomes decoration.

**To publish a draft**, in one commit:

1. Delete the `draft: true` line.
2. Bump the published-post count in `scripts/verify-urls.mjs` (the `!== 184`
   check) by one. It is a deliberate tripwire, not a nuisance — it is what
   catches a post appearing or vanishing unintentionally.
3. Set `date` if the filename's date is no longer the publication date, and
   rename the file to match. The slug comes from the filename, so renaming
   changes the URL.
4. `npm run voice -- src/content/blog/<file>.md` and fix any errors.
5. `npm run build && npm run verify`.

## Publishing

Build and deploy detail lives in [README.md](README.md) — do not restate it
here, it drifts. The short version:

```sh
npm run dev                      # local preview at localhost:4321
npm run build && npm run verify  # verify checks 301s, routes, and dist/ cruft
```

**The dev server caches content and will lie to you.** Astro's content layer
keeps a store in `.astro/`, and running `npm run build` while `npm run dev` is
up clobbers it, so the page keeps serving a previous revision of a post. If
what you see doesn't match the file, it is this, every time:

```sh
npx astro dev stop && rm -rf .astro && npm run dev
```

Don't run a build while the dev server is running, and when checking an edit
landed, check the *served* page (`curl` it) rather than the source file. The
file proves the edit was written, not that anyone can see it.

Work reaches `main` by pull request:

```sh
git checkout -b post/<slug>
git add src/content/blog/<file>.md
git commit && gh pr create --fill
```

Pushing the branch produces a **Cloudflare preview URL** (Workers Builds runs
for non-production branches). Check the post on the preview before merging —
merging to `main` publishes to production with no further gate.

After deploy, check the live URL, and if `permalink` was set, that the legacy
path still 301s.
