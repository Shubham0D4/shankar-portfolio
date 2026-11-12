import { launch } from './cdp.mjs';
const OUT = process.env.SCRATCH + '/shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const only = process.argv[2]?.split(',');
const want = (n) => !only || only.includes(n);
const b = await launch({ width: 1440, height: 900 });
const btn = (text) => b.eval(`[...document.querySelectorAll('.inspect button')].find(x => x.textContent.trim() === ${JSON.stringify(text)}).click()`);
const view = (az, el, d, ty = 1.6, tx = 0, tz = 0) => b.eval(`window.__stage.setView(${az}, ${el}, ${d}, ${ty}, ${tx}, ${tz})`);
const slider = (v) => b.eval(`(() => { const s = document.querySelector('.inspect__range input'); s.value = ${v}; s.dispatchEvent(new Event('input')); })()`);
try {
  await b.goto('http://localhost:5199/work/irshalpada/');
  await b.eval(`(() => { const s = document.querySelectorAll('.model-step')[1]; scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.55 + 40); })()`);
  await b.waitFor('!!window.__plan', 90000);
  await b.sleep(1500);
  await b.eval(`(() => { const s = document.querySelectorAll('.model-step')[1]; scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.55 + 40); })()`);
  await b.sleep(3000);
  const rect = await b.eval(`(() => { const r = document.querySelector('.model-slot__stage canvas').getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; })()`);
  const at = await b.eval(`window.__plan.previewBuilding('irshalpada-a-39')`);
  await b.eval(`window.__plan.previewBuilding(null)`);
  await b.move(rect.x + at.x, rect.y + at.y);
  await b.sleep(1200);
  if (want('hover')) await b.shot(`${OUT}/1-hover.png`, { x: rect.x, y: rect.y, width: rect.w, height: rect.h });
  await b.click(rect.x + at.x, rect.y + at.y);
  await b.sleep(450);
  if (want('mid')) await b.shot(`${OUT}/2a-mid-glide.png`);
  await b.waitFor('!!window.__stage', 60000);
  await b.sleep(250);
  if (want('mid')) await b.shot(`${OUT}/2b-mid-rise.png`);
  await b.sleep(4000);
  if (want('arrive')) await b.shot(`${OUT}/3-arrived.png`);
  if (want('front')) { await view(180, 9, 31, 2.2); await b.sleep(2500); await b.shot(`${OUT}/4-front.png`); }
  if (want('aerial')) { await view(145, 58, 44); await b.sleep(2500); await b.shot(`${OUT}/5-aerial.png`); }
  if (want('detail')) { await view(205, 4, 5.4, 2.0, -4.6, 5.3); await b.sleep(2500); await b.shot(`${OUT}/6-detail.png`); }
  if (want('jali')) { await view(25, 4, 2.0, 1.85, -3.4, -7.3); await b.sleep(2500); await b.shot(`${OUT}/6b-jali.png`); }
  if (want('roof')) { await view(160, 42, 30); await btn('Lift the roof'); await b.sleep(4000); await b.shot(`${OUT}/7-roof-lift.png`); await btn('Lower the roof'); await b.sleep(3000); }
  if (want('section')) { await slider(42); await view(176, 12, 25, 1.8); await b.sleep(2500); await b.shot(`${OUT}/8-section.png`); await slider(0); }
  if (want('dusk')) { await btn('Dusk'); await view(198, 7, 21, 1.8, 0, 2); await b.sleep(6000); await b.shot(`${OUT}/9-dusk-people.png`); await btn('Day'); await b.sleep(4000); }
  if (want('next')) { await btn('Next'); await b.sleep(4000); await b.shot(`${OUT}/10-type-b-massing.png`); console.log('next:', await b.eval('location.search')); }
  console.log('stats', JSON.stringify(await b.eval('window.__inspectStats')));
} finally {
  console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n'));
  b.close();
}
