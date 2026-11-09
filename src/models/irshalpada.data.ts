/**
 * Irshalpada Rehabilitation: traced parameters (see MODEL_NOTES.md §2).
 *
 * Pure data, no three.js. Units are metres. House plans use each house's own
 * local frame: origin at the plinth's top-left on its sheet, x to the right,
 * z towards the front (the verandah steps). Heights are above ground; the
 * plinth top is +0.6 m as stated on every section.
 */

export type V2 = [number, number];
export type R4 = [number, number, number, number];

export const PLINTH = 0.6;
export const EAVE_G = 3.1;
export const RIDGE_G = 5.9;
export const FIRST_FLOOR = 3.5;
export const EAVE_UPPER = 5.8;
export const RIDGE_G1 = 8.5;
export const WALL_T = 0.23;

export interface Room {
  rect: R4;
  /** Wall base and top, metres above ground. */
  y0: number;
  y1: number;
}

export interface HouseType {
  id: 'g' | 'g1';
  name: string;
  size: V2;
  plinth: V2[];
  rooms: Room[];
  /** Intermediate floor slabs: rect, bottom, top. */
  slabs: { rect: R4; y0: number; y1: number }[];
  /**
   * Roof wings, read from the roof plans' slope arrows: two arrows = gable
   * (ridge along `axis`), one arrow = lean-to falling towards `falls`.
   */
  roofs: (
    | { kind: 'gable'; rect: R4; eave: number; ridge: number; axis: 'x' | 'z' }
    | { kind: 'mono'; rect: R4; low: number; high: number; falls: 'n' | 'e' | 's' | 'w' }
  )[];
  posts: V2[];
  /** Post height (from plinth top), metres. */
  postTop: number;
  courtyard: R4;
  trees: V2[];
  jali: { a: V2; b: V2; y0: number; y1: number }[];
  rails: { a: V2; b: V2; y: number }[];
}

/** Ground-storey house, p41 plan (22.2 px/m on the sheet original). */
export const HOUSE_G: HouseType = {
  id: 'g',
  name: 'Ground-storey house',
  size: [17.7, 14.4],
  // Courtyard is a notch in the plinth, open to the garden at the front.
  plinth: [[0, 0], [17.7, 0], [17.7, 10.1], [12.4, 10.1], [12.4, 6.3], [8.8, 6.3], [8.8, 14.4], [0, 14.4]],
  rooms: [
    { rect: [3.2, 0.9, 8.0, 4.95], y0: PLINTH, y1: EAVE_G }, // kitchen
    { rect: [8.0, 0.9, 11.6, 4.95], y0: PLINTH, y1: EAVE_G }, // bedroom
    { rect: [13.3, 1.0, 15.0, 2.6], y0: PLINTH, y1: EAVE_G }, // bath
    { rect: [15.4, 1.0, 16.9, 2.6], y0: PLINTH, y1: EAVE_G }, // toilet
    { rect: [1.1, 5.0, 6.0, 10.7], y0: PLINTH, y1: EAVE_G }, // living
    { rect: [13.0, 5.2, 16.7, 9.2], y0: PLINTH, y1: EAVE_G }, // bedroom
  ],
  slabs: [],
  // Gable ends face the front (p41 front elevation shows two white gables).
  roofs: [
    { kind: 'gable', rect: [-0.6, -0.6, 18.3, 5.6], eave: EAVE_G, ridge: RIDGE_G, axis: 'x' },
    { kind: 'gable', rect: [-0.6, -0.6, 7.4, 15.0], eave: EAVE_G, ridge: RIDGE_G, axis: 'z' },
    { kind: 'gable', rect: [12.4, 4.4, 18.3, 10.7], eave: EAVE_G, ridge: 5.4, axis: 'z' },
  ],
  posts: [[7.6, 6.4], [11.7, 6.4], [7.6, 10.8], [7.6, 13.6]],
  postTop: EAVE_G,
  courtyard: [8.8, 6.3, 12.4, 12.2],
  trees: [[10.5, 9.9]],
  // Terracotta jali to the cooking space (p41 detail), on the kitchen's back wall.
  jali: [{ a: [4.0, 0.84], b: [6.6, 0.84], y0: 1.7, y1: 2.9 }],
  rails: [],
};

