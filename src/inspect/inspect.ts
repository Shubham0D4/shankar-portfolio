/**
 * The inspection stage (MODEL_NOTES.md §7): a separate scene with its own
 * light, soft ground and a neutral backdrop, showing one building with a
 * slice of its plot. Fetched on the first selection only.
 *
 * Performance: it renders on demand (orbit, toggles and transitions ask for
 * frames; a still view costs nothing), the pixel ratio is capped, textures are
 * shared and size-capped by device tier, and the plan scene is paused
 * while the stage is open. The renderer, ground and material cache live for
 * the page and are reused on the next visit; everything a visit creates (the
 * building instance, its props, controls, listeners, DOM) is disposed on exit.
 * All of it is released on pagehide.
 */
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PointLight,
  PMREMGenerator,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as D from '../models/irshalpada.data';
import { boxUV } from './kit';
import type { BuildingRef } from './registry';
import { TYPE_NAMES } from './registry';
import { materials, releaseMaterials, textureBytes, type MaterialSet, type Tier } from './tex';
import type { BuildingInstance, PlanSheet, TypeModule } from './types';

export interface InspectOptions {
  ref: BuildingRef;
  all: BuildingRef[];
  /** The plan camera's direction from the building, in the building's own frame. */
  view: { az: number; el: number };
  still: boolean;
  onRequestClose(): void;
  onNavigate(ref: BuildingRef): void;
}

export interface InspectSession {
  close(): Promise<void>;
}

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- Device tier ---------- */

function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('tier');
  if (q === 'low' || q === 'high') return q;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || mem <= 4 || cores <= 4 ? 'low' : 'high';
}

/* ---------- Type modules ---------- */

const modules = new Map<string, Promise<TypeModule>>();
function loadType(typeId: string): Promise<TypeModule> {
  let p = modules.get(typeId);
  if (!p) {
    p =
      typeId === 'irshalpada-house-a'
        ? import('./buildings/irshalpada-house-a').then((m) => m.module)
        : typeId === 'irshalpada-house-b'
          ? import('./buildings/irshalpada-house-b').then((m) => m.module)
          : typeId === 'irshalpada-school'
            ? import('./buildings/irshalpada-school').then((m) => m.module)
            : typeId === 'irshalpada-temple'
              ? import('./buildings/irshalpada-temple').then((m) => m.module)
              : import('./buildings/massing').then((m) => m.massingModule(typeId));
    modules.set(typeId, p);
  }
  return p;
}

/* ---------- The persistent stage (one per page) ---------- */

interface Stage {
  tier: Tier;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  sun: DirectionalLight;
  hemi: HemisphereLight;
  env: Texture;
  ground: Mesh;
  hills: Mesh;
  mats: MaterialSet;
  plane: Plane;
  /** Interior lamps, kept for the page so the renderer's light caches do not grow per visit. */
  lamps: PointLight[];
}

let stage: Stage | null = null;

const DAY = { bg: new Color(0xe7e6df), sky: new Color(0xf4f1ea), gnd: new Color(0x8b7d66) };
const DUSK = { bg: new Color(0x2a2f4d), sky: new Color(0x4a5584), gnd: new Color(0x24201d) };

