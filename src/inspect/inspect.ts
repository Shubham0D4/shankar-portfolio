/** Inspect stage (Step 1 stub: replaced by the full stage in Step 2). */
import type { BuildingRef } from './registry';

export interface InspectOptions {
  ref: BuildingRef;
  all: BuildingRef[];
  view: { az: number; el: number };
  still: boolean;
  onRequestClose(): void;
  onNavigate(ref: BuildingRef): void;
}

export interface InspectSession {
  close(): Promise<void>;
}

export async function openInspect(o: InspectOptions): Promise<InspectSession> {
  const dlg = document.createElement('dialog');
  dlg.className = 'inspect';
  dlg.innerHTML = `<p class="label"></p><h2></h2><button type="button" class="filter">Back to the plan</button>`;
  dlg.querySelector('p')!.textContent = o.ref.sub;
  dlg.querySelector('h2')!.textContent = o.ref.label;
  dlg.querySelector('button')!.addEventListener('click', () => o.onRequestClose());
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    o.onRequestClose();
  });
  document.body.append(dlg);
  dlg.showModal();
  return {
    async close() {
      dlg.close();
      dlg.remove();
    },
  };
}
