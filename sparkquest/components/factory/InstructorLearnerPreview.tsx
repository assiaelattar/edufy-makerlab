import React, { useState } from 'react';
import type { ProjectTemplate, StudentProject } from '../../types';
import { learnerDirectory, learnerWorkspace, buildProfileAssignmentPatch } from '../../domain/instructorLearner';
import { currentAcademicYear } from '../../utils/academicYear';
import { buildReviewPatch, submittedProof } from '../../domain/projectReview';
import { InstructorLearnerWorkspace, ProfileMissionAssignmentDialog } from './InstructorLearnerWorkspace';
import { ReviewWorkspace } from './ReviewModal';

const org = 'local-learner-desk';
const profiles = [{ id: 'aya-record', name: 'Aya Maker', organizationId: org, status: 'active', _source: 'student_profile', loginInfo: { uid: 'aya-auth' } }, { id: 'second-aya', name: 'Aya Maker', organizationId: org, _source: 'student_profile' }];
const enrollments = [{ id: 'class', organizationId: org, studentId: 'aya-record', programId: 'stem', programName: 'STEM Quest', gradeId: 'makers', gradeName: 'Mini Makers', groupId: 'crew-five', groupName: 'Group 5', status: 'active' }];
const missions = (): ProjectTemplate[] => [
  { id: 'plant', organizationId: org, title: 'Plant guardian', description: 'Build a soil sensor and explain two test readings.', station: 'Circuits', status: 'assigned', targetAudience: { programs: ['stem'], grades: ['makers'], groups: ['crew-five'] } },
  { id: 'rover', organizationId: org, title: 'Solar rover', description: 'Build a solar-powered rover that can carry a small load.', station: 'Robotics', status: 'assigned', targetAudience: { grades: ['older-makers'], students: [] } },
  { id: 'draft', organizationId: org, title: 'Weather watch · ready draft', description: 'Measure the weather near the workshop.', station: 'Circuits', status: 'draft', defaultWorkflowId: 'engineering', missionBrief: { goal: 'Read temperature', finalOutcome: 'Working weather station' }, targetAudience: {} },
  { id: 'planned', organizationId: org, title: 'Class launch · planned draft', description: 'An unpublished class mission.', station: 'Circuits', status: 'draft', targetAudience: { grades: ['makers'] } },
] as ProjectTemplate[];
const projects = (): StudentProject[] => [
  { id: 'plant-build', organizationId: org, studentId: 'aya-auth', templateId: 'plant', academicYearId: currentAcademicYear(), title: 'Plant guardian', description: 'A sensor that tells us when a plant needs water.', station: 'Circuits', status: 'building', updatedAt: '2026-10-01T12:00:00Z', steps: [{ id: 'plan', title: 'Plan the alert', status: 'done' }, submittedProof({ id: 'test', title: 'Test wet and dry soil', status: 'doing', required: true }, `${window.location.origin}/mission-plant-guardian.svg`, 'Here are my test readings. Please check my labels.', '2026-10-01T12:00:00Z', 'image/svg+xml')], resources: [], skills: [], commits: [], reviewHistory: [{ id: 'r1', scope: 'step', stepId: 'plan', stepTitle: 'Plan the alert', outcome: 'step_approved', feedback: 'Clear plan. Build and test both readings next.', reviewedAt: '2026-09-28T10:00:00Z', reviewedByName: 'Demo mentor' }] },
  { id: 'completed-build', organizationId: org, studentId: 'aya-record', academicYearId: currentAcademicYear(), title: 'Light-up name badge', description: 'My first programmable LED badge.', station: 'Circuits', status: 'published', steps: [{ id: 'build', title: 'Build & test', status: 'done' }], resources: [], skills: [], commits: [], reviewHistory: [{ id: 'r2', outcome: 'published', feedback: 'Great debugging and a confident explanation.', reviewedAt: '2026-09-30T10:00:00Z', reviewedByName: 'Demo mentor' }] },
  { id: 'previous-build', organizationId: org, studentId: 'aya-record', academicYearId: '2025-2026', title: 'Bridge challenge', description: 'Last year’s unfinished build, retained in the portfolio.', station: 'Mechanics', status: 'building', steps: [{ id: 'sketch', title: 'Sketch bridge', status: 'done' }, { id: 'load', title: 'Load test', status: 'todo' }], resources: [], skills: [], commits: [] },
] as unknown as StudentProject[];

export default function InstructorLearnerPreview() {
  const [templates, setTemplates] = useState(missions);
  const [builds, setBuilds] = useState(projects);
  const [assigning, setAssigning] = useState(false);
  const [openId, setOpenId] = useState('');
  const [reviewTab, setReviewTab] = useState<'proof' | 'history'>('proof');
  const [failure, setFailure] = useState(false);
  const [readError, setReadError] = useState(false);
  const [info, setInfo] = useState('');
  const learner = learnerDirectory(profiles, builds, org).find(item => item.id === 'aya-record')!;
  const data = learnerWorkspace(learner, templates, enrollments, [], org);
  const project = builds.find(item => item.id === openId);
  return <main style={{ background: '#f3f6fc', minHeight: '100vh' }}>
    <div className="sq-learner-desk" style={{ maxWidth: 1320, margin: 'auto', padding: '20px 28px 0', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}><strong>Local learner desk · synthetic records only</strong><span>No account reads, database writes or uploads.</span><label><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)} /> Simulate assignment failure</label><label><input type="checkbox" checked={readError} onChange={event => setReadError(event.target.checked)} /> Simulate data error</label><button type="button" onClick={() => { setTemplates(missions()); setBuilds(projects()); setFailure(false); setReadError(false); setInfo(''); }}>Reset demo</button></div>
    <InstructorLearnerWorkspace learner={learner} data={data} projectsReady={!readError} missionsReady={!readError} membershipsReady={!readError} onBack={() => setInfo('Directory navigation is available in the real instructor session. This fixture stays on Aya’s profile.')} onReview={(id, tab = 'proof') => { setOpenId(id); setReviewTab(tab); }} onAssign={() => setAssigning(true)} onEdit={() => setInfo('Real portfolio editing remains available in the instructor session. This fixture does not write data.')} onCreate={() => setInfo('Supported project creation remains available in the instructor session. This fixture does not create records.')} onImport={() => setInfo('Portfolio import remains available in the instructor session. This fixture does not upload files.')} notice={<>{readError && <div className="sq-desk-warning" role="alert">Synthetic data read error. Unknown counts are not empty records.<button type="button" onClick={() => setReadError(false)}>Retry learner workspace</button></div>}{info && <p role="status">{info}</p>}</>} />
    {assigning && <ProfileMissionAssignmentDialog learner={learner} data={data} templates={templates} organizationId={org} onClose={() => setAssigning(false)} onAssign={async id => { if (failure) { setFailure(false); throw new Error('Demo assignment failure. No assignment was saved. Retry this same selection now.'); } setTemplates(current => current.map(mission => mission.id === id ? { ...mission, ...buildProfileAssignmentPatch(mission, learner.id, org) } : mission)); }} />}
    {project && <ReviewWorkspace project={project} studentName={learner.name} initialTab={reviewTab} onClose={() => setOpenId('')} onReview={async command => { const updated = { ...project, ...buildReviewPatch(project, command, { uid: 'demo-instructor', role: 'instructor', organizationId: org, name: 'Demo mentor' }, new Date().toISOString()) }; setBuilds(current => current.map(build => build.id === updated.id ? updated : build)); return updated; }} />}
  </main>;
}
