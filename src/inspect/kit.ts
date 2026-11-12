/**
 * Geometry kit for the inspect buildings: every builder returns a
 * non-indexed BufferGeometry with position, normal and uv, where uv is in
 * metres (box-projected), so the procedural textures keep a true scale.
 * A Bag collects geometries per material key and merges them, giving one
 * draw call per material.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  ShapeUtils,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V2 = [number, number];
export type V3 = [number, number, number];

/** Keep position, normal and uv (adding box-mapped uv if missing), non-indexed. */
export function norm(g: BufferGeometry, keepUV = false): BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') n.deleteAttribute(k);
  if (!n.getAttribute('normal')) n.computeVertexNormals();
  if (!keepUV || !n.getAttribute('uv')) boxUV(n);
  if (n !== g) g.dispose();
  return n;
}

/** UV from world position by the dominant normal axis, 1 unit = 1 m. */
export function boxUV(g: BufferGeometry, scale = 1): BufferGeometry {
  const p = g.getAttribute('position');
  const nm = g.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nm.getX(i));
    const ay = Math.abs(nm.getY(i));
    const az = Math.abs(nm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = p.getX(i);
      v = p.getZ(i);
    } else if (ax >= az) {
      u = p.getZ(i);
      v = p.getY(i);
    } else {
      u = p.getX(i);
      v = p.getY(i);
    }
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

/** Vertex colour for a whole geometry (people, foliage, cloth). */
export function paintGeo(g: BufferGeometry, hex: number, jitter = 0, seed = 1): BufferGeometry {
  const c = new Float32Array(g.getAttribute('position').count * 3);
  const r = ((hex >> 16) & 255) / 255;
  const gr = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  let s = seed;
  for (let i = 0; i < c.length; i += 3) {
    s = (s * 16807) % 2147483647;
    const j = 1 + jitter * ((s / 2147483647) * 2 - 1);
    // sRGB-ish hex to linear.
    c[i] = Math.pow(r, 2.2) * j;
    c[i + 1] = Math.pow(gr, 2.2) * j;
    c[i + 2] = Math.pow(b, 2.2) * j;
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

/** Axis-aligned box from corner to corner. */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): BufferGeometry {
  const g = new BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return norm(g);
}

/** A box laid along a plan segment a→b, `t` thick, offset sideways by `off`. */
export function along(a: V2, b: V2, y0: number, y1: number, t: number, off = 0): BufferGeometry {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new BoxGeometry(L, y1 - y0, t);
  const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  g.rotateY(ang);
  const nx = Math.sin(ang);
  const nz = Math.cos(ang);
  g.translate((a[0] + b[0]) / 2 + nx * off, (y0 + y1) / 2, (a[1] + b[1]) / 2 + nz * off);
  return norm(g);
}

/** A beam or member between two 3D points, w × h in section. */
export function member(p: V3, q: V3, w: number, h = w): BufferGeometry {
  const a = new Vector3(...p);
  const b = new Vector3(...q);
  const L = a.distanceTo(b);
  const g = new BoxGeometry(w, L, h);
  g.translate(0, L / 2, 0);
  const dir = b.clone().sub(a).normalize();
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir));
  g.translate(a.x, a.y, a.z);
  return norm(g);
}

/** Round rod between two points. */
export function rod(p: V3, q: V3, r: number, seg = 6): BufferGeometry {
  const a = new Vector3(...p);
  const b = new Vector3(...q);
  const L = a.distanceTo(b);
  const g = new CylinderGeometry(r, r, L, seg, 1, true);
  g.translate(0, L / 2, 0);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate(a.x, a.y, a.z);
  return norm(g);
}

/** Lathe from a (radius, height) profile, standing at x, z. */
export function lathe(profile: V2[], x: number, y: number, z: number, seg = 12): BufferGeometry {
  const g = new LatheGeometry(profile.map(([r, h]) => new Vector2(r, h)), seg);
  g.translate(x, y, z);
  return norm(g);
}

export function sphere(x: number, y: number, z: number, r: number, sx = 1, sy = 1, sz = 1, seg = 10): BufferGeometry {
  const g = new SphereGeometry(r, seg, Math.max(4, Math.round(seg * 0.6)));
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return norm(g);
}

/** Flat polygon (plan, CCW or CW) at height y, facing up, with uv in metres. */
export function floorPoly(poly: V2[], y: number, down = false): BufferGeometry {
  const tris = ShapeUtils.triangulateShape(poly.map(([x, z]) => new Vector2(x, z)), []);
  const pos: number[] = [];
  for (const t of tris) {
    const idx = down ? t : [t[0], t[2], t[1]];
    for (const i of idx) pos.push(poly[i][0], y, poly[i][1]);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // Make sure it faces the requested way.
  const ny = g.getAttribute('normal').getY(0);
  if ((ny < 0) !== down) {
    const p = g.getAttribute('position').array as Float32Array;
    for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) [p[i + 3 + k], p[i + 6 + k]] = [p[i + 6 + k], p[i + 3 + k]];
    g.computeVertexNormals();
  }
  return boxUV(g);
}

