import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Plus, Trash2, GripVertical, FileText, Video, Link, Layout, Save, Upload, Image as ImageIcon,
    MoreVertical, ChevronRight, X, Play, Clock, CheckSquare, BookOpen, Code, Rocket, Zap, Star, Edit3,
    Eye, Globe, Lock, Unlock
} from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Curriculum, CurriculumModule, ContentBlock, ContentType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UniversalEmbed } from '../../components/UniversalEmbed';

// --- Refactored Sortable Component with Drag Handle ---
function SortableModuleRow({
    module,
    index,
    isActive,
    onClick,
    onLockToggle
}: {
    module: CurriculumModule;
    index: number;
    isActive: boolean;
    onClick: () => void;
    onLockToggle: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id });

    const style = { transform: CSS.Transform.toString(transform), transition };

    // Deterministic visual styles
    const gradients = [
        'from-blue-500 to-cyan-400',
        'from-violet-500 to-purple-400',
        'from-orange-500 to-amber-400',
        'from-emerald-500 to-teal-400',
        'from-pink-500 to-rose-400'
    ];
    const gradient = gradients[index % gradients.length];

    // Deterministic icon (just for visual variety)
    const ModuleIcon = [BookOpen, Code, Rocket, Zap, Star][index % 5];

    return (
        <div ref={setNodeRef} style={style} className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all border ${isActive
            ? 'bg-white border-brand-500 ring-1 ring-brand-500 shadow-md transform scale-[1.02]'
            : 'bg-white border-slate-100 hover:border-brand-200 hover:shadow-sm'
            }`}>
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 p-1 touch-none flex items-center justify-center self-stretch">
                <GripVertical size={16} />
            </div>

            {/* Main Content - Clickable */}
            <div className="flex-1 min-w-0 cursor-pointer flex items-center gap-3" onClick={onClick}>
                {/* Thumbnail / Icon */}
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
                    <ModuleIcon size={20} strokeWidth={2.5} />
                </div>

                <div className="min-w-0">
                    <div className={`font-bold truncate text-sm mb-0.5 ${isActive ? 'text-brand-700' : 'text-slate-700'}`}>
                        {module.title}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-100">
                            {module.items.length} Units
                        </span>
                        {module.isLocked && <Lock size={12} className="text-orange-400" />}
                    </div>
                </div>
            </div>

            {/* Actions */}
            {isActive && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onLockToggle(); }}
                        className={`p-1.5 rounded-lg transition-colors ${module.isLocked ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        title={module.isLocked ? "Unlock Module" : "Lock Module"}
                    >
                        {module.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                </div>
            )}
        </div>
    );
}

import { useNavigate } from 'react-router-dom';

