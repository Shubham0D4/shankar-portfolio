/**
 * Home hero: a still life of drafting instruments, built entirely in code
 * (DESIGN.md §8). No downloaded models, textures or HDRIs.
 *
 * Units are centimetres. The desk is the plane y = 0; the camera looks down
 * from the viewer's side (+z) at about 52°.
 *
 * Choreography (one time only): the compass legs open, then the compass turns
 * on its needle and draws an arc that completes the plan on the sheet. After
 * that the shadows freeze and only a slow camera drift and the pointer tilt
 * remain.
 */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  RingGeometry,
  Scene,
  Shape,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HERO, PALETTE } from '../three/theme';

const DEG = Math.PI / 180;

/* ---------- Composition ---------- */

const SHEET = { w: 59.4, d: 42, rot: -5 * DEG }; // A2 landscape
const PX_PER_CM = 34; // sheet texture resolution
const PLAN_CENTRE = { x: 6, z: -1.5 }; // on the sheet, cm from its centre
const LEG = 13; // compass leg, hinge to tip
const OPEN = { from: 6 * DEG, to: 17 * DEG }; // half-angle between the legs
const SWEEP = { from: -100 * DEG, to: 22 * DEG }; // compass turn while drawing
const ARC_R = 2 * LEG * Math.sin(OPEN.to);

const T = {
  openStart: 0.35,
  openEnd: 1.25,
  sweepStart: 1.2,
  sweepEnd: 2.6,
  camEnd: 2.4,
};

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const phase = (t: number, a: number, b: number) => MathUtils.clamp((t - a) / (b - a), 0, 1);

/** A point on the sheet (cm from its centre) in world space. */
function onSheet(x: number, z: number, y = 0): Vector3 {
  const c = Math.cos(SHEET.rot);
  const s = Math.sin(SHEET.rot);
  return new Vector3(x * c + z * s, y, -x * s + z * c);
}

/* ---------- Canvas textures ---------- */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function colourTexture(c: HTMLCanvasElement, maxAniso: number): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

