import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { StudentProject } from '../../types';

import { useAuth } from '../../context/AuthContext';

interface StudentProjectImporterProps {
    onClose: () => void;
    onSuccess: () => void;
    studentId: string;
    studentName: string;
    organizationId?: string;
}

export const StudentProjectImporter: React.FC<StudentProjectImporterProps> = ({ onClose, onSuccess, studentId, studentName, organizationId }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rawData = results.data as any[];

                // CRITICAL FIX: Allow import if data exists, even if there are "errors" (often warnings)
                if (results.errors.length > 0 && rawData.length === 0) {
                    setErrors(results.errors.map(e => `Row ${e.row}: ${e.message}`));
                    return;
                }

                // Validate required columns
                const requiredColumns = ['Title', 'Description'];
                const headers = results.meta.fields || [];
                const missingColumns = requiredColumns.filter(col => !headers.includes(col));

                if (missingColumns.length > 0) {
                    setErrors([`Missing columns: ${missingColumns.join(', ')}`]);
                    setPreviewData([]);
                } else {
                    setErrors([]);
                    setPreviewData(rawData);
                }
            },
            error: (error) => {
                setErrors([`File read error: ${error.message}`]);
            }
        });
    };

    const mapRowToProject = (row: any): Omit<StudentProject, 'id'> => {
        // Helper to parse semi-colon OR comma lists
        const parseList = (str: string) => str ? str.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

        // Try to find image field (case-insensitiveish)
        const coverImage = row['CoverImage'] || row['ThumbnailUrl'] || row['Image'] || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80'; // Fallback image

        return {
            studentId,
            studentName,
            organizationId: organizationId || 'makerlab-academy',
            title: row['Title'] || 'Untitled Project',
            thumbnailUrl: coverImage,
            coverImage: coverImage, // Ensure this is set for Admin/Parent views
            mediaUrls: coverImage ? [coverImage] : [], // Ensure this is set for Portfolio views
            description: row['Description'] || '',
            station: row['Station'] || 'Robotics',
            status: 'published', // SHOWCASE projects are published by default

            // Optional fields
            videoUrl: row['VideoUrl'] || '',
            gallery: parseList(row['Gallery']),

            // Default structure
            steps: [],
            commits: [],
            resources: [], // Default empty resources
            skills: parseList(row['Skills']),

            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any
        };
    };

    const handleImport = async () => {
        if (!previewData.length) return;
        setIsImporting(true);
        try {
            const promises = previewData.map(row => {
                const projectData = mapRowToProject(row);
                return addDoc(collection(db, 'student_projects'), projectData);
            });
            await Promise.all(promises);
            onSuccess();
            onClose();
        } catch (err) {
            setErrors(['Failed to import projects. Check console.']);
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Import Showcase Projects</h2>
                        <p className="text-sm text-slate-500">Bulk upload for {studentName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Input Method Switcher */}
                    <div className="flex gap-4 mb-6 border-b border-slate-100">
                        <button
                            onClick={() => { setFile(null); setPreviewData([]); setErrors([]); }}
                            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${!file && previewData.length === 0 ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Upload File
                        </button>
                        <button
                            onClick={() => { setFile(null); setPreviewData([]); setErrors([]); }}
                            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${!file && previewData.length === 0 ? 'border-transparent text-slate-400 hover:text-slate-600' : 'border-indigo-600 text-indigo-600'}`}
                        >
                            Paste Text
                        </button>
                    </div>

                    {!file && previewData.length === 0 ? (
                        <div className="space-y-6">
                            {/* File Upload Area */}
                            <div
                                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors group mb-6"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 mb-3 transition-colors">
                                    <Upload size={24} />
                                </div>
                                <h3 className="font-bold text-slate-700 text-sm mb-1">Upload CSV File</h3>
                            </div>

                            {/* Separator */}
                            <div className="relative flex items-center justify-center mb-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                <div className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase">OR PASTE CSV CONTENT</div>
                            </div>

                            {/* Paste Area */}
                            <textarea
                                className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                placeholder="Paste your CSV text here..."
                                onChange={(e) => {
                                    if (e.target.value.trim().length > 10) {
                                        // Auto-parse on paste
                                        const text = e.target.value;
                                        // Create dummy file object for consistency or just parse string directly
                                        Papa.parse(text, {
                                            header: true,
                                            skipEmptyLines: true,
                                            complete: (results) => {
                                                const rawData = results.data as any[];
                                                if (results.errors.length > 0 && rawData.length === 0) {
                                                    setErrors(results.errors.map(err => `Row ${err.row}: ${err.message}`));
                                                } else {
                                                    setErrors([]);
                                                    setPreviewData(rawData);
                                                }
                                            }
                                        });
                                    }
                                }}
                            ></textarea>
                            <p className="text-xs text-slate-400">Paste headers and data directly. The system will auto-detect columns.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{file ? file.name : 'Pasted Content'}</p>
                                        <p className="text-xs text-slate-500">{previewData.length} rows detected</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); setErrors([]); }} className="text-sm font-bold text-slate-500 hover:text-red-500">
                                    Clear
                                </button>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 text-sm space-y-1">
                                    <div className="font-bold flex items-center gap-2">
                                        <AlertCircle size={16} /> Import Error
                                    </div>
                                    {errors.map((e, i) => <div key={i}>{e}</div>)}
                                </div>
                            )}

                            {previewData.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <CheckCircle size={16} className="text-green-500" />
                                        Ready to Import {previewData.length} Projects
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3">Title</th>
                                                    <th className="px-4 py-3">Station</th>
                                                    <th className="px-4 py-3">Image</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-100/50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{row.Title}</td>
                                                        <td className="px-4 py-3 text-slate-500">{row.Station}</td>
                                                        <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{row.CoverImage || row.ThumbnailUrl || 'Default'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={previewData.length === 0 || isImporting}
                        className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isImporting && <Loader2 size={18} className="animate-spin" />}
                        {isImporting ? 'Importing...' : 'Confirm Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};
