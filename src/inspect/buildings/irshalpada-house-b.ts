/**
 * Irshalpada house type B: the ground+1 house of PDF p42, built as an
 * architectural model. Readings and assumptions: MODEL_NOTES.md §7.10.
 *
 * Local frame as in irshalpada.data.ts (HOUSE_G1): origin at the plinth's
 * back-left corner on the sheet, x to the right, z towards the front, y up.
 * The house's east side (x = 15.6) is a party wall: in every cluster the two
 * type B houses stand back to back as a mirrored pair (p40), so the twin is
 * shown beside it as plain massing.
 *
 * Levels [stated on p42]: plinth +0.60, ground sill +1.50, window head
 * +2.60, lean-to roofs +2.60 to +4.60, eaves +3.10, first floor +3.50, upper
 * sill +4.60, upper head +5.80, ridge +8.50.
 *
 * It lifts apart in three layers: the ground-floor roofs, the upper storey
 * (bamboo floor, rooms, balcony) and the upper roof.
 */
import { CylinderGeometry, Group, Matrix4, Mesh, type BufferGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HOUSE_G1 } from '../../models/irshalpada.data';
import { buildHouse } from '../../models/irshalpada';
import { Bag, box, boxUV, floorPoly, member, norm, paintGeo, quad, rod, sphere, type V2, type V3 } from '../kit';
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
  jali,
  lean,
  meshes,
  newPocheMat,
  plinthSolid,
  post,
  ROOF_T,
  SOLID,
  steps,
  type Key,
  type Leaf,
  type Plane,
  type Rooms,
  type Wall,
} from './vernacular';

/* ---------- Levels ---------- */

const PL = 0.6;
const SILL = 1.5;
const HEAD = 2.6;
const DOOR = PL + 2.1;
const EAVE = 3.1;
const SOFFIT = 3.3; // underside of the bamboo floor [read: slab about 0.2 m]
const FF = 3.5; // first floor [stated +3500]
const SILL_UP = 4.6;
const HEAD_UP = 5.8;
const DOOR_UP = FF + 2.1;
const PLATE_UP = 6.3; // upper wall plate [read: scaled off section AA′]
const RIDGE = 8.5;
const PARTY = 15.6; // the shared wall with the mirrored twin

/* ---------- Roofs, read from the p42 roof plan's arrows and sections ---------- */

const PLANES: Plane[] = [
  // Upper gable over the two-storey block, eaves on the back wall and the balcony posts.
  ...gable('upper', 'upperRoof', 5.0, 0.4, PARTY, 7.2, 'x', RIDGE, PLATE_UP),
  // West lean-to over the toilet, bath and the west bedroom, falling west.
  lean('left', 'roof', -0.6, -0.6, 5.6, 10.0, 'w', 4.6, 2.6),
  // East lean-to over the living room and its front verandah, falling towards the courtyard.
  lean('right', 'roof', 9.0, 6.4, PARTY, 13.2, 'w', 4.6, 2.6),
  // Small canopy over the courtyard's west verandah (p42 elevation and section BB′).
  lean('canopy', 'roof', 5.45, 6.6, 7.7, 9.6, 'e', 3.45, 2.9),
  // The chul bay's lean-to.
  lean('bay', 'roof', 10.2, 0.0, 12.5, 1.1, 'n', 2.95, 2.6),
];
/** The twin's roofs, mirrored about the party wall: they bury the edges that meet it. */
const TWIN_PLANES: Plane[] = PLANES.filter((p) => p.x1 >= PARTY - 0.01).map((p) => ({
  ...p,
  id: `twin-${p.id}`,
  x0: 2 * PARTY - p.x1,
  x1: 2 * PARTY - p.x0,
  ...(p.axis === 'x' ? { h0: p.h1, h1: p.h0 } : {}),
}));

/* ---------- Plan [read from p42 at about 41 px/m on the crop] ---------- */

const PLINTH: V2[] = [[0, 0], [PARTY, 0], [PARTY, 12.9], [9.4, 12.9], [9.4, 6.8], [5.6, 6.8], [5.6, 9.4], [0, 9.4]];
const COURT: V2[] = [[5.6, 6.8], [9.4, 6.8], [9.4, 12.9], [5.6, 12.9]];

