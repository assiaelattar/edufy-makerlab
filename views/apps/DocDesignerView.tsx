
import React from 'react';
import { FileText, Wand2, Download } from 'lucide-react';

export const DocDesignerView = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">AI Document Designer</h1>
                    <p className="text-slate-400">Create professional reports, certificates, and letters in seconds.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document Type</label>
                            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm outline-none">
                                <option>Certificate of Completion</option>
                                <option>Progress Report</option>
                                <option>Official Letter</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Theme</label>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="h-8 bg-slate-800 rounded cursor-pointer border-2 border-blue-500"></div>
                                <div className="h-8 bg-white rounded cursor-pointer border border-slate-700"></div>
                                <div className="h-8 bg-slate-900 rounded cursor-pointer border border-slate-700"></div>
                            </div>
                        </div>
                    </div>

                    <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                        <Wand2 size={18} /> Generate Layout
                    </button>
                </div>

                <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[500px] shadow-inner p-8 relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button className="p-2 bg-white text-slate-600 shadow-sm rounded border hover:bg-slate-50"><Download size={16} /></button>
                    </div>
                    <div className="text-center mt-32 opacity-30">
                        <FileText size={64} className="mx-auto text-slate-400 mb-4" />
                        <h3 className="text-xl font-serif text-slate-800">Document Preview</h3>
                    </div>
                </div>
            </div>
        </div>
    );
};
