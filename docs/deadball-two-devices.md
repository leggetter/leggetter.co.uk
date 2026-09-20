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
| **Decision** | Build the transport interface and a same-browser implementation *first*, so the whole protocol is designed and tested before any infrastructure exists. Then one Durable Object per game, polled, on a separate Worker in this repository. See [Where the code lives](#where-the-code-lives). |
| **The shape** | Host names their own team and picks the kick; a link is minted and cannot then change; the guest sees what they are joining, names themselves, accepts; a coin decides who shoots first. See [Starting a game](#starting-a-game). |
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
| `join` | On opening the URL | player token, tuning fingerprint, **their own** team name and kit |
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

## Starting a game

Four steps, and a screen in the middle that is easy to forget when sketching
this and turns out to be the one everybody sees.

1. **The host picks a new game**, names *their own* team, and chooses the kick -
   penalties, free kicks, or both.
2. **A game id is minted** and becomes a URL.
3. **The host waits**, on a screen whose whole job is to be left (below).
4. **The guest opens the link**, sees what they are being invited to, names
   *their own* team, and accepts. A coin is flipped, and it starts.

**Each side names only its own team.** In `versus` today you name both, because
one of them is a computer that cannot type. Across two devices that would be
naming somebody else's team, which is a strange thing to do and a worse thing
to have done to you.

**The kick belongs to the match and only the host picks it.** Both sides must
play the same discipline or it is two competitions scored against each other -
that is settled, and there is a test for it. One person has to choose and the
one who started the game is the obvious one.

### The kick cannot change once the id is minted

This is worth stating as a rule rather than leaving to good sense, because the
obvious convenience - *let the host change their mind while nobody has joined* -
is a **race**. The guest reads "free kicks" on the accept screen, the host
switches to penalties, the guest accepts. They have now agreed to something
they never saw.

Making the settings immutable at the moment of minting removes the whole class
rather than timing around it. **The room is the settings.** Changing your mind
means cancelling and making another one, which costs a tap and cannot go wrong.

### The waiting screen

```
Rovers  vs  waiting...
Free kicks shootout

  [QR]     deadball.../g/7k2p9x

           [ Copy ]  [ Share ]

                     [ Cancel ]
```

- **Share, not only Copy.** The actual use of this feature is sending a link to
  somebody on a phone. `navigator.share()` opens the system share sheet
  straight into whatever they message each other with; copy-then-switch-apps is
  the clunkiest part of every link-based game. Falls back to Copy where it is
  not supported.
- **A QR code**, because a good share of these will be two people in the same
  house on two devices, and pointing a camera at a screen beats sending
  yourself a message.
- **Cancel destroys the room**, rather than navigating away from it. Otherwise
  abandoned rooms accumulate and the TTL is a safety net doing a plan's job.
- **Nothing else.** The temptation is a spinner or a tip. Both are noise on a
  screen that exists to be left.

### Who shoots first

**Flipped, shown to both, and nobody chooses.**

Always-host-first is simpler and hands a real edge to whoever happened to press
the button: teams going first win around 60% of real shootouts. Between two
people who know each other that is an argument waiting to happen.

A toss where the winner *chooses* is the faithful version and adds an
interaction at the exact moment both people are finally ready to play, to
settle something most players do not care about - with one of them watching the
other decide. So: flip it, say what it said, kick off. Derived from the match
seed, so it is deterministic and a replay lands the same way.

### Kits

Each side brings the kit already set on their device, so setup asks for
nothing extra. But two devices change the model in a way worth naming:
**the opponent's kit stops being derived and starts being received.**

`teamKits()` invents the opposition's colours today because there is nobody to
ask. With two devices there is, and the interesting problem is not what to do
about a clash - it is **how both devices agree on what was done.**

The failure mode is concrete. Both sides are in blue. Your device decides
*they* should move and draws them in orange; their device decides *you* should
move and draws you in orange. You are now looking at two different matches, and
on the halfway line, where twenty figures are split by team, it is not subtle.

**The rule:** both devices know the host's kit, the guest's kit, and which is
which. **The guest's is the one that moves.** Each device computes it
independently and arrives at the same answer, because `separate()` is
deterministic - a fixed list of hue rotations tried in order, and an ordered
fallback palette for the greys and whites with no hue to turn. No server
arbitration, and nothing to keep in step.

The trap is the near-miss version: *each device nudges its own kit if it
clashes*. Then both move, and you get the mirror problem instead.

**All four strips still have to be distinct**, not three. The resting keeper
beside the goal put both keepers on screen at once, and that constraint carries
straight over.

The device whose kit moved says so, very quietly, under the team name -
*"kit adjusted to avoid a clash"* - so nobody thinks their settings broke.

### Choosing a kit at all

Six colour pickers is a fine way to build a strip at leisure and a poor way to
do it on a phone while somebody waits for you to join. **A short list of named
strips** - red and white, blue and white, yellow and black, all green - picked
in one tap, with the custom pickers still there underneath for anyone who wants
them. That turns kit selection from a setup step into a non-step, which is what
it needs to be at the moment two people are trying to start a game.

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
leave the device they were typed on.** The form is marked `ph-no-capture` so
the site's analytics cannot see it, and the shot log deliberately records
`takerSide` rather than a name - with a test that fails if anybody adds one.

The dialog used to say so in as many words, in small print under the form. That
line has been removed: it was reassurance about something already true, sitting
in front of somebody trying to type a name. **This document is where it comes
back** - see [Say so, in the room](#what-this-costs-in-privacy) below - because
then it stops being reassurance and becomes a disclosure.

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

## Where the code lives

**Same repository, separate Worker.** Those are not in tension and the reasons
pull in opposite directions, so both are worth stating.

**Same repository, because `core/` has to be the same file.** The whole premise
is that the match reducer decides the rules on the server and on the client
without anybody writing them twice, and `core/portable.test.ts` already proves
it can: no import outside `core/` and `content/`, no browser or Node global, no
clock, and a whole shootout run start to finish on those imports alone. A second
repository would turn that guarantee into a publish step and a version number.

**A separate Worker, because this site currently has no server at all.**
`wrangler.jsonc` is `assets` and nothing else - no `main`, no bindings, no
migrations. Twenty-one years of writing is served as static files by a
configuration with no runtime in it, and that is a property worth keeping
rather than a detail.

Adding a Durable Object to that config means adding a script entry, a binding
and a `migrations` block to the thing that deploys the blog. Which buys:

| | |
| --- | --- |
| **Blast radius** | A bad multiplayer deploy should take down multiplayer. It should not be able to take down 186 posts. |
| **Cadence** | The game changed a dozen times today. The blog changes when there is something to say. They should not share a deploy. |
| **Shape** | One is static assets on a CDN. The other is stateful, per-room and hibernating. Same bill, different animals. |
| **Rollback** | Reverting the game should not revert the site, and the reverse. |

So: `workers/deadball/` in this repo, its own `wrangler.jsonc`, importing
`../../src/games/deadball/core/` directly. Routed on its own path, or its own
subdomain - the page fetches it, and the page is still a static file.

**What this costs:** a second deploy to think about, and the first thing in the
repository that can be *down* rather than merely wrong. That is the real change
to the architecture, and it is the reason this document exists separately from
the spec.

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
2. ~~**What is the id?** The match seed is elegant and makes the URL mean
   something.~~ **Answered, and the answer is no.** Two findings, either of
   which is enough on its own.

   **The seed decides the shot, not just the keeper.** `Game.ts` resolves every
   penalty through `createRng(shotSeed(match.seed, match.shotIndex))`, and that
   stream is where the taker's aim error comes from - the same seed, XORed,
   drives the keeper. `shotSeed` is a pure function of two numbers that would
   both be public. So a player who can read the seed off the URL can compute
   the error about to be applied to their own shot and aim to cancel it. That
   is not a theoretical edge; it is the one number in the game worth knowing.

   **And the seed is a masked clock**: `Date.now() & 0x7fffffff`. Against
   somebody who knows roughly when a room was made, that is not 31 bits of
   entropy, it is the number of milliseconds in the window they have to guess -
   a few million, which is enumerable in minutes. A guessed room id does not
   just leak a game; it lets a stranger take the seat the invited player was
   coming for, because the server binds a side to whoever arrives first.

   **So: the id is random and unrelated to the seed**, from
   `crypto.getRandomValues`, and the seed stays server-side until the match is
   over. Eight characters of base32 is forty bits and plenty, and separating
   the two means the id can be sized for guessing resistance and the seed for
   the simulation, which are different jobs.
3. **Does a shootout survive one player being on a train?** Turn-based helps,
   but the answer decides how hard reconnect has to work. It is less "does it
   survive" than "what does the waiting player see, and after how long" - an
   immediate *waiting for Rovers* is honest and twitchy on a flaky connection;
   a grace period hides the blips and makes a real disconnection feel like a
   hang.

4. **Do hosts win more?** Worth knowing, because it is the whole justification
   for flipping a coin rather than letting the host shoot first. **Not worth
   sending to analytics to find out**: the Durable Object already sees every
   match start and finish and can count it without anything leaving for a third
   party. The line to hold, if this ever does go further, is *outcomes, never
   names* - the naming form carries `ph-no-capture` for exactly that reason and
   the shot log records a side rather than a name with a test to keep it so.
4. ~~**Is the name a person or a team?**~~ **Largely answered, by something that
   already shipped.** There are three naming concepts in the game now, not one:
   `DuelNames` - two personal names, 12 characters, for a hotseat duel;
   `teamName` and `opponentTeam` - both `cleanTeam`, defaulting to "Your Team"
   and to the taker profile's own name, added for `versus`; and the squad's
   player names at 18 characters.

   `versus` already resolves it. `Game.ts` labels that match
   `[teamName, opponentTeam]`: **both sides are teams**, each named by the
   person at the keyboard and each falling back to a label rather than to a
   blank. Cross-device should follow `versus` rather than the hotseat duel,
   because the duel's personal names exist for the case where two people are
   looking at the same screen and nothing needs to cross a wire.

   That also settles the privacy question in [What this costs in
   privacy](#what-this-costs-in-privacy) without needing a new rule: **the team
   name is what is sent**, it already exists, it is already stored, and it is
   already the thing the game shows in the one mode with an opponent. A team
   name crossing a wire is a different proposition from a child's first name,
   and this way the safe option is also the default rather than an opt-in
   somebody has to find.

   Still open underneath it: whether a player may *also* send their squad
   player's name, which is invented rather than personal and therefore probably
   fine, and whether the two sides should see each other's kit colours.
