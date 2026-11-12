/**
 * 3D theme (DESIGN.md §11): the one place that sets every canvas's
 * surroundings, so the scenes sit in the site's palette. Geometry,
 * materials and model tints are not themed here.
 */

/** The brown family, as numbers for three.js. Keep in step with tokens.css. */
export const PALETTE = {
  espresso: 0x1e1611,
  walnut: 0x2e211a,
  cocoa: 0x4a372b,
  umber: 0x6f5442,
  caramel: 0xb88b5e,
  sand: 0xe7ddcc,
  vellum: 0xf2ece2,
  paper: 0xf9f5ee,
  brass: 0xc9a46b,
} as const;

/** Home hero: the instrument still life. */
export const HERO = {
  background: PALETTE.espresso,
  exposure: 1.0,
  /** Warm lamp, about 3200 K. */
  key: { color: 0xffd6a5, intensity: 19000 },
  fill: { sky: PALETTE.vellum, ground: PALETTE.walnut, intensity: 0.14 },
  rim: { color: PALETTE.brass, intensity: 0.9 },
  /** Fog dissolves the far desk into the page ground. */
  fog: { near: 110, far: 260 },
  desk: 0x3a2a1f,
  sheet: 0xf1e9db,
  line: 'rgba(111, 84, 66, 0.5)',
  arc: 0x3b312a,
} as const;
