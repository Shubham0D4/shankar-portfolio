/**
 * Procedural PBR materials for the inspect stage. Nothing is downloaded.
 *
 * Each material is painted on canvases from a tileable height field:
 *   map        colour, with cavities darkened,
 *   normalMap  from the height field's slope,
 *   arm        packed ambient occlusion (R), roughness (G), metalness (B),
 *              used as aoMap, roughnessMap and metalnessMap together.
 * Sizes are capped by device tier (512 or 256 px) and textures are shared by
 * every building that uses the material. Tints follow the PDF where it shows
 * the material (MODEL_NOTES.md §7.3); the rest are regional assumptions.
 */
import {
  CanvasTexture,
  Color,
  DoubleSide,
  LinearSRGBColorSpace,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from 'three';

export type Tier = 'high' | 'low';

/* ---------- Tileable noise ---------- */

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Value noise on a lattice of `cells`, wrapping at the tile edge. */
function lattice(cells: number, seed: number): (u: number, v: number) => number {
  const r = rng(seed);
  const g = new Float32Array(cells * cells).map(() => r());
  const at = (i: number, j: number) => g[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return a + (b - a) * sy;
  };
}

function fbm(seed: number, base: number, octaves: number): (u: number, v: number) => number {
  const layers = Array.from({ length: octaves }, (_, k) => lattice(base << k, seed + k * 101));
  return (u, v) => {
    let s = 0;
    let a = 0.5;
    let t = 0;
    for (const l of layers) {
      s += l(u, v) * a;
      t += a;
      a *= 0.5;
    }
    return s / t;
  };
}

/* ---------- Painting ---------- */

interface Painted {
  /** Height 0–1. */
  h: Float32Array;
  /** Colour, linear 0–1 RGB. */
  c: Float32Array;
  /** Roughness 0–1. */
  r: Float32Array;
  /** Alpha 0–1, optional. */
  a?: Float32Array;
}

type Painter = (u: number, v: number, out: { h: number; c: [number, number, number]; r: number; a: number }) => void;

function paint(size: number, f: Painter): Painted {
  const n = size * size;
  const P: Painted = { h: new Float32Array(n), c: new Float32Array(n * 3), r: new Float32Array(n), a: new Float32Array(n) };
  const o = { h: 0, c: [0, 0, 0] as [number, number, number], r: 1, a: 1 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      o.a = 1;
      f((x + 0.5) / size, (y + 0.5) / size, o);
      const i = y * size + x;
      P.h[i] = o.h;
      P.c[i * 3] = o.c[0];
      P.c[i * 3 + 1] = o.c[1];
      P.c[i * 3 + 2] = o.c[2];
      P.r[i] = o.r;
      P.a![i] = o.a;
    }
  }
  return P;
}

const canvasOf = (size: number) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
};

function toTextures(size: number, P: Painted, opts: { bump: number; aoStrength: number; metal?: number; alpha?: boolean; repeat: number }) {
  const n = size * size;
  const col = canvasOf(size);
  const nor = canvasOf(size);
  const arm = canvasOf(size);
  const ci = new ImageData(size, size);
  const ni = new ImageData(size, size);
  const ai = new ImageData(size, size);
  const H = (x: number, y: number) => P.h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Normal from the height field (Sobel), tangent space.
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * opts.bump;
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * opts.bump;
      const l = Math.hypot(dx, dy, 1);
      ni.data[i * 4] = ((-dx / l) * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 3] = 255;
      // Cavity occlusion from local height against its neighbourhood.
      const avg = (H(x - 2, y) + H(x + 2, y) + H(x, y - 2) + H(x, y + 2)) / 4;
      const ao = Math.max(0, Math.min(1, 1 - Math.max(0, avg - P.h[i]) * opts.aoStrength - (1 - P.h[i]) * opts.aoStrength * 0.15));
      for (let k = 0; k < 3; k++) ci.data[i * 4 + k] = Math.round(Math.pow(Math.max(0, Math.min(1, P.c[i * 3 + k] * (0.75 + 0.25 * ao))), 1 / 2.2) * 255);
      ci.data[i * 4 + 3] = opts.alpha ? Math.round(P.a![i] * 255) : 255;
      ai.data[i * 4] = ao * 255;
      ai.data[i * 4 + 1] = P.r[i] * 255;
      ai.data[i * 4 + 2] = (opts.metal ?? 0) * 255;
      ai.data[i * 4 + 3] = 255;
    }
  }
  col.getContext('2d')!.putImageData(ci, 0, 0);
  nor.getContext('2d')!.putImageData(ni, 0, 0);
  arm.getContext('2d')!.putImageData(ai, 0, 0);
  const tex = (c: HTMLCanvasElement, cs: typeof SRGBColorSpace | typeof NoColorSpace) => {
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = cs;
    t.anisotropy = 4;
    t.repeat.set(1 / opts.repeat, 1 / opts.repeat);
    return t;
  };
  void n;
  return { map: tex(col, SRGBColorSpace), normalMap: tex(nor, NoColorSpace), arm: tex(arm, NoColorSpace) };
}

