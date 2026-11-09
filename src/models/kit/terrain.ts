/**
 * Site-model terrain: a closed heightfield slab (top, four skirts, base), so
 * it reads as a physical model on a plinth and can be cut by the section.
 *
 * The geometry stores each vertex's elevation in `aElev`. The vertex shader
 * turns elevation into height, which lets one mesh animate between flat
 * ground, true contours and a stepped contour-layer model:
 *
 *   band  = continuous band coordinate (see bandCoord)
 *   e'    = mix(e, band0 + band * bandStep, uStep)
 *   y     = base + (e' - eMin) * uRise + band * uExplode
 *
 * `terrainY` repeats the formula on the CPU for anything that must sit on
 * the ground (blocks, run-off lines).
 */
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';

export interface TerrainSpec {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Grid spacing, metres. */
  cell: number;
  elev: (x: number, z: number) => number;
  /** Lowest elevation shown; maps to the top of the plinth base. */
  eMin: number;
  /** Plinth thickness below eMin, metres. */
  base: number;
  band0: number;
  bandStep: number;
  bands: number;
}

export interface TerrainState {
  rise: number;
  step: number;
  explode: number;
}

/** Riser share of each band in the stepped (contour-layer) state. */
export const RISER = 0.3;

/**
 * Continuous band coordinate: whole numbers on each terrace, rising over the
 * last RISER of the band. Continuous, so risers follow the contour smoothly
 * instead of leaving a sawtooth along the grid.
 */
export function bandCoord(spec: TerrainSpec, e: number): number {
  const v = Math.max((e - spec.band0) / spec.bandStep, 0);
  const b = Math.floor(v);
  const t = Math.min(1, Math.max(0, (v - b - (1 - RISER)) / RISER));
  return b + t * t * (3 - 2 * t);
}

export function terrainY(spec: TerrainSpec, e: number, s: TerrainState): number {
  const f = bandCoord(spec, e);
  const es = e + (spec.band0 + f * spec.bandStep - e) * s.step;
  return spec.base + (es - spec.eMin) * s.rise + f * s.explode;
}

/** Geometry at final heights (rise 1, no step), with aElev and aSide. */
export function buildTerrainSlab(spec: TerrainSpec): BufferGeometry {
  const nx = Math.round((spec.x1 - spec.x0) / spec.cell);
  const nz = Math.round((spec.z1 - spec.z0) / spec.cell);
  const W = spec.x1 - spec.x0;
  const D = spec.z1 - spec.z0;
  const pos: number[] = [];
  const uv: number[] = [];
  const elev: number[] = [];
  const side: number[] = [];
  const index: number[] = [];
  const flat: TerrainState = { rise: 1, step: 0, explode: 0 };

  const E: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = spec.x0 + (i / nx) * W;
      const z = spec.z0 + (j / nz) * D;
      const e = spec.elev(x, z);
      E.push(e);
      pos.push(x, terrainY(spec, e, flat), z);
      uv.push((x - spec.x0) / W, 1 - (z - spec.z0) / D);
      elev.push(e);
      side.push(0);
    }
  }
  const row = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      // Counter-clockwise from above (+y): a, c, b and b, c, d.
      index.push(a, c, b, b, c, d);
    }
  }

  // Skirts: a top and a bottom vertex for each perimeter sample.
  const addVertex = (x: number, z: number, e: number, s: number) => {
    pos.push(x, s === 2 ? 0 : terrainY(spec, e, flat), z);
    uv.push(0, 0);
    elev.push(e);
    side.push(s);
    return pos.length / 3 - 1;
  };
  const skirt = (ids: number[], outward: [number, number]) => {
    const top: number[] = [];
    const bot: number[] = [];
    for (const id of ids) {
      const x = pos[id * 3];
      const z = pos[id * 3 + 2];
      top.push(addVertex(x, z, E[id], 1));
      bot.push(addVertex(x, z, spec.eMin, 2));
    }
    for (let k = 0; k < ids.length - 1; k++) {
      const [t0, t1, b0, b1] = [top[k], top[k + 1], bot[k], bot[k + 1]];
      // Orient by the outward normal using the edge direction.
      const ex = pos[t1 * 3] - pos[t0 * 3];
      const ez = pos[t1 * 3 + 2] - pos[t0 * 3 + 2];
      // Triangle (t0, t1, b0) has normal edge × down = (ez, 0, -ex).
      if (ez * outward[0] - ex * outward[1] > 0) index.push(t0, t1, b0, b0, t1, b1);
      else index.push(t0, b0, t1, b0, b1, t1);
    }
    return bot;
  };
  const north = Array.from({ length: row }, (_, i) => i);
  const south = Array.from({ length: row }, (_, i) => nz * row + i);
  const west = Array.from({ length: nz + 1 }, (_, j) => j * row);
  const east = Array.from({ length: nz + 1 }, (_, j) => j * row + nx);
  skirt(north, [0, -1]);
  skirt(south, [0, 1]);
  skirt(west, [-1, 0]);
  skirt(east, [1, 0]);

  // Base: one quad facing down.
  const b0 = addVertex(spec.x0, spec.z0, spec.eMin, 2);
  const b1 = addVertex(spec.x1, spec.z0, spec.eMin, 2);
  const b2 = addVertex(spec.x1, spec.z1, spec.eMin, 2);
  const b3 = addVertex(spec.x0, spec.z1, spec.eMin, 2);
  index.push(b0, b1, b2, b0, b2, b3);

  const g = new BufferGeometry();
  g.setIndex(index);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('aElev', new Float32BufferAttribute(elev, 1));
  g.setAttribute('aSide', new Float32BufferAttribute(side, 1));
  g.computeVertexNormals();
  return g;
}

