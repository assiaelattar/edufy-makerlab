
import React, { useRef, useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProjectTemplate, StationType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Save, X, ArrowRight, ArrowLeft, Layout, Database, Users, Rocket, Check, Plus, Trash2, Link, Video, FileText, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ProjectEditorProps {
    templateId?: string | null;
    initialViewProject?: ProjectTemplate;
    onClose: () => void;
}

const TABS = ['details', 'resources', 'workflow', 'targeting', 'publishing'];

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ templateId, initialViewProject, onClose }) => {
    const { projectTemplates, stations, processTemplates, availableGrades, availableGroups, programs, enrollments, students, actions } = useFactoryData();
    const { user, userProfile } = useAuth();

    // Initialize Form
    const defaults = {
        title: '',
        description: '',
        difficulty: 'beginner' as const,
        skills: [],
        station: 'Robotics' as StationType,
        technologies: [],
        resources: [],
        status: 'draft' as const,
        targetAudience: { grades: [], groups: [] },
        defaultWorkflowId: '',
        stepResources: {} as Record<string, any[]>
    };

    // Prioritize passed project data, then lookup, then defaults
    const sourceData = initialViewProject || (templateId ? projectTemplates.find(t => t.id === templateId) : null);

    const initialData = sourceData || defaults;

    // Deep merge defaults with initialData to ensure no undefined objects
    const mergedData = {
        ...defaults,
        ...initialData,
        targetAudience: { ...defaults.targetAudience, ...(initialData?.targetAudience || {}) }
    };

    const [form, setForm] = useState<Partial<ProjectTemplate>>(mergedData);
    const [activeTab, setActiveTab] = useState('details');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const uploadScopeId = useRef(templateId || initialViewProject?.id || `draft-${Date.now()}`).current;
    const resourceInputRef = useRef<HTMLInputElement>(null);
    const [resourceUploadProgress, setResourceUploadProgress] = useState(0);
    const [isResourceUploading, setIsResourceUploading] = useState(false);

    // Helper to map technology names to stylized objects (Simple version of Importer logic)
    const mapTechnologies = (input: string) => {
        // Split by comma, keep empty strings to allow smooth typing
        return input.split(',').map(raw => {
            const name = raw.trimStart(); // Only trim start to allow typing spaces
            // const cleanName = name.trim();

            // Simple auto-styling based on keywords
            let style = { icon: 'PenTool', color: 'text-slate-500', bg: 'bg-slate-100' };
            const lower = name.toLowerCase();

            if (lower.includes('python') || lower.includes('code') || lower.includes('js'))
                style = { icon: 'Code', color: 'text-blue-500', bg: 'bg-blue-100' };
            else if (lower.includes('electr') || lower.includes('circuit'))
                style = { icon: 'Cpu', color: 'text-amber-500', bg: 'bg-amber-100' };
            else if (lower.includes('3d') || lower.includes('cad') || lower.includes('design'))
                style = { icon: 'Box', color: 'text-rose-500', bg: 'bg-rose-100' };
            else if (lower.includes('game') || lower.includes('unity'))
                style = { icon: 'Gamepad2', color: 'text-purple-500', bg: 'bg-purple-100' };
            else if (lower.includes('laser') || lower.includes('print'))
                style = { icon: 'Printer', color: 'text-orange-500', bg: 'bg-orange-100' };

            return { name: raw, ...style }; // Keep raw name to preserve spaces while typing
        });
    };

    const processAndUploadImage = async (file: File) => {
        // Validation
        if (!file.type.startsWith('image/')) {
            setUploadError('Choose an image file in JPG, PNG, or WEBP format.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setUploadError('This image is too large. Choose a file under 5 MB.');
            return;
        }

        try {
            setUploadError(null);
            setIsUploading(true);
            setUploadProgress(1);

            if (!userProfile?.organizationId || !user?.uid) {
                throw new Error('Your instructor account is not fully linked to an organization.');
            }
            const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const url = await api.uploadFile(
                file,
                `instructor-projects/${userProfile.organizationId}/${user.uid}/${uploadScopeId}/cover-${Date.now()}-${safeFileName}`,
                setUploadProgress
            );
            setForm(prev => ({ ...prev, thumbnailUrl: url }));

        } catch (error: any) {
            console.error("Error processing image:", error);
            setUploadError(error?.message || 'The cover image could not be uploaded.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleResourceUpload = async (file: File) => {
        if (!userProfile?.organizationId || !user?.uid) {
            setUploadError('Your instructor account is not fully linked to an organization.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setUploadError('This resource is too large. Choose a file under 20 MB.');
            return;
        }
        const isAllowed = /^(image|video|audio)\//.test(file.type) || ['application/pdf', 'text/plain'].includes(file.type);
        if (!isAllowed) {
            setUploadError('Upload an image, video, audio clip, PDF, or text file.');
            return;
        }
        setIsResourceUploading(true);
        setResourceUploadProgress(0);
        setUploadError(null);
        try {
            const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const url = await api.uploadFile(
                file,
                `instructor-projects/${userProfile.organizationId}/${user.uid}/${uploadScopeId}/resource-${Date.now()}-${safeFileName}`,
                setResourceUploadProgress
            );
            const type = file.type.startsWith('video/') || file.type.startsWith('audio/')
                ? 'video'
                : file.type.startsWith('image/') ? 'image' : 'file';
            setForm(current => ({
                ...current,
                resources: [...(current.resources || []), { id: `resource-${Date.now()}`, title: file.name, type, url }],
            }));
        } catch (error: any) {
            setUploadError(error?.message || 'The resource could not be uploaded.');
        } finally {
            setIsResourceUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processAndUploadImage(file);
    };

    // Paste Handler
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault(); // Prevent default paste behaviour
                    processAndUploadImage(file);
                    return; // Only upload first image found
                }
            }
        }
    };

    const handleSave = async () => {
        const title = String(form.title || '').trim();
        if (!title) {
            setActiveTab('details');
            setSaveError('Add a mission title before saving.');
            return;
        }
        const audience = form.targetAudience || {};
        const hasAudience = Boolean(audience.grades?.length || audience.groups?.length || audience.students?.length);
        if (form.status !== 'draft' && !hasAudience) {
            setActiveTab('targeting');
            setSaveError('Choose a grade, group, or specific students before publishing this mission.');
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            if (templateId) {
                await actions.updateProjectTemplate(templateId, { ...form, title });
            } else {
                await actions.addProjectTemplate({ ...form, title } as any);
            }
            onClose();
        } catch (e: any) {
            console.error(e);
            setSaveError(e?.message || 'The mission could not be saved. Check the required fields and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!templateId) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            await actions.deleteProjectTemplate(templateId);
            onClose();
        } catch (e: any) {
            console.error("Error deleting project:", e);
            setShowDeleteConfirm(false);
            setSaveError(e?.message || 'The mission could not be deleted.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper for navigation
    const nextTab = () => {
        const idx = TABS.indexOf(activeTab);
        if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
    };

    const prevTab = () => {
        const idx = TABS.indexOf(activeTab);
        if (idx > 0) setActiveTab(TABS[idx - 1]);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close mission editor">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            {templateId ? 'Edit mission' : 'New mission'}
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{activeTab}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {templateId && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-700 transition hover:bg-red-50"
                        >
                            <Trash2 size={18} /> <span className="hidden md:inline">Delete</span>
                        </button>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {isSaving ? 'Saving…' : 'Save mission'}
                    </button>
                </div>
            </div>

            {saveError && (
                <div role="alert" className="mx-8 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {saveError}
                </div>
            )}

            {/* Tabs */}
            <div className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 sm:px-8">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">

                {/* DETAILS TAB */}
                {activeTab === 'details' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Project Title</label>
                                <input
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl font-black text-2xl text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                    placeholder="e.g. Mars Rover Expedition"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Station</label>
                                <select
                                    className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    value={form.station}
                                    onChange={e => setForm({ ...form, station: e.target.value as any })}
                                >
                                    {stations.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Difficulty</label>
                                <div className="flex gap-2">
                                    {['beginner', 'intermediate', 'advanced'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setForm({ ...form, difficulty: d as any })}
                                            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs border-2 transition-all ${form.difficulty === d
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200'
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Cover Image / Thumbnail (Optional)</label>
                                <div className="flex items-start gap-6">
                                    {/* Preview */}
                                    <div
                                        className="w-32 h-24 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 shrink-0 relative group"
                                        onPaste={handlePaste}
                                        tabIndex={0} // Make focusable for paste
                                    >
                                        {form.thumbnailUrl ? (
                                            <>
                                                <img
                                                    src={form.thumbnailUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 px-2 py-1.5 text-center">
                                                    <p className="text-xs font-bold text-white">Cover preview</p>
                                                </div>
                                            </>
                                        ) : (
                                            // Fallback Preview (Auto-generated look)
                                            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 p-4 text-center">
                                                <ImageIcon size={30} className="mb-2 text-slate-300" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Automatic cover</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input & Upload */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    className="w-full p-4 pl-12 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-600 outline-none focus:border-indigo-500 font-mono text-sm"
                                                    placeholder="https://... or upload image"
                                                    value={form.thumbnailUrl || ''}
                                                    onChange={e => {
                                                        let val = e.target.value;

                                                        // Auto-convert Google Drive Links to Direct Image Links
                                                        // From: https://drive.google.com/file/d/123456789/view
                                                        // To:   https://drive.google.com/uc?export=view&id=123456789
                                                        if (val.includes('drive.google.com') && val.includes('/file/d/')) {
                                                            const idMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                                                            if (idMatch && idMatch[1]) {
                                                                val = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
                                                            }
                                                        } else if (val.includes('drive.google.com') && val.includes('id=')) {
                                                            // From: https://drive.google.com/open?id=123456789
                                                            const idMatch = val.match(/id=([a-zA-Z0-9_-]+)/);
                                                            if (idMatch && idMatch[1]) {
                                                                val = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
                                                            }
                                                        }

                                                        // Auto-convert Dropbox
                                                        if (val.includes('dropbox.com') && val.includes('?dl=0')) {
                                                            val = val.replace('?dl=0', '?raw=1');
                                                        }

                                                        setForm({ ...form, thumbnailUrl: val });
                                                    }}
                                                />
                                                <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="cover-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={isUploading}
                                                />
                                                <label
                                                    htmlFor="cover-upload"
                                                    className={`h-[54px] px-6 rounded-xl border-2 flex items-center gap-2 font-bold cursor-pointer transition-all ${isUploading
                                                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                        : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                                        }`}
                                                >
                                                    {isUploading ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                                            <span>{Math.round(uploadProgress)}%</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={20} />
                                                            <span>Upload</span>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Paste a direct image link or upload a file.
                                            <br />If left blank, SparkQuest will generate a stylish card using the project's station colors and icon.
                                            <br />Recommended size: <strong>800x600</strong> or <strong>4:3 ratio</strong>.
                                        </p>

                                        {/* Error Display */}
                                        {uploadError && (
                                            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200 mt-2 font-bold flex flex-col gap-1">
                                            <span>Upload failed:</span>
                                                <span className="font-normal">{uploadError}</span>
                                            </div>
                                        )}

                                        {/* Suggestion Buttons */}
                                        <button
                                            onClick={() => setForm({ ...form, thumbnailUrl: '' })}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                                            disabled={!form.thumbnailUrl}
                                        >
                                            <Trash2 size={12} /> Clear Image (Use Auto-Generated)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Mission Briefing</label>
                                <textarea
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-600 outline-none focus:border-indigo-500 h-40 resize-none"
                                    placeholder="Describe the mission objectives..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Process Workflow</label>
                                <select
                                    className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    value={form.defaultWorkflowId || ''}
                                    onChange={e => setForm({ ...form, defaultWorkflowId: e.target.value })}
                                >
                                    <option value="">-- Let Student Choose --</option>
                                    {processTemplates.map(wf => (
                                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-2">If selected, students will skip the workflow selection screen.</p>
                            </div>

                            {/* TOOLS & TECHNOLOGIES */}
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tools & Technologies (Comma Separated)</label>
                                <div className="space-y-3">
                                    <input
                                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        placeholder="e.g. Python, 3D Modeling, Sensors (Separate with commas)"
                                        value={form.technologies?.map(t => t.name).join(',') || ''}
                                        onChange={e => setForm({ ...form, technologies: mapTechnologies(e.target.value) })}
                                    />
                                    {/* Preview Pills */}
                                    <div className="flex flex-wrap gap-2">
                                        {form.technologies?.filter(t => t.name.trim()).map((tech, i) => (
                                            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${tech.bg || 'bg-slate-100'} border border-transparent animate-in zoom-in duration-200`}>
                                                <span className={`w-2 h-2 rounded-full ${tech.color?.replace('text-', 'bg-') || 'bg-slate-400'}`}></span>
                                                <span className={`text-xs font-bold ${tech.color || 'text-slate-600'}`}>{tech.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400">These will appear as badges on the project card and details page.</p>
                                </div>
                            </div>

                            {/* REAL WORLD APPLICATION */}
                            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-100/50 rounded-2xl border border-slate-200">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Real World Title</label>
                                    <input
                                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        placeholder="e.g. Industrial Product Design"
                                        value={form.realWorldApp?.title || ''}
                                        onChange={e => setForm({ ...form, realWorldApp: { ...form.realWorldApp, title: e.target.value } as any })}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Companies (Comma Separated)</label>
                                    <input
                                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        placeholder="e.g. Tesla, NASA, Apple"
                                        value={form.realWorldApp?.companies?.map(c => c.name).join(', ') || ''}
                                        onChange={e => {
                                            const companies = e.target.value.split(',').map(s => ({
                                                name: s.trim(),
                                                color: ['bg-red-600', 'bg-blue-600', 'bg-black', 'bg-yellow-500'][Math.floor(Math.random() * 4)]
                                            })).filter(c => c.name);
                                            setForm({ ...form, realWorldApp: { ...form.realWorldApp, companies } as any });
                                        }}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Real World Description</label>
                                    <textarea
                                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-600 outline-none focus:border-indigo-500 h-24 resize-none"
                                        placeholder="Explain how this connects to the real world..."
                                        value={form.realWorldApp?.description || ''}
                                        onChange={e => setForm({ ...form, realWorldApp: { ...form.realWorldApp, description: e.target.value } as any })}
                                    />
                                </div>
                            </div>

                            {/* LEARNING OUTCOMES */}
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Key Learning Outcomes</label>
                                <div className="space-y-4">
                                    {(form.learningOutcomes || []).map((outcome, idx) => (
                                        <div key={idx} className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-sm"
                                                    placeholder="Outcome Title (e.g. CAD Mastery)"
                                                    value={outcome.title}
                                                    onChange={e => {
                                                        const newOutcomes = [...(form.learningOutcomes || [])];
                                                        newOutcomes[idx] = { ...newOutcomes[idx], title: e.target.value };
                                                        setForm({ ...form, learningOutcomes: newOutcomes });
                                                    }}
                                                />
                                                <input
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                                                    placeholder="Description"
                                                    value={outcome.desc}
                                                    onChange={e => {
                                                        const newOutcomes = [...(form.learningOutcomes || [])];
                                                        newOutcomes[idx] = { ...newOutcomes[idx], desc: e.target.value };
                                                        setForm({ ...form, learningOutcomes: newOutcomes });
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newOutcomes = [...(form.learningOutcomes || [])];
                                                    newOutcomes.splice(idx, 1);
                                                    setForm({ ...form, learningOutcomes: newOutcomes });
                                                }}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setForm({
                                            ...form,
                                            learningOutcomes: [...(form.learningOutcomes || []), { id: Date.now(), title: '', desc: '', theme: 'blue' }]
                                        })}
                                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Add Outcome
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESOURCES TAB */}
                {activeTab === 'resources' && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-indigo-900">Resource Library</h3>
                                <p className="text-sm text-indigo-700">Attach videos, links, and files to help students.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900">Resource Library</h3>
                                <p className="text-sm text-indigo-700">Attach videos, links, and files to help students.</p>
                            </div>
                        </div>

                        {/* Add Resource Form */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Add New Resource</h4>
                            <div className="flex gap-2">
                                <input
                                    placeholder="Resource Title (e.g. Tutorial Video)"
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500"
                                    id="new-res-title"
                                />
                                <select className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none" id="new-res-type">
                                    <option value="link">Link 🔗</option>
                                    <option value="video">Video 🎥</option>
                                    <option value="file">File 📄</option>
                                </select>
                            </div>

                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                <input
                                    ref={resourceInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*,video/*,audio/*,application/pdf,text/plain"
                                    onChange={event => {
                                        const file = event.target.files?.[0];
                                        if (file) void handleResourceUpload(file);
                                        event.currentTarget.value = '';
                                    }}
                                />
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div><p className="text-sm font-black text-slate-800">Upload a mission file</p><p className="mt-1 text-xs text-slate-500">Images, video, audio, PDF, or text · maximum 20 MB</p></div>
                                    <button type="button" onClick={() => resourceInputRef.current?.click()} disabled={isResourceUploading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                                        {isResourceUploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />} {isResourceUploading ? `${resourceUploadProgress}%` : 'Choose file'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    placeholder="URL (https://...)"
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 font-mono"
                                    id="new-res-url"
                                />
                                <button
                                    onClick={() => {
                                        const titleEl = document.getElementById('new-res-title') as HTMLInputElement;
                                        const urlEl = document.getElementById('new-res-url') as HTMLInputElement;
                                        const typeEl = document.getElementById('new-res-type') as HTMLSelectElement;

                                        if (titleEl.value && urlEl.value) {
                                            setForm({
                                                ...form,
                                                resources: [...(form.resources || []), {
                                                    id: Date.now().toString(),
                                                    title: titleEl.value,
                                                    url: urlEl.value,
                                                    type: typeEl.value as any
                                                }]
                                            });
                                            titleEl.value = '';
                                            urlEl.value = '';
                                        }
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={16} /> Add
                                </button>
                            </div>

                            <div className="space-y-3">
                                {form.resources?.map((res, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                {res.type === 'video' ? <Video size={20} /> : res.type === 'file' ? <FileText size={20} /> : <Link size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{res.title}</h4>
                                                <p className="text-xs text-slate-400">{res.url}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newRes = [...(form.resources || [])];
                                                newRes.splice(idx, 1);
                                                setForm({ ...form, resources: newRes });
                                            }}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                                {(!form.resources || form.resources.length === 0) && (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                                        No resources attached.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* WORKFLOW TAB */}
                {activeTab === 'workflow' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        {form.defaultWorkflowId ? (
                            (() => {
                                const workflow = processTemplates.find(p => p.id === form.defaultWorkflowId);
                                if (!workflow) return <div className="text-red-500">Workflow not found</div>;

                                return (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-blue-900">Mission Workflow: {workflow.name}</h3>
                                                <p className="text-sm text-blue-700">Add specific documents, images, or links for each step of this mission.</p>
                                            </div>
                                            <div className="hidden md:block">
                                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500">
                                                    <Layout size={24} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {workflow.phases?.map(((phase: any, index: number) => (
                                                <div key={phase.id || index} className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden">
                                                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-slate-500`}>
                                                            {index + 1}
                                                        </div>
                                                        <h4 className="font-bold text-slate-700">{phase.name}</h4>
                                                    </div>

                                                    <div className="p-4 bg-white">
                                                        {/* Existing Resources */}
                                                        <div className="space-y-2 mb-4">
                                                            {form.stepResources?.[phase.id]?.map((res: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 group">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-400">
                                                                            {res.type === 'video' ? <Video size={14} /> : res.type === 'file' ? <FileText size={14} /> : res.type === 'image' ? <ImageIcon size={14} /> : <Link size={14} />}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700">{res.title}</p>
                                                                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{res.url}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            const current = form.stepResources?.[phase.id] || [];
                                                                            const updated = current.filter((_: any, i: number) => i !== idx);
                                                                            setForm({
                                                                                ...form,
                                                                                stepResources: {
                                                                                    ...form.stepResources,
                                                                                    [phase.id]: updated
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!form.stepResources?.[phase.id] || form.stepResources[phase.id].length === 0) && (
                                                                <p className="text-xs text-slate-400 italic">No mission-specific resources added.</p>
                                                            )}
                                                        </div>

                                                        {/* Add Resource Small Form */}
                                                        <div className="flex gap-2 items-center">
                                                            <input
                                                                id={`title-${phase.id}`}
                                                                placeholder="Add resource title..."
                                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                                            />
                                                            <select
                                                                id={`type-${phase.id}`}
                                                                className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                                            >
                                                                <option value="link">Link</option>
                                                                <option value="image">Image</option>
                                                                <option value="video">Video</option>
                                                                <option value="file">File</option>
                                                            </select>
                                                            <input
                                                                id={`url-${phase.id}`}
                                                                placeholder="URL..."
                                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const titleInput = document.getElementById(`title-${phase.id}`) as HTMLInputElement;
                                                                    const urlInput = document.getElementById(`url-${phase.id}`) as HTMLInputElement;
                                                                    const typeInput = document.getElementById(`type-${phase.id}`) as HTMLSelectElement;

                                                                    if (titleInput.value && urlInput.value) {
                                                                        const existing = form.stepResources?.[phase.id] || [];
                                                                        const newRes = {
                                                                            id: Date.now().toString(),
                                                                            title: titleInput.value,
                                                                            url: urlInput.value,
                                                                            type: typeInput.value,
                                                                        };

                                                                        setForm({
                                                                            ...form,
                                                                            stepResources: {
                                                                                ...form.stepResources,
                                                                                [phase.id]: [...existing, newRes]
                                                                            }
                                                                        });

                                                                        titleInput.value = '';
                                                                        urlInput.value = '';
                                                                    }
                                                                }}
                                                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )))}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                                <Layout size={40} className="mx-auto mb-4 text-slate-300" />
                                <p className="font-bold mb-2">No Workflow Selected</p>
                                <p className="text-sm max-w-md mx-auto mb-6">Please select a "Process Workflow" in the Details tab first to customize its steps.</p>
                                <button onClick={() => setActiveTab('details')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm">
                                    Go to Details
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'targeting' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Target Grades</label>
                            <div className="flex flex-wrap gap-3">
                                {availableGrades.length > 0 ? availableGrades.map(g => {
                                    const isSelected = form.targetAudience?.grades?.includes(g.id);
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => {
                                                const current = form.targetAudience?.grades || [];
                                                const newGrades = isSelected ? current.filter(id => id !== g.id) : [...current, g.id];
                                                setForm({ ...form, targetAudience: { ...form.targetAudience, grades: newGrades } });
                                            }}
                                            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-all ${isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            {isSelected && <Check size={16} />}
                                            {g.name}
                                        </button>
                                    );
                                }) : (
                                    <p className="text-slate-400 italic">No grades found in Programs.</p>
                                )}
                            </div>
                        </div>

                        {/* Target Groups */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Target Groups (Optional)</label>
                            <p className="text-xs text-slate-500 mb-3 italic">Leave empty to target all groups in selected grades</p>
                            <div className="flex flex-wrap gap-3">
                                {(() => {
                                    // Get groups only from selected grades
                                    const selectedGradeIds = form.targetAudience?.grades || [];
                                    const gradeSpecificGroups: string[] = [];

                                    if (selectedGradeIds.length > 0 && programs.length > 0) {
                                        // Find the grades in programs and extract their groups
                                        programs.forEach(program => {
                                            if (program.grades) {
                                                program.grades.forEach((grade: any) => {
                                                    if (selectedGradeIds.includes(grade.id)) {
                                                        // This grade is selected, add its groups
                                                        if (grade.groups && Array.isArray(grade.groups)) {
                                                            grade.groups.forEach((group: any) => {
                                                                if (group.name && !gradeSpecificGroups.includes(group.name)) {
                                                                    gradeSpecificGroups.push(group.name);
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }

                                    return gradeSpecificGroups.length > 0 ? (
                                        <>
                                            {/* All Groups Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm({ ...form, targetAudience: { ...form.targetAudience, groups: [] } });
                                                }}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${!form.targetAudience?.groups || form.targetAudience.groups.length === 0
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                All Groups
                                            </button>

                                            {/* Specific Groups */}
                                            {/* Specific Groups */}
                                            {gradeSpecificGroups.map(groupName => {
                                                const isSelected = form.targetAudience?.groups?.includes(groupName);
                                                return (
                                                    <button
                                                        key={groupName}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = form.targetAudience?.groups || [];
                                                            // If currently empty (All), start a new list
                                                            const baseList = current;
                                                            const newGroups = isSelected
                                                                ? baseList.filter(g => g !== groupName)
                                                                : [...baseList, groupName];
                                                            setForm({ ...form, targetAudience: { ...form.targetAudience, groups: newGroups } });
                                                        }}
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isSelected
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {groupName}
                                                    </button>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">Select grades to see available groups.</p>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Target Specific Students */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Target Specific Students (Optional)</label>
                            <p className="text-xs text-slate-500 mb-3 italic">Limit this mission to selected students. If selected, ONLY these students will see it.</p>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
                                {(() => {
                                    const selectedGradeIds = form.targetAudience?.grades || [];
                                    if (selectedGradeIds.length === 0) {
                                        return <p className="text-slate-400 italic text-sm text-center py-4">Select grades first to load students.</p>;
                                    }

                                    // Filter Enrollments based on Grades (and Groups if selected)
                                    const relevantEnrollments = enrollments.filter(e => {
                                        const gradeMatch = selectedGradeIds.includes(e.gradeId);
                                        const groupMatch = (!form.targetAudience?.groups || form.targetAudience.groups.length === 0)
                                            ? true // All groups
                                            : form.targetAudience.groups.includes(e.groupName); // Match group name
                                        return gradeMatch && groupMatch;
                                    });

                                    if (relevantEnrollments.length === 0) {
                                        return <p className="text-slate-400 italic text-sm text-center py-4">No students found in selected grades/groups.</p>;
                                    }

                                    return (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {relevantEnrollments.map(enrollment => {
                                                const student = students.find(s => s.id === enrollment.studentId);
                                                // Fallback if student data missing
                                                const studentName = student?.name || enrollment.studentName || 'Unknown Student';

                                                // Use studentId for targeting
                                                const targetId = enrollment.studentId;
                                                const isSelected = form.targetAudience?.students?.includes(targetId);

                                                return (
                                                    <button
                                                        key={enrollment.id}
                                                        onClick={() => {
                                                            const current = form.targetAudience?.students || [];
                                                            const newStudents = isSelected
                                                                ? current.filter(id => id !== targetId)
                                                                : [...current, targetId];
                                                            setForm({ ...form, targetAudience: { ...form.targetAudience, students: newStudents } });
                                                        }}
                                                        className={`p-2 rounded-lg text-left border transition-all flex items-center gap-2 ${isSelected
                                                            ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                                                            }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                                                            }`}>
                                                            {studentName[0]}
                                                        </div>
                                                        <span className="text-xs font-bold truncate">{studentName}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-[10px] text-slate-400">
                                    {form.targetAudience?.students?.length || 0} students selected
                                </p>
                                {(form.targetAudience?.students?.length || 0) > 0 && (
                                    <button
                                        onClick={() => setForm({ ...form, targetAudience: { ...form.targetAudience, students: [] } })}
                                        className="text-[10px] text-red-400 hover:text-red-500 font-bold"
                                    >
                                        Clear Selection
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PUBLISHING TAB */}
                {activeTab === 'publishing' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'draft', label: 'Draft', desc: 'Hidden from students', icon: Layout, selected: 'border-slate-700 bg-slate-100', iconSelected: 'bg-slate-800 text-white', titleSelected: 'text-slate-950', textSelected: 'text-slate-700', checkSelected: 'text-slate-700' },
                                { id: 'featured', label: 'Featured', desc: 'Promoted in the library', icon: Rocket, selected: 'border-amber-500 bg-amber-50', iconSelected: 'bg-amber-500 text-white', titleSelected: 'text-amber-950', textSelected: 'text-amber-800', checkSelected: 'text-amber-600' },
                                { id: 'assigned', label: 'Assigned', desc: 'Active for targeted grades', icon: Users, selected: 'border-emerald-500 bg-emerald-50', iconSelected: 'bg-emerald-600 text-white', titleSelected: 'text-emerald-950', textSelected: 'text-emerald-800', checkSelected: 'text-emerald-600' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setForm({ ...form, status: opt.id as any })}
                                    className={`relative p-8 rounded-2xl border-2 text-left transition-all ${form.status === opt.id
                                        ? opt.selected
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${form.status === opt.id ? opt.iconSelected : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        <opt.icon size={24} />
                                    </div>
                                    <h3 className={`text-xl font-black ${form.status === opt.id ? opt.titleSelected : 'text-slate-800'}`}>
                                        {opt.label}
                                    </h3>
                                    <p className={`text-sm mt-1 font-medium ${form.status === opt.id ? opt.textSelected : 'text-slate-500'}`}>
                                        {opt.desc}
                                    </p>
                                    {form.status === opt.id && (
                                        <div className={`absolute top-4 right-4 ${opt.checkSelected}`}>
                                            <Check size={24} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-slate-200 bg-white flex justify-between shrink-0">
                <button
                    onClick={prevTab}
                    disabled={activeTab === 'details'}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ArrowLeft size={20} /> Previous
                </button>
                <button
                    onClick={nextTab}
                    disabled={activeTab === 'publishing'}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    Next <ArrowRight size={20} />
                </button>
            </div>
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-mission-title">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700"><Trash2 size={21} /></div>
                        <h3 id="delete-mission-title" className="mt-4 text-xl font-black text-slate-950">Delete this mission?</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">The mission and all linked student submissions will be permanently deleted. This action cannot be undone.</p>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setShowDeleteConfirm(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50">Keep mission</button>
                            <button onClick={handleDelete} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50">{isSaving ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />} Delete mission</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
