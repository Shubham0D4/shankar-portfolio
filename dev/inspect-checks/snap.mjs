import { launch } from './cdp.mjs';
const b = await launch({ width: 1280, height: 800 });
const snapshot = async () => {
  await b.send('HeapProfiler.enable');
  await b.send('HeapProfiler.collectGarbage');
  let chunks = '';
  const l = (m) => { if (m.method === 'HeapProfiler.addHeapSnapshotChunk') chunks += m.params.chunk; };
  b.on?.(l);
  return { chunks: () => chunks, l };
};
// Collect chunks via raw listener hook.
const raw = [];
const origSend = b.send;
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
    await b.sleep(2000);
    await b.eval('window.__inspect.exit()');
    await b.waitFor('!window.__inspect.active() && !document.querySelector("dialog.inspect")', 30000);
    await b.sleep(1200);
  };
  const ids = ['irshalpada-b-05', 'irshalpada-b-06', 'irshalpada-b-41'];
  const counts = async () => b.eval(`(() => {
    // Count live three.js objects reachable from the page via a GC-independent probe is not possible; use the heap snapshot instead.
    return 0; })()`);
  void counts;
  for (let i = 0; i < 6; i++) await cycle(ids[i % 3]);
  const s1 = await take();
  for (let i = 0; i < 9; i++) await cycle(ids[i % 3]);
  const s2 = await take();
  const keys = new Set([...Object.keys(s1), ...Object.keys(s2)]);
  const diff = [...keys].map((k) => [k, (s2[k]?.n ?? 0) - (s1[k]?.n ?? 0), (s2[k]?.size ?? 0) - (s1[k]?.size ?? 0)]).filter((d) => d[1] !== 0).sort((a, b) => b[2] - a[2]);
  console.log('total size diff', diff.reduce((s, d) => s + d[2], 0));
  console.log(diff.slice(0, 14).map((d) => `${d[2]}\t${d[1]}\t${d[0]}`).join('\n'));
} finally { b.close(); }

async function take() {
  await b.send('HeapProfiler.enable');
  await b.send('HeapProfiler.collectGarbage');
  await b.sleep(300);
  await b.send('HeapProfiler.collectGarbage');
  globalThis.__chunks = '';
  await b.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  const snap = JSON.parse(globalThis.__chunks);
  const f = snap.snapshot.meta.node_fields;
  const types = snap.snapshot.meta.node_types[0];
  const N = f.length;
  const iT = f.indexOf('type'), iN = f.indexOf('name'), iS = f.indexOf('self_size');
  const out = {};
  for (let i = 0; i < snap.nodes.length; i += N) {
    const t = types[snap.nodes[i + iT]];
    const name = t === 'object' || t === 'closure' || t === 'native' ? t + ':' + snap.strings[snap.nodes[i + iN]].slice(0, 60) : '(' + t + ')';
    const o = (out[name] ??= { n: 0, size: 0 });
    o.n++;
    o.size += snap.nodes[i + iS];
  }
  return out;
}