type R = [number, number, number, number];
const GROUND: { r: R; name: string }[] = [
  { r: [0.85, 1.05, 2.1, 2.75], name: 'WC' },
  { r: [2.1, 1.05, 4.35, 2.75], name: 'Bath' },
  { r: [1.0, 5.1, 4.5, 8.9], name: 'Bedroom' },
  { r: [5.6, 1.0, 9.0, 4.9], name: 'Bedroom' },
  { r: [9.0, 1.0, 13.5, 4.9], name: 'Kitchen' },
  { r: [13.5, 1.0, 15.5, 4.9], name: 'Stair' },
  { r: [10.85, 4.9, 15.5, 10.3], name: 'Living' },
  { r: [10.4, 0.25, 12.3, 1.0], name: 'Chul' },
];
const UPPER: { r: R; name: string }[] = [
  { r: [5.6, 1.0, 9.0, 4.9], name: 'Bedroom' },
  { r: [9.0, 1.0, 13.5, 4.9], name: 'Bedroom' },
  { r: [13.5, 1.0, 15.5, 4.9], name: 'Stair' },
];
const inR = (list: { r: R }[], x: number, z: number) => list.some(({ r }) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
const rooms: Rooms = { inside: (x, z, y) => inR(y > FF ? UPPER : GROUND, x, z) };

const win = (c: number, w: number, up = false) => ({ c, w, kind: 'window' as const, y0: up ? SILL_UP : SILL, y1: up ? HEAD_UP : HEAD });
const door = (c: number, w: number, up = false) => ({ c, w, kind: 'door' as const, y0: up ? FF : PL, y1: up ? DOOR_UP : DOOR });

/** Ground walls under the slab stop at its soffit; elsewhere they meet the lean-tos. */
const groundTop = (x: number, z: number) => {
  const underSlab = x > 5.4 && z < 6.6;
  const roof = envelope(PLANES.filter((p) => p.layer === 'roof'), x, z) - ROOF_T;
  return underSlab ? (Number.isFinite(roof) ? Math.min(SOFFIT, roof) : SOFFIT) : Number.isFinite(roof) ? roof : EAVE;
};
const g = (a: V2, b: V2, ops: Wall['ops'] = []): Wall => ({ a, b, y0: PL, ops, top: groundTop });
const u = (a: V2, b: V2, ops: Wall['ops'] = []): Wall => ({ a, b, y0: FF, ops, top: ['upper'] });
const bay = (a: V2, b: V2, ops: Wall['ops'] = []): Wall => ({ a, b, y0: PL, ops, top: ['bay'] });

const GROUND_WALLS: Wall[] = [
  // Toilet and bath, apart from the rooms on the same plinth [stated].
  g([0.85, 1.05], [4.35, 1.05], [{ c: 0.6, w: 0.5, kind: 'vent', y0: 2.15, y1: 2.55 }, { c: 2.35, w: 0.6, kind: 'vent', y0: 2.15, y1: 2.55 }]),
  g([0.85, 2.75], [4.35, 2.75], [door(0.85, 0.7), door(3.0, 0.7)]),
  g([0.85, 1.05], [0.85, 2.75]),
  g([2.1, 1.05], [2.1, 2.75]),
  g([4.35, 1.05], [4.35, 2.75]),
  // West bedroom.
  g([1.0, 5.1], [4.5, 5.1], [door(2.95, 0.8)]),
  g([1.0, 5.1], [1.0, 8.9], [win(1.05, 0.9)]),
  g([1.0, 8.9], [4.5, 8.9], [win(1.5, 1.2)]),
  g([4.5, 5.1], [4.5, 8.9], [win(2.0, 0.9)]),
  // The two-storey block: bedroom, kitchen and stair, under the bamboo floor.
  g([5.6, 1.0], [PARTY - 0.1, 1.0], [win(2.2, 0.9), { c: 5.75, w: 1.9, kind: 'open', y0: PL, y1: 2.35 }]),
  g([5.6, 1.0], [5.6, 4.9]),
  g([9.0, 1.0], [9.0, 4.9]),
  g([13.5, 1.0], [13.5, 4.9]),
  g([5.6, 4.9], [PARTY - 0.1, 4.9], [win(1.35, 1.1), door(2.95, 0.75), door(3.9, 0.8), { c: 8.9, w: 1.6, kind: 'open', y0: PL, y1: DOOR }]),
  // Party wall, full height to the roofs.
  g([PARTY - 0.1, 1.0], [PARTY - 0.1, 10.3]),
  // Living room: louvred folding doors to the courtyard verandah, double door between windows to the front.
  g([10.85, 4.9], [10.85, 10.3], [{ c: 3.1, w: 3.0, kind: 'louvre', y0: PL, y1: PL + 2.25 }]),
  g([10.85, 10.3], [PARTY - 0.1, 10.3], [win(1.0, 0.9), { c: 2.35, w: 1.3, kind: 'door2', y0: PL, y1: DOOR }, win(3.8, 0.9)]),
  // Chul bay with terracotta jali [stated on p39, read on the p42 section].
  bay([10.4, 1.0], [10.4, 0.25], [{ c: 0.375, w: 0.55, kind: 'jali', y0: 1.5, y1: 2.35 }]),
  bay([10.4, 0.25], [12.3, 0.25], [{ c: 0.95, w: 1.6, kind: 'jali', y0: 1.5, y1: 2.35 }]),
  bay([12.3, 0.25], [12.3, 1.0], [{ c: 0.375, w: 0.55, kind: 'jali', y0: 1.5, y1: 2.35 }]),
];

const UPPER_WALLS: Wall[] = [
  u([5.6, 1.0], [PARTY - 0.1, 1.0], [win(1.7, 1.2, true), win(5.65, 1.2, true)]),
  // West gable wall, open over the balcony's end below a beam.
  u([5.6, 1.0], [5.6, 6.6], [{ c: 4.75, w: 1.7, kind: 'open', y0: FF, y1: 5.9 }]),
  u([9.0, 1.0], [9.0, 4.9]),
  u([13.5, 1.0], [13.5, 4.9]),
  // Bedrooms open onto the balcony (p42 first floor plan and elevation): window and door, door; stair hall open.
  u([5.6, 4.9], [PARTY - 0.1, 4.9], [win(1.3, 1.1, true), door(2.95, 0.8, true), door(3.9, 0.8, true), { c: 8.9, w: 1.8, kind: 'open', y0: FF, y1: DOOR_UP }]),
  u([PARTY - 0.1, 1.0], [PARTY - 0.1, 6.6]),
];

/** Posts [read: p42 plan, elevation and section]: stacked at the balcony edge, and on the verandahs. */
const GROUND_POSTS: { at: V2; top: number }[] = [
  { at: [5.5, 6.6], top: SOFFIT - 0.16 },
  { at: [9.3, 6.6], top: SOFFIT - 0.16 },
  { at: [13.6, 6.6], top: SOFFIT - 0.16 },
  { at: [5.45, 9.2], top: 4.4 - 0.16 }, // carries the west lean-to's high edge [assumed]
  { at: [9.3, 9.6], top: 2.53 - 0.16 },
  { at: [9.3, 12.6], top: 2.53 - 0.16 },
  { at: [12.4, 12.6], top: 3.44 - 0.16 }, // front verandah posts [assumed: needed to carry the lean-to]
];
const UPPER_POSTS: V2[] = [[5.5, 6.6], [9.3, 6.6], [13.6, 6.6]];

/** Plot [read from the p42 plan's compound walls; height assumed]. */
const PLOT_WALLS: [V2, V2][] = [
  [[-0.75, -2.2], [PARTY, -2.2]],
  [[-0.75, -2.2], [-0.75, 9.8]],
  [[-0.75, 9.8], [6.9, 9.8]],
  [[6.9, 9.8], [6.9, 14.4]],
];

/* ---------- Building ---------- */

interface Cached {
  ground: Map<Key, BufferGeometry>;
  roof: Map<Key, BufferGeometry>;
  upper: Map<Key, BufferGeometry>;
  upperRoof: Map<Key, BufferGeometry>;
  plan: PlanSheet;
  leaves: Leaf[];
  upperLeaves: Leaf[];
}
const cache = new Map<Tier, Cached>();

/** A slab: bamboo body and soffit, mud screed on top [stated: bamboo slab, mud screed, lime layer]. */
function slab(x0: number, z0: number, x1: number, z1: number, bag: Bag<Key>): void {
  bag.add('bamboo', box(x0, SOFFIT, z0, x1, FF - 0.04, z1));
  bag.add('mud', box(x0, FF - 0.04, z0, x1, FF, z1));
}

/** Balcony railing [read from the p42 render]: pierced pickets in pointed arches, a top rail, newels. */
function railing(a: V2, b: V2, bag: Bag<Key>): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const h = 0.95;
  bag.add('rail', quad([a[0], FF, a[1]], [b[0], FF, b[1]], [b[0], FF + h, b[1]], [a[0], FF + h, a[1]], [[0, 0], [L / 0.16, 0], [L / 0.16, 1], [0, 1]]));
  bag.add('timber', member([a[0], FF + h, a[1]], [b[0], FF + h, b[1]], 0.07, 0.06));
  const n = Math.max(1, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    bag.add('timber', box(x - 0.045, FF, z - 0.045, x + 0.045, FF + h + 0.12, z + 0.045));
    bag.add('timber', sphere(x, FF + h + 0.16, z, 0.05));
  }
}

