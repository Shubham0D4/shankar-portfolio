/**
 * Parametric solids for procedural architecture models.
 *
 * Plan coordinates are V2 = [x, z] in metres (scene axes: +x east, +z south,
 * +y up). Every builder returns a closed, non-indexed BufferGeometry with flat
 * normals, so solids can be merged, outlined with EdgesGeometry and capped by
 * the stencil section in ./section.ts.
 */
import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from 'three';

export type V2 = [number, number];
export type HeightFn = (x: number, z: number) => number;

const asFn = (h: number | HeightFn): HeightFn => (typeof h === 'number' ? () => h : h);

export const rect = (x0: number, z0: number, x1: number, z1: number): V2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

/** Regular polygon, first vertex rotated so a flat edge faces north. */
export function regularPoly(cx: number, cz: number, apothem: number, sides: number): V2[] {
  const r = apothem / Math.cos(Math.PI / sides);
  const out: V2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((i + 0.5) / sides) * Math.PI * 2;
    out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return out;
}

/** Arc from a0 to a1 (radians, x = cos, z = sin) as a polyline. */
export function arc(cx: number, cz: number, r: number, a0: number, a1: number, steps: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return out;
}

/** Signed area in plan, positive when counter-clockwise seen from above. */
export function signedArea(p: V2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, z0] = p[i];
    const [x1, z1] = p[(i + 1) % p.length];
    a += x0 * -z1 - x1 * -z0; // (x, -z) is the right-handed plan seen from above
  }
  return a / 2;
}

const ccw = (p: V2[]): V2[] => (signedArea(p) >= 0 ? p : [...p].reverse());
const cw = (p: V2[]): V2[] => (signedArea(p) < 0 ? p : [...p].reverse());

/** Outward unit normal of edge i of a counter-clockwise polygon. */
export function edgeNormal(p: V2[], i: number): V2 {
  const [x0, z0] = p[i];
  const [x1, z1] = p[(i + 1) % p.length];
  const dx = x1 - x0;
  const dz = z1 - z0;
  const l = Math.hypot(dx, dz) || 1;
  // CCW from above in (X, Y) = (x, -z): outward is the right-hand normal
  // (dY, -dX) = (-dz, -dx), which maps back to world (x, z) as (-dz, dx).
  return [-dz / l, dx / l];
}

/** Miter offset of a simple polygon. Positive grows, negative shrinks. */
export function offsetPoly(poly: V2[], d: number): V2[] {
  const p = ccw(poly);
  const n = p.length;
  return p.map((pt, i) => {
    const a = edgeNormal(p, (i - 1 + n) % n);
    const b = edgeNormal(p, i);
    let mx = a[0] + b[0];
    let mz = a[1] + b[1];
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml;
    mz /= ml;
    const cos = mx * b[0] + mz * b[1];
    const k = d / Math.max(cos, 0.35); // cap miter spikes
    return [pt[0] + mx * k, pt[1] + mz * k];
  });
}

export function pointInPoly(x: number, z: number, p: V2[]): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i];
    const [xj, zj] = p[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polygon's boundary, negative inside. */
export function polySDF(x: number, z: number, p: V2[]): number {
  let d = Infinity;
  for (let i = 0; i < p.length; i++) {
    const [ax, az] = p[i];
    const [bx, bz] = p[(i + 1) % p.length];
    const ex = bx - ax;
    const ez = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
    d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return pointInPoly(x, z, p) ? -d : d;
}

/** Distance from a point to a polyline. */
export function polylineDist(x: number, z: number, p: V2[]): number {
  let d = Infinity;
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, az] = p[i];
    const [bx, bz] = p[i + 1];
    const ex = bx - ax;
    const ez = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
    d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return d;
}

/* ---------- Triangle soup with orientation checks ---------- */

export class Soup {
  pos: number[] = [];
  nor: number[] = [];
  private a = new Vector3();
  private b = new Vector3();
  private c = new Vector3();
  private n = new Vector3();

  /** Adds a triangle, flipped if needed so its normal faces `want`. */
  tri(p0: number[], p1: number[], p2: number[], want: Vector3): void {
    this.a.fromArray(p0);
    this.b.fromArray(p1).sub(this.a);
    this.c.fromArray(p2).sub(this.a);
    this.n.crossVectors(this.b, this.c);
    const len = this.n.length();
    if (len < 1e-9) return;
    this.n.divideScalar(len);
    if (this.n.dot(want) < 0) {
      [p1, p2] = [p2, p1];
      this.n.negate();
    }
    this.pos.push(...p0, ...p1, ...p2);
    for (let i = 0; i < 3; i++) this.nor.push(this.n.x, this.n.y, this.n.z);
  }

  quad(p0: number[], p1: number[], p2: number[], p3: number[], want: Vector3): void {
    this.tri(p0, p1, p2, want);
    this.tri(p0, p2, p3, want);
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    return g;
  }
}

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/**
 * Vertical prism over a plan polygon (with optional holes for courts).
 * Bottom and top may be functions of plan position, which gives ramps,
 * mono-pitch roofs and stepped slabs from the same builder.
 */
export function prism(poly: V2[], bottom: number | HeightFn, top: number | HeightFn, holes: V2[][] = []): BufferGeometry {
  const yb = asFn(bottom);
  const yt = asFn(top);
  const outer = ccw(poly);
  const hs = holes.map(cw);
  const s = new Soup();

  // Caps: triangulate in (x, -z).
  const contour = outer.map(([x, z]) => new Vector2(x, -z));
  const holeV = hs.map((h) => h.map(([x, z]) => new Vector2(x, -z)));
  const all = [...outer, ...hs.flat()];
  for (const [i, j, k] of ShapeUtils.triangulateShape(contour, holeV)) {
    const [a, b, c] = [all[i], all[j], all[k]];
    s.tri([a[0], yt(...a), a[1]], [b[0], yt(...b), b[1]], [c[0], yt(...c), c[1]], UP);
    s.tri([a[0], yb(...a), a[1]], [b[0], yb(...b), b[1]], [c[0], yb(...c), c[1]], DOWN);
  }

  // Walls: outward normal of each edge (holes are clockwise, so "outward"
  // points into the court, away from the solid).
  const want = new Vector3();
  for (const ring of [outer, ...hs]) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const [nx, nz] = edgeNormal(ring, i);
      want.set(nx, 0, nz);
      s.quad([a[0], yb(...a), a[1]], [b[0], yb(...b), b[1]], [b[0], yt(...b), b[1]], [a[0], yt(...a), a[1]], want);
    }
  }
  return s.geometry();
}

