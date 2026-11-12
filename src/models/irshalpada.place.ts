/**
 * Irshalpada placement maths, shared by the plan model (picking, hover
 * overlay) and the inspect stage (orientation hand-off).
 *
 * A house's local frame (irshalpada.data.ts) maps to the world as
 *   cluster (translate, turn) · −centre · mirror about the axis · house (translate, turn).
 * This repeats, as matrices, exactly what buildCluster() and the cluster
 * instances do to the geometry.
 */
import { Matrix4, Vector3 } from 'three';
import * as D from './irshalpada.data';

const DEG = Math.PI / 180;

export function clusterMatrix(c: number): Matrix4 {
  const cl = D.CLUSTERS[c];
  return new Matrix4().makeRotationY(D.OPEN_ROT[cl.opens] * DEG).setPosition(cl.at[0], 0, cl.at[1]);
}

/** House-local frame to cluster-instance frame (before the cluster matrix). */
export function houseInCluster(h: number): Matrix4 {
  const p = D.CLUSTER.houses[h];
  const [cx, cz] = D.CLUSTER.center;
  const m = new Matrix4().makeTranslation(-cx, 0, -cz);
  if (p.mirror) {
    const ax = D.CLUSTER.axis;
    m.multiply(new Matrix4().makeTranslation(ax, 0, 0)).multiply(new Matrix4().makeScale(-1, 1, 1)).multiply(new Matrix4().makeTranslation(-ax, 0, 0));
  }
  m.multiply(new Matrix4().makeTranslation(p.at[0], 0, p.at[1])).multiply(new Matrix4().makeRotationY(p.rotDeg * DEG));
  return m;
}

/** House-local to world. */
export function houseMatrix(c: number, h: number): Matrix4 {
  return clusterMatrix(c).multiply(houseInCluster(h));
}

export const houseType = (h: number): D.HouseType => (D.CLUSTER.houses[h].type === 'g' ? D.HOUSE_G : D.HOUSE_G1);

/** World centre of a house's plinth. */
export function houseCentre(c: number, h: number, y = 0): Vector3 {
  const t = houseType(h);
  return new Vector3(t.size[0] / 2, y, t.size[1] / 2).applyMatrix4(houseMatrix(c, h));
}

/**
 * Which house of cluster `c` a world point falls on, by testing the point
 * against each house's plinth (plus the eaves' overhang). −1 for the court,
 * the compound walls and trees.
 */
export function houseAt(c: number, world: Vector3): number {
  const inv = new Matrix4();
  const p = new Vector3();
  let best = -1;
  let bestD = Infinity;
  for (let h = 0; h < D.CLUSTER.houses.length; h++) {
    const t = houseType(h);
    p.copy(world).applyMatrix4(inv.copy(houseMatrix(c, h)).invert());
    const m = 0.7;
    if (p.x < -m || p.z < -m || p.x > t.size[0] + m || p.z > t.size[1] + m) continue;
    const d = Math.hypot(p.x - t.size[0] / 2, p.z - t.size[1] / 2);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}
