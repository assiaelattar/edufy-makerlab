import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, Firestore } from 'firebase/firestore';
import { StudentProject, ProjectStep } from '../types';
import { UniversalEmbed } from '../components/UniversalEmbed';
import { ArrowLeft, CheckCircle, Clock, FileText, Upload, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProjectDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { studentProfile } = useAuth();
    const [project, setProject] = useState<StudentProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        const firestore = db;
        if (!firestore) return;

        const fetchProject = async () => {
            try {
                const docRef = doc(firestore, 'student_projects', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setProject({ id: snap.id, ...snap.data() } as StudentProject);
                } else {
                    setError('Project not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load project details');
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    const handleStepStatusChange = async (stepIndex: number, currentStatus: string) => {
        if (!project || !id || !db) return;

        // Simple toggle logic for demo: todo -> done -> todo
        // In real app, might need evidence submission logic
        const newStatus = currentStatus === 'done' ? 'todo' : 'done';

        const updatedSteps = [...project.steps];
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], status: newStatus as any };

        try {
            await updateDoc(doc(db, 'student_projects', id), {
                steps: updatedSteps,
                updatedAt: Timestamp.now()
            });
            setProject(prev => prev ? { ...prev, steps: updatedSteps } : null);
        } catch (e) {
            console.error("Failed to update step", e);
        }
    };

    if (loading) return <div className="p-12 text-center">Loading...</div>;
    if (error || !project) return <div className="p-12 text-center text-red-500">{error || 'Project not found'}</div>;

    const completedSteps = project.steps.filter(s => s.status === 'done' || s.approvalStatus === 'approved').length;
    const progress = Math.round((completedSteps / project.steps.length) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <button onClick={() => navigate('/projects')} className="flex items-center text-slate-500 hover:text-brand-600 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
            </button>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="relative h-48 lg:h-64 bg-slate-900">
                    <img
                        src={`https://source.unsplash.com/random/1200x400/?${project.station.replace('_', ' ')}`}
                        className="w-full h-full object-cover opacity-60"
                        alt="Project Header"
                    />
                    <div className="absolute bottom-0 left-0 p-8">
                        <span className="inline-block px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-bold mb-3 capitalize">
                            {project.station.replace('_', ' ')}
                        </span>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white">{project.title}</h1>
                    </div>
                </div>

                <div className="p-8">
                    <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                        {project.description}
                    </p>

                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-slate-900">Project Progress</h3>
                            <span className="font-bold text-brand-600">{progress}%</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-brand-500"
                            />
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Steps List */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-brand-500" />
                                Implementation Steps
                            </h3>
                            <div className="space-y-4">
                                {project.steps.map((step, idx) => (
                                    <div key={step.id} className={`p-4 rounded-xl border transition-all ${step.status === 'done' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-brand-200'}`}>
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => handleStepStatusChange(idx, step.status)}
                                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors 
                                                ${step.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-brand-500'}`}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <div>
                                                <h4 className={`font-semibold ${step.status === 'done' ? 'text-green-800' : 'text-slate-900'}`}>{step.title}</h4>
                                                {step.note && <p className="text-sm text-slate-500 mt-1">{step.note}</p>}
                                                {step.evidence && (
                                                    <a href={step.evidence} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-brand-600 mt-2 hover:underline">
                                                        <Clock className="w-3 h-3 mr-1" /> View Evidence
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Resources & Submission */}
                        <div className="space-y-8">
                            {project.embedUrl && (
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Project Workspace</h3>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                        <UniversalEmbed src={project.embedUrl} type="link" title="Workspace" />
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Upload className="w-5 h-5" /> Submit Work
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    Upload screenshots or link to your work for review.
                                </p>
                                <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition">
                                    Add Evidence
                                </button>
                            </div>

                            {project.instructorFeedback && (
                                <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
                                    <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5" /> Instructor Feedback
                                    </h3>
                                    <p className="text-sm text-yellow-700 italic">
                                        "{project.instructorFeedback}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
