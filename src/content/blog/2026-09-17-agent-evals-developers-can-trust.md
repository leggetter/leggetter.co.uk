---
title: "How to Publish Agent Evals Developers Can Trust"
aiAssisted: true
excerpt: "While building Hookdeck's agent evals, I directed an AI-assisted survey of how other developer platforms publish their results. These fifteen guidelines cover what I'd check before trusting a score, including several things we got wrong ourselves."
---

If you ship a developer tool, whether that's an API, a framework, a database or a CLI, agents are already doing some of the work of integrating it, and they may end up doing most of it. That makes an agent a first-class customer of whatever you build, and how well it does depends on how much sense your product makes to a model. Developer platforms have started measuring how well agents cope with their products, and publishing what they find.

The measurement is called an eval. You write a set of realistic tasks, hand each one to an agent working in a real project, and check whether what it built actually works. Then you run the same tasks again with one thing changed, usually the instructions and documentation you publish for agents to read (the files most people now call skills), and compare the two. What gets published is usually a score for each run and the difference between them.

I built the evals behind [Hookdeck's evals page](https://hookdeck.com/evals) with Claude, for two reasons: to find out which models work best with our platform, and to find where our own product falls down for an agent. The scores answer the first question. The transcripts answer the second, and that's the one I care about most, because an agent that gets lost doesn't file a support ticket. It works around the problem and reports success, and the transcript is the only place you'll see that it happened.

I also wanted to know what a published result needs to include before anyone should trust it, so I directed an AI-assisted survey of who else was doing this. By 7 September 2026 it had found at least twenty-three platforms publishing results, as results pages, blog posts or repositories.

[Convex](https://www.convex.dev/llm-leaderboard) has been at it longest, since January 2025. [Clerk's](https://clerk.com/llm-leaderboard) followed that October, [Supabase's](https://supabase.com/evals) the next April and [Auth0's](https://auth0.com/agent-experience) in June, and [Rails](https://rubyonrails.org/ai) started on 4 August 2026, three days before we did. So almost every published agent eval is less than a year old, and I suspect that's most of the reason publishers still disagree about what to measure and what to disclose.

What follows is fifteen guidelines for anyone building and publishing evals for their own product. If you only ever read other people's scores, the checklist straight after this is for you: it's the fifteen questions I'd want a published number to have answered already. The sections after the checklist are for whoever has to build the thing. Each one draws on a published example or on something we got wrong in our own evals (Hookdeck turns up as the cautionary tale more often than I'd like).

## Fifteen Questions For Any Eval

1. Do the tasks state a goal, or spell out the steps to follow?
2. What was in the baseline it was compared against, stated precisely enough to reproduce?
3. How many configurations were compared, and does each gap isolate one change?
4. What happens when the agent stops and asks a clarifying question?
5. How many attempts at each test?
6. Which checks are deterministic, and which are graded by a model?
7. Does a published pass mean once, or every time?
8. Did the agent open the skill files the publisher ships, and how often?
9. Are the tests and the code that scores them published?
10. Can you still read what the agent did behind an old result?
11. Is every result dated?
12. Is there a log of what the evals changed, including what didn't work?
13. What invalidates an earlier result, and does the tooling enforce it?
14. Do the tests still tell the configurations apart?
15. When a test failed, what got fixed: the product, or the test?

If I could only ask one of these, it'd be the second, because most of the others depend on knowing what the score was compared against.

It's also worth checking what a results page is for before you read its numbers. A self-audit asks how well a product works for agents, a model comparison asks which model to use with it, and in the five pages I compared, the URL predicted which one I'd get. The two published at `/skills` and `/evals` open as self-audits: [.NET](https://dotnet.github.io/skills/) tracks "Copilot quality with and without skill plugins", and [Supabase](https://supabase.com/evals) evaluates "model experiments across the Supabase developer journey". The three at `/llm-leaderboard` and `/llm-benchmark` lead as model comparisons instead, with [Clerk](https://clerk.com/llm-leaderboard) inviting you to "select the one that best fits your requirements". Clerk and [Paddle](https://developer.paddle.com/llm-benchmark/) both keep the self-audit answer in a toggle on the page, and neither leads with it. Paddle's toggle sits above the table and shows the plain run by default, with what its own tooling is worth one click away.

![Paddle's LLM benchmark page, with a three-way toggle above the results table and the plain run selected](/images/agent-evals-paddle-toggle.png)

Here are the terms I use throughout. I say evals because that's the word the repositories use.

- **Agent**: the thing doing the work. A model, plus the tools it can use, plus a loop that lets it read files, run commands and try again. Claude Code and Codex are agents; a single model call is not.
- **Scenario**: one test. A task written as a prompt, plus the checks that decide whether the agent did it. One task per scenario, and the scenario is what passes or fails, so it's the unit every score in this post counts.
- **Scorer**: the code that does that checking, usually by inspecting what the agent built, not by reading what it said.
- **Run**: one attempt at one scenario with a particular agent, model and configuration.
- **Configuration**: what the agent is given for a run besides the model - the tools it can call, and whether your skills, docs or MCP server are available to it. Run three models against two configurations and you get six combinations.
- **Baseline**: the configuration you compare the others against.
- **Skills**: files you publish that tell an agent how your product works. The agent decides whether to open them, and guideline 8 is about why that matters.
- **MCP**: the Model Context Protocol. A way to expose your product's operations to an agent as tools it can call directly, instead of leaving it to work through your API from the documentation.
- **Harness**: the code that runs your scenarios, prepares the agent's environment and records what happened.
- **Transcript**: the record of what the agent actually did during a run, as opposed to whether it passed.
- **Snapshot**: a set of results published as a file you can point at later. Ideally every row in it was measured at the same time. Guidelines 11 and 13 are about what happens when they weren't.

## Designing The Suite

### 1. State The Goal, Not The Steps

Write each task the way a colleague would file a ticket, describing what they want to end up with and leaving out how to get there. A task that lists the steps tests whether an agent can follow instructions, and you already know it can. A task that states a goal tests whether your product makes enough sense for an agent to work out the route on its own, and that's hard to find out any other way. It's probably the main reason to run evals at all.

Over-specified tasks give you a suite that can't fail in any useful way. The agent works down the requirements list, every scenario passes, and the failures your real users hit were never in the suite to begin with. You could spend a month improving a number that was never measuring them, and the scores won't warn you, because from the outside a suite that can't fail looks exactly like a product that works. How would you tell the two apart from the numbers alone?

We wrote this down as a rule for our own suite: scenarios are ticket-shaped, so that an agent "can finish confidently and be wrong". A requirements list suppresses exactly the failure a scenario is there to catch. The one deliberate exception is a scenario built to catch a hallucination, which "asks the question and nothing else", because anything you put around the question tends to hand over the answer.

A well-shaped task can still be useless, mind. It can fail to separate one agent from another and still bill you on every run, and despite having the rule written down we filed an issue against our own scenarios for exactly that ([#47](https://github.com/hookdeck/evals/issues/47)). Guideline 14 has the count across the whole suite.

The environment matters as much as the wording. [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) has the best write-up of this I found in the survey. Its agents accepted invalid test data and read a `400` as success, and got stuck when a highlighted HTML frame stole focus in a browser form. Neither problem was a badly worded task. Both were the environment misbehaving, and both were scored as the model failing.

### 2. Define Your Baseline In Public

A reader who sees "+25 points from our skills" can't tell whether your skills are good or whether the run you compared against was a bare model with nothing to work with. So write down exactly what the baseline run had available, and put it somewhere a reader can reach from the score. Without that, nobody else can use your number, and six months from now you may not be able to interpret it yourself.

Five of the publishers I looked at say what their baseline is, and between them they describe four different setups. [Auth0's](https://github.com/auth0/auth0-evals) is a single model call with no tools, working from training data alone, and [Clerk](https://github.com/clerk/clerk-evals) also documents a no-tools model baseline. [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) describes its baseline as an agent without documentation, while [ours at Hookdeck](https://github.com/hookdeck/evals) has the command line tool and a live API key. [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) compares a full agent with and without Boost, its package for giving agents Laravel-specific context.

Those setups produce very different kinds of improvement. Measured against a model with nothing, an improvement includes everything the agent gained just by becoming an agent: tools, a shell and the chance to try again. Measured against a fully equipped agent, it doesn't. Report both as a percentage of scenarios completed, though, and they look like the same kind of number.

Our baseline has web search as well, and our published definition didn't say so until I was writing this post. Agents used search on 34 of the 114 rows in our 1 September 2026 snapshot, and that's what prompted us to add it. If your baseline can search, say so, because it's then partly measuring how well other people's blog posts cover your product, and that can change between runs without you touching anything. [Convex's](https://www.convex.dev/llm-leaderboard) leaderboard has three tabs, and web access gets one of its own instead of being folded quietly into the baseline.

[LangChain](https://www.langchain.com/blog/evaluating-skills) reports the largest difference in the survey, 9% to 82%, and its post does describe the setup: Claude Code running in Docker, with evaluation guidance. You have to go and find that description, though, and a seventy-three point jump is exactly the kind of number that gets quoted without it. Put the definition next to the score. Auth0 and Clerk put theirs in their repository documentation, where anybody can check. Supabase's page doesn't say, although its repository pairs every experiment with a no-skills twin, so the definition is there in the code for anyone who goes looking. Paddle and Convex each give it a sentence on the page. A sentence is more than nothing, and a lot less than you'd need to reproduce the run.

### 3. Run More Than Two Configurations

Documentation, skills and an MCP server are separate pieces of work with separate costs, and sooner or later you'll want your evals to tell you which one to work on next. Compare a baseline against a run that adds all three, watch the score go up, and you won't know which of the three moved it. You could spend a month on the MCP server when it was the documentation doing the work. So run enough configurations that every gap you publish is between two that differ by one change, and each gap then tells you what that change was worth. [Auth0's framework](https://github.com/auth0/auth0-evals) puts it plainly in its README: "the delta between configurations tells you where to invest".

Auth0 runs five configurations:

![Auth0's five configurations. A single model call with no tools leads to a full agent with file and shell tools; that step is what tool access alone is worth. Two comparisons branch from the agent, one adding skills and one adding MCP, and those two are never compared with each other. A fifth configuration runs everything together.](/images/agent-evals-auth0-configurations.svg)

The skills and MCP comparisons both start from the second configuration, the full agent, so each of them adds a single change to it. The fifth, with everything at once, is the number most publishers report, and often the only one. It's the clearest design I found, and I didn't come across anyone else running those same five.

I could count configurations for nine of the publishers in this post, and four of them run two, Hookdeck included: Supabase, Laravel, Firebase and ourselves each publish a single with-and-without comparison. Clerk, Paddle and Convex run three, and Auth0 runs five. LangChain goes further again, comparing skills consolidated into a few large files against skills split across many small ones, and testing phrasing and formatting separately. Those of us running two can't say from our published numbers whether an improvement came from what we wrote or from what the agent was allowed to do.

Cost is the fair objection. At the same attempt count, five configurations need two and a half times the runs that two do. If you can only afford three, I'd choose them around the one distinction you most need to settle, and say which distinction that was.

### 4. Say How You Handle Clarifying Questions

Most harnesses are single-turn. The agent gets one go, and if it stops to ask something, nothing answers. Its turn ends and it's scored on whatever state it left behind, which after a clarifying question is usually nothing at all. So a model careful enough to check before changing somebody's project scores exactly like one that couldn't do the job, and your page reports incapability when what you measured was caution. Decide what your harness does when an agent asks a question, and write the decision down before you run anything.

Ignoring the question can cost you a finding as well as a number. In August we ran six scenarios against one weaker model, three attempts each, with and without our skills. Three of the five failures with skills loaded were [an agent asking a sensible question and stopping](https://github.com/hookdeck/evals/issues/57), and none of those three was an agent that couldn't do the work. Without our skills, the same model failed seven times out of eighteen and never once stopped to ask. That was a diagnostic run over six scenarios, not the published suite. The way the questions all landed in the skills-loaded half is what makes me think it's a mechanism and not noise: our skills tell an agent to verify its context, a weaker model follows that instruction literally, and our scoring turned the compliance into a failure.

I found three deliberate positions, plus the default you get by not choosing one:

- **Say nothing.** [Supabase](https://github.com/supabase/evals) has no instruction, no canned answers and no detection anywhere in the repo. That's the default, and it's where we were.
- **Tell the agent not to ask.** [Clerk](https://github.com/clerk/clerk-evals) puts the same line on every path: "Do not ask clarifying questions. Complete the task with the information provided."
- **Write canned answers per scenario.** This is the closest to a real support workflow, although an agent that asks something you didn't anticipate still stalls.
- **Let repetition absorb it.** [Vercel's harness](https://github.com/vercel-labs/agent-eval) counts a cached result as valid when at least one run passed, so a single run that stopped to ask doesn't decide the result.

The approach I'd most like to borrow comes from outside developer-platform evals. In [tau2-bench](https://github.com/sierra-research/tau2-bench), asking is required, because its simulated user withholds information until the agent asks for it, and a question the scenario can't answer ends the episode as a recorded outcome instead of a silent zero.

We didn't have a position at all. We'd copied our prompt from Supabase's and swapped in our own product, so the silence was inherited, never chosen, and we only found out what it was costing us by reading transcripts. We've since taken Clerk's option, and as guideline 13 explains, that change invalidated every result we'd published up to that point.

## Running The Evals

### 5. Repeat Every Scenario

A single attempt can't tell a fix from a coincidence. Run each scenario once, ship a change, and the number will move whether or not the change did anything. I'd run every scenario at least three times, and publish how many attempts you ran.

We came close to publishing an improvement that wasn't there. We'd found a real defect in our command line tool, fixed it, and re-ran to measure what the fix was worth. When we ran them again on the old CLI, all four of the failures the fix was meant to address passed there too. Our [record of that comparison](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) files it as a negative result: the failures were variance, and the evidence we'd have published was worthless. The fix was still correct (it just couldn't prove anything).

[Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) found the same thing and published it alongside its model comparison. Rerun with the model, prompt and setup unchanged, Haiku 4.5 went from 7 out of 19 to 17 out of 19 on one evaluation, and GPT-5.3 Codex flipped from fail to pass on four.

Once you know how far your results move on their own, tell readers what that means for reading them. [Rails](https://rubyonrails.org/ai) does it in one line, saying that differences of a few points between models are within run-to-run noise, and that line tells a reader which of its gaps to ignore. Rails and Laravel are the only two publishers here that put a number on their own run-to-run noise, so for every other delta in this post, ours included, there's nothing to check it against.

[Rails](https://rubyonrails.org/ai) runs each evaluation three times, and [Vercel's harness documentation](https://github.com/vercel-labs/agent-eval#tips) recommends ten. Three is where I'd start, though it won't settle a small difference. We didn't manage even three in our [1 September 2026 snapshot, published as v0.4.0](https://github.com/hookdeck/evals/releases/tag/v0.4.0), which ran one attempt per scenario and configuration.

### 6. Say Which Checks A Model Grades

When a scenario fails, you need to know whether the agent got it wrong or your grader did, and repetition won't tell you. Re-running a scenario, as guideline 5 asks, re-runs the grader along with the agent, so the two sources of variance arrive tangled together. Separating them means grading the same piece of work more than once, and nothing in the usual loop does that. Publish which of your checks are deterministic and which are decided by a model, so a reader knows which numbers carry a grader's variance as well as the agent's.

Both kinds of check go wrong, and we've had one of each. One of our judged checks kept flipping between runs, and we assumed the judge was being non-deterministic. It wasn't ([#22](https://github.com/hookdeck/evals/issues/22)). Replaying the same model against 96 stored transcripts put disagreement at about 5%, concentrated on a single rubric, and the cause turned out to be us. That scenario had two judged checks that contradicted each other about the same answer: one rewarded naming the mock destination URL as the cause, and the other failed the same answer for attributing the failure to Hookdeck. Three runs were marked down for giving the best diagnosis available, the frontier agent's among them. We'd been blaming the instrument for a contradiction we'd written ourselves.

Deterministic checks fail more quietly, because nothing about them looks uncertain. One of our scorers read a record's creation timestamp. An agent found a broken alert, diagnosed it exactly and repaired it, and scored zero, because repairing something doesn't change when it was created. We'd written a check that rewarded leaving the broken alert in place and adding a duplicate beside it. Worse, the scenario punished agents more as they got better. The more of them inspected the existing state before acting, the more found the broken alert, repaired it and got marked down, while the task itself never changed.

When we counted, eight of the twenty failures in our first release were our fault and not the agents'. The [release notes](https://github.com/hookdeck/evals/releases/tag/v0.2.0) are careful about what that means. Twelve failures remain and some of those will be real, so it isn't a claim that our instrument caused most of them. It's that one class of defect in our own scoring was bigger than every effect we'd reported: bigger than what our skills were worth, than the gap between one vendor's agent and another's, and than anything else the benchmark claimed to have measured. A benchmark whose defects are bigger than its findings isn't yet measuring what it claims to, and we only knew because we went looking. Our [improvement log](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) puts the general case better than I can. A pass rate cannot distinguish "the agent could not" from "we misled it".

Decide, too, what your scorer does when nothing was measured at all. Is a rate limit, an expired credential or a sandbox that never came up the agent failing? Probably not, and if you count those as failures they'll leak into your comparison unevenly, since slower agents tend to hit timeouts more often. [Next.js](https://nextjs.org/evals) states its rule outright: infrastructure failures are discarded and rerun instead of counted. Stripe's focus-stealing browser frame from guideline 1 is the same class of problem, scored the other way.

Publishers who do describe their scoring are doing very different things. [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel) checks its suite with 315 Pest tests, about as deterministic as this gets. [Auth0](https://auth0.com/agent-experience) scores against a weighted hundred-point rubric with named dimensions, including correctness at 25 points, hallucination at 15 and security at 10. [WorkOS](https://workos.com/blog/writing-my-first-evals) runs both kinds on one harness for its command line installer, grading 40 scenarios across 16 frameworks with a functional grader for whether it worked and a separate quality grader scoring four dimensions from one to five. Those three numbers mean different things, and I'd guess only Laravel's would come back the same if somebody else reran it.

### 7. Say What A Pass Means Across Attempts

Once you run a scenario more than once, "passed" stops meaning one thing. A model that succeeds three times out of three and one that succeeds once out of three can look identical on your page, and somebody choosing between them for production work gets no warning that one of them will fail two times in three. They'll find out in their own codebase. So publish both readings of a repeated scenario, how often it passed every time and how often it passed at least once, and if you'll only print one, say which.

[Grafana](https://o11ybench.ai/) does exactly this, in adjacent columns: success on all three attempts, and success on at least one.

![Grafana's o11y-bench leaderboard, showing Pass^3 and Pass@3 as adjacent columns alongside per-row cost, tokens and dates](/images/agent-evals-grafana-pass-columns.png)

It's probably the most useful reporting idea I came across, because the gap between the two columns is information in its own right: it shows a reader how much a headline depends on which reading you picked. The strict number on its own understates a model that's capable but inconsistent, and the loose one on its own flatters everybody.

If you won't publish both, at least state the rule. [Next.js](https://nextjs.org/evals) says plainly that its success rate is at least one pass in four attempts. You might disagree with that choice, but you can't misread the number.

We haven't had to make this choice yet, and I think that's worse than making it badly. The 1 September 2026 snapshot ran each scenario once per configuration, so there was nothing to aggregate and no rule to disclose.

### 8. Check Your Skills Were Opened

A skill that shows no improvement can mean two opposite things. If agents read it and it didn't help, the content needs rewriting. If they mostly never opened it, the content is beside the point and your problem is discovery. Only a count of how often the skill was opened tells you which, so record it and publish it beside the score. Without it you can spend weeks improving prose that nothing is reading.

[Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) measured it. Its skill left the pass rate unchanged at 53%, and reading the transcripts showed why: the skill wasn't invoked at all in 56% of cases. Adding an instruction to explore the project and then invoke the skill took the same skill to 79%, and changing the wording of that instruction changed the result again.

I wouldn't read too much into that. A flat aggregate doesn't tell you what happened in the 44% of cases where the skill was opened, so it isn't yet a tidy story about good content nobody could find. What the count gave Vercel was a reason to suspect discovery instead of content, and that's a lot more to go on than a flat 53% and a guess.

The [.NET team](https://github.com/dotnet/skills) publishes activation as a standard column beside its results, and I didn't find another results page that does. We're part of the problem here. We record how often our skills were loaded in the results file behind our page, and we've never put that count anywhere a reader would see it.

## Publishing The Results

### 9. Publish Scenarios, Not Just Scores

A percentage asks a reader to trust you. Publishing the task behind every scenario, and the code that checks it, lets them decide whether your tests look anything like their own work, and that's usually what they're trying to find out. Without the scenarios, a developer choosing a model for their integration has to assume your tasks resemble theirs, and they may not at all.

[Supabase](https://github.com/supabase/evals) and [Hookdeck](https://github.com/hookdeck/evals) publish their scenarios and their scoring code. [Resend](https://github.com/resend/resend-skills) goes the other way: its skills repository publishes prompts, expected outputs and checks, and there's no scoreboard anywhere.

Publishing scenarios has a cost, and it grows over time. Anything you publish can be read by an agent and may well end up in training data, so a high score on familiar tasks gradually stops telling you how an agent copes with an unfamiliar one. I'd still publish. If you're shipping skills and documentation at all, you're already trying to get your content in front of models, and holding back only the tests while broadcasting everything else seems the wrong way round to me. Publish the scenarios, expect them to age, and replace them when they do.

### 10. Publish Durable Transcripts

A score says an agent failed, and the transcript says what it tried. That's the difference between knowing you have a problem and knowing what to fix, and it lets a reader check your conclusion, and spot what you missed, instead of taking your word for it. Our own product findings came from reading transcripts, not from the scoreboard. So publish a redacted transcript for every result, and keep it reachable for as long as the result is on the page.

We don't do this yet. The results file behind our page records how often agents asked for our docs and how often our skills were loaded, but our transcripts have lived in workflow artefacts that expire, so nobody can inspect the decisions behind an older result. [Issue #21](https://github.com/hookdeck/evals/issues/21) records the gap.

Redaction is what makes it harder than it sounds. An agent working in a real project handles real credentials, and a transcript is exactly where they end up. Our harness now refuses to export anything containing a key, a check we added after live credentials reached a public run artefact and had to be rotated ([#20](https://github.com/hookdeck/evals/issues/20)).

### 11. Date Every Result

Put a date on every row, not one date on the page. A snapshot can carry older runs forward, so a single page date quietly claims a freshness the individual numbers may not have. Someone comparing two models in your table could be comparing measurements taken days or weeks apart, pick the one that looks better, and never find out the comparison wasn't a fair one.

[Convex](https://www.convex.dev/llm-leaderboard/with-guidelines) marks stale rows where they sit and carries columns for how old each model is and when it last ran, and I didn't find a better example. [Grafana](https://o11ybench.ai/) dates every row too. [Next.js](https://nextjs.org/evals) dates the rows in its superseded table, but gives its current one a single page-level date.

Per-row dates are necessary, and they aren't enough on their own. Ours are what let us discover that our 25 August 2026 snapshot mixed measurements taken twelve days apart, but they didn't stop us publishing it. Guideline 13 is about the rule that would have.

### 12. Log What The Evals Made You Change

Publish what your evals led you to change, including the changes that didn't work. A page of scores on its own says the product is good. Add a log of what those scores led you to change, and the page says the product is improving. I think that's the more useful claim, and keeping the log is a large part of what separates measuring a product from marketing it.

The changes that failed matter more than the ones that worked. Our [improvement log](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) records the CLI comparison from guideline 5 as a negative result, so a reader can follow the finding, the fix, and the evidence that turned out not to support it.

I didn't find another running record like it, having looked for a changelog, a loop file or a findings section in each of the repositories linked at the end of this post. [Convex](https://stack.convex.dev/convex-evals) does disclose that it tuned its guidelines against the categories models did worst at, so the instinct is there, just without the running record.

## Maintaining The Suite

### 13. Decide What Invalidates Earlier Results

Write down in advance which changes make an old result uncomparable, and enforce the rule when one happens. Without it you'll eventually publish a table whose rows were measured under different conditions, and present the difference between them as progress. It's easy to do by accident, because the suite still runs, the numbers still appear, and nothing warns you that half of them predate a change to the prompt.

Our 25 August 2026 snapshot carried 22 of its 114 rows forward from measurements taken on 13 August 2026, across changes in between to the command line tool, the scorers and the prompt. [Issue #60](https://github.com/hookdeck/evals/issues/60) records how the merge mixed those measurements without saying so anywhere in the snapshot.

We caught it the next time. We added a sentence to the prompt every run shares, telling agents not to ask clarifying questions, and that changed the conditions behind every result we had. The totals from before and after couldn't be presented as the agents getting better, so we held off publishing until a clean run existed, and the [v0.4.0 release notes](https://github.com/hookdeck/evals/releases/tag/v0.4.0) explain why the earlier totals aren't comparable.

[Vercel's harness](https://github.com/vercel-labs/agent-eval#result-reuse) builds the rule into the tooling. It fingerprints every result twice: once over the scenario files and configuration together, to decide whether a result can be reused at all, and once over the scenario files alone. With both, it can tell a changed test from a changed setting and rerun only what needs it. The documentation is upfront about the limits. Functions that alter prompts can't be hashed, so you're told to force a rerun when those change.

Record exact versions too, not just the model name. An agent is a model plus its tools and its loop, so a new release of the command line agent changes what you measured as surely as a prompt edit does, and a provider can change what sits behind a model alias without telling you. I'd pin and record the model string, the agent version and the harness version on every row. [Convex](https://www.convex.dev/llm-leaderboard/with-guidelines) gets closest of anyone I saw, with its column for how old each model is, and even that isn't the same as knowing which build answered.

Convex's [leaderboard](https://www.convex.dev/llm-leaderboard) also handles the reader's side of this well. It has a benchmark version selector, so the page tells you which suite produced the numbers in front of you and lets you go back to an older one, instead of quietly replacing them. When I took the screenshot below on 17 September it showed 112 evals as of 9 September, and it had moved on to 10 September within the hour.

![Convex's leaderboard showing a benchmark version selector reading 10 September 2026, 112 evals, above columns for run cost, model age and time since last run](/images/agent-evals-convex-version-and-dates.png)

[tau2-bench](https://github.com/sierra-research/tau2-bench) shows how precisely the boundary can be drawn. Its v1.0.1 correction made earlier results for the banking-knowledge domain noncomparable, so it re-graded the affected submissions and kept a tag for reproducing the old behaviour, leaving the other domains alone.

### 14. Keep Easy Scenarios Out Of The Headline

Your headline number is the one people quote, and it should answer the question the reader came with. Usually that's which of your options to pick, and scenarios that every configuration passes can't help with it. Leave enough of them in the total and two genuinely different configurations converge on similar-looking percentages, so a reader concludes the choice doesn't matter much when your data can't actually support that either way. Report the scenarios everything passes separately from the headline total.

Eleven of the nineteen scenarios in our [1 September 2026 snapshot](https://raw.githubusercontent.com/hookdeck/evals/v0.4.0/results/latest.json) were passed by every one of the six model-and-configuration pairs we ran. [Storybook's page](https://storybook-evals.vercel.app/) shows 100% across four configurations. Both of us ran a single attempt, so neither can say how reliably any of it would happen again. [Our issue on scenarios that don't distinguish agents](https://github.com/hookdeck/evals/issues/47) works through the problem, including a task whose expected difficulty didn't survive contact with the agents.

Convex shows the same squeeze arriving another way. On the 111-eval benchmark that preceded the current 112, the top five [with guidelines](https://www.convex.dev/llm-leaderboard/with-guidelines) sat within 2.3 points of each other on a hundred-point scale, from 96.4 down to 94.1. The top five [without them](https://www.convex.dev/llm-leaderboard/no-guidelines) spread over 4.1 points, from 84.7 to 80.6. Only three of the five models appear in both lists, so that's two leaderboards compared and not one group of models measured twice. It's consistent with improving the thing you measure leaving less room to tell the leaders apart, although two leaderboards can't prove it.

Don't delete these scenarios. Keep them as regression tests, because a scenario everyone passes today is what catches the week somebody stops passing it. Our [README](https://github.com/hookdeck/evals/blob/v0.4.0/README.md) separates regression scenarios from benchmark totals for that reason. If you add harder scenarios, say which version of the suite each result came from, or the suite getting harder will look like the models getting worse.

### 15. Fix The Product, Not The Scenario

When a scenario fails, change the product, the docs or the skills, and leave the scenario alone. Editing the scenario until the failure goes away makes the number go up just as well, and it's quicker, so it's most tempting in the week the numbers are due and the release is behind. That's exactly when you shouldn't trust yourself to make the call, so I'd make it now, in writing, while nothing's at stake.

Our [improvement procedure](https://github.com/hookdeck/evals/blob/v0.4.0/LOOPS.md) requires every fix to be to the product, the docs or the skills, and says why: editing the scenario until it passes proves nothing. Recording each fix where anyone can see whether it touched the product or the test is most of what the file is for.

A subtler version of the same problem doesn't feel like cheating at all. If you write documentation or skills aimed squarely at the failures your own suite catches, your score improves without telling you anything about tasks outside the suite. That's still worth doing, and it's worth saying that you did it. [Convex](https://stack.convex.dev/convex-evals) says so, describing how it targeted the categories models did worst at and tuned its guidelines to pass those cases.

## Suite Size And Cost

How big should a suite be, and what will it cost to run? I haven't made either a guideline, because the answer to both is that it depends. They tend to be the first two questions anyone asks, though, and the survey has enough in it to do better than a shrug.

Published suites don't even agree on what they're counting.

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

With each publisher counting something different, I wouldn't average those numbers. Half of the suites sit between nineteen and forty-one, though, so a couple of dozen is nothing unusual.

How many of your scenarios separate one configuration from another matters more than the total. In our 1 September 2026 snapshot, everything we ran passed eleven of our nineteen scenarios, so only eight were telling configurations apart, and eight is thin. I'd count the distinct things your product asks an agent to do, write a scenario for each, and then check how many of them separate anything.

For cost, the figure I'd trust is Rails': [504 runs at $491](https://rubyonrails.org/2026/8/13/agents-on-rails-the-first-benchmark-report) for the first stage of its benchmark, or about 97 cents a run. That average is dominated by its expensive models, though, and came from a much lighter harness than a coding agent. Ours is often quoted as $81 for a 114-run matrix, and that figure is arithmetic, not a measurement: a real cost for a smaller suite, scaled up. Our own notes say to re-measure instead of re-scaling whenever a decision depends on it, and they say so because conflating the two once had us reporting the judge at twenty-eight times its real cost.

So take Rails' rate, and treat ours as an order of magnitude. Multiply scenarios by configurations by attempts, then by a dollar. Twenty scenarios, three configurations and three attempts come to 180 runs, so somewhere under $200 a cycle. A single improvement loop, where you re-run only the handful of scenarios a fix should have moved, cost us about $5, and that one we did measure.

Some publishers put cost on the page. Grafana carries total and average cost per row, in the same table as the two pass columns from guideline 7, and Convex carries a run cost. We don't, and our reason is weaker than it sounds: Claude Code reports a cost while Codex reports tokens and no cost, so a breakdown across agents is awkward to put together (awkward, not impossible).

None of these figures include the expensive part. Compute is cheap next to writing the scenarios, writing the scorers and reading the transcripts, and the transcripts are where our own product findings came from. Budget for a person's time as well as the API bill.

I can help least with how often to run a suite, because almost nobody states a cadence on their results page. Netlify's AXIS is built to sit in CI, so the implied cadence there is every change. Ours runs weekly at a single attempt, and our own improvement log says outright that a weekly cadence at one attempt can't tell a fix from variance (it's on our list of open problems below). I'd pick a frequency you can afford at the attempt count from guideline 5, because one attempt a week just puts the guideline 5 problem on a schedule.

## Shared Rules, Different Tasks

Would one shared benchmark fix all of this? I doubt it, because a payments API and an observability platform ask an agent to do very different work, and I wouldn't expect one task suite to answer every platform's questions. What publishers could agree on is what a published result discloses, even when the tasks differ.

[MLPerf's training rules](https://github.com/mlcommons/training_policies/blob/master/training_rules.adoc) are a useful precedent. Its Closed division constrains the model, preprocessing, training method and quality target, while its Open division allows more variation, and every result has to name its division so readers know which rules applied.

I'd borrow that principle for agent evals. Say what you gave the agent, how many times it tried, when it ran and what counted as success. Your tasks stay specific to your product, and nobody has to guess how the number was produced.

## Hookdeck Against This List

I've used our own evals as the example of what goes wrong all the way through this post, so it's only fair to turn the list on them. There are two separate tallies below: the problems we've found in our own evals, and how we score against the fifteen guidelines.

### Twelve Problems In Our Own Evals

Of the twelve problems we've found, five are fixed, one is decided, one turned out not to be a problem after all, and five are still open.

These are the five fixes we've shipped:

- The command line tool used to work behind your back in a guest project, so an agent could report success having built everything in a throwaway account nobody would find again. Fixed in CLI 2.5.0.
- Our skill never explained how to authenticate without a terminal. Now it does.
- The alert scorer from guideline 6 required a new record, so repairing a broken one scored zero. That's corrected in [v0.2.0](https://github.com/hookdeck/evals/releases/tag/v0.2.0), although the issue it came from is still open for a separate reason.
- The two contradictory judged checks from guideline 6 have been rewritten so an answer can satisfy both ([#22](https://github.com/hookdeck/evals/issues/22)).
- The scoring itself was wrong, and it took me a while to see it.

We scored a run as the fraction of checks that ran, and our scorers stop at the first failure, so each agent's denominator was set by its own failures. One that fell at the first hurdle was scored out of one check, and one that got four things right and missed the fifth was scored out of five. No two agents were being marked against the same set of checks, so the percentages were never comparable in the first place, and on the 25 August 2026 snapshot that put the deliberately weak model above a frontier one. We now count whole scenarios completed, so a scenario counts once whatever happens inside it. That change shipped in [v0.4.0](https://github.com/hookdeck/evals/releases/tag/v0.4.0), alongside a batch of smaller harness corrections.

The decided one is our position on clarifying questions, and I haven't counted it as a fix. Taking Clerk's option closed the issue, but only by suppressing the caution guideline 4 says is worth measuring. I think it's defensible. It isn't a win, though, and counting it as one would flatter us.

The one that turned out not to be a problem is [#2](https://github.com/hookdeck/evals/issues/2), which we'd been calling "our skills make a weaker model worse". When I first published this post on 17 September it was still open, and what we had was four single-attempt measurements of that gap for the weak model, taken while the instrument itself was still changing. It read minus three on 13 August, minus two after we corrected a pair of mis-scoring scenarios, minus one on 1 September, and plus four on 14 September, when the sign flipped. I wrote then that a number taking four values in four runs isn't measuring anything yet, and that by guideline 5 the issue should stay open until we'd run it three times. We've since done that and closed it on 22 September. Counting only the three September runs where both configurations ran on the same day, the weak model passed 48 of 57 attempts with our skills and 44 of 57 without, so on recent evidence the skills aren't making it worse. The minus three dates from 13 August, a day affected by a credit outage, and no run since has reproduced it.

Five problems are still open, and three of them are filed. We still don't publish transcripts that would let you check a result yourself ([#21](https://github.com/hookdeck/evals/issues/21)). A merge can still carry rows forward from an older run without saying so ([#60](https://github.com/hookdeck/evals/issues/60)). And in the 1 September 2026 snapshot, eleven of our nineteen scenarios were passed by everything we ran, so most of the suite wasn't doing the job the headline claims for it (#47 again).

The other two aren't filed, because they're design limits and not defects. I've included them because leaving them out is how a list like this gets flattering. We run two configurations, so by guideline 3 we can't say whether our gains came from what we wrote or from what the agent was allowed to do. And we ran each scenario once in the 1 September 2026 snapshot, against the three I've told you to run. The weekly run is still a single attempt.

### Our Score Against The Fifteen Guidelines

We meet five outright: we define the baseline, publish the scenarios, date every row, keep a change log, and fix the product instead of the scenario. Each of those costs some writing and nothing else, and the baseline only joined the list while I was writing this post, so you can judge for yourself how cheap it was.

We half-meet three. We declared one prompt change incomparable and held publishing for it (guideline 13), but #60 means a merge can still carry rows forward silently. We fixed both scorers from guideline 6 without publishing which of our checks a model grades. And we wrote down the rule about ticket-shaped scenarios (guideline 1) and still filed #47 against our own suite. Guideline 4, on clarifying questions, we've decided without really solving.

That leaves six we fail. Five of them would cost compute or engineering time we haven't spent, and the sixth is guideline 8, publishing the skill-loading count we already record.

I'd like to call that discipline, but the pattern is plainer than that. We meet the guidelines you can satisfy by writing something down, and we fail the ones that cost compute or engineering time. Guideline 8 gives it away, because it only costs some writing, like the five we meet, and we still haven't done it. In our experience finding a problem is the cheap part, and it's running the evals that turns a suspicion into something you can file.

## Harnesses Worth Starting From

I wouldn't build the sandboxing and result handling yourself. There are two agent-eval harnesses and two general evaluation frameworks I'd look at, each built for a different job, so the choice mostly comes down to what you want out the other end.

[Vercel's agent-eval](https://github.com/vercel-labs/agent-eval) is the one I'd look at first if you want to publish a comparison like the ones in this post. It's MIT licensed and it's the shared engine behind the Next.js, Nuxt and Storybook results, so it has more publishing adopters than anything else I found. Svelte uses it too, but I couldn't find any published results from Svelte, so adopting the harness doesn't by itself get anything published. The baseline is just another configuration file with no special status, so it'll support the single-change designs from guideline 3 without imposing one. Its own playground was empty when I looked (zero experiments, zero runs), so the evidence for it is the projects using it, not the project itself.

[Netlify's AXIS](https://axis.run) answers a different question. It describes itself as Lighthouse for agent experience: 23 agent adapters, weighted dimensions and a score out of 100 you can gate a build on. Reach for it if you want a number that goes in CI, not a comparison between configurations. I couldn't find a leaderboard or named scores of its own on the site.

[promptfoo](https://promptfoo.dev), which [Shopify](https://github.com/Shopify/agent-skills) names as its skills-evaluation tool, and [Inspect AI](https://inspect.aisi.org.uk), which [Flutter](https://github.com/flutter/evals) builds on, are general LLM evaluation frameworks, not agent-eval harnesses. Start from one of those if your team already runs it for other model testing and you'd rather extend it than adopt something new. I couldn't find published scores from Flutter, though, so you'd be further from a worked example.

Whichever you pick, deciding what your baseline represents and what you disclose about it is still your job (guideline 2).

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

Published as a post instead of a page: [Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations) ([harness](https://github.com/stripe/ai/tree/main/benchmarks)), [Netlify](https://www.netlify.com/blog/how-we-measure-netlify-agent-experience/), [Laravel](https://laravel.com/blog/which-ai-model-is-best-for-laravel), [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), [LangChain](https://www.langchain.com/blog/evaluating-skills), [Firebase](https://firebase.blog/posts/2026/08/eval-driven-development-agent-skills/), [WorkOS](https://workos.com/blog/writing-my-first-evals), [Convex](https://stack.convex.dev/convex-evals) and [Supabase](https://supabase.com/blog/introducing-supabase-evals).
