import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') || 'populated';
let revision = 0;
let message = '';
let currentRoute = 'student-details';
let routeParams = {};
const listeners = new Set();
const notify = value => { message = value; revision += 1; listeners.forEach(listener => listener()); };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };

const student = {
  id:'student-synthetic', organizationId:'synthetic-only', name:'Alex Example', status:'active',
  parentName:'Morgan Example', parentPhone:scenario==='attention'?'':'+15550000000',
  birthDate:'2016-04-12', school:'Example School', email:'alex@example.invalid',
  medicalInfo:'', address:'Example Street',
  loginInfo:{uid:'synthetic-learner',email:'alex@school.invalid',initialPassword:'synthetic-only'},
  parentLoginInfo:{uid:'synthetic-parent',email:'parent@school.invalid'}, badges:[]
};
if (scenario === 'no-access') { delete student.loginInfo; delete student.parentLoginInfo; }
if (scenario === 'verified-parent') student.parentLoginInfo.email='p.morgan@makerlab.academy';
if (scenario === 'long') {
  student.name='Alexandria-Morgan Example-Synthetic-Learner';
  student.school='Example International School of Creative Science and Robotics';
  student.email='alexandria.morgan.synthetic.learner@example.invalid';
  student.parentPhone='';
  student.medicalInfo='Synthetic note: bring the signed care form to every off-site robotics activity.';
}

const program = {id:'program-synthetic',name:'Creative Robotics',status:'active',grades:[{id:'level-synthetic',name:'Explorer',groups:[{id:'group-synthetic',name:'Tuesday makers',day:'Tuesday',time:'16:00'}]}]};
const enrollment = {id:'enrollment-synthetic',studentId:student.id,organizationId:'synthetic-only',programId:program.id,programName:program.name,gradeId:'level-synthetic',gradeName:'Explorer',groupId:'group-synthetic',groupName:'Tuesday makers',groupTime:'Tuesday 16:00',status:'active',totalAmount:1200,paidAmount:700,balance:500,paymentPlan:'monthly',paymentPromises:[{month:'2026-10',amount:500},{month:'2026-11',amount:700}],startDate:'2026-09-01'};
if (scenario === 'long') { enrollment.programName='Creative Robotics and Future Systems Laboratory'; enrollment.groupName='Tuesday makers and advanced prototype studio'; }
if(scenario==='missing-certificate-date')enrollment.startDate='';
const proofUrl = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540"><rect width="900" height="540" fill="#eef6ff"/><rect x="75" y="75" width="750" height="390" rx="24" fill="white" stroke="#5495d4" stroke-width="6"/><text x="125" y="185" font-family="Arial" font-size="42" fill="#17324d">Synthetic payment proof</text><text x="125" y="250" font-family="Arial" font-size="27" fill="#415a70">Example School · MAD 700.00</text><text x="125" y="315" font-family="Arial" font-size="24" fill="#415a70">No real bank or school document</text></svg>');
const payment = {id:'payment-synthetic',studentId:student.id,enrollmentId:enrollment.id,organizationId:'synthetic-only',studentName:student.name,date:'2026-10-01',amount:700,method:'cash',status:'paid',proofUrl};
let paymentDeleted = false;
const attendance = [{id:'attendance-1',studentId:student.id,date:'2026-10-13',status:'present'},{id:'attendance-2',studentId:student.id,date:'2026-10-20',status:'absent'}];
const project = {id:'project-synthetic',studentId:student.id,title:'Rover prototype',description:'A sensor-guided rover design.',status:'published',station:'engineering',skillsAcquired:['Sensors','Prototype design'],mediaUrls:[],steps:[{id:'step-1',title:'Build a prototype',status:'done'}]};

