/**
 * Irshalpada house type A: the ground-storey house of PDF p41, built as an
 * architectural model. Readings and assumptions: MODEL_NOTES.md §7.6.
 *
 * Local frame as in irshalpada.data.ts: origin at the plinth's back-left
 * corner on the sheet, x to the right, z towards the front, y up, metres.
 * Levels are the sheet's: plinth +0.60, sill +1.50, eaves +3.10, ridge +5.90.
 *
 * The type's fixed fabric is built once per device tier and cached; door
 * and shutter leaves, planting, everyday life and people are built per house
 * from its plot number, so the 22 houses of this type differ in small ways.
 * The shared vocabulary (roof planes, walls, openings, posts) is in ./vernacular.
 */
import { CylinderGeometry, Group, Matrix4, type BufferGeometry, type Material, type Mesh } from 'three';
import { Bag, box, floorPoly as floorPolyFlat, norm, paintGeo, sphere, type V2, type V3 } from '../kit';
import { bicycle, clump, laundry, person, pot, seeded, tree, tulsi, woodpile, type PersonSpec } from '../props';
import type { Tier } from '../tex';
import type { BuildContext, BuildingInstance, Callout, PlanSheet, TypeModule, Variant } from '../types';
import {
  beam,
  buildLeaves,
  buildPlanes,
  buildWalls,
  compoundWall,
  emptyPlan,
  envelope,
  gable,
  infill,
  jali,
  lean,
  meshes,
  newPocheMat,
  plinthSolid,
  post,
  ROOF_T,
  SOLID,
  steps,
  topOf,
  type Key,
  type Leaf,
  type Plane,
  type Rooms,
  type Wall,
} from './vernacular';

/* ---------- Levels [stated on p41] ---------- */

const PL = 0.6;
const SILL = 1.5;
const EAVE = 3.1;
const RIDGE = 5.9;
const RIDGE_B = 5.4; // the small bedroom wing [read], as in the plan model's data
const HEAD = 2.65; // window head [read from the elevation]
const DOOR = PL + 2.1; // door head [read]

/* ---------- Roof: three gabled wings from the p41 roof plan's arrows, and the chul bay's lean-to ---------- */

const PLANES: Plane[] = [
  ...gable('main', 'roof', -0.3, 0.3, 17.5, 6.6, 'x', RIDGE, EAVE),
  ...gable('living', 'roof', -0.3, 3.45, 7.75, 14.0, 'z', RIDGE, EAVE),
  ...gable('bed', 'roof', 12.4, 3.9, 17.3, 9.8, 'z', RIDGE_B, EAVE),
  lean('bay', 'roof', 3.75, -0.75, 7.15, 0.95, 'n', 2.75, 2.3),
];
const HOUSE_ROOFS = ['main', 'living', 'bed'];

/* ---------- Plan [read from p41 at about 40 px/m on the crop] ---------- */

const PLINTH: V2[] = [[0, 0], [17.7, 0], [17.7, 10.1], [12.4, 10.1], [12.4, 6.3], [8.8, 6.3], [8.8, 13.6], [0, 13.6]];
const BAY_PLINTH: V2[] = [[3.9, -0.55], [7.0, -0.55], [7.0, 0], [3.9, 0]];
const COURT: V2[] = [[8.8, 6.3], [12.4, 6.3], [12.4, 13.6], [8.8, 13.6]];

const ROOMS: { r: [number, number, number, number]; name: string }[] = [
  { r: [3.2, 0.9, 8.0, 4.95], name: 'Kitchen' },
  { r: [8.0, 0.9, 11.6, 4.95], name: 'Bedroom' },
  { r: [13.3, 1.0, 15.15, 2.6], name: 'Bath' },
  { r: [15.15, 1.0, 16.9, 2.6], name: 'WC' },
  { r: [1.1, 4.95, 6.0, 10.7], name: 'Living' },
  { r: [13.0, 5.2, 16.7, 9.2], name: 'Bedroom' },
  { r: [4.0, -0.4, 6.9, 0.9], name: 'Chul' },
];
const rooms: Rooms = { inside: (x, z) => ROOMS.some(({ r }) => x > r[0] && x < r[2] && z > r[1] && z < r[3]) };