/** Walnut grain: long wavering strokes over an oiled base. */
function walnutTexture(maxAniso: number): Texture {
  const [c, g] = canvas(1024, 1024);
  g.fillStyle = '#2f2219';
  g.fillRect(0, 0, 1024, 1024);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 520; i++) {
    const y0 = rnd() * 1024;
    const amp = 2 + rnd() * 10;
    const freq = 0.002 + rnd() * 0.006;
    const ph = rnd() * 6.28;
    const dark = rnd() < 0.55;
    g.strokeStyle = dark ? `rgba(18, 11, 7, ${0.08 + rnd() * 0.22})` : `rgba(120, 86, 58, ${0.05 + rnd() * 0.12})`;
    g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    for (let x = -10; x <= 1034; x += 8) {
      const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.25;
      if (x < 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = colourTexture(c, maxAniso);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2.5, 2.5);
  return t;
}

/** The sheet: a faint plan of a courtyard house with its title block. */
function sheetTexture(maxAniso: number): Texture {
  const W = Math.round(SHEET.w * PX_PER_CM);
  const H = Math.round(SHEET.d * PX_PER_CM);
  const [c, g] = canvas(W, H);
  const cm = (v: number) => v * PX_PER_CM;
  g.fillStyle = '#f1e9db';
  g.fillRect(0, 0, W, H);

  // Paper tooth.
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14000; i++) {
    g.fillStyle = `rgba(120, 96, 70, ${rnd() * 0.05})`;
    g.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }

  g.strokeStyle = HERO.line;
  g.fillStyle = HERO.line;
  g.lineCap = 'square';

  // Border.
  g.lineWidth = 3;
  g.strokeRect(cm(1.5), cm(1.5), W - cm(3), H - cm(3));

  // Title block, bottom right.
  const tbx = W - cm(1.5) - cm(16);
  const tby = H - cm(1.5) - cm(5);
  g.lineWidth = 2;
  g.strokeRect(tbx, tby, cm(16), cm(5));
  g.beginPath();
  g.moveTo(tbx, tby + cm(2));
  g.lineTo(tbx + cm(16), tby + cm(2));
  g.moveTo(tbx + cm(10), tby + cm(2));
  g.lineTo(tbx + cm(10), tby + cm(5));
  g.stroke();
  // Lettering suggested as short strokes, never legible.
  for (const [x, y, w] of [
    [0.6, 0.8, 7.5],
    [0.6, 1.4, 4.5],
    [0.6, 2.8, 5],
    [0.6, 3.5, 7],
    [0.6, 4.2, 3.5],
    [10.6, 2.8, 3],
    [10.6, 3.6, 4.2],
  ]) {
    g.fillRect(tbx + cm(x), tby + cm(y), cm(w), 3);
  }

  // Plan centred on PLAN_CENTRE.
  const px = W / 2 + cm(PLAN_CENTRE.x);
  const pz = H / 2 + cm(PLAN_CENTRE.z);
  const outer = 11.5;
  const wall = 0.35;
  const court = 4.2;
  g.lineWidth = 2.5;
  for (const r of [outer, outer - wall, court, court - wall]) g.strokeRect(px - cm(r), pz - cm(r), cm(r * 2), cm(r * 2));
  // Cross walls between the court and the outer walls.
  g.lineWidth = 2;
  g.beginPath();
  for (const s of [-1, 1]) {
    g.moveTo(px + s * cm(court), pz);
    g.lineTo(px + s * cm(outer - wall), pz);
    g.moveTo(px, pz + s * cm(court));
    g.lineTo(px, pz + s * cm(outer - wall));
  }
  g.stroke();
  // Column grid.
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (Math.abs(i) < 2 && Math.abs(j) < 2) continue;
      g.fillRect(px + cm(i * 4.4) - 4, pz + cm(j * 4.4) - 4, 8, 8);
    }
  }
  // Dashed construction circle: the arc the compass will draw over.
  g.setLineDash([10, 12]);
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(px, pz, cm(ARC_R), 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  // Dimension line over the plan.
  const dy = pz - cm(outer + 2);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(px - cm(outer), dy);
  g.lineTo(px + cm(outer), dy);
  for (const x of [-outer, -court, court, outer]) {
    g.moveTo(px + cm(x) - 7, dy + 7);
    g.lineTo(px + cm(x) + 7, dy - 7);
  }
  g.stroke();
  // North point, top left.
  const nx = cm(7);
  const ny = cm(7);
  g.beginPath();
  g.arc(nx, ny, cm(1.6), 0, Math.PI * 2);
  g.moveTo(nx, ny - cm(2.2));
  g.lineTo(nx, ny + cm(1.6));
  g.stroke();
  g.beginPath();
  g.moveTo(nx, ny - cm(1.6));
  g.lineTo(nx - cm(0.5), ny);
  g.lineTo(nx, ny - cm(0.3));
  g.closePath();
  g.fill();
  // A section line through the plan.
  g.setLineDash([24, 8, 4, 8]);
  g.beginPath();
  g.moveTo(px - cm(outer + 3), pz + cm(6.6));
  g.lineTo(px + cm(outer + 3), pz + cm(6.6));
  g.stroke();
  g.setLineDash([]);

  return colourTexture(c, maxAniso);
}

/** Figures along a scale-rule face: 0 to 30, with the scale named at the start. */
function figuresTexture(maxAniso: number, label: string, step: number): Texture {
  const [c, g] = canvas(4096, 96);
  g.fillStyle = '#2a201a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '500 54px "Anek Latin Variable", system-ui, sans-serif';
  const ppc = 4096 / 30;
  for (let i = 1; i <= 27; i += 1) g.fillText(String(i * step), i * ppc, 50);
  g.textAlign = 'right';
  g.font = '600 50px "Anek Latin Variable", system-ui, sans-serif';
  g.fillText(label, 4096 - 24, 50);
  return colourTexture(c, maxAniso);
}

