/**
 * Sukoon Resort, Kamshet: procedural site model (PLAN.md §2, rank 5).
 *
 * Parameters: ./sukoon-resort.data.ts. Readings and assumptions: MODEL_NOTES.md §4.
 *
 * One parametric generator per building type (villa, guest-room cluster with
 * butterfly roofs, suite, dormitory pair, reception, octagonal hall, pergola
 * cafe, two restaurants, spa, gym, changing, service). All 45 buildings are
 * merged into one mesh; each vertex carries its building (aBlock), so the
 * buildings can settle in by zone, highlight by kind and flatten into the
 * idea model's figure-ground without separate meshes.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RGBADepthPacking,
  SRGBColorSpace,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRig, TINT } from '../three/rig';
import { gableRoof, hipRoof, offsetPoly, parapet, pointInPoly, polylineDist, prism, rect, type Frame, type V2 } from './kit/geometry';
import { createBlockUniforms, HIDDEN, patchBlocks } from './kit/patch';
import * as D from './sukoon-resort.data';
import type { CamKey, HoverInfo, ModelOptions, SiteModelHandle } from './types';

const DEG = Math.PI / 180;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sun as a scene vector, rotated into the plan by the sheet's north arrow. */
function sunVector(hourDeg: number, out: Vector3): Vector3 {
  const phi = D.LATITUDE * DEG;
  const H = hourDeg * DEG;
  const sinEl = Math.cos(phi) * Math.cos(H);
  const el = Math.asin(sinEl);
  const cosAz = (-sinEl * Math.sin(phi)) / (Math.cos(el) * Math.cos(phi));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (hourDeg > 0) az = Math.PI * 2 - az;
  const [nx, nz] = D.NORTH;
  const [ex, ez] = [-nz, nx]; // east: north turned clockwise on the sheet
  const h = Math.cos(el);
  return out.set((nx * Math.cos(az) + ex * Math.sin(az)) * h, Math.sin(el), (nz * Math.cos(az) + ez * Math.sin(az)) * h);
}

const C = {
  brick: new Color(0xb36d4d),
  timber: new Color(0x80573b),
  plaster: new Color(0xe6dac6),
  tile: new Color(0x9a5a40),
  darkTile: new Color(0x6f4a37),
  post: new Color(0x5a3a26),
  plinth: new Color(0xd3c5ad),
  water: new Color(0x8ea3a3),
  acrylic: new Color(0xe3ebe8),
  paving: new Color(0xd9c9b0),
  step: new Color(0xcdb590),
  deck: new Color(0x9b7556),
  tree: new Color(0x86906a),
  bank: new Color(0xc9b99c),
  ink: new Color(TINT.charcoal),
  cut: new Color(TINT.terracotta),
};

/* ---------- Geometry helpers ---------- */

function clean(g: BufferGeometry): BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  if (n !== g) g.dispose();
  return n;
}

function paint(g: BufferGeometry, color: Color): BufferGeometry {
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  return g;
}

function merge(list: BufferGeometry[]): BufferGeometry {
  const m = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  if (!m) throw new Error('merge failed');
  return m;
}

const P = D.PLINTH;

/** A box of walls on a plinth, as a closed ring of wall thickness. */
function walls(out: BufferGeometry[], r: [number, number, number, number], top: number, color: Color, solid = true): void {
  out.push(paint(prism(rect(r[0] - 0.4, r[1] - 0.4, r[2] + 0.4, r[3] + 0.4), 0, P), C.plinth));
  out.push(paint(solid ? prism(rect(...r), P, top) : parapet(rect(...r), P, top, 0.25), color));
}

function post(out: BufferGeometry[], x: number, z: number, y0: number, y1: number, r = 0.15): void {
  const g = clean(new CylinderGeometry(r, r * 1.15, y1 - y0, 8));
  g.translate(x, (y0 + y1) / 2, z);
  out.push(paint(g, C.post));
}

/** Butterfly roof slab over x0..x1, valley at the middle. */
function butterfly(out: BufferGeometry[], x0: number, z0: number, x1: number, z1: number, low: number, high: number): void {
  const xm = (x0 + x1) / 2;
  const y = (x: number) => lerp(low, high, Math.abs(x - xm) / ((x1 - x0) / 2));
  out.push(paint(prism(rect(x0, z0, xm, z1), (x) => y(x) - 0.22, y), C.darkTile));
  out.push(paint(prism(rect(xm, z0, x1, z1), (x) => y(x) - 0.22, y), C.darkTile));
}

/* ---------- Building types (local frame, centred, front = −z) ---------- */

