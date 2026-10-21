// Isolated presentation review. This fixture has no application or Firebase imports.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let assets = new Map();
const rebuild = async () => {
  const bundle = await build({ absWorkingDir: root, entryPoints: ['scripts/fixtures/confirm-modal-v1.jsx'],
    outdir: 'node_modules/.cache/confirm-modal-v1', bundle: true, write: false, format: 'esm', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' } });
  assets = new Map(bundle.outputFiles.map(file => ['/' + basename(file.path), file.contents]));
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edufy shared confirmations · synthetic</title><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/index.css"><link rel="stylesheet" href="/confirm-modal-v1.css"></head><body><div id="root"></div><script type="module" src="/confirm-modal-v1.js"></script></body></html>`;
createServer(async (request, response) => { try {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/') { await rebuild(); response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  if (pathname === '/index.css') { response.setHeader('Content-Type', 'text/css'); response.end(await readFile(resolve(root, 'index.css'))); return; }
  const asset = assets.get(pathname);
  if (!asset) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(asset);
} catch (error) { console.error(error); response.writeHead(500); response.end('Fixture build failed'); }
}).listen(5264, '127.0.0.1', () => console.log('Shared confirmation fixture: http://127.0.0.1:5264/'));
