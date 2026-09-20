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
2. **Root directory:** leave it at the repository root. Not `workers/deadball`,
   even though that is where the Worker is: the Worker imports
   `src/games/deadball/core/` directly, because the whole design rests on the
   server and the browser running the *same* reducer, and a root inside
   `workers/` cannot see it.
3. **Deploy command:** `npx wrangler deploy --config workers/deadball/wrangler.jsonc`
4. **Build watch paths** (Settings → Builds), so a blog post does not redeploy
   the game server:
   ```
   workers/deadball/**
   src/games/deadball/core/**
   src/games/deadball/net/**
   src/games/deadball/content/**
   ```
5. **Production branch:** `main`, which is what the site already deploys from.

Nothing else. No plan change: Durable Objects are available on the Workers
**Free** plan as long as they use the SQLite storage backend, which is what
`new_sqlite_classes` in `wrangler.jsonc` selects. Free limits are 5 million row
reads and 100,000 row writes a day, which two people taking penalties will not
trouble.

That limit did shape one thing: **the room is not written to storage on every
poll.** A `put` is billed as a row written, and two clients polling every two
seconds would spend eight thousand writes an hour doing nothing at all. It is
saved when something actually changes, which is a handful of times per kick.

## Results

Two kinds of row go to a Workers Analytics Engine dataset called
`deadball_matches`, queryable through the [SQL
API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/):

```sql
SELECT blob2 AS winner, count() AS games
FROM deadball_matches
WHERE blob2 = 'result' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY winner
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
