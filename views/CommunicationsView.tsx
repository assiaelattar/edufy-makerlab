import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Inbox,
    Mail,
    MessageCircle,
    Phone,
    Plus,
    Save,
    Search,
    Send,
    SkipForward,
    Trash2,
    Users
} from 'lucide-react';
import { Timestamp, addDoc, collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { Announcement, CommunicationTemplate } from '../types';
import { formatDate } from '../utils/helpers';
import { Modal } from '../components/Modal';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';

type CommunicationsTab = 'overview' | 'compose' | 'templates' | 'history';
type TemplateCategory = CommunicationTemplate['category'];

const STARTER_TEMPLATES: Omit<CommunicationTemplate, 'id' | 'createdAt'>[] = [
    {
        title: 'Holiday closure',
        category: 'holiday',
        tags: ['calendar', 'closure'],
        content: 'Hello {{parent_name}},\n\nThe academy will be closed from [start date] to [end date]. Classes resume on [return date].\n\nThank you for planning ahead.'
    },
    {
        title: 'Schedule change',
        category: 'urgent',
        tags: ['schedule'],
        content: 'Hello {{parent_name}},\n\nThe session for {{student_name}} on [day] will exceptionally start at [time]. Please reply if this creates a conflict.'
    },
    {
        title: 'Payment reminder',
        category: 'reminder',
        tags: ['finance'],
        content: 'Hello {{parent_name}},\n\nThis is a friendly reminder that the [month] installment for {{student_name}} is due. Please contact the administration if you need a statement or payment support.'
    },
    {
        title: 'Unreported absence',
        category: 'urgent',
        tags: ['attendance'],
        content: 'Hello {{parent_name}},\n\nWe noticed that {{student_name}} was absent today. We hope everything is well. Please let the administration know whether follow-up is needed.'
    },
    {
        title: 'Project progress',
        category: 'news',
        tags: ['learning'],
        content: 'Hello {{parent_name}},\n\n{{student_name}} made strong progress on [project] today. Ask them to show you what they built and explain their next step.'
    },
    {
        title: 'Family event invitation',
        category: 'event',
        tags: ['event'],
        content: 'Hello {{parent_name}},\n\nYou are invited to [event] on [date] at [time]. We look forward to welcoming your family and celebrating the students work.'
    }
];

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
    { value: 'news', label: 'News' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'event', label: 'Event' }
];

const timestampValue = (value: unknown) => {
    if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
    }
    if (value && typeof (value as { seconds?: number }).seconds === 'number') {
        return (value as { seconds: number }).seconds * 1000;
    }
    return 0;
};

