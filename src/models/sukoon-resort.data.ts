/**
 * Sukoon Resort, Kamshet: traced parameters (see MODEL_NOTES.md §4).
 *
 * Pure data, no three.js. Frame: the p18 masterplan in original sheet pixels
 * (2400 × 1697) at 3.8 px/m, plan "up" as −z. Origin: the centre of the kund
 * amphitheatre (24). True north points to the plan's left (compass on p18).
 */

export type V2 = [number, number];

export const PX_PER_M = 3.8;
export const ORIGIN_PX: V2 = [712, 666];
export const px = ([x, y]: V2): V2 => [(x - ORIGIN_PX[0]) / PX_PER_M, (y - ORIGIN_PX[1]) / PX_PER_M];

/** True north as a plan direction (x right, z down), from the p18 compass. */
export const NORTH: V2 = (() => {
  const [x, z] = [-170, -58];
  const l = Math.hypot(x, z);
  return [x / l, z / l];
})();
export const LATITUDE = 18.8;

export const PLINTH = 0.6;
/** Site ground above the lake's water level [assumed]. */
export const GROUND = 2.5;

/* ---------- Land, water, site ---------- */

/** Bank line between land and lake, then round the board's land side. */
export const LAND: V2[] = (
  [
    [300, 1480], [330, 1340], [440, 1130], [470, 1050], [380, 900], [320, 700], [380, 500], [470, 380],
    [600, 300], [750, 270], [950, 250], [1200, 200], [1460, 150], [1530, 40], [2160, 40], [2160, 1520], [300, 1520],
  ] as V2[]
).map(px);

export const SITE: V2[] = (
  [
    [330, 1340], [440, 1130], [470, 1050], [380, 900], [320, 700], [380, 500], [470, 380], [600, 300], [750, 270],
    [950, 250], [1200, 200], [1450, 175], [1380, 640], [2050, 700], [1970, 870], [1060, 770], [960, 1460],
  ] as V2[]
).map(px);

export const BOARD = { x0: px([60, 0])[0], x1: px([2180, 0])[0], z0: px([0, -10])[1], z1: px([0, 1540])[1], thickness: 6 };

/* ---------- Buildings ---------- */

export type Kind =
  | 'villa'
  | 'guest'
  | 'suite'
  | 'dorm'
  | 'reception'
  | 'hall'
  | 'cafe'
  | 'restaurant-east'
  | 'restaurant-lake'
  | 'spa'
  | 'gym'
  | 'changing'
  | 'service';

export interface Building {
  kind: Kind;
  /** Centre, masterplan pixels. */
  c: V2;
  /** Length along local x and depth along local z, metres. */
  L: number;
  D: number;
  /** Clockwise rotation as it appears on the sheet, degrees. Omitted: face the lake. */
  cw?: number;
}

const villa = (x: number, y: number): Building => ({ kind: 'villa', c: [x, y], L: 16, D: 10 });
const guest = (x: number, y: number, cw: number): Building => ({ kind: 'guest', c: [x, y], L: 29, D: 14, cw });
const suite = (x: number, y: number, cw: number): Building => ({ kind: 'suite', c: [x, y], L: 20, D: 10, cw });

