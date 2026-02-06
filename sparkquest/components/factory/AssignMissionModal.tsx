
import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface AssignMissionModalProps {
    mission: any; // ProjectTemplate
    onClose: () => void;
}

export const AssignMissionModal: React.FC<AssignMissionModalProps> = ({ mission, onClose }) => {
    const { availableGrades, students: allStudents, enrollments, programs } = useFactoryData();
    const [selectedGradeId, setSelectedGradeId] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    // Derived state
    const studentsInGrade = React.useMemo(() => {
        if (!selectedGradeId) return [];
        console.log("🔍 [AssignMission] Filtering for Grade:", selectedGradeId);
        if (allStudents.length > 0) {
            console.log("🔍 [AssignMission] SAMPLE STUDENT STRUCTURE:", JSON.stringify(allStudents[0], null, 2));
        }

        // 1. Find all relevant IDs (Grade ID + Child Group IDs)
        const relevantIds = new Set<string>([selectedGradeId]);

        programs.forEach(p => {
            p.grades?.forEach((g: any) => {
                if (g.id === selectedGradeId) {
                    // Found the grade, add its groups
                    console.log("Found Grade in Program:", g.name, "Groups:", g.groups?.length);
                    g.groups?.forEach((grp: any) => {
                        if (grp.id) relevantIds.add(grp.id);
                        if (grp.name) relevantIds.add(grp.name);
                    });
                }
            });
        });

        console.log("🔍 [AssignMission] Relevant Target IDs:", Array.from(relevantIds));

        // 2. Filter Students
        const filtered = allStudents.filter(s => {
            // A. Check direct properties (legacy/fallback)
            const directLocationIds = [
                s.gradeId,
                s.grade,
                s.classId,
                s.sectionId,
                s.groupId,
                s.group,
                typeof s.group === 'object' ? s.group?.id : undefined
            ].filter(Boolean);

            // B. Check Enrollments (Source of Truth)
            const studentEnrollments = enrollments.filter(e => e.studentId === s.id && e.status === 'active');
            const enrollmentIds = studentEnrollments.map(e => e.gradeId).filter(Boolean);

            // Combine all possible IDs
            const allLocationIds = [...directLocationIds, ...enrollmentIds];

            // If ANY location ID matches one of our Relevant IDs
            return allLocationIds.some(loc => relevantIds.has(String(loc)));
        });

        console.log("🔍 [AssignMission] Filtered Count:", filtered.length);
        return filtered;
    }, [allStudents, selectedGradeId, programs, enrollments]);

    // Update selection when grade changes
    useEffect(() => {
        // Auto-select all students in grade by default
        setSelectedStudentIds(new Set(studentsInGrade.map(s => s.id)));
    }, [studentsInGrade]);

    const [isAssigning, setIsAssigning] = useState(false);
    const [result, setResult] = useState<{ success: number; skipped: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAssign = async () => {
        if (selectedStudentIds.size === 0) return;

        setIsAssigning(true);
        setError(null);
        setResult(null);

        try {
            const targets = studentsInGrade.filter(s => selectedStudentIds.has(s.id));

            let successCount = 0;
            let skippedCount = 0;

            // 2. For each student, check/create enrollment
            for (const student of targets) {
                // Check existing enrollment in Cache FIRST to avoid reads, 
                // but for safety we might also check the live DB or recent `enrollments` cache.
                // Let's use the local `enrollments` cache for speed + DB check for robustness if needed.
                // Actually, relying on `enrollments` from factory data is fastest.

                const alreadyEnrolled = enrollments.some(e => e.studentId === student.id && e.programId === mission.id);

                if (alreadyEnrolled) {
                    skippedCount++;
                } else {
                    // Double check with query? No, let's trust cache + maybe a quick query if critical. 
                    // To be safe and avoid duplicates if cache is stale:
                    const qEnroll = query(
                        collection(db, 'enrollments'),
                        where('studentId', '==', student.id),
                        where('programId', '==', mission.id)
                    );
                    const enrollSnap = await getDocs(qEnroll);

                    if (!enrollSnap.empty) {
                        skippedCount++;
                    } else {
                        // Create Enrollment
                        // Resolve Name: Priority Use Name, then First Name, then 'Unknown'
                        const nameToUse = student.name || student.firstName || student.displayName || 'Unknown Maker';

                        await addDoc(collection(db, 'enrollments'), {
                            studentId: student.id, // This is the ID from the student doc (could be Auth UID or Profile AutoID)
                            studentEmail: student.email || '',
                            studentName: nameToUse,
                            programId: mission.id,
                            programTitle: mission.title,
                            gradeId: selectedGradeId,
                            status: 'active',
                            assignedAt: Timestamp.now(),
                            progress: 0
                        });
                        successCount++;
                    }
                }
            }

            setResult({ success: successCount, skipped: skippedCount, total: targets.length });

        } catch (err: any) {
            console.error("Assignment failed:", err);
            setError(err.message || "Failed to assign mission.");
        } finally {
            setIsAssigning(false);
        }
    };

    const toggleStudent = (id: string) => {
        const next = new Set(selectedStudentIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedStudentIds(next);
    };

    const toggleAll = () => {
        if (selectedStudentIds.size === studentsInGrade.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(studentsInGrade.map(s => s.id)));
        }
    };

    // State
    const [searchTerm, setSearchTerm] = useState('');

    // Filtered Options for Grid
    const filteredPrograms = React.useMemo(() => {
        if (!searchTerm) return programs;
        const lower = searchTerm.toLowerCase();
        return programs.map(p => ({
            ...p,
            grades: p.grades?.filter((g: any) => g.name.toLowerCase().includes(lower))
        })).filter(p => p.name.toLowerCase().includes(lower) || (p.grades && p.grades.length > 0));
    }, [programs, searchTerm]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`bg-white rounded-3xl shadow-2xl w-full ${!selectedGradeId ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5 transition-all duration-500 ease-in-out`}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Assign Mission</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                <span>{mission.title}</span>
                                {selectedGradeId && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide">
                                            {availableGrades.find(g => g.id === selectedGradeId)?.name}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {selectedGradeId && !result && (
                            <button
                                onClick={() => setSelectedGradeId('')}
                                className="px-4 py-2 font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors text-sm"
                            >
                                Change Class
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all hover:rotate-90 duration-300">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {!result ? (
                        <>
                            {/* STEP 1: CLASS SELECTION GRID */}
                            {!selectedGradeId && (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    {/* Search Bar */}
                                    <div className="relative max-w-xl mx-auto group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Users size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search for a class, program, or group..."
                                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm group-hover:shadow-md"
                                        />
                                    </div>

                                    {/* Programs Grid */}
                                    <div className="space-y-12">
                                        {filteredPrograms.length === 0 ? (
                                            <div className="text-center py-12 opacity-50">
                                                <p className="font-bold text-slate-400">No classes found matching "{searchTerm}"</p>
                                            </div>
                                        ) : (
                                            filteredPrograms.map((prog: any, index: number) => {
                                                // Program Header Color (Keep random/preset for separation)
                                                const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];
                                                const progThemeColor = prog.themeColor || PRESET_COLORS[index % PRESET_COLORS.length];

                                                return (
                                                    <div key={prog.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <div className="h-8 w-1 rounded-full" style={{ backgroundColor: progThemeColor }} />
                                                            <h4
                                                                className="text-lg font-black uppercase tracking-tight"
                                                                style={{ color: progThemeColor }}
                                                            >
                                                                {prog.name || prog.title || "Untitled Program"}
                                                            </h4>
                                                            <div className="h-px bg-slate-100 flex-1" />
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                            {prog.grades && prog.grades.length > 0 ? (
                                                                prog.grades.map((g: any) => {
                                                                    // Resolve Grade-Specific Theme Color
                                                                    const name = (g.name || '').toLowerCase();
                                                                    let gradeColor = progThemeColor; // Fallback to program color

                                                                    if (name.includes('tiny') || name.includes('mini')) gradeColor = '#ec4899'; // Pink
                                                                    else if (name.includes('junior') || name.includes('découverte')) gradeColor = '#f59e0b'; // Amber
                                                                    else if (name.includes('explorer') || name.includes('explorateur')) gradeColor = '#10b981'; // Emerald
                                                                    else if (name.includes('ranger') || name.includes('voyager')) gradeColor = '#0ea5e9'; // Sky
                                                                    else if (name.includes('maker') || name.includes('champion')) gradeColor = '#8b5cf6'; // Violet
                                                                    else if (name.includes('tech') || name.includes('code')) gradeColor = '#6366f1'; // Indigo

                                                                    return (
                                                                        <button
                                                                            key={g.id}
                                                                            onClick={() => setSelectedGradeId(g.id)}
                                                                            className="group relative bg-white border rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                                                                            style={{
                                                                                borderColor: `${gradeColor}40`,
                                                                                backgroundColor: '#ffffff'
                                                                            }}
                                                                        >
                                                                            {/* Hover Fill Effect */}
                                                                            <div
                                                                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                                                                                style={{ backgroundColor: gradeColor }}
                                                                            />

                                                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                                                <div
                                                                                    className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110"
                                                                                    style={{
                                                                                        backgroundColor: `${gradeColor}15`,
                                                                                        color: gradeColor
                                                                                    }}
                                                                                >
                                                                                    <Users size={24} />
                                                                                </div>
                                                                            </div>
                                                                            <h5
                                                                                className="text-xl font-black mb-1 text-slate-800"
                                                                            >
                                                                                {g.name || g.title || g.id}
                                                                            </h5>
                                                                            <p
                                                                                className="text-xs font-bold uppercase tracking-wider"
                                                                                style={{ color: `${gradeColor}90` }}
                                                                            >
                                                                                {g.groups?.length || 0} Groups
                                                                            </p>
                                                                        </button>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="col-span-full p-6 border-2 border-dashed border-slate-100 rounded-3xl text-center bg-slate-50/50">
                                                                    <p className="text-slate-400 font-bold">No active classes in this program.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: STUDENT SELECTION LIST */}
                            {selectedGradeId && (
                                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 pb-4 border-b border-slate-200">
                                        <div>
                                            <h4 className="text-2xl font-black text-slate-800">Who is this for?</h4>
                                            <p className="text-slate-500 font-medium">Select students to receive this mission.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-slate-400">
                                                {selectedStudentIds.size} / {studentsInGrade.length} Selected
                                            </span>
                                            <button
                                                onClick={toggleAll}
                                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded-xl text-sm font-black transition-colors"
                                            >
                                                {selectedStudentIds.size === studentsInGrade.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {studentsInGrade.length === 0 ? (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50">
                                                <Users size={48} className="text-slate-300 mb-4" />
                                                <p className="text-lg font-bold text-slate-500">No students found.</p>
                                                <p className="text-sm text-slate-400">Try selecting a different class.</p>
                                            </div>
                                        ) : (
                                            studentsInGrade.map(s => {
                                                const isEnrolled = enrollments.some(e => e.studentId === s.id && e.programId === mission.id);
                                                const isSelected = selectedStudentIds.has(s.id);

                                                return (
                                                    <div key={s.id}
                                                        onClick={() => !isEnrolled && toggleStudent(s.id)}
                                                        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 group cursor-pointer overflow-hidden ${isEnrolled
                                                            ? 'bg-slate-50 border-slate-100 opacity-60 grayscale'
                                                            : isSelected
                                                                ? 'bg-indigo-50/50 border-indigo-600 shadow-lg shadow-indigo-500/10'
                                                                : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md'
                                                            }`}
                                                    >
                                                        {isSelected && !isEnrolled && (
                                                            <div className="absolute top-0 right-0 p-1 bg-indigo-600 rounded-bl-xl text-white">
                                                                <CheckCircle size={14} />
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                                {(s.name || s.firstName || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                                    {s.name || s.firstName || 'Unknown'}
                                                                </p>
                                                                <p className="text-xs text-slate-400 font-mono truncate opacity-80">
                                                                    {s.email}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {isEnrolled && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                                                                <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full shadow-sm">
                                                                    ASSIGNED
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {error && (
                                        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 animate-in slide-in-from-bottom-4 z-[60]">
                                            <AlertCircle size={18} />
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 flex flex-col items-center justify-center h-full animate-in zoom-in duration-500">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                                <div className="relative w-32 h-32 bg-gradient-to-tr from-green-400 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
                                    <CheckCircle size={64} />
                                </div>
                            </div>
                            <h4 className="text-4xl font-black text-slate-800 mb-2">Details Sent! 🚀</h4>
                            <p className="text-lg text-slate-500 font-medium max-w-sm">
                                The mission <span className="text-slate-800 font-bold">"{mission.title}"</span> has been successfully assigned.
                            </p>

                            <div className="grid grid-cols-2 gap-6 w-full max-w-sm mt-12">
                                <div className="bg-white p-6 rounded-3xl border-2 border-indigo-50 shadow-xl shadow-indigo-500/5">
                                    <p className="text-5xl font-black text-indigo-600 mb-2">{result.success}</p>
                                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Students Assigned</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                                    <p className="text-5xl font-black text-slate-400 mb-2">{result.skipped}</p>
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Already Has It</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-sm z-20">
                    {!result ? (
                        <div className="flex gap-4">
                            {selectedGradeId ? (
                                <>
                                    <button
                                        onClick={() => setSelectedGradeId('')}
                                        className="px-6 py-4 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleAssign}
                                        disabled={selectedStudentIds.size === 0 || isAssigning}
                                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all duration-200 flex items-center justify-center gap-3 text-lg"
                                    >
                                        {isAssigning ? (
                                            <>
                                                <Loader2 className="animate-spin" size={24} />
                                                <span>Launching Mission...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Users size={24} />
                                                <span>Assign to {selectedStudentIds.size} Students</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <p className="w-full text-center text-sm font-bold text-slate-400 py-4">
                                    Select a class above to continue
                                </p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-lg"
                        >
                            Return to Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
