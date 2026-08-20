# leggetter.co.uk — agent instructions

Personal site and blog for Phil Leggetter. Astro static site, deployed to
Cloudflare Workers.

**This repo is public.** Assume anything committed is published. See
`drafts/AGENTS.md` before touching anything in `drafts/`.

## Layout

| Path | What |
|---|---|
| `src/content/blog/` | Published posts, `YYYY-MM-DD-slug.md`. Schema in `src/content.config.ts` (`title` required; `excerpt`, `permalink` conventional). |
| `drafts/` | **Gitignored.** Raw Claude Code session extracts — source material, not posts. Search tools that honour `.gitignore` will not find these files, so reference them by explicit path. Individual extracts run to hundreds of KB: navigate them with `grep`/targeted reads, or re-extract a narrower slice. Do not read one end to end. |
| `scripts/verify-urls.mjs` | Post-build check: legacy 301s resolve, routes emitted, no cruft in `dist/`. |

Legacy WordPress-era frontmatter keys (`wordpress_id`, `status`, `author`)
exist in older files and keep Disqus threads restorable. Do not copy them into
new posts.

## Voice

First-person singular. Phil's own byline, not a company one. Do **not** apply
`hookdeck-voice` or `hookdeck-social-voice` — those govern Hookdeck-branded
content and are the wrong register here.

Specific over generic, opinions framed as opinions, and no hype vocabulary. A
post earns its place by showing reasoning, including where it changed.

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

**4. Shift emphasis by re-extracting, not by rewriting from memory.** The
frontmatter records the exact `extract_command` and `filter`. To foreground a
different thread, widen or change `--grep` and re-read. Dropping the filter
entirely gives the whole session. `./session-mine.py agents <session_id>` maps
the subagent research, which is usually where unused material is hiding.

**5. Write to `src/content/blog/YYYY-MM-DD-slug.md`.** Leave the draft in
`drafts/` as provenance. Never move an extract into `src/content/blog/`.

## Publishing

Build and deploy detail lives in [README.md](README.md) — do not restate it
here, it drifts. The short version:

```sh
npm run dev                      # local preview at localhost:4321
npm run build && npm run verify  # verify checks 301s, routes, and dist/ cruft
```

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
