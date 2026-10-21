// Isolated real Documents panel with synthetic identity, ledger and service boundaries.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const adapter = resolve(root, 'scripts/fixtures/finance-documents-v1-adapter.jsx');
let assets = new Map();
const rebuild = async () => {
  const result = await build({ absWorkingDir: root, entryPoints: ['scripts/fixtures/finance-documents-v1.jsx'],
    outdir: 'node_modules/.cache/finance-documents-v1', bundle: true, write: false, format: 'esm', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
    plugins: [{ name: 'documents-synthetic-boundaries', setup(builder) {
      builder.onResolve({ filter: /(?:AppContext|AuthContext|ConfirmContext)$|services\/firebase$|services\/financeDocuments$|services\/serviceCatalogue$/ }, () => ({ path: adapter }));
    } }] });
  assets = new Map(result.outputFiles.map(file => ['/' + basename(file.path), file.contents]));
};
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edufy Documents synthetic review</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/index.css"><link rel="stylesheet" href="/finance-documents-v1.css"></head><body><div id="root"></div><script type="module" src="/finance-documents-v1.js"></script></body></html>`;
createServer(async (request, response) => { try {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (path === '/') { await rebuild(); response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  if (path === '/index.css') { response.setHeader('Content-Type', 'text/css'); response.end(await readFile(resolve(root, 'index.css'))); return; }
  const asset = assets.get(path);
  if (!asset) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(asset);
} catch (error) { console.error(error); response.writeHead(500); response.end('Documents preview build failed.'); } }).listen(5262, '127.0.0.1', () => console.log('Documents synthetic review: http://127.0.0.1:5262/'));
