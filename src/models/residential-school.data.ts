/**
 * Residential School, Kanoi: traced parameters (see MODEL_NOTES.md §1).
 *
 * Pure data, no three.js, so the build-time HTML can list the same blocks.
 * Pixel coordinates are on `public/assets/residential-school/masterplan.jpg`
 * (2120 × 1740 px, north up). Block-local coordinates are metres from the
 * block's footprint corner, with local x along the block's own east axis.
 */

export type V2 = [number, number];
export type Face = 'n' | 'e' | 's' | 'w';
export type Finish = 'sandstone' | 'lime' | 'paving' | 'step' | 'court';

/** Masterplan crop scale and origin. */
export const PX_PER_M = 7.0;
export const ORIGIN_PX: V2 = [1000, 860];
export const FLOOR_H = 3.6;
export const PARAPET_H = 0.9;

export const pxToM = ([px, py]: V2): V2 => [(px - ORIGIN_PX[0]) / PX_PER_M, (py - ORIGIN_PX[1]) / PX_PER_M];

export interface Openings {
  /** Small round-headed windows on every face, one row per storey. */
  windows?: boolean;
  /** Faces whose top storey is an open arcade instead of windows. */
  arcadeTop?: Face[];
  /** Faces where every storey is an arcade (loggias). */
  arcade?: Face[];
  /** Faces with no openings (party walls, retaining walls). */
  blind?: Face[];
}

export interface Tier {
  /** [x0, z0, x1, z1] in block-local metres. */
  rect?: [number, number, number, number];
  poly?: V2[];
  level: number;
  floors?: number;
  /** Absolute height above level; overrides floors × FLOOR_H. */
  height?: number;
  /** Mono-pitch roof: heights above level at local x0 and x1 of the tier. */
  mono?: [number, number];
  parapet?: boolean;
  openings?: Openings;
  finish?: Finish;
}

/** Ramps, court floors, platforms: a slab whose top runs from `from` to `to` along an axis. */
export interface Slab {
  rect?: [number, number, number, number];
  poly?: V2[];
  from: number;
  to?: number;
  axis?: 'x' | 'z';
  thickness?: number;
  finish?: Finish;
  /** Split into this many level treads (stepped seating). */
  steps?: number;
}

export interface Gate {
  /** Centre of the base, block-local. */
  at: V2;
  /** Rotation of the gate's span axis, degrees, three.js convention. */
  angle: number;
  level: number;
  span: number;
  height: number;
  archH: number;
  pier: number;
  depth: number;
  finish?: Finish;
}

export interface Jali {
  a: V2;
  b: V2;
  y0: number;
  y1: number;
}

export interface Vault {
  rect: [number, number, number, number];
  /** Springing level, absolute metres. */
  y: number;
  rise: number;
}

export interface Block {
  id: string;
  /** Number on the masterplan legend. */
  num: string;
  name: string;
  centerPx: V2;
  rotDeg: number;
  size: V2;
  /** Human-readable levels and storeys for the key. */
  levels: string;
  storeys: string;
  /** How sure the model is about this block. */
  basis: 'drawn' | 'footprint only';
  sheet: string;
  tiers: Tier[];
  slabs?: Slab[];
  gates?: Gate[];
  jalis?: Jali[];
  vaults?: Vault[];
  /** Landscape elements settle first and never cast shadows. */
  landscape?: boolean;
}

const SHEET = (n: string) => `/assets/sheets/residential-school-${n}.jpg`;
const MASTERPLAN = SHEET('p11-masterplan-roofplan-section');

/* ---------- Site ---------- */

/** Inner edge of the perimeter roads, traced. */
export const SITE_PX: V2[] = [
  [30, 740], [260, 700], [400, 640], [500, 540], [560, 450], [820, 430], [860, 380], [870, 40],
  [1280, 20], [1500, 215], [1740, 420], [1840, 520], [1900, 700], [1930, 900], [1940, 1080],
  [1400, 1200], [1160, 1310], [1010, 1420], [940, 1560], [850, 1530], [560, 1550], [300, 1640],
  [230, 1670], [130, 1430], [80, 1330], [20, 1290],
];

export const LAKE_PX: V2[] = [
  [1465, 640], [1495, 590], [1535, 582], [1575, 600], [1610, 640], [1650, 690], [1685, 740],
  [1710, 800], [1705, 850], [1685, 895], [1665, 925], [1640, 955], [1615, 960], [1595, 935],
  [1575, 890], [1545, 840], [1510, 780], [1488, 720], [1465, 680],
];

