/**
 * Model slot contract.
 *
 * A slot is `<figure class="model-slot" data-model-slot="<name>">` whose
 * stage holds an SVG poster. `mountWhenVisible` lazy-loads a scene module
 * only when the slot nears the viewport and WebGL is available. The scene
 * draws into a canvas over the poster, and the slot gets `.is-live`, which
 * hides the poster. If anything fails, the poster simply stays.
 */

export interface SceneHandle {
  /** Called every frame while visible. */
  frame(time: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export type SceneLoader = (canvas: HTMLCanvasElement) => Promise<SceneHandle>;

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Lazy-mounts a scene when the slot nears the viewport, pauses it off-screen,
 * and disposes every GPU resource when the page is hidden for navigation
 * (`pagehide`). If the page comes back from the back/forward cache, the slot
 * re-arms and mounts again on view.
 */
export function mountWhenVisible(slot: HTMLElement, load: SceneLoader): void {
  const stage = slot.querySelector<HTMLElement>('.model-slot__stage');
  if (!stage || !hasWebGL()) return;

  let handle: SceneHandle | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let loading = false;
  let failed = false;
  let raf = 0;
  let visible = false;

  const loop = (t: number) => {
    handle?.frame(t);
    raf = visible && handle ? requestAnimationFrame(loop) : 0;
  };

  const resize = () => {
    const r = stage.getBoundingClientRect();
    handle?.resize(r.width, r.height);
  };
  const ro = new ResizeObserver(resize);

  const start = async () => {
    loading = true;
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    try {
      handle = await load(canvas);
      resize();
      ro.observe(stage);
      slot.classList.add('is-live');
      if (visible && !raf) raf = requestAnimationFrame(loop);
    } catch (err) {
      canvas.remove();
      canvas = null;
      failed = true;
      console.warn('Model failed to start; keeping the poster.', err);
    } finally {
      loading = false;
    }
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !handle && !loading && !failed) void start();
      // Pause rendering off-screen.
      if (visible && handle && !raf) raf = requestAnimationFrame(loop);
    },
    { rootMargin: '200px 0px' },
  );
  io.observe(slot);

  addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    handle?.dispose();
    handle = null;
    canvas?.remove();
    canvas = null;
    slot.classList.remove('is-live');
  });
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    // Re-arm: observing again delivers a fresh intersection entry.
    io.unobserve(slot);
    io.observe(slot);
  });
}
