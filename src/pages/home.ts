import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../shell/motion';
import { formationProgress } from '../three/slot';

gsap.registerPlugin(ScrollTrigger);

/**
 * Home hero. One orchestrated moment: the cut lines draw across the solid
 * block on load, then scrolling parts the block to open the green court.
 * The progress value is shared through `formationProgress`, so the Three.js
 * model can read the same choreography when it replaces the poster.
 */
export function initHome(): void {
  const slot = document.querySelector<HTMLElement>('[data-model-slot="courtyard-formation"]');
  const svg = slot?.querySelector<SVGSVGElement>('.formation');
  if (!slot || !svg) return;

  const apply = (split: number) => {
    svg.style.setProperty('--split', split.toFixed(4));
    formationProgress.set(split);
  };

  if (prefersReducedMotion()) {
    initStepControls(apply);
    return;
  }

  // Start as a solid block with undrawn cut lines.
  apply(0);
  const state = { draw: 1 };
  gsap.to(state, {
    draw: 0,
    duration: 0.9,
    delay: 0.35,
    ease: 'power2.inOut', // matches --ease-light closely
    onUpdate: () => svg.style.setProperty('--draw', state.draw.toFixed(4)),
  });

  const hero = document.querySelector<HTMLElement>('.hero');
  ScrollTrigger.create({
    trigger: hero ?? slot,
    start: 'top top',
    end: 'bottom 35%',
    scrub: 0.6,
    onUpdate: (self) => apply(self.progress),
  });
}

/** Reduced motion: stepped states with buttons instead of scroll. */
function initStepControls(apply: (n: number) => void): void {
  const controls = document.querySelector<HTMLElement>('.model-slot__controls');
  if (!controls) return;
  controls.hidden = false;
  const buttons = [...controls.querySelectorAll<HTMLButtonElement>('button[data-split]')];
  const select = (btn: HTMLButtonElement) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    apply(Number(btn.dataset.split));
  };
  buttons.forEach((b) => b.addEventListener('click', () => select(b)));
  const initial = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
  if (initial) select(initial);
}