/** Roads as centrelines with widths in metres. */
export const ROADS_PX: { pts: V2[]; width: number; closed?: boolean; kind: 'road' | 'walk' }[] = [
  { pts: SITE_PX, width: 6, closed: true, kind: 'road' },
  { pts: [[905, 1740], [918, 1560], [918, 880], [1540, 290], [1580, 250]], width: 6, kind: 'road' },
  { pts: [[880, 1545], [880, 905], [800, 830]], width: 3, kind: 'walk' },
  { pts: [[1100, 420], [1100, 300]], width: 3, kind: 'walk' },
  { pts: [[1010, 300], [1180, 300]], width: 3, kind: 'walk' },
  { pts: [[740, 760], [860, 860]], width: 3, kind: 'walk' },
  { pts: [[1210, 120], [1420, 300]], width: 3, kind: 'walk' },
];

/**
 * Ground profile: elevation against x' = x − 0.25 z (metres east of the
 * origin, tilted so the south sits a little higher). Fitted to the stated
 * levels; see MODEL_NOTES.md "Terrain".
 */
export const PROFILE: V2[] = [
  [-160, 175], [-150, 174], [-96, 167], [-54, 161], [-18, 158], [25, 156], [60, 153], [87, 150], [140, 148], [170, 147.5],
];
export const PROFILE_TILT = 0.25;
export const WATER_LEVEL = 149.6;
export const LAKE_BED = 147.6;

export function naturalElevation(x: number, z: number): number {
  const xp = x - PROFILE_TILT * z;
  const k = PROFILE;
  if (xp <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [x0, e0] = k[i];
    const [x1, e1] = k[i + 1];
    if (xp <= x1) {
      // Smoothstep inside each span keeps the slope continuous-looking.
      const t = (xp - x0) / (x1 - x0);
      const s = t * t * (3 - 2 * t);
      return e0 + (e1 - e0) * (0.5 * t + 0.5 * s);
    }
  }
  return k[k.length - 1][1];
}

/** Terrain slab extents (metres) and contour bands from the p10 diagram. */
export const TERRAIN = { x0: -150, x1: 150, z0: -130, z1: 130, cell: 2, eMin: 146, base: 3, band0: 145, bandStep: 4, bands: 8 };

/** Section X–X′: the axis the academic block, library and mess share. */
export const SECTION = { throughPx: [459, 796.5] as V2, angleDeg: 21.8, offset: 4 };

export const LATITUDE = 26.9;

/* ---------- Blocks ---------- */

const ACADEMIC_ROT = 21.8;

