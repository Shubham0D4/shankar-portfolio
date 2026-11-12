/**
 * Shared builders for the Irshalpada houses (types A and B, PDF p41–p42):
 * the vocabulary the two houses have in common, so each type module only
 * holds its own readings. MODEL_NOTES.md §7.
 *
 *  - Roofs are sloped planes. A gable is two planes meeting at a ridge; a
 *    lean-to is one. Each plane is a closed slab: Mangalore tiles on top,
 *    boarding underneath, with carved valances and rafter tails on the edges
 *    that are in the open (an edge under a higher roof is left bare).
 *  - Walls are centre lines with openings. Pieces between openings are
 *    prisms whose top follows the roofs listed for that wall, so walls meet
 *    the roof's underside, rise into gables and stop under a floor slab.
 *  - Openings (casements with shutters, panelled doors, louvred folding
 *    doors, terracotta jali, vents) are built in an opening frame and work at
 *    any floor level.
 */
import { BackSide, CylinderGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Vector3, type BufferGeometry, type Material } from 'three';
import { Bag, box, faceTo, floorPoly, lathe, member, norm, prismTop, quad, rod, solid, sphere, type V2, type V3 } from '../kit';
import type { MaterialSet } from '../tex';
import type { PlanSheet } from '../types';

export type Key =
  | 'granite'
  | 'ashlar'
  | 'rock'
  | 'water'
  | 'flame'
  | 'plaster'
  | 'plinth'
  | 'mud'
  | 'tile'
  | 'board'
  | 'timber'
  | 'bamboo'
  | 'clay'
  | 'basalt'
  | 'glass'
  | 'brass'
  | 'steel'
  | 'fret'
  | 'rail'
  | 'grass'
  | 'earth'
  | 'cloth'
  | 'foliage'
  | 'bark'
  | 'people'
  | 'ghost';

/** Common sizes. Levels come from each type's sheet. */
export const WT = 0.23; // CSEB wall [assumed thickness]
export const ROOF_T = 0.16; // tiles, battens and rafters over the wall plate [assumed]
export const OVERHANG = 0.6; // eaves beyond the bearing line [read]

/* ---------- Roof planes ---------- */

export interface Plane {
  id: string;
  /** Group the plane belongs to (for lifting): e.g. 'roof', 'upperRoof'. */
  layer: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Height varies along this axis. */
  axis: 'x' | 'z';
  /** Top of the tiles at the axis' low and high coordinate. */
  h0: number;
  h1: number;
  /** Which end of the axis is a ridge (meets its twin, no edge features). */
  ridgeAt?: 'lo' | 'hi';
}

export const topOf = (p: Plane, x: number, z: number) => {
  const t = p.axis === 'x' ? (x - p.x0) / (p.x1 - p.x0) : (z - p.z0) / (p.z1 - p.z0);
  return p.h0 + (p.h1 - p.h0) * t;
};
export const inPlane = (p: Plane, x: number, z: number, m = 0) => x >= p.x0 - m && x <= p.x1 + m && z >= p.z0 - m && z <= p.z1 + m;

/**
 * A gable wing over a rectangle, ridge along `ridge`. `bearing` is the top of
 * the wall plate at the bearing line, 0.6 m inside each eave.
 */
export function gable(id: string, layer: string, x0: number, z0: number, x1: number, z1: number, ridge: 'x' | 'z', ridgeTop: number, plate: number): Plane[] {
  const across = ridge === 'x' ? 'z' : 'x';
  const [a0, a1] = across === 'z' ? [z0, z1] : [x0, x1];
  const mid = (a0 + a1) / 2;
  const half = (a1 - a0) / 2;
  const k = (ridgeTop - (plate + ROOF_T)) / (half - OVERHANG);
  const eave = ridgeTop - k * half;
  const r = (lo: number, hi: number) => (across === 'z' ? { x0, x1, z0: lo, z1: hi } : { x0: lo, x1: hi, z0, z1 });
  return [
    { id: `${id}-a`, layer, ...r(a0, mid), axis: across, h0: eave, h1: ridgeTop, ridgeAt: 'hi' },
    { id: `${id}-b`, layer, ...r(mid, a1), axis: across, h0: ridgeTop, h1: eave, ridgeAt: 'lo' },
  ];
}

