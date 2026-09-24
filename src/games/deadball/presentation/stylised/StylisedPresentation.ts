/**
 * The same game in three.js: stylised people, lit like a broadcast.
 *
 * Phase 4 of #72, and the package #64 asked for - a second one that changes
 * the rendering technology, not just the look, which is the strongest test the
 * `core/` to `presentation/` boundary can get. It reads the same `FrameState`,
 * turns drags into shots with the same mapping, and poses its people with the
 * same toolkit as classic. What it does not share is how any of it is drawn.
 *
 * **A preview.** Opt-in only (`?look=3d`, or Settings), never the
 * default, and only ever downloaded by somebody who picked it - see lazy.ts.
 *
 * How a frame is made:
 *
 * 1. The scene is moved to match the frame: people posed from the toolkit,
 *    the ball where core/ says, the crowd told the clock.
 * 2. three.js draws it into a WebGL canvas of this package's own, which is
 *    never in the page.
 * 3. That is copied onto the game's canvas with `drawImage`, and classic's HUD
 *    is drawn over it (see hud.ts).
 *
 * The copy is what lets this sit behind the `Presentation` contract unchanged.
 * The game gets a 2D context from its canvas before it knows which package it
 * has, and a canvas with a 2D context can never give out a WebGL one. Drawing
 * into a second canvas and copying costs one GPU texture copy per frame; it
 * also means the package works on a canvas that is not in the page at all,
 * which is what the frame-by-frame viewer (#86) does with a second copy of
 * whatever package is running. If the copy ever shows up in a profile, the
 * fix is to let a package ask for its own context, which is a contract change
 * and a separate decision.
 */

import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type WebGLRenderTarget,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { DEFAULT_SKY_ID, SKIES } from '../../content/skies.js';
import type { GameEvent } from '../../core/events.ts';
import { penaltySpot } from '../../core/setpiece.ts';
import type { Dive, FrameState, ShotInput } from '../../core/types.ts';
import { BALL_RADIUS } from '../../core/units.ts';
import { vec, type Vec3 } from '../../core/vec3.ts';
import { standBehind, type CameraSpec } from '../cameras.ts';
import type { DragGesture, DragPoint, Presentation, PresentationContext } from '../Presentation.ts';
import { recordedSounds } from '../sounds/recorded.ts';
import { moodOf, withOverrides, type Mood, type SoundSet } from '../sounds/Sounds.ts';
import { createSynth, type Synth } from '../sounds/synth.ts';
import { dragToShot } from '../toolkit/aim.ts';
import { takerDoing } from '../toolkit/doing/doing.ts';
import {
  awayTaking,
  keeperColours,
  kitsFor,
  restingKeeperColours,
  takerColours,
  wallColours,
} from '../toolkit/kits.ts';
import { BREATH_PERIOD, SWAY_PERIOD, TOWARD_TAKER, wave, type Figure } from '../toolkit/pose/figure.ts';
import { keeperPose } from '../toolkit/pose/keeper.ts';
import { takerPose } from '../toolkit/pose/kick.ts';
import { wallPoses } from '../toolkit/pose/wall.ts';
import { createProjector, type Projector } from '../toolkit/project.ts';
import { aimCamera, MIRROR, pointerOnGoal } from './camera.ts';
import { drawAim, drawAway, drawHandover, drawHud, drawKeepersTurn, drawShotDial } from './hud.ts';
import { buildPitch, lightBoards, makeCanvas, type Own } from './pitch.ts';
import { FrameBudget, pinnedQuality, QUALITY, type Quality } from './quality.ts';
import { GeometryCache, Rig } from './rig.ts';
import { buildSky, buildStadium, paintSky, type Sky, type Stadium } from './stadium.ts';

/** The day, dusk or night asked for, or the default. */
function skyFor(id: string): Sky {
  const skies = SKIES as Sky[];
  return skies.find((s) => s.id === id) ?? skies.find((s) => s.id === DEFAULT_SKY_ID) ?? skies[0]!;
}

/** Where the keeper with nothing to do stands. The same spot classic uses. */
const RESTING_KEEPER = { x: -6.5, z: -0.2 };

/**
 * How far to the side of the ball the taker waits, in metres: as far as the
 * screen allows, up to 1.55. Classic's rule, worked out the same way, so the
 * taker is standing in the same place in both looks.
 */
function takerStandOff(proj: Projector, spot: Vec3): number {
  const z = spot.z - 1.35;
  const centre = proj.project(vec(0, 1, z));
  const metre = proj.project(vec(1, 1, z));
  if (!centre || !metre) return 0;
  const perMetre = Math.abs(metre.x - centre.x);
  if (perMetre < 1e-6) return 0;
  return Math.min(1.55, Math.max(0, proj.width / 2 / perMetre - 0.75));
}