/** Rolled-drawing end: the paper's spiral, layer on layer. */
function spiralTexture(maxAniso: number): Texture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#e9dfcd';
  g.beginPath();
  g.arc(256, 256, 256, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(90, 66, 48, 0.55)';
  g.lineWidth = 1.6;
  g.beginPath();
  const turns = 16;
  for (let a = 0; a <= turns * Math.PI * 2; a += 0.05) {
    const r = 40 + (a / (turns * Math.PI * 2)) * 210;
    const x = 256 + Math.cos(a) * r;
    const y = 256 + Math.sin(a) * r;
    if (a === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  // The hollow core.
  g.fillStyle = '#2a1f18';
  g.beginPath();
  g.arc(256, 256, 38, 0, Math.PI * 2);
  g.fill();
  return colourTexture(c, maxAniso);
}

/** Soft contact shadow, a radial falloff used under every object. */
function blobTexture(): Texture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/* ---------- Materials ---------- */

interface Mats {
  brass: MeshPhysicalMaterial;
  steel: MeshStandardMaterial;
  graphite: MeshStandardMaterial;
  plastic: MeshStandardMaterial;
  engraving: MeshStandardMaterial;
  acrylic: MeshPhysicalMaterial;
  barrel: MeshStandardMaterial;
  cloth: MeshStandardMaterial;
  paper: MeshStandardMaterial;
}

function materials(env: Texture): Mats {
  const withEnv = <M extends MeshStandardMaterial>(m: M, k: number): M => {
    m.envMap = env;
    m.envMapIntensity = k;
    return m;
  };
  return {
    brass: withEnv(
      new MeshPhysicalMaterial({ color: 0xc29a5c, metalness: 1, roughness: 0.3, anisotropy: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.4 }),
      1,
    ),
    steel: withEnv(new MeshStandardMaterial({ color: 0xc9c6c0, metalness: 1, roughness: 0.22 }), 1),
    graphite: withEnv(new MeshStandardMaterial({ color: 0x2a2622, metalness: 0.4, roughness: 0.5 }), 0.5),
    plastic: withEnv(new MeshStandardMaterial({ color: 0xc89c66, metalness: 0, roughness: 0.42 }), 0.4), // boxwood
    engraving: new MeshStandardMaterial({ color: 0x2a201a, roughness: 0.8 }),
    acrylic: withEnv(
      new MeshPhysicalMaterial({
        color: PALETTE.caramel,
        metalness: 0,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      }),
      0.9,
    ),
    barrel: withEnv(new MeshStandardMaterial({ color: 0x2b2019, metalness: 0, roughness: 0.62, flatShading: true }), 0.3),
    cloth: withEnv(new MeshStandardMaterial({ color: 0x5a3e2e, roughness: 1 }), 0.1),
    paper: withEnv(new MeshStandardMaterial({ color: 0xece2d0, roughness: 0.92 }), 0.15),
  };
}

/* ---------- Geometry helpers ---------- */

const shadowed = <T extends Object3D>(o: T, cast = true, receive = true): T => {
  o.traverse((c) => {
    if ((c as Mesh).isMesh) {
      c.castShadow = cast;
      c.receiveShadow = receive;
    }
  });
  return o;
};

/** A cylinder whose axis is x, from x0 to x1. */
function rod(r0: number, r1: number, x0: number, x1: number, mat: Material, seg = 32): Mesh {
  const g = new CylinderGeometry(r1, r0, x1 - x0, seg);
  g.rotateZ(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return new Mesh(g, mat);
}

function knurl(r: number, x0: number, x1: number, mat: Material, rings: number): InstancedMesh {
  const g = new TorusGeometry(r, r * 0.11, 6, 28);
  g.rotateY(Math.PI / 2);
  const im = new InstancedMesh(g, mat, rings);
  const m = new Matrix4();
  for (let i = 0; i < rings; i++) {
    m.makeTranslation(x0 + ((i + 0.5) / rings) * (x1 - x0), 0, 0);
    im.setMatrixAt(i, m);
  }
  return im;
}

/* ---------- The compass ---------- */

interface Compass {
  pivot: Group; // at the needle point; rotation.y is the sweep
  setOpen(halfAngle: number): void;
}

function buildCompass(m: Mats): Compass {
  const pivot = new Group();
  const body = new Group();
  pivot.add(body);

  const head = new Group();
  body.add(head);
  // Hinge disc, axis toward the viewer.
  const disc = new Mesh(new CylinderGeometry(1.05, 1.05, 0.9, 48), m.brass);
  disc.rotation.x = Math.PI / 2;
  head.add(disc);
  const boss = new Mesh(new CylinderGeometry(0.42, 0.42, 1.1, 24), m.steel);
  boss.rotation.x = Math.PI / 2;
  head.add(boss);
  // Knurled handle and cap.
  const handle = rod(0.3, 0.3, 0, 2.4, m.steel);
  handle.rotation.z = Math.PI / 2;
  handle.position.y = 0.9;
  head.add(handle);
  const grip = knurl(0.31, 0.15, 2.25, m.steel, 14);
  grip.rotation.z = Math.PI / 2;
  grip.position.y = 0.9;
  head.add(grip);
  const cap = new Mesh(new SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.brass);
  cap.position.y = 3.3;
  head.add(cap);

  // A leg points down -y from the hinge; tips are LEG away.
  const leg = (needle: boolean): Group => {
    const g = new Group();
    const s = new Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0.3, -9.2);
    s.lineTo(-0.3, -9.2);
    s.closePath();
    const bar = new Mesh(
      new ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 4 }),
      m.brass,
    );
    bar.position.z = -0.18;
    g.add(bar);
    const collar = new Mesh(new CylinderGeometry(0.26, 0.26, 1.1, 24), m.steel);
    collar.position.y = -9.6;
    g.add(collar);
    if (needle) {
      const shaft = new Mesh(new CylinderGeometry(0.09, 0.09, 2.6, 16), m.steel);
      shaft.position.y = -11.4;
      const point = new Mesh(new CylinderGeometry(0.09, 0.005, 0.7, 16), m.steel);
      point.position.y = -LEG + 0.35;
      g.add(shaft, point);
    } else {
      const holder = new Mesh(new CylinderGeometry(0.2, 0.17, 2.2, 20), m.steel);
      holder.position.y = -11.2;
      const lead = new Mesh(new CylinderGeometry(0.08, 0.01, 0.75, 12), m.graphite);
      lead.position.y = -LEG + 0.37;
      g.add(holder, lead);
    }
    return g;
  };
  const needleLeg = leg(true);
  const leadLeg = leg(false);
  body.add(needleLeg, leadLeg);

  // Bow-compass adjusting screw with its thumbwheel.
  const SCREW_AT = 4.8; // distance down the legs from the hinge
  const screw = new Mesh(new CylinderGeometry(0.07, 0.07, 1, 12), m.steel);
  screw.rotation.z = Math.PI / 2;
  const wheel = new Group();
  const wheelDisc = new Mesh(new CylinderGeometry(0.7, 0.7, 0.24, 40), m.brass);
  wheelDisc.rotation.z = Math.PI / 2;
  wheel.add(wheelDisc, knurl(0.7, -0.12, 0.12, m.brass, 3));
  body.add(screw, wheel);

  shadowed(pivot);

  const setOpen = (a: number) => {
    const hx = LEG * Math.sin(a);
    const hy = LEG * Math.cos(a);
    body.position.set(hx, 0, 0); // keeps the needle tip on the pivot
    head.position.set(0, hy, 0);
    needleLeg.position.set(0, hy, 0);
    leadLeg.position.set(0, hy, 0);
    needleLeg.rotation.z = -a;
    leadLeg.rotation.z = a;
    const y = hy - SCREW_AT * Math.cos(a);
    const half = SCREW_AT * Math.sin(a);
    screw.position.set(0, y, 0);
    screw.scale.set(1, half * 2, 1);
    wheel.position.set(0, y, 0);
  };
  setOpen(OPEN.to);
  return { pivot, setOpen };
}

