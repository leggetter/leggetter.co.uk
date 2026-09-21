# Dead Ball rooms

The game server: one Durable Object per room. A **separate Worker from the
site**, in the same repository - the reasons pull in opposite directions and
both are in [docs/deadball-two-devices.md](../../docs/deadball-two-devices.md).

## Setting it up on Cloudflare, once

It is **already deployed**, at
`https://deadball-rooms.phil-4a3.workers.dev`, first put there from a laptop
with

```sh
npx wrangler deploy --config workers/deadball/wrangler.jsonc
```

which is also how to push a fix in a hurry. What that command cannot do is
connect the repository, so deploys stay manual until somebody does the
following in the dashboard once. There is no `wrangler builds`.

1. **Workers & Pages → deadball-rooms → Settings → Build → Connect**, and pick
   this repository. (Connecting an existing Worker, not creating one - the
   Worker, its Durable Object and its migration already exist, and *Create →
   Connect to Git* would make a second one beside it.)

2. **Change both commands away from the defaults.** The dialog offers `npm run
   build` and `npx wrangler deploy`, and *both are wrong here* - they are the
   site's, because the site is what this repository looks like from the
   outside.

   | Field | Default offered | What it must be |
   | --- | --- | --- |
   | Build command | `npm run build` | **empty** |
   | Deploy command | `npx wrangler deploy` | `npx wrangler deploy --config workers/deadball/wrangler.jsonc` |

   There is nothing to build: wrangler bundles the TypeScript itself, and
   `npm run build` would spend a minute rendering 220 pages of blog that this
   Worker never reads.

   The deploy command matters more. Left as `npx wrangler deploy`, it picks up
   the **root** `wrangler.jsonc`, whose `name` is `leggetter-co-uk` - so the
   game server's build would deploy *the website*, to the website's Worker,
   and `deadball-rooms` would never change no matter how many times it ran.
   Quiet, wrong, and hard to spot afterwards, because both builds would be
   green.

3. **Turn off Preview builds.** Preview builds publish a *version* of this
   Worker, and a version shares the Worker's bindings - the same Durable
   Object namespace and the same analytics dataset as the game people are
   playing on. A branch could then seat players in live rooms and write test
   shootouts into the real numbers. Use the `dev` environment below instead,
   which is a genuinely separate Worker.

4. **Root directory** (Advanced settings): leave it at the repository root. Not
   `workers/deadball`, even though that is where the Worker is: the Worker
   imports `src/games/deadball/core/` directly, because the whole design rests
   on the server and the browser running the *same* reducer, and a root inside
   `workers/` cannot see it.

5. **Build watch paths** (Advanced settings), so a blog post does not redeploy
   the game server:
   ```
   workers/deadball/**
   src/games/deadball/core/**
   src/games/deadball/net/**
   src/games/deadball/content/**
   ```

6. **Production branch:** `main`, which is what the site already deploys from.

### The dashboard will then tell you this file is wrong. It is not.

After connecting, Builds shows a warning like:

> Update `wrangler.jsonc` in your repo to keep settings consistent.
> `"name": "deadball-rooms",`

Ignore it, and **close the pull request it offers to raise.**

The dashboard looks for a config at the build's *root directory* and does not
read the `--config` flag in the deploy command. So it finds the **site's**
`wrangler.jsonc` at the repository root, reads `"name": "leggetter-co-uk"`,
compares that to the Worker it is attached to, and reports a mismatch that does
not exist. The config that actually deploys this Worker is the one beside this
README, and it has said `deadball-rooms` all along.

Taking the suggestion would rename the **website's** Worker to
`deadball-rooms`. The next push would then deploy 220 pages of blog over the
game server - an assets-only Worker with no Durable Object binding and no
migration - and take multiplayer down until somebody worked out why. It is
recoverable in one `wrangler deploy`, and it would be a confusing hour first.

There is no way to silence it while one repository holds two Workers. Pointing
the root directory at `workers/deadball` would match the names and break the
build instead, because the Worker imports `src/games/deadball/core/` and could
no longer see it.

Nothing else, and no plan change - this account is already on **Workers
Paid**, so Durable Objects are included rather than something to qualify for.

Worth recording how that was established, because the repository said Free for
weeks on my say-so and nobody had checked. The OAuth token wrangler holds has
no billing scope, so the account cannot be asked directly. What settles it is
CPU: the Free plan stops an invocation at 10ms, and a throwaway Worker here
burned **1567ms in a single request** and returned normally. Free cannot do
that.

The SQLite backend stays anyway. It is the recommended one, and it is the only
one that would still work if this ever moved to Free.

**The room is still not written to storage on every poll**, and that predates
knowing the plan. A `put` is billed as a row written, and two clients polling
every two seconds would spend eight thousand writes an hour doing nothing at
all. Paid makes that affordable rather than sensible. It is saved when
something actually changes, which is a handful of times per kick.

## Results

Two kinds of row go to a Workers Analytics Engine dataset called
`deadball_matches`, queryable through the [SQL
API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/):

