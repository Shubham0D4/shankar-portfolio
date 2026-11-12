/**
 * Irshalpada house type A: the ground-storey house of PDF p41, built as an
 * architectural model. Readings and assumptions: MODEL_NOTES.md §7.
 *
 * Local frame as in irshalpada.data.ts: origin at the plinth's back-left
 * corner on the sheet, x to the right, z towards the front, y up, metres.
 * Levels are the sheet's: plinth +0.60, sill +1.50, eaves +3.10, ridge +5.90.
 *
 * What is shared and what is per house:
 *  - the type's fixed fabric (plinth, walls with their openings, frames,
 *    roofs, posts, gables) is built once per device tier and cached;
 *  - door and shutter leaves (open or shut), the yard, planting, laundry,
 *    a bicycle and the people are built per house from its plot number, so
 *    the 22 houses of this type differ in small ways.
 */
import { Color, Group, Matrix4, Mesh, MeshBasicMaterial, BackSide, PointLight, Vector3, type BufferGeometry, type Material, type MeshStandardMaterial } from 'three';
import { HOUSE_G } from '../../models/irshalpada.data';
import { Bag, box, faceTo, floorPoly, lathe, member, norm, paintGeo, prismTop, quad, rod, solid, sphere, type V2, type V3 } from '../kit';
import { bicycle, clump, laundry, person, pot, seeded, tree, tulsi, woodpile, type PersonSpec } from '../props';
import type { MaterialSet, Tier } from '../tex';
import type { BuildContext, BuildingInstance, Callout, PlanSheet, TypeModule, Variant } from '../types';
import { CylinderGeometry } from 'three';

/* ---------- Levels [stated on p41] and fixed sizes ---------- */

const PL = 0.6; // plinth top
const SILL = 1.5; // window sill
const EAVE = 3.1; // wall plate
const RIDGE = 5.9;
const RIDGE_B = 5.4; // the small bedroom wing, as in the plan model's data
const WT = 0.23; // CSEB wall [assumed thickness]
const HEAD = 2.65; // window head [read from the elevation]
const DOOR = PL + 2.1; // door head [read]
const ROOF_T = 0.16; // tiles, battens and rafters over the wall plate [assumed]

type Key = 'plaster' | 'plinth' | 'mud' | 'tile' | 'board' | 'timber' | 'clay' | 'basalt' | 'glass' | 'brass' | 'steel' | 'fret' | 'grass' | 'earth' | 'cloth' | 'foliage' | 'bark' | 'people';

/* ---------- Roof wings ---------- */

interface Wing {
  id: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  axis: 'x' | 'z';
  ridge: number;
}

/**
 * Three gabled wings from the p41 roof plan's slope arrows. Each eave edge is
 * 0.6 m beyond the line it bears on [read: overhang]. The living wing's back
 * end starts at the main ridge and the bedroom wing's where the main roof is
 * higher than its ridge, so the wings meet in true valleys.
 */
const WINGS: Wing[] = [
  { id: 'main', x0: -0.3, z0: 0.3, x1: 17.5, z1: 6.6, axis: 'x', ridge: RIDGE },
  { id: 'living', x0: -0.3, z0: 3.45, x1: 7.75, z1: 14.0, axis: 'z', ridge: RIDGE },
  { id: 'bed', x0: 12.4, z0: 3.9, x1: 17.3, z1: 9.8, axis: 'z', ridge: RIDGE_B },
];

const half = (w: Wing) => (w.axis === 'x' ? (w.z1 - w.z0) / 2 : (w.x1 - w.x0) / 2);
const ridgeAt = (w: Wing) => (w.axis === 'x' ? (w.z0 + w.z1) / 2 : (w.x0 + w.x1) / 2);
/** Slope of the tile surface: wall plate +3.10 (+ROOF_T) at the bearing line, the ridge at the centre. */
const slope = (w: Wing) => (w.ridge - (EAVE + ROOF_T)) / (half(w) - 0.6);
const inWing = (w: Wing, x: number, z: number, m = 0) => x >= w.x0 - m && x <= w.x1 + m && z >= w.z0 - m && z <= w.z1 + m;
function wingTop(w: Wing, x: number, z: number): number {
  const d = Math.abs((w.axis === 'x' ? z : x) - ridgeAt(w));
  return w.ridge - slope(w) * d;
}
/** Top of the tiles, the upper envelope of the wings (−∞ outside). */
function roofTop(x: number, z: number): number {
  let h = -Infinity;
  for (const w of WINGS) if (inWing(w, x, z)) h = Math.max(h, wingTop(w, x, z));
  return h;
}
/** Underside of the roof, where walls stop. */
const under = (x: number, z: number) => {
  const t = roofTop(x, z);
  return Number.isFinite(t) ? Math.max(EAVE, t - ROOF_T) : EAVE;
};

/* ---------- Plan [read from p41 at 40 px/m on the crop] ---------- */

const PLINTH: V2[] = [[0, 0], [17.7, 0], [17.7, 10.1], [12.4, 10.1], [12.4, 6.3], [8.8, 6.3], [8.8, 13.6], [0, 13.6]];
const BAY_PLINTH: V2[] = [[3.9, -0.55], [7.0, -0.55], [7.0, 0], [3.9, 0]];
const COURT: V2[] = [[8.8, 6.3], [12.4, 6.3], [12.4, 13.6], [8.8, 13.6]];

type OpenKind = 'window' | 'door' | 'door2' | 'louvre' | 'jali' | 'vent' | 'open';
interface Opening {
  /** Centre, metres from the segment's start. */
  c: number;
  w: number;
  kind: OpenKind;
  y0?: number;
  y1?: number;
}
interface Wall {
  a: V2;
  b: V2;
  ops: Opening[];
  /** Fixed top instead of the roof underside. */
  top?: (x: number, z: number) => number;
}

const ROOMS: { r: [number, number, number, number]; name: string }[] = [
  { r: [3.2, 0.9, 8.0, 4.95], name: 'Kitchen' },
  { r: [8.0, 0.9, 11.6, 4.95], name: 'Bedroom' },
  { r: [13.3, 1.0, 15.15, 2.6], name: 'Bath' },
  { r: [15.15, 1.0, 16.9, 2.6], name: 'WC' },
  { r: [1.1, 4.95, 6.0, 10.7], name: 'Living' },
  { r: [13.0, 5.2, 16.7, 9.2], name: 'Bedroom' },
  { r: [4.0, -0.4, 6.9, 0.9], name: 'Chul' },
];

/** Under the chul bay's own lean-to: +2.55 at the kitchen wall, falling outwards. */
const bayTop = (_x: number, z: number) => 2.25 + ((z + 0.4) / 1.3) * 0.25;