/* ---------- Triangular scale rule ---------- */

function buildScaleRule(m: Mats, aniso: number): Group {
  const group = new Group();
  const LEN = 30;
  const R = 1.95; // circumradius of the profile
  const CH = 0.28; // corner chamfer
  // Equilateral profile with chamfered corners; one face flat on the desk.
  const corners = [90, 210, 330].map((a) => new Vector3(Math.cos(a * DEG) * R, Math.sin(a * DEG) * R, 0));
  const s = new Shape();
  corners.forEach((c, i) => {
    const prev = corners[(i + 2) % 3];
    const next = corners[(i + 1) % 3];
    const a = c.clone().lerp(prev, CH / (R * Math.sqrt(3)));
    const b = c.clone().lerp(next, CH / (R * Math.sqrt(3)));
    if (i === 0) s.moveTo(a.x, a.y);
    else s.lineTo(a.x, a.y);
    s.lineTo(b.x, b.y);
  });
  s.closePath();
  const body = new Mesh(
    new ExtrudeGeometry(s, { depth: LEN, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }),
    m.plastic,
  );
  body.position.z = -LEN / 2;
  group.add(body);

  // Engraved graduations on the two upper faces, set just into the surface.
  const faces: { from: Vector3; to: Vector3; label: string; step: number }[] = [
    { from: corners[1], to: corners[0], label: '1:100', step: 1 },
    { from: corners[2], to: corners[0], label: '1:200', step: 2 },
  ];
  const tick = new BoxGeometry(0.04, 1, 0.02);
  const count = LEN * 10 - 9;
  const SKIN = 0.05; // the extrusion bevel sits this far outside the profile
  for (const f of faces) {
    const up = f.to.clone().sub(f.from).normalize(); // up the face
    // Right-handed frame in the face: X along the rule, up, and the outward normal.
    const X = new Vector3(0, 0, 1);
    const n = X.clone().cross(up);
    if (n.dot(f.from.clone().add(f.to)) < 0) {
      X.negate();
      n.negate();
    }
    const base = f.from.clone().addScaledVector(up, CH + 0.12);
    const im = new InstancedMesh(tick, m.engraving, count);
    const mat = new Matrix4();
    const pos = new Vector3();
    for (let i = 0; i < count; i++) {
      const mm = i + 5; // millimetres from the end
      const len = mm % 10 === 0 ? 0.62 : mm % 5 === 0 ? 0.42 : 0.26;
      pos.copy(base).addScaledVector(up, len / 2).addScaledVector(n, SKIN - 0.006).addScaledVector(X, -LEN / 2 + mm / 10);
      mat.makeBasis(X, up, n).scale(new Vector3(1, len, 1)).setPosition(pos);
      im.setMatrixAt(i, mat);
    }
    group.add(im);

    // Figures above the ticks, on a plane in the same frame.
    const fig = new Mesh(
      new PlaneGeometry(LEN, 0.5),
      new MeshStandardMaterial({ map: figuresTexture(aniso, f.label, f.step), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    fig.position.copy(base).addScaledVector(up, 0.95).addScaledVector(n, SKIN + 0.004);
    fig.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(X, up, n));
    group.add(fig);
  }
  shadowed(group);
  // Sit the flat bottom face (y = -R/2) on the desk.
  group.position.y = R / 2 + 0.05;
  return group;
}

/* ---------- 45° set square ---------- */

function buildSetSquare(m: Mats): Group {
  const g = new Group();
  const L = 22;
  const r = 0.35;
  const s = new Shape();
  s.moveTo(r, 0);
  s.lineTo(L - r, 0);
  s.quadraticCurveTo(L, 0, L - r * 0.8, r * 0.8);
  s.lineTo(r * 0.8, L - r * 0.8);
  s.quadraticCurveTo(0, L, 0, L - r);
  s.lineTo(0, r);
  s.quadraticCurveTo(0, 0, r, 0);
  const hole = new Shape();
  const a = 3.6;
  const b = 12.4;
  hole.moveTo(a + 0.6, a);
  hole.lineTo(b, a);
  hole.quadraticCurveTo(b + 0.5, a, b - 0.3, a + 0.6);
  hole.lineTo(a + 0.6, b - 0.3);
  hole.quadraticCurveTo(a, b + 0.5, a, b);
  hole.lineTo(a, a + 0.6);
  hole.quadraticCurveTo(a, a, a + 0.6, a);
  s.holes.push(hole);
  const plate = new Mesh(
    new ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 8 }),
    m.acrylic,
  );
  plate.renderOrder = 2;
  g.add(plate);

  // Printed graduations along the base edge.
  const tick = new BoxGeometry(0.03, 1, 0.01);
  const count = 19 * 10 + 1;
  const im = new InstancedMesh(tick, m.engraving, count);
  const mat = new Matrix4();
  for (let i = 0; i < count; i++) {
    const len = i % 10 === 0 ? 0.55 : i % 5 === 0 ? 0.38 : 0.22;
    mat.makeScale(1, len, 1).setPosition(1.2 + i / 10, 0.12 + len / 2, 0.3);
    im.setMatrixAt(i, mat);
  }
  g.add(im);
  g.rotation.x = -Math.PI / 2;
  g.position.y = 0.05;
  const wrap = new Group();
  wrap.add(g);
  shadowed(wrap, false, true);
  return wrap;
}