/** Ordered by kind so each kind is one contiguous block-id range. */
export const BUILDINGS: Building[] = [
  ...[[564, 451], [606, 385], [673, 355], [752, 373], [833, 397], [918, 413], [995, 400], [1077, 363], [1147, 331], [1227, 331]].map(([x, y]) => villa(x, y)),
  guest(938, 533, -5),
  guest(1043, 509, -10),
  guest(1062, 600, -12),
  guest(1186, 578, 0),
  guest(943, 657, -25),
  guest(837, 734, -38),
  guest(757, 832, -58),
  guest(713, 969, -82),
  guest(710, 1105, -90),
  suite(640, 488, 18),
  suite(734, 518, 8),
  suite(833, 528, 0),
  suite(1116, 685, -5),
  suite(1200, 655, 0),
  suite(1035, 728, -48),
  suite(996, 821, -85),
  suite(984, 912, -90),
  suite(978, 1003, -90),
  suite(968, 1094, -95),
  suite(942, 1185, -120),
  suite(781, 1238, 30),
  suite(873, 1252, -15),
  { kind: 'dorm', c: [1119, 482], L: 17, D: 13, cw: -10 },
  { kind: 'dorm', c: [1201, 465], L: 17, D: 13, cw: 0 },
  { kind: 'reception', c: [1530, 780], L: 47, D: 25, cw: 3 },
  { kind: 'hall', c: [1393, 552], L: 25, D: 25, cw: 0 },
  { kind: 'cafe', c: [1309, 456], L: 12, D: 12, cw: 0 },
  { kind: 'restaurant-east', c: [1395, 362], L: 28, D: 22, cw: 25 },
  { kind: 'restaurant-lake', c: [603, 1280], L: 30, D: 23, cw: -35 },
  { kind: 'spa', c: [506, 711], L: 16, D: 13, cw: 90 },
  { kind: 'gym', c: [543, 787], L: 16, D: 13, cw: -30 },
  { kind: 'changing', c: [535, 600], L: 15, D: 11, cw: 30 },
  { kind: 'service', c: [864, 1355], L: 48, D: 29, cw: 0 },
];

/** Villas face the lake: away from this point. */
export const VILLA_FOCUS = px([900, 600]);

/* ---------- Landscape ---------- */

export const KUND = { c: [0, 0] as V2, r: 21.6, floor: 6, steps: 6, stepH: 0.32 };
export const POOL: V2[] = ([[110, 345], [130, 380], [118, 430], [125, 470], [135, 495], [100, 500], [80, 460], [78, 410], [90, 365]] as V2[]).map(([x, y]) =>
  px([480 + x / 0.95, 250 + y / 0.95]),
);
export const WATERFRONT_AMPHI = { c: px([520, 1095]), r0: 4, rings: 6, tread: 1.5, rise: 0.4 };
/** Stepped garden: terraces stepping down from this bank line toward the water (−x). */
export const STEPPED_GARDEN: V2[] = ([[470, 1020], [400, 920], [345, 800], [330, 700]] as V2[]).map(px);
export const JETTY: [number, number, number, number] = [...px([930, 60]), ...px([952, 290])] as [number, number, number, number];
export const DECKS: V2[][] = [
  ([[1344, 300], [1440, 270], [1512, 282], [1470, 348], [1400, 340]] as V2[]).map(px),
  ([[500, 1250], [560, 1240], [570, 1320], [510, 1330]] as V2[]).map(px),
];
export const GARDEN = { c: px([846, 1082]), rx: 24.5, rz: 42 };
export const TENNIS: V2[] = ([[930, 725], [985, 760], [960, 820], [905, 800]] as V2[]).map(px);
export const SITOUT = { c: px([900, 840]), r: 6 };
export const BADMINTON: V2[] = [px([850, 870]), px([905, 920])];
export const PARKING: V2[] = ([[1690, 715], [2040, 740], [1990, 870], [1690, 860]] as V2[]).map(px);
/** The cafe's lens-shaped plaza: two circles joined (cafe end and tree end). */
export const PLAZA = { a: px([1310, 460]), ra: 18, b: px([1330, 690]), rb: 20 };

export const PATHS: { pts: V2[]; w: number }[] = [
  { pts: ([[580, 500], [650, 430], [800, 440], [950, 470], [1100, 450], [1250, 420], [1330, 400]] as V2[]).map(px), w: 4 },
  { pts: ([[560, 600], [700, 560], [900, 580], [1100, 560], [1300, 520]] as V2[]).map(px), w: 3 },
  { pts: ([[1320, 700], [1150, 720], [950, 740], [820, 800], [740, 900], [720, 1050], [740, 1200], [820, 1240], [950, 1220]] as V2[]).map(px), w: 5 },
  { pts: ([[1380, 700], [2050, 735]] as V2[]).map(px), w: 6 },
  { pts: ([[1380, 860], [1990, 885]] as V2[]).map(px), w: 6 },
  { pts: ([[1060, 770], [960, 1460]] as V2[]).map(px), w: 6 },
];
export const ACCESS_ROAD: V2[] = ([[1790, 1100], [1950, 900], [2100, 700], [2190, 520]] as V2[]).map(px);

/* ---------- Key and story ---------- */

