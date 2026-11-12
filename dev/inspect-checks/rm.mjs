import { launch } from './cdp.mjs';
const b = await launch({ width: 1280, height: 800, port: 9335 });
try {
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.goto('http://localhost:5199/work/irshalpada/?building=irshalpada-a-03');
  await b.waitFor('!!window.__stage && !!document.querySelector("dialog.inspect")', 120000);
  await b.sleep(2500);
  console.log('reduced motion: damping', await b.eval('window.__stage.orbit.enableDamping'), 'opacity', await b.eval('getComputedStyle(document.querySelector("dialog.inspect")).transitionDuration'));
  await b.eval(`[...document.querySelectorAll('.inspect button')].find(x => x.textContent.trim() === 'Lift the roof').click()`);
  await b.sleep(400);
  console.log('roof y right after click', await b.eval('window.__stage.box().max.y.toFixed(2)'));
  await b.eval('window.__inspect.exit()');
  await b.waitFor('!window.__inspect.active()', 20000);
  console.log('closed; url', await b.eval('location.search'), 'focus', await b.eval('document.activeElement?.tagName'));
} finally { console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n')); b.close(); }
