import { launch } from './cdp.mjs';
const b = await launch({ width: 1280, height: 800 });
const measure = async (port) => {
  await b.goto(`http://localhost:${port}/dev/model.html?model=irshalpada&p=1&still=1&view=160,40,300,0,0,-12,30`);
  await b.waitFor(`document.title === 'ready'`, 90000);
  await b.sleep(1500);
  return b.eval(`(() => {
    const h = window.model;
    const times = [];
    for (let i = 0; i < 40; i++) {
      h.setProgress(1 - (i % 2) * 1e-4);
      const t0 = performance.now();
      h.frame(performance.now() + i * 50);
      window.__glFinish?.();
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    return JSON.stringify({ ...h.debugInfo(), medianFrameMs: +times[20].toFixed(2) });
  })()`);
};
try {
  for (let k = 0; k < 1; k++) {
    console.log('before (c2eb1fa):', await measure(5198));
    console.log('after  (HEAD)   :', await measure(5199));
  }
} finally {
  console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n'));
  b.close();
}
