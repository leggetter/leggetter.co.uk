# Penalty Shootout - plan and spec

_Status: Phases 0 and 1 built and playable at `/penalty/`. Tuning now comes from logged sessions rather than from opinion; see [Full time](#full-time-what-the-shot-log-knows)._

## Summary

| | |
| --- | --- |
| **Decision** | Build a drag-to-shoot penalty and free kick game on a hidden page at `/penalty/`, as a vanilla TypeScript engine with swappable view renderers, sized so that a second and third contributor can add features without touching the physics. |
| **Next steps** | - Phase 1.5: full-time summary, a taker figure, a better keeper<br>- Phase 2: second and third cameras plus the switcher<br>- Then a keeper that reads your pattern, because both testers found the one shot that always works |
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
- Mobile-first polish. It should work on a phone, but it is being designed against a laptop.

## Measures of success

- Phase 1 is playable by a person who was not told how it works.
- Both views get played back to back and one of them wins on feel, not on argument.
- The kids each land a merged change. That is the real measure, and it is the one that most likely fails, because it depends on the contribution surfaces actually being small enough.
- A third renderer can be added later without editing anything under `core/`. Testable: if it needs a `core/` change, the boundary was wrong.

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
src/games/penalty/
  core/                       # TypeScript. No DOM, no canvas, no browser APIs.
    units.ts                  # pitch, goal, ball constants in meters and kg
    vec3.ts                   # minimal vector math
    rng.ts                    # seeded PRNG (mulberry32), explicit state
    types.ts                  # ShotInput, Shot, FrameState, Outcome, ...
    physics.ts                # integrate one step: gravity, drag, Magnus
    predict.ts                # where a SPIN-FREE ball lands. See below.
    shot.ts                   # ShotInput + Player + RNG -> Shot
    keeper.ts                 # keeper decision model -> dive
    flight.ts                 # one shot start to finish: ball + keeper + rules
    wall.ts                   # free kick wall placement and collision (Phase 3)
    rules.ts                  # outcome detection at the goal line
    match.ts                  # pure reducer: (state, MatchMessage) -> state
  render/
    View.ts                   # the interface
    project.ts                # shared camera + projection helpers
    registry.ts               # id -> view factory
    canvas2d/
      draw.ts                 # shared primitives: pitch, goal, net, ball, keeper
      BehindTakerView.ts
      AngledBehindView.ts
  input/
    drag.ts                   # Pointer Events -> DragGesture
    keyboard.ts               # accessible fallback aim mode
  storage/
    Storage.ts                # the interface
    memory.ts                 # in-memory, used by tests
    local.ts                  # localStorage
    schema.ts                 # versioned shapes + migrations
  net/
    Transport.ts              # the interface
    local.ts                  # hotseat / same-tab
  content/                    # plain JS and JSON. The low-barrier zone.
    roster.json
    keepers.js
    celebrations.js
    strings.js
    palettes.js
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
  | 'wide' | 'over' | 'blocked';   // blocked = free kick wall
```

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

Keys namespaced `ps:v1:*`. A `ps:schema` record holds the version, and `schema.ts` owns the migration functions. The migration path exists from the first release, because the first schema change happens the first time someone adds a field to a player.

Stored: settings (view id, difficulty, sound), profile (display name), custom roster, stats (best scores, longest streak, per-keeper record), and a capped match history.

## Two-player readiness

Nothing in v1 is multiplayer. Three things make it possible later without a rewrite, and all three are cheap now:

1. The match is a pure reducer over messages.
2. `ShotInput` plus a seed fully determines a shot.
3. A transport interface:

```ts
interface Transport {
  send(msg: MatchMessage): Promise<void>;
  subscribe(handler: (msg: MatchMessage) => void): () => void;
}
```

`LocalTransport` is an in-memory event emitter and is what hotseat uses. A remote implementation over WebSockets backed by a Cloudflare Durable Object is the natural fit on this stack, and is out of scope here.

Hotseat two-player is therefore a small feature rather than a large one, which makes it a good candidate for handing over rather than building.

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

The custom player editor is a form that writes to `ps:v1:roster:custom`. It ships in Phase 4 and is deliberately a separate, self-contained feature.

## The hidden page

Hidden here means the same thing `draft: true` already means in this repo: **built, reachable, and pointed at by nothing.** Obscurity is not access control, and the spec should not pretend otherwise. Anyone with the URL can play it, and that is fine.

Route: `/penalty/`. Changes required:

1. **`src/pages/penalty/index.astro`** - a page that imports `src/games/penalty/main.ts` from a `<script>` tag. Astro compiles and bundles TypeScript in component scripts with no extra configuration, so no build tooling is added. This would be the first bundled client-side TypeScript in the repo; everything existing is either static HTML or `is:inline`.
2. **`src/layouts/Fullscreen.astro`** - add a `noindex` prop, defaulting to `false`, rendering the same `<meta name="robots" content="noindex, nofollow" />` that `Base.astro` already has. The page passes `noindex`, plus explicit `backHref="/"` and `backLabel="Home"`, since the current defaults point at the family tree.
3. **`astro.config.mjs`** - the sitemap `filter` currently excludes draft post paths. Add a `HIDDEN_PATHS` set alongside it and exclude both.
4. **`scripts/verify-urls.mjs`** - add `/penalty/` to the expected routes, and add a hidden-page assertion block mirroring the existing draft one: the page was built, it carries its `noindex` meta, and its path appears in no sitemap and no rendered page. The repo's existing position is that a flag nobody enforces becomes decoration, and this follows it.
5. **No nav entry** in `src/components/Header.astro`.
6. **No `robots.txt`.** The site has none today. Adding one to disallow `/penalty/` would publish the path to anyone who reads it, which is the opposite of the intent. `noindex` on the page is the stronger and quieter signal.

One thing to decide rather than assume: `Fullscreen.astro` renders `Analytics.astro`, so the hidden page will send PostHog events like every other page. That may be wanted, for seeing whether anyone finds it. It may not be. Lean: keep it, because the data is interesting and the page is not sensitive. Flagging it because it is the kind of default that is easier to notice now than later.

## Phases

Each phase ends with something playable. That is the constraint, not a nicety, because the point of building v1 solo is having something to hand over.

| Phase | Contents | Playable at the end |
| --- | --- | --- |
| **0** ✅ | Hidden page, layout change, sitemap filter, verify assertions, empty canvas, frame loop | Nothing, but the page is live on a preview URL and the plumbing is proven |
| **1** ✅ | `core/` (units, vec3, rng, physics, predict, shot, keeper, flight, rules, match), `BehindTakerView`, drag input, one keeper, 5 penalties, in-memory storage, 27 tests | Single-player penalty shootout |
| **1.5** | Full-time summary read off the shot log, a taker figure, a better keeper figure | The shootout ends with something, and there is somebody standing over the ball |
| **2** | `AngledBehindView` **and `KeeperCamView`**, view registry, `?view=` param, on-screen switcher | Same game, three cameras, compare and choose |
| **3** | Wall, variable position, free kick mode, lift input | Penalties and free kicks |
| **4** | `roster.json`, attributes into `resolveShot`, `localStorage` implementation, schema versioning, custom player editor | Pick a player, stats persist |
| **5** | `Transport`, hotseat two-player, alternating turns, sudden death | Two-player on one device |
| **Later** | Pixel art view, side-on view, sound, remote transport and leaderboard | |

Phase 1.5 is new, and all of it came out of playing rather than planning. The
keeper-cam moved up from Later into Phase 2 for the same reason: it is the view
that keeps getting asked for, and a view is cheap once the registry exists.

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

### Somebody to take the penalty

There is no taker in the game. The ball sits on the spot and nothing stands
over it, which was not a deferral - it was never specced. A figure that runs up
and strikes is also what would sell the keeper's anticipation, because right now
there is nothing on screen for the keeper to be reading.

Phases 0 to 3 are the solo build. Phases 4 and 5 are the ones worth handing over, because they are self-contained and visibly change the game.

## Contribution surfaces

Deliberately two tiers, because the two contributors are at very different points.

**Tier 1 - data only, no build knowledge, immediate visual feedback.** Every one of these is a single file edit and a page refresh:

- Add players to `content/roster.json`.
- Write keeper personalities in `content/keepers.js` (names, reaction times, how much they guess).
- Celebration and commentary lines in `content/celebrations.js`.
- Kit and pitch color palettes in `content/palettes.js`.
- Tune difficulty numbers and see the game get harder.

**Tier 2 - feature work with a clear boundary:**

- Hotseat two-player (Phase 5). The reducer and transport already exist; this is turn order and UI.
- A new view. One file plus one registry line, with two existing implementations to read first.
- The custom player editor (Phase 4). A self-contained form plus storage calls.
- Keeper AI improvements: the profile struct is the whole surface area.
- Physics tuning with the test suite as a safety net.

## Testing

`core/` is pure functions over plain data, so it is testable without a browser, a framework, or a dependency. Node 25 strips TypeScript types natively, so `node --test src/games/penalty/core/*.test.ts` runs `.ts` files directly with nothing added to `package.json`. Verified on Node v25.1.0 against a throwaway typed test file, which passed.

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
2. **Which view wins?** That is what Phase 2 is for. `keeper-cam` is now built alongside `angled-behind` rather than waiting on the answer, because it has been asked for repeatedly and it is the natural view for the keeper's turn in Phase 5.
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
   pattern they were never shown.
5. **What should the route actually be?** `/penalty/` is the working assumption. A less guessable slug buys very little given the page is `noindex` and linked from nowhere.

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

**Lean: MIT, scoped to `src/games/penalty/`.** Permissive, four paragraphs
long, and the one a fifteen-year-old can actually read. Apache-2.0 is the
better license on the merits because of the explicit patent grant, but the
patent risk on a penalty game is not real and the extra length is a cost paid
by the people least likely to get through it.

Not the whole repo. The posts stay CC-BY: that license is correct for them and
changing it would relicense twenty-one years of writing to solve a problem in
one directory.

- [ ] `src/games/penalty/LICENSE` with the MIT text
- [ ] A line in `AGENTS.md` under Layout saying the game is separately licensed
- [ ] Decide whether `package.json` should carry an SPDX expression instead of
      prose, since `Creative Commons - Attribution 3.0` is not a valid SPDX id
      and tooling reads that field

One thing to settle rather than let drift: **the kids' contributions.** In
practice this is a family project and nobody is going to argue about it. But if
the roster and keeper files are largely their work and the game is ever
published anywhere, the honest thing is that they are authors, and the copyright
line should say so rather than quietly assigning everything to one person.

## What not to commit

This repo is public, and this file lives in it.

- No names or ages of the kids, here or in commit messages. The roster, the keeper names, and the celebration lines are all places where an in-joke could put a real name on the public web without anyone deciding to.
- No real footballer names, photos, or club badges, per the roster decision above.
- Custom players live in `localStorage`, not in the repo.

## Suggested actions

- [ ] Confirm the route, the phase order, and the drag gesture as described
- [ ] Decide on PostHog analytics for the hidden page (lean: keep)
- [ ] Build Phase 0 and confirm the hidden page passes `npm run build && npm run verify`
- [ ] Build Phase 1 and play it before building anything else
- [ ] Build Phase 2, play both views back to back, set a default
- [ ] Pick which of Phases 4 and 5 gets handed over first

---

_Drafted by Claude from a spec conversation, then reviewed and edited by Phil._
