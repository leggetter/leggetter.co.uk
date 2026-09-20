# Working on the Dead Ball game

This is for anyone picking the game up for the first time. It covers how to run
it, how it is put together, and a list of jobs you can actually take.

You do not need to understand all of it. The game is arranged so that the
interesting jobs are in files that do not require you to know how the physics
works.

## Running it

From the top of the repo:

```sh
npm install     # once
npm run dev
```

It prints an address, usually `http://localhost:4321`. The game is at
**`/deadball/`** - so `http://localhost:4321/deadball/`.

Leave that running. When you save a file, the page reloads itself.

Two commands worth knowing:

```sh
npm run test:game    # runs the tests. Takes about a second.
npm run typecheck    # checks the types. Takes a few seconds.
```

Run both before you ask anyone to look at your change. If either one is unhappy
it will tell you which file and which line.

## How to play

Press on the ball and drag. Let go to shoot.

- **Where you drag** is where you are aiming.
- **How far you drag** is how hard you hit it. Further is harder *and* higher.
- **Hooking the drag sideways** on the way out bends the shot.
- **A bar sweeps left and right while you hold.** Let go while the marker is in
  the green and you strike it cleanly. Let go early and the shot pulls left;
  late and it pushes right.

- **The button in the bottom left** picks how you strike it: finesse bends it,
  driven keeps it low and hard, a knuckleball goes wherever it fancies.

Five kicks each, then a screen telling you how you did.

**Pressing any of the mode buttons asks what you want before it starts** -
penalties, free kicks, or both - and asks first if it is about to end a shootout you
are in the middle of. A free kick
is taken from the left, the middle or the right - it moves every time - with
two to four of the other lot standing in a wall ten yards away. The wall lines
up to block the near post, so you go over it, round it, or you pick the other
corner. Finesse is the one that goes over.

**Settings has a button that saves a file of every shot you have taken**, and
it tells you how many are in there before you press it.
The file goes to your downloads and nowhere else - nothing is sent anywhere. It
is genuinely useful: most of the tuning in this game came from reading those
files rather than from anybody's opinion.

## How the game is put together

Four groups of files, and one rule that holds the whole thing together.

| Folder | What is in it |
|---|---|
| `core/` | The rules and the physics. How the ball flies, what the keeper does, whether it was a goal. |
| `render/` | The drawing. Everything you see. |
| `input/` | Turning a mouse drag or a finger into a shot. |
| `content/` | **Data.** The players and the keepers. No code to speak of. |

**The rule: `core/` is not allowed to know that drawing exists.** It never
touches the screen, the mouse, or anything in a browser. That is what lets the
game be tested without opening a page, and what will let somebody swap the
whole look of it later without touching how it plays.

It also means you can change how the game *looks* without any risk of changing
how it *plays*, and the other way round. Which of those two you are doing is
usually the first thing to work out about a job.

## Start here

Five jobs that need no knowledge of anything above, in the order I would do
them. The first two are the easiest things in the project and both change
something you can see or hear immediately.

### 1. Write the advertising boards

**File:** `src/games/deadball/content/boards.js`

The hoardings behind the goal. A list of short strings with two colours each -
`panel` is the background, `ink` is the text.

Keep them short. A board is a wide, shallow rectangle seen from twenty metres
away: ten or twelve characters read, twenty do not.

**Done when:** you can see yours behind the goal. Use the **Angled, from above**
camera - the boards recede away from you there and it is the best look at them.

**Try this:** make one dark panel with dark ink and see how it disappears. That
is why every board in the list pairs a light ink with a dark panel or the other
way round.

### 2. Change how something sounds

**File:** `src/games/deadball/content/sounds.js`

Every sound in the game is made from numbers in this file - nothing is
recorded, so there is no audio to download or replace.

Start with `FRAME`, the sound of the ball hitting the post. `partials` are the
frequencies it rings at; make them lower and it sounds like a bigger, heavier
post. Then try `decay`, which is how long the ring lasts.

Then look at `CROWD.goal` and `CROWD.save`. A cheer and an "ooooh" are the same
machinery at different frequencies, which is how a mouth works too. `formants`
are the two or three resonances that make the vowel - move the first number up
and you get a brighter, more open sound.

