/**
 * Shared Three.js rig (PLAN.md §5): one renderer per page, a sun placed by
 * azimuth and elevation, hemisphere fill, matte "clay" materials.
 * Used by the project-page site models (src/models). The home hero still
 * shows its SVG poster.
 */
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

/** Material tints, mirroring the CSS tokens. */
export const TINT = {
  lime: 0xf4efe6,
  limeDeep: 0xeae3d6,
  sandstone: 0xd9c29c,
  terracotta: 0xb4623e,
  charcoal: 0x2a2724,
  court: 0x7d8b6a,
} as const;

export const clay = (color: number) =>
  new MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });

/** Unit vector toward the sun. Azimuth from north, clockwise, in degrees. */
export function sunDirection(azimuthDeg: number, elevationDeg: number, out = new Vector3()): Vector3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  // Scene axes: +x east, +y up, -z north.
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

export interface Rig {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  sun: DirectionalLight;
  setSun(azimuthDeg: number, elevationDeg: number, distance?: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface RigOptions {
  /** Needed for stencil section caps. */
  stencil?: boolean;
}

export function createRig(canvas: HTMLCanvasElement, opts: RigOptions = {}): Rig {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new WebGLRenderer({
    canvas,
    antialias: !coarse,
    alpha: true,
    stencil: !!opts.stencil,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.25 : 1.75));
  // Soft shadows on desktop only.
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = null; // the page's lime ground shows through

  const camera = new PerspectiveCamera(30, 1, 0.1, 500);

  const hemi = new HemisphereLight(new Color(TINT.lime), new Color(TINT.sandstone), 1.6);
  scene.add(hemi);

  const sun = new DirectionalLight(0xfff4e0, 3.1);
  sun.castShadow = !coarse;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2;
  scene.add(sun, sun.target);

  const dir = new Vector3();
  const setSun = (az: number, el: number, distance = 60) => {
    sunDirection(az, el, dir);
    sun.position.copy(dir.multiplyScalar(distance));
  };
  setSun(135, 40);

  return {
    renderer,
    scene,
    camera,
    sun,
    setSun,
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      renderer.dispose();
      // Release the GPU context now rather than waiting for GC; browsers cap live contexts.
      renderer.forceContextLoss();
    },
  };
}