function getStage(): Stage {
  if (stage) return stage;
  const tier = detectTier();
  const canvas = document.createElement('canvas');
  canvas.className = 'inspect__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas, antialias: tier === 'high', powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, tier === 'high' ? 2 : 1.25));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new Scene();
  scene.background = DAY.bg.clone();
  scene.fog = new Fog(DAY.bg.clone(), 45, 150);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const camera = new PerspectiveCamera(34, 1, 0.4, 500);
  const hemi = new HemisphereLight(DAY.sky.clone(), DAY.gnd.clone(), 1.1);
  const sun = new DirectionalLight(0xfff0d8, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(tier === 'high' ? 2048 : 1024, tier === 'high' ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -24;
  sc.right = sc.top = 24;
  sc.near = 1;
  sc.far = 120;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(hemi, sun, sun.target);

  const mats = materials(tier);

  // Soft ground: grass that rolls gently into low hills and fades into the backdrop.
  const g = new PlaneGeometry(260, 260, tier === 'high' ? 110 : 60, tier === 'high' ? 110 : 60).rotateX(-Math.PI / 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    const k = clamp((r - 22) / 40, 0, 1);
    const swell = (Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038) + 0.6 * Math.sin(x * 0.11 - z * 0.07)) * 2.2 + Math.max(0, -z - 30) * 0.12;
    p.setY(i, -0.02 + k * k * swell);
  }
  g.computeVertexNormals();
  boxUV(g, 0.5);
  // Macro variation so the grass does not read as a repeating carpet.
  const vc = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const m = 0.82 + 0.12 * Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2) + 0.08 * Math.sin(z * 0.33 - x * 0.12);
    vc[i * 3] = m * 1.02;
    vc[i * 3 + 1] = m;
    vc[i * 3 + 2] = m * 0.9;
  }
  g.setAttribute('color', new Float32BufferAttribute(vc, 3));
  const groundMat = mats.grass.clone();
  groundMat.vertexColors = true;
  const ground = new Mesh(g, groundMat);
  ground.receiveShadow = true;
  ground.name = 'stage-ground';
  scene.add(ground);
  // Distant Sahyadri ridges [assumed], fogged into the backdrop.
  const hg = new SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const hills = new Mesh(hg, new MeshStandardMaterial({ color: 0x6f7a5a, roughness: 1, flatShading: true }));
  hills.scale.set(70, 26, 40);
  hills.position.set(-30, -4, -150);
  scene.add(hills);

  const plane = new Plane(new Vector3(0, 0, -1), 1e4);
  const lamps = [0, 1, 2].map(() => {
    const l = new PointLight(0xffb066, 0, 9, 1.6);
    scene.add(l);
    return l;
  });
  stage = { tier, renderer, scene, camera, sun, hemi, env, ground, hills, mats, plane, lamps };
  addEventListener('pagehide', releaseStage, { once: true });
  return stage;
}

function releaseStage(): void {
  if (!stage) return;
  const s = stage;
  stage = null;
  s.ground.geometry.dispose();
  (s.ground.material as Material).dispose();
  s.hills.geometry.dispose();
  (s.hills.material as Material).dispose();
  s.env.dispose();
  releaseMaterials();
  for (const p of modules.values()) void p.then((m) => m.release());
  modules.clear();
  s.renderer.dispose();
  s.renderer.forceContextLoss();
}

/* ---------- DOM ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

const mirrored = (r: BuildingRef) => r.house >= 0 && D.CLUSTER.houses[r.house].mirror;
const whereText = (r: BuildingRef) => (r.house >= 0 ? `Cluster ${r.block + 1}, plot ${String(r.plot).padStart(2, '0')}` : 'Irshalpada, on the central green');

/* ---------- Session ---------- */

