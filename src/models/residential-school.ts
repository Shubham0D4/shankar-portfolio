/**
 * Residential School, Kanoi: procedural site model (PLAN.md §5, Model 1).
 *
 * Parameters: ./residential-school.data.ts. Readings and assumptions:
 * MODEL_NOTES.md §1. Everything is built in code from traced footprints:
 * terrain slab, extruded tiers, parapets, vault, gates, ramps, instanced
 * openings and jali. All blocks share merged geometry, so the whole campus
 * is a handful of draw calls.
 *
 * The story runs on one value, `stage` from 0 to 6 (see STAGES). Idea mode
 * blends towards a contour-layer diagram with run-off and wind.
 */
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RGBADepthPacking,
  SRGBColorSpace,
  ShaderMaterial,
  ShadowMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  EdgesGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRig, sunDirection, TINT } from '../three/rig';
import {
  archGate,
  archOutline,
  barrelVault,
  edgeNormal,
  offsetPoly,
  outlineSegments,
  place,
  pointInPoly,
  polySDF,
  polylineDist,
  prism,
  rect,
  signedArea,
  toWorld,
  parapet,
  type Frame,
  type V2,
} from './kit/geometry';
import { createBlockUniforms, HIDDEN, jaliTexture, patchBlocks } from './kit/patch';
import { createSectionCaps } from './kit/section';
import {
  buildTerrainSlab,
  createTerrainUniforms,
  patchTerrain,
  terrainGLSL,
  terrainY,
  type TerrainSpec,
  type TerrainState,
} from './kit/terrain';
import * as D from './residential-school.data';

import type { CamKey, HoverInfo, Mode, ModelOptions, SiteModelHandle } from './types';
export type { CamKey, HoverInfo, Mode, ModelOptions, SiteModelHandle };

/* ---------- Palette (DESIGN.md) ---------- */

const COL = {
  sandstone: new Color(TINT.sandstone),
  lime: new Color(0xefe8da),
  paving: new Color(0xe4d9c6),
  step: new Color(0xcdb590),
  court: new Color(TINT.court),
  window: new Color(0x4a3f35),
  jali: new Color(0xb89a6c),
  tree: new Color(0x8c8b67),
  water: new Color(0x8ea3a3),
  ink: new Color(TINT.charcoal),
  cut: new Color(TINT.terracotta),
  shade: new Color(0xa88a5e),
};
const FINISH: Record<D.Finish, Color> = {
  sandstone: COL.sandstone,
  lime: COL.lime,
  paving: COL.paving,
  step: COL.step,
  court: COL.court,
};

/* ---------- Small maths ---------- */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

/** Seeded PRNG (mulberry32), so trees land in the same place every load. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sun azimuth (from north, clockwise) and elevation for an hour angle. */
function solar(hourDeg: number, latDeg = D.LATITUDE, declDeg = 0): [number, number] {
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

/* ---------- Site geometry in metres ---------- */

const SITE = D.SITE_PX.map(D.pxToM);
const LAKE = D.LAKE_PX.map(D.pxToM);
const LAKE_C: V2 = LAKE.reduce<V2>((a, p) => [a[0] + p[0] / LAKE.length, a[1] + p[1] / LAKE.length], [0, 0]);

interface PlacedBlock {
  def: D.Block;
  frame: Frame;
  /** Lowest floor or slab level: the block settles and steps with this. */
  level: number;
  /** World footprints of its tiers, for pads, trees and run-off. */
  footprints: V2[][];
}

function blockFrame(b: D.Block): Frame {
  const [x, z] = D.pxToM(b.centerPx);
  return { x, z, rot: b.rotDeg * DEG };
}

/** Local polygon of a tier or slab, centred on the block origin. */
function localPoly(b: D.Block, shape: { rect?: [number, number, number, number]; poly?: V2[] }): V2[] {
  const [W, Dp] = b.size;
  const p = shape.poly ?? rect(...shape.rect!);
  return p.map(([x, z]) => [x - W / 2, z - Dp / 2]);
}

const worldPoly = (f: Frame, p: V2[]): V2[] => p.map(([x, z]) => toWorld(f, x, z));

const AMPH = D.AMPHITHEATRE;
function amphitheatreRings(): { poly: V2[]; top: number }[] {
  const out: { poly: V2[]; top: number }[] = [];
  const a0 = Math.PI; // west
  const a1 = Math.PI * 1.5; // north
  const arcPts = (r: number, rev = false) => {
    const pts: V2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = a0 + ((a1 - a0) * i) / 12;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return rev ? pts.reverse() : pts;
  };
  for (let k = 0; k < AMPH.rings; k++) {
    const r0 = AMPH.inner + k * AMPH.tread;
    out.push({ poly: [...arcPts(r0 + AMPH.tread), ...arcPts(r0, true)], top: AMPH.level + AMPH.rise * (k + 1) });
  }
  return out;
}
const AMPH_LAWN: V2[] = [[0, 0], ...Array.from({ length: 13 }, (_, i): V2 => {
  const a = Math.PI + (Math.PI / 2) * (i / 12);
  return [AMPH.inner * Math.cos(a), AMPH.inner * Math.sin(a)];
})];

function placeBlocks(): PlacedBlock[] {
  return D.BLOCKS.map((def) => {
    const frame = blockFrame(def);
    const footprints = [...def.tiers, ...(def.slabs ?? [])].map((t) => worldPoly(frame, localPoly(def, t)));
    if (def.id === 'amphitheatre') footprints.push(worldPoly(frame, offsetPoly(AMPH_LAWN, AMPH.rings * AMPH.tread)));
    const levels = [
      ...def.tiers.map((t) => t.level),
      ...(def.slabs ?? []).map((s) => Math.min(s.from, s.to ?? s.from)),
      ...(def.id === 'amphitheatre' ? [AMPH.level] : []),
    ];
    return { def, frame, level: Math.min(...levels), footprints };
  });
}

/* ---------- Terrain ---------- */

interface Pad {
  poly: V2[];
  level: number;
  blend: number;
  bbox: [number, number, number, number];
}

function bbox(p: V2[], m: number): [number, number, number, number] {
  let [x0, z0, x1, z1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, z] of p) {
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  }
  return [x0 - m, z0 - m, x1 + m, z1 + m];
}