export interface TerrainUniforms {
  uRise: { value: number };
  uStep: { value: number };
  uExplode: { value: number };
  uBands: { value: number };
  uLines: { value: number };
  uLo: { value: Color };
  uMid: { value: Color };
  uHi: { value: Color };
  uInk: { value: Color };
  uSideColor: { value: Color };
}

export function createTerrainUniforms(): TerrainUniforms {
  return {
    uRise: { value: 1 },
    uStep: { value: 0 },
    uExplode: { value: 0 },
    uBands: { value: 1 },
    uLines: { value: 1 },
    uLo: { value: new Color(0xf6f1e8) },
    uMid: { value: new Color(0xeadcc0) },
    uHi: { value: new Color(0xd6bd93) },
    uInk: { value: new Color(0x2a2724) },
    uSideColor: { value: new Color(0xc9ae84) },
  };
}

/** GLSL for terrainY; `e` in metres, returns local y. */
export function terrainGLSL(spec: TerrainSpec): string {
  const f = (n: number) => n.toFixed(4);
  return `
uniform float uRise;
uniform float uStep;
uniform float uExplode;
float terrainBand(float e) {
  float v = max((e - ${f(spec.band0)}) / ${f(spec.bandStep)}, 0.0);
  float b = floor(v);
  return b + smoothstep(${f(1 - RISER)}, 1.0, v - b);
}
float terrainY(float e) {
  float b = terrainBand(e);
  float es = mix(e, ${f(spec.band0)} + b * ${f(spec.bandStep)}, uStep);
  return ${f(spec.base)} + (es - ${f(spec.eMin)}) * uRise + b * uExplode;
}`;
}

/** Patches a MeshStandardMaterial (with a site-plan map) into the terrain shader. */
export function patchTerrain(material: Material, spec: TerrainSpec, u: TerrainUniforms, color = true): void {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aElev;
attribute float aSide;
varying float vElev;
varying float vSide;
${terrainGLSL(spec)}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vElev = aElev;
vSide = aSide;
transformed.y = aSide > 1.5 ? 0.0 : terrainY(aElev);`,
      );
    if (!color) return;
    const nb = (spec.bands - 1).toFixed(1);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uBands;
uniform float uLines;
uniform vec3 uLo;
uniform vec3 uMid;
uniform vec3 uHi;
uniform vec3 uInk;
uniform vec3 uSideColor;
varying float vElev;
varying float vSide;
float contourLine(float e, float interval, float width) {
  float v = e / interval;
  float d = abs(fract(v + 0.5) - 0.5) / max(fwidth(v), 1e-4);
  return 1.0 - smoothstep(0.0, width, d);
}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  float bi = clamp(floor((vElev - ${spec.band0.toFixed(4)}) / ${spec.bandStep.toFixed(4)}), 0.0, ${nb});
  float t = bi / ${nb};
  vec3 ramp = t < 0.5 ? mix(uLo, uMid, t * 2.0) : mix(uMid, uHi, t * 2.0 - 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * ramp * 1.06, uBands);
  float minor = contourLine(vElev, 1.0, 0.9) * 0.18;
  float major = contourLine(vElev, ${spec.bandStep.toFixed(4)}, 1.3) * 0.55;
  // Contours only on sloping ground: flat pads that sit exactly on a contour
  // level would otherwise fill solid.
  float slope = smoothstep(0.002, 0.012, fwidth(vElev));
  diffuseColor.rgb = mix(diffuseColor.rgb, uInk, max(minor, major) * slope * uLines * (1.0 - step(0.5, vSide)));
  if (vSide > 0.5) diffuseColor.rgb = uSideColor;
}`,
      );
  };
  material.customProgramCacheKey = () => `terrain:${color ? 1 : 0}`;
}
