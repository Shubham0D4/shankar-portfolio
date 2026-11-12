/**
 * Home hero (DESIGN.md §8). The page is complete without any 3D: the stage
 * holds a still image of the composition. When the inline gate in <head>
 * has marked the page `hero-3d` (WebGL, no reduced motion, no Save-Data,
 * enough memory), the scene loads after the page has loaded and the browser
 * is idle, and only while the hero is on screen.
 *
 * `?still-render=wide|tall` renders the resting state at a fixed size for
 * dev/hero-still.mjs, which saves it as the still image.
 */
import type { Instruments } from '../hero/instruments';

const STILL_SIZES = { wide: [960, 768], tall: [540, 675] } as const;
const SLOW_SCENE_MS = 2600;
/** Mean CPU time per frame above which the scene gives way to the still. */
const SLOW_FRAME_MS = 22;

export function initHome(): void {
  const stage = document.querySelector<HTMLElement>('.hero__stage');
  if (!stage) return;
  const stillKind = new URLSearchParams(location.search).get('still-render') as keyof typeof STILL_SIZES | null;

  if (stillKind && STILL_SIZES[stillKind]) {
    const [w, h] = STILL_SIZES[stillKind];
    stage.setAttribute('style', `position:fixed;inset:0 auto auto 0;width:${w}px;height:${h}px;z-index:99;mask:none;-webkit-mask:none;margin:0`);
    void mountScene(stage, { still: true });
    return;
  }
  if (!document.documentElement.classList.contains('hero-3d')) return;

  // Back from the back/forward cache the scene has been disposed: show the still.
  addEventListener('pageshow', (e) => e.persisted && stage.classList.add('show-still'));

  // If the scene is slow, show the still rather than an empty stage.
  const slow = setTimeout(() => stage.classList.add('show-still'), SLOW_SCENE_MS);

  whenIdleAfterLoad()
    .then(() => whenVisible(stage))
    .then(() => mountScene(stage, { still: false }))
    .then((ok) => {
      if (!ok) stage.classList.add('show-still');
      clearTimeout(slow);
    });
}

function whenIdleAfterLoad(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () =>
      'requestIdleCallback' in window ? requestIdleCallback(() => resolve(), { timeout: 1500 }) : setTimeout(resolve, 200);
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });
  });
}

function whenVisible(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      resolve();
    });
    io.observe(el);
  });
}

async function mountScene(stage: HTMLElement, { still }: { still: boolean }): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  // If the still is already showing, skip the intro so nothing jumps.
  const intro = !still && !stage.classList.contains('show-still');

  let scene: Instruments;
  try {
    const { createInstruments } = await import('../hero/instruments');
    scene = await createInstruments(canvas, { still, intro });
  } catch (err) {
    console.warn('Hero scene failed to start; keeping the still image.', err);
    canvas.remove();
    return false;
  }

  let visible = true;
  let raf = 0;
  const loop = (t: number) => {
    raf = 0;
    if (!visible || document.hidden) return; // paused off-screen and in hidden tabs
    if (!guarded(t)) return;
    raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  };

  const size = () => {
    const r = stage.getBoundingClientRect();
    scene.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)));
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(stage);

  if (still) {
    requestAnimationFrame((t) => {
      scene.frame(t);
      stage.classList.add('is-live');
      (window as unknown as { __heroStill: string }).__heroStill = canvas.toDataURL('image/png');
    });
    return true;
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  });
  io.observe(stage);
  document.addEventListener('visibilitychange', kick);

  const hero = stage.closest<HTMLElement>('.hero') ?? stage;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    scene.pointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  });
  hero.addEventListener('pointerleave', () => scene.pointer(0, 0));

  // Frame guard: if this device cannot render the scene smoothly, give the
  // main thread back and show the still image instead.
  let frames = 0;
  let cost = 0;
  const guarded = (t: number) => {
    const t0 = performance.now();
    scene.frame(t);
    frames++;
    if (frames > 3 && frames <= 15) cost += performance.now() - t0;
    if (frames === 15 && cost / 12 > SLOW_FRAME_MS) {
      stage.classList.add('show-still');
      teardown();
      return false;
    }
    return true;
  };

  requestAnimationFrame((t) => {
    if (!guarded(t)) return;
    stage.classList.add('is-live');
    kick();
  });

  let disposed = false;
  function teardown() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    io.disconnect();
    ro.disconnect();
    stage.classList.remove('is-live');
    // Let the canvas fade out before releasing it.
    setTimeout(() => {
      scene.dispose();
      canvas.remove();
    }, 700);
  }
  addEventListener('pagehide', teardown, { once: true });
  return true;
}
