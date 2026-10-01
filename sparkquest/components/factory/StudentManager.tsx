import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, UserRound, UsersRound } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { useAuth } from '../../context/AuthContext';
import type { StudentProject } from '../../types';
import { learnerDirectory, learnerMemberships, learnerWorkspace } from '../../domain/instructorLearner';
import { FactoryEmptyState, FactoryPage, FactoryPageHeader, FactoryToolbar } from './FactoryPage';
import { StudentProjectImporter } from './StudentProjectImporter';
import { StudentProjectModal } from './StudentProjectModal';
import { InstructorLearnerWorkspace, ProfileMissionAssignmentDialog } from './InstructorLearnerWorkspace';

export const StudentManager: React.FC<{ onReviewProject: (projectId: string, tab?: 'proof' | 'history') => void }> = ({ onReviewProject }) => {
  const factory = useFactoryData();
  const { userProfile } = useAuth();
  const organizationId = userProfile?.organizationId || '';
  const { studentProjects, students, availableGrades, enrollments, projectTemplates, programs, studentProjectsLoading, studentProjectsError,
    directoryLoading, directoryError, catalogLoading, catalogError, enrollmentsLoading, enrollmentsError, retryLearnerWorkspace, actions } = factory;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'standard' | 'showcase'>('standard');
  const [editingProject, setEditingProject] = useState<StudentProject | null>(null);
  useEffect(() => { setSelectedStudentId(null); setIsAssigning(false); setIsProjectModalOpen(false); setIsImporterOpen(false); setEditingProject(null); }, [organizationId]);
  const term = useDeferredValue(searchTerm).trim().toLowerCase();
  const learners = useMemo(() => learnerDirectory(students, studentProjects, organizationId), [students, studentProjects, organizationId]);
  const directoryReady = !directoryLoading && !directoryError;
  const projectsReady = !studentProjectsLoading && !studentProjectsError;
  const membershipsReady = !enrollmentsLoading && !enrollmentsError && !catalogLoading && !catalogError;
  const missionsReady = membershipsReady && directoryReady && projectsReady;
  const selectedLearner = directoryReady ? learners.find(learner => learner.id === selectedStudentId) : undefined;
  const errors = [directoryError, studentProjectsError, catalogError, enrollmentsError].filter(Boolean);
  const notice = <>{[directoryLoading, studentProjectsLoading, catalogLoading, enrollmentsLoading].some(Boolean) && <p role="status">Loading learner profiles, projects and class assignments…</p>}{errors.length > 0 && <div className="sq-desk-warning" role="alert">{errors.map((error, i) => <p key={i}>{error}</p>)}<button type="button" onClick={retryLearnerWorkspace}>Retry learner workspace</button></div>}</>;
  const openCreate = (mode: 'standard' | 'showcase') => { setEditingProject(null); setProjectModalMode(mode); setIsProjectModalOpen(true); };
  if (selectedLearner) {
    const data = learnerWorkspace(selectedLearner, projectTemplates, enrollments, programs, organizationId);
    return <>
      <InstructorLearnerWorkspace key={`${organizationId}:${selectedLearner.id}`} learner={selectedLearner} data={data} notice={notice} projectsReady={projectsReady} missionsReady={missionsReady} membershipsReady={membershipsReady}
        onBack={() => { setSelectedStudentId(null); setIsAssigning(false); }} onReview={onReviewProject}
        onEdit={project => { setEditingProject(project); setProjectModalMode('standard'); setIsProjectModalOpen(true); }} onCreate={openCreate} onImport={() => setIsImporterOpen(true)} onAssign={() => setIsAssigning(true)} />
      {isAssigning && missionsReady && <ProfileMissionAssignmentDialog learner={selectedLearner} data={data} templates={projectTemplates} organizationId={organizationId} onClose={() => setIsAssigning(false)} onAssign={missionId => actions.assignLearnerMission(missionId, selectedLearner.id, selectedLearner._source === 'user_auth' ? 'user_auth' : 'student_profile')} />}
      {isProjectModalOpen && projectsReady && <StudentProjectModal isOpen onClose={() => setIsProjectModalOpen(false)} studentId={selectedLearner.id} studentName={selectedLearner.name} initialData={editingProject} mode={projectModalMode} onSave={() => setIsProjectModalOpen(false)} />}
      {isImporterOpen && projectsReady && <StudentProjectImporter onClose={() => setIsImporterOpen(false)} onSuccess={() => setIsImporterOpen(false)} studentId={selectedLearner.id} studentName={selectedLearner.name} />}
    </>;
  }
  const filtered = learners.filter(learner => learner.name.toLowerCase().includes(term) && (!selectedGrade || membershipsReady && learnerMemberships(learner, enrollments, programs, organizationId).context.gradeIds.includes(selectedGrade)));
  const unlinked = projectsReady && directoryReady ? studentProjects.filter((project: StudentProject) => project.organizationId === organizationId && !learners.some(learner => learner.ownerIds.includes(project.studentId))).length : 0;
  return <FactoryPage className="sq-learner-desk">
    {notice}
    <FactoryPageHeader icon={UsersRound} eyebrow="Students" title="Learners, builds and next steps" description="Learners waiting for feedback appear first. Open a profile to manage missions, saved progress and review history." meta={<p>{directoryReady ? learners.length : '—'} learners · {projectsReady && directoryReady ? learners.reduce((sum, learner) => sum + learner.reviewCount, 0) : '—'} builds needing review</p>} />
    {unlinked > 0 && <p className="sq-desk-warning">{unlinked} project{unlinked === 1 ? ' has' : 's have'} no unambiguous learner link. They remain in Projects and the Review Inbox; resolve account links in Edufy instead of merging by name.</p>}
    <FactoryToolbar><label className="relative min-w-0 flex-1"><span className="sr-only">Search students</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input type="search" className="w-full !pl-10" placeholder="Search a learner" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></label><select aria-label="Filter students by grade" value={selectedGrade} disabled={!membershipsReady} onChange={event => setSelectedGrade(event.target.value)}><option value="">All grades</option>{availableGrades.map((grade: any) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></FactoryToolbar>
    {directoryReady && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(learner => <button type="button" key={learner.id} onClick={() => setSelectedStudentId(learner.id)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-blue-600">
      <div className="flex items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white">{learner.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-lg">{learner.name}</h2><p className="mt-1 text-xs text-slate-600">{membershipsReady ? learnerMemberships(learner, enrollments, programs, organizationId).placements.map(item => item.grade).join(' · ') || 'No active class' : 'Class info unavailable'}</p></div></div>
      {projectsReady && learner.reviewCount > 0 && <span className="sq-desk-badge sq-desk-badge-amber mt-4">{learner.reviewCount} build{learner.reviewCount === 1 ? '' : 's'} need review</span>}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4"><div className="text-sm"><strong className="block text-xl">{projectsReady ? learner.projectCount : '—'}</strong>Projects</div><div className="text-sm"><strong className="block text-xl text-emerald-700">{projectsReady ? learner.publishedCount : '—'}</strong>Published</div><div className="text-sm"><strong className="block text-sm">{learner.lastActive ? new Date(learner.lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</strong>Last activity</div></div>
    </button>)}{filtered.length === 0 && <FactoryEmptyState icon={UserRound} title="No learners match" description="Clear the search or choose another grade. Learner records are never inferred from names on projects." />}</div>}
  </FactoryPage>;
};
