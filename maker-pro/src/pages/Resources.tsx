import React, { useEffect, useState } from 'react';
import { UniversalEmbed, EmbedType } from '../components/UniversalEmbed';
import { Folder, Plus, Search, ExternalLink, Filter, Video, ArrowRight } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { ToolLink } from '../types';
import { useStudentData } from '../hooks/useStudentData';

export function Resources() {
    const { activeCourse } = useStudentData();
    const [activeTab, setActiveTab] = useState<'all' | 'robotics' | 'coding' | 'design' | 'engineering'>('all');
    const [resources, setResources] = useState<ToolLink[]>([]); // General Resources
    const [programResources, setProgramResources] = useState<ToolLink[]>([]); // Specific Program Resources
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            if (!db) return;
            try {
                // 1. Fetch General Library
                const q = query(collection(db, 'tool_links'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolLink));
                setResources(data);

                // 2. Fetch Program Specific Resources
                if (activeCourse?.programId) {
                    const progDoc = await getDocs(query(collection(db, 'programs'), where('__name__', '==', activeCourse.programId))); // ID based
                    // better: use getDoc
                    // But here let's stick to consistent style or reuse logic
                }
            } catch (err) {
                console.error("Failed to fetch resources", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchProgramResources = async () => {
            if (!db || !activeCourse?.programId) return;
            try {
                const docRef = doc(db, 'programs', activeCourse.programId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.resources && Array.isArray(data.resources)) {
                        setProgramResources(data.resources);
                    }
                }
            } catch (err) { console.error(err); }
        };

        fetchResources();
        fetchProgramResources();
    }, [activeCourse]);

    // Helper to determine embed type from URL
    const getEmbedType = (url: string): EmbedType => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
        if (url.endsWith('.pdf')) return 'pdf';
        return 'link';
    };

    const filtered = activeTab === 'all'
        ? resources
        : resources.filter(r => r.category === activeTab);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Resource Library</h1>
                    <p className="text-slate-600 mt-1">Curated tools, links, and documents for your projects.</p>
                </div>
            </div>

            {/* NEW: Program Specific Resources Section */}
            {programResources.length > 0 && (
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                        <Folder className="text-blue-400" />
                        My Program Materials
                        <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-800 px-2 py-0.5 rounded-full">Specific to your course</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                        {programResources.map((res, idx) => (
                            <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors flex items-center gap-3 group">
                                <div className={`p-3 rounded-lg ${res.category === 'coding' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                                    {getEmbedType(res.url) === 'video' ? <Video size={20} /> : <ExternalLink size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm truncate">{res.title}</h3>
                                    <p className="text-xs text-slate-400 truncate">{res.url}</p>
                                </div>
                                <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['all', 'robotics', 'coding', 'design', 'engineering'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold capitalize transition-all whitespace-nowrap border ${activeTab === tab
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* General Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading library...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                    <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No resources found in this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((resource) => {
                        const type = getEmbedType(resource.url);
                        return (
                            <div key={resource.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full">
                                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900 line-clamp-1" title={resource.title}>{resource.title}</h3>
                                        <span className={`inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600`}>
                                            {resource.category}
                                        </span>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="p-0 flex-1 bg-slate-50 relative group-hover:bg-slate-100 transition-colors">
                                    {/* If it's a direct video/pdf, show preview, otherwise just a link card style */}
                                    {type !== 'link' ? (
                                        <div className="aspect-video w-full">
                                            <UniversalEmbed
                                                type={type}
                                                src={resource.url}
                                                title={resource.title}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    ) : (
                                        <a href={resource.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center h-48 p-6 text-center text-slate-500 hover:text-blue-600 transition-colors">
                                            <p className="text-sm line-clamp-3 mb-4">{resource.description || 'No description provided.'}</p>
                                            <span className="text-xs font-bold underline decoration-2 underline-offset-4 decoration-blue-100 group-hover:decoration-blue-500">
                                                Visit Website
                                            </span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
