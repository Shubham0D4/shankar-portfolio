/**
 * Props for the inspect stage: people, trees, plants and the small things
 * of everyday life. All low-poly, vertex-coloured, merged per material.
 *
 * People are abstract figures at true scale (1.1–1.75 m), in poses taken from
 * the PDF's renders: a woman at the verandah post, an elder seated on the
 * plinth, a woman carrying a pot on her head, children at play (p40–p42).
 */
import { BufferGeometry, CapsuleGeometry, Float32BufferAttribute, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, TorusGeometry, Vector3 } from 'three';
import { Bag, boxUV, norm, paintGeo, rod, sphere, type V3 } from './kit';

export function seeded(seed: number) {
  let s = seed % 2147483647 || 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const col = (g: BufferGeometry, hex: number, jitter = 0.04, seed = 3) => paintGeo(norm(g), hex, jitter, seed);

/* ---------- People ---------- */

export type Pose = 'stand' | 'walk' | 'sit' | 'carry' | 'stick' | 'play';

export interface PersonSpec {
  at: [number, number];
  /** Ground level under the feet (or the seat height for 'sit'). */
  y: number;
  /** Facing, degrees from +z towards +x. */
  face: number;
  height: number;
  pose: Pose;
  /** Saree or a skirt (a cone from the hips), else trousers. */
  drape?: boolean;
  top: number;
  bottom: number;
  skin?: number;
  hair?: number;
}

/** One person, in their own frame (feet at the origin, facing +z), then placed. */
export function person(p: PersonSpec): BufferGeometry {
  const H = p.height;
  const k = H / 1.7;
  const skin = p.skin ?? 0x8a5a3c;
  const hair = p.hair ?? 0x1c1714;
  const parts: BufferGeometry[] = [];
  const seated = p.pose === 'sit';
  const hip = seated ? 0.45 * k : 0.86 * k;
  const shoulder = hip + 0.55 * k;
  const add = (g: BufferGeometry, hex: number) => parts.push(col(g, hex, 0.05, Math.round(H * 100)));

  // Legs or drape.
  if (seated) {
    for (const s of [-1, 1]) {
      const thigh = new CapsuleGeometry(0.065 * k, 0.36 * k, 2, 6);
      thigh.rotateX(Math.PI / 2);
      thigh.translate(s * 0.09 * k, hip, 0.2 * k);
      add(thigh, p.drape ? p.bottom : p.bottom);
      const shin = new CapsuleGeometry(0.055 * k, 0.32 * k, 2, 6);
      shin.translate(s * 0.09 * k, hip - 0.22 * k, 0.42 * k);
      add(shin, p.drape ? p.bottom : skin);
    }
    if (p.drape) {
      const lap = new CylinderGeometry(0.17 * k, 0.24 * k, 0.16 * k, 8);
      lap.translate(0, hip + 0.02, 0.12 * k);
      add(lap, p.bottom);
    }
  } else if (p.drape) {
    const skirt = new ConeGeometry(0.25 * k, hip + 0.04, 9, 1, true);
    skirt.translate(0, (hip + 0.04) / 2, 0);
    add(skirt, p.bottom);
    const top = new CylinderGeometry(0.15 * k, 0.24 * k, 0.12 * k, 9);
    top.translate(0, hip, 0);
    add(top, p.bottom);
  } else {
    const stride = p.pose === 'walk' || p.pose === 'carry' || p.pose === 'play' ? 0.22 : 0;
    for (const s of [-1, 1]) {
      const leg = new CapsuleGeometry(0.07 * k, hip - 0.14 * k, 2, 6);
      leg.translate(0, (hip - 0.0) / 2, 0);
      leg.rotateX(s * stride);
      leg.translate(s * 0.1 * k, 0.03, 0);
      add(leg, p.bottom);
    }
  }

  // Torso, slightly flattened front to back; the elder stoops.
  const torso = new CylinderGeometry(0.17 * k, 0.14 * k, 0.56 * k, 9);
  torso.scale(1, 1, 0.7);
  torso.translate(0, hip + 0.28 * k, 0);
  if (p.pose === 'stick') torso.rotateX(0.18);
  add(torso, p.top);

  // Head and hair.
  const headY = shoulder + 0.16 * k;
  const lean = p.pose === 'stick' ? 0.1 * k : 0;
  const head = new IcosahedronGeometry(0.108 * k, 1);
  head.scale(0.92, 1.08, 1);
  head.translate(0, headY, lean);
  add(head, skin);
  const cap = new IcosahedronGeometry(0.112 * k, 1);
  cap.scale(0.95, 0.75, 1);
  cap.translate(0, headY + 0.035 * k, lean - 0.012);
  add(cap, hair);
  if (p.drape) add(sphere(0, headY - 0.02 * k, lean - 0.11 * k, 0.05 * k), hair);

  // Arms.
  for (const s of [-1, 1]) {
    const up = p.pose === 'carry' && s === 1;
    const arm = new CapsuleGeometry(0.048 * k, 0.4 * k, 2, 6);
    arm.translate(0, -0.23 * k, 0);
    if (up) arm.rotateZ(Math.PI * 0.86);
    else if (p.pose === 'stick' && s === 1) arm.rotateX(-0.5);
    else if (p.pose === 'play') arm.rotateX(s * 0.6);
    else arm.rotateZ(s * 0.08);
    arm.translate(s * 0.21 * k, shoulder - 0.03 * k, lean * 0.5);
    add(arm, up || seated ? skin : p.top);
  }
  if (p.pose === 'carry') {
    // A matka (water pot) on the head, as in the p40 and p42 renders.
    add(sphere(0, headY + 0.2 * k, lean, 0.15 * k, 1, 0.85, 1), 0xa75c3a);
    add(new CylinderGeometry(0.06 * k, 0.07 * k, 0.06 * k, 8).translate(0, headY + 0.34 * k, lean), 0x8f4e31);
  }
  if (p.pose === 'stick') add(rod([0.32 * k, 0, 0.3 * k], [0.26 * k, hip + 0.1 * k, 0.12 * k], 0.012), 0x4a3324);

  const g = mergeAll(parts);
  g.rotateY((p.face * Math.PI) / 180);
  g.translate(p.at[0], p.y, p.at[1]);
  return g;
}

function mergeAll(parts: BufferGeometry[]): BufferGeometry {
  const bag = new Bag<'x'>();
  bag.add('x', ...parts);
  return bag.merge().get('x')!;
}

/* ---------- Trees and plants ---------- */

export interface TreeSpec {
  at: [number, number];
  y?: number;
  height: number;
  spread: number;
  seed: number;
  /** Tone of the canopy. */
  green?: number;
}

/** A broadleaf tree (mango, jamun, badam): bent trunk, a few limbs, clumped crown. */
export function tree(t: TreeSpec, foliage: Bag, bark: Bag): void {
  const r = seeded(t.seed);
  const y = t.y ?? 0;
  const [x, z] = t.at;
  const trunkH = t.height * 0.42;
  const lean: V3 = [x + (r() - 0.5) * 0.4, y + trunkH, z + (r() - 0.5) * 0.4];
  bark.add('bark', rod([x, y - 0.1, z], lean, 0.13 + t.height * 0.012, 7));
  const limbs = 3 + Math.floor(r() * 3);
  const tips: Vector3[] = [];
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + r();
    const tip: V3 = [lean[0] + Math.cos(a) * t.spread * 0.35, lean[1] + t.height * (0.2 + r() * 0.15), lean[2] + Math.sin(a) * t.spread * 0.35];
    bark.add('bark', rod(lean, tip, 0.07 + t.height * 0.006, 5));
    tips.push(new Vector3(...tip));
  }
  const green = t.green ?? 0x55683a;
  const blobs = 7 + Math.floor(r() * 5);
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * t.spread * 0.42;
    const cy = y + t.height * (0.62 + r() * 0.3);
    const rad = t.spread * (0.22 + r() * 0.14);
    const g = new IcosahedronGeometry(rad, 2);
    // Organic: jitter the vertices.
    const p = g.getAttribute('position');
    for (let k = 0; k < p.count; k++) {
      const s = 1 + (r() - 0.5) * 0.14;
      p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.82, p.getZ(k) * s);
    }
    g.translate(x + Math.cos(a) * d, cy, z + Math.sin(a) * d);
    const shade = cy < y + t.height * 0.72 ? 0.82 : 1;
    const c = new Vector3(((green >> 16) & 255) / 255, ((green >> 8) & 255) / 255, (green & 255) / 255).multiplyScalar(shade * (0.9 + r() * 0.2));
    foliage.add('foliage', paintGeo(norm(g), (Math.round(c.x * 255) << 16) | (Math.round(c.y * 255) << 8) | Math.round(c.z * 255), 0.08, i + t.seed));
  }
}

