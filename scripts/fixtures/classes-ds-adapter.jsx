// Classes-only synthetic data. No Firebase connection or school records.
import React, { useSyncExternalStore } from 'react';
export * from './pulse-attendance-adapter';

const options = new URLSearchParams(location.search);
const scenario = options.get('scenario') || 'populated';
const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
const otherDay = weekday === 'Monday' ? 'Tuesday' : 'Monday';
const program = { id:'synthetic-program', name:'Robotics studio', status:'active', grades:[{ id:'synthetic-level', name:'Level 1', groups:[
  { id:'explorers', name:'Explorers', day:weekday, time:'14:00' },
  { id:'inventors', name:'Inventors', day:weekday, time:'16:00' },
] }] };
const secondProgram = { id:'synthetic-design', name:'Creative coding', status:'active', grades:[{ id:'synthetic-design-level', name:'Level 2', groups:[
  { id:'creators', name:'Digital creators', day:otherDay, time:'10:30' },
] }] };
const students = [
  { id:'learner-ready', name:'Alex Example', status:'active', organizationId:'synthetic-only', parentName:'Family Example', parentPhone:'+15550000001', birthDate:'2016-01-01', school:'Example School', email:'family@example.test', loginInfo:{ uid:'synthetic-uid', email:'alex@example.test', initialPassword:'synthetic-only-password' } },
  { id:'learner-missing', name:'Sam Example With A Longer Name', status:'active', organizationId:'synthetic-only', parentName:'Second Family', parentPhone:'', school:'Example School' },
  { id:'learner-due', name:'Noor Example', status:'active', organizationId:'synthetic-only', parentName:'Third Family', parentPhone:'+15550000003', birthDate:'2015-01-01', school:'Example School', loginInfo:{ uid:'synthetic-uid-3', email:'noor@example.test', initialPassword:'synthetic-only-password' } },
  { id:'learner-other', name:'Robin Example', status:'active', organizationId:'synthetic-only', parentName:'Fourth Family', parentPhone:'+15550000004', birthDate:'2016-01-01', school:'Example School' },
];
if (scenario === 'access-none') students.forEach(student => { delete student.loginInfo; });
if (scenario === 'no-emails') students.forEach(student => { delete student.email; });
const enrollments = students.map((student, index) => ({ id:`enrollment-${index}`, studentId:student.id, programId:program.id, gradeName:'Level 1', groupId:index < 3 ? 'explorers' : 'inventors', groupName:index < 3 ? 'Explorers' : 'Inventors', secondGroupId:index === 3 ? 'explorers' : undefined, groupTime:`${weekday} 14:00`, status:'active', balance:index === 2 ? 250 : 0, totalAmount:1000, paidAmount:index === 2 ? 750 : 1000 }));
let viewParams = options.get('view') === 'roster' ? { classId:{ pId:program.id, gId:'synthetic-level', grpId:'explorers' } } : options.get('view') === 'missing' ? { classId:{ pId:'missing', gId:'missing', grpId:'missing' } } : {};
let lastAction = '';
let revision = 0;
const listeners = new Set();
const notify = () => { revision++; listeners.forEach(listener => listener()); };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const useAuth = () => ({ currentOrganization:{ id:'synthetic-only', name:'Example school' }, can:() => options.get('role') !== 'readonly' });
export const useAppContext = () => {
  useSyncExternalStore(subscribe, () => revision);
  return {
    programs:scenario === 'empty' ? [] : [program, secondProgram],
    students,
    enrollments:scenario === 'roster-empty' || scenario === 'empty' ? [] : enrollments,
    viewParams,
    settings:{ academyName:'Example school' },
    navigateTo:(view, params = {}) => { lastAction = `${view} ${JSON.stringify(params)}`; if (view === 'classes') viewParams = params; notify(); },
  };
};
export const useConfirm = () => ({ alert:async (title, message) => { lastAction = `${title}: ${message}`; notify(); } });
export const recordAction = action => { lastAction = action; notify(); };
export const ClassesFixtureControls = () => {
  useSyncExternalStore(subscribe, () => revision);
  return <aside aria-label="Synthetic QA controls" style={{ marginTop:24, padding:16, borderTop:'2px solid var(--ds-border)' }}>
    <strong>Synthetic Classes preview · no school records</strong>
    <p role="status">{lastAction}</p>
  </aside>;
};
