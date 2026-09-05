import React, { useState, useMemo } from 'react';
import { CalendarCheck, Plus, Clock, Users, Calendar as CalendarIcon, MessageCircle, Star, UserCheck, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Magnet, PauseCircle, ExternalLink, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, where, getDocs, arrayUnion, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { AtlasCommandHeader, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import { useConfirm } from '../context/ConfirmContext';
import { WorkshopTemplate, Booking } from '../types';
import { getGeneratedSlots, VirtualSlot } from '../utils/helpers';
import { WorkshopReportModal } from '../components/WorkshopReportModal';
import { buildWorkshopWhatsAppMessage, formatWorkshopDate, getWorkshopBookingUrl, getWorkshopOgImageUrl, getWorkshopScheduleLabel, normalizeWorkshopDays, toLocalDateKey, WORKSHOP_WEEKDAYS } from '../utils/workshops';

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
    const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

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
        if (template.isActive === false) {
            await showAlert('Workshop is paused', 'Activate this template before sharing its public booking link.', 'warning');
            return;
        }

        const url = getWorkshopBookingUrl(template.shareableSlug);
        try {
            await navigator.clipboard.writeText(url);
            setCopiedTemplateId(template.id);
            window.setTimeout(() => setCopiedTemplateId(current => current === template.id ? null : current), 2200);
        } catch (error) {
            console.error('Workshop link copy failed', error);
            await showAlert('Link could not be copied', 'Clipboard access is blocked. Allow clipboard access and try again.', 'danger');
        }
    };

    const shareWorkshopOnWhatsApp = async (template: WorkshopTemplate) => {
        if (template.isActive === false) {
            await showAlert('Workshop is paused', 'Activate this template before sharing its public booking link.', 'warning');
            return;
        }

        const bookingUrl = getWorkshopBookingUrl(template.shareableSlug);
        const message = buildWorkshopWhatsAppMessage(template, bookingUrl);
        const opened = window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');

        if (opened) opened.opener = null;
        else await showAlert('WhatsApp did not open', 'Allow pop-ups for Edufy, then try sharing again.', 'warning');
    };

    const openBookingPreview = (template: WorkshopTemplate) => {
        const opened = window.open(getWorkshopBookingUrl(template.shareableSlug), '_blank');
        if (opened) opened.opener = null;
    };

    const handleEditTemplate = (template: WorkshopTemplate) => {
        setTemplateForm({
            ...template,
            recurrencePattern: {
                ...template.recurrencePattern,
                days: normalizeWorkshopDays(template.recurrencePattern?.days)
            }
        });
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
            days: recurrenceType === 'weekly' ? normalizeWorkshopDays(templateForm.recurrencePattern?.days) : [],
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
            if (template.isActive === false) {
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
        const dateStr = toLocalDateKey(selectedDate);
        return virtualSlots.filter(s => s.dateStr === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [virtualSlots, selectedDate]);

    // Check if a date has slots (for calendar dots)
    const getDateStatus = (date: Date) => {
        const dateStr = toLocalDateKey(date);
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
                        <button onClick={handleCreateNew} className="group min-h-[360px] rounded-[24px] border-2 border-dashed border-slate-700/80 bg-slate-900/35 p-8 text-left text-slate-400 transition-all hover:-translate-y-0.5 hover:border-teal-300/50 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70">
                            <div className="flex h-full flex-col justify-between">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-300 transition-transform group-hover:rotate-3 group-hover:scale-105"><Plus size={26} /></div>
                                <div className="mt-16">
                                    <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-teal-300">New invitation</span>
                                    <span className="mt-2 block text-xl font-black tracking-[-0.03em]">Create a workshop</span>
                                    <span className="mt-2 block max-w-xs text-sm leading-6 text-slate-500">Choose the real meeting days, add the social image, then share a ready-made WhatsApp invitation.</span>
                                </div>
                            </div>
                        </button>
                    )}

                    {workshopTemplates.map(template => (
                        <div key={template.id} className="group relative flex min-h-[360px] flex-col overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900 shadow-[0_18px_45px_rgba(2,8,23,0.16)] transition-all hover:-translate-y-0.5 hover:border-teal-300/30">
                            <div className="relative aspect-[1.91/1] overflow-hidden border-b border-slate-800 bg-slate-950">
                                <img
                                    src={getWorkshopOgImageUrl(template.imageUrl)}
                                    alt=""
                                    className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.03]"
                                    onError={event => { event.currentTarget.src = `${window.location.origin}/images/makerlab-tello-python-hero-v1.png`; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur ${template.recurrenceType === 'weekly' ? 'border-sky-300/25 bg-sky-400/15 text-sky-200' : 'border-amber-300/25 bg-amber-400/15 text-amber-200'}`}>{template.recurrenceType === 'weekly' ? 'Weekly series' : 'One-time event'}</span>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur ${template.isActive !== false ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-200' : 'border-slate-500/40 bg-slate-950/70 text-slate-300'}`}>{template.isActive !== false ? 'Booking open' : 'Paused'}</span>
                                </div>
                            </div>
                            <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-start">
                                <div className="min-w-0 pr-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Social invitation</p>
                                    <h3 className="mt-1 truncate text-lg font-black tracking-[-0.025em] text-white" title={template.title}>{template.title}</h3>
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openBookingPreview(template)} disabled={template.isActive === false} className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-35" title={template.isActive !== false ? 'Open parent booking page' : 'Activate before previewing'}><ExternalLink size={14} /></button>
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
                                <div className="space-y-2 text-sm text-slate-300">
                                    <div className="flex items-center gap-3"><Clock size={16} className="text-slate-500" /> {template.duration} mins</div>
                                    <div className="flex items-center gap-3"><Users size={16} className="text-slate-500" /> Max {template.capacityPerSlot} per slot</div>
                                    <div className="flex items-start gap-3"><CalendarIcon size={16} className="text-slate-500 mt-0.5" />
                                        <span className="flex-1 leading-5">{getWorkshopScheduleLabel(template)}</span>
                                    </div>
                                </div>
                            </button>

                            <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-slate-800 bg-slate-950 p-3">
                                <button onClick={() => void shareWorkshopOnWhatsApp(template)} disabled={template.isActive === false} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-black text-[#07140b] transition-colors hover:bg-[#4ADF7F] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">
                                    {template.isActive !== false ? <MessageCircle size={15} /> : <PauseCircle size={15} />} {template.isActive !== false ? 'Share on WhatsApp' : 'Booking paused'}
                                </button>
                                <button onClick={() => void copyLink(template)} disabled={template.isActive === false} aria-label={copiedTemplateId === template.id ? 'Booking link copied' : 'Copy booking link'} title={copiedTemplateId === template.id ? 'Copied' : 'Copy booking link'} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-teal-300/50 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-35">
                                    {copiedTemplateId === template.id ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Modal */}
            <Modal isOpen={isTemplateModalOpen} onClose={() => !isSavingTemplate && setIsTemplateModalOpen(false)} title={editingTemplateId ? 'Edit workshop template' : 'Create workshop template'} size="lg">
                <form onSubmit={handleSaveTemplate} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <div className="space-y-5">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-300">Workshop title</label>
                                <input required className="w-full border p-3 text-white" value={templateForm.title} onChange={e => setTemplateForm({ ...templateForm, title: e.target.value })} placeholder="e.g. Build your first robot" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-300">Invitation description</label>
                                <textarea required className="h-28 w-full resize-none border p-3 text-white" value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="Tell parents what their child will make, learn, and take home." />
                                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">This text appears on the booking page and inside the WhatsApp invitation.</p>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-300">Social preview image</label>
                                <input type="url" className="w-full border p-3 text-white" value={templateForm.imageUrl || ''} onChange={e => setTemplateForm({ ...templateForm, imageUrl: e.target.value })} placeholder="https://example.com/workshop-cover.jpg" />
                                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Use a public landscape image. Edufy uses the MakerLab workshop cover when this is empty.</p>
                            </div>
                        </div>

                        <aside className="lg:sticky lg:top-0 lg:self-start">
                            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-xl">
                                <div className="relative aspect-[1.91/1] overflow-hidden bg-slate-900">
                                    <img
                                        src={getWorkshopOgImageUrl(templateForm.imageUrl)}
                                        alt="Social sharing preview"
                                        className="h-full w-full object-cover"
                                        onError={event => { event.currentTarget.src = `${window.location.origin}/images/makerlab-tello-python-hero-v1.png`; }}
                                    />
                                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur"><ImageIcon size={11} /> Link preview</div>
                                </div>
                                <div className="p-4">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{window.location.host || 'Edufy'} · workshop</p>
                                    <h4 className="mt-1 line-clamp-2 text-sm font-black text-white">{templateForm.title?.trim() || 'Your workshop title'}</h4>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{templateForm.description?.trim() || 'Your invitation description will appear here when the link is shared.'}</p>
                                </div>
                            </div>
                            <p className="mt-2 text-[10px] leading-4 text-slate-500">Preview of the Open Graph card used by WhatsApp and other social apps.</p>
                        </aside>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div><label className="mb-1.5 block text-xs font-bold text-slate-300">Duration</label><div className="relative"><input type="number" required min={15} max={480} step={5} className="w-full border p-3 pr-14 text-white" value={templateForm.duration} onChange={e => setTemplateForm({ ...templateForm, duration: Number(e.target.value) })} /><span className="pointer-events-none absolute right-3 top-3.5 text-xs text-slate-500">min</span></div></div>
                        <div><label className="mb-1.5 block text-xs font-bold text-slate-300">Places per session</label><input type="number" required min={1} max={200} step={1} className="w-full border p-3 text-white" value={templateForm.capacityPerSlot} onChange={e => setTemplateForm({ ...templateForm, capacityPerSlot: Number(e.target.value) })} /></div>
                        <div><label className="mb-1.5 block text-xs font-bold text-slate-300">Booking for</label><select className="w-full border p-3 text-white" value={templateForm.targetAudience} onChange={e => setTemplateForm({ ...templateForm, targetAudience: e.target.value as WorkshopTemplate['targetAudience'] })}><option value="Child">A child (by parent)</option><option value="School">A school</option><option value="Teacher">A teacher</option><option value="Professional">A professional</option></select></div>
                    </div>

                    <fieldset>
                        <legend className="mb-2 block text-xs font-bold text-slate-300">Schedule type</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {([
                                { value: 'one-time', title: 'One date', detail: 'A workshop held once' },
                                { value: 'weekly', title: 'Repeats weekly', detail: 'One or more chosen weekdays' },
                            ] as const).map(option => (
                                <button key={option.value} type="button" aria-pressed={templateForm.recurrenceType === option.value} onClick={() => setTemplateForm({ ...templateForm, recurrenceType: option.value })} className={`rounded-2xl border p-4 text-left transition-colors ${templateForm.recurrenceType === option.value ? 'border-teal-300/50 bg-teal-300/10 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'}`}>
                                    <span className="block text-sm font-black">{option.title}</span>
                                    <span className="mt-1 block text-xs">{option.detail}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    {templateForm.recurrenceType === 'weekly' && (
                        <fieldset className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                            <legend className="px-2 text-xs font-black uppercase tracking-[0.14em] text-teal-300">Weekly meeting days</legend>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {WORKSHOP_WEEKDAYS.map(day => {
                                    const selectedDays = normalizeWorkshopDays(templateForm.recurrencePattern?.days);
                                    const isSelected = selectedDays.includes(day.value);
                                    return (
                                        <button key={day.value} type="button" aria-pressed={isSelected} onClick={() => {
                                            const nextDays = isSelected ? selectedDays.filter(value => value !== day.value) : [...selectedDays, day.value];
                                            setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, days: normalizeWorkshopDays(nextDays) } });
                                        }} className={`flex min-h-12 items-center justify-between rounded-xl border px-3 text-sm font-bold transition-colors ${isSelected ? 'border-teal-300/60 bg-teal-400 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                                            <span>{day.label}</span>{isSelected && <Check size={15} />}
                                        </button>
                                    );
                                })}
                            </div>
                            <div><label className="mb-1.5 block text-xs font-bold text-slate-300">Start time</label><input type="time" required className="w-full border p-3 text-white sm:max-w-xs" value={templateForm.recurrencePattern?.time} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, time: e.target.value } })} /></div>
                            {normalizeWorkshopDays(templateForm.recurrencePattern?.days).length > 0 && <p className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-300">{getWorkshopScheduleLabel({ recurrenceType: 'weekly', recurrencePattern: templateForm.recurrencePattern || {} })}</p>}
                        </fieldset>
                    )}

                    {templateForm.recurrenceType === 'one-time' && (
                        <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 sm:p-5">
                            <div><label className="mb-1.5 block text-xs font-bold text-slate-300">Workshop date</label><input type="date" required min={toLocalDateKey(new Date())} className="w-full border p-3 text-white" value={templateForm.recurrencePattern?.date} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, date: e.target.value } })} />{templateForm.recurrencePattern?.date && <p className="mt-1.5 text-xs font-semibold text-teal-300">{formatWorkshopDate(templateForm.recurrencePattern.date)}</p>}</div>
                            <div><label className="mb-1.5 block text-xs font-bold text-slate-300">Start time</label><input type="time" required className="w-full border p-3 text-white" value={templateForm.recurrencePattern?.time} onChange={e => setTemplateForm({ ...templateForm, recurrencePattern: { ...templateForm.recurrencePattern, time: e.target.value } })} /></div>
                        </div>
                    )}

                    <label htmlFor="isActive" className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <span><span className="block text-sm font-black text-white">Open public booking</span><span className="mt-1 block text-xs text-slate-500">Parents can see available dates and reserve a place.</span></span>
                        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${templateForm.isActive ?? true ? 'bg-teal-400' : 'bg-slate-700'}`}><input type="checkbox" id="isActive" className="peer sr-only" checked={templateForm.isActive ?? true} onChange={e => setTemplateForm({ ...templateForm, isActive: e.target.checked })} /><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${templateForm.isActive ?? true ? 'translate-x-6' : 'translate-x-1'}`} /></span>
                    </label>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => setIsTemplateModalOpen(false)} disabled={isSavingTemplate} className="min-h-11 rounded-xl border border-slate-700 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isSavingTemplate} className="min-h-11 rounded-xl bg-teal-400 px-6 text-sm font-black text-slate-950 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50">
                            {isSavingTemplate ? 'Saving...' : editingTemplateId ? 'Save changes' : 'Create workshop & link'}
                        </button>
                    </div>
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
