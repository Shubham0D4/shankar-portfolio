/**
 * Irshalpada Temple of Memories, PDF p39, built from its single render.
 * Readings and assumptions: MODEL_NOTES.md §7.12.
 *
 * The PDF has no plan, section or dimension for the temple. What the render
 * shows is modelled as shown; every size is proportioned from it and from the
 * plan model's footprint (irshalpada.data.ts TEMPLE), and tagged as assumed.
 *
 * Read from the render:
 * - Four black stone plates stand on the sides of a square turned 45° to the
 *   plinth, with a slit at every corner. Each plate turns in at both ends, so
 *   from the front each slit shows two narrow returns, one lit and one dark,
 *   and a rubble core behind them.
 * - The plates' tops fall towards the viewer: low at the front slit, higher at
 *   the side corners, highest at the back. A pale boulder is held at the top,
 *   just showing over the low front edge ("in grasp of past", p39 text).
 * - A three-step plinth of cream sandstone ashlar, one course per step,
 *   standing in a shallow pool; brick paving and a grey stone seating wall
 *   round the pool, villagers seated on it; red flowering shrubs behind.
 *
 * Local frame as the plan model: temple at the origin, x east, z south, y up,
 * metres. The low front faces south [assumed], so the stage's south-east sun
 * lights it as the render is lit: the left plate in shadow, the right one warm.
 */
import { BufferGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, type Material, type Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as D from '../../models/irshalpada.data';
import { buildSchool, emptyLayers } from '../../models/irshalpada';
import { Bag, box, boxUV, faceTo, floorPoly, lathe, paintGeo, prismTop, sphere, type V2, type V3 } from '../kit';
import { clump, person, seeded, tree, type PersonSpec } from '../props';
import { memorialMaterials, type MaterialSet, type Tier } from '../tex';
import type { BuildContext, BuildingInstance, Callout, PlanSheet, TypeModule, Variant } from '../types';
import { emptyPlan, meshes, newPocheMat, SOLID, type Key } from './vernacular';

/* ---------- Sizes [assumed: proportioned from the p39 render] ---------- */

const T = D.TEMPLE;
const STEP = T.stepH; // 0.45, one ashlar course per step
const Y0 = STEP * T.steps.length; // plinth top, 1.35
const R = T.radius; // centre to each corner of the plates' square, 2.7
/** Each plate stops this far short of its corners, measured along the side. */
const GAP = 0.69;
/** How far each plate's ends turn in. */
const RETURN = 0.5;
const PLATE_T = 0.24;
/** Plate tops: one sloping plane, 4.3 m over the plinth at the front slit, 5.2 m at the side corners, 6.1 m at the back. */
const plateTop = (_x: number, z: number) => Y0 + 5.2 - 0.41 * z;

const POOL = 6.0; // water's edge, half-width
const COPING = 6.3;
const PAVE = 6.8;
const RING = T.ring / 2; // 7.25
const WALL_H = 0.5;
const SEAT = WALL_H + 0.06;
const WATER = 0.15;
const GATE = 0.9; // half-width of the openings where the paths arrive

/* ---------- Plates ---------- */

/** Corners: front (south), east, back (north), west. */
const CORNERS: V2[] = [
  [0, R],
  [R, 0],
  [0, -R],
  [-R, 0],
];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (a: V2): V2 => {
  const l = Math.hypot(a[0], a[1]);
  return [a[0] / l, a[1] / l];
};

interface PlateParts {
  leaf: V2[];
  ends: V2[][];
  /** Centre lines for the plan inset. */
  lines: { a: V2; b: V2; t: number }[];
}

function plate(i: number): PlateParts {
  const A = CORNERS[i];
  const B = CORNERS[(i + 1) % 4];
  const K = CORNERS[(i + 3) % 4];
  const u = unit(sub(B, A));
  const n = unit(sub(K, A)); // inward: in a square the neighbouring side is the inward normal
  const p = add(A, u, GAP);
  const q = add(B, u, -GAP);
  const leaf = [p, q, add(q, n, PLATE_T), add(p, n, PLATE_T)];
  const endA = [p, add(p, n, RETURN), add(add(p, n, RETURN), u, PLATE_T), add(p, u, PLATE_T)];
  const endB = [q, add(q, n, RETURN), add(add(q, n, RETURN), u, -PLATE_T), add(q, u, -PLATE_T)];
  const half = PLATE_T / 2;
  return {
    leaf,
    ends: [endA, endB],
    lines: [
      { a: add(p, n, half), b: add(q, n, half), t: PLATE_T },
      { a: add(p, u, half), b: add(add(p, u, half), n, RETURN), t: PLATE_T },
      { a: add(q, u, -half), b: add(add(q, u, -half), n, RETURN), t: PLATE_T },
    ],
  };
}
const PLATES = [0, 1, 2, 3].map(plate);

/* ---------- Stones ---------- */

const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(Math.round(x * 1e4) * 0.0129898 + Math.round(y * 1e4) * 0.078233 + Math.round(z * 1e4) * 0.037719) * 43758.5453;
  return s - Math.floor(s);
};

