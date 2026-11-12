/**
 * Fallback for building types that have no detailed module yet: the plan
 * model's own massing for that building, in clay tints, on the same stage.
 * The panel says plainly that this is the massing, not the detailed model.
 */
import { BackSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as D from '../../models/irshalpada.data';
import { buildHouse, buildSchool, buildTemple, emptyLayers, type Layers } from '../../models/irshalpada';
import { boxUV } from '../kit';
import type { BuildContext, BuildingInstance, PlanSheet, TypeModule, Variant } from '../types';

const TINT: Record<keyof Layers, number> = {
  walls: 0xf2ede3,
  plinth: 0xcdbfa8,
  roofs: 0x9a5a40,
  timber: 0x5a3a26,
  foliage: 0x6f8452,
  court: 0x7d8b6a,
  dark: 0x2f2b27,
  water: 0x8ea3a3,
  jali: 0xb4623e,
};

function layersFor(typeId: string): { L: Layers; plan: PlanSheet; focus: [number, number, number]; radius: number; extent: [number, number, number, number]; title: string } {
  const L = emptyLayers();
  const plan: PlanSheet = { bounds: [0, 0, 1, 1], plinth: [], courts: [], walls: [], windows: [], doors: [], posts: [], trees: [], steps: [], rooms: [] };
  if (typeId === 'irshalpada-house-b') {
    const h = D.HOUSE_G1;
    const src = buildHouse(h);
    Object.assign(L, src);
    plan.plinth.push(h.plinth);
    plan.courts.push([[h.courtyard[0], h.courtyard[1]], [h.courtyard[2], h.courtyard[1]], [h.courtyard[2], h.courtyard[3]], [h.courtyard[0], h.courtyard[3]]]);
    for (const r of h.rooms.filter((r) => r.y0 < 1)) {
      const [x0, z0, x1, z1] = r.rect;
      plan.walls.push({ a: [x0, z0], b: [x1, z0], t: 0.23 }, { a: [x1, z0], b: [x1, z1], t: 0.23 }, { a: [x1, z1], b: [x0, z1], t: 0.23 }, { a: [x0, z1], b: [x0, z0], t: 0.23 });
    }
    plan.posts.push(...h.posts);
    plan.bounds = [-1.5, -1.5, h.size[0] + 1.5, h.size[1] + 1.5];
    return { L, plan, focus: [h.size[0] / 2, 2.5, h.size[1] / 2], radius: 13, extent: [0, 0, h.size[0], h.size[1]], title: 'Ground+1 house' };
  }
  if (typeId === 'irshalpada-school') {
    buildSchool(L);
    const [ox, oz] = D.SCHOOL.at;
    for (const list of Object.values(L)) for (const g of list as BufferGeometry[]) g.translate(-ox, 0, -oz);
    const S = D.SCHOOL;
    for (const r of [S.main.rect, ...S.wings, ...S.wings.map((w) => [-w[2], w[1], -w[0], w[3]] as D.R4)]) {
      plan.plinth.push([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]);
    }
    plan.bounds = [-22, -3, 22, 24];
    return { L, plan, focus: [0, 2, 10], radius: 24, extent: [-20, -1, 20, 20], title: 'Primary school' };
  }
  buildTemple(L);
  const T = D.TEMPLE;
  plan.plinth.push([[-T.ring / 2, -T.ring / 2], [T.ring / 2, -T.ring / 2], [T.ring / 2, T.ring / 2], [-T.ring / 2, T.ring / 2]]);
  plan.courts.push([[-T.pool / 2, -T.pool / 2], [T.pool / 2, -T.pool / 2], [T.pool / 2, T.pool / 2], [-T.pool / 2, T.pool / 2]]);
  plan.bounds = [-10, -10, 10, 10];
  return { L, plan, focus: [0, 3, 0], radius: 12, extent: [-8, -8, 8, 8], title: 'Temple of Memories' };
}

export function massingModule(typeId: string): TypeModule {
  return {
    typeId,
    release() {},
    create(ctx: BuildContext, v: Variant): BuildingInstance {
      void v;
      const { L, plan, focus, radius, extent } = layersFor(typeId);
      const group = new Group();
      const roof = new Group();
      group.add(roof);
      const own: { dispose(): void }[] = [];
      const poche: Mesh[] = [];
      const pocheMat = new MeshBasicMaterial({ color: 0x1e2756, side: BackSide });
      own.push(pocheMat);
      const clipped: MeshStandardMaterial[] = [];
      for (const key of Object.keys(L) as (keyof Layers)[]) {
        const list = L[key];
        if (!list.length) continue;
        for (const g of list) for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
        const geo = mergeGeometries(list, false);
        list.forEach((g) => g.dispose());
        if (!geo) continue;
        boxUV(geo);
        const mat = new MeshStandardMaterial({ color: TINT[key], roughness: 0.9, flatShading: key === 'roofs' || key === 'foliage', transparent: key === 'jali', opacity: key === 'jali' ? 0.85 : 1 });
        clipped.push(mat);
        own.push(geo, mat);
        const m = new Mesh(geo, mat);
        m.castShadow = key !== 'court' && key !== 'water';
        m.receiveShadow = true;
        (key === 'roofs' ? roof : group).add(m);
        if (key === 'walls' || key === 'plinth' || key === 'roofs') {
          const p = new Mesh(geo, pocheMat);
          p.visible = false;
      p.userData.poche = true;
          (key === 'roofs' ? roof : group).add(p);
          poche.push(p);
        }
      }
      void ctx;
      return {
        group,
        layers: [{ obj: roof, k: 1 }],
        liftLabel: ['Lift the roof', 'Lower the roof'],
        poche,
        clipped,
        glass: [],
        lamps: [],
        people: new Group(),
        callouts: [],
        plan,
        focus,
        radius,
        extent,
        detailed: false,
        notes: ['The detailed model of this type is not built yet. This is the plan model’s massing of the same building, so its sizes and heights are as in the site model.'],
        dispose() {
          own.forEach((o) => o.dispose());
        },
      };
    },
  };
}
