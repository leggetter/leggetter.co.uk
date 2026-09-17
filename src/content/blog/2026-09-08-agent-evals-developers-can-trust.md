---
title: "How to Publish Agent Evals Developers Can Trust"
draft: true
aiAssisted: true
excerpt: "While building Hookdeck's agent evals page, I directed an AI-assisted survey of how other developer platforms publish their results. These thirteen guidelines cover what I'd check before trusting a score, including several things we got wrong ourselves."
---

Ask an AI coding agent to wire up webhook handling, or authentication, or a database schema, and how well it does depends on how much sense your product makes to a model. Developer platforms have started measuring that, and publishing what they find.

The measurement is called an eval. You write a set of realistic tasks, hand each one to an agent working in a real project, and check whether what it built actually works. Then you run the same tasks again with one thing changed, usually the instructions and documentation you publish for agents to read, the files most people now call skills, and compare the two. What gets published is usually a score for each of the two, and the difference between them.

[Supabase](https://supabase.com/evals), [Clerk](https://clerk.com/llm-leaderboard), [Auth0](https://auth0.com/agent-experience), [Convex](https://www.convex.dev/llm-leaderboard/with-guidelines), [Paddle](https://developer.paddle.com/llm-benchmark/) and [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) all publish one.

Platforms run them for two reasons. The published scores are meant to tell a developer which model to trust with an integration. Watching what the agent actually did to earn those scores tells the platform where its own documentation, APIs and tooling fail it. That is hard to learn any other way, because an agent that gets lost doesn't file a support ticket.

I've been building [an evals page for Hookdeck](https://hookdeck.com/evals), and wanted to know what a useful published result should include. I directed an AI-assisted survey which, by 7 September 2026, had found at least twenty-three platforms publishing results, through pages, posts or repositories.

These are thirteen guidelines I'd give anyone setting out to build and publish a set of evals for their own product. If you only ever read somebody else's scores, the checklist below is the part written for you, because it's the questions a published number should already have answered. Everything after the checklist is the working behind it, and that's addressed to whoever has to do the job. Each guideline draws on a published example or a problem we found in our own evals, so Hookdeck appears repeatedly as the thing that needs fixing.

Here are the terms I use below.

- **Agent**: the thing doing the work. A model, plus the tools it can use, plus a loop that lets it read files, run commands and try again. Claude Code and Codex are agents; a single model call is not.
- **Scenario**: one test - a task written as a prompt, plus a way of checking whether the agent did it.
- **Scorer**: the code that does that checking, usually by inspecting what the agent built rather than by reading what it said.
- **Run**: one attempt at one scenario with a particular agent, model and configuration.
- **Configuration**: what the agent is given for a run besides the model - the tools it can call, and whether your skills, docs or MCP server are available to it. Run three models against two configurations and you get six combinations.
- **Baseline**: the configuration you compare the others against.
- **Skills**: files you publish that tell an agent how your product works. The agent decides whether to open them, which turns out to matter a lot.
- **MCP**: the Model Context Protocol, used here to give an agent access to a product's tools.
- **Harness**: the code that runs your scenarios, prepares the agent's environment and records what happened.
- **Transcript**: the record of what the agent actually did during a run, as opposed to whether it passed.
- **Snapshot**: one set of results, from one moment, published as a file you can point at later.

## Thirteen Questions To Ask Of Any Eval

1. What was in the baseline, stated precisely enough to reproduce?
2. How many configurations were compared, and what does each gap isolate?
3. What happens when the agent stops and asks a clarifying question?
4. How many attempts per scenario?
5. Does a published pass mean once, or every time?
6. Did the skills actually get opened, and how often?
7. Are the scenarios and the scoring code published?
8. Can you still read the transcript behind an old result?
9. Is every result dated?
10. Is there a log of what the evals changed, including what didn't work?
11. What invalidates an earlier result, and does the tooling enforce it?
12. Do the scenarios still tell the configurations apart?
13. When a scenario failed, what got fixed: the product, or the scenario?

The first is the one I'd want above all the others, because most of the rest depends on knowing what was compared. Each one has a section below, with published examples, including several where the thing that needs fixing is ours.

## Before You Run Anything

### 1. Define Your Baseline In Public

Write down exactly what the comparison run had available, and publish it somewhere a reader can find from the score.

Without it your own number is uninterpretable six months later, and nobody else's is usable at all. A reader who sees "+25 points from our skills" has no way to tell whether your skills are good or whether the run you compared against was a model with nothing.

Five of the publishers I looked at say what their baseline is, and between them they describe four different setups. [Auth0's](https://github.com/auth0/auth0-evals) is a single model call with no tools, working from training data alone, and [Clerk](https://github.com/clerk/clerk-evals) also documents a no-tools model baseline. [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) describes its baseline as an agent without documentation, while [ours at Hookdeck](https://github.com/hookdeck/evals) has the command line tool, a live API key and web search available. Say so if yours has search, because a baseline that can search is partly measuring how well other people's blog posts and answers cover your product, and that changes between runs without you touching anything. [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) compares a full agent with and without Boost, its package for giving agents Laravel-specific context.

Those are not variations on a theme. An improvement measured against a model with nothing includes everything the agent gained by becoming an agent at all, and an improvement measured against a fully equipped agent doesn't. Present both as a percentage of tasks completed and they look like the same kind of number.

[LangChain](https://www.langchain.com/blog/evaluating-skills) shows what it costs to leave this out. Its baseline is described only as "without any skills loaded", with nothing about whether the agent had tools, documentation or internet access, and it carries the largest published difference in the survey: 9% to 82%. That 9% is either a startling result about skills or an agent that was given almost nothing, and from the page you can't tell which. Auth0 and Clerk put their definitions in their repository documentation, where anybody can check them. Supabase, Paddle and Convex don't define one anywhere I could find.

### 2. Run More Than Two Configurations

Add configurations, and publish a gap only between two that differ by a single change. Then every gap you publish is what that one change was worth.

You'll have to decide what to improve next, and documentation, skills and an MCP server are separate pieces of work with separate costs. If you compare a baseline against a run that adds all three, and the score goes up, you don't know which of the three moved it. You could spend a month on the MCP server when it was the documentation doing the work. [Auth0's framework](https://github.com/auth0/auth0-evals) puts it plainly in its README: "the delta between configurations tells you where to invest".

It runs five: a single model call with no tools, then a full agent with file and shell tools, then that agent plus skills, then that agent plus MCP, then everything together. The comparisons all run off the second one, because it's the configuration the others each add a single change to. The step from the first to the second is what tool access alone is worth. The step from the second to the third is what your skills are worth. The step from the second to the fourth is what your MCP server is worth. The third and fourth are never compared with each other, because two changes separate them. The fifth measures the compound effect of running everything at once. That's the number most publishers report on its own. It's the clearest published design I found, and nobody else in the survey has copied it.

Almost everyone runs two, ourselves included. Clerk and Paddle run three. Supabase, Laravel, LangChain, Firebase and Hookdeck all publish a single with-and-without comparison. None of us can say from our own published numbers whether the improvement came from what we wrote or from what the agent was allowed to do.

The objection is cost, and it's fair: at the same attempt count, five configurations need two and a half times as many runs as two. If you can only afford three, pick them around the one distinction you actually need to settle, and say which distinction that was.

### 3. Say How You Handle Clarifying Questions

Pick what your harness does when an agent stops and asks something, and write the choice down before you run anything.

Most harnesses are single-turn: the agent gets one go, and nothing replies to it. The agent ends its turn, nothing answers it, and it's scored on whatever state it left behind, which for a clarifying question is usually nothing. So a model careful enough to check before acting on somebody's project is scored exactly like a model that couldn't do the job. Your page will report incapability, and what it measured was caution.

That costs you the finding, not just the number. In August we ran six scenarios against one weaker model, three attempts each, with and without our skills. Three of the five failures in the skills-loaded half were [an agent asking a sensible question and stopping](https://github.com/hookdeck/evals/issues/57), and not one of those three was an agent that couldn't do the work. Without our skills the same model failed seven times out of eighteen and never once stopped to ask. That was a diagnostic run over six scenarios, not the published suite, and the concentration is what makes it look like a mechanism and not noise: our skills tell an agent to verify its context, a weaker model follows the instruction literally, and our scoring turns the compliance into a failure.

Four positions are available, and they're all defensible. [Supabase](https://github.com/supabase/evals) says nothing, with no instruction, no canned answers and no detection anywhere in the repo. [Clerk](https://github.com/clerk/clerk-evals) instructs the agent not to ask, in the same line on every path: "Do not ask clarifying questions. Complete the task with the information provided." You can write canned answers per scenario. That's closest to a real support workflow, though an agent asking something you didn't anticipate still stalls. Or you can let repetition absorb it, as [Vercel's harness](https://github.com/vercel-labs/agent-eval) does by treating a cached result as at least one passing run, so a single run that stopped to ask doesn't decide the result.

A fifth comes from outside this category, and it's the one I'd steal from. [tau-bench](https://github.com/sierra-research/tau2-bench) goes furthest. Asking is required there, because its simulated user withholds information until asked, and a question the scenario can't answer ends the episode as a recorded outcome instead of a silent zero.

Our position was that we didn't have one. We had copied our prompt from Supabase's and swapped in our own product, so the silence was inherited and never chosen, and we only found out what it was costing us by reading transcripts. We've since taken Clerk's option, and as guideline 11 records, making that change invalidated every result we'd published up to that point.

## While It Runs

### 4. Repeat Every Scenario

Run every scenario at least three times, and publish how many attempts you ran.

A single attempt can't tell a fix from a coincidence, so you'll act on noise. You'll ship something, watch the number move, and write it up as an improvement that was never there.

We did exactly that. We found a real defect in our command line tool, fixed it, and re-ran to measure what the fix bought. All four of the failures we'd expected it to address recovered on the old CLI too, once we ran them again. Our [record of that comparison](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) files it as a negative result: the failures were variance, and the evidence we'd have published was worthless. The fix was still correct. We just couldn't prove anything with it.

[Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) published the same discovery alongside its model comparison. Haiku 4.5 went from 7 passing assertions out of 19 to 17 out of 19 on a rerun, and GPT-5.3 Codex flipped from fail to pass on four evaluations, with the model, prompt and setup unchanged.

[Rails](https://rubyonrails.org/ai) runs each evaluation three times and [Vercel's harness documentation](https://github.com/vercel-labs/agent-eval#tips) recommends ten. Three is where I'd start, and it isn't enough to settle a small difference. We didn't meet even that in the [snapshot published with v0.4.0](https://github.com/hookdeck/evals/releases/tag/v0.4.0), which used one attempt per scenario and configuration.

### 5. Say How You Counted Success Across Attempts

Publish both readings of a repeated scenario: how often it succeeded every time, and how often it succeeded at least once. If you'll only print one, say which.

Once you run a scenario more than once, "passed" stops being one thing. A model that succeeds three times out of three and one that succeeds once out of three can appear identically on your page. The reader picking between them for production work gets no warning that one of the two will fail them two times in three, and they'll find out in their own codebase instead of on yours.

[Grafana](https://o11ybench.ai/) does exactly this, in adjacent columns: success on all three attempts, and success on at least one. It's the most useful reporting idea I came across, because the gap between the two columns is itself information, and a reader can see how much your headline depends on which reading you picked. Publish the strict number alone and you understate a model that's capable but inconsistent. Publish the loose one alone and you flatter everybody.

Failing that, state the rule. [Next.js](https://nextjs.org/evals) says its success rate is at least one pass in four attempts, and that infrastructure failures are discarded and rerun instead of counted. You may disagree with those choices, and you can't misread the number.

We've avoided the question by not earning it. The snapshot we released with v0.4.0 ran each scenario once in each configuration, so there was nothing to aggregate. Not having to choose is a worse position than choosing badly.

### 6. Check Your Skills Were Opened

Record how often the agent actually opened your skills, and publish that beside the score.

A skill that shows no improvement needs one of two opposite responses. If agents read it and it didn't help, rewrite the content. If they mostly didn't open it, the content is beside the point and your problem is discovery. The count is the only thing that tells you which, so without it you can spend weeks improving prose that nothing is reading.

[Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) measured it. Its skill left the pass rate unchanged at 53%. Reading the transcripts showed why that number was hard to interpret: the skill was never invoked at all in 56% of cases. Adding an instruction to explore the project and then invoke the skill took the same skill to 79%, and changing the wording of that instruction changed the result again.

Be careful what you take from that. The skill was opened in the other 44% and still moved nothing, so this isn't a tidy story about good content nobody could find. What the count bought Vercel was the ability to reason about that flat 53% at all, instead of guessing at it.

The [.NET team](https://github.com/dotnet/skills) publishes activation as a standard column beside its results, and I didn't find another results page carrying one. We're part of the problem: we record how often our skills were loaded in the results file behind our page, and never put it anywhere a reader would meet it.

## What To Publish

### 7. Publish The Scenarios, Not Just The Scores

Publish the tasks, the prompts and the code that scores them.

A percentage asks a reader to trust you. The scenarios let them decide whether your tests resemble their work. That's what they're really asking. Withhold them and a developer choosing a model for their integration has to assume your tasks are like theirs, and they may not be at all.

[Supabase](https://github.com/supabase/evals) and [Hookdeck](https://github.com/hookdeck/evals) publish their scenarios and their scoring code. [Resend](https://github.com/resend/resend-skills) does something odd and interesting: it publishes prompts, expected outputs and checks in its skills repository, and no scores at all, the inverse of the usual trade.

There's a real cost, and it gets worse over time. Anything you publish can be read by an agent and will eventually reach training data, so a high score on familiar tasks stops telling you how an agent handles an unfamiliar one. I'd still publish. If you're shipping skills and documentation at all, you're already trying to get your content in front of models, and being selective about only the test while broadcasting everything else is the wrong way round. Publish, expect the scenarios to age, and replace them.

### 8. Publish Transcripts That Outlive The Run

Publish a redacted transcript for every result, and keep it reachable for as long as the result is on the page.

A score says an agent failed. The transcript says what it tried, and that's the difference between knowing you have a problem and knowing what to fix. It also lets a reader check your conclusion instead of accepting it, and find the things you missed. Our own product findings came from reading transcripts, not from the scoreboard.

We don't do this. Our published results record how often agents asked for our docs and how often our skills were loaded, but transcripts have depended on expiring workflow artefacts, so nobody can inspect the decisions behind an older result. [Issue #21](https://github.com/hookdeck/evals/issues/21) records the gap.

The reason it isn't trivial is redaction. An agent working in a real project handles real credentials, and a transcript is exactly where one ends up. Ours does now refuse to export anything containing a key, a fix that exists because it had to.

### 9. Date Every Result

Put a date on every row, not one date on the page.

A snapshot can carry old runs forward, so a single page date quietly claims a freshness the individual numbers don't have. A reader comparing two models in your table may be comparing measurements taken weeks apart, pick the one that looks better, and never learn the comparison wasn't one.

[Convex](https://www.convex.dev/llm-leaderboard/with-guidelines) handles it best of anyone I looked at: stale rows say so where they sit, and the table carries columns for how old each model is and when it last ran. [Grafana](https://o11ybench.ai/) and [Next.js](https://nextjs.org/evals) both date every row too.

Dating every row is necessary and it isn't sufficient, as we found out. Ours made it possible to discover that one of our snapshots mixed measurements taken weeks apart. They didn't stop us publishing it, and guideline eleven is about the rule that would have.

### 10. Log What The Evals Made You Change

Publish what the benchmark led you to change, including the changes that didn't work.

Publishing that log is what separates measuring from marketing, and it serves the second of the two reasons to run any of this. A page of scores with no record of what they caused is a page telling you the product is good. A log of what the scores changed is a page telling you the product is improving. That's a different claim, and a more useful one.

The failures matter more than the successes here. Our [improvement log](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) records the CLI comparison above as a negative result, so a reader can follow the finding, the fix, and the evidence that turned out not to support it. Anyone can publish the wins.

I didn't find another one, having looked for a changelog, a loop file or a findings section in every repository and results page in the survey. The [Next.js repository](https://github.com/vercel/next-evals-oss) goes the other way and is explicit that its results feed nothing back into Next.js itself.

## After It Ships

### 11. Decide What Invalidates Earlier Results

Write down in advance which changes make an old result uncomparable, and enforce it when one does.

Without that rule you will eventually publish a table whose rows were measured under different conditions, and present the difference between them as progress. It's an easy thing to do accidentally. The suite still runs, the numbers still appear, and nothing warns you that half of them predate a change to the prompt.

We did it. Our 25 August 2026 snapshot carried 22 results measured on 13 August 2026, across intervening changes to the command line tool, the scorers and the prompt. [Issue #60](https://github.com/hookdeck/evals/issues/60) records how the merge mixed those measurements without saying so at snapshot level.

The next time, we caught it. We added a sentence to the prompt shared by every run, telling agents not to ask clarifying questions. That changed the conditions under which every result had been measured, so the totals either side of it couldn't be presented as the agent getting better. We held publishing until a clean run existed, and the [v0.4.0 release notes](https://github.com/hookdeck/evals/releases/tag/v0.4.0) explain why the earlier totals aren't comparable.

[Vercel's harness](https://github.com/vercel-labs/agent-eval#result-reuse) puts the rule in the tooling. It fingerprints every result twice: once over the scenario files and the configuration together, which decides whether a result can be reused at all, and once over the scenario files alone. Having both lets it tell a changed test from a changed setting and rerun only what needs it. It has limits, and the documentation says so: functions that alter prompts can't be hashed, so you're told to force a rerun when those change.

[tau-bench](https://github.com/sierra-research/tau2-bench) shows how precisely the boundary can be drawn. Its v1.0.1 correction made earlier results for the banking-knowledge domain noncomparable, so it re-graded the affected submissions and kept a tag for reproducing the old behaviour. The other domains were untouched.

### 12. Exclude The Scenarios Everyone Passes

Separate the scenarios every configuration passes from the total you put at the top of the page.

Your headline number is the one people quote, and it should answer the question the reader came with. That question is usually which of these options to pick. Tasks everybody completes can't answer it. Leave enough of them in and two genuinely different configurations converge on similar-looking percentages, so a reader concludes the choice doesn't matter much when your own data can't support that either way.

Eleven of the nineteen scenarios in our [1 September 2026 snapshot](https://raw.githubusercontent.com/hookdeck/evals/v0.4.0/results/latest.json) were passed by every one of the six model-and-configuration pairs we ran, and on a single attempt each, so we can't even say how reliably. [Storybook's page](https://storybook-evals.vercel.app/) likewise shows 100% across four configurations, though on a single attempt that doesn't establish how reliably they'd pass again. [Our issue on scenarios that don't distinguish agents](https://github.com/hookdeck/evals/issues/47) works through the problem, including a task whose expected difficulty didn't survive contact with the agents.

Convex shows the same effect from the other direction. In the September survey, its top five scores [with guidelines](https://www.convex.dev/llm-leaderboard/with-guidelines) sat within 2.5 points of each other, against 4.1 points [without them](https://www.convex.dev/llm-leaderboard/no-guidelines). Improving the thing you're measuring leaves less room to tell the leaders apart. It's a good problem to have and still a problem.

Don't delete these scenarios. Keep them as regression tests, because a task everyone passes today is exactly what catches the week somebody stops passing it. Our [README](https://github.com/hookdeck/evals/blob/v0.4.0/README.md) separates regression scenarios from benchmark totals for that reason. Adding harder ones means saying which version of the suite a result came from, or the suite getting harder looks like the models getting worse.

### 13. Fix The Product, Not The Scenario

When a scenario fails, change the product, the docs or the skills. Don't change the scenario to make the failure go away.

Both routes make the number go up, and only one of them makes anything better. The second is quicker, and you'll be most tempted by it on the week the numbers are due and the release is behind, and that's exactly when you shouldn't be trusted to make the call. So make it now, in writing, while nothing is at stake.

Our [improvement procedure](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) requires the fix to be to the product, the docs or the skills, and states why: editing the scenario until it passes proves nothing. Making that move visible is most of what the file is for.

There's a subtler version of the same problem, and it doesn't feel like cheating at all. If you write documentation or skills aimed squarely at the failures your own suite catches, your score improves without telling you anything about tasks outside it. That's still worth doing, and it needs saying. [Convex](https://stack.convex.dev/convex-evals) says it, describing how it targeted the categories models did worst at and tuned its guidelines to pass those cases. The disclosure is what makes the number usable.

## Why Not Just Agree On One Benchmark?

A payments API and an observability platform involve different work, so I wouldn't expect one shared task suite to answer every vendor's questions. We can still agree on what a published result should disclose, even where the tasks differ.

[MLPerf's training rules](https://github.com/mlcommons/training_policies/blob/master/training_rules.adoc) provide a useful precedent for labelling results. Its Closed division constrains the model, preprocessing, training method and quality target, while the Open division permits more variation. Results must name their division, so the reader knows which rules apply.

I'd take that disclosure principle for agent evals: explain what you gave the agent, how often it tried, when it ran, and what counted as success. The tasks can remain specific to your product without leaving readers to guess how the number was produced.

## What We've Fixed, And What We Haven't

Our own evals are the example of what goes wrong repeatedly above, so it's fair to ask what we did about it. Here's the accounting: four fixed, six open.

Three of the four are repairs, and they're shipped. The command line tool used to work behind your back in a guest project, so an agent could report success having built everything in a throwaway account nobody would find again. That's corrected in CLI 2.5.0. The skill that never explained how to authenticate without a terminal now says so. The scoring was wrong too, and it took us a while to see it. We scored a run as a fraction of the checks that ran, and our scorers stop at the first failure. So each agent's denominator was set by its own failures: one that fell at the first hurdle was scored out of one check, and one that got four things right and missed the fifth was scored out of five. No two agents were being marked over the same set of checks, so the percentages were never comparable in the first place. On the 25 August 2026 snapshot that put the deliberately weak model above a frontier one. We now count whole scenarios completed, so a scenario counts once whatever happens inside it. That's corrected in [v0.4.0](https://github.com/hookdeck/evals/releases/tag/v0.4.0), along with eleven other corrections to the harness.

The fourth isn't a repair. We took a position on clarifying questions where we'd previously had none, and that closed the issue at the cost of suppressing exactly the caution guideline 3 says is worth measuring. It's a defensible choice and it isn't a win.

Six are open, and four of them are filed. We still don't publish transcripts that would let you check a result yourself ([#21](https://github.com/hookdeck/evals/issues/21)). A merge can still carry rows forward from an older run without saying so ([#60](https://github.com/hookdeck/evals/issues/60)). And eleven of our nineteen scenarios are passed by everything we run, so most of the suite isn't doing the job the headline claims for it ([#47](https://github.com/hookdeck/evals/issues/47)).

The one I'd most like to close is the last of those four: our skills make a weaker model worse ([#2](https://github.com/hookdeck/evals/issues/2)). The question-stopping in guideline 3 explains part of it and not all of it. On the 1 September 2026 run, loading our skills cost Codex GPT-5.4-mini one scenario out of nineteen while gaining Claude Code two. That's been open since the first week.

The last two aren't filed, because they're design limits and not defects, and naming them is the only thing that makes this list honest. We run two configurations, so by guideline 2 we can't say whether our gains came from what we wrote or from what the agent was allowed to do. And we ran each scenario once in the snapshot this post cites, against the three I've just told you to run. The current suite runs two. Better, and still short.

Finding the problem is the cheap part. The benchmark is what turns a suspicion into something you can file.

## Harnesses Worth Starting From

Don't build the sandboxing and result handling yourself. Four are already available, and they're built for different jobs, so the choice is about what you want out the other end.

[Vercel's agent-eval](https://github.com/vercel-labs/agent-eval) is the one to look at first if you want to publish a comparison like the ones in this post. It's MIT licensed and it's the shared engine behind the Next.js, Nuxt, Svelte and Storybook results, so it has more publishing adopters than anything else I found. The baseline is an ordinary configuration file with no privileged status, so it will support the single-change designs guideline 2 asks for without imposing one. Its own playground is empty, though, at zero experiments and zero runs, so the adopters are the evidence and not the project itself.

[Netlify's AXIS](https://axis.run) answers a different question. It describes itself as Lighthouse for agent experience: 23 agent adapters, weighted dimensions and a score out of 100 you can gate a build on. Reach for it if you want a number that goes in CI, not a comparison between configurations. It publishes no leaderboard and no named scores of its own, and Auth0 is a founding contributor.

[promptfoo](https://promptfoo.dev), which [Shopify](https://github.com/Shopify/agent-skills) names as its skills-evaluation tool, and [Inspect AI](https://inspect.aisi.org.uk), which [Flutter](https://github.com/flutter/evals) builds on, are general LLM evaluation frameworks rather than agent-eval harnesses. Start from one of those if your team already runs it for other model testing and you'd rather extend it than adopt something new. Worth knowing that Flutter publishes no scores anywhere, so you'd be further from a worked example.

Whichever you adopt, none of them decides what your baseline represents or what you disclose about it. That part is still yours, and it's guideline 1.

## The Pages I Looked At

The results pages and posts cited here are a selection from the wider survey. A dash in the code column means no code link is included in this table.

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
| Storybook | [storybook-evals.vercel.app](https://storybook-evals.vercel.app/) | [storybookjs/mcp](https://github.com/storybookjs/mcp) |
| Callstack | [rn-evals.vercel.app](https://rn-evals.vercel.app/) | [callstackincubator/evals](https://github.com/callstackincubator/evals) |
| Hookdeck | [hookdeck.com/evals](https://hookdeck.com/evals) | [hookdeck/evals](https://github.com/hookdeck/evals) |

Published as a post rather than a page: [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) ([harness](https://github.com/stripe/ai/tree/main/benchmarks)), [Netlify](https://www.netlify.com/blog/how-we-measure-netlify-agent-experience/), [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel), [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), [LangChain](https://www.langchain.com/blog/evaluating-skills), [Firebase](https://firebase.blog/posts/2026/08/eval-driven-development-agent-skills/), [Convex](https://stack.convex.dev/convex-evals) and [Supabase](https://supabase.com/blog/introducing-supabase-evals).

<!--
DRAFT NOTES - REMOVE BEFORE PUBLISHING

Independent review completed on 16 September 2026.

Review status:
- The full claim-by-claim audit and supporting ledger are held in private working files.
- The revision retains thirteen guidelines and the Hookdeck negative examples.
- The reviewed changes are applied to this draft and can be inspected with git diff.
- The voice check reports zero errors. One warning is open: median sentence length 16 against a corpus median of 20, a consequence of the one-line instruction that opens each guideline.
- Citations at last count: 94 occurrences, 55 distinct destinations. Re-count and re-check them on the final source; the 81/52 figure from the 16 September review is stale.

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
