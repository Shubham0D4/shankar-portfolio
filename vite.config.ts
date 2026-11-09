import { defineConfig, type Plugin } from 'vite';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { renderShell } from './src/shell/partials.ts';

const root = resolve(import.meta.dirname);
const SKIP = new Set(['node_modules', 'dist', 'public', 'src', 'scripts', 'dev', '.git']);

/** Every index.html in the project becomes a page (vanilla multi-page site). */
function findPages(dir: string, out: Record<string, string> = {}): Record<string, string> {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findPages(full, out);
    else if (name === 'index.html') {
      const key = relative(root, dir).split(sep).join('/') || 'home';
      out[key] = full;
    }
  }
  return out;
}

function routeOf(filename: string): string {
  const rel = relative(root, filename).split(sep).join('/').replace(/index\.html$/, '');
  return '/' + rel;
}

/** Replaces <!--shell:*--> markers with build-time partials. */
function shell(): Plugin {
  return {
    name: 'shell-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => renderShell(html, routeOf(ctx.filename)),
    },
    handleHotUpdate({ file, server }) {
      // Partials are imported into the config, so restart to pick up edits.
      if (file.includes(`${sep}src${sep}shell${sep}`) || file.endsWith('content.json') || file.includes(`${sep}src${sep}data${sep}`)) {
        server.restart();
      }
    },
  };
}

/** Dev: add a trailing slash to page directories, and answer unknown paths with 404.html and a real 404 status. */
function notFound(): Plugin {
  return {
    name: 'not-found',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const isAsset = /\.[a-z0-9]+$/i.test(url) || url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/');
        if (isAsset) return next();
        const hasIndex = (u: string) => {
          try { return statSync(join(root, u, 'index.html')).isFile(); } catch { return false; }
        };
        if (hasIndex(url)) {
          if (!url.endsWith('/')) {
            res.statusCode = 301;
            res.setHeader('Location', url + '/');
            return res.end();
          }
          return next();
        }
        const html = await server.transformIndexHtml('/404.html', readFileSync(join(root, '404.html'), 'utf8'), '/404.html');
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [shell(), notFound()],
  build: {
    assetsDir: '_build', // keep Vite output apart from public/assets
    rollupOptions: { input: { ...findPages(root), 'not-found': resolve(root, '404.html') } },
  },
  server: { port: 5173 },
});
