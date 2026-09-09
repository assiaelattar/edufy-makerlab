// Real Finance panel/forms/normalization/print; in-memory persistence and identity.
// Local HTTP only. No production Firebase or customer writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
const { chromium } = await import(process.env.SERVICES_PLAYWRIGHT_PATH ? pathToFileURL(process.env.SERVICES_PLAYWRIGHT_PATH).href : 'playwright');
const mocks = `
import { normalizeLines } from './services/financeDocuments.ts';
export { normalizeLines };
export const db = {};
window.qa = { services: [], documents: [{ id:'old', organizationId:'one', kind:'invoice', status:'issued', number:'2026S001', sequenceYear:2026, sequenceNumber:1, sequenceType:'service', issueDate:'2026-09-01', currency:'MAD', customer:{type:'company',name:'Existing Client',address:'Casablanca',ice:'123'}, participants:[],lines:[],total:100,subtotal:100,taxAmount:0 }], sequence:{formation:0,service:1}, writes:0, printed:'', org:'one', role:'owner', fail:false };
window.open = () => ({ document: { write: html => { window.qa.printed=html; }, close(){} } });
export const useAppContext = () => ({ programs:[{id:'program',name:'Robotics',status:'active',billingAudience:'individual',packs:[{price:100}]}], settings:{currency:'MAD',academyName:'Test Academy'} });
export const useAuth = () => ({ currentOrganization:{id:window.qa.org}, userProfile:{role:window.qa.role,status:'active'}, can:() => window.qa.role==='owner' });
export const useConfirm = () => ({ confirm:async()=>true, alert:async()=>{} });
let serviceListener;
export const subscribeServiceCatalogue = (_,org,cb) => { serviceListener=cb; cb(window.qa.services.filter(s=>s.organizationId===org)); return ()=>{}; };
export const saveCatalogueService = async (_,org,id,version,values) => { if(window.qa.fail) throw new Error('Test write failure'); window.qa.writes++; const service={...values,organizationId:org,id:id||'custom',version:version+1}; window.qa.services=[...window.qa.services.filter(s=>s.id!==service.id),service]; serviceListener(window.qa.services); return service.id; };
export const importDefaultServices = async()=>0;
export const subscribeFinanceDocuments = (_,org,cb) => { cb(window.qa.documents.filter(d=>d.organizationId===org)); return ()=>{}; };
export const subscribeAccountingTemplates = (_,org,cb) => {cb([]);return ()=>{};};
export const saveAccountingTemplate = async()=>{};
const sequenceSnapshot = year => ({year,formation:{lastUsed:window.qa.sequence.formation,nextNumber:String(year)+'F'+String(window.qa.sequence.formation+1).padStart(3,'0')},service:{lastUsed:window.qa.sequence.service,nextNumber:String(year)+'S'+String(window.qa.sequence.service+1).padStart(3,'0')}});
export const loadFinanceInvoiceSequences = async(_,org,year) => sequenceSnapshot(year);
export const saveFinanceInvoiceSequences = async(_,org,year,values) => { window.qa.writes++; window.qa.sequence={...values}; return sequenceSnapshot(year); };
export const createFullCreditNote = async()=>{};
export const issueFinanceInvoice = async(_, input) => { if(window.qa.fail) throw new Error('Test write failure'); window.qa.writes++; const type=input.sequenceType||'service'; const marker=type==='formation'?'F':'S'; const sequenceNumber=++window.qa.sequence[type]; const lines=normalizeLines(input.lines); const doc={...input,id:'issued',kind:'invoice',status:'issued',number:'2026'+marker+String(sequenceNumber).padStart(3,'0'),sequenceYear:2026,sequenceNumber,revision:0,lines,subtotal:lines.reduce((s,l)=>s+l.subtotal,0),taxAmount:lines.reduce((s,l)=>s+l.taxAmount,0),total:lines.reduce((s,l)=>s+l.total,0)}; window.qa.documents.push(doc); return doc; };
export const updateFinanceInvoice = async(_, input) => { if(window.qa.fail) throw new Error('Test write failure'); const index=window.qa.documents.findIndex(item=>item.id===input.invoiceId); const current=window.qa.documents[index]; if(!current || current.status==='credited') throw new Error('Invoice cannot be edited'); if((current.revision||0)!==input.expectedRevision) throw new Error('This invoice was modified elsewhere.'); window.qa.writes++; const lines=normalizeLines(input.lines); const doc={...current,...input,revision:(current.revision||0)+1,lines,subtotal:lines.reduce((s,l)=>s+l.subtotal,0),taxAmount:lines.reduce((s,l)=>s+l.taxAmount,0),total:lines.reduce((s,l)=>s+l.total,0)}; window.qa.documents[index]=doc; return doc; };
`;
const bundle = await build({ absWorkingDir: root, stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {FinanceDocumentsPanel} from './components/finance/FinanceDocumentsPanel'; const root=createRoot(document.getElementById('root')); window.renderQA=()=>root.render(<FinanceDocumentsPanel/>); window.renderQA();`, loader: 'tsx', resolveDir: root }, outfile:'app.js', bundle:true, write:false, format:'iife', define:{'process.env.NODE_ENV':'"test"'}, plugins:[{name:'boundaries',setup(builder){
  builder.onResolve({filter:/(?:context\/(?:AppContext|AuthContext|ConfirmContext)|services\/(?:firebase|serviceCatalogue|financeDocuments))$/},()=>({path:'mock',namespace:'qa'}));
  builder.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:mocks,loader:'js',resolveDir:root}));
}}] });
const css = readFileSync(new URL('../../index.css',import.meta.url),'utf8') + bundle.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
// Exact shared Modal geometry uses Tailwind in the app; provide its layout utilities locally.
const layout = `.atlas-dialog-backdrop{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}.atlas-dialog{display:flex;flex-direction:column;width:100%;max-width:896px;max-height:90vh;overflow:hidden}.atlas-dialog-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px}.atlas-dialog-header h3{margin:0}.atlas-dialog-body{overflow-y:auto;padding:20px}.atlas-dialog-close{width:40px;height:40px}.space-y-4>section{margin-bottom:16px}.service-workspace{margin:8px 0}body{margin:0;padding:24px;background:var(--atlas-bg);font-family:Arial}button{cursor:pointer}@media(max-width:640px){body{padding:12px}.atlas-dialog-backdrop{padding:0;align-items:stretch}.atlas-dialog{height:100%;max-height:100%}.atlas-dialog-body{padding:16px 16px 80px}}`;
const server = createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles.find(file=>file.path.endsWith('.js')).text);return;}res.setHeader('Content-Type','text/html');res.end(`<html data-atlas-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}${css}${layout}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:'Catalogue de services',exact:true}).click();
  assert.equal(await page.locator('.service-card').count(),8);
  assert.equal(await page.evaluate(()=>window.qa.writes),0);
  await page.getByLabel('Rechercher un service',{exact:true}).fill('Voice AI');
  assert.equal(await page.locator('.service-card').count(),1);
  await page.getByLabel('Modifier Voice AI',{exact:true}).click();
  await page.getByLabel('Prix unitaire HT (MAD)',{exact:true}).fill('1500');
  await page.getByLabel('Détails par défaut').fill('Reception and agreed escalation');
  await page.getByRole('button',{name:'Enregistrer le service',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByLabel('Archiver Voice AI',{exact:true}).click();
  await page.getByLabel('Statut des services').selectOption('archived');
  await page.getByLabel('Activer Voice AI',{exact:true}).click();
  await page.getByLabel('Statut des services').selectOption('active');
  await page.getByRole('button',{name:'Séquences',exact:true}).click();
  await page.getByRole('dialog',{name:'Séquences de facturation'}).waitFor();
  assert.equal(await page.getByLabel('Dernier numéro service').inputValue(),'1');
  await page.getByLabel('Dernier numéro formation').fill('4');
  await page.getByLabel('Dernier numéro service').fill('7');
  assert(await page.getByRole('dialog',{name:'Séquences de facturation'}).getByText('2026F005').isVisible());
  assert(await page.getByRole('dialog',{name:'Séquences de facturation'}).getByText('2026S008').isVisible());
  if(process.env.SERVICES_QA_SCREENSHOTS) await page.screenshot({path:`${process.env.SERVICES_QA_SCREENSHOTS}/services-sequences-1440.png`});
  await page.getByRole('button',{name:'Enregistrer les séquences',exact:true}).click();
  await page.getByRole('dialog',{name:'Séquences de facturation'}).waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>window.qa.sequence),{formation:4,service:7});
  await page.getByRole('button',{name:'Nouvelle facture de services',exact:true}).click();
  await page.getByLabel('Choisir un client existant').selectOption('0');
  assert.equal(await page.getByLabel('Client à facturer').inputValue(),'Existing Client');
  await page.getByLabel('Ajouter un service').selectOption('future-makers-2026-03');
  assert.equal(await page.getByLabel('Prix unitaire HT 1 (MAD)').inputValue(),'1500');
  await page.getByLabel('Désignation 1',{exact:true}).fill('Voice reception - September');
  await page.getByLabel('Détails 1',{exact:true}).fill('Agreed scope\nIncludes human handoff');
  await page.getByLabel('Quantité 1',{exact:true}).fill('2');
  await page.getByLabel('Ajouter un service').selectOption('future-makers-2026-04');
  await page.getByLabel('Prix unitaire HT 2 (MAD)').fill('250');
  await page.getByLabel('TVA 2 (%)').fill('0');
  const writes = await page.evaluate(()=>window.qa.writes);
  await page.getByRole('button',{name:'Vérifier la facture',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.qa.writes),writes,'review never writes');
  await page.getByRole('button',{name:'Aperçu / PDF',exact:true}).click();
  assert(await page.evaluate(()=>window.qa.printed.includes('Document non émis') && window.qa.printed.includes('Agreed scope')));
  await page.evaluate(()=>{window.qa.fail=true;});
  await page.getByRole('button',{name:'Émettre la facture',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Test write failure'}).waitFor();
  await page.evaluate(()=>{window.qa.fail=false;});
  await page.getByRole('button',{name:'Émettre la facture',exact:true}).click();
  await page.getByRole('dialog',{name:'Facture 2026S008 émise'}).waitFor();
  assert.equal(await page.evaluate(()=>window.qa.documents.at(-1).total),3850);
  assert.equal(await page.evaluate(()=>window.qa.documents.at(-1).participants.length),0);
  assert.equal(await page.evaluate(()=>window.qa.documents.at(-1).programId),undefined);
  await page.getByRole('button',{name:'Imprimer / PDF',exact:true}).click();
  assert(await page.evaluate(()=>window.qa.printed.includes('2026S008') && !window.qa.printed.includes('Document non émis') && !window.qa.printed.includes('Document comptable') && !window.qa.printed.includes('Échéance')));
  if(process.env.SERVICES_QA_SCREENSHOTS){ const printPage=await browser.newPage({viewport:{width:1000,height:1200}}); await printPage.setContent(await page.evaluate(()=>window.qa.printed)); await printPage.screenshot({path:`${process.env.SERVICES_QA_SCREENSHOTS}/services-invoice-print.png`,fullPage:true}); await printPage.close(); }
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
  // Any active invoice can be corrected directly from history without changing its number.
  const issuedRow=page.locator('article').filter({hasText:'2026S008'});
  await issuedRow.getByTitle('Modifier la facture 2026S008').click();
  await page.getByRole('dialog',{name:'Modifier la facture 2026S008'}).waitFor();
  assert.equal(await page.getByLabel('Client à facturer').inputValue(),'Existing Client');
  assert.equal(await page.getByLabel('Prix unitaire HT 1 (MAD)').inputValue(),'1500');
  await page.getByLabel('Prix unitaire HT 1 (MAD)').fill('1000');
  if(process.env.SERVICES_QA_SCREENSHOTS){mkdirSync(process.env.SERVICES_QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:`${process.env.SERVICES_QA_SCREENSHOTS}/services-edit-1440.png`});}
  await page.getByRole('button',{name:'Vérifier les modifications',exact:true}).click();
  await page.getByRole('button',{name:'Aperçu / PDF',exact:true}).click();
  assert(await page.evaluate(()=>window.qa.printed.includes('APERÇU DE CORRECTION') && window.qa.printed.includes('Modifications non enregistrées de la facture 2026S008')));
  await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
  await page.getByRole('dialog',{name:'Facture 2026S008 mise à jour'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>{const item=window.qa.documents.find(record=>record.id==='issued');return {id:item.id,number:item.number,total:item.total,revision:item.revision};}),{id:'issued',number:'2026S008',total:2650,revision:1});
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
  // Existing program flow remains available and price is editable.
  await page.getByRole('button',{name:'Facture de formation',exact:true}).click();
  await page.getByRole('dialog').locator('select').first().selectOption('program');
  assert.equal(await page.getByRole('dialog').locator('input[type=number]').count()>0,true);
  await page.keyboard.press('Escape');
  for(const theme of ['light','dark']) for(const width of [1440,390]){
    await page.evaluate(theme=>document.documentElement.dataset.atlasTheme=theme,theme);
    await page.setViewportSize({width,height:844});
    await page.getByRole('button',{name:'Nouvelle facture de services',exact:true}).click();
    await page.getByLabel('Client à facturer').fill('Preview client');
    await page.getByLabel('Ajouter un service').selectOption('future-makers-2026-03');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`no overflow ${theme}/${width}`);
    if(process.env.SERVICES_QA_SCREENSHOTS){mkdirSync(process.env.SERVICES_QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:`${process.env.SERVICES_QA_SCREENSHOTS}/services-${theme}-${width}.png`});}
    await page.getByLabel('Détails 1',{exact:true}).scrollIntoViewIfNeeded();
    if(process.env.SERVICES_QA_SCREENSHOTS) await page.screenshot({path:`${process.env.SERVICES_QA_SCREENSHOTS}/services-lines-${theme}-${width}.png`});
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Nouvelle facture de services');
  }
  const updatedRow=page.locator('article').filter({hasText:'2026S008'});
  await updatedRow.getByTitle('Modifier la facture 2026S008').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,'no overflow editing at 390px');
  if(process.env.SERVICES_QA_SCREENSHOTS) await page.screenshot({path:`${process.env.SERVICES_QA_SCREENSHOTS}/services-edit-390.png`});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Nouvelle facture de services',exact:true}).click();
  await page.evaluate(()=>{window.qa.org='two';window.renderQA();});
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.evaluate(()=>{window.qa.role='instructor';window.renderQA();});
  await page.getByRole('button',{name:'Nouvelle facture de services',exact:true}).waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('Service browser smoke passed: catalogue CRUD, invoice issue/edit/version/print, program entry, tenant switch, permissions, Escape/focus and light/dark desktop/mobile.');
} catch(error) { if(browser) { const pages=browser.contexts()[0]?.pages() || []; if(pages[0]) console.error((await pages[0].locator('body').innerText()).slice(-5000)); } throw error; } finally {await browser?.close();server.close();}