/** Wall centre lines with their openings. Shared walls appear once. */
const WALLS: Wall[] = [
  // Back of kitchen and bedroom: the chul bay opens off the kitchen.
  { a: [3.2, 0.9], b: [11.6, 0.9], ops: [{ c: 2.25, w: 2.9, kind: 'open', y1: 2.35 }, { c: 6.4, w: 1.0, kind: 'window' }] },
  { a: [3.2, 0.9], b: [3.2, 4.95], ops: [] },
  { a: [8.0, 0.9], b: [8.0, 4.95], ops: [] },
  { a: [11.6, 0.9], b: [11.6, 4.95], ops: [] },
  // The long wall to the courtyard verandah and the rear verandah.
  {
    a: [1.1, 4.95],
    b: [11.6, 4.95],
    ops: [
      { c: 0.8, w: 0.9, kind: 'window' },
      { c: 2.8, w: 0.9, kind: 'door' },
      { c: 6.25, w: 0.9, kind: 'door' },
      { c: 7.45, w: 0.8, kind: 'door' },
      { c: 9.3, w: 1.0, kind: 'window' },
    ],
  },
  { a: [1.1, 4.95], b: [1.1, 10.7], ops: [] },
  // Living room to the courtyard verandah: the wall-wide louvred folding doors of the p41 render.
  { a: [6.0, 4.95], b: [6.0, 10.7], ops: [{ c: 2.65, w: 4.0, kind: 'louvre', y1: PL + 2.5 }] },
  // Living room front: a double door between two windows (p41 elevation, mirrored).
  { a: [1.1, 10.7], b: [6.0, 10.7], ops: [{ c: 0.75, w: 0.9, kind: 'window' }, { c: 2.45, w: 1.4, kind: 'door2' }, { c: 4.15, w: 0.9, kind: 'window' }] },
  // Toilet and bath, apart from the rooms on the same plinth [stated].
  { a: [13.3, 1.0], b: [16.9, 1.0], ops: [{ c: 0.9, w: 0.6, kind: 'vent', y0: 2.2, y1: 2.6 }, { c: 2.7, w: 0.6, kind: 'vent', y0: 2.2, y1: 2.6 }] },
  { a: [13.3, 2.6], b: [16.9, 2.6], ops: [{ c: 0.6, w: 0.75, kind: 'door' }, { c: 2.8, w: 0.7, kind: 'door' }] },
  { a: [13.3, 1.0], b: [13.3, 2.6], ops: [] },
  { a: [15.15, 1.0], b: [15.15, 2.6], ops: [] },
  { a: [16.9, 1.0], b: [16.9, 2.6], ops: [] },
  // Second bedroom.
  { a: [13.0, 5.2], b: [16.7, 5.2], ops: [{ c: 0.55, w: 0.8, kind: 'door' }] },
  { a: [16.7, 5.2], b: [16.7, 9.2], ops: [{ c: 0.9, w: 0.75, kind: 'window' }, { c: 2.9, w: 0.75, kind: 'window' }] },
  { a: [13.0, 9.2], b: [16.7, 9.2], ops: [{ c: 1.85, w: 1.2, kind: 'window' }] },
  { a: [13.0, 5.2], b: [13.0, 9.2], ops: [{ c: 2.1, w: 0.9, kind: 'window' }] },
  // The chul bay: terracotta jali to the cooking space [stated], on all three faces [read].
  { a: [4.0, 0.9], b: [4.0, -0.4], ops: [{ c: 0.65, w: 0.8, kind: 'jali', y0: 1.45, y1: 2.15 }], top: bayTop },
  { a: [4.0, -0.4], b: [6.9, -0.4], ops: [{ c: 1.45, w: 2.4, kind: 'jali', y0: 1.45, y1: 2.15 }], top: bayTop },
  { a: [6.9, -0.4], b: [6.9, 0.9], ops: [{ c: 0.65, w: 0.8, kind: 'jali', y0: 1.45, y1: 2.15 }], top: bayTop },
];

/** Verandah posts [read: p41 plan circles and renders], each carrying the eave beam. */
const POSTS: V2[] = [[0.3, 0.9], [0.3, 6.0], [0.3, 9.7], [0.3, 13.4], [7.15, 13.4], [7.15, 10.4], [7.15, 6.0], [11.6, 6.0], [16.9, 4.0]];
/** Beams at the wall plate between posts and walls. */
const BEAMS: [V2, V2][] = [
  [[0.3, 0.9], [0.3, 13.4]],
  [[0.3, 13.4], [7.15, 13.4]],
  [[7.15, 6.0], [7.15, 13.4]],
  [[7.15, 6.0], [13.0, 6.0]],
  [[0.3, 0.9], [3.2, 0.9]],
  [[16.9, 2.6], [16.9, 5.2]],
];
/** Gable ends: the line they stand on, their span, and the wing. */
const GABLES: { wing: string; at: number; s0: number; s1: number; beam: boolean }[] = [
  { wing: 'main', at: 0.3, s0: 0.9, s1: 6.0, beam: false },
  { wing: 'main', at: 16.9, s0: 0.9, s1: 6.0, beam: false },
  { wing: 'living', at: 13.4, s0: 0.3, s1: 7.15, beam: false },
  { wing: 'bed', at: 9.2, s0: 13.0, s1: 16.7, beam: false },
];

/** Plot [assumed]: compound wall round the house, gate on the line of the front steps. */
const PLOT = { x0: -2.4, z0: -3.4, x1: 20.1, z1: 17.2, gate: [2.6, 4.8] as V2 };

/* ---------- Building helpers ---------- */

const segLen = (w: Wall) => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
const inRoom = (x: number, z: number) => ROOMS.some(({ r }) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);

/** Frame of an opening: origin on the wall centre line at the opening's centre; u along, n outwards. */
function openingFrame(w: Wall, c: number): { m: Matrix4; out: boolean; partition: boolean } {
  const L = segLen(w);
  const t = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  let n = [-t[1], t[0]];
  const px = w.a[0] + t[0] * c;
  const pz = w.a[1] + t[1] * c;
  const sideA = inRoom(px + n[0] * 0.4, pz + n[1] * 0.4);
  const sideB = inRoom(px - n[0] * 0.4, pz - n[1] * 0.4);
  if (sideA && !sideB) n = [-n[0], -n[1]];
  const nn = new Vector3(n[0], 0, n[1]);
  const up = new Vector3(0, 1, 0);
  const m = new Matrix4().makeBasis(up.clone().cross(nn), up, nn).setPosition(px, 0, pz);
  return { m, out: sideA !== sideB, partition: sideA && sideB };
}