const lin = (hex: number): [number, number, number] => {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
};
const mix3 = (a: [number, number, number], b: [number, number, number], t: number, out: [number, number, number]) => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
};

/* ---------- Material recipes ---------- */

/** Lime plaster on CSEB [stated]: soft mottling, trowel waves, fine grit. Repeats every 2 m. */
function plaster(size: number) {
  const n = fbm(11, 4, 5);
  const grit = lattice(size / 2, 12);
  const base = lin(0xf1ece2);
  const shade = lin(0xdcd3c3);
  return paint(size, (u, v, o) => {
    const m = n(u, v);
    const w = 0.5 + 0.5 * Math.sin((u * 6 + m * 2.2) * Math.PI * 2);
    o.h = 0.55 * m + 0.25 * w * m + 0.2 * grit(u, v);
    mix3(base, shade, Math.max(0, m - 0.45) * 1.1, o.c);
    o.r = 0.88 + 0.1 * grit(u, v);
  });
}

/**
 * Mangalore tile [stated], read from the p41 renders: interlocking clay tiles,
 * about 0.25 m wide and 0.33 m to the weather, each with two ribs and a
 * rounded lip over the course below, weathered darker at the lips.
 * The texture is 4 tiles × 3 courses, 1 m square.
 */
function mangalore(size: number) {
  const tint = lattice(4, 21);
  const n = fbm(22, 8, 4);
  const terr = [lin(0xa65437), lin(0x95492f), lin(0xb1613f), lin(0x8a4630)];
  const soot = lin(0x4b2d22);
  return paint(size, (u, v, o) => {
    const cu = u * 4;
    const cv = v * 3;
    const ti = Math.floor(cu);
    const tj = Math.floor(cv);
    const fu = cu - ti;
    const fv = cv - tj; // 0 at the course's top (under the course above), 1 at the lip
    const ribs = Math.pow(Math.abs(Math.sin(fu * Math.PI * 2)), 0.6) * 0.35;
    const edge = Math.min(fu, 1 - fu) < 0.04 ? -0.35 : 0;
    const slope = fv * 0.55; // each course rises towards its lip
    const lip = fv > 0.9 ? -(fv - 0.9) * 6 : 0;
    o.h = Math.max(0, Math.min(1, 0.2 + slope + ribs + edge + lip + 0.06 * n(u, v)));
    const k = Math.floor(tint(ti / 4 + 0.01, tj / 3 + 0.01) * 4) % 4;
    mix3(terr[k], terr[(k + 1) % 4], n(u, v), o.c);
    const dirt = Math.max(0, fv - 0.6) * 0.9 * n(u * 3, v * 3) + (fv < 0.1 ? 0.35 : 0);
    mix3(o.c, soot, Math.min(0.75, dirt), o.c);
    o.r = 0.72 + 0.2 * n(u * 2, v * 2);
  });
}

/** Teak-like timber [read]: dark, oiled, long grain along v. Repeats every 1 m. */
function timber(size: number) {
  const n = fbm(31, 2, 4);
  const fine = lattice(64, 32);
  const dark = lin(0x3b2416);
  const mid = lin(0x5e3b25);
  return paint(size, (u, v, o) => {
    const warp = n(u * 0.5, v) * 6;
    const rings = 0.5 + 0.5 * Math.sin((u * 26 + warp) * Math.PI);
    const g = fine(u * 4, v * 0.25);
    o.h = 0.5 + 0.25 * rings + 0.25 * g;
    mix3(dark, mid, 0.35 + 0.45 * rings * g + 0.2 * n(u, v), o.c);
    o.r = 0.55 + 0.25 * g;
  });
}