/** A lean-to falling towards `falls`, with tile tops at its high and low edges. */
export function lean(id: string, layer: string, x0: number, z0: number, x1: number, z1: number, falls: 'n' | 's' | 'e' | 'w', high: number, low: number): Plane {
  const axis = falls === 'e' || falls === 'w' ? 'x' : 'z';
  const lowAtMin = falls === 'w' || falls === 'n';
  return { id, layer, x0, z0, x1, z1, axis, h0: lowAtMin ? low : high, h1: lowAtMin ? high : low };
}

/** Upper envelope of some planes (−∞ where none covers). */
export function envelope(planes: Plane[], x: number, z: number): number {
  let h = -Infinity;
  for (const p of planes) if (inPlane(p, x, z)) h = Math.max(h, topOf(p, x, z));
  return h;
}

/** True if a point at height y on plane p's edge sits under another, higher plane. */
function buried(planes: Plane[], p: Plane, x: number, z: number, y: number): boolean {
  return planes.some((o) => o !== p && inPlane(o, x, z, -0.02) && topOf(o, x, z) > y + 0.05);
}

/** Runs of an edge (from a to b, straight) that are in the open. */
function openRuns(planes: Plane[], p: Plane, a: V3, b: V3): [number, number][] {
  const n = 40;
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    const open = !buried(planes, p, x, z, y);
    if (open && start < 0) start = t;
    if ((!open || i === n) && start >= 0) {
      const end = open ? t : (i - 1) / n;
      if (end - start > 0.02) runs.push([start, end]);
      start = -1;
    }
  }
  return runs;
}

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** A valance strip hanging under an edge from a to b. */
function valance(a: V3, b: V3, out: V3, drop: number, bag: Bag<Key>): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const o = (p: V3): V3 => [p[0] + out[0] * 0.03, p[1] - 0.04, p[2] + out[2] * 0.03];
  const A = o(a);
  const B = o(b);
  bag.add('fret', quad(A, B, [B[0], B[1] - drop, B[2]], [A[0], A[1] - drop, A[2]], [[0, 1], [L / 0.3, 1], [L / 0.3, 0], [0, 0]]));
}

