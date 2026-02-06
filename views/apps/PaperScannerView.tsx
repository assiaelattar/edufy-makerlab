
import React, { useState } from 'react';
import { Scan, TextSelect, FileText, Upload, Camera } from 'lucide-react';

export const PaperScannerView = () => {
    const [isScanning, setIsScanning] = useState(false);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Scan size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Paper Note Scanner</h1>
                    <p className="text-slate-400">Digitize handwritten notes and exams instantly using OCR.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-emerald-500/50 transition-colors cursor-pointer group h-[400px]">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
                        <Upload size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Upload Handwritten Note</h3>
                        <p className="text-sm text-slate-500 mt-1">Drag & Drop or Click to Browse</p>
                    </div>
                    <div className="text-xs text-slate-600 font-mono bg-slate-950 px-2 py-1 rounded">Supported: JPG, PNG, PDF</div>
                </div>

                {/* Output Area (Mock) */}
                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[400px] flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20">
                            {isScanning && <div className="h-full bg-emerald-500 animate-progress"></div>}
                        </div>

                        <div className="flex-1 opacity-50 flex flex-col items-center justify-center text-center space-y-3">
                            <TextSelect size={48} className="text-slate-700" />
                            <p className="text-slate-600 font-medium">Extracted text will appear here</p>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex gap-2">
                            <button className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-sm font-bold opacity-50 cursor-not-allowed">Copy Text</button>
                            <button className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-sm font-bold opacity-50 cursor-not-allowed">Save as Doc</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
