/**
 * Where you are allowed to stand.
 *
 * Data, deliberately. A camera is *where you stand* and a render package is
 * *how it looks*, and those are independent: somebody is going to want pixel
 * art from behind the goal. Keeping the positions here means one implementation
 * per package however many cameras exist, and a fourth camera costs every
 * package nothing.
 *
 * Nothing here projects anything. Turning a `CameraSpec` into screen
 * coordinates is a package's job, because a matrix and a hand-rolled projector
 * are both correct answers to the same camera.
 */

import { GOAL_HEIGHT, GOAL_WIDTH, NET_DEPTH, PENALTY_DISTANCE } from '../core/units.ts';
import { vec, type Vec3 } from '../core/vec3.ts';
import type { Camera } from './toolkit/project.ts';

export interface CameraSpec {
  readonly id: string;
  readonly label: string;

  readonly position: Vec3;
  readonly yaw: number;
  readonly pitch: number;
  /** An upper limit on how wide the lens may go, not the lens itself. */
  readonly fov: number;
  /**
   * Something that must stay visible, whatever shape the screen is.
   *
   * A camera holding a fixed vertical angle is fine on a laptop and wrong on a
   * phone: the same angle on a tall narrow viewport leaves almost no horizontal
   * field, and a 7.32 m goal seen from 17.7 m did not fit across a 390 px
   * screen. Neither post was visible - you got netting and a keeper, and no
   * goal.
   *
   * Given what has to fit and how far away it is, the focal length falls out of
   * whichever axis binds. That derivation is the package's; this is the
   * requirement.
   */
  readonly frame: {
    /** Half-width in meters that must be in shot. */
    halfWidth: number;
    /** Half-height in meters that must be in shot. */
    halfHeight: number;
    /** How far in front of the camera that rectangle sits. */
    depth: number;
  };

  /**
   * True when the taker's right is on your left.
   *
   * A drag right must always send the ball right *on the screen*. From behind
   * the goal that is the other side of the goal mouth.
   */
  readonly mirrored: boolean;
  /**
   * True when the frame and the netting are the nearest things in shot rather
   * than the furthest, so they are drawn last. Draw order is depth.
   */
  readonly fromBehindTheGoal: boolean;
  /**
   * True when this camera is meant to show the ground beside the goal, well
   * outside the posts, rather than only the goalmouth.
   *
   * A flag rather than geometry, and that is a concession. The resting keeper
   * stands 2.8 m outside the left post on the goal line, which *looks* like it
   * should fall out of the framing - it is far outside what `behind-taker`
   * says it needs to show. It does not, because `frame` is a minimum: the
   * focal length is the tightest of the framing rules and the fov cap, and on
   * anything wider than about 5:4 the cap wins and the horizontal field keeps
   * growing with the viewport. Measured at 1920x1080, `behind-taker` sees
   * ±9.97 m at the goal line - so a figure at -6.5 lands 327 px in from the
   * left edge, plainly in shot, on the one camera it must never appear from.
   * It only falls outside on a viewport taller than it is wide, which is a
   * phone held upright and nothing else.
   *
   * There is no x that is outside `behind-taker` at every aspect ratio and
   * inside `angled-behind`, because both cameras share a fov and the wide end
   * is bound by that rather than by where they point. So this is said rather
   * than derived. It lives here, with the rest of what a camera implies, so
   * the drawing code never has to name a camera by id.
   */
  readonly seesBesideTheGoal: boolean;
}

/**
 * Behind and above the taker's shoulder. The classic penalty camera, and the
 * reference the others are measured against.
 *
 * Set back 6.5 m rather than tucked in at 3.4 m. Close in, the ball sat on the
 * bottom edge of the canvas with nowhere left to start a drag, and the penalty
 * spot rendered as a 28 px disc: both correct at 0.11 m, both useless.
 */
