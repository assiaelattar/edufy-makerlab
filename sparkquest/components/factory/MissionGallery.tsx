import React, { useState } from 'react';
import { ProjectImporter } from './ProjectImporter';
import { ProjectEditor } from './ProjectEditor';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Search, Filter, BookOpen, Plus, Copy, CheckCircle, Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { getProjectIcon } from '../../utils/MindsetLibrary';
import { AssignMissionModal } from './AssignMissionModal';

interface MissionGalleryProps {
    onSelectTemplate?: (template: any) => void;
    onAssign?: (template: any) => void;
    mode?: 'browse' | 'select'; // 'select' mode is for picking a template for a new mission
}

export const MissionGallery: React.FC<MissionGalleryProps> = ({ onSelectTemplate, onAssign, mode = 'browse' }) => {
    const { projectTemplates, enrollments, programs, stations: rawStations } = useFactoryData();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStation, setFilterStation] = useState('All');
    const [selectedGradeId, setSelectedGradeId] = useState<string>('');
    const [assigningTemplate, setAssigningTemplate] = useState<any | null>(null);

    // New Feature State
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Helper to resolve Station Name from ID or Name (handles legacy data)
    const resolveStationName = (stationInfo: string | undefined): string => {
        if (!stationInfo) return 'General';
        // Check if it's an ID (compare with station.id)
        const matchedStation = rawStations.find(s => s.id === stationInfo);

        // Use 'label' because Station interface uses 'label', not 'name'
        if (matchedStation) return matchedStation.label;

        // Maybe it's already a name/label?
        // Check if stationInfo matches a known station label (case insensitive?)
        const labelMatch = rawStations.find(s => s.label?.toLowerCase() === stationInfo.toLowerCase());
        if (labelMatch) return labelMatch.label;

        return stationInfo;
    };

    // Derived filters - Use Authoritative List + "General" if used + "All"
    // We only want to show filters for stations that actually have projects?
    // Or just show all available stations (cleaner).
    // Let's show all authoritative stations.

    // We can also check which stations are actually USED in the templates to filter the list if it's too long,
    // but mapping them correctly first.
    const usedStationNames = new Set(projectTemplates.map(p => resolveStationName(p.station)));

    // Sort: All, then defined stations (by order), then any leftovers found in templates
    const stationFilterLabels = ['All'];

    // Add authoritative stations
    rawStations.forEach(s => {
        if (!stationFilterLabels.includes(s.label)) stationFilterLabels.push(s.label);
    });

    // Add any legacy/other strings found in templates that weren't IDs but aren't in the station list (e.g. "General")
    usedStationNames.forEach(name => {
        if (!stationFilterLabels.includes(name)) stationFilterLabels.push(name);
    });

    // Helper to get active enrollments for a template in a specific grade
    const getAssignmentStatus = (templateId: string) => {
        if (!selectedGradeId) return null;
        // Find students in this grade
        // Logic: Programs -> Grades -> find grade -> get students?
        // OR: filter all students?
        // Let's use the enrollments directly. Check if any enrollment matches (gradeId check on enrollment is safer if recorded)
        // Enrollments usually have: studentId, programId (which is the missionId here), status.
        // We need to know if it's assigned to *this specific grade*.
        // Students have 'gradeId' (derived in modal, but we need raw access here).
        // Let's rely on finding ONE enrollment for this mission where the student belongs to the grade.

        // 1. Find relevant students IDs in this grade
        // We don't have a direct 'getStudentsInGrade' helper here, so let's derive it or iterate.
        // Doing strictly via enrollments might be hard if enrollment doesn't store gradeId.
        // Assume enrollments has gradeId? In AssignMissionModal we saw: enrollmentIds.map(e => e.gradeId).
        // So YES, enrollments have `gradeId`.

        const count = enrollments.filter(e => e.programId === templateId && e.gradeId === selectedGradeId && e.status === 'active').length;
        return count > 0 ? { assigned: true, count } : null;
    };

    const filteredTemplates = projectTemplates.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const pStationName = resolveStationName(p.station);
        const matchesStation = filterStation === 'All' || pStationName.toLowerCase() === filterStation.toLowerCase();
        return matchesSearch && matchesStation;
    });

    // Station Colors Map
    const stationColors: Record<string, string> = {
        'Coding': '#3b82f6',
        'Robotics': '#ef4444',
        'Design': '#ec4899',
        'Electronics': '#eab308',
        'Mechanics': '#f97316',
        'General': '#8b5cf6'
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row justify-between items-end gap-6">
                <div>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <BookOpen size={40} className="text-indigo-600" />
                        {mode === 'select' ? 'Select Base Mission' : 'Mission Gallery'}
                    </h3>
                    <p className="text-slate-500 font-medium text-lg mt-2 max-w-2xl">
                        {mode === 'select'
                            ? 'Choose a template to start your new mission from.'
                            : 'Browse the library to find the perfect mission for your class.'}
                    </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Admin Actions */}
                    {mode === 'browse' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsImporting(true)}
                                className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Upload size={18} />
                                <span className="hidden sm:inline">Import CSV</span>
                            </button>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg shadow-indigo-200"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Add Mission</span>
                            </button>
                            <div className="w-px h-10 bg-slate-200 mx-2" />
                        </div>
                    )}

                    {/* Grade Selector - Premium Pill Style */}
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                        <div className="px-4 py-2 font-black text-xs uppercase tracking-widest text-slate-400">
                            Viewing For:
                        </div>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl font-bold text-slate-700 py-3 pl-4 pr-10 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none min-w-[200px]"
                        >
                            <option value="">All Grades</option>
                            {programs.map(prog => (
                                <optgroup key={prog.id} label={prog.name || prog.title || 'Program'}>
                                    {prog.grades?.map((g: any) => (
                                        <option key={g.id} value={g.id}>{g.name || g.title || g.id}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-center bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
                <div className="relative w-full xl:w-96">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <Search size={20} />
                    </div>
                    <input
                        className="w-full pl-16 pr-6 py-4 bg-transparent border-none font-bold text-lg text-slate-700 placeholder:text-slate-300 outline-none"
                        placeholder="Search mission library..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto w-full xl:w-auto p-2 no-scrollbar">
                    {stationFilterLabels.map(station => {
                        const color = stationColors[station] || stationColors['General'];
                        const isActive = filterStation === station;
                        return (
                            <button
                                key={station}
                                onClick={() => setFilterStation(station)}
                                className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2
                                    ${isActive ? 'text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                style={{
                                    backgroundColor: isActive ? color : undefined,
                                    boxShadow: isActive ? `0 8px 20px -6px ${color}80` : undefined
                                }}
                            >
                                {station !== 'All' && <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : ''}`} style={{ backgroundColor: !isActive ? color : undefined }} />}
                                {station}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Gallery Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 ${selectedGradeId ? 'border-2 border-indigo-100 rounded-3xl p-6 bg-indigo-50/30' : ''}`}>
                {filteredTemplates.map(template => {
                    const status = getAssignmentStatus(template.id);
                    const displayStation = resolveStationName(template.station);
                    const themeColor = stationColors[displayStation] || '#8b5cf6';

                    return (
                        <div
                            key={template.id}
                            className="group bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative border-2 border-transparent hover:border-slate-100"
                        >
                            {/* Card Header Illustration */}
                            <div className="h-48 relative overflow-hidden bg-slate-100">
                                {template.thumbnailUrl ? (
                                    <>
                                        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10" />
                                        <img src={template.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    </>
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-6xl opacity-30 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110"
                                        style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                                    >
                                        {getProjectIcon(template.title)}
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-black uppercase tracking-wider text-slate-800 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
                                        {displayStation}
                                    </span>
                                    {status?.assigned && (
                                        <span className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1 animate-in zoom-in">
                                            <CheckCircle size={12} /> Assigned
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h4 className="text-xl font-black text-slate-800 line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">
                                    {template.title}
                                </h4>
                                <p className="text-sm text-slate-500 line-clamp-3 mb-6 font-medium leading-relaxed">
                                    {template.description || "No description provided for this mission."}
                                </p>

                                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-3">
                                    {mode === 'select' ? (
                                        <button
                                            onClick={() => onSelectTemplate && onSelectTemplate(template)}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/20"
                                        >
                                            <Copy size={18} /> Select Template
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setAssigningTemplate(template)}
                                            className={`w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all duration-300
                                                ${status?.assigned
                                                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                    : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30'
                                                }`}
                                        >
                                            {status?.assigned ? (
                                                <>
                                                    <CheckCircle size={18} />
                                                    <span>Assigned ({status.count})</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={18} />
                                                    <span>Assign Mission</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {assigningTemplate && (
                <AssignMissionModal
                    mission={assigningTemplate}
                    onClose={() => setAssigningTemplate(null)}
                />
            )}

            {isCreating && (
                <ProjectEditor
                    onClose={() => setIsCreating(false)}
                    templateId={null} // Create Mode
                />
            )}

            {isImporting && (
                <ProjectImporter
                    onClose={() => setIsImporting(false)}
                    onSuccess={() => {
                        setIsImporting(false);
                        // Optional: Show success toast
                    }}
                />
            )}
        </div>
    );
};
