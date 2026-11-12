/**
 * Building inspect, the page side (MODEL_NOTES.md §7).
 *
 * Wires a plan model that implements InspectableModel to the inspect stage:
 * keyboard access (a list of buttons, one per building, visible on focus),
 * the URL (?building=irshalpada-a-12), the dimming of the plan, and the
 * hand-off: glide in, pause the plan, open the stage; close the stage, resume,
 * glide back. The stage module is fetched on the first selection only.
 */
import type { InspectableModel, SiteModelHandle } from '../models/types';
import type { BuildingRef } from './registry';
import type { InspectSession } from './inspect';

type Model = SiteModelHandle & Partial<InspectableModel>;

const PARAM = 'building';

export interface InspectController {
  attach(model: Model): void;
  detach(): void;
}

export function createInspectController(story: HTMLElement, still: boolean): InspectController {
  const stage = story.querySelector<HTMLElement>('.model-slot__stage')!;
  const figure = story.querySelector<HTMLElement>('.model-slot')!;
  let model: (SiteModelHandle & InspectableModel) | null = null;
  let refs: BuildingRef[] = [];
  let nav: HTMLElement | null = null;
  let session: InspectSession | null = null;
  let busy = false;
  let returnFocus: HTMLElement | null = null;
  let pushed = false;

  const dim = document.createElement('div');
  dim.className = 'inspect-dim';
  dim.setAttribute('aria-hidden', 'true');

  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');

  const urlId = () => new URLSearchParams(location.search).get(PARAM);
  const setUrl = (id: string | null, push: boolean) => {
    const u = new URL(location.href);
    if (id) u.searchParams.set(PARAM, id);
    else u.searchParams.delete(PARAM);
    if (push) history.pushState({ [PARAM]: id }, '', u);
    else history.replaceState({ [PARAM]: id }, '', u);
  };

  /* Keyboard: Tab moves between buildings, Enter inspects. */
  const buildNav = () => {
    nav = document.createElement('nav');
    nav.className = 'bldg-nav';
    nav.setAttribute('aria-label', 'Buildings in the model');
    const intro = document.createElement('p');
    intro.className = 'bldg-nav__hint label';
    intro.textContent = 'Buildings: Tab to move, Enter to inspect, Esc to leave';
    nav.append(intro);
    const list = document.createElement('ul');
    list.setAttribute('role', 'list');
    for (const r of refs) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bldg-nav__item';
      b.dataset.building = r.id;
      b.textContent = r.label;
      b.setAttribute('aria-label', `${r.label}. ${r.sub}. ${r.detailed ? 'Opens the detailed model.' : 'Opens the outline model; the detailed model is not built yet.'}`);
      b.addEventListener('focus', () => preview(r.id));
      b.addEventListener('blur', () => preview(null));
      b.addEventListener('click', () => void enter(r.id, b));
      li.append(b);
      list.append(li);
    }
    nav.append(list);
    nav.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') (document.activeElement as HTMLElement | null)?.blur();
    });
    figure.append(nav);
  };

  const preview = (id: string | null) => {
    if (!model || session) return;
    const at = model.previewBuilding(id);
    if (at) {
      dim.style.setProperty('--x', `${at.x}px`);
      dim.style.setProperty('--y', `${at.y}px`);
    }
  };

  const enter = async (id: string, from?: HTMLElement | null) => {
    const r = refs.find((x) => x.id === id);
    if (!model || !r || busy || session) return;
    busy = true;
    const active = document.activeElement as HTMLElement | null;
    returnFocus = from ?? (active && active !== document.body ? active : stage);
    const m = model;
    const at = m.previewBuilding(id);
    if (at) {
      dim.style.setProperty('--x', `${at.x}px`);
      dim.style.setProperty('--y', `${at.y}px`);
    }
    dim.classList.add('is-on');
    status.textContent = `Opening ${r.label}`;
    // Fetch the stage while the camera glides in.
    const [mod] = await Promise.all([import('./inspect'), m.focusBuilding(id)]);
    if (model !== m) {
      busy = false;
      return;
    }
    m.setPaused(true);
    m.previewBuilding(null);
    if (urlId() !== id) {
      setUrl(id, true);
      pushed = true;
    }
    session = await mod.openInspect({
      ref: r,
      all: refs,
      view: m.viewFrom(id),
      still,
      onRequestClose: () => void exit(),
      onNavigate: (next) => {
        setUrl(next.id, false);
        status.textContent = `Showing ${next.label}`;
      },
    });
    busy = false;
  };

  const exit = async (fromHistory = false) => {
    if (!session || busy) return;
    busy = true;
    const s = session;
    await s.close();
    session = null;
    const m = model;
    m?.setPaused(false);
    dim.classList.remove('is-on');
    if (!fromHistory) {
      if (pushed && history.state?.[PARAM]) history.back();
      else setUrl(null, false);
    }
    pushed = false;
    status.textContent = 'Back to the plan';
    returnFocus?.focus({ preventScroll: true });
    await m?.focusBuilding(null);
    busy = false;
  };

  const onPop = () => {
    const id = urlId();
    if (!id && session) void exit(true);
    else if (id && !session) void enter(id);
  };
  addEventListener('popstate', onPop);

  // A shared link: bring the model into view so it mounts, then open.
  const pending = urlId();
  if (pending) {
    requestAnimationFrame(() => story.querySelector('.model-story__stage')?.scrollIntoView({ block: 'start' }));
  }

  return {
    attach(h) {
      if (!h.buildings || !h.previewBuilding || !h.focusBuilding || !h.setPaused || !h.viewFrom) return;
      model = h as SiteModelHandle & InspectableModel;
      refs = model.buildings();
      if (import.meta.env.DEV) Object.assign(window, { __plan: model, __inspect: { enter, exit, active: () => !!session } });
      stage.append(dim);
      stage.tabIndex = -1;
      figure.append(status);
      if (!nav) buildNav();
      model.onSelect = (id) => {
        if (id) void enter(id, null);
        else model?.previewBuilding(null);
      };
      const id = urlId();
      if (id && refs.some((r) => r.id === id)) setTimeout(() => void enter(id), 400);
    },
    detach() {
      if (session) {
        void session.close();
        session = null;
      }
      model = null;
      busy = false;
      dim.classList.remove('is-on');
    },
  };
}