const win = (c: number, w: number) => ({ c, w, kind: 'window' as const, y0: SILL, y1: HEAD });
const door = (c: number, w: number) => ({ c, w, kind: 'door' as const, y0: PL, y1: DOOR });
const wall = (a: V2, b: V2, ops: Wall['ops'] = [], top: Wall['top'] = HOUSE_ROOFS): Wall => ({ a, b, y0: PL, ops, top });

const WALLS: Wall[] = [
  // Back of kitchen and bedroom: the chul bay opens off the kitchen.
  wall([3.2, 0.9], [11.6, 0.9], [{ c: 2.25, w: 2.9, kind: 'open', y0: PL, y1: 2.35 }, win(6.4, 1.0)]),
  wall([3.2, 0.9], [3.2, 4.95]),
  wall([8.0, 0.9], [8.0, 4.95]),
  wall([11.6, 0.9], [11.6, 4.95]),
  // The long wall to the courtyard verandah and the rear verandah.
  wall([1.1, 4.95], [11.6, 4.95], [win(0.8, 0.9), door(2.8, 0.9), door(6.25, 0.9), door(7.45, 0.8), win(9.3, 1.0)]),
  wall([1.1, 4.95], [1.1, 10.7]),
  // Living room to the courtyard verandah: the wall-wide louvred folding doors of the p41 render.
  wall([6.0, 4.95], [6.0, 10.7], [{ c: 2.65, w: 4.0, kind: 'louvre', y0: PL, y1: PL + 2.5 }]),
  // Living room front: a double door between two windows (p41 elevation, mirrored).
  wall([1.1, 10.7], [6.0, 10.7], [win(0.75, 0.9), { c: 2.45, w: 1.4, kind: 'door2', y0: PL, y1: DOOR }, win(4.15, 0.9)]),
  // Toilet and bath, apart from the rooms on the same plinth [stated].
  wall([13.3, 1.0], [16.9, 1.0], [{ c: 0.9, w: 0.6, kind: 'vent', y0: 2.2, y1: 2.6 }, { c: 2.7, w: 0.6, kind: 'vent', y0: 2.2, y1: 2.6 }]),
  wall([13.3, 2.6], [16.9, 2.6], [door(0.6, 0.75), door(2.8, 0.7)]),
  wall([13.3, 1.0], [13.3, 2.6]),
  wall([15.15, 1.0], [15.15, 2.6]),
  wall([16.9, 1.0], [16.9, 2.6]),
  // Second bedroom.
  wall([13.0, 5.2], [16.7, 5.2], [door(0.55, 0.8)]),
  wall([16.7, 5.2], [16.7, 9.2], [win(0.9, 0.75), win(2.9, 0.75)]),
  wall([13.0, 9.2], [16.7, 9.2], [win(1.85, 1.2)]),
  wall([13.0, 5.2], [13.0, 9.2], [win(2.1, 0.9)]),
  // The chul bay: terracotta jali to the cooking space [stated], on all three faces [read].
  wall([4.0, 0.9], [4.0, -0.4], [{ c: 0.65, w: 0.8, kind: 'jali', y0: 1.45, y1: 2.05 }], ['bay']),
  wall([4.0, -0.4], [6.9, -0.4], [{ c: 1.45, w: 2.4, kind: 'jali', y0: 1.45, y1: 2.05 }], ['bay']),
  wall([6.9, -0.4], [6.9, 0.9], [{ c: 0.65, w: 0.8, kind: 'jali', y0: 1.45, y1: 2.05 }], ['bay']),
];

/** Verandah posts [read: p41 plan circles and renders], and the beams they carry at the wall plate. */
const POSTS: V2[] = [[0.3, 0.9], [0.3, 6.0], [0.3, 9.7], [0.3, 13.4], [7.15, 13.4], [7.15, 10.4], [7.15, 6.0], [11.6, 6.0], [16.9, 4.0]];
const BEAMS: [V2, V2][] = [
  [[0.3, 0.9], [0.3, 13.4]],
  [[0.3, 13.4], [7.15, 13.4]],
  [[7.15, 6.0], [7.15, 13.4]],
  [[7.15, 6.0], [13.0, 6.0]],
  [[0.3, 0.9], [3.2, 0.9]],
  [[16.9, 2.6], [16.9, 5.2]],
];
/** Gable ends: the plane they stand in, their span along it, and the apex. */
const GABLES: { axis: 'x' | 'z'; at: number; s0: number; s1: number; apex: number; roofs: string }[] = [
  { axis: 'x', at: 0.3, s0: 0.9, s1: 6.0, apex: 3.45, roofs: 'main' },
  { axis: 'x', at: 16.9, s0: 0.9, s1: 6.0, apex: 3.45, roofs: 'main' },
  { axis: 'z', at: 13.4, s0: 0.3, s1: 7.15, apex: 3.725, roofs: 'living' },
  { axis: 'z', at: 9.2, s0: 13.0, s1: 16.7, apex: 14.85, roofs: 'bed' },
];