export class StylisedPresentation implements Presentation {
  readonly id = '3d';
  readonly label = '3D';

  // Exactly classic's sound: the synth with the same recorded samples over
  // it, from the shared set in ../sounds/. Nothing is fetched and no
  // AudioContext exists until `unlock`, so a muted copy that is never
  // unlocked - the frame-by-frame viewer's - is silent and costs nothing.
  private readonly synth: Synth = createSynth();
  private readonly sound: SoundSet = withOverrides(this.synth, recordedSounds(this.synth));
  private mood: Mood | null = null;
  private readonly view = new PerspectiveCamera();
  private camera: CameraSpec | null = null;
  private projector: Projector | null = null;
  private spot: Vec3 = penaltySpot().origin;
  private width = 0;
  private height = 0;
  private sky: Sky = skyFor(DEFAULT_SKY_ID);
  private lastClock = 0;

  private readonly search = typeof location !== 'undefined' ? location.search : '';
  private readonly pinned = pinnedQuality(this.search);
  private quality: Quality = this.pinned ?? 'high';
  private readonly budget = new FrameBudget();

  // Everything below exists only once mounted.
  private ctx: CanvasRenderingContext2D | null = null;
  private gl: HTMLCanvasElement | OffscreenCanvas | null = null;
  private renderer: WebGLRenderer | null = null;
  private context: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private scene: Scene | null = null;
  private world: Group | null = null;
  private environment: WebGLRenderTarget | null = null;
  private key: DirectionalLight | null = null;
  private fill: HemisphereLight | null = null;
  private dome: Mesh | null = null;
  private stadium: Stadium | null = null;
  private hoardings: Group | undefined;
  private ball: Mesh | null = null;
  private blob: Mesh | null = null;
  private geometries: GeometryCache | null = null;
  private taker: Rig | null = null;
  private keeper: Rig | null = null;
  private resting: Rig | null = null;
  private wall: Rig[] = [];
  private crowdKey = '';
  private readonly owned = new Set<{ dispose(): void }>();
  private readonly own: Own = (thing) => {
    this.owned.add(thing);
    return thing;
  };

  mount(context: PresentationContext): void {
    this.ctx = context.ctx;
    // A canvas of its own, never added to the page: see the note at the top.
    const gl = makeCanvas(1, 1);
    const settings = QUALITY[this.quality];
    const renderer = new WebGLRenderer({
      canvas: gl,
      antialias: this.quality === 'high',
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.gl = gl;
    this.renderer = renderer;
    this.context = renderer.getContext();
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = PCFShadowMap;

    const scene = new Scene();
    this.scene = scene;
    // Image-based light, generated: three's RoomEnvironment is a box of
    // emissive panels built in code, blurred into an environment map here.
    // No HDRI, nothing downloaded.
    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = this.environment.texture;

    const world = new Group();
    world.scale.copy(MIRROR);
    scene.add(world);
    this.world = world;

    this.dome = buildSky(this.own);
    world.add(this.dome);

    this.hoardings = undefined;
    const pitch = buildPitch(this.own, {
      texture: this.quality === 'high' ? 2048 : 1024,
      anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    });
    this.hoardings = pitch.children.find((child) => child.userData.face) as Group | undefined;
    world.add(pitch);

    this.stadium = buildStadium(this.own, QUALITY.high.crowd, { home: ['#2f6fd0', '#f4f6f8'], away: ['#ffd23f', '#1d1d1d'] });
    this.stadium.crowd.limit(settings.crowd);
    world.add(this.stadium.group);

    // One key light, high above the goal end: the floodlight bank by night and
    // the sun by day. High, so the ball's shadow falls nearly under it - that
    // is what makes the shadow a reading of height rather than a smudge.
    const key = new DirectionalLight('#ffffff', 2.5);
    key.castShadow = settings.shadows;
    key.shadow.mapSize.set(settings.shadowMap || 1024, settings.shadowMap || 1024);
    key.shadow.radius = 3;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    world.add(key, key.target);
    this.key = key;
    this.fill = new HemisphereLight('#bcd7ff', '#2d4a2a', 0.6);
    scene.add(this.fill);

    this.geometries = new GeometryCache(this.quality === 'high' ? 10 : 6);
    this.taker = new Rig(this.geometries, true);
    this.keeper = new Rig(this.geometries);
    this.resting = new Rig(this.geometries, false, false);
    world.add(this.taker.group, this.keeper.group, this.resting.group);

    const ballTexture = this.own(new CanvasTexture(ballCanvas() as HTMLCanvasElement));
    ballTexture.colorSpace = SRGBColorSpace;
    this.ball = new Mesh(
      this.own(new SphereGeometry(BALL_RADIUS, 24, 16)),
      this.own(new MeshStandardMaterial({ map: ballTexture, roughness: 0.4 }))
    );
    this.ball.castShadow = true;
    world.add(this.ball);

    // The low tier's shadow: a soft dark disc on the grass, smaller and
    // fainter the higher the ball is. It keeps the depth cue without a
    // shadow map.
    this.blob = new Mesh(
      this.own(new CircleGeometry(BALL_RADIUS * 1.4, 20).rotateX(-Math.PI / 2)),
      this.own(new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.4, depthWrite: false }))
    );
    this.blob.visible = !settings.shadows;
    world.add(this.blob);

    this.applySky();
    if (this.camera) this.configure(this.camera, this.width, this.height);
  }