/** A faceted boulder: an icosahedron pushed in and out, flattened underneath. */
function rock(c: V3, s: V3, seed: number, detail: number): BufferGeometry {
  const g = new IcosahedronGeometry(1, detail);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i);
    const z = p.getZ(i);
    const k = 0.8 + 0.34 * hash(x + seed, y - seed * 0.7, z + seed * 0.3);
    if (y < -0.45) y = -0.45 + (y + 0.45) * 0.25;
    p.setXYZ(i, c[0] + x * k * s[0], c[1] + y * k * s[1], c[2] + z * k * s[2]);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return boxUV(g);
}

/* ---------- Plan trees and shrubs [assumed: trees stand behind the seating wall in the render] ---------- */

const TREES: V2[] = [
  [-11.0, -8.0],
  [11.6, -5.8],
  [-12.6, 2.4],
];

/* ---------- Type cache ---------- */

interface Cached {
  body: Map<Key, BufferGeometry>;
  plates: Map<Key, BufferGeometry>;
  ghost: BufferGeometry;
  plan: PlanSheet;
}
const cache = new Map<Tier, Cached>();

/** One flat face, turned to look along d, with uv in metres. */
function face(pts: V3[], d: V3): BufferGeometry {
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return boxUV(faceTo(g, d));
}

/**
 * Square stepped plinth as one closed surface (risers, treads, base) with no
 * faces inside it, so the section cut shows a clean poché.
 */
function ziggurat(halves: number[], rise: number, bag: Bag<Key>): void {
  const h0 = halves[0];
  // The base sits 2 cm up, clear of the ground, so the cut shows the poché and not the ground.
  const base = 0.02;
  bag.add('ashlar', face([[-h0, base, -h0], [h0, base, -h0], [h0, base, h0], [-h0, base, h0]], [0, -1, 0]));
  halves.forEach((h, i) => {
    const y0 = i ? rise * i : base;
    const y1 = rise * (i + 1);
    bag.add(
      'ashlar',
      face([[-h, y0, -h], [h, y0, -h], [h, y1, -h], [-h, y1, -h]], [0, 0, -1]),
      face([[-h, y0, h], [h, y0, h], [h, y1, h], [-h, y1, h]], [0, 0, 1]),
      face([[-h, y0, -h], [-h, y0, h], [-h, y1, h], [-h, y1, -h]], [-1, 0, 0]),
      face([[h, y0, -h], [h, y0, h], [h, y1, h], [h, y1, -h]], [1, 0, 0]),
    );
    const n = halves[i + 1] ?? 0;
    const top = (x0: number, z0: number, x1: number, z1: number) => face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0]);
    if (!n) bag.add('ashlar', top(-h, -h, h, h));
    else bag.add('ashlar', top(-h, -h, h, -n), top(-h, n, h, h), top(-h, -n, -n, n), top(n, -n, h, n));
  });
}