/** Builds every plane: tiles, boarding, edges, valances, rafter tails, ridges. */
export function buildPlanes(planes: Plane[], bags: Record<string, Bag<Key>>, hidden: Plane[] = []): void {
  const all = [...planes, ...hidden];
  for (const p of planes) {
    const bag = bags[p.layer];
    const len = p.axis === 'x' ? p.x1 - p.x0 : p.z1 - p.z0;
    const run = Math.hypot(len, p.h1 - p.h0);
    // Corners: (axis lo, other lo), (axis hi, other lo), (axis hi, other hi), (axis lo, other hi).
    const C = (ax: 'lo' | 'hi', ot: 'lo' | 'hi'): V3 => {
      const h = ax === 'lo' ? p.h0 : p.h1;
      if (p.axis === 'x') return [ax === 'lo' ? p.x0 : p.x1, h, ot === 'lo' ? p.z0 : p.z1];
      return [ot === 'lo' ? p.x0 : p.x1, h, ax === 'lo' ? p.z0 : p.z1];
    };
    const a = C('lo', 'lo');
    const b = C('hi', 'lo');
    const c = C('hi', 'hi');
    const d = C('lo', 'hi');
    const other = p.axis === 'x' ? p.z1 - p.z0 : p.x1 - p.x0;
    // Tiles: v runs up the slope from the low edge, so each course's lip falls downhill.
    const lowIsLo = p.h0 <= p.h1;
    const vOf = (pt: V3) => (lowIsLo ? (pt === a || pt === d ? 0 : run) : pt === a || pt === d ? run : 0);
    const uv = (pt: V3, uAlong: number): V2 => [uAlong, vOf(pt)];
    const nUp = new Vector3().subVectors(new Vector3(...b), new Vector3(...a)).cross(new Vector3().subVectors(new Vector3(...d), new Vector3(...a)));
    if (nUp.y < 0) nUp.negate();
    bag.add('tile', faceTo(quad(a, b, c, d, [uv(a, 0), uv(b, 0), uv(c, other), uv(d, other)]), [nUp.x, nUp.y, nUp.z]));
    const dn = (q: V3): V3 => [q[0], q[1] - ROOF_T, q[2]];
    const [ua, ub, uc, ud] = [dn(a), dn(b), dn(c), dn(d)];
    bag.add('board', faceTo(quad(ua, ub, uc, ud, [[0, 0], [run, 0], [run, other], [0, other]]), [-nUp.x, -nUp.y, -nUp.z]));
    // Edge faces: axis-lo edge (a–d), axis-hi edge (b–c), and the two rakes (a–b, d–c).
    const axisDir: V3 = p.axis === 'x' ? [1, 0, 0] : [0, 0, 1];
    const otherDir: V3 = p.axis === 'x' ? [0, 0, 1] : [1, 0, 0];
    const edge = (e0: V3, e1: V3, out: V3) => bag.add('board', faceTo(quad(e0, e1, dn(e1), dn(e0), [[0, 0], [1, 0], [1, ROOF_T], [0, ROOF_T]]), out));
    edge(a, d, [-axisDir[0], 0, -axisDir[2]]);
    edge(b, c, axisDir);
    edge(a, b, [-otherDir[0], 0, -otherDir[2]]);
    edge(d, c, otherDir);

    // Low edge (eave): valance and rafter tails where in the open.
    const lowEdge: [V3, V3] = lowIsLo ? [ua, ud] : [ub, uc];
    const out: V3 = lowIsLo ? [-axisDir[0], 0, -axisDir[2]] : axisDir;
    const k = Math.abs(p.h1 - p.h0) / len;
    const ridgeLow = (p.ridgeAt === 'lo' && lowIsLo) || (p.ridgeAt === 'hi' && !lowIsLo);
    if (!ridgeLow) {
      for (const [t0, t1] of openRuns(all, p, lerp3(lowEdge[0], [lowEdge[0][0], lowEdge[0][1] + ROOF_T, lowEdge[0][2]], 1), lerp3(lowEdge[1], [lowEdge[1][0], lowEdge[1][1] + ROOF_T, lowEdge[1][2]], 1))) {
        const e0 = lerp3(lowEdge[0], lowEdge[1], t0);
        const e1 = lerp3(lowEdge[0], lowEdge[1], t1);
        valance(e0, e1, out, 0.26, bag);
        const L = other * (t1 - t0);
        for (let s = 0.3; s < L - 0.2; s += 0.6) {
          const q = lerp3(e0, e1, s / L);
          const inn: V3 = [q[0] - out[0] * 0.75, q[1] + k * 0.75 - 0.03, q[2] - out[2] * 0.75];
          bag.add('timber', member(inn, [q[0] - out[0] * 0.02, q[1] - 0.03, q[2] - out[2] * 0.02], 0.06, 0.1));
        }
      }
    }
    // Rakes (sloped ends): barge board and valance where in the open.
    for (const [r0, r1, o] of [
      [a, b, [-otherDir[0], 0, -otherDir[2]]],
      [d, c, otherDir],
    ] as [V3, V3, V3][]) {
      for (const [t0, t1] of openRuns(all, p, r0, r1)) {
        const e0 = lerp3(r0, r1, t0);
        const e1 = lerp3(r0, r1, t1);
        bag.add('timber', member([e0[0] + o[0] * 0.03, e0[1] - 0.11, e0[2] + o[2] * 0.03], [e1[0] + o[0] * 0.03, e1[1] - 0.11, e1[2] + o[2] * 0.03], 0.05, 0.22));
        valance(dn(e0), dn(e1), o, 0.22, bag);
      }
    }
    // Ridge cap along the ridge end.
    if (p.ridgeAt === 'hi') {
      const [r0, r1] = [b, c];
      bag.add('tile', rod([r0[0] - otherDir[0] * 0.02, r0[1] - 0.02, r0[2] - otherDir[2] * 0.02], [r1[0] + otherDir[0] * 0.02, r1[1] - 0.02, r1[2] + otherDir[2] * 0.02], 0.12, 8));
    }
  }
}

