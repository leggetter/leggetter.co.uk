---
name: blog-review
description: "Review a drafted blog post in src/content/blog/ for argument quality, readability and the tells that mark unedited AI drafting. Use before publishing a post, or when asked to review, critique or tighten one. Runs after `npm run voice`, not instead of it."
---

# Blog review

The judgment pass on a post that is already written. `npm run voice` measures a
draft against the published corpus and catches what is countable; `AGENTS.md`
covers voice rules and the source audit for posts written from session
extracts. This skill covers what neither can: whether the argument holds.

## Order of operations

Run these in order. Each one is cheap and each one catches things the next
cannot see.

```sh
npm run voice -- src/content/blog/<file>.md   # 1. mechanical: em-dashes, scaffolding, headings, rhythm
```

2. **Source audit**, if the post came from a session extract. `AGENTS.md` has
   the checklist: did the decision actually get made, are quotes verbatim, is
   the chronology right, are external claims verified, does the post claim more
   certainty than the session had.
3. **This skill.** Argument quality, then the AI-tell pass below.

Fix errors from step 1 before starting step 3. There is no point weighing an
argument that still has scaffolding sentences in it.

**Prose added after the pass needs the pass again.** The last things written
are usually the summary, the closing line, and any note about provenance or
corrections, which lands them after the point where you would naturally
review. Step 1 will still come back clean on them, because self-labelled rigor
and document narration are not catchable by regex. That is the gap this skill
exists to fill, so it is the gap that reopens every time prose arrives late.

## Argument quality

Adapted for the blog from `phil-doc-voice`'s `anti-slop.md` (private repo:
`leggetter/phil-skills`), which is the fuller treatment and worth reading
directly when a post is contentious. The register differs: these posts are
public, first-person and British-spelled, where that skill governs internal
American-spelled docs. The rigor rules carry over unchanged.

**Cut self-labels of your own reasoning.** Do not call your own work "honest",
"genuine", "rigorous", "grounded", "properly", "carefully". The label is either
redundant, because the passage already is, or compensating, because it is not.
Grep for them and earn or delete each one. Note the exception: these words are
fine when describing *the subject*, so "the annotations are honest" is a claim
about code and stays.

**Do not narrate the post.** Cut asides explaining your own structure or
approach ("I want to be fair to the earlier reasoning", "this section covers").
Just do the thing.

**Read the TL;DR as though the body does not exist.** It is written last, in
the vocabulary the body earned, and then never read cold, so it inherits terms
and referents the reader has not met yet. Check every bullet for a bare "it",
"this" or "the shape", for jargon the post defines later, and for a noun phrase
that only resolves from a section further down. The same applies to the first
sentence under any heading: bullets, headings and code blocks break the
continuity that makes a pronoun work in flowing prose, so an opener that points
backwards sends the reader hunting. `npm run voice` checks that headings stand
alone; nothing checks that openings do.

**State the thesis once, then call back.** Excerpt, TL;DR and first statement in
the body are structural and do not count. A fourth full restatement in the
argument means you are circling.

**Every hedge earns its place, and a bet is written as a bet.** "I think this
is right" is weaker than saying it and letting a reader disagree. But where the
evidence genuinely is not there, say so plainly and say what would settle it,
rather than dressing a hypothesis in confident present tense.

**Kill connective tissue implying logic you did not argue.** "So", "this
means", "therefore" should follow an actual step. Remove the connective; if the
link stops holding, the reasoning was the gap, not the word.

**Take a position.** Case-for / case-against that never resolves is the tell.
Engage the strongest counter-argument you can find, then say which way you come
down and why. A post that surveys and declines to conclude has not finished.

**Distinguish reported from inferred, and source every number.** These posts
cite changelogs, specs and benchmarks. Agent-gathered citations are leads, not
facts. Open the link. Numbers that trace back to a search summary rather than a
source get cut, and confident-sounding ones are the likeliest to be wrong.

## The AI-tell pass

**The point is rigor, not disguise.** Do not rewrite a post to hide that AI was
involved. Remove what lets thin thinking pass as finished, and keep everything
load-bearing even where it still reads like AI. A post that has been laundered
for style but never checked for substance is the worse outcome, and it is the
one this pass exists to prevent.

What actually signals an unedited draft, in rough order of how loudly:

| Tell | Caught by |
|---|---|
| Em-dashes | `npm run voice` (error) |
| Sentences that announce a point instead of making it | `npm run voice` (error) |
| Headings that only resolve from their neighbour | `npm run voice` (error) |
| Uniform sentence length, no short ones and no long ones | `npm run voice` (warn) |
| Never addressing the reader | `npm run voice` (warn) |
| Self-labelled reasoning, document narration, unresolved both-sidesing | this skill |
| Tidy symmetry: every section the same length, every list three items | read it aloud |
| Citations that are plausible and wrong | open every link |

The last two are the ones no script will catch, and the second of them is the
only one that can actually embarrass you in public.

**On watermarking.** Claude models from August 2026 embed an invisible
statistical watermark in generated text, a SynthID-Text derivative that biases
low-stakes word choices. It is not a visible label, it does not add characters
or tokens, and Anthropic's detection API was still unreleased as of August 2026.
Three consequences for reviewing a post:

- You cannot use it to check your own draft. There is no tool to run.
- Light editing does not remove it; only a full rewrite does. So a post drafted
  with Claude and edited by hand is still watermarked, which is fine and true.
- Absence of a watermark proves nothing about authorship, so it is not evidence
  in either direction.

Treat it as a fact about the artifact rather than a thing to manage. The
reviewing question is whether the post is right and worth reading, which the
watermark has no opinion about.

**Disclosure.** Settled as of August 2026: posts drafted with AI carry a short
"How This Post Was Written" section at the end. It follows `phil-doc-voice`'s
convention for internal docs, which is to say what was AI-drafted so the reader
can calibrate trust. A note rather than a badge, and at the end rather than the
top, because a provenance label above the argument primes a reader to discount
the argument before reaching it.

Keep it specific and keep it short. The risk in AI-drafted technical writing is
citations rather than prose, so point at the links and stop. Do not claim rigor
in it: the first version of that note said the post flagged its own bets, which
is the self-label rule above being broken inside the disclosure meant to earn
trust. Pointing at where the risk is invites scrutiny; claiming to have handled
it deflects scrutiny.

Everything before this convention existed stays as it is. Do not retrofit.

## What this skill does not do

- **Voice.** `AGENTS.md` "Voice" is the source of truth, enforced by
  `npm run voice`. Do not restate its rules here; they drift.
- **Publishing.** `AGENTS.md` "Drafts" has the five-step checklist, including
  the `verify-urls.mjs` post-count tripwire.
- **Redaction.** `drafts/AGENTS.md` owns that, and it matters most for posts
  built from session extracts.
