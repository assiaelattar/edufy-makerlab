
import React, { useMemo } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Activity, Clock, Award, Users, ArrowRight, Eye, Zap, MessageSquare, ExternalLink } from 'lucide-react';

interface FactoryDashboardProps {
    onReviewProject: (projectId: string) => void;
    onNavigate: (view: 'projects' | 'workflows' | 'stations' | 'badges') => void;
    filterTemplateId?: string | null;
    onClearFilter?: () => void;
}

export const FactoryDashboard: React.FC<FactoryDashboardProps> = ({ onReviewProject, onNavigate, filterTemplateId, onClearFilter }) => {
    const { studentProjects, students } = useFactoryData();
    const [filter, setFilter] = React.useState<'overview' | 'active' | 'review' | 'published'>('overview');

    // Calculate Stats
    const stats = useMemo(() => {
        // If filtering by template, restrict the pool
        const pool = filterTemplateId ? studentProjects.filter(p => p.templateId === filterTemplateId) : studentProjects;

        const active = pool.filter(p => ['planning', 'building', 'testing'].includes(p.status));
        const review = pool.filter(p =>
            p.status === 'submitted' ||
            p.steps?.some(s => s.status === 'PENDING_REVIEW')
        );
        const completed = pool.filter(p => p.status === 'published');

        const recent = pool
            .sort((a, b) => {
                const getDate = (d: any) => {
                    if (!d) return 0;
                    if (d.seconds) return d.seconds * 1000; // Timestamp
                    if (d.toDate) return d.toDate().getTime(); // Firestore Timestamp method
                    const date = new Date(d);
                    return !isNaN(date.getTime()) ? date.getTime() : 0;
                };
                return getDate(b.updatedAt) - getDate(a.updatedAt);
            })
            .slice(0, 5);

        return { active, review, completed, recent };
    }, [studentProjects, filterTemplateId]);

    // Force list view if filtered by template
    React.useEffect(() => {
        if (filterTemplateId) {
            setFilter('active'); // Default to showing active projects in the list
        }
    }, [filterTemplateId]);

    // Get Filtered List
    const filteredList = useMemo(() => {
        if (filter === 'active') return stats.active;
        if (filter === 'review') return stats.review;
        if (filter === 'published') return stats.completed;
        return [];
    }, [filter, stats]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    {filterTemplateId ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClearFilter}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <ArrowRight className="rotate-180 text-slate-500" size={20} />
                            </button>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Mission Submissions</h2>
                                <p className="text-slate-500 font-medium text-lg mt-1">
                                    Showing submissions for this template.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={() => setFilter('overview')}
                                className={`text-3xl font-black tracking-tight transition-colors ${filter === 'overview' ? 'text-slate-800' : 'text-slate-400 hover:text-indigo-600'}`}
                            >
                                Studio Command
                            </button>
                            <p className="text-slate-500 font-medium text-lg mt-1">
                                {filter === 'overview' ? 'Live overview of student production.' : `Showing ${filter} missions.`}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => onNavigate('projects')}
                        className="px-5 py-3 bg-white border-2 border-indigo-100 hover:border-indigo-400 text-indigo-700 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-indigo-100"
                    >
                        <Zap size={18} /> Quick Mission
                    </button>
                    <button
                        onClick={() => onNavigate('badges')}
                        className="px-5 py-3 bg-white border-2 border-amber-100 hover:border-amber-400 text-amber-700 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-amber-100"
                    >
                        <Award size={18} /> New Batch
                    </button>
                    <button
                        onClick={() => onNavigate('stations')}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-1"
                    >
                        <Users size={18} /> Manage Stations
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => setFilter('active')}
                    className={`p-6 rounded-2xl border-2 shadow-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-1 ${filter === 'active' ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-100 shadow-indigo-100/50'
                        }`}
                >
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Active Missions</p>
                        <h3 className="text-4xl font-black text-slate-800">{stats.active.length}</h3>
                        <p className="text-xs font-bold text-indigo-500 mt-2 flex items-center gap-1">
                            {filter === 'active' ? 'Viewing list' : 'View active'} <ArrowRight size={12} />
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                        <Activity size={32} />
                    </div>
                </div>

                <div
                    onClick={() => setFilter('review')}
                    className={`p-6 rounded-2xl border-2 shadow-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-1 ${filter === 'review' ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-100' : 'bg-white border-slate-100 hover:border-amber-100 shadow-amber-100/50'
                        }`}
                >
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Needs Review</p>
                        <h3 className="text-4xl font-black text-slate-800">{stats.review.length}</h3>
                        <p className="text-xs font-bold text-amber-500 mt-2 flex items-center gap-1">
                            {filter === 'review' ? 'Viewing list' : 'View pending'} <ArrowRight size={12} />
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                        <Eye size={32} />
                    </div>
                </div>

                <div
                    onClick={() => setFilter('published')}
                    className={`p-6 rounded-2xl border-2 shadow-xl flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-1 ${filter === 'published' ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-100 shadow-emerald-100/50'
                        }`}
                >
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Published</p>
                        <h3 className="text-4xl font-black text-slate-800">{stats.completed.length}</h3>
                        <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
                            {filter === 'published' ? 'Viewing list' : 'View archive'} <ArrowRight size={12} />
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                        <Award size={32} />
                    </div>
                </div>
            </div>

            {/* Content Area - Switches between Overview and Lists */}
            {filter === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Review Queue */}
                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm h-96 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                Review Queue
                            </h3>
                            <button onClick={() => setFilter('review')} className="text-xs font-bold text-slate-400 hover:text-indigo-600">View All</button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {stats.review.length > 0 ? stats.review.slice(0, 10).map(p => {
                                const studentName = students?.find(s => s.id === p.studentId)?.name || p.studentName || 'Unknown Student';
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => onReviewProject(p.id)}
                                        className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between group hover:bg-amber-100 transition-colors cursor-pointer"
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-800">{p.title || 'Untitled Mission'}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold text-amber-700 bg-white px-2 py-0.5 rounded shadow-sm border border-amber-100">{studentName}</span>
                                                <span className="text-xs text-amber-600 font-medium">Waiting for review</span>
                                            </div>
                                        </div>
                                        <button className="p-2 bg-white rounded-lg text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110">
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                );
                            }) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <CheckCircleIcon />
                                    <p className="font-bold mt-4">All caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Feed */}
                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm h-96 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800">Live Feed</h3>
                            <Clock size={16} className="text-slate-300" />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            {stats.recent.map((p, i) => {
                                const studentName = students?.find(s => s.id === p.studentId)?.name || p.studentName || 'Unknown Student';
                                return (
                                    <div key={p.id} className="flex gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors" onClick={() => onReviewProject(p.id)}>
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-indigo-500 ring-4 ring-indigo-50' : 'bg-slate-200'}`} />
                                            {i !== stats.recent.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1" />}
                                        </div>
                                        <div className="pb-2 w-full">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm text-slate-600">
                                                    <span className="font-bold text-slate-800">{studentName}</span> updated <span className="font-bold text-indigo-600">{p.title}</span>
                                                </p>
                                                <ExternalLink size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium mt-1">
                                                {(() => {
                                                    if (!p.updatedAt) return 'Just now';
                                                    // Handle Firestore Timestamp
                                                    if ((p.updatedAt as any).seconds) return new Date((p.updatedAt as any).seconds * 1000).toLocaleTimeString();
                                                    // Handle JS Date or String
                                                    const d = new Date(p.updatedAt as any);
                                                    return !isNaN(d.getTime()) ? d.toLocaleTimeString() : 'Just now';
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {filteredList.map(p => {
                        const studentName = students?.find(s => s.id === p.studentId)?.name || p.studentName || 'Student';
                        return (
                            <div
                                key={p.id}
                                onClick={() => onReviewProject(p.id)}
                                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:border-indigo-400 transition-all cursor-pointer group flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                        p.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                            'bg-indigo-100 text-indigo-700'
                                        }`}>
                                        {p.status}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{studentName}</span>
                                </div>

                                <h4 className="text-xl font-bold text-slate-800 mb-2">{p.title || 'Untitled Mission'}</h4>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{p.description || 'No description.'}</p>

                                <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-t border-slate-100 pt-4 mt-auto">
                                    <span>Updated {(() => {
                                        if (!p.updatedAt) return 'N/A';
                                        if ((p.updatedAt as any).seconds) return new Date((p.updatedAt as any).seconds * 1000).toLocaleDateString();
                                        const d = new Date(p.updatedAt as any);
                                        return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
                                    })()}</span>
                                    <span className="group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                        Open <ArrowRight size={14} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {filteredList.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                            <p className="text-slate-400 font-bold text-lg">No {filter} missions found.</p>
                            <button onClick={() => setFilter('overview')} className="mt-4 text-indigo-600 font-bold hover:underline">
                                Back to Overview
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper Icon
const CheckCircleIcon = () => (
    <svg className="w-16 h-16 text-slate-100" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);
