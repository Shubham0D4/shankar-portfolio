/**
 * Sales Office – Interior Design: procedural cutaway model (PLAN.md §5, Phase 2:
 * "a fluted-panel Lines wall that ripples under the cursor").
 *
 * Parameters: ./sales-office.data.ts. Readings and assumptions: MODEL_NOTES.md §5.
 *
 * Walls are boxes between traced openings, merged into one mesh; a shader
 * clamps them to a cut height so the roof can come off. Every fluted batten
 * in the office (several thousand) is one instance of one InstancedMesh. The
 * vertex shader sets each flute's bottom and top from its wall's cut pattern
 * (torn band, stepped, full height, arched niche) and its position along the
 * wall, grows the flutes along the wall on scroll, cycles the patterns in the
 * idea model, and pushes a ripple out from the pointer.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedBufferAttribute,
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
  RepeatWrapping,
  RGBADepthPacking,
  SRGBColorSpace,
  ShadowMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRig, TINT } from '../three/rig';
import { prism, rect, type V2 } from './kit/geometry';
import { createBlockUniforms, patchBlocks } from './kit/patch';
import * as D from './sales-office.data';
import type { CamKey, HoverInfo, ModelOptions, SiteModelHandle } from './types';

const DEG = Math.PI / 180;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const C = {
  wall: new Color(0xf1ece3),
  slab: new Color(0xd9cfbf),
  glass: new Color(0xbfd0cf),
  flute: new Color(0xc69560),
  wood: new Color(0xa8703f),
  chair: new Color(0x55504a),
  sofa: new Color(0x8a837a),
  white: new Color(0xe9e5dd),
  plant: new Color(0x7d8b6a),
  paving: new Color(0xb79a82),
  ink: new Color(TINT.charcoal),
  cut: new Color(TINT.terracotta),
};
const KIND: Record<D.Kind, Color> = { wood: C.wood, chair: C.chair, sofa: C.sofa, white: C.white, plant: C.plant };

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

/** A box along a wall line, from u0 to u1, y0 to y1, thickness t. */
function piece(a: V2, b: V2, u0: number, u1: number, y0: number, y1: number, t: number): BufferGeometry {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (b[0] - a[0]) / L;
  const dz = (b[1] - a[1]) / L;
  const g = clean(new BoxGeometry(u1 - u0, y1 - y0, t));
  g.rotateY(Math.atan2(-dz, dx));
  const um = (u0 + u1) / 2;
  g.translate(a[0] + dx * um, (y0 + y1) / 2, a[1] + dz * um);
  return g;
}

/** Walls split round their openings; glass panes as a second list. */
function buildWalls(): { walls: BufferGeometry[]; glass: BufferGeometry[] } {
  const walls: BufferGeometry[] = [];
  const glass: BufferGeometry[] = [];
  for (const w of D.WALLS) {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const e = w.t / 2; // extend past the ends to close corners
    let cursor = -e;
    for (const o of [...(w.openings ?? [])].sort((p, q) => p.u0 - q.u0)) {
      if (o.u0 > cursor) walls.push(piece(w.a, w.b, cursor, o.u0, 0, D.TOP, w.t));
      if (o.y0 > 0.01) walls.push(piece(w.a, w.b, o.u0, o.u1, 0, o.y0, w.t));
      walls.push(piece(w.a, w.b, o.u0, o.u1, o.y1, D.TOP, w.t));
      if (o.glass) glass.push(piece(w.a, w.b, o.u0, o.u1, Math.max(o.y0, D.FLOOR), o.y1, 0.03));
      cursor = o.u1;
    }
    if (cursor < L + e) walls.push(piece(w.a, w.b, cursor, L + e, 0, D.TOP, w.t));
  }
  return { walls, glass };
}

function tileTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ece6dc';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#cfc6b8';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 126, 126);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  // UVs are in metres; one tile is 600 mm.
  t.repeat.set(1 / 0.6, 1 / 0.6);
  return t;
}