  configure(camera: CameraSpec, width: number, height: number): void {
    this.camera = camera;
    this.width = width;
    this.height = height;
    const standing = standBehind(camera, this.spot);
    this.projector = createProjector(standing, width, height);
    aimCamera(this.view, standing, width, height);
    if (!this.renderer) return;
    const ratio = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    this.renderer.setPixelRatio(Math.min(ratio, QUALITY[this.quality].pixelRatio));
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.aimShadows();
  }

  /** Fit the shadow's box round the goal and wherever the ball is, and no further. */
  private aimShadows(): void {
    const key = this.key;
    if (!key) return;
    const centre = new Vector3(this.spot.x / 2, 0, this.spot.z / 2);
    const reach = Math.max(12, Math.hypot(this.spot.x, this.spot.z) / 2 + 7);
    key.target.position.copy(centre);
    key.position.copy(centre).add(new Vector3(-7, 38, -12));
    const shadow = key.shadow.camera;
    shadow.left = -reach;
    shadow.right = reach;
    shadow.top = reach;
    shadow.bottom = -reach;
    shadow.near = 5;
    shadow.far = 90;
    shadow.updateProjectionMatrix();
  }

  render(frame: FrameState, events: readonly GameEvent[]): void {
    const { renderer, scene, ctx, camera, projector, gl } = this;
    if (!renderer || !scene || !ctx || !camera || !projector || !gl) return;

    if (!this.pinned && this.budget.tick(performance.now()) && this.quality !== 'low') {
      console.info(`stylised: dropping to low quality, median frame ${this.budget.median()?.toFixed(1)} ms`);
      this.setQuality('low');
    }

    // The ball has been put somewhere else, so the camera goes with it.
    if (frame.spot.x !== this.spot.x || frame.spot.z !== this.spot.z) {
      this.spot = frame.spot;
      this.configure(camera, this.width, this.height);
    }

    for (const event of events) {
      this.sound.play(event);
      if (event.kind === 'resolved') this.react(event.outcome, frame);
    }
    const mood = moodOf(frame.phase);
    if (mood !== this.mood) {
      this.mood = mood;
      this.sound.bed(mood);
    }

    const dt = Math.max(0, Math.min(0.1, frame.clock - this.lastClock));
    this.lastClock = frame.clock;
    this.pose(frame, projector);
    this.moveBall(frame, dt);
    this.dressCrowd(frame);
    this.stadium?.crowd.tick(frame.clock);

    renderer.render(scene, this.view);
    ctx.drawImage(gl as HTMLCanvasElement, 0, 0, this.width, this.height);

    // Classic's HUD over the top. See hud.ts.
    drawAim(ctx, projector, frame);
    if (frame.phase === 'keeping') drawKeepersTurn(ctx, projector, frame, this.width);
    else drawShotDial(ctx, projector, frame);
    drawHud(ctx, frame, this.width, this.height);
    drawAway(ctx, frame, this.width, this.height);
    if (frame.phase === 'handover') drawHandover(ctx, frame, this.width, this.height);
  }

