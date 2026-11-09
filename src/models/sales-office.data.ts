/**
 * Sales Office – Interior Design: traced parameters (see MODEL_NOTES.md §5).
 *
 * Pure data, no three.js. Metres; origin at the north-west interior corner
 * of the p45 plan (54 px/m), x east, z south. The front facade is the south
 * wall at z = W_D. Heights are above outside ground (+0); the floor is +0.3.
 */

export type V2 = [number, number];
export type R4 = [number, number, number, number];

export const W_L = 18.8;
export const W_D = 9.72;
export const FLOOR = 0.3;
export const TOP = 4.8;
export const CUT = 3.4;
export const EXT_T = 0.23;
export const INT_T = 0.12;

/* ---------- Rooms ---------- */

export interface Room {
  id: string;
  name: string;
  rect: R4;
  size: string;
}

export const ROOMS: Room[] = [
  { id: 'reception', name: 'Reception and waiting', rect: [0, 4.63, 5.46, W_D], size: 'Legend: about 5.5 × 5.5 m' },
  { id: 'discussion', name: 'Discussion area', rect: [5.46, 4.63, 11.0, W_D], size: 'Legend: about 6 × 5 m' },
  { id: 'av', name: 'AV and conference room', rect: [11.0, 4.63, 14.6, W_D], size: 'Legend: about 4 × 5 m' },
  { id: 'director', name: 'Director’s cabin', rect: [14.6, 4.63, W_L, W_D], size: 'Legend: about 4.5 × 5 m' },
  { id: 'sales-1', name: 'Sales cabin', rect: [0, 0, 3.15, 2.5], size: 'Legend: about 3.5 × 2.8 m' },
  { id: 'sales-2', name: 'Sales cabin', rect: [0, 2.5, 3.15, 4.63], size: 'Legend: about 3.5 × 2.8 m' },
  { id: 'print', name: 'Print and store', rect: [3.15, 0, 4.45, 1.1], size: '' },
  { id: 'admin', name: 'Admin office', rect: [4.45, 0, 11.1, 3.7], size: 'Legend: about 7 × 3.5 m' },
  { id: 'toilets', name: 'Toilets', rect: [11.1, 0, 14.3, 3.33], size: 'Legend: about 3.5 × 2 m each' },
  { id: 'pantry', name: 'Pantry', rect: [14.3, 0, 16.7, 3.33], size: 'Legend: about 2.5 × 3.5 m' },
  { id: 'storage', name: 'Storage', rect: [16.7, 0, W_L, 3.33], size: 'Legend: about 1.5 × 3.5 m' },
  { id: 'passage', name: 'Passage', rect: [3.15, 1.1, W_L, 4.63], size: 'Legend: 1.5 m wide' },
];

/* ---------- Walls: segments with openings ---------- */

export interface Opening {
  /** Distance along the wall from its start, metres. */
  u0: number;
  u1: number;
  /** Bottom and top of the opening. Doors start at the floor. */
  y0: number;
  y1: number;
  glass?: boolean;
}

export interface Wall {
  a: V2;
  b: V2;
  t: number;
  openings?: Opening[];
}

const door = (u0: number, u1: number): Opening => ({ u0, u1, y0: FLOOR, y1: FLOOR + 2.4 });
const win = (u0: number, u1: number): Opening => ({ u0, u1, y0: 1.2, y1: CUT, glass: true });

export const WALLS: Wall[] = [
  // Exterior.
  { a: [0, 0], b: [W_L, 0], t: EXT_T, openings: [win(6.5, 9.5), win(14.8, 16.2)] },
  { a: [0, W_D], b: [W_L, W_D], t: EXT_T, openings: [{ ...door(1.9, 3.7), glass: true }, win(7.3, 9.2), win(15.9, 17.8)] },
  { a: [0, 0], b: [0, W_D], t: EXT_T },
  { a: [W_L, 0], b: [W_L, W_D], t: EXT_T, openings: [door(3.6, 4.5)] },
  // Back row.
  { a: [3.15, 0], b: [3.15, 4.63], t: INT_T, openings: [door(1.4, 2.3), door(3.4, 4.3)] },
  { a: [0, 2.5], b: [3.15, 2.5], t: INT_T },
  { a: [3.15, 1.1], b: [4.45, 1.1], t: INT_T, openings: [door(0.2, 1.0)] },
  { a: [4.45, 0], b: [4.45, 2.5], t: INT_T },
  { a: [5.9, 3.7], b: [10.6, 3.7], t: INT_T },
  { a: [11.1, 0], b: [11.1, 3.33], t: INT_T },
  { a: [12.7, 0], b: [12.7, 3.33], t: INT_T },
  { a: [11.1, 3.33], b: [14.3, 3.33], t: INT_T, openings: [door(0.5, 1.3), door(2.1, 2.9)] },
  { a: [14.3, 0], b: [14.3, 3.33], t: INT_T },
  { a: [14.3, 3.33], b: [16.7, 3.33], t: INT_T, openings: [door(1.2, 2.1)] },
  { a: [16.7, 0], b: [16.7, 3.33], t: INT_T },
  { a: [16.7, 3.33], b: [W_L, 3.33], t: INT_T, openings: [door(0.9, 1.8)] },
  // Front row.
  { a: [0, 4.63], b: [3.0, 4.63], t: INT_T },
  { a: [5.46, 4.63], b: [11.0, 4.63], t: INT_T, openings: [door(1.95, 3.45)] },
  { a: [11.0, 4.63], b: [14.6, 4.63], t: INT_T, openings: [door(1.4, 2.3)] },
  { a: [14.6, 4.63], b: [W_L, 4.63], t: INT_T, openings: [door(0.2, 1.0)] },
  { a: [5.46, 4.63], b: [5.46, W_D], t: INT_T },
  { a: [11.0, 4.63], b: [11.0, W_D], t: INT_T },
  { a: [14.6, 4.63], b: [14.6, W_D], t: INT_T },
];

