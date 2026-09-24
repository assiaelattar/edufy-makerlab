import React, { useDeferredValue, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, ExternalLink, FolderKanban, Pencil, Plus, Search, Upload, UserRound, UsersRound } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import type { ProjectTemplate, StudentProject } from '../../types';
import { FactoryEmptyState, FactoryPage, FactoryPageHeader, FactoryStat, FactoryToolbar, factoryButton } from './FactoryPage';
import { StudentProjectImporter } from './StudentProjectImporter';
import { StudentProjectModal } from './StudentProjectModal';

interface StudentManagerProps {
    onReviewProject: (projectId: string) => void;
}

const safeDate = (value: any) => {
    if (!value) return new Date(0);
    if (typeof value.toDate === 'function') return value.toDate();
    if (value.seconds) return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export const StudentManager: React.FC<StudentManagerProps> = ({ onReviewProject }) => {
    const { studentProjects, students, availableGrades, enrollments, projectTemplates, programs } = useFactoryData();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectModalMode, setProjectModalMode] = useState<'standard' | 'showcase'>('standard');
    const [editingProject, setEditingProject] = useState<StudentProject | null>(null);
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const learners = useMemo(() => {
        const map = new Map<string, any>();
        students.filter((student: any) => student._source === 'student_profile' || student.role === 'student').forEach((student: any) => {
            const enrollment = enrollments.find((item: any) => item.studentId === student.id && item.status === 'active');
            map.set(student.id, {
                id: student.id,
                name: student.name || 'Unnamed learner',
                photoURL: student.photoURL || student.avatarUrl,
                gradeId: enrollment?.gradeId || student.gradeId || student.grade,
                groupId: enrollment?.groupId || student.groupId,
                projectCount: 0,
                publishedCount: 0,
                reviewCount: 0,
                lastActive: safeDate(student.updatedAt || student.createdAt),
            });
        });

        studentProjects.forEach((project: StudentProject) => {
            const ownerId = project.studentId || (project as any).userId;
            if (!ownerId) return;
            const profile = students.find((student: any) => student.id === ownerId || student.loginInfo?.uid === ownerId);
            const enrollment = enrollments.find((item: any) => item.studentId === ownerId && item.status === 'active');
            const learner = map.get(ownerId) || {
                id: ownerId,
                name: profile?.name || project.studentName || 'Unknown learner',
                photoURL: profile?.photoURL || profile?.avatarUrl,
                gradeId: enrollment?.gradeId || project.gradeId,
                groupId: enrollment?.groupId || project.groupId,
                projectCount: 0,
                publishedCount: 0,
                reviewCount: 0,
                lastActive: new Date(0),
            };
            learner.projectCount += 1;
            if (project.status === 'published') learner.publishedCount += 1;
            if (project.status === 'submitted') learner.reviewCount += 1;
            const activeAt = safeDate(project.updatedAt || project.createdAt);
            if (activeAt > learner.lastActive) learner.lastActive = activeAt;
            map.set(ownerId, learner);
        });

        return Array.from(map.values()).sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    }, [enrollments, studentProjects, students]);

    const filteredLearners = learners.filter(learner => {
        const matchesSearch = learner.name.toLowerCase().includes(deferredSearchTerm.trim().toLowerCase());
        return matchesSearch && (!selectedGrade || learner.gradeId === selectedGrade);
    });

    const selectedLearner = learners.find(learner => learner.id === selectedStudentId);
    const selectedProjects = studentProjects.filter((project: StudentProject) => (project.studentId || (project as any).userId) === selectedStudentId);
    const gradeName = (gradeId?: string) => availableGrades.find((grade: any) => grade.id === gradeId)?.name || 'Grade not set';

    const assignedMissionCount = useMemo(() => {
        if (!selectedLearner) return 0;
        const ownerIds = [selectedLearner.id];
        const enrollment = enrollments.find((item: any) => item.studentId === selectedLearner.id && item.status === 'active');
        const groupAliases = programs.flatMap((program: any) => program.grades || [])
            .flatMap((grade: any) => grade.groups || [])
            .filter((group: any) => group.id === selectedLearner.groupId)
            .flatMap((group: any) => [group.id, group.name].filter(Boolean));
        return projectTemplates.filter((template: ProjectTemplate) => {
            if (template.status !== 'assigned' && template.status !== 'featured') return false;
            const audience = template.targetAudience || {};
            if (audience.students?.length) return audience.students.some(id => ownerIds.includes(id));
            if (audience.grades?.length && !audience.grades.includes(selectedLearner.gradeId)) return false;
            if (audience.groups?.length) return audience.groups.some(group => groupAliases.includes(group) || group === enrollment?.groupName);
            return Boolean(audience.grades?.length);
        }).length;
    }, [enrollments, programs, projectTemplates, selectedLearner]);

    const openCreate = (mode: 'standard' | 'showcase') => {
        setEditingProject(null);
        setProjectModalMode(mode);
        setIsProjectModalOpen(true);
    };

    const openEdit = (event: React.MouseEvent, project: StudentProject) => {
        event.stopPropagation();
        setEditingProject(project);
        setProjectModalMode('standard');
        setIsProjectModalOpen(true);
    };

    if (selectedLearner) return (
        <FactoryPage>
            <FactoryPageHeader
                icon={UserRound}
                eyebrow="Learner portfolio"
                title={selectedLearner.name}
                description={`${gradeName(selectedLearner.gradeId)} · Review progress, add instructor-supported work, or open a submission.`}
                actions={<>
                    <button type="button" onClick={() => setSelectedStudentId(null)} className={factoryButton.secondary}><ArrowLeft size={17} /> All students</button>
                    <button type="button" onClick={() => setIsImporterOpen(true)} className={factoryButton.secondary}><Upload size={17} /> Import</button>
                    <button type="button" onClick={() => openCreate('showcase')} className={factoryButton.secondary}><Plus size={17} /> Showcase</button>
                    <button type="button" onClick={() => openCreate('standard')} className={factoryButton.primary}><Plus size={17} /> Add project</button>
                </>}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <FactoryStat label="Assigned missions" value={assignedMissionCount} tone="blue" />
                <FactoryStat label="Projects" value={selectedLearner.projectCount} />
                <FactoryStat label="Needs review" value={selectedLearner.reviewCount} tone="amber" />
                <FactoryStat label="Published" value={selectedLearner.publishedCount} tone="green" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selectedProjects.map((project: StudentProject) => <article
                    key={project.id}
                    onClick={() => onReviewProject(project.id)}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                    {(project.thumbnailUrl || project.coverImage) && <div className="h-36 overflow-hidden border-b border-slate-100 bg-slate-100"><img src={project.thumbnailUrl || project.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /></div>}
                    <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${project.status === 'published' ? 'bg-emerald-50 text-emerald-700' : project.status === 'submitted' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{project.status}</span>
                            <button type="button" onClick={event => openEdit(event, project)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-blue-700" aria-label={`Edit ${project.title}`}><Pencil size={16} /></button>
                        </div>
                        <h2 className="mt-3 text-lg font-black leading-snug text-slate-950">{project.title || 'Untitled project'}</h2>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{project.description || 'No description has been added.'}</p>
                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> {safeDate(project.updatedAt || project.createdAt).getTime() ? safeDate(project.updatedAt || project.createdAt).toLocaleDateString() : 'New'}</span>
                            {project.presentationUrl && <a href={project.presentationUrl} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-blue-700 hover:bg-blue-50"><ExternalLink size={14} /> Open link</a>}
                        </div>
                    </div>
                </article>)}
                {selectedProjects.length === 0 && <FactoryEmptyState icon={FolderKanban} title="No projects yet" description="Add a project for this learner or wait for them to begin an assigned mission." action={<button type="button" onClick={() => openCreate('standard')} className={factoryButton.primary}><Plus size={17} /> Add first project</button>} />}
            </div>

            {isProjectModalOpen && <StudentProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} studentId={selectedLearner.id} studentName={selectedLearner.name} initialData={editingProject} mode={projectModalMode} onSave={() => setIsProjectModalOpen(false)} />}
            {isImporterOpen && <StudentProjectImporter onClose={() => setIsImporterOpen(false)} onSuccess={() => setIsImporterOpen(false)} studentId={selectedLearner.id} studentName={selectedLearner.name} />}
        </FactoryPage>
    );

    return (
        <FactoryPage>
            <FactoryPageHeader
                icon={UsersRound}
                eyebrow="Students"
                title="Learner portfolios and progress"
                description="Find a learner, review their work, and see who is waiting for instructor feedback."
                meta={<div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{learners.length} learners</span><span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">{learners.reduce((sum, learner) => sum + learner.reviewCount, 0)} waiting for review</span></div>}
            />
            <FactoryToolbar>
                <label className="relative min-w-0 flex-1" aria-label="Search students">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="Search a learner" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
                </label>
                <select aria-label="Filter students by grade" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={selectedGrade} onChange={event => setSelectedGrade(event.target.value)}>
                    <option value="">All grades</option>
                    {availableGrades.map((grade: any) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                </select>
            </FactoryToolbar>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredLearners.map(learner => <button
                    type="button"
                    key={learner.id}
                    onClick={() => setSelectedStudentId(learner.id)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <div className="flex items-start gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-50 text-xl font-black text-blue-700">{learner.photoURL ? <img src={learner.photoURL} alt="" className="h-full w-full object-cover" /> : learner.name.charAt(0).toUpperCase()}</div>
                        <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-black text-slate-950 group-hover:text-blue-700">{learner.name}</h2><p className="mt-1 text-xs font-bold text-slate-500">{gradeName(learner.gradeId)}</p></div>
                        {learner.reviewCount > 0 && <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">{learner.reviewCount} review</span>}
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                        <div><p className="text-lg font-black text-slate-900">{learner.projectCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Projects</p></div>
                        <div><p className="text-lg font-black text-emerald-700">{learner.publishedCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published</p></div>
                        <div><p className="text-sm font-black text-slate-700">{learner.lastActive.getTime() ? learner.lastActive.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last active</p></div>
                    </div>
                </button>)}
                {filteredLearners.length === 0 && <FactoryEmptyState icon={UserRound} title="No learners match" description="Clear the search or choose another grade filter." />}
            </div>
        </FactoryPage>
    );
};
