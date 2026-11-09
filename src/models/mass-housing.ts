/**
 * Mass Housing, Byculla: procedural site model (PLAN.md §5, Model 3).
 *
 * Parameters: ./mass-housing.data.ts. Readings and assumptions: MODEL_NOTES.md §3.
 *
 * Towers and podiums are one merged mesh. Every vertex carries its block
 * (aBlock) and the level it grows from (aBase), so a shared uniform array can
 * raise each building out of its podium on scroll. Floors, balcony bands,
 * refuge floors and podium louvres are drawn in the fragment shader from
 * world height, so 40-storey facades cost no extra geometry.
 *
 * The story scrubs Shankar's own design progression: one podium with eight
 * towers, the podium split, then the final layout.
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
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Quaternion,
  Raycaster,
  RGBADepthPacking,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRig, TINT } from '../three/rig';
import { offsetPoly, pointInPoly, polySDF, prism, rect, toWorld, type V2 } from './kit/geometry';
import { createBlockUniforms, patchBlocks } from './kit/patch';
import * as D from './mass-housing.data';
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

/** Sun azimuth (from north, clockwise) and elevation; Mumbai, 19° N. */
function solar(hourDeg: number, declDeg = 0, latDeg = 19): [number, number] {
  const phi = latDeg * DEG;
  const dec = declDeg * DEG;
  const H = hourDeg * DEG;
  const sinEl = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const el = Math.asin(sinEl);
  const cosAz = (Math.sin(dec) - sinEl * Math.sin(phi)) / (Math.cos(el) * Math.cos(phi));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG;
  if (hourDeg > 0) az = 360 - az;
  return [az, el / DEG];
}

const COL = {
  tower: new Color(0xd9b98c),
  podium: new Color(0xe9e0d0),
  core: new Color(0xc9ab80),
  green: new Color(TINT.court),
  podiumLawn: new Color(0x9aa383),
  water: new Color(0x8ea3a3),
  paving: new Color(0xe4d9c6),
  clay: new Color(0xb98a68),
  canopy: new Color(0xf4efe6),
  ink: new Color(TINT.charcoal),
  cut: new Color(TINT.terracotta),
  context: new Color(0xeee8dc),
  tree: new Color(0x86906a),
};

/* Block ids: 0–5 wings A–F, 6 north podium, 7 south podium, 8 landscape. */
const N_WINGS = D.WINGS.length;
const NORTH = N_WINGS;
const SOUTH = N_WINGS + 1;
const LAND = N_WINGS + 2;
const N_BLOCKS = N_WINGS + 3;

/* ---------- Geometry ---------- */

function partPoly(p: D.Part): V2[][] {
  const [cx, cz] = D.px(p.c);
  const f = { x: cx, z: cz, rot: p.rotDeg * DEG };
  const w = p.w / 2;
  const d = p.d / 2;
  const toW = (pts: V2[]) => pts.map(([x, z]) => toWorld(f, x, z));
  if (!p.h) return [toW(rect(-w, -d, w, d))];
  // H-plan: two bars of a third of the depth each, a core between them.
  const bar = p.d * 0.36;
  return [
    toW(rect(-w, -d, w, -d + bar)),
    toW(rect(-w, d - bar, w, d)),
    toW(rect(-w * 0.32, -d + bar - 0.5, w * 0.32, d - bar + 0.5)),
  ];
}

function attrs(g: BufferGeometry, block: number, base: number, color: Color): BufferGeometry {
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(n).fill(block), 1));
  g.setAttribute('aBase', new Float32BufferAttribute(new Float32Array(n).fill(base), 1));
  return g;
}

function clean(g: BufferGeometry): BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  if (n !== g) g.dispose();
  return n;
}

function merge(list: BufferGeometry[]): BufferGeometry {
  const m = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  if (!m) throw new Error('merge failed');
  return m;
}

