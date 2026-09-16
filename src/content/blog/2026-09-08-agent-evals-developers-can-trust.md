---
title: "How to Publish Agent Evals Developers Can Trust"
draft: true
aiAssisted: true
excerpt: "Developer platforms have started publishing how well AI coding agents work with their products. I went through twenty-three of these pages while building one for Hookdeck, and no two of them mean the same thing by the numbers they report. Nine guidelines for building one, and nine things worth checking when you read somebody else's."
---

Developer platforms have started measuring how well AI coding agents work with their products. They give an agent a task, let it work, check whether what it built actually functions, and publish the scores. [Supabase](https://supabase.com/evals), [Clerk](https://clerk.com/llm-leaderboard), [Auth0](https://auth0.com/agent-experience), [Convex](https://www.convex.dev/llm-leaderboard), [Paddle](https://developer.paddle.com/llm-benchmark/), [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) and about seventeen others now have a page like this.

I've been building an [agent evals page for Hookdeck](https://hookdeck.com/evals). Along the way I wanted to know what good looked like, so we went through everything else that gets published, twenty-three pages and posts in all.

What follows is nine guidelines I'd give anyone starting one, and nine things worth checking when you read somebody else's. None of it is theoretical. Every one is something a platform is already doing, and I've named who does it well and who doesn't. Where that's us at Hookdeck, I've said so, and it happens more than once.

Here are the terms I use below. People building evals use them loosely, and the looseness is part of the problem, so this is what I mean by each one.

- **Scenario**: one test - a task written as a prompt, plus a way of checking whether the agent actually did it. Some projects call these evals.
- **Run**: one attempt at one scenario by one model.
- **Baseline**: the version of the run you compare everything else against. Deciding what goes into it is probably the most important choice you'll make.
- **Skills**: documents you ship that tell an agent how your product works.
- **MCP**: the Model Context Protocol, a way of exposing your API to an agent as a set of tools it can call.
- **Harness**: the code that runs your scenarios, sandboxes the agent and records what happened.

## Before You Run Anything

### What Was In Your Baseline?

**Write down what the comparison run had available, and publish that next to the score.**

Every one of these pages reports some version of "with our stuff, and without it". The without is the baseline, and I found seven publishers using seven different definitions of it.

Auth0's baseline is a single model call with no tools at all, working from training data alone. Clerk's is the model with no tools. Vercel's is an agent with no documentation. Ours at Hookdeck is a full agent with the command line tool installed, a live API key, and web search available. Laravel's is a complete agent missing only their Boost server. LangChain's is described as "without any skills loaded", and says nothing about whether the agent had tools, documentation or internet access.

Those aren't variations on a theme. They're different experiments. An improvement of 25 points measured against a model with nothing, and an improvement of 2 points measured against a fully equipped agent, aren't comparable, and no page in the survey says so.

Auth0 and Clerk both define theirs in their repository documentation. Supabase, Paddle and Convex don't define one anywhere I could find.

If you're reading one of these pages and it doesn't tell you what the baseline had, you can't tell what the difference measures. Is that a number you want to put in a planning document?

### Tools, Or Your Content?

**Run more than two configurations, so you can tell which part helped.**

If you run only two, one with your skills and one without, that single number contains at least three things: whether the skills say anything useful, whether they gave the agent a shorter route to your documentation, and whether it opened them at all. The documentation-access and skill-loading examples below show why those distinctions matter.

For example, [Auth0](https://github.com/auth0/auth0-evals) runs five configurations and states what each gap between them means. A single model call with no tools, then a full agent with file and shell tools, then that agent plus skills, then that agent plus their MCP server, then everything together. The step from the first to the second isolates the value of tool access on its own. The step from the second to the third isolates the skills. It's the best design I've come across, and I don't think anyone has copied it yet.

The honest objection to this is cost, because five configurations is roughly two and a half times the runs of two, before you multiply by however many attempts you make. A full matrix of our nineteen scenarios costs around eighty dollars for a single attempt each. If you can't afford five, run three, and say which three.

### Did Both Runs Reach Your Docs The Same Way?

**Control how the agent reaches your docs, or measure the difference and report it.**

This is the one that changed how I read every other page, and we found it by accident.

We counted what the agent actually did in each version of the run, not just whether it passed. The version without our skills made 296 documentation requests, and more than half came back with nothing, because 228 of them were searches against a search index. The version with our skills made 83 requests and mostly fetched documentation URLs directly, because the skills contain those URLs.

Same prompt, same model, same checks, three days apart. It passed once and failed once, and the difference was whether the search happened to return anything useful that day.

So part of what we had been measuring as "our skills help" was really "our skills contain the address of our documentation". That's a genuine finding about our skills, though it isn't the finding we thought we had, and any two-configuration comparison has this problem sitting inside it.

Vercel handles this properly by making web research an explicit setting that is off by default, and their framing is the one I'd steal: availability is controlled, and whether the agent chooses to use what's available is what you're measuring. We have this open as an issue against ourselves and haven't fixed it yet.

## While It Runs

### How Many Attempts?

**Three attempts is the floor, and whatever you settle on, publish how many you ran.**

Laravel published a model comparison and, in the same post, explained why you shouldn't read too much into it. One of their scenarios went from 7 passing assertions out of 19 to 17 out of 19 on a rerun, with the model, the prompt and the setup identical. Four more flipped from fail to pass in a single rerun. Their own conclusion was that the results are directional signals and not fixed measurements.

We learned the same thing more expensively. We found a real defect in our command line tool, fixed it, and re-ran to measure the improvement. There was none, because all four of the failures we had used to justify the work turned out to be variance, and we only found that out by running a control on the old version at the same time. The fix was still the right thing to do. But the evidence we'd offered for it wasn't evidence at all.

[Grafana](https://o11ybench.ai/) publishes the strictest and the loosest reading of the same three attempts in adjacent columns, so you can see how much the headline depends on which one you pick. That's probably the best idea I came across. [Rails](https://rubyonrails.org/ai) runs each model 63 times. The [framework Vercel publishes](https://github.com/vercel-labs/agent-eval) defaults to ten attempts.

We currently run one attempt (I know), as does Laravel, and Supabase runs one with a single retry.

### Did The Skill Actually Load?

**Capture the transcript, the tool calls, the documentation requests, and whether your skills were opened at all.**

A score tells you that something went wrong. It doesn't tell you what, and you can't fix what you cannot see.

Every product problem we've found came out of reading a transcript. None of them came from the scoreboard. The documentation-request counts above only exist because we recorded what the agent reached for, and we'd never have noticed otherwise.

The [.NET team](https://dotnet.github.io/skills/) publishes something nobody else does: how often the skill was actually loaded during a run. That matters more than it sounds, because if a skill shows no improvement you need to know whether it failed to help or simply never fired, and those two call for completely different responses.

Vercel has the number that makes the case. Their skills measured at exactly zero improvement, and when they looked at why, the skill was never invoked in **56% of eval cases**. The agent had the documentation available and didn't go and get it. Adding one instruction telling it to read the skill took the score from 53% to 79%. Without that count they'd have concluded their skills didn't work, when the skills were fine and nothing was opening them. Those need completely different fixes.

We record all of this internally and publish none of it. That's a gap, and we've got an issue open on it.

## What To Publish

### Can Anyone Check Your Scenarios?

**Show the tasks, the prompts and the checks, so somebody can disagree with them.**

A percentage on its own asks for trust. The tasks behind it let a developer decide whether your test resembles their work, and that's the only question they actually care about.

[Supabase](https://github.com/supabase/evals) and [Hookdeck](https://github.com/hookdeck/evals) both publish every scenario and the code that scores them. Resend does the reverse, and it's an interesting inverse: their repository contains 26KB of scenario definitions, prompts and expected outputs, with no scores anywhere.

There's an obvious objection here. Anything you publish can be read by an agent, and will eventually find its way into training data, so your scenarios stop being a fair test.

I don't think that's an argument for keeping them private. If you're publishing skills and documentation at all, you're already trying to get your content in front of agents and into training data, because that is how agents get better at using your product. Being selectively secretive about the test while broadcasting everything else is the wrong way round. Publish the scenarios, expect them to age, and replace them. That's the last guideline.

### When Was This Measured?

**Put a date on each result, mark the stale ones, and keep a log of what moved.**

Two columns on the same page can be months apart, and nothing on most of these pages tells you that.

[Convex](https://www.convex.dev/llm-leaderboard) handles this best, and stale rows say so where they sit, and the table carries a column for how old each model is and another for when it last ran. Grafana and [Next.js](https://nextjs.org/evals) put a run date on every row.

Clerk's page says it was last updated in July, while the repository behind it was still being worked on six weeks later. Supabase's page carries no date anywhere that I could find.

The related habit's a changelog of what the benchmark changed about the product. Only one publisher in the survey keeps one, and that's us. I mention it mainly because the absence everywhere else is odd. Improving the product is the reason to run any of this. The Next.js repository is explicit that its results feed nothing back into Next.js itself.

## After It Ships

### What Happens When You Fix The Harness?

**Decide in advance whether a change to the test rig invalidates old results, and make the tooling enforce that. Release notes won't.**

You'll get the test rig wrong, and you'll fix it, and every fix puts a line through what came before.

We added one sentence to the prompt that every single run shares, telling agents not to ask clarifying questions. That one string changed every number we had. We said so in the release notes and stopped publishing until a clean run existed. That's the least you can do. It isn't the best you can do.

Vercel does better, by fingerprinting the inputs, so a result is automatically invalidated when the scenario changes, and they keep a separate fingerprint for the scenario content so that "the test changed" is distinguishable from "a configuration value changed". The [tau-bench](https://github.com/sierra-research/tau2-bench) project declares the boundary outright, states that results either side of version 1.0.1 aren't comparable, re-grades the affected submissions, and keeps a tag so the old behaviour can still be reproduced.

We declare our discontinuities in prose and don't enforce them in the data. A merge carried 22 rows measured on the 13th of the month into a snapshot dated the 25th, and nothing in the file said so.

### What If Everything Passes?

**When everything passes, your scenarios have stopped measuring anything. Write harder ones.**

This is the failure mode nobody warns you about, and it turns up exactly when the work is going well.

Evals exist so you can improve the product. You find a gap, you fix the documentation, the skills or the product itself, and you run it again. But do that for long enough and something awkward happens. The rule we hold ourselves to is that the fix has to be to the product, the docs or the skills. Changing the scenario until it passes proves nothing.

Everything starts passing. Eleven of our nineteen scenarios are now passed by every configuration we run. Four of our five Outpost scenarios are, which we filed against ourselves. [Storybook's published page](https://storybook-evals.vercel.app/) shows 100% across all four of its configurations.

Convex's numbers show the mechanism at work, because they publish both versions of the same benchmark, and the version with their guidelines is the more tightly bunched of the two: the top five models sit within 2.5 points of each other, against 4.1 points without. The better your skills work, the less your scenarios can distinguish between models.

So retire the scenarios everybody passes and replace them with harder ones. The exception is deliberate regression tests, which exist to catch something you've already fixed coming back, and which should pass every time. Keep those, and keep them out of the headline score. Ours are excluded from the published totals for that reason.

There's a related habit worth naming. If you write documentation or skills that anticipate the specific failures your scenarios catch, guiding the agent around them or telling it how to diagnose them, then say so. Otherwise the improvement you publish describes how well you tuned for your own test rather than how well your product works. Convex is straightforward about this, and describes picking the categories each model did worst at and adjusting the guidelines to pass those cases. That honesty is what makes their number usable.

## Why Not Just Agree On One Benchmark?

The obvious question, and the answer is that a payments API and an observability platform don't do the same work. So the tasks can never be shared.

Machine learning settled this shape years ago with [MLPerf](https://github.com/mlcommons/training_policies), which runs two divisions. In the closed division everyone runs the same reference implementation, so results compare directly. In the open division you may do as you like. The rules require you to label which division a result came from, and never claim the two are comparable.

Your scenarios are always in the open division, and the guidelines above are the label that lets somebody read them properly.

## Tools Worth Starting From

Do not build the sandboxing and result handling yourself. Vercel publishes [its harness](https://github.com/vercel-labs/agent-eval) under an MIT licence, with sixty releases and around thirty projects using it, including Sanity, Redpanda and Uniform. Netlify publishes [AXIS](https://axis.run), which scores agent experience across weighted dimensions and can fail a build. Shopify uses [promptfoo](https://promptfoo.dev), and Flutter uses Inspect AI.

In Vercel's harness the baseline is an ordinary configuration file with no special status, so every incompatible definition in the first guideline is a perfectly legal one. The tooling won't make that decision for you, which is why it's the first guideline rather than an afterthought.


## The Pages I Looked At

Results pages, with the code behind them where it's public.

| Publisher | Results | Code |
|---|---|---|
| Supabase | [supabase.com/evals](https://supabase.com/evals) | [supabase/evals](https://github.com/supabase/evals) |
| Clerk | [clerk.com/llm-leaderboard](https://clerk.com/llm-leaderboard) | [clerk/clerk-evals](https://github.com/clerk/clerk-evals) |
| Auth0 | [auth0.com/agent-experience](https://auth0.com/agent-experience) | [auth0/auth0-evals](https://github.com/auth0/auth0-evals) |
| Convex | [convex.dev/llm-leaderboard](https://www.convex.dev/llm-leaderboard) | [get-convex/convex-evals](https://github.com/get-convex/convex-evals) |
| Paddle | [developer.paddle.com/llm-benchmark](https://developer.paddle.com/llm-benchmark/) | not published |
| Next.js | [nextjs.org/evals](https://nextjs.org/evals) | [vercel/next-evals-oss](https://github.com/vercel/next-evals-oss) |
| Nuxt | [nuxt.com/evals](https://nuxt.com/evals) | [nuxt/nuxt-evals](https://github.com/nuxt/nuxt-evals) |
| Grafana | [o11ybench.ai](https://o11ybench.ai/) | [grafana/o11y-bench](https://github.com/grafana/o11y-bench) |
| .NET | [dotnet.github.io/skills](https://dotnet.github.io/skills/) | [dotnet/skills](https://github.com/dotnet/skills) |
| Rails | [rubyonrails.org/ai](https://rubyonrails.org/ai) | [rails/ai-evals](https://github.com/rails/ai-evals) |
| Tinybird | [llm-benchmark.tinybird.live](https://llm-benchmark.tinybird.live/) | not published |
| Storybook | [storybook-evals.vercel.app](https://storybook-evals.vercel.app/) | [storybookjs/mcp](https://github.com/storybookjs/mcp) |
| Callstack | [rn-evals.vercel.app](https://rn-evals.vercel.app/) | [callstackincubator/evals](https://github.com/callstackincubator/evals) |
| Hookdeck | [hookdeck.com/evals](https://hookdeck.com/evals) | [hookdeck/evals](https://github.com/hookdeck/evals) |

Published as a post rather than a page: [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) ([harness](https://github.com/stripe/ai/tree/main/benchmarks)), [Netlify](https://www.netlify.com/blog/how-we-measure-netlify-agent-experience/), [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel), [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), [LangChain](https://www.langchain.com/blog/evaluating-skills), [Firebase](https://firebase.blog/posts/2026/08/eval-driven-development-agent-skills/), [Convex](https://stack.convex.dev/convex-evals) and [Supabase](https://supabase.com/blog/introducing-supabase-evals).
