import { launch } from './cdp.mjs';
const b = await launch({ width: 1440, height: 900, port: 9338 });
const btn = (text) => b.eval(`[...document.querySelectorAll('.inspect button')].find(x => x.textContent.trim() === ${JSON.stringify(text)}).click()`);
try {
  await b.goto('http://localhost:5199/work/irshalpada/?building=irshalpada-b-06');
  await b.waitFor('!!window.__stage && !!document.querySelector("dialog.inspect.is-open")', 120000);
  await b.sleep(5000);
  await b.eval('window.__stage.setView(160, 14, 32, 3)');
  await b.sleep(2500);
  await b.shot(process.env.SCRATCH + '/shots-b/b9-mirrored.png');
  const count = () => b.eval(`(() => { let n = 0; window.__stage.scene.traverse(o => { if (o.isMesh && o.material?.vertexColors && o.material === o.material && o.geometry.attributes.color && o.parent?.userData?.people !== undefined) { let v = true; o.traverseAncestors(a => { if (!a.visible) v = false; }); if (v && o.visible) n++; } }); return n; })()`);
  console.log('people meshes visible before', await count());
  await btn('People');
  await b.sleep(500);
  console.log('people meshes visible after toggle', await count());
} finally { console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n')); b.close(); }