function buildPads(blocks: PlacedBlock[]): Pad[] {
  const pads: Pad[] = [];
  const add = (poly: V2[], level: number, blend: number) => pads.push({ poly, level, blend, bbox: bbox(poly, blend) });
  // Landscape first, then building tiers, then flat slabs (courts) last, so a
  // sunken court is not filled back in by the building pad around it.
  const sorted = [...blocks].sort((a, c) => Number(!!c.def.landscape) - Number(!!a.def.landscape));
  for (const { def, frame } of sorted) {
    if (def.landscape) for (const s of def.slabs ?? []) add(worldPoly(frame, offsetPoly(localPoly(def, s), 1)), s.from, 5);
    if (def.id === 'amphitheatre') add(worldPoly(frame, offsetPoly(AMPH_LAWN, 7)), AMPH.level, 5);
  }
  for (const { def, frame } of sorted) {
    for (const t of def.tiers) add(worldPoly(frame, offsetPoly(localPoly(def, t), 1.2)), t.level, 5);
  }
  for (const { def, frame } of sorted) {
    if (def.landscape) continue;
    for (const s of def.slabs ?? []) {
      if (s.to !== undefined) continue; // ramps and steps sit on the slope
      add(worldPoly(frame, localPoly(def, s)), s.from, 1.5);
    }
  }
  return pads;
}

function makeElevation(pads: Pad[]) {
  const bank = D.WATER_LEVEL + 0.5;
  return (x: number, z: number): number => {
    let e = D.naturalElevation(x, z);
    // Gentle undulation so the ground is not a ruled surface.
    e += 0.35 * Math.sin(x * 0.11 + z * 0.07) * Math.cos(z * 0.09 - x * 0.05);
    const dl = polySDF(x, z, LAKE);
    if (dl < 18) e = lerp(e, Math.max(e, bank), 1 - smooth(dl, 4, 18));
    if (dl < 3) e = lerp(e, D.LAKE_BED, smooth(-dl, -3, 6));
    for (const p of pads) {
      if (x < p.bbox[0] || x > p.bbox[2] || z < p.bbox[1] || z > p.bbox[3]) continue;
      const d = polySDF(x, z, p.poly);
      if (d < p.blend) e = lerp(e, p.level, 1 - smooth(d, 0, p.blend));
    }
    return e;
  };
}