export function CurriculumBuilder({ programId }: { programId: string }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [activeItem, setActiveItem] = useState<ContentBlock | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingItem, setViewingItem] = useState<ContentBlock | null>(null);

    const handleUpdateItem = (itemId: string, updates: Partial<ContentBlock>) => {
        if (!curriculum || !activeModuleId) return;

        const updatedModules = curriculum.modules.map(m => {
            if (m.id === activeModuleId) {
                const updatedItems = m.items.map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                );
                return { ...m, items: updatedItems };
            }
            return m;
        });

        setCurriculum({ ...curriculum, modules: updatedModules });

        // Update local active item state to reflect changes immediately in modal
        if (activeItem && activeItem.id === itemId) {
            setActiveItem({ ...activeItem, ...updates });
        }
    };

    const handleDeleteItem = (itemId: string) => {
        if (!window.confirm('Are you sure?')) return;
        if (!curriculum || !activeModuleId) return;

        const updatedModules = curriculum.modules.map(m => {
            if (m.id === activeModuleId) {
                return { ...m, items: m.items.filter(i => i.id !== itemId) };
            }
            return m;
        });

        setCurriculum({ ...curriculum, modules: updatedModules });
        setActiveItem(null);
    };

    const handleDeleteModule = (moduleId: string) => {
        if (!window.confirm('Delete this module and all its contents?')) return;
        if (!curriculum) return;
        const updatedModules = curriculum.modules.filter(m => m.id !== moduleId);
        setCurriculum({ ...curriculum, modules: updatedModules });
        if (activeModuleId === moduleId) setActiveModuleId(null);
    };

    const handleUpdateModule = (moduleId: string, title: string) => {
        if (!curriculum) return;
        const updatedModules = curriculum.modules.map(m =>
            m.id === moduleId ? { ...m, title } : m
        );
        setCurriculum({ ...curriculum, modules: updatedModules });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (!programId || !db) return;
        const firestore = db as any;
        const loadCurriculum = async () => {
            const docRef = doc(firestore, 'curricula', programId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setCurriculum(snap.data() as Curriculum);
                // Auto-select first module if exists
                if (snap.data().modules.length > 0) setActiveModuleId(snap.data().modules[0].id);
            } else {
                setCurriculum({
                    id: programId,
                    programId,
                    modules: [],
                    lastUpdated: Timestamp.now(),
                    status: 'draft'
                });
            }
            setLoading(false);
        };
        loadCurriculum();
    }, [programId]);

    const handleAddModule = () => {
        if (!curriculum) return;
        const newModule: CurriculumModule = {
            id: `mod-${Date.now()}`,
            title: 'New Module',
            order: curriculum.modules.length,
            items: [],
            isPublished: true,
            isLocked: false
        };
        setCurriculum({ ...curriculum, modules: [...curriculum.modules, newModule] });
        setActiveModuleId(newModule.id);
    };

    const handleAddContent = (type: ContentType) => {
        if (!curriculum || !activeModuleId) return;
        const newBlock: ContentBlock = {
            id: `blk-${Date.now()}`,
            type,
            title: `New ${type}`,
            description: '',
            content: '',
            isAssigned: type === 'project'
        };

        const updatedModules = curriculum.modules.map(m => {
            if (m.id === activeModuleId) {
                return { ...m, items: [...m.items, newBlock] };
            }
            return m;
        });
        setCurriculum({ ...curriculum, modules: updatedModules });
    };

    const handleSave = async () => {
        if (!curriculum || !user || !db) return;
        setIsSaving(true);
        const firestore = db as any;
        try {
            await setDoc(doc(firestore, 'curricula', programId), {
                ...curriculum,
                lastUpdated: Timestamp.now()
            });
            // Keep saving state for a visual confirmation delay
            setTimeout(() => {
                setIsSaving(false);
            }, 800);
        } catch (e) {
            console.error(e);
            alert('Failed to save');
            setIsSaving(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!curriculum || !over || active.id === over.id) return;
        const oldIndex = curriculum.modules.findIndex(m => m.id === active.id);
        const newIndex = curriculum.modules.findIndex(m => m.id === over.id);
        setCurriculum({
            ...curriculum,
            modules: arrayMove(curriculum.modules, oldIndex, newIndex)
        });
    };

    const toggleLock = (moduleId: string) => {
        if (!curriculum) return;
        const updated = curriculum.modules.map(m => m.id === moduleId ? { ...m, isLocked: !m.isLocked } : m);
        setCurriculum({ ...curriculum, modules: updated });
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading Curriculum Engine...</div>;
    if (!curriculum) return <div className="p-12 text-center text-red-500">Error loading curriculum.</div>;

    const activeModule = curriculum.modules.find(m => m.id === activeModuleId);

    // --- Preview Mode ---
    if (showPreview) {
        return (
            <div className="min-h-screen bg-slate-50 relative">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
                    <h2 className="font-bold flex items-center gap-2"><Eye size={20} /> Student Preview Mode</h2>
                    <button onClick={() => setShowPreview(false)} className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm hover:bg-slate-100">
                        Exit Preview
                    </button>
                </div>

                <div className="max-w-4xl mx-auto p-8 pb-32">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold text-slate-900">Curriculum Preview</h1>
                        <p className="text-slate-500">This is how students will see the course structure.</p>
                    </div>

                    <div className="grid gap-6">
                        {curriculum.modules.map((module, idx) => {
                            const gradients = [
                                'from-blue-500 to-cyan-400',
                                'from-violet-500 to-purple-400',
                                'from-orange-500 to-amber-400',
                                'from-emerald-500 to-teal-400',
                                'from-pink-500 to-rose-400'
                            ];
                            const gradient = gradients[idx % gradients.length];
                            const ModuleIcon = [BookOpen, Code, Rocket, Zap, Star][idx % 5];

                            return (
                                <div key={module.id} className={`bg-white rounded-2xl border ${module.isLocked ? 'border-slate-200 opacity-75' : 'border-slate-200 shadow-sm'} overflow-hidden`}>
                                    <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${module.isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
                                                <ModuleIcon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                                                    {module.title}
                                                    {module.isLocked && <Lock size={16} className="text-slate-400" />}
                                                </h3>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">{module.items.length} Units</div>
                                            </div>
                                        </div>
                                    </div>
                                    {!module.isLocked ? (
                                        <div className="p-6 space-y-3">
                                            {module.items.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setViewingItem(item)}
                                                    className="group flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'video' ? 'bg-red-100 text-red-600' :
                                                        item.type === 'project' ? 'bg-green-100 text-green-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {item.type === 'video' ? <Video size={20} /> : item.type === 'project' ? <CheckSquare size={20} /> : <FileText size={20} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{item.title}</div>
                                                        {item.description && <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{item.description.replace(/<[^>]*>/g, '')}</p>}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                                                        <ChevronRight size={20} />
                                                    </div>
                                                </div>
                                            ))}
                                            {module.items.length === 0 && <p className="text-sm text-slate-400 italic pl-2">No content available yet.</p>}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 bg-slate-50">
                                            <Lock size={24} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">This module is strictly locked until requirements are met.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Viewing Overlay */}
                {viewingItem && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-bold uppercase">{viewingItem.type}</div>
                                    <h3 className="font-bold text-lg text-slate-900">{viewingItem.title}</h3>
                                </div>
                                <button onClick={() => setViewingItem(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-white">
                                {viewingItem.type === 'article' ? (
                                    <div className="prose prose-slate max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: viewingItem.description || '' }} />
                                    </div>
                                ) : viewingItem.type === 'project' ? (
                                    <div>
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-8 text-center">
                                            <CheckSquare size={48} className="mx-auto text-green-500 mb-4" />
                                            <h3 className="text-xl font-bold text-green-900 mb-2">Assignment Task</h3>
                                            <p className="text-green-700">This item requires a student submission.</p>
                                        </div>
                                        <div className="prose prose-slate max-w-none">
                                            <div dangerouslySetInnerHTML={{ __html: viewingItem.description || '' }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-3xl mx-auto">
                                        <UniversalEmbed
                                            type={viewingItem.type as any}
                                            src={viewingItem.content || ''}
                                            title={viewingItem.title}
                                            className="rounded-xl shadow-lg border border-slate-200"
                                        />
                                        {viewingItem.description && (
                                            <div className="mt-8 prose prose-slate max-w-none">
                                                <div dangerouslySetInnerHTML={{ __html: viewingItem.description || '' }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* Top Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/instructor-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 font-medium text-sm flex items-center gap-2">
                        <ChevronRight className="rotate-180" size={16} /> Back
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <h1 className="font-bold text-slate-900 text-lg">Curriculum Engine</h1>
                    <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${curriculum.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {curriculum.status || 'Draft'}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCurriculum({ ...curriculum, status: curriculum.status === 'published' ? 'draft' : 'published' })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors hover:bg-slate-100 text-slate-600"
                    >
                        <Globe size={16} /> {curriculum.status === 'published' ? 'Unpublish' : 'Publish Course'}
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors hover:bg-slate-100 text-slate-600"
                    >
                        <Eye size={16} /> Preview
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${isSaving
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
                            }`}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar: Modules */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Modules</h3>
                        <button onClick={handleAddModule} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-brand-600 transition-all">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={curriculum.modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                                {curriculum.modules.map((module, idx) => (
                                    <SortableModuleRow
                                        key={module.id}
                                        index={idx}
                                        module={module}
                                        isActive={activeModuleId === module.id}
                                        onClick={() => setActiveModuleId(module.id)}
                                        onLockToggle={() => toggleLock(module.id)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>

                {/* Main Editor: Content */}
                <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
                    {activeModule ? (
                        <>
                            {/* Dynamic Header */}
                            {(() => {
                                const activeIndex = curriculum.modules.findIndex(m => m.id === activeModule.id);
                                const gradients = [
                                    'from-blue-500 to-cyan-400',
                                    'from-violet-500 to-purple-400',
                                    'from-orange-500 to-amber-400',
                                    'from-emerald-500 to-teal-400',
                                    'from-pink-500 to-rose-400'
                                ];
                                const gradient = gradients[activeIndex % gradients.length];
                                const ModuleIcon = [BookOpen, Code, Rocket, Zap, Star][activeIndex % 5];

                                return (
                                    <div className="bg-white border-b border-slate-200 shadow-sm relative z-10">
                                        {/* Colored Banner */}
                                        <div className={`h-24 w-full bg-gradient-to-r ${gradient} relative`}>
                                            <div className="absolute -bottom-6 left-8">
                                                <div className="w-16 h-16 bg-white rounded-2xl shadow-md p-1 flex items-center justify-center">
                                                    <div className={`w-full h-full rounded-xl bg-slate-50 flex items-center justify-center text-slate-700`}>
                                                        <ModuleIcon size={32} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-10 px-8 pb-8">
                                            <div className="flex justify-between items-center mb-4">
                                                <input
                                                    type="text"
                                                    value={activeModule.title}
                                                    onChange={(e) => {
                                                        const updated = curriculum.modules.map(m => m.id === activeModule.id ? { ...m, title: e.target.value } : m);
                                                        setCurriculum({ ...curriculum, modules: updated });
                                                    }}
                                                    className="text-3xl font-bold text-slate-900 outline-none w-full bg-transparent placeholder-slate-300 focus:bg-slate-50 rounded-lg -ml-2 pl-2 transition-colors mr-4"
                                                    placeholder="Module Title"
                                                />
                                                <button
                                                    onClick={() => handleDeleteModule(activeModule.id)}
                                                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:scale-105 transition-all shadow-sm"
                                                    title="Delete Module"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={activeModule.description || ''}
                                                onChange={(e) => {
                                                    const updated = curriculum.modules.map(m => m.id === activeModule.id ? { ...m, description: e.target.value } : m);
                                                    setCurriculum({ ...curriculum, modules: updated });
                                                }}
                                                className="mt-2 text-slate-500 outline-none w-full bg-transparent text-sm focus:bg-slate-50 rounded-lg -ml-2 pl-2 py-1 transition-colors"
                                                placeholder="Add a brief description for this module..."
                                            />

                                            {/* Action Toolbar */}
                                            {/* Action Toolbar */}
                                            <div className="mt-8 pt-8 border-t border-slate-100">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">Add Content to Module</span>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <button onClick={() => handleAddContent('article')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md transition-all group text-center">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">Article</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Text & Images</div>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleAddContent('video')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-red-400 hover:bg-red-50/50 hover:shadow-md transition-all group text-center">
                                                        <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <Video size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">Video</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">MP4 or URL</div>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleAddContent('project')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-green-400 hover:bg-green-50/50 hover:shadow-md transition-all group text-center">
                                                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <CheckSquare size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">Assignment</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Practical Task</div>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleAddContent('image')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-md transition-all group text-center">
                                                        <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <ImageIcon size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">Image</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Photo / Diagram</div>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleAddContent('embed')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/50 hover:shadow-md transition-all group text-center">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <Layout size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">Embed</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">External Tool</div>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleAddContent('html')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50/50 hover:shadow-md transition-all group text-center">
                                                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <Code size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">HTML</div>
                                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Custom Code</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Module Content List */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-24 bg-slate-50/50">
                                {activeModule.items.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                            <Plus size={24} className="text-brand-500" />
                                        </div>
                                        <p className="font-medium">This module is empty.</p>
                                        <p className="text-sm">Add content using the buttons above.</p>
                                    </div>
                                )}

                                {activeModule.items.map((item) => (
                                    <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-brand-200 transition-all flex justify-between items-start gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${item.type === 'video' ? 'bg-red-50 text-red-600' :
                                                item.type === 'project' ? 'bg-green-50 text-green-600' :
                                                    item.type === 'embed' ? 'bg-purple-50 text-purple-600' :
                                                        'bg-blue-50 text-blue-600'
                                                }`}>
                                                {item.type === 'video' ? <Video size={20} /> :
                                                    item.type === 'project' ? <CheckSquare size={20} /> :
                                                        item.type === 'embed' ? <Layout size={20} /> :
                                                            <FileText size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 text-lg mb-1">{item.title}</h4>
                                                <p className="text-sm text-slate-500 line-clamp-2">
                                                    {item.description ? item.description.replace(/<[^>]*>/g, '') : 'No content preview available'}
                                                </p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                                        {item.type}
                                                    </span>
                                                    {item.isAssigned && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-600 px-2 py-1 rounded-md flex items-center gap-1">
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setActiveItem(item)}
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this item?')) {
                                                        const updated = activeModule.items.filter(i => i.id !== item.id);
                                                        const updatedMods = curriculum.modules.map(m => m.id === activeModule.id ? { ...m, items: updated } : m);
                                                        setCurriculum({ ...curriculum, modules: updatedMods });
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Layout size={48} className="opacity-20" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-300">No Module Selected</h2>
                            <p className="mt-2 text-sm text-slate-400 max-w-xs text-center">Select a module from the sidebar or click "+" to create your first learning module.</p>
                        </div>
                    )}
                </div>

                {/* Active Item Editor Overlay */}
                {activeItem && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
                        <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900">Edit Content</h3>
                                    <p className="text-sm text-slate-500">Editing {activeItem.type} details</p>
                                </div>
                                <button onClick={() => setActiveItem(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Title</label>
                                    <input
                                        type="text"
                                        value={activeItem.title}
                                        onChange={(e) => handleUpdateItem(activeItem.id, { title: e.target.value })}
                                        className="w-full p-3 border border-slate-200 rounded-xl text-base font-bold text-slate-900 outline-none focus:ring-2 ring-brand-500/20 transition-all"
                                    />
                                </div>

                                {(activeItem.type === 'video' || activeItem.type === 'embed' || activeItem.type === 'image') && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                                            {activeItem.type === 'video' ? 'Video URL' : activeItem.type === 'image' ? 'Image URL' : 'Embed URL'}
                                        </label>
                                        <input
                                            type="text"
                                            value={activeItem.content || ''}
                                            onChange={(e) => handleUpdateItem(activeItem.id, { content: e.target.value })}
                                            placeholder={activeItem.type === 'video' ? "https://youtube.com/..." : "https://..."}
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 outline-none focus:ring-2 ring-brand-500/20 transition-all"
                                        />
                                        {activeItem.type === 'embed' && <p className="text-xs text-slate-400 mt-2">Paste a URL to a PDF, Google Slide, or coding platform.</p>}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                                        {activeItem.type === 'article' ? 'Article Content' : 'Description'}
                                    </label>

                                    {activeItem.type === 'article' ? (
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 ring-brand-500/20 transition-all">
                                            <ReactQuill
                                                theme="snow"
                                                value={activeItem.description || ''}
                                                onChange={(content) => handleUpdateItem(activeItem.id, { description: content })}
                                                modules={{
                                                    toolbar: [
                                                        [{ 'header': [1, 2, 3, false] }],
                                                        ['bold', 'italic', 'underline', 'strike'],
                                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                        ['link', 'image', 'video'],
                                                        ['clean']
                                                    ]
                                                }}
                                                className="h-64 mb-12"
                                                placeholder="Write your amazing content here..."
                                            />
                                        </div>
                                    ) : (
                                        <textarea
                                            value={activeItem.description || ''}
                                            onChange={(e) => handleUpdateItem(activeItem.id, { description: e.target.value })}
                                            rows={6}
                                            className="w-full p-4 border border-slate-200 rounded-xl text-sm text-slate-600 outline-none focus:ring-2 ring-brand-500/20 transition-all resize-none"
                                            placeholder="Add instructions or a description..."
                                        />
                                    )}
                                </div>

                                {activeItem.type === 'project' && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <input
                                            type="checkbox"
                                            id="modal-assign"
                                            checked={activeItem.isAssigned}
                                            onChange={(e) => handleUpdateItem(activeItem.id, { isAssigned: e.target.checked })}
                                            className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <label htmlFor="modal-assign" className="text-sm font-bold text-slate-700 cursor-pointer">Require Student Submission</label>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    onClick={() => handleDeleteItem(activeItem.id)}
                                    className="px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    Delete Item
                                </button>
                                <button
                                    onClick={() => setActiveItem(null)}
                                    className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .btn-action {
                    @apply flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:border-brand-300 hover:shadow-sm transition-all;
                }
                .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    background: #f8fafc;
                }
                .ql-container {
                    border: none !important;
                    font-family: inherit;
                    font-size: 1rem;
                }
                .ql-editor {
                    padding: 1.5rem;
                    min-height: 150px;
                }
            `}</style>
        </div>
    );
}
