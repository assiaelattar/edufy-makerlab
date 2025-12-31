import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, MoreHorizontal, Calendar, ArrowRight, PlayCircle, Lock } from 'lucide-react';
import { useStudentData } from '../hooks/useStudentData';
import { useNavigate } from 'react-router-dom';

export function Projects() {
    const { projects, loading } = useStudentData();
    const navigate = useNavigate();

    if (loading) return <div className="p-8 text-center animate-pulse">Loading projects...</div>;

    const getProjectImage = (station: string) => {
        const images: Record<string, string> = {
            'robotics': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
            'coding': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
            'game_design': 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800',
            'iot': 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&q=80&w=800',
            'ai': 'https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&q=80&w=800'
        };
        return images[station] || images['robotics'];
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Projects</h1>
                    <p className="text-slate-500 mt-1">Manage your active learning paths and assignments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full md:w-64"
                        />
                    </div>
                    {/* <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                        <Filter className="w-5 h-5" />
                    </button> */}
                    {/* <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">
                        <Plus className="w-5 h-5" />
                        <span>New Project</span>
                    </button> */}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                            <Filter className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No Projects Found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            You haven't been assigned any projects yet. Check back later or contact your instructor.
                        </p>
                    </div>
                ) : (
                    projects.map((project, index) => {
                        const completedModules = project.steps.filter(s => s.status === 'done' || s.approvalStatus === 'approved').length;
                        const totalModules = project.steps.length;
                        const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
                        const status = project.status === 'published' ? 'Completed' : 'In Progress'; // Simplified map

                        return (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-premium transition-all duration-300 flex flex-col"
                            >
                                {/* Image Cover */}
                                <div className="h-48 relative overflow-hidden">
                                    <img
                                        src={getProjectImage(project.station)}
                                        alt={project.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute top-4 right-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/20 shadow-sm
                        ${status === 'Completed' ? 'bg-green-500/90 text-white' : ''}
                        ${status === 'In Progress' ? 'bg-brand-500/90 text-white' : ''}
                      `}>
                                            {status}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <p className="text-xs font-medium opacity-90 mb-1 capitalize">{project.station.replace('_', ' ')}</p>
                                        <h3 className="text-lg font-bold leading-tight">{project.title}</h3>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            <span>No Due Date</span>
                                        </div>
                                        <div>
                                            {completedModules}/{totalModules} Steps
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-xs font-semibold mb-2">
                                            <span className="text-slate-700">Progress</span>
                                            <span className="text-brand-600">{progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 bg-brand-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto flex items-center gap-3">
                                        <button
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-50 text-brand-700 font-semibold hover:bg-brand-100 transition-colors group/btn"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            <span>Open Project</span>
                                            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