/** Box in an opening's frame: u across, y up, d out of the wall. */
const fbox = (m: Matrix4, u0: number, y0: number, d0: number, u1: number, y1: number, d1: number) => box(u0, y0, d0, u1, y1, d1).applyMatrix4(m);

function wallPieces(w: Wall, bag: Bag<Key>, plan: PlanSheet): void {
  const L = segLen(w);
  const t: V2 = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  const n: V2 = [-t[1] * (WT / 2), t[0] * (WT / 2)];
  const top = w.top ?? under;
  const ext = WT / 2;
  const at = (s: number): V2 => [w.a[0] + t[0] * s, w.a[1] + t[1] * s];
  const piece = (s0: number, s1: number, y0: number, y1: number | null) => {
    if (s1 - s0 < 1e-3) return;
    // Under a roof, split into strips so the top follows the roof's envelope.
    const steps = y1 === null ? Math.max(1, Math.ceil((s1 - s0) / 0.5)) : 1;
    for (let k = 0; k < steps; k++) {
      const a = at(s0 + ((s1 - s0) * k) / steps);
      const b = at(s0 + ((s1 - s0) * (k + 1)) / steps);
      const poly: V2[] = [
        [a[0] + n[0], a[1] + n[1]],
        [b[0] + n[0], b[1] + n[1]],
        [b[0] - n[0], b[1] - n[1]],
        [a[0] - n[0], a[1] - n[1]],
      ];
      bag.add('plaster', prismTop(poly, y0, y1 === null ? (x, z) => top(x, z) : () => y1));
    }
  };
  const ops = [...w.ops].sort((p, q) => p.c - q.c);
  let s = -ext;
  for (const o of ops) {
    const s0 = o.c - o.w / 2;
    const s1 = o.c + o.w / 2;
    piece(s, s0, PL, null);
    const y0 = o.y0 ?? (o.kind === 'window' ? SILL : PL);
    const y1 = o.y1 ?? (o.kind === 'window' ? HEAD : DOOR);
    if (y0 > PL) piece(s0, s1, PL, y0);
    piece(s0, s1, y1, null);
    plan.walls.push({ a: at(s), b: at(s0), t: WT });
    if (o.kind === 'window' || o.kind === 'jali' || o.kind === 'vent') plan.windows.push({ a: at(s0), b: at(s1) });
    s = s1;
  }
  piece(s, L + ext, PL, null);
  plan.walls.push({ a: at(s), b: at(L + ext), t: WT });
}

/* ---------- Openings: fixed parts (cached) and leaves (per house) ---------- */

function windowFixed(m: Matrix4, w: number, out: boolean, bag: Bag<Key>): void {
  const f = 0.065;
  const h = (u0: number, y0: number, u1: number, y1: number, d0 = -0.02, d1 = 0.08) => bag.add('timber', fbox(m, u0, y0, d0, u1, y1, d1));
  h(-w / 2, SILL, -w / 2 + f, HEAD);
  h(w / 2 - f, SILL, w / 2, HEAD);
  h(-w / 2, HEAD - f, w / 2, HEAD);
  h(-w / 2, SILL, w / 2, SILL + f * 0.8);
  // Two glazed casements, each 2 × 3 panes (p41 elevation).
  for (const side of [-1, 1]) {
    const u0 = side < 0 ? -w / 2 + f : 0;
    const u1 = side < 0 ? 0 : w / 2 - f;
    const r = 0.04;
    h(u0, SILL + f, u0 + r, HEAD - f, 0.0, 0.05);
    h(u1 - r, SILL + f, u1, HEAD - f, 0.0, 0.05);
    h(u0, SILL + f, u1, SILL + f + r, 0.0, 0.05);
    h(u0, HEAD - f - r, u1, HEAD - f, 0.0, 0.05);
    const mid = (u0 + u1) / 2;
    h(mid - 0.012, SILL + f, mid + 0.012, HEAD - f, 0.01, 0.04);
    for (const k of [1, 2]) {
      const y = SILL + f + ((HEAD - SILL - 2 * f) * k) / 3;
      h(u0, y - 0.012, u1, y + 0.012, 0.01, 0.04);
    }
    bag.add('glass', fbox(m, u0 + r, SILL + f + r, 0.022, u1 - r, HEAD - f - r, 0.028));
  }
  if (out) {
    // Projecting plaster sill.
    bag.add('plaster', fbox(m, -w / 2 - 0.08, SILL - 0.06, WT / 2 - 0.02, w / 2 + 0.08, SILL, WT / 2 + 0.07));
  }
}

/** Solid panelled shutter leaf, hinged at u = 0, extending to u = dir·w, angle about the hinge. */
function shutterLeaf(m: Matrix4, hingeU: number, dir: number, w: number, y0: number, y1: number, angleDeg: number, bag: Bag<Key>): void {
  const leaf = new Matrix4()
    .makeTranslation(hingeU, 0, WT / 2 + 0.02)
    .multiply(new Matrix4().makeRotationY(((dir > 0 ? -1 : 1) * angleDeg * Math.PI) / 180));
  const mm = m.clone().multiply(leaf);
  const s = 0.055;
  const a = Math.min(0, dir * w);
  const b = Math.max(0, dir * w);
  const add = (u0: number, v0: number, u1: number, v1: number, d0: number, d1: number) => bag.add('timber', box(u0, v0, d0, u1, v1, d1).applyMatrix4(mm));
  add(a, y0, a + s, y1, 0, 0.035);
  add(b - s, y0, b, y1, 0, 0.035);
  add(a, y0, b, y0 + s, 0, 0.035);
  add(a, y1 - s, b, y1, 0, 0.035);
  const ym = (y0 + y1) / 2;
  add(a, ym - s / 2, b, ym + s / 2, 0, 0.035);
  add(a + s, y0 + s, b - s, y1 - s, 0.008, 0.026);
}

function doorFixed(m: Matrix4, w: number, bag: Bag<Key>): void {
  const f = 0.075;
  bag.add('timber', fbox(m, -w / 2, PL, -0.06, -w / 2 + f, DOOR, 0.06));
  bag.add('timber', fbox(m, w / 2 - f, PL, -0.06, w / 2, DOOR, 0.06));
  bag.add('timber', fbox(m, -w / 2, DOOR - f, -0.06, w / 2, DOOR, 0.06));
}