const BEHIND_TAKER: CameraSpec = {
  id: 'behind-taker',
  label: 'Behind the taker',
  position: vec(0, 2.4, -PENALTY_DISTANCE - 6.5),
  yaw: 0,
  pitch: 0.16,
  fov: 0.62,
  frame: {
    halfWidth: GOAL_WIDTH / 2 + 1.25,
    halfHeight: GOAL_HEIGHT / 2 + 0.6,
    depth: PENALTY_DISTANCE + 6.5,
  },
  mirrored: false,
  fromBehindTheGoal: false,
  seesBesideTheGoal: false,
};

/**
 * Raised and swung out to one side, so the pitch recedes and the goal is seen
 * at an angle. The view that should show a curl best, because a shot bending
 * across the face of the goal moves against the frame rather than straight at
 * it, and the angle a free kick will want.
 */
const ANGLED_OFFSET_X = 3.6;
const ANGLED_BACK = PENALTY_DISTANCE + 8;
const ANGLED_HEIGHT = 3.6;

/**
 * Aimed between the goal and the ball rather than at the goal.
 *
 * Pointed straight at the goal, the composition is right and the shot is not:
 * the ball and the taker sit far nearer the camera, so centring the goal pushes
 * them into the bottom corner and off the edge. A look-at point a third of the
 * way back up the pitch holds the goal in the upper middle and the ball in the
 * lower, which is what you want to see at once.
 */
const ANGLED_LOOK_AT = { x: 0, y: 1.3, z: -3.5 };

const ANGLED_TO_TARGET = {
  x: ANGLED_LOOK_AT.x - ANGLED_OFFSET_X,
  y: ANGLED_LOOK_AT.y - ANGLED_HEIGHT,
  z: ANGLED_LOOK_AT.z + ANGLED_BACK,
};

/**
 * Worked out rather than eyeballed. tan(yaw) = dx/dz, matching the rotation the
 * projector applies, and pitch is the vertical angle once the yaw has been taken
 * out. A sign slip here swings the camera the wrong way by *twice* the angle,
 * which is how the first attempt ended up looking at an empty stretch of grass
 * with the goal off the left-hand edge.
 */
const ANGLED_YAW = Math.atan2(ANGLED_TO_TARGET.x, ANGLED_TO_TARGET.z);
const ANGLED_FORWARD = Math.hypot(ANGLED_TO_TARGET.x, ANGLED_TO_TARGET.z);
const ANGLED_PITCH = Math.atan2(-ANGLED_TO_TARGET.y, ANGLED_FORWARD);

const ANGLED_BEHIND: CameraSpec = {
  id: 'angled-behind',
  label: 'Angled, from above',
  position: vec(ANGLED_OFFSET_X, ANGLED_HEIGHT, -ANGLED_BACK),
  yaw: ANGLED_YAW,
  pitch: ANGLED_PITCH,
  fov: 0.62,
  // The goal is off to one side of the axis from here, so it needs room for its
  // own half-width plus how far off-centre it sits.
  frame: {
    halfWidth: GOAL_WIDTH / 2 + ANGLED_OFFSET_X + 1.2,
    halfHeight: GOAL_HEIGHT / 2 + 0.8,
    depth: ANGLED_BACK,
  },
  mirrored: false,
  fromBehindTheGoal: false,
  // Swung out to the side and raised, so the ground beside the goal is in
  // shot and reads as ground beside the goal rather than as a strip of grass.
  seesBesideTheGoal: true,
};

/**
 * From behind the goal, looking back down the pitch. The keeper's back is to
 * you, the taker is away in the distance, and the ball comes at the screen.
 *
 * The natural angle for the keeper's turn in a duel, and the one place where
 * both `mirrored` and `fromBehindTheGoal` are true. Those were the only two
 * things a camera changed beyond its own position until the resting keeper
 * needed a third; see `seesBesideTheGoal` for why that one could not be
 * measured instead of declared.
 */
const KEEPER_BEHIND = NET_DEPTH + 4.2;

