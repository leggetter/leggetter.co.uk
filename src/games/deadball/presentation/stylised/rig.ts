/**
 * A footballer, as a capsule per bone.
 *
 * The same jointed body classic draws as round-capped lines - the toolkit's
 * skeleton, posed by the toolkit's poses - drawn as solids instead. Every
 * part is the same part in the same colour: shorts on the thigh, socks on the
 * shin, a dark boot, a sleeve to the elbow and a bare forearm. A capsule is a
 * round-capped line with a third dimension, so the two looks are one figure
 * seen two ways, and a pose that reads in one should read in the other.
 *
 * No model files. Everything is generated from the skeleton's bone lengths and
 * the kits the player chose, which is what keeps the licensing question from
 * ever arising.
 *
 * Thicknesses are the toolkit's `LIMB` widths, scaled with the body like
 * classic's are. The glove is not: its size is the keeper's save radius, drawn,
 * and a smaller keeper does not save less.
 */

import {
  CapsuleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';

import type { Vec3 } from '../../core/vec3.ts';
import type { Side, Skeleton } from '../toolkit/body/skeleton.ts';
import { LIMB, poseBody, poseSize, type Figure } from '../toolkit/pose/figure.ts';

/** The colours classic uses for the parts that are not kit. */
export const SKIN = '#d9a07a';
export const BOOT = '#1b2430';
export const GLOVE = '#f4f6f8';

type Part = 'kit' | 'trim' | 'skin' | 'boot' | 'glove';

interface Bone {
  from: (s: Skeleton) => Vec3;
  to: (s: Skeleton) => Vec3;
  /** Radius for the 1.80 m body. */
  radius: number;
  part: Part;
}

const sideBones = (side: (s: Skeleton) => Side): Bone[] => [
  { from: (s) => side(s).hip, to: (s) => side(s).knee, radius: LIMB.leg / 2, part: 'trim' },
  { from: (s) => side(s).knee, to: (s) => side(s).ankle, radius: (LIMB.leg * 0.82) / 2, part: 'kit' },
  { from: (s) => side(s).ankle, to: (s) => side(s).toe, radius: (LIMB.leg * 0.95) / 2, part: 'boot' },
  { from: (s) => side(s).shoulder, to: (s) => side(s).elbow, radius: LIMB.arm / 2, part: 'kit' },
  { from: (s) => side(s).elbow, to: (s) => side(s).wrist, radius: (LIMB.arm * 0.86) / 2, part: 'skin' },
  { from: (s) => side(s).wrist, to: (s) => side(s).hand, radius: (LIMB.arm * 0.8) / 2, part: 'skin' },
];

const BONES: Bone[] = [
  ...sideBones((s) => s.left),
  ...sideBones((s) => s.right),
  { from: (s) => s.pelvis, to: (s) => s.chest, radius: LIMB.torso / 2, part: 'kit' },
  { from: (s) => s.left.hip, to: (s) => s.right.hip, radius: (LIMB.leg * 1.1) / 2, part: 'trim' },
  { from: (s) => s.left.shoulder, to: (s) => s.right.shoulder, radius: (LIMB.arm * 1.15) / 2, part: 'kit' },
  { from: (s) => s.chest, to: (s) => s.head, radius: (LIMB.head * 0.62) / 2, part: 'skin' },
];

const Y = new Vector3(0, 1, 0);
const scratch = { a: new Vector3(), b: new Vector3(), dir: new Vector3(), q: new Quaternion() };
const v3 = (target: Vector3, p: Vec3): Vector3 => target.set(p.x, p.y, p.z);

/** Geometries shared between every figure of the same build. Keyed by size. */
export class GeometryCache {
  private readonly made = new Map<string, BufferGeometry>();
  private readonly segments: number;

  constructor(segments: number) {
    this.segments = segments;
  }

  capsule(radius: number, length: number): BufferGeometry {
    const key = `c${radius.toFixed(3)}:${length.toFixed(3)}`;
    let geometry = this.made.get(key);
    if (!geometry) {
      geometry = new CapsuleGeometry(radius, Math.max(0.001, length), 3, this.segments);
      this.made.set(key, geometry);
    }
    return geometry;
  }

  sphere(radius: number): BufferGeometry {
    const key = `s${radius.toFixed(3)}`;
    let geometry = this.made.get(key);
    if (!geometry) {
      geometry = new SphereGeometry(radius, this.segments + 2, Math.max(6, this.segments));
      this.made.set(key, geometry);
    }
    return geometry;
  }

  dispose(): void {
    for (const geometry of this.made.values()) geometry.dispose();
    this.made.clear();
  }
}

/** One person on the pitch. Built once and moved every frame. */
export class Rig {
  readonly group = new Group();
  private readonly materials: Record<Part, MeshStandardMaterial>;
  private bones: { bone: Bone; mesh: Mesh; rest: number }[] = [];
  private head: Mesh | null = null;
  private gloves: [Mesh, Mesh] | null = null;
  private builtFor = '';

  private readonly geometries: GeometryCache;
  /** For a figure that fades out, like the taker once the ball has gone. */
  private readonly fades: boolean;
  private readonly castsShadow: boolean;

  constructor(geometries: GeometryCache, fades = false, castsShadow = true) {
    this.geometries = geometries;
    this.fades = fades;
    this.castsShadow = castsShadow;
    const material = (colour: string, roughness = 0.72): MeshStandardMaterial =>
      new MeshStandardMaterial({ color: colour, roughness, metalness: 0, transparent: fades });
    this.materials = {
      kit: material('#ffffff'),
      trim: material('#ffffff'),
      skin: material(SKIN, 0.6),
      boot: material(BOOT, 0.5),
      glove: material(GLOVE, 0.55),
    };
  }

  /**
   * Put the figure where its pose says, in its kit.
   *
   * The meshes are rebuilt only when the body's size changes, which for
   * anybody but a reused wall slot is never: bone lengths are the skeleton's
   * and the skeleton keeps them exactly.
   */
  update(figure: Figure): void {
    const skeleton = poseBody(figure);
    const size = poseSize(figure);
    const key = `${size.toFixed(3)}:${(figure.gloves ?? 0).toFixed(3)}`;
    if (key !== this.builtFor) this.build(skeleton, size, figure.gloves ?? 0, key);

    this.paint('kit', figure.kit);
    this.paint('trim', figure.trim);
    if (this.fades) {
      const alpha = figure.alpha ?? 1;
      for (const material of Object.values(this.materials)) material.opacity = alpha;
    }

    for (const { bone, mesh, rest } of this.bones) {
      const a = v3(scratch.a, bone.from(skeleton));
      const b = v3(scratch.b, bone.to(skeleton));
      const along = scratch.dir.subVectors(b, a);
      const length = along.length();
      mesh.position.addVectors(a, b).multiplyScalar(0.5);
      if (length > 1e-6) mesh.quaternion.copy(scratch.q.setFromUnitVectors(Y, along.divideScalar(length)));
      // Bone lengths are preserved by the skeleton, so this is 1 but for
      // rounding. It is here so a bone that did stretch would show it rather
      // than leave a gap at the joint.
      mesh.scale.set(1, rest > 1e-6 ? length / rest : 1, 1);
    }
    if (this.head) v3(this.head.position, skeleton.head);

    if (this.gloves) {
      for (const [glove, side] of [
        [this.gloves[0], skeleton.left],
        [this.gloves[1], skeleton.right],
      ] as const) {
        v3(glove.position, side.hand);
        // Along the forearm, like classic's oval: a round white disc the size
        // of the ball at chest height reads as a second ball.
        const along = scratch.dir.subVectors(v3(scratch.b, side.hand), v3(scratch.a, side.wrist));
        if (along.lengthSq() > 1e-12) glove.quaternion.copy(scratch.q.setFromUnitVectors(Y, along.normalize()));
      }
    }
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
  }

  private paint(part: Part, colour: string): void {
    const material = this.materials[part];
    // Only when it changes: setting a colour parses it and converts it to
    // linear, which is not worth doing for every part of every figure every
    // frame when a strip changes about once a shootout.
    if (material.userData.colour !== colour) {
      material.color.set(colour);
      material.userData.colour = colour;
    }
  }

  private build(skeleton: Skeleton, size: number, gloves: number, key: string): void {
    this.group.clear();
    this.bones = BONES.map((bone) => {
      const rest = v3(scratch.a, bone.from(skeleton)).distanceTo(v3(scratch.b, bone.to(skeleton)));
      const mesh = new Mesh(this.geometries.capsule(bone.radius * size, rest), this.materials[bone.part]);
      mesh.castShadow = this.castsShadow;
      this.group.add(mesh);
      return { bone, mesh, rest };
    });
    this.head = new Mesh(this.geometries.sphere(LIMB.head * size), this.materials.skin);
    this.head.castShadow = this.castsShadow;
    this.group.add(this.head);

    this.gloves = null;
    if (gloves > 0) {
      const make = (): Mesh => {
        const glove = new Mesh(this.geometries.sphere(gloves), this.materials.glove);
        glove.scale.set(0.66, 1, 0.5);
        glove.castShadow = this.castsShadow;
        this.group.add(glove);
        return glove;
      };
      this.gloves = [make(), make()];
    }
    this.builtFor = key;
  }

  dispose(): void {
    // Geometries belong to the cache, which outlives any one figure.
    for (const material of Object.values(this.materials) as Material[]) material.dispose();
    this.group.clear();
  }
}
