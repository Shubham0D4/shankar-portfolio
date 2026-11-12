import { launch } from './cdp.mjs';
const OUT = process.env.SCRATCH + '/shots-b';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const id = process.env.ID ?? 'irshalpada-b-05';
const b = await launch({ width: 1440, height: 900, port: 9337 });
const btn = (text) => b.eval(`[...document.querySelectorAll('.inspect button')].find(x => x.textContent.trim() === ${JSON.stringify(text)}).click()`);
const view = (az, el, d, ty = 2.5, tx = 0, tz = 0) => b.eval(`window.__stage.setView(${az}, ${el}, ${d}, ${ty}, ${tx}, ${tz})`);
const slider = (v) => b.eval(`(() => { const s = document.querySelector('.inspect__range input'); s.value = ${v}; s.dispatchEvent(new Event('input')); })()`);
const only = process.argv[2]?.split(',');
const want = (n) => !only || only.includes(n);
try {
  await b.goto(`http://localhost:5199/work/irshalpada/?building=${id}`);
  await b.waitFor('!!window.__stage && !!document.querySelector("dialog.inspect.is-open")', 120000);
  await b.sleep(5000);
  console.log('stats', JSON.stringify(await b.eval('window.__inspectStats')), 'mirror', await b.eval('window.__stage.camera.parent ? 1 : 0'));
  if (want('arrive')) await b.shot(`${OUT}/b1-arrived.png`);
  if (want('front')) { await view(180, 10, 30, 3.2); await b.sleep(2500); await b.shot(`${OUT}/b2-front.png`); }
  if (want('aerial')) { await view(220, 50, 40); await b.sleep(2500); await b.shot(`${OUT}/b3-aerial.png`); }
  if (want('back')) { await view(20, 18, 30, 3); await b.sleep(2500); await b.shot(`${OUT}/b4-back.png`); }
  if (want('balcony')) { await view(165, 12, 9, 4.2, 0.5, 0); await b.sleep(2500); await b.shot(`${OUT}/b5-balcony.png`); }
  if (want('lift')) { await view(200, 30, 38, 4.5); await btn('Separate the floors'); await b.sleep(4000); await b.shot(`${OUT}/b6-floors.png`); await btn('Put the floors back'); await b.sleep(3000); }
  if (want('section')) { await slider(45); await view(178, 12, 28, 3); await b.sleep(2500); await b.shot(`${OUT}/b7-section.png`); await slider(0); }
  if (want('dusk')) { await btn('Dusk'); await view(200, 8, 24, 2.5, 0, 3); await b.sleep(6000); await b.shot(`${OUT}/b8-dusk.png`); }
} finally {
  console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n'));
  b.close();
}