  /** Everybody on the pitch, from the toolkit's poses, in the kits the player chose. */
  private pose(frame: FrameState, projector: Projector): void {
    const taker = this.taker!;
    const keeper = this.keeper!;
    taker.update({
      ...takerPose({
        spot: frame.spot,
        foot: frame.player.foot,
        phase: frame.phase,
        runUp: frame.runUp,
        sinceStrike: frame.sinceStrike,
        clock: frame.clock,
        power: frame.phase === 'ready' ? (frame.aiming?.power ?? 0) : 0,
        standOff: takerStandOff(projector, frame.spot),
      }),
      ...takerColours(frame),
      alpha: takerAlpha(frame),
    });
    keeper.update({
      ...keeperPose(frame.keeper, frame.keeperProfile.reach, frame.clock, frame.phase, frame.runUp),
      ...keeperColours(frame),
    });

    const poses = wallPoses(frame);
    const colours = wallColours(frame);
    while (this.wall.length < poses.length) {
      const rig = new Rig(this.geometries!);
      this.world!.add(rig.group);
      this.wall.push(rig);
    }
    this.wall.forEach((rig, i) => {
      const pose = poses[i];
      if (pose) rig.update({ ...pose, ...colours });
      else rig.hide();
    });

    if (this.camera?.seesBesideTheGoal) this.resting!.update(restingKeeper(frame));
    else this.resting!.hide();
  }

  private moveBall(frame: FrameState, dt: number): void {
    const ball = this.ball!;
    const { x, y, z } = frame.ball.position;
    ball.position.set(x, y, z);
    // Turned by its spin, so a curler is seen to curl. Stepped on the frame
    // clock, so a replay turns it the same way.
    const spin = frame.ball.spin;
    const rate = Math.hypot(spin.x, spin.y, spin.z);
    if (rate > 1e-3 && dt > 0) {
      ball.rotateOnWorldAxis(new Vector3(spin.x, spin.y, spin.z).divideScalar(rate), rate * dt);
    }
    const blob = this.blob!;
    const height = Math.max(0, y - BALL_RADIUS);
    blob.position.set(x, 0.012, z);
    blob.scale.setScalar(1 + height * 0.35);
    (blob.material as MeshBasicMaterial).opacity = 0.42 / (1 + height * 0.8);
  }

  /** The stands in the two sides' colours: the home end yours, the away end theirs. */
  private dressCrowd(frame: FrameState): void {
    const kits = kitsFor(frame);
    const key = `${kits.own.kit}${kits.own.trim}${kits.other.kit}${kits.other.trim}`;
    if (key === this.crowdKey) return;
    this.crowdKey = key;
    this.stadium?.crowd.recolour({ home: [kits.own.kit, kits.own.trim], away: [kits.other.kit, kits.other.trim] });
  }

  /**
   * Set the stand off. The same rule as classic: a save lifts fewer people than
   * a goal and a miss fewer still, and whoever is pleased is who gets up.
   */
  private react(outcome: string | undefined, frame: FrameState): void {
    const strength = outcome === 'goal' ? 1 : outcome === 'saved' ? 0.85 : 0.5;
    const takerIsHome = !awayTaking(frame);
    const celebrating = takerIsHome === (outcome === 'goal') ? 'home' : 'away';
    const from = Math.max(-1, Math.min(1, frame.ball.position.x / 6));
    this.stadium?.crowd.react(frame.clock, strength, celebrating, from);
  }

  private applySky(): void {
    const sky = this.sky;
    const f = Math.max(0, Math.min(1, sky.floodlight));
    if (this.dome) paintSky(this.dome, sky);
    // Under floodlights the pitch is lit and everything else is not: the
    // light from the sky - the fill and the environment - falls away much
    // faster than the key does, which is most of what reads as night.
    if (this.scene) {
      this.scene.fog = new Fog(new Color(sky.bottom), 140, 400);
      this.scene.environmentIntensity = 0.6 - 0.48 * f;
    }
    if (this.renderer) this.renderer.toneMappingExposure = 1 - 0.18 * f;
    if (this.key) {
      this.key.color.set(f > 0.9 ? '#e6eeff' : f > 0 ? '#ffdcb8' : '#fff3dc');
      this.key.intensity = 2.8 - 1.0 * f;
    }
    if (this.fill) {
      this.fill.color.set(sky.top);
      this.fill.intensity = 0.8 - 0.72 * f;
    }
    const stadium = this.stadium;
    if (stadium) {
      stadium.lamps.emissiveIntensity = f > 0 ? 3 : 0;
      stadium.roofLights.emissiveIntensity = 1.4 * f;
      const glow = QUALITY[this.quality].halos && f > 0;
      for (const halo of stadium.halos) {
        halo.visible = glow;
        halo.material.opacity = 0.3 + 0.6 * f;
      }
    }
    lightBoards(this.hoardings, f);
  }