/** Triangular or trapezoidal infill under a roof, standing on a line (a gable). */
export function infill(axis: 'x' | 'z', at: number, s0: number, s1: number, base: number, top: (s: number) => number, apexS: number | null, bag: Bag<Key>): void {
  const t = 0.15;
  const pts: [number, number][] = apexS === null ? [[s0, base], [s1, base], [s1, top(s1)], [s0, top(s0)]] : [[s0, base], [s1, base], [apexS, top(apexS)]];
  const P = (s: number, y: number, d: number): V3 => (axis === 'x' ? [at + d, y, s] : [s, y, at + d]);
  const A = pts.map(([s, y]) => P(s, y, -t / 2));
  const B = pts.map(([s, y]) => P(s, y, t / 2));
  const faces: V3[][] = [A, B];
  for (let i = 0; i < pts.length; i++) faces.push([A[i], B[i], B[(i + 1) % pts.length], A[(i + 1) % pts.length]]);
  bag.add('plaster', solid(faces));
}

/* ---------- Walls and openings ---------- */

export type OpenKind = 'window' | 'door' | 'door2' | 'louvre' | 'jali' | 'vent' | 'open';
export interface Opening {
  /** Centre, metres from the segment's start. */
  c: number;
  w: number;
  kind: OpenKind;
  /** Bottom and top of the opening (absolute heights). */
  y0: number;
  y1: number;
}
export interface Wall {
  a: V2;
  b: V2;
  /** Floor level the wall stands on. */
  y0: number;
  ops: Opening[];
  /** Top of the wall: a fixed height, the underside of these roof planes, or a function of plan position. */
  top: number | string[] | ((x: number, z: number) => number);
  /** Upper bound, e.g. the soffit of a floor slab. */
  cap?: number;
}

export interface Rooms {
  /** True if a plan point is inside a room on this floor (to tell inside from outside). */
  inside(x: number, z: number, y: number): boolean;
}

const segLen = (w: Wall) => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);

/** Frame of an opening: origin on the wall centre line at the opening's centre; u along, n outwards. */
export function openingFrame(w: Wall, c: number, rooms: Rooms): { m: Matrix4; out: boolean; partition: boolean } {
  const L = segLen(w);
  const t = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  let n = [-t[1], t[0]];
  const px = w.a[0] + t[0] * c;
  const pz = w.a[1] + t[1] * c;
  const y = w.y0 + 1;
  const sideA = rooms.inside(px + n[0] * 0.4, pz + n[1] * 0.4, y);
  const sideB = rooms.inside(px - n[0] * 0.4, pz - n[1] * 0.4, y);
  if (sideA && !sideB) n = [-n[0], -n[1]];
  const nn = new Vector3(n[0], 0, n[1]);
  const up = new Vector3(0, 1, 0);
  const m = new Matrix4().makeBasis(up.clone().cross(nn), up, nn).setPosition(px, 0, pz);
  return { m, out: sideA !== sideB, partition: sideA && sideB };
}

const fbox = (m: Matrix4, u0: number, y0: number, d0: number, u1: number, y1: number, d1: number) => box(u0, y0, d0, u1, y1, d1).applyMatrix4(m);

/** Wall pieces between openings, the top following the wall's roofs. */
export function wallPieces(w: Wall, planes: Plane[], bag: Bag<Key>, plan: PlanSheet | null): void {
  const L = segLen(w);
  const t: V2 = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  const n: V2 = [-t[1] * (WT / 2), t[0] * (WT / 2)];
  const ids = Array.isArray(w.top) ? w.top : [];
  const mine = planes.filter((p) => ids.some((id) => p.id === id || p.id.startsWith(id + '-')));
  const top = (x: number, z: number) => {
    let h = typeof w.top === 'number' ? w.top : typeof w.top === 'function' ? w.top(x, z) : envelope(mine, x, z) - ROOF_T;
    if (!Number.isFinite(h)) h = w.cap ?? w.y0 + 2.5;
    return Math.min(h, w.cap ?? Infinity);
  };
  const ext = WT / 2;
  const at = (s: number): V2 => [w.a[0] + t[0] * s, w.a[1] + t[1] * s];
  const piece = (s0: number, s1: number, y0: number, y1: number | null) => {
    if (s1 - s0 < 1e-3) return;
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
      bag.add('plaster', prismTop(poly, y0, y1 === null ? top : () => y1));
    }
  };
  const ops = [...w.ops].sort((p, q) => p.c - q.c);
  let s = -ext;
  for (const o of ops) {
    const s0 = o.c - o.w / 2;
    const s1 = o.c + o.w / 2;
    piece(s, s0, w.y0, null);
    if (o.y0 > w.y0) piece(s0, s1, w.y0, o.y0);
    piece(s0, s1, o.y1, null);
    plan?.walls.push({ a: at(s), b: at(s0), t: WT });
    if (plan && (o.kind === 'window' || o.kind === 'jali' || o.kind === 'vent')) plan.windows.push({ a: at(s0), b: at(s1) });
    if (plan && (o.kind === 'door' || o.kind === 'door2')) plan.doors.push({ hinge: at(s0), leaf: at(s1) });
    s = s1;
  }
  piece(s, L + ext, w.y0, null);
  plan?.walls.push({ a: at(s), b: at(L + ext), t: WT });
}

