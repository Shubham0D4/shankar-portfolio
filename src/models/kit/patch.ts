/**
 * Per-block animation on merged geometry.
 *
 * Every block of a model is merged into one mesh (one draw call), and each
 * vertex or instance carries `aBlock`, its block index. A shared uniform
 * array `uLift` moves blocks vertically, so blocks can settle in sequence
 * without separate meshes. A lift below -500 hides a block. `uHover` names
 * the block to highlight. The same patch goes on the colour, depth (shadow)
 * and stencil materials so they all agree.
 */
import { CanvasTexture, Color, type Material, RepeatWrapping, SRGBColorSpace, type WebGLProgramParametersWithUniforms } from 'three';

export const HIDDEN = -1000;

export interface BlockUniforms {
  uLift: { value: Float32Array };
  uHover: { value: number };
  /** Highlight a range of blocks [uHover, uHoverTo]; below 0 means just uHover. */
  uHoverTo: { value: number };
  uHoverColor: { value: Color };
  uHoverMix: { value: number };
  uTint: { value: Color };
  uTintMix: { value: number };
}

export function createBlockUniforms(count: number): BlockUniforms {
  return {
    uLift: { value: new Float32Array(count) },
    uHover: { value: -1 },
    uHoverTo: { value: -1 },
    uHoverColor: { value: new Color(0xf4efe6) },
    uHoverMix: { value: 0 },
    uTint: { value: new Color(0xf4efe6) },
    uTintMix: { value: 0 },
  };
}

export interface PatchOptions {
  /** Patch the fragment colour (hover and tint). Off for depth and stencil. */
  color?: boolean;
  /** Mix strength of the hover colour for this material. */
  hoverStrength?: number;
  /** Respond to the model-wide tint (idea mode). */
  tint?: boolean;
  /** Highlight colour for this material; defaults to the shared one. */
  hoverColor?: Color;
}

export function patchBlocks(material: Material, u: BlockUniforms, opts: PatchOptions = {}): void {
  const n = u.uLift.value.length;
  const strength = (opts.hoverStrength ?? 1).toFixed(3);
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    prev.call(material, shader, renderer);
    Object.assign(shader.uniforms, u, opts.hoverColor ? { uHoverColor: { value: opts.hoverColor } } : {});
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aBlock;
uniform float uLift[${n}];
uniform float uHover;
uniform float uHoverTo;
varying float vHover;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float bLift = uLift[int(aBlock + 0.5)];
if (bLift < -500.0) transformed = vec3(0.0, -10000.0, 0.0);
else transformed.y += bLift;
float hTo = uHoverTo < 0.0 ? uHover : uHoverTo;
vHover = step(uHover - 0.5, aBlock) * step(aBlock, hTo + 0.5) * step(0.0, uHover);`,
      );
    if (opts.color) {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform vec3 uHoverColor;
uniform float uHoverMix;
uniform vec3 uTint;
uniform float uTintMix;
varying float vHover;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
${opts.tint ? 'diffuseColor.rgb = mix(diffuseColor.rgb, uTint, uTintMix);' : ''}
diffuseColor.rgb = mix(diffuseColor.rgb, uHoverColor, vHover * uHoverMix * ${strength});
diffuseColor.a = mix(diffuseColor.a, 1.0, vHover * uHoverMix);`,
        );
    }
  };
  const key = `blocks:${n}:${opts.color ? 1 : 0}:${opts.tint ? 1 : 0}:${strength}`;
  const prevKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => prevKey() + key;
}

/**
 * Square-hole jali, as on the Residential School cover (p9): sandstone with
 * square perforations. Tiles at `holesPerTile` holes per texture repeat.
 */
export function jaliTexture(holesPerTile = 4, hole = 0.58): CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  const cell = size / holesPerTile;
  const h = cell * hole;
  for (let i = 0; i < holesPerTile; i++) {
    for (let j = 0; j < holesPerTile; j++) {
      g.clearRect(i * cell + (cell - h) / 2, j * cell + (cell - h) / 2, h, h);
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