/** Panelled door leaf hinged at hingeU, opening inwards by angle. */
function doorLeaf(m: Matrix4, hingeU: number, dir: number, w: number, angleDeg: number, bag: Bag<Key>): void {
  const y0 = PL + 0.01;
  const y1 = DOOR - 0.075;
  const leaf = new Matrix4().makeTranslation(hingeU, 0, -0.02).multiply(new Matrix4().makeRotationY(((dir > 0 ? 1 : -1) * angleDeg * Math.PI) / 180));
  const mm = m.clone().multiply(leaf);
  const a = Math.min(0, dir * w);
  const b = Math.max(0, dir * w);
  const s = 0.09;
  const add = (u0: number, v0: number, u1: number, v1: number, d0: number, d1: number) => bag.add('timber', box(u0, v0, d0, u1, v1, d1).applyMatrix4(mm));
  add(a, y0, a + s, y1, -0.04, 0);
  add(b - s, y0, b, y1, -0.04, 0);
  add(a, y0, b, y0 + 0.16, -0.04, 0);
  add(a, y1 - s, b, y1, -0.04, 0);
  const ym = y0 + (y1 - y0) * 0.45;
  add(a, ym - 0.06, b, ym + 0.06, -0.04, 0);
  add(a + s, y0 + 0.16, b - s, ym - 0.06, -0.03, -0.012);
  add(a + s, ym + 0.06, b - s, y1 - s, -0.03, -0.012);
  // Raised fields on the outer face.
  add(a + s + 0.05, ym + 0.12, b - s - 0.05, y1 - s - 0.06, 0, 0.012);
  add(a + s + 0.05, y0 + 0.22, b - s - 0.05, ym - 0.12, 0, 0.012);
  const hx = dir > 0 ? b - 0.08 : a + 0.08;
  bag.add('brass', sphere(hx, PL + 1.0, 0.03, 0.025).applyMatrix4(mm));
}

/** Louvred folding leaves (p41 render): leaf count from the width, some folded open. */
function louvre(m: Matrix4, w: number, y1: number, openLeaves: number, bag: Bag<Key>, fixed: boolean): void {
  const f = 0.08;
  const n = Math.max(2, Math.round((w - 2 * f) / 0.62));
  const lw = (w - 2 * f) / n;
  const yT = y1 - 0.42; // transom rail
  if (fixed) {
    bag.add('timber', fbox(m, -w / 2, PL, -0.07, -w / 2 + f, y1, 0.07));
    bag.add('timber', fbox(m, w / 2 - f, PL, -0.07, w / 2, y1, 0.07));
    bag.add('timber', fbox(m, -w / 2, y1 - f, -0.07, w / 2, y1, 0.07));
    bag.add('timber', fbox(m, -w / 2, yT - 0.06, -0.07, w / 2, yT, 0.07));
    // Fixed louvres in the transom.
    for (let y = yT + 0.04; y < y1 - f - 0.02; y += 0.075) {
      bag.add('timber', box(-w / 2 + f, -0.008, -0.035, w / 2 - f, 0.008, 0.035).applyMatrix4(new Matrix4().makeRotationX(-0.6)).applyMatrix4(new Matrix4().makeTranslation(0, y, 0)).applyMatrix4(m));
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const u0 = -w / 2 + f + i * lw;
    // Leaves fold in pairs towards the jambs; the outermost `openLeaves` stand open.
    const fromLeft = i < n / 2;
    const k = fromLeft ? i : n - 1 - i;
    const open = k < openLeaves;
    const hinge = fromLeft ? u0 : u0 + lw;
    const ang = open ? (k % 2 === 0 ? 1 : -1) * 72 : 0;
    const leafM = m.clone().multiply(new Matrix4().makeTranslation(hinge, 0, 0.0)).multiply(new Matrix4().makeRotationY(((fromLeft ? 1 : -1) * ang * Math.PI) / 180));
    const a = fromLeft ? 0 : -lw;
    const b = fromLeft ? lw : 0;
    const add = (g: BufferGeometry) => bag.add('timber', g.applyMatrix4(leafM));
    add(box(a, PL + 0.01, -0.02, a + 0.05, yT - 0.06, 0.02));
    add(box(b - 0.05, PL + 0.01, -0.02, b, yT - 0.06, 0.02));
    add(box(a, PL + 0.01, -0.02, b, PL + 0.14, 0.02));
    add(box(a, yT - 0.12, -0.02, b, yT - 0.06, 0.02));
    for (let y = PL + 0.2; y < yT - 0.14; y += 0.07) {
      add(box(a + 0.05, -0.006, -0.03, b - 0.05, 0.006, 0.03).applyMatrix4(new Matrix4().makeRotationX(-0.6)).applyMatrix4(new Matrix4().makeTranslation(0, y, 0)));
    }
  }
}

/** Terracotta jali block wall (p41 render): square cells with inclined fins. */
function jali(m: Matrix4, w: number, y0: number, y1: number, bag: Bag<Key>): void {
  const cell = 0.2;
  const nu = Math.max(1, Math.round(w / cell));
  const nv = Math.max(1, Math.round((y1 - y0) / cell));
  const cu = w / nu;
  const cv = (y1 - y0) / nv;
  const t = 0.03;
  const d = WT / 2;
  for (let i = 0; i <= nu; i++) bag.add('clay', fbox(m, -w / 2 + i * cu - t / 2, y0, -d, -w / 2 + i * cu + t / 2, y1, d));
  for (let j = 0; j <= nv; j++) bag.add('clay', fbox(m, -w / 2, y0 + j * cv - t / 2, -d, w / 2, y0 + j * cv + t / 2, d));
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const cx = -w / 2 + (i + 0.5) * cu;
      const cy = y0 + (j + 0.5) * cv;
      const fin = box(-cu / 2 + t / 2, -0.012, -d * 0.9, cu / 2 - t / 2, 0.012, d * 0.9)
        .applyMatrix4(new Matrix4().makeRotationX(0.7))
        .applyMatrix4(new Matrix4().makeTranslation(cx, cy, 0))
        .applyMatrix4(m);
      bag.add('clay', fin);
    }
  }
}

function vent(m: Matrix4, w: number, y0: number, y1: number, bag: Bag<Key>): void {
  bag.add('timber', fbox(m, -w / 2, y0, -0.05, w / 2, y0 + 0.04, 0.05), fbox(m, -w / 2, y1 - 0.04, -0.05, w / 2, y1, 0.05));
  bag.add('timber', fbox(m, -w / 2, y0, -0.05, -w / 2 + 0.04, y1, 0.05), fbox(m, w / 2 - 0.04, y0, -0.05, w / 2, y1, 0.05));
  for (let y = y0 + 0.08; y < y1 - 0.05; y += 0.08) bag.add('timber', box(-w / 2, -0.006, -0.04, w / 2, 0.006, 0.04).applyMatrix4(new Matrix4().makeRotationX(-0.6)).applyMatrix4(new Matrix4().makeTranslation(0, y, 0)).applyMatrix4(m));
}

/* ---------- Roof ---------- */

