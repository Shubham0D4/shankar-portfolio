import { prefersReducedMotion } from './motion';

/**
 * Scroll reveal (DESIGN.md §7): `[data-reveal]` blocks fade in and rise 12 px
 * once, the first time they enter the viewport. Siblings in a row stagger by
 * 60 ms, at most four. Nothing is hidden until this script has armed itself,
 * and blocks already on screen are shown at once, so content never waits.
 */
export function initReveal(): void {
  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!items.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const vh = innerHeight;
  const pending = items.filter((el) => el.getBoundingClientRect().top > vh * 0.92);
  if (!pending.length) return;
  pending.forEach((el) => {
    const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal')) : [];
    const i = Math.min(siblings.indexOf(el), 3);
    if (siblings.length > 1 && i > 0 && el.parentElement?.hasAttribute('data-reveal-row')) {
      el.style.setProperty('--reveal-delay', `${i * 60}ms`);
    }
  });
  items.filter((el) => !pending.includes(el)).forEach((el) => el.classList.add('is-in'));
  document.documentElement.classList.add('reveal-armed');

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  pending.forEach((el) => io.observe(el));
}