function buildType(b: D.Building): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  const L = b.L;
  const Dp = b.D;
  const hl = L / 2;
  const hd = Dp / 2;
  switch (b.kind) {
    case 'villa': {
      // Elongated hexagon, wide side and private pool towards the lake (−z).
      const plan: V2[] = [[-hl, -hd + 2], [hl, -hd + 2], [hl - 3, hd], [-hl + 3, hd]];
      out.push(paint(prism(offsetPoly(plan, 0.4), 0, P), C.plinth));
      out.push(paint(prism(plan, P, P + 3), C.brick));
      out.push(paint(parapet(plan, P + 3, P + 3.9, 0.25), C.brick));
      for (const s of [-1, 1]) {
        const wing: [number, number, number, number] = s < 0 ? [-hl + 1.2, -hd + 2, -hl + 6, hd - 1.2] : [hl - 6, -hd + 2, hl - 1.2, hd - 1.2];
        out.push(paint(prism(rect(...wing), P + 3, P + 6), C.brick));
        // Low tiled hips over the upper wings (villa front elevation, p19).
        out.push(paint(hipRoof(wing[0] - 0.5, wing[1] - 0.5, wing[2] + 0.5, wing[3] + 0.5, P + 6, 20, P + 7.6), C.tile));
      }
      out.push(paint(prism([[-hl + 1, -hd - 1.6], [hl - 1, -hd - 1.6], [hl, -hd + 2], [-hl, -hd + 2]], 0, P - 0.15), C.water));
      break;
    }
    case 'guest': {
      // Three units of two rooms, the middle one set back, each under a butterfly roof.
      const u = L / 3;
      for (let i = 0; i < 3; i++) {
        const x0 = -hl + u * i;
        const dz = i === 1 ? -1.5 : 1.5;
        const r: [number, number, number, number] = [x0 + 0.3, -hd + 1.5 + dz, x0 + u - 0.3, hd - 1.5 + dz];
        walls(out, r, 3.4, C.timber);
        butterfly(out, r[0] - 0.5, r[1] - 0.8, r[2] + 0.5, r[3] + 0.8, 3.4, 4.8);
      }
      break;
    }
    case 'suite': {
      const r: [number, number, number, number] = [-hl, -hd, hl, hd];
      walls(out, r, 3.3, C.plaster);
      out.push(paint(hipRoof(-hl - 0.6, -hd - 0.6, hl + 0.6, hd + 0.6, 3.3, 28, 5.6), C.tile));
      break;
    }
    case 'dorm': {
      for (const s of [-1, 1]) {
        const r: [number, number, number, number] = s < 0 ? [-hl, -hd, -hl + 6.5, hd] : [hl - 6.5, -hd, hl, hd];
        walls(out, r, 3.3, C.plaster);
        out.push(paint(hipRoof(r[0] - 0.6, r[1] - 0.6, r[2] + 0.6, r[3] + 0.6, 3.3, 28, 5.8), C.tile));
      }
      walls(out, [-hl + 6.5, -hd + 2, hl - 6.5, hd - 3], 3.0, C.plaster);
      break;
    }
    case 'reception': {
      walls(out, [-hl, hd - 9, hl, hd], 3.6, C.timber);
      out.push(paint(prism(rect(-hl, -hd, hl, hd - 9), 0, P), C.plinth));
      for (let x = -hl + 1; x <= hl - 0.9; x += 4.5) post(out, x, -hd + 0.6, P, 3.6);
      out.push(paint(gableRoof(-hl - 0.8, -hd - 0.8, hl + 0.8, hd + 0.8, 3.6, 6.6, 'x'), C.tile));
      break;
    }
    case 'hall': {
      const r = hl / Math.cos(Math.PI / 8);
      const oct = (rad: number, y0: number, y1: number, top = rad) => {
        const g = clean(new CylinderGeometry(top, rad, y1 - y0, 8));
        g.rotateY(Math.PI / 8);
        g.translate(0, (y0 + y1) / 2, 0);
        return g;
      };
      out.push(paint(oct(r + 0.6, 0, P), C.plinth));
      out.push(paint(oct(r, P, 4.5), C.brick));
      out.push(paint(oct(r + 1.4, 4.5, 6.9, r * 0.56), C.tile));
      out.push(paint(oct(r * 0.56, 6.9, 7.8), C.post)); // the roof cavity, read as a dark band
      out.push(paint(oct(r * 0.66, 7.8, 9.3, 0.01), C.tile));
      walls(out, [-3, -hd - 5, 3, -hd + 0.5], 3.2, C.brick);
      break;
    }
    case 'cafe': {
      out.push(paint(prism(rect(-hl, -hd, hl, hd), 0, 0.9), C.plinth));
      for (const x of [-hl + 0.4, 0, hl - 0.4]) for (const z of [-hd + 0.4, 0, hd - 0.4]) if (x !== 0 || z !== 0) post(out, x, z, 0.9, 3.7, 0.13);
      for (let k = -2; k <= 2; k++) {
        const a = k * (hl / 2.5);
        out.push(paint(prism(rect(a - 0.12, -hd, a + 0.12, hd), 3.55, 3.75), C.post));
        out.push(paint(prism(rect(-hl, a - 0.12, hl, a + 0.12), 3.45, 3.62), C.post));
      }
      out.push(paint(prism(rect(-hl - 0.3, -hd - 0.3, hl + 0.3, hd + 0.3), 3.75, 3.82), C.acrylic));
      break;
    }
    case 'restaurant-east': {
      walls(out, [-hl, hd - 7, hl, hd], 3.4, C.brick);
      out.push(paint(prism(rect(-hl, -hd, hl, hd - 7), 0, P), C.plinth));
      for (let x = -hl + 0.8; x <= hl - 0.7; x += 4.5) post(out, x, -hd + 0.6, P, 3.4);
      out.push(paint(hipRoof(-hl - 1, -hd - 1, hl + 1, hd + 1, 3.4, 26, 6.2), C.tile));
      break;
    }
    case 'restaurant-lake': {
      for (const s of [-1, 1]) {
        const r: [number, number, number, number] = s < 0 ? [-hl, -hd, -hl + 11, hd - 4] : [hl - 11, -hd, hl, hd - 4];
        walls(out, r, 3.4, C.brick);
        out.push(paint(gableRoof(r[0] - 0.7, r[1] - 0.7, r[2] + 0.7, r[3] + 0.7, 3.4, 6.2, 'z'), C.tile));
      }
      walls(out, [-hl, hd - 4, hl, hd], 3.0, C.brick);
      out.push(paint(prism(rect(-hl + 11, -hd, hl - 11, hd - 4), 0, P - 0.2), C.paving));
      break;
    }
    case 'spa':
    case 'gym':
    case 'changing': {
      walls(out, [-hl, -hd, hl, hd], 3.3, C.plaster);
      out.push(paint(hipRoof(-hl - 0.6, -hd - 0.6, hl + 0.6, hd + 0.6, 3.3, 28, 5.4), C.tile));
      break;
    }
    case 'service': {
      walls(out, [-hl, -hd, hl, hd], 4.5, C.plaster);
      out.push(paint(parapet(rect(-hl, -hd, hl, hd), 4.5, 5.2, 0.25), C.plaster));
      break;
    }
  }
  return out;
}

