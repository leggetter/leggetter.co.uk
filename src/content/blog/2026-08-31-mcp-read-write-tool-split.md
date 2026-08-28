---
title: "Should Read and Write be Separate MCP Tools?"
draft: true
excerpt: "We put reads and writes on the same tool under an action parameter, because it grouped things logically and the research backed it. Then a beta user pointed out that permissions are granted per tool name, so 'read freely, ask before changing' is a sentence our design gives them no way to say. A tool name is the unit of human consent, not the unit of enforcement."
---

Last week I wrote about [whether renaming an MCP tool is a breaking change](/blog/mcp-tool-rename-breaking-change/). That question came out of reshaping the MCP server in the [Hookdeck CLI](https://github.com/hookdeck/hookdeck-cli) for a 3.0 release. This one comes out of the same work, and it's the decision I was more confident about.

We expose one tool per resource with an `action` parameter, rather than one tool per operation. So `gateway_connections` with `action: "list" | "get" | "create" | "delete"`, instead of `gateway_list_connections`, `gateway_get_connection` and the rest. Reads and writes live on the same tool as different values of the same enum. Writes are then gated behind an `--allow-write` flag, and a read-only server rebuilds each tool's enum with the write actions removed.

I'd researched that shape rather than guessing at it, and [wrote the conclusion up in public](https://github.com/hookdeck/hookdeck-cli/issues/359). Part of that conclusion was an explicit decision *not* to split tools by read and write. Then someone on the beta sent me an email explaining, politely and correctly, why that had made the server unusable for the thing they wanted to do with it.

## TL;DR

- **Permissions are granted per tool name.** Every client that lets you approve tools individually keys that approval to the tool's name, so a tool spanning `list` and `delete` can only be allowed or gated as a unit.
- **A server-side read-only flag doesn't solve it**, because it's a start-time, process-wide, binary choice. "Read freely, ask before changing" is a thing a user wants *within* one session, and no flag can express it.
- **Almost every production MCP server separates reads from writes at the name level.** Most do it without thinking about it, because one-tool-per-operation with verb-first names gets you the split for free.
- **Anthropic and OpenAI give directly opposing advice**, and the MCP specification says nothing at all. Anthropic's guidance optimises for how the model navigates your tools and is silent on how a human authorises them.
- **Annotations don't rescue this.** `readOnlyHint` is a per-tool boolean with no argument-conditional form, and the request to make Claude Code permission on it was closed as not planned.
- **The shape was chosen before there was a boundary to protect.** Our first MCP release was almost entirely reads, so a pattern that economises on tool names cost nothing. Writes arrived later and inherited it.
- **A tool name is the unit of human consent, not the unit of enforcement.** Enforce wherever you like, but consent binds to a name, because a name is all a client's approval prompt has to hold on to. Anything finer is invisible to it.

## What the Feedback Actually Said

The message was about the write mode we'd just shipped in beta. They'd left it switched off, and they were clear it was a design issue rather than a bug.

The write actions aren't separate tools, they're extra values on the existing tools' `action` parameter. Permissions are granted per tool name. So there's no way to say "read connections freely, ask before changing one". It's either allow `gateway_connections` and accept that an agent can delete a live connection without prompting, or gate the tool and get a prompt on every read. In front of a customer's production event stream, neither of those is acceptable, so the writes went through the CLI instead, where each command can be allowlisted on its own.

That last part is the bit that stung. We built an MCP server partly so agents wouldn't have to shell out to the CLI, and a user went back to the CLI because a CLI has better permission granularity than our MCP server does. `hookdeck gateway connection list` and `hookdeck gateway connection delete` are different strings, so a permission system can tell them apart. `gateway_connections` is one string either way.

## Why the Research Said We Didn't Need the Split

The industry survey found that GitHub is the one major server that splits explicitly by risk class in its names: `issue_read` and `issue_write`, `pull_request_read` and `pull_request_review_write`, `projects_get` and `projects_list` against `projects_write`. GitHub consolidates *within* a risk class and never across it.

I then asked why they needed to, and found a mechanical answer. Most servers implement read-only mode by filtering on the annotation:

```go
// github/github-mcp-server, pkg/inventory/filters.go
if r.readOnly && !tool.IsReadOnly() { /* drop tool */ }
```

For a server built that way, a tool spanning `list` and `delete` must be annotated `readOnlyHint: false`, so read-only mode drops it entirely and you lose the ability to list at all. The split is what stops read-only mode from being useless.

We don't have that problem, because we rebuild the action enum per mode instead of filtering whole tools. A read-only server drops the write actions from each tool's enum, so most of our tools can honestly report `readOnlyHint: true`. That's the approach Grafana takes, registering mode-specific variants under one name, and it was the one elegant way the survey found to consolidate across the read/write boundary. The conclusion followed: GitHub's reason for splitting doesn't apply to us, so we don't need to split.

Every step of that is still correct. It just answers a question about the server, and the complaint is about the client.

## What Do Honest Annotations Actually Buy?

Going back to our own code with the complaint in hand, less than I'd claimed.

The annotations are computed from whichever actions are available in the current mode. `readOnlyHint` is the negation of "any available action changes state", and `destructiveHint` is true if any available action is destructive. Both are properties of the whole tool, because that's the only shape the specification offers.

So in write mode, `gateway_connections` carries `destructiveHint: true`, on account of `delete`. If your client gates on that hint, you get prompted before `list`. That is the second half of the complaint I got, and it isn't a client quirk, it's our annotation doing exactly what we told it to.

The read-only side has its own wrinkle. `pause` and `unpause` are marked as mutating but deliberately not gated, on the argument that pausing a misbehaving connection is how an incident investigation usually ends and that it's reversible, since pausing buffers delivery rather than dropping events. I still think that call is right. The consequence is that the tool offering them cannot claim to be a pure read, so `gateway_connections` reports `readOnlyHint: false` in **both** modes. It's the only tool in the server that does, and the code says so deliberately rather than by accident:

```go
// HasChanging, not HasWrite: an action can change state and
// still be offered in read-only mode (connections pause). Using
// HasWrite here would tell a client this tool is a pure read
// while it can halt delivery.
```

Which leaves the annotations scrupulously honest and of no use to the person trying to write a permission rule. Honesty was the wrong thing to be optimising for. Nothing downstream reads these hints to decide what's allowed, so a truthful boolean and a dishonest one buy the user exactly the same amount: nothing.

The `pause` case has a sharper edge than the annotation story, and it's the part I'd want a user to take away. Turning write mode off reads as "so I'm safe now". You aren't, quite. An agent holding read-only `gateway_connections` can still halt delivery on a production stream, so read-only isn't a safe blanket allow either. That's a consequence of drawing our boundary at the flag rather than at the tool name, and no amount of correct annotation fixes it.

## The Question I Didn't Ask

Our read/write boundary is a **server start-time, process-wide, binary** choice. You launch the server with `--allow-write` or you don't, and whichever you picked applies to every tool for the whole session.

The user's boundary is **per-call and per-tool**, decided inside a single session by whoever is sitting there. What they want is one session where reads are auto-approved and writes prompt. That's not an exotic ask, it's the ordinary way people work with agents on production systems, and it's exactly the shape the underlying permission systems are built to express.

Here's Claude Code's rule syntax, [from the documentation](https://code.claude.com/docs/en/permissions):

> * `mcp__puppeteer` matches any tool provided by the `puppeteer` server
> * `mcp__puppeteer__*` uses wildcard syntax and also matches all tools from the `puppeteer` server
> * `mcp__puppeteer__puppeteer_navigate` matches the `puppeteer_navigate` tool provided by the `puppeteer` server

Server, then tool, and that is the whole vocabulary. Bash rules can match on arguments, so you can allow `Bash(git diff:*)` while gating `git push`, but MCP rules have no equivalent, and patterns in parentheses are rejected outright for MCP. Cursor is the same shape with `server:tool` entries, and VS Code Copilot keys per-tool approvals as a name to boolean map.

So the finest distinction any of these clients can draw is a tool name. Our `action` parameter sits one level below that, which makes it invisible to the permission layer. We put the read/write boundary somewhere the permission system structurally cannot see it.

The failure isn't that a user can't do what they want. It's that a user can't *say* what they want, and the sentence they need to say is a completely reasonable one.

## Why Didn't We Land on This Sooner?

The answer is in our own build plan, which is [in the public repo](https://github.com/hookdeck/hookdeck-cli/blob/main/plans/hookdeck_mcp_buildout_plan_v2.md) and predates any of this by a year:

> LLM tool-calling accuracy degrades above 30-50 tools. Phase 1 ships **12 tools**, 10 investigation and operational tools, a catch-all guidance tool, and a conditional login tool. All resource tools use the **compound pattern**: a single tool name with an `action` parameter. This keeps the selection surface small while preserving per-tool capability.

Phase 1 was an investigation surface. Every action was a read, so putting several of them behind one name cost nothing, because there was no boundary running through the tool for your permission rule to need. The compound pattern was chosen when reads were all there was.

Writes arrived a year later and landed inside a shape that had been sized for a problem they didn't share. Nothing was reconsidered at that point, because from the server's point of view nothing needed to be: the enum narrows by mode, the annotations stay accurate, and every test passes.

The plan anticipated being wrong, and said so:

> The compound pattern is a testable bet. If agents consistently fail to specify an action or confuse action-specific parameters, the fallback is to expand compound tools into single-action tools (e.g. `connections_list`, `connections_get`, `connections_pause`).

The bet had an exit condition, and the exit condition names the exact fix I'm now arguing for. But look at what would trigger it: agents failing to specify an action, agents confusing parameters. Both are *model* failures. A permission problem could never trip that wire, however bad it got, because nobody was watching that wire. We wrote down how we'd find out we were wrong, and the test we wrote could only detect one of the two ways.

## Who Actually Separates Read and Write?

My memory of the research was that GitHub was the only server doing this. Going back through it, that's true in a narrow sense and misleading in a broad one.

GitHub is the only one that does it *as an explicit naming convention*, with matched `_read` and `_write` pairs. But look at what everyone else ships:

| Server | Shape | Can you allow reads and gate writes by name? |
|---|---|---|
| GitHub | Hybrid, 19 of 117 tools take an action enum, split by risk class | Yes, explicitly. `issue_read` against `issue_write` |
| Stripe | Two dispatchers over ~130 API methods | Yes, explicitly. `stripe_api_read` against `stripe_api_write` |
| Sentry | One per operation | Yes, by verb |
| Supabase | One per operation | Yes, by verb |
| Linear | Granular reads, `save_*` upsert writes | Yes, by verb |
| Cloudflare | One per operation, split across product servers | Yes, by verb |
| Atlassian (community) | 98 tools, one per operation, zero enums | Yes, by verb |
| Neon | One per operation plus one read-only enum tool | Yes, by verb |
| Notion | Hybrid, `notion-update-page` takes a 6-value command enum | Mostly, and the enum tool is writes only |
| MongoDB | Hybrid, 5 of 53 take an enum | Mostly |
| Grafana | Hybrid, 11 of 108 take an enum | Mostly |
| Hookdeck Gateway | One tool per resource, action enum spanning both | **No** |

The reframing that matters: almost nobody *decides* to separate reads from writes. They get the separation for free, because `list_projects` and `delete_project` are different names, and mutability is implicit in the verb. GitHub is unusual for having consolidated far enough that they had to make the split deliberate, and for then choosing to preserve it.

Consolidating *across* the read/write boundary, on a tool that carries both, is the rare position. Where the enum tools exist elsewhere they tend to sit on one side of the line: Notion's `notion-update-page` is six ways to mutate a page and nothing else.

Stripe is the case that settles the trade-off, because they consolidate harder than anyone and still draw the line. [Their whole API surface](https://docs.stripe.com/mcp) is two tools, `stripe_api_read` for "any Stripe API `GET` method" and `stripe_api_write` for "any `POST`, `PATCH`, `PUT` and `DELETE` method", covering around 130 methods between them. Their stated reason is context: this "makes much of the API available through MCP without increasing the context window unnecessarily." So the most aggressive consolidation I found anywhere splits on read and write, and splits on nothing else. The boundary survives because it's the one thing consolidation can't be allowed to cross.

And GitHub, the closest analogue to our shape, has been building its way back out of it. [PR #2306](https://github.com/github/github-mcp-server/pull/2306), merged in April 2026, adds feature-flagged granular variants of the consolidated tools. The stated reason is not accuracy and not context cost:

> The existing consolidated tools use a `method` parameter to control behavior. This makes it impossible to selectively enable individual operations, you either get all of `issue_write` or none of it.

> Granular toolsets solve this by exposing each operation as its own tool, allowing users to enable exactly the capabilities they need, which is especially useful for AI agents where limiting the tool surface area improves reliability and safety.

That's the same complaint, filed nine months earlier and against a tool that had already been split by risk class, which makes the email I got a stricter version of a problem GitHub has already conceded.

What I didn't expect to find is that **nobody documents the read/write naming split as a permissioning decision.** GitHub's changelogs justify their tool work on context economy, quoting a 23,000-token saving on the Projects toolset. The permission consequence surfaces in exactly one place I could find, and it's a comment in an AST linter they wrote to stop anyone shipping a tool with an unset `ReadOnlyHint`:

> The Go runtime cannot distinguish an unset bool field from one explicitly set to false, so this AST-level check exists to prevent future tool registrations from silently defaulting `ReadOnlyHint` to false, which has triggered downstream agents to prompt for human approval on safe read operations.

Prompting for human approval on safe read operations. That's the complaint I received, described by GitHub, in a compile-time check built to make sure it can't happen again. Sentry independently built the same enforcement and gives the same reason: "Filters and confirmation gates rely on these; an undefined hint is a silent gap."

So the shape most servers ship is permission-compatible by construction rather than by argument. It comes from naming tools after verbs, which everyone did anyway, and the benefit only becomes visible when somebody loses it.

## Where Did Our Write Flag Come From?

One more thread worth pulling, because it turns out to matter. When we picked `--allow-write` as the flag name, we picked it because [awslabs](https://github.com/awslabs/mcp) uses it across a dozen of their servers, and matching an existing convention beat inventing one.

Their flagship compound servers have precisely the problem I've been describing. The EKS server's README lists its read-only and write modes like this:

> **Read-only mode (default)**: `manage_eks_stacks` (with operation="describe"), `manage_k8s_resource` (with operation="read")...
> **Write-access mode** (require `--allow-write`): `manage_eks_stacks` (with "generate", "deploy", "delete"), `manage_k8s_resource` (with "create", "replace", "patch", "delete")

The same tool name appears in both modes, distinguished only by an `operation` value. None of their compound servers set tool annotations at all, which follows, because a tool spanning read and delete has no honest single `readOnlyHint` to set. And their design guidelines run to 1,096 lines without mentioning read-only mode, `--allow-write` or tool annotations once.

So we took the flag from a design that had never argued for itself, into a tool shape that makes the flag do less. I don't think that's a reason to change the flag name, which is fine and widely recognised. It is a reason to be careful about what you infer from a convention. That `--allow-write` is common tells you people want this boundary; it doesn't tell you anyone has worked out where to draw it, so check what the servers you copied it from actually do with it.

## Do the Vendors Help?

Not really, because the two of them disagree with each other and the specification abstains entirely.

Anthropic's [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) page recommends our exact pattern, by name, and still does today:

> **Consolidate related operations into fewer tools.** Rather than creating a separate tool for every action (`create_pr`, `review_pr`, `merge_pr`), group them into a single tool with an `action` parameter. Fewer, more capable tools reduce selection ambiguity and make your tool surface easier for Claude to navigate.

Read the last clause carefully, because it tells you what the advice is optimising for: making the surface easier for Claude to *navigate*. That is guidance about model performance, and on that basis it is probably right. The page says nothing about permissions, authorisation or safety, and it isn't pretending to.

OpenAI's [plugin guidance](https://developers.openai.com/plugins/plan/tools) goes the other way, and names the exact axis:

> Split operations when they have different permissions, safety risks, or confirmation requirements.

> Separate read and write behavior so the model and user can distinguish information retrieval from actions that change state.

That phrase "so the model **and user** can distinguish" covers the half Anthropic's bullet leaves out, and it is the half my beta user was standing in.

The [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) has no position at all. Nothing normative or advisory about granularity, tool counts, or whether to multiplex operations behind a parameter. The one adjacent sentence lives in a concepts page, describing rather than prescribing: "Each tool performs a single operation with clearly defined inputs and outputs."

So there's no arbiter. Both vendors are giving sound advice about the thing they're each looking at, and the two things are in tension. If you're going to be told to consolidate for the model and split for the user, you have to decide which of those two you're more afraid of getting wrong.

## Will the Ecosystem Close the Gap?

Annotations were my first hope, and they fail on two counts.

`readOnlyHint` and `destructiveHint` are per-tool booleans. There is no argument-conditional form, no way to say "read-only when `action` is `list`". I went looking for a schema idiom for argument-conditional risk across every server in the survey and found none: no `if`/`then`, no `dependentRequired`, nothing. The real-world answers are conservative over-approximation, where you annotate for the worst action the tool can take, or runtime privilege downgrade, like Supabase running `execute_sql` inside a read-only transaction. Neither is expressible in a schema.

The second count is that annotations aren't wired to permissions anyway. [An issue asking for exactly that](https://github.com/anthropics/claude-code/issues/30142) was opened in March 2026, describing a problem identical in shape to ours:

> I want to give Claude Code universal permission to use read-only tools (queries, fetches, lists) while still requiring approval for write operations (create, update, delete, send). But there's no way to express this today.

It was closed as not planned. The specification is also explicit that annotations are untrusted hints rather than a security boundary, so it's hard to argue a client is wrong to decline to permission on them.

The gap is at least formally acknowledged. There's now a [Tool Annotations Interest Group](https://modelcontextprotocol.io/community/interest-groups/tool-annotations), chartered because six independent proposals were each addressing real problems without a coherent view between them, and its open questions include how annotations should interact with human-in-the-loop requirements. That's the right conversation. It is not one that concludes in time for a release this year, and whatever it concludes, your clients then have to implement it, so if you are shipping a server now you should assume you are on your own.

That closes off the workaround, and it's what turns this from a preference into a constraint. If the client won't permission on annotations, and rules can only match a name, then the tool name is the only place a read/write boundary can be expressed at all. Our annotations being honest is worth something, but it isn't worth what I thought it was, because nothing downstream acts on them.

## Doesn't This Make Tool Names Do a Job They Can't Do?

There's a published counter to all of this, and it's the strongest objection I found. The security writing on MCP access control argues that name-based allowlists are not access control at all, [in one case](https://nhimg.org/articles/mcp-tool-filtering-is-not-access-control-for-ai-agents/) rejecting tool granularity as the fix outright: "one tool can hide harmless reads, privilege escalation, destructive commands, or batch operations", so no amount of naming discipline saves you, and final authorisation belongs to the resource owner's own IAM.

On its own terms that's right, and it's aimed at a different problem: a gateway deciding what an untrusted caller may do. Enforcement should never live in a tool name, and ours doesn't. It lives in the flag, the schema gate, and a server-side check on every write action, none of which a client can talk its way past.

The claim here is narrower: a tool name is the unit of human consent, not the unit of enforcement. Those two get conflated because both look like permissions from a distance, but only one of them is a thing a person sits in front of and agrees to. You can have flawless server-side authorisation and still have built something a person cannot agree to in parts, and that is the failure I got the email about.

## What Would I Change?

The fix is the one the email suggested, and it's the convention GitHub already landed on: move the mutating actions onto their own tools. `gateway_connections` keeps `list`, `get` and the other reads. A separate `gateway_connections_write` carries `create`, `update`, `delete`, `enable` and `disable`. Then `mcp__hookdeck__gateway_connections` is a rule someone can actually sign off on, and the write tool stays in front of a human every time.

Seven of our resources have write actions, so that takes the Gateway server from 14 tools to 21. The original plan was defending a 30-50 tool band, and 21 sits comfortably inside the shape it was protecting, which makes this a cheaper change than the framing of the original bet suggests.

It still costs context, which is what the action enum was buying. That's a real cost and I don't want to wave it away, though it's smaller than it was: both Anthropic and OpenAI now ship tool search, and it's on by default in Claude Code, so only tool *names* load at session start. The context saving we bought by consolidating is increasingly something clients hand you for free.

It also doesn't mean abandoning the enum. Consolidation works well when the actions share a parameter set, which is why GitHub's `pull_request_read` covers nine methods with seven parameters and stays cheap. Reads on one resource share their parameters almost by definition. Keep the enum, keep it within a risk class, and you keep most of the benefit, which is what both GitHub and Stripe do at opposite ends of the consolidation scale.

If you are designing a server now, the question to ask yourself is narrower than "how many tools should I have?" It is whether any single tool name spans a line someone might want to sign off on separately.

I haven't shipped this yet, and it's a judgement rather than a measurement. Nobody has published an A/B of "action enum" against "many narrow tools" on selection accuracy. What I do have is one user with a production system telling me precisely what they couldn't express, and a large vendor having reached the same conclusion from the opposite direction.

There's also a timing argument that has nothing to do with whether the design is right, and it's the one I find hardest to argue with. The release this is part of [renames every tool anyway](/blog/mcp-tool-rename-breaking-change/), so every user with a per-tool permission rule re-grants once regardless. Splitting the tools later means asking them to do it a second time. Doing both in the same release costs people one disruption instead of two, and this is the last moment when that's true.

That post ends on a trade-off I left open, and this is where it closes. A server-scoped rule like `mcp__yourserver__*` survives any rename, where a tool-scoped rule doesn't, which makes it tempting advice. It is also a blanket allow, and `mcp__hookdeck__*` is precisely the thing the email I got was refusing to write. The two properties are in direct tension: the broader the rule, the more rename-proof it is and the less it protects.

Splitting the tools is what resolves it. Once reads and writes have different names, the narrow rule is worth more than the convenience, and the cost of the occasional re-grant is small next to what it buys. Which means the answer to "what should I tell users to put in their settings" depends on a decision I hadn't made yet when I wrote it down.

## Tools Are the Unit of Consent

**A tool name is the unit of human consent, not the unit of enforcement.** Your enforcement can live anywhere you can defend it, in a flag, a scope, a server-side check, a policy engine in front of the whole thing. Consent has nowhere else to go. It binds to a name, because a name is the only handle a client's approval prompt is given, and everything you put below that line is invisible to the person being asked.

Which means the read/write question isn't really about tool design, or context economy, or how well a model picks between similar options. Those were the questions I researched, and they were the wrong ones to stop at. The question underneath is: what is the smallest thing a user can say yes to?

If a person can't sign off on a *tool*, they'll sign off on nothing and route around you. That's the actual failure mode here. Not a wrong call from an agent, not a degraded eval score, but a careful operator quietly deciding your surface isn't one they can take responsibility for, and going back to the CLI where every command is its own name.

I grouped by resource because that's how the API is shaped and it made the surface easy to read. Group by what someone can approve instead. Those are the same thing more often than you'd expect, and the times they aren't are the times it matters.

## How This Post Was Written

I didn't write the prose. Claude did, working from transcripts of the sessions where the work happened. I chose the subject, made the decisions it describes, and edited.

Every source is linked, so check anything that matters to you. Errors are mine.
