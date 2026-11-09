/**
 * Irshalpada Rehabilitation: procedural neighbourhood model (PLAN.md §5, Model 2).
 *
 * Parameters: ./irshalpada.data.ts. Readings and assumptions: MODEL_NOTES.md §2.
 *
 * The two house types are built once from their traced plans (plinths, room
 * walls as hollow rings, hip roofs, posts, shutters, jali, courtyard trees)
 * and assembled into the p40 cluster. The cluster is then drawn eleven times
 * by instancing, one InstancedMesh per material, so 44 houses cost a handful
 * of draw calls and hovering returns the cluster number. The school and the
 * Temple of Memories are merged into the same materials as single meshes.
 *
 * Roofs live in their own meshes with their own lift uniforms, so the story
 * (and the idea model) can raise them to show the courtyard plans beneath.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RGBADepthPacking,
  RingGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  ShadowMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRig, TINT } from '../three/rig';
import { gableRoof, mirrorX, parapet, prism, rect, type V2 } from './kit/geometry';
import { createBlockUniforms, jaliTexture, patchBlocks, type BlockUniforms } from './kit/patch';
import * as D from './irshalpada.data';
import type { CamKey, HoverInfo, ModelOptions, SiteModelHandle } from './types';

const DEG = Math.PI / 180;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const COL = {
  wall: new Color(0xf2ede3),
  plinth: new Color(0xcdbfa8),
  roof: new Color(0x8f5e48),
  timber: new Color(0x5a3a26),
  foliage: new Color(0x7f8a62),
  court: new Color(TINT.court),
  jali: new Color(TINT.terracotta),
  dark: new Color(0x2f2b27),
  water: new Color(0x8ea3a3),
  ink: new Color(TINT.charcoal),
  cut: new Color(TINT.terracotta),
  lime: new Color(TINT.lime),
  hill: new Color(0xe3dbca),
};

const N_CLUSTERS = D.CLUSTERS.length;
const SCHOOL_ID = N_CLUSTERS;
const TEMPLE_ID = N_CLUSTERS + 1;
const N_BLOCKS = N_CLUSTERS + 2;

/* ---------- Geometry helpers ---------- */

/** Keep only position and normal, non-indexed, so everything merges. */
function clean(g: BufferGeometry): BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  if (n !== g) g.dispose();
  return n;
}

function merge(list: BufferGeometry[]): BufferGeometry {
  if (!list.length) return new BufferGeometry();
  const m = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  if (!m) throw new Error('merge failed');
  return m;
}

function tagBlock(g: BufferGeometry, block: number): BufferGeometry {
  const n = g.getAttribute('position').count;
  g.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(n).fill(block), 1));
  return g;
}

/** A vertical box between two plan points (walls, shutters, rails). */
function beam(a: V2, b: V2, y0: number, y1: number, t: number, offset = 0): BufferGeometry {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new BoxGeometry(L, y1 - y0, t);
  const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  g.rotateY(ang);
  const nx = Math.sin(ang);
  const nz = Math.cos(ang);
  g.translate((a[0] + b[0]) / 2 + nx * offset, (y0 + y1) / 2, (a[1] + b[1]) / 2 + nz * offset);
  return clean(g);
}

interface Layers {
  walls: BufferGeometry[];
  plinth: BufferGeometry[];
  roofs: BufferGeometry[];
  timber: BufferGeometry[];
  foliage: BufferGeometry[];
  court: BufferGeometry[];
  dark: BufferGeometry[];
  water: BufferGeometry[];
  jali: BufferGeometry[];
}
const emptyLayers = (): Layers => ({ walls: [], plinth: [], roofs: [], timber: [], foliage: [], court: [], dark: [], water: [], jali: [] });

function tree(x: number, z: number, y: number, scale: number, L: Layers): void {
  const trunk = clean(new CylinderGeometry(0.14 * scale, 0.2 * scale, 3 * scale, 6));
  trunk.translate(x, y + 1.5 * scale, z);
  L.timber.push(trunk);
  const crown = clean(new IcosahedronGeometry(2.3 * scale, 0));
  crown.scale(1, 1.15, 1);
  crown.rotateY(x * 0.7 + z);
  crown.translate(x, y + 3.9 * scale, z);
  L.foliage.push(crown);
}