/** Ring of four boxes between half-widths a and b, with optional openings across z = ±. */
function ring(a: number, b: number, y0: number, y1: number, gate: number, bag: Bag<Key>, key: Key): void {
  bag.add(key, box(-b, y0, -b, -a, y1, b), box(a, y0, -b, b, y1, b));
  for (const s of [-1, 1]) {
    const [z0, z1] = s < 0 ? [-b, -a] : [a, b];
    if (gate > 0) bag.add(key, box(-a, y0, z0, -gate, y1, z1), box(gate, y0, z0, a, y1, z1));
    else bag.add(key, box(-a, y0, z0, a, y1, z1));
  }
}

const sq = (h: number): V2[] => [
  [-h, -h],
  [h, -h],
  [h, h],
  [-h, h],
];
const rect = (x0: number, z0: number, x1: number, z1: number): V2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

function buildType(tier: Tier): Cached {
  const hit = cache.get(tier);
  if (hit) return hit;
  const body = new Bag<Key>();
  const plates = new Bag<Key>();
  const plan = emptyPlan([-10.5, -11.5, 10.5, 11.5]);
  const rng = seeded(39);

  // Plinth: three square steps of sandstone ashlar standing in the pool.
  ziggurat(T.steps.map((w) => w / 2), STEP, body);
  for (const w of T.steps) plan.plinth.push(sq(w / 2));

  // The plates, each turning in at both ends.
  for (const pl of PLATES) {
    plates.add('granite', prismTop(pl.leaf, Y0, plateTop), ...pl.ends.map((e) => prismTop(e, Y0, plateTop)));
    plan.walls.push(...pl.lines);
  }

  // The rubble core behind the slits, and the memorial stone held at the top.
  const detail = tier === 'high' ? 1 : 0;
  const reach = R - RETURN - 0.15;
  for (let y = Y0 + 0.25, layer = 0; y < Y0 + 3.7; y += 0.42, layer++) {
    for (let k = 0; k < 7; k++) {
      const r = 0.3 + rng() * 0.2;
      const a = rng() * Math.PI * 2;
      const d = rng() * (reach - r * 1.3);
      const x = Math.cos(a) * d * 0.72;
      const z = Math.sin(a) * d * 0.72;
      body.add('basalt', rock([x, y, z], [r * 1.2, r * 0.8, r], layer * 13 + k, detail));
    }
  }
  body.add('rock', rock([0.05, Y0 + 4.3, 0.15], [1.4, 0.66, 1.15], 7.3, tier === 'high' ? 2 : 1));

  // Pool: dark basin floor, water, sandstone coping.
  // Both stop at the plinth's foot, so nothing lies inside the plinth to show through its section.
  const h0 = T.steps[0] / 2;
  const band = (a: number, b: number): V2[][] => [rect(-b, -b, b, -a), rect(-b, a, b, b), rect(-b, -a, -a, a), rect(a, -a, b, a)];
  for (const r of band(h0, POOL)) body.add('basalt', floorPoly(r, 0.005)), body.add('water', floorPoly(r, WATER));
  ring(POOL, COPING, 0, 0.22, 0, body, 'ashlar');
  plan.courts.push(sq(POOL));

  // Brick paving inside a grey stone seating wall, open where the paths arrive [openings assumed].
  for (const s of [-1, 1]) {
    body.add('clay', floorPoly(rect(-PAVE, s < 0 ? -PAVE : COPING, PAVE, s < 0 ? -COPING : PAVE), 0.06));
    body.add('clay', floorPoly(rect(s < 0 ? -PAVE : COPING, -COPING, s < 0 ? -COPING : PAVE, COPING), 0.06));
    body.add('clay', floorPoly(rect(-GATE, s < 0 ? -RING - 0.02 : PAVE, GATE, s < 0 ? -PAVE : RING + 0.02), 0.06));
  }
  ring(PAVE, RING, 0, WALL_H, GATE, body, 'basalt');
  ring(PAVE - 0.03, RING + 0.03, WALL_H, SEAT, GATE + 0.03, body, 'ashlar');
  for (const s of [-1, 1]) {
    plan.walls.push(
      { a: [s * (PAVE + RING) / 2, -RING], b: [s * (PAVE + RING) / 2, RING], t: RING - PAVE },
      { a: [-RING, s * (PAVE + RING) / 2], b: [-GATE, s * (PAVE + RING) / 2], t: RING - PAVE },
      { a: [GATE, s * (PAVE + RING) / 2], b: [RING, s * (PAVE + RING) / 2], t: RING - PAVE },
    );
  }

  // Plaza of beaten murum (the plan model's paved square), and the paths across the green.
  const [px0, pz0, px1, pz1] = T.plaza;
  for (const r of [rect(px0, pz0, px1, -RING), rect(px0, RING, px1, pz1), rect(px0, -RING, -RING, RING), rect(RING, -RING, px1, RING)]) body.add('earth', floorPoly(r, 0.02));
  body.add('earth', floorPoly(rect(-1.25, -21, 1.25, T.plaza[1]), 0.018));
  body.add('earth', floorPoly(rect(-1.25, T.plaza[3], 1.25, 22), 0.018));
  plan.steps.push(rect(-1.25, -11.5, 1.25, T.plaza[1]), rect(-1.25, T.plaza[3], 1.25, 11.5));

  // Oil lamps along the front of the middle step, and at the top step's front corners [assumed].
  const diya = (x: number, y: number, z: number) => {
    body.add('clay', lathe([[0.001, 0], [0.04, 0], [0.06, 0.03], [0.052, 0.036], [0.001, 0.016]], x, y, z, 8));
    body.add('flame', sphere(x, y + 0.06, z, 0.013, 1, 2.4, 1, 6));
  };
  for (let x = -2.5; x <= 2.51; x += 0.5) diya(x, STEP * 2, (T.steps[0] + T.steps[1]) / 4);
  for (const x of [-2.55, 2.55]) diya(x, Y0, 2.6);
  // Marigolds left at the front slit [assumed].
  for (let k = 0; k < 5; k++) body.add('cloth', paintGeo(sphere(-0.3 + k * 0.15 + rng() * 0.05, Y0 + 0.03, 2.85 + rng() * 0.06, 0.08, 1, 0.5, 1, 6), k % 2 ? 0xf39c12 : 0xe67e22, 0.1, k));

  plan.rooms = [{ at: [0, 0], name: 'Stone' }, { at: [4.4, -4.6], name: 'Pool' }];
  for (const t of TREES) plan.trees.push({ at: t, r: 2.4 });

  // Context: the primary school, 40 m north across the green, as a ghost of the plan model.
  const L = emptyLayers();
  buildSchool(L);
  const parts: BufferGeometry[] = [];
  for (const list of Object.values(L) as BufferGeometry[][]) {
    for (let g of list) {
      if (g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (n !== 'position') g.deleteAttribute(n);
      g.computeVertexNormals();
      parts.push(g);
    }
  }
  const ghost = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  for (const list of Object.values(L) as BufferGeometry[][]) list.forEach((g) => g.dispose());

  const c: Cached = { body: body.merge(), plates: plates.merge(), ghost, plan };
  cache.set(tier, c);
  return c;
}

/* ---------- Instance ---------- */

export const module: TypeModule = {
  typeId: 'irshalpada-temple',
  release() {
    for (const c of cache.values()) {
      c.body.forEach((g) => g.dispose());
      c.plates.forEach((g) => g.dispose());
      c.ghost.dispose();
    }
    cache.clear();
  },
  create(ctx: BuildContext, v: Variant): BuildingInstance {
    void v;
    const t = buildType(ctx.tier);
    const mem = memorialMaterials(ctx.tier);
    const mats = { ...ctx.mats, ...mem } as unknown as MaterialSet;
    const M = mats as unknown as Record<string, Material>;
    const group = new Group();
    group.name = 'irshalpada-temple';
    const platesG = new Group();
    group.add(platesG);
    const poche: Mesh[] = [];
    const pocheMat = newPocheMat();
    meshes(t.body, mats, group, poche, pocheMat);
    meshes(t.plates, mats, platesG, poche, pocheMat);
    const ghost = new Map<Key, BufferGeometry>([['ghost', t.ghost]]);
    meshes(ghost, mats, group, poche, pocheMat);

    const own: BufferGeometry[] = [];
    const fol = new Bag<Key>();
    TREES.forEach((at, i) => tree({ at, height: 7 + (i % 2) * 1.5, spread: 4.8 + (i % 2), seed: 390 + i, green: i % 2 ? 0x5f7a3c : 0x4f6b36 }, fol as Bag, fol as Bag));
    // Red flowering shrubs behind the seating wall, as in the render.
    let k = 0;
    for (let a = -RING + 0.6; a <= RING - 0.6; a += 1.45) {
      for (const [x, z] of [[a, -RING - 0.55], [a, RING + 0.55], [-RING - 0.55, a], [RING + 0.55, a]] as V2[]) {
        if (Math.abs(x) < GATE + 0.8 && Math.abs(z) > RING) continue; // keep the openings clear
        clump(x, 0, z, 0.38 + (k % 3) * 0.08, k % 3 === 0 ? 0x55703a : k % 3 === 1 ? 0xb3322b : 0xc0392b, k, fol as Bag);
        k++;
      }
    }
    meshes(fol.merge(), mats, group, poche, pocheMat, own);

    // Villagers on the seating wall, as in the render: a mother and child, an
    // older couple and a man in white; a woman at the water, someone arriving.
    const crowd: PersonSpec[] = [
      { at: [-4.3, RING - 0.2], y: SEAT, face: 180, height: 1.52, pose: 'sit', drape: true, top: 0xb0302a, bottom: 0xa02a25 },
      { at: [-3.8, RING - 0.25], y: SEAT, face: 195, height: 0.9, pose: 'sit', top: 0xe9dcc0, bottom: 0x6a4a8a },
      { at: [2.6, RING - 0.2], y: SEAT, face: 180, height: 1.5, pose: 'sit', drape: true, top: 0xc0392b, bottom: 0xd35400 },
      { at: [3.35, RING - 0.2], y: SEAT, face: 175, height: 1.6, pose: 'sit', top: 0xefebe3, bottom: 0xe2ddd2, hair: 0xf2f1ec },
      { at: [4.15, RING - 0.2], y: SEAT, face: 180, height: 1.68, pose: 'sit', top: 0xf4f1ea, bottom: 0xe6e1d6 },
      { at: [-RING + 0.2, -1.8], y: SEAT, face: 90, height: 1.64, pose: 'sit', top: 0x5d6d7e, bottom: 0x3b3b3b },
      { at: [-1.1, PAVE - 0.25], y: 0.06, face: 180, height: 1.55, pose: 'stand', drape: true, top: 0x7d3c98, bottom: 0x6c3483 },
      { at: [0.3, 9.6], y: 0.02, face: 185, height: 1.66, pose: 'walk', top: 0xf4f1ea, bottom: 0x2c3e50 },
      { at: [0.9, 9.9], y: 0.02, face: 185, height: 1.18, pose: 'walk', top: 0x7fb3d5, bottom: 0x2c3e66 },
    ];
    const people = new Group();
    people.name = 'people';
    const pg = new Bag<Key>();
    for (const p of crowd) pg.add('people', person(p));
    meshes(pg.merge(), mats, people, [], pocheMat, own);
    group.add(people);

    const s2 = Math.SQRT1_2;
    const callouts: Callout[] = [
      { at: [-1.35, Y0 + 2.6, 1.35], facing: [-s2, 0, s2], layer: 0, title: 'Four folded black stone plates', detail: 'Each turns in at both ends', source: 'pdf' },
      { at: [0, Y0 + 1.6, R], facing: [0, 0, 1], layer: 0, title: 'A slit at every corner', detail: 'The rubble core shows through', source: 'pdf' },
      { at: [0.05, Y0 + 4.8, 0.4], facing: [0, 1, 0.4], title: 'A stone held at the top', detail: '“In grasp of past” (p39 text)', source: 'pdf' },
      { at: [-1.35, plateTop(0, -1.35), -1.35], facing: [0, 1, 0], layer: 0, title: 'Low at the front, tall at the back', detail: 'Read from the sloping top edges', source: 'pdf' },
      { at: [1.35, Y0 + 3.2, 1.35], facing: [s2, 0, s2], layer: 0, title: 'Plates 2.4 m wide, 4.3–6.1 m tall', detail: 'Proportioned from the render', source: 'assumed' },
      { at: [1.35, plateTop(0, 1.35), 1.35], facing: [0, 1, 0], layer: 0, title: 'Low side faces south', detail: 'The PDF does not say which way', source: 'assumed' },
      { at: [-2.4, 0.7, T.steps[0] / 2], facing: [0, 0, 1], title: 'Three sandstone steps', detail: 'One ashlar course each, as rendered', source: 'pdf' },
      { at: [-4.6, WATER, 4.6], facing: [0, 1, 0], title: 'Plinth stands in a shallow pool', detail: 'Pool 12 m square, assumed', source: 'pdf' },
      { at: [5.6, SEAT, RING - 0.2], facing: [0, 1, 0.6], title: 'Stone seating wall', detail: 'Villagers sit on it in the render', source: 'pdf' },
      { at: [-6.55, 0.06, -3.5], facing: [0, 1, 0], title: 'Brick paving inside the wall', detail: 'As rendered', source: 'pdf' },
      { at: [0, 0.3, RING], facing: [0, 0, 1], title: 'Openings where paths arrive', detail: 'Not shown in the render', source: 'assumed' },
      { at: [1.0, STEP * 2 + 0.05, 3.3], facing: [0, 0.5, 1], title: 'Oil lamps and marigolds', detail: 'Not in the PDF', source: 'assumed' },
      { at: [RING + 0.6, 0.6, -3.2], facing: [1, 0, 0], title: 'Red flowering shrubs', detail: 'As rendered; species assumed', source: 'pdf' },
      { at: [D.SCHOOL.at[0], 3, D.SCHOOL.at[1] + 20], facing: [0, 0, 1], title: 'Primary school, 40 m north', detail: 'Its court opens to the temple', source: 'pdf' },
    ];
    const lamps: V3[] = [
      [0, STEP * 2 + 0.3, 3.7],
      [2.6, Y0 + 0.4, 2.9],
      [-2.6, Y0 + 0.4, 2.9],
    ];

    return {
      group,
      layers: [{ obj: platesG, k: 1 }],
      liftLabel: ['Lift the plates', 'Lower the plates'],
      poche,
      clipped: [...SOLID.map((k) => M[k]), M.water, M.flame, M.cloth, M.ghost].filter(Boolean),
      glass: [mem.flame],
      lamps,
      people,
      callouts,
      plan: t.plan,
      focus: [0, 3.0, 0],
      radius: 11,
      extent: [-RING, -RING, RING, RING],
      detailed: true,
      notes: [
        'Built from the single p39 render and its text. The PDF has no plan, section or dimensions for the temple, so every size here is proportioned from the render and from the plan model’s footprint.',
        'Read from the render: four black stone plates that turn in at their ends, a slit at each corner with a rubble core behind, a pale stone held at the top, tops that fall towards the viewer, a three-step sandstone plinth in a pool, brick paving and a stone seating wall.',
        'Assumed: every dimension, which way the low side faces, the openings in the seating wall, and the oil lamps and marigolds.',
      ],
      dispose() {
        own.forEach((g) => g.dispose());
        pocheMat.dispose();
      },
    };
  },
};