export const KIND_INFO: Record<Kind, { name: string; meta: string; sheet: string }> = {
  villa: { name: 'Guest villas', meta: '4BHK, ground + 1, private pool facing the dam', sheet: '/assets/sheets/sukoon-resort-p19-villa-spa-cafe-guestroom-dorm.jpg' },
  guest: { name: 'Guest rooms', meta: '48 rooms, six to a cluster, views on both sides', sheet: '/assets/sheets/sukoon-resort-p19-villa-spa-cafe-guestroom-dorm.jpg' },
  suite: { name: 'Guest suites', meta: 'Rows sharing a common court', sheet: '/assets/sheets/sukoon-resort-p19-villa-spa-cafe-guestroom-dorm.jpg' },
  dorm: { name: 'Dormitories', meta: 'Two dormitories of 10, clustered', sheet: '/assets/sheets/sukoon-resort-p19-villa-spa-cafe-guestroom-dorm.jpg' },
  reception: { name: 'Reception', meta: 'Open reception, after Anchaviyo Resort', sheet: '/assets/sheets/sukoon-resort-p20-reception-hall-restaurants.jpg' },
  hall: { name: 'Multipurpose hall', meta: 'Octagonal, with a stage and a cool roof cavity', sheet: '/assets/sheets/sukoon-resort-p20-reception-hall-restaurants.jpg' },
  cafe: { name: 'Cafe', meta: 'Open pergola under acrylic sheet', sheet: '/assets/sheets/sukoon-resort-p19-villa-spa-cafe-guestroom-dorm.jpg' },
  'restaurant-east': { name: 'East restaurant', meta: 'Dining deck facing the river and dam', sheet: '/assets/sheets/sukoon-resort-p20-reception-hall-restaurants.jpg' },
  'restaurant-lake': { name: 'Lakefront restaurant', meta: 'Central courtyard and a dining deck', sheet: '/assets/sheets/sukoon-resort-p20-reception-hall-restaurants.jpg' },
  spa: { name: 'Spa', meta: 'Raised plinth round a courtyard', sheet: '/assets/sheets/sukoon-resort-p19-villa-spa-cafe-guestroom-dorm.jpg' },
  gym: { name: 'Gym and indoor games', meta: 'By the common pool', sheet: '/assets/sheets/sukoon-resort-p18-masterplan.jpg' },
  changing: { name: 'Changing area', meta: 'By the common pool', sheet: '/assets/sheets/sukoon-resort-p18-masterplan.jpg' },
  service: { name: 'Service block', meta: 'At the back of the site', sheet: '/assets/sheets/sukoon-resort-p18-masterplan.jpg' },
};

export const KEY_KINDS: Kind[] = ['villa', 'guest', 'suite', 'dorm', 'reception', 'hall', 'cafe', 'restaurant-east', 'restaurant-lake', 'spa'];

export const STAGES = [
  {
    title: 'On the Uksan dam',
    text: 'A wedge of land on the dam’s lake at Kamshet, reached by one arm from the road. The lake wraps the site on two sides.',
  },
  {
    title: 'Arrival and the public spine',
    text: 'Reception and parking sit on the arm from the road. A loop of plaza leads in past the cafe, the octagonal hall and the east restaurant.',
  },
  {
    title: 'Two residential zones',
    text: 'Guest rooms, suites and dormitories line the paths near the shared spaces. Ten villas, quieter and private, sit along the waterfront, each with its own pool facing the dam.',
  },
  {
    title: 'Brick, timber, tile and jali',
    text: 'Butterfly roofs on the timber-clad guest rooms, tiled hips on the suites and dormitories, brick for the villas, hall and restaurants. Similar structures are clubbed together, with breathing space between them.',
  },
  {
    title: 'The kund and the water’s edge',
    text: 'A sunken kund amphitheatre with the common pool curling round it, a stepped garden and an amphitheatre down to the water, and decks out over the lake.',
  },
  {
    title: 'Early morning sun',
    text: '“I like the early morning sunlight.” The sun rises over the lake and the dam, east of the site, and lights the villas and the waterfront first.',
  },
  {
    title: 'Sukoon',
    text: 'Point at or tap a building, or use the list, to see what it is. Drag sideways to turn the model.',
  },
] as const;