/* ---------- Shader patches ---------- */

interface CutUniforms {
  uCut: { value: number };
}

function patchCut(m: Material, u: CutUniforms): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uCut;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y = min(transformed.y, uCut);');
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => prevKey() + 'cut';
}

interface FluteUniforms extends CutUniforms {
  uGrowFacade: { value: number };
  uGrowInterior: { value: number };
  uIdea: { value: number };
  uCycle: { value: number };
  uPtr: { value: Vector3 };
  uPtrOn: { value: number };
  uTime: { value: number };
  uAmp: { value: number };
}

const FLUTE_GLSL = `
attribute float aU;
attribute float aLen;
attribute float aSeg;
attribute float aType;
attribute float aBot;
attribute float aTop;
attribute float aGroup;
uniform float uCut;
uniform float uGrowFacade;
uniform float uGrowInterior;
uniform float uIdea;
uniform float uCycle;
uniform vec3 uPtr;
uniform float uPtrOn;
uniform float uTime;
uniform float uAmp;

float fluteWave(float u, float s) {
  return 0.16 * sin(u * 1.9 + s) + 0.10 * sin(u * 4.7 + 1.3 * s) + 0.06 * sin(u * 10.3 + 2.0);
}

// Bottom and top of one flute segment for a cut pattern.
vec2 fluteRange(float type, float u, float seg, float bot, float top, float L) {
  float H = top - bot;
  if (type < 0.5) {
    // Torn band: lower flutes to about a third, upper from about two thirds.
    if (seg < 0.5) return vec2(bot, bot + H * (0.3 + fluteWave(u, 0.0) / 3.1));
    return vec2(bot + H * (0.6 + fluteWave(u + 7.0, 1.0) / 3.1), top);
  }
  if (type < 1.5) {
    // Stepped: flutes from the floor to steps along the wall (section B–B').
    if (seg < 0.5) return vec2(bot, bot + H * (0.42 + 0.19 * mod(floor(u / 1.3), 3.0)));
    return vec2(top, top);
  }
  if (type < 2.5) {
    if (seg < 0.5) return vec2(bot, top);
    return vec2(top, top);
  }
  // Arched niche.
  float c = L * 0.5;
  float r = min(L * 0.24, 1.2);
  float dx = u - c;
  if (seg < 0.5 && abs(dx) < r) return vec2(bot, bot + H * 0.55 + sqrt(r * r - dx * dx));
  return vec2(bot, bot);
}
`;

function patchFlutes(m: Material, u: FluteUniforms): void {
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${FLUTE_GLSL}`).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec2 r = fluteRange(aType, aU, aSeg, aBot, aTop, aLen);
if (aType < 2.5) {
  // Idea model: cycle torn band → stepped → full height, flute by flute along the wall.
  float p = mod(floor(uCycle), 3.0);
  float q = mod(p + 1.0, 3.0);
  float t = smoothstep(0.0, 1.0, fract(uCycle) * 3.2 - (aU / aLen) * 1.6 - 0.6);
  vec2 rc = mix(fluteRange(p, aU, aSeg, aBot, aTop, aLen), fluteRange(q, aU, aSeg, aBot, aTop, aLen), t);
  r = mix(r, rc, uIdea);
}
// Grow along the wall.
float grow = aGroup < 0.5 ? uGrowFacade : uGrowInterior;
float g = clamp((grow * (aLen + 3.0) - aU) / 3.0, 0.0, 1.0);
float y1 = r.x + (r.y - r.x) * g;
transformed.y = min(mix(r.x, y1, position.y), uCut);
// Ripple out from the pointer, along the flute's own depth.
vec3 base = (instanceMatrix * vec4(0.0, transformed.y, 0.0, 1.0)).xyz;
float d = distance(base, uPtr);
transformed.z += uPtrOn * uAmp * exp(-d * d / 1.6) * (0.6 + 0.4 * sin(d * 7.0 - uTime * 6.0));`,
    );
  };
  m.customProgramCacheKey = () => 'flutes';
}

