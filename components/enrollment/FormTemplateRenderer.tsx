import React from 'react';
import { Program } from '../../types';

export const FormTemplateRenderer = ({ program }: { program: Program }) => {
    // Dynamic styles based on program color
    const colors = {
        blue: { border: 'border-blue-600', bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
        purple: { border: 'border-purple-600', bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
        emerald: { border: 'border-emerald-600', bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
        amber: { border: 'border-amber-600', bg: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50' },
        rose: { border: 'border-rose-600', bg: 'bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50' },
        cyan: { border: 'border-cyan-600', bg: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50' },
        slate: { border: 'border-slate-800', bg: 'bg-slate-800', text: 'text-slate-800', light: 'bg-slate-100' },
    };

    const theme = colors[program.themeColor || 'blue'];
    const sessionYear = "2024/2025"; // Could be dynamic from settings

    return (
        <div className="w-[210mm] min-h-[297mm] bg-white p-8 mx-auto text-slate-900 font-sans print:p-0 print:shadow-none shadow-2xl relative">
            {/* Design Header */}
            <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl ${theme.bg}`}></div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">{program.name}</h1>
                        <p className="text-sm font-bold text-slate-500 tracking-widest uppercase mt-1">MAKERLAB ACADEMY PROGRAM</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold uppercase text-slate-800">FICHE D'INSCRIPTION</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SESSION {sessionYear}</p>
                </div>
            </div>

            {/* Section 1: Candidate Info */}
            <div className={`mb-6 rounded-lg border-2 ${theme.border} overflow-hidden`}>
                <div className={`${theme.bg} text-white px-4 py-2 font-bold uppercase text-sm flex items-center gap-2`}>
                    1. INFOS DU PARTICIPANT (Student Info)
                </div>
                <div className="p-4 space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Nom Complet:</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Date de Naissance:</span>
                        </div>
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Âge:</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">École / Établissement:</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Parent Info */}
            <div className={`mb-6 rounded-lg border-2 ${theme.border} overflow-hidden`}>
                <div className={`${theme.bg} text-white px-4 py-2 font-bold uppercase text-sm flex items-center gap-2`}>
                    2. RESPONSABLE LÉGAL (Parent Info)
                </div>
                <div className="p-4 space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Nom du Parent:</span>
                        </div>
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">GSM (WhatsApp):</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dashed border-slate-300 pb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Email (Pour le suivi):</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Formula Selection */}
            <div className={`mb-6 rounded-lg border-2 ${theme.border} overflow-hidden`}>
                <div className={`${theme.bg} text-white px-4 py-2 font-bold uppercase text-sm flex items-center gap-2`}>
                    3. CHOIX DE LA FORMULE (Program Options)
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    {program.packs?.map((pack, idx) => (
                        <div key={idx} className={`border-2 ${theme.border} rounded-xl p-4 relative`}>
                            <div className={`w-6 h-6 border-2 ${theme.border} rounded mb-2`}></div>
                            <h4 className={`font-bold uppercase ${theme.text} text-lg`}>{pack.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                {pack.workshopsPerWeek ? `${pack.workshopsPerWeek} atelier(s) / sem` : ''}
                            </p>
                            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-end">
                                <div className="w-full">
                                    <span className="text-[10px] uppercase text-slate-300 block text-right italic">Tarifs sur demande</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!program.packs || program.packs.length === 0) && (
                        <div className="col-span-2 text-center py-4 text-slate-400 italic">No packs configured for this program</div>
                    )}
                </div>
            </div>

            {/* Section 4: Schedule Preference */}
            <div className={`mb-6 rounded-lg border-2 ${theme.border} overflow-hidden`}>
                <div className={`${theme.bg} text-white px-4 py-2 font-bold uppercase text-sm flex items-center gap-2`}>
                    4. CRÉNEAUX SOUHAITÉS (Schedule)
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 ${theme.border} rounded`}></div>
                        <span className="text-sm font-bold text-slate-600">Mercredi: 14h00 - 15h30</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 ${theme.border} rounded`}></div>
                        <span className="text-sm font-bold text-slate-600">Samedi: 09h00 - 10h30</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 ${theme.border} rounded`}></div>
                        <span className="text-sm font-bold text-slate-600">Mercredi: 16h00 - 17h30</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 ${theme.border} rounded`}></div>
                        <span className="text-sm font-bold text-slate-600">Samedi: 11h00 - 12h30</span>
                    </div>
                    <div className="flex items-center gap-3 col-span-2 mt-2 pt-2 border-t border-dashed border-slate-200">
                        <div className={`w-5 h-5 border-2 ${theme.border} rounded`}></div>
                        <span className="text-sm font-bold text-slate-600 w-full border-b border-dashed border-slate-300 pb-1">Autre Créneau (Disponibilité):</span>
                    </div>
                </div>
            </div>

            {/* Footer / Signature */}
            <div className="mt-8 flex gap-8 items-end">
                <div className={`flex-1 ${theme.light} rounded-xl border-2 border-dashed ${theme.border} p-4 h-32 flex flex-col justify-between`}>
                    <p className={`text-[10px] font-bold ${theme.text} uppercase`}>Réservé à l'Administration</p>
                </div>
                <div className="flex-1 border-2 border-slate-200 rounded-xl p-4 h-32 flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Signature du Responsable / Adhérent</p>
                    <p className="text-[10px] text-right text-slate-300 italic">Lu et approuvé</p>
                </div>
            </div>

            <div className="mt-12 text-center border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MakerLab Academy — Casablanca</p>
                <p className="text-[8px] text-slate-300 mt-1">technology • science • engineering • art • math</p>
            </div>

        </div>
    );
};
