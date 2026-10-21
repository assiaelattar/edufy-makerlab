import React,{useSyncExternalStore} from 'react';
import {useAppContext as useDashboardContext} from './pulse-dashboard-adapter';
import {fixtureStudents,fixturePrograms,fixtureEnrollments,recordAction} from './pulse-modules-adapter';
export * from './pulse-dashboard-adapter';
const multiProgramEnrollments=[...fixtureEnrollments,{id:'enrollment-secondary',studentId:'learner-2',studentName:'Noor Example',programId:'design',programName:'Creative coding',gradeName:'Level 2',groupId:'creators',groupName:'Digital creators',groupTime:'Monday 10:30',status:'active',totalAmount:400,paidAmount:300}];
const listeners=new Set();let revision=0,confirmation=null,pending=null,feedback='';
const notify=()=>{revision++;listeners.forEach(listener=>listener());};
const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export const useAuth=()=>({currentOrganization:{id:'synthetic-only'},user:{uid:'synthetic-reviewer'},can:permission=>{
 const role=new URLSearchParams(location.search).get('role');
 return role!=='readonly' && (role!=='students-only' || permission!=='finance.view');
}});
export const useAppContext=()=>({...useDashboardContext(),students:new URLSearchParams(location.search).get('scenario')==='empty'?[]:fixtureStudents,programs:fixturePrograms,enrollments:multiProgramEnrollments,settings:{academyName:'Example School'},navigateTo:(route,params)=>recordAction(`${route}: ${JSON.stringify(params||{})}`)});
export const useConfirm=()=>({
 confirm:options=>new Promise(resolve=>{confirmation={...options,resolve};notify();}),
 alert:async(title,message)=>{feedback=`${title}: ${message}`;notify();},
});
export const doc=(_db,collection,id)=>({collection,id});
const simulateWrite=changes=>new Promise((resolve,reject)=>{pending={changes,resolve,reject};notify();});
export const updateDoc=(reference,payload)=>simulateWrite([{reference,payload}]);
export const writeBatch=()=>{const changes=[];return {update:(reference,payload)=>changes.push({reference,payload}),commit:()=>simulateWrite(changes)};};
export const StudentsFixtureControls=()=>{
 useSyncExternalStore(subscribe,()=>revision);
 return <aside className="ds-student-fixture-controls" aria-label="Students synthetic action controls">
  <strong>Synthetic action controls · no school records</strong>
  {confirmation&&<section role="group" aria-label="Synthetic confirmation"><p>{confirmation.title}: {confirmation.message}</p><button onClick={()=>{const current=confirmation;confirmation=null;current.resolve(true);notify();}}>{confirmation.confirmText}</button><button onClick={()=>{const current=confirmation;confirmation=null;current.resolve(false);notify();}}>Cancel confirmation</button></section>}
  {pending&&<section role="group" aria-label="Synthetic save result"><p>{pending.changes.length} record change{pending.changes.length===1?'':'s'} pending</p><button onClick={()=>{const current=pending;pending=null;current.resolve();notify();}}>Simulate success</button><button onClick={()=>{const current=pending;pending=null;current.reject(new Error('Synthetic connection failure'));notify();}}>Simulate failure</button></section>}
  <p role="status">{feedback}</p>
 </aside>;
};
