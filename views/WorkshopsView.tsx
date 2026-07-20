import React, { useState, useMemo } from 'react';
import { CalendarCheck, Link as LinkIcon, Plus, Clock, Users, Calendar as CalendarIcon, Share2, MessageCircle, Star, UserCheck, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Magnet, PauseCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, where, getDocs, arrayUnion, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { AtlasCommandHeader, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import { useConfirm } from '../context/ConfirmContext';
import { WorkshopTemplate, Booking } from '../types';
import { formatDate, getGeneratedSlots, VirtualSlot } from '../utils/helpers';
import { WorkshopReportModal } from '../components/WorkshopReportModal';

export const WorkshopsView = ({ onConvertProspect }: { onConvertProspect: (attendee: any) => void }) => {
    const { workshopTemplates, workshopSlots, bookings } = useAppContext();
    const { currentOrganization, can } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const [activeTab, setActiveTab] = useState<'calendar' | 'templates'>('calendar');

    // --- Calendar State ---
    const [viewDate, setViewDate] = useState(new Date()); // Tracks the month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // Tracks the specific selected day
    const [expandedSlotUniqueId, setExpandedSlotUniqueId] = useState<string | null>(null);

    // --- State for Templates ---
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [viewingBookingsTemplateId, setViewingBookingsTemplateId] = useState<string | null>(null); // For history modal
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [savingBookingIds, setSavingBookingIds] = useState<string[]>([]);

    const [templateForm, setTemplateForm] = useState<Partial<WorkshopTemplate>>({
        title: '', description: '', duration: 60, recurrenceType: 'one-time',
        recurrencePattern: { days: [], time: '10:00', date: '' },
        capacityPerSlot: 10, isActive: true, targetAudience: 'Child'
    });

    const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
    const [evaluationTarget, setEvaluationTarget] = useState({ title: '', sessionId: '', date: '' });
    const evaluatorAvailable = Boolean(import.meta.env.VITE_GOOGLE_API_KEY);

    const resetTemplateForm = () => {
        setTemplateForm({
            title: '', description: '', duration: 60, recurrenceType: 'one-time',
            recurrencePattern: { days: [], time: '10:00', date: '' },
            capacityPerSlot: 10, isActive: true, targetAudience: 'Child'
        });
    };

    // --- Helpers ---
    const copyLink = async (template: WorkshopTemplate) => {
        if (!template.isActive) {
            await showAlert('Workshop is paused', 'Activate this template before sharing its public booking link.', 'warning');
            return;
        }

        const url = `${window.location.origin}/?mode=booking&slug=${encodeURIComponent(template.shareableSlug)}`;
        try {
            await navigator.clipboard.writeText(url);
            await showAlert('Link copied', 'The public booking link is ready to share.', 'success');
        } catch (error) {
            console.error('Workshop link copy failed', error);
            await showAlert('Link could not be copied', 'Clipboard access is blocked. Allow clipboard access and try again.', 'danger');
        }
    };

    const handleEditTemplate = (template: WorkshopTemplate) => {
        setTemplateForm({ ...template });
        setEditingTemplateId(template.id);
        setIsTemplateModalOpen(true);
    };

    const handleCreateNew = () => {
        resetTemplateForm();
        setEditingTemplateId(null);
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization || isSavingTemplate) {
            await showAlert('Organization required', 'Select an organization before saving a workshop template.', 'warning');
            return;
        }

        if (!can('workshops.manage')) {
            await showAlert('Permission required', 'You do not have permission to manage workshop templates.', 'warning');
            return;
        }

        const title = templateForm.title?.trim() || '';
        const description = templateForm.description?.trim() || '';
        const duration = Number(templateForm.duration);
        const capacityPerSlot = Number(templateForm.capacityPerSlot);
        const recurrenceType = templateForm.recurrenceType || 'one-time';
        const recurrencePattern = {
            days: recurrenceType === 'weekly' ? [...new Set(templateForm.recurrencePattern?.days || [])].sort() : [],
            time: templateForm.recurrencePattern?.time || '',
            date: recurrenceType === 'one-time' ? templateForm.recurrencePattern?.date || '' : ''
        };
        const imageUrl = templateForm.imageUrl?.trim() || '';

        if (title.length < 3 || description.length < 10) {
            await showAlert('Workshop details incomplete', 'Use a title of at least 3 characters and a description of at least 10 characters.', 'warning');
            return;
        }
        if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
            await showAlert('Duration is invalid', 'Workshop duration must be between 15 and 480 minutes.', 'warning');
            return;
        }
        if (!Number.isInteger(capacityPerSlot) || capacityPerSlot < 1 || capacityPerSlot > 200) {
            await showAlert('Capacity is invalid', 'Capacity must be a whole number between 1 and 200.', 'warning');
            return;
        }
        if (!recurrencePattern.time) {
            await showAlert('Start time required', 'Choose a start time for this workshop.', 'warning');
            return;
        }
        if (recurrenceType === 'weekly' && recurrencePattern.days.length === 0) {
            await showAlert('Choose a weekly day', 'Select at least one day for a recurring workshop.', 'warning');
            return;
        }
        if (recurrenceType === 'one-time' && !recurrencePattern.date) {
            await showAlert('Date required', 'Choose the date for this one-time workshop.', 'warning');
            return;
        }
        if (recurrenceType === 'one-time' && templateForm.isActive !== false) {
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (recurrencePattern.date < todayKey) {
                await showAlert('Workshop date has passed', 'Choose today or a future date, or pause the template before saving historical details.', 'warning');
                return;
            }
        }
        if (imageUrl) {
            try {
                const parsedUrl = new URL(imageUrl);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported protocol');
            } catch {
                await showAlert('Cover image URL is invalid', 'Use a complete http or https image URL.', 'warning');
                return;
            }
        }

        const payload = {
            title,
            description,
            duration,
            recurrenceType,
            recurrencePattern,
            capacityPerSlot,
            isActive: templateForm.isActive !== false,
            targetAudience: templateForm.targetAudience || 'Child',
            imageUrl
        };

        setIsSavingTemplate(true);
        try {
            if (editingTemplateId) {
                const template = workshopTemplates.find(item => item.id === editingTemplateId);
                if (!template || template.organizationId !== currentOrganization.id) {
                    throw new Error('This template does not belong to the active organization.');
                }
                await updateDoc(doc(db, 'workshop_templates', editingTemplateId), payload);
            } else {
                const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID().slice(0, 6)
                    : Math.random().toString(36).slice(2, 8);
                const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workshop';
                await addDoc(collection(db, 'workshop_templates'), {
                    ...payload,
                    organizationId: currentOrganization.id,
                    shareableSlug: `${slugBase}-${suffix}`,
                    createdAt: serverTimestamp()
                });
            }
            setIsTemplateModalOpen(false);
            setEditingTemplateId(null);
            resetTemplateForm();
            await showAlert(editingTemplateId ? 'Workshop updated' : 'Workshop created', `${title} is ready in the workshop schedule.`, 'success');
        } catch (error) {
            console.error('Workshop template save failed', error);
            await showAlert('Workshop was not saved', error instanceof Error ? error.message : 'Check your connection and try again.', 'danger');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!db || !currentOrganization || !can('workshops.manage')) return;
        const template = workshopTemplates.find(item => item.id === id);
        if (!template || template.organizationId !== currentOrganization.id) {
            await showAlert('Template unavailable', 'This template is not available in the active organization.', 'warning');
            return;
        }
        const relatedSlots = workshopSlots.filter(slot => slot.workshopTemplateId === id);
        const relatedBookings = bookings.filter(booking => booking.workshopTemplateId === id || relatedSlots.some(slot => slot.id === booking.workshopSlotId));

        if (relatedSlots.length > 0 || relatedBookings.length > 0) {
            if (!template.isActive) {
                await showAlert('History must be retained', 'This paused template has slot or booking history and cannot be deleted.', 'info');
                return;
            }
            const shouldPause = await confirm({
                title: 'Pause this workshop?',
                message: `${relatedBookings.length} booking records and ${relatedSlots.length} saved slots depend on this template. Pause it to stop new availability while keeping history intact.`,
                confirmText: 'Pause workshop',
                cancelText: 'Keep active',
                variant: 'warning'
            });
            if (!shouldPause) return;
            await updateDoc(doc(db, 'workshop_templates', id), { isActive: false });
            await showAlert('Workshop paused', 'New booking availability is stopped and the history is preserved.', 'success');
            return;
        }
        const approved = await confirm({
            title: 'Delete workshop template?',
            message: 'This template will disappear from the public booking page. Existing booking records remain available.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger'
        });
        if (!approved) return;
        try {
            await deleteDoc(doc(db, 'workshop_templates', id));
            await showAlert('Workshop deleted', 'The unused template was removed.', 'success');
        } catch (error) {
            console.error('Workshop template deletion failed', error);
            await showAlert('Workshop was not deleted', 'Check your connection and try again.', 'danger');
        }
    };

    const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
        if (!db || !currentOrganization || savingBookingIds.includes(bookingId) || !can('workshops.manage')) return;
        const booking = bookings.find(item => item.id === bookingId);
        if (!booking || booking.organizationId !== currentOrganization.id) {
            await showAlert('Booking unavailable', 'This booking is not available in the active organization.', 'warning');
            return;
        }
        if (newStatus === 'cancelled' && booking.status !== 'cancelled') {
            const approved = await confirm({
                title: 'Cancel this booking?',
                message: `Cancel ${booking.kidName}'s booking and return the seat to public availability?`,
                confirmText: 'Cancel booking',
                cancelText: 'Keep booking',
                variant: 'warning'
            });
            if (!approved) return;
        }

        setSavingBookingIds(ids => [...ids, bookingId]);
        try {
            await runTransaction(db, async transaction => {
                const bookingRef = doc(db, 'bookings', bookingId);
                const bookingSnapshot = await transaction.get(bookingRef);
                if (!bookingSnapshot.exists()) throw new Error('Booking no longer exists.');
                const bookingData = bookingSnapshot.data() as Booking;
                if (bookingData.organizationId !== currentOrganization.id) throw new Error('Booking ownership changed.');

                const previousStatus = bookingData.status;
                const releasesSeat = previousStatus !== 'cancelled' && newStatus === 'cancelled';
                const restoresSeat = previousStatus === 'cancelled' && newStatus !== 'cancelled';
                let slotUpdate: { ref: ReturnType<typeof doc>; bookedCount: number; status: 'available' | 'full' | 'cancelled' } | null = null;

                if ((releasesSeat || restoresSeat) && bookingData.workshopSlotId) {
                    const slotRef = doc(db, 'workshop_slots', bookingData.workshopSlotId);
                    const slotSnapshot = await transaction.get(slotRef);
                    if (slotSnapshot.exists()) {
                        const slotData = slotSnapshot.data() as { organizationId?: string; bookedCount?: number; capacity?: number; status?: 'available' | 'full' | 'cancelled' };
                        if (slotData.organizationId !== currentOrganization.id) throw new Error('Slot ownership changed.');
                        const capacity = Math.max(1, Number(slotData.capacity) || 1);
                        const currentCount = Math.max(0, Number(slotData.bookedCount) || 0);
                        if (restoresSeat && currentCount >= capacity) throw new Error('CAPACITY_FULL');
                        const bookedCount = Math.max(0, currentCount + (restoresSeat ? 1 : -1));
                        slotUpdate = {
                            ref: slotRef,
                            bookedCount,
                            status: slotData.status === 'cancelled' ? 'cancelled' : bookedCount >= capacity ? 'full' : 'available'
                        };
                    }
                }

                if (slotUpdate) transaction.update(slotUpdate.ref, { bookedCount: slotUpdate.bookedCount, status: slotUpdate.status });
                transaction.update(bookingRef, { status: newStatus, statusUpdatedAt: serverTimestamp() });
            });
        } catch (error) {
            console.error('Workshop booking status update failed', error);
            const message = error instanceof Error && error.message === 'CAPACITY_FULL'
                ? 'This workshop is full. Increase capacity before restoring the booking.'
                : error instanceof Error ? error.message : 'Check your connection and try again.';
            await showAlert('Status was not updated', message, 'danger');
        } finally {
            setSavingBookingIds(ids => ids.filter(id => id !== bookingId));
        }
    };

    const openWhatsApp = async (phone: string, name: string) => {
        const normalizedPhone = phone.replace(/[^0-9]/g, '');
        if (normalizedPhone.length < 8) {
            await showAlert('Phone number required', 'Add a valid parent phone number before opening WhatsApp.', 'warning');
            return;
        }
        const opened = window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Hi ${name}, regarding your workshop booking...`)}`, '_blank');
        if (opened) opened.opener = null;
        else await showAlert('WhatsApp did not open', 'Allow pop-ups for Edufy and try again.', 'warning');
    };

    const handleConvertToStudent = async (booking: Booking) => {
        if (!can('workshops.manage') || booking.status !== 'attended') return;
        if (!currentOrganization?.id || booking.organizationId !== currentOrganization.id) {
            await showAlert('Booking unavailable', 'This booking is not available in the active organization.', 'warning');
            return;
        }
        const approved = await confirm({
            title: 'Start student enrollment?',
            message: `Open enrollment for ${booking.kidName} using the family details from this attended workshop.`,
            confirmText: 'Start enrollment',
            cancelText: 'Keep as prospect',
            variant: 'info'
        });
        if (!approved) return;
        onConvertProspect({ childName: booking.kidName, parentName: booking.parentName, parentPhone: booking.phoneNumber });
    };

    const handlePushToCRM = async (booking: Booking, templateTitle: string) => {
        if (!db || !can('workshops.manage')) return;
        const orgId = currentOrganization?.id;
        if (!orgId || booking.organizationId !== orgId) {
            await showAlert('Booking unavailable', 'This booking is not available in the active organization.', 'warning');
            return;
        }
        if (booking.status === 'converted') {
            await showAlert('Already converted', 'This booking is already connected to the CRM pipeline.', 'info');
            return;
        }
        const approved = await confirm({
            title: 'Push booking to CRM?',
            message: `Add ${booking.kidName} and parent ${booking.parentName} to Marketing Leads.`,
            confirmText: 'Push to CRM',
            cancelText: 'Cancel',
            variant: 'info'
        });
        if (!approved) return;

        try {
            const q = query(collection(db, 'leads'), where('organizationId', '==', orgId));
            const querySnapshot = await getDocs(q);
            const normalizedPhone = booking.phoneNumber.replace(/\D/g, '');
            const existingLead = querySnapshot.docs.find(item => String(item.data().phone || '').replace(/\D/g, '') === normalizedPhone);
            const batch = writeBatch(db);
            const bookingRef = doc(db, 'bookings', booking.id);
            const timelineEntry = {
                date: new Date().toISOString(),
                type: 'workshop',
                details: `Workshop follow-up: ${templateTitle}`,
                author: 'Workshop Manager'
            };

            if (existingLead) {
                batch.update(doc(db, 'leads', existingLead.id), {
                    tags: arrayUnion('Workshop', 'Prospect'),
                    interests: arrayUnion(templateTitle),
                    timeline: arrayUnion(timelineEntry)
                });
                batch.update(bookingRef, { status: 'converted', convertedAt: serverTimestamp() });
                await batch.commit();
                await showAlert('Lead updated', 'The existing CRM profile now includes this workshop and the booking is marked converted.', 'success');
            } else {
                const leadRef = doc(collection(db, 'leads'));
                batch.set(leadRef, {
                    organizationId: orgId,
                    name: booking.kidName,
                    parentName: booking.parentName,
                    phone: booking.phoneNumber,
                    source: `Workshop: ${templateTitle}`,
                    status: 'new',
                    createdAt: serverTimestamp(),
                    tags: ['Workshop', 'Prospect'],
                    interests: [templateTitle],
                    notes: [booking.notes || 'No initial notes'],
                    timeline: [timelineEntry]
                });
                batch.update(bookingRef, { status: 'converted', convertedAt: serverTimestamp() });
                await batch.commit();
                await showAlert('Lead created', 'The booking is now available in Marketing Hub.', 'success');
            }
        } catch (error) {
            console.error("Error pushing to CRM:", error);
            await showAlert('CRM push failed', 'No conversion was saved. Check your connection and try again.', 'danger');
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

    const workshopSignals = useMemo(() => {
        const monthBookedSpots = virtualSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
        const attendedBookings = bookings.filter(booking => booking.status === 'attended').length;
        const openCapacity = virtualSlots.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount), 0);
        const activeTemplates = workshopTemplates.filter(template => template.isActive !== false).length;

        return { monthBookedSpots, attendedBookings, openCapacity, activeTemplates };
    }, [virtualSlots, bookings, workshopTemplates]);

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col">
            {/* Header */}
            <AtlasCommandHeader
                eyebrow="Experience ops"
                title="Workshop Manager"
                description="Schedule events, manage capacity, convert high-intent visitors, and keep public booking links aligned with the tenant."
                icon={CalendarCheck}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>}
                actions={
                    <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-1" role="tablist" aria-label="Workshop workspace">
                    <button role="tab" aria-selected={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <CalendarIcon size={16} /> Calendar
                    </button>
                    <button role="tab" aria-selected={activeTab === 'templates'} onClick={() => setActiveTab('templates')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <List size={16} /> Templates
                    </button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <AtlasSignalCard label="Active Templates" value={workshopSignals.activeTemplates} icon={LayoutGrid} tone="teal" detail="Public booking offers" />
                <AtlasSignalCard label="Month Events" value={virtualSlots.length} icon={CalendarIcon} tone="blue" detail="Generated schedule slots" />
                <AtlasSignalCard label="Booked Spots" value={workshopSignals.monthBookedSpots} icon={Users} tone="amber" detail={`${workshopSignals.openCapacity} seats still open`} />
                <AtlasSignalCard label="Attended" value={workshopSignals.attendedBookings} icon={UserCheck} tone="emerald" detail="Ready for follow-up" />
            </div>

            {/* CALENDAR TAB */}
            {activeTab === 'calendar' && (
                <div className="flex flex-col gap-6 h-full min-h-[600px]">

                    {/* Calendar Grid - Full width on mobile, left sidebar on desktop */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 md:p-6 shadow-lg">
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
                                            aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                            aria-pressed={isSelected}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center relative border transition-colors duration-150 group
                                                ${isSelected ? 'border-teal-300/50 bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-800'}
                                                ${isToday && !isSelected ? 'border-amber-300/50' : ''}
                                            `}
                                        >
                                            <span className={`text-xs md:text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{date.getDate()}</span>
                                            {status !== 'none' && (
                                                <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-0.5 md:mt-1 ${isSelected ? 'bg-slate-950' : status === 'busy' ? 'bg-amber-300' : 'bg-slate-600'}`}></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Stats for Month */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div
                                className="bg-slate-900 border border-slate-800 rounded-lg p-3 md:p-4"
                            >
                                <div className="text-slate-500 text-[10px] md:text-xs uppercase font-bold mb-1">Total Events</div>
                                <div className="text-xl md:text-2xl font-bold text-white">{virtualSlots.length}</div>
                            </div>
                            <div
                                className="bg-slate-900 border border-slate-800 rounded-lg p-3 md:p-4"
                            >
                                <div className="text-slate-500 text-[10px] md:text-xs uppercase font-bold mb-1">Booked Spots</div>
                                <div className="text-xl md:text-2xl font-bold text-teal-300">{virtualSlots.reduce((a, b) => a + b.bookedCount, 0)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Agenda - Now visible on mobile */}
                    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
                        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h3>
                                <p className="text-slate-500 text-xs md:text-sm mt-1">{selectedDaySlots.length} events scheduled</p>
                            </div>
                            {can('workshops.manage') && (
                                <button onClick={handleCreateNew} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-colors">
                                    <Plus size={16} /> <span className="hidden md:inline">New workshop</span>
                                </button>
                            )}
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
                                        const safeCapacity = Math.max(1, Number(slot.capacity) || 1);
                                        const reservedCount = slot.slotId
                                            ? bookingsList.filter(booking => booking.status !== 'cancelled').length
                                            : Math.max(0, Number(slot.bookedCount) || 0);
                                        const occupancy = Math.min(100, (reservedCount / safeCapacity) * 100);
                                        const seatsLeft = Math.max(0, safeCapacity - reservedCount);

                                        return (
                                            <div key={idx} className="relative">
                                                {/* Timeline Dot */}
                                                <div className={`absolute -left-[25px] md:-left-[41px] top-4 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-900 ${isExpanded ? 'bg-teal-400' : 'bg-slate-700'}`}></div>

                                                {/* Make entire card clickable */}
                                                <div
                                                    onClick={() => setExpandedSlotUniqueId(isExpanded ? null : uniqueId)}
                                                    onKeyDown={event => {
                                                        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                                                            event.preventDefault();
                                                            setExpandedSlotUniqueId(isExpanded ? null : uniqueId);
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={isExpanded}
                                                    className={`bg-slate-950 border rounded-lg overflow-hidden transition-colors duration-150 cursor-pointer ${isExpanded ? 'border-teal-300/40' : 'border-slate-800 hover:border-slate-700'}`}
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
                                                            <span className={`${reservedCount >= safeCapacity ? 'text-rose-300' : 'text-emerald-300'} font-bold`}>{reservedCount} / {safeCapacity}</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${reservedCount >= safeCapacity ? 'bg-rose-500' : occupancy >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${occupancy}%` }}></div>
                                                        </div>
                                                        <p className="mt-1 text-right text-[10px] font-medium text-slate-500">{seatsLeft > 0 ? `${seatsLeft} seats open` : reservedCount > safeCapacity ? `${reservedCount - safeCapacity} over capacity` : 'Full'}</p>
                                                    </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {isExpanded && (
                                                        <div className="border-t border-slate-800 bg-slate-900/50 p-3 md:p-4 animate-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendee List</h5>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                    setEvaluationTarget({ title: slot.templateTitle, sessionId: slot.slotId || uniqueId, date: slot.dateStr });
                                                                    setIsEvaluationModalOpen(true);
                                                                }}
                                                                disabled={!evaluatorAvailable}
                                                                title={evaluatorAvailable ? 'Evaluate this workshop session' : 'Configure the Google AI key to enable quality analysis'}
                                                                className="flex items-center gap-1.5 rounded-lg border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-[10px] font-black uppercase text-teal-200 transition-colors hover:bg-teal-300/15 disabled:cursor-not-allowed disabled:opacity-45"
                                                            >
                                                                <Star size={12} /> Analyze quality
                                                            </button>
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
                                                                                    {booking.kidAge && <span>| {booking.kidAge} yo</span>}
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2 md:gap-3 ml-2">
                                                            <select
                                                                value={booking.status}
                                                                onChange={(e) => handleStatusUpdate(booking.id, e.target.value as Booking['status'])}
                                                                disabled={savingBookingIds.includes(booking.id) || booking.status === 'converted'}
                                                                className={`bg-slate-900 text-[10px] font-bold uppercase rounded px-2 py-1 border border-slate-800 outline-none cursor-pointer ${booking.status === 'confirmed' ? 'text-emerald-400' :
                                                                    booking.status === 'attended' ? 'text-blue-400' :
                                                                        'text-slate-500'
                                                                    }`}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                <option value="confirmed">Confirmed</option>
                                                                <option value="reminder_sent">Reminder sent</option>
                                                                <option value="attended">Attended</option>
                                                                <option value="feedback_requested">Feedback requested</option>
                                                                <option value="no-show">No Show</option>
                                                                <option value="cancelled">Cancelled</option>
                                                                <option value="converted">Converted to CRM</option>
                                                            </select>

                                                                                <div className="flex gap-1">
                                                                <button onClick={(e) => { e.stopPropagation(); void openWhatsApp(booking.phoneNumber, booking.parentName); }} className="p-1.5 text-emerald-500 hover:bg-emerald-950/30 rounded transition-colors" title="WhatsApp"><MessageCircle size={14} /></button>
                                                                                    {booking.status === 'attended' && (
                                                                                        <button onClick={(e) => { e.stopPropagation(); void handleConvertToStudent(booking); }} className="p-1.5 text-blue-500 hover:bg-blue-950/30 rounded transition-colors" title="Start student enrollment"><UserCheck size={14} /></button>
                                                                                    )}
                                                                <button onClick={(e) => { e.stopPropagation(); void handlePushToCRM(booking, slot.templateTitle); }} disabled={booking.status === 'converted'} className="p-1.5 text-teal-300 hover:bg-teal-950/30 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-35" title={booking.status === 'converted' ? 'Already converted to CRM' : 'Push to Lead CRM'}><Magnet size={14} /></button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {can('workshops.manage') && (
                        <button onClick={handleCreateNew} className="border-2 border-dashed border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 hover:border-teal-400/50 hover:text-teal-300 transition-colors min-h-[200px] group bg-slate-900/30 hover:bg-slate-900">
                            <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg"><Plus size={28} /></div>
                            <span className="font-bold text-lg">Create New Workshop</span>
                            <span className="text-sm mt-1">Define event details & recurrence</span>
                        </button>
                    )}

                    {workshopTemplates.map(template => (
                        <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col relative group hover:border-teal-300/30 transition-colors">
                            <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-start">
                                <div>
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${template.recurrenceType === 'weekly' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-amber-900/20 text-amber-400 border-amber-900/50'}`}>{template.recurrenceType}</span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${template.isActive ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-slate-600 bg-slate-800 text-slate-400'}`}>{template.isActive ? 'Active' : 'Paused'}</span>
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{template.title}</h3>
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => void copyLink(template)} disabled={!template.isActive} className="p-2 bg-slate-900 text-slate-400 rounded hover:text-white border border-slate-800 hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-35" title={template.isActive ? 'Copy booking link' : 'Activate before sharing'}><LinkIcon size={14} /></button>
                                    {can('workshops.manage') && (
                                        <>
                                            <button onClick={() => handleEditTemplate(template)} className="p-2 bg-slate-900 text-slate-400 rounded hover:text-blue-400 border border-slate-800 hover:border-blue-900/50" title="Edit Template"><MoreHorizontal size={14} /></button>
                                            <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 bg-slate-900 text-slate-400 rounded hover:text-red-400 border border-slate-800 hover:border-red-900/50" title="Delete"><Trash2 size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button type="button" className="p-5 flex-1 cursor-pointer text-left" onClick={() => setViewingBookingsTemplateId(template.id)}>
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
                            </button>

                            <div className="bg-slate-950 p-3 border-t border-slate-800 text-center">
                                <button onClick={() => void copyLink(template)} disabled={!template.isActive} className="text-xs font-bold text-teal-300 hover:text-teal-200 flex items-center justify-center gap-2 w-full py-1 disabled:cursor-not-allowed disabled:text-slate-600">
                                    {template.isActive ? <Share2 size={12} /> : <PauseCircle size={12} />} {template.isActive ? 'SHARE BOOKING LINK' : 'BOOKING PAUSED'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Modal */}
            <Modal isOpen={isTemplateModalOpen} onClose={() => !isSavingTemplate && setIsTemplateModalOpen(false)} title={editingTemplateId ? 'Edit workshop template' : 'Create workshop template'}>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Workshop Title</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.title} onChange={e => setTemplateForm({ ...templateForm, title: e.target.value })} placeholder="e.g. Intro to Robotics" /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Description</label><textarea required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24 resize-none" value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="What parents should know..." /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Cover Image URL (Optional)</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.imageUrl || ''} onChange={e => setTemplateForm({ ...templateForm, imageUrl: e.target.value })} placeholder="https://..." /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Duration (min)</label><input type="number" required min={15} max={480} step={5} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.duration} onChange={e => setTemplateForm({ ...templateForm, duration: Number(e.target.value) })} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Capacity</label><input type="number" required min={1} max={200} step={1} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.capacityPerSlot} onChange={e => setTemplateForm({ ...templateForm, capacityPerSlot: Number(e.target.value) })} /><p className="mt-1 text-[10px] leading-4 text-slate-500">Applies to new slots; saved slots keep their recorded capacity.</p></div>
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
                        <input type="checkbox" id="isActive" className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500" checked={templateForm.isActive ?? true} onChange={e => setTemplateForm({ ...templateForm, isActive: e.target.checked })} />
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
                                        }} className={`w-10 h-10 rounded-lg text-xs font-bold transition-colors ${templateForm.recurrencePattern?.days?.includes(idx) ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>{d}</button>
                                    ))}
                                </div>
                            </div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Time</label><input type="time" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrencePattern?.time} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, time: e.target.value } })} /></div>
                        </div>
                    )}

                    {templateForm.recurrenceType === 'one-time' && (
                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" required min={new Date().toLocaleDateString('en-CA')} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrencePattern?.date} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, date: e.target.value } })} /></div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Time</label><input type="time" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={templateForm.recurrencePattern?.time} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, time: e.target.value } })} /></div>
                        </div>
                    )}

                    <button type="submit" disabled={isSavingTemplate} className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold mt-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                        {isSavingTemplate ? 'Saving...' : editingTemplateId ? 'Update template' : 'Create template'}
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
                                                <div className="text-xs text-slate-500">{b.parentName} | {b.phoneNumber}</div>
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

            <WorkshopReportModal
                isOpen={isEvaluationModalOpen}
                onClose={() => setIsEvaluationModalOpen(false)}
                workshopTitle={evaluationTarget.title}
                sessionId={evaluationTarget.sessionId}
                workshopDate={evaluationTarget.date}
            />
        </div>
    );
};
