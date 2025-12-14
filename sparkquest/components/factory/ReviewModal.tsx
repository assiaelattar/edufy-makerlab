
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { StudentProject, ProjectTemplate } from '../../types';
import { X, Check, AlertCircle, MessageSquare, ExternalLink, Award, Sparkles, Clock } from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface ReviewModalProps {
    projectId: string;
    onClose: () => void;
}

const ensureProtocol = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
};

export const ReviewModal: React.FC<ReviewModalProps> = ({ projectId, onClose }) => {
    const { studentProjects, actions } = useFactoryData();
    const project = studentProjects.find(p => p.id === projectId);

    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [feedback, setFeedback] = useState('');
    const [fetchedName, setFetchedName] = useState<string>('');
    const [awardXp, setAwardXp] = useState(50); // Default completion XP

    // Fetch student name if missing - MOVED UP TO FIX HOOK ERROR
    React.useEffect(() => {
        const fetchStudentName = async () => {
            if (project && (!project.studentName || project.studentName === 'Student' || project.studentName === 'Unknown Explorer')) {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const userSnap = await getDoc(doc(db, 'users', project.studentId));
                    if (userSnap.exists()) {
                        setFetchedName(userSnap.data().name || 'Unknown Maker');
                    }
                } catch (e) {
                    console.error("Error fetching student name:", e);
                }
            }
        };
        fetchStudentName();
    }, [project]);

    // GUARD: If no project found (yet), return null
    if (!project) return null;

    const handleAction = async (status: 'published' | 'changes_requested') => {
        if (!db) return;

        try {
            await updateDoc(doc(db, 'student_projects', projectId), {
                status,
                feedback: feedback || null,
                updatedAt: serverTimestamp(),
            });
            onClose();
        } catch (e) {
            console.error("Error updating project:", e);
            alert("Failed to submit review.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-4 border-white ring-4 ring-indigo-500/20">

                {/* Header with Playful Gradient */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-8 py-6 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm border border-indigo-100">
                                Reviewing Submission
                            </span>
                            <span className="text-indigo-300 text-sm font-bold">#{project.id.slice(0, 8)}</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{project.title}</h2>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            Maker: <span className="text-indigo-600 font-bold bg-indigo-50 px-2 rounded-md">{fetchedName || project.studentName || 'Student'}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1.5 rounded-xl border border-indigo-100 flex text-sm font-bold shadow-sm">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-5 py-2 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-5 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            >
                                History
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left: Content Area (Switchable) */}
                    <div className="flex-1 overflow-y-auto p-8 border-r border-slate-100 bg-slate-50/50">

                        {activeTab === 'overview' && (
                            <>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Submission Evidence</h3>

                                <div className="space-y-6">
                                    {/* Description */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-2">Project Description</h4>
                                        <p className="text-slate-600 leading-relaxed text-sm">
                                            {project.description || "No description provided by the student."}
                                        </p>
                                    </div>

                                    {/* Attachments */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-4">Attachments & Resources</h4>
                                        <div className="space-y-3">
                                            {project.presentationUrl && (
                                                <a
                                                    href={project.presentationUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                        <ExternalLink size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 group-hover:text-indigo-700">Presentation / Link</p>
                                                        <p className="text-xs text-slate-400 truncate max-w-xs">{project.presentationUrl}</p>
                                                    </div>
                                                    <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-indigo-400" />
                                                </a>
                                            )}

                                            {/* Step Evidence */}
                                            {project.steps.filter(s => s.status === 'PENDING_REVIEW' || s.evidence || s.note).map(step => (
                                                <div key={step.id} className={`p-4 rounded-xl border ${step.status === 'PENDING_REVIEW' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Step: {step.title}</span>
                                                        {step.status === 'PENDING_REVIEW' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!db) return;
                                                                        const updatedSteps = project.steps.map(s => s.id === step.id ? { ...s, status: 'done' } : s);
                                                                        await updateDoc(doc(db, 'student_projects', projectId), { steps: updatedSteps });
                                                                    }}
                                                                    className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1"
                                                                >
                                                                    <Check size={12} /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!db) return;
                                                                        const prompt = window.prompt("Reason for rejection:");
                                                                        if (prompt === null) return;
                                                                        const updatedSteps = project.steps.map(s => s.id === step.id ? { ...s, status: 'REJECTED', reviewNotes: prompt } : s);
                                                                        await updateDoc(doc(db, 'student_projects', projectId), { steps: updatedSteps });
                                                                    }}
                                                                    className="px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-1"
                                                                >
                                                                    <X size={12} /> Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {step.evidence ? (
                                                        step.evidence.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                            <a href={step.evidence} target="_blank" rel="noreferrer" className="block mt-2 rounded-lg overflow-hidden border border-slate-200 group relative">
                                                                <img src={step.evidence} alt={`Evidence for ${step.title}`} className="w-full h-32 object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <span className="text-white font-bold text-xs flex items-center gap-1"><ExternalLink size={14} /> View Full Image</span>
                                                                </div>
                                                            </a>
                                                        ) : (
                                                            <a href={ensureProtocol(step.evidence)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline mt-2">
                                                                <ExternalLink size={14} /> View Evidence Link
                                                            </a>
                                                        )
                                                    ) : null}
                                                    {step.note && (
                                                        <p className="text-xs text-slate-500 mt-2 italic border-l-2 border-indigo-200 pl-3">"{step.note}"</p>
                                                    )}
                                                </div>
                                            ))}

                                            {!project.presentationUrl && !project.steps.some(s => s.evidence) && (
                                                <p className="text-slate-400 italic text-sm">No external links or evidence attached.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Commit Timeline</h3>
                                <div className="relative pl-4 border-l-2 border-slate-200 space-y-8">
                                    {project.commits && project.commits.length > 0 ? (
                                        project.commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(commit => (
                                            <div key={commit.id} className="relative">
                                                <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                    <p className="text-sm font-bold text-slate-800">{commit.message}</p>
                                                    {commit.stepId && (
                                                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded">
                                                            Step {commit.stepId}
                                                        </span>
                                                    )}

                                                    {/* Proof / Link Display */}
                                                    {commit.link && (
                                                        <div className="mt-3">
                                                            {commit.link.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                                <a href={commit.link} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-slate-200">
                                                                    <img src={commit.link} alt="Proof" className="w-full h-32 object-cover transition-transform group-hover:scale-105" />
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <ExternalLink className="text-white" size={20} />
                                                                    </div>
                                                                </a>
                                                            ) : (
                                                                <a href={commit.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 transition-colors">
                                                                    <ExternalLink size={14} /> View Attached Proof
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                                                        <Clock size={12} /> {new Date(commit.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-slate-400 text-sm font-bold">No history recorded.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Grading Panel */}
                    <div className="w-full md:w-96 bg-white shrink-0 flex flex-col p-8">
                        <div className="flex-1 space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Instructor Feedback</h3>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all h-32 resize-none"
                                    placeholder="Write encouragement or required changes..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            </div>

                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Awards & XP</h3>
                                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-indigo-900">Completion XP</span>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-indigo-100">
                                            <Sparkles size={14} className="text-amber-500" />
                                            <span className="font-black text-indigo-900">{awardXp} XP</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="500"
                                        step="10"
                                        value={awardXp}
                                        onChange={(e) => setAwardXp(Number(e.target.value))}
                                        className="w-full h-2 bg-indigo-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-8 mt-8 border-t border-slate-100 space-y-3">
                            <button
                                onClick={() => handleAction('published')}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1"
                            >
                                <Check size={20} className="stroke-[3]" /> Approve & Publish
                            </button>
                            <button
                                onClick={() => handleAction('changes_requested')}
                                className="w-full py-4 bg-white border-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
                            >
                                <AlertCircle size={20} className="stroke-[3]" /> Request Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