**Done when:** you can hear the difference. Press the **&#9834;** button at the
top if you need to turn it off.

**Watch out:** a low, narrow sound comes out much quieter than a high, wide one
even at the same `gain`, so if something goes silent, try a bigger number before
assuming you broke it.

### 3. Change how a shot is struck

**File:** `src/games/deadball/content/shots.js`

Three ways to hit a dead ball - finesse, driven, knuckle - and the button in
the bottom left cycles them. Every number in this file is a **multiplier** on
what your drag already said, so `1` means "leave it alone" and you cannot break
anything by changing one.

| | what it does |
|---|---|
| `curve` | how much of your hook actually goes on the ball |
| `power` | how hard it leaves the boot |
| `loft` | how much of the player's `dip` is spent arcing it over a wall |
| `height` | scales where in the goal the aim lands, so a driven shot stays low however far up you drag |
| `wobble` | unpredictable spin. This is the knuckleball: nobody knows where it goes, including you |

**Done when:** you can feel the difference between two of them from the same
spot.

**Try this:** set `wobble` to 0 on the knuckleball and take five. It becomes an
ordinary shot, and you will see what that one number was doing.

### 4. Add a footballer

**File:** `src/games/deadball/content/players.js`

Copy one of the blocks and change it. Every skill runs from 0 to 100, and you
get **375 points to spread across the five of them** - not 500:

| Skill | What it does |
|---|---|
| `power` | How hard they hit it. 100 is a rocket, 20 is a pass. |
| `accuracy` | How close it goes to where you aimed. Below about 60 the ball starts wandering off on its own. |
| `curve` | How much bend they get when you hook the drag. |
| `composure` | Only matters on the last penalty, when it is all on them. Low composure players get worse when it counts. |
| `dip` | Free kicks only. How much they can loft it over a wall and still bring it down under the bar. Below about 40 a four-man wall cannot be cleared at all; above about 60 it can. |
| `foot` | `'left'` or `'right'`. Changes which way the ball naturally drifts. |
| `colors` | `kit` is the shirt, `trim` is the shorts and socks. Any web colour. |

Everybody on the list spends exactly 375, so a strength has to come out of
something else. `npm run test:game` will tell you if yours does not add up, and
by how much.

To play as them, open the game, press the shirt button, and pick them. No code
change - if the file is right, they are in the list.

**Done when:** you can see their kit colours on the pitch and the name in the
top-left corner.

**Try this:** make one with `accuracy: 100` and one with `accuracy: 30`, and
take five penalties with each. The difference is bigger than it sounds. Then
try spending all 300 on power and see how far that gets you.

### 5. Invent a keeper

**File:** `src/games/deadball/content/keepers.js`

Same idea, and this is the fastest way to change how hard the game is.

The three that decide most of it:

- `readAccuracy` (0 to 1) - how good their guess is. This is the main dial.
- `guessBias` and `anticipation` - how they decide. `guessBias` is how often
  they pick a side before you hit it and just go. `anticipation` is how often
  they go at the moment of contact, reading your run-up. Whatever is left over
  is how often they hang back and watch the ball, which looks patient and is
  usually too late.
- `diveSpeed` - how fast their hands travel. There is a note in the file about
  why this one is more dangerous than it looks.

**Done when:** you can make a keeper you can beat every time, and one you
cannot beat at all. Then find something in between.

**Worth knowing:** no keeper can see the curve. They read the line the ball is
travelling on, and the spin takes it somewhere else. That is why bending it
works, and it is not written down anywhere as a rule - it falls out of how the
keeper is built.

### 6. Break the physics, then put it back

**File:** `src/games/deadball/core/units.ts`

This one is for finding your way around. Everything the simulation is tuned to
lives in that one file, in real units - metres, seconds, kilograms - with a
comment on each saying what it is for.

Change `GRAVITY` from `9.81` to `2` and take a penalty. Then try
`MAGNUS_FACTOR` at ten times its value and hook the drag as hard as you can.

Then run `npm run test:game` and watch it fail. One of the tests exists purely
to notice that the physics moved. Put the numbers back and it passes again.

**Done when:** you have made the ball do something ridiculous and then undone
it. There is nothing to submit; the point is that you now know where the dials
are and that something is watching them.

