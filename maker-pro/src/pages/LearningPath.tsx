import React, { useEffect, useState } from 'react';
import { useStudentData } from '../hooks/useStudentData';
import { db } from '../services/firebase';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { Curriculum, ContentBlock } from '../types';
import { BookOpen, Video, FileText, CheckCircle, Lock, PlayCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UniversalEmbed } from '../components/UniversalEmbed';
import { useNavigate } from 'react-router-dom';

export function LearningPath() {
    const { activeCourse, loading: dataLoading } = useStudentData();
    const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedModule, setExpandedModule] = useState<string | null>(null);
    const [selectedContent, setSelectedContent] = useState<ContentBlock | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCurriculum = async () => {
            if (!activeCourse?.programId) return;
            try {
                const docRef = doc(db as Firestore, 'curricula', activeCourse.programId); // Assuming docId is programId
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setCurriculum(snap.data() as Curriculum);
                    // Open first module by default
                    if (snap.data().modules?.length > 0) {
                        setExpandedModule(snap.data().modules[0].id);
                    }
                }
            } catch (err) {
                console.error("Error fetching curriculum", err);
            } finally {
                setLoading(false);
            }
        };

        if (!dataLoading && activeCourse) {
            fetchCurriculum();
        } else if (!dataLoading && !activeCourse) {
            setLoading(false); // No active course
        }
    }, [activeCourse, dataLoading]);

    if (dataLoading || loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading journey...</div>;

    if (!activeCourse) return (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Program</h2>
            <p className="text-slate-500">You are not currently enrolled in any program.</p>
        </div>
    );

    if (!curriculum) return (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Curriculum Not Found</h2>
            <p className="text-slate-500">The curriculum for this program has not been published yet.</p>
        </div>
    );

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video size={16} />;
            case 'article': return <FileText size={16} />;
            case 'project': return <BookOpen size={16} />;
            default: return <PlayCircle size={16} />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-100px)]">
            {/* Sidebar / Module List */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-xl text-slate-900">{activeCourse.programName}</h2>
                    <p className="text-slate-500 text-sm mt-1">{curriculum.modules?.length || 0} Modules • Learning Path</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {curriculum.modules?.map((module, idx) => (
                        <div key={module.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${expandedModule === module.id ? 'bg-brand-50 text-brand-700' : 'bg-white hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${expandedModule === module.id ? 'bg-brand-200 text-brand-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <span className="font-bold text-sm">{module.title}</span>
                                </div>
                                {expandedModule === module.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            <AnimatePresence>
                                {expandedModule === module.id && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-slate-50/50 p-2 space-y-1">
                                            {module.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSelectedContent(item)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${selectedContent?.id === item.id
                                                        ? 'bg-white shadow-sm ring-1 ring-brand-200 text-brand-700 font-medium'
                                                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                                        }`}
                                                >
                                                    <div className={`text-slate-400 ${selectedContent?.id === item.id ? 'text-brand-500' : ''}`}>
                                                        {getIcon(item.type)}
                                                    </div>
                                                    <span className="truncate">{item.title}</span>
                                                    {item.type === 'project' && (
                                                        <span className="ml-auto text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">Project</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2 flex flex-col h-full">
                {selectedContent ? (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        {selectedContent.type}
                                    </span>
                                    {selectedContent.duration && (
                                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                            • {selectedContent.duration} min
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{selectedContent.title}</h1>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            <div className="prose prose-slate max-w-none">
                                {selectedContent.description && (
                                    <div
                                        className="prose prose-slate max-w-none mb-8 text-slate-600"
                                        dangerouslySetInnerHTML={{ __html: selectedContent.description }}
                                    />
                                )}

                                {selectedContent.content && selectedContent.type !== 'html' && (
                                    <div className="rounded-2xl overflow-hidden shadow-lg bg-black">
                                        <UniversalEmbed
                                            src={selectedContent.content}
                                            type={selectedContent.type === 'video' ? 'video' : 'link'}
                                            title={selectedContent.title}
                                            thumbnail={selectedContent.metadata?.thumbnail}
                                        />
                                    </div>
                                )}

                                {selectedContent.type === 'html' && selectedContent.content && (
                                    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                                        <iframe
                                            srcDoc={selectedContent.content}
                                            title="Embedded Content"
                                            className="w-full h-[600px] border-none"
                                            sandbox="allow-scripts allow-forms allow-same-origin"
                                        />
                                    </div>
                                )}

                                {selectedContent.type === 'project' && (
                                    <div className="mt-8 p-6 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                                        <h3 className="text-purple-900 font-bold mb-2">Ready to start this project?</h3>
                                        <p className="text-purple-700 mb-4">Go to your projects dashboard to modify and submit your work.</p>
                                        <button
                                            onClick={() => navigate('/projects')}
                                            className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-500/20"
                                        >
                                            Go to Projects
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-slate-50 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                            <BookOpen size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Lesson</h3>
                        <p className="text-slate-500 max-w-sm">Choose a module from the left to begin your learning journey.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
