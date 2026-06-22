import React from 'react';
import { Program, AppSettings, ProgramPack } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface DevisTemplateRendererProps {
    program: Program;
    settings: AppSettings;
    parentName: string;
    childName?: string;
    selectedPacks: string[]; // Pack names
    discount?: number; // Optional discount amount to apply
    sessionDetails?: string; // Optional custom session details or dates
}

export const DevisTemplateRenderer = React.forwardRef<HTMLDivElement, DevisTemplateRendererProps>(({ 
    program, 
    settings, 
    parentName, 
    childName, 
    selectedPacks,
    discount = 0,
    sessionDetails
}, ref) => {
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

    const theme = colors[program.themeColor || 'blue'] || colors.blue;
    const sessionYear = settings.academicYear || new Date().getFullYear().toString();
    const today = new Date().toLocaleDateString('fr-FR');
    
    // Calculate validity date (30 days from now)
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + 30);
    const validUntil = validityDate.toLocaleDateString('fr-FR');

    const docConfig = settings.documentConfig || {};
    const companyName = docConfig.headerName || settings.academyName || 'Academy';
    const logoUrl = docConfig.logoUrl || settings.logoUrl;

    // Filter selected packs, or show all if none specifically selected (should usually be selected)
    const packsToShow = selectedPacks.length > 0 
        ? program.packs.filter(p => selectedPacks.includes(p.name))
        : program.packs;

    // Calculate Totals
    let subtotal = 0;
    packsToShow.forEach(pack => {
        subtotal += program.type === 'Regular Program' ? (pack.priceAnnual || pack.price || 0) : (pack.price || 0);
    });
    
    const total = Math.max(0, subtotal - discount);

    return (
        <div ref={ref} className="w-[210mm] min-h-[297mm] bg-white p-[15mm] mx-auto text-slate-900 font-sans print:shadow-none shadow-2xl flex flex-col box-border">
            {/* Header: Company Info & Logo */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-200 pb-6">
                <div className="flex flex-col gap-2 max-w-[60%]">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain mb-2" style={{ maxWidth: '200px' }} />
                    ) : (
                        <div className={`w-16 h-16 rounded-xl ${theme.bg} mb-2 flex items-center justify-center text-white font-bold text-xl`}>
                            {companyName.charAt(0)}
                        </div>
                    )}
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{companyName}</h2>
                    <div className="text-xs text-slate-500 leading-relaxed">
                        {docConfig.address && <p>{docConfig.address}</p>}
                        {docConfig.phone && <p>Tel: {docConfig.phone}</p>}
                        {docConfig.email && <p>Email: {docConfig.email}</p>}
                        {docConfig.website && <p>Web: {docConfig.website}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className={`text-4xl font-black uppercase tracking-tighter ${theme.text}`}>DEVIS</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">N° D-{new Date().getTime().toString().slice(-6)}</p>
                    <div className="mt-4 text-xs text-slate-500 flex flex-col items-end gap-1">
                        <div className="flex justify-between w-48"><span className="font-bold">Date:</span> <span>{today}</span></div>
                        <div className="flex justify-between w-48"><span className="font-bold">Valable jusqu'au:</span> <span>{validUntil}</span></div>
                    </div>
                </div>
            </div>

            {/* Client Info */}
            <div className="flex justify-end mb-8">
                <div className={`w-1/2 p-4 rounded-lg border border-slate-200 bg-slate-50 relative overflow-hidden`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bg}`}></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Devis préparé pour</p>
                    <h3 className="text-lg font-bold text-slate-800">{parentName || "Client"}</h3>
                    {childName && <p className="text-sm text-slate-600 mt-1"><span className="font-semibold">Concernant:</span> {childName}</p>}
                </div>
            </div>

            {/* Program Details Section */}
            <div className="mb-8">
                <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${theme.text}`}>{program.name}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600 border border-slate-200`}>
                        {program.type}
                    </span>
                    <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600 border border-slate-200`}>
                        SESSION {sessionYear}
                    </span>
                </div>
                {program.description && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">
                        {program.description}
                    </p>
                )}
                {sessionDetails && (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Détails de Session / Dates</h4>
                        <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{sessionDetails}</p>
                    </div>
                )}
            </div>

            {/* Pricing Table */}
            <div className="mb-6">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className={`${theme.bg} text-white`}>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-tl-lg">Description / Pack</th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center">Quantité</th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right rounded-tr-lg">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packsToShow.map((pack, idx) => {
                            const price = program.type === 'Regular Program' ? (pack.priceAnnual || pack.price || 0) : (pack.price || 0);
                            return (
                                <tr key={idx} className="border-b border-slate-200">
                                    <td className="py-4 px-4">
                                        <p className="font-bold text-slate-800">{pack.name}</p>
                                        {program.type === 'Regular Program' && pack.workshopsPerWeek && (
                                            <p className="text-xs text-slate-500 mt-1">{pack.workshopsPerWeek} séance(s) / semaine</p>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-center text-slate-600 text-sm">1</td>
                                    <td className="py-4 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                                        {formatCurrency(price)}
                                    </td>
                                </tr>
                            );
                        })}
                        {packsToShow.length === 0 && (
                            <tr className="border-b border-slate-200">
                                <td colSpan={3} className="py-4 px-4 text-center text-slate-500 italic">Aucun pack sélectionné</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
                <div className="w-1/2">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500 font-medium">Sous-total</span>
                        <span className="text-sm text-slate-800 font-bold">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between py-2 border-b border-slate-100 text-emerald-600">
                            <span className="text-sm font-medium">Remise / Réduction</span>
                            <span className="text-sm font-bold">- {formatCurrency(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-3 mt-2 rounded-lg bg-slate-50 px-4 border border-slate-200">
                        <span className="text-base font-black text-slate-800 uppercase">Total (TTC)</span>
                        <span className={`text-lg font-black ${theme.text}`}>{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>

            {/* Program Schedule (If available) */}
            {program.grades && program.grades.length > 0 && (
                <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Horaires & Groupes (Indicatif)</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {program.grades.map((grade, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-100">
                                <p className="font-bold text-xs text-slate-700 mb-2">{grade.name}</p>
                                <div className="space-y-1">
                                    {grade.groups.map((group, gIdx) => (
                                        <div key={gIdx} className="text-xs text-slate-600 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${theme.bg}`}></div>
                                            {group.day} - {group.time}
                                        </div>
                                    ))}
                                    {grade.groups.length === 0 && <p className="text-xs text-slate-400 italic">Aucun groupe planifié</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer / Conditions */}
            <div className="mt-auto pt-8">
                <div className="border-t-2 border-slate-200 pt-4 flex justify-between items-start">
                    <div className="w-2/3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Conditions & Notes</h4>
                        <ul className="text-[9px] text-slate-400 space-y-1 list-disc pl-4">
                            <li>Ce devis est estimatif et ne vaut pas inscription définitive.</li>
                            <li>L'inscription est validée après réception du paiement et signature du règlement intérieur.</li>
                            {program.paymentTerms && program.paymentTerms.length > 0 && (
                                <li>Facilités de paiement: {program.paymentTerms.join(', ')}</li>
                            )}
                        </ul>
                    </div>
                    <div className="w-1/3 text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-4">La Direction</p>
                        <div className="w-32 h-16 border-b border-dashed border-slate-300 ml-auto"></div>
                    </div>
                </div>
                
                {/* Legal Footer */}
                <div className="mt-8 text-center border-t border-slate-100 pt-4 text-[8px] text-slate-400 leading-relaxed">
                    <p className="font-bold uppercase tracking-widest text-slate-500">{companyName}</p>
                    <p>
                        {docConfig.address && <span>{docConfig.address} • </span>}
                        {docConfig.taxId && <span>ICE: {docConfig.taxId} • </span>}
                        {docConfig.regId && <span>RC: {docConfig.regId} • </span>}
                        {docConfig.patente && <span>Patente: {docConfig.patente}</span>}
                    </p>
                    {settings.receiptFooter && <p className="mt-1">{settings.receiptFooter}</p>}
                </div>
            </div>
        </div>
    );
});

DevisTemplateRenderer.displayName = 'DevisTemplateRenderer';