export const useAppContext = () => {
  useSyncExternalStore(subscribe,()=>revision);
  return ({
  students:[student], enrollments:scenario==='empty'?[]:[enrollment], programs:[program],
  payments:scenario==='empty'||paymentDeleted?[]:[payment], attendanceRecords:scenario==='empty'?[]:attendance,
  studentProjects:scenario==='empty'?[]:[project], badges:[], bookings:[], workshopTemplates:[], workshopSlots:[],
  settings:{academyName:'Example School',logoUrl:''}, viewParams:{studentId:student.id,...routeParams}, currentRoute,
  navigateTo:(route,params)=>{currentRoute=route; routeParams=params||{}; notify(`Route: ${route}${params?' · '+JSON.stringify(params):''}`);},
  sendNotification:async()=>notify('Synthetic notification only')
  });
};
export const useAuth = () => ({
  currentOrganization:{id:'synthetic-only',name:'Example School',slug:'example'},
  userProfile:{role:scenario==='readonly'?'teacher':'admin',email:'reviewer@example.invalid'},
  can:()=>scenario!=='readonly',
  createSecondaryUser:async()=>{ if(scenario==='failure') throw new Error('Synthetic failure'); return 'new-synthetic-user'; }
});
export const useConfirm = () => ({alert:async(title,detail)=>notify(`${title}: ${detail}`),confirm:async options=>{notify(`Confirmation: ${options.title}`);return false;}});
export const db = {synthetic:true};
export const doc = (_db,collection,id)=>({collection,id});
const applyUpdate=(reference,value)=>{const target=reference.collection==='students'&&reference.id===student.id?student:reference.collection==='enrollments'&&reference.id===enrollment.id?enrollment:reference.collection==='payments'&&reference.id===payment.id?payment:null;if(!target)return;for(const [key,next] of Object.entries(value)){target[key]=next&&typeof next==='object'&&'__increment' in next?Number(target[key]||0)+next.__increment:next;}};
export const updateDoc = async (reference,value)=>{if(scenario==='failure') throw new Error('Synthetic save failure'); applyUpdate(reference,value); notify('Synthetic save succeeded; no school records changed.');};
export const deleteDoc = async reference=>{if(scenario==='failure') throw new Error('Synthetic delete failure'); if(reference.collection==='payments'&&reference.id===payment.id)paymentDeleted=true; notify('Synthetic delete succeeded; no school records changed.');};
export const writeBatch=()=>{const updates=[];return {update:(reference,value)=>updates.push([reference,value]),delete:reference=>updates.push([reference,null]),commit:async()=>{if(scenario==='failure')throw new Error('Synthetic batch failure');for(const [reference,value] of updates){if(value)applyUpdate(reference,value);else if(reference.collection==='payments'&&reference.id===payment.id)paymentDeleted=true;}notify('Synthetic batch saved; no school records changed.');}}};
export const setDoc = updateDoc;
export const getDocs = async()=>({empty:true,docs:[]});
export const collection =()=>({}); export const query=()=>({}); export const where=()=>({});
export const increment=value=>({__increment:value}); export const arrayUnion=(...values)=>values; export const serverTimestamp=()=>new Date();
export const getParentDirectory=async()=>{if(scenario==='failure') throw new Error('Synthetic directory failure');return []};
export const manageParentAccess=async()=>{if(scenario==='failure') throw new Error('Synthetic access failure');return {status:'success',email:'parent@school.invalid',uid:'synthetic-parent'};};
export const issueRecipientQuickLink=async()=>{if(scenario==='failure') throw new Error('Synthetic link failure');return {launchUrl:'https://example.invalid/synthetic-quick-link',expiresAt:new Date(Date.now()+300000).toISOString()};};
export const issueFinanceInvoice=async()=>{throw new Error('Invoice generation is disabled in this synthetic preview.');};
export const generateRegistrationCertificate=(_student,_enrollment,_settings,options)=>{if(scenario==='certificate-failure')throw new Error('Synthetic certificate failure');notify(`Synthetic registration certificate generated for ${options.admissionDate}; no print job or school record.`);return true;};
export const generateCompletionCertificate=(_student,_enrollment,_settings,options)=>{if(scenario==='certificate-failure')throw new Error('Synthetic certificate failure');notify(`Synthetic completion certificate generated for ${options.academyName}; no print job or school record.`);return true;};
export const FixtureStatus=()=>{useSyncExternalStore(subscribe,()=>revision);return <aside className="student-fixture-status" role="status"><strong>Synthetic preview · no school connection</strong><span>{message || 'Use the workspaces and dialogs. Saves stay in this fixture.'}</span></aside>;};
