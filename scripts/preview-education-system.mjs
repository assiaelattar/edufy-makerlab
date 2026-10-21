// Local, synthetic review only. Rebuild on page reload; never connects to school records.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
let assets=new Map();
const rebuild=async()=>{
 const result=await build({absWorkingDir:root,entryPoints:['scripts/fixtures/education-system.jsx'],outdir:'node_modules/.cache/education-system',bundle:true,write:false,format:'esm',jsx:'automatic',loader:{'.wasm':'file'},define:{'process.env.NODE_ENV':'"development"','import.meta.env':'{}'},plugins:[{name:'synthetic-boundaries',setup(b){
  b.onResolve({filter:/AppContext$|AuthContext$|ConfirmContext$|services\/firebase$|^firebase\/firestore$/},()=>({path:resolve(root,'scripts/fixtures/education-system-adapter.jsx')}));
  b.onResolve({filter:/EducationAdmissionsReadOnlyV1$/},()=>({path:resolve(root,'scripts/fixtures/pulse-modules-adapter.jsx')}));
  b.onResolve({filter:/rive\.wasm\?url$/},()=>({path:resolve(root,'node_modules/@rive-app/webgl2/rive.wasm')}));
 } }]});
 assets=new Map(result.outputFiles.map(file=>['/'+basename(file.path),file.contents]));
};
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edufy · Design System v1</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/index.css"><link rel="stylesheet" href="/education-system.css"></head><body><div id="root"></div><script type="module" src="/education-system.js"></script></body></html>`;
createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Cache-Control','no-store');
 if(path==='/'){await rebuild();res.setHeader('Content-Type','text/html');return res.end(html);}
 if(path==='/index.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile(resolve(root,'index.css')));}
 if(path==='/mascot/011y.riv'){res.setHeader('Content-Type','application/octet-stream');return res.end(await readFile(resolve(root,'public/mascot/011y.riv')));}
 const asset=assets.get(path);if(!asset){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.wasm')?'application/wasm':'text/javascript');res.end(asset);
 }catch(error){console.error(error);res.writeHead(500);res.end('Preview build failed. See the local terminal.');}
}).listen(5246,'0.0.0.0',()=>console.log('Design System v1 · synthetic review: http://127.0.0.1:5246/'));