/** Dog-leg stair [assumed form; the stair is drawn on both plans]: 16 risers of 181 mm in two flights. */
function stair(bag: Bag<Key>): void {
  const rise = (FF - PL) / 16;
  const tread = 0.27;
  const front = 4.75;
  for (let i = 1; i <= 8; i++) {
    const z1 = front - (i - 1) * tread;
    bag.add('plaster', box(14.5, PL, z1 - tread, 15.38, PL + i * rise, z1));
  }
  const landingZ = front - 8 * tread;
  bag.add('plaster', box(13.62, PL, 1.12, 15.38, PL + 8 * rise, landingZ));
  for (let i = 9; i <= 16; i++) {
    const z0 = landingZ + (i - 9) * tread;
    bag.add('timber', box(13.62, PL + i * rise - 0.06, z0, 14.48, PL + i * rise, z0 + tread));
  }
  bag.add('timber', member([14.48, PL + 8 * rise - 0.3, landingZ], [14.48, FF - 0.3, front], 0.08, 0.25));
  bag.add('timber', rod([14.5, PL + 8 * rise + 0.9, landingZ], [14.5, FF + 0.9, front], 0.025));
  for (let i = 9; i <= 16; i += 2) bag.add('timber', rod([14.5, PL + i * rise, landingZ + (i - 9) * tread + 0.1], [14.5, PL + i * rise + 0.9, landingZ + (i - 9) * tread + 0.1], 0.015, 5));
}