/** Jali quad with UVs (1 m texture repeat). */
function jaliQuad(a: V2, b: V2, y0: number, y1: number): BufferGeometry {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / L;
  const nz = (b[0] - a[0]) / L;
  const v = [
    [a[0], y0, a[1], 0, 0],
    [b[0], y0, b[1], L, 0],
    [b[0], y1, b[1], L, y1 - y0],
    [a[0], y1, a[1], 0, y1 - y0],
  ];
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  for (const i of [0, 1, 2, 0, 2, 3]) {
    pos.push(v[i][0], v[i][1], v[i][2]);
    uv.push(v[i][3] * 1.5, v[i][4] * 1.5);
    nor.push(nx, 0, nz);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

/* ---------- Houses and the cluster ---------- */

const inRect = (x: number, z: number, r: D.R4) => x > r[0] && x < r[2] && z > r[1] && z < r[3];

function buildHouse(h: D.HouseType): Layers {
  const L = emptyLayers();
  L.plinth.push(prism(h.plinth, 0, D.PLINTH));
  for (const s of h.slabs) L.plinth.push(prism(rect(...s.rect), s.y0, s.y1));
  for (const r of h.rooms) L.walls.push(parapet(rect(...r.rect), r.y0, r.y1, D.WALL_T));
  for (const r of h.roofs) {
    if (r.kind === 'gable') L.roofs.push(gableRoof(...r.rect, r.eave, r.ridge, r.axis));
    else {
      // Lean-to: a 0.2 m sloping slab, high edge opposite the side it falls to.
      const [x0, z0, x1, z1] = r.rect;
      const t = (x: number, z: number) =>
        r.falls === 'w' ? (x - x0) / (x1 - x0) : r.falls === 'e' ? (x1 - x) / (x1 - x0) : r.falls === 'n' ? (z - z0) / (z1 - z0) : (z1 - z) / (z1 - z0);
      const y = (x: number, z: number) => lerp(r.low, r.high, t(x, z));
      L.roofs.push(prism(rect(...r.rect), (x, z) => y(x, z) - 0.2, y));
    }
  }
  for (const [x, z] of h.posts) {
    const p = clean(new CylinderGeometry(0.12, 0.15, h.postTop - D.PLINTH, 8));
    p.translate(x, (h.postTop + D.PLINTH) / 2, z);
    L.timber.push(p);
  }
  for (const r of h.rails) {
    L.timber.push(beam(r.a, r.b, r.y + 0.85, r.y + 0.95, 0.08));
    L.timber.push(beam(r.a, r.b, r.y, r.y + 0.95, 0.03));
  }
  L.court.push(prism(rect(...h.courtyard), -0.2, 0.06));
  for (const [x, z] of h.trees) tree(x, z, 0.06, 1, L);
  for (const j of h.jali) L.jali.push(jaliQuad(j.a, j.b, j.y0, j.y1));

  // Timber shutters on the outside faces of rooms: one per 3.2 m of wall.
  for (const r of h.rooms) {
    if (r.y1 - r.y0 < 2.2) continue;
    const [x0, z0, x1, z1] = r.rect;
    const edges: [V2, V2, V2][] = [
      [[x0, z0], [x1, z0], [0, -1]],
      [[x1, z0], [x1, z1], [1, 0]],
      [[x1, z1], [x0, z1], [0, 1]],
      [[x0, z1], [x0, z0], [-1, 0]],
    ];
    for (const [a, b, n] of edges) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1.8) continue;
      const mx = (a[0] + b[0]) / 2 + n[0] * 0.4;
      const mz = (a[1] + b[1]) / 2 + n[1] * 0.4;
      const shared = h.rooms.some((o) => o !== r && o.y0 < r.y1 && o.y1 > r.y0 && inRect(mx, mz, o.rect));
      if (shared) continue;
      const count = Math.max(1, Math.floor(len / 3.2));
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count;
        const cx = a[0] + (b[0] - a[0]) * t;
        const cz = a[1] + (b[1] - a[1]) * t;
        const dx = (b[0] - a[0]) / len;
        const dz = (b[1] - a[1]) / len;
        const half = 0.55;
        L.timber.push(beam([cx - dx * half, cz - dz * half], [cx + dx * half, cz + dz * half], r.y0 + 0.9, r.y0 + 2.1, 0.08, 0.06));
      }
    }
  }
  return L;
}

/** Applies a house placement inside the cluster: rotate, translate, mirror. */
function placeLayers(src: Layers, at: V2, rotDeg: number, mirror: boolean, axis: number, out: Layers): void {
  for (const key of Object.keys(src) as (keyof Layers)[]) {
    for (const g of src[key]) {
      let c = g.clone();
      c.rotateY(rotDeg * DEG);
      c.translate(at[0], 0, at[1]);
      if (mirror) {
        const m = mirrorX(c, axis);
        c.dispose();
        c = m;
      }
      out[key].push(c);
    }
  }
}

