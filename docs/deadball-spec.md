# Dead Ball - plan and spec

_Status: Phases 0, 1 and 1.5 built and playable at `/deadball/`. Around 75 tests, a typecheck, and tuning measured rather than argued. The thing this project is for - other people contributing to it - has not started._

## Summary

| | |
| --- | --- |
| **Decision** | Build a drag-to-shoot penalty and free kick game on a hidden page at `/deadball/`, as a vanilla TypeScript engine with swappable view renderers, sized so that a second and third contributor can add features without touching the physics. |
| **Next steps** | - Hand over: roster and keeper files for a first contribution, a feature for a second<br>- Phase 2: second and third cameras plus the switcher<br>- Then a keeper that reads your pattern, because both testers found the one shot that always works |
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
- Sound, beyond a hook where it will eventually go.
- Mobile-*first* polish. It is designed against a laptop. It does have to work on
  a phone, which as of Phase 1.5 it does not - see [Any shape of
  screen](#any-shape-of-screen).

## Measures of success

- ~~Phase 1 is playable by a person who was not told how it works.~~ Done, and
  two people have put 200 shots through it.
- Both views get played back to back and one of them wins on feel, not on
  argument. **The three exist; which one wins is still open**, and is now a
  question of playing rather than of building.
- **The kids each land a merged change.** Still the real measure, and still
  unmet: every commit so far is one person and an assistant. The surfaces exist
  and work, which was the hard part; nobody has been handed them, which is not.
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
| Shot types | Penalties first, free kicks second | Free kicks add a wall, variable distance, and variable angle. Penalties are the same game with all three fixed, so they are strictly a subset |
| Views in v1 | `behind-taker` and `angled-behind`, swappable at runtime | Undecided which feels better, and the swap costs little once the projection boundary exists |
| Art | 2D canvas primitives now, pixel art later | Pixel art needs assets, which is the slow part. The renderer interface is what makes it a later decision instead of a rewrite |
| Roster | Invented players shipped as data, plus a custom player editor | No likeness or trademark exposure on a public site, and inventing players is a good first contribution |
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

### Module layout

```
src/games/deadball/
  LICENSE                     # MIT. The rest of the repo is CC-BY-3.0.
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
    names.ts                  # what the two people in a duel are called
    events.ts                 # discrete things worth hearing (Phase 3.5)
    wall.ts                   # free kick wall (Later, not built)
  render/
    Package.ts                # what a render package implements
    cameras.ts                # where you may stand. Data, shared by all of them
    registry.ts               # id -> package
    sounds/                   # the default set. Any package may override it.
      Sounds.ts               # an event in, a noise out
      synth.ts                # the only file that knows AudioContext
      silent.ts               # no-op, for tests and for the mute toggle
    classic/                  # today's look. The only place a ctx exists.
      draw.ts                 # pitch, goal, net, figures, ball, HUD, full time
      project.ts              # this package's camera maths
      aim.ts                  # drag -> ShotInput, under this projection
      stand.ts                # terracing, hoardings, crowd (Phase 3.5)
      sounds.ts               # overrides, if any
    pixel/                    # later
  input/
    drag.ts                   # Pointer Events -> DragGesture
    keyboard.ts               # accessible fallback aim mode (not built)
  storage/
    Storage.ts                # the interface
    memory.ts                 # in-memory, used by tests
    local.ts                  # localStorage
    schema.ts                 # versioned shapes + migrations (Phase 4)
  telemetry/
    log.ts                    # one record per shot, on this device only
    analyse.ts                # what the log says, for full time and offline
  net/
    Transport.ts              # two devices (Phase 6, not built)
  content/                    # plain JS and JSON. The low-barrier zone.
    players.js
    keepers.js
    sounds.js                 # frequencies and decay times (Phase 3.5)
    boards.js                 # what the hoardings say. No real people's names
  Game.ts                     # wiring: input -> match -> view, the frame loop
  main.ts                     # browser entry, imported by the Astro page
```

`core/` importing anything from `render/`, `input/`, or the DOM is the one rule that keeps all of this true. Worth a lint rule or, failing that, a note at the top of each `core/` file.

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

Not in the first draft of this document. It came from Max, and it is the second
skill axis: the drag says what you intend, the release says whether you managed
it.

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
package - see [Render packages](#render-packages) - where "shared by every view"
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

### Render packages

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
render/
  Package.ts        # what a package implements
  cameras.ts        # where you are allowed to stand. Data.
  registry.ts       # id -> package
  sounds/           # the default set. Any package may override any of it.
  classic/          # today's look: canvas2d, drawn figures, synthesised sound
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

It also settles a tension in [Synthesised, not sampled](#synthesised-not-sampled)
rather than reopening it. The default set is synthesised, for the reasons given
there. A package that wants to ship sample files is free to, and inherits the
consequences along with the sounds: the weight lands in that package, and so
does the licensing question. Neither is the default's problem any more.

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

### Switching views

- `?view=angled-behind` in the URL wins, for sharing a specific one.
- Otherwise, the stored setting.
- Otherwise, the default.

An always-visible switcher in v1, since comparing the two is the entire reason both exist. It can move behind `?dev=1` once one of them wins.

Registered as `id -> factory` in `render/registry.ts`. Adding a view is one file plus one registry line, and that is the test of whether the boundary held.

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

Keys namespaced `deadball:v1:*`. A `ps:schema` record holds the version, and `schema.ts` owns the migration functions. The migration path exists from the first release, because the first schema change happens the first time someone adds a field to a player.

Stored: settings (view id, difficulty, sound), profile (display name), custom roster, stats (best scores, longest streak, per-keeper record), and a capped match history.

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
keeps. Five each, ten shots.

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
- **No name goes in the shot log.** The log is exported by keypress and handed
  to someone else to read, which makes it the one file in the game that leaves
  the device a name was typed on. `takerSide` already records who did what, and
  a side means nothing without the export in front of you. There is a test that
  fails if a field carrying a name is ever added to `ShotRecord`. The form is
  also marked `ph-no-capture`, because this site loads PostHog on every page and
  the promise printed under the form should be kept by the page rather than by a
  setting in a dashboard.

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

### Two devices, later

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

## Roster and attributes

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

The custom player editor is a form that writes to `deadball:v1:roster:custom`. It ships in Phase 4 and is deliberately a separate, self-contained feature.

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
| **3.5** ✅ | `presentation/` packages with the cameras lifted out as data, an event stream out of `core/`, a raked stand with hoardings and an animated crowd, and synthesised sound. See [Render packages](#render-packages) and [A crowd, and something to hear](#a-crowd-and-something-to-hear) | It feels like a penalty rather than a diagram |
| **4** | Pick your player before a shootout, and add your own | The roster is worth editing |
| **5** | Replay any shot from the log, through any camera. Half built: every record already carries a tuning fingerprint | Watch that again, from behind the goal |
| **6** | Two devices, a game per URL, no login. See [Two devices, later](#two-devices-later) | Play somebody who is not in the room |
| **Later** | A keeper that reads your pattern, free kicks and the wall, pixel art, side-on view, a leaderboard | |

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

### What playing it kept finding

Bugs of the same shape, which is worth writing down because a fifth is
probably in here somewhere. Make that five, and the fifth is not a bug in the
simulation at all.

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

The common thread: all five were found by playing or by measuring, and none by
reading the code. The shot log exists because of it. The fifth is the one that
argues hardest for the log - it was a question about a screenshot, and the log
could not answer it, because it recorded no side. It does now.

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
binding constraint at all. 3,576 people hold 60 fps at 1280 px and at 390 px
with the CPU throttled six times over. 2,451 of them survive culling and become
one `drawImage` each; the other 31% are rejected on a comparison, before the
second projection is even computed.

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

**It is a per-camera feature, not a scene feature, and that is worth knowing
before it is built.** `behind-taker` looks straight at it and gets the most.
`angled-behind` sees it obliquely, and is the view a raked stand will flatter
most. `keeper-cam` looks out from the goal, so all three of these are behind the
camera and that view gets none of them.

Modelling a second stand behind the taker is the same code and would fix it, but
it is not what was asked for, so: one stand now, the keeper-cam consequence
recorded here rather than discovered later, and a second stand if that view
starts to look empty next to the other two.

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
[render package](#render-packages), which decides both what the crowd does about
it and what it sounds like.

Those being one package's decision is the point: the rise on a goal and the cheer
on a goal are one event with two responses, and they cannot drift out of step
because nothing is keeping them in step. A package that wanted the crowd to react
late, or not at all, would be free to, and would be wrong in only one place.

It also pays for itself beyond this phase. Replay (Phase 5) wants exactly this
list, and so does any commentary line more specific than the outcome.

#### Synthesised, not sampled

The decision with consequences. Every sound above is generated at runtime with
Web Audio, and the repo ships no audio files.

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
behind `render/sounds/Sounds.ts` and nothing that calls it - or, better, changes
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

Whether it sounds good, and whether the crowd reads as a crowd, are both decided
by playing it. Which is the same answer this document gives about views.

Phases 0 to 3 were the solo build, and all of them have shipped. Phases 4 and 5
are the ones worth handing over, because they are self-contained and visibly
change the game.

## Contribution surfaces

Deliberately two tiers, because the two contributors are at very different points.

The jobs themselves are written up for the people doing them in
[deadball-jobs.md](deadball-jobs.md), which is the document to
hand somebody rather than this one. What follows is why it is split the way it
is.

**Tier 1 - data only, no build knowledge, immediate visual feedback.** Every one of these is a single file edit and a page refresh:

- Add players to `content/roster.json`.
- Write keeper personalities in `content/keepers.js` (names, reaction times, how much they guess).
- Celebration and commentary lines in `content/celebrations.js`.
- Kit and pitch color palettes in `content/palettes.js`.
- What the advertising hoardings say, in `content/boards.js`. No real people's
  names, per [What not to commit](#what-not-to-commit).
- Tune difficulty numbers and see the game get harder.

**Tier 2 - feature work with a clear boundary:**

- Sound (Phase 3.5). Every sound is a handful of numbers in `content/sounds.js`,
  and judging whether one is right needs ears rather than a build step.
- A new view. One file plus one registry line, with two existing implementations to read first.
- The custom player editor (Phase 4). A self-contained form plus storage calls.
- Keeper AI improvements: the profile struct is the whole surface area.
- Physics tuning with the test suite as a safety net.

## Testing

`core/` is pure functions over plain data, so it is testable without a browser, a framework, or a dependency. Node 25 strips TypeScript types natively, so `node --test src/games/deadball/core/*.test.ts` runs `.ts` files directly with nothing added to `package.json`. Verified on Node v25.1.0 against a throwaway typed test file, which passed.

The constraint that comes with type stripping: no TypeScript constructs that emit runtime code. No `enum`, no `namespace`, no constructor parameter properties. Interfaces, type aliases, generics, and `as` are all fine, and the code above uses nothing else. Union types instead of enums, which is the better habit anyway.

Worth testing:

- A known `ShotInput` with a fixed seed produces an exact `Outcome`. This is the regression net for every physics change.
- Aim error stays inside the cone implied by `accuracy` across many seeds.
- A keeper with `reactionMs` above the flight time never saves.
- The wall blocks a straight shot at the position it is meant to and a curled one gets past it.
- Schema migrations move a v1 record to v2 without loss.

Not worth testing: rendering. Compare views by playing them.

## Open questions

1. **Does the drag gesture read as natural?** Still the riskiest thing here, and now it can be answered by playing it rather than by reasoning. Phase 1 shipped the coupled version: the drag vector sets direction *and* power together, so aiming at the top corner and hitting it softly is not a thing you can do. Lift is not wired to the gesture at all yet, and is pinned at 0.5. That is the axis to design once the rest feels right.
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
   a symptom of playing alone rather than of the keeper.
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
the roster and keeper files end up largely somebody else's work, they are
authors, and the honest thing is to say so rather than quietly assigning
everything to one person. "and contributors" credits them without publishing
anybody's name in a public repo, which is the other constraint this project has
been working under throughout.

## What not to commit

This repo is public, and this file lives in it.

- No names or ages of the kids, here or in commit messages. The roster, the keeper names, and the celebration lines are all places where an in-joke could put a real name on the public web without anyone deciding to.
- No real footballer names, photos, or club badges, per the roster decision above.
- No real people's names on the advertising hoardings. Brands are a separate
  question and an allowed one - see [the boards](#what-is-behind-the-goal) - but
  a board is a short string in a content file that renders straight onto the
  pitch, which makes it the easiest place in the project to put a real name on
  the public web without meaning to.
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