/** Casement window: frame, two glazed sashes of 2 × 3 panes, and a projecting sill outside. */
export function windowFixed(m: Matrix4, w: number, sill: number, head: number, out: boolean, bag: Bag<Key>): void {
  const f = 0.065;
  const h = (u0: number, y0: number, u1: number, y1: number, d0 = -0.02, d1 = 0.08) => bag.add('timber', fbox(m, u0, y0, d0, u1, y1, d1));
  h(-w / 2, sill, -w / 2 + f, head);
  h(w / 2 - f, sill, w / 2, head);
  h(-w / 2, head - f, w / 2, head);
  h(-w / 2, sill, w / 2, sill + f * 0.8);
  for (const side of [-1, 1]) {
    const u0 = side < 0 ? -w / 2 + f : 0;
    const u1 = side < 0 ? 0 : w / 2 - f;
    const r = 0.04;
    h(u0, sill + f, u0 + r, head - f, 0.0, 0.05);
    h(u1 - r, sill + f, u1, head - f, 0.0, 0.05);
    h(u0, sill + f, u1, sill + f + r, 0.0, 0.05);
    h(u0, head - f - r, u1, head - f, 0.0, 0.05);
    const mid = (u0 + u1) / 2;
    h(mid - 0.012, sill + f, mid + 0.012, head - f, 0.01, 0.04);
    for (const k of [1, 2]) {
      const y = sill + f + ((head - sill - 2 * f) * k) / 3;
      h(u0, y - 0.012, u1, y + 0.012, 0.01, 0.04);
    }
    bag.add('glass', fbox(m, u0 + r, sill + f + r, 0.022, u1 - r, head - f - r, 0.028));
  }
  if (out) bag.add('plaster', fbox(m, -w / 2 - 0.08, sill - 0.06, WT / 2 - 0.02, w / 2 + 0.08, sill, WT / 2 + 0.07));
}

