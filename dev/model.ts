/**
 * Dev-only viewer for headless verification renders. Not part of the build.
 * Query: ?model=residential-school|irshalpada|mass-housing|sukoon-resort|sales-office-interior|dharavi-rerooted &p=0..1 &mode=site|idea &hl=<id> &still=1
 *        &view=az,el,dist,tx,ty,tz,fov (fixed camera)
 */

const q = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const tip = document.querySelector<HTMLElement>('#tip')!;
const still = q.get('still') !== '0';

const view = q.get('view'); // "az,el,dist,tx,ty,tz,fov"
const v = view?.split(',').map(Number);
const debugView = v ? { az: v[0], el: v[1], dist: v[2], t: [v[3], v[4], v[5]] as [number, number, number], fov: v[6] } : undefined;
const which = q.get('model');
const create =
  which === 'irshalpada'
    ? (await import('../src/models/irshalpada')).createIrshalpada
    : which === 'mass-housing'
      ? (await import('../src/models/mass-housing')).createMassHousing
      : which === 'sukoon-resort'
        ? (await import('../src/models/sukoon-resort')).createSukoonResort
        : which === 'sales-office-interior'
          ? (await import('../src/models/sales-office')).createSalesOffice
          : which === 'dharavi-rerooted'
            ? (await import('../src/models/dharavi')).createDharavi
            : (await import('../src/models/residential-school')).createResidentialSchool;
const h = await create(canvas, { still, debugView });
h.resize(innerWidth, innerHeight);
h.setProgress(Number(q.get('p') ?? 1));
h.setMode(q.get('mode') === 'idea' ? 'idea' : 'site');
if (q.get('hl')) h.highlight(q.get('hl'));
h.onHover = (i) => (tip.textContent = i ? `${i.name} · ${i.levels} · ${i.storeys}` : '');
addEventListener('resize', () => h.resize(innerWidth, innerHeight));

let frames = 0;
const loop = (t: number) => {
  h.frame(t);
  if (++frames === 4) document.title = 'ready';
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
(window as unknown as { model: typeof h }).model = h;
