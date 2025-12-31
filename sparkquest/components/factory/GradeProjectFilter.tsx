import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2, Filter, ChevronRight, User, ArrowLeft, Folder, GraduationCap, Plus } from 'lucide-react';
import { ReviewModal } from './ReviewModal';

interface Project {
    id: string;
    title: string;
    status: string;
    grade?: string; // Grade ID
    templateId?: string;
    difficulty?: string;
    station?: string;
    targetAudience?: {
        grades?: string[];
        groups?: string[];
    };
}

interface ProjectTemplate {
    id: string;
    title: string;
    description?: string;
    difficulty?: string;
    station?: string;
    status?: string;
    targetAudience?: {
        grades?: string[];
        groups?: string[];
    };
}

interface Grade {
    id: string;
    name: string;
    groups?: Group[];
}

interface Group {
    id: string;
    name: string;
    day: string;
    time: string;
}

interface Program {
    id: string;
    name: string;
    type: string;
    grades: Grade[];
}

interface GradeProjectFilterProps {
    onCreateMission?: (gradeId?: string, programId?: string) => void;
}

export const GradeProjectFilter: React.FC<GradeProjectFilterProps> = ({ onCreateMission }) => {
    // State for View Mode - Added PROGRAMS view
    const [view, setView] = useState<'PROGRAMS' | 'GRADES' | 'MISSIONS' | 'STUDENTS'>('PROGRAMS');
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
    const [selectedMission, setSelectedMission] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null); // NEW: Track selected group
    const [debugInfo, setDebugInfo] = useState<string[]>([]);

    // Data State
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [studentProjects, setStudentProjects] = useState<any[]>([]); // Student submissions
    const [students, setStudents] = useState<Map<string, any>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 0. Fetch Programs with their grades
                if (!db) return;
                const programsSnap = await getDocs(collection(db, 'programs'));
                const fetchedPrograms: Program[] = [];
                programsSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.status === 'active') {
                        fetchedPrograms.push({
                            id: d.id,
                            name: data.name,
                            type: data.type || 'Regular Program',
                            grades: data.grades || []
                        });
                    }
                });
                setPrograms(fetchedPrograms);

                // 1. Fetch All Project Templates (available missions)
                const templatesSnap = await getDocs(collection(db, 'project_templates'));
                const fetchedTemplates: ProjectTemplate[] = [];
                templatesSnap.docs.forEach(d => {
                    const templateData = d.data();
                    // Only include published/assigned templates
                    if (templateData.status === 'assigned' || templateData.status === 'featured') {
                        fetchedTemplates.push({
                            id: d.id,
                            ...templateData
                        } as ProjectTemplate);

                        // Debug: Log templates with their targeting
                        if (templateData.targetAudience?.grades?.length > 0) {
                            console.log(`[Template] ${templateData.title} targets grades:`, templateData.targetAudience.grades);
                        }
                    }
                });

                // 2. Match Templates to Grades
                const merged: Project[] = [];
                const debugSet = new Set<string>();

                // Get all grades from all programs for matching
                const allGrades: Grade[] = [];
                fetchedPrograms.forEach(p => {
                    p.grades.forEach(g => allGrades.push(g));
                });

                // Map each template to its targeted grades
                fetchedTemplates.forEach(template => {
                    const grades = template.targetAudience?.grades;
                    if (grades && grades.length > 0) {
                        // Add this template to each targeted grade
                        grades.forEach(gradeId => {
                            if (allGrades.some(g => g.id === gradeId)) {
                                merged.push({
                                    id: template.id,
                                    title: template.title,
                                    status: template.status || 'assigned',
                                    grade: gradeId,
                                    templateId: template.id,
                                    difficulty: template.difficulty,
                                    station: template.station,
                                    targetAudience: template.targetAudience
                                });
                                debugSet.add(`${template.title} → Grade ${gradeId}`);
                            }
                        });
                    } else {
                        // No grade targeting - add to Uncategorized
                        merged.push({
                            id: template.id,
                            title: template.title,
                            status: template.status || 'assigned',
                            grade: 'Uncategorized',
                            templateId: template.id,
                            difficulty: template.difficulty,
                            station: template.station,
                            targetAudience: template.targetAudience
                        });
                        debugSet.add(`${template.title} → Uncategorized`);
                    }
                });

                setDebugInfo(Array.from(debugSet));
                setProjects(merged);

                // Debug summary
                console.log(`[GradeProjectFilter] Loaded:`, {
                    programs: fetchedPrograms.length,
                    templates: fetchedTemplates.length,
                    matchedMissions: merged.length
                });

                // 3. Fetch Student Projects (submissions)
                const studentProjectsSnap = await getDocs(collection(db, 'student_projects'));
                const fetchedStudentProjects = studentProjectsSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));
                setStudentProjects(fetchedStudentProjects);

                // 4. Fetch Students (for names/avatars)
                const usersSnap = await getDocs(collection(db, 'users'));
                const studentsMap = new Map();
                usersSnap.docs.forEach(d => {
                    studentsMap.set(d.id, { id: d.id, ...d.data() });
                });
                setStudents(studentsMap);
            } catch (err) {
                console.error("Error fetching grade data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []); // Fetch on mount only

    // --- DERIVED DATA & GROUPING ---

    // 1. Projects for Selected Grade
    const gradeProjects = selectedGrade
        ? projects.filter(p => p.grade === selectedGrade)
        : [];

    // 2. Missions (Groups) for Selected Grade
    const groupedMissions = React.useMemo(() => {
        // Filter by selected group if one is selected
        let filteredProjects = gradeProjects;

        if (selectedGroup) {
            // Show missions that target this specific group OR target all groups (empty/undefined)
            filteredProjects = gradeProjects.filter(p => {
                const targetGroups = p.targetAudience?.groups;

                // If no specific groups are targeted, it's for everyone -> SHOW
                if (!targetGroups || targetGroups.length === 0) return true;

                // If groups ARE targeted, check if our selected group is in the list
                // We need to match by group NAME because that's how it is stored in the template currently
                // But selectedGroup is an ID. We need to find the name of the selected group.
                const groupInfo = selectedProgram?.grades
                    .find(g => g.id === selectedGrade)?.groups
                    ?.find(grp => grp.id === selectedGroup);

                if (!groupInfo) return false; // Should not happen

                return targetGroups.includes(groupInfo.name);
            });
        }

        const groups: Record<string, Project[]> = {};
        filteredProjects.forEach(p => {
            const title = p.title.trim() || 'Untitled';
            if (!groups[title]) groups[title] = [];
            groups[title].push(p);
        });
        return Object.entries(groups).map(([title, projs]) => ({
            title,
            count: projs.length,
            completed: projs.filter(p => p.status === 'published').length,
            projects: projs // Keep refs if needed
        })).sort((a, b) => b.count - a.count);
    }, [gradeProjects, selectedGroup, selectedProgram, selectedGrade]);

    // 3. Students for Selected Mission
    const finalStudentList = useMemo(() => {
        if (!selectedMission) return [];

        // Find the template ID for this mission
        const missionTemplate = projects.find(p => p.title === selectedMission);
        if (!missionTemplate) return [];

        // Get student submissions for this template
        const submissions = studentProjects
            .filter(sp => sp.templateId === missionTemplate.templateId)
            .map(sp => {
                const student = students.get(sp.userId);
                return {
                    ...sp,
                    studentName: student?.name || 'Unknown Student',
                    avatarUrl: student?.avatarUrl || null
                };
            });

        return submissions;
    }, [selectedMission, studentProjects, students, projects]);

    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

    // --- VIEW 0: SELECT PROGRAM ---
    if (view === 'PROGRAMS') {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h2 className="text-3xl font-black text-[#2D2B6B]">Select Program</h2>
                    <p className="text-slate-500 font-medium">Choose a program to view its grades and missions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {programs.map(program => {
                        const programProjects = projects.filter(p => {
                            // Count projects that belong to this program's grades
                            return program.grades.some(g => g.id === p.grade);
                        });

                        return (
                            <button
                                key={program.id}
                                onClick={() => { setSelectedProgram(program); setView('GRADES'); }}
                                className="group relative overflow-hidden bg-white hover:bg-slate-50 border-2 border-slate-100 hover:border-indigo-300 rounded-[2rem] p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-5 group-hover:opacity-10 rounded-bl-full transition-opacity" />

                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-indigo-50 rounded-xl">
                                        <GraduationCap size={24} className="text-indigo-600" />
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                        {program.type}
                                    </span>
                                </div>

                                <h3 className="text-xl font-black text-slate-800 mb-2">{program.name}</h3>
                                <p className="text-sm text-slate-500 mb-4">{program.grades.length} Grade{program.grades.length !== 1 ? 's' : ''}</p>

                                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider bg-slate-100 w-fit px-3 py-1.5 rounded-lg">
                                    <Folder size={14} /> {programProjects.length} Projects
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- VIEW 1: SELECT GRADE ---
    if (view === 'GRADES') {
        if (!selectedProgram) {
            setView('PROGRAMS');
            return null;
        }

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Header with Back */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('PROGRAMS')} className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                            <GraduationCap size={16} /> {selectedProgram.name}
                        </div>
                        <h2 className="text-3xl font-black text-[#2D2B6B]">Select Grade Level</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {selectedProgram.grades.map(grade => {
                        const count = projects.filter(p => p.grade === grade.id).length;
                        return (
                            <button
                                key={grade.id}
                                onClick={() => { setSelectedGrade(grade.id); setView('MISSIONS'); }}
                                className="group relative overflow-hidden bg-white hover:bg-slate-50 border-2 border-slate-100 hover:border-slate-300 rounded-[2.5rem] p-8 text-left transition-all hover:-translate-y-2 hover:shadow-xl"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-5 group-hover:opacity-10 rounded-bl-full transition-opacity" />

                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform">
                                    <GraduationCap size={32} />
                                </div>

                                <h3 className="text-2xl font-black text-slate-800 mb-3">{grade.name}</h3>

                                {/* Display Groups */}
                                {grade.groups && grade.groups.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Groups:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {grade.groups.map(group => (
                                                <span
                                                    key={group.id}
                                                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 font-medium"
                                                    title={`${group.day} at ${group.time}`}
                                                >
                                                    {group.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider bg-slate-100 w-fit px-3 py-1.5 rounded-lg">
                                    <Folder size={14} /> {count} Projects
                                </div>
                            </button>
                        );
                    })}

                    {/* Uncategorized */}
                    <button
                        onClick={() => { setSelectedGrade('Uncategorized'); setView('MISSIONS'); }}
                        className="group relative overflow-hidden bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 hover:border-slate-300 rounded-[2.5rem] p-8 text-left transition-all hover:-translate-y-2 hover:shadow-xl"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-slate-400 flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform">
                            <Filter size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Uncategorized</h3>
                        <p className="text-slate-500 font-medium text-sm mb-6">Unmatched Projects</p>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider bg-white w-fit px-3 py-1.5 rounded-lg">
                            <Folder size={14} /> {projects.filter(p => p.grade === 'Uncategorized').length} Projects
                        </div>
                    </button>
                </div>

                {/* DEBUG FOOTER */}
                <div className="mt-12 p-4 bg-slate-100 rounded-xl border border-slate-300 text-xs text-slate-500 font-mono">
                    <p className="font-bold mb-2">DEBUG: Matching Logic Results:</p>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                        {debugInfo.map((info, idx) => (
                            <span key={idx} className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{info}</span>
                        ))}
                    </div>
                    <p className="font-bold mt-4 mb-2">Available Grades in {selectedProgram.name}:</p>
                    <div className="flex flex-wrap gap-2">
                        {selectedProgram.grades.map(g => (
                            <span key={g.id} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 shadow-sm">
                                {g.name} (ID: {g.id})
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW 2: SELECT MISSION (Grouped Projects) ---
    if (view === 'MISSIONS') {
        const gradeInfo = selectedProgram?.grades.find(g => g.id === selectedGrade);

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Header with Back */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('GRADES')} className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                                <GraduationCap size={16} /> {gradeInfo?.name || selectedGrade}
                            </div>
                            <h2 className="text-3xl font-black text-[#2D2B6B]">Select Mission</h2>
                        </div>
                    </div>
                    {onCreateMission && (
                        <button
                            onClick={() => onCreateMission(selectedGrade || undefined, selectedProgram?.id)}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-1"
                        >
                            <Plus size={20} />
                            Create Mission
                        </button>
                    )}
                </div>

                {/* Group Filter Badges */}
                {gradeInfo?.groups && gradeInfo.groups.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filter by Group:</p>
                        <div className="flex flex-wrap gap-2">
                            {/* All Groups */}
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedGroup === null
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                All Groups
                            </button>
                            {/* Individual Groups */}
                            {gradeInfo.groups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => setSelectedGroup(group.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedGroup === group.id
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                                        }`}
                                    title={`${group.day} at ${group.time}`}
                                >
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedGroup === group.id
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-purple-200 text-purple-700'
                                        }`}>
                                        {group.day.substring(0, 3)}
                                    </span>
                                    {group.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedMissions.map((mission) => (
                        <button
                            key={mission.title}
                            onClick={() => { setSelectedMission(mission.title); setView('STUDENTS'); }}
                            className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all text-left group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <GraduationCap size={24} className="opacity-60" />
                                </div>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <User size={12} /> {mission.count}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                {mission.title}
                            </h3>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(mission.completed / mission.count) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs font-medium text-slate-400">
                                <span>Progress</span>
                                <span>{mission.completed}/{mission.count} Done</span>
                            </div>
                        </button>
                    ))}

                    {groupedMissions.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            <p className="text-lg">No missions found for this grade.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }


    // --- VIEW 3: STUDENT LIST (Filtered Grid) ---
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header with Back */}
            <div className="flex items-center gap-4">
                <button onClick={() => setView('MISSIONS')} className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                        <span onClick={() => setView('GRADES')} className="cursor-pointer hover:underline">{selectedGrade}</span>
                        <ChevronRight size={14} />
                        <span>Mission</span>
                    </div>
                    <h2 className="text-3xl font-black text-[#2D2B6B]">{selectedMission}</h2>
                </div>
            </div>

            {finalStudentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <Folder size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-600">No Submissions Yet</h3>
                    <p className="text-slate-400 text-center max-w-sm mt-2">
                        Students haven't started this mission yet. Check back later once they begin working!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {finalStudentList.map(project => (
                        <div
                            key={project.id}
                            onClick={() => setSelectedSubmissionId(project.id)}
                            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
                        >
                            <div className="h-24 bg-slate-100 relative overflow-hidden">
                                {project.avatarUrl ? (
                                    <img src={project.avatarUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                                        <User size={32} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-2 left-3 text-white font-bold text-sm truncate w-11/12">{project.studentName}</div>
                            </div>

                            <div className="p-4">
                                <h4 className="font-bold text-slate-800 mb-1 line-clamp-1">{project.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <User size={12} /> {project.studentName}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${project.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                        project.status === 'building' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                        {project.status}
                                    </span>
                                </div>
                                {project.debugInfo && (
                                    <div className="mt-2 text-[10px] text-slate-400 font-mono bg-slate-50 p-1 rounded break-all border border-slate-100">
                                        {project.debugInfo}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal Integration */}
            {selectedSubmissionId && (
                <ReviewModal
                    projectId={selectedSubmissionId}
                    onClose={() => setSelectedSubmissionId(null)}
                />
            )}
        </div>
    );
};
