import React, { useState, useMemo } from 'react';
import { User, Phone, Mail, Calendar, Clock, Tag, Plus, MessageSquare, ArrowRight, UserCheck, X } from 'lucide-react';
import { Lead, Booking, WorkshopSlot, WorkshopTemplate } from '../../types'; // Adjust import path as needed
import { Modal } from '../../components/Modal';
import { ChatImporterModal } from './ChatImporterModal'; // New Import
import { formatDate } from '../../utils/helpers';
import { useAppContext } from '../../context/AppContext';
import { updateDoc, doc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface LeadProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
    onEnroll?: () => void;
}

export const LeadProfileModal: React.FC<LeadProfileModalProps> = ({ isOpen, onClose, lead, onEnroll }) => {
    const { bookings, workshopSlots, workshopTemplates } = useAppContext();
    const [note, setNote] = useState('');
    const [activeTab, setActiveTab] = useState<'timeline' | 'workshops'>('timeline');

    // --- Derived Data ---
    const leadBookings = useMemo(() => {
        // Match by phone number (removing spaces/formatting for loose matching)
        const cleanPhone = (p: string) => p.replace(/[^0-9]/g, '');
        const leadPhone = cleanPhone(lead.phone);

        return bookings.filter(b => cleanPhone(b.phoneNumber) === leadPhone).sort((a, b) => b.bookedAt?.toMillis() - a.bookedAt?.toMillis());
    }, [bookings, lead.phone]);

    const timelineEvents = useMemo(() => {
        const events: any[] = [...(lead.timeline || [])];

        // Inject workshop bookings into timeline view dynamically if they aren't already logged
        // (Optional: depending on if we want "source of truth" to be only the DB timeline)
        // For now, let's keep it simple and just show what's in 'timeline' plus the bookings list in its own tab.
        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [lead.timeline]);

    const [isBookingMode, setIsBookingMode] = useState(false);
    const [isChatImportOpen, setIsChatImportOpen] = useState(false);

    // --- Handlers ---
    const handleBookDemo = async (slotId: string) => {
        if (!db) return;
        const slot = workshopSlots.find(s => s.id === slotId);
        const template = workshopTemplates.find(t => t.id === slot?.workshopTemplateId);

        // 1. Create Booking
        await addDoc(collection(db, 'bookings'), {
            workshopSlotId: slotId,
            kidName: lead.name,
            parentName: lead.parentName,
            phoneNumber: lead.phone,
            email: lead.email || '',
            status: 'confirmed',
            bookedAt: serverTimestamp(),
            notes: 'Booked via CRM Lead Profile',
            paymentStatus: 'pending'
        });

        // 2. Update Lead Timeline
        await updateDoc(doc(db, 'leads', lead.id), {
            status: 'workshop_booked',
            timeline: arrayUnion({
                date: new Date().toISOString(),
                type: 'note', // Using note/workshop type
                details: `Booked Demo Workshop: ${template?.title} (${slot?.date})`,
                author: 'Admin'
            })
        });

        setIsBookingMode(false);
        setActiveTab('workshops'); // Switch tab to show it
        alert("Workshop Demo Booked!");
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !note.trim()) return;

        const newEvent = {
            date: new Date().toISOString(),
            type: 'note',
            details: note,
            author: 'Admin' // potentially get from user context
        };

        await updateDoc(doc(db, 'leads', lead.id), {
            timeline: arrayUnion(newEvent)
        });
        setNote('');
    };

    const handleLogCall = async () => {
        if (!db) return;
        const result = prompt("Call Outcome?", "Contacted - Interested");
        if (result) {
            await updateDoc(doc(db, 'leads', lead.id), {
                status: 'contacted',
                timeline: arrayUnion({
                    date: new Date().toISOString(),
                    type: 'call',
                    details: `Call Log: ${result}`,
                    author: 'Admin'
                })
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lead Profile" size="lg">
            <div className="flex flex-col h-[80vh] md:h-[600px]">
                {/* Header Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 mb-6 flex flex-col md:flex-row justify-between items-start gap-6 shadow-xl relative overflow-hidden group">
                    {/* Decorative Blur */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none -mt-32 -mr-32 group-hover:bg-purple-500/20 transition-all duration-1000"></div>

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl font-black text-white">
                                {lead.name.charAt(0)}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{lead.name}</h2>
                            <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                <User size={14} className="text-indigo-400" />
                                <span className="font-medium text-slate-300">{lead.parentName}</span>
                            </div>
                            <div className="flex gap-4 mt-3 text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"><Phone size={12} /> {lead.phone}</span>
                                {lead.email && <span className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"><Mail size={12} /> {lead.email}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 relative z-10">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${lead.status === 'new' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                lead.status === 'converted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-slate-800/50 text-slate-400 border-slate-700'
                            }`}>
                            {lead.status.replace('_', ' ')}
                        </span>

                        {/* Enroll Action (Primary) */}
                        {onEnroll && lead.status !== 'converted' && (
                            <button
                                onClick={() => { onEnroll(); onClose(); }}
                                className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
                            >
                                <UserCheck size={16} className="group-hover:scale-110 transition-transform" />
                                Enroll Student
                            </button>
                        )}

                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[240px] mt-1">
                            {lead.interests?.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-2.5 py-1 bg-purple-500/10 text-purple-300 rounded-lg border border-purple-500/20 text-[10px] font-semibold">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-slate-800 mb-6 px-2">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'timeline' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        <MessageSquare size={16} /> Timeline & Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('workshops')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'workshops' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        <Calendar size={16} /> Workshop History
                        <span className="bg-slate-800 text-slate-400 px-1.5 rounded-md text-[10px]">{leadBookings.length}</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">

                    {activeTab === 'timeline' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Input Area */}
                            <form onSubmit={handleAddNote} className="flex gap-3 mb-8">
                                <div className="flex-1 relative group">
                                    <input
                                        className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all group-hover:border-slate-700"
                                        placeholder="Add a new note, observation, or detail..."
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <button type="button" className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><Tag size={14} /></button>
                                    </div>
                                </div>
                                <button type="submit" className="px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-600 flex items-center justify-center">
                                    <Plus size={20} />
                                </button>
                            </form>

                            {/* Quick Actions Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => setIsBookingMode(!isBookingMode)}
                                    className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${isBookingMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    <Calendar size={16} className={isBookingMode ? "text-indigo-200" : "text-slate-500"} />
                                    Book Demo
                                </button>
                                <button
                                    onClick={handleLogCall}
                                    className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Phone size={16} className="text-emerald-500" />
                                    Log Call
                                </button>
                                <button
                                    onClick={() => setIsChatImportOpen(true)}
                                    className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <MessageSquare size={16} className="text-green-500" />
                                    Import Chat
                                </button>
                            </div>

                            {/* Booking Selection Panel */}
                            {isBookingMode && (
                                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 animate-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                                            <Clock size={14} /> Upcoming Workshops
                                        </h4>
                                        <button onClick={() => setIsBookingMode(false)} className="text-indigo-400 hover:text-white"><X size={14} /></button>
                                    </div>

                                    <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-2">
                                        {workshopSlots
                                            .filter(s => new Date(s.date) >= new Date())
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map(slot => {
                                                const tmpl = workshopTemplates.find(t => t.id === slot.workshopTemplateId);
                                                return (
                                                    <button key={slot.id} onClick={() => handleBookDemo(slot.id)} className="w-full text-left bg-slate-900/80 p-3 rounded-xl border border-indigo-500/10 hover:border-indigo-500/50 hover:bg-indigo-900/20 transition-all flex justify-between items-center group">
                                                        <div>
                                                            <div className="font-bold text-slate-200 text-sm group-hover:text-white">{tmpl?.title}</div>
                                                            <div className="text-xs text-indigo-400/80 flex gap-3 mt-1 font-medium">
                                                                <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(slot.date)}</span>
                                                                <span className="flex items-center gap-1.5"><Clock size={12} /> {slot.startTime}</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-indigo-500/10 p-1.5 rounded-lg group-hover:bg-indigo-500 group-hover:text-white text-indigo-400 transition-colors">
                                                            <Plus size={16} />
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        {workshopSlots.filter(s => new Date(s.date) >= new Date()).length === 0 && (
                                            <div className="text-center py-8 border border-dashed border-indigo-500/20 rounded-xl bg-indigo-500/5">
                                                <p className="text-indigo-300 text-sm font-medium">No workshops scheduled</p>
                                                <p className="text-indigo-400/50 text-xs mt-1">Check back later</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Timeline Feed */}
                            <div className="space-y-0 relative pl-4">
                                {/* Vertical Line */}
                                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-800"></div>

                                {timelineEvents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-700 border border-slate-800">
                                            <MessageSquare size={24} />
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">No history recorded yet.</p>
                                    </div>
                                ) : (
                                    timelineEvents.map((ev, idx) => (
                                        <div key={idx} className="relative pl-12 pb-6 group">
                                            {/* Node Dot */}
                                            <div className={`absolute left-[19px] top-0 w-4 h-4 rounded-full border-4 border-slate-950 z-10 box-content ${ev.type === 'note' ? 'bg-slate-500' :
                                                    ev.type === 'call' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                                                        ev.type === 'conversion' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                                            'bg-purple-500'
                                                }`}></div>

                                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 group-hover:border-slate-700 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ev.type === 'call' ? 'bg-blue-950 text-blue-400' :
                                                            ev.type === 'conversion' ? 'bg-emerald-950 text-emerald-400' :
                                                                'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {ev.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{formatDate(ev.date)}</span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">{ev.details}</p>
                                                <div className="mt-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                                    by {ev.author}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workshops' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            {leadBookings.map(booking => {
                                const slot = workshopSlots.find(s => s.id === booking.workshopSlotId);
                                const template = workshopTemplates.find(t => t.id === slot?.workshopTemplateId);

                                return (
                                    <div key={booking.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center group hover:border-indigo-500/30 hover:bg-slate-800/50 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">{template?.title || 'Workshop'}</h4>
                                                <div className="text-xs text-slate-500 flex gap-3 mt-1">
                                                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(slot?.date || '')}</span>
                                                    <span className="flex items-center gap-1.5"><Clock size={12} /> {slot?.startTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${booking.status === 'attended' ? 'bg-emerald-500/10 text-emerald-400' :
                                                booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {booking.status}
                                        </div>
                                    </div>
                                );
                            })}
                            {leadBookings.length === 0 && (
                                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                                    <Clock size={40} className="mx-auto text-slate-700 mb-4" />
                                    <p className="text-slate-400 font-medium">No workshops booked yet.</p>
                                    <button onClick={() => { setActiveTab('timeline'); setIsBookingMode(true); }} className="mt-4 text-indigo-400 text-sm font-bold hover:text-indigo-300 underline">
                                        Book a demo now
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            <ChatImporterModal isOpen={isChatImportOpen} onClose={() => setIsChatImportOpen(false)} lead={lead} />
        </Modal >
    );
};
