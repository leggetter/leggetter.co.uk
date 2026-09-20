# Dead Ball - plan and spec

_Status: Phases 0, 1 and 1.5 built and playable at `/deadball/`. Around 75 tests, a typecheck, and tuning measured rather than argued. The thing this project is for - other people contributing to it - has not started._

## Summary

| | |
| --- | --- |
| **Decision** | Build a drag-to-shoot penalty and free kick game on a hidden page at `/deadball/`, as a vanilla TypeScript engine with swappable view renderers, sized so that a second and third contributor can add features without touching the physics. |
| **Next steps** | - Phase 4.5: teams, and a cup run against progressively better ones<br>- Phase 7: a second presentation package, which is the only thing that proves the boundary between `core/` and how it looks<br>- Then a keeper that reads your pattern, because every tester so far has found the one shot that always works |
| **Risk** | The repo is public. See [What not to commit](#what-not-to-commit).<br>The repo's Creative Commons license is wrong for code. See [Licensing](#licensing). |

## Purpose

A game to build with the kids. The first version gets built solo so there is something real to play and react to, then the work opens up. Two-player is wanted but comes later, so the architecture has to allow for it from the start rather than be retrofitted.

## Goals

- Playable single-player penalties on day one of Phase 1, before any of the nice-to-haves.
- Aiming that rewards skill: drag for direction and power, curve the ball around a wall.
- Two or more camera views that can be swapped at runtime, so the right one gets chosen by playing rather than by arguing.
- A rendering boundary clean enough that a pixel art renderer can be dropped in later without touching the simulation.
- Persistence and two-player wired as interfaces from the start, even where the first implementation is trivial.
- Contribution surfaces at two difficulty tiers, so a first contribution can be a JSON edit and a later one can be a feature.

## Non-goals for v1

- Real footballer names, photos, or club badges.
- A global leaderboard or any server-side state.
- ~~Sound, beyond a hook where it will eventually go.~~ **Overtaken in Phase
  3.5**, and not by drift: it was asked for directly, with a list of eight
  specific sounds attached.
- Mobile-*first* polish. It is designed against a laptop. It does have to work
  on a phone, which as of Phase 1.75 it does - see [Any shape of
  screen](#any-shape-of-screen). Still not designed phone-first, and the
  control bar is where that keeps showing: see [The bar, for the third
  time](#the-bar-for-the-third-time).

## Measures of success

- ~~Phase 1 is playable by a person who was not told how it works.~~ Done, and
  two people have put 200 shots through it.
- Both views get played back to back and one of them wins on feel, not on
  argument. **The three exist; which one wins is still open**, and is now a
  question of playing rather than of building.
- **Everybody it is being built with lands a merged change.** Still the real
  measure, and still unmet: every commit so far is one person and an assistant.
  The surfaces exist and work, which was the hard part; nobody has been handed
  them, which is not. Three people now rather than two, and the most recent two
  phases were both chosen off that - Phase 3.75 because it was asked for, and
  Phase 4 because [deadball-jobs.md](deadball-jobs.md) was telling a first
  contributor to make a code change in the one job written to need none.
- A third renderer can be added later without editing anything under `core/`.
  **Met.** Two more cameras landed without a line changing under `core/`. Each
  is about sixty lines and most of that is the camera's own geometry.
- Tuning comes from measurement rather than opinion. Met: goal rates, timing
  gradients and rebound frequencies are all measured over hundreds of simulated
  shots, and two real sessions have been analysed against them.

## Decisions already made

| Decision | Choice | Why |
| --- | --- | --- |
| Shot mechanic | Drag from the ball: direction, power, and curve in one gesture | Highest skill ceiling of the options considered, and the only one that makes a free kick around a wall interesting |
| Shot types | Penalties first, free kicks second. **Both built.** | Free kicks add a wall, variable distance, and variable angle. Penalties are the same game with all three fixed, so they are strictly a subset - which is what made Phase 8 an afternoon of geometry rather than a second game |
| Views in v1 | `behind-taker` and `angled-behind`, swappable at runtime. `keeper-cam` joined them in Phase 2 | Undecided which feels better, and the swap costs little once the projection boundary exists |
| Art | 2D canvas primitives now, a second package later - see [What else a package could be](#what-else-a-package-could-be) | Pixel art needs assets, which is the slow part. The renderer interface is what makes it a later decision instead of a rewrite |
| Squad | Invented players shipped as data, plus a custom player editor. Everybody spends the same 375 points - see [Everybody gets 375 points](#everybody-gets-375-points) | No likeness or trademark exposure on a public site, and inventing players is a good first contribution. The budget is what stops the editor making the squad pointless |
| Language | TypeScript for the engine, JS or JSON for content | Types document the renderer and storage interfaces. The content files stay approachable |
| Persistence | Interface from day one, `localStorage` implementation | Two-player later needs a remote store. An async interface now avoids a rewrite then |
| Page | Hidden: `noindex`, out of the sitemap, no nav link | Matches how `draft: true` posts already work in this repo |

Alternative not picked on the mechanic: timing bars (stop a moving meter for direction, then height, then power). Cheaper to build, fairer on mobile, and it would have made the keeper duel purely reflex. Rejected because the curve is the interesting part and a timing bar cannot express it.

## Architecture

One idea carries most of the design: **the simulation runs in 3D world space in real-world units, and the renderer owns the projection to 2D.**

Everything else falls out of that. A camera view is a projection function. `behind-taker` and `angled-behind` differ only in where the camera sits, so they are two implementations of one interface over identical state. Side-on and keeper-cam later are the same. Pixel art is a different draw layer over the same projection. None of them can change the outcome of a shot, because none of them can reach the simulation.

```
   input (pointer)                                     storage
        |                                                  ^
        v                                                  |
  DragGesture  --[ view.aimFromDrag ]-->  ShotInput  --> Match
                                              |            |
                                              v            |
                        player attributes + seeded RNG      |
                                              |            |
                                              v            |
                                            Shot            |
                                              |            |
                                              v            |
                            core/physics (fixed timestep)   |
                                              |            |
                                              v            |
                                        FrameState ---------+
                                              |
                                              v
                                    view.render(frame)
```

`ShotInput` is what the human did. `Shot` is what the simulation runs. Player attributes and nerves sit in between. That gap is what makes attributes meaningful and what makes the two-player payload small: `ShotInput` plus a seed is enough to reproduce a shot exactly.

### The words each layer uses

`core/` uses football words, because it models football: squad, taker, keeper,
kick, shootout, wall, dip. When a name drifts off that, it gets corrected -
`roster` became `squad` across 160 references for exactly this reason, and the
dialog had been saying "Squad" for a phase while the code said something else.

`net/` uses networking words, because it models a connection. A **room** is the
thing two people join in order to play each other: two seats, two tokens, when
each was last heard from, what the coin said, and which messages have already
been honoured. Exactly one of the eight fields on it is football.

**That is not a lapse, it is the boundary.** Football has no concept for "the
thing two people join in order to play each other" - that only exists because
there is a wire - so reaching for a football word there would mean inventing
one. A room holds a match; it is not a match. The seats already outlive the
match (leaving keeps a seat, so reopening the link gets it back) and will
outlive several of them once a rematch can be played down the same link.

The rule, for the next one of these: **name a thing in the vocabulary of what
it models, and let the vocabulary change at the layer boundary.** `Game.ts` is
the client, `room.ts` is the connection, `match.ts` is the football.

### Module layout

```
src/games/deadball/
  LICENSE                     # BSD-3-Clause. The rest of the repo is CC-BY-3.0.
  core/                       # TypeScript. No DOM, no canvas, no browser APIs.
    units.ts                  # every tuned constant, in meters and kg
    vec3.ts                   # minimal vector math
    rng.ts                    # seeded PRNG (mulberry32), explicit state
    types.ts                  # ShotInput, Shot, FrameState, Outcome, ...
    physics.ts                # one step: gravity, drag, Magnus, ground
    predict.ts                # where a SPIN-FREE ball lands. See below.
    shot.ts                   # ShotInput + Player + RNG -> Shot, and the sweep
    keeper.ts                 # commitment, dive, idle drift, body, landing
    flight.ts                 # one shot start to finish, woodwork, net, parry
    rules.ts                  # outcome at the line, and frame contact
    match.ts                  # pure reducer: (state, MatchMessage) -> state
    tuning.ts                 # fingerprint of the constants, for replay
    names.ts                  # what a side is called: two people, or two teams
    events.ts                 # discrete things worth hearing (Phase 3.5)
    taker.ts                  # the computer deciding a penalty (Phase 3.75)
    styles.ts                 # finesse, driven, knuckle: which ball you hit
    squad.ts                 # who takes it, and inventing somebody (Phase 4)
    setpiece.ts               # where the ball is: three spots and a wall
    wall.ts                   # the wall, and whether the ball got past it
  presentation/               # how it looks AND how it sounds
    Presentation.ts           # what a presentation package implements
    cameras.ts                # where you may stand. Data, shared by all of them
    registry.ts               # id -> package
    sounds/                   # the default set. Any package may override it.
      Sounds.ts               # an event in, a noise out
      synth.ts                # generated sound. Knows AudioContext.
      silent.ts               # no-op, for tests and for the mute toggle
    classic/                  # today's look. The only place a ctx exists.
      ClassicPresentation.ts  # one implementation, told which camera it is on
      draw.ts                 # pitch, goal, net, figures, ball, HUD, full time
      scene.ts                # draw order, which is depth
      project.ts              # this package's camera maths
      aim.ts                  # drag -> ShotInput, under this projection
      stand.ts                # terracing, hoardings, crowd (Phase 3.5)
      lineup.ts               # the other twenty, on the halfway line
      sounds.ts               # this package's overrides and its samples
    pixel/                    # later
  input/
    drag.ts                   # Pointer Events -> DragGesture
    keyboard.ts               # accessible fallback aim mode (not built)
  storage/
    Storage.ts                # the interface
    memory.ts                 # in-memory, used by tests
    local.ts                  # localStorage
    schema.ts                 # versioned shapes + migrations (Phase 4, not built)
  telemetry/
    log.ts                    # one record per shot, on this device only
    analyse.ts                # what the log says, for full time and offline
  net/
    Transport.ts              # two devices: the interface and the messages
    local.ts                  # over BroadcastChannel, two tabs (not built)
  content/                    # plain JS and JSON. The low-barrier zone.
    players.js
    keepers.js
    sounds.js                 # frequencies and decay times (Phase 3.5)
    boards.js                 # what the hoardings say. No real people's names
    takers.js                 # the computers you have to save from
    shots.js                  # finesse, driven, knuckle, as multipliers
    teams.js                  # squads and kits, by rating (Phase 4.5)
  Game.ts                     # wiring: input -> match -> view, the frame loop
  main.ts                     # browser entry, imported by the Astro page
```

`core/` importing anything from `presentation/`, `input/`, or the DOM is the one rule that keeps all of this true. Worth a lint rule or, failing that, a note at the top of each `core/` file.

## Core concepts

### World and units

Real dimensions, in meters, seconds, kilograms. It costs nothing, it makes every constant checkable against reality, and it turns the physics into something the kids can look up rather than something tuned by feel.

| Thing | Value |
| --- | --- |
| Goal | 7.32 m wide, 2.44 m high |
| Goal frame | 0.12 m diameter posts and bar |
| Ball | 0.11 m radius, 0.43 kg |
| Penalty spot | 11 m from the goal line, centered |
| Free kick wall | 9.15 m from the ball |
| Free kick range | 16 m to 30 m from goal, offset up to 20 m either side |
| Penalty strike speed | 20 to 32 m/s |
| Spin, hard curl | up to about 60 rad/s |

Axes: `x` lateral (positive right of the taker), `y` vertical (positive up, ground at 0), `z` depth (positive toward the goal). Origin on the goal line at the center of the goal mouth, so goal detection is a plane test at `z = 0`.

### The shot

```ts
/** What the player did. This is the two-player network payload. */
interface ShotInput {
  aim: { x: number; y: number };  // -1..1 lateral, 0..1 height, on the goal plane
  power: number;                  // 0..1
  curve: number;                  // -1..1, negative bends left
  lift: number;                   // 0..1, backspin to topspin
}

/** What the simulation runs, after attributes and nerves are applied. */
interface Shot {
  origin: Vec3;
  velocity: Vec3;   // m/s
  spin: Vec3;       // rad/s, axis * magnitude
}
```

`resolveShot(input, player, rng)` is the only place error is introduced. It reads the player's `accuracy` and `composure`, samples the seeded RNG, and perturbs the aim. Same input, same player, same seed, same shot, every time.

### The release sweep

Not in the first draft of this document. It was asked for rather than designed
here, and it is the second skill axis: the drag says what you intend, the
release says whether you managed it.

A marker runs corner to corner while the drag is held. Where it sits at the
moment of release becomes `ShotInput.timing`, and the penalty is **signed**
rather than a quality score: release early and the shot pulls left every time,
late and it pushes right. That is the difference between a mistake a player can
correct and a game that occasionally robs them.

A bad contact also drags the ball back toward the middle of the goal and takes
pace off it. That, rather than the scatter, is what actually punishes a scuff:
it stops finding the corners, where the goals are.

Timing ignores the footballer's attributes entirely. It is the person holding
the mouse, not the player on the pitch, so an accuracy-100 striker still gets
punished for shinning it, and there is a test saying so.

### The spin-free predictor

Added during Phase 1, and it turned out to be the load-bearing idea in `core/`. `predict.ts` answers one question: where does a ball with **no spin on it** cross the goal line? Both sides of the contest use it, for opposite reasons.

The striker uses it to solve elevation. The closed-form ballistic launch assumes the ball keeps its speed, and drag means it does not: aimed at 1.15 m from 25 m out, the first implementation arrived at **0.11 m**. That is not a skill gap for a player to learn, it is the model being wrong. So `shot.ts` iterates the real integrator until the trial trajectory arrives at the aim height.

The keeper uses it to read a shot already in the air, for the same reason: a keeper can see how fast a ball is travelling, and a ballistic guess sent its hands a meter too high at range.

Both run with spin zeroed, and that is the whole design:

- **Accounting for drag is not cheating.** A taker knows in their legs how hard to hit a long free kick.
- **Not accounting for Magnus is the mechanic.** A curled shot finishes somewhere other than where it was pointed, which is what beats a keeper who committed to the line it was on. Nothing special-cases curve. It falls out of this one function being blind to spin, and the test suite asserts it.

One wrinkle worth keeping: the solver flies its trial trajectories with ground contact **off**. With the bounce in, every under-hit trial reports back at ground level, so the solver sees a smaller error than it has and creeps instead of converging. Low shots from range landed a third of a meter under the aim until that was separated.

### Physics

Three forces, semi-implicit Euler, fixed timestep of 1/120 s. A penalty is airborne for roughly 0.4 s, so about 50 steps. The cost is irrelevant and the stability is worth having.

- **Gravity**: `-9.81 m/s²` on `y`.
- **Drag**: `F = -0.5 * rho * Cd * A * |v| * v`, with `rho = 1.225`, `A = pi * r^2`, `Cd` around 0.25. Constant `Cd` is a simplification. The real thing has a drag crisis around 12 m/s that produces the knuckleball effect. Worth a comment in the code and a possible later feature, not a Phase 1 problem.
- **Magnus**: `F = km * (omega x v)`. `km` gets tuned by eye until a hard curl bends about 1.5 m over 25 m, which is roughly what a real one does.

Termination: crosses the goal plane, hits the frame, hits the wall, hits the ground behind the line, or a 4 second timeout.

### Determinism

Fixed timestep, seeded RNG, no wall-clock reads inside `core/`. This buys three things that are each individually worth it:

1. Unit tests that assert an exact outcome from an exact input.
2. Free replays: store `ShotInput` plus seed, get the trajectory back.
3. Two-player over the wire with a payload of a few dozen bytes.

The constraint it imposes: avoid `Math.sin`, `Math.cos`, and `Math.exp` in the simulation hot path. IEEE-754 guarantees correctly rounded results for `+`, `-`, `*`, `/`, and `Math.sqrt`, but transcendental functions are implementation-defined and may differ between engines. Vector math and the force model above need none of them.

That said, cross-client determinism is a bet, not a proven property, and it will not be proven until two browsers are actually compared. The hedge for two-player: send the resolved `Outcome` alongside the `ShotInput`, and if the receiving client's simulation disagrees, trust the sender and log the divergence. Cheap insurance, and the log is the evidence.

### The keeper

```ts
interface KeeperProfile {
  id: string;
  name: string;
  reactionMs: number;    // 180 (hard) .. 420 (easy)
  diveSpeed: number;     // m/s lateral
  reach: number;         // m, arm span contribution
  guessBias: number;     // 0..1, how often it commits before reading the shot
  readAccuracy: number;  // 0..1, quality of the read once committed
}
```

The keeper does not see `ShotInput`. It observes the ball's position and velocity after `reactionMs` of flight, adds error scaled by `readAccuracy`, and commits to a dive. A high `guessBias` keeper commits earlier, which makes it beatable by a slow, placed shot and lethal against a predictable one.

Difficulty is this struct, not a multiplier bolted on elsewhere. That makes keeper personalities a content-file job rather than an engine job, which is the point.

### Outcomes and format

```ts
type Outcome =
  | 'goal' | 'saved' | 'post' | 'bar'
  | 'wide' | 'over'
  | 'short'                        // never reached the line
  | 'blocked';                     // free kick wall, Phase 3
```

`post` and `bar` mean the frame kept it out. Since the woodwork rebounds, a
shot can come off it and still go in, and that is a `goal`.

Single player v1 has two modes:

- **Shootout**: 5 penalties, score out of 5, then sudden death against the clock or a best-score chase.
- **Free kicks**: a sequence of positions at increasing distance and angle. Three lives.

Two-player later adds alternating turns, which the match reducer already models.

### Match state

A pure reducer, `(state, MatchMessage) => state`. Messages are `START`, `TAKE_SHOT`, `RESOLVE`, `ADVANCE`. Phases are `setup -> aiming -> flight -> resolving -> setup`, with `complete` as the terminal state.

Making this a reducer rather than a class with methods is what makes hotseat, AI opponent, and remote opponent the same code. The only difference between them is where the `TAKE_SHOT` message comes from.

## The view interface

```ts
interface View {
  readonly id: string;
  readonly label: string;

  mount(host: HTMLElement): void;
  resize(width: number, height: number, dpr: number): void;

  /** Draw one frame. Must not mutate anything it is handed. */
  render(frame: FrameState): void;

  /** Turn a drag into player intent. Lives here because a drag means
   *  different things under different projections. */
  aimFromDrag(drag: DragGesture): ShotInput;

  /** Optional aiming aid drawn during the drag. */
  previewPath?(input: ShotInput, frame: FrameState): void;

  destroy(): void;
}
```

`aimFromDrag` belonging to the view is the non-obvious part and the part most likely to get moved to the wrong place later. Under `behind-taker`, dragging 100 px right means something different than it does under `angled-behind`, where the goal is at an angle. Putting the mapping anywhere else forces the input layer to know about projections.

`FrameState` is a read-only snapshot: ball, keeper, wall, goal, phase, score, shot index, elapsed time, last outcome, current player. The view gets no reference to the match or the simulation.

### What the second and third cameras cost

The claim was that a camera angle is a projection function rather than a
rewrite. Holding it to that: `AngledBehindView` and `KeeperCamView` are about
sixty lines each, nothing under `core/` changed, and two things had to be
extracted first because they were sitting inside the reference view:

- **`render/aim.ts`** - the drag gesture, shared. Three copies would have
  drifted into three slightly different control schemes, and then playing them
  back to back would say which one you had got used to rather than which one is
  better to look at.
- **`render/canvas2d/scene.ts`** - the pitch, drawn once. A view is now a
  camera, a mapping and a call to this.

Both paths are as they were at the time. Phase 3.5 moves them into the `classic`
package - see [Presentation packages](#presentation-packages) - where "shared by every view"
becomes "shared by every camera this package draws", which is what it always
meant.

A camera changes exactly two things beyond its own position, and both are what
the `View` interface exists for. Going round behind the goal **mirrors the
drag**, because the taker's right is now on your left. And it **reverses the
draw order**, because order is depth: the netting and the frame are the nearest
things in shot rather than the furthest.

One bug worth recording, because it will recur every time a camera is aimed at
something. The yaw is `atan2(dx, dz)` to match the rotation in `project.ts`, and
negating the x swings the camera the wrong way by *twice* the angle. The first
angled camera was looking at an empty stretch of grass with the goal off the
left-hand edge. Worked out and checked against the projector's own arithmetic
rather than nudged until it looked right.

The angled camera also aims between the goal and the ball rather than at the
goal. Pointed straight at the goal the composition is correct and the shot is
not: the ball and the taker are far nearer the camera, so centring the goal
pushes them off the bottom corner.

### Presentation packages

The model holds game state and emits events. **Everything else is one render
package's business** - how the pitch is drawn, how many people are in the stand,
where they sit, when each one stands up, and what a post sounds like. None of
that is game data, none of it can change an outcome, and all of it is a matter
of taste that a different package is entitled to answer differently.

So a package is **a whole look, sound included**, not a drawing backend. It is
named for what it is rather than for how it is implemented: `classic` for what
exists today, `pixel` later, `broadcast` later still. WebGL is not a look, it is
a technique, and a package that wants it uses it without that showing up in its
name or its interface.

```
presentation/
  Presentation.ts   # what a package implements
  cameras.ts        # where you are allowed to stand. Data.
  registry.ts       # id -> package
  sounds/           # the default set. Any package may override any of it.
  classic/          # today's look: canvas2d, drawn figures, sampled crowd
  pixel/            # later
```

#### Cameras are data, so the axes do not multiply

A camera is *where you stand*; a package is *how it looks*. Those are
independent, and somebody is going to want pixel art from behind the goal.

So a camera stays a position, a target and a framing rule - shared data - and
each package projects it however suits the way it draws. A matrix and a
hand-rolled `project()` are both correct answers to the same camera.

This is the fix for a cost recorded in an earlier draft: `View` bundled where the
camera sits with how the drawing happens, which made three cameras and two ways
of drawing into six files. With cameras as data it is one implementation per
package regardless of how many cameras exist, and adding a fourth camera costs
every package nothing.

#### A shared sound set, and the right to override it

There is a default set of sounds, and packages inherit it. A package may
override any subset: `pixel` can replace the crowd with something chiptune and
keep the woodwork.

This is what answers an objection an earlier draft raised against sound living
inside a renderer - that swapping the look would silence the game, and each
implementation would carry its own copy of what a post sounds like. The shared
default set is the answer to that, rather than keeping audio out of the packages
entirely. Inheritance gets the protection; ownership gets the freedom.

It also settles a tension in [Synthesised by default, sampled where it
showed](#synthesised-by-default-sampled-where-it-showed)
rather than reopening it. The default set is synthesised, for the reasons given
there. A package that wants to ship sample files is free to, and inherits the
consequences along with the sounds: the weight lands in that package, and so
does the licensing question. Neither is the default's problem any more. That is
no longer hypothetical - `classic` took the offer, and the seam held: the
default set did not change shape to accommodate it, and a package that says
nothing about sound still gets the synthesised one for free.

#### Where the boundary actually is

`core/` has no DOM, no canvas and no `AudioContext`, and emits an event stream
that `Game.ts` hands to the active package. That has been the boundary since
Phase 1; packages give it a name and a plural.

The one thing worth stating because it is tempting to get wrong: **packages do
not share presentation code with each other.** No common `crowd.ts` telling both
of them where person 412 is and how high, because that call - once per person
per frame - is exactly the shape a WebGL crowd exists to avoid, and it would
force the two packages to agree about the one decision they most need to make
differently. Canvas2d wants a few hundred people it can blit; WebGL wants twenty
thousand it never touches individually.

Duplication is the right answer here and the asymmetry is the reason: two
packages drawing crowds differently is two crowds, while two packages computing
an outcome differently is a bug. Only one of those is worth an abstraction.

### What else a package could be

The boundary above is a considered guess until a second package exists. That is
stated where the packages are described and it is still true, so this is the
list of things that would prove it, and what each one would actually test.

**Pixel art.** The one this document has named since Phase 0. A low-resolution
buffer scaled up with smoothing off, chunky sprites, a chiptune crowd. The
honest caveat: it is the *weakest* test of the seam, because it still draws
with a `ctx` - it proves the interface carries two looks, not two
technologies. It is also the most fun to build and the most visible, and sprite
sheets and palettes are content-file work, which makes it the only one on this
list a new contributor could meaningfully own.

**Blueprint.** The physics made visible: trajectory arcs, the keeper's reach as
a circle, the spin-blind predictor's straight line drawn against the ball's
actual curved path, the aim cone widening with distance. It shares no drawing
code at all with `classic`, which makes it a far stronger test of the boundary
than pixel art, and it is small. It also pays for itself twice: **it is a
debugging view.** The invisible-curve bug - physically correct, 20 cm over a
penalty, absent from the game - would have been obvious in one glance instead
of costing a session.

**Broadcast.** A television feed: a score bug in the corner, lower-thirds
naming the taker, letterboxing, a replay wipe. Interesting because it is almost
entirely HUD and framing rather than world drawing, so it exercises a different
part of the interface from the other two, and it pairs naturally with
[Watch that again](#watch-that-again).

**High contrast.** Large shapes, heavy outlines, no crowd, the outcome stated
in type big enough to read across a room. This one reframes a package as an
**accessibility surface** rather than a style, which is a more useful thing for
this architecture to turn out to be good at than any amount of pixel art.

#### Something more realistic

Worth taking seriously, and the reason is a piece of luck: **the simulation has
always run in 3D world space in real meters.** It was never a 2D game with
depth faked on top. three.js works in meters by convention, so ball position,
keeper hands, the goal frame and the camera specs in `cameras.ts` - a position,
a target and a framing rule - map across with no translation layer at all. Most
2D games would have to be rewritten to do this. This one would not.

**What is actually hard is not the rendering, it is the animation.** A run-up,
a strike, a dive and a landing are skinned character animation, and that is a
different discipline from everything in this repo so far. The current figures
are drawn from a handful of positions the simulation already computes.

Libraries, if it happens:

- **three.js** is the obvious choice and the one to use. Large but not absurd,
  and its glTF loader, shadow maps and orbit/perspective cameras are the three
  things this would need.
- **Babylon.js** is bigger and more batteries-included; no reason to prefer it
  here.
- **regl**, **twgl** or raw WebGL are thin enough to keep the weight down and
  mean writing shadow mapping and a glTF loader by hand. Not a trade worth
  making for one package.

Models must be **CC0**, for exactly the reason the audio had to be:
[what not to commit](#what-not-to-commit) applies to a mesh as much as to an
mp3. Kenney and Quaternius both publish CC0 low-poly character packs with
animations. **Mixamo is a trap** - free to *use*, but its terms do not cleanly
permit redistributing the asset files, and committing them to a public repo is
redistribution. Same shape as the sample licensing question, and it should be
answered before a file is downloaded rather than after.

What it costs, stated plainly because these are the reasons it is not the next
phase:

- **Weight.** The whole site is text, and 246 KB of audio was agonised over. A
  rigged character with animations is measured in megabytes. This is an order
  of magnitude, not a percentage.
- **The first runtime dependency.** The game currently has none - every entry
  in `package.json` is Astro or tooling. That is a property worth naming before
  it is spent.
- **It stops being a contribution surface.** Pixel art has sprite sheets a
  beginner can edit. A three.js package has none of that, and would be a job
  for whoever is most comfortable with 3D rather than a good first change.
- **The uncanny valley is real and this game is on the right side of it.** The
  figures work *because* they are abstract; nobody expects a stick figure to
  move convincingly. A realistic keeper that animates badly looks worse than
  the thing it replaced, and animation is the expensive part.

**What not to bring in, under any circumstances: a physics engine.** Rapier and
cannon-es are excellent and would be exactly backwards here. The physics *is*
the game - it is deterministic, tested against exact outcomes, and fingerprinted
so a replay can prove it has not drifted. Handing that to a library would trade
all of it for realism nobody asked for, in the one place this design does not
compromise. A renderer may be swapped; `core/` may not.

**The cheap eighty percent, worth doing regardless: shadows.** A ball's shadow
on the grass tells you how high it is, which is *functional* rather than
decorative - it is the missing depth cue in every 2D penalty game. It is
achievable in `classic` today, in canvas2d, with an ellipse and the ball's y.
If realism is the goal, that is the first thing to try and the cheapest test of
whether realism is even what makes this better.

### Switching views

- `?view=angled-behind` in the URL wins, for sharing a specific one.
- Otherwise, the stored setting.
- Otherwise, the default.

An always-visible switcher in v1, since comparing the two is the entire reason both exist. It can move behind `?dev=1` once one of them wins.

Registered as `id -> factory` in `presentation/registry.ts`. Adding a view is one file plus one registry line, and that is the test of whether the boundary held.

## Input

Pointer Events throughout, so mouse, touch, and pen are one code path. `touch-action: none` on the canvas, or a drag will scroll the page on a phone.

The gesture: press near the ball, drag, release. Drag vector gives direction and, by length, power. Curve comes from the lateral offset of the release point from a straight line between press and release, so a straight drag is a straight shot and a hooked drag curls. A second axis is needed for lift, most likely drag direction below or above the ball's center at press time.

Whether that reads as natural is unknown until it is in hands. It is the single most likely thing in this document to need redesign after Phase 1, and it should be tuned by playing rather than by reasoning.

**Keyboard fallback**: arrow keys to move an aim reticle, hold space to charge power, comma and period to set curve, release to shoot. A canvas game is inherently visual and this does not fix that, but it does mean the game is playable without a pointing device.

## Persistence

```ts
interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}
```

Async even though `localStorage` is synchronous. The trade-off: slightly more awkward code now, in exchange for a remote implementation later being a drop-in rather than a refactor of every call site. Given two-player is a stated goal, that is worth paying.

Three implementations, in order: `memory` (tests), `local` (`localStorage`), and later `remote` (a Cloudflare Worker route backed by KV or D1, which this site already deploys onto).

Keys namespaced `deadball:v1:*`. A `deadball:v1:schema` record holds the version, and `schema.ts` owns the migration functions. The migration path exists from the first release, because the first schema change happens the first time someone adds a field to a player.

Stored: settings (view id, difficulty, sound, time of day, chosen player), profile (display name), custom squad, stats (best scores, longest streak, per-keeper record), and a capped match history.

## Two players

### One device: one shoots, one saves

Phase 3, and a different game from the one this document described for most of
its life.

The old plan was "take five each, alternating" against the computer keeper. The
logs killed it: both testers converged on the same shot and nothing punishes it,
so two people taking turns at a solved penalty is two people playing the same
solved penalty. **One shoots and the other saves** is a contest, needs no AI
keeper at all, and the view it wants is the one Phase 2 shipped.

Rounds alternate as a real shootout does. A takes, B keeps. Then B takes, A
keeps. Five each, ten shots - **and then sudden death if nobody has won**,
which is how a shootout actually ends and is what stops the format producing
the one result nobody wants.

The rule is one line and the pair is the unit, not the shot: it is over when
both have had the same number of attempts *and* one of them is ahead. Ending
the moment somebody goes in front would end it while the other player still had
theirs to take, which is not a shootout, it is a race. Nothing caps how long it
runs, and nothing should.

**And during the regulation five, it stops the moment one side cannot be
caught.** Found by playing, and missing until then: a shootout was won 5-3 and
the losing side was still sent up to take a tenth penalty that could not change
anything. If somebody's score is higher than the other's *plus every penalty
they have left*, the rest are dead rubbers and nobody takes them - which is why
most real shootouts do not reach ten.

Checked after every penalty rather than at the end of a round, because it falls
either way round: scoring your fifth to go 5-3 up with one of theirs left ends
it before they walk up, and a shootout can therefore finish on an odd number of
kicks. There is an exhaustive test over all 1,024 ways ten penalties can go,
asserting two properties - a completed match is never level, and no penalty is
ever taken after the result was already settled.

Nothing in the rules branches on being in sudden death - it is the same
shootout continuing, which is exactly what sudden death *is* - so the flag the
screens read is derived from the score rather than stored, and cannot fall out
of step with it.

**A row of footballs each.** A duel alternates, so a single row of markers
interleaves the two players and reading your own record off it means counting
every other position. Two rows, one per player, each football saying scored,
missed or not yet taken by its fill. They grow a round at a time in sudden
death, and a round in progress shows the answer still to come - which is the
state the whole format turns on.

**Both people are named before the first shot.** Starting a duel opens a form
asking who is playing, and the two names then replace "Player 1" and "Player 2"
on every screen: the score, the handover, the keeper's turn, the caption over a
shot being lined up, and the winner at full time. Each side also owns a colour,
green for whoever shoots first and blue for the other, used consistently enough
that the full-time key can name them.

Three things follow from names being typed rather than fixed:

- **They are capped at twelve characters and cleaned.** Blank falls back to the
  old label, and control characters and bidirectional overrides are stripped,
  because a name is drawn onto a canvas with `fillText` and a stray
  right-to-left override moves text that is not its own.
- **Every line that holds one shrinks to fit.** Sizes that were fixed while the
  labels were written by this codebase are now measured, because twelve
  characters of anybody's name is wider than `PLAYER 2` and ran off the side of
  a phone.
- **Full time compares the two, rather than averaging them.** `summarise`
  answers "how do you play", which is the right question for one person and the
  wrong one for two: every rate in it describes a player who was not there, and
  its notes address that player as "you". A duel gets its own panel - scored and
  struck-clean per side, then saved and how far each keeper's pick was from
  where the ball actually went. That last figure is the half of a duel the
  scoreline never shows, because keeping well looks exactly like the other
  person shooting badly.
- **No name goes in the shot log.** The log is saved from the settings dialog
  and handed to someone else to read, which makes it the one file in the game
  that leaves the device a name was typed on. `takerSide` already records who did what, and
  a side means nothing without the export in front of you. There is a test that
  fails if a field carrying a name is ever added to `ShotRecord`. The form is
  also marked `ph-no-capture`, because this site loads PostHog on every page and
  "almost certainly, depending on a setting in a dashboard" is not a good enough
  answer for a box a child types their name into.

  **The small print under the form has gone**, and the class has not. A line
  saying names never leave the device was reassurance about something that was
  already true, printed where somebody was trying to type a name - and
  reassurance is not what was keeping the promise. The code was. What the line
  will be needed for is [Phase 6](#two-devices-later), where names *do* leave
  the device and there is something to disclose rather than something to
  reassure about.

**The whole problem is that they share a screen.** Whoever goes second can see
what the first one did, and a keeper who has watched the aim being set is not
guessing. So the order is fixed and enforced by the reducer rather than by
politeness:

1. **The keeper commits first, and blind.** They pick a spot in the goal before
   the taker has touched anything.
2. **The device changes hands**, behind a screen showing neither choice.
3. **The taker shoots**, with the keeper's pick invisible.

The reducer refuses every message that would break that: the taker cannot act
while the phase is `keeping`, and a second `SET_DIVE` after the handover is
ignored so the keeper cannot revise once they have seen anything. Both have
tests, because "we agreed not to peek" is not a rule, it is a hope.

Committing before the ball is struck is not a handicap invented for the format.
It is what the computer keeper already does on most shots, and what a real one
does, because a penalty is airborne for less time than a dive takes.

**A human keeper replaces the read, not the body.** `readAccuracy`, `guessBias`
and `anticipation` all fall away - a person is exactly as good as their guess.
What stays is the physics: dive speed, reach, the two save volumes, and the same
clamp on where a keeper can get to. Picking the top corner and being right still
does not save a shot struck hard and low into it, which is as it should be.

### One player against the computer

Suggested by one of the people this is being built with, and it fills a gap
nobody had named: **keeping was only available in two-player.** Solo has you
taking all five and never standing in the goal, so half the game needed a
second person in the room. This is a duel where one side is the computer, and
the point of it is the half you could not otherwise play.

Ten shots, five each, alternating, sudden death if it is level - the same rules
as a duel, because it *is* a duel. The mode is a third value on `MatchMode`
rather than a flag, and `alternates(mode)` replaced every `mode === 'duel'`
test that was really asking whether there are two sides.

**The handover disappears entirely.** That screen exists so one person can pass
the device without the other seeing the reticle, and a computer cannot peek.
`SET_DIVE` goes straight to `ready`, which is one of those simplifications that
only looks obvious once the mode exists. There is a test that no handover ever
appears in ten shots.

#### The computer taking a penalty

New code, in `core/taker.ts`, deliberately shaped like `keeper.ts`: pure,
seeded, and producing a `ShotInput` - the same type a drag produces. Same seed,
same shot, so one the computer took can be replayed and logged like any other.

Three numbers describe a taker, and they live in `content/takers.js` where
anyone can change them:

- **`ambition`** - how far from the middle it likes to aim. Emphatically *not*
  "how good it is". A taker pinned at 1 aims at a corner every time, which is
  **easier** to keep against than one that mixes, because you only have to
  cover the corners.
- **`technique`** - the odds of a clean strike. The rest mistime.
- **`variety`** - how willing it is to switch sides after the last one. Low is
  readable on purpose; a keeper who spots the pattern has earned the save.

**The thing it must never do is find the dominant strategy.** Both logged human
sessions converged on aim ≈ 0.7 to one side and the game had to be retuned
because of it. A computer that hunted for the best corner would rebuild that
flaw and be unbeatable with it - a human keeper guessing against a machine that
always picks the same spot is not a contest. So the aim is drawn from a spread
rather than optimised, and it is weighted *against* repeating its last side.

It reads nothing. Not where you dived, not what you did last time. A computer
that learns your pattern is [a Later item](#phases) and a harder, different
thing; this one just plays.

#### Tuned against what a person actually does

Not against a difficulty that sounded about right. The shot log knows what a
human does against this keeper - **63% scored, 15% saved, 18% off target** - so
that is the target, which makes "am I better than it" a fair question rather
than a rigged one.

Measured over 2,000 shots per profile against a keeper diving to a random
corner, which is what a person in goal amounts to: they commit before the ball
is struck, so they are guessing however hard they concentrate. The logged duel
agrees - human keepers saved about 22%.

The default taker lands at **71% scored, 15% saved, 14% off.** Saves match a
person exactly; it misses a little less and scores about eight points more, so
it is a slight favourite rather than a wall. That is one number in one content
file away from being changed.

**Two things the tuning found, both worth keeping written down.**

`technique` was a dead parameter. Seventy-three to seventy-five percent scored
whatever it was set to, because `resolveShot`'s timing scatter moves a shot
sideways by centimeters and, against a keeper who has already committed to the
wrong corner, a moved shot is no less likely to go in. The fix is that a
mistimed penalty now goes **up**: leaning back and skying it is what a mishit
penalty actually looks like, and it makes the computer miss by mishitting
rather than by aiming at the corner flag - which was the only other lever and
made it look like it was not trying.

And aiming wide trades saves for misses at worse than one for one. Pushing
`ambition` up from 0.5 to 0.82 moved scoring from 75% to 59%, but off-target
went from 2% to 32% on the way. There is no setting where the computer is
merely accurate; past a point it is just wild.

#### What it does not do yet

**Both sides still use the same footballer.** `resolveShot` is handed the one
squad player for every shot, so the computer's power and accuracy are the
player's. That is also true of a duel today, and [Phase 4](#phases) - picking a
player before a shootout - is what fixes both at once.

**And the computer is one profile for the whole shootout**, where a real side
sends a different player up each round.
[Teams](#teams-and-a-ladder-to-climb) is what fixes that, and it makes the
computer harder to read as a side effect rather than as extra work. The computer's *name* on
the scoreboard comes from its taker profile, so it reads correctly; only the
attributes are borrowed. You can rename it - see below - but the profile is
still where the name comes from when you have not.

### Teams, and a ladder to climb

Two ideas that turn out to be one idea, which is why they are written up
together: **the computer opponent should be a team rather than a person**, and
**a team is the right unit for a difficulty ladder.**

#### Why a team, when the human keeps a name

A shootout is won by a side, not by an individual, and the scoreboard shows it:
`2 – 4, The Steady One wins` reads oddly because a person does not win a
shootout. `You 2 – 4 Northgate United` reads correctly.

But a hotseat duel is two people in a room, and their names are the best thing
about it - the naming form exists so that they see themselves on screen rather
than PLAYER 1. So this is not a replacement. **A team is what the computer is;
a name is who you are**, and the two answer different questions:

| Mode | One side | The other |
| --- | --- | --- |
| Solo | You | A keeper, from a team |
| v computer | Your team, named | A team |
| Two players | A name | A name |

**Half of this is already built.** Starting a game against the computer asks
you to name *both* teams, in the same dialog a duel uses with different copy
and the second field asking for the opponent rather than for a second person.
Each side is stored apart - `teamName` and `opponentTeam` against `duelNames` -
because they answer different questions, and sharing one slot meant naming your
team and then finding it standing in a person's place on the two-player
scoreboard.

**The opponent's field is an override, not the name.** Leave it alone and the
scoreboard says whatever the taker profile is called, which is the real answer
and the one that has to survive this phase: a file of teams with their own
abilities means the name belongs to the opponent, not to a settings slot.
Nothing is stored for a side you did not rename, so a blank field cannot
freeze today's name onto tomorrow's team. What the typed one gets is the
cleaning every other name gets - `cleanTeam`, the same cap and the same
stripping - because it is drawn onto the same canvas.

What is left for this phase is the *opponent* being a team rather than a single
taker profile: a squad of takers, a keeper and a kit behind that name.

Later, a human side could *also* pick a team - which would mean a kit rather
than a different name, since `Player.colors` already exists and a team is the
natural owner of one.

#### What a team is

A composition of things this project already has, which is what makes it cheap:

```js
{
  id: 'northgate',
  name: 'Northgate United',
  kit: { shirt: '#1d4ed8', trim: '#f8fafc' },
  keeper: 'steady',                      // -> content/keepers.js
  takers: ['placer', 'steady', 'hammer', 'unreadable', 'placer'],
  rating: 2,                             // where it sits on the ladder
}
```

`content/teams.js` referring to `keepers.js` and `takers.js` rather than
restating them, so inventing a team is choosing a squad rather than inventing
numbers, and a good keeper can appear in two teams without being copied.

**The best part of this is the five takers, and it is not a cosmetic detail.**
A real shootout sends a different player up each round, and a team whose
takers are `[placer, hammer, placer, unreadable, hammer]` varies shot to shot
in a way one profile never can. That directly serves the rule
[the computer taker](#one-player-against-the-computer) is built around: it must
not be readable. Five profiles in sequence is harder to read than one, and it
is harder for free, because the mechanism already exists.

It also makes the squad matter. The figure that runs up can be a named
footballer from `players.js`, wearing the team's kit, and the HUD can say who
is taking this one - which is a thing shootouts do and this game does not.

#### The ladder

Teams get a `rating`, and you work up through them. The shape worth building is
a **cup run** rather than a menu of difficulties:

- Eight teams, knockout. Beat one and you draw the next, harder one.
- Lose and the run is over. Your furthest round is what is remembered.
- The final is the best team in the file.

A cup is better than a difficulty picker for three reasons. It gives a reason
to play the next one, which a menu does not. It makes a loss *mean* something
without punishing you for long, because a fresh run is one tap away. And it
needs no unlocking logic: you are not granted access to harder teams, you
simply meet them.

**The same ladder covers solo.** Solo currently faces one keeper forever.
Facing each team's keeper in turn, getting harder, is the identical structure
with the sides swapped - and it costs nothing extra once teams own a keeper.

#### What this needs that does not exist yet

- **`content/teams.js`**, and the takers becoming a squad rather than a single
  profile on the game.
- **Persistence with a schema.** A cup run is state that has to survive a page
  load, which is the first thing in this project that genuinely needs
  `storage/schema.ts` - listed since Phase 1 and still not built. Furthest
  round reached is a tiny record, but it is a record with a version.
- **Something at the end of a round.** Winning a cup tie and getting the same
  full-time panel as a friendly is an anticlimax. This does not need much - a
  bracket, a next-opponent card - but it needs *something*, or the ladder is
  invisible.

#### What to be careful of

**Difficulty has to be measured, not asserted.** Every other difficulty claim
in this project was wrong until it was counted: the keeper was 85% before a
retune and 63% after, and the computer taker's `technique` did nothing at all
until it was measured. A ladder of eight teams is eight difficulty claims, and
the harness that measured the takers should be pointed at each of them before
any of it ships.

**A team is another place a real name could reach the public web.** Invented
clubs only, per [what not to commit](#what-not-to-commit) - the same rule the
squad and the hoardings already follow, and for the same reason.

### Two devices, later

**Planned in detail in its own document:
[deadball-two-devices.md](deadball-two-devices.md).** What stays here is the
choice of technology and why. What moved there is how the thing works - who
holds the state, what crosses the wire, what happens when somebody closes a
laptop, and what the first server in this project costs its owner.

It is separate because it is the only part of Dead Ball that introduces a
server, and a server has an operational surface - a bill, an abuse story,
somebody else's data on a disk - which is a different kind of thinking from how
a crowd gets drawn.

One thing from it belongs here, because it changes a rule this document has
held since Phase 3: **player names have to leave the device.** The other player
has to see who they are playing. Everything about names so far has rested on
them never going anywhere - the form is marked `ph-no-capture`, and the shot
log records a side rather than a name with a test to keep it that way. Cross-device necessarily breaks that, and the other document decides it
deliberately rather than letting it happen.

Wanted, and deliberately not first. The interesting question in Phase 3 is
whether a human keeper is any fun, and that answer is identical on one device or
two. Networking would delay finding out and change nothing about it.

The one-device version is not thrown away when this arrives, either. Both are
the same messages; the only difference is whether they cross a sofa or a wire.

#### How the two devices would talk

Recorded so the decision can be made later rather than made again.

| Option | What it is | For | Against |
| --- | --- | --- | --- |
| **Durable Object, polled** | One object per game, holding the room. Clients ask for the state every second or so. | Strongly consistent, which is what a turn-based game needs. One object is exactly one game, so there is no room-routing logic. Barely more code than KV. | A migration in `wrangler.jsonc`, and a Cloudflare-specific primitive. |
| Durable Object + WebSocket | The same object, pushed rather than polled. | No polling delay, and the natural fit if this ever wants spectators. | Connection lifecycle, reconnects, heartbeats - all unnecessary for a game where two things happen per shot. |
| KV, polled | The game as a JSON blob. | The least infrastructure of anything that works. | **Eventually consistent.** A stale read of a few seconds reads to a player as "I picked my dive and it did not take". Wrong tool for this. |
| D1, polled | The same, in SQL. | Consistent, queryable, and a leaderboard later comes nearly free. | More setup than the game needs, and a schema to maintain. |
| A hosted realtime service | Somebody else's sockets. | No server code at all. | An account, a dependency and a bill, for a game two children play. |
| WebRTC, peer to peer | The devices talk directly. | No game traffic through a server. | Still needs a signalling server, so it does not avoid the backend - it adds a second hard thing on top of it. |

**Lean: Durable Object, polled.** Consistency is the requirement; polling is
plenty, because the game is turn-based - a dive and a shot, twice a round.

#### Where that code would live

| Option | For | Against |
| --- | --- | --- |
| **A separate Worker on its own route** | The site stays static and untouched. A bug in the game cannot take the blog down. | A second thing to deploy, and a route to configure. |
| `main` on the existing site Worker | One deployment, one config, falling through to the assets. | A script would then run on **every** request to leggetter.co.uk. Twenty-one years of writing would start depending on the game's multiplayer not throwing. |

**Lean: separate.** The isolation is worth more than the convenience, and the
site being a pile of static files is a feature rather than an accident.

#### Rooms and identity

- **The game id goes in the URL and there is no login.** One player opens
  `/deadball/g/<id>`, sends the link, the other opens it. Nothing to sign up
  for, nothing to remember.
- **The id can be the match seed**, so the address names the game and the same
  number already seeds every shot in it.
- **Rooms need a TTL.** This would be the first thing on the site a stranger can
  write to. An hour is generous for a shootout.
- **And rate limiting on creation**, for the same reason.

#### What actually crosses the wire

Almost nothing, which is the point of the shape the game already has:

- The keeper's `Dive` - two numbers.
- The taker's `ShotInput` and its seed - six numbers.

Nothing streams and no positions are ever sent. The other device runs the
identical simulation from the identical numbers, which is exactly what the
tuning fingerprint in `core/tuning.ts` exists to protect: replaying a shot under
different physics is a different shot, and a plausible-looking one.

### The seam it all goes through

```ts
interface Transport {
  send(msg: MatchMessage): Promise<void>;
  subscribe(handler: (msg: MatchMessage) => void): () => void;
}
```

One device needs no transport at all - the messages never leave the reducer.
Two devices is an implementation of this and a room to point it at.

## Squad and attributes

```json
{
  "id": "rk-01",
  "name": "Rocket Kowalski",
  "power": 88,
  "accuracy": 61,
  "curve": 74,
  "composure": 55,
  "foot": "right",
  "colors": { "kit": "#d62828", "trim": "#f7f7f7" }
}
```

| Attribute | Effect |
| --- | --- |
| `power` | Scales max strike speed between 20 and 32 m/s |
| `accuracy` | Inverse of the aim error cone. 100 means the ball goes exactly where aimed |
| `curve` | Scales the spin magnitude the `curve` input produces |
| `composure` | Reduces the extra error added in sudden death and at match point |
| `foot` | Small bias to the natural curl direction |

Attributes are `0..100` because that is the convention anyone who has played a football game already knows, and it means a new player can be written without reading any code.

### Players, and inventing one

The custom player editor is a form that writes to `deadball:v1:squad:custom`. Shipped in Phase 4, with the picker, in the settings dialog.

**The phase was chosen off this document rather than off a feature list.** `deadball-jobs.md` invites a first contribution by adding a footballer to `content/players.js` - and then required editing `DEFAULT_PLAYER_ID` in the same file to see them. A code change standing between somebody's first contribution and looking at it, in the one job written to need no code change. That is what Phase 4 removes.

Three decisions worth keeping:

- **`core/squad.ts` treats both inputs as untrusted.** The shipped squad is a file people are invited to edit by hand, and the custom list is a browser console away from holding anything at all. Skills clamp, colours are checked against what a canvas can actually parse - `ctx.fillStyle` ignores what it cannot read, silently, so a bad colour draws the figure in somebody else's kit rather than throwing - and names go through the same stripping as a duel name, because they are drawn on the same canvas and a right-to-left override moves text that is not its own.
- **Shipped ids are claimed before custom ones are read**, so nothing in storage can shadow a real player and replace somebody's footballer with a forgery.
- **Only custom players can be deleted.** The shipped squad is not editable from the game; it is editable from the file, which is the point of it.

### Everybody gets 375 points

`SKILL_BUDGET = 375`, of a possible 500, spread across power, accuracy, curve, composure and dip. It applies to the shipped squad and to anybody invented.

**This started as a constraint on the editor and turned out to be a fix for the squad.** Before it, Marchetti spent 335 points and Okafor 277 - so Marchetti was better at three skills out of four and level on the fourth, and picking anybody else was a handicap. The picker was decoration. A budget is what makes four players four *choices*.

- **Shipped players are checked by a test, not clamped.** `content/players.js` is a file somebody is invited to edit by hand, and quietly rewriting their numbers would mean the file and the game disagree with nobody being told. The test names the player and says how many points to move.
- **Invented players are clamped, not checked**, because their numbers come off a disk a browser console can write to. Over-budget skills are scaled down together, so the shape survives: a power merchant stays a power merchant, just a legal one.
- **The form clamps live.** A slider stops where the points run out, which says what the rule is while you are breaking it - nothing to read, nothing to undo, and no way to submit something invalid.
- **Underspending is allowed.** It is only self-harm, and refusing to accept a deliberately weak player would be a rule with nothing behind it.

A second test asserts **nobody on the squad is at least as good as anybody else at everything**. The budget makes that likely; it does not make it true, since 375 points can still be spent strictly worse.

Attributes are gentle on purpose - `power` scales strike speed by 0.85 to 1.15 - so rebalancing the squad onto the budget changed how the four compare without changing how the game feels.

### Earning points, later

**Not built. Filed under Later, and written down now because it pulls directly against the section above.**

The idea: play, and earn points to improve your player. It is the obvious next thing once a player is yours rather than picked, and it is what would make the invented one worth keeping instead of remade every session.

**The tension is the whole design problem.** The budget exists so that no player is strictly better than another. Earned points break that on purpose. A player at 340 makes the shipped four pointless, makes the picker decoration again, and makes a duel against somebody on 300 a formality - which is exactly the state Phase 4's budget was introduced to get out of.

Four ways out, in rough order of how much they keep:

| Approach | What it costs |
| --- | --- |
| **Earned points raise your cap.** 300 becomes 320, 340. | The satisfying one, and the one that undoes the budget. Everything above. |
| **Earned points buy a respec.** You move points rather than add them. | Keeps parity exactly. Weak as a reward: nothing gets better, it moves. |
| **The ladder raises everyone's cap.** Reach tier three and every player, yours and the computer's, plays at 320. | Keeps parity, and makes the progression the *ladder* rather than the player - which may be the honest place for it. See [Teams, and a ladder to climb](#teams-and-a-ladder-to-climb). |
| **Growth is solo-career only; anything head-to-head normalises to 300.** | Keeps both. Costs an explanation - "your 340 player is playing at 300 here" is a sentence that has to appear on screen and be believed. |

**A fifth, and currently the lean: points are earned only in solo and against the computer.** The modes already split along exactly the line this needs - solo and `versus` are you against the game, `duel` and two devices are you against a person - so progression lives entirely on the first side and anything head-to-head is played at a flat 300. The computer is a difficulty dial this project controls, so it can be made to keep up; another person is not.

It is cleaner than normalising, because there is no conversion to explain and no moment where a number on screen is not the number in play. It also merges progression with [the ladder](#teams-and-a-ladder-to-climb) rather than running them as two systems, which is one fewer thing to balance.

**What it costs is worth saying plainly: somebody who spends a week improving a player cannot show it to the person they most want to beat.** Given who this is being built for, that is the whole point of having done it. So the rule needs an escape hatch, and consent is the obvious one - a duel is played at parity by default, and "as you are" if *both* sides choose it. Nobody is ever beaten by a number they did not agree to, and across two devices it is a room setting both people can see, which is the easiest place in the whole design to ask a question.

**One trap in the earning surface itself.** Solo has no opponent, so nothing can go wrong in it, so points only ever go up and grinding is strictly optimal. `versus` has a real opponent and a ladder to lose on. If the two are not to feel the same, the honest split is that **the ladder is where a player improves and solo is where they practise** - which also gives solo back a job it has been quietly losing since `versus` shipped.

Nothing about this is decided.

**What you earn points *for* matters more than the number.** The obvious answer is goals, and the obvious answer is wrong here specifically: [open question 5](#open-questions) records that the game has one correct answer and both testers found it - aim 0.7 to one side, near full power. Paying people for goals pays them for the thing that is already too easy, and buys a difficulty curve that goes the wrong way.

So reward what the dominant strategy cannot give you: scoring in a corner you have not used this session, scoring in sudden death, beating a keeper who has read you. That turns progression into the pressure that open question 5 is still looking for, rather than another reason to hit the same spot.

Two things it would need that do not exist yet:

- **A record that follows the player.** Every shot already logs a `playerId` and nothing reads it back. That is written up as a Tier 2 job, and it is the piece this is built on rather than a separate feature.
- **Earned points are stored, so they are untrusted.** Same rule as everything else here: a browser console can set the number to nine thousand, so it is clamped on the way in like a custom player's skills, and the cap is a constant rather than a promise.

### One dialog became two

Phase 4 put the picker in the settings dialog and this document noted, at the time, that it was one dialog doing two jobs and the next addition should split it rather than lengthen it. It was split immediately after, on the same observation from the other direction: **who takes the penalty is part of the game; sound and time of day are preferences about the machine you are playing on.**

- **Players** sits with the game controls, behind a shirt icon rather than a cog or a person. The button says what is behind it without a word on it, and the kit swatches in the panel are the same idea.
- **Settings** sits in the far corner of the bar, behind a rule, away from everything that changes the game. A cog next to "2 players" reads as another thing to play with.

**The kits went into Players, on the same rule.** What the two teams wear is part of the game; sound and the time of day are preferences about the machine. That made the Players dialog longer again, so it is now two headed halves - **Squad**, then **Kits** - rather than one run of controls. Not a third dialog: it scrolls, and a third would be a third thing to find.

### The other twenty

The players who are not taking it stand on the halfway line with their arms
round each other, ten a side. Presentation only, like the crowd: none of it is
game state and `core/` does not know they exist.

**They are visible from one camera, and that is correct rather than a
shortfall.** The halfway line is 52.5 m out and both cameras at the penalty end
are pointed the other way, so from behind the taker these twenty are behind
you - which is where they are in life. From behind the goal they are the middle
distance, which is where a television camera puts them.

Three decisions worth keeping:

- **The linked arms are the whole silhouette.** Twenty people standing
  separately on a line is a bus queue. The same twenty with a hand on each
  neighbour's shoulder is a team watching a penalty, and it costs two vectors a
  person.
- **The opposition's kit is derived unless somebody says otherwise.** A fixed
  second colour would eventually be somebody's invented kit, and two teams in
  one strip is the one thing a football picture must never be. Rotating the hue
  guarantees a difference for any kit anybody writes, with a flat colour for the
  greys and whites that have no hue to rotate. Their shorts are set against the
  *other line's* shorts rather than their own shirt - keyed off the shirt, a
  blue kit with white shorts put both teams in white. All four strips are
  settable now; the derivation is what a strip nobody has set falls back to. See
  [Four strips, and the keeper who is not
  working](#four-strips-and-the-keeper-who-is-not-working).
- **Only one side celebrates, and "did it go in" is not the question.** A goal
  belongs to whoever took it. That is the same thing as "the player scored"
  right up until the computer takes its turn, at which point keying off the
  outcome alone puts the wrong end up - twice, in opposite directions. So
  `Reaction` carries `celebrating: 'home' | 'away'`, decided once where both
  the taker and the outcome are known, rather than re-derived by everybody who
  draws a person.

Cost is nothing: twenty figures against the crowd's fifteen thousand, drawn
from one camera, measured at a flat 60 fps.

### The away end, and one colour for *them*

Two rules that turned out to be the same rule.

**Side 1 is the away team, in both modes that have two sides** - the computer
in `versus`, the second person in a duel. Solo has no side 1.

- **They wear the away yellow**, and one colour still means *them* wherever it
  appears: the far half of the halfway line, and the figure on the spot when it
  is their turn. It used to mean the keeper as well - keepers deliberately did
  not get a strip of their own, on the grounds that the convention exists so a
  referee can pick the keeper out of a crowded box and there is no crowded box
  in a shootout. **That is reversed**, because the halfway line changed what is
  in the frame; see [Four strips, and the keeper who is not
  working](#four-strips-and-the-keeper-who-is-not-working).
- **Unless the player picked that colour themselves**, in which case the hue is
  rotated instead. Nils Lindqvist ships in amber and is the squad's own worked
  example, rather than a case somebody has to imagine.
- **The shirts swap over on their turn.** The keeper is whoever is not taking,
  so you go in goal for theirs in your own kit. Without it the keeper stayed
  yellow while the computer ran up in yellow too, and both figures on screen
  were the opposition.
- **A duel gets this for free**, and needed it: both people take with the same
  player, so before this the two turns were drawn identically and the only way
  to tell whose penalty it was was to read the HUD.

**The stand behind the far goal is the away end.** It is where a club puts a
visiting support, and it is the end you look straight at from behind your own
goal - so the split is visible from the one camera that can see both at once.
The ground used to rise at everything, which is wrong in the one direction that
matters: a save is the single moment when most of a stadium is silent and one
end of it has lost its mind. The unhappy end still moves, at 0.16 - a crowd
that stops dead reads as a crowd that has been switched off.

### Four strips, and the keeper who is not working

Two strips became four: **an outfield strip and a keeper strip for each side**,
all four settable, all four with a default.

**A decision was reversed to get here.** Keepers used to share their side's
outfield colour on purpose, and the reasoning was sound at the time: the
referee's reason for a distinct keeper strip is a crowded box, there is no
crowded box in a shootout, and what the game needed was for a child to know
instantly which of the two figures on screen was on their side. What changed is
the frame. The halfway line put a keeper and their own ten outfield players on
screen together for the first time, all in one colour - and a keeper who cannot
be told from the line behind them is not a keeper, they are an eleventh
outfield player standing in the goal.

**The resting keeper is what makes it one change rather than two.** When you
take, their keeper is in goal and yours has nothing to do, so yours stands
beside the goal watching - and the other way round on their turn. That is the
sixth pair. Four strips is six pairs, but only five could ever share a screen,
because there is only ever one keeper on the pitch:

| Pair | Seen together when |
|---|---|
| your outfield / their outfield | the halfway line, always |
| your outfield / their keeper | you are taking |
| their outfield / your keeper | they are taking |
| your keeper / your own outfield | your keeper in goal, your line on halfway |
| their keeper / their own outfield | their keeper in goal, their line on halfway |
| your keeper / their keeper | one in goal, one beside it |

The last row is new, and it is the one that is easy to miss: **once the resting
keeper is on screen, all four have to be mutually distinct**, not just the pairs
that obviously meet. So all six are measured, with the same crude RGB distance
and the same 110 threshold that caught two teams in one strip, and anything too
close is turned round the hue wheel until it clears - the opposite hue first,
then out from there in twelfths, with a flat palette for the greys and whites
that have no hue to turn.

**Defaults, in priority order.** Your outfield is the squad player's own kit
and trim and is never moved - it is the one thing on the pitch nobody should
have taken off them. Theirs is the away yellow, or a rotation of it if the
player is already in yellow. Then green for your keeper and magenta for theirs.
Magenta rather than the obvious violet: violet sits about 80 from the default
blue, inside the threshold, so it would have been nudged off it on every frame.
Magenta is about 200 from the blue, the yellow and the green. Checked in RGB,
because the pair that fails this is always the pair that looked fine.

**Six colour inputs, not eight.** A keeper's shorts come off the lightness of
their own shirt rather than being asked for. The argument that put the outfield
shorts against the *other* team's shorts does not apply to a keeper, because
nobody is standing beside them in the other keeper strip.

**Every one of the six is an override, never a replacement.** Absent means
"work it out", so a strip nobody has touched follows the default when the
default moves - pick a different footballer and your side's colours change with
them. This is the same rule the opponent's name follows and it is there for the
same reason: Phase 4.5 brings AI teams with identities of their own, and a
colour stored today must not freeze onto one of them. A stored blank never
wins; junk out of storage falls back to the default rather than reaching a
canvas, because `ctx.fillStyle` ignores what it cannot parse *silently* - a bad
colour does not throw, it draws the figure in somebody else's kit. There is one
validator for that, `cleanColour`, and it is reused rather than reimplemented.

**The resting keeper is visible from one camera, and that one had to be told.**
The figure stands 2.8 m outside the left post on the goal line, which looks like
it should fall out of the framing - it is far outside what `behind-taker` says
it needs to show. It does not. `frame` is a *minimum*: the focal length is the
tightest of the framing rules and the fov cap, and on anything wider than about
5:4 the cap wins and the horizontal field keeps growing with the viewport.
Measured at 1920x1080, `behind-taker` sees ±9.97 m at the goal line, so a figure
at -6.5 lands 327 px in from the left edge - plainly in shot, on the one camera
it must never appear from. There is no x that is outside `behind-taker` at every
aspect ratio and inside `angled-behind`, because both cameras share a fov and
the wide end is bound by that rather than by where they point.

So `angled-behind` carries a `seesBesideTheGoal` flag, alongside `mirrored` and
`fromBehindTheGoal`, and the drawing asks the camera rather than naming it by
id. That is a third thing a camera changes beyond its own position, where the
document previously said there were two.

**Nothing about the resting keeper may read as the keeper who is working:** a
different strip, guaranteed by the mutual distinctness above; well outside the
posts; bare hands where the working keeper has gloves; and never a dive, however
the shot goes. Idling only, with the lineup's sway and breathe on different
periods.

**None of this is game state.** Presentation, like the crowd and the halfway
line. Nothing here can change an outcome, and the simulation has never known
what anybody is wearing.

### The bar, for the third time

**This is the third time the control bar has overflowed, once per feature that added a button**, and the first two fixes both treated the symptom. The cause was that `#modes` and `#views` were positioned in opposite corners independently, so neither could see the other, and every new button ate into a margin nobody was measuring.

It is now one grid: `1fr auto 1fr`, with an empty column as the counterweight that puts the modes in the true middle. Grid tracks cannot overlap, and `1fr` is `minmax(auto, 1fr)`, so neither side is squeezed under its own content - which is what wrapped the camera labels onto two lines when this was first tried as a plain flex row.

Two breakpoints now, because there were always two questions: the row stops fitting at about 1000px and the clusters return to opposite corners; the short labels stay a phone thing at 560px, where they belong.

**The check is a width sweep**, fifteen widths from 320 to 1600, asserting no two controls overlap and nothing leaves the viewport. It exists because the first version of this split overlapped at 860px and looked perfectly fine at 1280, which is the width it was being looked at.

## The hidden page

Hidden here means the same thing `draft: true` already means in this repo: **built, reachable, and pointed at by nothing.** Obscurity is not access control, and the spec should not pretend otherwise. Anyone with the URL can play it, and that is fine.

Route: `/deadball/`. Changes required:

1. **`src/pages/deadball/index.astro`** - a page that imports `src/games/deadball/main.ts` from a `<script>` tag. Astro compiles and bundles TypeScript in component scripts with no extra configuration, so no build tooling is added. This would be the first bundled client-side TypeScript in the repo; everything existing is either static HTML or `is:inline`.
2. **`src/layouts/Fullscreen.astro`** - add a `noindex` prop, defaulting to `false`, rendering the same `<meta name="robots" content="noindex, nofollow" />` that `Base.astro` already has. The page passes `noindex`, plus explicit `backHref="/"` and `backLabel="Home"`, since the current defaults point at the family tree.
3. **`astro.config.mjs`** - the sitemap `filter` currently excludes draft post paths. Add a `HIDDEN_PATHS` set alongside it and exclude both.
4. **`scripts/verify-urls.mjs`** - add `/deadball/` to the expected routes, and add a hidden-page assertion block mirroring the existing draft one: the page was built, it carries its `noindex` meta, and its path appears in no sitemap and no rendered page. The repo's existing position is that a flag nobody enforces becomes decoration, and this follows it.
5. **No nav entry** in `src/components/Header.astro`.
6. **No `robots.txt`.** The site has none today. Adding one to disallow `/deadball/` would publish the path to anyone who reads it, which is the opposite of the intent. `noindex` on the page is the stronger and quieter signal.

One thing to decide rather than assume: `Fullscreen.astro` renders `Analytics.astro`, so the hidden page will send PostHog events like every other page. That may be wanted, for seeing whether anyone finds it. It may not be. Lean: keep it, because the data is interesting and the page is not sensitive. Flagging it because it is the kind of default that is easier to notice now than later.

## Phases

Each phase ends with something playable. That is the constraint, not a nicety, because the point of building v1 solo is having something to hand over.

| Phase | Contents | Playable at the end |
| --- | --- | --- |
| **0** ✅ | Hidden page, layout change, sitemap filter, verify assertions, empty canvas, frame loop | Nothing, but the page is live on a preview URL and the plumbing is proven |
| **1** ✅ | `core/` (units, vec3, rng, physics, predict, shot, keeper, flight, rules, match), `BehindTakerView`, drag input, one keeper, 5 penalties, in-memory storage, 27 tests | Single-player penalty shootout |
| **1.5** ✅ | Full-time summary read off the shot log, a taker figure and a run-up, a keeper that shuffles, dives and lands, woodwork rebounds, netting, the save aftermath, release timing, the shot dial | The shootout ends with something, and a shot finishes rather than freezing |
| **1.75** ✅ | A camera that frames the goal at any shape of screen, and a HUD that fits a phone | Playable on a phone, which it currently is not |
| **2** ✅ | `AngledBehindView` and `KeeperCamView`, view registry, `?view=` param, on-screen switcher | Same game, three cameras, compare and choose |
| **3** ✅ | Two players on one device: one shoots, one saves, with both named. See [Two players](#two-players) | A contest rather than a practice |
| **3.5** ✅ | `presentation/` packages with the cameras lifted out as data, an event stream out of `core/`, a raked stand with hoardings and an animated crowd, and sound - synthesised impacts, sampled crowd. See [Presentation packages](#presentation-packages) and [A crowd, and something to hear](#a-crowd-and-something-to-hear) | It feels like a penalty rather than a diagram |
| **3.75** ✅ | One player against the computer, alternating. See [One player against the computer](#one-player-against-the-computer) | You get to be the keeper without needing a second person |
| **4** ✅ | `core/squad.ts`, a player picker and a custom player editor in the settings dialog, stored per device. See [Players, and inventing one](#players-and-inventing-one) | The squad is worth editing |
| **4.5** | Teams, and a cup run against progressively better ones. Solo climbs the same ladder against their keepers. See [Teams, and a ladder to climb](#teams-and-a-ladder-to-climb) | A reason to play the next one |
| **5** | Replay any shot from the log, through any camera. Half built: every record already carries a tuning fingerprint | Watch that again, from behind the goal |
| **6** | Two devices, a game per URL, no login. A separate Worker in this repository, because this site has no server at all today. See [Two devices, later](#two-devices-later) and [deadball-two-devices.md](deadball-two-devices.md) | Play somebody who is not in the room |
| **7** | A second presentation package, which is the only thing that proves the boundary. See [What else a package could be](#what-else-a-package-could-be) | The same game, twice, looking nothing alike |
| **8** ✅ | Free kicks: three spots, a two-to-four man wall, and the `blocked` outcome reserved since Phase 1. `dip` as a fifth attribute and `loft` to go with it, three shot styles, and a camera that stands behind the ball wherever it is. See [Free kicks](#free-kicks), [Dip](#dip-and-why-the-wall-was-unbeatable) and [Three ways to hit it](#three-ways-to-hit-it) | The curve mechanic finally matters |
| **Later** | A keeper that reads your pattern, earning points to improve your player (see [Earning points, later](#earning-points-later)), corners, a league season, a realistic 3D package, side-on view, a leaderboard | |

**Free kicks moved to Later.** They were Phase 3 on the grounds that they
complete the shot model, which is still true and is not the same as being the
most valuable thing left. The name does not depend on them either: a penalty is
a dead ball situation, so Dead Ball was already the right name before free kicks
rather than only after.

Phase 1.5 grew well past what it was speced as, and every addition came from
playing rather than planning: the run-up, the keeper's shuffle, the woodwork,
the netting, the aftermath, and the release sweep. The keeper-cam moved up from
Later into Phase 2 for the same reason it keeps getting asked for, and a view is
cheap once the registry exists.

**Sound moved out of Later and into 3.5, along with the crowd, for the same
reason.** It was listed as a someday item next to pixel art. It was then asked
for directly, with a list of eight specific sounds attached, which is a good deal
more thought than "sound" had been given here. A half-phase rather than Phase 4
because it changes how the existing game feels rather than adding anything to
play, which is what 1.5 and 1.75 were both for.

### Free kicks

**Not scope creep - collecting on physics that was already paid for.**

[What playing it kept finding](#what-playing-it-kept-finding) records "physics that is right and useless": sideways deflection grows with the *square* of the flight, so a realistic Magnus gives about 20 cm over a penalty, less than the width of a keeper's gloves. The curve mechanic has been in the code, tested, and effectively absent from the game since Phase 1. From seventeen to twenty metres it is most of a metre. **Free kicks are where the drag-to-curve gesture finally means something**, which is the argument for building them and would still be the argument if nothing else here were true.

The decision table at the top of this document already said the rest: penalties were chosen first because a free kick is the same game with the wall, the angle and the distance all fixed, "so they are strictly a subset". This turns the three constants back into variables.

**A discipline, not a mode.** `penalties | freekicks | mixed` sits on `MatchState` beside `mode` rather than inside it, so it composes with solo, versus and duel rather than multiplying them, and a shootout describes itself - a record in the log knows what it was without being told separately. Changing it restarts the shootout, because half a round of each is not a result and the scoreboard could not say what it counted.

**Three spots, from a shuffled bag.** Left, middle and right, all three inside every three kicks and never twice running, including across the seam between one bag and the next - which is the one thing a bag gets wrong on its own. An independent roll per kick gives three of the same often enough to feel broken, and the point of moving the ball is that you read a different picture each time.

**The wall lines up on the near post, not on the middle of the goal.** That is the whole geometry of a free kick and the reason an angled one is a different problem from a central one: the wall takes the post you would most like to shoot at and the keeper takes the rest. From the middle there is no near post, so the wall picks an end - and a taker who works out which has learned something real about that kick.

**The camera follows the ball.** Every `CameraSpec` was written against the penalty spot, so each is now read as *an offset from the ball in the frame of the shot* - so far behind, so far across, so far up - and rebuilt around wherever the ball actually is, including the framing distance. For the penalty spot this returns the spec unchanged, and a test asserts exactly that: five phases of camera work are not up for renegotiation because free kicks arrived.

**A comment I had to take back.** The wall is tested against the segment the ball travelled rather than its position at the end of the step, and I wrote that a point test would let the hardest shots through. It would not: at 120 Hz the ball moves 27 cm a step and a person is 74 cm across, so end-of-step sampling already catches it. The planted-bug check found it - the test passed with the swept maths removed. The swept test stays because it costs one dot product and stops being belt-and-braces the moment somebody changes the tick rate, and the comment now says that instead of the thing that was not true.

### Both sides take the same kick

Reported from play: in **Both**, one team was getting the free kicks and the other the penalties.

True, and worse than it sounded. Each kick rolled its own discipline, and because the two sides alternate, **the roll landed on one side's parity.** Measured over ten kicks, one seed gave one team 40% penalties and the other 80%. That is not a shootout, it is two different competitions scored against each other.

Kicks now come in **pairs**, and both halves of a pair face the same kick - same discipline, same spot, same wall, same post covered. Fairness is not only which *kind*: one side taking a twenty-metre central free kick while the other takes an angled one past four men is the same unfairness in a different coat. Solo keeps a fresh kick every time, because there is nobody to be fair to and pairing would only halve the variety.

### Where a game starts

The kick used to be chosen in Settings and the mode on the bar, so **starting a
game was two controls in two places and one of them was filed with the sound.**

Both now live where the game begins. Pressing **1 player**, **v computer** or
**2 players** opens one dialog that asks everything a shootout needs: which
kick, and who is playing. A thing you choose once per shootout belongs with the
other things you choose once per shootout.

Three consequences worth having written down:

- **Solo asks too, now.** It used to start on the press, which was right while
  there was nothing to choose and nothing to lose. There is now both.
- **The choice is held until Start.** Backing out leaves the game you were
  already playing exactly as it was, including what it was being played with -
  so the dialog is safe to open and read.
- **Ending a shootout is asked as a question, not warned about.** It was a line
  of amber text inside the form first. That is a *warning*, and a warning can
  be read past - the button beside it still said "Start the shootout" and still
  did. So a shootout in progress now gets its own dialog first, which says how
  many kicks are about to be lost and offers **End it and start again** or
  **Keep playing**. Only when there is something to lose; before the first kick
  there is nothing to ask about.

  **"Something to lose" is not `shotIndex > 0`**, which is what it was first.
  That counter only moves on the tap *after* a kick has finished, so from the
  moment the ball was struck until somebody read the result, a shootout that
  had visibly been played reported itself as untouched - and switching mode
  threw it away without asking. Reported from play, and the window was every
  single kick. A shootout has started once the ball has been **struck**,
  whether or not anybody has looked at the outcome yet, and the count of kicks
  is the outcomes rather than the index for the same reason.

  The two are **sequential, not stacked** - the question closes before the
  start dialog opens - because a dialog on top of a dialog is a back button
  nobody can predict, which this document already says once about the invent
  form. The way *out* holds the focus, so a stray Enter keeps the game rather
  than ending it, and the destructive button is the quieter of the two.

`useDiscipline` stopped restarting the match when this landed. It restarted
because changing mid-shootout leaves a scoreboard that cannot say what it
counted, and that reasoning still holds - but the only way in is now a dialog
that restarts a line later, and two restarts is one too many.

### The keeper was hanging in the air

Reported from play, and the third member of a family (see below): the keeper reached full stretch and stayed there until the ball hit the net.

The dive ran at a fixed `diveSpeed` from the moment of commitment. A penalty is in the air 0.41 s and the hands take about that long to reach a corner, **so the two finished together by luck rather than by design.** A lofted free kick is in the air 1.67 s: full stretch after 0.4 s, then **1.46 s of a man frozen mid-air**.

The dive is now *paced* to the ball. The commitment is untouched - same moment, same information, same read error - and so is the top speed, which no keeper exceeds; what changes is that a keeper with a second to spare spends it. Hanging went to 0.08 s, which is the lead a keeper wants so the hand is already there rather than still travelling as the ball passes. **Save rates are identical**: 31% and 25% before, 31% and 25% after.

Holding the keeper still and then going flat out was tried first. It reads better in prose and is closer to what a real keeper does, and it broke a test inside a minute: *an anticipating keeper is moving at contact*, because that is the only way to reach a corner in 450 ms, and that property is the entire trade separating anticipation from reaction. Pacing satisfies both; delaying did not.

### Dip, and why the wall was unbeatable

Reported from play: *"it needs to be more possible to shoot over the wall"*, and *"near impossible to get it where you're aiming"*. One of those was true, the other was not, and it took measuring to tell which.

**The ball does not swerve more on a free kick.** Scatter at the line measured **0.43 m for a penalty and 0.42 m for a free kick** - identical, because `launchVelocity` solves for a point on the goal plane and the aim sigmas are in metres there. A free-kick *accuracy* attribute would have fixed nothing.

**The wall was not hard, it was absolute.** Aim at the post it covers: **100% blocked**. Aim away: **85% goal**. No middle, no partial credit, which is exactly what "random" feels like from the inside.

**And it could not be beaten over the top, at all.** A grid of wall heights from 2.15 m down to 1.65 m against every aim height and every spin gave **zero goals**. Two wrong guesses died here: lowering the wall (the shot that clears it is still rising, so it goes over the bar) and topspin (`lift > 0.5` drives the ball *down*, so it was lower at the wall and blocked more).

The cause was one line. `launchVelocity` fixed the horizontal speed from the distance and solved only for the launch angle, so **there was exactly one trajectory to any target: the flattest arc that arrives.** Right for a penalty, wrong for a free kick, where the whole point is to go over four people nine metres away and come down before the crossbar.

**`loft` spends part of the speed budget going up.** The ball takes longer to arrive, so the solver launches it higher, and the arc clears the wall and drops onto the same target. `LOFT_SHARE = 0.6`, tuned by measurement: below about 0.4 a four-man wall cannot be cleared, above about 0.6 it can.

**`dip` is the fifth attribute, and it drives loft on free kicks.** Penalties pass 0 and are untouched. Shooting straight at the post the wall covers now measures 90% for a specialist on 85 dip and 13% past a four-man wall for a power player on 65 - the difference between a taker who can go over a wall and one who has to go around it, which is the difference a dead-ball specialist actually has.

**The budget moved with it: 375 of a possible 500.** Same 75 average, same share of the maximum, same feeling of having to give something up. A fifth skill on the old 300 would have quietly made everybody worse at the four they already had.

**Aiming was eased for free kicks only**, to 0.62 of the sigma - 0.45 m of scatter down to 0.28 m. The numbers were tuned against eleven metres, an open goal and nothing in the way; the same numbers from twenty with four people across the half you want are a different proposition.

**The tuning fingerprint moved to `f0459d48`.** Deliberate: `LOFT_SHARE` is a new physics constant and the fingerprint exists to make exactly this kind of change impossible to slip in unnoticed.

### The swerve, which was the gesture and not the physics

Reported after dip shipped: *"the ball still goes nowhere near where you've aimed, there's far too much swerving."* Two causes, and the first one was mine.

**Lofting was multiplying the swerve.** Sideways deflection grows with the square of the flight, and lofting doubles the time in the air - so the same hook that bent a penalty 24 cm bent a lofted free kick **1.69 m**, and a dead straight drag still finished a third of a metre off the aim. The distance part of that is wanted and is the entire argument for free kicks. The loft part is not: choosing to go over a wall is a decision about height and has no business multiplying a decision about direction. The spin is now scaled back by exactly the extra time the loft bought, which took that 1.69 m to **0.40 m**.

**The rest was not physics at all.** The hook deadzone was **two pixels**, and maximum curl is about forty pixels of hook - so an ordinary twenty-pixel wander in the middle of a drag, which is simply what a hand does, was **half of maximum curl on every single shot**. On a penalty that is a quarter of a metre and passes for spice. On a free kick it was most of a metre, every time, and no amount of tuning the ball would ever have fixed it.

The deadzone is now proportional to the drag - a long drag wanders further in absolute terms without being any less straight - and the hook ramps from its edge rather than stepping off it. Twenty pixels of wander now gives 0.01 of curl instead of 0.47, and a deliberate hook still reaches the full range.

**Worth keeping as a lesson:** three separate measurements said the ball was not scattering, and all three were right. The complaint was about *swerve*, which is a different quantity, and it lived in the input layer rather than in `core/` at all.

### Three ways to hit it

Finesse, driven, knuckle - one button, bottom left, cycling. Not a mode and not
a setting: it is a decision made between one kick and the next, so it sits
where a thumb already is rather than two taps into a dialog. The control bar is
also full, and this project has learned what happens when something else goes
in it.

**A style is not an attribute.** `curve` is how well a player bends a ball;
this is whether they tried to bend *this* one. Every field is a multiplier on
what the gesture already said, so the one gesture stays the one gesture and the
decision sits beside it. The numbers live in `content/shots.js`, which is a
Tier 1 file: change one, refresh, take five.

| | bends | pace | arcs | stays low | unreadable |
| --- | --- | --- | --- | --- | --- |
| **Finesse** | 1.7x | 0.88 | full dip | - | - |
| **Driven** | 0.35x | 1.12 | almost none | yes | - |
| **Knuckle** | 0.15x | 1.06 | half | - | yes |

They are genuinely different shots rather than three labels. Aimed straight at
the post a four-man wall is covering: **finesse 87%, driven 0%, knuckle 0%** -
because driven is the shot you take *under* a wall and finesse is the one you
take over it. Aimed away from the wall, all three are worth having: 93%, 85%,
92%.

**A knuckleball is not inaccurate, it is unreadable.** Its spin is drawn from
the shot's own seed, so it is fixed for one flight and replays exactly - but it
is not derived from anything the taker chose, so nobody can aim it. Including
them. The keeper commits on where the ball is pointed and the ball does not go
there.

**Absent means plain, not the default selection.** A `ShotInput` with no style
on it has not made a choice, and if "no style" had quietly meant finesse then
every shot in the game that predates this would have gained 1.7x the bend.
That is exactly what the first version did, and three keeper tests said so
within a minute. The *game* opens on finesse, which is a choice the player is
making.

### What playing it kept finding

Bugs of the same shape, which is worth writing down because the next one is
probably in here somewhere. Make that seven, and the last three are not bugs in
the simulation at all.

**A number that is not the unit it looks like.** `Rng.nextBell` has a standard
deviation of 0.29, not 1. Three separate constants were written as though
multiplying by it gave you their own value, and all three came out roughly a
fifth as wide as intended: the aim error, so an accuracy-88 striker landed
within four centimeters every time; the keeper's read, so it reached everything;
and the timing scatter, so a fully mistimed shot sprayed by twelve centimeters.
Each one read as a tuning problem and was a units problem. Anything that is a
sigma now says so and divides by `BELL_SD`.

**Physics that is right and useless.** Sideways deflection grows with the square
of the flight, so a realistic Magnus gives 20 cm over a penalty - less than the
width of a keeper's gloves. The curve mechanic was in the code, tested, and
absent from the game. Being defensible is not the same as being playable.

**Drawing that disagrees with the rules.** The ball was inflated up to 1.9x to
stay followable, which added ten centimeters to its apparent radius at the
goal - most of the seventeen that decides a crossbar hit. Shots that cleared the
bar were drawn overlapping it. Readability now comes from a trail and an
outline, neither of which moves where the ball appears to be.

**Geometry that quietly forbids something.** Setting the keeper's dive short of
the post left a metre at each side that no keeper could ever reach, and two
logged sessions put 65% of their shots through it without either player knowing
why it worked.

**A label that reads as an identity.** A duel names the keeper - "Player 2 in
goal" - and names nobody else. Read once, it says who Player 2 *is*, so the
roles swapping every shot goes unnoticed and the final score looks broken:
Player 2 was the keeper, how did Player 2 win? Nothing was wrong underneath.
Every screen now names both roles, the taker is captioned for the whole shot,
and the full-time pips ring in the owner's colour whatever the outcome, so a
scoreline can be checked without counting positions.

**A rule the code obeys that the page does not.** Twice now, and both times the
failure was silent: nothing threw, every test passed, and the only way to find
it was to look at the screen.

Astro scopes component CSS by stamping an attribute on the elements in its
template, so anything built with `document.createElement` matches none of it.
The Phase 2 view switcher came out as bare browser buttons that way, and so did
the Phase 4 player list, after the first one had been written down here. The
switcher was fixed by moving the buttons into the template; the player list
cannot be, because the squad grows at runtime, so those rules are marked
`:global` instead.

The control bar is the other. It has overflowed three times, once per feature
that added a button, because `#modes` and `#views` were placed in opposite
corners independently and neither could see the other. The first two fixes
treated the symptom. It is now one grid, where tracks cannot overlap by
construction, and the check is a width sweep across fifteen widths - which
exists because the third overflow was invisible at 1280 and twenty pixels deep
at 860.

**A number tuned for one flight time, reused for another.** Three of these in one phase, which is what makes it a class rather than three bugs. Everything in the game was tuned against a penalty: **0.41 seconds in the air**. A free kick is 0.82, and a lofted one 1.67.

- The **keeper's dive** ran at a fixed speed that happened to finish as a penalty arrived. At four times the flight it finished a second and a half early and hung there.
- **Magnus deflection grows with the square of the flight**, so the hook that bent a penalty 24 cm bent a lofted free kick 1.69 m. Lofting - a decision about *height* - was silently multiplying a decision about *direction*.
- The **aim sigmas** were set for eleven metres and an open goal, and read as a ball going anywhere from twenty with four people in the way.

None of the three was wrong when it was written. Each was a constant that quietly encoded an assumption about how long the ball is in the air, and none of them said so. **The lesson is not "check the constants" - it is that a constant tuned against one scenario should say which scenario**, because the next phase will be the one that breaks it and the comment is the only thing that will warn anybody.

The common thread: all seven were found by playing, by measuring, or by looking,
and none by reading the code. The shot log exists because of the first four.
The fifth is the one that argues hardest for the log - it was a question about
a screenshot, and the log could not answer it, because it recorded no side. It
does now. The sixth argues for something else: **a test that renders nothing
cannot see anything**, so the visual work gets checked by a browser and a pair
of eyes, and the parts that can be reduced to a number - does anything overlap,
does anything leave the screen - get reduced to one and swept.

### Full time: what the shot log knows

The shootout currently ends on "3 of 5" and nothing else. The log already holds
everything needed to do better, because it was built to answer exactly these
questions offline:

- **Where you went.** Two sessions in a row put more than 65% of shots to the
  same side, and repeated the previous side about two thirds of the time. The
  game should say so. That habit is what a pattern-reading keeper would punish,
  and telling the player about it is the fair way to introduce one.
- **How you struck it.** Clean strikes against scuffs, as a scoring rate. This
  teaches the sweep without a tutorial.
- **What beat you.** Saved, or the post, or nobody near it. In the second
  session the keeper made 6 saves and the frame took 8, which is a different
  game from the one the player thinks they are playing.
- **Whether it was even saveable.** The reachability line is the sharpest thing
  in the offline analysis and it is cheap: was the ball inside the envelope the
  keeper could physically have got to?

Same code both places. `telemetry/analyse.ts` takes records and returns a
summary; the full-time screen renders it, and an offline script prints it. A
second implementation would drift from the first within a week.

### Watch that again

Nearly free, because the determinism was built for it. A shot is fully
described by `ShotInput`, a seed, and where the keeper was standing, and the
log has been recording all three since the summary landed. Replay is not a
recorded trajectory played back; it is the same `resolveShot` and the same
`advance` loop run again with the same numbers, which is why it costs a few
dozen bytes rather than a few hundred kilobytes.

It is also the same mechanism two-player needs in Phase 5. A replay and a
remote opponent are both "here is a shot somebody else took, run it": build
one and the other is most of the way done.

The obvious place for it is the full-time screen, on any shot in the row of
five. It is also the honest use for the extra cameras: watch the save again
from behind the goal, or watch the curl from side-on, which is the one angle
that shows what the ball actually did.

**The catch is fidelity, and it is not small.** A replay reproduces the shot
under *today's* physics. The Magnus factor, the keeper read error, the dive
speeds and the aim sigma have all moved several times over, some of them by
a factor of two. A shot logged last week, replayed against this week's
constants, is a different shot - and it will look wrong in exactly the way
that is hardest to notice, because it will still look plausible.

Two ways out, and they are not exclusive:

- **Stamp each record** with the tuning it was taken under, and refuse to
  replay across a mismatch rather than quietly lying. Cheap, and it has to
  happen *before* the feature or every log recorded in the meantime is
  unreplayable.
- **Store the profiles used**, so an old record carries its own keeper and
  player rather than looking them up in content files that get edited. Bigger
  records, faithful forever.

Lean: stamp now, decide about profiles when the feature is built.

### Any shape of screen

The input was built for this and the layout was not. Pointer Events meant touch
worked on the first try; the page has no overflow at any size; and then the
camera put the goal off the side of the screen.

`project.ts` derives the focal length from a fixed **vertical** field of view.
That is fine on a laptop and wrong on a phone: hold the same angle on a tall
narrow viewport and the horizontal field collapses, so a 7.32 m goal seen from
17.7 m does not fit across a 390 px screen. On an iPhone in portrait neither
post is visible. You can see netting and a keeper, and no goal.

**A camera should frame its subject, not hold an angle.** The fix is to give it
something that must be visible - the goal mouth plus air either side - and let
it work out the focal length from whichever axis binds. The vertical angle
stays as a *limit* rather than a target, so the desktop view is unchanged and a
narrow screen zooms out until the goal fits.

That is one change in one file and every view gets it, which is the projection
boundary doing the job it was drawn for.

Three smaller things come with it:

- **The HUD is written in fixed pixels.** The instruction line runs off both
  edges at 390 px, and the full-time stats are a single row joined with
  separators that has nowhere to go.
- **`100vh` is a lie on mobile browsers**, where the address bar is counted and
  then removed. `100dvh` with a `vh` fallback.
- **The dial sits where the drag starts**, so on a small screen it is under the
  thumb. Worth looking at once it can be played.

**And a fourth, found twice.** This page does not load the site stylesheet, so
the global `border-box` rule is not under it. A dialog declaring
`width: min(340px, calc(100vw - 32px))` therefore put its 22px of padding and
its 1px border *outside* that width: measured, 386px of panel in a 375px
viewport, clipped on both dialogs. The naming form had the same bug at 390px
and was fixed on its own; the panels kept it until somebody measured them too.
One line each, and the lesson is the second half - a rule you assume is global
is not global on a page that does not load the sheet it lives in.

### Somebody to take the penalty

Built in Phase 1.5, and kept here because of what it changed. There was no taker
at all: the ball sat on the spot and nothing stood over it, which was not a
deferral, it was never specced. Adding a figure that runs up and strikes is also
what made the keeper's anticipation legible, because until then there was nothing
on screen for a keeper to be reading.

### A crowd, and something to hear

Phase 3.5, and asked for by one of the people this is being built with rather
than derived from anything in this document. A penalty in an empty stadium is a
physics demo. The thing that makes one matter is several thousand people
reacting to it, and none of that is in the game.

Two features that arrive together because each is half of the same effect: a
crowd you cannot hear is scenery, and a crowd you cannot see is a sound effect.

#### What is behind the goal

Three things, nearest to furthest, all of them world geometry at a `z` beyond the
goal line so that every view projects them the way it projects everything else.
No view needs new code to have any of this.

**Advertising boards, at grass level.** A run of horizontal rectangular
hoardings across the back of the goal, between the goal line and the stand.
They do more work than their size suggests: they are the depth cue that makes the
stand read as *behind* the goal rather than floating above it, they give the net
something to be seen against, and they occlude the feet of the front row, which
is what stops the bottom of the stand looking like it is standing on the pitch.

**The boards are data, and they are meant to be changed.** They come from
`content/boards.js`, committed - a Tier 1 contribution surface of exactly the
right shape, a list of short strings, edit and refresh.

**Not customisable per device.** Custom players earn their storage override
because a player is yours; a hoarding is set dressing, and nobody is going to
sit down and write their own before a shootout. If that turns out to be wrong it
is a small feature to add later, and adding it now would be building a settings
screen nobody asked for.

The one concession to a future source: **the loader is async.** Serving boards
from the same backend [Phase 6](#two-devices-later) needs is plausible enough to
be worth one `await` in a startup path that is already async. This document made
`Storage` async before anything needed it, on the grounds that the interface is
the cheap half of that decision, and the same argument applies for a great deal
less code.

Real brands are fine, and whether one goes in is the repo owner's call rather
than the code's. One factual note, stated once: somebody else's mark is theirs to
license, so committing one is a permission question, not a technical one. Nothing
in the design depends on the answer - that is the point of the boards being data
and of the loader not caring where they came from.

What does not change: **no real people's names on a board.** That is the privacy
rule this project has run on throughout, it has nothing to do with brands, and a
board is the easiest place in the game to break it - a short string that renders
straight onto the pitch. See [What not to commit](#what-not-to-commit).

Logos rather than lettering is the obvious next request and changes none of this.
A board that renders an image needs an asset, which is the one place this phase
would acquire a binary the repo does not currently ship; a device-supplied or
remotely-served one avoids that entirely, which is a point in favour of sources
2 and 3 rather than an argument against source 1.

**A stand, raked.** Not a flat bank of people: rows that rise and recede, each one
higher and further back than the one in front. The existing projection needs no
help with this. A row further back is genuinely higher and genuinely further away
in world space, so it lands higher and smaller on screen because of the
arithmetic that already draws everything else, rather than because of a 2D trick
that would then have to be redone for the angled camera. Structure first -
terracing, the vertical faces between rows, the gangways - and a roof only if the
stand looks unfinished without one.

**The crowd, in the stand.** Individual figures, individually animated. Not a
texture, and not a static block with a shimmer over it. Each person idles on
their own - a small bob, their own phase - and on a goal or a save **they rise,
but not in unison**: the reaction spreads across the stand instead of the whole
crowd moving as one object. A crowd that jumps in lockstep reads as a single
cut-out being translated upward, which is worse than not animating it at all.

So each person needs their own timing, and the honest way to say that is that
they need their own numbers:

- A **phase** for the idle bob.
- A **delay** before they react, which is what makes the rise ragged.
- An **amplitude** and a **duration**, so some people leap and some barely get
  out of their seat.

All four come from a cheap hash of the person's index, not from stored state.
Same index, same person, every frame, with nothing to allocate, nothing to keep
in step and nothing to reset between shots. Optionally the delay also takes a
term from how far that person sits from where the ball crossed, which makes the
reaction start near the ball and spread outward, and costs one subtraction.

#### What the crowd costs, and how it is paid

This is the most expensive thing the renderer will have ever done, by an order of
magnitude. The scene currently draws a goal, a net, two figures and a ball.
Several hundred people, each at their own offset, every frame, on a phone, is a
different proposition - and "each at their own offset" rules out the cheapest
answer of all, which would be to render the whole thing once and never touch it
again.

The split that makes it affordable: **the stand and the boards do not move, and
the people do.** Terracing, hoardings and their lettering render once to an
offscreen canvas and are blitted, redrawn only on a resize or a camera change,
which is when they can afford to be. Everything per-frame is people.

The remaining cost is in the draw calls, not the arithmetic. Four numbers per
person from a hash is nothing; six hundred `beginPath` / `arc` / `fill` triples
is not. Two techniques, both of which keep the individual animation:

- **Pre-render the figures once, then blit.** A small atlas of a few poses across
  a few shirt colours, drawn to an offscreen canvas at mount and on resize. Each
  person is then one `drawImage` at their own position and offset, which is the
  cheap call in canvas2d and the one that scales. All of this is the `classic`
  package's business; a package that draws another way owes none of it.
- **Failing that, batch by colour.** One `beginPath`, every person of that shirt
  colour added to it, one `fill`. Eight fills a frame rather than six hundred.
  Individual offsets survive, because the offset is in the path, not in the call.

**Measured, once built.** The atlas won and the count turned out not to be the
binding constraint at all. 15,364 people across four stands hold 60 fps at
1280 px and at 390 px with the CPU throttled six times over. Roughly 2,450
survive culling in any given view and become one `drawImage` each; 84% are
rejected on a comparison, before the second projection is even computed.

Worth recording that the first attempt was nowhere near this. It put the front
row five meters behind the net, which made every person eighty pixels tall -
the camera is necessarily telephoto, because it has to frame a 7.32 m goal from
17.5 m, so anything near the goal line comes out enormous. The stand went back
to a realistic distance and the numbers stopped being a problem.

**The crowd cannot touch the match RNG, and that is structural rather than a
rule to remember.** `createRng(shotSeed(seed, index))` lives in `core/` and the
crowd lives in the view, which has no reference to it. Worth saying only because
the failure it prevents is a nasty one: a crowd drawing from that stream would
make the same input produce a different flight depending on how many people were
on screen. The crowd randomises from its own generator, seeded however it likes,
because nothing downstream of it can be wrong.

`prefers-reduced-motion` gets a still crowd: no bob, no rise. The stand and the
boards are unaffected, being furniture.

**It was a per-camera feature, and that is why it became four stands.** One
stand behind the goal serves `behind-taker`, which stares at it, and
`angled-behind`, which is the view a rake flatters most. `keeper-cam` looks the
other way and got nothing at all: sky and grass. That consequence was recorded
here rather than discovered later, and then it was fixed.

#### A whole stadium

Four stands - behind each goal, down each side - plus hoardings all the way
round, floodlights at the corners, and a full-size pitch with the far goal and
the halfway line on it.

**It costs almost nothing extra in the two views that already had a stand**,
which is the part worth knowing before assuming otherwise. A camera can only
look one way: the stand behind it is culled on a comparison and the two beside
it are seen edge-on with most of each off the frame. Measured, `behind-taker`
draws 2,408 people where one stand drew 2,451 - unchanged inside the noise.

The cost lands entirely on `keeper-cam`, which looks down the length of the
pitch and sees three stands at once. That view went from drawing zero people to
6,987, which is not a regression but is a bill: 27 fps at four times CPU
throttling, where every view had held 60 at six.

**Fixed by measuring rather than by trimming.** Profiling the view found nobody
under 6 px tall - every camera here is telephoto, because it has to frame a
7.32 m goal, so even the far stand at 110 m projects people 6 to 10 px. There
were 4,940 in that band and 2,047 above it. So the threshold for "animate this
person every frame" went to 9.5 px, and everybody below it is painted once into
the same offscreen canvas as the terracing. They are still there; they just
stop moving, at a size where a two-centimetre idle bob is a sixth of a pixel.
`keeper-cam` came back to 2,449 live and 60 fps everywhere.

What is genuinely lost: the far end no longer joins a celebration. At a hundred
metres, in a view facing away from the goal being scored in.

**The floodlights are the cheapest thing here and do the most.** Height is what
makes a place read as a stadium, not seat count, and they are static geometry
in the pre-rendered backdrop, so they cost nothing per frame. They stand 17 m
where a real pylon is thirty or more, because every camera here eats vertical
frame and a true-height mast put its head off the top of the screen - leaving a
bare pole, which is a pole and not a floodlight.

#### Sky, cloud and a tree line

The sky was one dark gradient and the ground beyond the stands was nothing,
which read as emptiness rather than as evening. Three whole looks now - day,
dusk and night - each a row of colours in `content/skies.js`, plus cloud and a
line of trees at the four corners.

All of it static, so all of it lands in the same pre-rendered backdrop as the
terracing and costs nothing per frame. That needed no measuring: it is one blit
either way.

**The one thing that is not taste: a lit floodlight needs darkness to be in.**
A glowing pylon against a bright noon sky looks like a mistake, so `floodlight`
is a number in the palette - zero at midday, half at dusk, full at night - and
a sky that says it is daytime turns the glow off. Same reason the grass carries
a wash per palette: a night pitch is not dark green, it is green with a lot of
blue over it, and that is most of what makes floodlit turf read as floodlit.

Clouds are placed in the world rather than on the screen, at a few hundred
metres and ringed all the way round. Screen-space clouds would be cheaper and
would sit in exactly the same place whichever way you were facing, which is the
one thing a sky must not do.

**The trees had to go beyond the stands, and the first attempt did not.** At
58 m out they were *inside* the side stands, which reach 59, so the near pair
towered over the whole ground from twenty metres away. Trees outside a stadium
are behind the stands and show through the gaps - and the gaps are the only
place there was a hole to fill.

Nothing here moves a stand or shortens one. From behind the taker the stand
still fills the frame and none of this is visible, which is correct: from that
seat you cannot see the sky either. The angled camera is nearly the same, so in
practice this is scenery for the camera behind the goal, which is the one that
had nothing.

#### Settings, behind one button

Sound and time of day were two more buttons in the row that says what you are
playing. On a phone that row ran underneath the camera list, which sat on top
of them and swallowed the tap - so neither control could be reached at all.
They are settings rather than things you reach for mid-shot, so they went
behind one button and into a dialog sharing the naming dialog's chrome.

That alone was not enough. The mode row still overlapped, so on narrow screens
the labels shorten - `1P`, `v CPU`, `2P` - with the full wording kept as the
accessible name rather than removed, so a screen reader still hears "1 player".

Worth recording as a pattern rather than a one-off: this bar has now overflowed
twice, once when **v computer** was added and again with the time of day. A
control bar that grows a button per feature will do it again.

**The shot log is a button here, and only a button.** It was `L` and nothing
else for five phases - the one thing in the game with no way in that did not
require reading this document first, which is a strange property for the
feature every tuning decision came out of. It went into settings rather than
the bar because it is a diagnostic and not something you reach for between
penalties, and the bar is the thing that keeps overflowing.

**The key is gone, and so is the line at full time that advertised it.** It was
kept at first on the grounds that it cost nothing and was already in somebody's
fingers. That was true and it was still two ways to do one thing, one of which
needed telling people about in three documents - and the full-time screen was
spending a line of its own on the half that could not be found. One way in,
where it can be seen. The label carries the count, "Download shot log (47 shots)",
and the button is disabled at zero: a button that hands you an empty file is
worse than no button. Next to it is **Clear the log**, which arms on the first
press and wipes on the second. One press would put an irreversible wipe of every
sitting a thumb's width from the button people actually came for, and `confirm()`
is not the answer, because it freezes the page for anything driving the browser -
which is how this gets checked.

**The far goal is stroked, not filled, and that is a deliberate lie.** A post is
12 cm across, which at 105 m is a third of a pixel; filled honestly it vanished
into the antialiasing and the far end had no goal in it. A stroke with a floor
on its width keeps it visible. Same defence as the ball's outline: it changes an
apparent width by a fraction of a pixel, and nothing can be aimed at it, hit it,
or be judged against it.

It also had to move in the draw order. Drawn with the pitch it was invisible for
a second reason - the far hoardings are six metres further away but painted
later, so they covered it. It belongs after the stand and before everything at
this end, which is where it sits in depth.

#### The sounds, and where they come from

Eight, which is the list as asked for:

| Sound | When |
| --- | --- |
| **Crowd bed** | Always, under everything, building while the taker sets up |
| **The rise** | At the strike, the intake of breath a struck ball gets |
| **Goal** | The cheer |
| **Save** | Not the cheer. A different reaction, and the one that sells a keeper |
| **Boot** | Contact |
| **Glove** | The keeper getting a hand to it |
| **Frame** | Post or bar. The same aluminium either way, so one sound |
| **Net** | The ball arriving in it |

**The events already happen; they are not yet events.** `flight.ts` knows about
woodwork contact, parries and the ball entering the net, but it knows them as
*state*, and the loop steps the simulation up to several times per rendered
frame. Anything watching for "is the ball touching the post" fires repeatedly on
one contact, or misses it between frames.

So the simulation grows a discrete event stream: each step may emit
`{ kind: 'boot' | 'glove' | 'frame' | 'net', at }`, and `FrameState` carries
whatever was emitted since the last render. This is the same seam the rest of the
design already uses, one layer down: **`core/` names what happened, and never
decides what it sounds like.** A `core/` that imports an `AudioContext` is the
same mistake as a `core/` that imports a canvas.

`Game.ts` drains it and hands it to the active
[presentation package](#presentation-packages), which decides both what the crowd does about
it and what it sounds like.

Those being one package's decision is the point: the rise on a goal and the cheer
on a goal are one event with two responses, and they cannot drift out of step
because nothing is keeping them in step. A package that wanted the crowd to react
late, or not at all, would be free to, and would be wrong in only one place.

It also pays for itself beyond this phase. Replay (Phase 5) wants exactly this
list, and so does any commentary line more specific than the outcome.

#### Synthesised by default, sampled where it showed

**Reversed in part, after listening.** The argument below still holds for the
default set every package inherits, which is still synthesised and still
weighs nothing. But a crowd is thousands of throats that filtered noise never
quite lies about convincingly, and once the first three samples went in the
same reasoning took the rest of the crowd with them. The `classic` package now
ships six sample files, which is exactly the escape hatch the package model was
built with: a package that wants samples ships them and inherits the weight and
the licence question along with them.

The set, and why it is shaped this way: the crowd bed, the cheer, the "oooh" of
a save and the groan of a miss all come off **one afternoon at one ground,
recorded by one person through one microphone**. That is the thing worth more
than any individual sample being better. A cheer borrowed from a different
crowd in a different building always sounds borrowed, however good it is alone
- the reverb tail disagrees with the bed underneath it and the ear hears the
edit. The boot and the netting are close-mic'd one-shots where none of that
applies, so they come from wherever they were best.

What stayed synthesised: the glove, the woodwork, and the referee's whistle.
Short, physical, and in the frame's case better made than found, because a made
post can ring at whatever pitch suits.

What the reversal cost, recorded so the trade is visible: 246 KB of audio, and a
`CREDITS.md` naming a source, an author, a licence and a retrieval date for
each file. Every licence was checked by reading it on that sound's own page
rather than trusting a search filter, because a public repo redistributes what
it commits.

**Five of the six are CC0. The cheer is not.** It is under the Pixabay Content
Licence, which permits free commercial use without attribution but forbids
distributing content "on a Standalone basis" - and committing an mp3 to a
public repo is arguably that, while a modified file embedded in a game is
arguably not. It was chosen knowingly, by ear, over a CC0 alternative taken
from the same recording as the bed. `CREDITS.md` says so at the top and in the
entry, so that nobody reads the set as uniformly CC0 and so the decision is
visible rather than inherited. Nothing blocks on them, nothing throws if they are missing,
and every branch that cannot play a sample calls straight through to the
synthesised sound that was always there - verified by deleting the directory
and playing a shootout.

One thing the samples found rather than caused: the boot had never been
audible. `createFlight` emits it as the flight is built, and `Game.ts` was
calling that without an event sink, so the one event that starts every shot was
going to `NO_EVENTS` and being dropped. A passing test covered the emit, which
is why it survived - the test called `createFlight` with a sink, and the game
did not. Nobody noticed while the boot was a noise burst among other noise
bursts; putting a real contact sound on it made its absence obvious in a
minute.

#### The synthesis that remains

The decision this section originally made, which still governs everything not
listed above. Sound is generated at runtime with Web Audio.

A crowd bed is filtered noise with slow modulation on gain and cutoff. A cheer is
the same source with the envelope opened and the filter swept up. A boot is a
short noise burst through a bandpass with a fast decay; a glove is a duller,
shorter one; a post is a damped sine in the 400-900 Hz region with a long tail,
because aluminium rings; a net is a brief high-passed burst.

Why, in order of how much each actually matters here:

- **The licensing question disappears rather than having to be got right.** This
  repo is public, so committing a sound file redistributes it, and every sample
  would need a licence that permits that plus a source anyone can check. Nothing
  to get wrong beats a rule to follow. See [Licensing](#licensing).
- **Weight.** The whole site is text. A usable crowd loop is several hundred
  kilobytes and would be, comfortably, the largest thing in it.
- **It is consistent with everything else here.** The pitch, the goal, the net,
  the keeper and the taker are all drawn rather than imported. Sound being the
  one thing fetched from elsewhere would be the odd decision, not this one.
- **It is a good contribution surface.** `content/sounds.js` full of frequencies
  and decay times is the same kind of file as `keepers.js`: edit a number,
  refresh, hear the difference.

**The risk, stated plainly: synthesised crowds can sound cheap, and this one
might.** It is the same class of bet as the curve, which was physically correct
and inaudible in the game until it was played. The mitigation is the same too -
it gets judged by listening, not by reasoning - and the fallback is cheap,
because the seam is an interface. Swapping synthesis for samples changes one file
behind `presentation/sounds/Sounds.ts` and nothing that calls it - or, better, changes
nothing at all and ships as a package that overrides the defaults.

#### The things that are easy to get wrong

**Nothing plays before a gesture.** Browsers will not start audio until the user
has interacted, and fighting that is pointless. The first pointer down on the
pitch unlocks the context and starts the bed. Before that there is nothing to
hear about anyway.

**No sound may differ by where the keeper picked.** The handover screen is opaque
on purpose, and that was checked by counting red pixels on the canvas. An audio
cue that varied with the pick would leak the only secret the format has, through
a channel nobody thought to check. The keeper choosing a corner is silent, and
the bed does not change. The crowd is under the same rule: nobody in the stand
leans the way the keeper is about to go.

**Muting is a real setting.** A visible toggle, stored in `Settings` alongside
`viewId` and `duelNames`. Default on: the gesture gate means sound can never
arrive before you have touched the page, and a football game that is silent until
you find a switch is not the thing that was asked for.

**Audio is not unit-testable and the event stream is.** That split is the whole
value of doing it this way, and the tests are the ones that would have caught
bugs this project has already had:

- Exactly one `frame` event per woodwork contact, not one per simulation step.
- No `net` event on a shot that missed. The netting caught wide shots once
  already, and it took playing it to notice.
- No event emitted twice when the accumulator runs several steps in one frame.
- Events in time order, and drained exactly once.

**And one thing this list cannot cover, learned the hard way.** Every test above
passes a sink, which proves the simulation emits. None of them can prove the
*caller* is listening - and it was not. `Game.ts` built each flight without
passing the sink, took the `NO_EVENTS` default, and silently dropped the boot on
every shot ever taken. Nobody noticed while the boot was one synthesised burst
among others; a real kick sample made the silence obvious in seconds.

The fix is not another test, because no test at this level can see that wiring.
The sink is now a required argument, so forgetting it is a type error rather
than a quiet nothing, and a caller that genuinely wants silence says `NO_EVENTS`
and means it. Same principle the licensing decision used: nothing to get wrong
beats a rule to follow.

Whether it sounds good, and whether the crowd reads as a crowd, are both decided
by playing it. Which is the same answer this document gives about views.

Phases 0 to 3 were the solo build, and all of them have shipped. Phases 4 and 5
are the ones worth handing over, because they are self-contained and visibly
change the game.

## Contribution surfaces

Deliberately two tiers, because the people this is for are at very different points.

The jobs themselves are written up for the people doing them in
[deadball-jobs.md](deadball-jobs.md), which is the document to
hand somebody rather than this one. What follows is why it is split the way it
is.

**Tier 1 - data only, no build knowledge, immediate visual feedback.** Every one of these is a single file edit and a page refresh. What exists today:

- Add players to `content/players.js`, spending 375 points across five skills.
  Since Phase 4 they
  appear in the picker with no second edit anywhere.
- Write keeper personalities in `content/keepers.js` (names, reaction times, how much they guess).
- How the computer takes a penalty, in `content/takers.js`.
- Every sound, in `content/sounds.js`.
- What the advertising hoardings say, in `content/boards.js`. No real people's
  names, per [What not to commit](#what-not-to-commit).
- Times of day, in `content/skies.js`.
- How a shot is struck, in `content/shots.js` - every field is a multiplier, so
  1 means "leave it alone" and the file is safe to argue with.
- Tune difficulty numbers and see the game get harder.

Named here before they existed, and still not built: `content/celebrations.js`
and `content/palettes.js`. Both are wanted, and celebrations is written up as a
job. Listing them as though they were there was the kind of thing that sends
somebody looking for a file that does not exist.

**Tier 2 - feature work with a clear boundary:**

- A new view. One file plus one registry line, with three existing implementations to read first.
- A record that follows the player. Every shot already logs a `playerId` and
  nothing reads it back, so nobody can say whether one player suits them better
  than another.
- Keeper AI improvements: the profile struct is the whole surface area.
- Physics tuning with the test suite as a safety net.

Built since this list was written, and left here because what they cost is the
useful part: sound (Phase 3.5) turned out to be Tier 1, because every sound is
a handful of numbers and judging one needs ears rather than a build step. The
custom player editor (Phase 4) was Tier 2 as predicted - a self-contained form
plus storage calls - and the part that took the thought was none of that, it
was deciding what to do with numbers that arrive off a disk.

## Testing

`core/` is pure functions over plain data, so it is testable without a browser, a framework, or a dependency. Node 25 strips TypeScript types natively, so `.ts` test files run directly with no build step and no test framework. Verified on Node v25.1.0.

`npm run test:game`, which is `node --test 'src/games/deadball/**/*.test.ts'`. **The quotes are load-bearing** - `sh` does not expand `**` recursively, so unquoted it silently matches only `core/` and a whole directory of tests reports as passing by not running.

The constraint that comes with type stripping: no TypeScript constructs that emit runtime code. No `enum`, no `namespace`, no constructor parameter properties. Interfaces, type aliases, generics, and `as` are all fine, and the code above uses nothing else. Union types instead of enums, which is the better habit anyway.

Worth testing:

- A known `ShotInput` with a fixed seed produces an exact `Outcome`. This is the regression net for every physics change.
- Aim error stays inside the cone implied by `accuracy` across many seeds.
- A keeper with `reactionMs` above the flight time never saves.
- The wall blocks a straight shot at the position it is meant to and a curled one gets past it.
- Schema migrations move a v1 record to v2 without loss. Not built, and neither is `schema.ts`.

Two habits that the bugs below argued for, rather than anything theoretical:

- **`core/` is checked for portability by a test**, not by intention. No import
  outside `core/` and `content/`, no browser or Node global, no wall clock, and
  a whole shootout run start to finish on those imports alone. The two-devices
  plan rests on that being true; an intention at the top of a file is not a
  guarantee.
- **A test is not trusted until it has been seen to fail.** Every assertion of
  the "nothing may ever do X" kind here has been run against a planted X. Two
  have been written that passed against the thing they were meant to catch:
  a name-leak check whose `\bname\b` never matched `takerName`, and a check
  that an SVG was hidden, which passed because the attribute was set and the
  attribute does nothing.

Not worth testing: rendering. Compare views by playing them.

Worth checking by looking, which is not the same as testing: **anything whose
failure is visual and silent.** Both of the recent ones were - see the fifth and
sixth entries in [What playing it kept
finding](#what-playing-it-kept-finding).

## Open questions

1. **Does the drag gesture read as natural?** Still the riskiest thing here, and now it can be answered by playing it rather than by reasoning. Phase 1 shipped the coupled version: the drag vector sets direction *and* power together, so aiming at the top corner and hitting it softly is not a thing you can do. **Lift is half answered now, and by something other than the gesture.** Free kicks needed a trajectory the flat solve could not produce, so `loft` arrived: it spends part of the speed budget going up, and it is driven by the taker's `dip` rather than by anything the player does with their hand. That was the right first move - it made over-the-wall possible without inventing a second gesture, and it gave the fifth attribute a job. It is not the whole answer. **Choosing the arc is still not something the player does**, and a free kick where you pick how much to float it is a better game than one where your footballer picks for you. The axis is still there to design; it is now the difference between a specialist and a decision rather than between a mechanic and nothing.
2. **Which view wins?** Still open, and now open with evidence rather than without it. All three shipped in Phase 2 and `behind-taker` has stayed the default through every session since, which is weak evidence at best: it is also the one the game opens on. Phase 3.5 puts a thumb on the scale, because a raked stand behind the goal is worth most to the two views that can see it, and nothing at all to `keeper-cam`.
3. **Does cross-client determinism hold?** Untested until two browsers run the same seed. Mitigated by sending the outcome alongside the input, so a divergence degrades to a logged warning rather than a desync.
4. **How hard should the keeper be by default?** Measured rather than open now. Two logged sessions put it at 85% scored before the retune with zero saves, and 63% after with 15% saved and 18% off the post. That is about right, and the numbers came from the log rather than from anyone's opinion.

5. **The game has one correct answer, and both testers found it.** Aim about
   0.7 to one side, near full power, release in the green. Two independent
   sessions converged on the same spot, and 65% of all shots crossed beyond the
   keeper's physical reach. Nothing punishes repetition, so there is no decision
   to make after the first shootout. A keeper that reads your pattern - go the
   same way three times and it starts going with you - is the obvious answer,
   and the full-time summary above is the fair way to warn the player it exists.
   Lean: build it, but only after the summary, so nobody is punished by a
   pattern they were never shown. **Partly answered by accident.** A human keeper
   in Phase 3 reads patterns without any code, and the first logged duel split 23
   left to 20 right against 66/90 in the solo sessions. That is one session and
   not a finding, but it points at the cheaper fix: the dominant strategy may be
   a symptom of playing alone rather than of the keeper. Phase 3.75 gives that
   a way to be tested without needing two people: the computer taker is built
   never to converge on a spot, so a player who finds one anyway is telling us
   something about the keeper rather than about the format.
6. **What should the route actually be?** `/deadball/` is the working assumption. A less guessable slug buys very little given the page is `noindex` and linked from nowhere.

## Licensing

The repo declares `Creative Commons - Attribution 3.0` in `package.json`, which
is right for the writing and wrong for the game.

**Creative Commons recommend against using CC licenses for software**, and say
so themselves. The reasons matter here rather than being pedantry:

- CC licenses say nothing about **patents**. Every mainstream software license
  either grants patent rights explicitly (Apache-2.0) or is understood by
  convention to (MIT).
- They say nothing about **source versus object code**, so what "attribution"
  means for a bundled, minified build is undefined.
- Their warranty disclaimers are written for creative works. Nobody forks a
  photograph and ships it in production.

This is not hypothetical for this project. The game is a few thousand lines of
engine that somebody could reasonably lift - the physics and the spin-blind
predictor are the useful parts - and it is the one thing in the repo with
contributors other than Phil.

**Settled: BSD-3-Clause, scoped to `src/games/deadball/`.**

Every permissive license requires attribution - MIT's single condition is that
the copyright notice travels with any copy, and that is already what "credit me
if you use it" means in practice. The third clause is what BSD adds over MIT
and it is the one worth having here: nobody may use the copyright holder's or
the contributors' names to promote a derived work without asking. MIT does not
stop that, and a personal site is exactly the context where somebody else's
project implying an endorsement would matter.

Apache-2.0 would have been stronger again - a NOTICE file is a defined place
for attribution to live, and there is an explicit patent grant - at roughly ten
times the length. The patent risk on a penalty game is not real, and the length
is a cost paid by the people least likely to read it.

Not the whole repo. The posts stay CC-BY: that license is correct for them and
changing it would relicense twenty-one years of writing to solve a problem in
one directory. `package.json` now carries `CC-BY-3.0`, which is the same
license it always declared, written as a valid SPDX identifier so that tooling
reading that field gets an answer.

- [x] `src/games/deadball/LICENSE`
- [x] A line in `AGENTS.md` under Layout saying the game is separately licensed
- [x] `package.json` normalised to a valid SPDX identifier

**The copyright line reads "Phil Leggetter and contributors" deliberately.** If
the squad and keeper files end up largely somebody else's work, they are
authors, and the honest thing is to say so rather than quietly assigning
everything to one person. "and contributors" credits them without publishing
anybody's name in a public repo, which is the other constraint this project has
been working under throughout.

## What not to commit

This repo is public, and this file lives in it.

- No names or ages of the kids, here or in commit messages. The squad, the keeper names, and the celebration lines are all places where an in-joke could put a real name on the public web without anyone deciding to.
- No real footballer names, photos, or club badges, per the squad decision above.
- No real people's names on the advertising hoardings. Brands are a separate
  question and an allowed one - see [the boards](#what-is-behind-the-goal) - but
  a board is a short string in a content file that renders straight onto the
  pitch, which makes it the easiest place in the project to put a real name on
  the public web without meaning to.
- **Nothing that requires attribution.** Settled after a CC-BY crowd recording
  turned up that was better than what it would have replaced. CC-BY permits
  everything this project needs and the obligation is small - credit the
  author, note the change, link the licence - but it has to be discharged
  somewhere a person *using* the work can find it, which means the game
  acquiring a credits screen it does not have and every future contributor
  remembering the rule. A standard nobody has to remember beats a small
  obligation that compounds. In practice: **CC0, or a licence that explicitly
  says attribution is not required.**
- Custom players live in `localStorage`, not in the repo.
- No names in the shot log. It is the one file here that leaves the device, and
  `takerSide` already says who did what. There is a test that fails if a field
  carrying a name is added to `ShotRecord`.

## Suggested actions

- [ ] Confirm the route, the phase order, and the drag gesture as described
- [ ] Decide on PostHog analytics for the hidden page (lean: keep)
- [ ] Build Phase 0 and confirm the hidden page passes `npm run build && npm run verify`
- [ ] Build Phase 1 and play it before building anything else
- [ ] Build Phase 2, play both views back to back, set a default
- [ ] Pick which of Phases 4 and 5 gets handed over first

---

_Drafted by Claude from a spec conversation, then reviewed and edited by Phil._
