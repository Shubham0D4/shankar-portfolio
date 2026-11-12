// Building-inspect checks (MODEL_NOTES.md §7.8). Run `npm run dev -- --port 5199`, then:
//   SCRATCH=/some/dir node dev/inspect-checks/verify.mjs   (screenshots in $SCRATCH/shots)
//   SCRATCH=/some/dir N=10 node dev/inspect-checks/heap.mjs
// perf.mjs also expects the pre-feature commit served on port 5198.
// Minimal Chrome DevTools Protocol driver (headless Chrome, SwiftShader WebGL).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function launch({ width = 1440, height = 900, port = 9333, mobile = false } = {}) {
  const dir = mkdtempSync(join(process.env.SCRATCH ?? tmpdir(), 'chrome-'));
  const args = [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
    '--enable-precise-memory-info', '--hide-scrollbars', 'about:blank',
  ];
  const proc = spawn('google-chrome', args, { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else listeners.forEach((l) => l(m));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const logs = [];
  listeners.push((m) => {
    if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'HeapProfiler.addHeapSnapshotChunk') globalThis.__chunks = (globalThis.__chunks ?? '') + m.params.chunk;
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const api = {
    send, logs,
    async goto(url) { await send('Page.navigate', { url }); await new Promise((r) => { const l = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); }); },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; },
    async waitFor(expr, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await api.eval(expr)) return true; } catch {} await api.sleep(150); } throw new Error('timeout: ' + expr); },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    async shot(path, clip) { if (clip) clip = { ...clip, y: clip.y + (await api.eval('scrollY')) }; const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(path, Buffer.from(r.data, 'base64')); },
    async mouse(type, x, y, extra = {}) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra }); },
    async move(x, y) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 }); },
    async click(x, y) { await api.move(x, y); await api.mouse('mousePressed', x, y); await api.mouse('mouseReleased', x, y); },
    async tap(x, y) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); },
    async key(key, code = key, keyCode = 0) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...(key === 'Enter' ? { text: '\r' } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode }); },
    async heap() { await send('HeapProfiler.enable'); await send('HeapProfiler.collectGarbage'); await api.sleep(300); await send('HeapProfiler.collectGarbage'); return (await send('Runtime.getHeapUsage')).usedSize; },
    close() { try { ws.close(); } catch {} proc.kill(); },
  };
  return api;
}
