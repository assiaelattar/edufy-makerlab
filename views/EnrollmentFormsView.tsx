import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Tablet, Copy, ArrowLeft, FileText, Check, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Program } from '../types';


import { QRCodeSVG } from 'qrcode.react';
import { FormTemplateRenderer } from '../components/enrollment/FormTemplateRenderer';

export const EnrollmentFormsView = () => {
    const { programs, settings } = useAppContext(); // Get settings for base URL
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [qrProgram, setQrProgram] = useState<Program | null>(null); // State for QR Modal
    const componentRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Inscription_${selectedProgram?.name || 'Form'}`,
    });

    const triggerPrint = (program: Program) => {
        setSelectedProgram(program);
        setTimeout(() => {
            handlePrint();
        }, 100);
    };

    // Base URL for the Kiosk Form
    const baseUrl = window.location.origin; // e.g. https://makerlab.academy or localhost

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 relative">

            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Enrollment Forms</h1>
                    <p className="text-slate-500">Generate and print branded enrollment forms for any program.</p>
                </div>
            </div>

            {/* Program Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.filter(p => p.status === 'active').map(program => {
                    // Color Mapping
                    const colorMap = {
                        blue: 'bg-blue-600',
                        purple: 'bg-purple-600',
                        emerald: 'bg-emerald-600',
                        amber: 'bg-amber-600',
                        rose: 'bg-rose-600',
                        cyan: 'bg-cyan-600',
                        slate: 'bg-slate-800'
                    };
                    const badgeColor = colorMap[program.themeColor || 'slate'];

                    return (
                        <div key={program.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group flex flex-col">
                            {/* Color Header */}
                            <div className={`h-3 ${badgeColor}`}></div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">{program.name}</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-bold">{program.type}</p>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">{program.description}</p>

                                {/* Stats/Badges */}
                                <div className="flex gap-2 mb-6">
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{program.packs?.length || 0} Packs</span>
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{program.grades?.length || 0} Levels</span>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => triggerPrint(program)}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 hover:border-slate-800 text-slate-700 font-bold text-sm transition-all hover:bg-slate-50"
                                    >
                                        <Printer size={16} /> Print PDF
                                    </button>
                                    <button
                                        onClick={() => setQrProgram(program)}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                                    >
                                        <Tablet size={16} /> Kiosk / QR
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Hidden Print Area */}
            <div style={{ position: 'absolute', top: 0, left: 0, height: 0, overflow: 'hidden' }}>
                <div ref={componentRef}>
                    {selectedProgram && <FormTemplateRenderer program={selectedProgram} />}
                </div>
            </div>

            {/* QR Code Modal Overlay */}
            {qrProgram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative animate-in zoom-in-50">
                        <button onClick={() => setQrProgram(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><ArrowLeft size={24} /></button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">{qrProgram.name}</h3>
                            <p className="text-sm text-slate-500">Scan to fill enrollment form</p>
                        </div>

                        <div className="flex justify-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <QRCodeSVG value={`${baseUrl}/enroll?program=${qrProgram.id}`} size={200} />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => window.open(`${baseUrl}/enroll?program=${qrProgram.id}`, '_blank')}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                            >
                                <Tablet size={18} /> Open Kiosk Mode
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${baseUrl}/enroll?program=${qrProgram.id}`);
                                    alert('Link copied!');
                                }}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Copy size={18} /> Copy Link
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