/** Swap the 2nd and 3rd vertex of triangle t in every attribute. */
function flipTri(g: BufferGeometry, t: number): void {
  for (const name of Object.keys(g.attributes)) {
    const at = g.getAttribute(name);
    const k = at.itemSize;
    const arr = at.array as Float32Array;
    for (let j = 0; j < k; j++) {
      const i1 = (t * 3 + 1) * k + j;
      const i2 = (t * 3 + 2) * k + j;
      const tmp = arr[i1];
      arr[i1] = arr[i2];
      arr[i2] = tmp;
    }
    at.needsUpdate = true;
  }
}

function triNormal(p: ArrayLike<number>, i: number, out: Vector3): Vector3 {
  const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2];
  const bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
  return out.set(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
}

/** Flip any triangle whose normal points towards the centroid (convex solids). */
export function orient(g: BufferGeometry): BufferGeometry {
  const p = g.getAttribute('position').array as Float32Array;
  let cx = 0, cy = 0, cz = 0;
  const n = p.length / 3;
  for (let i = 0; i < p.length; i += 3) { cx += p[i]; cy += p[i + 1]; cz += p[i + 2]; }
  cx /= n; cy /= n; cz /= n;
  const nn = new Vector3();
  for (let i = 0; i < p.length; i += 9) {
    triNormal(p, i, nn);
    const mx = (p[i] + p[i + 3] + p[i + 6]) / 3 - cx;
    const my = (p[i + 1] + p[i + 4] + p[i + 7]) / 3 - cy;
    const mz = (p[i + 2] + p[i + 5] + p[i + 8]) / 3 - cz;
    if (nn.x * mx + nn.y * my + nn.z * mz < 0) flipTri(g, i / 9);
  }
  g.computeVertexNormals();
  return g;
}

/** Turn every triangle to face along `d` (a direction, not a point). */
export function faceTo(g: BufferGeometry, d: V3): BufferGeometry {
  const p = g.getAttribute('position').array as Float32Array;
  const nn = new Vector3();
  for (let i = 0; i < p.length; i += 9) {
    triNormal(p, i, nn);
    if (nn.x * d[0] + nn.y * d[1] + nn.z * d[2] < 0) flipTri(g, i / 9);
  }
  g.computeVertexNormals();
  return g;
}

/** Closed convex solid from a list of points' faces: builds triangles as given, then orients. */
export function solid(faces: V3[][]): BufferGeometry {
  const pos: number[] = [];
  for (const f of faces) for (let i = 1; i < f.length - 1; i++) pos.push(...f[0], ...f[i], ...f[i + 1]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return boxUV(orient(g));
}

/** Vertical prism of a convex plan polygon with a varying top (walls under a roof). */
export function prismTop(poly: V2[], y0: number, top: (x: number, z: number) => number): BufferGeometry {
  const pos: number[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const tp = top(...p);
    const tq = top(...q);
    pos.push(p[0], y0, p[1], q[0], y0, q[1], q[0], tq, q[1], p[0], y0, p[1], q[0], tq, q[1], p[0], tp, p[1]);
  }
  for (let i = 1; i < n - 1; i++) {
    for (const m of [0, i, i + 1]) pos.push(poly[m][0], top(...poly[m]), poly[m][1]);
    for (const m of [0, i, i + 1]) pos.push(poly[m][0], y0, poly[m][1]);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return boxUV(orient(g));
}

/** Quad with explicit uv per corner (counter-clockwise seen from the front). */
export function quad(a: V3, b: V3, c: V3, d: V3, uv: [V2, V2, V2, V2]): BufferGeometry {
  const pos = [...a, ...b, ...c, ...a, ...c, ...d];
  const u = [...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]];
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(u, 2));
  g.computeVertexNormals();
  return g;
}

export function xform(g: BufferGeometry, m: Matrix4): BufferGeometry {
  g.applyMatrix4(m);
  return g;
}

/** Geometry lists per material key, merged on demand. */
export class Bag<K extends string = string> {
  lists = new Map<K, BufferGeometry[]>();
  add(key: K, ...g: BufferGeometry[]): void {
    let l = this.lists.get(key);
    if (!l) this.lists.set(key, (l = []));
    l.push(...g);
  }
  /** Merged geometry per key; the parts are disposed. */
  merge(): Map<K, BufferGeometry> {
    const out = new Map<K, BufferGeometry>();
    for (const [k, list] of this.lists) {
      const hasColor = list.some((g) => g.getAttribute('color'));
      for (const g of list) {
        if (hasColor && !g.getAttribute('color')) paintGeo(g, 0xffffff);
        if (!hasColor && g.getAttribute('color')) g.deleteAttribute('color');
        if (!g.getAttribute('uv')) boxUV(g);
      }
      const m = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!m) throw new Error(`merge failed: ${k}`);
      m.computeBoundingSphere();
      out.set(k, m);
    }
    this.lists.clear();
    return out;
  }
}
