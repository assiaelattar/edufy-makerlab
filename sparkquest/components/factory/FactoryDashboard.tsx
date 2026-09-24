import React, { useMemo, useState } from 'react';
import {
    ArrowRight,
    CheckCircle2,
    CircleDot,
    ClipboardCheck,
    FilePenLine,
    Rocket,
    Send,
    UsersRound,
} from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';

interface FactoryDashboardProps {
    onReviewProject: (projectId: string) => void;
    onNavigate: (view: 'projects' | 'workflows' | 'stations' | 'badges') => void;
    filterTemplateId?: string | null;
    onClearFilter?: () => void;
}

const toTime = (value: any) => {
    if (!value) return 0;
    if (value.seconds) return value.seconds * 1000;
    if (value.toDate) return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};

export const FactoryDashboard: React.FC<FactoryDashboardProps> = ({
    onReviewProject,
    onNavigate,
    filterTemplateId,
    onClearFilter,
}) => {
    const { studentProjects, students, projectTemplates } = useFactoryData();
    const [filter, setFilter] = useState<'active' | 'review' | 'published' | null>(null);

    const data = useMemo(() => {
        const pool = filterTemplateId
            ? studentProjects.filter((project: any) => project.templateId === filterTemplateId)
            : studentProjects;
        const active = pool.filter((project: any) => ['planning', 'building', 'testing'].includes(project.status));
        const review = pool.filter((project: any) =>
            project.status === 'submitted' || project.steps?.some((step: any) => step.status === 'PENDING_REVIEW')
        );
        const published = pool.filter((project: any) => project.status === 'published');
        const recent = [...pool].sort((left: any, right: any) => toTime(right.updatedAt) - toTime(left.updatedAt)).slice(0, 7);
        const draftTemplates = projectTemplates.filter((template: any) => !template.status || template.status === 'draft');
        const assignedTemplates = projectTemplates.filter((template: any) => template.status === 'assigned' || template.status === 'featured');
        return { active, review, published, recent, draftTemplates, assignedTemplates };
    }, [studentProjects, projectTemplates, filterTemplateId]);

    const selectedProjects = filter === 'active'
        ? data.active
        : filter === 'review'
            ? data.review
            : filter === 'published'
                ? data.published
                : [];

    const studentName = (project: any) => project.studentName ||
        students.find((student: any) => student.id === project.studentId || student.loginInfo?.uid === project.studentId)?.name ||
        'Learner';

    const pipeline = [
        { label: 'Draft', value: data.draftTemplates.length, icon: FilePenLine, detail: 'Ready to finish' },
        { label: 'Assigned', value: data.assignedTemplates.length, icon: Send, detail: 'Visible to learners' },
        { label: 'In progress', value: data.active.length, icon: CircleDot, detail: 'Student work' },
        { label: 'Review', value: data.review.length, icon: ClipboardCheck, detail: 'Needs instructor' },
    ];

    if (filter) {
        return (
            <div className="mx-auto max-w-[1320px] space-y-6 p-4 pb-24 sm:p-7 md:pb-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <button onClick={() => setFilter(null)} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-slate-600 transition hover:bg-white hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <ArrowRight size={18} className="rotate-180" /> Back to dispatch
                        </button>
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Student production</p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{filter === 'review' ? 'Review queue' : filter === 'published' ? 'Published work' : 'Work in progress'}</h1>
                    </div>
                    <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">{selectedProjects.length} projects</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedProjects.map((project: any) => (
                        <button key={project.id} onClick={() => onReviewProject(project.id)} className="group min-h-44 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                            <div className="flex items-center justify-between gap-3">
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-600">{project.status}</span>
                                <span className="truncate text-xs font-bold text-slate-500">{studentName(project)}</span>
                            </div>
                            <h2 className="mt-5 line-clamp-2 text-xl font-black text-slate-950 group-hover:text-blue-700">{project.title || 'Untitled mission'}</h2>
                            <span className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-bold text-slate-500"><span>Open project</span><ArrowRight size={17} /></span>
                        </button>
                    ))}
                    {selectedProjects.length === 0 && (
                        <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                            <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                            <h2 className="mt-4 text-xl font-black text-slate-900">Nothing waiting here</h2>
                            <p className="mt-1 text-sm text-slate-500">This queue is clear.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1320px] space-y-7 p-4 pb-24 sm:p-7 md:pb-8">
            <section className="overflow-hidden rounded-[28px] bg-[#10233f] text-white shadow-xl shadow-slate-900/10">
                <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300">SparkFactory · Mission operations</p>
                        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">Create once. Assign clearly. Follow every learner.</h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">The mission pipeline now uses Edufy class membership for targeting and canonical learner IDs for direct assignments.</p>
                    </div>
                    <button onClick={() => onNavigate('projects')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffb000] px-6 font-black text-slate-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#10233f]">
                        <Rocket size={19} /> Create or assign mission
                    </button>
                </div>
                <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
                    {pipeline.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className={`flex items-center gap-4 px-6 py-5 ${index ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'lg:border-t-0' : ''}`}>
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-sky-200"><Icon size={20} /></div>
                                <div><p className="text-2xl font-black leading-none">{item.value}</p><p className="mt-1 text-sm font-bold text-white">{item.label}</p><p className="text-xs text-slate-400">{item.detail}</p></div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {filterTemplateId && (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
                    <span>Showing submissions for one mission template.</span>
                    <button onClick={onClearFilter} className="min-h-10 rounded-lg px-3 hover:bg-blue-100">Clear filter</button>
                </div>
            )}

            <section className="grid gap-4 md:grid-cols-3" aria-label="Student project queues">
                {[
                    { id: 'active' as const, label: 'Active student work', value: data.active.length, note: 'Planning, building or testing', tone: 'blue' },
                    { id: 'review' as const, label: 'Needs review', value: data.review.length, note: 'Submitted or pending step', tone: 'amber' },
                    { id: 'published' as const, label: 'Published', value: data.published.length, note: 'Completed learner outcomes', tone: 'emerald' },
                ].map(card => (
                    <button key={card.id} onClick={() => setFilter(card.id)} className="group min-h-36 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                        <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-extrabold text-slate-700">{card.label}</p><p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{card.value}</p></div>
                            <ArrowRight size={19} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                        </div>
                        <p className="mt-3 text-xs font-semibold text-slate-500">{card.note}</p>
                    </button>
                ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div><h2 className="font-black text-slate-950">Review next</h2><p className="text-sm text-slate-500">Oldest waiting work should be handled first.</p></div>
                        <button onClick={() => setFilter('review')} className="min-h-10 rounded-lg px-3 text-sm font-bold text-blue-700 hover:bg-blue-50">View all</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {data.review.slice(0, 5).map((project: any) => (
                            <button key={project.id} onClick={() => onReviewProject(project.id)} className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 font-black text-amber-800">{studentName(project).charAt(0)}</span>
                                <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-950">{project.title || 'Untitled mission'}</strong><span className="block truncate text-xs font-semibold text-slate-500">{studentName(project)}</span></span>
                                <ArrowRight size={17} className="text-slate-300" />
                            </button>
                        ))}
                        {data.review.length === 0 && <p className="px-5 py-12 text-center text-sm font-semibold text-slate-500">Review queue is clear.</p>}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black text-slate-950">Recent learner activity</h2><p className="text-sm text-slate-500">Latest project updates across your organization.</p></div>
                    <div className="divide-y divide-slate-100">
                        {data.recent.slice(0, 5).map((project: any) => (
                            <button key={project.id} onClick={() => onReviewProject(project.id)} className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
                                <CircleDot size={18} className="shrink-0 text-blue-600" />
                                <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-950">{studentName(project)}</strong><span className="block truncate text-xs text-slate-500">Updated {project.title || 'a project'}</span></span>
                                <span className="text-xs font-semibold text-slate-400">{toTime(project.updatedAt) ? new Date(toTime(project.updatedAt)).toLocaleDateString() : 'Now'}</span>
                            </button>
                        ))}
                        {data.recent.length === 0 && <p className="px-5 py-12 text-center text-sm font-semibold text-slate-500">No learner activity yet.</p>}
                    </div>
                </div>
            </section>
        </div>
    );
};
