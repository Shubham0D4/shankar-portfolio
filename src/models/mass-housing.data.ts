/**
 * Mass Housing, Byculla: traced parameters (see MODEL_NOTES.md §3).
 *
 * Pure data, no three.js. Master frame: the p4 roof plan in original sheet
 * pixels (2400 × 1697), north up, at 4.2 px/m. Origin: the amphitheatre at
 * the centre of the central open space. Podium outlines are traced on the p4
 * ground floor plan and carried over by the fitted transform `gfToRoof`.
 */

export type V2 = [number, number];

export const PX_PER_M = 4.2;
export const ORIGIN_PX: V2 = [1660, 430];
export const px = ([x, y]: V2): V2 => [(x - ORIGIN_PX[0]) / PX_PER_M, (y - ORIGIN_PX[1]) / PX_PER_M];

/** Ground floor plan → roof plan, fitted on the B and C wing cores. */
export const gfToRoof = ([x, y]: V2): V2 => [1652 + 0.94 * (x - 426) - 8, 252 + 0.94 * (y - 240)];
const gf = (pts: V2[]) => pts.map((p) => px(gfToRoof(p)));
/**
 * Ground floor plan display coordinates (0.95 × crop from 100,130) → original.
 * The south podium gets its own correction (−17, +10 roof px), the mean
 * misfit of the D, E and F cores under the B/C fit.
 */
const gfd = (pts: V2[]) =>
  pts.map(([x, y]) => {
    const [rx, ry] = gfToRoof([100 + x / 0.95, 130 + y / 0.95]);
    return px([rx - 17, ry + 10]);
  });

/* ---------- Levels (stated, p7 and p8) ---------- */

export const PODIUM_TOP = 21.45;
export const FIRST_FLOOR = 24;
export const FLOOR_H = 3.0;
export const GROUND_H = 4.65;
export const PODIUM_LEVEL_H = 2.8;
export const PODIUM_LEVELS = 6;
export const BASEMENTS = 3;
export const BASEMENT_H = 3.5;

/* ---------- Site, roads, landscape ---------- */

export const SITE: V2[] = [
  [1300, 185], [2080, 155], [2225, 450], [1890, 515], [1845, 795], [1300, 700],
].map((p) => px(p as V2));

/** Roads: an edge along the site and the side the road lies on (outward normal sign). */
export const ROADS = [
  { name: '12.2 m DP road', a: px([1300, 185]), b: px([2080, 155]), width: 12.2, side: -1 },
  { name: '27.5 m Mulana Azad road', a: px([1300, 185]), b: px([1300, 700]), width: 27.5, side: 1 },
  { name: '27.5 m Bapurao Jagtap road', a: px([2080, 155]), b: px([2225, 450]), width: 27.5, side: -1 },
];

export const NORTH_PODIUM: V2[] = gf([
  [130, 165], [735, 165], [735, 300], [255, 300], [215, 335], [150, 330], [105, 225],
]);

export const SOUTH_PODIUM: V2[] = gfd([
  [50, 312], [232, 325], [246, 438], [300, 468], [400, 442], [428, 318], [448, 300],
  [548, 345], [505, 600], [470, 615], [60, 520],
]);

export const POND = { c: px([1805, 397]), len: 29, wid: 8 };
export const AMPHITHEATRE = { c: [0, 0] as V2, r: 7.5, rings: 4 };
export const OCTAGON = { c: px([1617, 540]), apothem: 10, wall: 5, apex: 10 };
export const POOL = { rect: [...px([1763, 487]), ...px([1850, 553])] as [number, number, number, number], deck: 2 };
export const COURTS = [
  { rect: [...px([2020, 345]), ...px([2080, 460])] as [number, number, number, number], kind: 'basketball' },
  { rect: [...px([2085, 345]), ...px([2140, 460])] as [number, number, number, number], kind: 'tennis' },
  { rect: [...px([1985, 220]), ...px([2065, 340])] as [number, number, number, number], kind: 'turf' },
];

/* ---------- Towers ---------- */

export interface Part {
  /** Centre in roof-plan pixels. */
  c: V2;
  /** Width along local x, depth along local z, metres. */
  w: number;
  d: number;
  rotDeg: number;
  /** H-plan: two bars joined by a core. */
  h?: boolean;
}

export interface Wing {
  id: string;
  name: string;
  units: string;
  terrace: number;
  /** Machine room / overhead tank level. */
  top: number;
  floors: number;
  parts: Part[];
  podium: 'north' | 'south';
}

