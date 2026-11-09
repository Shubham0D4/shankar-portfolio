/**
 * Dharavi Rerooted: procedural cluster diagram (PLAN.md §5, Phase 2:
 * "four plus-shaped towers, the community centre and airflow arrows, with
 * an SRA versus saleable colour split").
 *
 * Parameters: ./dharavi.data.ts. Readings and assumptions: MODEL_NOTES.md §6.
 *
 * Eight plus-shaped towers (two traced floor plates) and the community
 * centre share one merged mesh. Each vertex carries its building (aBlock)
 * and whether it is a jali service core (aJali), so towers can grow floor by
 * floor and the shader can draw the full-slit windows, floor lines and jali
 * without extra geometry. Existing Dharavi is two instanced fields of small
 * boxes; the part on the site sinks away as the zones are cleared.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
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
  Quaternion,
  Raycaster,
  RGBADepthPacking,
  SRGBColorSpace,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRig, TINT } from '../three/rig';
import { hipRoof, polySDF, prism, rect, type V2 } from './kit/geometry';
import { createBlockUniforms, patchBlocks } from './kit/patch';
import * as D from './dharavi.data';
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

const C = {
  tower: new Color(0xf2eee7),
  jali: new Color(0xd8cdbd),
  hall: new Color(0xb4623e),
  rooms: new Color(0xe7dfd2),
  play: new Color(0x7d8b6a),
  sra: new Color(0xb3a8b0),
  sale: new Color(0xa27a7e),
  fabric: new Color(0xc9bfb1),
  tree: new Color(0x86906a),
  ink: new Color(TINT.charcoal),
  cut: new Color(TINT.terracotta),
  wind: new Color(0x2f6680),
};

const SRA_IDS = [0, 1, 2, 3];
const SALE_IDS = [4, 5, 6, 7];
const CENTRE_ID = 8;
const N_BLOCKS = 10;

/* ---------- Geometry ---------- */

function attrs(g: BufferGeometry, block: number, jali: number, color: Color): BufferGeometry {
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(n).fill(block), 1));
  g.setAttribute('aJali', new Float32BufferAttribute(new Float32Array(n).fill(jali), 1));
  return g;
}

function merge(list: BufferGeometry[]): BufferGeometry {
  const m = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  if (!m) throw new Error('merge failed');
  return m;
}

const shift = (r: D.R4, [x, z]: V2): D.R4 => [r[0] + x, r[1] + z, r[2] + x, r[3] + z];

