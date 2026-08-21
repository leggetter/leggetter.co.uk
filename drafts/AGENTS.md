# drafts/ — turning session extracts into posts

Files here are **source material, not posts**. Each is a transcript extract
from a Claude Code session, produced by `~/leggetter/git/session-mine`. Every
one carries `status: source-material` in its frontmatter. Nothing in this
directory is publishable as-is; a post gets *written from* these, not edited
out of them.

`drafts/` is outside `src/content/blog/`, so Astro never builds it. Keep it
that way — a finished post moves, it does not get published in place.

## What the frontmatter tells you

```yaml
session_id / session_title / session_date   which session, when
cwd / branch                                what was being worked on
source_path / source_is_archived            where the transcript lives now
extract_command / filter                    how to reproduce or widen this extract
exchanges_kept / exchanges_total            how much of the session you are seeing
subagent_reports: 12 of 24                  how many subagent reports are included
```

`exchanges_kept` well below `exchanges_total` means you are looking at a slice.
Re-run `extract_command` with a looser `--grep`, or none, to see the rest.
`source_is_archived: true` means the material is safe; `false` means the
original is on a 30-day deletion clock and should be archived now.

## Conversion checklist

1. **Read the frontmatter first.** Know what slice you have before judging
   whether the story is complete.
2. **Find the turn, not the transcript.** These files run to hundreds of KB.
   The post is usually one decision — a position held, then revised, with the
   reasoning visible. Search for where the mind changes.
3. **Redact.** See below. Do this before writing, not after.
4. **Verify every external claim.** Subagent reports cite primary sources —
   changelogs, benchmarks, repo docs. They were gathered by agents and are
   *leads, not facts*. Open the links. Anything unverifiable gets cut.
5. **Rewrite in Phil's voice, first-person singular.** These are personal-blog
   posts. Do not use `hookdeck-voice` / `hookdeck-social-voice` — those are for
   Hookdeck-branded content and are the wrong register here.
6. **Write the post as a new file** in `src/content/blog/` named
   `YYYY-MM-DD-slug.md`. Leave the draft in place as provenance.

## Redaction

**This repo is public** (`leggetter/leggetter.co.uk`). The extracts in this
directory are gitignored for that reason — they are raw transcripts of work
sessions and contain material that must not be published. Do not remove that
exclusion, and do not `git add -f` anything from here.

`cwd` shows most of this material comes from Hookdeck work. The CLI repo is
public; the backend is not. Before any of it reaches a post:

- **Project and tenant identifiers** — short prefixed IDs captured from live
  API testing. Remove, or replace with obvious placeholders.
- **Private-repo internals** — file paths, table and migration names, service
  internals. A public CLI repo does not make the backend repo public, and
  transcripts quote paths from both.
- **Internal metrics** — telemetry, usage counts, revenue and pricing
  discussion. Common in these transcripts and never publishable.
- **Unreleased work** — features discussed pre-merge or pre-announcement.
  Check current public status before referring to anything.
- **Local filesystem paths** — extract frontmatter records absolute paths from
  the machine that produced it. Strip them.
- **Env var names are fine** — those documented in the public CLI are already
  public. No real credential *values* were present at the time of writing;
  re-check after any new extract.
- **Public issue and PR numbers are fine** — `hookdeck-cli` is a public repo.
- **No self-criticism of internal decisions** in outward-facing writing.
  Revising a documented position is a strong story; framing it as a mistake is
  not.

When in doubt, leave it out: the interesting part of these posts is reasoning,
which survives redaction intact.

## Post-frontmatter for the real thing

Recent posts use a minimal set (see `src/content.config.ts` for the schema —
`title` is the only required field):

```yaml
---
layout: post
title: "..."
excerpt: "..."
permalink: /blog/some-slug
---
```

Legacy WordPress-era keys in older files (`wordpress_id`, `status`, `author`)
are not modelled by the schema and should not be copied into new posts.

## Seeing what is here

The extracts are gitignored, so this file cannot carry a reliable inventory —
a clone has none of them, and the set changes. Discover instead:

```sh
ls drafts/*.md
head -20 drafts/<file>.md      # frontmatter: which session, which slice
```

Judge a draft by its frontmatter before opening it. `exchanges_kept` far below
`exchanges_total` means you hold a slice; `filter` tells you which one; and
`session_title` plus `cwd` tell you what work it came from. Size matters as
much as subject — some extracts run to hundreds of KB and must be navigated
with `grep` or re-extracted narrower, never read end to end.

To produce a new extract, or a different slice of one you already have, see
`~/leggetter/git/session-mine` (private: `leggetter/session-mine`).