export const BLOCKS: Block[] = [
  {
    id: 'security',
    num: '1',
    name: 'Security cabin',
    centerPx: [966.5, 1372.5],
    rotDeg: 0,
    size: [5.3, 5],
    levels: '158.5 m',
    storeys: 'Ground',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [{ rect: [0, 0, 5.3, 5], level: 158.5, height: 3, openings: { windows: true } }],
  },
  {
    id: 'auditorium',
    num: '2',
    name: 'Auditorium',
    centerPx: [715, 1472.5],
    rotDeg: 0,
    size: [35.7, 20.7],
    levels: '162 m',
    storeys: 'One tall volume',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [
      {
        poly: [
          [12.9, 0],
          ...Array.from({ length: 11 }, (_, i): V2 => {
            const a = -1.007 + (2.014 * i) / 10;
            return [23.45 + 12.25 * Math.cos(a), 10.35 + 12.25 * Math.sin(a)];
          }),
          [12.9, 20.7],
        ],
        level: 162,
        height: 10,
        openings: { windows: true },
      },
      { rect: [0, 5.7, 12.9, 13.6], level: 162, height: 4.5, openings: { windows: true } },
    ],
  },
  {
    id: 'admin',
    num: '3',
    name: 'Entrance and admin block',
    centerPx: [692.5, 1268.5],
    rotDeg: 0,
    size: [52.1, 27.6],
    levels: '165, 162 and 159 m',
    storeys: 'Ground, on three levels',
    basis: 'drawn',
    sheet: SHEET('p12-admin-block'),
    tiers: [
      { rect: [0, 0, 8.9, 27.6], level: 165, floors: 1, openings: { windows: true, blind: ['w'] }, finish: 'lime' },
      { rect: [8.9, 0, 22.4, 27.6], level: 162, floors: 1, openings: { windows: true, blind: ['w'] }, finish: 'lime' },
      { rect: [22.4, 0, 44.3, 27.6], level: 159, height: 6, openings: { windows: true, blind: ['w'] }, finish: 'lime' },
      { rect: [44.3, 4, 52.1, 23.6], level: 159, height: 4.5, openings: { arcade: ['n', 'e', 's'] }, finish: 'lime' },
    ],
    gates: [{ at: [57.6, 13.8], angle: 0, level: 159, span: 8.6, height: 9, archH: 7.6, pier: 1.2, depth: 1.6, finish: 'lime' }],
  },
  {
    id: 'multipurpose',
    num: '4',
    name: 'Multipurpose hall',
    centerPx: [735, 1032.5],
    rotDeg: 0,
    size: [35.7, 27.9],
    levels: '160.5 m',
    storeys: 'One tall volume',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [
      { rect: [0, 0, 31.4, 27.9], level: 160.5, height: 9, openings: { windows: true } },
      { rect: [31.4, 9.3, 35.7, 17.9], level: 160.5, height: 4.5, openings: { arcade: ['e'] } },
    ],
  },
  {
    id: 'academic',
    num: '5',
    name: 'Academic block',
    centerPx: [459, 796.5],
    rotDeg: ACADEMIC_ROT,
    size: [42.6, 41.1],
    levels: '167, 165, 163 and 161 m',
    storeys: 'Ground + 1, stepping down the slope',
    basis: 'drawn',
    sheet: SHEET('p13-academic-block'),
    tiers: [
      // Bar A, highest, west: barrel vault on top (section p13).
      { rect: [0, 0, 7.3, 41.1], level: 167, floors: 2, parapet: false, openings: { windows: true, arcadeTop: ['e'] } },
      { rect: [10.8, 0, 18.1, 16.0], level: 165, floors: 2, openings: { windows: true, arcadeTop: ['e', 'w'] } },
      { rect: [10.8, 22.9, 18.1, 41.1], level: 165, floors: 2, openings: { windows: true, arcadeTop: ['e', 'w'] } },
      { rect: [21.5, 0, 28.9, 16.0], level: 163, floors: 2, openings: { windows: true, arcadeTop: ['e', 'w'] } },
      { rect: [21.5, 22.9, 28.9, 41.1], level: 163, floors: 2, openings: { windows: true, arcadeTop: ['e', 'w'] } },
      // Bar D, lowest, east: single-storey faculty cabins.
      { rect: [32.3, 0, 40.9, 16.0], level: 161, floors: 1, openings: { windows: true } },
      { rect: [32.3, 22.9, 40.9, 41.1], level: 161, floors: 1, openings: { windows: true } },
    ],
    // Ramped passages between the bars rise 2 m over 41 m (1:20).
    slabs: [
      { rect: [7.3, 0, 10.8, 41.1], from: 165, to: 167, axis: 'z', finish: 'paving' },
      { rect: [18.1, 0, 21.5, 41.1], from: 163, to: 165, axis: 'z', finish: 'paving' },
      { rect: [28.9, 0, 32.3, 41.1], from: 161, to: 163, axis: 'z', finish: 'paving' },
      { rect: [40.9, 0, 42.6, 41.1], from: 159.5, to: 161, axis: 'z', finish: 'paving' },
    ],
    vaults: [{ rect: [0, 0, 7.3, 41.1], y: 167 + 2 * FLOOR_H, rise: 1.4 }],
  },
  {
    id: 'library',
    num: '6',
    name: 'Library and laboratories',
    centerPx: [821.5, 642.5],
    rotDeg: ACADEMIC_ROT,
    size: [27.7, 42.7],
    levels: '159 to 157 m',
    storeys: 'Ground + 1',
    basis: 'drawn',
    sheet: SHEET('p14-library-sports-blocks'),
    tiers: [
      { rect: [0, 0, 13.85, 14.2], level: 159, floors: 2, openings: { windows: true, blind: ['e'] } },
      { rect: [13.85, 0, 27.7, 14.2], level: 157, floors: 2, openings: { windows: true, blind: ['w'] } },
      { rect: [0, 27.1, 13.85, 42.7], level: 159, floors: 2, openings: { windows: true, blind: ['e'] } },
      { rect: [13.85, 27.1, 27.7, 42.7], level: 157, floors: 2, openings: { windows: true, blind: ['w'] } },
      { rect: [16.6, 14.2, 27.7, 27.1], level: 157, floors: 2, openings: { windows: true, blind: ['n', 's'] } },
    ],
    slabs: [
      // Court floor, two ramps down its sides, and the bridge from the academic block.
      { rect: [0, 14.2, 16.6, 27.1], from: 157, finish: 'court' },
      { rect: [0, 14.6, 16.6, 17.6], from: 159, to: 157, axis: 'x', finish: 'paving' },
      { rect: [0, 23.7, 16.6, 26.7], from: 159, to: 157, axis: 'x', finish: 'paving' },
      { rect: [-21.2, 15.4, 0, 23.4], from: 161, to: 159, axis: 'x', finish: 'paving' },
    ],
    // Square-hole jali on both court walls (cover sheet p9).
    jalis: [
      { a: [0, 14.35], b: [13.85, 14.35], y0: 159, y1: 159 + 2 * FLOOR_H },
      { a: [13.85, 14.35], b: [16.6, 14.35], y0: 157, y1: 157 + 2 * FLOOR_H },
      { a: [0, 26.95], b: [13.85, 26.95], y0: 159, y1: 159 + 2 * FLOOR_H },
      { a: [13.85, 26.95], b: [16.6, 26.95], y0: 157, y1: 157 + 2 * FLOOR_H },
    ],
  },
  {
    id: 'sports',
    num: '7',
    name: 'Indoor sports block',
    centerPx: [1078.5, 1035],
    rotDeg: 0,
    size: [26.7, 42.9],
    levels: '157 m, court 155.5 m',
    storeys: 'Ground + 1 around a court',
    basis: 'drawn',
    sheet: SHEET('p14-library-sports-blocks'),
    tiers: [
      {
        poly: [[7, 0], [26.7, 0], [26.7, 10], [9.3, 10], [9.3, 32.9], [26.7, 32.9], [26.7, 42.9], [7, 42.9], [0, 35.9], [0, 7]],
        level: 157,
        floors: 2,
        openings: { windows: true },
      },
    ],
    slabs: [
      { rect: [9.3, 10, 26.7, 32.9], from: 155.5, finish: 'court' },
      // Stepped seating falling toward the playground.
      { rect: [26.7, 10, 30.7, 32.9], from: 157, to: 155, axis: 'x', steps: 4, finish: 'step' },
    ],
  },
  {
    id: 'playground',
    num: '8',
    name: 'Playground',
    centerPx: [1285, 985],
    rotDeg: 0,
    size: [25.7, 57.1],
    levels: '155 m',
    storeys: '—',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    landscape: true,
    tiers: [],
    slabs: [
      { rect: [-1.6, -2.2, 27.3, 59.3], from: 155, thickness: 0.6, finish: 'paving' },
      { rect: [0, 0, 25.7, 57.1], from: 155.08, thickness: 0.6, finish: 'court' },
    ],
  },
  {
    id: 'mess',
    num: '9',
    name: 'Mess',
    centerPx: [1095, 520],
    rotDeg: 46.2,
    size: [23.6, 25],
    levels: '156 m',
    storeys: 'Ground, roof falling from 6.3 to 3.9 m',
    basis: 'drawn',
    sheet: SHEET('p15-mess'),
    tiers: [
      { rect: [0, 0, 8.7, 25], level: 156, height: 6.3, parapet: false, openings: { windows: true, blind: ['e'] } },
      {
        poly: [[8.7, 0], [19.8, 0], [23.6, 3.7], [23.6, 21.3], [19.8, 25], [8.7, 25]],
        level: 156,
        mono: [6.3, 3.9],
        parapet: false,
        openings: { windows: true, blind: ['w'] },
      },
    ],
    slabs: [{ rect: [-4.3, 11.2, 0, 25], from: 156.9, thickness: 1, finish: 'paving' }],
    // Arched porches on the two chamfered dining corners (p15 plan and elevation).
    gates: [
      { at: [22.75, 0.78], angle: -44.3, level: 156, span: 3.4, height: 5, archH: 4.2, pier: 0.6, depth: 3 },
      { at: [22.75, 24.22], angle: 44.3, level: 156, span: 3.4, height: 5, archH: 4.2, pier: 0.6, depth: 3 },
    ],
  },
  {
    id: 'boys-hostel',
    num: '10',
    name: "Boys' hostel",
    centerPx: [952, 366],
    rotDeg: 45,
    size: [20.2, 20.2],
    levels: '156.5 m',
    storeys: 'Ground + 2',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [{ rect: [0, 0, 20.2, 20.2], level: 156.5, floors: 3, openings: { windows: true } }],
  },
  {
    id: 'faculty',
    num: '11',
    name: 'Faculty accommodation',
    centerPx: [1095, 222],
    rotDeg: 45,
    size: [20.2, 20.2],
    levels: '155 m',
    storeys: 'Ground + 2',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [{ rect: [0, 0, 20.2, 20.2], level: 155, floors: 3, openings: { windows: true } }],
  },
  {
    id: 'girls-hostel',
    num: '12',
    name: "Girls' hostel",
    centerPx: [1245, 366],
    rotDeg: 45,
    size: [20.2, 20.2],
    levels: '153.5 m',
    storeys: 'Ground + 2',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [{ rect: [0, 0, 20.2, 20.2], level: 153.5, floors: 3, openings: { windows: true } }],
  },
  {
    id: 'octagon',
    num: '—',
    name: 'Octagonal pavilion (use not labelled)',
    centerPx: [1100, 365],
    rotDeg: 0,
    size: [13, 13],
    levels: '155.5 m',
    storeys: 'Ground',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [
      {
        poly: Array.from({ length: 8 }, (_, i): V2 => {
          const a = ((i + 0.5) / 8) * Math.PI * 2;
          const r = 6.5 / Math.cos(Math.PI / 8);
          return [6.5 + r * Math.cos(a), 6.5 + r * Math.sin(a)];
        }),
        level: 155.5,
        height: 4.5,
        openings: { arcade: ['n', 'e', 's', 'w'] },
      },
    ],
  },
  {
    id: 'director',
    num: '13',
    name: "Director's accommodation",
    centerPx: [1235, 78],
    rotDeg: 45,
    size: [14.6, 14.6],
    levels: '153 m',
    storeys: 'Ground + 1',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [{ rect: [0, 0, 14.6, 14.6], level: 153, floors: 2, openings: { windows: true } }],
  },
  {
    id: 'deputy',
    num: '14',
    name: "Deputy director's accommodation",
    centerPx: [1345, 196],
    rotDeg: 45,
    size: [14.8, 14.8],
    levels: '151.5 m',
    storeys: 'Ground + 1',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    tiers: [{ rect: [0, 0, 14.8, 14.8], level: 151.5, floors: 2, openings: { windows: true } }],
  },
  {
    id: 'amphitheatre',
    num: '15',
    name: 'Amphitheatre',
    centerPx: [1362, 748],
    rotDeg: 0,
    size: [0, 0],
    levels: '154 m',
    storeys: '—',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    landscape: true,
    tiers: [],
    // Lawn and five rings of seats, built in the model module as quarter rings.
    slabs: [],
  },
  {
    id: 'parking',
    num: '16',
    name: 'Parking',
    centerPx: [1035, 1260],
    rotDeg: 0,
    size: [24.3, 20],
    levels: '157.5 m',
    storeys: '—',
    basis: 'footprint only',
    sheet: MASTERPLAN,
    landscape: true,
    tiers: [],
    slabs: [{ rect: [0, 0, 24.3, 20], from: 157.5, thickness: 0.6, finish: 'paving' }],
  },
];