function buildBuildings() {
  const list: BufferGeometry[] = [];
  const footprints: V2[][] = [];
  const centres: V2[] = [];
  const add = (plate: D.Plate, at: V2, id: number) => {
    centres.push(at);
    for (const r of plate.body) {
      list.push(attrs(prism(rect(...shift(r, at)), 0, D.HEIGHT), id, 0, C.tower));
      footprints.push(rect(...shift(r, at)));
    }
    for (const r of plate.bumps) list.push(attrs(prism(rect(...shift(r, at)), 0, D.HEIGHT - 0.6), id, 1, C.jali));
    // Machine rooms over the two lift cores.
    for (const dz of [-4.5, 4.5]) list.push(attrs(prism(rect(...shift([-3, dz - 2, 3, dz + 2], at)), D.HEIGHT, D.HEIGHT + D.MACHINE), id, 0, C.tower));
  };
  D.towerCentres(D.CLUSTER_C.sra).forEach((c, i) => add(D.SRA_PLATE, c, SRA_IDS[i]));
  D.towerCentres(D.CLUSTER_C.saleable).forEach((c, i) => add(D.SALE_PLATE, c, SALE_IDS[i]));
  const cc: V2 = [D.CLUSTER_C.sra[0] + D.CENTRE.at[0], D.CLUSTER_C.sra[1] + D.CENTRE.at[1]];
  for (const p of D.CENTRE.parts) {
    const color = p.kind === 'play' ? C.play : C.rooms;
    if (p.kind === 'hall') {
      // Community hall: cream walls under a red tiled hip roof (p50 render).
      const r = shift(p.r, cc);
      list.push(attrs(prism(rect(...r), 0, 4.2), CENTRE_ID, 0, C.rooms));
      list.push(attrs(hipRoof(r[0] - 0.8, r[1] - 0.8, r[2] + 0.8, r[3] + 0.8, 4.2, 30, p.h + 1.5), CENTRE_ID, 0, C.hall));
    } else list.push(attrs(prism(rect(...shift(p.r, cc)), 0, p.h), CENTRE_ID, 0, color));
    if (p.kind !== 'play') footprints.push(rect(...shift(p.r, cc)));
  }
  const solid = merge(list);
  const edges = new EdgesGeometry(solid, 25);
  // Carry block ids onto the edges by vertex position.
  const key = (x: number, y: number, z: number) => `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
  const ids = new Map<string, number>();
  const p = solid.getAttribute('position');
  const a = solid.getAttribute('aBlock');
  for (let i = 0; i < p.count; i++) ids.set(key(p.getX(i), p.getY(i), p.getZ(i)), a.getX(i));
  const ep = edges.getAttribute('position');
  const eb = new Float32Array(ep.count);
  for (let i = 0; i < ep.count; i++) eb[i] = ids.get(key(ep.getX(i), ep.getY(i), ep.getZ(i))) ?? 9;
  edges.setAttribute('aBlock', new Float32BufferAttribute(eb, 1));
  edges.setAttribute('aJali', new Float32BufferAttribute(new Float32Array(ep.count), 1));
  return { solid, edges, footprints, centres };
}

/* ---------- Ground texture: zones, road, courts ---------- */

function groundTexture(zones: number): CanvasTexture {
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
  const box = (r: D.R4, fill: string) => {
    g.fillStyle = fill;
    g.fillRect((r[0] - B.x0) * k, (r[1] - B.z0) * k, (r[2] - r[0]) * k, (r[3] - r[1]) * k);
  };
  g.fillStyle = '#dcd4c7';
  g.fillRect(0, 0, cw, ch);
  if (zones) {
    const half = D.SPACING / 2 + 32;
    const [sx] = D.CLUSTER_C.sra;
    const [px] = D.CLUSTER_C.saleable;
    box([sx - half, -half, -D.BUFFER / 2, half + 34], '#c9c1c6'); // SRA area (map: grey-violet)
    box([D.BUFFER / 2, -half, px + half, half + 10], '#c4a9aa'); // saleable area (map: mauve)
    box([-D.BUFFER / 2, B.z0, D.BUFFER / 2, B.z1], '#bdb5a8'); // buffer
    box([-D.ROAD.w / 2, B.z0, D.ROAD.w / 2, B.z1], '#9f988e'); // road
    for (const [cx, cz] of [D.CLUSTER_C.sra, D.CLUSTER_C.saleable]) {
      box(shift(D.COURT, [cx, cz]), '#9aa383');
      for (const s of D.STRIPS) box(shift(s, [cx, cz]), '#a8ae90');
    }
    box([-D.BUFFER / 2 + 2, B.z0, -D.ROAD.w / 2 - 2, B.z1], '#a8ae90');
    box([D.ROAD.w / 2 + 2, B.z0, D.BUFFER / 2 - 2, B.z1], '#a8ae90');
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Tower shader: growth, floor lines, full-slit windows, jali ---------- */

interface GrowUniforms {
  uGrow: { value: Float32Array };
  uFacade: { value: number };
}

function patchTower(m: Material, u: GrowUniforms, color: boolean): void {
  const n = u.uGrow.value.length;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aJali;
uniform float uGrow[${n}];
varying vec3 vWp;
varying vec3 vN;
varying float vJali;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
transformed.y *= uGrow[int(aBlock + 0.5)];
vWp = transformed;
vN = normal;
vJali = aJali;`,
      );
    if (!color) return;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uFacade;