/** Mud floor [stated]: red-brown, cow-dung polished, faint cracks. Repeats every 2 m. */
function mud(size: number) {
  const n = fbm(41, 4, 5);
  const cr = fbm(42, 6, 3);
  const a = lin(0x8a573a);
  const b = lin(0x6f4430);
  return paint(size, (u, v, o) => {
    const m = n(u, v);
    const crack = Math.abs(cr(u, v) - 0.5) < 0.004 ? 1 : 0;
    o.h = 0.6 + 0.15 * m - 0.15 * crack;
    mix3(a, b, m * 0.7 + crack * 0.12, o.c);
    o.r = 0.62 + 0.25 * m;
  });
}

/** Grass [assumed]: monsoon-green lawn with darker clumps. Repeats every 3 m. */
function grass(size: number) {
  const n = fbm(51, 4, 5);
  const blade = lattice(size / 2, 52);
  const a = lin(0x6b7b45);
  const b = lin(0x4f5f32);
  const dry = lin(0x9a9258);
  return paint(size, (u, v, o) => {
    const m = n(u, v);
    const bl = blade(u, v);
    o.h = 0.4 * m + 0.6 * bl;
    mix3(a, b, bl * 0.7, o.c);
    mix3(o.c, dry, Math.max(0, m - 0.62) * 1.5, o.c);
    o.r = 0.95;
  });
}

/** Beaten earth and murum [assumed]: laterite-red Konkan ground with gravel. Repeats every 2 m. */
function earth(size: number) {
  const n = fbm(61, 4, 5);
  const grav = lattice(size / 3, 62);
  const a = lin(0xa8714d);
  const b = lin(0x8c5b3d);
  const peb = lin(0xc8b49a);
  return paint(size, (u, v, o) => {
    const m = n(u, v);
    const g = grav(u, v);
    const pebble = g > 0.82 ? (g - 0.82) * 5 : 0;
    o.h = 0.35 * m + 0.65 * pebble;
    mix3(a, b, m, o.c);
    mix3(o.c, peb, pebble * 0.8, o.c);
    o.r = 0.97;
  });
}

/** Deccan basalt [assumed: the local stone of Raigad]: dark grey, fine speckle. Repeats every 1 m. */
function basalt(size: number) {
  const n = fbm(71, 4, 4);
  const sp = lattice(size / 2, 72);
  const a = lin(0x4d4a46);
  const b = lin(0x35332f);
  return paint(size, (u, v, o) => {
    const m = n(u, v);
    o.h = 0.5 * m + 0.5 * sp(u, v);
    mix3(a, b, m, o.c);
    if (sp(u, v) > 0.85) mix3(o.c, lin(0x8a857d), 0.5, o.c);
    o.r = 0.78;
  });
}

/** Fired terracotta [stated for the jali]: orange clay with firing blush. Repeats every 0.5 m. */
function clay(size: number) {
  const n = fbm(81, 4, 4);
  const a = lin(0xc06c45);
  const b = lin(0x9b5034);
  return paint(size, (u, v, o) => {
    const m = n(u, v);
    o.h = 0.5 + 0.5 * m;
    mix3(a, b, m, o.c);
    o.r = 0.85;
  });
}

/**
 * Carved valance [read from the p41 and p42 renders]: a solid top board with
 * hanging leaf-and-ball drops, cut through. One repeat is 0.36 m wide, 0.26 m deep.
 */
function fretwork(size: number) {
  const dark = lin(0x4a2c1b);
  return paint(size, (u, v, o) => {
    // u across one repeat, v down from the board's top edge: a pierced board,
    // a scalloped lobe per repeat with a hole, and a teardrop pendant (jhalar).
    const x = u - 0.5;
    let solid = v < 0.24 && Math.hypot(x, v - 0.12) > 0.055;
    const lobe = 0.24 + 0.32 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 0.5, 2)));
    if (v >= 0.24 && v < lobe && Math.hypot(x, v - 0.38) > 0.07) solid = true;
    if (Math.abs(x) < 0.02 && v >= lobe - 0.02 && v < 0.74) solid = true;
    if (Math.hypot(x, (v - 0.8) * 0.8) < 0.075) solid = true;
    o.a = solid ? 1 : 0;
    o.h = solid ? 0.6 + 0.3 * (1 - Math.abs(x) * 2) : 0;
    mix3(dark, lin(0x6a412a), v, o.c);
    o.r = 0.6;
  });
}

/* ---------- Material set ---------- */