/** Eave edges of a wing that are not buried in another wing: [from, to] along the edge. */
function eaveRuns(w: Wing): { line: 'lo' | 'hi'; s0: number; s1: number }[] {
  const out: { line: 'lo' | 'hi'; s0: number; s1: number }[] = [];
  for (const line of ['lo', 'hi'] as const) {
    let runs: [number, number][] = w.axis === 'x' ? [[w.x0, w.x1]] : [[w.z0, w.z1]];
    for (const o of WINGS) {
      if (o === w) continue;
      const fixed = w.axis === 'x' ? (line === 'lo' ? w.z0 : w.z1) : line === 'lo' ? w.x0 : w.x1;
      const covers = w.axis === 'x' ? fixed > o.z0 - 0.01 && fixed < o.z1 + 0.01 : fixed > o.x0 - 0.01 && fixed < o.x1 + 0.01;
      if (!covers) continue;
      const [c0, c1] = w.axis === 'x' ? [o.x0, o.x1] : [o.z0, o.z1];
      // Only where the other wing is the higher roof at the edge.
      const probe = (s: number) => (w.axis === 'x' ? wingTop(o, s, fixed) : wingTop(o, fixed, s));
      const mid = (Math.max(c0, runs[0]?.[0] ?? c0) + Math.min(c1, runs[0]?.[1] ?? c1)) / 2;
      if (probe(mid) < (w.axis === 'x' ? wingTop(w, mid, fixed) : wingTop(w, fixed, mid)) - 0.05) continue;
      runs = runs.flatMap(([a, b]): [number, number][] => {
        if (c1 <= a || c0 >= b) return [[a, b]];
        const r: [number, number][] = [];
        if (c0 > a) r.push([a, c0]);
        if (c1 < b) r.push([c1, b]);
        return r;
      });
    }
    for (const [s0, s1] of runs) if (s1 - s0 > 0.3) out.push({ line, s0, s1 });
  }
  return out;
}

function buildWing(w: Wing, bag: Bag<Key>): void {
  const r = ridgeAt(w);
  const k = slope(w);
  const hw = half(w);
  const eaveH = w.ridge - k * hw;
  // Map (s along the ridge, d from the ridge signed, y) to world.
  const P = (s: number, d: number, y: number): V3 => (w.axis === 'x' ? [s, y, r + d] : [r + d, y, s]);
  const [s0, s1] = w.axis === 'x' ? [w.x0, w.x1] : [w.z0, w.z1];
  for (const side of [-1, 1]) {
    const len = Math.hypot(hw, w.ridge - eaveH);
    // Tiles: v runs up the slope from the eave so each course's lip falls downhill.
    const a = P(s0, side * hw, eaveH);
    const b = P(s1, side * hw, eaveH);
    const c = P(s1, 0, w.ridge);
    const d = P(s0, 0, w.ridge);
    const uvs: [V2, V2, V2, V2] = [[s0, 0], [s1, 0], [s1, len], [s0, len]];
    const away: V3 = w.axis === 'x' ? [0, 0, side] : [side, 0, 0];
    bag.add('tile', faceTo(quad(a, b, c, d, uvs), [away[0], 1, away[2]]));
    // Underside boarding, fascia and barge ends close the slab.
    const dn = (p: V3): V3 => [p[0], p[1] - ROOF_T, p[2]];
    const ua = dn(a), ub = dn(b), uc = dn(c), ud = dn(d);
    bag.add('board', faceTo(quad(ua, ub, uc, ud, uvs), [-away[0], -1, -away[2]]));
    bag.add('board', faceTo(quad(ua, ub, b, a, [[s0, 0], [s1, 0], [s1, ROOF_T], [s0, ROOF_T]]), away));
    const ax: V3 = w.axis === 'x' ? [1, 0, 0] : [0, 0, 1];
    bag.add('board', faceTo(quad(a, d, ud, ua, [[0, 0], [len, 0], [len, ROOF_T], [0, ROOF_T]]), [-ax[0], 0, -ax[2]]));
    bag.add('board', faceTo(quad(b, c, uc, ub, [[0, 0], [len, 0], [len, ROOF_T], [0, ROOF_T]]), ax));
  }
  // Ridge tiles.
  bag.add('tile', rod(P(s0 - 0.02, 0, w.ridge - 0.02), P(s1 + 0.02, 0, w.ridge - 0.02), 0.12, 8));
  // Barge boards with the carved valance under them, both gable ends.
  for (const s of [s0, s1]) {
    for (const side of [-1, 1]) {
      const top = P(s, 0, w.ridge - 0.05);
      const low = P(s, side * hw, eaveH - 0.05);
      bag.add('timber', member(low, top, 0.05, 0.22).translate(0, -0.06, 0));
      const L = Math.hypot(hw, w.ridge - eaveH);
      const drop = 0.24;
      const o = w.axis === 'x' ? [s < (s0 + s1) / 2 ? -0.03 : 0.03, 0, 0] : [0, 0, s < (s0 + s1) / 2 ? -0.03 : 0.03];
      const t0: V3 = [low[0] + o[0], low[1] - 0.12, low[2] + o[2]];
      const t1: V3 = [top[0] + o[0], top[1] - 0.12, top[2] + o[2]];
      bag.add('fret', quad(t0, t1, [t1[0], t1[1] - drop, t1[2]], [t0[0], t0[1] - drop, t0[2]], [[0, 1], [L / 0.3, 1], [L / 0.3, 0], [0, 0]]));
    }
  }
  // Eaves: carved valance and rafter tails where the edge is in the open.
  for (const run of eaveRuns(w)) {
    const side = run.line === 'lo' ? -1 : 1;
    const e0 = P(run.s0, side * hw, eaveH - ROOF_T);
    const e1 = P(run.s1, side * hw, eaveH - ROOF_T);
    const L = run.s1 - run.s0;
    const drop = 0.26;
    bag.add('fret', quad(e0, e1, [e1[0], e1[1] - drop, e1[2]], [e0[0], e0[1] - drop, e0[2]], [[0, 1], [L / 0.3, 1], [L / 0.3, 0], [0, 0]]));
    for (let s = run.s0 + 0.3; s < run.s1 - 0.2; s += 0.6) {
      const inner = P(s, side * (hw - 0.75), w.ridge - k * (hw - 0.75) - ROOF_T - 0.03);
      const outer = P(s, side * (hw - 0.02), eaveH - ROOF_T - 0.03);
      bag.add('timber', member(inner, outer, 0.06, 0.1));
    }
  }
}

