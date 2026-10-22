import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const role = params.get('role') || 'staff';
const scenario = params.get('scenario') || 'populated';
const organizationId = 'synthetic-school';
const now = new Date();
const selectedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const weekday = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
const art = color => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="${color}"/><circle cx="240" cy="190" r="90" fill="#ffffff88"/><path d="M20 480L170 270 300 420 390 300 480 430V480" fill="#ffffff55"/></svg>`)}`;
const students = [
  { id:'student-a', organizationId, name:'Alex Example', status:'active', loginInfo:{uid:'student-user'}, parentLoginInfo:{uid:'parent-user'} },
  { id:'student-b', organizationId, name:'Sam Example With a Long Name', status:'active' }
];
let galleryItems = scenario === 'empty' ? [] : [
  { id:'media-1', organizationId, studentId:'student-a', studentName:'Alex Example', caption:'A long and descriptive workshop caption about today’s first prototype', album:'Autumn workshop', visibility:'families', url:art('#98dbf8'), createdAt:{seconds:1782000000} },
  { id:'media-2', organizationId, studentId:'student-b', studentName:'Sam Example With a Long Name', caption:'Private assessment', album:'Autumn workshop', visibility:'staff', url:art('#dec0f8'), createdAt:{seconds:1781900000} },
  { id:'media-3', organizationId, studentId:null, studentName:null, caption:'Room overview', album:'Facilities', visibility:'families', url:art('#b8eaa1'), createdAt:{seconds:1781800000} }
];
const enrollments = scenario === 'empty' ? [] : students.map((student,index) => ({ id:`enroll-${index}`, organizationId, status:'active', studentId:student.id, studentName:student.name, groupTime:`${weekday} 15:00`, groupName:'Group A', programName:'Maker Lab' }));
let revision = 0, pending = null, message = '', confirmation = null;
const listeners = new Set();
const notify = () => { revision++; listeners.forEach(listener => listener()); };
const useRevision = () => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => revision);
const queueWrite = (kind, apply, payload) => new Promise((resolve, reject) => { pending = {kind, apply, payload, resolve, reject}; message = `Pending ${kind}`; notify(); });
window.__pulseMediaQa = { pending: () => pending && {kind:pending.kind,payload:pending.payload}, records: () => galleryItems, settle: success => { if (!pending) return; const write=pending; pending=null; if(success){write.apply();galleryItems=[...galleryItems];write.resolve({id:'synthetic-new'});message='Synthetic save complete';}else{write.reject(new Error('Synthetic connection failure'));message='Synthetic save failed';}notify(); } };
export const db = { syntheticOnly:true };
export const useAuth = () => ({ user:{uid:params.get('link')==='none'?'unlinked-user':role==='parent'?'parent-user':role==='student'?'student-user':'staff-user'}, userProfile:{role:role==='readonly'?'instructor':role, organizationId}, currentOrganization:{id:organizationId}, can: permission => permission==='media.manage' && role==='staff' });
export const useAppContext = () => { useRevision(); return { galleryItems, students, enrollments }; };
export const useConfirm = () => ({ confirm: options => new Promise(resolve => {confirmation={options,resolve};notify();}), alert: async (title, detail) => {message=`${title}: ${detail}`;notify();} });
export const collection = (_db,name) => name;
export const doc = (_db,name,id) => ({name,id});
export const serverTimestamp = () => ({seconds:Math.floor(Date.now()/1000)});
export const addDoc = (name,payload) => queueWrite('add', () => galleryItems.unshift({...payload,id:'synthetic-new'}), payload);
export const updateDoc = (ref,payload) => queueWrite('update', () => Object.assign(galleryItems.find(item=>item.id===ref.id),payload), payload);
export const writeBatch = () => { const edits=[]; return { update:(ref,payload)=>edits.push(()=>Object.assign(galleryItems.find(item=>item.id===ref.id),payload)), delete:ref=>edits.push(()=>galleryItems.splice(galleryItems.findIndex(item=>item.id===ref.id),1)), commit:()=>queueWrite('batch',()=>edits.forEach(edit=>edit()),{}) }; };
export const FixtureControls = () => { useRevision(); return <aside aria-label="Synthetic Media QA controls" style={{margin:'32px auto',maxWidth:1320,padding:16,border:'2px solid var(--ds-border)',borderRadius:16,color:'var(--ds-ink)',background:'var(--ds-surface)'}}><strong>Synthetic Media QA · no school records</strong><p role="status">{message}</p>{confirmation && <div role="group" aria-label="Synthetic confirmation"><p>{confirmation.options.title}</p><button onClick={()=>{const next=confirmation;confirmation=null;next.resolve(false);notify();}}>Cancel deletion</button><button onClick={()=>{const next=confirmation;confirmation=null;next.resolve(true);notify();}}>Confirm deletion</button></div>}{pending && <div role="group" aria-label="Synthetic save"><span>Pending {pending.kind} </span><button onClick={()=>window.__pulseMediaQa.settle(true)}>Simulate saved</button><button onClick={()=>window.__pulseMediaQa.settle(false)}>Simulate failure</button></div>}</aside>; };
