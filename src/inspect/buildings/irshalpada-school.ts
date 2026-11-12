/**
 * Irshalpada primary school, PDF p43, built as an architectural model.
 * Readings and assumptions: MODEL_NOTES.md §7.11.
 *
 * Local frame as in irshalpada.data.ts (SCHOOL): x across the sheet with
 * x = 0 on the centre line, z from the back edge of the main plinth towards
 * the court (south), y up, metres. Plan read at about 32 px/m on the 250 dpi
 * crop, roof plan at about 31 px/m; the two agree on every ridge line.
 *
 * Legend [stated]: 1 classroom, 2 staff room, 3 principal cabin, 4 office,
 * 5 toilet, 6 multi-purpose area. Levels [stated]: +0.60 plinth, +2.70
 * (door and window heads), +5.30 wing ridges, +5.80 main ridge.
 *
 * Every ridge runs north–south (the roof plan's arrows all point east or
 * west). The main block is one shallow gable over a hall that runs straight
 * through it. Each of the six classroom wings has its own gable with the
 * ridge on the classroom's inner wall, so the roof is long over the room and
 * short over the verandah towards the court.
 */
import { Group, type BufferGeometry, type Material, type Mesh } from 'three';
import { Bag, box, floorPoly, paintGeo, rod, type V2, type V3 } from '../kit';
import { clump, person, seeded, tree, type PersonSpec } from '../props';
import type { Tier } from '../tex';
import type { BuildContext, BuildingInstance, Callout, PlanSheet, TypeModule, Variant } from '../types';
import {
  beam,
  buildLeaves,
  buildPlanes,
  buildWalls,
  emptyPlan,
  envelope,
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
const SILL = 1.6; // [read] from section BB′
const HEAD = 2.7; // [stated] +2700, door and window heads
const MAIN_RIDGE = 5.8; // [stated]
const MAIN_EAVE = 3.3; // [read] scaled off section BB′
const WING_RIDGE = 5.3; // [stated]
const WING_EAVE = 3.6; // [read] the wings' outer walls stand about 3.6 m in section BB′ and the elevation

/* ---------- Roofs ---------- */

/** Two planes meeting at a ridge along z at x = xr, from xa to xb. */
function pitched(id: string, xa: number, xr: number, xb: number, z0: number, z1: number, ridge: number, eaveA: number, eaveB: number): Plane[] {
  return [
    { id: `${id}-a`, layer: 'roof', x0: xa, x1: xr, z0, z1, axis: 'x', h0: eaveA, h1: ridge, ridgeAt: 'hi' },
    { id: `${id}-b`, layer: 'roof', x0: xr, x1: xb, z0, z1, axis: 'x', h0: ridge, h1: eaveB, ridgeAt: 'lo' },
  ];
}

interface WingSpec {
  /** Classroom: outer wall, inner wall (= ridge), back and front, left side. */
  room: [number, number, number, number];
  plinth: [number, number, number, number];
  /** Roof, from the roof plan: outer eave, inner eave, back, front. */
  roof: [number, number, number, number];
  /** Verandah post line. */
  post: number;
  /** Windows on the inner wall (offsets from the back corner). */
  innerWin: number[];
}

/** Left wings, nearest the main block first [read from p43 plan and roof plan]. Right wings mirror them. */
const WINGS: WingSpec[] = [
  { room: [-13.63, -9.19, 10.09, 12.95], plinth: [-14.4, 9.94, -7.0, 13.04], roof: [-14.7, -6.3, 9.6, 13.3], post: -6.9, innerWin: [] },
  { room: [-16.02, -11.52, 13.14, 16.06], plinth: [-16.74, 13.04, -7.0, 16.1], roof: [-17.1, -7.05, 12.8, 16.4], post: -7.6, innerWin: [1.9] },
  { room: [-18.5, -14.0, 16.15, 19.1], plinth: [-19.3, 16.1, -7.0, 19.25], roof: [-19.8, -8.7, 15.9, 19.6], post: -9.3, innerWin: [1.9] },
];

function wingPlanes(w: WingSpec, i: number, s: 1 | -1): Plane[] {
  const [outer, inner] = [w.roof[0], w.roof[1]];
  const ridge = w.room[1];
  const k = (WING_RIDGE - WING_EAVE) / Math.abs(ridge - outer);
  const innerEave = WING_RIDGE - k * Math.abs(inner - ridge);
  const id = `w${i + 1}${s < 0 ? 'L' : 'R'}`;
  return s < 0
    ? pitched(id, outer, ridge, inner, w.roof[2], w.roof[3], WING_RIDGE, WING_EAVE, innerEave)
    : pitched(id, -inner, -ridge, -outer, w.roof[2], w.roof[3], WING_RIDGE, innerEave, WING_EAVE);
}

const PLANES: Plane[] = [
  ...pitched('main', -13.5, 0, 13.5, -0.6, 10.2, MAIN_RIDGE, MAIN_EAVE, MAIN_EAVE),
  ...WINGS.flatMap((w, i) => [...wingPlanes(w, i, -1), ...wingPlanes(w, i, 1)]),
];
const roofAt = (x: number, z: number) => envelope(PLANES, x, z) - ROOF_T;

/* ---------- Rooms ---------- */

type R = [number, number, number, number];
const MX = (r: R): R => [-r[2], r[1], -r[0], r[3]];
const MAIN_ROOMS: { r: R; name: string }[] = [
  { r: [-12.39, 0.87, -9.19, 5.22], name: 'Toilet' },
  { r: [-9.19, 3.26, -6.34, 7.7], name: 'Classroom' },
  { r: [-4.69, 1.49, -1.65, 4.41], name: 'Principal' },
  { r: [-6.34, 1.49, -4.69, 4.41], name: 'Store' },
  { r: [-6.34, 4.41, -1.65, 7.7], name: 'Office' },
  { r: [1.37, 4.5, 5.87, 7.7], name: 'Staff room' },
  { r: [1.37, 1.49, 3.39, 4.5], name: 'Store' },
  { r: [3.39, 1.49, 5.87, 3.1], name: 'Staff WC' },
  { r: [3.39, 3.1, 5.87, 4.5], name: 'Store' },
  { r: [5.87, 3.26, 8.82, 7.7], name: 'Classroom' },
  { r: [8.82, 0.87, 11.93, 5.22], name: 'Toilet' },
];
const WING_ROOMS: { r: R; name: string }[] = WINGS.flatMap((w) => {
  const r: R = [w.room[0], w.room[2], w.room[1], w.room[3]];
  return [{ r, name: 'Classroom' }, { r: MX(r), name: 'Classroom' }];
});
const ALL_ROOMS = [...MAIN_ROOMS, ...WING_ROOMS];
const rooms: Rooms = { inside: (x, z) => ALL_ROOMS.some(({ r }) => x > r[0] && x < r[2] && z > r[1] && z < r[3]) };

/* ---------- Walls [read from the p43 plan's door swings and window lines] ---------- */

const win = (c: number, w: number) => ({ c, w, kind: 'window' as const, y0: SILL, y1: HEAD });
const door = (c: number, w = 0.85) => ({ c, w, kind: 'door' as const, y0: PL, y1: HEAD });
const vent = (c: number) => ({ c, w: 0.6, kind: 'vent' as const, y0: 2.2, y1: 2.6 });
const W = (a: V2, b: V2, ops: Wall['ops'] = []): Wall => ({ a, b, y0: PL, ops, top: (x, z) => roofAt(x, z) });

const MAIN_WALLS: Wall[] = [
  // Left: toilet block, classroom, principal's cabin, store, office.
  W([-12.39, 0.87], [-9.19, 0.87], [door(0.6, 0.8)]),
  W([-12.39, 0.87], [-12.39, 5.22], [vent(1.4), vent(3.2)]),
  W([-12.39, 5.22], [-9.19, 5.22]),
  W([-9.19, 0.87], [-9.19, 7.7], [win(5.48, 0.9)]),
  W([-9.19, 3.26], [-6.34, 3.26], [win(1.5, 1.3)]),
  W([-9.19, 7.7], [-1.65, 7.7], [door(2.4, 0.9), win(4.0, 0.8), win(5.92, 0.95)]),
  W([-6.34, 1.49], [-6.34, 7.7]),
  W([-6.34, 1.49], [-1.65, 1.49], [win(3.1, 0.9)]),
  W([-1.65, 1.49], [-1.65, 7.7], [door(0.8), win(2.0, 0.7), door(4.2)]),
  W([-6.34, 4.41], [-1.65, 4.41], [door(3.4, 0.8)]),
  W([-4.69, 1.49], [-4.69, 4.41], [door(2.4, 0.75)]),
  // Right: stores, staff WC, staff room, classroom, toilet block.
  W([1.37, 1.49], [1.37, 7.7], [door(1.2, 0.8), door(4.0)]),
  W([1.37, 1.49], [5.87, 1.49], [win(3.2, 0.9)]),
  W([3.39, 1.49], [3.39, 4.5], [door(2.3, 0.75)]),
  W([1.37, 4.5], [5.87, 4.5]),
  W([3.39, 3.1], [5.87, 3.1], [door(0.6, 0.7)]),
  W([1.37, 7.7], [8.82, 7.7], [door(0.75), win(2.33, 1.2), door(5.2, 0.9)]),
  W([5.87, 1.49], [5.87, 7.7]),
  W([5.87, 3.26], [8.82, 3.26], [win(1.53, 1.2)]),
  W([8.82, 0.87], [8.82, 7.7]),
  W([8.82, 0.87], [11.93, 0.87], [door(2.6, 0.8)]),
  W([11.93, 0.87], [11.93, 5.22], [vent(1.4), vent(3.2)]),
  W([8.82, 5.22], [11.93, 5.22]),
];

function wingWalls(w: WingSpec, s: 1 | -1): Wall[] {
  const [xo, xi, z0, z1] = w.room;
  const X = (x: number) => (s < 0 ? x : -x);
  const depth = z1 - z0;
  return [
    // Outer wall: the long window [read: double line mid-wall].
    W([X(xo), z0], [X(xo), z1], [win(depth / 2, 1.2)]),
    // Inner wall to the verandah: door at the back corner, a window where drawn.
    W([X(xi), z0], [X(xi), z1], [door(0.55, 0.9), ...w.innerWin.map((c) => win(c, 1.0))]),
    W([X(xo), z0], [X(xi), z0]),
    W([X(xo), z1], [X(xi), z1]),
  ];
}
const WALLS: Wall[] = [...MAIN_WALLS, ...WINGS.flatMap((w) => [...wingWalls(w, -1), ...wingWalls(w, 1)])];

/* ---------- Posts and beams [read from the elevation, section BB′ and the renders] ---------- */

interface PostSpec {
  at: V2;
}
const POSTS: PostSpec[] = [
  // The open hall: tall posts at both ends, and the front verandah.
  { at: [-1.6, 9.9] },
  { at: [1.6, 9.9] },
  { at: [-1.6, 0.3] },
  { at: [1.6, 0.3] },
  { at: [-4.4, 9.9] },
  { at: [4.4, 9.9] },
  // Wing verandahs: two posts per wing on the court side.
  ...WINGS.flatMap((w) => {
    const [, z0, , z1] = w.plinth;
    return [w.post, -w.post].flatMap((x) => [{ at: [x, z0 + 0.35] as V2 }, { at: [x, z1 - 0.35] as V2 }]);
  }),
];

/* ---------- Plinth and court ---------- */

const MAIN_PLINTH: R = [-13.3, 0, 13.3, 10.2];
const STAGE: R = [-3.1, 10.2, 2.8, 12.3];
const rectPoly = (r: R): V2[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];

/** Plan trees [read: the p43 plan's tree symbols]. */
const TREES: V2[] = [
  [-8.1, 1.55],
  [-14.6, 5.7],
  [-15.1, 11.6],
  [-6.1, 11.2],
  [-7.6, 17.1],
  [5.1, 11.2],
  [6.8, 17.1],
  [15.0, 11.5],
  [7.6, 1.7],
];

/* ---------- Interior hints [assumed] ---------- */

function furniture(bag: Bag<Key>): void {
  const y = PL;
  const mat = [0xb03a2e, 0x2f5d8a, 0xd4a017, 0x1e8449];
  const classroom = (r: R, boardOnMinX: boolean, seed: number) => {
    const [x0, z0, x1, z1] = r;
    // Blackboard on the outer wall, teacher's table before it, rows of durries on the floor
    // (the p43 renders show children seated on the floor).
    const bx = boardOnMinX ? x0 + 0.13 : x1 - 0.17;
    bag.add('basalt', box(bx, y + 0.9, (z0 + z1) / 2 - 1.1, bx + 0.04, y + 2.0, (z0 + z1) / 2 + 1.1));
    bag.add('timber', box(bx - 0.03, y + 0.86, (z0 + z1) / 2 - 1.15, bx + 0.07, y + 0.9, (z0 + z1) / 2 + 1.15));
    const tx = boardOnMinX ? x0 + 0.9 : x1 - 1.5;
    bag.add('timber', box(tx, y, (z0 + z1) / 2 - 0.5, tx + 0.6, y + 0.75, (z0 + z1) / 2 + 0.5));
    for (let i = 0; i < 3; i++) {
      const fx = boardOnMinX ? x0 + 1.8 + i * 0.8 : x1 - 2.4 - i * 0.8;
      if (fx < x0 + 0.3 || fx + 0.6 > x1 - 0.3) continue;
      bag.add('cloth', paintGeo(box(fx, y + 0.002, z0 + 0.35, fx + 0.6, y + 0.015, z1 - 0.35), mat[(i + seed) % 4]));
    }
  };
  for (const w of WINGS) {
    const r: R = [w.room[0], w.room[2], w.room[1], w.room[3]];
    classroom(r, true, 0);
    classroom(MX(r), false, 1);
  }
  classroom([-9.19, 3.26, -6.34, 7.7], false, 2);
  classroom([5.87, 3.26, 8.82, 7.7], true, 3);
  // Office, principal's cabin, staff room: tables, chairs, steel cupboards.
  const desk = (x: number, z: number, w = 1.2, d = 0.7) => {
    bag.add('timber', box(x, y + 0.72, z, x + w, y + 0.76, z + d));
    for (const [dx, dz] of [[0.05, 0.05], [w - 0.1, 0.05], [0.05, d - 0.1], [w - 0.1, d - 0.1]]) bag.add('timber', box(x + dx, y, z + dz, x + dx + 0.05, y + 0.72, z + dz + 0.05));
  };
  desk(-3.8, 2.4);
  desk(-5.2, 5.6);
  desk(2.2, 5.6, 2.6, 0.9);
  bag.add('steel', box(-2.3, y, 1.65, -1.85, y + 1.8, 2.4), box(-6.1, y, 6.8, -5.4, y + 1.8, 7.5), box(5.1, y, 4.7, 5.7, y + 1.8, 5.4));
  // Toilets: low cubicle partitions.
  for (const s of [-1, 1]) for (const z of [2.3, 3.6]) bag.add('plaster', box(s < 0 ? -12.3 : 10.6, y, z - 0.05, s < 0 ? -10.6 : 11.85, y + 1.8, z + 0.05));
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
  const plan = emptyPlan([-21, -3, 21, 21.5]);

  plinthSolid(rectPoly(MAIN_PLINTH), 0, PL, body);
  plinthSolid(rectPoly(STAGE), 0, PL, body);
  plan.plinth.push(rectPoly(MAIN_PLINTH), rectPoly(STAGE));
  for (const w of WINGS) {
    const p = w.plinth as R;
    plinthSolid(rectPoly(p), 0, PL, body);
    plinthSolid(rectPoly(MX(p)), 0, PL, body);
    plan.plinth.push(rectPoly(p), rectPoly(MX(p)));
  }
  // Steps [read: hatched flights on the plan; risers assumed at 200 mm].
  steps(-1.6, -0.7, 1.4, 0, 's', 3, PL, body, plan); // north entrance from the road
  steps(-3.9, 12.3, 3.5, 13.0, 'n', 3, PL, body, plan); // the stage, three sides
  steps(-3.9, 10.2, -3.1, 12.3, 'e', 3, PL, body, plan);
  steps(2.8, 10.2, 3.5, 12.3, 'w', 3, PL, body, plan);
  for (const s of [-1, 1] as const) {
    const X = (a: number, b: number): [number, number] => (s < 0 ? [a, b] : [-b, -a]);
    const [a, b] = X(-12.0, -9.5);
    steps(a, 19.25, b, 19.95, 'n', 3, PL, body, plan); // off the outermost wing, to the south
    const [c, d] = X(-7.0, -6.3);
    steps(c, 14.0, d, 15.5, s < 0 ? 'w' : 'e', 3, PL, body, plan); // court side of the middle wing
  }

  const leaves = buildWalls(WALLS, PLANES, rooms, body, () => plan);

  // Posts, and the beams they carry under the roofs.
  for (const p of POSTS) {
    const top = roofAt(p.at[0], p.at[1]);
    post(p.at[0], p.at[1], PL, top, body);
    plan.posts.push(p.at);
  }
  for (const z of [9.9, 0.3]) {
    const xs = z > 5 ? [-4.4, -1.6, 0, 1.6, 4.4] : [-1.6, 0, 1.6];
    for (let i = 0; i < xs.length - 1; i++) beam([xs[i], z], [xs[i + 1], z], roofAt(xs[i], z), roofAt(xs[i + 1], z), body);
  }
  for (const w of WINGS) {
    const [, z0, , z1] = w.plinth;
    for (const s of [-1, 1]) {
      const x = s * Math.abs(w.post);
      const h = roofAt(x, (z0 + z1) / 2);
      beam([x, z0 - 0.2], [x, z1 + 0.2], h, h, body);
    }
  }
  // Timber battened screens over the hall's verandah ends [read: section AA′].
  for (const x of [-1.65, 1.65]) {
    for (const [za, zb] of [[-0.4, 1.49], [7.7, 9.9]]) {
      body.add('timber', box(x - 0.06, 3.5, za, x + 0.06, 3.62, zb));
      for (let z = za + 0.06; z < zb; z += 0.14) body.add('timber', box(x - 0.025, 3.62, z, x + 0.025, roofAt(x, z), z + 0.05));
    }
  }
  furniture(body);

  buildPlanes(PLANES, { roof });

  // The court and the green round the school: lawn, a beaten-earth path from the north road, a flagpole.
  body.add('earth', floorPoly([[-2.4, -12], [2.4, -12], [2.4, -0.7], [-2.4, -0.7]], 0.018));
  body.add('earth', floorPoly([[-3.9, 13.0], [3.5, 13.0], [3.5, 15.0], [-3.9, 15.0]], 0.016));
  body.add('steel', rod([0, 0, 20.5], [0, 7.5, 20.5], 0.04, 8));
  body.add('plinth', box(-0.6, 0, 19.9, 0.6, 0.3, 21.1));
  body.add('cloth', paintGeo(box(0.05, 6.4, 20.49, 1.2, 6.65, 20.51), 0xff9933));
  body.add('cloth', paintGeo(box(0.05, 6.15, 20.49, 1.2, 6.4, 20.51), 0xf4f4f0));
  body.add('cloth', paintGeo(box(0.05, 5.9, 20.49, 1.2, 6.15, 20.51), 0x138808));

  plan.rooms = ALL_ROOMS.map(({ r, name }) => ({ at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as V2, name }));
  plan.rooms.push({ at: [0, 5], name: 'Hall' }, { at: [-0.15, 11.3], name: 'Stage' }, { at: [-0.2, 16.5], name: 'Court' });
  for (const t of TREES) plan.trees.push({ at: t, r: 2.2 });

  const c: Cached = { body: body.merge(), roof: roof.merge(), plan, leaves };
  cache.set(tier, c);
  return c;
}

/* ---------- Instance ---------- */

const SKY = 0x7fb3d5; // school shirts [read from the p43 renders]
const NAVY = 0x2c3e66;

export const module: TypeModule = {
  typeId: 'irshalpada-school',
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
    const r = seeded(v.seed * 31 + 5);
    const group = new Group();
    group.name = 'irshalpada-school';
    const roof = new Group();
    group.add(roof);
    const poche: Mesh[] = [];
    const pocheMat = newPocheMat();
    meshes(t.body, mats, group, poche, pocheMat);
    meshes(t.roof, mats, roof, poche, pocheMat);

    const own: BufferGeometry[] = [];
    const mine = new Bag<Key>();
    buildLeaves(t.leaves, r, mine);
    const fol = new Bag<Key>();
    TREES.forEach((at, i) => tree({ at, height: 6.5 + (i % 3), spread: 4.5 + (i % 2), seed: 300 + i, green: i % 2 ? 0x5f7a3c : 0x4f6b36 }, fol as Bag, fol as Bag));
    for (let i = 0; i < 14; i++) {
      const x = -19.5 + (i % 7) * 6.3 + r();
      if (Math.abs(x) < 3.4) continue; // keep the path from the north road clear
      clump(x, 0, -2.2 - (i < 7 ? 0 : 1.2), 0.4 + r() * 0.25, 0x58703a, i, fol as Bag);
    }
    meshes(mine.merge(), mats, group, poche, pocheMat, own);
    meshes(fol.merge(), mats, group, poche, pocheMat, own);

    // Children in school uniform and their teachers, as in the four p43 renders:
    // a ring game on the court, a class on the stage, children seated on a verandah.
    const crowd: PersonSpec[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      crowd.push({ at: [-1.5 + Math.cos(a) * 2.0, 17.0 + Math.sin(a) * 2.0], y: 0, face: (-a * 180) / Math.PI, height: 1.1 + (i % 3) * 0.1, pose: 'play', drape: i % 2 === 0, top: SKY, bottom: NAVY });
    }
    for (let i = 0; i < 8; i++) crowd.push({ at: [-2.2 + (i % 4) * 1.1, 10.7 + Math.floor(i / 4) * 0.8], y: PL, face: 180, height: 1.15 + (i % 3) * 0.08, pose: 'stand', drape: i % 3 === 0, top: SKY, bottom: NAVY });
    for (let i = 0; i < 5; i++) crowd.push({ at: [-8.6 + (i % 3) * 0.6, 14.0 + Math.floor(i / 3) * 0.7], y: PL - 0.15, face: 270, height: 1.2, pose: 'sit', top: SKY, bottom: NAVY });
    crowd.push({ at: [-0.4, 11.8], y: PL, face: 180, height: 1.58, pose: 'stand', drape: true, top: 0x2e86c1, bottom: 0x1a5276 });
    crowd.push({ at: [5.4, 15.5], y: 0, face: 200, height: 1.6, pose: 'walk', drape: true, top: 0x8e44ad, bottom: 0x6c3483 });
    crowd.push({ at: [5.9, 15.4], y: 0, face: 200, height: 1.2, pose: 'walk', top: SKY, bottom: NAVY });
    const people = new Group();
    people.name = 'people';
    const pg = new Bag<Key>();
    for (const p of crowd) pg.add('people', person(p));
    meshes(pg.merge(), mats, people, [], pocheMat, own);
    group.add(people);

    const callouts: Callout[] = [
      { at: [0, 5.75, 4.8], facing: [0, 1, 0], layer: 0, title: 'Main gable, ridge +5.80 m', detail: 'Ridges run north–south, as on the roof plan', source: 'pdf' },
      { at: [-11.52, 5.2, 14.6], facing: [0, 1, 0.3], layer: 0, title: 'A gable to each classroom', detail: 'Ridge +5.30 m on the inner wall', source: 'pdf' },
      { at: [0, 1.6, 5.0], facing: [0, 0, 1], title: 'Open hall through the block', detail: 'Multi-purpose area, legend 6', source: 'pdf' },
      { at: [-0.15, 0.62, 11.6], facing: [0, 1, 0.5], title: 'Stage on the court', detail: 'Meetings, weddings, gatherings', source: 'pdf' },
      { at: [-18.5, 2.2, 17.6], facing: [-1, 0, 0], title: 'Classrooms step round the court', detail: 'Eight classrooms, legend 1', source: 'pdf' },
      { at: [-3.2, 2.2, 7.82], facing: [0, 0, 1], title: 'Office and principal’s cabin', detail: 'Legend 3 and 4', source: 'pdf' },
      { at: [3.1, 2.2, 7.82], facing: [0, 0, 1], title: 'Staff room', detail: 'Legend 2', source: 'pdf' },
      { at: [-12.39, 2.4, 2.2], facing: [-1, 0, 0], title: 'Toilets at the back corners', detail: 'Legend 5', source: 'pdf' },
      { at: [-6.9, 2.0, 10.3], facing: [0.4, 0, 1], title: 'Turned timber posts', detail: 'Brass rings, as rendered', source: 'pdf' },
      { at: [-14.0, 2.2, 18.0], facing: [1, 0, 0], title: 'Door and window heads +2.70 m', detail: 'Sills about +1.60 m', source: 'pdf' },
      { at: [-19.3, 3.5, 17.6], facing: [-1, 0, 0], title: 'Wing eaves about +3.6 m', detail: 'Scaled off section BB′', source: 'pdf' },
      { at: [1.65, 4.3, 8.8], facing: [1, 0, 0], title: 'Timber battened screens', detail: 'Over the hall ends (section AA′)', source: 'pdf' },
      { at: [-8.2, 0.65, 5.5], facing: [0, 1, 0], title: 'Blackboards and floor mats', detail: 'Furniture not drawn', source: 'assumed' },
      { at: [0, 6.2, 20.5], facing: [0, 0, 1], title: 'Flagpole on the court', detail: 'Not in the drawings', source: 'assumed' },
      { at: [-15.1, 0.4, 11.6], facing: [0, 1, 0], title: 'Trees as on the plan', detail: 'Species assumed', source: 'assumed' },
    ];
    const lamps: V3[] = [[0, 3.6, 5.0], [-11.4, 2.7, 11.5], [-4.0, 2.7, 6.0]];

    return {
      group,
      layers: [{ obj: roof, k: 1 }],
      liftLabel: ['Lift the roofs', 'Lower the roofs'],
      poche,
      clipped: [...SOLID.map((k) => (mats as unknown as Record<string, Material>)[k]), mats.glass, mats.fret, mats.brass, mats.steel, mats.cloth],
      glass: [mats.glass],
      lamps,
      people,
      callouts,
      plan: t.plan,
      focus: [0, 2.2, 9.6],
      radius: 21,
      extent: [-19.8, -0.7, 19.8, 19.9],
      detailed: true,
      notes: [
        'Built from the p43 plan and legend, roof plan, sections AA′ and BB′, front elevation and four renders. The +0.60, +2.70, +5.30 and +5.80 levels are as written on the sections; eave heights are scaled off section BB′.',
        'Every ridge runs north–south, as the roof plan’s arrows show. Each classroom wing has its own gable with the ridge on the classroom’s inner wall.',
        'Plan sizes come from the fitted sheet scale and may be out by about a fifth (MODEL_NOTES §2).',
      ],
      dispose() {
        own.forEach((g) => g.dispose());
        pocheMat.dispose();
      },
    };
  },
};