/** Solid panelled shutter leaf hinged at hingeU, swung by angle about the hinge. */
export function shutterLeaf(m: Matrix4, hingeU: number, dir: number, w: number, y0: number, y1: number, angleDeg: number, bag: Bag<Key>): void {
  const leaf = new Matrix4().makeTranslation(hingeU, 0, WT / 2 + 0.02).multiply(new Matrix4().makeRotationY(((dir > 0 ? -1 : 1) * angleDeg * Math.PI) / 180));
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

export function doorFixed(m: Matrix4, w: number, y0: number, head: number, bag: Bag<Key>): void {
  const f = 0.075;
  bag.add('timber', fbox(m, -w / 2, y0, -0.06, -w / 2 + f, head, 0.06));
  bag.add('timber', fbox(m, w / 2 - f, y0, -0.06, w / 2, head, 0.06));
  bag.add('timber', fbox(m, -w / 2, head - f, -0.06, w / 2, head, 0.06));
}

/** Panelled door leaf hinged at hingeU, opening inwards by angle. */
export function doorLeaf(m: Matrix4, hingeU: number, dir: number, w: number, floor: number, head: number, angleDeg: number, bag: Bag<Key>): void {
  const y0 = floor + 0.01;
  const y1 = head - 0.075;
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
  add(a + s + 0.05, ym + 0.12, b - s - 0.05, y1 - s - 0.06, 0, 0.012);
  add(a + s + 0.05, y0 + 0.22, b - s - 0.05, ym - 0.12, 0, 0.012);
  const hx = dir > 0 ? b - 0.08 : a + 0.08;
  bag.add('brass', sphere(hx, floor + 1.0, 0.03, 0.025).applyMatrix4(mm));
}

/** Louvred folding leaves with a louvred transom: frame (fixed) or leaves (per house). */
export function louvre(m: Matrix4, w: number, floor: number, y1: number, openLeaves: number, bag: Bag<Key>, fixed: boolean): void {
  const f = 0.08;
  const n = Math.max(2, Math.round((w - 2 * f) / 0.62));
  const lw = (w - 2 * f) / n;
  const yT = y1 - 0.42;
  const slat = (y: number, u0: number, u1: number, d: number) => box(u0, -0.008, -d, u1, 0.008, d).applyMatrix4(new Matrix4().makeRotationX(-0.6)).applyMatrix4(new Matrix4().makeTranslation(0, y, 0));
  if (fixed) {
    bag.add('timber', fbox(m, -w / 2, floor, -0.07, -w / 2 + f, y1, 0.07));
    bag.add('timber', fbox(m, w / 2 - f, floor, -0.07, w / 2, y1, 0.07));
    bag.add('timber', fbox(m, -w / 2, y1 - f, -0.07, w / 2, y1, 0.07));
    bag.add('timber', fbox(m, -w / 2, yT - 0.06, -0.07, w / 2, yT, 0.07));
    for (let y = yT + 0.04; y < y1 - f - 0.02; y += 0.075) bag.add('timber', slat(y, -w / 2 + f, w / 2 - f, 0.035).applyMatrix4(m));
    return;
  }
  for (let i = 0; i < n; i++) {
    const u0 = -w / 2 + f + i * lw;
    const fromLeft = i < n / 2;
    const k = fromLeft ? i : n - 1 - i;
    const open = k < openLeaves;
    const hinge = fromLeft ? u0 : u0 + lw;
    const ang = open ? (k % 2 === 0 ? 1 : -1) * 72 : 0;
    const leafM = m.clone().multiply(new Matrix4().makeTranslation(hinge, 0, 0)).multiply(new Matrix4().makeRotationY(((fromLeft ? 1 : -1) * ang * Math.PI) / 180));
    const a = fromLeft ? 0 : -lw;
    const b = fromLeft ? lw : 0;
    const add = (g: BufferGeometry) => bag.add('timber', g.applyMatrix4(leafM));
    add(box(a, floor + 0.01, -0.02, a + 0.05, yT - 0.06, 0.02));
    add(box(b - 0.05, floor + 0.01, -0.02, b, yT - 0.06, 0.02));
    add(box(a, floor + 0.01, -0.02, b, floor + 0.14, 0.02));
    add(box(a, yT - 0.12, -0.02, b, yT - 0.06, 0.02));
    for (let y = floor + 0.2; y < yT - 0.14; y += 0.07) add(slat(y, a + 0.05, b - 0.05, 0.03));
  }
}

/** Terracotta jali block wall (p41 render): square cells with inclined fins. */
export function jali(m: Matrix4, w: number, y0: number, y1: number, bag: Bag<Key>): void {
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
      const fin = box(-cu / 2 + t / 2, -0.012, -d * 0.9, cu / 2 - t / 2, 0.012, d * 0.9)
        .applyMatrix4(new Matrix4().makeRotationX(0.7))
        .applyMatrix4(new Matrix4().makeTranslation(-w / 2 + (i + 0.5) * cu, y0 + (j + 0.5) * cv, 0))
        .applyMatrix4(m);
      bag.add('clay', fin);
    }
  }
}

export function vent(m: Matrix4, w: number, y0: number, y1: number, bag: Bag<Key>): void {
  bag.add('timber', fbox(m, -w / 2, y0, -0.05, w / 2, y0 + 0.04, 0.05), fbox(m, -w / 2, y1 - 0.04, -0.05, w / 2, y1, 0.05));
  bag.add('timber', fbox(m, -w / 2, y0, -0.05, -w / 2 + 0.04, y1, 0.05), fbox(m, w / 2 - 0.04, y0, -0.05, w / 2, y1, 0.05));
  for (let y = y0 + 0.08; y < y1 - 0.05; y += 0.08) bag.add('timber', box(-w / 2, -0.006, -0.04, w / 2, 0.006, 0.04).applyMatrix4(new Matrix4().makeRotationX(-0.6)).applyMatrix4(new Matrix4().makeTranslation(0, y, 0)).applyMatrix4(m));
}

