import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    GraduationCap,
    Loader2,
    Search,
    Send,
    UserRound,
    UsersRound,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import type { MissionAudienceMode } from '../../domain/missionAssignment';
import type { ProjectTemplate } from '../../types';

interface AssignMissionModalProps {
    mission: ProjectTemplate;
    onClose: () => void;
}

const scopeOptions: Array<{
    id: MissionAudienceMode;
    title: string;
    description: string;
    icon: LucideIcon;
}> = [
    { id: 'grade', title: 'Whole grade', description: 'Every active learner in one grade.', icon: GraduationCap },
    { id: 'groups', title: 'Selected groups', description: 'One or more groups inside a grade.', icon: UsersRound },
    { id: 'students', title: 'Specific students', description: 'A precise learner list, independent of class changes.', icon: UserRound },
];

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const AssignMissionModal: React.FC<AssignMissionModalProps> = ({ mission, onClose }) => {
    const { students, enrollments, programs, actions } = useFactoryData();
    const existingAudience = mission.targetAudience || {};
    const initialMode: MissionAudienceMode = existingAudience.students?.length
        ? 'students'
        : existingAudience.groups?.length
            ? 'groups'
            : 'grade';
    const initialGradeId = existingAudience.grades?.[0] || '';
    const initialProgram = programs.find((program: any) =>
        program.grades?.some((grade: any) => String(grade.id) === String(initialGradeId))
    );

    const [mode, setMode] = useState<MissionAudienceMode>(initialMode);
    const [programId, setProgramId] = useState<string>(initialProgram?.id || '');
    const [gradeId, setGradeId] = useState<string>(initialGradeId);
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set(existingAudience.groups || []));
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(existingAudience.students || []));
    const [search, setSearch] = useState('');
    const [step, setStep] = useState<'audience' | 'review' | 'done'>('audience');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activePrograms = useMemo(() => programs.filter((program: any) =>
        Array.isArray(program.grades) && program.grades.length > 0
    ), [programs]);
    const selectedProgram = activePrograms.find((program: any) => program.id === programId);
    const availableGrades = selectedProgram?.grades || [];
    const selectedGrade = availableGrades.find((grade: any) => String(grade.id) === String(gradeId));
    const availableGroups = selectedGrade?.groups || [];

    const activeEnrollments = useMemo(() => enrollments.filter((enrollment: any) =>
        normalize(enrollment.status) === 'active'
    ), [enrollments]);

    const learnerRows = useMemo(() => {
        const rows = new Map<string, any>();
        students.forEach((student: any) => {
            if (student._source === 'user_auth' && student.role && student.role !== 'student') return;
            rows.set(String(student.id), student);
        });

        activeEnrollments.forEach((enrollment: any) => {
            const linkedStudent = students.find((student: any) =>
                String(student.id) === String(enrollment.studentId) ||
                String(student.loginInfo?.uid || '') === String(enrollment.studentId)
            );
            const canonicalId = String(linkedStudent?.id || enrollment.studentId || '');
            if (!canonicalId) return;
            rows.set(canonicalId, {
                ...(rows.get(canonicalId) || {}),
                ...(linkedStudent || {}),
                id: canonicalId,
                name: linkedStudent?.name || linkedStudent?.firstName || enrollment.studentName || 'Unnamed learner',
            });
        });

        return Array.from(rows.values()).sort((left: any, right: any) =>
            String(left.name || left.firstName || '').localeCompare(String(right.name || right.firstName || ''))
        );
    }, [students, activeEnrollments]);

    const enrollmentMatchesGrade = (enrollment: any) => !gradeId ||
        [enrollment.gradeId, enrollment.gradeName].some(value => normalize(value) === normalize(gradeId) || normalize(value) === normalize(selectedGrade?.name));

    const groupMatchesSelection = (enrollment: any) => {
        if (selectedGroupIds.size === 0) return mode !== 'groups';
        const values = [enrollment.groupId, enrollment.groupName].map(normalize);
        return availableGroups.some((group: any) =>
            (selectedGroupIds.has(String(group.id)) || selectedGroupIds.has(String(group.name))) &&
            values.some(value => value === normalize(group.id) || value === normalize(group.name))
        );
    };

    const visibleLearners = useMemo(() => {
        const query = normalize(search);
        return learnerRows.filter((student: any) => {
            const memberships = activeEnrollments.filter((enrollment: any) =>
                String(enrollment.studentId) === String(student.id) ||
                String(enrollment.studentId) === String(student.loginInfo?.uid || '')
            );
            const classMatches = !gradeId || memberships.some(enrollmentMatchesGrade);
            const groupMatches = mode !== 'groups' || memberships.some(enrollment =>
                enrollmentMatchesGrade(enrollment) && groupMatchesSelection(enrollment)
            );
            const searchMatches = !query || [student.name, student.firstName, student.lastName]
                .some(value => normalize(value).includes(query));
            return classMatches && groupMatches && searchMatches;
        });
    }, [learnerRows, activeEnrollments, gradeId, selectedGrade?.name, mode, selectedGroupIds, availableGroups, search]);

    const affectedLearners = useMemo(() => {
        if (mode === 'students') return learnerRows.filter((student: any) => selectedStudentIds.has(String(student.id)));
        if (!gradeId) return [];
        return learnerRows.filter((student: any) => {
            const memberships = activeEnrollments.filter((enrollment: any) =>
                String(enrollment.studentId) === String(student.id) ||
                String(enrollment.studentId) === String(student.loginInfo?.uid || '')
            );
            return memberships.some((enrollment: any) =>
                enrollmentMatchesGrade(enrollment) && (mode === 'grade' || groupMatchesSelection(enrollment))
            );
        });
    }, [mode, gradeId, learnerRows, activeEnrollments, selectedStudentIds, selectedGroupIds, selectedGrade?.name, availableGroups]);

    const groupNames = availableGroups
        .filter((group: any) => selectedGroupIds.has(String(group.id)) || selectedGroupIds.has(String(group.name)))
        .map((group: any) => String(group.name || ''));

    const canContinue = mode === 'students'
        ? selectedStudentIds.size > 0
        : Boolean(gradeId) && (mode !== 'groups' || selectedGroupIds.size > 0);

    const chooseProgram = (nextProgramId: string) => {
        setProgramId(nextProgramId);
        setGradeId('');
        setSelectedGroupIds(new Set());
        setError(null);
    };

    const chooseGrade = (nextGradeId: string) => {
        setGradeId(nextGradeId);
        setSelectedGroupIds(new Set());
        setError(null);
    };

    const toggleGroup = (groupId: string, groupName: string) => {
        setSelectedGroupIds(current => {
            const next = new Set(current);
            if (next.has(groupId) || next.has(groupName)) {
                next.delete(groupId);
                next.delete(groupName);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const toggleStudent = (studentId: string) => {
        setSelectedStudentIds(current => {
            const next = new Set(current);
            next.has(studentId) ? next.delete(studentId) : next.add(studentId);
            return next;
        });
    };

    const handleAssign = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await actions.assignProjectTemplate(mission.id, {
                mode,
                gradeId: gradeId || undefined,
                groupIds: Array.from(selectedGroupIds),
                groupNames,
                studentIds: Array.from(selectedStudentIds),
            });
            setStep('done');
        } catch (assignError: any) {
            setError(assignError?.message || 'The mission could not be assigned. Check the audience and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const audienceLabel = mode === 'students'
        ? `${selectedStudentIds.size} selected student${selectedStudentIds.size === 1 ? '' : 's'}`
        : mode === 'groups'
            ? `${selectedGrade?.name || 'Grade'} · ${groupNames.join(', ')}`
            : selectedGrade?.name || 'Grade not selected';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="assign-mission-title">
            <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[#f8fafc] shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
                    <div className="min-w-0">
                        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Mission dispatch</p>
                        <h2 id="assign-mission-title" className="truncate text-2xl font-black tracking-tight text-slate-950">Assign “{mission.title}”</h2>
                        <p className="mt-1 text-sm text-slate-500">Choose exactly who receives this mission. Enrollments stay unchanged.</p>
                    </div>
                    <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" aria-label="Close mission assignment">
                        <X size={22} />
                    </button>
                </header>

                {step !== 'done' && (
                    <div className="grid grid-cols-2 border-b border-slate-200 bg-white px-5 sm:px-7">
                        {[
                            ['audience', '1', 'Choose audience'],
                            ['review', '2', 'Review & assign'],
                        ].map(([id, number, label]) => {
                            const active = step === id;
                            const completed = step === 'review' && id === 'audience';
                            return (
                                <div key={id} className={`flex items-center gap-3 border-b-2 py-4 ${active ? 'border-blue-600' : 'border-transparent'}`}>
                                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${active || completed ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {completed ? <Check size={15} /> : number}
                                    </span>
                                    <span className={`text-sm font-bold ${active ? 'text-slate-950' : 'text-slate-500'}`}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {step === 'audience' && (
                        <div className="space-y-7 p-5 sm:p-7">
                            <section aria-labelledby="scope-heading">
                                <div className="mb-3">
                                    <h3 id="scope-heading" className="text-lg font-black text-slate-950">How should learners be selected?</h3>
                                    <p className="text-sm text-slate-500">Direct student assignments remain valid if a learner changes group later.</p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {scopeOptions.map(option => {
                                        const Icon = option.icon;
                                        const selected = mode === option.id;
                                        return (
                                            <button key={option.id} onClick={() => { setMode(option.id); setError(null); }} className={`min-h-[118px] rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                <Icon size={22} className={selected ? 'text-blue-700' : 'text-slate-400'} />
                                                <strong className="mt-3 block text-base text-slate-950">{option.title}</strong>
                                                <span className="mt-1 block text-sm leading-5 text-slate-500">{option.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="class-filter-heading">
                                <h3 id="class-filter-heading" className="text-base font-black text-slate-950">Class context</h3>
                                <p className="mb-4 text-sm text-slate-500">{mode === 'students' ? 'Optional: filter the learner list by program and grade.' : 'Required: choose the program and grade that define this audience.'}</p>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="text-sm font-bold text-slate-700">
                                        Program {mode !== 'students' && <span className="text-red-600">*</span>}
                                        <select value={programId} onChange={event => chooseProgram(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                                            <option value="">{mode === 'students' ? 'All programs' : 'Choose a program'}</option>
                                            {activePrograms.map((program: any) => <option key={program.id} value={program.id}>{program.name || program.title}</option>)}
                                        </select>
                                    </label>
                                    <label className="text-sm font-bold text-slate-700">
                                        Grade {mode !== 'students' && <span className="text-red-600">*</span>}
                                        <select value={gradeId} onChange={event => chooseGrade(event.target.value)} disabled={!programId} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                                            <option value="">{mode === 'students' ? 'All grades' : 'Choose a grade'}</option>
                                            {availableGrades.map((grade: any) => <option key={grade.id} value={grade.id}>{grade.name || grade.title}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </section>

                            {mode === 'groups' && gradeId && (
                                <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="groups-heading">
                                    <h3 id="groups-heading" className="text-base font-black text-slate-950">Groups <span className="text-red-600">*</span></h3>
                                    <p className="mb-4 text-sm text-slate-500">Select one or more groups in {selectedGrade?.name}.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {availableGroups.map((group: any) => {
                                            const selected = selectedGroupIds.has(String(group.id)) || selectedGroupIds.has(String(group.name));
                                            return (
                                                <button key={group.id} onClick={() => toggleGroup(String(group.id), String(group.name))} className={`min-h-11 rounded-xl border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'}`}>
                                                    {selected && <Check size={15} className="mr-2 inline" />}{group.name}
                                                </button>
                                            );
                                        })}
                                        {availableGroups.length === 0 && <p className="text-sm font-medium text-amber-700">This grade has no configured groups. Use “Whole grade” or “Specific students”.</p>}
                                    </div>
                                </section>
                            )}

                            {mode === 'students' && (
                                <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="students-heading">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h3 id="students-heading" className="text-base font-black text-slate-950">Students <span className="text-red-600">*</span></h3>
                                            <p className="text-sm text-slate-500">{selectedStudentIds.size} selected · {visibleLearners.length} shown</p>
                                        </div>
                                        <label className="relative block sm:w-80">
                                            <span className="sr-only">Search students</span>
                                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search students" className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-base outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                                        </label>
                                    </div>
                                    <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                        {visibleLearners.map((student: any) => {
                                            const studentId = String(student.id);
                                            const selected = selectedStudentIds.has(studentId);
                                            const name = student.name || student.firstName || 'Unnamed learner';
                                            return (
                                                <button key={studentId} onClick={() => toggleStudent(studentId)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-400'}`}>
                                                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{String(name).charAt(0).toUpperCase()}</span>
                                                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{name}</span>
                                                    <span className={`grid h-6 w-6 place-items-center rounded-md border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{selected && <Check size={14} />}</span>
                                                </button>
                                            );
                                        })}
                                        {visibleLearners.length === 0 && <p className="col-span-full py-8 text-center text-sm font-medium text-slate-500">No learners match these filters.</p>}
                                    </div>
                                </section>
                            )}

                            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
                            <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-start gap-4">
                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><Send size={22} /></div>
                                    <div>
                                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Ready to assign</p>
                                        <h3 className="mt-1 text-2xl font-black text-slate-950">{mission.title}</h3>
                                    </div>
                                </div>
                                <dl className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                                    <div><dt className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Audience type</dt><dd className="mt-1 font-bold text-slate-900">{scopeOptions.find(option => option.id === mode)?.title}</dd></div>
                                    <div><dt className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Audience</dt><dd className="mt-1 font-bold text-slate-900">{audienceLabel}</dd></div>
                                    <div><dt className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Learners currently matched</dt><dd className="mt-1 text-3xl font-black text-blue-700">{affectedLearners.length}</dd></div>
                                    <div><dt className="text-xs font-extrabold uppercase tracking-wider text-slate-400">What changes</dt><dd className="mt-1 font-bold text-slate-900">Mission becomes assigned. Enrollments are not modified.</dd></div>
                                </dl>
                            </div>
                            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Learners see the mission after their next dashboard refresh. Specific-student assignments use canonical learner IDs and remain authoritative when class metadata changes.</p>
                            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
                            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={42} /></div>
                            <h3 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Mission assigned</h3>
                            <p className="mt-2 text-base leading-7 text-slate-600">“{mission.title}” is now available to {audienceLabel}. No enrollment records were created or changed.</p>
                            <button onClick={onClose} className="mt-8 min-h-12 rounded-xl bg-slate-950 px-7 font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Back to missions</button>
                        </div>
                    )}
                </div>

                {step !== 'done' && (
                    <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
                        <button onClick={step === 'review' ? () => setStep('audience') : onClose} className="flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            {step === 'review' && <ArrowLeft size={18} />}{step === 'review' ? 'Edit audience' : 'Cancel'}
                        </button>
                        {step === 'audience' ? (
                            <button onClick={() => setStep('review')} disabled={!canContinue} className="flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                                Review assignment <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button onClick={handleAssign} disabled={isSaving} className="flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                                {isSaving ? <Loader2 size={19} className="animate-spin" /> : <Send size={18} />}{isSaving ? 'Assigning mission…' : 'Assign mission'}
                            </button>
                        )}
                    </footer>
                )}
            </div>
        </div>
    );
};