/** Plot [assumed]: compound wall round the house, gate on the line of the front steps. */
const PLOT = { x0: -2.4, z0: -3.4, x1: 20.1, z1: 17.2, gate: [2.6, 4.8] as V2 };

/* ---------- Interior hints [assumed] ---------- */

function furniture(bag: Bag<Key>): void {
  const y = PL;
  // Kitchen: the chul platform in the bay with its two fire mouths [stated: "Chul"].
  bag.add('plinth', box(4.15, y, -0.3, 6.75, y + 0.42, 0.35));
  bag.add('basalt', box(4.6, y + 0.42, -0.2, 5.2, y + 0.48, 0.2), box(5.6, y + 0.42, -0.2, 6.2, y + 0.48, 0.2));
  pot(4.9, y + 0.48, 0.0, 0.14, bag as Bag);
  bag.add('timber', box(3.32, y + 1.4, 1.3, 3.6, y + 1.44, 3.6));
  for (let z = 1.5; z < 3.5; z += 0.45) bag.add('brass', norm(new CylinderGeometry(0.09, 0.11, 0.2, 10).translate(3.46, y + 1.54, z)));
  bag.add('clay', sphere(7.4, y + 0.35, 1.4, 0.26, 1, 0.9, 1));
  // Living: a timber diwan, a trunk.
  bag.add('timber', box(1.35, y, 6.0, 2.25, y + 0.38, 8.0));
  bag.add('cloth', paintGeo(box(1.38, y + 0.38, 6.05, 2.22, y + 0.5, 7.95), 0x8c2f39));
  bag.add('cloth', paintGeo(box(1.4, y + 0.5, 6.1, 1.7, y + 0.72, 6.6), 0xd9a441));
  bag.add('steel', box(4.6, y, 5.3, 5.6, y + 0.5, 5.85));
  // Bedrooms: cots with bedding, a steel cupboard.
  for (const [x0, z0] of [[8.3, 1.3], [15.0, 6.2]] as V2[]) {
    bag.add('timber', box(x0, y, z0, x0 + 1.0, y + 0.45, z0 + 1.95));
    bag.add('cloth', paintGeo(box(x0 + 0.04, y + 0.45, z0 + 0.04, x0 + 0.96, y + 0.55, z0 + 1.9), 0x3e5f8a));
  }
  bag.add('steel', box(10.6, y, 1.2, 11.35, y + 1.8, 1.75));
  bag.add('steel', norm(new CylinderGeometry(0.17, 0.14, 0.32, 12).translate(14.4, y + 0.16, 1.6)));
  bag.add('plaster', box(15.8, y, 1.4, 16.3, y + 0.08, 2.0));
}

/* ---------- Type cache ---------- */

interface Cached {
  body: Map<Key, BufferGeometry>;
  roof: Map<Key, BufferGeometry>;
  plan: PlanSheet;
  leaves: Leaf[];
}
const cache = new Map<Tier, Cached>();

