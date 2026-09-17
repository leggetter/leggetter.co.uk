---
title: "How to Publish Agent Evals Developers Can Trust"
draft: true
aiAssisted: true
excerpt: "While building Hookdeck's agent evals page, I directed an AI-assisted survey of how other developer platforms publish their results. These fifteen guidelines cover what I'd check before trusting a score, including several things we got wrong ourselves."
---

Ask an AI coding agent to wire up webhook handling, or authentication, or a database schema, and how well it does depends on how much sense your product makes to a model. Developer platforms have started measuring that, and publishing what they find.

The measurement is called an eval. You write a set of realistic tasks, hand each one to an agent working in a real project, and check whether what it built actually works. Then you run the same tasks again with one thing changed, usually the instructions and documentation you publish for agents to read, the files most people now call skills, and compare the two. What gets published is usually a score for each of the two, and the difference between them.

[Convex](https://www.convex.dev/llm-leaderboard) has been at it longest. Its repository goes back to January 2025, and I can't find another platform's until [Clerk's](https://clerk.com/llm-leaderboard) nine months later, that October. [Supabase's](https://supabase.com/evals) followed the following April, and [Auth0's](https://auth0.com/agent-experience) in June. [Rails](https://rubyonrails.org/ai) started on 4 August 2026, and the one I worked on at Hookdeck three days after that. So almost none of this is more than a year old. That's probably most of the reason nothing about it has settled.

Nobody agrees on what to call these, and the name turns out to predict what the page is for. I say evals throughout, because that's the word the repositories use. Of five pages I compared, the two published at `/skills` and `/evals` open as self-audits: [.NET](https://dotnet.github.io/skills/) tracks "Copilot quality with and without skill plugins", [Supabase](https://supabase.com/evals) evaluates "model experiments across the Supabase developer journey". The three at `/llm-leaderboard` and `/llm-benchmark` lead as model comparisons instead, with [Clerk](https://clerk.com/llm-leaderboard) inviting you to "select the one that best fits your requirements". Five pages is an observation and not a rule, and it's worth checking before you read a score, because the two kinds answer different questions. Clerk and [Paddle](https://developer.paddle.com/llm-benchmark/) both hold the self-audit answer in a toggle on the page, and neither leads with it. Paddle's sits above the table, showing the plain run by default, with what its own tooling is worth one click away.

![Paddle's LLM benchmark page, with a three-way toggle above the results table and the plain run selected](/images/agent-evals-paddle-toggle.png)


Platforms run them for two reasons. The published scores are meant to tell a developer which model to trust with an integration. Watching what the agent actually did to earn those scores tells the platform where its own documentation, APIs and tooling fail it. That is hard to learn any other way, because an agent that gets lost doesn't file a support ticket.

I've been building [an evals page for Hookdeck](https://hookdeck.com/evals), and wanted to know what a useful published result should include. I directed an AI-assisted survey which, by 7 September 2026, had found at least twenty-three platforms publishing results, through pages, posts or repositories.

These are fifteen guidelines I'd give anyone setting out to build and publish a set of evals for their own product. If you only ever read somebody else's scores, the checklist below is the part written for you, because it's the questions a published number should already have answered. Everything after the checklist is the working behind it, and that's addressed to whoever has to do the job. Each guideline draws on a published example or a problem we found in our own evals, so Hookdeck appears repeatedly as the thing that needs fixing.

Here are the terms I use below.

- **Agent**: the thing doing the work. A model, plus the tools it can use, plus a loop that lets it read files, run commands and try again. Claude Code and Codex are agents; a single model call is not.
- **Scenario**: one test. A task written as a prompt, plus the checks that decide whether the agent did it. One task per scenario, and the scenario is what passes or fails, so it's the unit every score in this post counts.
- **Scorer**: the code that does that checking, usually by inspecting what the agent built, not by reading what it said.
- **Run**: one attempt at one scenario with a particular agent, model and configuration.
- **Configuration**: what the agent is given for a run besides the model - the tools it can call, and whether your skills, docs or MCP server are available to it. Run three models against two configurations and you get six combinations.
- **Baseline**: the configuration you compare the others against.
- **Skills**: files you publish that tell an agent how your product works. The agent decides whether to open them, which turns out to matter a lot.
- **MCP**: the Model Context Protocol. A way to expose your product's operations to an agent as tools it can call directly, instead of leaving it to work through your API from the documentation.
- **Harness**: the code that runs your scenarios, prepares the agent's environment and records what happened.
- **Transcript**: the record of what the agent actually did during a run, as opposed to whether it passed.
- **Snapshot**: a set of results published as a file you can point at later. Ideally every row in it was measured at the same time. Guidelines 11 and 13 are about what happens when they weren't.

Two of those are mine rather than the field's. Of the eight suites I counted sizes for later on, three call a single test an eval, three call it a task, Stripe calls it an environment, and only we call it a scenario. I've used scenario throughout because eval is already busy naming the whole practice, and I've used task for the prompt inside one. That isn't what Laravel, Rails or Grafana mean by it. Nobody will be confused for long, and it's worth knowing that the field hasn't settled this either.

## Fifteen Questions For Any Eval

1. Do the tasks state a goal, or spell out the steps to follow?
2. What was in the baseline, stated precisely enough to reproduce?
3. How many configurations were compared, and what does each gap isolate?
4. What happens when the agent stops and asks a clarifying question?
5. How many attempts per scenario?
6. Which checks are deterministic, and which are graded by a model?
7. Does a published pass mean once, or every time?
8. Did the skills actually get opened, and how often?
9. Are the scenarios and the scoring code published?
10. Can you still read the transcript behind an old result?
11. Is every result dated?
12. Is there a log of what the evals changed, including what didn't work?
13. What invalidates an earlier result, and does the tooling enforce it?
14. Do the scenarios still tell the configurations apart?
15. When a scenario failed, what got fixed: the product, or the scenario?

The baseline question is the one I'd want above all the others, because most of the rest depends on knowing what was compared. Each one has a section below, with published examples, including several where the thing that needs fixing is ours.

## Before You Run Anything

### 1. State The Goal, Not The Steps

Write each task the way a colleague would file a ticket: what you want to end up with, not how to get there.

A task that spells out the steps tests whether an agent can follow instructions, which you already knew it could. A task that states a goal and leaves the route open tests whether the product makes sense to an agent that has to work it out. That's the part that's hard to get any other way, and it's most of the reason to run any of this.

Over-specify and you build a suite that can't fail usefully. The agent follows the requirements list, the board goes green, and the failures real users are hitting were never in it. You may spend a month improving a number that was never measuring them, and the scores probably won't warn you, because a suite that can't fail looks exactly like a product that works. From the scores alone, which one are you looking at?

Our rule is that scenarios are ticket-shaped, so an agent "can finish confidently and be wrong". We wrote that down because adding a requirements list suppresses the very failure the scenario was built to catch. There's one deliberate exception: a scenario that exists to catch a hallucination "asks the question and nothing else", because anything you add around the question hands over the answer.

Having the rule doesn't save you, and a well-shaped task can still be a useless one that bills you every run. We have it written down and still filed an issue against our own scenarios for not separating one agent from another ([#47](https://github.com/hookdeck/evals/issues/47)). Guideline 14 has the suite-wide count.

Watch the environment as well as the wording. [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) writes this up better than anyone else in the survey. Their agents accepted invalid test data and read a `400` as success, and got stuck when a highlighted HTML frame stole focus in a browser form. Neither is a badly worded task. Both are the environment misbehaving, and both were scored as the model failing.

### 2. Define Your Baseline In Public

Write down exactly what the comparison run had available, and publish it somewhere a reader can find from the score.

Without it your own number is uninterpretable six months later, and nobody else's is usable at all. A reader who sees "+25 points from our skills" has no way to tell whether your skills are good or whether the run you compared against was a model with nothing.

Five of the publishers I looked at say what their baseline is, and between them they describe four different setups. [Auth0's](https://github.com/auth0/auth0-evals) is a single model call with no tools, working from training data alone, and [Clerk](https://github.com/clerk/clerk-evals) also documents a no-tools model baseline. [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) describes its baseline as an agent without documentation, while [ours at Hookdeck](https://github.com/hookdeck/evals) has the command line tool and a live API key. [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) compares a full agent with and without Boost, its package for giving agents Laravel-specific context.

Ours has web search too, and our published baseline doesn't say so. Agents used it on 34 of the 114 rows in the last snapshot. Say it if yours has search, because a baseline that can search is partly measuring how well other people's blog posts cover your product, and that changes between runs without you touching anything. [Convex's](https://www.convex.dev/llm-leaderboard) leaderboard has three tabs, and web access is a configuration of its own instead of something folded quietly into the baseline.

Those are not variations on a theme. An improvement measured against a model with nothing includes everything the agent gained by becoming an agent at all, and an improvement measured against a fully equipped agent doesn't. Present both as a percentage of scenarios completed and they look like the same kind of number.

[LangChain](https://www.langchain.com/blog/evaluating-skills) carries the largest difference in the survey, 9% to 82%, and its post does describe the setup: Claude Code running in Docker, with evaluation guidance. But you have to go and find that, and seventy-three points is exactly the size of number that gets quoted on its own. Put the definition beside the score instead. Auth0 and Clerk put their definitions in their repository documentation, where anybody can check them. Supabase's page doesn't say, though its repository pairs every experiment with a no-skills twin, so the definition is there for anyone who goes looking in the code. Paddle and Convex each say a sentence on the page. That's more than nothing and less than enough to reproduce from.

### 3. Run More Than Two Configurations

Add configurations, and publish a gap only between two that differ by a single change. Then every gap you publish is what that one change was worth.

You'll have to decide what to improve next, and documentation, skills and an MCP server are separate pieces of work with separate costs. If you compare a baseline against a run that adds all three, and the score goes up, you don't know which of the three moved it. You could spend a month on the MCP server when it was the documentation doing the work. [Auth0's framework](https://github.com/auth0/auth0-evals) puts it plainly in its README: "the delta between configurations tells you where to invest".

It runs five:

![Auth0's five configurations. A single model call with no tools leads to a full agent with file and shell tools; that step is what tool access alone is worth. Two comparisons branch from the agent, one adding skills and one adding MCP, and those two are never compared with each other. A fifth configuration runs everything together.](/images/agent-evals-auth0-configurations.svg)

Every published comparison starts from the second, because it's the one the others each add a single change to. The fifth, everything at once, is the number most publishers report on its own and the only one they report. It's the clearest published design I found, and I didn't come across another publisher running the same five.

Almost everyone runs two, ourselves included. Clerk and Paddle run three. Supabase, Laravel, Firebase and Hookdeck all publish a single with-and-without comparison. LangChain goes further than any of us, running skills consolidated into a few large files against skills split across small ones, and probing phrasing and formatting separately. None of us can say from our own published numbers whether the improvement came from what we wrote or from what the agent was allowed to do.

The objection is cost, and it's fair: at the same attempt count, five configurations need two and a half times as many runs as two. If you can only afford three, pick them around the one distinction you actually need to settle, and say which distinction that was.

### 4. Say How You Handle Clarifying Questions

Pick what your harness does when an agent stops and asks something, and write the choice down before you run anything.

Most harnesses are single-turn: the agent gets one go, and nothing replies to it. The agent ends its turn, nothing answers it, and it's scored on whatever state it left behind, which for a clarifying question is usually nothing. So a model careful enough to check before acting on somebody's project is scored exactly like a model that couldn't do the job. Your page will report incapability, and what it measured was caution.

That costs you the finding, not just the number. In August we ran six scenarios against one weaker model, three attempts each, with and without our skills. Three of the five failures in the skills-loaded half were [an agent asking a sensible question and stopping](https://github.com/hookdeck/evals/issues/57), and not one of those three was an agent that couldn't do the work. Without our skills the same model failed seven times out of eighteen and never once stopped to ask. That was a diagnostic run over six scenarios, not the published suite, and the concentration is what makes it look like a mechanism and not noise: our skills tell an agent to verify its context, a weaker model follows the instruction literally, and our scoring turns the compliance into a failure.

There are three positions, and a default you get by not choosing:

- **Say nothing.** [Supabase](https://github.com/supabase/evals) has no instruction, no canned answers and no detection anywhere in the repo. That's the default, and it's where we were.
- **Tell the agent not to ask.** [Clerk](https://github.com/clerk/clerk-evals) puts the same line on every path: "Do not ask clarifying questions. Complete the task with the information provided."
- **Write canned answers per scenario.** Closest to a real support workflow, though an agent asking something you didn't anticipate still stalls.
- **Let repetition absorb it.** [Vercel's harness](https://github.com/vercel-labs/agent-eval) counts a cached result as valid when at least one run passed, so a single run that stopped to ask doesn't decide the result.

One more comes from outside this category, and it's the one I'd steal from. [tau2-bench](https://github.com/sierra-research/tau2-bench) goes furthest. Asking is required there, because its simulated user withholds information until asked, and a question the scenario can't answer ends the episode as a recorded outcome instead of a silent zero.

Our position was that we didn't have one. We had copied our prompt from Supabase's and swapped in our own product, so the silence was inherited and never chosen, and we only found out what it was costing us by reading transcripts. We've since taken Clerk's option, and as guideline 13 records, making that change invalidated every result we'd published up to that point.

## While It Runs

### 5. Repeat Every Scenario

Run every scenario at least three times, and publish how many attempts you ran.

A single attempt can't tell a fix from a coincidence, so you'll act on noise. You'll ship something, watch the number move, and write it up as an improvement that was never there.

We did exactly that. We found a real defect in our command line tool, fixed it, and re-ran to measure what the fix bought. All four of the failures we'd expected it to address recovered on the old CLI too, once we ran them again. Our [record of that comparison](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) files it as a negative result: the failures were variance, and the evidence we'd have published was worthless. The fix was still correct. We just couldn't prove anything with it.

[Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) published the same discovery alongside its model comparison. Haiku 4.5 went from 7 out of 19 to 17 out of 19 on one evaluation, rerun, and GPT-5.3 Codex flipped from fail to pass on four evaluations, with the model, prompt and setup unchanged.

Once you know how much your results move on their own, say what that means for reading them. [Rails](https://rubyonrails.org/ai) does, in one line: differences of a few points between models are within run-to-run noise. That sentence tells a reader which of your gaps to ignore, and most published deltas in this survey, ours included, are smaller than the noise the publisher has admitted to.

[Rails](https://rubyonrails.org/ai) runs each evaluation three times and [Vercel's harness documentation](https://github.com/vercel-labs/agent-eval#tips) recommends ten. Three is where I'd start, and it isn't enough to settle a small difference. We didn't meet even that in the [snapshot published with v0.4.0](https://github.com/hookdeck/evals/releases/tag/v0.4.0), which used one attempt per scenario and configuration.

### 6. Say Which Checks A Model Grades

Publish which of your checks are deterministic and which are decided by a model.

Repeating a scenario, as guideline 5 tells you to, re-runs the grader along with the agent, so the two sources of variance arrive tangled together. Separating them means grading the same piece of work twice, and nothing in that process does. When a scenario fails you'll be deciding what to fix, and you won't know whether the agent got it wrong or your grader did.

Both kinds of check fail, and we have one of each. One of our judged checks kept flipping between runs, and we assumed the judge was being non-deterministic. It wasn't ([#22](https://github.com/hookdeck/evals/issues/22)). Replaying the same model against 96 stored transcripts put disagreement at about 5%, concentrated on a single rubric, and the cause turned out to be us: that scenario had two judged checks that contradicted each other about the same answer. One rewarded naming the mock destination URL as the cause, the other failed the same answer for attributing the failure to Hookdeck. Three runs were marked down for giving the best diagnosis available, and the frontier agent was one of them. We'd been blaming the instrument for a contradiction we had written.

Deterministic checks fail more quietly, because nothing about them looks uncertain. One of our scorers read a record's creation timestamp. An agent found a broken alert, diagnosed it exactly and repaired it, and scored zero, because repairing something doesn't change when it was created. We had written a check that rewarded leaving the broken alert in place and adding a duplicate beside it.

That scenario then punished the agents more as they got better. The more of them inspected the existing state before acting, the more found the broken alert and repaired it, and the more our scorer marked them down for it. The task never changed.

When we counted, eight of the twenty failures in our first release were ours, not the agents'. The [release notes](https://github.com/hookdeck/evals/releases/tag/v0.2.0) put the limit on it. Twelve remain and some of those will be real, so it isn't a claim that our instrument caused most of the failure. It's that one class of defect in our own scoring outweighed the skills delta, the gap we'd reported between one model and another, and every other effect the benchmark said it had measured. A benchmark whose defects are larger than its findings isn't measuring what it claims to yet, and the only reason we could say so is that we went looking. Our [improvement log](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) puts the general case better than I can. A pass rate cannot distinguish "the agent could not" from "we misled it".

Decide too what your scorer does when nothing was measured. A rate limit, an expired credential, a sandbox that never came up: is that the agent failing? Probably not, and counted as failures they'll leak into your comparison unevenly, because slower agents tend to hit timeouts more often. [Next.js](https://nextjs.org/evals) states its rule outright, that infrastructure failures are discarded and rerun instead of counted. Stripe's focus-stealing browser frame from guideline 1 is the same class of thing, scored the other way.

Where publishers do describe their method, they're doing markedly different things. [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) checks its suite with 315 Pest tests, about as deterministic as this gets. [Auth0](https://auth0.com/agent-experience) scores against a weighted hundred-point rubric with named dimensions, including correctness at 25 points, hallucination at 15 and security at 10. [WorkOS](https://workos.com/blog/writing-my-first-evals) runs both kinds on one harness for its command line installer, grading 40 scenarios across 16 frameworks with a functional grader for whether it worked and a separate quality grader scoring four dimensions from one to five. Those three numbers mean different things, and probably only the first would come back the same if somebody else reran it.

### 7. Say What A Pass Means Across Attempts

Publish both readings of a repeated scenario: how often it succeeded every time, and how often it succeeded at least once. If you'll only print one, say which.

Once you run a scenario more than once, "passed" stops being one thing. A model that succeeds three times out of three and one that succeeds once out of three can appear identically on your page. The reader picking between them for production work gets no warning that one of the two will fail them two times in three, and they'll find out in their own codebase instead of on yours.

[Grafana](https://o11ybench.ai/) does exactly this, in adjacent columns: success on all three attempts, and success on at least one.

![Grafana's o11y-bench leaderboard, showing Pass^3 and Pass@3 as adjacent columns alongside per-row cost, tokens and dates](/images/agent-evals-grafana-pass-columns.png)
 It's the most useful reporting idea I came across, because the gap between the two columns is itself information, and a reader can see how much your headline depends on which reading you picked. Publish the strict number alone and you understate a model that's capable but inconsistent. Publish the loose one alone and you flatter everybody.

Failing that, state the rule. [Next.js](https://nextjs.org/evals) says plainly that its success rate is at least one pass in four attempts. You may disagree with that choice, but you can't misread the number.

We haven't had to answer it, which is worse than answering it badly. The snapshot we released with v0.4.0 ran each scenario once in each configuration, so there was nothing to aggregate and no choice to disclose.

### 8. Check Your Skills Were Opened

Record how often the agent actually opened your skills, and publish that beside the score.

A skill that shows no improvement needs one of two opposite responses. If agents read it and it didn't help, rewrite the content. If they mostly didn't open it, the content is beside the point and your problem is discovery. The count is the only thing that tells you which, so without it you can spend weeks improving prose that nothing is reading.

[Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) measured it. Its skill left the pass rate unchanged at 53%. Reading the transcripts showed why. The skill was never invoked at all in 56% of cases. Adding an instruction to explore the project and then invoke the skill took the same skill to 79%, and changing the wording of that instruction changed the result again.

Be careful what you take from that. A flat aggregate doesn't tell you what happened in the 44% where the skill was opened, so this isn't yet a tidy story about good content nobody could find. What the count bought Vercel was a reason to suspect discovery instead of content, and that's a better thing to have than a flat 53% and a guess.

The [.NET team](https://github.com/dotnet/skills) publishes activation as a standard column beside its results, and I didn't find another results page carrying one. We're part of the problem: we record how often our skills were loaded in the results file behind our page, and never put it anywhere a reader would meet it.

## What To Publish

### 9. Publish Scenarios, Not Just Scores

Publish the task behind every scenario and the code that checks it.

A percentage asks a reader to trust you. The scenarios let them decide whether your tests resemble their work. That's what they're really asking. Withhold them and a developer choosing a model for their integration has to assume your tasks are like theirs, and they may not be at all.

[Supabase](https://github.com/supabase/evals) and [Hookdeck](https://github.com/hookdeck/evals) publish their scenarios and their scoring code. [Resend](https://github.com/resend/resend-skills) publishes prompts, expected outputs and checks in its skills repository, and no scoreboard anywhere. That's close to the inverse of the usual trade.

There's a real cost, and it gets worse over time. Anything you publish can be read by an agent and will eventually reach training data, so a high score on familiar tasks stops telling you how an agent handles an unfamiliar one. I'd still publish. If you're shipping skills and documentation at all, you're already trying to get your content in front of models, and being selective about only the test while broadcasting everything else is the wrong way round. Publish, expect the scenarios to age, and replace them.

### 10. Publish Durable Transcripts

Publish a redacted transcript for every result, and keep it reachable for as long as the result is on the page.

A score says an agent failed. The transcript says what it tried, and that's the difference between knowing you have a problem and knowing what to fix. It also lets a reader check your conclusion instead of accepting it, and find the things you missed. Our own product findings came from reading transcripts, not from the scoreboard.

We don't do this. The results file behind our page records how often agents asked for our docs and how often our skills were loaded, but transcripts have depended on expiring workflow artefacts, so nobody can inspect the decisions behind an older result. [Issue #21](https://github.com/hookdeck/evals/issues/21) records the gap.

The reason it isn't trivial is redaction. An agent working in a real project handles real credentials, and a transcript is exactly where one ends up. Ours does now refuse to export anything containing a key. We added that after live credentials reached a public run artefact and had to be rotated ([#20](https://github.com/hookdeck/evals/issues/20)).

### 11. Date Every Result

Put a date on every row, not one date on the page.

A snapshot can carry old runs forward, so a single page date quietly claims a freshness the individual numbers don't have. A reader comparing two models in your table may be comparing measurements taken weeks apart, pick the one that looks better, and never learn the comparison wasn't one.

[Convex](https://www.convex.dev/llm-leaderboard/with-guidelines) marks stale rows where they sit, and carries columns for how old each model is and when it last ran. I didn't find better. [Grafana](https://o11ybench.ai/) dates every row too. [Next.js](https://nextjs.org/evals) dates the rows in its superseded table and gives its current one a single page-level date, the thing this guideline is about.

Dating every row is necessary and it isn't sufficient, as we found out. Ours made it possible to discover that one of our snapshots mixed measurements taken weeks apart. They didn't stop us publishing it, and guideline 13 is about the rule that would have.

### 12. Log What The Evals Made You Change

Publish what your evals led you to change, including the changes that didn't work.

Publishing that log is what separates measuring from marketing, and it serves the second of the two reasons to run any of this. A page of scores with no record of what they caused is a page telling you the product is good. A log of what the scores changed is a page telling you the product is improving. That's a different claim, and a more useful one.

The failures matter more than the successes here. Our [improvement log](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) records the CLI comparison above as a negative result, so a reader can follow the finding, the fix, and the evidence that turned out not to support it. Anyone can publish the wins.

I didn't find another running record of the kind, having looked for a changelog, a loop file or a findings section in the repositories linked at the end of this post. [Convex](https://stack.convex.dev/convex-evals) discloses that it tuned its guidelines against the categories models did worst at, and that's the same instinct without the running record.

## After It Ships

### 13. Decide What Invalidates Earlier Results

Write down in advance which changes make an old result uncomparable, and enforce it when one does.

Without that rule you will eventually publish a table whose rows were measured under different conditions, and present the difference between them as progress. It's an easy thing to do accidentally. The suite still runs, the numbers still appear, and nothing warns you that half of them predate a change to the prompt.

We did it. Our 25 August 2026 snapshot carried 22 of its 114 rows from measurements taken on 13 August 2026, across intervening changes to the command line tool, the scorers and the prompt. [Issue #60](https://github.com/hookdeck/evals/issues/60) records how the merge mixed those measurements without saying so at snapshot level.

The next time, we caught it. We added a sentence to the prompt shared by every run, telling agents not to ask clarifying questions. That changed the conditions under which every result had been measured, so the totals either side of it couldn't be presented as the agent getting better. We held publishing until a clean run existed, and the [v0.4.0 release notes](https://github.com/hookdeck/evals/releases/tag/v0.4.0) explain why the earlier totals aren't comparable.

[Vercel's harness](https://github.com/vercel-labs/agent-eval#result-reuse) puts the rule in the tooling. It fingerprints every result twice: once over the scenario files and the configuration together, which decides whether a result can be reused at all, and once over the scenario files alone. Having both lets it tell a changed test from a changed setting and rerun only what needs it. It has limits, and the documentation says so. Functions that alter prompts can't be hashed, so you're told to force a rerun when those change.

Record the exact versions too, and not just the model name. An agent is a model plus its tools and its loop, so a new release of the command line agent changes what you measured as surely as a prompt edit does, and a provider can move what sits behind an alias without telling you. I'd pin and record the model string, the agent version and the harness version on every row. [Convex](https://www.convex.dev/llm-leaderboard/with-guidelines) gets closest of anyone I saw, with a column for how old each model is, and that still isn't the same as knowing which build answered.

[Convex](https://www.convex.dev/llm-leaderboard) does the reader-facing half of this better than anyone I found. Its leaderboard carries a benchmark version selector, so the page tells you which suite produced the numbers you're looking at and lets you go back to an older one, instead of quietly replacing them. When I took the screenshot below on 17 September it was showing 112 evals as of 9 September, and it had moved to 10 September within the hour.

![Convex's leaderboard showing a benchmark version selector reading 10 September 2026, 112 evals, above columns for run cost, model age and time since last run](/images/agent-evals-convex-version-and-dates.png)

[tau2-bench](https://github.com/sierra-research/tau2-bench) shows how precisely the boundary can be drawn. Its v1.0.1 correction made earlier results for the banking-knowledge domain noncomparable, so it re-graded the affected submissions and kept a tag for reproducing the old behaviour. The other domains were untouched.

### 14. Keep Easy Scenarios Out Of The Headline

Separate the scenarios every configuration passes from the total you put at the top of the page.

Your headline number is the one people quote, and it should answer the question the reader came with. That question is usually which of these options to pick. Tasks everybody completes can't answer it. Leave enough of them in and two genuinely different configurations converge on similar-looking percentages, so a reader concludes the choice doesn't matter much when your own data can't support that either way.

Eleven of the nineteen scenarios in our [1 September 2026 snapshot](https://raw.githubusercontent.com/hookdeck/evals/v0.4.0/results/latest.json) were passed by every one of the six model-and-configuration pairs we ran. [Storybook's page](https://storybook-evals.vercel.app/) likewise shows 100% across four configurations. Both ran a single attempt, so neither of us can say how reliably any of it would happen again. [Our issue on scenarios that don't distinguish agents](https://github.com/hookdeck/evals/issues/47) works through the problem, including a task whose expected difficulty didn't survive contact with the agents.

Convex shows the same squeeze arriving a different way. On the 111-eval benchmark that preceded the current 112, the top five [with guidelines](https://www.convex.dev/llm-leaderboard/with-guidelines) sat within 2.3 points of each other on a hundred-point scale, from 96.4 down to 94.1. The top five [without them](https://www.convex.dev/llm-leaderboard/no-guidelines) spread over 4.1 points, from 84.7 to 80.6. Only three of the five models are common to both lists, so that's two leaderboards compared and not one group measured twice. Improving the thing you're measuring leaves less room to tell the leaders apart. It's a good problem to have and still a problem.

Don't delete these scenarios. Keep them as regression tests, because a scenario everyone passes today is exactly what catches the week somebody stops passing it. Our [README](https://github.com/hookdeck/evals/blob/v0.4.0/README.md) separates regression scenarios from benchmark totals for that reason. If you add harder ones, say which version of the suite a result came from. Otherwise the suite getting harder looks like the models getting worse.

### 15. Fix The Product, Not The Scenario

When a scenario fails, change the product, the docs or the skills. Don't change the scenario to make the failure go away.

Both routes make the number go up, and only one of them makes anything better. The second is quicker, and you'll be most tempted by it on the week the numbers are due and the release is behind, and that's exactly when you shouldn't be trusted to make the call. So make it now, in writing, while nothing is at stake.

Our [improvement procedure](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) requires the fix to be to the product, the docs or the skills, and says why. Editing the scenario until it passes proves nothing. Making that move visible is most of what the file is for.

There's a subtler version of the same problem, and it doesn't feel like cheating at all. If you write documentation or skills aimed squarely at the failures your own suite catches, your score improves without telling you anything about tasks outside it. That's still worth doing, and it needs saying. [Convex](https://stack.convex.dev/convex-evals) says it, describing how it targeted the categories models did worst at and tuned its guidelines to pass those cases. The disclosure is what makes the number usable.

## Suite Size And Cost

Neither of these is a guideline, because the honest answer to both is that it depends. They're the first two questions anyone asks, though, and the survey has enough in it to beat a shrug.

On size, published suites don't even agree on what they're counting.

| Publisher | How many | What it calls them |
|---|---|---|
| [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) | 11 | environments |
| [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) | 17 | tasks |
| Hookdeck | 19 | scenarios |
| [Rails](https://rubyonrails.org/ai) | 21 + 20 | tasks, then tickets |
| [Nuxt](https://nuxt.com/evals) | 31 | evals |
| [Next.js](https://nextjs.org/evals) | 31 | evals |
| [Grafana](https://o11ybench.ai/) | 63 | tasks |
| [Convex](https://www.convex.dev/llm-leaderboard) | 112 | evals |

That right-hand column is the reason I wouldn't average the middle one. Half of them sit between nineteen and forty-one, so a couple of dozen is unremarkable.

Size matters less than how many of them work. On our 1 September snapshot, eleven of our nineteen were passed by everything we ran, so eight were doing the job, and eight is thin. Count how many distinct things your product asks an agent to do, write one scenario for each, and then check how many of them separate anything.

On cost there's one figure I'd lean on and one I wouldn't. Rails measured it: [504 runs at $491](https://rubyonrails.org/2026/8/13/agents-on-rails-the-first-benchmark-report) for the first stage of its benchmark, or about 97 cents a run, though that average is dominated by its expensive models and came from a far lighter harness than a coding agent. Ours is often quoted as $81 for a 114-run matrix, and that number is arithmetic, not a measurement. It's a real figure for a smaller suite, scaled up. Our own notes say to re-measure instead of re-scaling when a decision turns on it, and they say it because conflating the two once had us reporting the judge at twenty-eight times its real cost.

So take Rails' rate and treat ours as an order of magnitude. Multiply scenarios by configurations by attempts, then by a dollar. Twenty scenarios, three configurations, three attempts: 180 runs, so somewhere under $200 a cycle. A single improvement loop, where you re-run only the handful of scenarios a fix should have moved, cost us about $5, and that one was measured.

One thing that understates all of this, and one that's just worth knowing. Some publishers do put cost on the page. Grafana carries total and average cost per row, in the same table as its two pass columns above, and Convex carries a run cost. We don't, and our reason is weaker than it sounds: Claude Code reports a cost and Codex reports tokens and no cost, so a breakdown across agents is awkward to assemble. Awkward isn't impossible. And compute is the cheap part. Nothing above prices writing the scenarios, writing the scorers, or reading the transcripts, and the transcripts are where our own product findings came from. Budget for a person, not for an API bill.

How often to run it is the question I can least help with, because almost nobody states a cadence on their results page. Ours runs weekly at a single attempt, and our own improvement log says outright that a weekly cadence at one attempt cannot tell a fix from variance. That's in the open list further down. Netlify's AXIS is built to sit in CI, so that implies every change. Pick a frequency you can afford to repeat at the attempt count guideline 5 asks for, because a single attempt every week is the guideline 5 problem on a schedule.

## Why Not One Shared Benchmark?

A payments API and an observability platform involve different work, so I wouldn't expect one shared task suite to answer every platform's questions. We can still agree on what a published result should disclose, even where the tasks differ.

[MLPerf's training rules](https://github.com/mlcommons/training_policies/blob/master/training_rules.adoc) provide a useful precedent for labelling results. Its Closed division constrains the model, preprocessing, training method and quality target, while the Open division permits more variation. Results must name their division, so the reader knows which rules apply.

I'd take that disclosure principle for agent evals: explain what you gave the agent, how often it tried, when it ran, and what counted as success. Your tasks stay specific to your product, and nobody has to guess how the number was produced.

## Hookdeck Against This List

I've used our own evals as the example of what goes wrong all the way through this, so it's fair to turn the list on them. Here's my accounting: five fixed, one decided, six open.

The five repairs are shipped:

- The command line tool used to work behind your back in a guest project, so an agent could report success having built everything in a throwaway account nobody would find again. Corrected in CLI 2.5.0.
- The skill that never explained how to authenticate without a terminal now says so.
- The alert scorer from guideline 6 that required a new record, so repairing a broken one scored zero. Corrected in the [v0.2.0 notes](https://github.com/hookdeck/evals/releases/tag/v0.2.0), though the issue it came from is still open for a separate reason.
- The two contradictory judged checks from guideline 6, now rewritten so they can both be satisfied ([#22](https://github.com/hookdeck/evals/issues/22)).
- The scoring itself, which took us a while to see.

We scored a run as a fraction of the checks that ran, and our scorers stop at the first failure. So each agent's denominator was set by its own failures: one that fell at the first hurdle was scored out of one check, and one that got four things right and missed the fifth was scored out of five. No two agents were being marked over the same set of checks, so the percentages were never comparable in the first place. On the 25 August 2026 snapshot that put the deliberately weak model above a frontier one. We now count whole scenarios completed, so a scenario counts once whatever happens inside it. That's corrected in [v0.4.0](https://github.com/hookdeck/evals/releases/tag/v0.4.0), in the same release as a batch of smaller harness corrections.

The sixth isn't a repair, which is why it sits outside that count. We took a position on clarifying questions where we'd previously had none, and that closed the issue at the cost of suppressing exactly the caution guideline 4 says is worth measuring. It's defensible and it isn't a win, so counting it as one would be the flattering arithmetic this section exists to avoid.

Six are open, and four of them are filed. We still don't publish transcripts that would let you check a result yourself ([#21](https://github.com/hookdeck/evals/issues/21)). A merge can still carry rows forward from an older run without saying so ([#60](https://github.com/hookdeck/evals/issues/60)). And on that same snapshot eleven of our nineteen scenarios were passed by everything we ran, so most of the suite wasn't doing the job the headline claims for it (#47 again).

The one I'd most like to close is the last of those four: our skills make a weaker model worse ([#2](https://github.com/hookdeck/evals/issues/2)). The question-stopping in guideline 4 explains part of it and not all of it. On the 1 September 2026 run, loading our skills cost Codex GPT-5.4-mini one scenario out of nineteen while gaining Claude Code two. That's been open since the first week.

The last two aren't filed, because they're design limits and not defects. I've named them because leaving them out is how this kind of list gets flattering. We run two configurations, so by guideline 3 we can't say whether our gains came from what we wrote or from what the agent was allowed to do. And we ran each scenario once in the snapshot this post cites, against the three I've just told you to run. The weekly run is still a single attempt.

Counting up which of the fifteen we meet, I don't much like the pattern. Five outright: define the baseline, publish the scenarios, date every row, keep the change log, and fix the product instead of the scenario. Every one of those costs a piece of writing and nothing else.

Three we half-meet. We declared one prompt change incomparable and held publishing for it, and #60 above means a merge can still carry rows forward silently. We fixed both scorers in guideline 6 without publishing which of our checks a model grades. And we wrote the scenario-shape rule down and still filed #47 against our own scenarios. One more, the clarifying-question policy, we decided rather than fixed.

That leaves six we fail, and five of them cost compute or engineering time we haven't spent. The sixth is guideline 8, publishing the skill-loading count we already record, and that one is as cheap as the five at the top. We haven't done it anyway. Five, three, one and six is fifteen. I'd like to read those five as discipline, and I don't think that's what they are.

Finding the problem is the cheap part. Running the evals is what turns a suspicion into something you can file.

## Harnesses Worth Starting From

Don't build the sandboxing and result handling yourself. Two agent-eval harnesses and two general evaluation frameworks are already available, built for different jobs, so the choice is about what you want out the other end.

[Vercel's agent-eval](https://github.com/vercel-labs/agent-eval) is the one to look at first if you want to publish a comparison like the ones in this post. It's MIT licensed and it's the shared engine behind the Next.js, Nuxt and Storybook results, so it has more publishing adopters than anything else I found. Svelte uses it and publishes nothing, which tells you the harness doesn't make you honest on its own. The baseline is an ordinary configuration file with no privileged status, so it will support the single-change designs guideline 3 asks for without imposing one. Its own playground is empty, though, at zero experiments and zero runs, so the adopters are the evidence and not the project itself.

[Netlify's AXIS](https://axis.run) answers a different question. It describes itself as Lighthouse for agent experience: 23 agent adapters, weighted dimensions and a score out of 100 you can gate a build on. Reach for it if you want a number that goes in CI, not a comparison between configurations. I couldn't find a leaderboard or named scores of its own on the site.

[promptfoo](https://promptfoo.dev), which [Shopify](https://github.com/Shopify/agent-skills) names as its skills-evaluation tool, and [Inspect AI](https://inspect.aisi.org.uk), which [Flutter](https://github.com/flutter/evals) builds on, are general LLM evaluation frameworks, not agent-eval harnesses. Start from one of those if your team already runs it for other model testing and you'd rather extend it than adopt something new. Worth knowing that I couldn't find published scores from Flutter, so you'd be further from a worked example.

Whichever you adopt, none of them decides what your baseline represents or what you disclose about it. That part is still yours, and it's guideline 2.

## The Pages I Looked At

The results pages and posts cited here are a selection from the wider survey, so the platforms named in this post don't add up to the twenty-three it found. A dash in the code column means no code link is included in this table.

| Publisher | Results | Code |
|---|---|---|
| Supabase | [supabase.com/evals](https://supabase.com/evals) | [supabase/evals](https://github.com/supabase/evals) |
| Clerk | [clerk.com/llm-leaderboard](https://clerk.com/llm-leaderboard) | [clerk/clerk-evals](https://github.com/clerk/clerk-evals) |
| Auth0 | [auth0.com/agent-experience](https://auth0.com/agent-experience) | [auth0/auth0-evals](https://github.com/auth0/auth0-evals) |
| Convex | [convex.dev/llm-leaderboard](https://www.convex.dev/llm-leaderboard) | [get-convex/convex-evals](https://github.com/get-convex/convex-evals) |
| Paddle | [developer.paddle.com/llm-benchmark](https://developer.paddle.com/llm-benchmark/) | - |
| Next.js | [nextjs.org/evals](https://nextjs.org/evals) | [vercel/next-evals-oss](https://github.com/vercel/next-evals-oss) |
| Nuxt | [nuxt.com/evals](https://nuxt.com/evals) | [nuxt/nuxt-evals](https://github.com/nuxt/nuxt-evals) |
| Grafana | [o11ybench.ai](https://o11ybench.ai/) | [grafana/o11y-bench](https://github.com/grafana/o11y-bench) |
| .NET | [dotnet.github.io/skills](https://dotnet.github.io/skills/) | [dotnet/skills](https://github.com/dotnet/skills) |
| Rails | [rubyonrails.org/ai](https://rubyonrails.org/ai) | [rails/ai-evals](https://github.com/rails/ai-evals) |
| Tinybird | [llm-benchmark.tinybird.live](https://llm-benchmark.tinybird.live/) | - |
| Storybook | [storybook-evals.vercel.app](https://storybook-evals.vercel.app/) | [storybookjs/storybook](https://github.com/storybookjs/storybook/tree/next/agent-eval) |
| Callstack | [rn-evals.vercel.app](https://rn-evals.vercel.app/) | [callstackincubator/evals](https://github.com/callstackincubator/evals) |
| Hookdeck | [hookdeck.com/evals](https://hookdeck.com/evals) | [hookdeck/evals](https://github.com/hookdeck/evals) |

Published as a post rather than a page: [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) ([harness](https://github.com/stripe/ai/tree/main/benchmarks)), [Netlify](https://www.netlify.com/blog/how-we-measure-netlify-agent-experience/), [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel), [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), [LangChain](https://www.langchain.com/blog/evaluating-skills), [Firebase](https://firebase.blog/posts/2026/08/eval-driven-development-agent-skills/), [WorkOS](https://workos.com/blog/writing-my-first-evals), [Convex](https://stack.convex.dev/convex-evals) and [Supabase](https://supabase.com/blog/introducing-supabase-evals).

<!--
DRAFT NOTES - REMOVE BEFORE PUBLISHING

banned: arm, cell, treatment, context layer, overfitting

Reviewed 16 and 17 September 2026: explanation-shape passes, two cold reads (a builder and a
practitioner who has already published evals), a mechanical consistency audit after renumbering,
and a claims fact-check.

Review status:
- The claim-by-claim ledger is section 1c of the private working notes. A 17 September
  fact-check found roughly 26 claims with no row; the blocking ones were corrected or cut and
  the rest still need rows before publication. Do not assume coverage is complete.
- Where two ledger rows conflict, the later narrowing wins. Row 45 was withdrawn for
  contradicting row 34.
- Fifteen guidelines. Two were added on 17 September: scenario design and scoring method.
  Inserting them shifted every number from 1 to 13; all cross-references were re-checked.
- Voice check: zero errors, zero warnings.
- Citations: 61 distinct destinations, all resolving 200 on 17 September. Re-resolve before
  publishing.

OPEN DECISION for Phil:
- Section 10 of the working notes says run costs "should not be foregrounded in a personal
  post", and the redaction block below says no internal pricing. The cost section currently
  publishes $81 for 114 runs and ~$5 for an improvement loop. Those are ledgered `verified`
  (row 54) but the redaction guidance was never withdrawn. Decide before publishing: keep the
  figures, or give the per-run rate from Rails alone.

Before publishing:
- Review the claim corrections recorded in the audit and the updated claims ledger.
- Distinguish dated snapshots from current results, and retries from independent repetitions.
- Keep absence claims scoped to what was searched; never infer absence from a missing link.
- Run the voice check on the final source and resolve every error.
- Remove these editorial notes when publishing.

REDACTION: Public repositories, results, issues and releases are citable. Do not include
internal metrics, revenue, pricing, unreleased work, project or tenant identifiers,
private-repository paths or local filesystem paths.
-->