/** Site-plan texture: site ground, roads, walks and lake bank. */
function sitePlanTexture(spec: TerrainSpec): CanvasTexture {
  const W = spec.x1 - spec.x0;
  const Dm = spec.z1 - spec.z0;
  const cw = 2048;
  const ch = Math.round((cw * Dm) / W);
  const k = cw / W;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d')!;
  const X = (x: number) => (x - spec.x0) * k;
  const Z = (z: number) => (z - spec.z0) * k;
  const path = (pts: V2[], close = true) => {
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    if (close) g.closePath();
  };
  g.fillStyle = '#e9e2d4';
  g.fillRect(0, 0, cw, ch);
  path(SITE);
  g.fillStyle = '#f3eee4';
  g.fill();
  g.lineCap = g.lineJoin = 'round';
  for (const r of D.ROADS_PX) {
    path(r.pts.map(D.pxToM), !!r.closed);
    g.strokeStyle = r.kind === 'road' ? '#c2b8a8' : '#ddd2bf';
    g.lineWidth = r.width * k;
    g.stroke();
  }
  path(offsetPoly(LAKE, 3));
  g.strokeStyle = '#d9cdb7';
  g.lineWidth = 4 * k;
  g.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Blocks: solids, edges, openings ---------- */

interface Built {
  built: BufferGeometry;
  courts: BufferGeometry;
  edges: BufferGeometry;
  windows: { pos: Vector3; rot: number; block: number }[];
  arcades: { pos: Vector3; rot: number; block: number }[];
  jali: BufferGeometry;
}

function tag(g: BufferGeometry, block: number, color: Color): BufferGeometry {
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('aBlock', new Float32BufferAttribute(new Float32Array(n).fill(block), 1));
  return g;
}

const faceOf = ([nx, nz]: V2): D.Face => (Math.abs(nx) >= Math.abs(nz) ? (nx > 0 ? 'e' : 'w') : nz > 0 ? 's' : 'n');

/** `datum`: model y of elevation 0 m (terrain base − eMin). */
function buildBlocks(blocks: PlacedBlock[], datum: number): Built {
  const built: BufferGeometry[] = [];
  const courts: BufferGeometry[] = [];
  const edgePos: number[] = [];
  const edgeBlock: number[] = [];
  const windows: Built['windows'] = [];
  const arcades: Built['arcades'] = [];
  const jPos: number[] = [];
  const jUv: number[] = [];
  const jNor: number[] = [];
  const jBlock: number[] = [];

  const addEdges = (g: BufferGeometry, block: number) => {
    const e = new EdgesGeometry(g, 28);
    const p = e.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      edgePos.push(p.getX(i), p.getY(i), p.getZ(i));
      edgeBlock.push(block);
    }
    e.dispose();
  };
  const addSolid = (g: BufferGeometry, block: number, finish: D.Finish, edges = true) => {
    tag(g, block, FINISH[finish]);
    (finish === 'court' ? courts : built).push(g);
    if (edges) addEdges(g, block);
  };

  blocks.forEach(({ def, frame }, bi) => {
    const W = def.size[0];
    const Dp = def.size[1];

    for (const t of def.tiers) {
      const lp = localPoly(def, t);
      const h = t.height ?? (t.floors ?? 1) * D.FLOOR_H;
      const xs = lp.map((p) => p[0]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const top = t.mono
        ? (x: number) => t.level + lerp(t.mono![0], t.mono![1], (x - x0) / (x1 - x0))
        : t.level + h;
      const finish = t.finish ?? 'sandstone';
      addSolid(place(prism(lp, t.level - 1.5, top), frame), bi, finish);
      if (!t.mono && t.parapet !== false) addSolid(place(parapet(lp, t.level + h, t.level + h + D.PARAPET_H), frame), bi, finish);

      // Floor bands as drawn lines.
      const wp = worldPoly(frame, lp);
      const floors = t.floors ?? 1;
      for (let f = 1; f < floors; f++) {
        const before = edgePos.length;
        outlineSegments(wp, t.level + f * D.FLOOR_H, edgePos);
        for (let k = before; k < edgePos.length; k += 3) edgeBlock.push(bi);
      }

      // Openings, edge by edge in local orientation.
      const o = t.openings;
      if (!o) continue;
      const ring = signedArea(lp) >= 0 ? lp : [...lp].reverse();
      const rows = t.mono ? 1 : (t.floors ?? Math.max(1, Math.floor(h / D.FLOOR_H)));
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 2.4) continue;
        const n = edgeNormal(ring, i);
        const face = faceOf(n);
        const rot = frame.rot + Math.atan2(n[0], n[1]);
        for (let f = 0; f < rows; f++) {
          const isArcade = !!(o.arcade?.includes(face) || (o.arcadeTop?.includes(face) && f === rows - 1));
          if (!isArcade && (!o.windows || o.blind?.includes(face))) continue;
          const bay = isArcade ? 3.2 : 3.6;
          const sill = isArcade ? 0.25 : 0.9;
          const oh = isArcade ? 2.9 : 2.1;
          const y = t.level + f * D.FLOOR_H + sill;
          const wallTop = t.mono ? t.level + Math.min(...t.mono) : t.level + h;
          if (y + oh > wallTop - 0.2) continue;
          const count = Math.max(1, Math.floor(L / bay));
          for (let k = 0; k < count; k++) {
            const s = (k + 0.5) / count;
            const lx = a[0] + (b[0] - a[0]) * s + n[0] * 0.04;
            const lz = a[1] + (b[1] - a[1]) * s + n[1] * 0.04;
            const [wx, wz] = toWorld(frame, lx, lz);
            (isArcade ? arcades : windows).push({ pos: new Vector3(wx, y, wz), rot, block: bi });
          }
        }
      }
    }

    for (const s of def.slabs ?? []) {
      const lp = localPoly(def, s);
      const finish = s.finish ?? 'paving';
      const lo = Math.min(s.from, s.to ?? s.from);
      const bottom = lo - (s.thickness ?? 1.5);
      if (s.steps && s.to !== undefined && s.rect) {
        const [rx0, rz0, rx1, rz1] = s.rect;
        for (let k = 0; k < s.steps; k++) {
          const u0 = k / s.steps;
          const u1 = (k + 1) / s.steps;
          const r: [number, number, number, number] =
            s.axis === 'z'
              ? [rx0, lerp(rz0, rz1, u0), rx1, lerp(rz0, rz1, u1)]
              : [lerp(rx0, rx1, u0), rz0, lerp(rx0, rx1, u1), rz1];
          const topK = lerp(s.from, s.to, k / s.steps);
          addSolid(place(prism(localPoly(def, { rect: r }), bottom, topK), frame), bi, finish);
        }
        continue;
      }
      // Flat slabs stand 12 cm proud of their pad so they never z-fight the ground.
      let top: number | ((x: number, z: number) => number) = s.from + 0.12;
      if (s.to !== undefined) {
        const ax = s.axis === 'z' ? 1 : 0;
        const vals = lp.map((p) => p[ax]);
        const v0 = Math.min(...vals);
        const v1 = Math.max(...vals);
        top = (x: number, z: number) => lerp(s.from, s.to!, ((ax ? z : x) - v0) / (v1 - v0));
      }
      addSolid(place(prism(lp, bottom, top), frame), bi, finish);
    }

    for (const gt of def.gates ?? []) {
      const g = archGate(gt.span, gt.height, gt.archH, gt.pier, gt.depth);
      g.translate(-(gt.span + 2 * gt.pier) / 2, 0, 0);
      g.rotateY(gt.angle * DEG);
      g.translate(gt.at[0] - W / 2, gt.level - 0.8, gt.at[1] - Dp / 2);
      addSolid(place(g, frame), bi, gt.finish ?? 'sandstone');
    }

    for (const v of def.vaults ?? []) {
      const [vx0, vz0, vx1, vz1] = v.rect;
      const g = barrelVault(vx1 - vx0, v.rise, 0.3, vz1 - vz0);
      g.translate(vx0 - W / 2, v.y, vz0 - Dp / 2);
      addSolid(place(g, frame), bi, 'sandstone');
    }

    for (const j of def.jalis ?? []) {
      const [ax, az] = toWorld(frame, j.a[0] - W / 2, j.a[1] - Dp / 2);
      const [bx, bz] = toWorld(frame, j.b[0] - W / 2, j.b[1] - Dp / 2);
      const L = Math.hypot(bx - ax, bz - az);
      const hgt = j.y1 - j.y0;
      const nx = -(bz - az) / L;
      const nz = (bx - ax) / L;
      const v = [
        [ax, j.y0, az, 0, 0],
        [bx, j.y0, bz, L, 0],
        [bx, j.y1, bz, L, hgt],
        [ax, j.y1, az, 0, hgt],
      ];
      for (const idx of [0, 1, 2, 0, 2, 3]) {
        const [x, y, z, u, w] = v[idx];
        jPos.push(x, y, z);
        jUv.push(u, w);
        jNor.push(nx, 0, nz);
        jBlock.push(bi);
      }
    }

    if (def.id === 'amphitheatre') {
      const lawn = prism(AMPH_LAWN, AMPH.level - 1.2, AMPH.level + 0.05);
      addSolid(place(lawn, frame), bi, 'court');
      for (const r of amphitheatreRings()) addSolid(place(prism(r.poly, AMPH.level - 1.2, r.top), frame), bi, 'step');
    }
  });

  const edges = new BufferGeometry();
  edges.setAttribute('position', new Float32BufferAttribute(edgePos, 3));
  edges.setAttribute('aBlock', new Float32BufferAttribute(edgeBlock, 1));
  const jali = new BufferGeometry();
  jali.setAttribute('position', new Float32BufferAttribute(jPos, 3));
  jali.setAttribute('normal', new Float32BufferAttribute(jNor, 3));
  jali.setAttribute('uv', new Float32BufferAttribute(jUv, 2));
  jali.setAttribute('aBlock', new Float32BufferAttribute(jBlock, 1));

  const merge = (list: BufferGeometry[]) => {
    const m = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!m) throw new Error('Could not merge block geometry');
    return m.translate(0, datum, 0);
  };
  // Blocks are drawn at absolute elevations; shift them onto the model's datum.
  edges.translate(0, datum, 0);
  jali.translate(0, datum, 0);
  for (const o of [...windows, ...arcades]) o.pos.y += datum;
  return { built: merge(built), courts: merge(courts), edges, windows, arcades, jali };
}