/** Towers and podiums: solid, edges and per-block footprints. */
function buildBuildings() {
  const solids: BufferGeometry[] = [];
  const footprints: V2[][] = [];
  D.WINGS.forEach((w, bi) => {
    for (const part of w.parts) {
      for (const poly of partPoly(part)) {
        solids.push(attrs(prism(poly, D.PODIUM_TOP, w.terrace), bi, D.PODIUM_TOP, COL.tower));
        footprints.push(poly);
      }
    }
    // Machine room / tank on the core of the first part.
    const [cx, cz] = D.px(w.parts[0].c);
    const core = clean(new BoxGeometry(7, w.top - w.terrace, 7));
    core.rotateY(w.parts[0].rotDeg * DEG);
    core.translate(cx, (w.top + w.terrace) / 2, cz);
    solids.push(attrs(core, bi, D.PODIUM_TOP, COL.core));
  });
  for (const [poly, id] of [
    [D.NORTH_PODIUM, NORTH],
    [D.SOUTH_PODIUM, SOUTH],
  ] as const) {
    solids.push(attrs(prism(poly, 0, D.PODIUM_TOP), id, 0, COL.podium));
    footprints.push(poly);
  }
  const g = merge(solids);
  const e = new EdgesGeometry(g, 25);
  // Edges need block and base too: look each vertex up by its nearest building.
  const ep = e.getAttribute('position');
  const eBlock = new Float32Array(ep.count);
  const eBase = new Float32Array(ep.count);
  const blocks = g.getAttribute('aBlock');
  const pos = g.getAttribute('position');
  const key = (x: number, y: number, z: number) => `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
  const lookup = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) lookup.set(key(pos.getX(i), pos.getY(i), pos.getZ(i)), blocks.getX(i));
  for (let i = 0; i < ep.count; i++) {
    const b = lookup.get(key(ep.getX(i), ep.getY(i), ep.getZ(i))) ?? LAND;
    eBlock[i] = b;
    eBase[i] = b < N_WINGS ? D.PODIUM_TOP : 0;
  }
  e.setAttribute('aBlock', new Float32BufferAttribute(eBlock, 1));
  e.setAttribute('aBase', new Float32BufferAttribute(eBase, 1));
  return { solid: g, edges: e, footprints };
}

/** Central green: pond, amphitheatre, octagon canopy, courts, pool and podium lawns. */
function buildLandscape(): BufferGeometry {
  const list: BufferGeometry[] = [];
  const add = (g: BufferGeometry, c: Color) => list.push(attrs(clean(g), LAND, 0, c));
  // Pond: a lens, as drawn.
  const lens: V2[] = [];
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    lens.push([D.POND.c[0] + (D.POND.len / 2) * Math.cos(t), D.POND.c[1] + (D.POND.wid / 2) * Math.sin(t) * Math.abs(Math.sin(t)) ** 0.2]);
  }
  add(prism(offsetPoly(lens, 1.2), 0, 0.25), COL.paving);
  add(prism(lens, 0, 0.3), COL.water);
  // Amphitheatre: stepped rings round a sunken floor.
  const A = D.AMPHITHEATRE;
  const ring = (r0: number, r1: number) => {
    const outer: V2[] = [];
    const inner: V2[] = [];
    for (let i = 0; i < 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      outer.push([A.c[0] + r1 * Math.cos(t), A.c[1] + r1 * Math.sin(t)]);
      inner.push([A.c[0] + r0 * Math.cos(t), A.c[1] + r0 * Math.sin(t)]);
    }
    return { outer, inner };
  };
  for (let k = 0; k < A.rings; k++) {
    const { outer, inner } = ring(A.r * 0.45 + k * 1.1, A.r * 0.45 + (k + 1) * 1.1);
    add(prism(outer, 0, 0.12 + k * 0.35, [inner]), COL.paving);
  }
  // Multipurpose octagon with a tent roof (drawn as a tent on the roof plan).
  const O = D.OCTAGON;
  const r = O.apothem / Math.cos(Math.PI / 8);
  const oct = new CylinderGeometry(r * 0.94, r * 0.94, O.wall, 8);
  oct.rotateY(Math.PI / 8);
  oct.translate(O.c[0], O.wall / 2, O.c[1]);
  add(oct, COL.podium);
  const tent = new CylinderGeometry(0, r * 1.08, O.apex - O.wall, 8, 1);
  tent.rotateY(Math.PI / 8);
  tent.translate(O.c[0], O.wall + (O.apex - O.wall) / 2, O.c[1]);
  add(tent, COL.canopy);
  // Courts.
  for (const c of D.COURTS) add(prism(rect(...c.rect), 0, 0.18), c.kind === 'turf' ? COL.green : COL.clay);
  // Pool on the south podium top.
  const [px0, pz0, px1, pz1] = D.POOL.rect;
  add(prism(rect(px0 - D.POOL.deck, pz0 - D.POOL.deck, px1 + D.POOL.deck, pz1 + D.POOL.deck), D.PODIUM_TOP, D.PODIUM_TOP + 0.3), COL.paving);
  add(prism(rect(px0, pz0, px1, pz1), D.PODIUM_TOP, D.PODIUM_TOP + 0.4), COL.water);
  // Podium-top lawns, inset from the edge.
  for (const p of [D.NORTH_PODIUM, D.SOUTH_PODIUM]) add(prism(offsetPoly(p, -3), D.PODIUM_TOP, D.PODIUM_TOP + 0.2), COL.podiumLawn);
  return merge(list);
}

/* ---------- Site plan texture ---------- */

const BASE = { x0: -330, x1: 360, z0: -320, z1: 330, thickness: 14 };

function roadStrip(r: (typeof D.ROADS)[number], ext = 900): V2[] {
  const [ax, az] = r.a;
  const [bx, bz] = r.b;
  const L = Math.hypot(bx - ax, bz - az);
  const dx = (bx - ax) / L;
  const dz = (bz - az) / L;
  // Normal pointing to the road side.
  const nx = -dz * r.side;
  const nz = dx * r.side;
  const p0: V2 = [ax - dx * ext, az - dz * ext];
  const p1: V2 = [bx + dx * ext, bz + dz * ext];
  return [p0, p1, [p1[0] + nx * r.width, p1[1] + nz * r.width], [p0[0] + nx * r.width, p0[1] + nz * r.width]];
}

function sitePlan(): CanvasTexture {
  const W = BASE.x1 - BASE.x0;
  const Dm = BASE.z1 - BASE.z0;
  const cw = 2048;
  const ch = Math.round((cw * Dm) / W);
  const k = cw / W;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d')!;
  const path = (pts: V2[]) => {
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo((x - BASE.x0) * k, (z - BASE.z0) * k) : g.moveTo((x - BASE.x0) * k, (z - BASE.z0) * k)));
    g.closePath();
  };
  g.fillStyle = '#ebe4d6';
  g.fillRect(0, 0, cw, ch);
  path(D.SITE);
  g.fillStyle = '#a3aa8c';
  g.fill();
  // 9 m driveway ring round each podium (p4 ground floor plan).
  g.lineJoin = 'round';
  for (const p of [D.NORTH_PODIUM, D.SOUTH_PODIUM]) {
    path(p);
    g.strokeStyle = '#ddd4c4';
    g.lineWidth = 18 * k;
    g.stroke();
  }
  for (const r of D.ROADS) {
    path(roadStrip(r));
    g.fillStyle = '#bdb3a3';
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Material patches ---------- */

interface GrowUniforms {
  uGrow: { value: Float32Array };
  uBand: { value: number };
}

/**
 * Grow each block up from its base, and (for colour) draw floors, balcony
 * bands, refuge floors and podium louvres from world height. Apply before
 * patchBlocks so its lift and highlight wrap around this.
 */
function patchMass(m: Material, u: GrowUniforms, color: boolean): void {
  const n = u.uGrow.value.length;
  const f = (x: number) => x.toFixed(3);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aBase;
uniform float uGrow[${n}];
varying float vWy;
varying float vUp;
varying float vBase;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float gr = uGrow[int(aBlock + 0.5)];
transformed.y = aBase + (transformed.y - aBase) * gr;
vWy = transformed.y;
vUp = abs(normal.y);
vBase = aBase;`,
      );
    if (!color) return;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uBand;