function buildGables(bag: Bag<Key>): void {
  for (const g of GABLES) {
    const w = WINGS.find((x) => x.id === g.wing)!;
    const r = ridgeAt(w);
    const apex = w.ridge - ROOF_T - 0.02;
    // Triangle in the plane of the gable line, 0.15 thick, under the roof.
    const pts: [number, number][] = [[g.s0, EAVE], [g.s1, EAVE], [r, apex]];
    const t = 0.15;
    const at = (s: number, y: number, d: number): V3 => (w.axis === 'x' ? [g.at + d, y, s] : [s, y, g.at + d]);
    const A = pts.map(([s, y]) => at(s, y, -t / 2));
    const B = pts.map(([s, y]) => at(s, y, t / 2));
    bag.add('plaster', solid([[A[0], A[1], A[2]], [B[0], B[1], B[2]], [A[0], B[0], B[1], A[1]], [A[1], B[1], B[2], A[2]], [A[2], B[2], B[0], A[0]]]));
    if (g.beam) bag.add('timber', member(at(g.s0, EAVE - 0.1, 0), at(g.s1, EAVE - 0.1, 0), 0.18));
  }
  // The chul bay's lean-to: tiles on a little slab, falling outwards.
  const y0 = 2.62;
  const y1 = 2.2;
  const a: V3 = [3.75, y0, 0.95];
  const b: V3 = [7.15, y0, 0.95];
  const c: V3 = [7.15, y1, -0.75];
  const d: V3 = [3.75, y1, -0.75];
  const len = Math.hypot(1.7, y0 - y1);
  bag.add('tile', faceTo(quad(d, c, b, a, [[3.75, 0], [7.15, 0], [7.15, len], [3.75, len]]), [0, 1, -0.3]));
  const dn = (p: V3): V3 => [p[0], p[1] - 0.12, p[2]];
  bag.add('board', faceTo(quad(dn(a), dn(b), dn(c), dn(d), [[0, 0], [3.4, 0], [3.4, len], [0, len]]), [0, -1, 0]));
  bag.add('board', faceTo(quad(dn(d), dn(c), c, d, [[0, 0], [3.4, 0], [3.4, 0.12], [0, 0.12]]), [0, 0, -1]));
  bag.add('fret', quad([d[0], d[1] - 0.12, d[2] - 0.02], [c[0], c[1] - 0.12, c[2] - 0.02], [c[0], c[1] - 0.34, c[2] - 0.02], [d[0], d[1] - 0.34, d[2] - 0.02], [[0, 1], [3.4 / 0.3, 1], [3.4 / 0.3, 0], [0, 0]]));
}

/* ---------- Plinth, steps, posts ---------- */

function plinthSolid(poly: V2[], y0: number, y1: number, bag: Bag<Key>, topKey: Key = 'mud'): void {
  bag.add(topKey, floorPoly(poly, y1));
  bag.add('plinth', floorPoly(poly, y0, true));
  // Sides, outward by the polygon's orientation.
  let area = 0;
  for (let i = 0; i < poly.length; i++) area += poly[i][0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * poly[i][1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    // Outward normal of edge p→q, by the polygon's orientation.
    const nx = (q[1] - p[1]) / L;
    const nz = -(q[0] - p[0]) / L;
    const sgn = area > 0 ? 1 : -1;
    bag.add('plinth', faceTo(quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [[0, y0], [L, y0], [L, y1], [0, y1]]), [nx * sgn, 0, nz * sgn]));
  }
}

function steps(x0: number, z0: number, x1: number, z1: number, dir: 'n' | 's' | 'e' | 'w', risers: number, bag: Bag<Key>, plan: PlanSheet): void {
  const rise = PL / risers;
  for (let i = 0; i < risers - 1; i++) {
    const f = (risers - 1 - i) / risers; // portion of the run this step covers
    let r: [number, number, number, number] = [x0, z0, x1, z1];
    if (dir === 'n') r = [x0, z0, x1, z0 + (z1 - z0) * f];
    if (dir === 's') r = [x0, z1 - (z1 - z0) * f, x1, z1];
    if (dir === 'w') r = [x0, z0, x0 + (x1 - x0) * f, z1];
    if (dir === 'e') r = [x1 - (x1 - x0) * f, z0, x1, z1];
    bag.add('plinth', box(r[0], 0, r[1], r[2], rise * (i + 1), r[3]));
  }
  plan.steps.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
}

/** Turned timber post on a basalt base, with brass rings and a bracketed capital (p41, p42 renders). */
function post(x: number, z: number, bag: Bag<Key>): void {
  bag.add('basalt', box(x - 0.17, PL, z - 0.17, x + 0.17, PL + 0.22, z + 0.17));
  const top = EAVE - 0.18;
  const h = top - (PL + 0.22);
  const prof: V2[] = [
    [0.0, 0],
    [0.13, 0],
    [0.13, 0.05],
    [0.15, 0.1],
    [0.11, 0.24],
    [0.085, 0.32],
    [0.1, 0.38],
    [0.08, 0.46],
    [0.075, h * 0.55],
    [0.088, h * 0.6],
    [0.072, h * 0.66],
    [0.07, h - 0.3],
    [0.095, h - 0.2],
    [0.12, h - 0.1],
    [0.13, h],
    [0.0, h],
  ];
  bag.add('timber', lathe(prof, x, PL + 0.22, z, 12));
  for (const y of [PL + 0.22 + 0.36, PL + 0.22 + h * 0.6]) bag.add('brass', lathe([[0, 0], [0.105, 0], [0.105, 0.035], [0, 0.035]], x, y, z, 12));
  // Capital block and short brackets under the beam.
  bag.add('timber', box(x - 0.16, top, z - 0.16, x + 0.16, top + 0.08, z + 0.16));
}

/* ---------- Interior hints ---------- */

function furniture(bag: Bag<Key>, cloth: Bag<Key>): void {
  const y = PL;
  // Kitchen: the chul platform in the bay, with its two fire mouths and pots [stated: "Chul"].
  bag.add('plinth', box(4.15, y, -0.3, 6.75, y + 0.42, 0.35));
  bag.add('basalt', box(4.6, y + 0.42, -0.2, 5.2, y + 0.48, 0.2), box(5.6, y + 0.42, -0.2, 6.2, y + 0.48, 0.2));
  pot(4.9, y + 0.48, 0.0, 0.14, bag as Bag);
  // Shelf with brass vessels on the kitchen wall [assumed].
  bag.add('timber', box(3.32, y + 1.4, 1.3, 3.6, y + 1.44, 3.6));
  for (let z = 1.5; z < 3.5; z += 0.45) bag.add('brass', norm(new CylinderGeometry(0.09, 0.11, 0.2, 10).translate(3.46, y + 1.54, z)));
  bag.add('clay', sphere(7.4, y + 0.35, 1.4, 0.26, 1, 0.9, 1));
  // Living: a timber diwan, a trunk and a low stool [assumed].
  bag.add('timber', box(1.35, y, 6.0, 2.25, y + 0.38, 8.0));
  cloth.add('cloth', paintGeo(box(1.38, y + 0.38, 6.05, 2.22, y + 0.5, 7.95), 0x8c2f39));
  cloth.add('cloth', paintGeo(box(1.4, y + 0.5, 6.1, 1.7, y + 0.72, 6.6), 0xd9a441));
  bag.add('steel', box(4.6, y, 5.3, 5.6, y + 0.5, 5.85));
  // Bedrooms: cots with bedding, a steel cupboard [assumed].
  for (const [x0, z0] of [[8.3, 1.3], [15.0, 6.2]] as V2[]) {
    bag.add('timber', box(x0, y, z0, x0 + 1.0, y + 0.45, z0 + 1.95));
    cloth.add('cloth', paintGeo(box(x0 + 0.04, y + 0.45, z0 + 0.04, x0 + 0.96, y + 0.55, z0 + 1.9), 0x3e5f8a));
  }
  bag.add('steel', box(10.6, y, 1.2, 11.35, y + 1.8, 1.75));
  // Bath and WC: a bucket and an Indian pan.
  bag.add('steel', norm(new CylinderGeometry(0.17, 0.14, 0.32, 12).translate(14.4, y + 0.16, 1.6)));
  bag.add('plaster', box(15.8, y, 1.4, 16.3, y + 0.08, 2.0));
}