## Bigger jobs

These are real features. Each one is self-contained - you should not need to
touch the physics for any of them.

### A record that follows the player

Picking a player is built - cog, **Your player**, and you can invent one there
too. What that left behind is a question nobody can answer yet: **is anyone
actually better with one than another?**

Every shot in the log already records `playerId`. Nothing reads it back. So the
job is to total those up per player and show it - scored out of taken, next to
their name in the picker, or on the full-time screen.

The interesting part is how little is enough. A ratio over four penalties is
noise, and showing it as though it meant something is worse than showing
nothing, so decide what you do until there is enough of it.

**Start at:** `telemetry/analyse.ts`, which already groups shots, and
`core/squad.ts` for what a player is.

### Celebrations

When you score, something should happen. A line of text, a noise, anything.

The interesting part of this job is deciding where it belongs. The words are
content, so they want to be a data file like the squad. The drawing of them is
`render/`. Nothing about it goes anywhere near `core/`, because scoring a goal
does not change the rules.

### A new camera angle

The game can be drawn from anywhere; there is just only one angle written so
far. A camera is a position, a direction, and a rule for turning a drag into a
shot. Look at `render/canvas2d/BehindTakerView.ts` - it is short, and most of it
is the drag.

Two that have been asked for: behind the goal looking back at the taker, and
side-on so you can see the ball bend.

**This is the job that proves the architecture works.** If you can add a camera
without editing anything in `core/`, the split was drawn in the right place. If
you cannot, that is worth saying out loud, because it means we got it wrong.

### Two players on two devices

Two people on one device is built - one shoots, the other saves, and you both
put your names in at the start. Press **2 players** at the top of the pitch.

What is left is doing that when you are not in the same room: one person opens a
link, sends it to the other, and they take turns. Hardest of these by a distance,
because it is the first thing in this game that needs a server.

The groundwork is done. The match is written as a list of things that happen
rather than as a running program, so it does not care whether the next message
came from the person next to you or from a machine somewhere else. Read
`core/match.ts` first, then the "Two devices, later" section of the spec, which
already lists the options and which one it leans towards.

### A keeper that spots what you keep doing

Everybody who has played this has ended up shooting at the same spot. The game
already notices - the screen at full time will tell you if you have gone the
same way too often - but the keeper does nothing about it.

Go the same way three times and it should start going with you.

**Do the telling before the punishing.** Being read by a keeper is satisfying;
being read by a keeper that never warned you is just the game cheating.

## Before you ask for your change to be looked at

```sh
npm run test:game
npm run typecheck
```

Both should be quiet. If a test fails, read the message - they are written to
say what went wrong rather than just that something did.

If you changed a number in `core/units.ts` and the tuning test fails, that is
expected. It exists so that changing the physics has to be deliberate. Update
the value it is checking against and say in your description that you retuned
something.

## Two rules about what goes in

**This repo is public.** Anything committed here is on the internet, for good.
So: no real names, no real ages, nothing about anybody's school or where they
live. Not in the code, not in a player's name, not in a celebration line, not in
a commit message. The squad is made-up people on purpose.

**No real footballers either.** No real names, no club badges, no photos. Not
worth the argument, and invented ones are more fun anyway.

**Nothing that needs crediting.** If you bring in a sound or an image from
somewhere, it has to be **CC0**, or under a licence that says in plain words
that attribution is not required. Not CC-BY, even though CC-BY is perfectly
fair and the job is small - once one file needs a credit, the game needs a
credits screen and everyone after you needs to remember why. One rule with no
exceptions is easier to keep than a small obligation nobody can see.

There is a record of where every sound came from in
`public/deadball/sounds/CREDITS.md`. Add to it if you add anything, even though
nothing in there legally has to be credited: it is what lets the next person
check without taking it on trust.

## Who owns this

The game is licensed BSD-3-Clause - see `src/games/deadball/LICENSE`. In plain
terms: anyone may use it or build on it, as long as they keep the copyright
notice with it, and they may not use our names to promote whatever they make
from it without asking.

The copyright line says **"and contributors"**. If you write part of this, that
is you. It says it that way rather than listing names because of the rule above.
