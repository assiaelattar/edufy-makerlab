// Isolated review of the real SettingsView. Firebase reads and writes are mocked.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const adapter = resolve(root, 'scripts/fixtures/settings-v1-adapter.jsx');
let assets = new Map();
const rebuild = async () => {
  const result = await build({ absWorkingDir: root, entryPoints: ['scripts/fixtures/settings-v1.jsx'], outdir: 'node_modules/.cache/settings-v1', bundle: true, write: false, format: 'esm', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' }, plugins: [{ name: 'settings-synthetic-boundaries', setup(builder) {
    builder.onResolve({ filter: /(?:AppContext|AuthContext|ConfirmContext)$|services\/firebase$|^firebase\/(?:firestore|app|auth)$|utils\/biometrics$/ }, () => ({ path: adapter }));
  } }] });
  assets = new Map(result.outputFiles.map(file => ['/' + basename(file.path), file.contents]));
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edufy Settings · synthetic review</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/index.css"><link rel="stylesheet" href="/settings-v1.css"><style>body{margin:0}.settings-fixture{min-height:100vh;background:var(--ds-canvas);color:var(--ds-ink)}.settings-fixture__bar{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:2px solid var(--ds-border);background:var(--ds-surface)}.settings-fixture__bar button{padding:8px 12px;border:2px solid var(--ds-blue);border-radius:12px;color:var(--ds-blue-ink)}.settings-fixture__events{display:block;padding:10px 20px;color:var(--ds-muted);font-size:12px}.edu-shell-v1__content-inner{padding:16px!important;max-width:1380px;margin:auto}@media(max-width:600px){.settings-fixture__bar{flex-wrap:wrap}.settings-fixture__bar span{display:none}}</style></head><body><div id="root"></div><script type="module" src="/settings-v1.js"></script></body></html>`;
createServer(async (req, res) => { try { const path = new URL(req.url, 'http://localhost').pathname; res.setHeader('Cache-Control','no-store'); if (path === '/') { await rebuild(); res.setHeader('Content-Type','text/html'); return res.end(html); } if (path === '/index.css') { res.setHeader('Content-Type','text/css'); return res.end(await readFile(resolve(root,'index.css'))); } const asset = assets.get(path); if (!asset) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript'); res.end(asset); } catch (error) { console.error(error); res.writeHead(500); res.end('Settings preview build failed.'); } }).listen(5252,'127.0.0.1',() => console.log('Settings synthetic review: http://127.0.0.1:5252/'));