/** Placement of an opening, kept for the per-house leaves. */
export interface Leaf {
  m: Matrix4;
  w: number;
  kind: OpenKind;
  out: boolean;
  partition: boolean;
  y0: number;
  y1: number;
}

/** Walls, their fixed opening parts, and the placements for leaves. */
export function buildWalls(walls: Wall[], planes: Plane[], rooms: Rooms, bag: Bag<Key>, plan: (w: Wall) => PlanSheet | null): Leaf[] {
  const leaves: Leaf[] = [];
  for (const w of walls) {
    wallPieces(w, planes, bag, plan(w));
    for (const o of w.ops) {
      const { m, out, partition } = openingFrame(w, o.c, rooms);
      if (o.kind === 'window') windowFixed(m, o.w, o.y0, o.y1, out, bag);
      else if (o.kind === 'door' || o.kind === 'door2') doorFixed(m, o.w, o.y0, o.y1, bag);
      else if (o.kind === 'louvre') louvre(m, o.w, o.y0, o.y1, 0, bag, true);
      else if (o.kind === 'jali') jali(m, o.w, o.y0, o.y1, bag);
      else if (o.kind === 'vent') vent(m, o.w, o.y0, o.y1, bag);
      if (o.kind === 'door' || o.kind === 'door2' || o.kind === 'louvre' || o.kind === 'window') leaves.push({ m, w: o.w, kind: o.kind, out, partition, y0: o.y0, y1: o.y1 });
    }
  }
  return leaves;
}

/** Per-house leaves: shutters folded back or half shut, doors ajar, louvres folded. */
export function buildLeaves(leaves: Leaf[], r: () => number, bag: Bag<Key>): void {
  for (const l of leaves) {
    const ajar = r();
    if (l.kind === 'window' && l.out) {
      shutterLeaf(l.m, -l.w / 2, -1, l.w / 2, l.y0, l.y1, ajar < 0.75 ? 178 : 70 + r() * 60, bag);
      shutterLeaf(l.m, l.w / 2, 1, l.w / 2, l.y0, l.y1, ajar < 0.85 ? 178 : 20, bag);
    } else if (l.kind === 'door') {
      doorLeaf(l.m, -l.w / 2 + 0.075, 1, l.w - 0.15, l.y0, l.y1, l.partition ? 85 : ajar < 0.5 ? 0 : 70 + r() * 20, bag);
    } else if (l.kind === 'door2') {
      const hw = (l.w - 0.15) / 2;
      doorLeaf(l.m, -l.w / 2 + 0.075, 1, hw, l.y0, l.y1, 80, bag);
      doorLeaf(l.m, l.w / 2 - 0.075, -1, hw, l.y0, l.y1, ajar < 0.5 ? 0 : 65, bag);
    } else if (l.kind === 'louvre') {
      louvre(l.m, l.w, l.y0, l.y1, 1 + Math.floor(r() * 2), bag, false);
    }
  }
}

/* ---------- Plinth, steps, posts ---------- */

export function plinthSolid(poly: V2[], y0: number, y1: number, bag: Bag<Key>, topKey: Key = 'mud'): void {
  bag.add(topKey, floorPoly(poly, y1));
  bag.add('plinth', floorPoly(poly, y0, true));
  let area = 0;
  for (let i = 0; i < poly.length; i++) area += poly[i][0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * poly[i][1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = (q[1] - p[1]) / L;
    const nz = -(q[0] - p[0]) / L;
    const sgn = area > 0 ? 1 : -1;
    bag.add('plinth', faceTo(quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [[0, y0], [L, y0], [L, y1], [0, y1]]), [nx * sgn, 0, nz * sgn]));
  }
}

