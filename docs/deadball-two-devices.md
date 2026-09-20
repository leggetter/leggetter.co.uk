# Dead Ball across two devices

A plan for Phase 6: two people, two devices, one shootout. One shoots, the
other keeps, alternating, exactly as the hotseat duel already does.

This is a companion to [deadball-spec.md](deadball-spec.md) rather than a
replacement. That document decides *which technology* - it has the table
weighing a Durable Object against KV against WebRTC, and the reasons for a
separate Worker. This one covers *how the thing works*: who is in charge, what
crosses the wire, what happens when somebody closes their laptop, and what the
first server in this project costs its owner.

It is separate for one reason. Everything else in Dead Ball is a static file
that runs in a browser. This is a server, and a server has an operational
surface - a bill, an abuse story, someone else's data on a disk somewhere, and
an outage. That is a different kind of thinking from how a crowd is drawn, and
running the two together makes both harder to read.

**Nothing here is built.** `net/Transport.ts` is a name in the module layout
and nothing else.

## Summary

| | |
| --- | --- |
| **Decision** | Build the transport interface and a same-browser implementation *first*, so the whole protocol is designed and tested before any infrastructure exists. Then one Durable Object per game, polled, on a separate Worker. |
| **Authority** | The server holds the match state and runs the same reducer the client does. Its job is not to stop cheating in general; it is to **enforce the order of commitment** - the keeper's pick is sealed until the shot arrives. |
| **The thing to decide before building** | Player names have to leave the device for the first time. See [What this costs in privacy](#what-this-costs-in-privacy), which is the section to read if you read only one. |
| **Not building** | Chat, accounts, matchmaking, lobbies, spectators, leaderboards. |

## What is already true, and why it makes this small

Four properties of the existing code do most of the work:

1. **`core/match.ts` is a pure reducer**, `(state, MatchMessage) => state`, with
   no DOM and no browser API anywhere in `core/`. It therefore **runs on the
   server unchanged**. The same file decides the game in both places, which
   removes the entire class of bug where a server and a client disagree about
   the rules because somebody wrote them twice.
2. **The simulation is deterministic** - seeded PRNG, fixed timestep, no
   wall-clock reads in `core/`.
3. **A shot is a few dozen bytes.** `ShotInput` plus a seed plus where the
   keeper was standing reproduces a trajectory exactly. Nothing streams, no
   positions are ever sent, and there is no frame rate on the wire.
4. **The hotseat duel already proved the format.** Two devices changes where
   the messages come from and nothing about what they mean.

## Authority: who decides

**The server holds the state and reduces the messages.** Clients send
intentions; the server applies them and tells both players the result.

The alternative - a dumb relay, with each client reducing independently - is
less code on the server and worse in two ways. There is no single truth to
reconnect *to* after a dropped connection, and there is nothing enforcing the
order that the whole format depends on.

### The only thing worth defending

Not cheating in general. Two people who know each other playing a penalty game
do not need an anti-cheat system, and building one would be the wrong use of
anybody's afternoon.

What has to hold is the one rule the format is built on: **the keeper commits
before the taker sees anything, and cannot revise afterwards.** On one device
that is solved by an opaque handover screen and a reducer that ignores a second
`SET_DIVE`. Across two devices it is solved more simply and more completely:

- The keeper's `Dive` goes to the server and **stays there**. It is not
  broadcast.
- The taker's client is told only that the keeper has committed - a boolean,
  not a position.
- When the `ShotInput` arrives, the server resolves the shot and sends both
  players the whole thing at once.

No cryptography, no commit-reveal hashing. The server simply does not tell you,
which is sufficient because the server is the thing both players already trust
to hold the score.

**Worth noticing: two devices is *safer* for this format than one.** The
handover screen exists because two people share a screen and one of them could
look. Across a wire there is nothing to look at.

## The protocol

Six messages in, three out. The names match `MatchMessage` where they can,
because they become it.

### In, from a client

| Message | When | Payload |
| --- | --- | --- |
| `join` | On opening the URL | player token, tuning fingerprint, chosen name |
| `dive` | Keeper picks a corner | `{ x, y }` |
| `shoot` | Taker releases the drag | `ShotInput`, and the `Outcome` their own client computed |
| `next` | Tapping through a resolved shot | - |
| `leave` | Tab closing, best effort | - |

### Out, from the server

| Message | Carries |
| --- | --- |
| `state` | The whole `MatchState`, plus whose turn it is and whether the opponent is connected. Sent on every change. |
| `shot` | The resolved shot: `ShotInput`, seed, keeper start, the dive, and the outcome. Everything needed to animate it. |
| `error` | A refusal, with a reason a human can read. |

The whole `MatchState` is a few hundred bytes, so sending it entire on every
change is cheaper than working out a delta and far cheaper than debugging one.

### Divergence, and the failure that will actually happen

The main spec already says: send the resolved `Outcome` alongside the
`ShotInput`, and if the receiver's own simulation disagrees, trust the sender
and log it. That stands.

But the realistic cause of disagreement is not IEEE-754 drift between two
browsers. **It is one player running a stale build**, holding a cached bundle
from before a physics change, in which the same numbers honestly produce a
different shot.

So `core/tuning.ts` earns its keep here: **the fingerprint goes in the `join`
handshake, and a mismatch refuses the join** with "one of you needs to
refresh". That is a real bug caught at the door rather than an unexplainable
divergence logged halfway through a shootout.

## Identity without login

- **A game is a URL.** `/deadball/g/<id>`, where the id is unguessable enough
  that nobody stumbles into someone else's - eight characters of base32 is
  forty bits and plenty. The main spec suggests the id could *be* the match
  seed, which is neat; it also means the seed is public, which is harmless here
  because knowing the seed tells you nothing you could act on.
- **A player is a random token in `localStorage`**, minted on first visit and
  sent with every message. The server binds token to side on first contact.
- **That token is what makes a reload survivable**, which is the whole reason
  it exists. Close the tab, reopen the link, and you are still the keeper with
  your three saves. Without it, a refresh mid-shootout means losing your seat
  to yourself.
- **The third visitor is turned away.** Not made a spectator - spectators sound
  free and are not, because then the sealed dive has to stay sealed from them
  too and there is a new class of question about who can see what.

## Failure, which is most of the work

The happy path is an afternoon. These are the rest of it.

| What happens | What should happen |
| --- | --- |
| The other player closes their tab | Say so plainly - "waiting for Bo" - and keep the game. It is their turn and nothing can proceed. |
| ...and never comes back | The room expires on its TTL. No timeout-and-forfeit: this is a game between two people who know each other, and the honest failure is "we stopped playing", not a loss on the record. |
| A player reloads mid-shot | Their token gets them their seat back and the next `state` puts them where the match actually is. A shot in flight is re-animated from the last `shot` message or skipped to its outcome. |
| Both reload at once | Nothing special. The server is the truth and neither client held anything the server did not. |
| The network drops mid-`shoot` | The client retries with the same idempotency key. The server applies a given key once, so a retry cannot fire the same penalty twice. |
| Someone opens the link a third time | Refused, with an explanation. |
| The two clients disagree on the outcome | Trust the server, log the divergence, carry on. |

**Idempotency keys are not optional.** A retried `shoot` without one is a second
penalty, and that is a bug that would show up as a mysteriously wrong score
rather than as an error.

## What this costs in privacy

**This is the part to decide before writing any code.**

Everything about names in this project has rested on one property: **they never
leave the device they were typed on.** The naming dialog says so in as many
words, it is marked `ph-no-capture` so the site's analytics cannot see it, and
the shot log deliberately records `takerSide` rather than a name - with a test
that fails if anybody adds one.

Cross-device breaks that, necessarily. The other player has to see who they are
playing, so a name has to cross the wire and sit in a server's memory.

That is not a reason not to build it. It is a reason to decide it deliberately
and write down what was decided:

- **Say so, in the room.** The joining screen should state that the name is
  shared with the other player. Not buried in a policy - on the screen where
  the name is typed.
- **Keep it in memory and let it expire.** The name lives in the Durable
  Object's state for the life of the room and goes when the room does. It is
  not written to a log, not to analytics, and not to any store that outlives
  the game.
- **Never log the name.** Debug logging that includes the room's state will
  include the players' names. That has to be a rule with a line of code behind
  it, not an intention.
- **Consider defaulting to the team name.** Phase 4.5 makes the computer
  opponent a team, and a human side could be one too. "Rovers" crossing the
  wire is a different proposition from a child's first name, and if the default
  is a team then the name is a choice rather than the path of least resistance.

The project's rule has always been *assume anything committed is published*.
The cross-device equivalent: **assume anything sent is stored**, and design for
the version where it is.

## Cost and abuse

This would be the first thing on a twenty-one-year-old personal site that a
stranger can write to. That deserves a paragraph rather than an assumption.

- **Cost is nothing at this scale.** A Durable Object per game, hibernating
  when idle. Two players polling once a second for a twenty-minute game is
  about 2,400 requests, against a free tier measured in the hundred thousands.
- **Creation is the abusable endpoint.** Rate limit it per IP, and cap the
  number of live rooms. An attacker's win condition here is a bill, so the cap
  matters more than the rate.
- **Rooms expire.** An hour is generous for a shootout and short enough that
  nothing accumulates.
- **A separate Worker on its own route.** Already the lean in the main spec,
  and this is the reason: the failure mode of getting multiplayer wrong should
  be "the game is down", not "the blog is down".
- **The page is hidden**, unlinked and `noindex`, which is not a security
  control and does reduce the odds of anybody finding it to poke at.

## Build order

The point of this ordering is that **the protocol gets designed and tested
before any infrastructure exists**.

1. **`net/Transport.ts`** - the interface. Send a message, receive messages,
   know whether you are connected. Nothing about HTTP or Cloudflare in it.
2. **`net/local.ts`** - an implementation over `BroadcastChannel`, so two tabs
   of the same browser play each other. This is not a toy: it exercises the
   whole protocol, the reconnect logic, the sealed dive and every failure in
   the table above, with no account, no deploy and no bill. Most of the bugs
   live here and can be found here.
3. **The Durable Object** - the same interface over fetch. At this point the
   client is already finished.
4. **Polling first, WebSocket later.** Polling cannot get stuck in a state the
   code has not thought about, which is worth more at the start than the second
   it saves. The known upgrade path, and the reason to take it: the moment the
   ball is struck is the best moment in the game, and up to a second of dead
   air before it is the one place the delay is felt.

Step 2 is the one that would be skipped under time pressure and the one that
pays for itself. A same-browser transport also makes this **testable in CI**,
which a Durable Object is not.

## What is deliberately not being built

- **Chat.** The single most requested feature of anything like this, and out of
  scope on purpose. A text channel between two people, at least one of whom is
  a child, is a moderation problem, a logging problem and a retention problem,
  and it has nothing to do with penalties.
- **Accounts.** The URL is the identity. That is the whole appeal.
- **Matchmaking or a lobby.** You send someone a link. There is no pool of
  strangers to be matched with, and introducing one changes what this is.
- **Spectators.** See above - they are not free.
- **A leaderboard.** Needs identity, which needs accounts. Filed under Later in
  the main spec and it can stay there.

## Open questions

1. ~~Does the reducer really run unmodified on a Worker?~~ **Answered.**
   `core/` imports nothing but itself and `content/`, touches no browser or
   Node global, and reads no clock - and a whole shootout runs start to finish
   using only those imports. `core/portable.test.ts` now asserts all four, and
   was checked against planted violations rather than trusted: a `Date.now()`
   and a `performance.now()` added to `rng.ts` both fail it. So this is a
   standing guarantee rather than a fact that was true once.
2. **What is the id?** The match seed is elegant and makes the URL mean
   something. It also fixes the id's length at whatever the seed is. Worth a
   look at whether forty bits of seed is both enough entropy and a sensible
   seed.
3. **Does a shootout survive one player being on a train?** Turn-based helps,
   but the answer decides how hard reconnect has to work.
4. **Is the name a person or a team?** Phase 4.5 might answer this before Phase
   6 needs to, which is a good argument for doing them in that order.