/** A low leafy clump: vegetables, tulsi, shrubs. */
export function clump(x: number, y: number, z: number, r: number, hex: number, seed: number, out: Bag): void {
  const g = new IcosahedronGeometry(r, 0);
  g.scale(1, 0.75, 1);
  g.rotateY(seed);
  g.translate(x, y + r * 0.6, z);
  out.add('foliage', paintGeo(norm(g), hex, 0.12, seed));
}

/* ---------- Everyday things ---------- */

/** A bicycle leaning on its stand: two wheels, a diamond frame, bars. */
export function bicycle(x: number, z: number, faceDeg: number, out: Bag): void {
  const parts: BufferGeometry[] = [];
  const wheel = (cx: number) => {
    const g = new TorusGeometry(0.33, 0.018, 5, 18);
    g.translate(cx, 0.35, 0);
    parts.push(paintGeo(norm(g), 0x1f1f1f));
  };
  wheel(-0.52);
  wheel(0.52);
  const f = (a: V3, b: V3) => parts.push(paintGeo(rod(a, b, 0.016, 5), 0x24344a));
  f([-0.52, 0.35, 0], [-0.05, 0.38, 0]);
  f([-0.05, 0.38, 0], [0.42, 0.78, 0]);
  f([-0.05, 0.38, 0], [-0.2, 0.85, 0]);
  f([-0.2, 0.85, 0], [0.42, 0.78, 0]);
  f([-0.52, 0.35, 0], [-0.2, 0.85, 0]);
  f([0.52, 0.35, 0], [0.42, 0.78, 0]);
  f([0.42, 0.78, 0], [0.38, 0.95, 0]);
  f([0.38, 0.95, -0.24], [0.38, 0.95, 0.24]);
  parts.push(paintGeo(norm(new CapsuleGeometry(0.05, 0.14, 2, 6).rotateZ(Math.PI / 2).translate(-0.22, 0.9, 0)), 0x2a2a2a));
  const g = mergeAll(parts);
  g.applyMatrix4(new Matrix4().makeRotationZ(0.06));
  g.rotateY((faceDeg * Math.PI) / 180);
  g.translate(x, 0, z);
  out.add('cloth', g);
}