function furniture(ground: Bag<Key>, upper: Bag<Key>): void {
  const y = PL;
  // Kitchen: chul platform in the bay, shelf with brass vessels, a water pot.
  ground.add('plinth', box(10.55, y, 0.35, 12.15, y + 0.42, 0.95));
  ground.add('basalt', box(10.8, y + 0.42, 0.45, 11.3, y + 0.48, 0.85), box(11.5, y + 0.42, 0.45, 12.0, y + 0.48, 0.85));
  ground.add('timber', box(9.12, y + 1.4, 1.4, 9.4, y + 1.44, 3.8));
  for (let z = 1.6; z < 3.7; z += 0.45) ground.add('brass', norm(new CylinderGeometry(0.09, 0.11, 0.2, 10).translate(9.26, y + 1.54, z)));
  ground.add('clay', sphere(13.1, y + 0.35, 1.4, 0.26, 1, 0.9, 1));
  // Living: diwan and trunk. Bedrooms: cots, a cupboard.
  ground.add('timber', box(14.4, y, 6.8, 15.3, y + 0.38, 8.8));
  ground.add('cloth', paintGeo(box(14.43, y + 0.38, 6.85, 15.27, y + 0.5, 8.75), 0x2f5d8a));
  ground.add('steel', box(11.1, y, 5.1, 12.1, y + 0.5, 5.65));
  for (const [x0, z0, b] of [[1.3, 6.6, ground], [6.0, 1.3, ground], [6.0, 1.3, upper], [11.9, 1.3, upper]] as [number, number, Bag<Key>][]) {
    const fy = b === upper ? FF : PL;
    b.add('timber', box(x0, fy, z0, x0 + 1.0, fy + 0.45, z0 + 1.95));
    b.add('cloth', paintGeo(box(x0 + 0.04, fy + 0.45, z0 + 0.04, x0 + 0.96, fy + 0.55, z0 + 1.9), b === upper ? 0x8c2f39 : 0x3e5f8a));
  }
  upper.add('steel', box(9.3, FF, 1.2, 10.1, FF + 1.8, 1.75));
  upper.add('timber', box(7.6, FF, 4.2, 8.6, FF + 0.5, 4.7));
  ground.add('steel', norm(new CylinderGeometry(0.17, 0.14, 0.32, 12).translate(3.4, y + 0.16, 1.6)));
  ground.add('plaster', box(1.2, y, 1.4, 1.7, y + 0.08, 2.0));
}

