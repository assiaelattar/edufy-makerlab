import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Tablet, Copy, ArrowLeft, FileText, Check, Download, UserPlus, Trash2, X, Search, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Program, Lead } from '../types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';

import { QRCodeSVG } from 'qrcode.react';
import { FormTemplateRenderer } from '../components/enrollment/FormTemplateRenderer';

export const EnrollmentFormsView = () => {
    const { programs, navigateTo } = useAppContext();
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [qrProgram, setQrProgram] = useState<Program | null>(null);
    const componentRef = useRef(null);

    // Caps & Tabs
    const [activeTab, setActiveTab] = useState<'forms' | 'waiting'>('forms');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Inscription_${selectedProgram?.name || 'Form'}`,
    });

    const triggerPrint = (program: Program) => {
        setSelectedProgram(program);
        setTimeout(() => {
            handlePrint();
        }, 100);
    };

    // Base URL for the Kiosk Form
    const baseUrl = window.location.origin;

    // Fetch Leads (Waiting List)
    useEffect(() => {
        if (!db) return;

        // Listen to "new" leads, ideally those from kiosk. 
        // We'll fetch all non-closed ones for now to be safe.
        const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLeads = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Lead[];
            // Filter to remove converted/closed ones if desired, or keep them to show history
            // User requested "wait list", so usually implies active pending ones.
            setLeads(fetchedLeads.filter(l => l.status !== 'converted' && l.status !== 'closed'));
            setLoadingLeads(false);
        });

        return () => unsubscribe();
    }, []);

    const handleConvertLead = async (lead: Lead) => {
        if (!db) return;
        if (!confirm(`Create student profile for ${lead.name}?`)) return;

        try {
            // 1. Create Student
            const studentRef = await addDoc(collection(db, 'students'), {
                name: lead.name,
                parentName: lead.parentName,
                parentPhone: lead.phone,
                email: lead.email || '',
                status: 'active',
                createdAt: serverTimestamp(),
                // Try to map details
                address: '',
                medicalInfo: '',
                school: ''
            });

            // 2. Update Lead Status
            await updateDoc(doc(db, 'leads', lead.id), {
                status: 'converted'
            });

            // 3. Notify and Navigate
            // We use a small timeout to let Firestore trigger updates if needed, though navigateTo is client side.
            if (confirm("Student created! Go to profile to add enrollment & finance details?")) {
                navigateTo('student-details', { studentId: studentRef.id });
            }

        } catch (err) {
            console.error(err);
            alert("Error converting lead.");
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!confirm("Delete this request?")) return;
        if (db) await deleteDoc(doc(db, 'leads', id));
    };

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 relative">

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Enrollment Center</h1>
                    <p className="text-slate-500">Manage paper forms, kiosk mode, and waiting list.</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('forms')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'forms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Forms & Kiosk
                    </button>
                    <button
                        onClick={() => setActiveTab('waiting')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'waiting' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Waiting List
                        {leads.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{leads.length}</span>}
                    </button>
                </div>
            </div>

            {/* TAB: FORMS */}
            {activeTab === 'forms' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {programs.filter(p => p.status === 'active').map(program => {
                        const colorMap: any = {
                            blue: 'bg-blue-600',
                            purple: 'bg-purple-600',
                            emerald: 'bg-emerald-600',
                            amber: 'bg-amber-600',
                            rose: 'bg-rose-600',
                            cyan: 'bg-cyan-600',
                            slate: 'bg-slate-800'
                        };
                        const badgeColor = colorMap[program.themeColor || 'slate'] || 'bg-slate-800';

                        return (
                            <div key={program.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group flex flex-col">
                                <div className={`h-3 ${badgeColor}`}></div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">{program.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-bold">{program.type}</p>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">{program.description}</p>

                                    <div className="flex gap-2 mb-6">
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{program.packs?.length || 0} Packs</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{program.grades?.length || 0} Levels</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-auto">
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
            )}

            {/* TAB: WAITING LIST */}
            {activeTab === 'waiting' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-40">Date</th>
                                    <th className="p-4">Candidate</th>
                                    <th className="p-4">Parent / Contact</th>
                                    <th className="p-4">Details</th>
                                    <th className="p-4 w-64 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                                            No enrollment requests in the waiting list.
                                            <br />
                                            <span className="text-xs">Use the Kiosk Mode to let people register themselves!</span>
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map(lead => (
                                        <tr key={lead.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="p-4 text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} />
                                                    {lead.createdAt ? new Date((lead.createdAt as any).toDate ? (lead.createdAt as any).toDate() : lead.createdAt).toLocaleDateString() : '-'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 pl-6">
                                                    {lead.createdAt ? new Date((lead.createdAt as any).toDate ? (lead.createdAt as any).toDate() : lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{lead.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    Interest: <span className="font-medium text-slate-700">{lead.interests?.join(', ') || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{lead.parentName}</div>
                                                <div className="text-emerald-600 font-mono text-xs">{lead.phone}</div>
                                                <div className="text-slate-400 text-[10px]">{lead.email}</div>
                                            </td>
                                            <td className="p-4 max-w-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {lead.notes?.map((note, i) => (
                                                        <span key={i} className="inline-block border border-slate-100 bg-slate-50 text-slate-600 px-2 py-1 rounded text-xs">
                                                            {note.length > 30 ? note.substring(0, 30) + '...' : note}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleDeleteLead(lead.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Request"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleConvertLead(lead)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-900/20 active:scale-95"
                                                    >
                                                        <UserPlus size={14} /> Enroll Student
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                        <button onClick={() => setQrProgram(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24} /></button>

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