/** Amphitheatre rings (centre at the block origin): radii in metres, angles from west to north. */
export const AMPHITHEATRE = { level: 154, inner: 16, tread: 1.2, rise: 0.4, rings: 5 };

/** The six steps of the scroll story, also used for the HTML captions. */
export const STAGES = [
  {
    title: 'Bare site and lake',
    text: 'Kanoi, 35 km from Jaisalmer. The lake is the village’s water and the ground for its mela, so the school keeps clear of it and enlarges it slightly to hold more rain.',
  },
  {
    title: 'Contours',
    text: 'The ground falls about 25 m from above 173 m in the west to below 149 m at the lake. The bands are 4 m apart, as on Shankar’s climate and topography sheet.',
  },
  {
    title: 'Blocks settle on their own levels',
    text: 'Rather than flatten the hill, each block takes the level its ground gives it: the mess at 156 m, the library from 159 to 157 m, the academic block from 167 m down to 161 m.',
  },
  {
    title: 'Massing',
    text: 'Low, thick sandstone masses cut by courts and ramped passages. Gaps are left between blocks so rain can run downhill to the lake.',
  },
  {
    title: 'Openings, jali and sun',
    text: 'Small deep arched windows, arcades on the academic upper floors and jali walls on the library court. The sun crosses from east to west through the south.',
  },
  {
    title: 'Section X–X′',
    text: 'A cut along the line the academic block, library and mess share. The ground steps down to the hostels; ramps at 1 in 20 and lifts keep every level reachable.',
  },
  {
    title: 'The campus',
    text: 'Point at or tap a block, or use the list, to see its name and level. Drag sideways to turn the model.',
  },
] as const;