/** The mirrored twin, as plain massing from the plan model's own geometry. */
function twinGeometry(): BufferGeometry {
  const L = buildHouse(HOUSE_G1);
  const parts = [...L.walls, ...L.plinth, ...L.roofs, ...L.timber];
  for (const k of ['foliage', 'court', 'dark', 'water', 'jali'] as const) L[k].forEach((x) => x.dispose());
  for (const p of parts) for (const n of Object.keys(p.attributes)) if (n !== 'position' && n !== 'normal') p.deleteAttribute(n);
  const m = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  // Mirror about the party wall; flip the winding so faces stay outward.
  m.applyMatrix4(new Matrix4().makeTranslation(2 * PARTY, 0, 0).multiply(new Matrix4().makeScale(-1, 1, 1)));
  const pos = m.getAttribute('position').array as Float32Array;
  for (let i = 0; i < pos.length; i += 9) for (let k = 0; k < 3; k++) [pos[i + 3 + k], pos[i + 6 + k]] = [pos[i + 6 + k], pos[i + 3 + k]];
  m.computeVertexNormals();
  return boxUV(m);
}

function buildType(tier: Tier): Cached {
  const hit = cache.get(tier);
  if (hit) return hit;
  const ground = new Bag<Key>();
  const roof = new Bag<Key>();
  const upper = new Bag<Key>();
  const upperRoof = new Bag<Key>();
  const plan = emptyPlan([-1.6, -3.0, 17.4, 15.0]);
  plan.plinth.push(PLINTH);
  plan.courts.push(COURT);
  plinthSolid(PLINTH, 0, PL, ground);
  steps(9.6, 12.9, 15.5, 13.6, 'n', 3, PL, ground, plan);
  steps(5.6, 7.4, 6.3, 8.4, 'w', 3, PL, ground, plan);
  steps(6.6, 6.8, 8.4, 7.5, 'n', 3, PL, ground, plan);
  steps(8.7, 8.0, 9.4, 9.0, 'e', 3, PL, ground, plan);

  const leaves = buildWalls(GROUND_WALLS, PLANES, rooms, ground, () => plan);
  const upperLeaves = buildWalls(UPPER_WALLS, PLANES, rooms, upper, () => null);
  // Freestanding terracotta jali screen by the WC [read: hatched on the p42 plan].
  jali(new Matrix4().makeRotationY(Math.PI / 2).setPosition(0.95, 0, 3.85), 2.0, PL, PL + 2.0, ground);
  plan.windows.push({ a: [0.95, 2.85], b: [0.95, 4.85] });

  // First floor: bamboo slab over the block, the balcony, and the stair landing strip; bamboo beams under it.
  slab(5.4, 0.9, 13.6, 6.6, upper);
  slab(13.6, 4.48, PARTY - 0.1, 6.6, upper);
  for (let x = 5.9; x < PARTY - 0.2; x += 0.9) upper.add('bamboo', rod([x, SOFFIT - 0.06, 0.95], [x, SOFFIT - 0.06, 6.55], 0.06, 7));
  railing([5.45, 6.55], [PARTY - 0.15, 6.55], upper);
  stair(ground);

  for (const p of GROUND_POSTS) {
    post(p.at[0], p.at[1], PL, p.top, ground);
    plan.posts.push(p.at);
  }
  for (const p of UPPER_POSTS) post(p[0], p[1], FF, PLATE_UP - 0.16, upper);
  // Beams: under the balcony edge, at the upper eave, under the lean-tos' free edges.
  beam([5.45, 6.6], [PARTY - 0.1, 6.6], SOFFIT, SOFFIT, ground);
  beam([5.0, 6.6], [PARTY - 0.1, 6.6], PLATE_UP, PLATE_UP, upper);
  beam([5.45, 6.6], [5.45, 10.0], 4.4, 4.4, ground);
  beam([9.3, 6.6], [9.3, 12.6], 2.53, 2.53, ground);
  beam([9.3, 12.6], [PARTY - 0.1, 12.6], 2.53, 4.42, ground);
  // The canopy rests on brackets from the posts [assumed].
  for (const z of [6.9, 9.2]) ground.add('timber', member([5.5, 2.4, z], [7.2, 3.0, z], 0.1, 0.12));
  furniture(ground, upper);

  buildPlanes(PLANES, { roof, upperRoof }, TWIN_PLANES);

  // Plot.
  ground.add('grass', floorPoly([[-0.75, -2.2], [PARTY, -2.2], [PARTY, 14.4], [6.9, 14.4], [6.9, 9.8], [-0.75, 9.8]], 0.012));
  ground.add('earth', floorPoly([[-0.55, -2.0], [PARTY, -2.0], [PARTY, -0.05], [-0.55, -0.05]], 0.02));
  for (const [a, b] of PLOT_WALLS) compoundWall(a, b, ground, plan);
  plan.boundary = [[-0.75, -2.2], [PARTY, -2.2], [PARTY, 14.4], [6.9, 14.4], [6.9, 9.8], [-0.75, 9.8]];
  plan.rooms = GROUND.map(({ r, name }) => ({ at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as V2, name }));
  plan.rooms.push({ at: [7.5, 11.0], name: 'Courtyard' }, { at: [12.6, 11.6], name: 'Verandah' }, { at: [10.4, 5.75], name: 'Balcony over' });
  plan.trees.push({ at: [7.5, 8.9], r: 2.4 });

  const c: Cached = { ground: ground.merge(), roof: roof.merge(), upper: upper.merge(), upperRoof: upperRoof.merge(), plan, leaves, upperLeaves };
  cache.set(tier, c);
  return c;
}