function buildCluster(): Layers {
  const types = { g: buildHouse(D.HOUSE_G), g1: buildHouse(D.HOUSE_G1) };
  const L = emptyLayers();
  for (const h of D.CLUSTER.houses) placeLayers(types[h.type], h.at, h.rotDeg, h.mirror, D.CLUSTER.axis, L);
  for (const t of Object.values(types)) for (const list of Object.values(t)) (list as BufferGeometry[]).forEach((g) => g.dispose());
  for (const [a, b] of D.CLUSTER.walls) L.walls.push(beam(a, b, 0, 1.2, 0.25));
  L.court.push(prism(rect(...D.CLUSTER.court), -0.2, 0.04));
  for (const [x, z] of D.CLUSTER.trees) tree(x, z, 0, 0.9, L);
  // Centre the cluster on its own origin so instances rotate about the middle.
  const [cx, cz] = D.CLUSTER.center;
  for (const list of Object.values(L)) for (const g of list as BufferGeometry[]) g.translate(-cx, 0, -cz);
  return L;
}

/* ---------- School and temple ---------- */

function buildSchool(L: Layers): void {
  const S = D.SCHOOL;
  const [ox, oz] = S.at;
  const add = (list: BufferGeometry[], g: BufferGeometry) => list.push(g.translate(ox, 0, oz));
  const rects: { r: D.R4; eave: number; ridge: number }[] = [
    { r: S.main.rect, eave: S.main.eave, ridge: S.main.ridge },
    ...S.wings.flatMap((w) => [
      { r: w, eave: S.wingEave, ridge: S.wingRidge },
      { r: [-w[2], w[1], -w[0], w[3]] as D.R4, eave: S.wingEave, ridge: S.wingRidge },
    ]),
  ];
  for (const { r, eave, ridge } of rects) {
    const [x0, z0, x1, z1] = r;
    add(L.plinth, prism(rect(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3), 0, D.PLINTH));
    // Walls inset from the roof edge leave a verandah on the court side.
    const inset: D.R4 = [x0 + 0.6, z0 + 0.6, x1 - 0.6, z1 - 1.6];
    if (inset[3] - inset[1] > 1) add(L.walls, prism(rect(...inset), D.PLINTH, eave));
    add(L.roofs, gableRoof(x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, eave, ridge, 'z'));
    for (let x = x0 + 1; x <= x1 - 0.9; x += 2.8) {
      const p = clean(new CylinderGeometry(0.13, 0.16, eave - D.PLINTH, 8));
      p.translate(x, (eave + D.PLINTH) / 2, z1 - 0.6);
      add(L.timber, p);
    }
  }
  // Multipurpose area and stage between the wings.
  add(L.plinth, prism(rect(...S.stage), 0, 0.9));
  add(L.court, prism(rect(-12, 21, 12, 34), -0.2, 0.05));
}

function buildTemple(L: Layers): void {
  const T = D.TEMPLE;
  L.plinth.push(prism(rect(...T.plaza), 0, 0.08));
  const ring = T.ring / 2;
  const pool = T.pool / 2;
  L.plinth.push(prism(rect(-ring, -ring, ring, ring), 0, T.ringH, [rect(-pool, -pool, pool, pool)]));
  L.water.push(prism(rect(-pool, -pool, pool, pool), 0, 0.3));
  T.steps.forEach((w, i) => L.plinth.push(prism(rect(-w / 2, -w / 2, w / 2, w / 2), 0, T.stepH * (i + 1))));
  // Four plates on the sides of a square turned 45°, slits at its corners, so
  // from the front they meet in a V with the stone showing through (p39).
  const y0 = T.stepH * T.steps.length;
  const corners: V2[] = [[T.radius, 0], [0, T.radius], [-T.radius, 0], [0, -T.radius]];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = T.slit / 2 / len;
    const pa: V2 = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const pb: V2 = [b[0] - (b[0] - a[0]) * k, b[1] - (b[1] - a[1]) * k];
    L.dark.push(beam(pa, pb, y0, y0 + T.plateH, T.plateT));
  }
  const stone = clean(new IcosahedronGeometry(1.05, 0));
  stone.scale(1, 0.8, 1);
  stone.translate(0, y0 + T.plateH - 1.2, 0);
  L.plinth.push(stone);
}

/* ---------- Site plan texture ---------- */

