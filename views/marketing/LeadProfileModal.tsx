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
}

export const LeadProfileModal: React.FC<LeadProfileModalProps> = ({ isOpen, onClose, lead }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title="Lead Profile">
            <div className="flex flex-col h-[80vh] md:h-[600px]">
                {/* Header */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-4 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                            {lead.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
                            <p className="text-slate-500 text-sm flex items-center gap-2"><User size={14} /> Parent: {lead.parentName}</p>
                            <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Phone size={12} /> {lead.phone}</span>
                                {lead.email && <span className="flex items-center gap-1"><Mail size={12} /> {lead.email}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                            lead.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            {lead.status}
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                            {lead.interests?.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 text-[10px] font-medium">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 mb-4">
                    <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Timeline & Notes</button>
                    <button onClick={() => setActiveTab('workshops')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'workshops' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Workshop History ({leadBookings.length})</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">

                    {activeTab === 'timeline' && (
                        <div className="space-y-6">
                            {/* Input */}
                            <form onSubmit={handleAddNote} className="flex gap-2 mb-6">
                                <input
                                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Add a note or observation..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"><MessageSquare size={18} /></button>
                            </form>

                            {/* Actions Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
                                <button onClick={() => setIsBookingMode(!isBookingMode)} className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${isBookingMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><Tag size={14} /> Book Demo Class</button>
                                <button onClick={handleLogCall} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"><Phone size={14} /> Log Call</button>
                                <button onClick={() => setIsChatImportOpen(true)} className="py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"><MessageSquare size={14} /> Import Chat</button>
                            </div>

                            {/* Booking Selection UI */}
                            {isBookingMode && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3">Select Upcoming Workshop</h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {workshopSlots
                                            .filter(s => new Date(s.date) >= new Date()) // Future only
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map(slot => {
                                                const tmpl = workshopTemplates.find(t => t.id === slot.workshopTemplateId);
                                                return (
                                                    <button key={slot.id} onClick={() => handleBookDemo(slot.id)} className="w-full text-left bg-white p-3 rounded-lg border border-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all flex justify-between items-center group">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">{tmpl?.title}</div>
                                                            <div className="text-xs text-indigo-500 flex gap-2 mt-0.5">
                                                                <span className="flex items-center gap-1"><Calendar size={10} /> {slot.date}</span>
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {slot.startTime}</span>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={14} className="text-indigo-300 group-hover:text-indigo-600" />
                                                    </button>
                                                )
                                            })}
                                        {workshopSlots.filter(s => new Date(s.date) >= new Date()).length === 0 && <p className="text-center text-xs text-indigo-400 py-2">No upcoming workshops scheduled.</p>}
                                    </div>
                                </div>
                            )}

                            {/* Feed */}
                            <div className="space-y-4 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                {timelineEvents.length === 0 ? <p className="text-center text-slate-400 text-sm italic py-4">No activity recorded yet.</p> :
                                    timelineEvents.map((ev, idx) => (
                                        <div key={idx} className="relative pl-10">
                                            <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-white ${ev.type === 'note' ? 'bg-slate-400' :
                                                ev.type === 'call' ? 'bg-blue-400' :
                                                    ev.type === 'conversion' ? 'bg-emerald-400' :
                                                        'bg-purple-400'
                                                }`}></div>
                                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-slate-700 capitalize">{ev.type.replace('_', ' ')}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(ev.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{ev.details}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workshops' && (
                        <div className="space-y-3">
                            {leadBookings.map(booking => {
                                const slot = workshopSlots.find(s => s.id === booking.workshopSlotId);
                                const template = workshopTemplates.find(t => t.id === slot?.workshopTemplateId);

                                return (
                                    <div key={booking.id} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:border-indigo-300 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-indigo-900">{template?.title || 'Workshop'}</h4>
                                            <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {slot?.date}</span>
                                                <span className="flex items-center gap-1"><Clock size={12} /> {slot?.startTime}</span>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded font-medium ${booking.status === 'attended' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {booking.status}
                                        </div>
                                    </div>
                                );
                            })}
                            {leadBookings.length === 0 && <p className="text-center text-slate-400 text-sm italic py-8">No workshop history found for this number.</p>}
                        </div>
                    )}

                </div>
            </div>

            <ChatImporterModal isOpen={isChatImportOpen} onClose={() => setIsChatImportOpen(false)} lead={lead} />
        </Modal >
    );
};
