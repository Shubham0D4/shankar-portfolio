/**
 * Section cut with solid poché, after three.js's clipping-stencil technique.
 *
 * For each closed solid, back faces increment and front faces decrement the
 * stencil wherever the clipping plane removes geometry. Pixels left non-zero
 * are inside a cut solid, and a plane drawn there fills the cut like the
 * black ground of the architect's own section drawings.
 */
import {
  AlwaysStencilFunc,
  BackSide,
  DecrementWrapStencilOp,
  DoubleSide,
  FrontSide,
  Group,
  IncrementWrapStencilOp,
  Mesh,
  MeshBasicMaterial,
  NotEqualStencilFunc,
  type Plane,
  PlaneGeometry,
  ReplaceStencilOp,
  type BufferGeometry,
  type Material,
  type WebGLRenderer,
} from 'three';

export interface SectionSolid {
  geometry: BufferGeometry;
  /** Colour of the cut face. */
  color: number;
  /** Applies the same vertex patch as the visible material (lift etc.). */
  patch?: (m: Material) => void;
}

export interface SectionCaps {
  group: Group;
  /** Re-centres the cap planes on the clipping plane. Call after moving it. */
  update(): void;
  dispose(): void;
}

export function createSectionCaps(plane: Plane, solids: SectionSolid[], size = 2000, baseOrder = 1): SectionCaps {
  const group = new Group();
  const owned: { dispose(): void }[] = [];
  const caps: Mesh[] = [];
  const capGeo = new PlaneGeometry(size, size);
  owned.push(capGeo);

  solids.forEach((solid, i) => {
    const order = baseOrder + i * 0.1;
    const stencilMat = (side: typeof BackSide | typeof FrontSide, op: typeof IncrementWrapStencilOp | typeof DecrementWrapStencilOp) => {
      const m = new MeshBasicMaterial({
        side,
        clippingPlanes: [plane],
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: AlwaysStencilFunc,
        stencilFail: op,
        stencilZFail: op,
        stencilZPass: op,
      });
      solid.patch?.(m);
      owned.push(m);
      return m;
    };
    const back = new Mesh(solid.geometry, stencilMat(BackSide, IncrementWrapStencilOp));
    const front = new Mesh(solid.geometry, stencilMat(FrontSide, DecrementWrapStencilOp));
    back.renderOrder = order;
    front.renderOrder = order + 0.01;
    back.frustumCulled = front.frustumCulled = false;

    const capMat = new MeshBasicMaterial({
      color: solid.color,
      side: DoubleSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: NotEqualStencilFunc,
      stencilFail: ReplaceStencilOp,
      stencilZFail: ReplaceStencilOp,
      stencilZPass: ReplaceStencilOp,
      // Later solids win where cuts overlap (a building's footing in the ground).
      polygonOffset: true,
      polygonOffsetFactor: -1 - i,
      polygonOffsetUnits: -1 - i,
    });
    owned.push(capMat);
    const cap = new Mesh(capGeo, capMat);
    cap.renderOrder = order + 0.02;
    cap.onAfterRender = (renderer: WebGLRenderer) => renderer.clearStencil();
    caps.push(cap);
    group.add(back, front, cap);
  });

  const update = () => {
    for (const cap of caps) {
      plane.coplanarPoint(cap.position);
      cap.lookAt(cap.position.x - plane.normal.x, cap.position.y - plane.normal.y, cap.position.z - plane.normal.z);
    }
  };
  update();

  return {
    group,
    update,
    dispose: () => owned.forEach((o) => o.dispose()),
  };
}