  private setQuality(quality: Quality): void {
    this.quality = quality;
    const settings = QUALITY[quality];
    const renderer = this.renderer;
    if (!renderer) return;
    renderer.shadowMap.enabled = settings.shadows;
    if (this.key) this.key.castShadow = settings.shadows;
    if (this.blob) this.blob.visible = !settings.shadows;
    this.stadium?.crowd.limit(settings.crowd);
    // Shadows on or off is a different shader, so every material recompiles.
    this.scene?.traverse((object) => {
      const material = (object as Mesh).material as Material | Material[] | undefined;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) m.needsUpdate = true;
    });
    this.applySky();
    if (this.camera) this.configure(this.camera, this.width, this.height);
  }

  aimFromDrag(gesture: DragGesture): ShotInput {
    // Classic's mapping, unchanged: see toolkit/aim.ts for why every camera
    // and every package shares one.
    return dragToShot(gesture, this.width, this.height, { mirrored: this.camera?.mirrored ?? false });
  }

  /** A ray through the pointer, onto the goal's plane at z = 0. */
  diveFromPointer(point: DragPoint): Dive | null {
    if (!this.camera) return null;
    return pointerOnGoal(this.view, point, this.width, this.height);
  }

  unlock(): void {
    this.synth.unlock();
    this.sound.bed(this.mood ?? 'idle');
  }

  setMuted(muted: boolean): void {
    this.synth.setMuted(muted);
  }

  setSky(id: string): void {
    this.sky = skyFor(id);
    this.applySky();
  }

  /** Which tier it is drawing at. For the console and for tests. */
  currentQuality(): Quality {
    return this.quality;
  }

  /**
   * True once `destroy` has handed the WebGL context back. A browser allows
   * only a handful at once, and the frame-by-frame viewer makes and destroys a
   * second copy of this package every time it is opened.
   */
  released(): boolean {
    return this.context?.isContextLost() ?? true;
  }

  destroy(): void {
    this.synth.destroy();
    for (const rig of [this.taker, this.keeper, this.resting, ...this.wall]) rig?.dispose();
    this.wall = [];
    this.geometries?.dispose();
    for (const thing of this.owned) thing.dispose();
    this.owned.clear();
    this.environment?.dispose();
    this.scene?.clear();
    const renderer = this.renderer;
    if (renderer) {
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
    if (this.gl) {
      this.gl.width = 1;
      this.gl.height = 1;
    }
    this.renderer = null;
    this.scene = null;
    this.world = null;
    this.gl = null;
    this.ctx = null;
  }
}

/**
 * The taker drops back once the ball has gone, so a large figure between the
 * camera and the goal does not hide the only thing worth watching.
 *
 * Classic starts the fade a fixed quarter of a second after the strike. This
 * starts it when `doing/` says the kicking foot has landed, which is the same
 * intent - not before the follow-through, the part worth seeing - said in the
 * kick's own terms, so it stays right if the kick's timing is retuned.
 */
function takerAlpha(frame: FrameState): number {
  const doing = takerDoing(frame);
  if (doing.action !== 'land' && doing.action !== 'watch') return 1;
  const since = doing.action === 'land' ? doing.since : 1;
  return 1 - 0.6 * Math.min(1, since / 0.3);
}

/** The keeper waiting out the penalty beside the goal: standing, breathing, bare hands. */
function restingKeeper(frame: FrameState): Figure {
  const sway = wave(frame.clock, SWAY_PERIOD) * 0.03;
  const breath = wave(frame.clock, BREATH_PERIOD, 0.35) * 0.022;
  const x = RESTING_KEEPER.x + sway;
  const z = RESTING_KEEPER.z;
  const shoulderY = 1.44 + breath;
  return {
    feet: vec(x, 0.06, z),
    shoulder: vec(x, shoulderY, z),
    head: vec(x, shoulderY + 0.26 + breath * 1.4, z),
    hands: [vec(x + 0.18, shoulderY - 0.28, z), vec(x - 0.18, shoulderY - 0.28, z)],
    toes: [vec(x - 0.15, 0.03, z - 0.05), vec(x + 0.15, 0.03, z + 0.05)],
    facing: TOWARD_TAKER,
    stature: 1.44 - 0.06,
    ...restingKeeperColours(frame),
  };
}

/** A white ball with dark patches, so its spin can be seen. Generated, like everything else. */
function ballCanvas(): HTMLCanvasElement | OffscreenCanvas {
  const canvas = makeCanvas(256, 128);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return canvas;
  ctx.fillStyle = '#f7f7f5';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#23272e';
  const patches: [number, number, number][] = [
    [32, 64, 15],
    [96, 30, 13],
    [96, 98, 13],
    [160, 64, 15],
    [224, 30, 13],
    [224, 98, 13],
    [128, 6, 20],
    [128, 122, 20],
  ];
  for (const [x, y, r] of patches) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9);
    }
    ctx.fill();
  }
  return canvas;
}