export const WINGS: Wing[] = [
  {
    id: 'a',
    name: 'A wing',
    units: '4BHK and 3BHK (B) flats',
    terrace: 145.45,
    top: 150.4,
    floors: 40,
    podium: 'north',
    parts: [{ c: [1426, 300], w: 34, d: 25, rotDeg: 49.7, h: true }],
  },
  {
    id: 'b',
    name: 'B wing',
    units: '3BHK (A) and 3BHK (B) flats',
    terrace: 139.45,
    top: 144.85,
    floors: 39,
    podium: 'north',
    parts: [{ c: [1652, 252], w: 31.4, d: 22.6, rotDeg: 0, h: true }],
  },
  {
    id: 'c',
    name: 'C wing',
    units: '4BHK and 3BHK (B) flats',
    terrace: 145.45,
    top: 150.4,
    floors: 40,
    podium: 'north',
    parts: [{ c: [1855, 250], w: 31, d: 23, rotDeg: 0, h: true }],
  },
  {
    id: 'd',
    name: 'D wing',
    units: '2BHK flats (16 per floor across D, E and F)',
    terrace: 130.45,
    top: 134.15,
    floors: 35,
    podium: 'south',
    parts: [
      { c: [1493, 477], w: 14, d: 12, rotDeg: 30 },
      { c: [1422, 538], w: 17, d: 15, rotDeg: 15 },
      { c: [1470, 515], w: 11, d: 11, rotDeg: 30 },
      { c: [1522, 600], w: 31, d: 12, rotDeg: -49.6 },
    ],
  },
  {
    id: 'e',
    name: 'E wing',
    units: '2BHK flats (16 per floor across D, E and F)',
    terrace: 130.45,
    top: 134.15,
    floors: 35,
    podium: 'south',
    parts: [
      { c: [1580, 662], w: 14, d: 12, rotDeg: -15 },
      { c: [1652, 657], w: 26, d: 14, rotDeg: 0 },
    ],
  },
  {
    id: 'f',
    name: 'F wing',
    units: '2BHK flats (16 per floor across D, E and F)',
    terrace: 130.45,
    top: 134.15,
    floors: 35,
    podium: 'south',
    parts: [
      { c: [1750, 585], w: 18, d: 15, rotDeg: 30 },
      { c: [1762, 676], w: 23, d: 13, rotDeg: -48 },
    ],
  },
];

/* ---------- Design progression (p3 diagrams, positions ±8 m) ---------- */

export const STAGE1 = {
  podium: [[-85, -65], [100, -67], [100, -35], [-50, -35], [-50, 25], [-10, 35], [40, 15], [70, -10], [85, 5], [60, 45], [20, 80], [-85, 70]] as V2[],
  towers: [[-51, -35], [-10, -47], [35, -53], [75, -53], [-55, 10], [-16, 53], [21, 32], [56, 8]] as V2[],
};
export const STAGE2 = {
  towers: [[-62, -30], [-1.9, -42], [46, -43], [-55, 15], [-38, 40], [-12, 52], [18, 50], [32, 30]] as V2[],
};
export const GHOST = { size: 22, height: 120 };

/* ---------- Key and story ---------- */

export const ITEMS = [
  ...WINGS.map((w) => ({
    id: w.id,
    num: w.id.toUpperCase(),
    name: w.name,
    meta: `${w.units}. Terrace +${w.terrace.toFixed(2)} m`,
    sheet: w.podium === 'north' ? '/assets/sheets/mass-housing-p08-abc-wing-sections-units.jpg' : '/assets/sheets/mass-housing-p07-def-wing-elevation-section.jpg',
  })),
  { id: 'north', num: '—', name: 'North podium', meta: 'Retail at the street, 6 parking levels, amenities on top at +21.45 m', sheet: '/assets/sheets/mass-housing-p05-basement-podium-plans.jpg' },
  { id: 'south', num: '—', name: 'South podium', meta: 'Retail at the street, 6 parking levels, pool on top at +21.45 m', sheet: '/assets/sheets/mass-housing-p06-podium-typical-refuge-plans-views.jpg' },
];

export const STAGES = [
  {
    title: 'Saat Rasta, Byculla',
    text: 'The site sits where busy South Mumbai roads meet Saat Rasta: 27.5 m roads on the west and north-east, a 12.2 m road on the north. Retail shops line the street edge.',
  },
  {
    title: 'Stage 1: eight towers, one podium',
    text: 'The first idea, from Shankar’s progression diagram: a central space on mother earth, ringed by eight towers standing on one large podium.',
  },
  {
    title: 'Stage 2: the podium splits',
    text: 'Instead of one huge podium, two. The split gives access between them and opens the central space to the city and the breeze.',
  },
  {
    title: 'Final: fewer towers, more ground',
    text: 'Wings A, B and C stand on the north podium. D, E and F are joined into one curved building on the south podium. Together they enclose a large central open space on a minimum footprint.',
  },
  {
    title: 'Floors, balconies, refuge floors',
    text: 'Six parking levels under a podium top at +21.45 m, then 35 to 40 floors of flats with a refuge floor every seventh floor. Terraces at +130.45 m (D–F), +139.45 m (B) and +145.45 m (A, C).',
  },
  {
    title: 'Mumbai sun and wind',
    text: 'The sun crosses from east to west, and the towers throw long shadows across the central green. The gap between the podiums lets the south-west monsoon wind through.',
  },
  {
    title: 'The wings',
    text: 'Point at or tap a tower, or use the list, to see its wing and flat types. Drag sideways to turn the model. 1,032 flats in all: 560 2BHK, 312 3BHK and 160 4BHK.',
  },
] as const;

/** Shoelace area, m². */
export function polyArea(p: V2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, z0] = p[i];
    const [x1, z1] = p[(i + 1) % p.length];
    a += x0 * z1 - x1 * z0;
  }
  return Math.abs(a) / 2;
}

/** Built footprint (both podiums) as a share of the traced site. */
export const COVERAGE = (polyArea(NORTH_PODIUM) + polyArea(SOUTH_PODIUM)) / polyArea(SITE);
