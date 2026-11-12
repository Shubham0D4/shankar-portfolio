/** Contract between the inspect stage and the building-type modules. */
import type { Group, Material, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { MaterialSet, Tier } from './tex';
import type { V2 } from './kit';

export interface Callout {
  /** Anchor in the building's local frame. */
  at: [number, number, number];
  /** Outward direction of the surface, so labels hide when it faces away. */
  facing?: [number, number, number];
  /** Index of the lifting layer it moves with (see BuildingInstance.layers). */
  layer?: number;
  title: string;
  detail: string;
  /** Where the fact comes from: the PDF's drawings, or an assumption. */
  source: 'pdf' | 'assumed';
}

/** A 2D plan in the building's local frame, metres, for the inset. */
export interface PlanSheet {
  bounds: [number, number, number, number];
  plinth: V2[][];
  courts: V2[][];
  /** Solid wall pieces as thick lines. */
  walls: { a: V2; b: V2; t: number }[];
  windows: { a: V2; b: V2 }[];
  doors: { hinge: V2; leaf: V2 }[];
  posts: V2[];
  trees: { at: V2; r: number }[];
  steps: V2[][];
  rooms: { at: V2; name: string }[];
  boundary?: V2[];
}

export interface Variant {
  /** Plot number or another stable seed: drives small per-instance differences. */
  seed: number;
  mirror: boolean;
}

export interface BuildContext {
  tier: Tier;
  mats: MaterialSet;
  still: boolean;
}

/** One inspected building, ready to add to the stage. */
export interface BuildingInstance {
  /** Building plus plot, in local metres; the stage centres and mirrors it. */
  group: Group;
  /** Parts that lift apart to reveal the interior: each rises by k × 3.6 m. */
  layers: { obj: Object3D; k: number }[];
  /** Button labels for lifting and lowering. */
  liftLabel: [string, string];
  /** Back-face twins of the closed solids: the poché of the section cut. */
  poche: Mesh[];
  /** Materials the section plane clips. */
  clipped: Material[];
  /** Glass that glows at dusk. */
  glass: MeshStandardMaterial[];
  /** Warm interior lamp positions (local frame), lit at dusk by the stage's lights. */
  lamps: [number, number, number][];
  people: Object3D;
  callouts: Callout[];
  plan: PlanSheet;
  /** Orbit target and framing radius, local frame. */
  focus: [number, number, number];
  radius: number;
  /** Plinth extent, local frame: the section cut travels across it. */
  extent: [number, number, number, number];
  /** Notes shown in the panel: what this model is and is not. */
  notes: string[];
  detailed: boolean;
  /** Releases what this instance created (not the shared type cache). */
  dispose(): void;
}

export interface TypeModule {
  typeId: string;
  create(ctx: BuildContext, v: Variant): BuildingInstance;
  /** Frees the cached type geometry (page hide). */
  release(): void;
}