/* ---------- Trees, run-off, wind ---------- */

function scatterTrees(blocks: PlacedBlock[], elev: (x: number, z: number) => number, count: number) {
  const rand = rng(2273);
  const roads = D.ROADS_PX.map((r) => ({ pts: (r.closed ? [...r.pts, r.pts[0]] : r.pts).map(D.pxToM), w: r.width }));
  const foot = blocks.flatMap((b) => b.footprints).map((p) => ({ p, bb: bbox(p, 4) }));
  const out: { x: number; z: number; e: number; s: number; h: number }[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const x = lerp(-140, 142, rand());
    const z = lerp(-123, 121, rand());
    if (!pointInPoly(x, z, SITE) || polySDF(x, z, SITE) > -3) continue;
    if (polySDF(x, z, LAKE) < 5) continue;
    if (roads.some((r) => polylineDist(x, z, r.pts) < r.w / 2 + 2.5)) continue;
    if (foot.some(({ p, bb }) => x > bb[0] && x < bb[2] && z > bb[1] && z < bb[3] && polySDF(x, z, p) < 3.5)) continue;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 5)) continue;
    const s = 1.3 + rand() * 0.9;
    out.push({ x, z, e: elev(x, z), s, h: s * (1.05 + rand() * 0.35) });
  }
  return out;
}

/** Steepest-descent run-off lines through the gaps between blocks to the lake. */
function runoffLines(blocks: PlacedBlock[], elev: (x: number, z: number) => number) {
  const polys = blocks.filter((b) => !b.def.landscape).flatMap((b) => b.footprints).map((p) => ({ p, bb: bbox(p, 10) }));
  const lines: { x: number; z: number; e: number }[][] = [];
  const h = 1;
  for (let sz = -105; sz <= 105; sz += 15) {
    for (let sx = -135; sx <= 10; sx += 18) {
      const x0 = sx + ((sz * 7) % 9);
      const z0 = sz;
      if (!pointInPoly(x0, z0, SITE) || D.naturalElevation(x0, z0) < 157) continue;
      if (polys.some(({ p }) => polySDF(x0, z0, p) < 4)) continue;
      let x = x0;
      let z = z0;
      const pts: { x: number; z: number; e: number }[] = [];
      for (let step = 0; step < 260; step++) {
        pts.push({ x, z, e: elev(x, z) });
        if (polySDF(x, z, LAKE) < -2 || !pointInPoly(x, z, SITE)) break;
        let gx = -(D.naturalElevation(x + h, z) - D.naturalElevation(x - h, z));
        let gz = -(D.naturalElevation(x, z + h) - D.naturalElevation(x, z - h));
        const gl = Math.hypot(gx, gz) || 1;
        gx /= gl;
        gz /= gl;
        // Drawn toward the lake as the ground funnels into it.
        const lx = LAKE_C[0] - x;
        const lz = LAKE_C[1] - z;
        const ll = Math.hypot(lx, lz) || 1;
        const pull = 0.9 + 0.6 * smooth(160 - ll, 0, 120);
        gx += (lx / ll) * pull;
        gz += (lz / ll) * pull;
        // Pushed round building footprints, through the gaps between them.
        for (const { p, bb } of polys) {
          if (x < bb[0] || x > bb[2] || z < bb[1] || z > bb[3]) continue;
          const d = polySDF(x, z, p);
          if (d > 7) continue;
          const dx = polySDF(x + h, z, p) - polySDF(x - h, z, p);
          const dz = polySDF(x, z + h, p) - polySDF(x, z - h, p);
          const dl = Math.hypot(dx, dz) || 1;
          const push = (7 - d) / 7;
          gx += (dx / dl) * push * 2.2;
          gz += (dz / dl) * push * 2.2;
        }
        const l = Math.hypot(gx, gz) || 1;
        x += (gx / l) * 2;
        z += (gz / l) * 2;
      }
      const last = pts[pts.length - 1];
      if (pts.length > 12 && polySDF(last.x, last.z, LAKE) < 0) lines.push(pts);
    }
  }
  return lines;
}

/* ---------- Camera keyframes ---------- */