/** Flight of steps from the ground up to `top`, rising towards `dir`. */
export function steps(x0: number, z0: number, x1: number, z1: number, dir: 'n' | 's' | 'e' | 'w', risers: number, top: number, bag: Bag<Key>, plan: PlanSheet | null): void {
  const rise = top / risers;
  for (let i = 0; i < risers - 1; i++) {
    const f = (risers - 1 - i) / risers;
    let r: [number, number, number, number] = [x0, z0, x1, z1];
    if (dir === 'n') r = [x0, z0, x1, z0 + (z1 - z0) * f];
    if (dir === 's') r = [x0, z1 - (z1 - z0) * f, x1, z1];
    if (dir === 'w') r = [x0, z0, x0 + (x1 - x0) * f, z1];
    if (dir === 'e') r = [x1 - (x1 - x0) * f, z0, x1, z1];
    bag.add('plinth', box(r[0], 0, r[1], r[2], rise * (i + 1), r[3]));
  }
  plan?.steps.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
}

/** Turned timber post on a basalt base, brass rings, capital block (p41, p42 renders). */
export function post(x: number, z: number, floor: number, top: number, bag: Bag<Key>): void {
  bag.add('basalt', box(x - 0.17, floor, z - 0.17, x + 0.17, floor + 0.22, z + 0.17));
  const cap = top - 0.08;
  const h = cap - (floor + 0.22);
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
  bag.add('timber', lathe(prof, x, floor + 0.22, z, 12));
  for (const y of [floor + 0.22 + 0.36, floor + 0.22 + h * 0.6]) bag.add('brass', lathe([[0, 0], [0.105, 0], [0.105, 0.035], [0, 0.035]], x, y, z, 12));
  bag.add('timber', box(x - 0.16, cap, z - 0.16, x + 0.16, top, z + 0.16));
}

/** A beam between two plan points at a height (or sloping between two heights). */
export function beam(a: V2, b: V2, ya: number, yb: number, bag: Bag<Key>): void {
  bag.add('timber', member([a[0], ya - 0.08, a[1]], [b[0], yb - 0.08, b[1]], 0.16, 0.16));
}

/** Compound wall run: plastered, with a basalt coping [assumed]. */
export function compoundWall(a: V2, b: V2, bag: Bag<Key>, plan: PlanSheet | null, h = 1.05): void {
  const xa = Math.min(a[0], b[0]) - 0.1;
  const xb = Math.max(a[0], b[0]) + 0.1;
  const za = Math.min(a[1], b[1]) - 0.1;
  const zb = Math.max(a[1], b[1]) + 0.1;
  bag.add('plaster', box(xa, 0, za, xb, h, zb));
  bag.add('basalt', box(xa - 0.04, h, za - 0.04, xb + 0.04, h + 0.1, zb + 0.04));
  plan?.walls.push({ a, b, t: 0.2 });
}

export const pot3 = (x: number, y: number, z: number, r: number, bag: Bag<Key>) => {
  bag.add('clay', sphere(x, y + r * 0.85, z, r, 1, 0.85, 1, 10));
  bag.add('clay', norm(new CylinderGeometry(r * 0.42, r * 0.5, r * 0.3, 10).translate(x, y + r * 1.62, z)));
};

export function emptyPlan(bounds: [number, number, number, number]): PlanSheet {
  return { bounds, plinth: [], courts: [], walls: [], windows: [], doors: [], posts: [], trees: [], steps: [], rooms: [] };
}

/* ---------- Meshes ---------- */

/** Keys that form closed solids, so they get a back-face poché twin for the section cut. */
export const SOLID: Key[] = ['plaster', 'plinth', 'mud', 'timber', 'board', 'tile', 'basalt', 'clay', 'bamboo', 'granite', 'ashlar', 'rock'];

export function meshes(geos: Map<Key, BufferGeometry>, mats: MaterialSet, parent: Group, poche: Mesh[], pocheMat: MeshBasicMaterial, own?: BufferGeometry[]): void {
  for (const [k, g] of geos) {
    own?.push(g);
    const m = new Mesh(g, (mats as unknown as Record<string, Material>)[k]);
    const ground = k === 'grass' || k === 'earth';
    m.castShadow = !ground && k !== 'glass';
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

export const newPocheMat = () => new MeshBasicMaterial({ color: 0x1e2756, side: BackSide });