const KEEPER_CAM: CameraSpec = {
  id: 'keeper-cam',
  label: 'Behind the goal',
  position: vec(0, 3.1, KEEPER_BEHIND),
  // Turned all the way round: yaw 0 looks along +z, and this looks along -z.
  yaw: Math.PI,
  pitch: 0.2,
  fov: 0.62,
  // Framed on the goal, which from here is the nearest thing rather than the
  // furthest, so it needs rather more room than it does from the spot.
  frame: {
    halfWidth: GOAL_WIDTH / 2 + 0.7,
    halfHeight: GOAL_HEIGHT / 2 + 0.5,
    depth: KEEPER_BEHIND,
  },
  mirrored: true,
  fromBehindTheGoal: true,
  // Standing in the goal looking the other way: the ground beside the posts is
  // behind this camera, not in front of it.
  seesBesideTheGoal: false,
};

export const CAMERAS: Record<string, CameraSpec> = {
  [BEHIND_TAKER.id]: BEHIND_TAKER,
  [ANGLED_BEHIND.id]: ANGLED_BEHIND,
  [KEEPER_CAM.id]: KEEPER_CAM,
};

export const DEFAULT_CAMERA = BEHIND_TAKER.id;

export const listCameras = (): { id: string; label: string }[] =>
  Object.values(CAMERAS).map(({ id, label }) => ({ id, label }));

/**
 * Pick a camera: an explicit `?view=` wins, then a stored preference, then the
 * default. The URL wins so a particular camera can be linked to directly.
 *
 * The parameter is still spelled `view` because links to it exist.
 */
export function resolveCameraId(search: string, stored: string | null): string {
  const requested = new URLSearchParams(search).get('view');
  if (requested && requested in CAMERAS) return requested;
  if (stored && stored in CAMERAS) return stored;
  return DEFAULT_CAMERA;
}

export const cameraFor = (id: string): CameraSpec => CAMERAS[id] ?? CAMERAS[DEFAULT_CAMERA]!;

/**
 * A camera, swung round to stand behind wherever the ball actually is.
 *
 * Named for what it does rather than `cameraFor`, which is already the lookup
 * by id a few lines up and means something else entirely.
 *
 * Every `CameraSpec` above is written against the penalty spot: a position, and
 * a yaw that points it at the goal from there. A free kick moves the ball up to
 * eight metres across and nine metres further out, and a camera that stayed put
 * would be standing beside the taker looking at a post.
 *
 * So the spec is read as *an offset from the ball, in the frame of the shot* -
 * so far behind, so far to the side, so far up - and rebuilt around the new
 * spot. For the penalty spot this returns the spec unchanged, which is the
 * property worth having: the game that already existed is not re-aimed by any
 * of this, and a test says so.
 *
 * Cameras behind the goal are left alone. They are looking at the goal from the
 * other side and the ball being somewhere else does not move them.
 */
export function standBehind(spec: CameraSpec, spot: Vec3): Camera {
  if (spec.fromBehindTheGoal) return spec;

  // Where the shot is going, flat. The goal's centre rather than the aim: the
  // camera frames the goal, and the aim is what the player is deciding.
  const toGoal = { x: -spot.x, z: -spot.z };
  const flat = Math.hypot(toGoal.x, toGoal.z);
  if (flat < 0.001) return spec;
  const ahead = { x: toGoal.x / flat, z: toGoal.z / flat };
  // The other axis on the ground: the taker's right.
  const right = { x: ahead.z, z: -ahead.x };

  // The spec, decomposed against the penalty it was written for.
  const back = spec.position.z - -PENALTY_DISTANCE;
  const across = spec.position.x;

  const position = vec(
    spot.x + ahead.x * back + right.x * across,
    spec.position.y,
    spot.z + ahead.z * back + right.z * across
  );

  // How far the goal now is along the view axis. Without this a kick from
  // twenty metres frames the goal at the size it is from eleven, and the whole
  // picture is wrong by the amount the ball moved.
  const depth = -position.x * ahead.x + -position.z * ahead.z;

  return {
    position,
    // yaw 0 looks along +z, so turning the camera onto the new line is the
    // angle between that line and +z, added to whatever the spec already had.
    yaw: spec.yaw + Math.atan2(ahead.x, ahead.z),
    pitch: spec.pitch,
    fov: spec.fov,
    frame: { ...spec.frame, depth: Math.max(1, depth) },
  };
}