export const CommunicationsView = () => {
    const { students, enrollments, programs } = useAppContext();
    const { currentOrganization, can } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const [activeTab, setActiveTab] = useState<CommunicationsTab>('overview');
    const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [templateFilter, setTemplateFilter] = useState<'all' | TemplateCategory>('all');
    const [templateSearch, setTemplateSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('news');
    const [messageForm, setMessageForm] = useState({
        title: '',
        content: '',
        targetType: 'all' as 'all' | 'program',
        targetIds: [] as string[]
    });
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [queueIndex, setQueueIndex] = useState(0);

    const organizationId = currentOrganization?.id || '';
    const canManage = can('marketing.create');

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            if (!db || !organizationId) {
                if (!cancelled) setLoading(false);
                return;
            }

            setLoading(true);
            setLoadError('');
            try {
                const communicationsRef = doc(db, 'organizations', organizationId, 'settings', 'communications');
                const [communicationsSnapshot, announcementsSnapshot] = await Promise.all([
                    getDoc(communicationsRef),
                    getDocs(query(collection(db, 'announcements'), where('organizationId', '==', organizationId)))
                ]);
                if (cancelled) return;

                const storedTemplates = communicationsSnapshot.exists()
                    ? (communicationsSnapshot.data().templates || []) as CommunicationTemplate[]
                    : [];
                const storedAnnouncements = announcementsSnapshot.docs
                    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() } as Announcement))
                    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));

                setTemplates(storedTemplates);
                setAnnouncements(storedAnnouncements);
            } catch (error) {
                console.error('Unable to load communications workspace', error);
                if (!cancelled) setLoadError('Communications data could not be loaded. Check your connection and tenant access, then retry.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchData();
        return () => {
            cancelled = true;
        };
    }, [organizationId]);

    const tenantStudents = useMemo(
        () => students.filter(student => student.organizationId === organizationId),
        [organizationId, students]
    );
    const activeStudents = useMemo(
        () => tenantStudents.filter(student => student.status === 'active'),
        [tenantStudents]
    );
    const tenantPrograms = useMemo(
        () => programs.filter(program => program.organizationId === organizationId && program.status === 'active'),
        [organizationId, programs]
    );
    const tenantEnrollments = useMemo(
        () => enrollments.filter(enrollment => enrollment.organizationId === organizationId && enrollment.status === 'active'),
        [enrollments, organizationId]
    );

    const audienceStudents = useMemo(() => {
        if (messageForm.targetType === 'all') return activeStudents;
        if (messageForm.targetIds.length === 0) return [];

        const enrolledStudentIds = new Set(
            tenantEnrollments
                .filter(enrollment => messageForm.targetIds.includes(enrollment.programId))
                .map(enrollment => enrollment.studentId)
        );
        return activeStudents.filter(student => enrolledStudentIds.has(student.id));
    }, [activeStudents, messageForm.targetIds, messageForm.targetType, tenantEnrollments]);

    const whatsappRecipients = useMemo(
        () => audienceStudents.filter(student => student.parentPhone?.trim()),
        [audienceStudents]
    );
    const missingPhoneCount = audienceStudents.length - whatsappRecipients.length;
    const reachableCount = useMemo(
        () => activeStudents.filter(student => student.parentPhone?.trim()).length,
        [activeStudents]
    );
    const programAudienceCounts = useMemo(() => {
        const counts = new Map<string, Set<string>>();
        tenantEnrollments.forEach(enrollment => {
            if (!counts.has(enrollment.programId)) counts.set(enrollment.programId, new Set());
            counts.get(enrollment.programId)?.add(enrollment.studentId);
        });
        return counts;
    }, [tenantEnrollments]);

    const filteredTemplates = useMemo(() => {
        const search = templateSearch.trim().toLowerCase();
        return templates.filter(template => {
            const matchesCategory = templateFilter === 'all' || template.category === templateFilter;
            const matchesSearch = !search
                || template.title.toLowerCase().includes(search)
                || template.content.toLowerCase().includes(search)
                || template.tags?.some(tag => tag.toLowerCase().includes(search));
            return matchesCategory && matchesSearch;
        });
    }, [templateFilter, templateSearch, templates]);

    const filteredAnnouncements = useMemo(() => {
        const search = historySearch.trim().toLowerCase();
        if (!search) return announcements;
        return announcements.filter(item => item.title.toLowerCase().includes(search) || item.content.toLowerCase().includes(search));
    }, [announcements, historySearch]);

    const currentQueueStudent = whatsappRecipients[queueIndex];
    const personalizationTokens = messageForm.content.match(/{{\s*(student_name|parent_name)\s*}}/gi) || [];
    const unresolvedFields = messageForm.content.match(/\[[^\]]+\]/g) || [];
    const composeReady = Boolean(messageForm.title.trim() && messageForm.content.trim() && audienceStudents.length > 0);

    const switchTab = (tab: CommunicationsTab) => {
        setActiveTab(tab);
        requestAnimationFrame(() => document.getElementById(`communications-panel-${tab}`)?.focus({ preventScroll: true }));
    };

    const mutateStoredTemplates = async (
        deriveMutation: (storedTemplates: CommunicationTemplate[]) => {
            templates: CommunicationTemplate[];
            affectedCount: number;
        }
    ) => {
        if (!db || !organizationId) throw new Error('Organization context is unavailable.');
        const communicationsRef = doc(db, 'organizations', organizationId, 'settings', 'communications');
        const result = await runTransaction(db, async transaction => {
            const communicationsSnapshot = await transaction.get(communicationsRef);
            const storedValue = communicationsSnapshot.exists() ? communicationsSnapshot.data().templates : [];
            const storedTemplates = Array.isArray(storedValue) ? storedValue as CommunicationTemplate[] : [];
            const mutation = deriveMutation(storedTemplates);

            transaction.set(
                communicationsRef,
                { templates: mutation.templates, updatedAt: serverTimestamp() },
                { merge: true }
            );
            return mutation;
        });

        setTemplates(result.templates);
        return result;
    };

    const handleSaveTemplate = async () => {
        if (!canManage) {
            await showAlert('Permission required', 'Your role can view communications but cannot create templates.', 'warning');
            return;
        }
        if (!messageForm.title.trim() || !messageForm.content.trim()) {
            await showAlert('Template incomplete', 'Add a title and message before saving this template.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const nextTemplate: CommunicationTemplate = {
                id: `template-${Date.now().toString(36)}`,
                title: messageForm.title.trim(),
                content: messageForm.content.trim(),
                category: templateCategory,
                tags: [],
                createdAt: Timestamp.now()
            };
            await mutateStoredTemplates(storedTemplates => ({
                templates: [...storedTemplates, nextTemplate],
                affectedCount: 1
            }));
            await showAlert('Template saved', 'The message is now available to this organization.', 'success');
        } catch (error) {
            console.error('Unable to save communication template', error);
            await showAlert('Template not saved', 'The template could not be saved. Check your connection and permissions.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTemplate = async (template: CommunicationTemplate) => {
        if (!canManage) {
            await showAlert('Permission required', 'Your role cannot delete communication templates.', 'warning');
            return;
        }
        const approved = await confirm({
            title: 'Delete template?',
            message: `"${template.title}" will be removed from this organization. Existing announcements are not affected.`,
            confirmText: 'Delete template',
            cancelText: 'Keep template',
            variant: 'danger'
        });
        if (!approved) return;

        setSaving(true);
        try {
            const result = await mutateStoredTemplates(storedTemplates => {
                const nextTemplates = storedTemplates.filter(item => item.id !== template.id);
                return {
                    templates: nextTemplates,
                    affectedCount: storedTemplates.length - nextTemplates.length
                };
            });
            await showAlert(
                result.affectedCount > 0 ? 'Template deleted' : 'Template already removed',
                result.affectedCount > 0
                    ? 'The template was removed from the library.'
                    : 'Another staff member already removed this template. Your library is now up to date.',
                'success'
            );
        } catch (error) {
            console.error('Unable to delete communication template', error);
            await showAlert('Template not deleted', 'The template could not be removed. Try again.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleSeedTemplates = async () => {
        if (!canManage) {
            await showAlert('Permission required', 'Your role cannot add templates.', 'warning');
            return;
        }
        const approved = await confirm({
            title: 'Add starter templates?',
            message: 'Any missing Edufy operational templates will be added without replacing the organization library.',
            confirmText: 'Add templates',
            cancelText: 'Cancel',
            variant: 'info'
        });
        if (!approved) return;

        setSaving(true);
        try {
            const result = await mutateStoredTemplates(storedTemplates => {
                const storedTitles = new Set(storedTemplates.map(template => template.title.trim().toLowerCase()));
                const additions = STARTER_TEMPLATES
                    .filter(template => !storedTitles.has(template.title.trim().toLowerCase()))
                    .map((template, index) => ({
                        ...template,
                        id: `starter-${Date.now().toString(36)}-${index}`,
                        createdAt: Timestamp.now()
                    }));

                return {
                    templates: [...storedTemplates, ...additions],
                    affectedCount: additions.length
                };
            });
            await showAlert(
                result.affectedCount > 0 ? 'Templates added' : 'Library is ready',
                result.affectedCount > 0
                    ? `${result.affectedCount} starter templates were added to the organization library.`
                    : 'All Edufy starter templates are already available. Your library is now up to date.',
                result.affectedCount > 0 ? 'success' : 'info'
            );
        } catch (error) {
            console.error('Unable to add starter templates', error);
            await showAlert('Templates not added', 'The starter templates could not be saved. Try again.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleLoadTemplate = (template: CommunicationTemplate) => {
        setMessageForm(previous => ({ ...previous, title: template.title, content: template.content }));
        setTemplateCategory(template.category);
        switchTab('compose');
    };

    const validateAudience = async () => {
        if (messageForm.targetType === 'program' && messageForm.targetIds.length === 0) {
            await showAlert('Select a program', 'Choose at least one program before continuing.', 'warning');
            return false;
        }
        if (audienceStudents.length === 0) {
            await showAlert('Audience is empty', 'No active students match this audience. Adjust the segment before continuing.', 'warning');
            return false;
        }
        return true;
    };

    const handlePublishAnnouncement = async () => {
        if (!canManage) {
            await showAlert('Permission required', 'Your role cannot publish dashboard announcements.', 'warning');
            return;
        }
        if (!messageForm.title.trim() || !messageForm.content.trim()) {
            await showAlert('Announcement incomplete', 'Add a title and message before publishing.', 'warning');
            return;
        }
        if (!(await validateAudience())) return;
        if (personalizationTokens.length > 0) {
            await showAlert(
                'Personalization is not available on dashboard posts',
                'Remove student and parent tokens before publishing. Personalization is applied only when opening individual WhatsApp drafts.',
                'warning'
            );
            return;
        }

        const approved = await confirm({
            title: 'Publish dashboard announcement?',
            message: `This post will become visible to ${audienceStudents.length} active student${audienceStudents.length === 1 ? '' : 's'}. This records publication, not email or WhatsApp delivery.`,
            confirmText: 'Publish now',
            cancelText: 'Review message',
            variant: 'info'
        });
        if (!approved || !db || !organizationId) return;

        setSaving(true);
        try {
            const announcementRef = await addDoc(collection(db, 'announcements'), {
                organizationId,
                title: messageForm.title.trim(),
                content: messageForm.content.trim(),
                targetAudience: { type: messageForm.targetType, ids: messageForm.targetIds },
                status: 'sent',
                sentCount: audienceStudents.length,
                sentAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
            setAnnouncements(previous => [{
                id: announcementRef.id,
                title: messageForm.title.trim(),
                content: messageForm.content.trim(),
                targetAudience: { type: messageForm.targetType, ids: messageForm.targetIds },
                status: 'sent',
                sentCount: audienceStudents.length,
                sentAt: Timestamp.now(),
                createdAt: Timestamp.now()
            }, ...previous]);
            setMessageForm({ title: '', content: '', targetType: 'all', targetIds: [] });
            await showAlert('Announcement published', 'The dashboard post is live for the selected audience.', 'success');
            switchTab('history');
        } catch (error) {
            console.error('Unable to publish dashboard announcement', error);
            await showAlert('Announcement not published', 'The post could not be saved. Check your connection and permissions.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const generateMessage = (studentId: string) => {
        const student = activeStudents.find(item => item.id === studentId);
        if (!student) return messageForm.content;
        return messageForm.content
            .replace(/{{\s*student_name\s*}}/gi, student.name)
            .replace(/{{\s*parent_name\s*}}/gi, student.parentName?.trim() || 'Parent');
    };

    const openWhatsAppDraft = async (studentId: string) => {
        const student = whatsappRecipients.find(item => item.id === studentId);
        if (!student?.parentPhone) {
            await showAlert('Phone number missing', 'This student does not have a parent phone number.', 'warning');
            return false;
        }
        if (!messageForm.content.trim()) {
            await showAlert('Message is empty', 'Write or load a message before opening WhatsApp.', 'warning');
            return false;
        }

        let phone = student.parentPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = `212${phone.slice(1)}`;
        if (phone.length < 9) {
            await showAlert('Phone number needs review', `${student.name} has an invalid or incomplete parent phone number.`, 'warning');
            return false;
        }

        const draftUrl = `https://wa.me/${phone}?text=${encodeURIComponent(generateMessage(studentId))}`;
        const openedWindow = window.open(draftUrl, '_blank');
        if (!openedWindow) {
            await showAlert('WhatsApp was blocked', 'Allow pop-ups for Edufy, then try opening the draft again.', 'warning');
            return false;
        }
        openedWindow.opener = null;
        return true;
    };

    const openWhatsAppQueue = async () => {
        if (!canManage) {
            await showAlert('Permission required', 'Your role cannot prepare outbound message drafts.', 'warning');
            return;
        }
        if (!messageForm.content.trim()) {
            await showAlert('Message is empty', 'Write or load a message before opening the WhatsApp queue.', 'warning');
            return;
        }
        if (!(await validateAudience())) return;
        if (whatsappRecipients.length === 0) {
            await showAlert('No reachable parents', 'None of the selected students has a parent phone number.', 'warning');
            return;
        }
        setQueueIndex(0);
        setIsQueueOpen(true);
    };

    const advanceQueue = async (openDraft: boolean) => {
        if (!currentQueueStudent) return;
        if (openDraft && !(await openWhatsAppDraft(currentQueueStudent.id))) return;

        if (queueIndex >= whatsappRecipients.length - 1) {
            setIsQueueOpen(false);
            await showAlert(
                'Queue reviewed',
                'You reached the end of the operator-assisted queue. Edufy opened drafts but cannot verify WhatsApp delivery or replies.',
                'success'
            );
            return;
        }
        setQueueIndex(index => index + 1);
    };

    const tabItems: { id: CommunicationsTab; label: string; icon: typeof Mail }[] = [
        { id: 'overview', label: 'Overview', icon: CheckCircle2 },
        { id: 'compose', label: 'Compose', icon: Send },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'history', label: 'History', icon: Clock }
    ];

    return (
        <div className="space-y-4 pb-8">
            <AtlasCommandHeader
                eyebrow="Edufy ERP / Family operations"
                title="Communications"
                description="Publish tenant-scoped dashboard updates and prepare personalized parent message drafts with an honest delivery boundary."
                icon={Mail}
                badges={
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-400">
                        {currentOrganization?.name || 'Organization'}
                    </span>
                }
                actions={
                    <AtlasActionButton icon={Plus} variant="primary" onClick={() => switchTab('compose')} disabled={!canManage}>
                        Compose
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Active audience" value={activeStudents.length} detail="Tenant-scoped students" icon={Users} tone="teal" />
                <AtlasSignalCard label="WhatsApp ready" value={reachableCount} detail={`${activeStudents.length - reachableCount} need a phone`} icon={MessageCircle} tone="emerald" />
                <AtlasSignalCard label="Templates" value={templates.length} detail="Organization library" icon={FileText} tone="amber" />
                <AtlasSignalCard label="Dashboard posts" value={announcements.length} detail="Publication history" icon={CheckCircle2} tone="blue" />
            </div>

            {loadError && (
                <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div><strong className="block">Workspace unavailable</strong><span className="text-red-200/80">{loadError}</span></div>
                </div>
            )}

            {!canManage && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div><strong className="block">View-only access</strong><span className="text-amber-100/75">Your role can inspect communication history but cannot publish or change templates.</span></div>
                </div>
            )}

            <div className="sticky top-0 z-20 -mx-1 bg-[#08111F] px-1 py-2">
                <nav role="tablist" aria-label="Communications sections" className="flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/95 p-1 custom-scrollbar">
                    {tabItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`communications-panel-${item.id}`}
                                onClick={() => switchTab(item.id)}
                                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${isActive ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
                            >
                                <Icon size={16} /> {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {activeTab === 'overview' && (
                <section id="communications-panel-overview" role="tabpanel" tabIndex={-1} className="space-y-4 outline-none">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                            <AtlasSectionHeader title="Channel readiness" description="What Edufy can reliably do from this workspace today." icon={Inbox} />
                            <div className="mt-4 divide-y divide-white/10">
                                {[
                                    { icon: CheckCircle2, label: 'Dashboard announcements', detail: 'Live tenant-scoped publication', status: 'Available', tone: 'text-teal-300' },
                                    { icon: MessageCircle, label: 'WhatsApp', detail: 'Opens personalized drafts for operator review', status: 'Manual', tone: 'text-amber-200' },
                                    { icon: Mail, label: 'Email delivery', detail: 'No verified email provider is connected', status: 'Unavailable', tone: 'text-slate-500' },
                                    { icon: CalendarClock, label: 'Scheduled delivery', detail: 'No background delivery worker is configured', status: 'Unavailable', tone: 'text-slate-500' }
                                ].map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="flex items-center gap-3 py-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"><Icon size={17} className={item.tone} /></span>
                                            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{item.label}</p><p className="text-xs text-slate-500">{item.detail}</p></div>
                                            <span className={`text-xs font-bold ${item.tone}`}>{item.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                            <AtlasSectionHeader title="Audience health" description="Resolve missing contact data before high-priority outreach." icon={Users} />
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 p-3"><span className="text-sm text-slate-300">Active students</span><strong className="text-white">{activeStudents.length}</strong></div>
                                <div className="flex items-center justify-between rounded-lg border border-teal-400/20 bg-teal-400/5 p-3"><span className="text-sm text-slate-300">Parent phone available</span><strong className="text-teal-300">{reachableCount}</strong></div>
                                <div className="flex items-center justify-between rounded-lg border border-amber-300/20 bg-amber-300/5 p-3"><span className="text-sm text-slate-300">Missing parent phone</span><strong className="text-amber-200">{activeStudents.length - reachableCount}</strong></div>
                                <p className="text-xs leading-5 text-slate-500">Phone readiness affects WhatsApp only. Dashboard announcements still use the full selected student audience.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                            <AtlasSectionHeader title="Recent dashboard posts" icon={Clock} actions={<AtlasActionButton variant="quiet" onClick={() => switchTab('history')}>View history</AtlasActionButton>} />
                            <div className="mt-3 space-y-2">
                                {announcements.slice(0, 4).map(item => (
                                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/55 p-3">
                                        <CheckCircle2 size={16} className="shrink-0 text-teal-300" />
                                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.title}</p><p className="text-xs text-slate-500">{formatDate(item.createdAt)} · {item.sentCount} targeted</p></div>
                                    </div>
                                ))}
                                {!loading && announcements.length === 0 && <AtlasEmptyState title="No dashboard posts yet" description="Compose the first tenant-scoped announcement when there is a real update to share." icon={Inbox} action={<AtlasActionButton variant="primary" onClick={() => switchTab('compose')} disabled={!canManage}>Compose announcement</AtlasActionButton>} />}
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                            <AtlasSectionHeader title="Reusable messages" icon={FileText} actions={<AtlasActionButton variant="quiet" onClick={() => switchTab('templates')}>Open library</AtlasActionButton>} />
                            <div className="mt-3 space-y-2">
                                {templates.slice(0, 4).map(template => (
                                    <button key={template.id} type="button" onClick={() => handleLoadTemplate(template)} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-slate-950/55 p-3 text-left transition-colors hover:border-teal-300/30 hover:bg-white/[0.05]">
                                        <FileText size={16} className="shrink-0 text-amber-200" />
                                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{template.title}</p><p className="text-xs capitalize text-slate-500">{template.category}</p></div>
                                    </button>
                                ))}
                                {!loading && templates.length === 0 && <AtlasEmptyState title="No templates saved" description="Add the Edufy starter set or save a message from the compose workspace." icon={FileText} action={<AtlasActionButton icon={Plus} onClick={handleSeedTemplates} disabled={!canManage || saving}>Add starter templates</AtlasActionButton>} />}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'compose' && (
                <section id="communications-panel-compose" role="tabpanel" tabIndex={-1} className="space-y-4 outline-none">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                            <AtlasSectionHeader title="Message workspace" description="Write once, then choose a real publication path." icon={Send} />
                            <div className="mt-4 space-y-4">
                                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-400">Message title</span><input value={messageForm.title} maxLength={120} onChange={event => setMessageForm(previous => ({ ...previous, title: event.target.value }))} placeholder="A clear internal and dashboard title" className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/50" /></label>
                                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-400">Message</span><textarea value={messageForm.content} maxLength={4000} onChange={event => setMessageForm(previous => ({ ...previous, content: event.target.value }))} placeholder="Write the operational update and next action." className="min-h-56 w-full resize-y rounded-lg border border-white/10 bg-slate-950 p-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/50" /></label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500">Insert for WhatsApp:</span>
                                    {['{{student_name}}', '{{parent_name}}'].map(token => <button key={token} type="button" onClick={() => setMessageForm(previous => ({ ...previous, content: `${previous.content}${previous.content ? ' ' : ''}${token}` }))} className="min-h-9 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 font-mono text-xs text-teal-200 hover:bg-white/[0.08]">{token}</button>)}
                                </div>
                                {(personalizationTokens.length > 0 || unresolvedFields.length > 0) && (
                                    <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100/80">
                                        {personalizationTokens.length > 0 && <p><strong>Personalization:</strong> applied only to individual WhatsApp drafts. Remove these tokens before dashboard publication.</p>}
                                        {unresolvedFields.length > 0 && <p><strong>Review fields:</strong> replace {Array.from(new Set(unresolvedFields)).join(', ')} before any outbound action.</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                                <AtlasSectionHeader title="Audience" description="Counts update before you publish or open drafts." icon={Users} />
                                <div className="mt-4 space-y-3">
                                    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-400">Segment</span><select value={messageForm.targetType} onChange={event => setMessageForm(previous => ({ ...previous, targetType: event.target.value as 'all' | 'program', targetIds: [] }))} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/50"><option value="all">All active students</option><option value="program">Selected programs</option></select></label>
                                    {messageForm.targetType === 'program' && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-400">Programs</p>
                                            {tenantPrograms.map(program => (
                                                <label key={program.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-slate-950/55 px-3 py-2 hover:border-white/20">
                                                    <input type="checkbox" checked={messageForm.targetIds.includes(program.id)} onChange={event => setMessageForm(previous => ({ ...previous, targetIds: event.target.checked ? [...previous.targetIds, program.id] : previous.targetIds.filter(id => id !== program.id) }))} className="h-4 w-4 accent-teal-500" />
                                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{program.name}</span>
                                                    <span className="text-xs font-bold text-slate-500">{programAudienceCounts.get(program.id)?.size || 0}</span>
                                                </label>
                                            ))}
                                            {tenantPrograms.length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-500">No active programs are available.</p>}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-teal-400/20 bg-teal-400/5 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Dashboard</p><p className="mt-1 text-xl font-black text-white">{audienceStudents.length}</p></div>
                                        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">WhatsApp</p><p className="mt-1 text-xl font-black text-white">{whatsappRecipients.length}</p></div>
                                    </div>
                                    {missingPhoneCount > 0 && <p className="text-xs leading-5 text-amber-200">{missingPhoneCount} selected student{missingPhoneCount === 1 ? '' : 's'} will not appear in the WhatsApp queue because a parent phone is missing.</p>}
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                                <AtlasSectionHeader title="Save to library" description="Templates are organization-scoped drafts, not deliveries." icon={Save} />
                                <label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold text-slate-400">Category</span><select value={templateCategory} onChange={event => setTemplateCategory(event.target.value as TemplateCategory)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/50">{CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                                <AtlasActionButton icon={Save} className="mt-3 w-full" onClick={handleSaveTemplate} disabled={!canManage || saving}>Save as template</AtlasActionButton>
                            </div>
                        </aside>
                    </div>

                    <AtlasToolbar
                        leading={<div><p className="text-sm font-bold text-white">Choose a real action</p><p className="text-xs text-slate-500">Dashboard publication is live. WhatsApp remains operator-assisted.</p></div>}
                        trailing={
                            <>
                                <button type="button" disabled title="Email provider is not connected" className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-bold text-slate-600"><Mail size={16} /> Email unavailable</button>
                                <button type="button" disabled title="Scheduled delivery requires a background worker" className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-bold text-slate-600"><CalendarClock size={16} /> Schedule unavailable</button>
                                <AtlasActionButton icon={MessageCircle} onClick={openWhatsAppQueue} disabled={!canManage || saving || whatsappRecipients.length === 0}>Review WhatsApp drafts</AtlasActionButton>
                                <AtlasActionButton icon={Send} variant="primary" onClick={handlePublishAnnouncement} disabled={!canManage || saving || !composeReady || personalizationTokens.length > 0}>Publish dashboard post</AtlasActionButton>
                            </>
                        }
                    >
                        <span className="text-xs text-slate-500">{messageForm.content.length}/4000 characters</span>
                    </AtlasToolbar>

                    {audienceStudents.length > 0 && (
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                            <AtlasSectionHeader title="Audience preview" description="A compact sample of the selected audience. No message has been sent." icon={Users} meta={<span className="text-xs font-bold text-slate-500">{audienceStudents.length} total</span>} />
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {audienceStudents.slice(0, 12).map(student => (
                                    <div key={student.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/55 p-3"><span className={`h-2 w-2 shrink-0 rounded-full ${student.parentPhone?.trim() ? 'bg-teal-400' : 'bg-amber-300'}`} /><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{student.name}</p><p className="truncate text-xs text-slate-500">{student.parentName || 'Parent name missing'} · {student.parentPhone || 'Phone missing'}</p></div></div>
                                ))}
                            </div>
                            {audienceStudents.length > 12 && <p className="mt-3 text-xs text-slate-500">And {audienceStudents.length - 12} more selected students.</p>}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'templates' && (
                <section id="communications-panel-templates" role="tabpanel" tabIndex={-1} className="space-y-4 outline-none">
                    <AtlasToolbar
                        leading={<div className="relative min-w-56 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" /><input value={templateSearch} onChange={event => setTemplateSearch(event.target.value)} placeholder="Search templates" className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50" /></div>}
                        trailing={<><select value={templateFilter} onChange={event => setTemplateFilter(event.target.value as 'all' | TemplateCategory)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/50"><option value="all">All categories</option>{CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><AtlasActionButton icon={Plus} onClick={handleSeedTemplates} disabled={!canManage || saving}>Add starters</AtlasActionButton></>}
                    >
                        <span className="text-xs text-slate-500">{filteredTemplates.length} shown</span>
                    </AtlasToolbar>

                    {filteredTemplates.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredTemplates.map(template => (
                                <article key={template.id} className="flex min-h-56 flex-col rounded-lg border border-white/10 bg-slate-900/70 p-4">
                                    <div className="flex items-start justify-between gap-3"><span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200">{template.category}</span><button type="button" onClick={() => handleDeleteTemplate(template)} disabled={!canManage || saving} aria-label={`Delete ${template.title}`} title="Delete template" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /></button></div>
                                    <h3 className="mt-3 text-base font-black text-white">{template.title}</h3>
                                    <p className="mt-2 line-clamp-4 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-400">{template.content}</p>
                                    {template.tags && template.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{template.tags.map(tag => <span key={tag} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-500">{tag}</span>)}</div>}
                                    <AtlasActionButton className="mt-4 w-full" onClick={() => handleLoadTemplate(template)}>Use template</AtlasActionButton>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <AtlasEmptyState title={templates.length === 0 ? 'No templates saved' : 'No templates match'} description={templates.length === 0 ? 'Add the Edufy starter set or save an operational message from Compose.' : 'Clear the search or choose another category.'} icon={FileText} action={templates.length === 0 ? <AtlasActionButton icon={Plus} variant="primary" onClick={handleSeedTemplates} disabled={!canManage || saving}>Add starter templates</AtlasActionButton> : <AtlasActionButton onClick={() => { setTemplateSearch(''); setTemplateFilter('all'); }}>Clear filters</AtlasActionButton>} />
                    )}
                </section>
            )}

            {activeTab === 'history' && (
                <section id="communications-panel-history" role="tabpanel" tabIndex={-1} className="space-y-4 outline-none">
                    <AtlasToolbar leading={<div className="relative min-w-56 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" /><input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Search dashboard posts" className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50" /></div>}><span className="text-xs text-slate-500">Publication history only. Provider delivery is not tracked.</span></AtlasToolbar>
                    <div className="space-y-2">
                        {filteredAnnouncements.map(item => (
                            <article key={item.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-white">{item.title}</h3><span className="rounded-lg border border-teal-400/20 bg-teal-400/10 px-2 py-1 text-[10px] font-black uppercase text-teal-200">Published</span></div><p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{item.content}</p></div>
                                    <div className="shrink-0 text-left sm:text-right"><p className="text-xs font-bold text-white">{item.sentCount} targeted</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.sentAt || item.createdAt)}</p></div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase text-slate-500"><span>{item.targetAudience?.type === 'program' ? 'Program segment' : 'All active students'}</span><span>·</span><span>Dashboard publication</span></div>
                            </article>
                        ))}
                    </div>
                    {!loading && filteredAnnouncements.length === 0 && <AtlasEmptyState title={announcements.length === 0 ? 'No dashboard posts yet' : 'No posts match'} description={announcements.length === 0 ? 'Published dashboard announcements will appear here with their intended audience count.' : 'Clear the search to return to the full history.'} icon={Inbox} action={announcements.length === 0 ? <AtlasActionButton variant="primary" onClick={() => switchTab('compose')} disabled={!canManage}>Compose announcement</AtlasActionButton> : <AtlasActionButton onClick={() => setHistorySearch('')}>Clear search</AtlasActionButton>} />}
                </section>
            )}

            <Modal isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} title="Review WhatsApp drafts" size="lg">
                {currentQueueStudent ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100/80"><strong className="block text-amber-100">Operator-assisted workflow</strong>Edufy opens a personalized WhatsApp draft. Review it, send it in WhatsApp if appropriate, then return here. Delivery and replies are not tracked.</div>
                        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">Recipient {queueIndex + 1} of {whatsappRecipients.length}</p><h3 className="mt-1 text-xl font-black text-white">{currentQueueStudent.name}</h3><p className="mt-1 flex items-center gap-2 text-sm text-slate-400"><Phone size={14} /> {currentQueueStudent.parentPhone}</p></div><span className="rounded-lg border border-teal-400/20 bg-teal-400/10 px-3 py-2 text-xs font-bold text-teal-200">{Math.round(((queueIndex + 1) / whatsappRecipients.length) * 100)}%</span></div>
                        <div className="h-2 overflow-hidden rounded-lg bg-slate-950"><div className="h-full bg-teal-500 transition-[width] duration-200" style={{ width: `${((queueIndex + 1) / whatsappRecipients.length) * 100}%` }} /></div>
                        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4"><p className="mb-2 text-[10px] font-black uppercase text-slate-500">Personalized preview</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{generateMessage(currentQueueStudent.id)}</p></div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><AtlasActionButton icon={SkipForward} onClick={() => advanceQueue(false)}>Skip recipient</AtlasActionButton><AtlasActionButton icon={MessageCircle} variant="primary" onClick={() => advanceQueue(true)}>Open draft and continue</AtlasActionButton></div>
                    </div>
                ) : (
                    <AtlasEmptyState title="No WhatsApp recipients" description="Choose an audience with at least one valid parent phone number." icon={MessageCircle} />
                )}
            </Modal>
        </div>
    );
};
