/** Shared contract for the project-page site models. */
import type { SceneHandle } from '../three/slot';
import type { BuildingRef } from '../inspect/registry';

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

/**
 * Building inspect (MODEL_NOTES.md §7): optional on a site model. None of it
 * changes how the plan looks; with nothing hovered or selected the model
 * renders exactly as before.
 */
export interface InspectableModel {
  /** Every selectable building, in plot order. */
  buildings(): BuildingRef[];
  /** Highlight a whole building (hover or keyboard focus); returns its screen position, or null. */
  previewBuilding(id: string | null): { x: number; y: number } | null;
  /** Glide the camera towards a building, or back to the story with null. Resolves when the glide ends. */
  focusBuilding(id: string | null): Promise<void>;
  /** The main camera's direction from the building, as azimuth and elevation in degrees. */
  viewFrom(id: string): { az: number; el: number };
  /** Stop rendering the plan while the inspect stage is open. */
  setPaused(paused: boolean): void;
  /** Click or tap: the building under the pointer, or null for empty space. */
  onSelect: ((id: string | null) => void) | null;
}

export type CreateModel = (canvas: HTMLCanvasElement, opts?: ModelOptions) => Promise<SiteModelHandle & Partial<InspectableModel>>;
