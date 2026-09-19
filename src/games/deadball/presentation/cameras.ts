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
};

/**
 * From behind the goal, looking back down the pitch. The keeper's back is to
 * you, the taker is away in the distance, and the ball comes at the screen.
 *
 * The natural angle for the keeper's turn in a duel, and the one place where
 * both `mirrored` and `fromBehindTheGoal` are true - which between them are the
 * only two things a camera changes beyond its own position.
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
