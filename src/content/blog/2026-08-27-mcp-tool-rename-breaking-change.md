---
title: "Is Renaming an MCP Tool a Breaking Change?"
aiAssisted: true
excerpt: "Agents rediscover tools at runtime, so a renamed tool is just found under its new name and nothing breaks. That argument is more persuasive than it should be. The tool name is the only identity MCP gives a tool, and half the ecosystem quietly uses it as a primary key."
---

In July I was at the WeAreDevelopers World Congress in Berlin, where I watched [Adam Bird](https://www.linkedin.com/in/adambird/), CEO and co-founder of [Cronofy](https://www.cronofy.com/about), give a talk called ["Building APIs for Agents vs Systems. Is MCP the answer?"](https://www.youtube.com/watch?v=GdTJWkbLpGI).

Last week I was reshaping the MCP server in the [Hookdeck CLI](https://github.com/hookdeck/hookdeck-cli), and part of that work renames a batch of tools to give them a proper namespace prefix and changes some parameters. From an API perspective that's straightforwardly breaking: rename the thing, change its arguments, bump the major. Except Bird's talk was still sitting with me, and it left me in two minds. If the client re-derives the tool surface every session, whose contract am I actually protecting? Maybe I'd just imported twenty years of REST habits into a context where they don't apply.

The version number itself turned out to be moot: we need a major bump for other breaking changes anyway. But being in two minds about *why* is a bad place to leave it, so I went looking for the standard. What do the spec and the client docs actually say about renaming, deprecating and versioning a tool? Here's what I found.

## TL;DR

- **There is no standard.** The MCP specification has nothing to say about renaming, deprecating or versioning a tool name. This isn't a convention I disagree with, it simply isn't there.
- **Agents rediscover tools every session, and that fixes less than it sounds like.** The model will find your tool under its new name without being told. Every *human* and every *config file* that wrote the old name down will not.
- **Permission rules are keyed to the tool name** across nine surfaces in five independent clients, and there's no mechanism anywhere for expressing "this tool used to be called X".
- **The failure is silent, which is the real problem.** In Claude Code specifically, a stale `deny` rule naming a renamed MCP tool simply stops matching. The guardrail comes off, nothing is blocked, and nobody is told.
- **So yes, renaming is a breaking change, and the protocol gives you no way to announce it.** MCP can tell the *model* that a tool has moved, through a description or an error message. It has no channel at all to the permission rules and config files that actually broke, so everything that reaches those sits outside the protocol. Ship a migration note, not just a version number.

## The Case for Renaming Freely

Bird's case is a lot better than "renames don't matter", so it's worth stating at full strength.

With REST, the orchestration lives in the client. A developer wrote that client, by hand, months ago. The contract has to be frozen because there's a human-authored integration on the other end that will not adapt. Two decades of API design discipline follow from that one fact.

With MCP, the server owns the orchestration and the client re-derives its interface at runtime, on every session. That inverts the constraint. If nothing downstream has pinned your names, you're free to reshape the surface, and not just to fix past mistakes. You can also *vary it per customer*. Bird's example is a scheduling surface where one customer's integration exposes a `schedule_interview` tool with `host` renamed to `interviewer` and `recipient` to `candidate`, while everyone else gets the generic version.

That's renaming as a **feature**, it's a genuinely good idea, and it only works because runtime discovery removed the need to freeze the contract.

Two things are worth noting, though, because they get lost when this argument is repeated second-hand. The first is that this is a design talk, and versioning only comes up briefly near the end, but that was the part I walked out still thinking about. The second is that Bird hedges carefully. He says Cronofy have decided not to version their MCP server *right now*, raises the possibility that per-version schemas will eventually be needed, and predicts that deterministic (non-inference) consumers of MCP endpoints are coming, which would reintroduce exactly the pinning problem. And his own REST API is still on version one after all these years. His track record is *stability*; he isn't claiming churn is safe.

So the talk supports "runtime discovery makes a dynamic surface possible". It doesn't support "versioning is unnecessary". Those two got conflated somewhere between the stage and my head.

## What Does the MCP Spec Say?

I went in expecting to find a convention. There isn't one.

From the [current spec revision](https://modelcontextprotocol.io/specification/2026-07-28/server/tools):

> Each tool is uniquely identified by a name and includes metadata describing its schema.

And in the tool definition, `name` is simply "Unique identifier for the tool". There's a `title` field for display purposes, which you can change as freely as you like, but `name` is the identity.

The Tool Names section says names "**SHOULD** be unique within a server", but notice that's uniqueness at a point in time. There's nothing about stability *over* time, no `deprecated` flag, no `version` field on a tool, no rename guidance and no compatibility language. The only occurrence of "backwards compatibility" on the entire page is about serialising structured content into a text block, which is unrelated.

The closest the spec comes to acknowledging versioning at all is, wonderfully, one of its own examples of a valid tool name:

> * `getUser`
> * `DATA_EXPORT_v2`
> * `admin.tools.list`

Version-in-the-name is the entire affordance you get.

There's also a `serverInfo.version` string, but the spec never defines its semantics or requires semver, and nothing in the protocol lets a client ask for a particular version of a server, or notice that it got a different one. The [versioning page](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning) covers the *protocol*, negotiated per-request, and places zero obligations on server authors.

**The ecosystem has tried to fill this gap and hasn't managed it.** [SEP-1575, "Tool Semantic Versioning"](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1575), one of the protocol's own enhancement proposals, put forward a per-tool `version` field plus client-side compatibility constraints, and its motivation is precisely this problem. It's labelled `dormant` and is now closed. Separately, a TypeScript SDK PR adding [`aliasTool()` for tool name fallbacks](https://github.com/modelcontextprotocol/typescript-sdk/pull/1029) was opened in October 2025 and closed the next day, never merged.

That second one didn't fail on its merits. Someone hit the problem independently and built the mitigation, 435 lines and seven passing tests of it, and it drew a single review comment suggesting an enhancement, one 👀 reaction, and no merge before the author closed it themselves the next morning. It wasn't rejected. There was just nothing for it to attach to.

## Where the Discovery Argument Holds Up

Credit where it's due, because this part is real and it covers most of the surface area:

- **Model-side discovery just works.** The LLM re-reads tool descriptions each session, so a renamed tool is exactly as findable as it was before. You don't need to do anything.
- **Server-scoped permission rules survive.** A rule like `mcp__hookdeck__*` doesn't care what the tools underneath are called.
- **Enterprise server allowlists in Claude Code survive.** [`allowedMcpServers` and `deniedMcpServers`](https://code.claude.com/docs/en/managed-mcp#policy-based-control-with-allowlists-and-denylists) match a server by URL, by the exact command that starts it, or by name, never by tool name, so no rename can affect them. There's a second, per-tool enterprise control that doesn't survive, and I come back to that below.

If those were the only surfaces, Bird would be straightforwardly right.

## Who Else Is Using Your Tool Names?

This is the question I should have asked myself first, and the answer is: far more things than I expected. Tool names leaked out of the protocol and into configuration much faster than anyone designed for. Every client that lets you approve tools individually needs a stable identifier to hang that approval on, and the only identifier MCP offers is the name.

Once you go looking, it's everywhere:

| Surface | What's keyed by tool name |
|---|---|
| MCP dispatch itself | `tools/call` `params.name`; unknown name → `-32602` |
| Claude Code allow/deny/ask rules | the literal `mcp__server__tool` string |
| Claude Code "don't ask again" | any approval you keep becomes an `mcp__server__tool` rule, the only syntax there is |
| claude.ai org connector controls | per-tool `ask` and `blocked`, set by an admin |
| Claude Code hook matchers | matched against the tool name |
| Claude Desktop per-tool toggles | a local JSON file keyed by connector and tool name |
| Cursor `mcpAllowlist` | `server:tool` entries |
| VS Code Copilot | per-tool approvals as a name→bool map |
| OpenAI Responses API MCP | `allowed_tools`, `require_approval.never.tool_names` |

That's nine surfaces across five independent clients where the tool name is the authorisation join key, against zero mechanisms anywhere for saying "this tool used to be called something else".

Rename a tool and you don't break the agent's ability to call it. You break the user's *decision* about whether it's allowed to.

## Why Stale Permission Rules Fail Silently

I could have lived with "some permission rules go stale", because config drifts and users fix it. What tipped it for me is *how* it goes stale.

From the [Claude Code permissions documentation](https://code.claude.com/docs/en/permissions):

> A deny or ask rule whose tool name matches no known tool produces a startup warning to catch typos. Tool names containing `_` or `*` are exempt from the check.

Every MCP tool name contains `__` by construction, because the naming pattern is `mcp__<server>__<tool>`. So **every MCP permission rule is exempt from the one mechanism that would have told the user it had gone dead.**

Now think about the direction of failure. A stale *allow* rule fails closed: you get prompted again, you're mildly annoyed, you re-approve, and no real harm is done. But a stale *deny* rule fails **open**, so the guardrail silently stops matching and nobody is warned, because the warning is disabled for exactly this class of name.

That's not an ergonomics problem, it's a security one, and it's sufficient on its own to call a rename breaking.

One thing softens it, and it's under-known: deny rules are more expressive than allow rules, which is the right way round for a safety mechanism. Deny and ask rules take a glob in the tool-name position, so a bare `mcp__*` denies every MCP tool across every server. Allow rules don't work that way. They take a glob only after a literal `mcp__<server>__` prefix, and an unanchored allow such as `mcp__*` is skipped with a warning and auto-approves nothing. So **the rename-proof deny already exists**: `mcp__yourserver__*` in the deny list goes on denying whatever you rename underneath it, and a deny that's broader than it strictly needs to be costs the user nothing but convenience. The same is emphatically not true on the allow side, which is the whole of the trade-off further down.

One thing makes it worse, at the layer with the least visibility. Organisations can set [per-tool controls on claude.ai connectors](https://code.claude.com/docs/en/mcp#organization-controls-on-connector-tools), `ask` or `blocked`, and Claude Code enforces them locally. A tool set to `blocked` is filtered out before the model ever sees it. That's a deny, set by someone who isn't the user, keyed to a tool name they don't control, on a server they didn't write, and nothing in MCP tells it that the tool has been renamed. It only reaches remote connectors, so a CLI-distributed server like ours is out of scope. If you ship a remote MCP server, an admin's `blocked` rule is the most consequential thing a rename can quietly detach.

There's a related trap in the same family that's worth knowing about regardless of renames. Claude Code hook matchers are regex, but a matcher made only of literal characters is compared as an exact string, so a matcher written the obvious way, `mcp__hookdeck`, matches *nothing*. It has to be `mcp__hookdeck__.*`. The same string means the opposite thing one file over: written as a *permission* rule, `mcp__hookdeck` matches every tool the server provides. If you've written an MCP hook the intuitive way, it may already be dead, so it's worth going and checking now.

## Can You Rely on Rediscovery?

The current spec revision explicitly blesses caching the tool list. `tools/list` responses carry `ttlMs` and `cacheScope`, and the spec tells servers to return tools in a deterministic order specifically so that "clients [can] reliably cache the tool list".

So the premise that every client re-derives the surface fresh each session isn't a guarantee. It's an implementation choice, and one the spec now actively encourages clients *not* to make.

And `notifications/tools/list_changed` doesn't rescue this either. In the current revision it's opt-in twice over: the server must declare the capability, and the client must have opened a subscription stream asking for it. A client that never subscribes is never told. Even when it does fire it refreshes the *list*, and it won't rewrite a permission rule, an `AGENTS.md` or a saved prompt. It repairs the one thing that was never broken.

## So, Is It a Breaking Change?

**Yes, but the good reason isn't the one I'd have given at the start.** "It's a rename, therefore breaking" *is* imported REST intuition. The defensible version is narrower and much stronger:

> The tool name is the only identity the MCP spec gives a tool, and multiple real clients key authorisation state to that identity. Changing it silently invalidates security rules with no warning.

**Be honest about what a major version bump buys you, though, because mechanically it's very little.** MCP has no version negotiation for servers: nothing in the protocol asks for a version, carries one, or notices when it changes. Pinning is possible, but every form of it sits outside MCP. A remote server can be pinned by URL, a local one by package spec, and the protocol neither surfaces that nor acts on it. Most users don't pin at all. They run `@latest` or `brew upgrade` and get whatever's current. The version number is a flag that says *read the migration note*, and it protects nobody by itself. Keep the bump for the sake of an honest semver contract, but don't oversell it.

## How Do You Signal a Breaking Change?

I went looking for the mechanism and there isn't one. Every lever MCP gives you sits outside the protocol.

| Lever | Who it reaches | Does it work? |
|---|---|---|
| `serverInfo.version` bump | nobody | Inert. There's no negotiation, and nothing in the protocol reads it. |
| Version in the tool name (`DATA_EXPORT_v2`) | the model | The spec's only real affordance, but it versions the *tool* rather than the server, and it doubles your tool count. |
| A new server URL | the human, if they notice | The closest thing to REST's `/v2/`, and only available if your server is remote. |
| A new server name | everyone, painfully | Also breaks `mcp__yourserver__*`, so it takes out the one rule that survives renames. |
| A new package version | nobody | Your users run `brew upgrade` or `@latest` and silently get the new surface. |

A remote MCP server can run v1 and v2 side by side on different URLs and migrate people gradually, which is more or less the REST playbook. A CLI-distributed server has no endpoint to version, so an upgrade hands over the new tool surface with no seam at all. That's the situation I'm in with the Hookdeck CLI.

MCP *does* give you channels inside the protocol. You can put a deprecation notice in a tool's description, and you can return a tool execution error naming the replacement. Both of those speak **to the model**. The thing that actually broke, your permission rules and your config, has no channel at all. The protocol will happily let you announce the change to precisely the layer that was never in trouble.

## What To Do When You Rename a Tool

So what should you actually do?

1. **Ship a transitional alias, unlisted.** Add middleware on `tools/call` that maps old names to new ones, forwards the call, and appends a deprecation notice. Keeping it out of `tools/list` matters, because that's what avoids doubling your tool count and bloating context. That was the SDK PR's design too: aliases resolved at call time, deliberately absent from `tools/list`. If you'd rather force migration than paper over it, return a *tool execution error* naming the replacement rather than a protocol `Unknown tool` error. The spec is explicit that clients "**SHOULD** provide tool execution errors to language models to enable self-correction", whereas protocol errors are "less likely to result in successful recovery". Either way, an agent calling the old name gets told the new one.
2. **Publish a rename table**, old → new, and tell people to grep their Claude Code settings, Cursor allowlists and saved prompts. **Call out the silent-deny-rule failure explicitly.** That sentence is worth more to a security-conscious reader than the version number is.
3. **Tell people which rules survive, and what they cost.** `mcp__yourserver__*` survives any rename where a tool-scoped rule doesn't, so it's the advice that stops the next rename hurting. It is also a blanket allow, and that is not a small thing to hand out: the broader the rule, the more rename-proof it is and the less it protects. There is a middle option I didn't know about when I first wrote this, and it's better than either end of that trade-off. It asks something of the server author rather than the user, which is what the last section of this post is about.
4. **Check your own house too.** Tool names have a habit of ending up hardcoded in your docs, your READMEs, your test suites, and in the descriptions of *other* tools that reference their siblings. The one that's easiest to miss is your own analytics, where a rename quietly re-keys your metrics and your dashboards go flat without ever erroring.

## Both Camps Are Right

They're right about different layers, and I think this is the line that resolves it:

**Runtime discovery removes the need to version the *interface*. It does not remove the need to migrate the *identity*.**

Bird is right that freezing MCP surfaces the way we froze REST would forfeit the best thing about the protocol. The versioning camp is right that names have leaked into permission systems, manifests and prompts faster than anyone planned for, and that the failure mode is uniquely nasty. When a REST integration breaks it throws. When an agent's tool vanishes from under it, it doesn't crash. It improvises around the gap, and you may never see that it happened.

So rename freely. Just don't pretend the name was only ever for the model.

## Name Tools So the Prefix Does the Work

I wrote point 3 above as a straight choice: a server-wide wildcard that survives renames, or individually named tools that don't. Those aren't the only two options, and what I missed was documented on the same page I'd been quoting from all along.

[Claude Code allow rules](https://code.claude.com/docs/en/permissions#tool-name-wildcards) take a glob in the tool-name position, so long as the server segment is literal:

> Allow rules accept tool-name globs only after a literal `mcp__<server>__` prefix. The server segment must be glob-free so the rule names a specific server you configured. `mcp__puppeteer__*` matches every tool from the `puppeteer` server, and `mcp__github__get_*` matches its `get_` tools.

`mcp__github__get_*` is neither a blanket allow nor a list of individual tool names. It grants one server's read tools and nothing else, it survives any rename that keeps the `get_` prefix, and it's an ordinary line in a settings file that anyone can write today. The client-side mechanism I said was missing is already shipped.

What's missing is on my side of the wire. A glob can only find a boundary the names already have. If a server's read tools are `get_connection`, `get_event` and `get_request`, one rule covers exactly those. If they're `list_connections`, `retrieve_event` and `search_requests`, no glob catches that set and the user is back to the wildcard or the list. Same permission system, same client, different naming decision taken by the server author months earlier.

So the thing I'd now do first: **put whatever a user might want to draw a permission boundary around at the front of the tool name, immediately after the server prefix.** Usually that's the read/write split. Get it there and the rename-proof rule and the least-privilege rule stop being two different rules.

None of that argues against renaming freely. It's a constraint on where in the name the verb sits, not on how often the name changes, and Bird's per-customer surfaces are untouched by it: a `schedule_interview` with per-customer parameter names still sits behind the same prefix as everything else that writes.

How far this generalises is a fair question, so I checked the other three clients in the table above. [Cursor does the same thing](https://cursor.com/docs/reference/permissions) and goes further. Its allowlist entries are `server:tool` strings, "Glob-style `*` patterns also work inside names (e.g. `my-server:list_*` matches `list_issues`, `list_users`, etc.)", and a `*:my_tool` entry matches that tool name across every server at once. [VS Code](https://code.visualstudio.com/docs/agents/run/approvals) doesn't: you approve an individual tool, or every tool from a server, or everything globally, with no pattern in between. Nor does the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), where `allowed_tools` and `require_approval.never.tool_names` are lists of exact names.

So the convention pays off in two of the four, which is a smaller claim than I'd like but it's the true one. In the other two, granular control still means an exact list of names, and every rename means editing that list by hand.

It costs you something on the model side too, because tool names have to read naturally to the thing calling them. Putting `get_` first is free. Anything more elaborate starts trading legibility for a permission boundary most of your users will never write.
