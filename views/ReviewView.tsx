import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle, MessageSquare, ChevronRight, Filter, Search, Award, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { STUDIO_THEME, studioClass } from '../utils/studioTheme';
import { formatDate } from '../utils/helpers';
import { Modal } from '../components/Modal';

export const ReviewView = () => {
    const { studentProjects, students, badges } = useAppContext();
    const { userProfile } = useAuth();

    const [filter, setFilter] = useState<'all' | 'submitted' | 'published' | 'changes_requested'>('submitted');
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');

    // Filter Logic
    const filteredProjects = useMemo(() => {
        return studentProjects.filter(p => {
            // Role Check (Admins/Instructors see all, technically this view is only for them)

            // Status Filter
            if (filter !== 'all' && p.status !== filter) return false;

            // Search
            const student = students.find(s => s.id === p.studentId);
            const searchLower = search.toLowerCase();
            const matchesSearch =
                p.title.toLowerCase().includes(searchLower) ||
                student?.name.toLowerCase().includes(searchLower);

            return matchesSearch;
        }).sort((a, b) => b.updatedAt?.toMillis() - a.updatedAt?.toMillis());
    }, [studentProjects, students, filter, search]);

    const activeProject = useMemo(() => studentProjects.find(p => p.id === selectedProject), [selectedProject, studentProjects]);
    const activeStudent = useMemo(() => students.find(s => s.id === activeProject?.studentId), [activeProject, students]);

    const handleApprove = async () => {
        if (!db || !activeProject) return;
        if (!confirm("Publish this project? This will make it visible in the student's portfolio.")) return;

        try {
            await updateDoc(doc(db, 'student_projects', activeProject.id), {
                status: 'published',
                feedback: feedback,
                reviewedBy: userProfile?.uid,
                reviewedAt: serverTimestamp()
            });
            alert("Project Published!");
            setSelectedProject(null);
            setFeedback('');
        } catch (e) {
            console.error(e);
            alert("Error publishing project");
        }
    };

    const handleRequestChanges = async () => {
        if (!db || !activeProject) return;
        if (!feedback) {
            alert("Please provide feedback explaining what changes are needed.");
            return;
        }

        try {
            await updateDoc(doc(db, 'student_projects', activeProject.id), {
                status: 'changes_requested',
                feedback: feedback,
                reviewedBy: userProfile?.uid,
                reviewedAt: serverTimestamp()
            });
            alert("Changes Requested.");
            setSelectedProject(null);
            setFeedback('');
        } catch (e) {
            console.error(e);
            alert("Error updating project");
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 pb-24 md:pb-8">

            {/* Header */}
            <div className={studioClass("p-6 border-b-2 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 rounded-[2rem] shadow-sm", STUDIO_THEME.background.card, STUDIO_THEME.border.light)}>
                <div>
                    <h2 className={studioClass("text-2xl font-black flex items-center gap-2", STUDIO_THEME.text.primary)}>
                        <CheckCircle2 size={32} className="text-emerald-500" />
                        Mission Control Center
                    </h2>
                    <p className="text-slate-500 text-sm font-medium ml-10">Review and publish student creations.</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <button onClick={() => setFilter('submitted')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'submitted' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        Queue ({studentProjects.filter(p => p.status === 'submitted').length})
                    </button>
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        All Projects
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left: List */}
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
                    {/* Search */}
                    <div className="relative shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:border-indigo-500 outline-none transition-colors"
                            placeholder="Search student or project..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic">No projects found.</div>
                        ) : (
                            filteredProjects.map(project => {
                                const s = students.find(stu => stu.id === project.studentId);
                                const isSelected = selectedProject === project.id;

                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => setSelectedProject(project.id)}
                                        className={`
                                            p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95
                                            ${isSelected
                                                ? 'bg-indigo-50 border-indigo-500 shadow-md transform scale-[1.02]'
                                                : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`
                                                px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider
                                                ${project.status === 'submitted' ? 'bg-amber-100 text-amber-600' :
                                                    project.status === 'published' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-slate-100 text-slate-500'}
                                            `}>
                                                {project.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">{formatDate(project.updatedAt)}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-1">{project.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                {s?.name.charAt(0)}
                                            </div>
                                            {s?.name}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Right: Detail View */}
                <div className={studioClass("lg:col-span-2 rounded-[2.5rem] p-8 border-2 shadow-sm flex flex-col overflow-hidden relative", STUDIO_THEME.background.card, STUDIO_THEME.border.light)}>
                    {activeProject ? (
                        <div className="flex flex-col h-full animate-in fade-in">
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20">
                                {/* Project Hero */}
                                <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                                    {activeProject.mediaUrls?.[0] && (
                                        <img src={activeProject.mediaUrls[0]} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                                        <h2 className="text-3xl font-black text-white leading-tight">{activeProject.title}</h2>
                                        <p className="text-white/80 font-medium text-sm">{activeStudent?.name}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Description</h3>
                                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {activeProject.description || "No description provided."}
                                    </p>
                                </div>

                                {/* Steps Logic (Simplified Reading) */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                        Completed Steps
                                        <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded textxs">{activeProject.steps?.filter(s => s.status === 'done').length} / {activeProject.steps?.length}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {activeProject.steps?.map((step, idx) => (
                                            <div key={idx} className={`p-3 rounded-xl border flex items-center gap-3 ${step.status === 'done' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100 opacity-60'}`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step.status === 'done' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {step.status === 'done' ? <Check size={14} /> : idx + 1}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 clamp-1">{step.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Feedback Section (Editor) */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare size={16} /> Instructor Feedback
                                    </h3>
                                    <textarea
                                        className="w-full h-32 p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all resize-none text-slate-700 text-sm"
                                        placeholder="Write helpful feedback for the student here..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Actions Footer */}
                            {activeProject.status === 'submitted' && (
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex gap-4">
                                    <button
                                        onClick={handleRequestChanges}
                                        className="flex-1 py-4 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <AlertCircle size={20} /> Request Changes
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 active:translate-y-0"
                                    >
                                        <Award size={20} /> Approve & Publish
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <Eye size={64} className="mb-4 opacity-50" />
                            <p className="font-bold text-lg">Select a project to review</p>
                            <p className="text-sm">Choose from the list on the left.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
