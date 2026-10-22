import { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') || 'populated';
const saveMode = params.get('save') || 'success';
const organizationId = 'synthetic-school';
const listeners = new Set();
let revision = 0;
window.__toolkitEvents = [];
const emit = event => { window.__toolkitEvents.push(event); revision++; listeners.forEach(listener => listener()); };
const watch = () => useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision);
const stamp = { toMillis: () => Date.parse('2026-10-20') };

let toolLinks = scenario === 'empty' ? [] : [
  { id:'tool-1', organizationId, title:'Arduino IDE and classroom board manager', url:'https://www.arduino.cc/en/software', category:'robotics', description:'Use for the Tuesday robotics studio. Staff should check the board profile before class.', createdAt:stamp },
  { id:'tool-2', organizationId, title:'Circuit simulator', url:'https://example.test/circuits', category:'engineering', description:'Starter circuits for learners to practice safely.', createdAt:stamp },
  { id:'tool-invalid', organizationId, title:'Legacy course link', url:'javascript:alert(1)', category:'coding', description:'This link needs correction.', createdAt:stamp }
];
let assets = scenario === 'empty' ? [] : [
  { id:'asset-1', organizationId, name:'Robotics kit 05 with spare battery', category:'robotics', status:'available', serialNumber:'MK-ROB-005', notes:'Complete kit. Charge before the Thursday class.', createdAt:stamp },
  { id:'asset-2', organizationId, name:'Learning laptop 12', category:'computer', status:'in_use', serialNumber:'MK-LAP-012', assignedTo:'student-1', assignedToName:'Maya Chen', notes:'Protective case included.', createdAt:stamp },
  { id:'asset-3', organizationId, name:'3D pen', category:'tools', status:'maintenance', serialNumber:'MK-PEN-03', notes:'Tip replacement required.', createdAt:stamp },
  { id:'asset-4', organizationId, name:'Camera kit', category:'other', status:'lost', serialNumber:'MK-CAM-01', notes:'Last seen in media room.', createdAt:stamp }
];
const students = [{ id:'student-1', organizationId, name:'Maya Chen', status:'active' },{ id:'student-2', organizationId, name:'Leo Martin', status:'active' }];
const collections = { tool_links:()=>toolLinks, assets:()=>assets };
const read = ref => { const [kind,id] = ref.path.split('/'); const item=collections[kind]?.().find(entry=>entry.id===id); return { exists:()=>Boolean(item), data:()=>item }; };
const persist = async action => { emit(action); if (saveMode==='pending') await new Promise(resolve=>setTimeout(resolve,1200)); if (saveMode==='error') throw new Error('Synthetic save failure. Check the entered details and retry.'); };
export const db = {};
export const doc = (_db,...parts) => ({ path:parts.join('/') });
export const collection = (_db,...parts) => ({ path:parts.join('/') });
export const serverTimestamp = () => '2026-10-21T00:00:00Z';
export const addDoc = async (ref,value) => { await persist(`create ${ref.path}`); const item={...value,id:`synthetic-${Date.now()}`}; if(ref.path==='tool_links') toolLinks=[...toolLinks,item]; if(ref.path==='assets') assets=[...assets,item]; emit('create visible'); return {id:item.id}; };
export const runTransaction = async (_db,callback) => { const operations=[]; const transaction={get:async ref=>read(ref),update:(ref,value)=>operations.push(['update',ref,value]),delete:ref=>operations.push(['delete',ref])}; await callback(transaction); await persist('transaction'); for(const [action,ref,value] of operations){ const [kind,id]=ref.path.split('/'); if(kind==='tool_links') toolLinks=action==='delete'?toolLinks.filter(item=>item.id!==id):toolLinks.map(item=>item.id===id?{...item,...value}:item); if(kind==='assets') assets=action==='delete'?assets.filter(item=>item.id!==id):assets.map(item=>item.id===id?{...item,...value}:item); } emit('transaction visible'); };
export const useAppContext = () => { watch(); return { toolLinks, assets, students, loading:scenario==='loading', workspaceError:scenario==='error'?'Synthetic toolkit loading failure. Retry from the school workspace.':null }; };
export const useAuth = () => ({ currentOrganization:scenario==='no-org'?null:{id:organizationId,name:'Example School'},can:()=>scenario!=='restricted' });
export const useNotifications = () => ({ addToast:(title,message,type)=>emit(`toast ${type}: ${title}: ${message}`) });
