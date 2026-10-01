import React, { useState } from 'react';
import type { ProjectTemplate, StudentProject } from '../types';
import { currentAcademicYear, previousAcademicYear } from '../utils/academicYear';
import { LearnerWorkbench, LearnerMissionBoard } from './LearnerWorkbench';
import { StudentPortfolio } from './StudentPortfolio';
import { StudentMissionDetails } from './StudentMissionDetails';
import { Sidebar } from './Sidebar';
import { NameMissionDialog } from './NameMissionDialog';

const year = currentAcademicYear();
const base: StudentProject = { id: 'preview-plant', title: 'Smart plant guardian', description: 'Build a sensor that tells you when a plant needs water.', station: 'Circuits', status: 'building', academicYearId: year, thumbnailUrl: '/mission-plant-guardian.svg', steps: [{ id: 'plan', title: 'Plan your sensor', status: 'done' }, { id: 'build', title: 'Wire the moisture sensor', status: 'doing' }, { id: 'test', title: 'Test dry and wet soil', status: 'todo' }], skills: ['Electronics'], resources: [], commits: [] };
const projects: StudentProject[] = [base,
  { ...base, id: 'preview-weather', title: 'Pocket weather station', station: 'Coding', thumbnailUrl: undefined, status: 'testing' },
  { ...base, id: 'preview-feedback', title: 'Solar rover', status: 'changes_requested', feedback: 'Show one more test on a rough surface. Explain what you changed.' },
  { ...base, id: 'preview-submission', title: 'Cardboard arcade controller', status: 'submitted', thumbnailUrl: undefined },
  { ...base, id: 'preview-finished', title: 'Light-up city', status: 'published', xpReward: 50 },
  { ...base, id: 'preview-last-year', title: 'My first robot', academicYearId: previousAcademicYear(), status: 'published', xpReward: 50 },
  { ...base, id: 'preview-old-building', title: 'Bridge prototype', academicYearId: previousAcademicYear(), status: 'building' },
];
const templates: ProjectTemplate[] = [{ id: 'preview-new', title: 'Build a wind-powered racer', description: 'Turn moving air into a machine. Design, build, and test a racer of your own.', station: 'Engineering', status: 'assigned', skills: [], difficulty: 'beginner' }];

/** Dev + localhost only, mounted before providers. No authenticated reads or writes. */
export default function LearnerWorkbenchPreview() {
  const [pin, setPin] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [preview, setPreview] = useState<StudentProject | ProjectTemplate | null>(null);
  const [notice, setNotice] = useState('');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const params = new URLSearchParams(window.location.search);
  const visible = params.get('state') === 'empty' ? [] : params.get('state') === 'review' ? projects.filter(project => project.status === 'submitted') : projects;
  const open = (id: string) => { const project = projects.find(project => project.id === id); if (project) setPreview(project); };
  if (preview) return <StudentMissionDetails project={preview} onBack={() => setPreview(null)} />;
  return <div className="sparkquest-dashboard sq-sparkbook sq-desktop-workspace sq-workbench-preview">
    <Sidebar studentName="Aya Maker" avatarUrl="" coins={150} isAdminOrInstructor={false} onHome={() => document.getElementById('sq-preview-home')?.scrollIntoView()} onEditProfile={() => setNotice('Maker profile — preview only.')} onOpenPortfolio={() => setLogOpen(true)} onOpenArcade={() => setNotice('Play lab — preview only.')} onOpenStore={() => setNotice('Exchange — preview only.')} onOpenGallery={() => setNotice('Evidence wall — preview only.')} onOpenPickup={() => setNotice('Pickup card — preview only.')} onOpenWallet={() => setNotice('Key cabinet — preview only.')} onOpenProgress={() => setNotice('Build rhythm — preview only.')} />
    <main>
    <header id="sq-preview-home" className="sq-dashboard-greeting"><div><span className="sq-kicker">Your workbench · {year}</span><h2>Hi, Aya.</h2></div><button type="button" className="sq-action sq-action--primary" onClick={() => setNaming(true)}>New project</button></header>
    {notice && <div role="status" className="sq-workbench-preview-notice">{notice}</div>}
    <LearnerWorkbench projects={visible} academicYear={year} lastOpenedId={pin} onContinue={id => { setPin(id); setNotice(`Opening ${projects.find(project => project.id === id)?.title}. Preview only — no progress changed.`); }} onPreview={open} onFieldLog={() => setLogOpen(true)} />
    <LearnerMissionBoard projects={visible} templates={templates} academicYear={year} onDiscover={setPreview} onOpenProject={open} onPreview={open} onFieldLog={() => setLogOpen(true)} />
    <StudentPortfolio isOpen={logOpen} previewMode previewProjects={projects} onSelectProject={(_id, project) => { if (project) setPreview(project); }} onClose={() => setLogOpen(false)} />
  </main><NameMissionDialog isOpen={naming} name={name} onChange={setName} onClose={() => setNaming(false)} onSubmit={() => { setNaming(false); setNotice(`“${name.trim()}” — preview only. No project created.`); }} /></div>;
}
