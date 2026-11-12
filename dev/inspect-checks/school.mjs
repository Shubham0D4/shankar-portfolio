import { launch } from './cdp.mjs';
const OUT = process.env.SCRATCH + '/shots-s';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const b = await launch({ width: 1440, height: 900, port: 9339 });
const btn = (text) => b.eval(`[...document.querySelectorAll('.inspect button')].find(x => x.textContent.trim() === ${JSON.stringify(text)}).click()`);
const view = (az, el, d, ty = 2.5, tx = 0, tz = 0) => b.eval(`window.__stage.setView(${az}, ${el}, ${d}, ${ty}, ${tx}, ${tz})`);
const slider = (v) => b.eval(`(() => { const s = document.querySelector('.inspect__range input'); s.value = ${v}; s.dispatchEvent(new Event('input')); })()`);
const only = process.argv[2]?.split(',');
const want = (n) => !only || only.includes(n);
try {
  await b.goto('http://localhost:5199/work/irshalpada/?building=irshalpada-school');
  await b.waitFor('!!window.__stage && !!document.querySelector("dialog.inspect.is-open")', 120000);
  await b.sleep(5000);
  console.log('stats', JSON.stringify(await b.eval('window.__inspectStats')));
  if (want('arrive')) await b.shot(`${OUT}/s1-arrived.png`);
  if (want('court')) { await view(180, 14, 34, 2.5, 0, 6); await b.sleep(2500); await b.shot(`${OUT}/s2-court.png`); }
  if (want('aerial')) { await view(200, 55, 52, 1.5); await b.sleep(2500); await b.shot(`${OUT}/s3-aerial.png`); }
  if (want('back')) { await view(15, 16, 40, 2.5); await b.sleep(2500); await b.shot(`${OUT}/s4-back.png`); }
  if (want('hall')) { await view(185, 6, 8, 2.0, 0, 3.0); await b.sleep(2500); await b.shot(`${OUT}/s5-hall.png`); }
  if (want('verandah')) { await view(70, 8, 8, 2.0, -9.8, 5.0); await b.sleep(2500); await b.shot(`${OUT}/s6-verandah.png`); }
  if (want('lift')) { await view(200, 40, 50, 2); await btn('Lift the roofs'); await b.sleep(4000); await b.shot(`${OUT}/s7-roofs.png`); await btn('Lower the roofs'); await b.sleep(3000); }
  if (want('section')) { await slider(55); await view(180, 14, 42, 2.5); await b.sleep(2500); await b.shot(`${OUT}/s8-section.png`); await slider(0); }
  if (want('dusk')) { await btn('Dusk'); await view(175, 10, 30, 2.5, 0, 4); await b.sleep(6000); await b.shot(`${OUT}/s9-dusk.png`); }
} finally {
  console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n'));
  b.close();
}
