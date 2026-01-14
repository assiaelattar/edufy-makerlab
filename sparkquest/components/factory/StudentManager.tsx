import React, { useState, useMemo } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { User, Search, Award, Grid, ArrowLeft, Star, Clock, Pencil, Rocket, Plus, Trash2, ExternalLink, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { StudentProjectModal } from './StudentProjectModal';
import { StudentProjectImporter } from './StudentProjectImporter';
import { StudentProject } from '../../types';
import { db } from '../../services/firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';

interface StudentManagerProps {
    onReviewProject: (projectId: string) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ onReviewProject }) => {
    const { studentProjects, students, availableGrades, enrollments } = useFactoryData();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImporterOpen, setIsImporterOpen] = useState(false);

    // Helper for safe date parsing
    const safeDate = (val: any): Date => {
        if (!val) return new Date();
        if (val.seconds) return new Date(val.seconds * 1000); // Firestore Timestamp
        if (typeof val === 'string' || val instanceof Date) return new Date(val); // Standard JS Date
        return new Date();
    };

    // Modal State
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectModalMode, setProjectModalMode] = useState<'standard' | 'showcase'>('standard');
    const [editingProject, setEditingProject] = useState<StudentProject | null>(null);

    // ... helper functions

    const handleAddProject = () => {
        setEditingProject(null);
        setProjectModalMode('standard');
        setIsProjectModalOpen(true);
    };

    const handleAddShowcase = () => {
        setEditingProject(null);
        setProjectModalMode('showcase');
        setIsProjectModalOpen(true);
    };

    const handleEditProject = (e: React.MouseEvent, project: any) => {
        e.stopPropagation(); // Prevent opening review modal
        setEditingProject(project);
        setProjectModalMode('standard');
        setIsProjectModalOpen(true);
    };

    const handleDeleteMaker = async (e: React.MouseEvent, makerId: string, makerName: string) => {
        e.stopPropagation();

        if (!confirm(`Are you sure you want to delete ${makerName}?\n\nThis will PERMANENTLY delete:\n- The student account (if exists)\n- All ${makerName}'s projects\n\nThis action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const batch = writeBatch(db);

            // 1. Delete all projects for this student
            const projectsToDelete = studentProjects.filter(p => p.studentId === makerId);
            projectsToDelete.forEach(p => {
                const pRef = doc(db, 'student_projects', p.id);
                batch.delete(pRef);
            });

            // 2. Delete the User Document if it exists in the 'students' list
            // (Note: 'students' prop comes from 'users' collection per useFactoryData)
            const userExists = students.some(s => s.id === makerId);
            if (userExists) {
                const userRef = doc(db, 'users', makerId);
                batch.delete(userRef);
            }

            // 3. Delete Enrollment if exists
            const enrollment = enrollments.find(e => e.studentId === makerId);
            if (enrollment) {
                const enrollRef = doc(db, 'enrollments', enrollment.id);
                batch.delete(enrollRef);
            }

            await batch.commit();
            console.log(`Successfully deleted maker ${makerName} (${makerId})`);

        } catch (error) {
            console.error("Error deleting maker:", error);
            alert("Failed to delete maker. Check console for details.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleImpersonate = () => {
        if (!selectedStudentId) return;

        const student = students.find(s => s.id === selectedStudentId);
        console.log("Impersonating Student:", student);

        // Try to resolve credentials from different possible structures
        const email = student?.loginInfo?.email || student?.email;
        const uid = student?.loginInfo?.uid || student?.uid || student?.id;

        if (!email || !uid) {
            console.warn("Student missing loginInfo or email/uid:", student);
            alert("Student does not have login credentials (Email/UID missing).");
            return;
        }

        const payload = {
            uid: uid,
            email: email,
            role: 'student',
            name: student.name,
            photoURL: student.photoURL || null
        };

        try {
            // Use safer base64 encoding for Unicode support
            const json = JSON.stringify(payload);
            const bridgeToken = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode(Number('0x' + p1));
                }));
            // Use window.open to open in new tab
            const url = `${window.location.origin}/?token=${bridgeToken}`;
            window.open(url, '_blank');
        } catch (e) {
            console.error("Token generation failed", e);
            alert("Failed to generate access token.");
        }
    };

    // ... makers useMemo logic (keep existing)

    const makers = useMemo(() => {
        const map = new Map<string, {
            id: string;
            name: string;
            projectCount: number;
            completedCount: number;
            lastActive: Date;
            gradeId?: string; // Track grade
        }>();

        studentProjects.forEach(p => {
            if (!p.studentId) return;

            const existing = map.get(p.studentId);
            const pDate = safeDate(p.updatedAt);

            // Resolve Name & Grade: try project name, then lookup student list, then fallback
            let makerName: string = p.studentName || '';
            let makerGrade: string | undefined = undefined;

            const foundStudent = students.find(s => s.id === p.studentId);
            if (foundStudent) {
                if (!makerName || makerName === 'Student') makerName = foundStudent.name;
            }

            // Resolve Grade from Enrollments (Source of Truth)
            const enrollment = enrollments.find(e => e.studentId === p.studentId && e.status === 'active');
            if (enrollment) {
                makerGrade = enrollment.gradeId;
            }

            if (!makerName || makerName === 'Student') makerName = 'Unknown Maker';

            if (!existing) {
                map.set(p.studentId, {
                    id: p.studentId,
                    name: makerName,
                    projectCount: 1,
                    completedCount: p.status === 'published' ? 1 : 0,
                    lastActive: pDate,
                    gradeId: makerGrade
                });
            } else {
                existing.projectCount++;
                if (p.status === 'published') existing.completedCount++;
                if (pDate > existing.lastActive) existing.lastActive = pDate;
                // Update grade if missing
                if (!existing.gradeId && makerGrade) existing.gradeId = makerGrade;

                // CRITICAL FIX: If we have a better name now, update it!
                // (Fixes issue where first project processed was "Unknown" but later ones have names)
                if ((existing.name === 'Unknown Maker' || existing.name === 'Student') && makerName && makerName !== 'Unknown Maker' && makerName !== 'Student') {
                    existing.name = makerName;
                }
            }
        });

        // Also add students who have NO projects yet if they exist in valid students list
        // This ensures the portfolio view shows all registered students even if inactive
        students.forEach(s => {
            if (s.role === 'student' && !map.has(s.id)) {
                const enrollment = enrollments.find(e => e.studentId === s.id && e.status === 'active');
                map.set(s.id, {
                    id: s.id,
                    name: s.name,
                    projectCount: 0,
                    completedCount: 0,
                    lastActive: safeDate(s.createdAt || new Date()),
                    gradeId: enrollment?.gradeId || s.grade || s.gradeId
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    }, [studentProjects, students, enrollments]);

    const filteredMakers = makers.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = selectedGrade ? m.gradeId === selectedGrade : true;
        return matchesSearch && matchesGrade;
    });

    const selectedMaker = useMemo(() => {
        if (!selectedStudentId) return null;
        return makers.find(m => m.id === selectedStudentId);
    }, [selectedStudentId, makers]);

    // If viewing a student details
    if (selectedStudentId && selectedMaker) {
        const makerProjects = studentProjects.filter(p => p.studentId === selectedStudentId);

        return (
            <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300 relative">

                {/* Modal */}
                {isProjectModalOpen && (
                    <StudentProjectModal
                        isOpen={isProjectModalOpen}
                        onClose={() => setIsProjectModalOpen(false)}
                        studentId={selectedStudentId}
                        studentName={selectedMaker.name}
                        initialData={editingProject}
                        mode={projectModalMode}
                        onSave={() => {
                            // Refresh logic handled by Firestore subscription in useFactoryData
                            console.log("Project saved/deleted");
                        }}
                    />
                )}

                {isImporterOpen && (
                    <StudentProjectImporter
                        onClose={() => setIsImporterOpen(false)}
                        onSuccess={() => console.log('Import successful')}
                        studentId={selectedStudentId}
                        studentName={selectedMaker.name}
                    />
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setSelectedStudentId(null)}
                            className="p-3 bg-white hover:bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all hover:scale-105 shadow-sm"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-4xl font-black text-slate-800 tracking-tight">{selectedMaker.name}</h2>
                                <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30">
                                    Level {Math.floor(selectedMaker.projectCount / 2) + 1} Maker
                                </span>
                            </div>
                            <p className="text-slate-500 font-medium text-lg mt-1">Viewing full mission portfolio.</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleImpersonate}
                            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg border border-slate-700 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                            title="Login as Student"
                        >
                            <Rocket size={20} />
                            <span className="hidden sm:inline">Student View</span>
                        </button>
                        <button
                            onClick={handleAddShowcase}
                            className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-bold shadow-lg shadow-fuchsia-500/30 transition-all hover:translate-y-[-2px] flex items-center gap-2"
                        >
                            <Award size={20} />
                            <span>Showcase</span>
                        </button>
                        <button
                            onClick={() => setIsImporterOpen(true)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all hover:translate-y-[-2px] flex items-center gap-2"
                        >
                            <Upload size={20} />
                            <span>Import CSV</span>
                        </button>
                        <button
                            onClick={handleAddProject}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:translate-y-[-2px] flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span>Add Mission</span>
                        </button>
                    </div>
                </div>

                {/* Playful Stats Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative overflow-hidden bg-white p-8 rounded-3xl border-2 border-indigo-50 shadow-xl shadow-indigo-100/50 group hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 text-2xl shadow-inner">
                                <Grid size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Missions</p>
                            <p className="text-4xl font-black text-slate-800">{selectedMaker.projectCount}</p>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white p-8 rounded-3xl border-2 border-emerald-50 shadow-xl shadow-emerald-100/50 group hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 text-2xl shadow-inner">
                                <Award size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Published</p>
                            <p className="text-4xl font-black text-slate-800">{selectedMaker.completedCount}</p>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white p-8 rounded-3xl border-2 border-amber-50 shadow-xl shadow-amber-100/50 group hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 text-2xl shadow-inner">
                                <Clock size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Last Active</p>
                            <p className="text-2xl font-black text-slate-800 mt-2">{selectedMaker.lastActive.toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {makerProjects.map(p => (
                        <div
                            key={p.id}
                            onClick={() => onReviewProject(p.id)}
                            className="group bg-white rounded-3xl overflow-hidden border-2 border-slate-100 cursor-pointer hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2 transition-all duration-300 relative flex flex-col"
                        >
                            {/* Cover Image */}
                            {(p.thumbnailUrl || p.coverImage) ? (
                                <div className="h-40 w-full overflow-hidden relative border-b border-slate-100">
                                    <img
                                        src={p.thumbnailUrl || p.coverImage}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        alt={p.title}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
                                    <span className={`absolute bottom-3 left-3 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${p.status === 'published' ? 'bg-emerald-500/90 text-white' :
                                        p.status === 'submitted' ? 'bg-amber-500/90 text-white' :
                                            'bg-slate-500/90 text-white'
                                        }`}>
                                        {p.status}
                                    </span>
                                </div>
                            ) : (
                                <div className="h-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100" />
                            )}

                            <div className="p-6 flex-1 flex flex-col">
                                {/* Use different layout if no image */}
                                {!(p.thumbnailUrl || p.coverImage) && (
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                            p.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {p.status}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{p.station}</span>
                                    </div>
                                )}

                                <h4 className="font-extrabold text-slate-800 text-xl line-clamp-2 group-hover:text-indigo-600 transition-colors pr-2">
                                    {p.title || 'Untitled Mission'}
                                </h4>
                            </div>

                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-1">
                                {p.description || "No description provided."}
                            </p>

                            {p.presentationUrl && (
                                <div className="mb-4">
                                    <a
                                        href={p.presentationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border-2 border-indigo-100"
                                        title="Open Project Link"
                                    >
                                        <ExternalLink size={14} />
                                        View Project
                                    </a>
                                </div>
                            )}

                            <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed flex-1">
                                {p.description || "No description provided."}
                            </p>

                            <div className="pt-4 border-t-2 border-slate-50 flex items-center justify-between mt-auto">
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {p.updatedAt ? safeDate(p.updatedAt).toLocaleDateString() : 'New'}
                                </span>
                                <span className="text-xs font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    Review Project →
                                </span>
                            </div>
                            {/* Edit Action */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={(e) => handleEditProject(e, p)}
                                    className="p-2 bg-white/90 backdrop-blur border border-slate-200 rounded-lg hover:text-indigo-600 hover:border-indigo-300 shadow-sm"
                                    title="Edit Project"
                                >
                                    <Pencil size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                    }

                    {/* Project Count Check (Empty State) */}
                    {
                        makerProjects.length === 0 && (
                            <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <Rocket size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500">No missions started yet.</h3>
                                <button onClick={handleAddProject} className="mt-4 text-indigo-600 font-bold hover:underline">
                                    + Create First Mission
                                </button>
                            </div>
                        )
                    }
                </div >
            </div >
        );
    }
    // ... rest of component

    // Default: List Makers
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 tracking-tight mb-2">
                        Makers Portfolio
                    </h3>
                    <p className="text-slate-500 font-medium text-lg">
                        Celebrating student creativity and progress.
                    </p>
                </div>

                {/* Search & Filter */}
                <div className="flex gap-4 w-full md:w-auto">
                    {/* Grade Filter */}
                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm cursor-pointer"
                            value={selectedGrade || ''}
                            onChange={(e) => setSelectedGrade(e.target.value || null)}
                        >
                            <option value="">All Grades</option>
                            {availableGrades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Grid size={16} />
                        </div>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input
                            className="relative w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                            placeholder="Find a maker..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMakers.map((maker, index) => (
                    <div
                        key={maker.id}
                        onClick={() => setSelectedStudentId(maker.id)}
                        className="group relative bg-white rounded-3xl p-6 cursor-pointer hover:-translate-y-2 transition-all duration-300"
                    >
                        {/* Playful Background Gradient on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Border Glow */}
                        <div className="absolute inset-0 border-2 border-slate-100 rounded-3xl group-hover:border-indigo-200 transition-colors duration-300" />

                        {/* Delete Button (Added) */}
                        <button
                            onClick={(e) => handleDeleteMaker(e, maker.id, maker.name)}
                            disabled={isDeleting}
                            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur border border-red-200 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                            title="Delete Student & Projects"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="relative flex flex-col items-center text-center">
                            {/* Avatar */}
                            <div className="w-24 h-24 mb-4 relative">
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${index % 3 === 0 ? 'from-indigo-400 to-cyan-400' :
                                    index % 3 === 1 ? 'from-fuchsia-400 to-pink-400' :
                                        'from-amber-400 to-orange-400'
                                    } opacity-20 group-hover:opacity-30 blur-md transition-opacity`} />

                                <div className={`w-full h-full rounded-full bg-gradient-to-br ${index % 3 === 0 ? 'from-indigo-100 to-cyan-50' :
                                    index % 3 === 1 ? 'from-fuchsia-100 to-pink-50' :
                                        'from-amber-100 to-orange-50'
                                    } flex items-center justify-center text-3xl font-black text-slate-700 group-hover:scale-110 transition-transform duration-300 border-4 border-white shadow-sm`}>
                                    {maker.name.charAt(0)}
                                </div>

                                {/* Status Dot */}
                                <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-400 border-4 border-white rounded-full shadow-sm" title="Active" />
                            </div>

                            <h4 className="font-extrabold text-xl text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                                {maker.name}
                            </h4>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                                Level {Math.floor(maker.projectCount / 2) + 1} Maker
                            </p>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <div className="bg-white/60 p-3 rounded-2xl border border-slate-100 group-hover:border-indigo-100 group-hover:bg-white/80 transition-all">
                                    <p className="text-2xl font-black text-slate-700">{maker.projectCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Missions</p>
                                </div>
                                <div className="bg-white/60 p-3 rounded-2xl border border-slate-100 group-hover:border-indigo-100 group-hover:bg-white/80 transition-all">
                                    <p className="text-2xl font-black text-emerald-600">{maker.completedCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Published</p>
                                </div>
                            </div>

                            <div className="mt-6 w-full pt-4 border-t border-slate-100/50 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-indigo-400 transition-colors">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} /> {new Date(maker.lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span>View Portfolio →</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