function sitePlan(): CanvasTexture {
  const B = D.BASE;
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
  const box = (r: D.R4, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * k, (r[3] - r[1]) * k);
  };
  g.fillStyle = '#ebe4d6';
  g.fillRect(0, 0, cw, ch);
  // Plots: each cluster's footprint, a shade lighter.
  for (const cl of D.CLUSTERS) {
    const rot = D.OPEN_ROT[cl.opens] * DEG;
    const [w, d] = D.CLUSTER.size;
    g.save();
    g.translate(X(cl.at[0]), Z(cl.at[1]));
    g.rotate(-rot);
    g.fillStyle = '#f2ede3';
    g.fillRect((-w / 2 - 1) * k, (-d / 2 - 1) * k, (w + 2) * k, (d + 2) * k);
    g.restore();
  }
  box(D.GREEN, '#a7ae8f');
  box(D.SOUTH_GREEN, '#a7ae8f');
  g.lineCap = 'round';
  for (const r of D.ROADS) {
    g.beginPath();
    r.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.strokeStyle = '#c4baa9';
    g.lineWidth = r.width * k;
    g.stroke();
  }
  // Paths across the green to the temple and the school.
  g.strokeStyle = '#ddd2bf';
  g.lineWidth = 2.5 * k;
  g.beginPath();
  g.moveTo(X(0), Z(11.9));
  g.lineTo(X(0), Z(D.SCHOOL.at[1] + 20));
  g.stroke();
  box([-14, D.SCHOOL.at[1] + 19.5, 14, D.SCHOOL.at[1] + 22], '#e2d7c3');
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Camera ---------- */

const focus = D.CLUSTERS[D.FOCUS_CLUSTER].at;
const KEYS: CamKey[] = [
  { az: 180, el: 70, dist: 360, t: [0, 0, -14] },
  { az: 160, el: 40, dist: 300, t: [0, 0, -12] },
  { az: 338, el: 25, dist: 78, t: [focus[0], 2, focus[1] - 2] },
  { az: 330, el: 56, dist: 92, t: [focus[0], 4, focus[1]] },
  // Eye level at the court's open end, looking in at the two-storey houses.
  { az: 358, el: 2, dist: 19, t: [focus[0], 2.6, focus[1] + 6], fov: 58 },
  { az: 182, el: 13, dist: 66, t: [D.SCHOOL.at[0], 2.5, D.SCHOOL.at[1] + 10] },
  // From the green, north-east of the temple, so nothing stands between.
  { az: 24, el: 8, dist: 26, t: [0, 3.6, 0], fov: 36 },
];
const IDEA_KEY: CamKey = { az: 152, el: 50, dist: 300, t: [0, 6, -14] };

function camAt(stage: number): CamKey {
  const i = Math.min(Math.floor(stage), KEYS.length - 2);
  return mixKey(KEYS[i], KEYS[i + 1], smooth(stage - i, 0, 1));
}
function mixKey(a: CamKey, b: CamKey, f: number): CamKey {
  return {
    fov: lerp(a.fov ?? 30, b.fov ?? 30, f),
    az: lerp(a.az, b.az, f),
    el: lerp(a.el, b.el, f),
    dist: lerp(a.dist, b.dist, f),
    t: [lerp(a.t[0], b.t[0], f), lerp(a.t[1], b.t[1], f), lerp(a.t[2], b.t[2], f)],
  };
}

/* ---------- Scene ---------- */