export interface MaterialSet {
  plaster: MeshStandardMaterial;
  plinth: MeshStandardMaterial;
  tile: MeshStandardMaterial;
  timber: MeshStandardMaterial;
  board: MeshStandardMaterial;
  mud: MeshStandardMaterial;
  grass: MeshStandardMaterial;
  earth: MeshStandardMaterial;
  basalt: MeshStandardMaterial;
  clay: MeshStandardMaterial;
  fret: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  brass: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  cloth: MeshStandardMaterial;
  foliage: MeshStandardMaterial;
  bark: MeshStandardMaterial;
  people: MeshStandardMaterial;
  /** Estimated GPU bytes of all textures, mip chains included. */
  textureBytes: number;
  textures: Texture[];
  dispose(): void;
}

const cache = new Map<Tier, MaterialSet>();

export function materials(tier: Tier): MaterialSet {
  const hit = cache.get(tier);
  if (hit) return hit;
  const big = tier === 'high' ? 512 : 256;
  const small = tier === 'high' ? 256 : 128;
  const textures: Texture[] = [];
  let bytes = 0;
  const make = (size: number, painted: Painted, o: { bump: number; aoStrength: number; repeat: number; metal?: number; alpha?: boolean }) => {
    const t = toTextures(size, painted, o);
    textures.push(t.map, t.normalMap, t.arm);
    bytes += 3 * size * size * 4 * 1.33;
    return t;
  };
  const std = (t: ReturnType<typeof make>, extra: Partial<MeshStandardMaterial> = {}, normal = 1) =>
    new MeshStandardMaterial({
      map: t.map,
      normalMap: t.normalMap,
      normalScale: new Vector2(normal, normal),
      aoMap: t.arm,
      aoMapIntensity: 0.8,
      roughnessMap: t.arm,
      metalnessMap: t.arm,
      roughness: 1,
      metalness: 1,
      ...extra,
    });

  const tP = make(big, plaster(big), { bump: 1.6, aoStrength: 3, repeat: 2 });
  const tT = make(big, mangalore(big), { bump: 5, aoStrength: 4, repeat: 1 });
  const tW = make(small, timber(small), { bump: 1.2, aoStrength: 2, repeat: 1 });
  const tM = make(small, mud(small), { bump: 1.5, aoStrength: 2, repeat: 2 });
  const tG = make(small, grass(small), { bump: 2.5, aoStrength: 3, repeat: 3 });
  const tE = make(small, earth(small), { bump: 2, aoStrength: 3, repeat: 2 });
  const tB = make(small, basalt(small), { bump: 1.5, aoStrength: 2, repeat: 1 });
  const tC = make(small, clay(small), { bump: 1.2, aoStrength: 2, repeat: 0.5 });
  const fretSize = tier === 'high' ? 128 : 64;
  const tF = make(fretSize, fretwork(fretSize), { bump: 3, aoStrength: 2, repeat: 1, alpha: true });
  tF.map.repeat.set(1, 1);

  const set: MaterialSet = {
    plaster: std(tP),
    plinth: std(tP, { color: new Color(0xe9e2d4) }),
    tile: std(tT, {}, 1.4),
    timber: std(tW),
    board: std(tW, { color: new Color(0xb39a86) }),
    mud: std(tM),
    grass: std(tG),
    earth: std(tE),
    basalt: std(tB),
    clay: std(tC),
    fret: std(tF, { alphaTest: 0.5, side: DoubleSide }),
    glass: new MeshStandardMaterial({ color: 0x1d2a2c, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.55, emissive: new Color(0xffb35c), emissiveIntensity: 0 }),
    brass: new MeshStandardMaterial({ color: 0xc09a45, roughness: 0.32, metalness: 1 }),
    steel: new MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.35, metalness: 0.9 }),
    cloth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: DoubleSide }),
    foliage: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }),
    bark: new MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95 }),
    people: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    textureBytes: bytes,
    textures,
    dispose() {
      textures.forEach((t) => t.dispose());
      for (const v of Object.values(set)) if (v && typeof v === 'object' && 'isMaterial' in v) (v as MeshStandardMaterial).dispose();
      cache.delete(tier);
    },
  };
  void LinearSRGBColorSpace;
  cache.set(tier, set);
  return set;
}

/** Releases every cached material set (page hide). */
export function releaseMaterials(): void {
  for (const s of [...cache.values()]) s.dispose();
}