/** Ground+1 house, p42 plan (24 px/m on the sheet original). */
export const HOUSE_G1: HouseType = {
  id: 'g1',
  name: 'Ground+1 house',
  size: [15.6, 13.5],
  plinth: [[0, 0], [15.6, 0], [15.6, 13.5], [9.2, 13.5], [9.2, 5.6], [5.0, 5.6], [5.0, 9.4], [0, 9.4]],
  rooms: [
    { rect: [0.8, 1.0, 2.0, 2.5], y0: PLINTH, y1: EAVE_G }, // toilet
    { rect: [2.3, 1.0, 4.4, 2.5], y0: PLINTH, y1: EAVE_G }, // bath
    { rect: [5.6, 1.0, 9.0, 4.9], y0: PLINTH, y1: FIRST_FLOOR - 0.2 }, // bedroom
    { rect: [9.0, 1.0, 13.5, 4.9], y0: PLINTH, y1: FIRST_FLOOR - 0.2 }, // kitchen
    { rect: [13.75, 1.25, 15.4, 4.9], y0: PLINTH, y1: FIRST_FLOOR - 0.2 }, // stair
    { rect: [1.0, 5.0, 4.5, 8.75], y0: PLINTH, y1: EAVE_G }, // bedroom
    { rect: [10.9, 5.2, 15.4, 10.4], y0: PLINTH, y1: EAVE_G }, // living
    // First floor: two bedrooms (p42 first-floor plan).
    { rect: [5.6, 0.8, 10.4, 5.2], y0: FIRST_FLOOR, y1: EAVE_UPPER },
    { rect: [10.4, 0.8, 15.4, 5.2], y0: FIRST_FLOOR, y1: EAVE_UPPER },
  ],
  // Bamboo first-floor slab with the balcony in front (p39 detail).
  slabs: [{ rect: [5.4, 0.6, 15.6, 6.6], y0: FIRST_FLOOR - 0.2, y1: FIRST_FLOOR }],
  // Upper gable to +8500; lower lean-tos from +2600 to +4600 (p42 section labels).
  roofs: [
    { kind: 'gable', rect: [4.8, 0.0, 16.2, 7.2], eave: EAVE_UPPER, ridge: RIDGE_G1, axis: 'x' },
    { kind: 'mono', rect: [-0.6, -0.6, 5.4, 10.0], low: 2.6, high: 4.6, falls: 'w' },
    { kind: 'mono', rect: [9.0, 7.2, 16.2, 14.1], low: 2.6, high: 4.6, falls: 'w' },
  ],
  posts: [[5.5, 6.0], [9.3, 6.0], [9.3, 9.4], [9.3, 13.3], [12.4, 13.3], [15.4, 13.3]],
  postTop: EAVE_G,
  courtyard: [5.0, 5.6, 9.2, 9.4],
  trees: [[7.4, 7.6]],
  jali: [{ a: [10.0, 0.94], b: [12.6, 0.94], y0: 1.7, y1: 2.9 }],
  rails: [{ a: [5.4, 6.55], b: [15.6, 6.55], y: FIRST_FLOOR }],
};

/**
 * The p40 cluster (18.6 px/m on the sheet original): two G+1 houses side by
 * side at the back, two ground-storey houses turned to face the shared court,
 * which opens towards +z. Mirror axis x = 19.7.
 */
export const CLUSTER = {
  size: [39.4, 29.2] as V2,
  center: [19.7, 14.6] as V2,
  axis: 19.7,
  houses: [
    { type: 'g1' as const, at: [4.1, 1.3] as V2, rotDeg: 0, mirror: false },
    { type: 'g1' as const, at: [4.1, 1.3] as V2, rotDeg: 0, mirror: true },
    // Turned 90°: the house's front (+z) faces the court (+x); origin at the south-west corner.
    { type: 'g' as const, at: [0, 29.0] as V2, rotDeg: 90, mirror: false },
    { type: 'g' as const, at: [0, 29.0] as V2, rotDeg: 90, mirror: true },
  ],
  court: [14.4, 14.8, 25.0, 29.2] as R4,
  /** Low compound walls, 1.2 m. */
  walls: [
    [[3.8, 0.3], [35.6, 0.3]],
    [[3.8, 0.3], [3.8, 11.0]],
    [[35.6, 0.3], [35.6, 11.0]],
    [[0.15, 11.0], [0.15, 29.2]],
    [[39.25, 11.0], [39.25, 29.2]],
    [[0.15, 29.2], [14.4, 29.2]],
    [[25.0, 29.2], [39.25, 29.2]],
  ] as [V2, V2][],
  trees: [[11.6, -0.8], [19.1, -1.2], [21.3, -0.9], [27.6, -0.8], [-1.0, 21.5], [40.4, 21.5]] as V2[],
};

export interface Placed {
  /** Centre in neighbourhood metres (temple at the origin, north = −z). */
  at: V2;
  /** Direction the court opens to. */
  opens: 'n' | 'e' | 's' | 'w';
}

/** 11 clusters, positions from the p38 render at 4.63 px/m, temple at the origin. */
export const CLUSTERS: Placed[] = [
  { at: [-62.2, -81.0], opens: 's' },
  { at: [-22.7, -67.6], opens: 's' },
  { at: [16.6, -81.0], opens: 's' },
  { at: [-82.1, -44.3], opens: 'e' },
  { at: [79.9, -41.7], opens: 'w' },
  { at: [-51.8, -20.1], opens: 'e' },
  { at: [49.7, -20.1], opens: 'w' },
  { at: [-69.1, 22.0], opens: 'e' },
  { at: [66.3, 22.0], opens: 'w' },
  { at: [-23.8, 28.1], opens: 'n' },
  { at: [21.6, 28.1], opens: 'n' },
];

