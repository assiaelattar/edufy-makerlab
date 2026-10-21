import React, {useSyncExternalStore} from 'react';
import {startOfWeek,addDays,format} from 'date-fns';
const params=new URLSearchParams(location.search);
const week=startOfWeek(new Date(),{weekStartsOn:1});
let sessions=params.get('scenario')==='empty'?[]:[
  [0,'09:00','10:00','Robotics workshop','Explorers · Level 1','program_class','staff-a','Alex Instructor'],
  [0,'14:00','15:30','Creative coding','Digital creators · Level 2','program_class','',''],
  [1,'10:30','12:00','Build a rover','Make & Go workshop','workshop_trial','staff-b','Noor Instructor'],
  [2,'09:00','10:30','Robotics workshop','Inventors · Level 1','program_class','',''],
  [3,'15:00','16:30','Design lab','Makers · Level 2','program_class','staff-a','Alex Instructor'],
  [5,'10:00','11:30','Creative coding','Digital creators · Level 2','program_class','staff-b','Noor Instructor'],
].map(([offset,startTime,endTime,title,subTitle,type,instructorId,instructorName],i)=>({id:`fixture-session-${i}`,organizationId:'synthetic-only',date:format(addDays(week,offset),'yyyy-MM-dd'),startTime,endTime,title,subTitle,type,instructorId,instructorName,status:'scheduled',color:'blue'}));
const team=[{uid:'staff-a',name:'Alex Instructor',role:'instructor'},{uid:'staff-b',name:'Noor Instructor',role:'instructor'},{uid:'staff-c',name:'Sam Coordinator',role:'admin'}];
const fixturePrograms=['sync','invalid-day'].includes(params.get('scenario'))?[{id:'synthetic-program',organizationId:'synthetic-only',name:'Science club',status:'active',enrollmentPolicy:{mode:'rolling_membership'},grades:[{id:'synthetic-grade',name:'Level 1',groups:[{id:'synthetic-group',name:'Explorers',day:params.get('scenario')==='invalid-day'?'Someday':'Monday',time:'11:00'}]}]}]:[];
let revision=0,action='',confirmation=null,pendingWrite=null,nextSessionId=100;const listeners=new Set();
const notify=()=>{revision++;listeners.forEach(fn=>fn());};const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
const useRevision=()=>useSyncExternalStore(subscribe,()=>revision);
export const useAppContext=()=>{useRevision();return {programs:fixturePrograms,workshopTemplates:[],workshopSlots:[],classSessions:sessions,teamMembers:params.get('scenario')==='no-team'?[]:team};};
export const useAuth=()=>({currentOrganization:{id:'synthetic-only'},userProfile:{uid:'fixture-staff'},can:()=>params.get('role')!=='readonly'});
export const useConfirm=()=>({alert:async(title,message)=>{action=`${title}: ${message}`;notify();},confirm:options=>new Promise(resolve=>{confirmation={...options,resolve};notify();})});
export const AppProvider=({children})=>children;
export const db={synthetic:true};
export const doc=(_db,_collection,id)=>({id:id||`synthetic-session-${nextSessionId++}`});export const collection=()=>({});export const serverTimestamp=()=>null;
export const updateDoc=async(reference,fields)=>{if(params.get('scenario')==='save-failure')throw new Error('Synthetic assignment failure');if(params.get('scenario')==='assignment-pending')return new Promise((resolve,reject)=>{pendingWrite={kind:'assignment',reference,fields,resolve,reject};action='Pending synthetic assignment';notify();});sessions=sessions.map(s=>s.id===reference.id?{...s,...fields}:s);action='Synthetic instructor assignment saved';notify();};
export const writeBatch=()=>{const staged=[];return {set:(reference,payload)=>staged.push({id:reference.id,...payload}),commit:()=>new Promise((resolve,reject)=>{pendingWrite={staged,resolve,reject};action=`Pending synthetic sync of ${staged.length} session`;notify();})};};
const resolveConfirmation=approved=>{const pending=confirmation;confirmation=null;action=approved?'Synthetic removal approved':'Synthetic removal canceled';notify();pending?.resolve(approved);};
const finishWrite=saved=>{const pending=pendingWrite;pendingWrite=null;if(saved){sessions=pending.kind==='assignment'?sessions.map(s=>s.id===pending.reference.id?{...s,...pending.fields}:s):[...sessions,...pending.staged];pending.resolve();}else pending.reject(new Error('Synthetic connection failure'));notify();};
export const ModuleFixtureControls=()=>{useRevision();return <aside aria-label="Synthetic QA controls" style={{marginTop:24,padding:16,borderTop:'1px solid var(--edu-border)'}}><strong>Synthetic UI preview · no school records</strong><p role="status">{action}</p>{pendingWrite&&<div role="group" aria-label={`Synthetic pending ${pendingWrite.kind||'sync'}`} style={{position:'fixed',zIndex:100,right:16,bottom:16,display:'flex',gap:8,padding:12,background:'var(--ds-surface)',color:'var(--ds-ink)',border:'2px solid var(--ds-border)',borderRadius:14}}><button onClick={()=>finishWrite(true)}>Simulate {pendingWrite.kind||'sync'} saved</button><button onClick={()=>finishWrite(false)}>Simulate {pendingWrite.kind||'sync'} failure</button></div>}{confirmation&&<div role="dialog" aria-modal="true" aria-label={confirmation.title} style={{position:'fixed',zIndex:100,inset:0,display:'grid',placeItems:'center',background:'color-mix(in srgb, var(--ds-ink) 55%, transparent)'}}><div style={{maxWidth:420,padding:24,background:'var(--ds-surface)',color:'var(--ds-ink)',border:'2px solid var(--ds-border)',borderRadius:24}}><h2>{confirmation.title}</h2><p>{confirmation.message}</p><button onClick={()=>resolveConfirmation(false)}>Keep assignment</button><button onClick={()=>resolveConfirmation(true)}>Remove assignment</button></div></div>}</aside>;};
