import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Star, Download, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { StudentProject, Badge } from '../types';

interface StudentPortfolioProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProject?: (projectId: string) => void;
}

export const StudentPortfolio: React.FC<StudentPortfolioProps> = ({ isOpen, onClose, onSelectProject }) => {
    const { user, userProfile } = useAuth();
    // Force Rebuild: Navigation Fix Applied
    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalXP, setTotalXP] = useState(0);
    const [level, setLevel] = useState(1);

    useEffect(() => {
        if (isOpen && user && userProfile) {
            loadPortfolioData();
        }
    }, [isOpen, user, userProfile]);

    const loadPortfolioData = async () => {
        if (!db || !user || !userProfile) return;
        setLoading(true);
        try {
            // Load completed projects
            const projectsQuery = query(
                collection(db, 'student_projects'),
                where('studentId', '==', user.uid),
                where('organizationId', '==', userProfile.organizationId || 'makerlab-academy'), // Ensure Org Scoping
                where('status', 'in', ['submitted', 'published'])
            );
            const projectsSnap = await getDocs(projectsQuery);
            const projectsData = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProject));
            setProjects(projectsData);

            // Calculate XP and Level (mock calculation)
            const xp = projectsData.length * 100; // 100 XP per project
            setTotalXP(xp);
            setLevel(Math.floor(xp / 500) + 1);

            // Load badges (mock for now)
            setBadges([]);
        } catch (err) {
            console.error('Error loading portfolio:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        alert('PDF Export feature coming soon!');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-6xl h-[90vh] bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.3)] rounded-3xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-emerald-950/50 to-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-950/50 rounded-2xl border border-emerald-500/20">
                            <Award className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">My Portfolio</h2>
                            <p className="text-sm text-slate-400">Showcase of completed projects</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-xl text-emerald-400 font-bold transition-all"
                        >
                            <Download size={18} />
                            <span className="hidden md:inline">Export PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="p-6 border-b border-slate-700/50 bg-slate-950/50">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-3xl font-black text-emerald-400">{projects.length}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Projects</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-3xl font-black text-amber-400">{totalXP}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Total XP</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-3xl font-black text-indigo-400">Level {level}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Current Level</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Award className="w-24 h-24 text-slate-700 mb-4" />
                            <h3 className="text-2xl font-bold text-slate-400 mb-2">No Completed Projects Yet</h3>
                            <p className="text-slate-500">Complete and submit projects to build your portfolio!</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Skills Section */}
                            <div>
                                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-400" />
                                    Skills Gained
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(new Set(projects.flatMap(p => p.skills || []))).map(skill => (
                                        <span key={skill} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-bold rounded-full border border-emerald-500/20">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Projects Grid */}
                            <div>
                                <h3 className="text-lg font-black text-white mb-4">Completed Projects</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {projects.map(project => (
                                        <div
                                            key={project.id}
                                            onClick={() => {
                                                console.log('🖱️ [Portfolio] Project Clicked:', project.id);
                                                console.log('🖱️ [Portfolio] onSelectProject exists?', !!onSelectProject);
                                                if (onSelectProject) {
                                                    console.log('🖱️ [Portfolio] Invoking onSelectProject...');
                                                    onSelectProject(project.id);
                                                    onClose();
                                                } else {
                                                    console.warn('⚠️ [Portfolio] onSelectProject prop IS MISSING');
                                                }
                                            }}
                                            className="group bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-emerald-500/50 transition-all overflow-hidden hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] cursor-pointer"
                                        >
                                            {/* Project Thumbnail */}
                                            <div className="aspect-video bg-gradient-to-br from-emerald-900/20 to-slate-900 flex items-center justify-center border-b border-slate-700 relative group">
                                                {(project.thumbnailUrl || project.coverImage) ? (
                                                    <img src={project.thumbnailUrl || project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-6xl">{project.station === 'robotics' ? '🤖' : project.station === 'coding' ? '💻' : '🎨'}</div>
                                                )}

                                                {/* Overlay Link */}
                                                {project.presentationUrl && (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                                        <a
                                                            href={project.presentationUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <ExternalLink size={16} />
                                                            View Project
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Project Info */}
                                            <div className="p-4">
                                                <h3 className="font-bold text-white mb-2 line-clamp-1">{project.title}</h3>
                                                <p className="text-xs text-slate-400 line-clamp-3 mb-3 whitespace-pre-wrap">{project.description}</p>

                                                {/* Stats */}
                                                <div className="flex items-center justify-between text-xs mb-3">
                                                    <span className="text-slate-500">
                                                        {project.steps?.filter(s => s.status === 'done').length || 0}/{project.steps?.length || 0} steps
                                                    </span>
                                                    <span className="text-emerald-400 font-bold">
                                                        {project.commits?.length || 0} commits
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                                                        {project.status}
                                                    </span>

                                                    {/* Explicit View Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // DEBUG: Alert to confirm click and ID
                                                            // window.alert(`Navigating to: ${project.id}`);

                                                            if (onSelectProject) {
                                                                onSelectProject(project.id);
                                                                onClose();
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg flex items-center gap-1"
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