/** A clothes line between two bamboo poles, with cloth hanging from it. */
export function laundry(a: [number, number], b: [number, number], seed: number, poles: Bag, cloth: Bag): void {
  const r = seeded(seed);
  const h = 1.95;
  poles.add('bark', rod([a[0], 0, a[1]], [a[0], h + 0.1, a[1]], 0.035, 6), rod([b[0], 0, b[1]], [b[0], h + 0.1, b[1]], 0.035, 6));
  poles.add('bark', rod([a[0], h, a[1]], [b[0], h, b[1]], 0.006, 4));
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir: [number, number] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const colours = [0xb23a48, 0x2f5d8a, 0xe8c547, 0xf2efe6, 0x5e8c61, 0xd97a2b];
  let s = 0.3;
  while (s < L - 0.5) {
    const w = 0.45 + r() * 0.9;
    const drop = 0.5 + r() * 0.6;
    const sag = 0.05 * Math.sin((s / L) * Math.PI);
    const x0 = a[0] + dir[0] * s;
    const z0 = a[1] + dir[1] * s;
    const x1 = a[0] + dir[0] * (s + w);
    const z1 = a[1] + dir[1] * (s + w);
    const top = h - sag - 0.02;
    const pos = [x0, top, z0, x1, top, z1, x1, top - drop, z1, x0, top, z0, x1, top - drop, z1, x0, top - drop * 0.95, z0];
    const gg = clothQuad(pos);
    cloth.add('cloth', paintGeo(gg, colours[Math.floor(r() * colours.length)], 0.06, seed + Math.round(s * 10)));
    s += w + 0.12;
  }
}

function clothQuad(pos: number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return boxUV(g);
}

/** A stack of firewood for the chul. */
export function woodpile(x: number, z: number, out: Bag, seed: number): void {
  const r = seeded(seed);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 6 - row; i++) {
      const y = 0.07 + row * 0.12;
      const zz = z - 0.35 + (i + row * 0.5) * 0.13;
      out.add('bark', rod([x - 0.45 + r() * 0.05, y, zz], [x + 0.45 - r() * 0.05, y, zz], 0.055, 6));
    }
  }
}

/** A clay pot (matka or handi). */
export function pot(x: number, y: number, z: number, r: number, out: Bag): void {
  out.add('clay', sphere(x, y + r * 0.85, z, r, 1, 0.85, 1, 10));
  out.add('clay', norm(new CylinderGeometry(r * 0.42, r * 0.5, r * 0.3, 10).translate(x, y + r * 1.62, z)));
}

/** Tulsi vrindavan: a small plinthed planter with the tulsi plant. */
export function tulsi(x: number, z: number, masonry: Bag, foliage: Bag): void {
  masonry.add('plaster', norm(new CylinderGeometry(0.32, 0.38, 0.75, 4, 1).rotateY(Math.PI / 4).translate(x, 0.375, z)));
  masonry.add('clay', norm(new CylinderGeometry(0.36, 0.32, 0.12, 4, 1).rotateY(Math.PI / 4).translate(x, 0.81, z)));
  clump(x, 0.86, z, 0.22, 0x4d6b35, 9, foliage);
}
