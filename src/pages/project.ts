/**
 * Project page: the scroll-told site model (PLAN.md §5).
 *
 * The model module is fetched only when its slot nears the viewport. Scroll
 * position maps to a fractional story stage by where each step sits against
 * a reading line, so steps of different heights still line up with their
 * stage. Under reduced motion, each step gets a button instead.
 */
import { prefersReducedMotion } from '../shell/motion';
import { mountWhenVisible } from '../three/slot';
import type { CreateModel, InspectableModel, Mode, SiteModelHandle } from '../models/types';
import { createInspectController } from '../inspect/controller';

const LOADERS: Record<string, () => Promise<CreateModel>> = {
  'residential-school': () => import('../models/residential-school').then((m) => m.createResidentialSchool),
  irshalpada: () => import('../models/irshalpada').then((m) => m.createIrshalpada),
  'mass-housing': () => import('../models/mass-housing').then((m) => m.createMassHousing),
  'sukoon-resort': () => import('../models/sukoon-resort').then((m) => m.createSukoonResort),
  'sales-office-interior': () => import('../models/sales-office').then((m) => m.createSalesOffice),
  'dharavi-rerooted': () => import('../models/dharavi').then((m) => m.createDharavi),
};

/** Click-to-enlarge for gallery images, on a native <dialog>. Without JS the links open the image. */
function initLightbox(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-lightbox]')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Enlarged image');
  dlg.innerHTML = `<div class="lightbox__inner"><div class="lightbox__bar"><p class="label lightbox__cap"></p><button type="button" class="filter lightbox__close">Close</button></div></div>`;
  document.body.append(dlg);
  const img = document.createElement('img');
  img.className = 'lightbox__img';
  const cap = dlg.querySelector<HTMLElement>('.lightbox__cap')!;
  dlg.querySelector('.lightbox__close')!.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  for (const a of links) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const thumb = a.querySelector('img');
      img.src = a.href;
      if (!img.isConnected) dlg.querySelector('.lightbox__inner')!.append(img);
      img.alt = thumb?.alt ?? '';
      cap.textContent = a.parentElement?.querySelector('figcaption')?.textContent ?? '';
      dlg.showModal();
    });
  }
}

/** Project bar: mark the jump link whose section is on screen. */
function initBar(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.project-bar__jumps a')];
  const targets = links
    .map((a) => document.querySelector<HTMLElement>(a.getAttribute('href') ?? ''))
    .map((t) => t?.closest<HTMLElement>('section, figure, .project-page__body') ?? t);
  if (!links.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = targets.indexOf(e.target as HTMLElement);
        links.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  targets.forEach((t) => t && io.observe(t));
}

export function initProject(): void {
  initLightbox();
  initBar();
  const story = document.querySelector<HTMLElement>('[data-model-story]');
  const slug = story?.dataset.modelStory;
  const slot = story?.querySelector<HTMLElement>('[data-model-slot]');
  if (!story || !slug || !slot || !LOADERS[slug]) return;

  const still = prefersReducedMotion();
  const steps = [...story.querySelectorAll<HTMLElement>('.model-step')];
  const tip = story.querySelector<HTMLElement>('.model-tip');
  const ideaText = story.querySelector<HTMLElement>('.model-story__idea');
  const last = Math.max(1, steps.length - 1);

  let model: SiteModelHandle | null = null;
  const inspect = createInspectController(story, still);
  let progress = 0;
  let mode: Mode = 'site';
  let pinned: string | null = null;

  mountWhenVisible(slot, async (canvas) => {
    const create = await LOADERS[slug]();
    const h = await create(canvas, { still });
    h.setProgress(progress);
    h.setMode(mode);
    h.highlight(pinned);
    h.onHover = (info) => {
      if (!tip) return;
      if (!info) {
        tip.hidden = true;
        return;
      }
      tip.textContent = `${info.name}. ${info.levels}. ${info.storeys}.`;
      tip.style.setProperty('--x', `${info.x}px`);
      tip.style.setProperty('--y', `${info.y}px`);
      tip.hidden = false;
    };
    const dispose = h.dispose.bind(h);
    h.dispose = () => {
      model = null;
      inspect.detach();
      if (tip) tip.hidden = true;
      dispose();
    };
    model = h;
    inspect.attach(h as SiteModelHandle & Partial<InspectableModel>);
    return h;
  });

  /* Story position */
  const markActive = (stage: number) => {
    const i = Math.round(stage);
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  };
  const setStage = (stage: number) => {
    progress = Math.min(1, Math.max(0, stage / last));
    model?.setProgress(progress);
    markActive(stage);
  };

  if (still) {
    for (const b of story.querySelectorAll<HTMLButtonElement>('.model-step__go')) {
      b.hidden = false;
      b.addEventListener('click', () => setStage(Number(b.dataset.go)));
    }
    setStage(last); // show the finished campus
  } else {
    let queued = false;
    const read = () => {
      queued = false;
      const line = innerHeight * 0.55;
      const tops = steps.map((s) => s.getBoundingClientRect().top);
      let stage = 0;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] > line) break;
        const next = tops[i + 1];
        stage = next === undefined ? i : i + Math.min(1, (line - tops[i]) / (next - tops[i]));
      }
      setStage(stage);
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(read);
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    read();
  }

  /* Site / idea toggle */
  const modeButtons = [...story.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  for (const b of modeButtons) {
    b.addEventListener('click', () => {
      mode = b.dataset.mode === 'idea' ? 'idea' : 'site';
      modeButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      story.classList.toggle('is-idea', mode === 'idea');
      if (ideaText) ideaText.hidden = mode !== 'idea';
      model?.setMode(mode);
    });
  }

  /* Block key: hover and focus highlight the block in the model */
  for (const b of story.querySelectorAll<HTMLButtonElement>('[data-block]')) {
    const on = () => {
      pinned = b.dataset.block ?? null;
      model?.highlight(pinned);
    };
    const off = () => {
      pinned = null;
      model?.highlight(null);
    };
    b.addEventListener('pointerenter', on);
    b.addEventListener('focus', on);
    b.addEventListener('pointerleave', off);
    b.addEventListener('blur', off);
    b.addEventListener('click', on);
  }
}