/** Parapet or upstand: a ring of `thickness` inside the polygon edge. */
export function parapet(poly: V2[], y0: number, y1: number, thickness = 0.3): BufferGeometry {
  return prism(poly, y0, y1, [offsetPoly(poly, -thickness)]);
}

/**
 * Horizontal extrusion of a section drawn in the (u, v) plane (u along the
 * local x axis, v up), from w0 to w1 along local z. Used for arches and vaults.
 */
export function extrudeSection(contour: V2[], holes: V2[][], w0: number, w1: number): BufferGeometry {
  // Reuse prism by treating (u, v) as plan and w as height, then swap axes.
  const g = prism(
    contour.map(([u, v]) => [u, -v] as V2),
    w0,
    w1,
    holes.map((h) => h.map(([u, v]) => [u, -v] as V2)),
  );
  // prism produced (u, w, -v); map to (u, v, w).
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const z = p.getZ(i);
    p.setXYZ(i, p.getX(i), -z, y);
    const ny = n.getY(i);
    const nz = n.getZ(i);
    n.setXYZ(i, n.getX(i), -nz, ny);
  }
  return g;
}

/** Round-headed opening outline: rectangle of `w` by `h` closed by a semicircle. */
export function archOutline(cx: number, y0: number, w: number, h: number, steps = 10): V2[] {
  const r = w / 2;
  const spring = y0 + Math.max(h - r, 0);
  const pts: V2[] = [
    [cx - r, y0],
    [cx + r, y0],
  ];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    pts.push([cx + r * Math.cos(a), spring + r * Math.sin(a)]);
  }
  return pts;
}

/**
 * Gateway or porch: a slab pierced by one round-headed arch.
 * Spans along local x from 0 to `span + 2 * pier`, depth along z.
 */
export function archGate(span: number, height: number, archH: number, pier: number, depth: number): BufferGeometry {
  const w = span + pier * 2;
  const hole = archOutline(w / 2, 0, span, archH, 16);
  // The opening touches the ground, so the frame is one U-shaped outline
  // that walks up one pier, over the arch and down the other.
  const contour: V2[] = [[0, 0], hole[0], ...hole.slice(2).reverse(), hole[1], [w, 0], [w, height], [0, height]];
  return extrudeSection(contour, [], -depth / 2, depth / 2);
}

/** Barrel vault over a w-wide bay, `rise` high, running length L along z. */
export function barrelVault(w: number, rise: number, thickness: number, L: number, steps = 14): BufferGeometry {
  const outer: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = w * t;
    outer.push([u, rise * Math.sin(Math.PI * t) + thickness]);
  }
  const contour: V2[] = [[0, 0], [w, 0], ...outer.reverse()];
  return extrudeSection(contour, [], 0, L);
}

/* ---------- Placement ---------- */

export interface Frame {
  /** World position of the local origin, metres. */
  x: number;
  z: number;
  /** Rotation about +y, radians (three.js convention). */
  rot: number;
}

