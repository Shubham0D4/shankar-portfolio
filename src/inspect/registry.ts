/**
 * Building registry for the building-inspect feature (MODEL_NOTES.md §7).
 *
 * Pure data, no three.js. Every selectable building in a plan model gets a
 * stable id, a type id and a label. The plan meshes are merged and instanced,
 * so these records stand in for per-object `userData`.
 *
 * Irshalpada plots are numbered 01–44 by cluster: (cluster − 1) × 4 + house,
 * where houses 1–2 are the ground+1 pair (type B) and 3–4 the ground-storey
 * pair (type A), in the order of CLUSTER.houses.
 */
import * as D from '../models/irshalpada.data';

export type IrshalpadaKind = 'a' | 'b' | 'school' | 'temple';

export interface BuildingRef {
  /** Stable id, used in the URL: `?building=irshalpada-a-12`. */
  id: string;
  /** Building type: one detailed module per type. */
  typeId: string;
  kind: IrshalpadaKind;
  /** Short name, e.g. "House type A, plot 12". */
  label: string;
  /** Second line, e.g. "Ground-storey house in cluster 3". */
  sub: string;
  /** Block id in the plan model (cluster index, or the school/temple block). */
  block: number;
  /** Index into CLUSTER.houses, or −1. */
  house: number;
  /** Plot number 1–44, or 0. */
  plot: number;
  /** Whether a detailed inspect model exists for this type yet. */
  detailed: boolean;
}

export const TYPE_NAMES: Record<string, string> = {
  'irshalpada-house-a': 'Ground-storey house',
  'irshalpada-house-b': 'Ground+1 house',
  'irshalpada-school': 'Primary school',
  'irshalpada-temple': 'Temple of Memories',
};

/** Types with a detailed module in src/inspect/buildings. */
export const DETAILED_TYPES = new Set(['irshalpada-house-a']);

const pad = (n: number) => String(n).padStart(2, '0');

export function irshalpadaBuildings(): BuildingRef[] {
  const out: BuildingRef[] = [];
  D.CLUSTERS.forEach((_, c) => {
    D.CLUSTER.houses.forEach((h, i) => {
      const plot = c * 4 + i + 1;
      const kind = h.type === 'g' ? 'a' : 'b';
      const typeId = `irshalpada-house-${kind}`;
      out.push({
        id: `irshalpada-${kind}-${pad(plot)}`,
        typeId,
        kind,
        label: `House type ${kind.toUpperCase()}, plot ${pad(plot)}`,
        sub: `${TYPE_NAMES[typeId]} in cluster ${c + 1}`,
        block: c,
        house: i,
        plot,
        detailed: DETAILED_TYPES.has(typeId),
      });
    });
  });
  const n = D.CLUSTERS.length;
  out.push(
    { id: 'irshalpada-school', typeId: 'irshalpada-school', kind: 'school', label: 'Primary school', sub: 'Classrooms, office and a stage', block: n, house: -1, plot: 0, detailed: false },
    { id: 'irshalpada-temple', typeId: 'irshalpada-temple', kind: 'temple', label: 'Temple of Memories', sub: 'Memorial on a stepped plinth in water', block: n + 1, house: -1, plot: 0, detailed: false },
  );
  return out;
}
