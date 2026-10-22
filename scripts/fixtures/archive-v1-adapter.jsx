import React, {useSyncExternalStore} from 'react';

const params = new URLSearchParams(location.search);
const orgId = 'synthetic-only';
const listeners = new Set();
let revision = 0;
let pending = null;
let dialog = null;
let feedback = '';
let records = params.get('scenario') === 'empty' ? [] : [
  {id:'reference-1',organizationId:orgId,title:'Creative coding guide for facilitators',url:'https://example.invalid/creative-coding',category:'documents',description:'Session preparation, materials and accessibility notes for the autumn program.',status:'active',createdBy:'Example staff',createdAt:new Date('2026-10-02'),updatedAt:new Date('2026-10-19')},
  {id:'reference-2',organizationId:orgId,title:'Program materials index',url:'https://example.invalid/materials',category:'sheets',description:'Shared materials checklist.',status:'active',createdBy:'Example staff',createdAt:new Date('2026-09-10')},
  {id:'reference-3',organizationId:orgId,title:'Previous term links',url:'https://example.invalid/previous',category:'websites',description:'Historical working links kept for reference.',status:'archived',createdBy:'Example staff',createdAt:new Date('2026-05-05')},
  {id:'other-tenant',organizationId:'another-tenant',title:'Other school record',url:'https://example.invalid/private',category:'other',status:'active'}
];
if (params.get('scenario') === 'invalid') records = [{...records[0],url:'javascript:invalid()',normalizedUrl:''}];
const emit = () => { revision++; listeners.forEach(listener => listener()); };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const useRevision = () => useSyncExternalStore(subscribe, () => revision, () => revision);
export const useAppContext = () => { useRevision(); return {archiveLinks:records,loading:params.get('scenario')==='loading'}; };
export const useAuth = () => ({currentOrganization:params.get('scenario')==='no-org'?null:{id:orgId},userProfile:{uid:'synthetic-reviewer'},can:permission=>params.get('role')==='restricted'?false:params.get('role')==='viewer'?permission==='toolkit.view':true});
export const useConfirm = () => ({confirm:options=>new Promise(resolve=>{dialog={...options,resolve};emit();})});
export const useNotifications = () => ({addToast:(title,message,type)=>{feedback=`${type}: ${title} — ${message}`;emit();}});
export const db = {synthetic:true};
export const collection = (_db,name) => ({name});
export const doc = (_db,name,id) => ({name,id});
export const serverTimestamp = () => new Date('2026-10-21T12:00:00Z');
const queue = operation => new Promise((resolve,reject)=>{pending={resolve:()=>{operation();resolve();},reject};emit();});
export const addDoc = (ref,payload) => queue(()=>{records=[...records,{...payload,id:`fixture-${Date.now()}`}];emit();});
export const runTransaction = async (_db,callback) => {
  const changes=[];
  await callback({
    get:async ref=>{const item=records.find(record=>record.id===ref.id);return {exists:()=>Boolean(item),data:()=>item};},
    update:(ref,payload)=>changes.push(()=>{records=records.map(record=>record.id===ref.id?{...record,...payload}:record);}),
    delete:ref=>changes.push(()=>{records=records.filter(record=>record.id!==ref.id);})
  });
  return queue(()=>{changes.forEach(change=>change());emit();});
};
export const FixtureControls = () => { useRevision(); return <aside className="archive-fixture-controls" aria-label="Synthetic operation controls"><strong>Synthetic data only</strong>{pending&&<div><span>Operation pending</span><button onClick={()=>{const current=pending;pending=null;current.resolve();emit();}}>Simulate success</button><button onClick={()=>{const current=pending;pending=null;current.reject(new Error('Synthetic operation failed. Retry without losing your changes.'));emit();}}>Simulate failure</button></div>}{dialog&&<div><span>{dialog.title}: {dialog.message}</span><button onClick={()=>{const current=dialog;dialog=null;current.resolve(true);emit();}}>{dialog.confirmText}</button><button onClick={()=>{const current=dialog;dialog=null;current.resolve(false);emit();}}>Cancel confirmation</button></div>}{feedback&&<output>{feedback}</output>}</aside>; };
