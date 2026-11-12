import { launch } from './cdp.mjs';
const OUT = process.env.SCRATCH + '/shots-t';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const b = await launch({ width: 1440, height: 900, port: 9341 });
const btn = (text) => b.eval(`[...document.querySelectorAll('.inspect button')].find(x => x.textContent.trim() === ${JSON.stringify(text)}).click()`);
const view = (az, el, d, ty = 2.5, tx = 0, tz = 0) => b.eval(`window.__stage.setView(${az}, ${el}, ${d}, ${ty}, ${tx}, ${tz})`);
const slider = (v) => b.eval(`(() => { const s = document.querySelector('.inspect__range input'); s.value = ${v}; s.dispatchEvent(new Event('input')); })()`);
const only = process.argv[2]?.split(',');
const want = (n) => !only || only.includes(n);
try {
  await b.goto('http://localhost:5199/work/irshalpada/?building=irshalpada-temple');
  await b.waitFor('!!window.__stage && !!document.querySelector("dialog.inspect.is-open")', 120000);
  await b.sleep(5000);
  console.log('stats', JSON.stringify(await b.eval('window.__inspectStats')));
  if (want('arrive')) await b.shot(`${OUT}/t1-arrived.png`);
  if (want('render')) { await view(180, 4, 13, 3.6, 0, 0); await b.sleep(2500); await b.shot(`${OUT}/t2-as-rendered.png`); }
  if (want('aerial')) { await view(200, 55, 30, 1.5); await b.sleep(2500); await b.shot(`${OUT}/t3-aerial.png`); }
  if (want('back')) { await view(25, 10, 26, 3.5); await b.sleep(2500); await b.shot(`${OUT}/t4-back.png`); }
  if (want('slit')) { await view(180, 6, 4.5, 3.6, 0, 1.8); await b.sleep(2500); await b.shot(`${OUT}/t5-slit.png`); }
  if (want('school')) { await view(178, 7, 30, 3.5, 0, -6); await b.sleep(2500); await b.shot(`${OUT}/t6-school.png`); }
  if (want('lift')) { await view(160, 22, 22, 4); await btn('Lift the plates'); await b.sleep(4000); await b.shot(`${OUT}/t7-lift.png`); await btn('Lower the plates'); await b.sleep(3000); }
  if (want('section')) { await slider(50); await view(180, 14, 24, 3); await b.sleep(2500); await b.shot(`${OUT}/t8-section.png`); await slider(0); }
  if (want('dusk')) { await btn('Dusk'); await view(170, 6, 16, 3.2); await b.sleep(6000); await b.shot(`${OUT}/t9-dusk.png`); }
} finally {
  console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n'));
  b.close();
}