export async function openInspect(o: InspectOptions): Promise<InspectSession> {
  const S = getStage();
  const { renderer, scene, camera, sun, hemi, mats, plane } = S;
  const still = o.still;
  let ref = o.ref;

  /* DOM */
  const dlg = el('dialog', 'inspect');
  dlg.setAttribute('aria-labelledby', 'inspect-title');
  const stageEl = el('div', 'inspect__stage');
  const leaders = svg('svg', { class: 'inspect__leaders', 'aria-hidden': 'true' });
  const labels = el('ul', 'inspect__callouts');
  labels.setAttribute('aria-label', 'Details on the model');
  const hint = el(
    'p',
    'inspect__hint label',
    matchMedia('(pointer: coarse)').matches ? 'Drag to turn. Pinch to zoom. Two fingers to pan.' : 'Drag to turn. Scroll to zoom. Right-drag to pan. Arrow keys turn, + and − zoom.',
  );
  stageEl.append(renderer.domElement, leaders, labels, hint);

  const panel = el('aside', 'inspect__panel');
  const back = el('button', 'filter inspect__back', 'Back to the plan');
  back.type = 'button';
  const where = el('p', 'label inspect__where');
  const title = el('h2', 'inspect__title');
  title.id = 'inspect-title';
  const nav = el('div', 'inspect__nav');
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Other buildings');
  const prev = el('button', 'filter', 'Previous');
  const next = el('button', 'filter', 'Next');
  prev.type = next.type = 'button';
  const count = el('span', 'label inspect__count');
  nav.append(prev, count, next);
  const head = el('div', 'inspect__head');
  const notice = el('p', 'inspect__notice label', 'Massing only: the detailed model of this type is not built yet.');
  head.append(back, where, title, notice, nav);

  const controls = el('div', 'inspect__controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'View');
  const btn = (text: string, pressed: boolean) => {
    const b = el('button', 'filter', text);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(pressed));
    return b;
  };
  const light = el('div', 'inspect__pair');
  light.setAttribute('role', 'group');
  light.setAttribute('aria-label', 'Light');
  const dayB = btn('Day', true);
  const duskB = btn('Dusk', false);
  light.append(dayB, duskB);
  const peopleB = btn('People', true);
  const labelsB = btn('Labels', true);
  const roofB = btn('Lift the roof', false);
  const range = el('label', 'inspect__range');
  const rangeName = el('span', 'label', 'Section cut');
  const slider = el('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = '0';
  slider.setAttribute('aria-valuetext', 'Off');
  range.append(rangeName, slider);
  controls.append(light, peopleB, labelsB, roofB, range);

  const planFig = el('figure', 'inspect__plan');
  const planSvg = svg('svg', { role: 'img' });
  const planCap = el('figcaption', 'label', 'Plan drawn from the model. The marker is where you are looking from.');
  planFig.append(planSvg, planCap);
  const key = el('p', 'inspect__key label');
  key.innerHTML = '<span class="inspect__k inspect__k--pdf"></span>From the drawings <span class="inspect__k inspect__k--assumed"></span>Assumed';
  const notes = el('div', 'inspect__notes');
  const stats = el('details', 'inspect__stats');
  stats.innerHTML = '<summary class="label">Performance</summary><dl></dl>';
  panel.append(head, controls, planFig, key, notes, stats);

  const status = el('p', 'visually-hidden');
  status.setAttribute('role', 'status');
  dlg.append(stageEl, panel, status);
  document.body.append(dlg);

  /* Scene state */
  const holder = new Group();
  const pivot = new Group();
  holder.add(pivot);
  scene.add(holder);
  let inst: BuildingInstance | null = null;
  let dusk = 0;
  let duskTo = 0;
  let lift = 0;
  let liftTo = 0;
  let enter = 0;
  let enterTo = 1;
  let leaving: (() => void) | null = null;
  let disposed = false;

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = !still;
  orbit.dampingFactor = 0.08;
  orbit.minDistance = 6;
  orbit.maxDistance = 58;
  orbit.minPolarAngle = 0.12;
  orbit.maxPolarAngle = 1.48;
  orbit.zoomToCursor = false;

  /* Render on demand */
  let raf = 0;
  let last = 0;
  const invalidate = () => {
    if (!raf && !disposed) raf = requestAnimationFrame(tick);
  };
  orbit.addEventListener('change', invalidate);

  const resize = () => {
    const r = stageEl.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
    leaders.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    invalidate();
  };
  const ro = new ResizeObserver(resize);

  /* Building */
  const extentWorld = () => {
    // Front and back of the plinth along world z, for the section cut.
    const [, z0, , z1] = inst!.extent;
    const fz = inst!.focus[2];
    return [z0 - fz, z1 - fz];
  };
  const applyCut = () => {
    if (!inst) return;
    const v = Number(slider.value) / 100;
    const [zb, zf] = extentWorld();
    plane.constant = v > 0 ? lerp(zf + 0.3, zb + 1.5, v) : 1e4;
    for (const p of inst.poche) p.visible = v > 0;
    slider.setAttribute('aria-valuetext', v > 0 ? `Cut ${Math.round(v * 100)} per cent of the way from the front` : 'Off');
  };
  const setBuilding = async (r: BuildingRef) => {
    const mod = await loadType(r.typeId);
    if (disposed) return;
    if (inst) {
      pivot.remove(inst.group);
      inst.dispose();
    }
    ref = r;
    inst = mod.create({ tier: S.tier, mats, still }, { seed: r.plot || 1, mirror: mirrored(r) });
    pivot.scale.x = mirrored(r) ? -1 : 1;
    inst.group.position.set(-inst.focus[0], 0, -inst.focus[2]);
    pivot.add(inst.group);
    for (const m of inst.clipped) m.clippingPlanes = [plane];
    for (const p of inst.poche) (p.material as Material).clippingPlanes = [plane];
    setPeople(peopleB.getAttribute('aria-pressed') === 'true');
    // Fit the shadow camera and the zoom limit to the building.
    const half = Math.max(24, inst.radius * 1.35);
    const scam = sun.shadow.camera;
    scam.left = scam.bottom = -half;
    scam.right = scam.top = half;
    scam.updateProjectionMatrix();
    orbit.maxDistance = Math.max(58, inst.radius * 3);
    roofB.disabled = !inst.layers.length;
    roofB.textContent = inst.liftLabel[roofB.getAttribute('aria-pressed') === 'true' ? 1 : 0];
    peopleB.disabled = !inst.people.children.length;
    labelsB.disabled = !inst.callouts.length;
    applyLift();
    // Title block.
    where.textContent = whereText(r);
    title.textContent = r.house >= 0 ? `${TYPE_NAMES[r.typeId]}, type ${r.kind.toUpperCase()}` : r.label;
    const i = o.all.indexOf(o.all.find((x) => x.id === r.id)!);
    count.textContent = `${i + 1} of ${o.all.length}`;
    notice.hidden = inst.detailed;
    notes.replaceChildren(...inst.notes.map((n) => el('p', undefined, n)));
    buildLabels();
    drawPlan(inst.plan);
    applyCut();
    applyLight();
    status.textContent = `${r.label}. ${inst.detailed ? 'Detailed model.' : 'Massing only; the detailed model of this type is not built yet.'}`;
    invalidate();
    requestAnimationFrame(() => requestAnimationFrame(updateStats));
  };

  /* Callouts */
  let items: { li: HTMLLIElement; line: SVGLineElement; dot: SVGCircleElement; c: BuildingInstance['callouts'][number] }[] = [];
  const buildLabels = () => {
    labels.replaceChildren();
    leaders.replaceChildren();
    items = (inst?.callouts ?? []).map((c) => {
      const li = el('li', `inspect__callout inspect__callout--${c.source}`);
      const t = el('span', 'inspect__callout-title', c.title);
      const d = el('span', 'inspect__callout-detail', c.detail);
      const tag = el('span', 'inspect__tag', c.source === 'pdf' ? 'Drawn' : 'Assumed');
      li.append(t, d, tag);
      labels.append(li);
      const line = svg('line', { class: `inspect__leader inspect__leader--${c.source}` });
      const dot = svg('circle', { r: 3.5, class: `inspect__dot inspect__dot--${c.source}` });
      leaders.append(line, dot);
      return { li, line, dot, c };
    });
  };
  const v3 = new Vector3();
  const n3 = new Vector3();
  // Occlusion is tested when the view settles, not on every orbit frame.
  const hidden = new Set<(typeof items)[number]>();
  let settle = 0;
  const occlude = () => {
    settle = 0;
    if (!inst || disposed) return;
    hidden.clear();
    const r = new Raycaster();
    for (const it of items) {
      const obj = it.c.layer !== undefined ? inst!.layers[it.c.layer].obj : inst!.group;
      const p = new Vector3(...it.c.at).applyMatrix4(obj.matrixWorld);
      const d = camera.position.distanceTo(p);
      r.set(camera.position, p.clone().sub(camera.position).normalize());
      r.far = d - 0.35;
      const hit = r.intersectObject(inst.group, true).find((h) => h.object.visible && (h.object as Mesh).isMesh && !(h.object as Mesh).userData.poche);
      if (hit) hidden.add(it);
    }
    placeLabels();
  };
  const scheduleOcclusion = () => {
    clearTimeout(settle);
    settle = window.setTimeout(occlude, 140);
  };
  const placeLabels = () => {
    const show = labelsB.getAttribute('aria-pressed') === 'true' && enter > 0.98;
    const W = stageEl.clientWidth;
    const H = stageEl.clientHeight;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const vis = items
      .map((it) => {
        if (!show || !inst || hidden.has(it)) return null;
        const obj = it.c.layer !== undefined ? inst!.layers[it.c.layer].obj : inst!.group;
        v3.set(...it.c.at).applyMatrix4(obj.matrixWorld);
        if (v3.z > plane.constant + 0.05) return null;
        if (it.c.facing) {
          n3.set(...it.c.facing).transformDirection(obj.matrixWorld);
          if (n3.dot(camera.position.clone().sub(v3).normalize()) < 0.08) return null;
        }
        const p = v3.clone().project(camera);
        if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return null;
        return { it, x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, d: camera.position.distanceTo(v3) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.d - b.d)
      .slice(0, W < 560 ? 3 : W < 900 ? 5 : 9);
    const shown = new Set(vis.map((v) => v.it));
    for (const it of items) {
      if (!shown.has(it)) {
        it.li.hidden = true;
        it.line.style.display = it.dot.style.display = 'none';
      }
    }
    for (const v of vis) {
      const { li, line, dot } = v.it;
      li.hidden = false;
      const w = li.offsetWidth || 160;
      const h = li.offsetHeight || 40;
      const right = v.x > W / 2;
      let x = right ? v.x + 46 : v.x - 46 - w;
      let y = v.y - 54 - h / 2;
      x = clamp(x, 8, W - w - 8);
      y = clamp(y, 8, H - h - 8);
      // Nudge down past labels already placed.
      for (let k = 0; k < 12; k++) {
        const hit = placed.find((q) => x < q.x + q.w + 6 && x + w + 6 > q.x && y < q.y + q.h + 6 && y + h + 6 > q.y);
        if (!hit) break;
        y = hit.y + hit.h + 8;
      }
      placed.push({ x, y, w, h });
      li.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      const ax = right ? x : x + w;
      const ay = y + h / 2;
      line.setAttribute('x1', String(v.x));
      line.setAttribute('y1', String(v.y));
      line.setAttribute('x2', String(ax));
      line.setAttribute('y2', String(ay));
      dot.setAttribute('cx', String(v.x));
      dot.setAttribute('cy', String(v.y));
      line.style.display = dot.style.display = '';
    }
  };

  /* Plan inset: drawn in world plan coordinates, so mirroring shows as it is. */
  let marker: SVGGElement | null = null;
  let cone: SVGGElement | null = null;
  const drawPlan = (P: PlanSheet) => {
    planSvg.replaceChildren();
    const s = pivot.scale.x;
    const [fx, , fz] = inst!.focus;
    const X = (x: number) => s * (x - fx);
    const Z = (z: number) => z - fz;
    const xs = [X(P.bounds[0]), X(P.bounds[2])];
    const vb = [Math.min(...xs), Z(P.bounds[1]), Math.abs(xs[1] - xs[0]), P.bounds[3] - P.bounds[1]];
    planSvg.setAttribute('viewBox', vb.join(' '));
    planSvg.setAttribute('aria-label', `Plan of ${ref.label}, ${Math.round(vb[2])} by ${Math.round(vb[3])} metres including the plot`);
    const pts = (poly: [number, number][]) => poly.map(([x, z]) => `${X(x).toFixed(2)},${Z(z).toFixed(2)}`).join(' ');
    const g = svg('g');
    if (P.boundary) g.append(svg('polygon', { points: pts(P.boundary), class: 'plan__plot' }));
    for (const p of P.plinth) g.append(svg('polygon', { points: pts(p), class: 'plan__plinth' }));
    for (const c of P.courts) g.append(svg('polygon', { points: pts(c), class: 'plan__court' }));
    for (const st of P.steps) {
      g.append(svg('polygon', { points: pts(st), class: 'plan__steps' }));
    }
    for (const t of P.trees) g.append(svg('circle', { cx: X(t.at[0]), cy: Z(t.at[1]), r: t.r, class: 'plan__tree' }));
    for (const w of P.walls) g.append(svg('line', { x1: X(w.a[0]), y1: Z(w.a[1]), x2: X(w.b[0]), y2: Z(w.b[1]), 'stroke-width': w.t, class: 'plan__wall' }));
    for (const w of P.windows) g.append(svg('line', { x1: X(w.a[0]), y1: Z(w.a[1]), x2: X(w.b[0]), y2: Z(w.b[1]), class: 'plan__window' }));
    for (const d of P.doors) {
      const r = Math.hypot(d.leaf[0] - d.hinge[0], d.leaf[1] - d.hinge[1]);
      g.append(svg('path', { d: `M${X(d.hinge[0])},${Z(d.hinge[1])} L${X(d.leaf[0])},${Z(d.leaf[1])}`, class: 'plan__door' }));
      void r;
    }
    for (const p of P.posts) g.append(svg('rect', { x: X(p[0]) - 0.17, y: Z(p[1]) - 0.17, width: 0.34, height: 0.34, class: 'plan__post' }));
    for (const r of P.rooms) {
      const t = svg('text', { x: X(r.at[0]), y: Z(r.at[1]), class: 'plan__room' });
      t.textContent = r.name;
      g.append(t);
    }
    planSvg.append(g);
    marker = svg('g', { class: 'plan__you' });
    cone = svg('g');
    cone.append(svg('path', { d: 'M0,0 L-3.2,-7 L3.2,-7 Z', class: 'plan__cone' }), svg('circle', { r: 0.9, class: 'plan__eye' }));
    const lbl = svg('text', { class: 'plan__you-label', y: 2.6 });
    lbl.textContent = 'You';
    marker.append(cone, lbl);
    planSvg.append(marker);
  };
  const placeMarker = () => {
    if (!marker || !inst) return;
    const vb = planSvg.viewBox.baseVal;
    const pad = 1.2;
    const x = clamp(camera.position.x, vb.x + pad, vb.x + vb.width - pad);
    const z = clamp(camera.position.z, vb.y + pad, vb.y + vb.height - pad);
    const t = orbit.target;
    const ang = Math.atan2(t.x - camera.position.x, -(t.z - camera.position.z)) / DEG;
    marker.setAttribute('transform', `translate(${x.toFixed(2)} ${z.toFixed(2)})`);
    cone?.setAttribute('transform', `rotate(${(ang + 180).toFixed(1)})`);
  };

  const setPeople = (v: boolean) => {
    if (!inst) return;
    inst.people.visible = v;
    inst.group.traverse((o) => {
      if (o.userData.people) o.visible = v;
    });
  };

  /* Lift: each layer rises by k × 3.6 m. */
  const applyLift = () => {
    if (!inst) return;
    const e = ease(lift);
    for (const l of inst.layers) l.obj.position.y = e * 3.6 * l.k;
  };

  /* Light */
  const applyLight = () => {
    const k = dusk;
    (scene.background as Color).copy(DAY.bg).lerp(DUSK.bg, k);
    (scene.fog as Fog).color.copy(scene.background as Color);
    hemi.color.copy(DAY.sky).lerp(DUSK.sky, k);
    hemi.groundColor.copy(DAY.gnd).lerp(DUSK.gnd, k);
    hemi.intensity = lerp(1.1, 0.22, k);
    const az = lerp(135, 255, k) * DEG;
    const elv = lerp(44, 5, k) * DEG;
    sun.position.set(Math.sin(az) * Math.cos(elv) * 60, Math.sin(elv) * 60, -Math.cos(az) * Math.cos(elv) * 60);
    sun.color.setHex(0xfff0d8).lerp(new Color(0xff8a4a), k);
    sun.intensity = lerp(3.0, 0.9, k);
    scene.environmentIntensity = lerp(0.55, 0.06, k);
    renderer.toneMappingExposure = lerp(1.0, 1.05, k);
    if (inst) {
      for (const g of inst.glass) g.emissiveIntensity = k * 3.2;
      inst.group.updateWorldMatrix(true, false);
      S.lamps.forEach((l, i) => {
        const at = inst!.lamps[i];
        if (at) l.position.set(...at).applyMatrix4(inst!.group.matrixWorld);
        l.intensity = at ? k * 32 : 0;
      });
    }
    dlg.classList.toggle('is-dusk', k > 0.5);
  };

  /* Stats */
  const updateStats = () => {
    if (!inst || disposed) return;
    renderer.render(scene, camera);
    const info = renderer.info;
    const shadow = S.sun.shadow.mapSize.x * S.sun.shadow.mapSize.y * 4;
    const data = {
      tier: S.tier,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      textureMB: +((textureBytes(S.tier) + shadow) / 1048576).toFixed(1),
      pixelRatio: renderer.getPixelRatio(),
    };
    const dl = stats.querySelector('dl')!;
    dl.replaceChildren(
      ...Object.entries({
        'Draw calls': data.drawCalls,
        Triangles: data.triangles.toLocaleString('en-GB'),
        'Texture memory': `${data.textureMB} MB`,
        'Device tier': data.tier,
        'Pixel ratio': data.pixelRatio,
      }).flatMap(([k, v]) => [el('dt', undefined, k), el('dd', undefined, String(v))]),
    );
    (window as unknown as { __inspectStats?: unknown }).__inspectStats = data;
  };

  /* Frame */
  const startDist = 52;
  let endDist = 30;
  const glide = { azS: 0, elS: 0.5, azE: 0, elE: 0.4 };
  const tick = (t: number) => {
    raf = 0;
    const dt = last ? Math.min(0.3, (t - last) / 1000) : 0.016;
    last = t;
    let anim = false;
    const step = (v: number, to: number, dur: number) => (still ? to : v + Math.sign(to - v) * Math.min(Math.abs(to - v), dt / dur));
    if (enter !== enterTo) {
      enter = step(enter, enterTo, enterTo > enter ? 1.0 : 0.45);
      const e = ease(enter);
      holder.position.y = -1.8 * (1 - e);
      // The camera glides in on the way in; on the way out the building sinks.
      if (enterTo === 1) {
        // Orbit from the plan camera's direction round to a three-quarter front view.
        const az = glide.azS + (glide.azE - glide.azS) * e;
        const el = lerp(glide.elS, glide.elE, e);
        const d = lerp(startDist, endDist, e);
        camera.position.set(orbit.target.x + Math.sin(az) * Math.cos(el) * d, orbit.target.y + Math.sin(el) * d, orbit.target.z - Math.cos(az) * Math.cos(el) * d);
        camera.lookAt(orbit.target);
      }
      anim = true;
      if (enter === enterTo && enterTo === 0) leaving?.();
    }
    if (dusk !== duskTo) {
      dusk = step(dusk, duskTo, 0.7);
      applyLight();
      anim = true;
    }
    if (lift !== liftTo && inst) {
      lift = step(lift, liftTo, 0.8);
      applyLift();
      anim = true;
    }
    const moved = orbit.update();
    // Keep the pan target near the building.
    const reach = Math.max(14, (inst?.radius ?? 15) * 0.9);
    orbit.target.x = clamp(orbit.target.x, -reach, reach);
    orbit.target.z = clamp(orbit.target.z, -reach, reach);
    orbit.target.y = clamp(orbit.target.y, 0.3, 5);
    renderer.render(scene, camera);
    placeLabels();
    placeMarker();
    if (anim || moved) invalidate();
    else scheduleOcclusion();
  };

  /* Input */
  const keyTurn = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const off = camera.position.clone().sub(orbit.target);
    const sph = { r: off.length(), th: Math.atan2(off.x, off.z), ph: Math.acos(clamp(off.y / off.length(), -1, 1)) };
    if (e.key === 'ArrowLeft') sph.th -= 12 * DEG;
    else if (e.key === 'ArrowRight') sph.th += 12 * DEG;
    else if (e.key === 'ArrowUp') sph.ph = clamp(sph.ph - 8 * DEG, orbit.minPolarAngle, orbit.maxPolarAngle);
    else if (e.key === 'ArrowDown') sph.ph = clamp(sph.ph + 8 * DEG, orbit.minPolarAngle, orbit.maxPolarAngle);
    else if (e.key === '+' || e.key === '=') sph.r = clamp(sph.r * 0.85, orbit.minDistance, orbit.maxDistance);
    else if (e.key === '-') sph.r = clamp(sph.r / 0.85, orbit.minDistance, orbit.maxDistance);
    else return;
    e.preventDefault();
    camera.position.set(orbit.target.x + sph.r * Math.sin(sph.ph) * Math.sin(sph.th), orbit.target.y + sph.r * Math.cos(sph.ph), orbit.target.z + sph.r * Math.sin(sph.ph) * Math.cos(sph.th));
    camera.lookAt(orbit.target);
    invalidate();
  };
  dlg.addEventListener('keydown', keyTurn);
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    o.onRequestClose();
  });
  back.addEventListener('click', () => o.onRequestClose());

  // A click on empty space (the backdrop or the open ground) leaves.
  const ray = new Raycaster();
  let down: { x: number; y: number } | null = null;
  const cv = renderer.domElement;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || !inst) return (down = null);
    down = null;
    const r = cv.getBoundingClientRect();
    ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObject(inst.group, true).find((h) => (h.object as Mesh).isMesh && h.object.visible);
    if (!hit) o.onRequestClose();
  };
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointerup', onUp);

  const press = (b: HTMLButtonElement, v: boolean) => b.setAttribute('aria-pressed', String(v));
  dayB.addEventListener('click', () => {
    press(dayB, true);
    press(duskB, false);
    duskTo = 0;
    invalidate();
  });
  duskB.addEventListener('click', () => {
    press(dayB, false);
    press(duskB, true);
    duskTo = 1;
    invalidate();
  });
  peopleB.addEventListener('click', () => {
    const v = peopleB.getAttribute('aria-pressed') !== 'true';
    press(peopleB, v);
    if (inst) setPeople(v);
    invalidate();
  });
  labelsB.addEventListener('click', () => {
    press(labelsB, labelsB.getAttribute('aria-pressed') !== 'true');
    invalidate();
  });
  roofB.addEventListener('click', () => {
    const v = roofB.getAttribute('aria-pressed') !== 'true';
    press(roofB, v);
    roofB.textContent = inst?.liftLabel[v ? 1 : 0] ?? '';
    liftTo = v ? 1 : 0;
    invalidate();
  });
  slider.addEventListener('input', () => {
    applyCut();
    invalidate();
  });
  const go = (d: number) => {
    const i = o.all.findIndex((x) => x.id === ref.id);
    const r = o.all[(i + d + o.all.length) % o.all.length];
    void setBuilding(r).then(() => o.onNavigate(r));
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));

  /* Open */
  await setBuilding(ref);
  dlg.showModal();
  ro.observe(stageEl);
  resize();
  // Start from the plan camera's direction, a little lower, then glide in.
  const s = pivot.scale.x;
  const az = o.view.az * DEG;
  const elv = clamp(o.view.el, 16, 40) * DEG;
  endDist = clamp(inst!.radius * 2.6, 16, 52);
  orbit.target.set(0, inst!.focus[1], 0);
  // Stage azimuth of the plan camera (mirrored houses flip x), then the nearest three-quarter front.
  let azS = Math.atan2(s * Math.sin(az), Math.cos(az));
  const fronts = [150 * DEG, 210 * DEG];
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  let azE = fronts.reduce((best, f) => (Math.abs(wrap(f - azS)) < Math.abs(wrap(best - azS)) ? f : best), fronts[0]);
  azE = azS + wrap(azE - azS);
  if (!inst!.detailed) azE = azS; // massing views keep the plan's direction
  Object.assign(glide, { azS, elS: elv, azE, elE: 24 * DEG });
  const at = still ? azE : azS;
  const atEl = still ? glide.elE : elv;
  const d0 = still ? endDist : startDist;
  camera.position.set(Math.sin(at) * Math.cos(atEl) * d0, orbit.target.y + Math.sin(atEl) * d0, -Math.cos(at) * Math.cos(atEl) * d0);
  camera.lookAt(orbit.target);
  void azS;
  if (still) {
    enter = 1;
    holder.position.y = 0;
  }
  requestAnimationFrame(() => dlg.classList.add('is-open'));
  back.focus();
  invalidate();
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __stage: {
        scene,
        camera,
        orbit,
        renderer,
        setView(az: number, el: number, dist: number, ty = 1.6, tx = 0, tz = 0) {
          orbit.target.set(tx, ty, tz);
          camera.position.set(tx + Math.sin(az * DEG) * Math.cos(el * DEG) * dist, ty + Math.sin(el * DEG) * dist, tz - Math.cos(az * DEG) * Math.cos(el * DEG) * dist);
          camera.lookAt(orbit.target);
          invalidate();
        },
        invalidate,
        box: () => new Box3().setFromObject(inst!.group),
      },
    });
  }

  return {
    close() {
      return new Promise<void>((resolve) => {
        const finish = () => {
          if (disposed) return resolve();
          disposed = true;
          cancelAnimationFrame(raf);
          raf = 0;
          ro.disconnect();
          orbit.dispose();
          cv.removeEventListener('pointerdown', onDown);
          cv.removeEventListener('pointerup', onUp);
          S.lamps.forEach((l) => (l.intensity = 0));
          if (inst) {
            pivot.remove(inst.group);
            inst.dispose();
            inst = null;
          }
          scene.remove(holder);
          // The renderer's cached render list still points at the last frame's meshes.
          renderer.renderLists.dispose();
          for (const p of [plane]) p.constant = 1e4;
          if (dlg.open) dlg.close();
          dlg.remove();
          resolve();
        };
        dlg.classList.remove('is-open');
        if (still) return finish();
        leaving = finish;
        enterTo = 0;
        invalidate();
        // Safety: finish even if no frame comes (tab hidden).
        setTimeout(finish, 900);
      });
    },
  };
}
