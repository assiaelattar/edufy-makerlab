import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

// We duplicate types here or import them if available. Using any for speed/compatibility.
interface ProjectImporterProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const ProjectImporter: React.FC<ProjectImporterProps> = ({ onClose, onSuccess }) => {
    // const { actions } = useFactoryData(); // Removed
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
                if (results.errors.length > 0) {
                    setErrors(results.errors.map(e => `Row ${e.row}: ${e.message}`));
                    return;
                }
                const rawData = results.data as any[];
                setErrors([]);
                setPreviewData(rawData);
            },
            error: (error) => {
                setErrors([`File read error: ${error.message}`]);
            }
        });
    };

    const mapRowToProject = (row: any): any => {
        const parseList = (str: string) => str ? str.split(';').map(s => s.trim()).filter(Boolean) : [];

        return {
            title: row['Title'] || 'Untitled Project',
            description: row['Description'] || '',
            hook: row['Hook'],
            station: row['Station'] || 'Robotics',
            difficulty: (row['Difficulty']?.toLowerCase() as any) || 'intermediate',
            duration: row['Duration'],
            skills: [],

            realWorldApp: {
                title: row['RealWorld_Title'],
                description: row['RealWorld_Description'] || '',
                companies: parseList(row['RealWorld_Companies']).map(c => ({
                    name: c,
                    color: 'bg-slate-800' // Default color
                }))
            },

            keyChallenges: [
                { title: row['Challenge_1_Title'], desc: row['Challenge_1_Desc'], color: 'from-orange-400 to-red-500' },
                { title: row['Challenge_2_Title'], desc: row['Challenge_2_Desc'], color: 'from-blue-400 to-indigo-500' },
                { title: row['Challenge_3_Title'], desc: row['Challenge_3_Desc'], color: 'from-emerald-400 to-teal-500' }
            ].filter(c => c.title),

            learningOutcomes: [
                { id: 1, title: row['Outcome_1_Title'], desc: row['Outcome_1_Desc'], theme: 'blue' },
                { id: 2, title: row['Outcome_2_Title'], desc: row['Outcome_2_Desc'], theme: 'yellow' },
                { id: 3, title: row['Outcome_3_Title'], desc: row['Outcome_3_Desc'], theme: 'red' }
            ].filter(o => o.title),

            technologies: parseList(row['Technologies']).map(t => ({ name: t, color: 'text-slate-600', bg: 'bg-slate-100', icon: 'Code' })),

            status: 'draft'
        };
    };

    const handleImport = async () => {
        if (!previewData.length) return;
        if (!db) {
            setErrors(['Database connection not initialized. Try reloading.']);
            return;
        }
        setIsImporting(true);
        try {
            const promises = previewData.map(async (row) => {
                const projectData = mapRowToProject(row);
                // Create a generic ID or use Title slug
                const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await setDoc(doc(db, 'project_templates', id), {
                    ...projectData,
                    id: id,
                    createdAt: new Date().toISOString()
                });
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Import Showcase Projects</h2>
                        <p className="text-sm text-slate-500">Upload CSV to bulk create</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!file ? (
                        <div
                            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 mb-4 transition-colors">
                                <Upload size={32} />
                            </div>
                            <h3 className="font-bold text-slate-700 text-lg mb-1">Click to upload CSV</h3>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{file.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); setErrors([]); }} className="text-sm font-bold text-slate-500 hover:text-red-500">
                                    Change
                                </button>
                            </div>
                            {errors.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 text-sm">{errors[0]}</div>
                            )}
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="w-full px-5 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isImporting && <Loader2 size={18} className="animate-spin" />}
                                {isImporting ? 'Importing...' : 'Import Projects'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