/* ---------- Mechanical pencil (tip at the origin, body along +x) ---------- */

function buildPencil(m: Mats): Group {
  const g = new Group();
  g.add(
    rod(0.025, 0.025, -0.35, 0.05, m.graphite, 12),
    rod(0.055, 0.055, 0, 0.7, m.steel, 16),
    rod(0.07, 0.31, 0.7, 2.1, m.steel),
    rod(0.33, 0.33, 2.1, 5.3, m.steel),
    knurl(0.335, 2.2, 5.2, m.steel, 22),
  );
  const barrel = rod(0.38, 0.38, 5.3, 13, m.barrel, 6);
  barrel.rotation.x = Math.PI / 6; // a flat face down
  g.add(barrel);
  g.add(rod(0.3, 0.3, 13, 14.1, m.brass), rod(0.33, 0.33, 12.95, 13.15, m.brass));
  const tip = new Mesh(new SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.brass);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 14.1;
  g.add(tip);
  // Clip: a thin brass strap along the top.
  const clip = new Mesh(new BoxGeometry(4.2, 0.08, 0.36), m.brass);
  clip.position.set(10.8, 0.43, 0);
  const clipFoot = new Mesh(new BoxGeometry(0.3, 0.18, 0.36), m.brass);
  clipFoot.position.set(8.8, 0.38, 0);
  g.add(clip, clipFoot);
  shadowed(g);
  g.position.y = 0.33;
  return g;
}

