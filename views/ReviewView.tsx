import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle, MessageSquare, ChevronRight, Filter, Search, Award, Check, ExternalLink, ArrowLeft, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { STUDIO_THEME, studioClass } from '../utils/studioTheme';
import { formatDate } from '../utils/helpers';
import { StudentProject, ProjectStep } from '../types';

const QUICK_FEEDBACKS = [
    "Great work! 🌟",
    "Excellent attention to detail.",
    "Please verify the wiring diagram.",
    "Can you explain your code comments?",
    "Image is blurry, please re-upload.",
    "Concept is good, but implementation needs work."
];

export const ReviewView = () => {
    const { studentProjects, students, navigateTo, viewParams } = useAppContext();
    const { userProfile } = useAuth();
    const isInstructor = userProfile?.role === 'instructor' || userProfile?.role === 'admin';

    // State
    const [filter, setFilter] = useState<'queue' | 'all'>('queue');
    const [search, setSearch] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');

    // --- Deep Link Logic ---
    useEffect(() => {
        const pId = viewParams?.projectId;
        if (pId && studentProjects.find(p => p.id === pId)) {
            setSelectedProjectId(pId);
        }
    }, [viewParams, studentProjects]);

    // --- Computed Data ---
    const reviewQueue = useMemo(() => {
        return studentProjects.filter(p => {
            if (filter === 'queue') {
                return p.steps?.some(s => s.status === 'PENDING_REVIEW');
            }
            return true;
        }).filter(p => {
            const st = students.find(s => s.id === p.studentId);
            const term = search.toLowerCase();
            return p.title.toLowerCase().includes(term) || st?.name.toLowerCase().includes(term);
        }).sort((a, b) => { // Safe sort
            const dateA = a.updatedAt ? (typeof (a.updatedAt as any).toDate === 'function' ? (a.updatedAt as any).toDate() : new Date(a.updatedAt as any)) : new Date(0);
            const dateB = b.updatedAt ? (typeof (b.updatedAt as any).toDate === 'function' ? (b.updatedAt as any).toDate() : new Date(b.updatedAt as any)) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [studentProjects, students, filter, search]);

    const activeProject = useMemo(() => studentProjects.find(p => p.id === selectedProjectId), [selectedProjectId, studentProjects]);
    const activeStudent = useMemo(() => students.find(s => s.id === activeProject?.studentId), [activeProject, students]);

    const pendingSteps = useMemo(() => {
        return activeProject?.steps?.filter(s => s.status === 'PENDING_REVIEW') || [];
    }, [activeProject]);


    // --- Actions ---

    const handleApproveStep = async (stepId: string) => {
        if (!db || !activeProject) return;

        try {
            const updatedSteps = activeProject.steps.map(s =>
                s.id === stepId ? { ...s, status: 'DONE', reviewedBy: userProfile?.uid, reviewedAt: new Date().toISOString() } : s
            );

            // Notify Student Logic could go here (Cloud Function or client-side write to notifications)

            await updateDoc(doc(db, 'student_projects', activeProject.id), {
                steps: updatedSteps
            });
            // Auto-advance or clear selection if no more steps?
            // For now, keep selected to show state change
            setFeedback('');
        } catch (e) {
            console.error(e);
            alert("Error approving step");
        }
    };

    const handleRejectStep = async (stepId: string) => {
        if (!db || !activeProject) return;
        if (!feedback) {
            alert("Please provide feedback for rejection.");
            return;
        }

        try {
            const updatedSteps = activeProject.steps.map(s =>
                s.id === stepId ? { ...s, status: 'REJECTED', reviewNotes: feedback, reviewedBy: userProfile?.uid, reviewedAt: new Date().toISOString() } : s
            );

            await updateDoc(doc(db, 'student_projects', activeProject.id), {
                steps: updatedSteps
            });
            setFeedback('');
        } catch (e) {
            console.error(e);
            alert("Error rejecting step");
        }
    };

    const handleDeleteProject = async () => {
        if (!db || !activeProject) return;
        if (!window.confirm("Are you sure you want to DELETE this project? This cannot be undone.")) return;

        try {
            await deleteDoc(doc(db, 'student_projects', activeProject.id));
            alert("Project deleted.");
            setSelectedProjectId(null);
        } catch (e) {
            console.error(e);
            alert("Error deleting project.");
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 pb-24 md:pb-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigateTo('dashboard')} className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-50 text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <CheckCircle2 size={32} className="text-emerald-500" />
                            Review Center
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">Verify proofs & grade submissions.</p>
                    </div>
                </div>
                <div className="flex bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                    <button onClick={() => setFilter('queue')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'queue' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Clock size={16} /> Pending Queue
                    </button>
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Filter size={16} /> All Projects
                    </button>
                </div>
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

                {/* LEFT LIST (4 Cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden bg-white/50 rounded-[2rem] border border-slate-200/50 p-4 backdrop-blur-sm">
                    {/* Search */}
                    <div className="relative shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:border-indigo-500 outline-none transition-colors"
                            placeholder="Search student or project..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {reviewQueue.length === 0 ? (
                            <div className="text-center py-20 flex flex-col items-center justify-center opacity-50">
                                <Award size={48} className="text-slate-300 mb-2" />
                                <p className="text-slate-500 font-bold">All caught up!</p>
                            </div>
                        ) : (
                            reviewQueue.map(p => {
                                const st = students.find(s => s.id === p.studentId);
                                const pendingCount = p.steps?.filter(s => s.status === 'PENDING_REVIEW').length || 0;
                                const isSelected = selectedProjectId === p.id;

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedProjectId(p.id)}
                                        className={`group p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'bg-white border-indigo-500 shadow-md scale-[1.02]' : 'bg-white border-transparent hover:border-indigo-200 hover:shadow-sm'}`}
                                    >
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>}
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <span className="font-ex-bold text-slate-700 clamp-1 leading-tight">{p.title}</span>
                                            {pendingCount > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">{pendingCount}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 pl-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                                                {st?.name.charAt(0)}
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold">{st?.name || 'Unknown'}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT DETAIL (8 Cols) */}
                <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden relative z-10">
                    {activeProject ? (
                        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                            {/* Project Header */}
                            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100 justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border-2 border-slate-200 shadow-inner">
                                        {activeProject.mediaUrls?.[0] ? <img src={activeProject.mediaUrls[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🏗️</div>}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeProject.title}</h2>
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${activeProject.status === 'published' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {activeProject.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 font-medium flex items-center gap-2">
                                            Author: <span className="font-bold text-slate-700">{activeStudent?.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDeleteProject}
                                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title="Delete Project"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            {/* PENDING SUBMISSIONS */}
                            {pendingSteps.length > 0 ? (
                                <div className="space-y-8 pb-10">
                                    {pendingSteps.map(step => (
                                        <div key={step.id} className="bg-amber-50 rounded-[2rem] p-1 border border-amber-100/50 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-white rounded-[1.8rem] p-6 border border-amber-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                                            <Eye size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reviewing Step</div>
                                                            <div className="font-black text-slate-800 text-lg">{step.title}</div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                                        Submitted {step.reviewedAt ? new Date(step.reviewedAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    {/* Evidence */}
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-400 uppercase ml-1">Evidence Provided</p>
                                                        {step.evidence ? (
                                                            <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 group relative">
                                                                <img src={step.evidence.startsWith('http') ? step.evidence : `data:image/png;base64,${step.evidence}`} className="w-full h-auto max-h-64 object-contain" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <a href={step.evidence.startsWith('http') ? step.evidence : `data:image/png;base64,${step.evidence}`} target="_blank" className="px-4 py-2 bg-white rounded-xl font-bold text-sm transform scale-95 group-hover:scale-100 transition-transform flex items-center gap-2">
                                                                        <ExternalLink size={14} /> Open Full Size
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-40 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 gap-2">
                                                                <AlertCircle size={24} />
                                                                <span className="font-bold text-sm">No visual evidence</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Student Notes */}
                                                    <div className="flex flex-col space-y-2">
                                                        <p className="text-xs font-bold text-slate-400 uppercase ml-1">Student Reflection</p>
                                                        <div className="flex-1 bg-indigo-50/50 p-4 rounded-2xl border-2 border-indigo-50 text-slate-600 font-medium italic relative">
                                                            <MessageSquare size={16} className="absolute top-4 right-4 text-indigo-200" />
                                                            "{step.note || 'No notes provided by the student.'}"
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Area */}
                                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">

                                                    {/* Quick Chips */}
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {QUICK_FEEDBACKS.map(msg => (
                                                            <button
                                                                key={msg}
                                                                onClick={() => setFeedback(prev => prev ? prev + " " + msg : msg)}
                                                                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                                            >
                                                                {msg}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="mb-4">
                                                        <textarea
                                                            className="w-full p-4 bg-white rounded-xl border-2 border-slate-200 text-sm font-medium focus:border-indigo-500 outline-none min-h-[100px] transition-all"
                                                            placeholder="Write constructive feedback here (Required for Rejection)..."
                                                            value={feedback}
                                                            onChange={e => setFeedback(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => handleRejectStep(step.id)}
                                                            className="flex-1 py-3.5 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <XCircle size={20} /> Request Revisions
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveStep(step.id)}
                                                            className="flex-[2] py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                                                        >
                                                            <CheckCircle2 size={20} /> Approve & Continue
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-gradient-to-b from-slate-50 to-white rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Award size={40} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">All Clear!</h3>
                                    <p className="text-slate-500 font-medium max-w-xs mx-auto mb-6">This project has no pending reviews. You're mostly just supervising now.</p>
                                    <button onClick={() => setFilter('queue')} className="text-indigo-600 font-bold hover:underline">Back to Queue</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Clock size={48} className="opacity-50" />
                            </div>
                            <p className="font-bold text-xl text-slate-400">Select a project to review</p>
                            <p className="text-sm font-medium opacity-70">Pick from the queue on the left</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
};