export async function createIrshalpada(canvas: HTMLCanvasElement, opts: ModelOptions = {}): Promise<SiteModelHandle> {
  const rig = createRig(canvas);
  const { renderer, scene, camera, sun } = rig;
  camera.near = 0.5;
  camera.far = 3000;
  if (opts.debugView?.fov) {
    camera.fov = opts.debugView.fov;
    if (camera.fov < 10) {
      camera.near = 100;
      camera.far = 30000;
    }
  }
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -150;
  sc.right = sc.top = 150;
  sc.near = 10;
  sc.far = 1000;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.3;

  // Soft fill from the side away from the sun keeps shaded lime walls white.
  const fill = new DirectionalLight(0xf4efe6, 0.9);
  scene.add(fill);

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => (owned.push(x), x);

  /* Uniform sets: bodies, and roofs (which can lift on their own). */
  const bu = createBlockUniforms(N_BLOCKS);
  const ru = createBlockUniforms(N_BLOCKS);
  ru.uHover = bu.uHover;
  ru.uHoverTo = bu.uHoverTo;
  ru.uHoverMix = bu.uHoverMix;
  ru.uTint = bu.uTint;

  const mat = (color: Color, u: BlockUniforms, extra: Partial<MeshStandardMaterial> = {}, tint = true) => {
    const m = own(new MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, transparent: true, ...extra }));
    patchBlocks(m, u, { color: true, tint, hoverStrength: 0.5, hoverColor: new Color(0xfff6e4) });
    return m;
  };
  const jTex = own(jaliTexture(5, 0.5));
  const M = {
    walls: mat(COL.wall, bu),
    plinth: mat(COL.plinth, bu),
    roofs: mat(COL.roof, ru, { flatShading: true, roughness: 0.85 }),
    timber: mat(COL.timber, bu, { roughness: 0.8 }),
    foliage: mat(COL.foliage, bu, { flatShading: true }, false),
    court: mat(COL.court, bu, {}, false),
    dark: mat(COL.dark, bu, { roughness: 0.6 }),
    water: mat(COL.water, bu, { roughness: 0.15 }, false),
    jali: mat(COL.jali, bu, { map: jTex, alphaTest: 0.5, side: DoubleSide }),
  } satisfies Record<keyof Layers, MeshStandardMaterial>;
  const depth = (u: BlockUniforms) => {
    const m = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
    patchBlocks(m, u);
    return m;
  };
  const bodyDepth = depth(bu);
  const roofDepth = depth(ru);

  /* Clusters: one geometry per material, eleven instances each */
  const cluster = buildCluster();
  const clusterMats: Matrix4[] = D.CLUSTERS.map((c) => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), D.OPEN_ROT[c.opens] * DEG);
    return new Matrix4().compose(new Vector3(c.at[0], 0, c.at[1]), q, new Vector3(1, 1, 1));
  });
  const instanced: InstancedMesh[] = [];
  const keys = Object.keys(M) as (keyof Layers)[];
  for (const key of keys) {
    const list = cluster[key];
    if (!list.length) continue;
    const geo = own(key === 'jali' ? mergeGeometries(list, false)! : merge(list));
    geo.setAttribute('aBlock', new InstancedBufferAttribute(new Float32Array(D.CLUSTERS.map((_, i) => i)), 1));
    const mesh = new InstancedMesh(geo, M[key], N_CLUSTERS);
    clusterMats.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = key !== 'court' && key !== 'jali' && key !== 'water';
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = key === 'roofs' ? roofDepth : bodyDepth;
    mesh.userData.layer = key;
    instanced.push(mesh);
    scene.add(mesh);
  }

  /* Edges for the wireframe stage: bodies and roofs, all clusters plus the unique buildings */
  const unique = emptyLayers();
  buildSchool(unique);
  const schoolCount = Object.fromEntries(keys.map((k) => [k, unique[k].length])) as Record<keyof Layers, number>;
  buildTemple(unique);
  const edgeSets = { body: { pos: [] as number[], blk: [] as number[] }, roof: { pos: [] as number[], blk: [] as number[] } };
  const pushEdges = (g: BufferGeometry, set: 'body' | 'roof', mats: { m: Matrix4; block: number }[]) => {
    const e = new EdgesGeometry(g, 30);
    const p = e.getAttribute('position');
    const v = new Vector3();
    for (const { m, block } of mats) {
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m);
        edgeSets[set].pos.push(v.x, v.y, v.z);
        edgeSets[set].blk.push(block);
      }
    }
    e.dispose();
  };
  const clusterXf = clusterMats.map((m, i) => ({ m, block: i }));
  for (const mesh of instanced) {
    const layer = mesh.userData.layer as keyof Layers;
    if (layer === 'walls' || layer === 'plinth') pushEdges(mesh.geometry, 'body', clusterXf);
    if (layer === 'roofs') pushEdges(mesh.geometry, 'roof', clusterXf);
  }

  /* School and temple: single meshes per material, tagged with their block ids */
  for (const key of keys) {
    const list = unique[key];
    if (!list.length) continue;
    list.forEach((g, i) => tagBlock(g, i < schoolCount[key] ? SCHOOL_ID : TEMPLE_ID));
    const geo = own(mergeGeometries(list, false)!);
    list.forEach((g) => g.dispose());
    const mesh = new Mesh(geo, M[key]);
    mesh.castShadow = key !== 'court' && key !== 'water';
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = key === 'roofs' ? roofDepth : bodyDepth;
    mesh.userData.layer = key;
    scene.add(mesh);
    instanced.push(mesh as unknown as InstancedMesh);
    const id = new Matrix4();
    if (key === 'walls' || key === 'plinth' || key === 'dark') {
      // Edges per block id so the hover highlight tints the right lines.
      const blocks = geo.getAttribute('aBlock');
      for (const b of [SCHOOL_ID, TEMPLE_ID]) {
        const sub = new BufferGeometry();
        const src = geo.getAttribute('position');
        const pos: number[] = [];
        for (let i = 0; i < src.count; i++) if (blocks.getX(i) === b) pos.push(src.getX(i), src.getY(i), src.getZ(i));
        sub.setAttribute('position', new Float32BufferAttribute(pos, 3));
        pushEdges(sub, 'body', [{ m: id, block: b }]);
        sub.dispose();
      }
    }
    if (key === 'roofs') pushEdges(geo, 'roof', [{ m: id, block: SCHOOL_ID }]);
  }

  const edgeMat = (u: BlockUniforms) => {
    const m = own(new LineBasicMaterial({ color: COL.ink, transparent: true }));
    patchBlocks(m, u, { color: true, hoverColor: COL.cut });
    return m;
  };
  const edgeLines = (set: 'body' | 'roof', u: BlockUniforms) => {
    const g = own(new BufferGeometry());
    g.setAttribute('position', new Float32BufferAttribute(edgeSets[set].pos, 3));
    g.setAttribute('aBlock', new Float32BufferAttribute(edgeSets[set].blk, 1));
    const l = new LineSegments(g, edgeMat(u));
    l.frustumCulled = false;
    scene.add(l);
    return l;
  };
  const bodyEdges = edgeLines('body', bu);
  const roofEdges = edgeLines('roof', ru);

  /* Site base, a model board with the plan printed on it */
  const B = D.BASE;
  const planTex = own(sitePlan());
  const sideMat = own(new MeshStandardMaterial({ color: 0xd9cdb8, roughness: 1 }));
  const topMat = own(new MeshStandardMaterial({ map: planTex, roughness: 1 }));
  const baseGeo = own(new BoxGeometry(B.x1 - B.x0, B.thickness, B.z1 - B.z0));
  const base = new Mesh(baseGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  base.position.set((B.x0 + B.x1) / 2, -B.thickness / 2, (B.z0 + B.z1) / 2);
  base.receiveShadow = true;
  base.castShadow = true;
  scene.add(base);

  const groundGeo = own(new PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2));
  const ground = new Mesh(groundGeo, own(new ShadowMaterial({ color: COL.ink, opacity: 0.07 })));
  ground.position.y = -B.thickness;
  ground.receiveShadow = true;
  scene.add(ground);

  // Context: low hills of the Sahyadri setting, far off and pale [assumed].
  const hillGeo = own(new SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const hillMat = own(new MeshStandardMaterial({ color: COL.hill, roughness: 1, flatShading: true }));
  const hills = new InstancedMesh(hillGeo, hillMat, 7);
  [
    [-420, -420, 190, 34],
    [-80, -560, 240, 42],
    [330, -470, 200, 30],
    [560, -90, 170, 22],
    [-560, -60, 160, 24],
    [420, 400, 180, 16],
    [-400, 420, 170, 14],
  ].forEach(([x, z, r, hgt], i) => hills.setMatrixAt(i, new Matrix4().compose(new Vector3(x, -B.thickness, z), new Quaternion(), new Vector3(r, hgt, r))));
  scene.add(hills);

  /* Idea layer: nested courts, linked to the temple */
  const arcs = buildArcs();
  const arcGeo = own(arcs);
  const arcMat = own(
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uA: { value: new Color(0x3d4a33) }, uB: { value: new Color(TINT.terracotta) } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: `
attribute float aT;
attribute float aLen;
attribute float aTier;
varying float vT;
varying float vLen;
varying float vTier;
void main() {
  vT = aT; vLen = aLen; vTier = aTier;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uA;
uniform vec3 uB;
varying float vT;
varying float vLen;
varying float vTier;
void main() {
  float d = fract(vT * vLen / 5.0 - uTime * 0.9);
  float dash = smoothstep(0.0, 0.1, d) * (1.0 - smoothstep(0.55, 0.65, d));
  vec3 c = mix(uA, uB, vTier * smoothstep(0.6, 1.0, vT));
  gl_FragColor = vec4(c, uOpacity * (0.35 + 0.65 * dash));
  #include <colorspace_fragment>
}`,
    }),
  );
  const arcMesh = new Mesh(arcGeo, arcMat);
  arcMesh.frustumCulled = false;
  arcMesh.visible = false;
  scene.add(arcMesh);

  const ringGeo = own(new RingGeometry(0.96, 1, 96).rotateX(-Math.PI / 2));
  const ringMats = [0, 1, 2].map(() => own(new MeshBasicMaterial({ color: COL.cut, transparent: true, opacity: 0, depthWrite: false })));
  const rings = ringMats.map((m) => {
    const r = new Mesh(ringGeo, m);
    r.position.y = 0.3;
    r.visible = false;
    scene.add(r);
    return r;
  });

  /* ---------- State ---------- */

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
  const roofLift = ru.uLift.value;

  const apply = (time: number) => {
    const s = stage;
    const I = idea;
    const mass = Math.max(smooth(s, 0.35, 1.0), I);
    const facade = smooth(s, 1.2, 1.9) * (1 - 0.7 * I);
    for (const k of ['walls', 'plinth', 'dark', 'court', 'water'] as const) M[k].opacity = mass;
    const lifted = smooth(s, 2.35, 3.0) * (1 - smooth(s, 3.4, 3.95));
    M.roofs.opacity = mass * (1 - 0.72 * Math.max(I, lifted * 0.85));
    M.roofs.depthWrite = M.roofs.opacity > 0.9;
    for (const k of ['timber', 'foliage', 'jali'] as const) M[k].opacity = facade;
    for (const mesh of instanced) {
      const layer = mesh.userData.layer as keyof Layers;
      mesh.visible = M[layer].opacity > 0.01;
      mesh.castShadow = M[layer].opacity > 0.6 && layer !== 'court' && layer !== 'water' && layer !== 'jali';
    }
    const edgeO = s < 0.35 ? 1 : lerp(1, 0.22, smooth(s, 0.35, 1));
    (bodyEdges.material as LineBasicMaterial).opacity = lerp(edgeO, 0.5, I);
    (roofEdges.material as LineBasicMaterial).opacity = lerp(edgeO, 0.3, I) * (1 - 0.5 * I);
    bu.uTintMix.value = 0.25 * I;

    // Roofs lift in stage 3 (all clusters, most at the focus) and in idea mode.
    for (let i = 0; i < N_BLOCKS; i++) {
      const base = i === D.FOCUS_CLUSTER ? 14 : 8;
      roofLift[i] = Math.max(lifted * base, I * 10);
    }

    // Sun: morning, warming to late afternoon at the temple.
    const late = smooth(s, 5.2, 6);
    const sunAz = lerp(128, 248, late);
    rig.setSun(sunAz, lerp(48, 24, late), 450);
    fill.position.set(-Math.sin(sunAz * DEG) * 100, 60, Math.cos(sunAz * DEG) * 100);

    // Idea layer.
    arcMesh.visible = I > 0.01;
    (arcMat.uniforms.uOpacity as { value: number }).value = I;
    (arcMat.uniforms.uTime as { value: number }).value = opts.still ? 0 : time / 1000;
    rings.forEach((r, i) => {
      const ph = opts.still ? (i + 0.5) / 3 : (time / 5200 + i / 3) % 1;
      r.visible = I > 0.01;
      r.scale.setScalar(6 + ph * 42);
      ringMats[i].opacity = I * 0.55 * (1 - ph);
    });

    // Hover / pinned highlight.
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
    const drift = opts.still || opts.debugView ? 0 : Math.sin(time / 9000) * (s > 3.6 && s < 4.6 ? 2 : 5);
    const aspect = width / height;
    const fit = opts.debugView ? 1 : Math.max(1, Math.pow(1.55 / aspect, 0.85));
    const azR = (k.az + drift + dragAz) * DEG;
    const elR = Math.max(1, Math.min(85, k.el + dragEl)) * DEG;
    const dist = k.dist * fit;
    camera.position.set(
      k.t[0] + Math.sin(azR) * Math.cos(elR) * dist,
      k.t[1] + Math.sin(elR) * dist,
      k.t[2] - Math.cos(azR) * Math.cos(elR) * dist,
    );
    camera.lookAt(k.t[0], k.t[1], k.t[2]);
    const fov = opts.debugView?.fov ?? k.fov ?? 30;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  };

  /* ---------- Hover ---------- */

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const pickables = instanced.filter((m) => ['walls', 'roofs', 'plinth', 'dark'].includes(m.userData.layer));
  const OPEN_NAME = { n: 'north', e: 'east', s: 'south', w: 'west' } as const;
  let handle: SiteModelHandle;
  const setHover = (b: number) => {
    if (b !== hoverBlock) {
      hoverBlock = b;
      dirty = true;
      canvas.style.cursor = b >= 0 ? 'help' : '';
    }
    if (b < 0 || !pointer) return handle.onHover?.(null);
    const info: Omit<HoverInfo, 'x' | 'y'> =
      b < N_CLUSTERS
        ? {
            id: `cluster-${b + 1}`,
            name: `Cluster ${b + 1}`,
            levels: 'Two ground+1 houses and two ground-storey houses',
            storeys: `Shared court opens to the ${OPEN_NAME[D.CLUSTERS[b].opens]}`,
          }
        : b === SCHOOL_ID
          ? { id: 'school', name: 'Primary school', levels: 'Classrooms, office and a stage', storeys: 'Ground storey' }
          : { id: 'temple', name: 'Temple of Memories', levels: 'Memorial stone on a stepped plinth in water', storeys: 'Form read from one render' };
    handle.onHover?.({ ...info, x: pointer.x, y: pointer.y });
  };
  const pick = () => {
    needsPick = false;
    if (!pointer || stage < 0.8 || idea > 0.3) return setHover(-1);
    ndc.set((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (!hit) return setHover(-1);
    if (hit.instanceId !== undefined && (hit.object as InstancedMesh).isInstancedMesh) return setHover(hit.instanceId);
    const a = (hit.object as Mesh).geometry.getAttribute('aBlock');
    setHover(hit.face ? Math.round(a.getX(hit.face.a)) : -1);
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
      dragAz = Math.max(-70, Math.min(70, drag.az - (e.clientX - drag.x) * 0.25));
      dragEl = Math.max(-10, Math.min(25, drag.el + (e.clientY - drag.y) * 0.12));
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
      const item = D.ITEMS.find((i) => i.id === id);
      pinned = item ? [item.range[0], item.range[1]] : null;
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
      const animated = (!opts.still && !opts.debugView) || idea > 0;
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
      for (const m of instanced) if ((m as InstancedMesh).isInstancedMesh) m.dispose();
      hills.dispose();
      owned.forEach((o) => o.dispose());
      rig.dispose();
    },
  };
  return handle;
}

