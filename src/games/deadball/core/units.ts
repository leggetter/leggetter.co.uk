/**
 * Every constant in the simulation, in real-world units: meters, seconds,
 * kilograms, radians.
 *
 * Real units cost nothing and buy two things. Every number here can be checked
 * against reality rather than argued about, and the physics stays something you
 * can look up instead of something tuned until it felt right.
 *
 * Axes, seen from behind the taker looking at the goal:
 *   x  lateral, positive to the taker's right
 *   y  vertical, positive up, ground at 0
 *   z  depth, positive toward the goal
 *
 * The origin sits on the goal line at the center of the goal mouth, so a shot
 * crosses the line at z = 0 and goal detection is a plane test.
 */

/** Goal mouth, per the Laws of the Game: 8 yards by 8 feet. */
export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;

/** Posts and crossbar are round, and the radius is what makes a shot rebound. */
export const FRAME_RADIUS = 0.06;

/** FIFA size 5: 68-70 cm circumference, 410-450 g. */
export const BALL_RADIUS = 0.11;
export const BALL_MASS = 0.43;

/** Penalty spot: 12 yards out, centered. */
export const PENALTY_DISTANCE = 11.0;

export const GRAVITY = 9.81;

/** Air at sea level, 15 C. */
export const AIR_DENSITY = 1.225;

/**
 * Drag coefficient. A real football's is not constant: it collapses from about
 * 0.45 to about 0.15 somewhere near 12 m/s as the boundary layer goes
 * turbulent, which is what produces a knuckleball. A single mid-range value is
 * a deliberate simplification, and modelling the drag crisis is a candidate
 * feature rather than a correction.
 */
export const DRAG_COEFFICIENT = 0.25;

/** Cross-sectional area of the ball. */
export const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;

/** Precomputed drag factor: F_drag = DRAG_FACTOR * |v| * v. */
export const DRAG_FACTOR = 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * BALL_AREA;

/**
 * Magnus factor: F_magnus = MAGNUS_FACTOR * (spin x velocity).
 *
 * Tuned rather than derived, and deliberately above life-size.
 *
 * Sideways deflection grows with the square of the flight time, so a value
 * that gives a realistic 1.5 m over a 25 m free kick gives about 20 cm over an
 * 11 m penalty. Twenty centimeters is less than the width of a keeper's
 * gloves: physically defensible, and invisible. The curve mechanic was present
 * in the code and absent from the game.
 *
 * Raised until a full curl moves a penalty about half a meter, which is most
 * of a keeper's reach and enough to beat one who committed to the line the
 * ball was struck on. The cost is that free kicks will bend a long way when
 * they arrive in Phase 3, and will want their own look at this.
 */
export const MAGNUS_FACTOR = 1.85e-3;

/** Spin bleeds off slowly through the flight. Fraction lost per second. */
export const SPIN_DECAY = 0.12;

/** Strike speed at power 0 and power 1, before player attributes scale it. */
export const MIN_STRIKE_SPEED = 16.0;
export const MAX_STRIKE_SPEED = 32.0;

/** Side spin at full curve input, and lift spin at full lift input. */
export const MAX_SIDE_SPIN = 62.0;
export const MAX_LIFT_SPIN = 45.0;

/**
 * How far past the frame a full-deflection aim points. Aiming has to be able
 * to miss, or the corners carry no risk and there is no reason not to hit them
 * every time.
 */
export const AIM_MARGIN = 1.18;

/** Half-width and height of the aim rectangle on the goal plane. */
export const AIM_HALF_WIDTH = (GOAL_WIDTH / 2) * AIM_MARGIN;
export const AIM_HEIGHT = GOAL_HEIGHT * AIM_MARGIN;

/**
 * The timing sweep.
 *
 * A marker runs back and forth while the drag is held, and where it sits at
 * the moment of release decides how cleanly the ball was struck. This is the
 * second skill axis: the drag says what you intend, the release says whether
 * you managed it.
 */
export const SWEEP_PERIOD = 1.15;

/** Marker within this of centre is a clean strike, with no penalty at all. */
export const SWEEP_SWEET_ZONE = 0.17;

/** Lateral drag on the shot, in meters at the goal, at the worst timing. */
export const TIMING_PULL = 0.5;

/** How much worse the aim scatter gets at the worst timing, proportionally. */
export const TIMING_SPREAD = 1.7;

/**
 * Extra scatter a bad contact adds regardless of how good the player is, as a
 * half-range in meters at the goal.
 *
 * Absolute rather than a multiplier on the player's own spread, because an
 * accurate player's base spread is centimeters and multiplying centimeters
 * gets you centimeters. Without this the release timing had no measurable
 * effect on whether anyone scored.
 */
export const TIMING_SCATTER = 2.2;

/**
 * How far a bad contact drags the ball back toward the middle of the goal, as
 * a fraction of how far out it was aimed.
 *
 * This is what actually punishes a scuff. A mistimed penalty does not find the
 * top corner; it squirts toward the middle, low and slow. Whether that beats
 * the keeper depends on which way they went, which is exactly the gamble a
 * real scuffed penalty is.
 */
export const TIMING_CENTRE_PULL = 0.55;

/** Pace lost to a badly struck ball, as a fraction, at the worst timing. */
export const TIMING_PACE_LOSS = 0.18;

/**
 * How far the net hangs behind the goal line.
 *
 * Physics, not decoration, which is why it lives here rather than in the
 * renderer: a ball that has gone in has to stop in the net rather than carry
 * on through it and out of the stadium.
 */
export const NET_DEPTH = 1.7;

/**
 * A net absorbs. It gives almost nothing back and drags what it does not stop,
 * which is why a ball hits it and drops rather than rebounding off it.
 *
 * The cap matters as much as the fraction. A proportional bounce is fine on a
 * ball that has already lost its pace and wrong on one that has not: at 25 m/s
 * even a tenth sends it back out of the goal at walking pace and it finishes
 * the second in front of the line, having apparently declined to go in.
 * Netting has a limit to how much it can give back, and this is it.
 */
export const NET_RESTITUTION = 0.08;
export const NET_MAX_REBOUND = 1.1;
export const NET_DRAG = 0.3;

/** Ground bounce: energy kept vertically, and speed kept horizontally. */
export const GROUND_RESTITUTION = 0.58;
export const GROUND_FRICTION = 0.82;

/** A shot is abandoned after this long, so nothing can hang the match. */
export const FLIGHT_TIMEOUT = 4.0;

/**
 * How much of a lofted shot's speed is spent going up rather than forward.
 *
 * At 1 a fully lofted free kick keeps 62% of its pace toward goal and puts the
 * rest into the arc. Enough to clear four people nine metres away and still be
 * dropping by the time it reaches the line; more than this and the ball hangs
 * long enough for a keeper to walk under it.
 */
export const LOFT_SHARE = 0.6;

/**
 * The fixed simulation step, in seconds.
 *
 * 120 Hz, so a shot is the same shot on a 60 Hz laptop and a 120 Hz phone.
 * Lived in `Game.ts` until the room needed it too - it is a property of the
 * simulation rather than of the thing driving it, and two definitions of a
 * timestep is how two machines stop agreeing.
 *
 * Not part of the tuning fingerprint: changing it changes how finely the same
 * physics is sampled rather than what the physics is. Worth knowing that a
 * coarse step is what would make the wall's swept collision test start to
 * matter - see `core/wall.ts`.
 */
export const STEP = 1 / 120;