export const OPEN_ROT: Record<Placed['opens'], number> = { s: 0, e: 90, n: 180, w: -90 };

/** Cluster the scroll story walks into (bottom-left, facing the green). */
export const FOCUS_CLUSTER = 9;

/** Primary school, p43 (18.6 px/m), local origin on the ridge line at the back. */
export const SCHOOL = {
  at: [2.2, -40.0] as V2,
  main: { rect: [-13.1, 0, 13.1, 10.5] as R4, eave: 2.7, ridge: 5.8 },
  wings: [
    [-14.3, 9.8, -6.3, 13.4],
    [-16.7, 13.0, -6.9, 16.3],
    [-19.2, 15.8, -8.5, 19.5],
  ] as R4[],
  wingEave: 2.7,
  wingRidge: 5.3,
  stage: [-6.3, 10.5, 6.3, 15.5] as R4,
};

/** Temple of Memories: proportions only, from the p39 render [assumed]. */
export const TEMPLE = {
  pool: 12.5,
  ring: 14.5,
  ringH: 0.55,
  steps: [8.4, 7.2, 6.0],
  stepH: 0.45,
  /** Plates stand on the sides of a square turned 45°, slits at its corners. */
  radius: 2.7,
  slit: 0.5,
  plateT: 0.3,
  plateH: 6.0,
  plaza: [-9, -10.5, 9, 11] as R4,
};

/** Greens and roads in neighbourhood metres. */
export const GREEN: R4 = [-35.6, -46.4, 35.6, 11.9];
export const SOUTH_GREEN: R4 = [-46, 44, 48.6, 79];
export const ROADS: { pts: V2[]; width: number }[] = [
  { pts: [[-68, -46.4], [65, -46.4]], width: 5 },
  { pts: [[-35.6, -46.4], [-35.6, 82]], width: 5 },
  { pts: [[35.6, -46.4], [35.6, 82]], width: 5 },
  { pts: [[-55, 11.9], [51, 11.9]], width: 5 },
  { pts: [[62, -110], [62, -46.4]], width: 5 },
  { pts: [[-66, -46.4], [-66, -6]], width: 4 },
  { pts: [[-52, 3], [-52, 46]], width: 4 },
  { pts: [[66, -46.4], [66, -6]], width: 4 },
  { pts: [[52, 3], [52, 46]], width: 4 },
];
export const BASE = { x0: -110, x1: 110, z0: -112, z1: 90, thickness: 2.5 };

/** Key list and hover ids: 0–10 clusters, 11 school, 12 temple. */
export const ITEMS = [
  { id: 'clusters', name: 'Housing clusters', meta: '11 clusters of 4 houses: 2 ground+1, 2 ground storey', sheet: '/assets/sheets/irshalpada-p40-cluster-design.jpg', range: [0, 10] as V2 },
  { id: 'school', name: 'Primary school', meta: 'Classrooms, office and a stage for gatherings', sheet: '/assets/sheets/irshalpada-p43-primary-school.jpg', range: [11, 11] as V2 },
  { id: 'temple', name: 'Temple of Memories', meta: 'Memorial stone on a stepped plinth in water', sheet: '/assets/sheets/irshalpada-p39-materials-temple-of-memories.jpg', range: [12, 12] as V2 },
];

export const STAGES = [
  {
    title: 'A village plan',
    text: 'Eleven clusters of four houses ring a central green. The school and the Temple of Memories sit on the green, where every cluster can reach them.',
  },
  {
    title: 'Clusters of four',
    text: 'Each cluster has two ground+1 houses at the back and two ground-storey houses turned to face each other, so a shared court forms between all four.',
  },
  {
    title: 'Verandahs, tiles and jali',
    text: 'Lime-white CSEB walls, Mangalore-tile hip roofs and timber verandah posts, the materials of the houses lost in the landslide, so the new homes do not feel alien.',
  },
  {
    title: 'Under the roofs',
    text: 'Lift the roofs and every house turns around its own courtyard. Each room opens onto it, with a tree at its centre. Toilets stand apart, on the same plinth.',
  },
  {
    title: 'In the shared court',
    text: 'At eye level the court is a room of its own: verandah steps to sit on, the balconies of the two-storey houses above, open to the street at one end.',
  },
  {
    title: 'The school and the green',
    text: 'The primary school’s stepped wings hold a forecourt and stage for classes, gram panchayat meetings, weddings and gatherings.',
  },
  {
    title: 'Temple of Memories',
    text: 'At the centre of the green, black folded plates hold a memorial stone above water: a place to remember those lost on 19 July 2023, and to look forward.',
  },
] as const;
