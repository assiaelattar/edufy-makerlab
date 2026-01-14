
import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, Link, Image as ImageIcon } from 'lucide-react';
import { db, storage } from '../../services/firebase';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { StudentProject, Station, StationType } from '../../types';
import { useFactoryData } from '../../hooks/useFactoryData';

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
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [station, setStation] = useState<StationType>('Robotics');
    const [status, setStatus] = useState<'planning' | 'building' | 'submitted' | 'published'>('planning');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [presentationUrl, setPresentationUrl] = useState('');

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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
            setStatus(mode === 'showcase' ? 'published' : 'planning');
            setThumbnailUrl('');
            setPresentationUrl('');
        }
    }, [initialData, isOpen, mode]);

    // Helper to match string to StationType
    const normalizeStationToType = (str: string): StationType => {
        const found = STATIONS.find(s => s.id.toLowerCase() === str.toLowerCase() || s.label.toLowerCase() === str.toLowerCase());
        return found ? found.id : 'Robotics';
    };

    const processAndUploadImage = async (file: File) => {
        // Validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG, WEBP)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('File is too large. Please upload an image under 5MB.');
            return;
        }

        try {
            setUploadError(null);
            setIsUploading(true);
            setUploadProgress(1);

            // 1. Resize & Compress Image (Client-side)
            const compressImage = (file: File) => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = () => {
                        const elem = document.createElement('canvas');
                        const maxSize = 800; // Match Edufy's likely max size or keep 1200
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                            }
                        }

                        elem.width = width;
                        elem.height = height;
                        const ctx = elem.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);

                        // Return Base64 Data URL directly
                        const dataUrl = elem.toDataURL('image/jpeg', 0.7);
                        resolve(dataUrl);
                    };
                    img.onerror = error => reject(error);
                };
                reader.onerror = error => reject(error);
            });

            const base64String = await compressImage(file);
            console.log(`[Upload] Image processed. Size: ~${Math.round(base64String.length / 1024)} KB`);

            // 2. Store Base64 directly (Edufy Style)
            // No external upload needed.
            setThumbnailUrl(base64String);
            setUploadProgress(100);
            setIsUploading(false);

        } catch (error: any) {
            console.error("Error processing image:", error);
            setUploadError("Failed to process image.");
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
            alert('Please enter a project title');
            return;
        }

        setIsSaving(true);
        try {
            const projectId = initialData?.id || `proj_${studentId}_${Date.now()}`;

            const projectData: any = {
                id: projectId,
                studentId,
                studentName, // Denormalize for easier access
                title,
                description,
                station: station.toLowerCase(), // ERP convention
                status,
                thumbnailUrl,
                coverImage: thumbnailUrl, // Save to both for compatibility
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
            alert("Failed to save project");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id) return;

        if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            setIsSaving(true);
            try {
                await deleteDoc(doc(db, 'student_projects', initialData.id));
                if (onSave) onSave();
                onClose();
            } catch (error) {
                console.error("Error deleting project:", error);
                alert("Failed to delete project");
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4"
            onPaste={handlePaste}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">
                            {initialData ? 'Edit Mission' : mode === 'showcase' ? 'Upload Showcase' : 'New Mission'}
                        </h2>
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                            For {studentName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
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
                                        {isUploading ? ('...') : (<Upload size={14} />)}
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
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    {initialData ? (
                        <button
                            onClick={handleDelete}
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
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : <><Save size={16} /> {mode === 'showcase' ? 'Publish Showcase' : 'Save Mission'}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