let twinCache: BufferGeometry | null = null;

export const module: TypeModule = {
  typeId: 'irshalpada-house-b',
  release() {
    for (const c of cache.values()) for (const m of [c.ground, c.roof, c.upper, c.upperRoof]) m.forEach((x) => x.dispose());
    cache.clear();
    twinCache?.dispose();
    twinCache = null;
  },
  create(ctx: BuildContext, v: Variant): BuildingInstance {
    const t = buildType(ctx.tier);
    const mats = ctx.mats;
    const r = seeded(v.seed * 104729 + 7);
    const group = new Group();
    group.name = 'irshalpada-house-b';
    const roofG = new Group();
    const upperG = new Group();
    const upperRoofG = new Group();
    group.add(roofG, upperG, upperRoofG);
    const poche: Mesh[] = [];
    const pocheMat = newPocheMat();
    meshes(t.ground, mats, group, poche, pocheMat);
    meshes(t.roof, mats, roofG, poche, pocheMat);
    meshes(t.upper, mats, upperG, poche, pocheMat);
    meshes(t.upperRoof, mats, upperRoofG, poche, pocheMat);
    twinCache ??= twinGeometry();
    const twin = new Mesh(twinCache, mats.ghost);
    twin.castShadow = twin.receiveShadow = true;
    twin.userData.context = true;
    group.add(twin);

    const own: BufferGeometry[] = [];
    const mine = new Bag<Key>();
    const mineUp = new Bag<Key>();
    buildLeaves(t.leaves, r, mine);
    buildLeaves(t.upperLeaves, r, mineUp);
    const fol = new Bag<Key>();
    // Courtyard tree [stated on the plan], back-yard trees [read from the plan symbols].
    tree({ at: [7.5, 8.9], height: 6.0, spread: 4.6, seed: v.seed + 11, green: 0x5f7a3c }, fol as Bag, fol as Bag);
    tree({ at: [8.0, -1.4], height: 7.5, spread: 5.0, seed: v.seed + 12, green: 0x4c6534 }, fol as Bag, fol as Bag);
    tree({ at: [14.0, -1.2], height: 9.0, spread: 6.5, seed: v.seed + 13 }, fol as Bag, fol as Bag);
    tree({ at: [-1.8, 8.6], height: 6.0, spread: 4.0, seed: v.seed + 14, green: 0x6b7f3f }, fol as Bag, fol as Bag);
    // Kitchen garden behind the bath block [assumed], tulsi in the courtyard [assumed].
    for (let i = 0; i < 2; i++) {
      const z = -1.85 + i * 0.85;
      mine.add('earth', box(0.0, 0, z, 4.6, 0.15, z + 0.6));
      for (let x = 0.25; x < 4.5; x += 0.42) clump(x, 0.15, z + 0.3, 0.16 + r() * 0.07, i ? 0xd98a1f : r() > 0.5 ? 0x4f7a32 : 0x6a8f3a, Math.round(x * 10) + i + v.seed, fol as Bag);
    }
    tulsi(6.6, 10.4, mine as Bag, fol as Bag);
    // Everyday life: laundry, firewood for the chul, pots, a bicycle by the verandah steps.
    laundry([5.4, -1.5], [9.6, -1.5], v.seed + 3, fol as Bag, mine as Bag);
    woodpile(13.3, -0.8, fol as Bag, v.seed);
    pot(9.9, 0, -0.5, 0.22, mine as Bag);
    if (r() > 0.3) bicycle(10.0, 14.1, 80 + (r() - 0.5) * 20, mine as Bag);
    meshes(mine.merge(), mats, group, poche, pocheMat, own);
    meshes(mineUp.merge(), mats, upperG, poche, pocheMat, own);
    meshes(fol.merge(), mats, group, poche, pocheMat, own);

    // People in the renders' poses: a man on the balcony (p42), children in the courtyard, a woman with a pot.
    const crowd: PersonSpec[] = [
      { at: [8.6, 5.8], y: FF, face: 170, height: 1.66, pose: 'stand', top: 0xf4f1ea, bottom: 0xe8e2d4, hair: 0xd8d4cc },
      { at: [7.2, 10.6], y: 0, face: 40, height: 1.1, pose: 'play', top: 0x2e86c1, bottom: 0x5d4037 },
      { at: [8.4, 11.4], y: 0, face: 220, height: 1.2, pose: 'play', top: 0xc0392b, bottom: 0x2c3e50 },
      { at: [12.0, 13.5], y: 0.2, face: 0, height: 1.62, pose: 'sit', top: 0xefe9dc, bottom: 0xefe9dc },
      { at: [10.0, 8.0], y: PL, face: 250, height: 1.55, pose: 'stand', drape: true, top: 0xd35400, bottom: 0xa93226 },
      { at: [4.2, 11.6], y: 0, face: 120, height: 1.6, pose: 'carry', drape: true, top: 0x6c3483, bottom: 0x1f6f8b },
    ];
    const people = new Group();
    people.name = 'people';
    const pg = new Bag<Key>();
    for (const p of crowd.slice(1)) pg.add('people', person(p));
    meshes(pg.merge(), mats, people, [], pocheMat, own);
    // The man on the balcony rises with the upper storey.
    const up = new Bag<Key>();
    up.add('people', person(crowd[0]));
    const upPeople = new Group();
    meshes(up.merge(), mats, upPeople, [], pocheMat, own);
    // The man on the balcony rises with the upper storey; the People toggle finds him by his tag.
    upPeople.userData.people = true;
    upperG.add(upPeople);
    people.userData.people = true;
    group.add(people);

    const callouts: Callout[] = [
      { at: [10.3, 7.6, 4.2], facing: [0, 1, 0.6], layer: 2, title: 'Upper gable, Mangalore tile', detail: 'Ridge +8.50 m', source: 'pdf' },
      { at: [12.6, 3.7, 10.5], facing: [-0.3, 1, 0], layer: 0, title: 'Lean-to roofs', detail: 'From +2.60 m up to +4.60 m', source: 'pdf' },
      { at: [8.0, 4.2, 6.55], facing: [0, 0, 1], layer: 1, title: 'Balcony with carved railing', detail: 'The bedrooms open onto it', source: 'pdf' },
      { at: [7.4, 3.3, 5.8], facing: [0, -0.6, 1], layer: 1, title: 'Bamboo first floor', detail: 'At +3.50 m, with mud screed', source: 'pdf' },
      { at: [7.3, 5.2, 4.98], facing: [0, 0, 1], layer: 1, title: 'Two bedrooms upstairs', detail: 'Sill +4.60 m, head +5.80 m', source: 'pdf' },
      { at: [9.3, 2.0, 6.6], facing: [0.3, 0, 1], title: 'Turned posts on both floors', detail: 'Stacked at the balcony edge', source: 'pdf' },
      { at: [10.75, 1.8, 7.8], facing: [-1, 0, 0], title: 'Folding louvred doors', detail: 'Living room to the courtyard verandah', source: 'pdf' },
      { at: [11.35, 1.9, 0.14], facing: [0, 0, -1], title: 'Terracotta jali to the chul', detail: 'A bay off the kitchen', source: 'pdf' },
      { at: [7.5, 0.4, 9.6], facing: [0, 1, 0], title: 'Courtyard with a tree', detail: 'Every room opens onto it', source: 'pdf' },
      { at: [2.6, 2.2, 2.77], facing: [0, 0, 1], title: 'Toilet and bath apart', detail: 'On the same plinth', source: 'pdf' },
      { at: [15.4, 3.6, 10.36], facing: [0, 0, 1], title: 'One of a mirrored pair', detail: 'Shares its east wall (p40)', source: 'pdf' },
      { at: [14.5, 2.1, 3.0], facing: [0, 1, 0], title: 'Dog-leg stair', detail: 'Stair drawn; its form assumed', source: 'assumed' },
      { at: [6.6, 3.15, 8.0], facing: [0, 1, 0], layer: 0, title: 'Canopy on brackets', detail: 'Read from the elevation; brackets assumed', source: 'assumed' },
      { at: [12.4, 2.2, 12.6], facing: [0, 0, 1], title: 'Front verandah posts', detail: 'Not on the plan; needed for the roof', source: 'assumed' },
      { at: [5.6, 6.0, 2.9], facing: [-1, 0, 0], layer: 1, title: 'Upper eaves about +6.4 m', detail: 'Scaled off section AA′', source: 'pdf' },
      { at: [2.3, 0.4, -1.4], facing: [0, 1, 0], title: 'Kitchen garden', detail: 'Not in the drawings', source: 'assumed' },
    ];
    const lamps: V3[] = [[13.2, 2.5, 7.6], [11.2, 2.4, 2.8], [7.3, 5.3, 3.0]];

    return {
      group,
      layers: [
        { obj: roofG, k: 1 },
        { obj: upperG, k: 1 },
        { obj: upperRoofG, k: 2 },
      ],
      liftLabel: ['Separate the floors', 'Put the floors back'],
      poche,
      clipped: [...SOLID.map((k) => (mats as unknown as Record<string, Material>)[k]), mats.glass, mats.fret, mats.rail, mats.brass, mats.steel, mats.cloth],
      glass: [mats.glass],
      lamps,
      people,
      callouts,
      plan: t.plan,
      focus: [7.8, 2.6, 6.6],
      radius: 15,
      extent: [-0.6, -0.6, PARTY, 13.6],
      detailed: true,
      notes: [
        'Built from the p42 ground and first-floor plans, roof plan, sections AA′ and BB′, front elevation and four renders. Heights are as written on the sections.',
        'Every type B house is one of a mirrored pair sharing its east wall (p40). The twin is shown as plain massing.',
        'Separate the floors lifts the ground-floor roofs, the upper storey and the upper roof apart.',
      ],
      dispose() {
        own.forEach((x) => x.dispose());
        pocheMat.dispose();
      },
    };
  },
};
