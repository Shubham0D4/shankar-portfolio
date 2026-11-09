/**
 * Dharavi Rerooted: traced plates and diagram parameters (see MODEL_NOTES.md §6).
 *
 * Pure data, no three.js. Metres; x east, z south. Tower plates are traced
 * from the p49 (1BHK, 22 px/m) and p50 (2BHK, 24.6 px/m) floor plates and
 * centred on the lift lobby. Cluster placement is a diagram, not a site plan.
 */

export type V2 = [number, number];
export type R4 = [number, number, number, number];

export const FLOOR_H = 3.0;
export const FLOORS = 22;
export const HEIGHT = FLOOR_H * FLOORS;
export const MACHINE = 3.5;

export interface Plate {
  id: 'sra' | 'saleable';
  unit: string;
  perFloor: number;
  /** Arm bodies and lobby core: [x0, z0, x1, z1]. */
  body: R4[];
  /** Service bumps on the outer faces (wet cores with jali). */
  bumps: R4[];
}

const sym = (cx: number, cz: number, w: number, d: number): R4 => [cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2];

/** p49 1BHK floor plate, 22 px/m, centre (1925, 480) on the sheet. */
export const SRA_PLATE: Plate = {
  id: 'sra',
  unit: '1BHK, 32.30 m² carpet',
  perFloor: 16,
  body: [sym(0, 0, 6.8, 42.2), sym(0, 0, 36.8, 7.0), sym(0, 0, 8.0, 14.0)],
  bumps: [
    ...[-18, -10.9, 10.5, 17.6].flatMap((z) => [sym(-4.3, z, 2.7, 4.1), sym(4.3, z, 2.7, 4.1)]),
    ...[-14.8, -7.7, 8.0, 15.0].flatMap((x) => [sym(x, -4.8, 3.6, 2.6), sym(x, 4.8, 3.6, 2.6)]),
  ],
};

/** p50 2BHK floor plate, 24.6 px/m, centre (1902, 540) on the sheet. */
export const SALE_PLATE: Plate = {
  id: 'saleable',
  unit: '2BHK, 46.11 m² carpet',
  perFloor: 8,
  body: [sym(0, 0, 8.6, 40.4), sym(0, 0, 34.4, 7.6), sym(0, 0, 8.8, 15.6)],
  bumps: [
    ...[-16.4, 16.3].flatMap((z) => [sym(-5.9, z, 3.2, 5.1), sym(5.9, z, 3.2, 5.1)]),
    ...[-13.3, 12.9].flatMap((x) => [sym(x, -5.4, 4.2, 3.2), sym(x, 5.6, 4.2, 4.5)]),
  ],
};

/* ---------- Clusters ---------- */

export const SPACING = 76;
export const BUFFER = 36;
/** Cluster centres: inner tower faces about 40 m apart across the buffer. */
export const CLUSTER_C = { sra: [-(BUFFER / 2 + SPACING / 2 + 20), 0] as V2, saleable: [BUFFER / 2 + SPACING / 2 + 20, 0] as V2 };

export const towerCentres = (c: V2): V2[] => [
  [c[0] - SPACING / 2, c[1] - SPACING / 2],
  [c[0] + SPACING / 2, c[1] - SPACING / 2],
  [c[0] - SPACING / 2, c[1] + SPACING / 2],
  [c[0] + SPACING / 2, c[1] + SPACING / 2],
];

/** Community strips between towers and the central court, relative to a cluster centre. */
export const COURT = sym(0, 0, 34, 34);
export const STRIPS: R4[] = [sym(0, -SPACING / 2, 30, 9), sym(0, SPACING / 2, 30, 9), sym(-SPACING / 2, 0, 9, 30), sym(SPACING / 2, 0, 9, 30)];

/** Community centre (p50), relative to the SRA cluster centre: on the south edge of the court. */
export const CENTRE = {
  at: [0, SPACING / 2 + 26] as V2,
  parts: [
    { r: [-25, -8.5, -6, -3] as R4, h: 4.2, kind: 'rooms' }, // classrooms and staff
    { r: [-25, -3, -20, 8.5] as R4, h: 4.2, kind: 'rooms' }, // toilets and assembly hall
    { r: [-19, -2, -1, 8.5] as R4, h: 0.15, kind: 'play' }, // anganwadi playground
    { r: [1, -7.5, 18, 4] as R4, h: 6.5, kind: 'hall' }, // community hall, 200 m²
    { r: [18, -4.5, 25, 3] as R4, h: 4.2, kind: 'rooms' }, // pantry and store
    { r: [6, 4, 13, 8.5] as R4, h: 4.2, kind: 'rooms' }, // toilets
  ],
};

export const BOARD = { x0: -270, x1: 270, z0: -190, z1: 190, thickness: 4 };
export const ROAD = { w: 12 };

/* ---------- Key and story ---------- */

export const ITEMS = [
  { id: 'sra', name: 'SRA towers', meta: '1BHK flats, 16 a floor, 22 floors', sheet: '/assets/sheets/dharavi-rerooted-p49-1bhk-unit-floorplate.jpg', range: [0, 3] as V2 },
  { id: 'saleable', name: 'Saleable towers', meta: '2BHK flats, 8 a floor; floors assumed', sheet: '/assets/sheets/dharavi-rerooted-p50-2bhk-community-centre.jpg', range: [4, 7] as V2 },
  { id: 'centre', name: 'Community centre', meta: 'Anganwadi 130 m², community hall 200 m², classrooms', sheet: '/assets/sheets/dharavi-rerooted-p50-2bhk-community-centre.jpg', range: [8, 8] as V2 },
];

export const STAGES = [
  {
    title: 'Dharavi today',
    text: 'One of the densest places in the world: a fine grain of one- to three-storey homes and workshops, the ground that the redevelopment has to replace without uprooting the community.',
  },
  {
    title: 'Two zones, one road between',
    text: 'SRA rehabilitation and saleable housing get clearly separate ground, with a road and landscape as the buffer. Each keeps its own identity, open spaces and entries.',
  },
  {
    title: 'A modular plus-shaped floor',
    text: 'Each tower is a plus: four arms of flats round a central lobby with two lift cores and two stairs. The SRA plate holds sixteen 1BHK flats of 32.3 m² on every floor.',
  },
  {
    title: 'Twenty-two floors',
    text: 'The towers rise 22 floors. One building with four lifts instead of two buildings with six cuts maintenance, which a corpus fund held with the BMC pays for.',
  },
  {
    title: 'The courtyard at the heart',
    text: 'Four towers stand round a shared court with community strips between them. The anganwadi and community hall sit on the court, bringing care, learning and togetherness to the heart of the cluster.',
  },
  {
    title: 'Wind and light',
    text: 'The towers are turned so the south-west wind enters between them, crosses the court and leaves at the far corners. Full-slit sliding windows bring light and air into every flat.',
  },
  {
    title: 'The cluster',
    text: 'Point at or tap a tower, or use the list, to see what it holds. Drag sideways to turn the model.',
  },
] as const;
