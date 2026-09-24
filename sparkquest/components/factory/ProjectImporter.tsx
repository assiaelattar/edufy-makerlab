import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProjectTemplate } from '../../types';

interface ProjectImporterProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const ProjectImporter: React.FC<ProjectImporterProps> = ({ onClose, onSuccess }) => {
    const { actions } = useFactoryData();
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

                // Validate required columns
                const requiredColumns = ['Title', 'Description', 'Station'];
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

    const mapRowToProject = (row: any): Omit<ProjectTemplate, 'id'> => {
        // Helper to parse semi-colon OR comma lists
        const parseList = (str: string) => str ? str.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

        // Try to find image field (case-insensitiveish)
        const coverImage = row['CoverImage'] || row['ThumbnailUrl'] || row['Image'] || null;

        return {
            title: row['Title'] || 'Untitled Project',
            thumbnailUrl: coverImage,
            description: row['Description'] || '',
            hook: row['Hook'],
            station: row['Station'] || 'Robotics',
            difficulty: (row['Difficulty']?.toLowerCase() as any) || 'intermediate',
            duration: row['Duration'],
            skills: [], // Could parse if added to CSV

            // Real World
            realWorldApp: {
                title: row['RealWorld_Title'],
                description: row['RealWorld_Description'] || '',
                companies: parseList(row['RealWorld_Companies']).map(c => ({
                    name: c,
                    // Assign random color or default
                    color: ['bg-red-600', 'bg-blue-600', 'bg-black', 'bg-yellow-500'][Math.floor(Math.random() * 4)]
                }))
            },

            // Challenges (1-3)
            keyChallenges: [
                { title: row['Challenge_1_Title'], desc: row['Challenge_1_Desc'], color: 'from-orange-400 to-red-500' },
                { title: row['Challenge_2_Title'], desc: row['Challenge_2_Desc'], color: 'from-blue-400 to-indigo-500' },
                { title: row['Challenge_3_Title'], desc: row['Challenge_3_Desc'], color: 'from-emerald-400 to-teal-500' }
            ].filter(c => c.title), // Only keep if title exists

            // Outcomes (1-3)
            learningOutcomes: [
                { id: 1, title: row['Outcome_1_Title'], desc: row['Outcome_1_Desc'], theme: 'blue' },
                { id: 2, title: row['Outcome_2_Title'], desc: row['Outcome_2_Desc'], theme: 'yellow' },
                { id: 3, title: row['Outcome_3_Title'], desc: row['Outcome_3_Desc'], theme: 'red' }
            ].filter(o => o.title),

            // Technologies
            technologies: parseList(row['Technologies']).map(t => {
                const colorMap: any = {
                    'Python': { color: 'text-blue-500', bg: 'bg-blue-100', icon: 'Code' },
                    'Electronics': { color: 'text-amber-500', bg: 'bg-amber-100', icon: 'Cpu' },
                    '3D Modeling': { color: 'text-rose-500', bg: 'bg-rose-100', icon: 'Box' },
                    'Sensors': { color: 'text-emerald-500', bg: 'bg-emerald-100', icon: 'Zap' }
                };
                const def = colorMap[t] || { color: 'text-slate-500', bg: 'bg-slate-100', icon: 'PenTool' };
                return { name: t, ...def };
            }),

            status: 'draft',
            createdAt: undefined // Field will be added by serverTimestamp
        };
    };

    const handleImport = async () => {
        if (!previewData.length) return;
        setIsImporting(true);
        try {
            const promises = previewData.map(row => actions.addProjectTemplate(mapRowToProject(row)));
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="mission-import-title">
            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Mission library</p>
                        <h2 id="mission-import-title" className="mt-1 text-xl font-black text-slate-950">Import missions</h2>
                        <p className="text-sm text-slate-500">Upload CSV to bulk create missions</p>
                    </div>
                    <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close mission import">
                        <X size={21} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!file ? (
                        <div
                            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center transition-colors hover:border-blue-500 hover:bg-blue-50"
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
                            role="button"
                            tabIndex={0}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <Upload size={32} />
                            </div>
                            <h3 className="font-bold text-slate-700 text-lg mb-1">Click to upload CSV</h3>
                            <p className="text-slate-400">or drag and drop here</p>
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
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); setErrors([]); }} className="text-sm font-bold text-slate-500 hover:text-red-500">
                                    Change
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
                                                    <th className="px-4 py-3">Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-100/50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{row.Title}</td>
                                                        <td className="px-4 py-3 text-slate-500">{row.Station}</td>
                                                        <td className="px-4 py-3 text-slate-500">{row.Duration}</td>
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
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isImporting && <Loader2 size={18} className="animate-spin" />}
                        {isImporting ? 'Importing...' : 'Import Projects'}
                    </button>
                </div>
            </div>
        </div>
    );
};