varying vec3 vWp;
varying vec3 vN;
varying float vJali;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float side = 1.0 - step(0.5, abs(vN.y));
  float s = dot(vWp.xz, vec2(-vN.z, vN.x));
  float f = vWp.y / ${D.FLOOR_H.toFixed(2)};
  float fr = fract(f);
  float aa = 1.0 - smoothstep(0.25, 0.6, fwidth(f));
  float shade = 1.0;
  if (vWp.y < ${(D.HEIGHT - 0.01).toFixed(2)} && vWp.y > 0.5) {
    if (vJali > 0.5) {
      // Perforated jali: a dot grid.
      vec2 g = fract(vec2(s, vWp.y) / 0.45) - 0.5;
      shade = length(g) < 0.2 ? 0.8 : 0.98;
    } else {
      // Full-slit windows: vertical strips of glazing, a slab line every floor.
      float slit = step(0.4, fract(s / 3.6)) * step(fract(s / 3.6), 0.6);
      float glaze = slit * step(0.12, fr) * step(fr, 0.94);
      shade = mix(1.0, 0.0, glaze);
      if (fr < 0.05) shade = 0.9;
    }
  }
  vec3 glass = vec3(0.6, 0.69, 0.76);
  vec3 c = shade < 0.01 ? glass : diffuseColor.rgb * shade;
  diffuseColor.rgb = mix(diffuseColor.rgb, c, side * aa * uFacade);
}`,
      );
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => prevKey() + `tower:${color ? 1 : 0}`;
}

/* ---------- Wind lines: steered round the towers, south-west to north-east ---------- */

function windLines(footprints: V2[][]): { x: number; z: number }[][] {
  const polys = footprints.map((p) => ({ p, bb: [Math.min(...p.map((q) => q[0])) - 10, Math.min(...p.map((q) => q[1])) - 10, Math.max(...p.map((q) => q[0])) + 10, Math.max(...p.map((q) => q[1])) + 10] }));
  const dir: V2 = [Math.SQRT1_2, -Math.SQRT1_2]; // towards the north-east
  const lines: { x: number; z: number }[][] = [];
  for (const [cx, cz] of [D.CLUSTER_C.sra, D.CLUSTER_C.saleable]) {
    for (let k = -6; k <= 6; k++) {
      // Seeds on a line across the wind, upstream of the cluster.
      let x = cx - 95 * dir[0] + k * 11 * Math.SQRT1_2;
      let z = cz - 95 * dir[1] + k * 11 * Math.SQRT1_2;
      const pts: { x: number; z: number }[] = [];
      for (let i = 0; i < 110; i++) {
        pts.push({ x, z });
        let gx = dir[0];
        let gz = dir[1];
        for (const { p, bb } of polys) {
          if (x < bb[0] || x > bb[2] || z < bb[1] || z > bb[3]) continue;
          const d = polySDF(x, z, p);
          if (d > 8) continue;
          const h = 0.5;
          const dx = polySDF(x + h, z, p) - polySDF(x - h, z, p);
          const dz = polySDF(x, z + h, p) - polySDF(x, z - h, p);
          const l = Math.hypot(dx, dz) || 1;
          const push = (8 - d) / 8;
          gx += (dx / l) * push * 1.6;
          gz += (dz / l) * push * 1.6;
        }
        const l = Math.hypot(gx, gz) || 1;
        x += (gx / l) * 2;
        z += (gz / l) * 2;
      }
      lines.push(pts);
    }
  }
  return lines;
}

/* ---------- Camera ---------- */

const [SX, SZ] = D.CLUSTER_C.sra;
const KEYS: CamKey[] = [
  { az: 202, el: 34, dist: 380, t: [0, 0, 0] },
  { az: 186, el: 66, dist: 400, t: [0, 0, 6] },
  { az: 208, el: 46, dist: 105, t: [SX - D.SPACING / 2, 2, SZ - D.SPACING / 2] },
  { az: 214, el: 18, dist: 440, t: [0, 32, 0] },
  { az: 168, el: 24, dist: 150, t: [SX, 8, SZ + 18] },
  { az: 222, el: 46, dist: 420, t: [0, 10, 0] },
  { az: 204, el: 30, dist: 450, t: [0, 20, 0] },
];
const IDEA_KEY: CamKey = { az: 196, el: 58, dist: 410, t: [0, 10, 6] };

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

export async function createDharavi(canvas: HTMLCanvasElement, opts: ModelOptions = {}): Promise<SiteModelHandle> {
  const rig = createRig(canvas);
  const { renderer, scene, camera, sun } = rig;
  const coarse = matchMedia('(pointer: coarse)').matches;
  camera.near = 2;
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
  sun.shadow.normalBias = 0.5;

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => (owned.push(x), x);

  /* Buildings */
  const bu = createBlockUniforms(N_BLOCKS);
  const gu: GrowUniforms = { uGrow: { value: new Float32Array(N_BLOCKS).fill(1) }, uFacade: { value: 1 } };
  const grow = gu.uGrow.value;
  const B = buildBuildings();
  own(B.solid);
  own(B.edges);
  const buildMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true }));
  patchTower(buildMat, gu, true);
  patchBlocks(buildMat, bu, { color: true, tint: true, hoverStrength: 0.5, hoverColor: new Color(0xfff3dc) });
  const depth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
  patchTower(depth, gu, false);
  patchBlocks(depth, bu);
  const buildings = new Mesh(B.solid, buildMat);
  buildings.customDepthMaterial = depth;
  buildings.castShadow = buildings.receiveShadow = true;
  buildings.frustumCulled = false;
  scene.add(buildings);
  const edgeMat = own(new LineBasicMaterial({ color: C.ink, transparent: true }));
  patchTower(edgeMat, gu, false);
  patchBlocks(edgeMat, bu, { color: true, hoverColor: C.cut });
  const edges = new LineSegments(B.edges, edgeMat);
  edges.frustumCulled = false;
  scene.add(edges);

  /* Board: plain ground, then the zoned plan */
  const Bd = D.BOARD;
  const plainTex = own(groundTexture(0));
  const zoneTex = own(groundTexture(1));
  const boardGeo = own(new BoxGeometry(Bd.x1 - Bd.x0, Bd.thickness, Bd.z1 - Bd.z0));
  const sideMat = own(new MeshStandardMaterial({ color: 0xcfc6b8, roughness: 1 }));
  const plainMat = own(new MeshStandardMaterial({ map: plainTex, roughness: 1 }));
  const zoneMat = own(new MeshStandardMaterial({ map: zoneTex, roughness: 1, transparent: true, opacity: 0 }));
  const board = new Mesh(boardGeo, [sideMat, sideMat, plainMat, sideMat, sideMat, sideMat]);
  board.position.set((Bd.x0 + Bd.x1) / 2, -Bd.thickness / 2, (Bd.z0 + Bd.z1) / 2);
  board.receiveShadow = true;
  scene.add(board);
  const zoneTop = new Mesh(own(new BoxGeometry(Bd.x1 - Bd.x0, 0.02, Bd.z1 - Bd.z0)), [sideMat, sideMat, zoneMat, sideMat, sideMat, sideMat]);
  zoneTop.position.set((Bd.x0 + Bd.x1) / 2, 0.02, (Bd.z0 + Bd.z1) / 2);
  zoneTop.receiveShadow = true;
  scene.add(zoneTop);

  /* Existing Dharavi: a dense field of small boxes. On-site ones sink as the zones clear. */
  const rand = rng(2025);
  const site = rect(-D.BUFFER / 2 - D.SPACING - 70, -D.SPACING / 2 - 34, D.BUFFER / 2 + D.SPACING + 70, D.SPACING / 2 + 52);
  const on: Matrix4[] = [];
  const off: Matrix4[] = [];
  const step = coarse ? 9 : 7.2;
  const q = new Quaternion();
  for (let x = Bd.x0 + 4; x < Bd.x1 - 4; x += step) {
    for (let z = Bd.z0 + 4; z < Bd.z1 - 4; z += step) {
      const px = x + (rand() - 0.5) * 2;
      const pz = z + (rand() - 0.5) * 2;
      const w = step * (0.62 + rand() * 0.3);
      const d = step * (0.62 + rand() * 0.3);
      const h = 3 + Math.floor(rand() * 3) * 3 + rand() * 0.8;
      if (Math.abs(px) < D.ROAD.w / 2 + 2) continue; // the existing road line
      if (rand() < 0.05) continue; // lanes
      q.setFromAxisAngle(new Vector3(0, 1, 0), (rand() - 0.5) * 0.25);
      const m = new Matrix4().compose(new Vector3(px, h / 2, pz), q, new Vector3(w, h, d));
      (polySDF(px, pz, site) < 0 ? on : off).push(m);
    }
  }
  const fabGeo = own(new BoxGeometry(1, 1, 1));
  const fabMat = own(new MeshStandardMaterial({ color: C.fabric, roughness: 1, transparent: true }));
  const fabOn = new InstancedMesh(fabGeo, fabMat, on.length);
  on.forEach((m, i) => fabOn.setMatrixAt(i, m));
  const fabOffMat = own(new MeshStandardMaterial({ color: C.fabric, roughness: 1, transparent: true }));
  const fabOff = new InstancedMesh(fabGeo, fabOffMat, off.length);
  off.forEach((m, i) => fabOff.setMatrixAt(i, m));
  for (const f of [fabOn, fabOff]) {
    f.castShadow = f.receiveShadow = true;
    scene.add(f);
  }

  /* Trees on the courts and the buffer */
  const trees: V2[] = [];
  for (const [cx, cz] of [D.CLUSTER_C.sra, D.CLUSTER_C.saleable]) {
    for (const s of D.STRIPS) {
      const r = shift(s, [cx, cz]);
      const long = r[2] - r[0] > r[3] - r[1];
      for (let t = 0.12; t < 1; t += 0.25) trees.push(long ? [lerp(r[0], r[2], t), (r[1] + r[3]) / 2] : [(r[0] + r[2]) / 2, lerp(r[1], r[3], t)]);
    }
    for (const [dx, dz] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) trees.push([cx + dx, cz + dz]);
  }
  for (let z = Bd.z0 + 12; z < Bd.z1 - 8; z += 14) trees.push([-D.ROAD.w / 2 - 6, z], [D.ROAD.w / 2 + 6, z]);
  const treeGeo = own(new IcosahedronGeometry(1, 0));
  const treeMat = own(new MeshStandardMaterial({ color: C.tree, roughness: 1, flatShading: true, transparent: true }));
  const treeMesh = new InstancedMesh(treeGeo, treeMat, trees.length);
  trees.forEach(([x, z], i) => treeMesh.setMatrixAt(i, new Matrix4().compose(new Vector3(x, 3.6, z), q.setFromAxisAngle(new Vector3(0, 1, 0), i), new Vector3(3, 3.4, 3))));
  treeMesh.castShadow = true;
  scene.add(treeMesh);

  /* Wind ribbons */
  const lines = windLines(B.footprints);
  const pos: number[] = [];
  const dist: number[] = [];
  for (const line of lines) {
    let s = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = (-(b.z - a.z) / L) * 0.9;
      const nz = ((b.x - a.x) / L) * 0.9;
      const y = 7;
      const quad = [
        [a.x - nx, a.z - nz, s],
        [a.x + nx, a.z + nz, s],
        [b.x + nx, b.z + nz, s + L],
        [b.x - nx, b.z - nz, s + L],
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        pos.push(quad[k][0], y, quad[k][1]);
        dist.push(quad[k][2]);
      }
      s += L;
    }
  }
  const windGeo = own(new BufferGeometry());
  windGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  windGeo.setAttribute('aDist', new Float32BufferAttribute(dist, 1));
  const windMat = own(
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: C.wind.clone() } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: `
attribute float aDist;
varying float vD;
void main() {
  vD = aDist;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying float vD;
void main() {
  float d = fract((vD - uTime * 14.0) / 26.0);
  float dash = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.45, 0.6, d));
  float fade = smoothstep(0.0, 30.0, vD) * (1.0 - smoothstep(170.0, 215.0, vD));
  gl_FragColor = vec4(uColor, uOpacity * fade * (0.25 + 0.75 * dash));
  #include <colorspace_fragment>
}`,
    }),
  );
  const wind = new Mesh(windGeo, windMat);
  wind.visible = false;
  wind.renderOrder = 5;
  scene.add(wind);

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

  const apply = (time: number) => {
    const s = stage;
    const I = idea;

    // Existing fabric on the site sinks away; the zones appear (stage 0.4 → 1).
    const clear = Math.max(smooth(s, 0.35, 1.0), I);
    fabOn.visible = clear < 0.99;
    fabOn.position.y = -clear * 12;
    fabMat.opacity = 1 - clear;
    zoneMat.opacity = clear;
    fabOffMat.opacity = 1 - 0.55 * I;
    fabOffMat.depthWrite = I < 0.5;

    // Towers: one floor in stage 2, all 22 in stage 3; community centre with the court.
    const one = D.FLOOR_H / D.HEIGHT;
    const tg = (i: number) => Math.max(lerp(0, one, smooth(s, 1.3, 1.9)) + (1 - one) * smooth(s, 2.4 + i * 0.06, 3.1 + i * 0.06), I);
    for (const i of [...SRA_IDS, ...SALE_IDS]) grow[i] = Math.max(tg(i), 0.0001);
    grow[CENTRE_ID] = Math.max(smooth(s, 3.4, 4.0), I, 0.0001);
    const shown = Math.max(smooth(s, 1.2, 1.5), I);
    buildings.visible = edges.visible = shown > 0.01;
    buildMat.opacity = shown * (1 - 0.55 * I);
    buildMat.depthWrite = buildMat.opacity > 0.9;
    buildings.castShadow = buildMat.opacity > 0.6;
    edgeMat.opacity = lerp(lerp(1, 0.25, smooth(s, 2.9, 3.4)), 0.35, I);
    gu.uFacade.value = smooth(s, 2.8, 3.4) * (1 - I);
    // Idea: zone colours on the towers come from paintZones (vertex colours).
    treeMat.opacity = Math.max(smooth(s, 3.5, 4.0), I * 0.6);
    treeMesh.visible = treeMat.opacity > 0.01;

    // Wind in stage 5 and the idea model.
    const w = Math.max(smooth(s, 4.4, 4.9) * (1 - smooth(s, 5.5, 5.9)), I);
    wind.visible = w > 0.01;
    (windMat.uniforms.uOpacity as { value: number }).value = 0.85 * w;
    (windMat.uniforms.uTime as { value: number }).value = opts.still ? 0 : time / 1000;

    // Sun: morning; sweeps in stage 5.
    const sweep = smooth(s, 4.4, 5.6) * (1 - smooth(s, 5.5, 6));
    rig.setSun(lerp(110, 250, sweep), lerp(42, 38, sweep), 800);

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
    const elR = (opts.debugView ? k.el : Math.max(2, Math.min(85, k.el + dragEl))) * DEG;
    const d = k.dist * fit;
    camera.position.set(k.t[0] + Math.sin(azR) * Math.cos(elR) * d, k.t[1] + Math.sin(elR) * d, k.t[2] - Math.cos(azR) * Math.cos(elR) * d);
    camera.lookAt(k.t[0], k.t[1], k.t[2]);
  };

  /* Idea model zone colours: repaint vertex colours once, blend by uniform. */
  const baseCol = (B.solid.getAttribute('color').array as Float32Array).slice();
  const zoneCol = baseCol.slice();
  {
    const blk = B.solid.getAttribute('aBlock');
    for (let i = 0; i < blk.count; i++) {
      const b = blk.getX(i);
      const c = SRA_IDS.includes(b) ? C.sra : SALE_IDS.includes(b) ? C.sale : null;
      if (c) zoneCol.set([c.r, c.g, c.b], i * 3);
    }
  }
  let lastZone = -1;
  const paintZones = (t: number) => {
    const q2 = Math.round(t * 20) / 20;
    if (q2 === lastZone) return;
    lastZone = q2;
    const col = B.solid.getAttribute('color');
    const arr = col.array as Float32Array;
    for (let i = 0; i < arr.length; i++) arr[i] = baseCol[i] + (zoneCol[i] - baseCol[i]) * q2;
    col.needsUpdate = true;
  };

  /* ---------- Hover ---------- */

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let handle: SiteModelHandle;
  const describe = (b: number): Omit<HoverInfo, 'x' | 'y'> => {
    if (SRA_IDS.includes(b)) return { id: 'sra', name: `SRA tower ${b + 1}`, levels: '1BHK flats of 32.3 m², 16 a floor', storeys: '22 floors' };
    if (SALE_IDS.includes(b)) return { id: 'saleable', name: `Saleable tower ${b - 3}`, levels: '2BHK flats of 46.1 m², 8 a floor', storeys: '22 floors (assumed)' };
    return { id: 'centre', name: 'Community centre', levels: 'Anganwadi 130 m², community hall 200 m², classrooms', storeys: 'One storey' };
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
    if (!pointer || stage < 2.6 || idea > 0.3) return setHover(-1);
    ndc.set((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(buildings, false)[0];
    if (!hit?.face) return setHover(-1);
    const b = Math.round(B.solid.getAttribute('aBlock').getX(hit.face.a));
    setHover(b <= CENTRE_ID ? b : -1);
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
      paintZones(idea);
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
      fabOn.dispose();
      fabOff.dispose();
      treeMesh.dispose();
      owned.forEach((o) => o.dispose());
      rig.dispose();
    },
  };
  return handle;
}
