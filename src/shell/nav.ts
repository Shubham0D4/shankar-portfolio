/**
 * Small-screen menu: a full-height poché panel with every page and every
 * project. Without JS, the header links wrap inline and the panel stays hidden.
 */
export function initNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.site-nav__toggle');
  const menu = document.getElementById('site-menu');
  if (!toggle || !menu) return;
  toggle.hidden = false;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open: boolean, restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
    else if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, true);
  });

  // Keep Tab inside the panel and its toggle while it is open.
  menu.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Node | null;
    if (isOpen() && next && !menu.contains(next) && next !== toggle) setOpen(false);
  });

  matchMedia('(min-width: 48em)').addEventListener('change', (e) => e.matches && setOpen(false));
}
