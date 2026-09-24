
import React, { useRef, useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, Link, Image as ImageIcon } from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { StudentProject, Station, StationType } from '../../types';
import { api } from '../../services/api';

interface StudentProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    initialData?: StudentProject | null;
    onSave?: () => void;
    mode?: 'standard' | 'showcase';
}

const STATIONS: { id: StationType; label: string }[] = [
    { id: 'Robotics', label: 'Robotics' },
    { id: 'Coding', label: 'Coding' },
    { id: 'Design', label: 'Design' },
    { id: 'Circuits', label: 'Circuits' },
    { id: 'Engineering', label: 'Engineering' },
    { id: 'Game Design', label: 'Game Design' },
    { id: 'Multimedia', label: 'Multimedia' },
    { id: 'Branding', label: 'Branding' }
];

export const StudentProjectModal: React.FC<StudentProjectModalProps> = ({
    isOpen,
    onClose,
    studentId,
    studentName,
    initialData,
    onSave,
    mode = 'standard'
}) => {
    const { user, userProfile: authProfile } = useAuth();
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [station, setStation] = useState<StationType>('Robotics');
    const [status, setStatus] = useState<StudentProject['status']>('planning');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [presentationUrl, setPresentationUrl] = useState('');

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const uploadScopeId = useRef(initialData?.id || `portfolio-${studentId}-${Date.now()}`).current;
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setDescription(initialData.description);
            setStation(normalizeStationToType(initialData.station));
            setStatus(initialData.status);
            setThumbnailUrl(initialData.thumbnailUrl || initialData.coverImage || '');
            setPresentationUrl(initialData.presentationUrl || '');
        } else {
            // Reset for new project
            setTitle(mode === 'showcase' ? 'Project Showcase' : '');
            setDescription('');
            setStation('Robotics');
            setStatus(mode === 'showcase' ? 'published' : 'planning');
            setThumbnailUrl('');
            setPresentationUrl('');
        }
        setFormError(null);
        setShowDeleteConfirm(false);
    }, [initialData, isOpen, mode]);

    // Helper to match string to StationType
    const normalizeStationToType = (str: string): StationType => {
        const found = STATIONS.find(s => s.id.toLowerCase() === str.toLowerCase() || s.label.toLowerCase() === str.toLowerCase());
        return found ? found.id : 'Robotics';
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

            if (!authProfile?.organizationId || !user?.uid) {
                throw new Error('Your instructor account is not fully linked to an organization.');
            }
            setUploadProgress(0);
            const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const url = await api.uploadFile(
                file,
                `instructor-projects/${authProfile.organizationId}/${user.uid}/${uploadScopeId}/cover-${Date.now()}-${safeFileName}`,
                setUploadProgress
            );
            setThumbnailUrl(url);

        } catch (error: any) {
            console.error("Error processing image:", error);
            setUploadError(error?.message || 'The image could not be uploaded.');
        } finally {
            setIsUploading(false);
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
        if (!title.trim()) {
            setFormError('Add a project title before saving.');
            return;
        }

        const orgId = initialData?.organizationId || authProfile?.organizationId;
        if (!orgId) {
            setFormError('Your account is not connected to an organization. Reopen the instructor session and try again.');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const projectId = initialData?.id || `proj_${studentId}_${Date.now()}`;

            const projectData: any = {
                id: projectId,
                studentId,
                organizationId: orgId,
                studentName, // Denormalize for easier access
                title,
                description,
                station: station.toLowerCase(), // ERP convention
                status,
                thumbnailUrl,
                coverImage: thumbnailUrl, // Save to both for compatibility
                mediaUrls: thumbnailUrl ? [thumbnailUrl] : [], // Save to mediaUrls for Portfolio/Showcase compatibility
                presentationUrl, // Save the link
                updatedAt: Timestamp.now(),
            };

            // If creating new
            if (!initialData) {
                projectData.createdAt = Timestamp.now();
                // Initialize required arrays
                projectData.steps = [
                    { id: '1', title: 'Start', status: 'todo' }
                ];
                projectData.commits = [];
                projectData.skills = [];
                projectData.resources = [];
            }

            await setDoc(doc(db, 'student_projects', projectId), projectData, { merge: true });

            if (onSave) onSave();
            onClose();
        } catch (error) {
            console.error("Error saving project:", error);
            setFormError(error instanceof Error ? error.message : 'The project could not be saved.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id) return;
        setIsSaving(true);
        setFormError(null);
        try {
            await deleteDoc(doc(db, 'student_projects', initialData.id));
            if (onSave) onSave();
            onClose();
        } catch (error: any) {
            console.error("Error deleting project:", error);
            setFormError(error?.message || 'The project could not be deleted.');
            setShowDeleteConfirm(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
            onPaste={handlePaste}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-project-modal-title"
        >
            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Student portfolio</p>
                        <h2 id="student-project-modal-title" className="mt-1 text-xl font-black text-slate-950">
                            {initialData ? 'Edit Mission' : mode === 'showcase' ? 'Upload Showcase' : 'New Mission'}
                        </h2>
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                            For {studentName}
                        </p>
                    </div>
                    <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-900" aria-label="Close project editor">
                        <X size={21} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Title</label>
                            <input
                                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                placeholder="e.g. My Amazing Robot"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Station</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                    value={station}
                                    onChange={e => setStation(e.target.value as StationType)}
                                >
                                    {STATIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Status</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                    value={status}
                                    onChange={e => setStatus(e.target.value as any)}
                                >
                                    <option value="planning">Planning (Draft)</option>
                                    <option value="building">Building (In Progress)</option>
                                    <option value="submitted">Submitted (Review)</option>
                                    <option value="published">Published (Done)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Description</label>
                            <textarea
                                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-600 focus:border-indigo-500 outline-none h-40 resize-none whitespace-pre-wrap"
                                placeholder={`🔹 Project Title: ...

🧩 Description:
Explain what was built, how, and why.

🛠️ Tools Used:
Tinkercad, 3D Printing, etc.

🎯 Skills Gained:
Critical thinking, design...`}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Project Cover Image</label>
                        <div className="flex items-start gap-4">
                            {/* Preview */}
                            <div className="w-32 h-24 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 shrink-0 relative group">
                                {thumbnailUrl ? (
                                    <img src={thumbnailUrl} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon size={24} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                                        placeholder="https://..."
                                        value={thumbnailUrl}
                                        onChange={e => setThumbnailUrl(e.target.value)}
                                    />
                                    <input
                                        type="file"
                                        id="modal-cover-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                    <label
                                        htmlFor="modal-cover-upload"
                                        className={`px-3 py-2 rounded-lg border-2 flex items-center gap-2 font-bold cursor-pointer text-xs transition-all ${isUploading
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                            }`}
                                    >
                                        {isUploading ? (<span className="tabular-nums">{uploadProgress}%</span>) : (<Upload size={14} />)}
                                        {isUploading ? 'Uploading' : 'Upload'}
                                    </label>
                                </div>
                                {uploadError && <p className="text-[10px] text-red-500 font-bold">{uploadError}</p>}
                                <p className="text-[10px] text-slate-400">
                                    Upload a photo of the physical project or a screenshot.
                                    <br /><span className="text-indigo-500 font-bold">Tip: You can paste (Ctrl+V) an image directly here!</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Project Link */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Project Link (Tinkercad, Scratch, etc.)</label>
                        <div className="flex items-center gap-2">
                            <Link size={20} className="text-slate-300" />
                            <input
                                className="flex-1 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                placeholder="https://www.tinkercad.com/things/..."
                                value={presentationUrl}
                                onChange={e => setPresentationUrl(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                {formError && <div role="alert" className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{formError}</div>}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    {initialData ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSaving}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : <><Save size={16} /> {mode === 'showcase' ? 'Publish Showcase' : 'Save Mission'}</>}
                        </button>
                    </div>
                </div>
            </div>
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-student-project-title">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 id="delete-student-project-title" className="text-xl font-black text-slate-950">Delete this project?</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">This action cannot be undone and removes the project from the learner portfolio.</p>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setShowDeleteConfirm(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50">Keep project</button>
                            <button onClick={handleDelete} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={17} /> Delete project</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