function frameOf(b: D.Building): Frame {
  const [x, z] = D.px(b.c);
  if (b.cw !== undefined) return { x, z, rot: -b.cw * DEG };
  // Villas: local −z (the pool) faces away from the focus, towards the lake.
  const [fx, fz] = D.VILLA_FOCUS;
  const dx = x - fx;
  const dz = z - fz;
  const l = Math.hypot(dx, dz) || 1;
  return { x, z, rot: Math.atan2(-dx / l, -dz / l) };
}

/* ---------- Site plan texture ---------- */

function sitePlan(): CanvasTexture {
  const B = D.BOARD;
  const W = B.x1 - B.x0;
  const Dm = B.z1 - B.z0;
  const cw = 2048;
  const ch = Math.round((cw * Dm) / W);
  const k = cw / W;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d')!;
  const X = (x: number) => (x - B.x0) * k;
  const Z = (z: number) => (z - B.z0) * k;
  const path = (pts: V2[], close = true) => {
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    if (close) g.closePath();
  };
  const circle = ([x, z]: V2, r: number) => {
    g.beginPath();
    g.arc(X(x), Z(z), r * k, 0, Math.PI * 2);
  };
  g.fillStyle = '#e9e2d4';
  g.fillRect(0, 0, cw, ch);
  path(D.SITE);
  g.fillStyle = '#b8be9d';
  g.fill();
  // Lake edge: a darker green bank strip.
  path(D.SITE);
  g.strokeStyle = '#9da785';
  g.lineWidth = 14 * k;
  g.stroke();
  g.beginPath();
  g.ellipse(X(D.GARDEN.c[0]), Z(D.GARDEN.c[1]), D.GARDEN.rx * k, D.GARDEN.rz * k, 0, 0, Math.PI * 2);
  g.fillStyle = '#a2ab86';
  g.fill();
  g.strokeStyle = '#c9b49a';
  g.lineWidth = 4 * k;
  g.stroke();
  g.lineCap = g.lineJoin = 'round';
  for (const p of D.PATHS) {
    path(p.pts, false);
    g.strokeStyle = '#c9b49a';
    g.lineWidth = p.w * k;
    g.stroke();
  }
  path(D.ACCESS_ROAD, false);
  g.strokeStyle = '#bdb3a3';
  g.lineWidth = 10 * k;
  g.stroke();
  g.fillStyle = '#dccbb3';
  circle(D.PLAZA.a, D.PLAZA.ra);
  g.fill();
  circle(D.PLAZA.b, D.PLAZA.rb);
  g.fill();
  path([
    [D.PLAZA.a[0] - 8, D.PLAZA.a[1]],
    [D.PLAZA.a[0] + 8, D.PLAZA.a[1]],
    [D.PLAZA.b[0] + 8, D.PLAZA.b[1]],
    [D.PLAZA.b[0] - 8, D.PLAZA.b[1]],
  ]);
  g.fill();
  path(D.PARKING);
  g.fillStyle = '#c9c1b3';
  g.fill();
  path(D.TENNIS);
  g.fillStyle = '#c9a487';
  g.fill();
  circle(D.SITOUT.c, D.SITOUT.r);
  g.fillStyle = '#dccbb3';
  g.fill();
  for (const [x, z] of D.BADMINTON) {
    g.fillStyle = '#9aa383';
    g.fillRect(X(x - 4), Z(z - 7), 8 * k, 14 * k);
  }
  // Paving ring round the kund.
  circle(D.KUND.c, D.KUND.r + 4);
  g.fillStyle = '#dccbb3';
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Grow patch (idea mode flattens the buildings) ---------- */

function patchGrow(m: Material, u: { uGrow: { value: number } }): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uGrow;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed.y = ${D.GROUND.toFixed(3)} + (transformed.y - ${D.GROUND.toFixed(3)}) * uGrow;`);
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => prevKey() + 'grow';
}

/* ---------- Camera ---------- */

const KEYS: CamKey[] = [
  { az: 284, el: 30, dist: 540, t: [70, 0, 30] },
  { az: 112, el: 32, dist: 330, t: [150, 0, 25] },
  { az: 212, el: 50, dist: 480, t: [55, 0, 40] },
  { az: 236, el: 26, dist: 210, t: [65, 4, -25] },
  { az: 252, el: 30, dist: 175, t: [-18, 2, 15] },
  { az: 200, el: 16, dist: 400, t: [45, 8, 5] },
  { az: 225, el: 40, dist: 470, t: [60, 0, 40] },
];
const IDEA_KEY: CamKey = { az: 184, el: 70, dist: 480, t: [60, 0, 40] };

function mixKey(a: CamKey, b: CamKey, f: number): CamKey {
  return {
    az: lerp(a.az, b.az, f),
    el: lerp(a.el, b.el, f),
    dist: lerp(a.dist, b.dist, f),
    t: [lerp(a.t[0], b.t[0], f), lerp(a.t[1], b.t[1], f), lerp(a.t[2], b.t[2], f)],
  };
}
function camAt(stage: number): CamKey {
  const i = Math.min(Math.floor(stage), KEYS.length - 2);
  return mixKey(KEYS[i], KEYS[i + 1], smooth(stage - i, 0, 1));
}

/* ---------- Scene ---------- */

const PUBLIC: D.Kind[] = ['reception', 'hall', 'cafe', 'restaurant-east', 'restaurant-lake', 'spa', 'gym', 'changing', 'service'];
const ACCOMMODATION: D.Kind[] = ['villa', 'guest', 'suite', 'dorm'];

export async function createSukoonResort(canvas: HTMLCanvasElement, opts: ModelOptions = {}): Promise<SiteModelHandle> {
  const rig = createRig(canvas);
  const { renderer, scene, camera, sun } = rig;
  const coarse = matchMedia('(pointer: coarse)').matches;
  camera.near = 1;
  camera.far = 4000;
  if (opts.debugView?.fov) {
    camera.fov = opts.debugView.fov;
    if (camera.fov < 10) {
      camera.near = 200;
      camera.far = 60000;
    }
  }
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -300;
  sc.right = sc.top = 300;
  sc.near = 50;
  sc.far = 1400;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.4;

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => (owned.push(x), x);

  /* Buildings: one merged mesh, aBlock = building index */
  const N = D.BUILDINGS.length;
  const bu = createBlockUniforms(N + 1);
  const gu = { uGrow: { value: 1 } };
  const lift = bu.uLift.value;
  const parts: BufferGeometry[] = [];
  const centres: V2[] = [];
  D.BUILDINGS.forEach((b, i) => {
    const f = frameOf(b);
    centres.push([f.x, f.z]);
    for (const g of buildType(b)) {
      g.rotateY(f.rot);
      g.translate(f.x, D.GROUND, f.z);
      const n = g.getAttribute('position').count;
      g.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(n).fill(i), 1));
      parts.push(g);
    }
  });
  const buildGeo = own(merge(parts));
  const buildMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, transparent: true }));
  patchGrow(buildMat, gu);
  patchBlocks(buildMat, bu, { color: true, tint: true, hoverStrength: 0.55, hoverColor: new Color(0xfff3dc) });
  const depth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
  patchGrow(depth, gu);
  patchBlocks(depth, bu);
  const buildings = new Mesh(buildGeo, buildMat);
  buildings.customDepthMaterial = depth;
  buildings.castShadow = buildings.receiveShadow = true;
  buildings.frustumCulled = false;
  scene.add(buildings);

  const edgeGeo = own(new EdgesGeometry(buildGeo, 30));
  {
    // Carry building ids onto the edges by position lookup.
    const key = (x: number, y: number, z: number) => `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    const ids = new Map<string, number>();
    const p = buildGeo.getAttribute('position');
    const a = buildGeo.getAttribute('aBlock');
    for (let i = 0; i < p.count; i++) ids.set(key(p.getX(i), p.getY(i), p.getZ(i)), a.getX(i));
    const ep = edgeGeo.getAttribute('position');
    const eb = new Float32Array(ep.count);
    for (let i = 0; i < ep.count; i++) eb[i] = ids.get(key(ep.getX(i), ep.getY(i), ep.getZ(i))) ?? N;
    edgeGeo.setAttribute('aBlock', new Float32BufferAttribute(eb, 1));
  }
  const edgeMat = own(new LineBasicMaterial({ color: C.ink, transparent: true }));
  patchGrow(edgeMat, gu);
  patchBlocks(edgeMat, bu, { color: true, hoverColor: C.cut });
  const edges = new LineSegments(edgeGeo, edgeMat);
  edges.frustumCulled = false;
  scene.add(edges);

  /* Land, water, board */
  const B = D.BOARD;
  const kundHole: V2[] = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    return [D.KUND.c[0] + D.KUND.r * Math.cos(t), D.KUND.c[1] + D.KUND.r * Math.sin(t)];
  });
  const planTex = own(sitePlan());
  const landShape = new Shape(D.LAND.map(([x, z]) => new Vector2(x, -z)));
  landShape.holes.push(new Shape(kundHole.map(([x, z]) => new Vector2(x, -z)).reverse()));
  const topGeo = own(new ShapeGeometry(landShape, 6));
  topGeo.rotateX(-Math.PI / 2);
  {
    const p = topGeo.getAttribute('position');
    const uv = topGeo.getAttribute('uv');
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - B.x0) / (B.x1 - B.x0), 1 - (p.getZ(i) - B.z0) / (B.z1 - B.z0));
  }
  topGeo.translate(0, D.GROUND, 0);
  const topMat = own(new MeshStandardMaterial({ map: planTex, roughness: 1 }));
  const landTop = new Mesh(topGeo, topMat);
  landTop.receiveShadow = true;
  scene.add(landTop);
  const bankGeo = own(paint(prism(D.LAND, -B.thickness, D.GROUND - 0.03, [kundHole]), C.bank));
  const bankMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  const bank = new Mesh(bankGeo, bankMat);
  bank.receiveShadow = true;
  bank.castShadow = true;
  scene.add(bank);

  const waterGeo = own(new PlaneGeometry(B.x1 - B.x0, B.z1 - B.z0).rotateX(-Math.PI / 2));
  const waterMat = own(new MeshStandardMaterial({ color: C.water, roughness: 0.55, metalness: 0 }));
  const water = new Mesh(waterGeo, waterMat);
  water.position.set((B.x0 + B.x1) / 2, 0.3, (B.z0 + B.z1) / 2);
  water.receiveShadow = true;
  scene.add(water);
  const boardGeo = own(new BoxGeometry(B.x1 - B.x0, B.thickness, B.z1 - B.z0));
  const boardMat = own(new MeshStandardMaterial({ color: 0x8a9a9a, roughness: 1 }));
  const board = new Mesh(boardGeo, boardMat);
  board.position.set((B.x0 + B.x1) / 2, 0.3 - B.thickness / 2 - 0.01, (B.z0 + B.z1) / 2);
  scene.add(board);

  /* Landscape: kund, pool, waterfront amphitheatre, stepped garden, decks, jetty */
  const land: BufferGeometry[] = [];
  const K = D.KUND;
  const ringW = (K.r - K.floor) / K.steps;
  const circ = (r: number, n = 48): V2[] => Array.from({ length: n }, (_, i) => [K.c[0] + r * Math.cos((i / n) * Math.PI * 2), K.c[1] + r * Math.sin((i / n) * Math.PI * 2)]);
  for (let s = 0; s < K.steps; s++) {
    const ro = K.r - s * ringW;
    const ri = ro - ringW;
    land.push(paint(prism(circ(ro), D.GROUND - 5, D.GROUND - (s + 1) * K.stepH, [circ(ri)]), s % 2 ? C.step : C.paving));
  }
  land.push(paint(prism(circ(K.floor), D.GROUND - 5, D.GROUND - K.steps * K.stepH - 0.1), C.paving));
  land.push(paint(prism(offsetPoly(D.POOL, 1.2), D.GROUND - 0.1, D.GROUND + 0.15), C.paving));
  land.push(paint(prism(D.POOL, D.GROUND - 0.1, D.GROUND + 0.2), C.water));
  const A = D.WATERFRONT_AMPHI;
  for (let k = 0; k < A.rings; k++) {
    const r0 = A.r0 + k * A.tread;
    const r1 = r0 + A.tread;
    const arc = (r: number) => Array.from({ length: 13 }, (_, i): V2 => {
      const t = Math.PI / 2 + (Math.PI * i) / 12;
      return [A.c[0] + r * Math.cos(t), A.c[1] + r * Math.sin(t)];
    });
    land.push(paint(prism([...arc(r1), ...arc(r0).reverse()], 0, D.GROUND - (k + 1) * A.rise), k % 2 ? C.step : C.paving));
  }
  // Stepped garden: four terraces stepping down from the bank towards the water.
  const sg = D.STEPPED_GARDEN;
  const off = (d: number): V2[] =>
    sg.map((p, i) => {
      const a = sg[Math.max(0, i - 1)];
      const b = sg[Math.min(sg.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      let nx = dz / l;
      let nz = -dx / l;
      if (nx > 0) [nx, nz] = [-nx, -nz];
      return [p[0] + nx * d, p[1] + nz * d];
    });
  for (let k = 0; k < 4; k++) {
    const inner = off(k * 4 - 1);
    const outer = off((k + 1) * 4);
    land.push(paint(prism([...inner, ...outer.reverse()], 0, D.GROUND - (k + 1) * 0.5), k % 2 ? C.step : new Color(0xa7ae8c)));
  }
  for (const d of D.DECKS) land.push(paint(prism(d, 0, 1.4), C.deck));
  land.push(paint(prism(rect(...D.JETTY), 0, 1.2), C.deck));
  const landGeo = own(merge(land));
  landGeo.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(landGeo.getAttribute('position').count).fill(N), 1));
  const landMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  const landMesh = new Mesh(landGeo, landMat);
  landMesh.receiveShadow = true;
  landMesh.castShadow = true;
  scene.add(landMesh);

  /* Trees: rows along the main paths, and a seeded scatter in the lawns */
  const rand = rng(2273);
  const keepOut = D.BUILDINGS.map((b, i) => ({ c: centres[i], r: Math.hypot(b.L, b.D) / 2 + 3 }));
  const clear = (x: number, z: number) =>
    pointInPoly(x, z, D.SITE) &&
    !keepOut.some((k) => Math.hypot(x - k.c[0], z - k.c[1]) < k.r) &&
    Math.hypot(x - D.KUND.c[0], z - D.KUND.c[1]) > D.KUND.r + 6 &&
    !pointInPoly(x, z, offsetPoly(D.POOL, 3)) &&
    !pointInPoly(x, z, D.PARKING) &&
    Math.hypot(x - D.PLAZA.a[0], z - D.PLAZA.a[1]) > D.PLAZA.ra + 2 &&
    Math.hypot(x - D.PLAZA.b[0], z - D.PLAZA.b[1]) > D.PLAZA.rb + 2;
  const trees: { x: number; z: number; s: number }[] = [];
  for (const p of D.PATHS.slice(0, 3)) {
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, az] = p.pts[i];
      const [bx, bz] = p.pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az);
      const nx = -(bz - az) / L;
      const nz = (bx - ax) / L;
      for (let t = 0; t < L; t += 7) {
        for (const side of [-1, 1]) {
          const x = ax + ((bx - ax) * t) / L + nx * side * (p.w / 2 + 2.5);
          const z = az + ((bz - az) * t) / L + nz * side * (p.w / 2 + 2.5);
          if (clear(x, z)) trees.push({ x, z, s: 1.3 + rand() * 0.4 });
        }
      }
    }
  }
  const pathLines = D.PATHS.map((p) => p.pts);
  for (let i = 0; i < 6000 && trees.length < (coarse ? 160 : 230); i++) {
    const x = lerp(-110, 360, rand());
    const z = lerp(-140, 215, rand());
    if (!clear(x, z) || pathLines.some((l) => polylineDist(x, z, l) < 4)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 5)) continue;
    trees.push({ x, z, s: 1.4 + rand() * 1.2 });
  }
  const treeGeo = own(new IcosahedronGeometry(1, 0));
  const treeMat = own(new MeshStandardMaterial({ color: C.tree, roughness: 1, flatShading: true, transparent: true }));
  const treeMesh = new InstancedMesh(treeGeo, treeMat, trees.length);
  trees.forEach((t, i) =>
    treeMesh.setMatrixAt(i, new Matrix4().compose(new Vector3(t.x, D.GROUND + t.s * 1.5, t.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), i), new Vector3(t.s, t.s * 1.2, t.s))),
  );
  treeMesh.castShadow = true;
  scene.add(treeMesh);

  /* Idea layer: dashed sight-lines from each accommodation block to the water */
  // The bank only: LAND's last points run along the board edge, not the water.
  const bankLine = D.LAND.slice(0, 14);
  const nearestWater = ([x, z]: V2): V2 => {
    let best: V2 = bankLine[0];
    let bd = Infinity;
    for (let i = 0; i < bankLine.length - 1; i++) {
      const [ax, az] = bankLine[i];
      const [bx, bz] = bankLine[i + 1];
      const ex = bx - ax;
      const ez = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
      const px = ax + ex * t;
      const pz = az + ez * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < bd) {
        bd = d;
        best = [px, pz];
      }
    }
    // Carry on a few metres over the water.
    const dx = best[0] - x;
    const dz = best[1] - z;
    const l = Math.hypot(dx, dz) || 1;
    return [best[0] + (dx / l) * 8, best[1] + (dz / l) * 8];
  };
  const sPos: number[] = [];
  const sT: number[] = [];
  const sLen: number[] = [];
  D.BUILDINGS.forEach((b, i) => {
    if (!ACCOMMODATION.includes(b.kind)) return;
    const a = centres[i];
    const w = nearestWater(a);
    const L = Math.hypot(w[0] - a[0], w[1] - a[1]);
    const nx = (-(w[1] - a[1]) / L) * 0.45;
    const nz = ((w[0] - a[0]) / L) * 0.45;
    const y = D.GROUND + 1.6;
    const q = [
      [a[0] - nx, a[1] - nz, 0],
      [a[0] + nx, a[1] + nz, 0],
      [w[0] + nx, w[1] + nz, 1],
      [w[0] - nx, w[1] - nz, 1],
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      sPos.push(q[k][0], y, q[k][1]);
      sT.push(q[k][2]);
      sLen.push(L);
    }
  });
  const sightGeo = own(new BufferGeometry());
  sightGeo.setAttribute('position', new Float32BufferAttribute(sPos, 3));
  sightGeo.setAttribute('aT', new Float32BufferAttribute(sT, 1));
  sightGeo.setAttribute('aLen', new Float32BufferAttribute(sLen, 1));
  const sightMat = own(
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: C.cut.clone() } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: `
attribute float aT;
attribute float aLen;
varying float vD;
void main() {
  vD = aT * aLen;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying float vD;
void main() {
  float d = fract((vD - uTime * 6.0) / 5.0);
  float dash = step(0.45, d);
  gl_FragColor = vec4(uColor, uOpacity * dash);
  #include <colorspace_fragment>
}`,
    }),
  );
  const sight = new Mesh(sightGeo, sightMat);
  sight.visible = false;
  sight.renderOrder = 5;
  scene.add(sight);

  /* ---------- State ---------- */

  const kindIndex = (k: D.Kind) => {
    const idx = D.BUILDINGS.map((b, i) => (b.kind === k ? i : -1)).filter((i) => i >= 0);
    return [Math.min(...idx), Math.max(...idx)] as [number, number];
  };

  let stageTarget = 0;
  let stage = 0;
  let ideaTarget = 0;
  let idea = 0;
  let hoverBlock = -1;
  let pinned: [number, number] | null = null;
  let hoverMix = 0;
  let dragAz = 0;
  let dragEl = 0;
  let lastTime = 0;
  let lastRender = -1;
  let dirty = true;
  let width = 1;
  let height = 1;
  let pointer: { x: number; y: number } | null = null;
  let needsPick = false;
  const sunV = new Vector3();
  const lime = new Color(TINT.lime);
  const ink = new Color(0x3a3530);

  const apply = (time: number) => {
    const s = stage;
    const I = idea;

    // Buildings settle by zone: public first, then the residential rows, then villas.
    D.BUILDINGS.forEach((b, i) => {
      const start = PUBLIC.includes(b.kind) ? 0.55 : b.kind === 'villa' ? 1.75 : 1.4;
      const jitter = (i % 7) * 0.035;
      const t = Math.max(clamp01((s - start - jitter) / 0.35), I);
      lift[i] = t <= 0 ? HIDDEN : (1 - t) ** 2 * 18;
    });
    gu.uGrow.value = lerp(1, 0.14, smooth(I, 0, 1));
    // Massing first (lime), real materials from stage 3; idea tints them dark.
    const massing = 1 - smooth(s, 2.55, 3.15);
    if (I > 0.01) {
      bu.uTint.value.copy(ink);
      bu.uTintMix.value = 0.9 * I;
    } else {
      bu.uTint.value.copy(lime);
      bu.uTintMix.value = 0.82 * massing;
    }
    edgeMat.opacity = lerp(lerp(0.9, 0.25, smooth(s, 2.6, 3.2)), 0.15, I);
    treeMat.opacity = Math.max(smooth(s, 2.7, 3.3), 0) * (1 - 0.6 * I);
    treeMesh.visible = treeMat.opacity > 0.01;
    treeMesh.castShadow = treeMat.opacity > 0.6;

    // Sun: morning by default; a sunrise sweep in stage 5.
    const rise = smooth(s, 4.4, 5.4);
    const back = smooth(s, 5.5, 6);
    const H = lerp(lerp(-50, -82, rise), -50, back) + rise * (1 - back) * smooth(s, 5.0, 5.5) * 40;
    sunVector(I > 0 ? -45 : H, sunV);
    sun.position.copy(sunV).multiplyScalar(700);

    sight.visible = I > 0.01;
    (sightMat.uniforms.uOpacity as { value: number }).value = 0.9 * I;
    (sightMat.uniforms.uTime as { value: number }).value = opts.still ? 0 : time / 1000;

    // Hover.
    const range = pinned ?? (hoverBlock >= 0 ? ([hoverBlock, hoverBlock] as [number, number]) : null);
    if (range) {
      bu.uHover.value = range[0];
      bu.uHoverTo.value = range[1];
    }
    hoverMix += ((range ? 1 : 0) - hoverMix) * 0.25;
    if (!range && hoverMix < 0.01) bu.uHover.value = -1;
    bu.uHoverMix.value = hoverMix;

    // Camera.
    let k = camAt(s);
    if (I > 0) k = mixKey(k, IDEA_KEY, smooth(I, 0, 1));
    if (opts.debugView) k = opts.debugView;
    const drift = opts.still || opts.debugView ? 0 : Math.sin(time / 9000) * 5;
    const fit = opts.debugView ? 1 : Math.max(1, Math.pow(1.55 / (width / height), 0.85));
    const azR = (k.az + drift + dragAz) * DEG;
    const elR = (opts.debugView ? k.el : Math.max(3, Math.min(85, k.el + dragEl))) * DEG;
    const dist = k.dist * fit;
    camera.position.set(
      k.t[0] + Math.sin(azR) * Math.cos(elR) * dist,
      k.t[1] + Math.sin(elR) * dist,
      k.t[2] - Math.cos(azR) * Math.cos(elR) * dist,
    );
    camera.lookAt(k.t[0], k.t[1], k.t[2]);
  };

  /* ---------- Hover ---------- */

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let handle: SiteModelHandle;
  const setHover = (b: number) => {
    if (b !== hoverBlock) {
      hoverBlock = b;
      dirty = true;
      canvas.style.cursor = b >= 0 ? 'help' : '';
    }
    if (b < 0 || !pointer) return handle.onHover?.(null);
    const info = D.KIND_INFO[D.BUILDINGS[b].kind];
    const out: Omit<HoverInfo, 'x' | 'y'> = { id: D.BUILDINGS[b].kind, name: info.name, levels: info.meta, storeys: '' };
    handle.onHover?.({ ...out, x: pointer.x, y: pointer.y });
  };
  const pick = () => {
    needsPick = false;
    if (!pointer || stage < 2.2 || idea > 0.3) return setHover(-1);
    ndc.set((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(buildings, false)[0];
    if (!hit?.face) return setHover(-1);
    setHover(Math.round(buildGeo.getAttribute('aBlock').getX(hit.face.a)));
  };

  let drag: { x: number; y: number; az: number; el: number } | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, az: dragAz, el: dragEl };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    needsPick = true;
    if (drag) {
      dragAz = Math.max(-80, Math.min(80, drag.az - (e.clientX - drag.x) * 0.25));
      dragEl = Math.max(-10, Math.min(30, drag.el + (e.clientY - drag.y) * 0.12));
      dirty = true;
    }
  };
  const onUp = (e: PointerEvent) => {
    if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      needsPick = true;
    }
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  const onLeave = () => {
    pointer = null;
    setHover(-1);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.style.touchAction = 'pan-y';

  const STAGE_MAX = D.STAGES.length - 1;
  handle = {
    onHover: null,
    setProgress(p) {
      stageTarget = clamp01(p) * STAGE_MAX;
      if (opts.still) stage = stageTarget;
      dirty = true;
    },
    setMode(m) {
      ideaTarget = m === 'idea' ? 1 : 0;
      if (opts.still) idea = ideaTarget;
      dirty = true;
    },
    highlight(id) {
      pinned = id && D.BUILDINGS.some((b) => b.kind === id) ? kindIndex(id as D.Kind) : null;
      dirty = true;
    },
    debugInfo() {
      const i = renderer.info;
      return {
        calls: i.render.calls,
        triangles: i.render.triangles,
        lines: i.render.lines,
        geometries: i.memory.geometries,
        textures: i.memory.textures,
        programs: i.programs?.length ?? 0,
      };
    },
    frame(time) {
      const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 0;
      lastTime = time;
      let moving = false;
      if (Math.abs(stageTarget - stage) > 1e-4) {
        stage += (stageTarget - stage) * (1 - Math.exp(-dt * 5));
        moving = true;
      } else stage = stageTarget;
      if (Math.abs(ideaTarget - idea) > 1e-4) {
        idea += Math.sign(ideaTarget - idea) * Math.min(Math.abs(ideaTarget - idea), dt / 1.4);
        moving = true;
      }
      if (needsPick) pick();
      if (hoverMix > 0.005 && hoverMix < 0.995) moving = true;
      const animated = (!opts.still && !opts.debugView) || (idea > 0 && !opts.still);
      const due = time - lastRender > (moving || dirty ? 0 : 33);
      if (!(dirty || moving || animated) || !due) return;
      apply(time);
      renderer.render(scene, camera);
      lastRender = time;
      dirty = false;
    },
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      rig.resize(width, height);
      dirty = true;
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      treeMesh.dispose();
      owned.forEach((o) => o.dispose());
      rig.dispose();
    },
  };
  return handle;
}

