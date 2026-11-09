/** Contact: copy the address, for people who do not use a mail client. */
export function initContact(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-copy]');
  const status = document.querySelector<HTMLElement>('[data-copy-status]');
  if (!button || !navigator.clipboard) return;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      button.textContent = 'Address copied';
      if (status) status.textContent = '';
    } catch {
      if (status) status.textContent = 'Copying is blocked in this browser. Select the address above instead.';
    }
  });
}