/* ---------- Fluted feature walls ---------- */

/** 0 torn band, 1 stepped, 2 full height, 3 arched niche. */
export type Pattern = 0 | 1 | 2 | 3;

export interface Flutes {
  a: V2;
  b: V2;
  /** Unit normal pointing out of the wall face the flutes sit on. */
  n: V2;
  pattern: Pattern;
  bot: number;
  top: number;
  /** Spans (u0, u1) left bare: doors and windows. */
  skip?: V2[];
}

const f = 0.1; // offset from the wall centreline to its face, interior walls
const fe = 0.13; // exterior walls

export const FLUTES: Flutes[] = [
  // Front facade, outside face.
  { a: [0, W_D + fe], b: [W_L, W_D + fe], n: [0, 1], pattern: 0, bot: 0.05, top: TOP, skip: [[1.8, 3.8], [7.2, 9.3], [15.8, 17.9]] },
  // Reception: arched niches on both side walls.
  { a: [fe, 4.75], b: [fe, W_D - 0.15], n: [1, 0], pattern: 3, bot: FLOOR, top: CUT },
  { a: [5.46 - f, 4.75], b: [5.46 - f, W_D - 0.15], n: [-1, 0], pattern: 3, bot: FLOOR, top: CUT },
  // Discussion: full height on both side walls.
  { a: [5.46 + f, 4.7], b: [5.46 + f, W_D - 0.15], n: [1, 0], pattern: 2, bot: FLOOR, top: CUT },
  { a: [11.0 - f, 4.7], b: [11.0 - f, W_D - 0.15], n: [-1, 0], pattern: 2, bot: FLOOR, top: CUT },
  // AV: stepped.
  { a: [11.0 + f, 4.7], b: [11.0 + f, W_D - 0.15], n: [1, 0], pattern: 1, bot: FLOOR, top: CUT },
  { a: [14.6 - f, 4.7], b: [14.6 - f, W_D - 0.15], n: [-1, 0], pattern: 1, bot: FLOOR, top: CUT },
  // Director: band on the back and east walls.
  { a: [14.7, 4.63 + f], b: [W_L - 0.15, 4.63 + f], n: [0, 1], pattern: 0, bot: FLOOR, top: CUT, skip: [[0.1, 1.1]] },
  { a: [W_L - fe, 4.75], b: [W_L - fe, W_D - 0.15], n: [-1, 0], pattern: 0, bot: FLOOR, top: CUT },
  // Passage: band along the front-row walls and the admin wall.
  { a: [5.5, 4.63 - f], b: [14.6, 4.63 - f], n: [0, -1], pattern: 0, bot: FLOOR, top: CUT, skip: [[1.9, 3.5], [6.8, 7.4]] },
  { a: [5.9, 3.7 + f], b: [10.6, 3.7 + f], n: [0, 1], pattern: 0, bot: FLOOR, top: CUT },
  // Sales cabins and admin.
  { a: [fe, 0.15], b: [fe, 4.5], n: [1, 0], pattern: 0, bot: FLOOR, top: CUT },
  { a: [4.6, fe], b: [11.0, fe], n: [0, 1], pattern: 0, bot: FLOOR, top: CUT, skip: [[1.9, 5.0]] },
];

export const FLUTE = { pitch: 0.07, pitchCoarse: 0.1, width: 0.032, depth: 0.04 };

/* ---------- Furniture (simple blocks: rect, bottom, top, kind) ---------- */

