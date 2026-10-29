// Local visual review only. This fixture mounts the real public LandingView
// without initializing Firebase, authentication or school records.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, extname, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let assets = new Map();

const rebuild = async () => {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['scripts/fixtures/public-landing.jsx'],
    outdir: 'node_modules/.cache/public-landing',
    bundle: true,
    write: false,
    format: 'esm',
    jsx: 'automatic',
    loader: { '.css': 'js' },
    plugins: [{
      name: 'inline-public-css',
      setup(buildContext) {
        buildContext.onLoad({ filter: /\.css$/ }, async (args) => ({
          loader: 'js',
          contents: `const style = document.createElement('style'); style.textContent = ${JSON.stringify(await readFile(args.path, 'utf8'))}; document.head.appendChild(style); export default style;`
        }));
      }
    }]
  });
  assets = new Map(result.outputFiles.map(file => ['/' + basename(file.path), file.contents]));
};

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edufy · Public landing review</title><script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={theme:{extend:{fontFamily:{sans:['DM Sans','sans-serif']}}}}</script><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/index.css"></head><body><div id="root"></div><script type="module" src="/public-landing.js"></script></body></html>`;

const staticFiles = new Map([
  ['/index.css', ['text/css', 'index.css']],
  ['/icon.svg', ['image/svg+xml', 'icon.svg']]
]);

createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Cache-Control', 'no-store');
    if (path === '/') {
      await rebuild();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(html);
    }
    const staticFile = staticFiles.get(path);
    if (staticFile) {
      res.setHeader('Content-Type', staticFile[0]);
      return res.end(await readFile(resolve(root, staticFile[1])));
    }
    const asset = assets.get(path);
    if (!asset) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', extname(path) === '.css' ? 'text/css' : 'text/javascript');
    return res.end(asset);
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    return res.end('Public landing preview build failed. See the local terminal.');
  }
}).listen(5250, '0.0.0.0', () => console.log('Edufy public landing review: http://127.0.0.1:5250/'));