varying float vWy;
varying float vUp;
varying float vBase;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float side = 1.0 - step(0.5, vUp);
  float shade = 1.0;
  if (vBase > 10.0) {
    if (vWy > ${f(D.FIRST_FLOOR)}) {
      float n = (vWy - ${f(D.FIRST_FLOOR)}) / ${f(D.FLOOR_H)};
      float fl = floor(n) + 1.0;
      float fr = fract(n);
      float aa = 1.0 - smoothstep(0.25, 0.7, fwidth(n));
      float band = fr < 0.2 ? 1.1 : (fr > 0.32 ? 0.82 : 0.96);
      float refuge = (fl >= 8.0 && mod(fl, 7.0) < 0.5) ? 1.0 : 0.0;
      band = mix(band, 0.66 + 0.44 * step(fr, 0.2), refuge);
      shade = mix(0.9, band, aa);
    } else shade = 0.62;
  } else {
    if (vWy < ${f(D.GROUND_H)}) shade = 0.6;
    else {
      float n = (vWy - ${f(D.GROUND_H)}) / ${f(D.PODIUM_LEVEL_H)};
      float fr = fract(n);
      float aa = 1.0 - smoothstep(0.25, 0.7, fwidth(n));
      shade = mix(0.92, fr < 0.55 ? 1.04 : 0.8, aa);
    }
  }
  diffuseColor.rgb *= mix(1.0, shade, side * uBand);
}`,
      );
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => prevKey() + `mass:${color ? 1 : 0}`;
}

/* ---------- Camera ---------- */

const KEYS: CamKey[] = [
  { az: 205, el: 52, dist: 720, t: [20, 10, 8] },
  { az: 214, el: 40, dist: 560, t: [12, 40, 6] },
  { az: 228, el: 38, dist: 560, t: [12, 40, 6] },
  { az: 212, el: 26, dist: 560, t: [12, 60, 6] },
  { az: 196, el: 12, dist: 440, t: [-4, 62, 22] },
  { az: 168, el: 56, dist: 560, t: [16, 10, 8] },
  { az: 226, el: 30, dist: 590, t: [16, 52, 6] },
];
const IDEA_KEY: CamKey = { az: 112, el: 46, dist: 500, t: [6, 12, -8] };

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

export async function createMassHousing(canvas: HTMLCanvasElement, opts: ModelOptions = {}): Promise<SiteModelHandle> {
  const rig = createRig(canvas);
  const { renderer, scene, camera, sun } = rig;
  const coarse = matchMedia('(pointer: coarse)').matches;
  camera.near = 3;
  camera.far = 5000;
  if (opts.debugView?.fov) {
    camera.fov = opts.debugView.fov;
    if (camera.fov < 10) {
      camera.near = 200;
      camera.far = 60000;
    }
  }
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -230;
  sc.right = sc.top = 230;
  sc.near = 50;
  sc.far = 1600;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.6;

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => (owned.push(x), x);

  const bu = createBlockUniforms(N_BLOCKS);
  const gu: GrowUniforms = { uGrow: { value: new Float32Array(N_BLOCKS).fill(1) }, uBand: { value: 1 } };
  const grow = gu.uGrow.value;

  /* Buildings */
  const B = buildBuildings();
  own(B.solid);
  own(B.edges);
  const buildMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, transparent: true }));
  patchMass(buildMat, gu, true);
  patchBlocks(buildMat, bu, { color: true, tint: true, hoverStrength: 0.55, hoverColor: new Color(0xfff3dc) });
  const depthMat = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
  patchMass(depthMat, gu, false);
  patchBlocks(depthMat, bu);
  const buildings = new Mesh(B.solid, buildMat);
  buildings.customDepthMaterial = depthMat;
  buildings.castShadow = buildings.receiveShadow = true;
  buildings.frustumCulled = false;
  scene.add(buildings);

  const edgeMat = own(new LineBasicMaterial({ color: COL.ink, transparent: true }));
  patchMass(edgeMat, gu, false);
  patchBlocks(edgeMat, bu, { color: true, hoverColor: COL.cut });
  const edges = new LineSegments(B.edges, edgeMat);
  edges.frustumCulled = false;
  scene.add(edges);

  /* Landscape */
  const landGeo = own(buildLandscape());
  const landMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true }));
  patchBlocks(landMat, bu, { color: true });
  const land = new Mesh(landGeo, landMat);
  land.receiveShadow = true;
  land.castShadow = true;
  scene.add(land);

  /* Trees on the green, avoiding podiums, pond, courts and roads */
  const rand = rng(2273);
  const keepOut = [...B.footprints, D.SOUTH_PODIUM, D.NORTH_PODIUM].map((p) => offsetPoly(p, 9));
  const trees: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < 4000 && trees.length < (coarse ? 70 : 110); i++) {
    const x = lerp(-90, 140, rand());
    const z = lerp(-70, 90, rand());
    if (polySDF(x, z, D.SITE) > -4) continue;
    if (keepOut.some((p) => pointInPoly(x, z, p))) continue;
    if (Math.hypot(x - D.POND.c[0], z - D.POND.c[1]) < 19) continue;
    if (Math.hypot(x - D.OCTAGON.c[0], z - D.OCTAGON.c[1]) < 14) continue;
    if (Math.hypot(x, z) < 12) continue;
    if (D.COURTS.some((c) => x > c.rect[0] - 2 && x < c.rect[2] + 2 && z > c.rect[1] - 2 && z < c.rect[3] + 2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 6)) continue;
    trees.push({ x, z, s: 2 + rand() * 1.4 });
  }
  const treeGeo = own(new IcosahedronGeometry(1, 0));
  const treeMat = own(new MeshStandardMaterial({ color: COL.tree, roughness: 1, flatShading: true, transparent: true }));
  const treeMesh = new InstancedMesh(treeGeo, treeMat, trees.length);
  trees.forEach((t, i) =>
    treeMesh.setMatrixAt(i, new Matrix4().compose(new Vector3(t.x, t.s * 1.6, t.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), i), new Vector3(t.s, t.s * 1.25, t.s))),
  );
  treeMesh.castShadow = true;
  scene.add(treeMesh);

  /* Byculla context: seeded blocks off the roads and the site */
  const roadPolys = D.ROADS.map((r) => offsetPoly(roadStrip(r), 4));
  const siteGuard = offsetPoly(D.SITE, 12);
  const blocks: Matrix4[] = [];
  const crand = rng(1032);
  for (let gx = BASE.x0 + 16; gx < BASE.x1 - 16; gx += 30) {
    for (let gz = BASE.z0 + 16; gz < BASE.z1 - 16; gz += 30) {
      const x = gx + (crand() - 0.5) * 8;
      const z = gz + (crand() - 0.5) * 8;
      if (pointInPoly(x, z, siteGuard) || roadPolys.some((p) => pointInPoly(x, z, p))) {
        crand();
        crand();
        continue;
      }
      const w = 12 + crand() * 12;
      // Near the site, keep the context low so it never blocks the story's views.
      const near = Math.max(0, polySDF(x, z, D.SITE));
      const tall = crand() < 0.07 && near > 150;
      const cap = near < 120 ? 8 + near * 0.12 : 28;
      const h = tall ? 45 + crand() * 60 : 6 + crand() * Math.min(22, cap);
      const fade = Math.min(1, (Math.min(x - BASE.x0, BASE.x1 - x, z - BASE.z0, BASE.z1 - z) - 10) / 50);
      const hh = h * Math.max(0.35, fade);
      blocks.push(new Matrix4().compose(new Vector3(x, hh / 2, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (crand() - 0.5) * 0.3), new Vector3(w, hh, w * (0.7 + crand() * 0.5))));
    }
  }
  const ctxGeo = own(new BoxGeometry(1, 1, 1));
  const ctxMat = own(new MeshStandardMaterial({ color: COL.context, roughness: 1, transparent: true }));
  const ctx = new InstancedMesh(ctxGeo, ctxMat, blocks.length);
  blocks.forEach((m, i) => ctx.setMatrixAt(i, m));
  ctx.castShadow = true;
  ctx.receiveShadow = true;
  ctx.renderOrder = -1;
  scene.add(ctx);

  /* Base board with the site plan, translucent in idea mode to show basements */
  const planTex = own(sitePlan());
  const sideMat = own(new MeshStandardMaterial({ color: 0xd9cdb8, roughness: 1, transparent: true }));
  const topMat = own(new MeshStandardMaterial({ map: planTex, roughness: 1, transparent: true }));
  const baseGeo = own(new BoxGeometry(BASE.x1 - BASE.x0, BASE.thickness, BASE.z1 - BASE.z0));
  const base = new Mesh(baseGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  base.position.set((BASE.x0 + BASE.x1) / 2, -BASE.thickness / 2, (BASE.z0 + BASE.z1) / 2);
  base.receiveShadow = true;
  base.renderOrder = -2; // drawn first: everything translucent sits on top of it
  scene.add(base);

  /* Design progression ghosts (p3 diagrams) */
  const ghostMat = (opacity: number) => own(new MeshStandardMaterial({ color: COL.tower, roughness: 0.9, transparent: true, opacity, depthWrite: false }));
  const ghostLine = own(new LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0 }));
  const plusTower = (x: number, z: number): BufferGeometry[] => {
    const s = D.GHOST.size / 2;
    const t = s * 0.42;
    return [prism(rect(x - s, z - t, x + s, z + t), D.PODIUM_TOP, D.GHOST.height), prism(rect(x - t, z - s, x + t, z + s), D.PODIUM_TOP, D.GHOST.height)];
  };
  const ghost = (podiums: V2[][], towers: V2[]) => {
    const geo = own(merge([...podiums.map((p) => prism(p, 0, D.PODIUM_TOP)), ...towers.flatMap(([x, z]) => plusTower(x, z))]));
    const mat = ghostMat(0);
    const mesh = new Mesh(geo, mat);
    const line = new LineSegments(own(new EdgesGeometry(geo, 25)), ghostLine.clone());
    owned.push(line.material as Material);
    mesh.renderOrder = 3;
    line.renderOrder = 4;
    scene.add(mesh, line);
    return { mesh, mat, line, lineMat: line.material as LineBasicMaterial };
  };
  const g1 = ghost([D.STAGE1.podium], D.STAGE1.towers);
  const g2 = ghost([D.NORTH_PODIUM, D.SOUTH_PODIUM], D.STAGE2.towers);

  /* Idea layer: podium slabs, footprint outlines, wind */
  const slabGeo = own(
    merge([
      ...[D.NORTH_PODIUM, D.SOUTH_PODIUM].map((p) => prism(p, 0, 0.45)),
    ]),
  );
  const levels: number[] = [
    ...Array.from({ length: D.BASEMENTS }, (_, i) => -(i + 1) * D.BASEMENT_H),
    0,
    ...Array.from({ length: D.PODIUM_LEVELS }, (_, i) => D.GROUND_H + i * D.PODIUM_LEVEL_H),
    D.PODIUM_TOP,
  ];
  const slabMat = own(new MeshStandardMaterial({ color: 0xc9ae84, roughness: 0.9, transparent: true, opacity: 0 }));
  const slabs = new InstancedMesh(slabGeo, slabMat, levels.length);
  slabs.visible = false;
  scene.add(slabs);
  const slabM = new Matrix4();
  const setSlabs = (explode: number) => {
    levels.forEach((y, i) => {
      const idx = i - D.BASEMENTS;
      slabM.makeTranslation(0, y + idx * explode, 0);
      slabs.setMatrixAt(i, slabM);
    });
    slabs.instanceMatrix.needsUpdate = true;
  };

  const footPos: number[] = [];
  for (const p of B.footprints) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      footPos.push(a[0], 0.6, a[1], b[0], 0.6, b[1]);
    }
  }
  const footGeo = own(new BufferGeometry());
  footGeo.setAttribute('position', new Float32BufferAttribute(footPos, 3));
  const footMat = own(new LineBasicMaterial({ color: COL.cut, transparent: true, opacity: 0 }));
  const foot = new LineSegments(footGeo, footMat);
  foot.visible = false;
  scene.add(foot);

  const windGeo = (() => {
    const arrow = (off: number) => {
      const s = new Shape();
      const L = 64;
      const w = 1.8;
      const head = 10;
      s.moveTo(-L / 2, -w / 2 + off);
      s.lineTo(L / 2 - head, -w / 2 + off);
      s.lineTo(L / 2 - head, -w * 3 + off);
      s.lineTo(L / 2, off);
      s.lineTo(L / 2 - head, w * 3 + off);
      s.lineTo(L / 2 - head, w / 2 + off);
      s.lineTo(-L / 2, w / 2 + off);
      return s;
    };
    const g = new ShapeGeometry([arrow(-12), arrow(0), arrow(12)]);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 4);
    return own(g);
  })();
  const windMat = own(new MeshBasicMaterial({ color: COL.ink, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }));
  const wind = new Mesh(windGeo, windMat);
  wind.visible = false;
  scene.add(wind);

  /* ---------- State ---------- */

  let stageTarget = 0;
  let stage = 0;
  let ideaTarget = 0;
  let idea = 0;
  let hoverBlock = -1;
  let pinned = -1;
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

  const apply = (time: number) => {
    const s = stage;
    const I = idea;

    // Ghost stages 1 and 2.
    const o1 = smooth(s, 0.5, 1) * (1 - smooth(s, 1.5, 1.9));
    const o2 = smooth(s, 1.5, 1.9) * (1 - smooth(s, 2.5, 2.9));
    for (const [g, o] of [
      [g1, o1],
      [g2, o2],
    ] as const) {
      g.mat.opacity = 0.8 * o * (1 - I);
      g.lineMat.opacity = o * (1 - I);
      g.mesh.visible = g.line.visible = o * (1 - I) > 0.01;
    }

    // Final massing grows out of the podiums (stage 2.5 → 3.2).
    const podGrow = Math.max(smooth(s, 2.4, 2.75), I);
    grow[NORTH] = grow[SOUTH] = Math.max(podGrow, 0.001);
    D.WINGS.forEach((_, i) => {
      const start = 2.6 + i * 0.07;
      grow[i] = Math.max(smooth(s, start, start + 0.45), I, 0.001);
    });
    const shown = Math.max(smooth(s, 2.4, 2.6), I);
    buildings.visible = edges.visible = shown > 0.01;
    buildMat.opacity = shown * (1 - 0.82 * I);
    buildMat.depthWrite = buildMat.opacity > 0.9;
    buildings.castShadow = buildMat.opacity > 0.6;
    edgeMat.opacity = lerp(lerp(1, 0.25, smooth(s, 3.2, 3.9)), 0.4, I);
    gu.uBand.value = smooth(s, 3.3, 3.9) * (1 - I);

    const landO = Math.max(smooth(s, 3.3, 3.9), 0) * (1 - 0.5 * I);
    landMat.opacity = landO;
    land.visible = landO > 0.01;
    treeMat.opacity = landO;
    treeMesh.visible = landO > 0.01;

    // Context fades back in idea mode; the board turns translucent for the basements.
    ctxMat.opacity = 1 - 0.85 * I;
    ctxMat.depthWrite = I < 0.5;
    ctx.castShadow = I < 0.3;
    topMat.opacity = sideMat.opacity = 1 - 0.45 * I;
    topMat.depthWrite = sideMat.depthWrite = I < 0.5;

    // Sun: morning; sweeps across in stage 5; returns for the wings.
    const sweep = smooth(s, 4.4, 5.6);
    const back = smooth(s, 5.5, 6);
    const H = lerp(lerp(-45, 72, sweep), -40, back);
    const [az, el] = solar(I > 0 ? lerp(H, -40, I) : H);
    rig.setSun(az, el, 800);

    // Idea layer.
    slabs.visible = I > 0.01;
    slabMat.opacity = I;
    slabMat.depthWrite = I > 0.9;
    setSlabs(2.4 * smooth(I, 0.2, 1));
    foot.visible = I > 0.01;
    footMat.opacity = I;
    wind.visible = I > 0.01;
    windMat.opacity = 0.6 * I;
    const drift = opts.still ? 0 : ((time / 160) % 20) - 10;
    // Low over the central ground, crossing the gap between the podiums.
    wind.position.set(4 + drift * 0.7, 3, -12 - drift * 0.7);

    // Hover.
    const target = pinned >= 0 ? pinned : hoverBlock;
    if (target >= 0) bu.uHover.value = target;
    hoverMix += ((target >= 0 ? 1 : 0) - hoverMix) * 0.25;
    if (target < 0 && hoverMix < 0.01) bu.uHover.value = -1;
    bu.uHoverMix.value = hoverMix;
    bu.uTintMix.value = 0;

    // Camera.
    let k = camAt(s);
    if (I > 0) k = mixKey(k, IDEA_KEY, smooth(I, 0, 1));
    if (opts.debugView) k = opts.debugView;
    const driftAz = opts.still || opts.debugView ? 0 : Math.sin(time / 9000) * 5;
    const fit = opts.debugView ? 1 : Math.max(1, Math.pow(1.55 / (width / height), 0.85));
    const azR = (k.az + driftAz + dragAz) * DEG;
    const elR = (opts.debugView ? k.el : Math.max(2, Math.min(85, k.el + dragEl))) * DEG;
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
  const describe = (b: number): Omit<HoverInfo, 'x' | 'y'> => {
    if (b < N_WINGS) {
      const w = D.WINGS[b];
      return { id: w.id, name: w.name, levels: `${w.units}`, storeys: `Podium + ${w.floors} floors, terrace +${w.terrace.toFixed(2)} m` };
    }
    const north = b === NORTH;
    return {
      id: north ? 'north' : 'south',
      name: north ? 'North podium' : 'South podium',
      levels: 'Retail at the street, 6 parking levels over 3 basements',
      storeys: `Podium top +${D.PODIUM_TOP} m${north ? '' : ', with the pool'}`,
    };
  };
  const setHover = (b: number) => {
    if (b !== hoverBlock) {
      hoverBlock = b;
      dirty = true;
      canvas.style.cursor = b >= 0 ? 'help' : '';
    }
    if (b < 0 || !pointer) return handle.onHover?.(null);
    handle.onHover?.({ ...describe(b), x: pointer.x, y: pointer.y });
  };
  const pick = () => {
    needsPick = false;
    if (!pointer || stage < 3 || idea > 0.3) return setHover(-1);
    ndc.set((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(buildings, false)[0];
    if (!hit?.face) return setHover(-1);
    setHover(Math.round(B.solid.getAttribute('aBlock').getX(hit.face.a)));
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
      dragEl = Math.max(-8, Math.min(30, drag.el + (e.clientY - drag.y) * 0.12));
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
      const i = D.ITEMS.findIndex((x) => x.id === id);
      pinned = i < 0 ? -1 : i;
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
      ctx.dispose();
      slabs.dispose();
      owned.forEach((o) => o.dispose());
      rig.dispose();
    },
  };
  return handle;
}
