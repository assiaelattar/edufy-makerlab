import React, { useState, useMemo } from 'react';
import { CalendarCheck, Link as LinkIcon, Plus, Clock, Users, Calendar as CalendarIcon, Share2, UserPlus, MessageCircle, Star, UserCheck, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Magnet } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { WorkshopTemplate, Booking } from '../types';
import { formatDate, getGeneratedSlots, VirtualSlot } from '../utils/helpers';

export const WorkshopsView = ({ onConvertProspect }: { onConvertProspect: (attendee: any) => void }) => {
    const { workshopTemplates, workshopSlots, bookings, settings } = useAppContext();
    const { currentOrganization } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'templates'>('calendar');

    // --- Calendar State ---
    const [viewDate, setViewDate] = useState(new Date()); // Tracks the month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // Tracks the specific selected day
    const [expandedSlotUniqueId, setExpandedSlotUniqueId] = useState<string | null>(null);

    // --- State for Templates ---
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [viewingBookingsTemplateId, setViewingBookingsTemplateId] = useState<string | null>(null); // For history modal

    const [templateForm, setTemplateForm] = useState<Partial<WorkshopTemplate>>({
        title: '', description: '', duration: 60, recurrenceType: 'one-time',
        recurrencePattern: { days: [], time: '10:00', date: '' },
        capacityPerSlot: 10, isActive: true, targetAudience: 'Child'
    });

    // --- Helpers ---
    const copyLink = (slug: string) => {
        const url = `${window.location.origin}/w/${slug}`;
        navigator.clipboard.writeText(url);
        alert(`Link copied! \n${url}`);
    };

    const handleEditTemplate = (template: WorkshopTemplate) => {
        setTemplateForm({ ...template });
        setEditingTemplateId(template.id);
        setIsTemplateModalOpen(true);
    };

    const handleCreateNew = () => {
        setTemplateForm({
            title: '', description: '', duration: 60, recurrenceType: 'one-time',
            recurrencePattern: { days: [], time: '10:00', date: '' },
            capacityPerSlot: 10, isActive: true, targetAudience: 'Child'
        });
        setEditingTemplateId(null);
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization) return;

        try {
            if (editingTemplateId) {
                // Update
                const { id, ...dataToUpdate } = templateForm as any; // Exclude ID from data
                await updateDoc(doc(db, 'workshop_templates', editingTemplateId), dataToUpdate);
            } else {
                // Create
                const slug = templateForm.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
                await addDoc(collection(db, 'workshop_templates'), {
                    ...templateForm,
                    organizationId: currentOrganization.id,
                    shareableSlug: slug,
                    createdAt: serverTimestamp()
                });
            }
            setIsTemplateModalOpen(false);
            setEditingTemplateId(null);
            setTemplateForm({ title: '', description: '', duration: 60, recurrenceType: 'one-time', recurrencePattern: { days: [], time: '10:00', date: '' }, capacityPerSlot: 10, isActive: true, targetAudience: 'Child' });
        } catch (err) { console.error(err); }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!db || !confirm("Delete this workshop template? It will disappear from the booking page.")) return;
        await deleteDoc(doc(db, 'workshop_templates', id));
    };

    const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
        if (!db) return;
        await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
    };

    const openWhatsApp = (phone: string, name: string) => {
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hi ${name}, regarding your workshop booking...`, '_blank');
    };

    const handlePushToCRM = async (booking: Booking, templateTitle: string) => {
        if (!db) return;
        if (!confirm(`Add ${booking.kidName} (Parent: ${booking.parentName}) to Marketing Leads?`)) return;

        try {
            // Check if lead exists
            const q = query(collection(db, 'leads'), where('phone', '==', booking.phoneNumber));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Update existing
                const leadDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, 'leads', leadDoc.id), {
                    tags: arrayUnion('Workshop', 'Prospect'),
                    interests: arrayUnion(templateTitle),
                    timeline: arrayUnion({
                        date: new Date().toISOString(),
                        type: 'workshop',
                        details: `Attended/Booked workshop: ${templateTitle}`,
                        author: 'Workshop Manager'
                    })
                });
                alert("Lead updated! Existing profile found for this phone number.");
            } else {
                // Create new
                await addDoc(collection(db, 'leads'), {
                    name: booking.kidName,
                    parentName: booking.parentName,
                    phone: booking.phoneNumber,
                    source: `Workshop: ${templateTitle}`,
                    status: 'new',
                    createdAt: serverTimestamp(),
                    tags: ['Workshop', 'Prospect'],
                    interests: [templateTitle],
                    notes: [booking.notes || 'No initial notes'],
                    timeline: [{
                        date: new Date().toISOString(),
                        type: 'workshop',
                        details: `Originated from workshop: ${templateTitle}`,
                        author: 'Workshop Manager'
                    }]
                });
                await updateDoc(doc(db, 'bookings', booking.id), { status: 'converted' });
                alert("Lead created successfully in Marketing Hub!");
            }
        } catch (error) {
            console.error("Error pushing to CRM:", error);
            alert("Failed to push to CRM. Check console.");
        }
    };

    // --- Bookings History Logic ---
    const templateBookings = useMemo(() => {
        if (!viewingBookingsTemplateId) return [];
        // Find all slots for this template
        const slots = workshopSlots.filter(s => s.workshopTemplateId === viewingBookingsTemplateId);
        const slotIds = slots.map(s => s.id);
        // Find all bookings for these slots
        return bookings.filter(b => slotIds.includes(b.workshopSlotId)).sort((a, b) => b.bookedAt?.toMillis() - a.bookedAt?.toMillis());
    }, [viewingBookingsTemplateId, workshopSlots, bookings]);

    // --- Calendar Logic ---
    const monthStart = useMemo(() => new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), [viewDate]);

    // Generate slots for the currently viewed month (plus some buffer)
    const virtualSlots = useMemo(() => {
        // Start from beginning of the view month
        return getGeneratedSlots(workshopTemplates, workshopSlots, monthStart, 45);
    }, [workshopTemplates, workshopSlots, monthStart]);

    const getSlotBookings = (slot: VirtualSlot) => {
        if (!slot.slotId) return [];
        return bookings.filter(b => b.workshopSlotId === slot.slotId);
    };

    const calendarGrid = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

        const days = [];
        // Padding days from prev month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [viewDate]);

    const changeMonth = (delta: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
    };

    // Filter slots for the selected date
    const selectedDaySlots = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return virtualSlots.filter(s => s.dateStr === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [virtualSlots, selectedDate]);

    // Check if a date has slots (for calendar dots)
    const getDateStatus = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const daySlots = virtualSlots.filter(s => s.dateStr === dateStr);
        if (daySlots.length === 0) return 'none';
        const hasBookings = daySlots.some(s => s.bookedCount > 0);
        return hasBookings ? 'busy' : 'has-slots';
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><CalendarCheck className="w-6 h-6 text-pink-500" /> Workshop Manager</h2>
                    <p className="text-slate-500 text-sm">Schedule events, manage capacity, and track attendance.</p>
                </div>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <CalendarIcon size={16} /> Calendar
                    </button>
                    <button onClick={() => setActiveTab('templates')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'templates' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <List size={16} /> Templates
                    </button>
                </div>
            </div>

            {/* CALENDAR TAB */}
            {activeTab === 'calendar' && (
                <div className="flex flex-col gap-6 h-full min-h-[600px]">

                    {/* Calendar Grid - Full width on mobile, left sidebar on desktop */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
                            {/* Month Nav */}
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <h3 className="text-base md:text-lg font-bold text-white">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                                <div className="flex gap-1">
                                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                                    <button onClick={() => setViewDate(new Date())} className="px-2 md:px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors">Today</button>
                                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-[10px] md:text-xs font-bold text-slate-500 py-2">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1 md:gap-2">
                                {calendarGrid.map((date, i) => {
                                    if (!date) return <div key={i} className="aspect-square"></div>;
                                    const isSelected = date.toDateString() === selectedDate.toDateString();
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const status = getDateStatus(date);

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(date)}
                                            className={`aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 group
                                                ${isSelected ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20 scale-105 z-10' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'}
                                                ${isToday && !isSelected ? 'border-pink-500/50' : ''}
                                            `}
                                        >
                                            <span className={`text-xs md:text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{date.getDate()}</span>
                                            {status !== 'none' && (
                                                <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-0.5 md:mt-1 ${isSelected ? 'bg-pink-300' : status === 'busy' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Stats for Month */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div
                                className="bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4"
                            >
                                <div className="text-slate-500 text-[10px] md:text-xs uppercase font-bold mb-1">Total Events</div>
                                <div className="text-xl md:text-2xl font-bold text-white">{virtualSlots.length}</div>
                            </div>
                            <div
                                className="bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4"
                            >
                                <div className="text-slate-500 text-[10px] md:text-xs uppercase font-bold mb-1">Booked Spots</div>
                                <div className="text-xl md:text-2xl font-bold text-pink-400">{virtualSlots.reduce((a, b) => a + b.bookedCount, 0)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Agenda - Now visible on mobile */}
                    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h3>
                                <p className="text-slate-500 text-xs md:text-sm mt-1">{selectedDaySlots.length} events scheduled</p>
                            </div>
                            <button onClick={handleCreateNew} className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors shadow-lg shadow-pink-900/20">
                                <Plus size={16} /> <span className="hidden md:inline">Add Event</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 bg-slate-900/50 max-h-[500px] md:max-h-none">
                            {selectedDaySlots.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 py-12">
                                    <CalendarIcon size={48} className="mb-4 stroke-1" />
                                    <p className="text-sm">No workshops scheduled for this day.</p>
                                </div>
                            ) : (
                                <div className="relative border-l border-slate-800 ml-2 md:ml-4 pl-4 md:pl-8 space-y-6 md:space-y-8">
                                    {selectedDaySlots.map((slot, idx) => {
                                        const uniqueId = `${slot.workshopTemplateId}-${slot.dateStr}-${slot.startTime}`;
                                        const isExpanded = expandedSlotUniqueId === uniqueId;
                                        const bookingsList = getSlotBookings(slot);
                                        const occupancy = (slot.bookedCount / slot.capacity) * 100;

                                        return (
                                            <div key={idx} className="relative">
                                                {/* Timeline Dot */}
                                                <div className={`absolute -left-[25px] md:-left-[41px] top-4 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-900 ${isExpanded ? 'bg-pink-500' : 'bg-slate-700'}`}></div>

                                                {/* Make entire card clickable */}
                                                <div
                                                    onClick={() => setExpandedSlotUniqueId(isExpanded ? null : uniqueId)}
                                                    className={`bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-1 ring-pink-500/50 shadow-lg shadow-pink-900/10 scale-[1.01]' : 'hover:border-slate-700'}`}
                                                >
                                                    {/* Slot Header Card */}
                                                    <div className="p-3 md:p-4 flex flex-col sm:flex-row gap-3 md:gap-4 sm:items-center">
                                                        <div className="flex flex-col min-w-[60px]">
                                                            <span className="text-lg md:text-xl font-bold text-white">{slot.startTime}</span>
                                                            <span className="text-xs text-slate-500 font-mono">{slot.endTime}</span>
                                                        </div>

                                                        <div className="flex-1 sm:border-l border-slate-800 sm:pl-4">
                                                            <h4 className="font-bold text-white text-base md:text-lg">{slot.templateTitle}</h4>
                                                            <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-500 mt-1">
                                                                <span className="flex items-center gap-1"><Clock size={12} /> {slot.endTime && slot.startTime ? 'Runs ~' + (parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]) - (parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]))) + 'm' : ''}</span>
                                                                <span className="flex items-center gap-1"><MapPin size={12} /> On-site</span>
                                                            </div>
                                                        </div>

                                                        <div className="w-full sm:w-28 md:w-32 bg-slate-900/50 rounded-lg p-2">
                                                            <div className="flex justify-between text-[10px] md:text-xs mb-1">
                                                                <span className="text-slate-400">Capacity</span>
                                                                <span className={`${occupancy >= 100 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>{slot.bookedCount} / {slot.capacity}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${occupancy >= 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${occupancy}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {isExpanded && (
                                                        <div className="border-t border-slate-800 bg-slate-900/50 p-3 md:p-4 animate-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendee List</h5>
                                                            </div>

                                                            {bookingsList.length === 0 ? (
                                                                <div className="text-sm text-slate-500 italic p-2">No bookings yet.</div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {bookingsList.map(booking => (
                                                                        <div key={booking.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 group">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="font-bold text-slate-200 text-sm truncate">{booking.parentName} <span className="font-normal text-slate-500">for</span> {booking.kidName}</div>
                                                                                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                                                                    <span className="truncate">{booking.phoneNumber}</span>
                                                                                    {booking.kidAge && <span>• {booking.kidAge} yo</span>}
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2 md:gap-3 ml-2">
                                                                                <select
                                                                                    value={booking.status}
                                                                                    onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                                                                                    className={`bg-slate-900 text-[10px] font-bold uppercase rounded px-2 py-1 border border-slate-800 outline-none cursor-pointer ${booking.status === 'confirmed' ? 'text-emerald-400' :
                                                                                        booking.status === 'attended' ? 'text-blue-400' :
                                                                                            'text-slate-500'
                                                                                        }`}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <option value="confirmed">Confirmed</option>
                                                                                    <option value="attended">Attended</option>
                                                                                    <option value="no-show">No Show</option>
                                                                                    <option value="cancelled">Cancelled</option>
                                                                                </select>

                                                                                <div className="flex gap-1">
                                                                                    <button onClick={(e) => { e.stopPropagation(); openWhatsApp(booking.phoneNumber, booking.parentName); }} className="p-1.5 text-emerald-500 hover:bg-emerald-950/30 rounded transition-colors" title="WhatsApp"><MessageCircle size={14} /></button>
                                                                                    {booking.status === 'attended' && (
                                                                                        <button onClick={(e) => { e.stopPropagation(); onConvertProspect({ childName: booking.kidName, parentName: booking.parentName, parentPhone: booking.phoneNumber }); }} className="p-1.5 text-blue-500 hover:bg-blue-950/30 rounded transition-colors" title="Convert to Student"><UserCheck size={14} /></button>
                                                                                    )}
                                                                                    <button onClick={(e) => { e.stopPropagation(); handlePushToCRM(booking, slot.templateTitle); }} className="p-1.5 text-purple-500 hover:bg-purple-950/30 rounded transition-colors" title="Push to Lead CRM"><Magnet size={14} /></button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TEMPLATES TAB */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    <button onClick={handleCreateNew} className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:border-pink-500 hover:text-pink-400 transition-colors min-h-[200px] group bg-slate-900/30 hover:bg-slate-900">
                        <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg"><Plus size={28} /></div>
                        <span className="font-bold text-lg">Create New Workshop</span>
                        <span className="text-sm mt-1">Define event details & recurrence</span>
                    </button>

                    {workshopTemplates.map(template => (
                        <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative group hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-900/10 transition-all">
                            <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-start">
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border mb-2 inline-block ${template.recurrenceType === 'weekly' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-amber-900/20 text-amber-400 border-amber-900/50'}`}>
                                        {template.recurrenceType}
                                    </span>
                                    <h3 className="font-bold text-white text-lg">{template.title}</h3>
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => copyLink(template.shareableSlug)} className="p-2 bg-slate-900 text-slate-400 rounded hover:text-white border border-slate-800 hover:border-slate-700" title="Copy Booking Link"><LinkIcon size={14} /></button>
                                    <button onClick={() => handleEditTemplate(template)} className="p-2 bg-slate-900 text-slate-400 rounded hover:text-blue-400 border border-slate-800 hover:border-blue-900/50" title="Edit Template"><MoreHorizontal size={14} /></button>
                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 bg-slate-900 text-slate-400 rounded hover:text-red-400 border border-slate-800 hover:border-red-900/50" title="Delete"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="p-5 flex-1 cursor-pointer" onClick={() => setViewingBookingsTemplateId(template.id)}>
                                <p className="text-sm text-slate-400 line-clamp-3 mb-4">{template.description}</p>
                                {/* ... existing details ... */}
                                <div className="space-y-2 text-sm text-slate-300">
                                    <div className="flex items-center gap-3"><Clock size={16} className="text-slate-500" /> {template.duration} mins</div>
                                    <div className="flex items-center gap-3"><Users size={16} className="text-slate-500" /> Max {template.capacityPerSlot} per slot</div>
                                    <div className="flex items-start gap-3"><CalendarIcon size={16} className="text-slate-500 mt-0.5" />
                                        <span className="flex-1">
                                            {template.recurrenceType === 'weekly'
                                                ? `Every ${template.recurrencePattern?.days?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} at ${template.recurrencePattern?.time}`
                                                : `${formatDate(template.recurrencePattern?.date || '')} at ${template.recurrencePattern?.time}`
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-3 border-t border-slate-800 text-center">
                                <button onClick={() => copyLink(template.shareableSlug)} className="text-xs font-bold text-pink-500 hover:text-pink-400 flex items-center justify-center gap-2 w-full py-1">
                                    <Share2 size={12} /> SHARE BOOKING LINK
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Modal */}
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Create Workshop Template">
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Workshop Title</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.title} onChange={e => setTemplateForm({ ...templateForm, title: e.target.value })} placeholder="e.g. Intro to Robotics" /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Description</label><textarea required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24 resize-none" value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="What parents should know..." /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Cover Image URL (Optional)</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.imageUrl || ''} onChange={e => setTemplateForm({ ...templateForm, imageUrl: e.target.value })} placeholder="https://..." /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Duration (min)</label><input type="number" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.duration} onChange={e => setTemplateForm({ ...templateForm, duration: Number(e.target.value) })} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Capacity</label><input type="number" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.capacityPerSlot} onChange={e => setTemplateForm({ ...templateForm, capacityPerSlot: Number(e.target.value) })} /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Target Audience</label>
                        <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white mb-4" value={templateForm.targetAudience} onChange={e => setTemplateForm({ ...templateForm, targetAudience: e.target.value as any })}>
                            <option value="Child">Child (Booking by Parent)</option>
                            <option value="School">School</option>
                            <option value="Teacher">Teacher</option>
                            <option value="Professional">Professional</option>
                        </select>
                    </div>

                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Recurrence Type</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrenceType} onChange={e => setTemplateForm({ ...templateForm, recurrenceType: e.target.value as any })}><option value="one-time">One Time Event</option><option value="weekly">Weekly Recurring</option></select></div>

                    <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" id="isActive" className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-pink-600 focus:ring-pink-500" checked={templateForm.isActive ?? true} onChange={e => setTemplateForm({ ...templateForm, isActive: e.target.checked })} />
                        <label htmlFor="isActive" className="text-sm text-slate-300 font-medium">Active (Visible for booking)</label>
                    </div>

                    {templateForm.recurrenceType === 'weekly' && (
                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Select Days</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                                        <button key={d} type="button" onClick={() => {
                                            const days = templateForm.recurrencePattern?.days || [];
                                            const newDays = days.includes(idx) ? days.filter(x => x !== idx) : [...days, idx];
                                            setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, days: newDays } });
                                        }} className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${templateForm.recurrencePattern?.days?.includes(idx) ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/30' : 'bg-slate-950 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>{d}</button>
                                    ))}
                                </div>
                            </div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Time</label><input type="time" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrencePattern?.time} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, time: e.target.value } })} /></div>
                        </div>
                    )}

                    {templateForm.recurrenceType === 'one-time' && (
                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrencePattern?.date} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, date: e.target.value } })} /></div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Time</label><input type="time" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrencePattern?.time} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, time: e.target.value } })} /></div>
                        </div>
                    )}

                    <button type="submit" className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold mt-2 transition-colors">
                        {editingTemplateId ? 'Update Template' : 'Create Template'}
                    </button>
                </form>
            </Modal>

            {/* View Bookings Modal */}
            <Modal isOpen={!!viewingBookingsTemplateId} onClose={() => setViewingBookingsTemplateId(null)} title="Workshop History">
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {templateBookings.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No bookings found for this workshop.</div>
                    ) : (
                        <div className="space-y-3">
                            {templateBookings.map(b => {
                                const slot = workshopSlots.find(s => s.id === b.workshopSlotId);
                                return (
                                    <div key={b.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center">
                                        <div className="flex gap-3">
                                            <div className="bg-slate-800 rounded-lg p-2 flex flex-col items-center justify-center min-w-[50px]">
                                                <span className="text-xs text-slate-400">{slot?.date.split('-')[1]}/{slot?.date.split('-')[2]}</span>
                                                <span className="text-xs font-bold text-white">{slot?.startTime}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{b.kidName}</div>
                                                <div className="text-xs text-slate-500">{b.parentName} • {b.phoneNumber}</div>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            b.status === 'attended' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                            {b.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
