/**
 * Work register: type filters, and on wide screens a sheet-sized preview
 * that follows the row being pointed at or focused. The full list shows
 * without JavaScript.
 */
export function initWork(): void {
  const group = document.querySelector<HTMLElement>('.filters');
  const rows = [...document.querySelectorAll<HTMLElement>('#projects .reg-row')];
  if (!rows.length) return;

  /* Preview */
  const preview = document.querySelector<HTMLElement>('.register__preview');
  const img = preview?.querySelector<HTMLImageElement>('img');
  const capTitle = preview?.querySelector<HTMLElement>('.register__cap-title');
  const capSheets = preview?.querySelector<HTMLElement>('.register__cap-sheets');
  const show = (row: HTMLElement) => {
    rows.forEach((r) => r.classList.toggle('is-current', r === row));
    const thumb = row.querySelector<HTMLImageElement>('.reg-row__thumb img');
    if (!img || !thumb) return;
    img.src = row.dataset.cover ?? thumb.src;
    img.setAttribute('style', thumb.getAttribute('style') ?? '');
    if (capTitle) capTitle.textContent = row.querySelector('.reg-row__title')?.textContent ?? '';
    if (capSheets) capSheets.textContent = row.querySelector('.reg-row__sheets')?.textContent ?? '';
  };
  for (const row of rows) {
    row.addEventListener('pointerenter', () => show(row));
    row.addEventListener('focusin', () => show(row));
  }
  // Warm the cache so the preview swaps without a blank frame.
  window.requestIdleCallback?.(() => rows.forEach((r) => (new Image().src = r.dataset.cover ?? '')));

  /* Filters */
  if (!group) return;
  group.hidden = false;
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('.filter')];
  const status = group.querySelector<HTMLElement>('.filters__status');
  const filter = (cat: string) => {
    let count = 0;
    let first: HTMLElement | null = null;
    for (const row of rows) {
      const match = cat === 'All' || (row.dataset.categories ?? '').split(' ').includes(cat);
      row.hidden = !match;
      if (match) {
        count++;
        first ??= row;
      }
    }
    if (first) show(first);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
    if (status) status.textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
  };
  buttons.forEach((b) => b.addEventListener('click', () => filter(b.dataset.filter ?? 'All')));
}