const SECTION_ROT = D.SECTION.angleDeg * DEG;
/** Unit normal pointing to the kept (north) side of the cut. */
const SECTION_KEEP: V2 = [-Math.sin(SECTION_ROT), -Math.cos(SECTION_ROT)];
const SECTION_P0 = D.pxToM(D.SECTION.throughPx);
/** Camera azimuth looking straight at the cut face from the removed side. */
const SECTION_AZ = Math.atan2(-SECTION_KEEP[0], SECTION_KEEP[1]) / DEG;

const KEYS: CamKey[] = [
  { az: 168, el: 66, dist: 560, t: [0, 6, -2] },
  { az: 152, el: 36, dist: 520, t: [0, 10, 0] },
  { az: 140, el: 31, dist: 480, t: [-12, 12, -8] },
  { az: 128, el: 28, dist: 430, t: [-22, 14, -12] },
  { az: 142, el: 21, dist: 300, t: [-48, 18, -18] },
  { az: SECTION_AZ, el: 13, dist: 285, t: [-30, 19, -25] },
  { az: 205, el: 40, dist: 520, t: [4, 8, 0] },
];
const IDEA_KEY: CamKey = { az: 140, el: 34, dist: 540, t: [0, 18, -4] };

function camAt(stage: number): CamKey {
  const i = Math.min(Math.floor(stage), KEYS.length - 2);
  const f = smooth(stage - i, 0, 1);
  const a = KEYS[i];
  const b = KEYS[i + 1];
  return {
    az: lerp(a.az, b.az, f),
    el: lerp(a.el, b.el, f),
    dist: lerp(a.dist, b.dist, f),
    t: [lerp(a.t[0], b.t[0], f), lerp(a.t[1], b.t[1], f), lerp(a.t[2], b.t[2], f)],
  };
}

const mixKey = (a: CamKey, b: CamKey, f: number): CamKey => ({
  az: lerp(a.az, b.az, f),
  el: lerp(a.el, b.el, f),
  dist: lerp(a.dist, b.dist, f),
  t: [lerp(a.t[0], b.t[0], f), lerp(a.t[1], b.t[1], f), lerp(a.t[2], b.t[2], f)],
});

/* ---------- Scene ---------- */

