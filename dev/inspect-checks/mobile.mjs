import { launch } from './cdp.mjs';
const b = await launch({ width: 390, height: 844, mobile: true, port: 9334 });
try {
  await b.goto('http://localhost:5199/work/irshalpada/?building=irshalpada-a-07');
  await b.waitFor('!!window.__stage && !!document.querySelector("dialog.inspect.is-open")', 120000);
  await b.sleep(6000);
  await b.shot(process.env.SCRATCH + '/shots/11-phone.png');
  console.log('stats', JSON.stringify(await b.eval('window.__inspectStats')));
  await b.eval(`document.querySelector('.inspect__panel').scrollTop = 400`);
  await b.sleep(500);
  await b.shot(process.env.SCRATCH + '/shots/11b-phone-panel.png');
} finally { console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n')); b.close(); }