export type Kind = 'wood' | 'chair' | 'sofa' | 'white' | 'plant';
export const FURNITURE: { r: R4; y0: number; y1: number; k: Kind }[] = [
  // Reception: sofa, desk, plants (carpet and centre table: CENTREPIECE).
  { r: [0.3, 5.8, 1.1, 8.3], y0: FLOOR, y1: 1.0, k: 'sofa' },
  { r: [3.6, 5.9, 4.2, 8.0], y0: FLOOR, y1: 1.05, k: 'wood' },
  { r: [0.4, 4.9, 0.9, 5.4], y0: FLOOR, y1: 1.2, k: 'plant' },
  { r: [0.4, 8.8, 0.9, 9.3], y0: FLOOR, y1: 1.2, k: 'plant' },
  { r: [4.0, 8.9, 4.5, 9.4], y0: FLOOR, y1: 1.2, k: 'plant' },
  // Discussion: four square tables, chairs added round them in code.
  ...[[6.9, 6.0], [9.3, 6.0], [6.9, 8.3], [9.3, 8.3]].map(([x, z]) => ({ r: [x - 0.45, z - 0.45, x + 0.45, z + 0.45] as R4, y0: FLOOR, y1: 1.05, k: 'wood' as Kind })),
  // AV: conference table.
  { r: [12.2, 5.9, 13.4, 8.3], y0: FLOOR, y1: 1.05, k: 'white' },
  { r: [12.0, 9.3, 14.3, 9.55], y0: FLOOR, y1: 2.6, k: 'white' },
  // Director: L desk and sofa.
  { r: [15.4, 7.0, 17.6, 7.6], y0: FLOOR, y1: 1.05, k: 'wood' },
  { r: [17.0, 7.6, 17.6, 9.2], y0: FLOOR, y1: 1.05, k: 'wood' },
  { r: [16.2, 4.9, 17.5, 5.6], y0: FLOOR, y1: 1.0, k: 'sofa' },
  // Sales cabins.
  { r: [1.0, 0.8, 2.0, 1.6], y0: FLOOR, y1: 1.05, k: 'wood' },
  { r: [1.0, 3.1, 2.0, 3.9], y0: FLOOR, y1: 1.05, k: 'wood' },
  // Admin: long table and cabinet.
  { r: [6.4, 1.0, 9.6, 1.6], y0: FLOOR, y1: 1.05, k: 'wood' },
  { r: [4.6, 0.2, 5.2, 2.2], y0: FLOOR, y1: 2.4, k: 'wood' },
  // Pantry counter and storage racks.
  { r: [15.9, 0.3, 16.5, 2.8], y0: FLOOR, y1: 1.2, k: 'wood' },
  { r: [16.85, 0.2, 17.35, 3.0], y0: FLOOR, y1: 2.4, k: 'white' },
];

/** Chairs: [x, z] centres. */
export const CHAIRS: V2[] = [
  ...[[6.9, 6.0], [9.3, 6.0], [6.9, 8.3], [9.3, 8.3]].flatMap(([x, z]) => [[x - 0.85, z], [x + 0.85, z], [x, z - 0.85], [x, z + 0.85]] as V2[]),
  ...[6.3, 7.0, 7.7, 8.4].flatMap((z) => [[11.75, z], [13.85, z]] as V2[]),
  [16.3, 6.7], [16.3, 8.0],
  [1.5, 0.4], [1.5, 2.0], [1.5, 2.85], [1.5, 4.3],
  [7.0, 0.7], [8.0, 0.7], [9.0, 0.7], [7.0, 1.9], [8.0, 1.9], [9.0, 1.9],
  [4.6, 6.5], [4.6, 7.4],
];

/** Reception centrepiece: a circular carpet with a square table on it. */
export const CENTREPIECE = { c: [2.4, 7.0] as V2, rug: 1.2, rugH: 0.015, table: 0.8, tableH: 0.45 };

/* ---------- Story and key ---------- */

export const STAGES = [
  {
    title: 'The front facade',
    text: 'The theme reaches the street: vertical fluted lines across the whole front, broken by a light, torn band that carries the builder’s name. One door and two fixed windows.',
  },
  {
    title: 'The plan',
    text: 'About 19 by 10 m inside. Reception, discussion area, AV room and the director’s cabin line the front. Sales cabins, the admin office, toilets, pantry and storage line the back, with a passage between.',
  },
  {
    title: 'Lines',
    text: '“The theme of the interior is Lines.” Fluted panels give rhythm and continuity. Placing and cutting them differently gives each room its own pattern: a torn band, a stepped cut, full height, an arch.',
  },
  {
    title: 'White and off-white',
    text: 'A white and off-white palette makes the rooms brighter and larger. Windows are fixed glazing, and the rooms are air-conditioned.',
  },
  {
    title: 'The passage',
    text: 'The passage is designed to avoid a static, dead corridor: the lines run on along its walls and pull you through the office.',
  },
  {
    title: 'Reception',
    text: 'Two arched niches lined with flutes face each other across the waiting area, as in Shankar’s reception perspective.',
  },
  {
    title: 'The rooms',
    text: 'Point at or tap a room, or use the list, to see what it is. Move the pointer over a fluted wall to send a ripple through the lines.',
  },
] as const;

export const KEY_ROOMS = ['reception', 'discussion', 'av', 'director', 'sales-1', 'admin', 'toilets', 'pantry', 'storage', 'passage'];
