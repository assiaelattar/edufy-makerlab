import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, FolderKanban, GraduationCap, Loader2, Plus, UserRound, UsersRound } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import type { ProjectTemplate, StudentProject } from '../../types';
import { FactoryEmptyState, FactoryPage, FactoryPageHeader, FactoryToolbar, factoryButton } from './FactoryPage';
import { ReviewModal } from './ReviewModal';

interface GradeProjectFilterProps {
    onCreateMission?: (gradeId?: string, programId?: string) => void;
}

type View = 'PROGRAMS' | 'GRADES' | 'MISSIONS' | 'SUBMISSIONS';

const isAssigned = (template: ProjectTemplate) => template.status === 'assigned' || template.status === 'featured';

export const GradeProjectFilter: React.FC<GradeProjectFilterProps> = ({ onCreateMission }) => {
    const { programs, projectTemplates, studentProjects, students, loading } = useFactoryData();
    const [view, setView] = useState<View>('PROGRAMS');
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

    const selectedProgram = programs.find((program: any) => program.id === selectedProgramId);
    const selectedGrade = selectedProgram?.grades?.find((grade: any) => grade.id === selectedGradeId);
    const selectedGroup = selectedGrade?.groups?.find((group: any) => group.id === selectedGroupId);
    const selectedMission = projectTemplates.find((template: ProjectTemplate) => template.id === selectedMissionId);

    const missionTargetsGrade = (template: ProjectTemplate, gradeId: string) =>
        isAssigned(template) && Boolean(template.targetAudience?.grades?.includes(gradeId));

    const gradeMissions = useMemo(() => {
        if (!selectedGradeId) return [];
        return projectTemplates.filter((template: ProjectTemplate) => {
            if (!missionTargetsGrade(template, selectedGradeId)) return false;
            if (!selectedGroupId) return true;
            const groups = template.targetAudience?.groups || [];
            if (groups.length === 0) return true;
            return groups.includes(selectedGroupId) || Boolean(selectedGroup?.name && groups.includes(selectedGroup.name));
        });
    }, [projectTemplates, selectedGradeId, selectedGroupId, selectedGroup?.name]);

    const submissions = useMemo(() => {
        if (!selectedMissionId) return [];
        return studentProjects
            .filter((project: StudentProject) => project.templateId === selectedMissionId)
            .map((project: StudentProject) => {
                const ownerId = project.studentId || (project as any).userId;
                const student = students.find((item: any) => item.id === ownerId || item.loginInfo?.uid === ownerId);
                return { ...project, resolvedName: student?.name || project.studentName || 'Unknown learner', photoURL: student?.photoURL };
            });
    }, [selectedMissionId, studentProjects, students]);

    const goBack = () => {
        if (view === 'SUBMISSIONS') {
            setView('MISSIONS');
            setSelectedMissionId(null);
        } else if (view === 'MISSIONS') {
            setView('GRADES');
            setSelectedGradeId(null);
            setSelectedGroupId(null);
        } else if (view === 'GRADES') {
            setView('PROGRAMS');
            setSelectedProgramId(null);
        }
    };

    const breadcrumb = [
        selectedProgram?.name || selectedProgram?.title,
        selectedGrade?.name || selectedGrade?.title,
        selectedMission?.title,
    ].filter(Boolean);

    if (loading) return <FactoryPage><div className="grid min-h-80 place-items-center"><Loader2 className="animate-spin text-blue-600" size={36} aria-label="Loading class progress" /></div></FactoryPage>;

    return (
        <FactoryPage>
            <FactoryPageHeader
                icon={BookOpenCheck}
                eyebrow="Class progress"
                title="Follow missions from class to submission"
                description="Navigate the same program, grade, group, and mission structure used when instructors assign work."
                meta={breadcrumb.length > 0 ? <div className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-500">
                    {breadcrumb.map((item, index) => <React.Fragment key={`${item}-${index}`}>
                        {index > 0 && <ChevronRight size={14} />}
                        <span>{item}</span>
                    </React.Fragment>)}
                </div> : undefined}
                actions={view !== 'PROGRAMS' ? <button type="button" onClick={goBack} className={factoryButton.secondary}><ArrowLeft size={17} /> Back</button> : undefined}
            />

            {view === 'PROGRAMS' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {programs.map((program: any) => {
                    const grades = (program.grades || []).filter((grade: any) => !/diy|workshop/i.test(grade.name || grade.title || ''));
                    const missionCount = projectTemplates.filter((template: ProjectTemplate) => grades.some((grade: any) => missionTargetsGrade(template, grade.id))).length;
                    return <button
                        type="button"
                        key={program.id}
                        onClick={() => { setSelectedProgramId(program.id); setView('GRADES'); }}
                        className="group min-h-48 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap size={22} /></div>
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{program.type || 'Program'}</span>
                        </div>
                        <h2 className="mt-5 text-xl font-black text-slate-950 group-hover:text-blue-700">{program.name || program.title}</h2>
                        <div className="mt-4 flex gap-2 text-xs font-bold text-slate-500">
                            <span>{grades.length} grades</span><span aria-hidden="true">·</span><span>{missionCount} assigned missions</span>
                        </div>
                    </button>;
                })}
                {programs.length === 0 && <FactoryEmptyState icon={GraduationCap} title="No active programs" description="Active Edufy programs will appear here once they are connected to this organization." />}
            </div>}

            {view === 'GRADES' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(selectedProgram?.grades || []).filter((grade: any) => !/diy|workshop/i.test(grade.name || grade.title || '')).map((grade: any) => {
                    const missions = projectTemplates.filter((template: ProjectTemplate) => missionTargetsGrade(template, grade.id));
                    return <button
                        type="button"
                        key={grade.id}
                        onClick={() => { setSelectedGradeId(grade.id); setSelectedGroupId(null); setView('MISSIONS'); }}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <div className="flex items-center justify-between">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><UsersRound size={22} /></div>
                            <span className="text-xs font-black text-slate-400">{missions.length} missions</span>
                        </div>
                        <h2 className="mt-4 text-xl font-black text-slate-950 group-hover:text-blue-700">{grade.name || grade.title}</h2>
                        <p className="mt-2 text-sm text-slate-500">{grade.groups?.length || 0} class groups</p>
                        {grade.groups?.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{grade.groups.slice(0, 4).map((group: any) => <span key={group.id} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{group.name}</span>)}</div>}
                    </button>;
                })}
            </div>}

            {view === 'MISSIONS' && <>
                {selectedGrade?.groups?.length > 0 && <FactoryToolbar>
                    <span className="px-2 text-xs font-black uppercase tracking-wider text-slate-400">Group</span>
                    <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                        <button type="button" onClick={() => setSelectedGroupId(null)} className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-extrabold ${!selectedGroupId ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>All groups</button>
                        {selectedGrade.groups.map((group: any) => <button type="button" key={group.id} onClick={() => setSelectedGroupId(group.id)} className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-extrabold ${selectedGroupId === group.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{group.name}</button>)}
                    </div>
                    {onCreateMission && <button type="button" onClick={() => onCreateMission(selectedGradeId || undefined, selectedProgramId || undefined)} className={`${factoryButton.primary} sm:ml-auto`}><Plus size={17} /> Create mission</button>}
                </FactoryToolbar>}
                {(!selectedGrade?.groups?.length && onCreateMission) && <div className="flex justify-end"><button type="button" onClick={() => onCreateMission(selectedGradeId || undefined, selectedProgramId || undefined)} className={factoryButton.primary}><Plus size={17} /> Create mission</button></div>}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {gradeMissions.map((mission: ProjectTemplate) => {
                        const count = studentProjects.filter((project: StudentProject) => project.templateId === mission.id).length;
                        const published = studentProjects.filter((project: StudentProject) => project.templateId === mission.id && project.status === 'published').length;
                        return <button
                            type="button"
                            key={mission.id}
                            onClick={() => { setSelectedMissionId(mission.id); setView('SUBMISSIONS'); }}
                            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><FolderKanban size={22} /></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{count} submissions</span></div>
                            <h2 className="mt-4 line-clamp-2 text-lg font-black text-slate-950 group-hover:text-blue-700">{mission.title}</h2>
                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${count ? (published / count) * 100 : 0}%` }} /></div>
                            <div className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>Published progress</span><span>{published}/{count}</span></div>
                        </button>;
                    })}
                    {gradeMissions.length === 0 && <FactoryEmptyState icon={FolderKanban} title="No missions for this audience" description="Create a mission or change the group filter to see assignments for this grade." action={onCreateMission ? <button type="button" onClick={() => onCreateMission(selectedGradeId || undefined, selectedProgramId || undefined)} className={factoryButton.primary}><Plus size={17} /> Create mission</button> : undefined} />}
                </div>
            </>}

            {view === 'SUBMISSIONS' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {submissions.map((project: any) => <button
                    type="button"
                    key={project.id}
                    onClick={() => setSelectedSubmissionId(project.id)}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">{project.photoURL ? <img src={project.photoURL} alt="" className="h-full w-full object-cover" /> : <UserRound size={20} />}</div>
                        <div className="min-w-0"><p className="truncate font-black text-slate-900">{project.resolvedName}</p><p className="truncate text-xs font-semibold text-slate-500">{project.title}</p></div>
                        <span className={`ml-auto rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${project.status === 'published' ? 'bg-emerald-50 text-emerald-700' : project.status === 'submitted' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{project.status}</span>
                    </div>
                    <div className="px-4 py-3 text-xs font-bold text-blue-700">Open review</div>
                </button>)}
                {submissions.length === 0 && <FactoryEmptyState icon={UserRound} title="No submissions yet" description="Assigned learners will appear here after they create or submit work for this mission." />}
            </div>}

            {selectedSubmissionId && <ReviewModal projectId={selectedSubmissionId} onClose={() => setSelectedSubmissionId(null)} />}
        </FactoryPage>
    );
};
