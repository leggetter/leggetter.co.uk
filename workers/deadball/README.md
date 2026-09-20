# Dead Ball rooms

The game server: one Durable Object per room. A **separate Worker from the
site**, in the same repository - the reasons pull in opposite directions and
both are in [docs/deadball-two-devices.md](../../docs/deadball-two-devices.md).

## Setting it up on Cloudflare, once

1. **Workers & Pages → Create → Workers → Connect to Git**, and pick this
   repository.
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

One row per finished shootout goes to a Workers Analytics Engine dataset called
`deadball_matches`, queryable through the [SQL
API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/):

```sql
SELECT blob2 AS winner, count() AS games
FROM deadball_matches
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY winner
```

which answers the question the coin flip was built for. Nothing identifying is
in there - no names, no tokens, no room ids. See **What gets kept** in
[docs/deadball-two-devices.md](../../docs/deadball-two-devices.md).

Writes are non-blocking and the binding is optional in code, so a missing
dataset costs you the statistics rather than the game.

## Then point the site at it

The page only uses the server when it knows where it is. Set

```
PUBLIC_DEADBALL_ROOMS=https://deadball-rooms.<your-subdomain>.workers.dev
```

in the **site's** Workers Build environment variables. Without it the game
falls back to the same-browser transport, where two tabs can play each other -
which is what every local checkout does, and how the protocol was debugged
before any of this existed.

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