/* ---------- Camera ---------- */

const CX = D.W_L / 2;
const KEYS: CamKey[] = [
  { az: 192, el: 7, dist: 24, t: [CX, 2.2, D.W_D], fov: 34 },
  { az: 180, el: 72, dist: 28, t: [CX, 0, D.W_D / 2], fov: 34 },
  { az: 205, el: 40, dist: 25, t: [CX, 1, D.W_D / 2], fov: 34 },
  { az: 150, el: 46, dist: 24, t: [CX, 1, D.W_D / 2], fov: 34 },
  { az: 270, el: 3, dist: 8.5, t: [11.5, 1.7, 4.05], fov: 64 },
  { az: 180, el: 4, dist: 4.4, t: [2.73, 1.75, 5.0], fov: 72 },
  { az: 205, el: 54, dist: 26, t: [CX, 0, D.W_D / 2], fov: 34 },
];
const IDEA_KEY: CamKey = { az: 200, el: 26, dist: 27, t: [CX, 1.4, D.W_D / 2 + 1], fov: 34 };

function mixKey(a: CamKey, b: CamKey, f: number): CamKey {
  return {
    fov: lerp(a.fov ?? 34, b.fov ?? 34, f),
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

export async function createSalesOffice(canvas: HTMLCanvasElement, opts: ModelOptions = {}): Promise<SiteModelHandle> {
  const rig = createRig(canvas);
  const { renderer, scene, camera, sun } = rig;
  const coarse = matchMedia('(pointer: coarse)').matches;
  camera.near = 0.1;
  camera.far = 400;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -16;
  sc.right = sc.top = 16;
  sc.near = 1;
  sc.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => (owned.push(x), x);

  const cu: CutUniforms = { uCut: { value: D.TOP } };

  /* Slab, outside paving, ground */
  const e = D.EXT_T / 2;
  const slabGeo = own(paint(prism(rect(-e, -e, D.W_L + e, D.W_D + e), 0, D.FLOOR), C.slab));
  const slabMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  const slab = new Mesh(slabGeo, slabMat);
  slab.receiveShadow = true;
  scene.add(slab);
  const paveGeo = own(
    merge([
      paint(prism(rect(-e, D.W_D + e, D.W_L + 1.6, D.W_D + 1.8), 0, 0.12), C.paving),
      paint(prism(rect(D.W_L + e, -e, D.W_L + 1.6, D.W_D + e), 0, 0.12), C.paving),
      paint(prism(rect(1.6, D.W_D + e, 4.0, D.W_D + 0.9), 0, 0.2), C.slab),
    ]),
  );
  const pave = new Mesh(paveGeo, slabMat);
  pave.receiveShadow = true;
  scene.add(pave);
  const ground = new Mesh(own(new PlaneGeometry(200, 200).rotateX(-Math.PI / 2)), own(new ShadowMaterial({ color: C.ink, opacity: 0.08 })));
  ground.receiveShadow = true;
  scene.add(ground);

  /* Room floors: tiled, one block id per room for hover */
  const bu = createBlockUniforms(D.ROOMS.length + 1);
  const floors: BufferGeometry[] = D.ROOMS.map((r, i) => {
    const [x0, z0, x1, z1] = r.rect;
    const g = new ShapeGeometry(new Shape([new Vector2(x0, -z0), new Vector2(x1, -z0), new Vector2(x1, -z1), new Vector2(x0, -z1)]));
    g.rotateX(-Math.PI / 2);
    g.translate(0, D.FLOOR + (r.id === 'passage' ? 0.003 : 0.008), 0);
    const n = g.getAttribute('position').count;
    g.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(n).fill(i), 1));
    return g;
  });
  const floorGeo = own(mergeGeometries(floors, false)!);
  floors.forEach((g) => g.dispose());
  const tiles = own(tileTexture());
  const floorMat = own(new MeshStandardMaterial({ map: tiles, roughness: 0.85 }));
  patchBlocks(floorMat, bu, { color: true, hoverStrength: 0.75, hoverColor: new Color(0xe9b99c) });
  const floor = new Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  scene.add(floor);

  /* Walls and glass */
  const W = buildWalls();
  const wallGeo = own(paint(merge(W.walls), C.wall));
  const wallMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  patchCut(wallMat, cu);
  const wallDepth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
  patchCut(wallDepth, cu);
  const walls = new Mesh(wallGeo, wallMat);
  walls.customDepthMaterial = wallDepth;
  walls.castShadow = walls.receiveShadow = true;
  scene.add(walls);
  const glassGeo = own(merge(W.glass));
  const glassMat = own(new MeshStandardMaterial({ color: C.glass, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }));
  patchCut(glassMat, cu);
  scene.add(new Mesh(glassGeo, glassMat));
  const edgeGeo = own(new EdgesGeometry(wallGeo, 30));
  const edgeMat = own(new LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.35 }));
  patchCut(edgeMat, cu);
  const edges = new LineSegments(edgeGeo, edgeMat);
  scene.add(edges);

  /* Roof slab (closed box at the start) */
  const roofGeo = own(prism(rect(-e - 0.1, -e - 0.1, D.W_L + e + 0.1, D.W_D + e + 0.1), D.TOP, D.TOP + 0.3));
  const roofMat = own(new MeshStandardMaterial({ color: C.wall, roughness: 0.95, transparent: true }));
  const roof = new Mesh(roofGeo, roofMat);
  roof.castShadow = true;
  scene.add(roof);

  /* Furniture */
  const furn: BufferGeometry[] = D.FURNITURE.map((f) => {
    if (f.k === 'plant') {
      const g = clean(new IcosahedronGeometry(0.32, 0));
      g.scale(1, 1.3, 1);
      g.translate((f.r[0] + f.r[2]) / 2, f.y0 + 0.55, (f.r[1] + f.r[3]) / 2);
      return paint(g, C.plant);
    }
    return paint(prism(rect(...f.r), f.y0, f.y1), KIND[f.k]);
  });
  for (const [x, z] of D.CHAIRS) furn.push(paint(prism(rect(x - 0.24, z - 0.24, x + 0.24, z + 0.24), D.FLOOR, D.FLOOR + 0.5), C.chair));
  const circle = (r: number): V2[] => Array.from({ length: 32 }, (_, i) => [D.ROUND.c[0] + r * Math.cos((i / 32) * Math.PI * 2), D.ROUND.c[1] + r * Math.sin((i / 32) * Math.PI * 2)]);
  furn.push(paint(prism(circle(D.ROUND.r1), D.FLOOR, D.FLOOR + 0.45, [circle(D.ROUND.r0)]), C.sofa));
  const furnGeo = own(merge(furn));
  const furnMat = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, transparent: true, opacity: 0 }));
  const furniture = new Mesh(furnGeo, furnMat);
  furniture.castShadow = furniture.receiveShadow = true;
  scene.add(furniture);

  /* Flutes: one InstancedMesh for every batten in the office */
  const pitch = coarse ? D.FLUTE.pitchCoarse : D.FLUTE.pitch;
  const inst: { m: Matrix4; u: number; len: number; seg: number; type: number; bot: number; top: number; group: number }[] = [];
  D.FLUTES.forEach((w, wi) => {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const dx = (w.b[0] - w.a[0]) / L;
    const dz = (w.b[1] - w.a[1]) / L;
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(w.n[0], w.n[1]));
    for (let u = pitch / 2; u < L; u += pitch) {
      if (w.skip?.some(([s0, s1]) => u > s0 && u < s1)) continue;
      const m = new Matrix4().compose(new Vector3(w.a[0] + dx * u, 0, w.a[1] + dz * u), q, new Vector3(1, 1, 1));
      for (const seg of [0, 1]) inst.push({ m, u, len: L, seg, type: w.pattern, bot: w.bot, top: w.top, group: wi === 0 ? 0 : 1 });
    }
  });
  const fluteGeo = own(new BoxGeometry(D.FLUTE.width, 1, D.FLUTE.depth));
  fluteGeo.translate(0, 0.5, D.FLUTE.depth / 2);
  const attr = (fn: (i: (typeof inst)[number]) => number) => new InstancedBufferAttribute(new Float32Array(inst.map(fn)), 1);
  fluteGeo.setAttribute('aU', attr((i) => i.u));
  fluteGeo.setAttribute('aLen', attr((i) => i.len));
  fluteGeo.setAttribute('aSeg', attr((i) => i.seg));
  fluteGeo.setAttribute('aType', attr((i) => i.type));
  fluteGeo.setAttribute('aBot', attr((i) => i.bot));
  fluteGeo.setAttribute('aTop', attr((i) => i.top));
  fluteGeo.setAttribute('aGroup', attr((i) => i.group));
  const fu: FluteUniforms = {
    uCut: cu.uCut,
    uGrowFacade: { value: 1 },
    uGrowInterior: { value: 0 },
    uIdea: { value: 0 },
    uCycle: { value: 0 },
    uPtr: { value: new Vector3(1e4, 0, 0) },
    uPtrOn: { value: 0 },
    uTime: { value: 0 },
    uAmp: { value: 0.05 },
  };
  const fluteMat = own(new MeshStandardMaterial({ color: C.flute, roughness: 0.7, metalness: 0 }));
  patchFlutes(fluteMat, fu);
  const fluteDepth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
  patchFlutes(fluteDepth, fu);
  const flutes = new InstancedMesh(fluteGeo, fluteMat, inst.length);
  inst.forEach((i, k) => flutes.setMatrixAt(k, i.m));
  flutes.instanceMatrix.needsUpdate = true;
  flutes.frustumCulled = false;
  flutes.castShadow = !coarse;
  flutes.customDepthMaterial = fluteDepth;
  scene.add(flutes);

  /* ---------- State ---------- */

  let stageTarget = 0;
  let stage = 0;
  let ideaTarget = 0;
  let idea = 0;
  let hoverRoom = -1;
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
  let ptrTarget = 0;
  let cycleClock = 0;

  const apply = (time: number) => {
    const s = stage;
    const I = idea;

    // Roof off and walls cut down to +3.4 (stage 0.3 → 1).
    const open = Math.max(smooth(s, 0.3, 1.0), I);
    roofMat.opacity = Math.min(1 - smooth(s, 0.3, 0.75), 1 - I);
    roof.visible = roofMat.opacity > 0.01;
    roof.position.y = smooth(s, 0.3, 0.9) * 6;
    roofMat.depthWrite = roofMat.opacity > 0.9;
    cu.uCut.value = lerp(D.TOP, D.CUT, open);

    fu.uGrowInterior.value = Math.max(smooth(s, 1.4, 2.5), I);
    fu.uIdea.value = I;
    fu.uCycle.value = cycleClock;
    fu.uTime.value = opts.still ? 0 : time / 1000;
    fu.uAmp.value = lerp(0.05, 0.09, I);
    fu.uPtrOn.value += (ptrTarget - fu.uPtrOn.value) * 0.15;

    furnMat.opacity = smooth(s, 2.6, 3.2) * (1 - 0.85 * I);
    furniture.visible = furnMat.opacity > 0.01;
    furnMat.depthWrite = furnMat.opacity > 0.9;
    furniture.castShadow = furnMat.opacity > 0.6;
    edgeMat.opacity = lerp(0.35, 0.15, smooth(s, 2.6, 3.2));

    rig.setSun(150, 52, 60);

    // Hover.
    const range = pinned ?? (hoverRoom >= 0 ? ([hoverRoom, hoverRoom] as [number, number]) : null);
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
    const inside = s > 3.5 && s < 5.5 && I < 0.5;
    const drift = opts.still || opts.debugView ? 0 : Math.sin(time / 9000) * (inside ? 2 : 4);
    const fit = opts.debugView ? 1 : Math.max(1, Math.pow(1.55 / (width / height), 0.85));
    const azR = (k.az + drift + dragAz) * DEG;
    const elR = (opts.debugView ? k.el : Math.max(1, Math.min(85, k.el + dragEl))) * DEG;
    const dist = k.dist * (inside ? 1 : fit);
    camera.position.set(
      k.t[0] + Math.sin(azR) * Math.cos(elR) * dist,
      k.t[1] + Math.sin(elR) * dist,
      k.t[2] - Math.cos(azR) * Math.cos(elR) * dist,
    );
    camera.lookAt(k.t[0], k.t[1], k.t[2]);
    const fov = opts.debugView?.fov ?? k.fov ?? 34;
    const fovFit = inside ? Math.min(90, fov * Math.max(1, Math.pow(1.55 / (width / height), 0.5))) : fov;
    if (Math.abs(camera.fov - fovFit) > 0.01) {
      camera.fov = fovFit;
      camera.updateProjectionMatrix();
    }
  };

  /* ---------- Pointer: room hover and the ripple ---------- */

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let handle: SiteModelHandle;
  const setHover = (b: number) => {
    if (b !== hoverRoom) {
      hoverRoom = b;
      dirty = true;
      canvas.style.cursor = b >= 0 ? 'help' : '';
    }
    if (b < 0 || !pointer) return handle.onHover?.(null);
    const r = D.ROOMS[b];
    const info: Omit<HoverInfo, 'x' | 'y'> = { id: r.id, name: r.name, levels: r.size, storeys: '' };
    handle.onHover?.({ ...info, x: pointer.x, y: pointer.y });
  };
  const pick = () => {
    needsPick = false;
    if (!pointer) {
      ptrTarget = 0;
      return setHover(-1);
    }
    ndc.set((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects([walls, floor], false)[0];
    if (hit) {
      fu.uPtr.value.copy(hit.point);
      ptrTarget = 1;
    } else ptrTarget = 0;
    if (stage < 0.9 || idea > 0.3 || !hit || hit.object !== floor || !hit.face) return setHover(-1);
    setHover(Math.round(floorGeo.getAttribute('aBlock').getX(hit.face.a)));
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
      dragAz = Math.max(-60, Math.min(60, drag.az - (e.clientX - drag.x) * 0.25));
      dragEl = Math.max(-6, Math.min(25, drag.el + (e.clientY - drag.y) * 0.12));
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
    ptrTarget = 0;
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
      if (opts.still) {
        idea = ideaTarget;
        // Reduced motion: show one changed cut pattern instead of cycling.
        cycleClock = ideaTarget ? 1 : 0;
      }
      dirty = true;
    },
    highlight(id) {
      const idx = D.ROOMS.map((r, i) => (r.id === id || (id === 'sales-1' && r.id === 'sales-2') ? i : -1)).filter((i) => i >= 0);
      pinned = idx.length ? [Math.min(...idx), Math.max(...idx)] : null;
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
        idea += Math.sign(ideaTarget - idea) * Math.min(Math.abs(ideaTarget - idea), dt / 1.2);
        moving = true;
      }
      // Pattern cycle: about 3.5 s per pattern while the idea model is on.
      if (!opts.still && idea > 0) {
        cycleClock += dt / 3.5;
        moving = true;
      }
      if (needsPick) pick();
      if (Math.abs(fu.uPtrOn.value - ptrTarget) > 0.01 || fu.uPtrOn.value > 0.01) moving = !opts.still || moving;
      if (hoverMix > 0.005 && hoverMix < 0.995) moving = true;
      const animated = !opts.still && !opts.debugView;
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
      flutes.dispose();
      owned.forEach((o) => o.dispose());
      rig.dispose();
    },
  };
  return handle;
}