```sql
SELECT blob4 AS winner, count() AS games
FROM deadball_matches
WHERE blob2 = 'result' AND blob3 = ''
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY winner
```

**`blob3 = ''` is not optional.** It is the tag, and it is empty for every real
game, because nothing in the browser can set it - only whoever mints a room
over HTTP can ask for one. A smoke test against production passes
`"tag": "smoke"` and drops out of every query that includes that clause.

The alternative was filtering by date, which works exactly once and then
quietly stops being true the next time somebody verifies a deploy against the
real server. Which has to keep happening: a deploy is the one thing
`wrangler dev` cannot rehearse.

Rows written before the tag existed have a winner or an outcome sitting in
`blob3`, so the same clause discards those too - which is correct, because all
of them are mine.

```sh
# what a smoke test against production should look like
curl -X POST https://deadball-rooms.phil-4a3.workers.dev/room \
  -H 'content-type: application/json' \
  -d '{"id":"ABCD2345","settings":{"discipline":"both","shots":5},"tag":"smoke"}'
```

which answers the question the coin flip was built for. There is also a row per
kick - spot, wall size, shot style, aim, outcome - tied to its game by a random
key. Nothing identifying is in any of it: no names, no tokens, no room ids. See **What gets kept** in
[docs/deadball-two-devices.md](../../docs/deadball-two-devices.md).

Writes are non-blocking and the binding is optional in code, so a missing
dataset costs you the statistics rather than the game.

## The site is already pointed at it

In [`.env.production`](../../.env.production), not in a dashboard variable.
The URL is not a secret - it ships inside the page's JavaScript and anyone who
opens the game can read it - so putting it in the repository costs nothing and
buys two things: a clean checkout builds a working site, and the address
production depends on shows up in a diff instead of living invisibly in
somebody's browser tab.

Only `astro build` reads it. `npm run dev` deliberately does not, so a local
checkout keeps falling back to the same-browser transport where two tabs play
each other - which is what every local checkout does, how the protocol was
debugged before any of this existed, and worth keeping working.

## A second one to break

`deadball-rooms-dev`, from the same file:

```sh
npx wrangler deploy --config workers/deadball/wrangler.jsonc --env dev
```

Its own Durable Object namespace and its own dataset (`deadball_matches_dev`),
so a room made while testing cannot collide with a game somebody is playing,
and a test shootout cannot land in the numbers that are supposed to answer
whether anybody ever beats the wall. That second point is the one that matters:
the per-kick rows only exist to be read later, and a few hundred rows of a
robot taking the same three shots would quietly ruin them.

`wrangler dev` is still the first thing to reach for - it is faster, free and
offline. This is for the half `wrangler dev` cannot tell you about: real
Durable Object placement, real cold starts, a real rate limiter, and a real
network between the two players.

Bindings are written out again under `env.dev` rather than inherited, because
wrangler does not inherit them. An environment that omits a binding does not
fall back to the top-level one - it simply does not have it, and the failure
turns up at runtime as an undefined.

## Nothing stops anyone minting rooms, so this slows them down

There is no account here and no key: the room id *is* the key. So `POST /room`
counts by address, five a minute, and answers 429 beyond that.

**The nominal number is not what you get, so it was measured rather than
chosen.** Cloudflare's limiter is per-location and per-isolate with
eventually-consistent counters, and says so itself - "permissive...
intentionally designed to not be used as an accurate accounting system".

| Sent to `deadball-rooms-dev` | Allowed |
| --- | --- |
| 300 at 25 at a time, limit 20 | 187 |
| 300 at 25 at a time, limit 5 | 107 |
| a person starting 6 games over 70s, limit 5 | all 6 |

Thirty requests sent *one at a time* never tripped a limit of 20 at all - they
spread across enough isolates that no single counter noticed. That is why the
number ended up at five: it costs a real player nothing, and going tighter
would not buy much, because sequential requests slip through regardless.

So read the limit as a speed bump with a number on it, not a wall. It stops one
machine in a loop, which is the realistic version of this. It does nothing to
anybody spread across addresses, and a limit tight enough to matter there would
be tight enough to refuse a family.

Two deliberate omissions:

- **The message endpoint is not limited.** A client polls every two seconds, so
  two players in one house are sixty requests a minute from one address before
  anybody has done anything wrong. A limit loose enough for a few households at
  once is too loose to be worth having.
- **A missing binding means no limit**, not no game. Same bargain the analytics
  binding makes: configuration that has gone wrong should cost the speed bump,
  not the shootout.

## Running it locally

```sh
npx wrangler dev --config workers/deadball/wrangler.jsonc --port 8787
PUBLIC_DEADBALL_ROOMS=http://127.0.0.1:8787 npm run dev
```

Then open the game in two different browser profiles - not two tabs, which
would prove nothing about this half.

## What is actually in here

Very little, and that is the point. `net/room.ts` decides who is seated, whose
turn it is, whether a shot went in and what the taker is allowed to know, and
it had been running in a browser against two tabs long before this Worker
existed. This file moves bytes and holds a queue per seat.