/**
 * Arcs of the nested-court diagram: each house courtyard to its cluster
 * court (low arcs), each cluster court to the temple (high arcs). Built as
 * flat ribbons so they read at site scale.
 */
function buildArcs(): BufferGeometry {
  const pos: number[] = [];
  const aT: number[] = [];
  const aLen: number[] = [];
  const aTier: number[] = [];
  const [ccx, ccz] = D.CLUSTER.center;
  const courtLocal: V2 = [(D.CLUSTER.court[0] + D.CLUSTER.court[2]) / 2 - ccx, (D.CLUSTER.court[1] + D.CLUSTER.court[3]) / 2 - ccz];
  const houseCourts: V2[] = D.CLUSTER.houses.map((h) => {
    const t = h.type === 'g' ? D.HOUSE_G : D.HOUSE_G1;
    let x = (t.courtyard[0] + t.courtyard[2]) / 2;
    let z = (t.courtyard[1] + t.courtyard[3]) / 2;
    const r = h.rotDeg * DEG;
    [x, z] = [x * Math.cos(r) + z * Math.sin(r) + h.at[0], -x * Math.sin(r) + z * Math.cos(r) + h.at[1]];
    if (h.mirror) x = 2 * D.CLUSTER.axis - x;
    return [x - ccx, z - ccz];
  });
  const toWorld = (c: D.Placed, [x, z]: V2): V2 => {
    const r = D.OPEN_ROT[c.opens] * DEG;
    return [c.at[0] + x * Math.cos(r) + z * Math.sin(r), c.at[1] - x * Math.sin(r) + z * Math.cos(r)];
  };
  const ribbon = (a: V2, b: V2, ya: number, yb: number, rise: number, w: number, tier: number) => {
    const n = 28;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const px = (-(b[1] - a[1]) / len) * w * 0.5;
    const pz = ((b[0] - a[0]) / len) * w * 0.5;
    const at = (t: number) => {
      const y = lerp(ya, yb, t) + rise * 4 * t * (1 - t);
      return [lerp(a[0], b[0], t), y, lerp(a[1], b[1], t)];
    };
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const p0 = at(t0);
      const p1 = at(t1);
      const quad = [
        [p0[0] - px, p0[1], p0[2] - pz, t0],
        [p0[0] + px, p0[1], p0[2] + pz, t0],
        [p1[0] + px, p1[1], p1[2] + pz, t1],
        [p1[0] - px, p1[1], p1[2] - pz, t1],
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        pos.push(quad[k][0], quad[k][1], quad[k][2]);
        aT.push(quad[k][3]);
        aLen.push(len);
        aTier.push(tier);
      }
    }
  };
  for (const c of D.CLUSTERS) {
    const court = toWorld(c, courtLocal);
    for (const hc of houseCourts) ribbon(toWorld(c, hc), court, 0.4, 0.4, 5, 0.5, 0);
    ribbon(court, [0, 0], 0.4, 6.5, 16, 0.9, 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new Float32BufferAttribute(aT, 1));
  g.setAttribute('aLen', new Float32BufferAttribute(aLen, 1));
  g.setAttribute('aTier', new Float32BufferAttribute(aTier, 1));
  return g;
}
