import React, { useDeferredValue, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Copy, Library, Plus, Search, Upload } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import type { ProjectTemplate } from '../../types';
import { getProjectIcon } from '../../utils/MindsetLibrary';
import { AssignMissionModal } from './AssignMissionModal';
import { FactoryEmptyState, FactoryPage, FactoryPageHeader, FactoryToolbar, factoryButton } from './FactoryPage';
import { ProjectEditor } from './ProjectEditor';
import { ProjectImporter } from './ProjectImporter';

interface MissionGalleryProps {
    onSelectTemplate?: (template: ProjectTemplate) => void;
    onAssign?: (template: ProjectTemplate) => void;
    mode?: 'browse' | 'select';
}

const stationTone: Record<string, string> = {
    coding: 'bg-blue-50 text-blue-700 ring-blue-200',
    robotics: 'bg-red-50 text-red-700 ring-red-200',
    design: 'bg-pink-50 text-pink-700 ring-pink-200',
    electronics: 'bg-amber-50 text-amber-800 ring-amber-200',
    mechanics: 'bg-orange-50 text-orange-800 ring-orange-200',
    general: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export const MissionGallery: React.FC<MissionGalleryProps> = ({ onSelectTemplate, onAssign, mode = 'browse' }) => {
    const { projectTemplates, programs, stations } = useFactoryData();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStation, setFilterStation] = useState('All');
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [assigningTemplate, setAssigningTemplate] = useState<ProjectTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const resolveStationName = (station: string | undefined) => {
        if (!station) return 'General';
        return stations.find((item: any) => item.id === station || item.label?.toLowerCase() === station.toLowerCase())?.label || station;
    };

    const stationLabels = useMemo(() => {
        const labels = new Set<string>(['All']);
        stations.forEach((station: any) => labels.add(station.label));
        projectTemplates.forEach((template: ProjectTemplate) => labels.add(resolveStationName(template.station)));
        return Array.from(labels);
    }, [projectTemplates, stations]);

    const filteredTemplates = useMemo(() => {
        const term = deferredSearchTerm.trim().toLowerCase();
        return projectTemplates.filter((template: ProjectTemplate) => {
            const matchesSearch = !term || [template.title, template.description, template.hook]
                .some(value => value?.toLowerCase().includes(term));
            const station = resolveStationName(template.station);
            const matchesGrade = !selectedGradeId || template.targetAudience?.grades?.includes(selectedGradeId);
            return matchesSearch && matchesGrade && (filterStation === 'All' || station.toLowerCase() === filterStation.toLowerCase());
        });
    }, [deferredSearchTerm, filterStation, projectTemplates, selectedGradeId, stations]);

    const getAssignmentLabel = (template: ProjectTemplate) => {
        if (template.status !== 'assigned' && template.status !== 'featured') return null;
        const audience = template.targetAudience || {};
        if (selectedGradeId && !audience.grades?.includes(selectedGradeId)) return null;
        if (audience.students?.length) return `${audience.students.length} learner${audience.students.length === 1 ? '' : 's'}`;
        if (audience.groups?.length) return `${audience.groups.length} group${audience.groups.length === 1 ? '' : 's'}`;
        if (audience.grades?.length) return `${audience.grades.length} grade${audience.grades.length === 1 ? '' : 's'}`;
        return template.status === 'featured' ? 'Featured' : 'Assigned';
    };

    const chooseTemplate = (template: ProjectTemplate) => {
        if (mode === 'select') {
            onSelectTemplate?.(template);
            return;
        }
        onAssign?.(template);
        setAssigningTemplate(template);
    };

    return (
        <FactoryPage>
            <FactoryPageHeader
                icon={Library}
                eyebrow="Mission library"
                title={mode === 'select' ? 'Choose a mission template' : 'Find, adapt, and dispatch a mission'}
                description={mode === 'select'
                    ? 'Start with an existing learning brief, then adapt it for your class.'
                    : 'Search the reusable mission library, check its current audience, and assign it without changing Edufy enrollments.'}
                meta={<div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{projectTemplates.length} missions</span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{stationLabels.length - 1} stations</span>
                </div>}
                actions={mode === 'browse' ? <>
                    <button type="button" onClick={() => setIsImporting(true)} className={factoryButton.secondary}><Upload size={17} /> Import CSV</button>
                    <button type="button" onClick={() => setIsCreating(true)} className={factoryButton.primary}><Plus size={17} /> New mission</button>
                </> : undefined}
            />

            <FactoryToolbar className="sm:flex-wrap lg:flex-nowrap">
                <label className="relative min-w-0 flex-1" aria-label="Search missions">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        placeholder="Search by title, hook, or description"
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                    />
                </label>
                <select
                    aria-label="Filter missions by grade"
                    value={selectedGradeId}
                    onChange={event => setSelectedGradeId(event.target.value)}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                    <option value="">All grade audiences</option>
                    {programs.map((program: any) => <optgroup key={program.id} label={program.name || program.title || 'Program'}>
                        {(program.grades || []).map((grade: any) => <option key={grade.id} value={grade.id}>{grade.name || grade.title}</option>)}
                    </optgroup>)}
                </select>
                <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Filter missions by station">
                    {stationLabels.map(station => <button
                        type="button"
                        key={station}
                        onClick={() => setFilterStation(station)}
                        className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterStation === station ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >{station}</button>)}
                </div>
            </FactoryToolbar>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((template: ProjectTemplate) => {
                    const station = resolveStationName(template.station);
                    const assignmentLabel = getAssignmentLabel(template);
                    return <article key={template.id} className="group flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
                        <div className="relative h-36 overflow-hidden border-b border-slate-100 bg-slate-100">
                            {template.thumbnailUrl ? <img src={template.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> :
                                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_55%)] text-5xl text-slate-500" aria-hidden="true">{getProjectIcon(template.title)}</div>}
                            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${stationTone[station.toLowerCase()] || stationTone.general}`}>{station}</span>
                                {assignmentLabel && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"><CheckCircle2 size={12} /> {assignmentLabel}</span>}
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                            <h2 className="text-lg font-black leading-snug text-slate-950">{template.title}</h2>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{template.description || 'No mission summary has been added yet.'}</p>
                            <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                <span className="text-xs font-bold capitalize text-slate-500">{template.difficulty || 'Flexible'} level</span>
                                <button type="button" onClick={() => chooseTemplate(template)} className={assignmentLabel && mode === 'browse' ? factoryButton.secondary : factoryButton.primary}>
                                    {mode === 'select' ? <><Copy size={16} /> Use template</> : <><Plus size={16} /> {assignmentLabel ? 'Reassign' : 'Assign'}</>}
                                </button>
                            </div>
                        </div>
                    </article>;
                })}
                {filteredTemplates.length === 0 && <FactoryEmptyState icon={BookOpen} title="No missions match these filters" description="Clear the search or choose another station or grade audience." />}
            </div>

            {assigningTemplate && <AssignMissionModal mission={assigningTemplate} onClose={() => setAssigningTemplate(null)} />}
            {isCreating && <ProjectEditor onClose={() => setIsCreating(false)} templateId={null} />}
            {isImporting && <ProjectImporter onClose={() => setIsImporting(false)} onSuccess={() => setIsImporting(false)} />}
        </FactoryPage>
    );
};
