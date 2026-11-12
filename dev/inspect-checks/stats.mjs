import { launch } from './cdp.mjs';
const b = await launch({ width: 1440, height: 900, port: 9336 });
try {
  for (const id of ['irshalpada-a-07', 'irshalpada-b-05', 'irshalpada-school', 'irshalpada-temple']) {
    for (const tier of ['high', 'low']) {
      await b.goto(`http://localhost:5199/work/irshalpada/?building=${id}&tier=${tier}`);
      await b.waitFor('!!window.__inspectStats && !!document.querySelector("dialog.inspect.is-open")', 120000);
      await b.sleep(3500);
      const s = await b.eval('window.__inspectStats');
      console.log(id.padEnd(20), tier.padEnd(5), JSON.stringify(s));
      if (tier === 'high' && id !== 'irshalpada-a-07') await b.shot(`${process.env.SCRATCH}/shots/12-${id}.png`);
    }
  }
} finally { console.log(b.logs.filter((l) => !l.includes('[vite]')).join('\n')); b.close(); }