function buildType(tier: Tier): Cached {
  const hit = cache.get(tier);
  if (hit) return hit;
  const body = new Bag<Key>();
  const roof = new Bag<Key>();
  const plan = emptyPlan([PLOT.x0 - 0.6, PLOT.z0 - 0.6, PLOT.x1 + 0.6, PLOT.z1 + 0.6]);
  plan.plinth.push(PLINTH, BAY_PLINTH);
  plan.courts.push(COURT);
  plinthSolid(PLINTH, 0, PL, body);
  plinthSolid(BAY_PLINTH, 0, PL, body);
  // Steps [read: p41 plan hatching and renders; risers assumed at 200 mm].
  steps(0.4, 13.6, 7.0, 14.3, 'n', 3, PL, body, plan);
  steps(8.8, 7.6, 9.5, 9.6, 'w', 3, PL, body, plan);
  steps(9.7, 6.3, 11.6, 7.0, 'n', 3, PL, body, plan);
  steps(11.7, 7.2, 12.4, 8.3, 'e', 3, PL, body, plan);
  steps(1.2, -0.7, 3.0, 0, 's', 3, PL, body, plan);
  steps(14.1, 10.1, 15.6, 10.8, 'n', 3, PL, body, plan);

  const leaves = buildWalls(WALLS, PLANES, rooms, body, () => plan);
  // Freestanding terracotta jali screen by the WC [read: hatched on the p41 plan].
  jali(new Matrix4().makeRotationY(Math.PI / 2).setPosition(16.45, 0, 3.75), 2.0, PL, PL + 2.0, body);
  body.add('plaster', box(16.3, PL + 2.0, 2.7, 16.6, PL + 2.12, 4.8));
  plan.windows.push({ a: [16.45, 2.75], b: [16.45, 4.75] });

  for (const p of POSTS) {
    post(p[0], p[1], PL, EAVE - 0.16, body);
    plan.posts.push(p);
  }
  for (const [a, b] of BEAMS) beam(a, b, EAVE, EAVE, body);
  furniture(body);

  buildPlanes(PLANES, { roof });
  for (const g of GABLES) {
    const mine = PLANES.filter((p) => p.id.startsWith(g.roofs + '-'));
    const top = (s: number) => (g.axis === 'x' ? envelope(mine, g.at, s) : envelope(mine, s, g.at)) - ROOF_T - 0.02;
    infill(g.axis, g.at, g.s0, g.s1, EAVE, top, g.apex, roof);
  }
  void topOf;

  // Plot: yard, compound wall, gate piers, path.
  const { x0, z0, x1, z1, gate } = PLOT;
  body.add('grass', floorPolyFlat([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0.012));
  body.add('earth', floorPolyFlat([[x0 + 0.2, z0 + 0.2], [x1 - 0.2, z0 + 0.2], [x1 - 0.2, -0.05], [x0 + 0.2, -0.05]], 0.02));
  compoundWall([x0, z0], [x1, z0], body, plan);
  compoundWall([x0, z0], [x0, z1], body, plan);
  compoundWall([x1, z0], [x1, z1], body, plan);
  compoundWall([x0, z1], [gate[0] - 0.2, z1], body, plan);
  compoundWall([gate[1] + 0.2, z1], [x1, z1], body, plan);
  for (const gx of [gate[0] - 0.2, gate[1] + 0.2]) {
    body.add('plaster', box(gx - 0.2, 0, z1 - 0.2, gx + 0.2, 1.4, z1 + 0.2));
    body.add('basalt', box(gx - 0.25, 1.4, z1 - 0.25, gx + 0.25, 1.5, z1 + 0.25));
  }
  for (let z = 14.45, i = 0; z < z1 - 0.1; z += 0.52, i++) {
    const j = (i % 2) * 0.12;
    body.add('basalt', box(3.2 + j - 0.06, 0, z, 4.25 + j - 0.06, 0.05, z + 0.46));
  }
  plan.boundary = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  plan.rooms = ROOMS.map(({ r, name }) => ({ at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as V2, name }));
  plan.rooms.push({ at: [10.6, 11.2], name: 'Courtyard' }, { at: [3.7, 12.1], name: 'Verandah' });
  plan.trees.push({ at: [10.6, 9.4], r: 2.6 });

  const c: Cached = { body: body.merge(), roof: roof.merge(), plan, leaves };
  cache.set(tier, c);
  return c;
}


/* ---------- Per house ---------- */

export const module: TypeModule = {
  typeId: 'irshalpada-house-a',
  release() {
    for (const c of cache.values()) {
      c.body.forEach((g) => g.dispose());
      c.roof.forEach((g) => g.dispose());
    }
    cache.clear();
  },
  create(ctx: BuildContext, v: Variant): BuildingInstance {
    const t = buildType(ctx.tier);
    const mats = ctx.mats;
    const r = seeded(v.seed * 7919 + 13);
    const group = new Group();
    group.name = 'irshalpada-house-a';
    const roof = new Group();
    roof.name = 'roof';
    group.add(roof);
    const poche: Mesh[] = [];
    const pocheMat = newPocheMat();
    meshes(t.body, mats, group, poche, pocheMat);
    meshes(t.roof, mats, roof, poche, pocheMat);

    // Per house: leaves, planting, everyday life, people.
    const own: BufferGeometry[] = [];
    const mine = new Bag<Key>();
    buildLeaves(t.leaves, r, mine);
    const fol = new Bag<Key>();
    // The courtyard tree [stated on the plan], the back-yard trees [read], a front tree [assumed].
    tree({ at: [10.6, 9.4], height: 6.2, spread: 5.0, seed: v.seed + 1, green: 0x5f7a3c }, fol as Bag, fol as Bag);
    tree({ at: [6.9, -2.3], height: 8.5, spread: 6.5, seed: v.seed + 2, green: 0x4c6534 }, fol as Bag, fol as Bag);
    tree({ at: [18.7, -1.6], height: 7.2, spread: 5.2, seed: v.seed + 3 }, fol as Bag, fol as Bag);
    if (r() > 0.3) tree({ at: [18.8, 16.0], height: 5.2, spread: 4.0, seed: v.seed + 4, green: 0x6b7f3f }, fol as Bag, fol as Bag);
    // Kitchen garden in the front yard [assumed]: raised beds of greens and a row of marigolds.
    for (let i = 0; i < 3; i++) {
      const z = 11.6 + i * 1.5;
      mine.add('earth', box(13.6, 0, z, 19.2, 0.16, z + 0.9));
      for (let x = 13.9; x < 19.0; x += 0.45) clump(x + (r() - 0.5) * 0.1, 0.16, z + 0.45, 0.18 + r() * 0.08, i === 2 ? 0xd98a1f : r() > 0.5 ? 0x4f7a32 : 0x6a8f3a, Math.round(x * 10) + i, fol as Bag);
    }
    tulsi(10.6, 12.6, mine as Bag, fol as Bag);
    for (let i = 0; i < 9; i++) clump(-1.6 + r() * 0.6, 0.0, -2.5 + i * 2.2, 0.35 + r() * 0.2, 0x58703a, v.seed + i, fol as Bag);
    // Everyday life: laundry [read: p38 photo of the old village], firewood for the chul, pots, a bicycle.
    laundry([9.4, -2.5], [15.6, -2.5], v.seed, fol as Bag, mine as Bag);
    woodpile(8.2, -1.4, fol as Bag, v.seed);
    pot(7.3, 0.0, -0.9, 0.22, mine as Bag);
    pot(7.7, 0.0, -0.75, 0.17, mine as Bag);
    if (r() > 0.25) bicycle(6.3, 16.3, 90 + (r() - 0.5) * 20, mine as Bag);
    meshes(mine.merge(), mats, group, poche, pocheMat, own);
    meshes(fol.merge(), mats, group, poche, pocheMat, own);

    // People at true scale, in the poses of the PDF's renders.
    const crowd: PersonSpec[] = [
      { at: [6.7, 12.9], y: PL, face: 200, height: 1.56, pose: 'stand', drape: true, top: 0xc0392b, bottom: 0xd35400 },
      { at: [4.9, 14.05], y: 0.4, face: 10, height: 1.62, pose: 'sit', top: 0xefe9dc, bottom: 0xefe9dc },
      { at: [5.6, 15.7], y: 0, face: 150, height: 1.12, pose: 'play', top: 0x2e86c1, bottom: 0x5d4037 },
      { at: [2.0, 16.3], y: 0, face: 30, height: 1.18, pose: 'play', top: 0xe8c547, bottom: 0x8e2b32 },
      { at: [10.2, 10.8], y: 0, face: 300, height: 1.6, pose: 'carry', drape: true, top: 0x6c3483, bottom: 0x1f6f8b },
      { at: [-0.9, 11.6], y: 0, face: 95, height: 1.66, pose: 'stick', top: 0xf4f1ea, bottom: 0xe8e2d4, hair: 0xd8d4cc },
    ];
    if (v.seed % 2) crowd.push({ at: [12.0, -1.6], y: 0, face: 260, height: 1.74, pose: 'walk', top: 0x7a8b99, bottom: 0x2c3e50 });
    const people = new Group();
    people.name = 'people';
    const pg = new Bag<Key>();
    for (const p of crowd) pg.add('people', person(p));
    meshes(pg.merge(), mats, people, [], pocheMat, own);
    group.add(people);

    const callouts: Callout[] = [
      { at: [3.7, 4.9, 9.0], facing: [0, 1, 0.4], layer: 0, title: 'Mangalore tile roof', detail: 'Ridge +5.90 m, eaves +3.10 m', source: 'pdf' },
      { at: [7.75, 2.55, 11.0], facing: [1, 0, 0], layer: 0, title: 'Carved timber valance', detail: 'Along every eave and barge, as rendered', source: 'pdf' },
      { at: [0.3, 4.1, 3.45], facing: [-1, 0, 0], layer: 0, title: 'Lime-plastered gable', detail: 'Steep pitch from the stated levels', source: 'pdf' },
      { at: [5.45, 1.75, -0.52], facing: [0, 0, -1], title: 'Terracotta jali to the chul', detail: 'Smoke out, air in, as the PDF notes', source: 'pdf' },
      { at: [6.1, 1.8, 7.6], facing: [1, 0, 0], title: 'Folding louvred doors', detail: 'Living room opens to the verandah', source: 'pdf' },
      { at: [10.6, 0.4, 8.0], facing: [0, 1, 0], title: 'Courtyard with a tree', detail: 'Every room opens onto it', source: 'pdf' },
      { at: [7.15, 2.0, 13.4], facing: [0.3, 0, 1], title: 'Turned timber posts', detail: 'Brass rings, bracketed capital', source: 'pdf' },
      { at: [0.3, 0.72, 13.4], facing: [0, 0, 1], title: 'Basalt post bases', detail: 'Local stone, not stated', source: 'assumed' },
      { at: [1.0, 0.45, 13.6], facing: [0, 0, 1], title: 'Plinth +0.60 m', detail: 'White plastered, three steps', source: 'pdf' },
      { at: [14.85, 2.0, 9.32], facing: [0, 0, 1], title: 'Casement and shutters', detail: '2 × 3 panes, timber shutters', source: 'pdf' },
      { at: [16.7, 2.4, 5.6], facing: [1, 0, 0], title: 'CSEB wall, 230 mm', detail: 'Material stated; thickness assumed', source: 'assumed' },
      { at: [15.1, 2.3, 2.62], facing: [0, 0, 1], title: 'Toilet and bath apart', detail: 'On the same plinth, as asked for', source: 'pdf' },
      { at: [3.5, 0.62, 7.8], facing: [0, 1, 0], title: 'Mud floor', detail: 'Stated in the materials', source: 'pdf' },
      { at: [16.4, 0.35, 13.0], facing: [0, 1, 0], title: 'Kitchen garden', detail: 'Not in the drawings', source: 'assumed' },
      { at: [20.1, 1.1, 8.0], facing: [1, 0, 0], title: 'Compound wall 1.2 m', detail: 'Height and finish assumed', source: 'assumed' },
      { at: [12.5, 1.8, -2.5], facing: [0, 0, -1], title: 'Washing line', detail: 'As in the photos of the old village', source: 'assumed' },
    ];
    const lamps: V3[] = [[3.5, 2.6, 8.0], [5.5, 2.3, 2.8], [14.8, 2.5, 7.2]];

    return {
      group,
      layers: [{ obj: roof, k: 1 }],
      liftLabel: ['Lift the roof', 'Lower the roof'],
      poche,
      clipped: [...SOLID.map((k) => (mats as unknown as Record<string, Material>)[k]).filter(Boolean), mats.glass, mats.fret, mats.brass, mats.steel, mats.cloth],
      glass: [mats.glass],
      lamps,
      people,
      callouts,
      plan: t.plan,
      focus: [8.85, 1.6, 6.8],
      radius: 15,
      extent: [-0.6, -0.8, 17.9, 14.4],
      detailed: true,
      notes: [
        'Built from the p41 plan, roof plan, sections, front elevation and four renders. Heights are as written on the sections.',
        'The p41 front elevation is drawn mirrored against the plan; the plan is followed, and the elevation gives the window, door and post styles.',
        'Plan sizes come from the fitted sheet scale and may be out by about a fifth (MODEL_NOTES §2).',
      ],
      dispose() {
        own.forEach((g) => g.dispose());
        pocheMat.dispose();
      },
    };
  },
};
