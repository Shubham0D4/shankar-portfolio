/** Shared contract for the project-page site models. */
import type { SceneHandle } from '../three/slot';

export type Mode = 'site' | 'idea';

export interface HoverInfo {
  id: string;
  name: string;
  levels: string;
  storeys: string;
  /** Pointer position in canvas pixels. */
  x: number;
  y: number;
}

export interface CamKey {
  az: number;
  el: number;
  dist: number;
  t: [number, number, number];
  /** Vertical field of view, degrees (default 30). */
  fov?: number;
}

export interface ModelOptions {
  /** Reduced motion: no drift, no flowing dashes, instant mode changes. */
  still?: boolean;
  /** Fixed camera for verification renders (dev only). */
  debugView?: CamKey & { fov?: number };
}

export interface SiteModelHandle extends SceneHandle {
  /** Story position, 0 to 1 across all stages. */
  setProgress(p: number): void;
  setMode(m: Mode): void;
  /** Highlight a block or group by id (keyboard list), or clear. */
  highlight(id: string | null): void;
  onHover: ((info: HoverInfo | null) => void) | null;
  /** Renderer counters from the last frame, for performance checks. */
  debugInfo(): { calls: number; triangles: number; lines: number; geometries: number; textures: number; programs: number };
}

export type CreateModel = (canvas: HTMLCanvasElement, opts?: ModelOptions) => Promise<SiteModelHandle>;