/* ---------- Rolled drawing ---------- */

function buildRoll(m: Mats, aniso: number): Group {
  const g = new Group();
  const R = 2.1;
  const LEN = 46;
  const tube = new Mesh(new CylinderGeometry(R, R, LEN, 64, 1, true), m.paper);
  tube.rotation.z = Math.PI / 2;
  g.add(tube);
  const endMat = new MeshStandardMaterial({ map: spiralTexture(aniso), roughness: 0.95 });
  for (const s of [-1, 1]) {
    const end = new Mesh(new CircleGeometry(R, 64), endMat);
    end.rotation.y = (s * Math.PI) / 2;
    end.position.x = (s * LEN) / 2;
    g.add(end);
  }
  const band = new Mesh(new CylinderGeometry(R + 0.07, R + 0.07, 2.4, 64), m.cloth);
  band.rotation.z = Math.PI / 2;
  band.position.x = -LEN / 2 + 9;
  g.add(band);
  shadowed(g);
  g.position.y = R;
  return g;
}

/* ---------- Scene ---------- */

export interface InstrumentsOptions {
  /** Render the final, resting state at a fixed pixel ratio (for the still image). */
  still?: boolean;
  /** Play the arrival (compass opens and draws). False starts at rest. */
  intro?: boolean;
}

export interface Instruments {
  resize(width: number, height: number): void;
  /** Advances and renders. Returns false once nothing will change without input. */
  frame(timeMs: number): boolean;
  pointer(nx: number, ny: number): void;
  dispose(): void;
}