export function toWorld(f: Frame, lx: number, lz: number): V2 {
  const c = Math.cos(f.rot);
  const s = Math.sin(f.rot);
  return [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
}

/** Bakes a frame into a geometry built in local coordinates. */
export function place(g: BufferGeometry, f: Frame): BufferGeometry {
  g.rotateY(f.rot);
  g.translate(f.x, 0, f.z);
  return g;
}

/** Outline at height y as line-segment pairs, for floor bands. */
export function outlineSegments(poly: V2[], y: number, out: number[]): void {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    out.push(a[0], y, a[1], b[0], y, b[1]);
  }
}

/* ---------- Roofs ---------- */

/**
 * Hip roof over a plan rectangle, as a closed solid (four slopes over a flat
 * soffit at eave level). The ridge runs along the longer side; a square plan
 * gives a pyramid. Rise comes from the pitch, capped at `maxRidge`.
 */
export function hipRoof(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  eave: number,
  pitchDeg: number,
  maxRidge = Infinity,
): BufferGeometry {
  const s = new Soup();
  const alongX = x1 - x0 >= z1 - z0;
  const half = (alongX ? z1 - z0 : x1 - x0) / 2;
  const ridgeY = Math.min(eave + Math.tan((pitchDeg * Math.PI) / 180) * half, maxRidge);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const r0 = alongX ? [Math.min(x0 + half, cx), ridgeY, cz] : [cx, ridgeY, Math.min(z0 + half, cz)];
  const r1 = alongX ? [Math.max(x1 - half, cx), ridgeY, cz] : [cx, ridgeY, Math.max(z1 - half, cz)];
  const a = [x0, eave, z0];
  const b = [x1, eave, z0];
  const c = [x1, eave, z1];
  const d = [x0, eave, z1];
  const out = (nx: number, nz: number) => new Vector3(nx, 0.6, nz);
  if (alongX) {
    s.quad(a, b, r1, r0, out(0, -1));
    s.quad(c, d, r0, r1, out(0, 1));
    s.tri(d, a, r0, out(-1, 0));
    s.tri(b, c, r1, out(1, 0));
  } else {
    s.quad(d, a, r0, r1, out(-1, 0));
    s.quad(b, c, r1, r0, out(1, 0));
    s.tri(a, b, r0, out(0, -1));
    s.tri(c, d, r1, out(0, 1));
  }
  s.quad(a, b, c, d, DOWN);
  return s.geometry();
}

/** Gable roof over a plan rectangle; `axis` is the ridge direction. Closed solid. */
export function gableRoof(x0: number, z0: number, x1: number, z1: number, eave: number, ridge: number, axis: 'x' | 'z'): BufferGeometry {
  const s = new Soup();
  const a = [x0, eave, z0];
  const b = [x1, eave, z0];
  const c = [x1, eave, z1];
  const d = [x0, eave, z1];
  if (axis === 'z') {
    const cx = (x0 + x1) / 2;
    const r0 = [cx, ridge, z0];
    const r1 = [cx, ridge, z1];
    s.quad(d, a, r0, r1, new Vector3(-1, 1, 0));
    s.quad(b, c, r1, r0, new Vector3(1, 1, 0));
    s.tri(a, b, r0, new Vector3(0, 0, -1));
    s.tri(c, d, r1, new Vector3(0, 0, 1));
  } else {
    const cz = (z0 + z1) / 2;
    const r0 = [x0, ridge, cz];
    const r1 = [x1, ridge, cz];
    s.quad(a, b, r1, r0, new Vector3(0, 1, -1));
    s.quad(c, d, r0, r1, new Vector3(0, 1, 1));
    s.tri(d, a, r0, new Vector3(-1, 0, 0));
    s.tri(b, c, r1, new Vector3(1, 0, 0));
  }
  s.quad(a, b, c, d, DOWN);
  return s.geometry();
}

/** Mirror a non-indexed geometry across the plane x = axis, keeping faces outward. */
export function mirrorX(g: BufferGeometry, axis: number): BufferGeometry {
  const m = g.clone();
  const p = m.getAttribute('position');
  const n = m.getAttribute('normal');
  for (let i = 0; i < p.count; i++) {
    p.setX(i, 2 * axis - p.getX(i));
    if (n) n.setX(i, -n.getX(i));
  }
  // Reflection reverses winding: swap the 2nd and 3rd vertex of every triangle.
  for (const name of Object.keys(m.attributes)) {
    const attr = m.getAttribute(name);
    const k = attr.itemSize;
    const arr = attr.array as Float32Array;
    for (let t = 0; t < attr.count; t += 3) {
      for (let j = 0; j < k; j++) {
        const i1 = (t + 1) * k + j;
        const i2 = (t + 2) * k + j;
        const tmp = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = tmp;
      }
    }
    attr.needsUpdate = true;
  }
  return m;
}