/* ---------- Plot ---------- */

function plot(bag: Bag<Key>, plan: PlanSheet): void {
  const { x0, z0, x1, z1, gate } = PLOT;
  // Yard: earth and grass, laid just above the stage ground.
  bag.add('grass', floorPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0.012));
  bag.add('earth', floorPoly([[x0 + 0.2, z0 + 0.2], [x1 - 0.2, z0 + 0.2], [x1 - 0.2, -0.05], [x0 + 0.2, -0.05]], 0.02));
  // Compound wall, plastered, with a basalt coping [assumed].
  const wall = (a: V2, b: V2) => {
    const xa = Math.min(a[0], b[0]) - 0.1, xb = Math.max(a[0], b[0]) + 0.1;
    const za = Math.min(a[1], b[1]) - 0.1, zb = Math.max(a[1], b[1]) + 0.1;
    bag.add('plaster', box(xa, 0, za, xb, 1.05, zb));
    bag.add('basalt', box(xa - 0.04, 1.05, za - 0.04, xb + 0.04, 1.15, zb + 0.04));
    plan.walls.push({ a, b, t: 0.2 });
  };
  wall([x0, z0], [x1, z0]);
  wall([x0, z0], [x0, z1]);
  wall([x1, z0], [x1, z1]);
  wall([x0, z1], [gate[0] - 0.2, z1]);
  wall([gate[1] + 0.2, z1], [x1, z1]);
  for (const gx of [gate[0] - 0.2, gate[1] + 0.2]) {
    bag.add('plaster', box(gx - 0.2, 0, z1 - 0.2, gx + 0.2, 1.4, z1 + 0.2));
    bag.add('basalt', box(gx - 0.25, 1.4, z1 - 0.25, gx + 0.25, 1.5, z1 + 0.25));
  }
  // Path of basalt slabs from the gate to the steps [assumed].
  for (let z = 14.45, i = 0; z < z1 - 0.1; z += 0.52, i++) {
    const j = (i % 2) * 0.12;
    bag.add('basalt', box(3.2 + j - 0.06, 0, z, 4.25 + j - 0.06, 0.05, z + 0.46));
  }
  plan.boundary = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
}

/* ---------- Plan sheet ---------- */

function emptyPlan(): PlanSheet {
  return { bounds: [PLOT.x0 - 0.6, PLOT.z0 - 0.6, PLOT.x1 + 0.6, PLOT.z1 + 0.6], plinth: [], courts: [], walls: [], windows: [], doors: [], posts: [], trees: [], steps: [], rooms: [] };
}

/* ---------- Type cache ---------- */

interface Cached {
  body: Map<Key, BufferGeometry>;
  roof: Map<Key, BufferGeometry>;
  plan: PlanSheet;
  /** Door and window placements for per-house leaves. */
  leaves: { m: Matrix4; w: number; kind: OpenKind; out: boolean; partition: boolean; y1: number; id: number }[];
}
const cache = new Map<Tier, Cached>();

function buildType(tier: Tier): Cached {
  const hit = cache.get(tier);
  if (hit) return hit;
  const body = new Bag<Key>();
  const roof = new Bag<Key>();
  const plan = emptyPlan();
  plan.plinth.push(PLINTH, BAY_PLINTH);
  plan.courts.push(COURT);
  plinthSolid(PLINTH, 0, PL, body);
  plinthSolid(BAY_PLINTH, 0, PL, body);
  // Steps [read: p41 plan hatching and renders; risers assumed at 200 mm].
  steps(0.4, 13.6, 7.0, 14.3, 'n', 3, body, plan);
  steps(8.8, 7.6, 9.5, 9.6, 'w', 3, body, plan);
  steps(9.7, 6.3, 11.6, 7.0, 'n', 3, body, plan);
  steps(11.7, 7.2, 12.4, 8.3, 'e', 3, body, plan);
  steps(1.2, -0.7, 3.0, 0, 's', 3, body, plan);
  steps(14.1, 10.1, 15.6, 10.8, 'n', 3, body, plan);

  const leaves: Cached['leaves'] = [];
  let id = 0;
  for (const w of WALLS) {
    wallPieces(w, body, plan);
    for (const o of w.ops) {
      const { m, out, partition } = openingFrame(w, o.c);
      const y0 = o.y0 ?? (o.kind === 'window' ? SILL : PL);
      const y1 = o.y1 ?? (o.kind === 'window' ? HEAD : DOOR);
      if (o.kind === 'window') windowFixed(m, o.w, out, body);
      else if (o.kind === 'door' || o.kind === 'door2') doorFixed(m, o.w, body);
      else if (o.kind === 'louvre') louvre(m, o.w, y1, 0, body, true);
      else if (o.kind === 'jali') jali(m, o.w, y0, y1, body);
      else if (o.kind === 'vent') vent(m, o.w, y0, y1, body);
      if (o.kind === 'door' || o.kind === 'door2' || o.kind === 'louvre' || o.kind === 'window') leaves.push({ m, w: o.w, kind: o.kind, out, partition, y1, id: id++ });
      // Door swings on the plan.
      if (o.kind === 'door' || o.kind === 'door2') {
        const L = segLen(w);
        const t: V2 = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
        const c: V2 = [w.a[0] + t[0] * o.c, w.a[1] + t[1] * o.c];
        const hinge: V2 = [c[0] - (t[0] * o.w) / 2, c[1] - (t[1] * o.w) / 2];
        plan.doors.push({ hinge, leaf: [c[0] + (t[0] * o.w) / 2, c[1] + (t[1] * o.w) / 2] });
      }
    }
  }
  // Freestanding terracotta jali screen by the WC [read: hatched on the p41 plan].
  const screen = new Matrix4().makeRotationY(Math.PI / 2).setPosition(16.45, 0, 3.75);
  jali(screen, 2.0, PL, PL + 2.0, body);
  body.add('plaster', box(16.3, PL + 2.0, 2.7, 16.6, PL + 2.12, 4.8));
  plan.windows.push({ a: [16.45, 2.75], b: [16.45, 4.75] });

  for (const p of POSTS) {
    post(p[0], p[1], body);
    plan.posts.push(p);
  }
  for (const [a, b] of BEAMS) body.add('timber', member([a[0], EAVE - 0.18, a[1]], [b[0], EAVE - 0.18, b[1]], 0.16, 0.16).translate(0, 0, 0));

  furniture(body, body);
  for (const w of WINGS) buildWing(w, roof);
  buildGables(roof);
  plot(body, plan);

  plan.rooms = ROOMS.map(({ r, name }) => ({ at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as V2, name }));
  plan.rooms.push({ at: [10.6, 11.2], name: 'Courtyard' }, { at: [3.7, 12.1], name: 'Verandah' });
  plan.trees.push({ at: [10.6, 9.4], r: 2.6 });

  const c: Cached = { body: body.merge(), roof: roof.merge(), plan, leaves };
  cache.set(tier, c);
  return c;
}

