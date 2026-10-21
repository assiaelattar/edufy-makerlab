// Isolated, synthetic frontend QA. No Firebase connection or production data.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const adapter = resolve(root, 'scripts/fixtures/pulse-pickup-adapter.jsx');
const baseline = process.argv.includes('--baseline');
const port = baseline ? 5237 : 5236;
const bundle = await build({
  absWorkingDir: root,
  entryPoints: ['scripts/fixtures/pulse-pickup.jsx'],
  outdir: 'node_modules/.cache/pulse-preview',
  bundle: true, write: false, format: 'esm', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'synthetic-pickup-only', setup(builder) {
    builder.onResolve({ filter: /rive\.wasm\?url$/ }, () => ({ path: 'rive-wasm-url', namespace: 'preview-assets' }));
    builder.onLoad({ filter: /.*/, namespace: 'preview-assets' }, () => ({ contents: "export default '/rive.wasm'", loader: 'js' }));
    builder.onResolve({ filter: /pickupCommands$|EducationAdmissionsReadOnlyV1$|AppContext$|AuthContext$|ConfirmContext$|services\/firebase$|^firebase\/firestore$/ }, () => ({ path: adapter }));
    if (baseline) builder.onLoad({ filter: /[\\/]views[\\/]PickupView\.tsx$/ }, ({path}) => ({
      contents: execFileSync('git', ['show', `6cb44ab:${path.slice(root.length).replaceAll('\\','/')}`], { cwd: root, encoding: 'utf8' }),
      loader: 'tsx', resolveDir: resolve(path, '..')
    }));
  } }]
});
const assets = new Map(bundle.outputFiles.map(file => [file.path.endsWith('.css') ? '/preview.css' : '/preview.js', file.contents]));
assets.set('/rive.wasm', await readFile(resolve(root, 'node_modules/@rive-app/webgl2/rive.wasm')));
assets.set('/mascot/011y.riv', await readFile(resolve(root, 'public/mascot/011y.riv')));
assets.set('/index.css', await readFile(resolve(root, 'index.css')));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Edufy Pulse - Module preview</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="/index.css"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script type="module" src="/preview.js"></script></body></html>`;
createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  const asset = assets.get(pathname);
  if (!asset) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', pathname.endsWith('.wasm') ? 'application/wasm' : pathname.endsWith('.riv') ? 'application/octet-stream' : pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
  response.end(asset);
}).listen(port, '127.0.0.1', () => console.log(`Synthetic module QA: http://127.0.0.1:${port}/ ${baseline ? '(baseline 6cb44ab)' : '(restart after source edits)'}`));