export async function createResidentialSchool(canvas: HTMLCanvasElement, opts: ModelOptions = {}): Promise<SiteModelHandle> {
  const rig = createRig(canvas, { stencil: true });
  const { renderer, scene, camera, sun } = rig;
  renderer.localClippingEnabled = true;
  camera.near = 2;
  camera.far = 4000;
  if (opts.debugView?.fov) {
    camera.fov = opts.debugView.fov;
    // Telephoto (near-orthographic) views sit kilometres away.
    if (camera.fov < 10) {
      camera.far = 30000;
      camera.near = 100;
    }
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cam = sun.shadow.camera;
  cam.left = cam.bottom = -200;
  cam.right = cam.top = 200;
  cam.near = 10;
  cam.far = 1400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.5;

  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  /* Data → geometry */
  const blocks = placeBlocks();
  const pads = buildPads(blocks);
  const elev = makeElevation(pads);
  // Coarser ground grid on touch devices: the terrain is most of the triangle count.
  const spec: TerrainSpec = { ...D.TERRAIN, cell: coarse ? 2.5 : D.TERRAIN.cell, elev };
  const FINAL: TerrainState = { rise: 1, step: 0, explode: 0 };

  // Section plane (parked far south until the cut stage).
  const plane = new Plane(new Vector3(SECTION_KEEP[0], 0, SECTION_KEEP[1]), 0);
  const setPlaneOffset = (offset: number) => {
    const px = SECTION_P0[0] - SECTION_KEEP[0] * offset;
    const pz = SECTION_P0[1] - SECTION_KEEP[1] * offset;
    plane.constant = -(SECTION_KEEP[0] * px + SECTION_KEEP[1] * pz);
  };
  setPlaneOffset(400);
  const clip = [plane];

  /* Terrain */
  const tu = createTerrainUniforms();
  const terrainGeo = own(buildTerrainSlab(spec));
  const planTex = own(sitePlanTexture(spec));
  const terrainMat = own(new MeshStandardMaterial({ map: planTex, roughness: 1, metalness: 0, flatShading: true, clippingPlanes: clip }));
  patchTerrain(terrainMat, spec, tu);
  const terrain = new Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = true; // so shadows stop at the plinth, not on the floor below
  const terrainDepth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking, clippingPlanes: clip }));
  patchTerrain(terrainDepth, spec, tu, false);
  terrain.customDepthMaterial = terrainDepth;
  terrain.renderOrder = 10;
  scene.add(terrain);

  /* Water */
  const lakeShape = new Shape(LAKE.map(([x, z]) => new Vector2(x, -z)));
  const waterGeo = own(new ShapeGeometry(lakeShape, 4).rotateX(-Math.PI / 2));
  const waterMat = own(new MeshStandardMaterial({ color: COL.water, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.92, clippingPlanes: clip }));
  const water = new Mesh(waterGeo, waterMat);
  water.receiveShadow = true;
  water.renderOrder = 11;
  scene.add(water);

  /* Blocks */
  const bu = createBlockUniforms(blocks.length);
  const lift = bu.uLift.value;
  const parts = buildBlocks(blocks, spec.base - spec.eMin);
  own(parts.built);
  own(parts.courts);
  own(parts.edges);
  own(parts.jali);

  const blockMat = (tint: boolean) => {
    const m = own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, transparent: true, clippingPlanes: clip, clipShadows: true }));
    patchBlocks(m, bu, { color: true, tint, hoverStrength: 0.7, hoverColor: new Color(0xfbf3e2) });
    return m;
  };
  const depthMat = () => {
    const m = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking, clippingPlanes: clip }));
    patchBlocks(m, bu);
    return m;
  };
  const builtMat = blockMat(true);
  const builtMesh = new Mesh(parts.built, builtMat);
  builtMesh.customDepthMaterial = depthMat();
  builtMesh.castShadow = builtMesh.receiveShadow = true;
  builtMesh.renderOrder = 20;
  const courtMat = blockMat(false);
  const courtMesh = new Mesh(parts.courts, courtMat);
  courtMesh.customDepthMaterial = depthMat();
  courtMesh.receiveShadow = true;
  courtMesh.renderOrder = 19;
  for (const m of [builtMesh, courtMesh]) m.frustumCulled = false;
  scene.add(courtMesh, builtMesh);

  const edgeMat = own(new LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 1, clippingPlanes: clip }));
  patchBlocks(edgeMat, bu, { color: true, hoverColor: COL.cut });
  const edgeLines = new LineSegments(parts.edges, edgeMat);
  edgeLines.frustumCulled = false;
  edgeLines.renderOrder = 21;
  scene.add(edgeLines);

  /* Openings: two instanced meshes for every window and arcade in the campus */
  const openingMat = own(new MeshStandardMaterial({ color: COL.window, roughness: 1, metalness: 0, transparent: true, clippingPlanes: clip }));
  patchBlocks(openingMat, bu);
  const makeOpenings = (list: Built['windows'], w: number, h: number) => {
    const shape = new Shape(archOutline(0, 0, w, h, 8).map(([u, v]) => new Vector2(u, v)));
    const geo = own(new ShapeGeometry(shape, 6));
    geo.setAttribute('aBlock', new InstancedBufferAttribute(new Float32Array(list.map((o) => o.block)), 1));
    const mesh = new InstancedMesh(geo, openingMat, list.length);
    const m = new Matrix4();
    const q = new Quaternion();
    const one = new Vector3(1, 1, 1);
    const up = new Vector3(0, 1, 0);
    list.forEach((o, i) => mesh.setMatrixAt(i, m.compose(o.pos, q.setFromAxisAngle(up, o.rot), one)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 22;
    return mesh;
  };
  const windowMesh = makeOpenings(parts.windows, 1.2, 2.1);
  const arcadeMesh = makeOpenings(parts.arcades, 2.6, 2.9);
  scene.add(windowMesh, arcadeMesh);

  const jTex = own(jaliTexture(4, 0.56));
  const jaliMat = own(new MeshStandardMaterial({ color: COL.jali, map: jTex, alphaTest: 0.5, side: DoubleSide, roughness: 1, transparent: true, clippingPlanes: clip }));
  patchBlocks(jaliMat, bu);
  const jaliMesh = new Mesh(parts.jali, jaliMat);
  jaliMesh.frustumCulled = false;
  jaliMesh.renderOrder = 23;
  scene.add(jaliMesh);

  /* Trees */
  const trees = scatterTrees(blocks, elev, coarse ? 140 : 210);
  const treeGeo = own(new IcosahedronGeometry(1, 0));
  const treeMat = own(new MeshStandardMaterial({ color: COL.tree, roughness: 1, flatShading: true, transparent: true, clippingPlanes: clip, clipShadows: true }));
  const treeMesh = new InstancedMesh(treeGeo, treeMat, trees.length);
  {
    const m = new Matrix4();
    const q = new Quaternion();
    trees.forEach((t, i) => {
      const y = terrainY(spec, t.e, FINAL) + t.h * 0.85;
      q.setFromAxisAngle(new Vector3(0, 1, 0), i * 1.7);
      treeMesh.setMatrixAt(i, m.compose(new Vector3(t.x, y, t.z), q, new Vector3(t.s, t.h, t.s)));
    });
  }
  treeMesh.castShadow = true;
  treeMesh.renderOrder = 24;
  scene.add(treeMesh);

  /* Ground: the page shows through; only the model's shadow lands on it */
  const groundGeo = own(new PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2));
  const groundMat = own(new ShadowMaterial({ color: COL.ink, opacity: 0.07 }));
  const ground = new Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // Context: the roads that leave the site, faint on the ground.
  const ctxGeo = own(new BufferGeometry());
  ctxGeo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        ...[D.pxToM([905, 1740]), [-60, 520] as V2],
        ...[D.pxToM([870, 40]), [-40, -520] as V2],
        ...[D.pxToM([1940, 1080]), [560, 120] as V2],
        ...[D.pxToM([30, 740]), [-560, -40] as V2],
      ].flatMap(([x, z]) => [x, 0.05, z]),
      3,
    ),
  );
  const ctxMat = own(new LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.16 }));
  scene.add(new LineSegments(ctxGeo, ctxMat));

  /* Section caps: black ground, sandstone cut through buildings */
  const capPatch = (m: Material) => patchBlocks(m, bu);
  const terrainCapPatch = (m: Material) => patchTerrain(m, spec, tu, false);
  const caps = createSectionCaps(plane, [
    { geometry: terrainGeo, color: TINT.charcoal, patch: terrainCapPatch },
    { geometry: parts.built, color: 0xa88a5e, patch: capPatch },
  ]);
  caps.group.visible = false;
  scene.add(caps.group);

  /* Idea layer: run-off, wind, sun path */
  const runoff = runoffLines(blocks, elev);
  // Ribbons 1.6 m wide, so the run-off reads at site scale (GL lines are 1 px).
  const rPos: number[] = [];
  const rElev: number[] = [];
  const rDist: number[] = [];
  for (const line of runoff) {
    let dist = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const seg = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const px = (-(b.z - a.z) / seg) * 0.8;
      const pz = ((b.x - a.x) / seg) * 0.8;
      const quad = [
        [a.x - px, a.z - pz, a.e, dist],
        [a.x + px, a.z + pz, a.e, dist],
        [b.x + px, b.z + pz, b.e, dist + seg],
        [b.x - px, b.z - pz, b.e, dist + seg],
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [x, z, e, d] = quad[k];
        rPos.push(x, 0, z);
        rElev.push(e);
        rDist.push(d);
      }
      dist += seg;
    }
  }
  const runoffGeo = own(new BufferGeometry());
  runoffGeo.setAttribute('position', new Float32BufferAttribute(rPos, 3));
  runoffGeo.setAttribute('aElev', new Float32BufferAttribute(rElev, 1));
  runoffGeo.setAttribute('aDist', new Float32BufferAttribute(rDist, 1));
  const runoffMat = own(
    new ShaderMaterial({
      uniforms: { ...tu, uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new Color(0x2f6680) } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: `
attribute float aElev;
attribute float aDist;
varying float vDist;
${terrainGLSL(spec)}
void main() {
  vDist = aDist;
  vec3 p = vec3(position.x, terrainY(aElev) + 0.9, position.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`,
      fragmentShader: `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying float vDist;
void main() {
  float d = fract((vDist - uTime * 7.0) / 9.0);
  float dash = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.5, 0.6, d));
  gl_FragColor = vec4(uColor, uOpacity * (0.35 + 0.65 * dash));
  #include <colorspace_fragment>
}`,
    }),
  );
  const runoffLinesMesh = new Mesh(runoffGeo, runoffMat);
  runoffLinesMesh.frustumCulled = false;
  runoffLinesMesh.renderOrder = 30;
  runoffLinesMesh.visible = false;
  scene.add(runoffLinesMesh);

  // Wind: three flat arrows from the south-west, as on the p10 diagram.
  const windGeo = (() => {
    const arrow = (off: number) => {
      const s = new Shape();
      const L = 90;
      const w = 1.6;
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
    const g = new ShapeGeometry([arrow(-22), arrow(0), arrow(22)]);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 4); // point north-east
    return own(g);
  })();
  const windMat = own(new MeshBasicMaterial({ color: COL.ink, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }));
  const wind = new Mesh(windGeo, windMat);
  wind.position.set(-30, 62, 10);
  wind.visible = false;
  scene.add(wind);

  // Sun path arc (equinox) and a sun marker.
  const ARC_R = 260;
  const arcPts: number[] = [];
  const tmp = new Vector3();
  for (let H = -90; H <= 90; H += 3) {
    const [az, el] = solar(H);
    sunDirection(az, el, tmp).multiplyScalar(ARC_R);
    arcPts.push(tmp.x, tmp.y, tmp.z);
  }
  const arcGeo = own(new BufferGeometry());
  arcGeo.setAttribute('position', new Float32BufferAttribute(arcPts, 3));
  const arcMat = own(new LineBasicMaterial({ color: COL.shade, transparent: true, opacity: 0 }));
  const arcLine = new Line(arcGeo, arcMat);
  const sunGeo = own(new SphereGeometry(5, 16, 12));
  const sunMat = own(new MeshBasicMaterial({ color: 0xf6e7c1, transparent: true, opacity: 0 }));
  const sunDot = new Mesh(sunGeo, sunMat);
  const sunGroup = new Object3D();
  sunGroup.add(arcLine, sunDot);
  sunGroup.visible = false;
  scene.add(sunGroup);

  /* Story order: blocks settle lowest first */
  const settleOrder = blocks
    .map((b, i) => ({ i, level: b.level, land: !!b.def.landscape }))
    .sort((a, b) => Number(b.land) - Number(a.land) || a.level - b.level)
    .map((o) => o.i);
  const settleRank = new Array<number>(blocks.length);
  settleOrder.forEach((bi, rank) => (settleRank[bi] = rank));

  /* ---------- State ---------- */

  let stageTarget = 0;
  let stage = 0;
  let ideaTarget = 0;
  let idea = 0;
  let hoverIndex = -1;
  let pinnedIndex = -1;
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
  const ts: TerrainState = { rise: 1, step: 0, explode: 0 };

  const apply = (time: number) => {
    const s = stage;
    const I = idea;

    // Terrain.
    ts.rise = lerp(smooth(s, 0.25, 1), 1, I);
    ts.step = I;
    ts.explode = 2.6 * I;
    tu.uRise.value = ts.rise;
    tu.uStep.value = ts.step;
    tu.uExplode.value = ts.explode;
    tu.uBands.value = Math.max(smooth(s, 0.3, 1), I);
    tu.uLines.value = Math.max(smooth(s, 0.35, 1) * (1 - 0.55 * smooth(s, 2.4, 3.2)), I);
    water.position.y = terrainY(spec, D.WATER_LEVEL, ts) + 0.3;

    // Blocks settle (stage 1.15 → 2.1), lowest first; idea mode shows all.
    const n = blocks.length;
    for (let bi = 0; bi < n; bi++) {
      const start = 1.15 + (settleRank[bi] / n) * 0.65;
      const t = Math.max(clamp01((s - start) / 0.28), I);
      const ground = terrainY(spec, blocks[bi].level, ts) - terrainY(spec, blocks[bi].level, FINAL);
      if (t <= 0) lift[bi] = HIDDEN;
      else {
        const e = 1 - Math.pow(1 - t, 3);
        lift[bi] = ground + (1 - e) * 46;
      }
    }

    const mass = Math.max(smooth(s, 2.2, 3.0), I);
    const facade = smooth(s, 3.1, 3.8) * (1 - I);
    builtMat.opacity = courtMat.opacity = mass;
    builtMesh.visible = courtMesh.visible = mass > 0.01;
    builtMesh.castShadow = mass > 0.6;
    builtMat.depthWrite = courtMat.depthWrite = mass > 0.5;
    edgeMat.opacity = lerp(s < 2.2 ? 1 : lerp(1, 0.28, smooth(s, 2.2, 3.0)), 0.55, I);
    edgeLines.visible = s > 1.1 || I > 0;
    bu.uTintMix.value = 0.72 * I;

    openingMat.opacity = facade;
    jaliMat.opacity = facade;
    windowMesh.visible = arcadeMesh.visible = jaliMesh.visible = facade > 0.01;
    treeMat.opacity = facade;
    treeMesh.visible = facade > 0.01;
    treeMesh.castShadow = facade > 0.6;

    // Sun: morning by default, sweeps across during stage 4, back for the campus.
    const sweep = smooth(s, 3.4, 4.6);
    const back = smooth(s, 5.3, 6);
    const H = lerp(lerp(-42, 55, sweep), -42, back);
    const [az, el] = I > 0 ? solar(lerp(H, -35, I)) : solar(H);
    rig.setSun(az, el, 600);
    const showArc = Math.max(smooth(s, 3.3, 3.7) * (1 - smooth(s, 4.6, 5.0)), I);
    sunGroup.visible = showArc > 0.01;
    arcMat.opacity = 0.75 * showArc;
    sunMat.opacity = showArc;
    sunDirection(az, el, sunDot.position).multiplyScalar(ARC_R);

    // Section X–X′: slides in from the south, then lifts away for the campus view.
    const cut = smooth(s, 4.3, 5.0) * (1 - smooth(s, 5.3, 5.9)) * (1 - I);
    setPlaneOffset(lerp(260, D.SECTION.offset, cut));
    caps.group.visible = cut > 0.01;
    caps.update();

    // Idea layer.
    runoffLinesMesh.visible = I > 0.01;
    (runoffMat.uniforms.uOpacity as { value: number }).value = I * 0.95;
    (runoffMat.uniforms.uTime as { value: number }).value = opts.still ? 0 : time / 1000;
    wind.visible = I > 0.01;
    windMat.opacity = 0.42 * I;
    const bob = opts.still ? 0 : Math.sin(time / 1600) * 4;
    wind.position.set(-30 + bob, 62 + ts.explode * 7, 10 - bob);

    // Hover.
    const target = pinnedIndex >= 0 ? pinnedIndex : hoverIndex;
    if (target >= 0) bu.uHover.value = target;
    hoverMix += ((target >= 0 ? 1 : 0) - hoverMix) * 0.25;
    if (hoverMix < 0.01 && target < 0) bu.uHover.value = -1;
    bu.uHoverMix.value = hoverMix;

    // Camera.
    let k = camAt(s);
    if (I > 0) k = mixKey(k, IDEA_KEY, smooth(I, 0, 1));
    if (opts.debugView) k = opts.debugView;
    const drift = opts.still ? 0 : Math.sin(time / 9000) * 5;
    const driftEl = opts.still ? 0 : Math.sin(time / 13000) * 1.5;
    const aspect = width / height;
    const fit = opts.debugView ? 1 : Math.max(1, Math.pow(1.55 / aspect, 0.85));
    const azR = (k.az + drift + dragAz) * DEG;
    const elR = Math.max(4, Math.min(80, k.el + driftEl + dragEl)) * DEG;
    const dist = k.dist * fit;
    camera.position.set(
      k.t[0] + Math.sin(azR) * Math.cos(elR) * dist,
      k.t[1] + Math.sin(elR) * dist,
      k.t[2] - Math.cos(azR) * Math.cos(elR) * dist,
    );
    camera.lookAt(k.t[0], k.t[1], k.t[2]);
  };

  /* ---------- Interaction ---------- */

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const pick = () => {
    needsPick = false;
    if (!pointer || stage < 2.6 || idea > 0.3) return setHover(-1);
    ndc.set((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects([builtMesh, courtMesh], false)[0];
    if (!hit || !hit.face) return setHover(-1);
    const attr = (hit.object as Mesh).geometry.getAttribute('aBlock');
    const bi = Math.round(attr.getX(hit.face.a));
    // Ignore hits on the part of a building removed by the section.
    if (plane.distanceToPoint(hit.point) < 0) return setHover(-1);
    setHover(bi);
  };

  let handle: SiteModelHandle;
  const setHover = (bi: number) => {
    if (bi !== hoverIndex) {
      hoverIndex = bi;
      dirty = true;
      canvas.style.cursor = bi >= 0 ? 'help' : '';
    }
    if (bi >= 0 && pointer) {
      const b = blocks[bi].def;
      handle.onHover?.({ id: b.id, name: b.name, levels: b.levels, storeys: b.storeys, x: pointer.x, y: pointer.y });
    } else handle.onHover?.(null);
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
      dragEl = Math.max(-12, Math.min(25, drag.el + (e.clientY - drag.y) * 0.12));
      dirty = true;
    }
  };
  const onUp = (e: PointerEvent) => {
    // A tap (no drag) picks the block under the finger; touch sends no hover moves.
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

  /* ---------- Handle ---------- */

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
    highlight(id) {
      pinnedIndex = id ? blocks.findIndex((b) => b.def.id === id) : -1;
      dirty = true;
    },
    frame(time) {
      const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 0;
      lastTime = time;
      let moving = false;
      if (Math.abs(stageTarget - stage) > 1e-4) {
        stage += (stageTarget - stage) * (1 - Math.exp(-dt * 6));
        moving = true;
      } else stage = stageTarget;
      if (Math.abs(ideaTarget - idea) > 1e-4) {
        idea += Math.sign(ideaTarget - idea) * Math.min(Math.abs(ideaTarget - idea), dt / 1.4);
        moving = true;
      }
      if (needsPick) pick();
      if (hoverMix > 0.005 && hoverMix < 0.995) moving = true;
      const animated = !opts.still || idea > 0;
      const due = time - lastRender > (moving || dirty ? 0 : 33); // ~30 fps for drift
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
      caps.dispose();
      windowMesh.dispose();
      arcadeMesh.dispose();
      treeMesh.dispose();
      disposables.forEach((d) => d.dispose());
      rig.dispose();
    },
  };
  return handle;
}

/** Facts for tests and debugging: draw-call budget and counts. */
export const _debug = { solar, camAt, KEYS };
