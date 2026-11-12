import { launch } from './cdp.mjs';
const b = await launch({ width: 1280, height: 800 });
try {
  await b.goto('http://localhost:5199/work/irshalpada/');
  await b.eval(`document.querySelector('.model-story__stage').scrollIntoView()`);
  await b.waitFor('!!window.__plan', 90000);
  await b.sleep(1500);
  await b.eval(`(() => { const s = document.querySelectorAll('.model-step')[1]; scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.55 + 40); })()`);
  await b.sleep(2000);
  const cycle = async (id) => {
    await b.eval(`window.__inspect.enter(${JSON.stringify(id)})`);
    await b.waitFor('window.__inspect.active() && !!document.querySelector("dialog.inspect.is-open")', 60000);
    await b.sleep(2500);
    await b.eval('window.__inspect.exit()');
    await b.waitFor('!window.__inspect.active() && !document.querySelector("dialog.inspect")', 30000);
    await b.sleep(1500);
  };
  const before = await b.heap();
  console.log('heap before any visit', (before / 1048576).toFixed(2), 'MB');
  const ids = ['irshalpada-a-03', 'irshalpada-a-12', 'irshalpada-a-39'];
  await cycle(ids[0]);
  const warm = await b.heap();
  console.log('after 1st visit (type cache warm)', (warm / 1048576).toFixed(2), 'MB');
  const series = [];
  for (let i = 0; i < Number(process.env.N ?? 10); i++) {
    await cycle(ids[i % 3]);
    const h = await b.heap();
    series.push(+(h / 1048576).toFixed(2));
  }
  console.log('after each of 10 more cycles (MB):', series.join(', '));
  const info = await b.eval(`JSON.stringify({ dialogs: document.querySelectorAll('dialog.inspect').length, stageChildren: window.__stage?.scene.children.length, geometries: window.__stage?.renderer.info.memory.geometries, textures: window.__stage?.renderer.info.memory.textures, url: location.search })`);
  console.log('state after:', info);
  const plan = await b.eval('JSON.stringify(window.__plan.debugInfo())');
  console.log('plan renderer after:', plan);
} finally {
  console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n'));
  b.close();
}