export async function createInstruments(canvasEl: HTMLCanvasElement, opts: InstrumentsOptions = {}): Promise<Instruments> {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: !!opts.still,
  });
  renderer.setPixelRatio(opts.still ? 2 : Math.min(devicePixelRatio, coarse ? 1.25 : 1.5));
  renderer.setClearColor(new Color(HERO.background), 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = HERO.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // The rule's figures are drawn in Anek; wait briefly for it.
  await Promise.race([document.fonts.load('500 54px "Anek Latin Variable"'), new Promise((r) => setTimeout(r, 400))]).catch(() => {});

  const scene = new Scene();
  scene.fog = new Fog(HERO.background, HERO.fog.near, HERO.fog.far);

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  const m = materials(env);

  // Desk and sheet.
  const desk = new Mesh(
    new PlaneGeometry(420, 420),
    Object.assign(new MeshStandardMaterial({ map: walnutTexture(aniso), roughness: 0.55, color: 0xffffff }), { envMap: env, envMapIntensity: 0.12 }),
  );
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  const sheet = new Mesh(
    new BoxGeometry(SHEET.w, 0.04, SHEET.d),
    Object.assign(new MeshStandardMaterial({ map: sheetTexture(aniso), roughness: 0.94 }), { envMap: env, envMapIntensity: 0.1 }),
  );
  sheet.position.y = 0.02;
  sheet.rotation.y = SHEET.rot;
  sheet.receiveShadow = true;
  scene.add(sheet);

  // Soft contact shadows, placed under each object.
  const blobTex = blobTexture();
  const blob = (x: number, z: number, w: number, d: number, rotY: number, opacity: number) => {
    const p = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity, depthWrite: false }));
    p.rotation.set(-Math.PI / 2, 0, rotY);
    p.position.set(x, 0.06, z);
    p.renderOrder = 1;
    scene.add(p);
    return p;
  };

  // Compass, standing on its needle in the centre of the plan.
  const needleAt = onSheet(PLAN_CENTRE.x, PLAN_CENTRE.z, 0.04);
  const compass = buildCompass(m);
  compass.pivot.position.copy(needleAt);
  scene.add(compass.pivot);
  blob(needleAt.x, needleAt.z, 1.4, 1.4, 0, 0.5);
  const leadBlob = blob(0, 0, 1.4, 1.4, 0, 0.5);

  // The arc the compass draws, a graphite ribbon on the sheet.
  const ARC_SEG = 220;
  const arcGeo = new RingGeometry(ARC_R - 0.03, ARC_R + 0.03, ARC_SEG, 1, SWEEP.from, SWEEP.to - SWEEP.from);
  arcGeo.rotateX(-Math.PI / 2);
  const arc = new Mesh(
    arcGeo,
    new MeshStandardMaterial({ color: HERO.arc, roughness: 0.55, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  arc.position.copy(needleAt).setY(0.05);
  arc.receiveShadow = true;
  scene.add(arc);
  const totalIdx = arcGeo.index!.count;

  // Scale rule along the front of the sheet.
  const rule = buildScaleRule(m, aniso);
  const ruleAt = onSheet(-4, 13.2);
  rule.position.x = ruleAt.x;
  rule.position.z = ruleAt.z;
  rule.rotation.y = Math.PI / 2 + SHEET.rot - 4 * DEG;
  scene.add(rule);
  blob(ruleAt.x, ruleAt.z, 33, 6, SHEET.rot - 4 * DEG, 0.42);

  // Set square, upper left, over the sheet's edge.
  const square = buildSetSquare(m);
  square.position.set(-27.5, 0, 0);
  square.rotation.y = 38 * DEG;
  scene.add(square);
  {
    const c = new Vector3(7.5, 0, -7.5).applyAxisAngle(new Vector3(0, 1, 0), 38 * DEG).add(square.position);
    blob(c.x, c.z, 22, 22, 38 * DEG, 0.18);
  }

  // Pencil, beside the rule, pointing at the compass.
  const pencil = buildPencil(m);
  const pencilTip = onSheet(-3.5, 3.6);
  pencil.position.x = pencilTip.x;
  pencil.position.z = pencilTip.z;
  pencil.rotation.y = (180 + 13) * DEG;
  scene.add(pencil);
  {
    const dir = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), pencil.rotation.y);
    const c = pencilTip.clone().addScaledVector(dir, 7);
    blob(c.x, c.z, 16, 1.8, pencil.rotation.y, 0.5);
  }

  // Rolled drawing, back right, running out of frame.
  const roll = buildRoll(m, aniso);
  roll.position.set(30, roll.position.y, -28);
  roll.rotation.y = 18 * DEG;
  scene.add(roll);
  blob(30, -28, 50, 6, 18 * DEG, 0.55);

  // Light.
  const key = new SpotLight(HERO.key.color, HERO.key.intensity, 0, 25 * DEG, 1, 2);
  key.position.set(-46, 72, 30);
  key.target.position.set(3, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.camera.near = 40;
  key.shadow.camera.far = 180;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 12;
  scene.add(key, key.target);
  scene.add(new HemisphereLight(HERO.fill.sky, HERO.fill.ground, HERO.fill.intensity));
  const rim = new DirectionalLight(HERO.rim.color, HERO.rim.intensity);
  rim.position.set(50, 30, -70);
  scene.add(rim);

  // Camera.
  const camera = new PerspectiveCamera(26, 1, 10, 600);
  const target = new Vector3(2, 1, 1);
  const FIT_R = 17.5; // the composition's radius, cm: the sheet's edges may crop
  let baseDist = 120;
  const elevation = 37 * DEG;
  const azimuth = -14 * DEG;

  const place = (elev: number, az: number, dist: number) => {
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(elev) * dist,
      target.y + Math.sin(elev) * dist,
      target.z + Math.cos(az) * Math.cos(elev) * dist,
    );
    camera.lookAt(target);
  };

  const resize = (w: number, h: number) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the composition in the narrower direction.
    const vHalf = (camera.fov * DEG) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    baseDist = FIT_R / Math.sin(Math.min(vHalf, hHalf));
    // On wide stages pull the target right so the copy has the dark side.
    target.x = camera.aspect > 1.05 ? -1 : -1.5;
    camera.updateProjectionMatrix();
  };

  // State.
  let start = -1;
  let last = 0;
  let settled = false;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const lead = new Vector3();

  const pose = (t: number) => {
    const a = MathUtils.lerp(OPEN.from, OPEN.to, ease(phase(t, T.openStart, T.openEnd)));
    const sweep = ease(phase(t, T.sweepStart, T.sweepEnd));
    compass.setOpen(a);
    compass.pivot.rotation.y = MathUtils.lerp(SWEEP.from, SWEEP.to, sweep);
    arc.geometry.setDrawRange(0, Math.round((sweep * totalIdx) / 6) * 6);
    const r = 2 * LEG * Math.sin(a);
    const th = compass.pivot.rotation.y;
    lead.set(needleAt.x + Math.cos(th) * r, 0.06, needleAt.z - Math.sin(th) * r);
    leadBlob.position.set(lead.x, 0.06, lead.z);
  };

  const intro = !opts.still && opts.intro !== false;
  pose(intro ? 0 : 99);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  // Compile shaders before the first visible frame, without blocking where supported.
  place(elevation, azimuth, baseDist);
  await renderer.compileAsync(scene, camera);

  return {
    resize,
    pointer(nx, ny) {
      if (coarse || opts.still) return;
      tilt.tx = nx;
      tilt.ty = ny;
    },
    frame(now) {
      if (start < 0) start = now - (intro ? 0 : 60000);
      const t = opts.still ? 99 : (now - start) / 1000;
      const animating = t < T.sweepEnd + 0.1;
      if (animating || !settled) {
        pose(t);
        renderer.shadowMap.needsUpdate = true;
        if (!animating) settled = true;
      } else {
        // Idle: drift and tilt at 30 fps is plenty.
        if (now - last < 32) return true;
      }
      last = now;
      tilt.x += (tilt.tx - tilt.x) * 0.06;
      tilt.y += (tilt.ty - tilt.y) * 0.06;
      const arrive = easeOut(phase(t, 0, T.camEnd));
      const drift = opts.still ? 0 : Math.sin((t / 24) * Math.PI * 2) * 1.5 * DEG;
      const elev = elevation + (1 - arrive) * 6 * DEG - tilt.y * 2.5 * DEG;
      const az = azimuth + drift + tilt.x * 2.5 * DEG;
      place(elev, az, baseDist * (1 + (1 - arrive) * 0.04));
      renderer.render(scene, camera);
      return true;
    },
    dispose() {
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        (mesh.geometry as BufferGeometry).dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mm) => {
          Object.values(mm).forEach((v) => (v as Texture)?.isTexture && (v as Texture).dispose());
          mm.dispose();
        });
      });
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
