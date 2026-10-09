import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { ClipboardCheck, Layout, LibraryBig, Menu, UsersRound, Zap, FolderKanban, ChartColumn } from 'lucide-react';
import type { ProjectTemplate, StudentProject } from '../../types';
import { submittedProof } from '../../domain/projectReview';
import { FactoryDashboardContent } from './FactoryDashboard';
import './factory-dispatch.css';
import './factory-modern.css';
import './factory-learning-live.css';

const templates: ProjectTemplate[] = [
  { id: 'plant', title: 'Smart plant guardian', description: 'Build a sensor that tells us when a plant needs water.', status: 'assigned', organizationId: 'local-preview', station: 'Circuits', targetAudience: { grades: ['Makers'] } },
  { id: 'weather', title: 'Weather watch', description: 'Measure and explain the weather around the workshop.', status: 'draft', organizationId: 'local-preview', station: 'Circuits', targetAudience: {} },
  { id: 'rover', title: 'Solar rover', description: 'Build a small solar-powered vehicle.', status: 'draft', organizationId: 'local-preview', station: 'Robotics', targetAudience: {} },
] as ProjectTemplate[];

const projects: StudentProject[] = [
  { id: 'plant-build', title: 'Smart plant guardian', description: 'A sensor that checks soil moisture.', station: 'Circuits', studentId: 'aya', studentName: 'Aya Maker', templateId: 'plant', organizationId: 'local-preview', status: 'building', updatedAt: Timestamp.fromDate(new Date('2026-10-08T09:00:00Z')), reviewProtocolVersion: 1, steps: [submittedProof({ id: 'test', title: 'Test wet and dry soil', status: 'doing', required: true }, '/mission-plant-guardian.svg', 'I tested both readings.', '2026-10-08T09:00:00Z')], resources: [], skills: [], commits: [] },
  { id: 'light-build', title: 'Light-up name badge', description: 'A programmable LED badge.', station: 'Circuits', studentId: 'leo', studentName: 'Léo Maker', organizationId: 'local-preview', status: 'submitted', submittedAt: '2026-10-07T16:00:00Z', updatedAt: Timestamp.fromDate(new Date('2026-10-07T16:00:00Z')), reviewProtocolVersion: 1, steps: [], resources: [], skills: [], commits: [] },
  { id: 'rover-build', title: 'Solar rover', description: 'A small solar-powered vehicle.', station: 'Robotics', studentId: 'sam', studentName: 'Sam Maker', organizationId: 'local-preview', status: 'testing', updatedAt: Timestamp.fromDate(new Date('2026-10-06T11:00:00Z')), steps: [], resources: [], skills: [], commits: [] },
  { id: 'bridge-build', title: 'Bridge challenge', description: 'A model bridge tested with weights.', station: 'Mechanics', studentId: 'aya', studentName: 'Aya Maker', organizationId: 'local-preview', status: 'published', updatedAt: Timestamp.fromDate(new Date('2026-10-04T12:00:00Z')), steps: [], resources: [], skills: [], commits: [] },
];

export default function FactoryDispatchPreview() {
  const [state, setState] = useState<'loaded' | 'empty' | 'error'>('loaded');
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const factory = {
    studentProjects: state === 'loaded' ? projects : [],
    students: [{ id: 'aya', name: 'Aya Maker' }, { id: 'leo', name: 'Léo Maker' }, { id: 'sam', name: 'Sam Maker' }],
    projectTemplates: state === 'loaded' ? templates : [],
    studentProjectsLoading: false,
    studentProjectsError: state === 'error' ? 'Synthetic learner project read failed.' : null,
    catalogLoading: false,
    catalogError: state === 'error' ? 'Synthetic mission catalog read failed.' : null,
    retryStudentProjects: () => setState('loaded'),
    retryLearnerWorkspace: () => setState('loaded'),
  };
  return <div className="sparkfactory-shell sq-factory-preview flex h-screen">
    <aside className={`sq-factory-sidebar sq-factory-preview-sidebar ${menuOpen ? 'is-open' : ''}`}><div className="sq-factory-brand flex items-center gap-3 px-5 pb-5 pt-6"><span className="sq-factory-brand-mark"><Zap size={21} fill="currentColor" /></span><div><h1>SparkQuest</h1><p>Factory · instructor studio</p></div></div><nav className="sq-factory-nav px-3" aria-label="Factory preview navigation"><button className="sq-factory-nav-item is-active" onClick={() => setMenuOpen(false)}><Layout size={18} /> Overview</button><button className="sq-factory-nav-item" onClick={() => { setMessage('Review Inbox opens here in the signed-in Factory.'); setMenuOpen(false); }}><ClipboardCheck size={18} /> Review Inbox {state === 'loaded' && <span className="sq-factory-nav-badge">2</span>}</button><button className="sq-factory-nav-item" onClick={() => setMenuOpen(false)}><FolderKanban size={18} /> Missions</button><button className="sq-factory-nav-item" onClick={() => setMenuOpen(false)}><UsersRound size={18} /> Students</button><button className="sq-factory-nav-item" onClick={() => setMenuOpen(false)}><ChartColumn size={18} /> Class Progress</button><button className="sq-factory-nav-item" onClick={() => setMenuOpen(false)}><LibraryBig size={18} /> Resources &amp; tools</button></nav></aside>
    <div className="sq-factory-preview-content flex min-w-0 flex-1 flex-col"><header className="sq-factory-topbar sq-modern-topbar"><div className="sq-modern-brand"><button type="button" className="sq-modern-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation"><Menu size={21} /></button><span className="sq-modern-brand-symbol"><Zap size={19} fill="currentColor" /></span><span>SparkQuest <b>Factory</b></span></div><nav className="sq-modern-topnav" aria-label="Factory preview sections"><button type="button" aria-current="page"><Layout size={15} /> Overview</button><button type="button" onClick={() => setMessage('Missions open here in the signed-in Factory.')}>Missions</button><button type="button" onClick={() => setMessage('Review opens here in the signed-in Factory.')}>Review {state === 'loaded' && <span>2</span>}</button><button type="button" onClick={() => setMessage('Students open here in the signed-in Factory.')}>Students</button><button type="button" onClick={() => setMessage('Progress opens here in the signed-in Factory.')}>Progress</button></nav><div className="sq-modern-header-actions"><span className="sq-factory-preview-label">Local preview</span><div className="sq-modern-avatar">I</div></div></header><main className="sq-factory-main min-h-0 flex-1 overflow-y-auto"><div className="sq-factory-preview-controls"><strong>Synthetic records only · no account reads or writes</strong><button onClick={() => setState('loaded')} aria-pressed={state === 'loaded'}>Loaded</button><button onClick={() => setState('empty')} aria-pressed={state === 'empty'}>Empty</button><button onClick={() => setState('error')} aria-pressed={state === 'error'}>Error</button>{message && <span role="status">{message}</span>}</div><FactoryDashboardContent factory={factory} onReviewProject={(id, stepId) => setMessage(`Would open ${id}${stepId ? ` at step ${stepId}` : ''}.`)} onNavigate={view => setMessage(`Would open ${view}.`)} onCreateMission={() => setMessage('Would open the new mission editor.')} onEditMission={id => setMessage(`Would edit mission ${id}.`)} /></main></div>
  </div>;
}