/* ---------- Per house ---------- */

const SOLID: Key[] = ['plaster', 'plinth', 'mud', 'timber', 'board', 'tile', 'basalt', 'clay'];

function meshes(geos: Map<Key, BufferGeometry>, mats: MaterialSet, parent: Group, poche: Mesh[], pocheMat: MeshBasicMaterial, shadows: boolean): void {
  for (const [k, g] of geos) {
    const m = new Mesh(g, (mats as unknown as Record<string, Material>)[k]);
    const ground = k === 'grass' || k === 'earth';
    m.castShadow = shadows && !ground && k !== 'glass';
    m.receiveShadow = k !== 'glass';
    m.userData.key = k;
    parent.add(m);
    if (SOLID.includes(k)) {
      const p = new Mesh(g, pocheMat);
      p.visible = false;
      p.userData.poche = true;
      p.renderOrder = -1;
      parent.add(p);
      poche.push(p);
    }
  }
}

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
    const pocheMat = new MeshBasicMaterial({ color: 0x1e2756, side: BackSide });
    const shadows = ctx.tier === 'high';
    meshes(t.body, mats, group, poche, pocheMat, true);
    meshes(t.roof, mats, roof, poche, pocheMat, true);
    void shadows;

    // Per-house: door and shutter leaves, planting, everyday life, people.
    const mine = new Bag<Key>();
    for (const l of t.leaves) {
      const ajar = r();
      if (l.kind === 'window' && l.out) {
        // Most shutters folded back flat on the wall; a few half shut.
        const ang = ajar < 0.75 ? 178 : 70 + r() * 60;
        shutterLeaf(l.m, -l.w / 2, -1, l.w / 2, SILL, HEAD, ang, mine);
        shutterLeaf(l.m, l.w / 2, 1, l.w / 2, SILL, HEAD, ajar < 0.85 ? 178 : 20, mine);
      } else if (l.kind === 'door') {
        doorLeaf(l.m, -l.w / 2 + 0.075, 1, l.w - 0.15, l.partition ? 85 : ajar < 0.5 ? 0 : 70 + r() * 20, mine);
      } else if (l.kind === 'door2') {
        const hw = (l.w - 0.15) / 2;
        doorLeaf(l.m, -l.w / 2 + 0.075, 1, hw, 80, mine);
        doorLeaf(l.m, l.w / 2 - 0.075, -1, hw, ajar < 0.5 ? 0 : 65, mine);
      } else if (l.kind === 'louvre') {
        louvre(l.m, l.w, l.y1, 1 + Math.floor(r() * 2), mine, false);
      }
    }

    // Planting: the courtyard tree [stated on the plan], the back-yard trees [read], a front tree [assumed].
    const fol = new Bag<Key>();
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

    const own: BufferGeometry[] = [];
    const add = (bag: Bag<Key>, parent: Group) => {
      for (const [k, g] of bag.merge()) {
        own.push(g);
        const m = new Mesh(g, (mats as unknown as Record<string, Material>)[k]);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        if (SOLID.includes(k) && k !== 'clay') {
          const p = new Mesh(g, pocheMat);
          p.visible = false;
      p.userData.poche = true;
          parent.add(p);
          poche.push(p);
        }
      }
    };
    add(mine, group);
    add(fol, group);

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
    const pg = new Bag<'people'>();
    for (const p of crowd) pg.add('people', person(p));
    const pgeo = pg.merge().get('people')!;
    own.push(pgeo);
    const pm = new Mesh(pgeo, mats.people);
    pm.castShadow = true;
    people.add(pm);
    group.add(people);

    // Warm interior lights for dusk: living room, kitchen, bedroom.
    const lamps = ([[3.5, 2.6, 8.0], [5.5, 2.3, 2.8], [14.8, 2.5, 7.2]] as V3[]).map(([x, y, z]) => {
      const l = new PointLight(0xffb066, 0, 9, 1.6);
      l.position.set(x, y, z);
      group.add(l);
      return l;
    });

    const callouts: Callout[] = [
      { at: [3.7, 4.9, 9.0], facing: [0, 1, 0.4], onRoof: true, title: 'Mangalore tile roof', detail: 'Ridge +5.90 m, eaves +3.10 m', source: 'pdf' },
      { at: [7.75, 2.55, 11.0], facing: [1, 0, 0], onRoof: true, title: 'Carved timber valance', detail: 'Along every eave and barge, as rendered', source: 'pdf' },
      { at: [0.3, 4.1, 3.45], facing: [-1, 0, 0], onRoof: true, title: 'Lime-plastered gable', detail: 'Steep pitch from the stated levels', source: 'pdf' },
      { at: [5.45, 1.85, -0.52], facing: [0, 0, -1], title: 'Terracotta jali to the chul', detail: 'Smoke out, air in, as the PDF notes', source: 'pdf' },
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

    return {
      group,
      roof,
      poche,
      clipped: SOLID.map((k) => (mats as unknown as Record<string, Material>)[k]).concat([mats.glass, mats.fret, mats.brass, mats.steel, mats.cloth]),
      glass: [mats.glass as MeshStandardMaterial],
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
        lamps.forEach((l) => l.dispose());
      },
    };
  },
};

void HOUSE_G;
void Color;
