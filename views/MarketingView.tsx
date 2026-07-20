
import React, { useMemo, useState } from 'react';
import { Megaphone, Calendar, DollarSign, Users, Plus, Send, Eye, Trash2, Search, Filter, ArrowRight, ArrowLeft, CheckCircle2, Clock, Upload, Link as LinkIcon, AlertCircle, Download, Table as TableIcon, Kanban as KanbanIcon, TrendingUp, Briefcase, Phone, ShieldCheck, X, ClipboardCheck, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/Modal';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { addDoc, arrayUnion, collection, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MarketingPost, Campaign, Lead } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';

import { LeadProfileModal } from './marketing/LeadProfileModal'; // New Modal
import { GrowthWizardModal } from './marketing/GrowthWizardModal'; // New Wizard
import { CampaignKitModal } from './marketing/CampaignKitModal'; // New Kit Modal


interface MarketingViewProps {
    onEnrollLead?: (lead: Lead) => void;
}

const LEAD_STAGES: { id: Lead['status']; label: string; tone: string }[] = [
    { id: 'new', label: 'New', tone: 'text-sky-300' },
    { id: 'contacted', label: 'Contacted', tone: 'text-slate-300' },
    { id: 'interested', label: 'Interested', tone: 'text-amber-200' },
    { id: 'workshop_booked', label: 'Workshop booked', tone: 'text-teal-300' },
    { id: 'demo_booked', label: 'Demo booked', tone: 'text-teal-300' },
    { id: 'converted', label: 'Converted', tone: 'text-emerald-300' },
    { id: 'closed', label: 'Closed', tone: 'text-rose-300' }
];

const REQUIRED_CAMPAIGN_ASSETS = ['landing page', 'ad creative (square)', 'ad creative (story)', 'ad copy'];
const cleanPhone = (phone = '') => phone.replace(/\D/g, '');
const isWebUrl = (value: string) => {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
};

export const MarketingView: React.FC<MarketingViewProps> = ({ onEnrollLead }) => {
    const { marketingPosts, campaigns, leads, programs, students, bookings } = useAppContext(); // Get students for unified view
    const { currentOrganization, can } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const orgId = currentOrganization?.id || '';
    const [activeTab, setActiveTab] = useState<'content' | 'campaigns' | 'leads' | 'upsell'>('content');
    const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

    // --- CONTENT STATE ---
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [postForm, setPostForm] = useState<Partial<MarketingPost>>({ platform: 'instagram', content: '', date: new Date().toISOString().split('T')[0], status: 'planned' });

    // Submission & Review State
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [submissionLink, setSubmissionLink] = useState('');
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<MarketingPost | null>(null);
    const [feedback, setFeedback] = useState('');

    // --- CAMPAIGN STATE ---
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isKitModalOpen, setIsKitModalOpen] = useState(false);
    const [selectedCampaignForKit, setSelectedCampaignForKit] = useState<Campaign | null>(null);
    const [campaignForm, setCampaignForm] = useState<Partial<Campaign>>({ name: '', budget: 0, spend: 0, status: 'planned', startDate: '', endDate: '', goals: '' });
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

    // --- LEADS STATE ---
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', parentName: '', phone: '', email: '', status: 'new', source: 'Facebook' });

    // --- LEADS FILTER & PROFILE STATE ---
    const [selectedInterestFilter, setSelectedInterestFilter] = useState('');
    const [selectedLeadForProfile, setSelectedLeadForProfile] = useState<Lead | null>(null);
    const [mobileKanbanColumn, setMobileKanbanColumn] = useState<Lead['status']>('new'); // Mobile View State
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | Campaign['status']>('all');
    const [profileInitialAction, setProfileInitialAction] = useState<'call' | 'booking' | null>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);
    const canCreateMarketing = can('marketing.create');

    // Auto-Status Listener (Sync bookings to lead status)
    React.useEffect(() => {
        if (!db || !orgId || !canCreateMarketing || !leads.length || !bookings.length) return;

        leads.forEach(lead => {
            if (['new', 'contacted', 'interested'].includes(lead.status)) {
                if (lead.organizationId !== orgId) return;
                const leadPhone = cleanPhone(lead.phone);
                if (!leadPhone) return;

                const hasBooking = bookings.some(b => b.organizationId === orgId && cleanPhone(b.phoneNumber) === leadPhone && b.status !== 'cancelled');
                if (hasBooking) {
                    void updateDoc(doc(db, 'leads', lead.id), { status: 'workshop_booked', timeline: arrayUnion({ date: new Date().toISOString(), type: 'status_change', details: 'Workshop booking detected; pipeline moved to workshop booked.', author: 'Edufy automation' }) }).catch(error => {
                        console.error('Lead booking sync failed', error);
                        setActionFeedback({ kind: 'error', message: `Could not sync ${lead.name}'s booking status. Refresh and try again.` });
                    });
                }
            }
        });
    }, [bookings, canCreateMarketing, leads, orgId]);

    // --- INVITE STATE ---
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedLeadForInvite, setSelectedLeadForInvite] = useState<Lead | null>(null);
    const [selectedTemplateForInvite, setSelectedTemplateForInvite] = useState<string>('');
    const { workshopTemplates } = useAppContext();
    const [isGrowthWizardOpen, setIsGrowthWizardOpen] = useState(false);
    const [growthWizardInitialType, setGrowthWizardInitialType] = useState<'holiday' | 'next_level'>('holiday');

    const handleGenerateInvite = async () => {
        if (!selectedLeadForInvite || !selectedTemplateForInvite || !canCreateMarketing) return;
        const template = workshopTemplates.find(t => t.id === selectedTemplateForInvite);
        const phone = cleanPhone(selectedLeadForInvite.phone);
        if (!template || template.organizationId !== orgId || !template.shareableSlug || phone.length < 8) {
            setActionFeedback({ kind: 'error', message: 'This invitation needs a valid phone number and an active workshop booking link.' });
            return;
        }

        const bookingUrl = `${window.location.origin}/w/${template.shareableSlug}`;
        const organizationName = currentOrganization?.name || 'our academy';
        const message = `Hello ${selectedLeadForInvite.parentName}, we'd like to invite ${selectedLeadForInvite.name} to "${template.title}" at ${organizationName}.\n\nChoose a workshop time here: ${bookingUrl}`;

        try {
            await navigator.clipboard.writeText(message);
        } catch {
            setActionFeedback({ kind: 'info', message: 'The invitation could not be copied, but WhatsApp will still open with the message.' });
        }
        const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        const opened = window.open(waLink, '_blank', 'noopener,noreferrer');
        if (!opened) {
            setActionFeedback({ kind: 'error', message: 'Your browser blocked WhatsApp. Allow pop-ups, then try again.' });
            return;
        }

        setIsInviteModalOpen(false);
        // Optional: Update status to 'contacted' if it was 'new'
        if (selectedLeadForInvite.status === 'new') {
            await handleUpdateLeadStatus(selectedLeadForInvite.id, 'contacted');
        }
        setActionFeedback({ kind: 'success', message: 'Invitation prepared in WhatsApp. Sending remains under your control.' });
    };

    // Unified Contact List Logic (Leads + Students)
    const unifiedContacts = [
        ...leads.map(l => ({ ...l, type: 'lead' as const, contactParams: l })),
        ...students.map(s => ({
            id: s.id,
            name: s.name,
            parentName: s.parentName || 'N/A',
            phone: s.parentPhone,
            email: s.email,
            source: 'Student (Enrolled)',
            status: s.status === 'active' ? 'converted' : 'closed', // Map student status to lead status for filtering
            interests: ['Active Student'], // Tag as Student
            tags: ['Student'],
            createdAt: s.createdAt,
            type: 'student' as const,
            contactParams: s
        }))
    ];

    // Filter Logic
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredContacts = unifiedContacts.filter(c => {
        const matchesInterest = !selectedInterestFilter || (selectedInterestFilter === 'Active Student' && c.type === 'student') || c.interests?.some(i => i === selectedInterestFilter);
        const matchesSearch = !normalizedSearch || [c.name, c.parentName, c.phone, c.email, c.source].some(value => value?.toLowerCase().includes(normalizedSearch));
        return Boolean(matchesInterest && matchesSearch);
    });

    const filteredLeadsOnly = leads.filter(l => {
        const matchesInterest = !selectedInterestFilter || l.interests?.some(i => i === selectedInterestFilter);
        const matchesSearch = !normalizedSearch || [l.name, l.parentName, l.phone, l.email, l.source].some(value => value?.toLowerCase().includes(normalizedSearch));
        return Boolean(matchesInterest && matchesSearch);
    });

    const visibleCampaigns = campaigns.filter(campaign => campaignStatusFilter === 'all' || campaign.status === campaignStatusFilter);
    const interestOptions = useMemo(() => Array.from(new Set([
        ...programs.map(program => program.name),
        ...leads.flatMap(lead => lead.interests || []),
        'Holiday Camp'
    ])).sort(), [leads, programs]);

    const requireCreateAccess = () => {
        if (canCreateMarketing && orgId) return true;
        setActionFeedback({ kind: 'error', message: !orgId ? 'Select an organization before changing Marketing data.' : 'You have view-only Marketing access.' });
        return false;
    };

    const openNewCampaign = () => {
        setEditingCampaignId(null);
        setCampaignForm({ name: '', budget: 0, spend: 0, status: 'planned', startDate: '', endDate: '', goals: '' });
        setActionFeedback(null);
        setIsCampaignModalOpen(true);
    };

    const openCampaignEditor = (campaign: Campaign) => {
        setEditingCampaignId(campaign.id);
        setCampaignForm({ name: campaign.name, budget: campaign.budget, spend: campaign.spend, status: campaign.status, startDate: campaign.startDate, endDate: campaign.endDate, goals: campaign.goals });
        setActionFeedback(null);
        setIsCampaignModalOpen(true);
    };

    const handleExport = () => {
        if (filteredContacts.length === 0) {
            setActionFeedback({ kind: 'info', message: 'There are no contacts in the current filter to export.' });
            return;
        }
        const dataToExport = filteredContacts.map(c => ({ Name: c.name, Parent: c.parentName, Phone: c.phone, Email: c.email || '', Type: c.type.toUpperCase(), Status: c.status, Source: c.source, Interests: c.interests?.join(', ') || '' }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
        XLSX.writeFile(wb, `Edufy_CRM_Contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
        setActionFeedback({ kind: 'success', message: `${filteredContacts.length} contacts exported from the current view.` });
    };

    const handleSavePost = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !requireCreateAccess()) return;
        if (!postForm.content?.trim() || !postForm.date) {
            setActionFeedback({ kind: 'error', message: 'Add post content and a planned date before creating the task.' });
            return;
        }
        setPendingAction('post-create');
        try {
            await addDoc(collection(db, 'marketing_posts'), { ...postForm, content: postForm.content.trim(), organizationId: orgId, createdAt: serverTimestamp(), attachments: [], feedback: '' });
            setIsPostModalOpen(false);
            setPostForm({ platform: 'instagram', content: '', date: new Date().toISOString().split('T')[0], status: 'planned' });
            setActionFeedback({ kind: 'success', message: 'Content task added to the planning queue.' });
        } catch (error) {
            console.error('Post creation failed', error);
            setActionFeedback({ kind: 'error', message: 'The content task could not be created. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleMoveStatus = async (post: MarketingPost, direction: 'next' | 'prev') => {
        if (!db || !requireCreateAccess() || pendingAction) return;
        const currentPost = marketingPosts.find(item => item.id === post.id);
        if (!currentPost || currentPost.organizationId !== orgId) {
            setActionFeedback({ kind: 'error', message: 'This content task is unavailable in the current organization.' });
            return;
        }
        const flow: MarketingPost['status'][] = ['planned', 'in_progress', 'review', 'approved', 'published'];
        const currentIndex = flow.indexOf(currentPost.status);
        const nextStatus = flow[currentIndex + 1];
        const prevStatus = flow[currentIndex - 1];
        if (direction === 'next' && currentPost.status === 'in_progress') {
            setSelectedPostId(currentPost.id);
            setIsSubmitModalOpen(true);
            return;
        }
        if (direction === 'next' && currentPost.status === 'review') {
            if (!can('marketing.approve')) {
                showAlert('Approval restricted', 'You do not have permission to approve content. Please wait for an administrator.', 'warning');
                return;
            }
            setSelectedPost(currentPost);
            setFeedback('');
            setIsReviewModalOpen(true);
            return;
        }
        const targetStatus = direction === 'next' ? nextStatus : prevStatus;
        if (!targetStatus) return;
        if (targetStatus === 'published') {
            const accepted = await confirm({ title: 'Mark this post as published?', message: 'Edufy does not publish to social networks. Confirm only after the post is live in the external platform.', confirmText: 'Mark published', cancelText: 'Keep approved', variant: 'info' });
            if (!accepted) return;
        }
        setPendingAction(`post-${currentPost.id}`);
        try {
            await updateDoc(doc(db, 'marketing_posts', currentPost.id), { status: targetStatus });
            setActionFeedback({ kind: 'success', message: `Content moved to ${targetStatus.replace('_', ' ')}.` });
        } catch (error) {
            console.error('Post status update failed', error);
            setActionFeedback({ kind: 'error', message: 'The content status could not be updated. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleSubmitWork = async () => {
        if (!db || !selectedPostId || !requireCreateAccess() || pendingAction) return;
        const currentPost = marketingPosts.find(post => post.id === selectedPostId);
        if (!currentPost || currentPost.organizationId !== orgId) {
            setActionFeedback({ kind: 'error', message: 'This content task is unavailable in the current organization.' });
            return;
        }
        const normalizedLink = submissionLink.trim();
        if (!isWebUrl(normalizedLink)) {
            setActionFeedback({ kind: 'error', message: 'Enter a complete http or https asset link before submitting.' });
            return;
        }
        setPendingAction('post-submit');
        try {
            await updateDoc(doc(db, 'marketing_posts', currentPost.id), { status: 'review', attachments: [normalizedLink] });
            setIsSubmitModalOpen(false);
            setSubmissionLink('');
            setSelectedPostId(null);
            setActionFeedback({ kind: 'success', message: 'Content submitted for approval.' });
        } catch (error) {
            console.error('Content submission failed', error);
            setActionFeedback({ kind: 'error', message: 'The content could not be submitted. Check the link and try again.' });
        } finally { setPendingAction(null); }
    };

    const handleApprovePost = async () => {
        if (!db || !selectedPost || !can('marketing.approve') || pendingAction) return;
        const currentPost = marketingPosts.find(post => post.id === selectedPost.id);
        if (!currentPost || currentPost.organizationId !== orgId) {
            setActionFeedback({ kind: 'error', message: 'This content task is unavailable in the current organization.' });
            return;
        }
        setPendingAction('post-approve');
        try {
            await updateDoc(doc(db, 'marketing_posts', currentPost.id), { status: 'approved', feedback: '' });
            setIsReviewModalOpen(false);
            setActionFeedback({ kind: 'success', message: 'Content approved and ready for external publishing.' });
        } catch (error) {
            console.error('Content approval failed', error);
            setActionFeedback({ kind: 'error', message: 'The approval could not be saved. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleRejectPost = async () => {
        if (!db || !selectedPost || !can('marketing.approve') || pendingAction) return;
        const currentPost = marketingPosts.find(post => post.id === selectedPost.id);
        if (!currentPost || currentPost.organizationId !== orgId) {
            setActionFeedback({ kind: 'error', message: 'This content task is unavailable in the current organization.' });
            return;
        }
        if (!feedback.trim()) {
            showAlert('Feedback required', 'Add feedback before sending this post back for revisions.', 'warning');
            return;
        }
        setPendingAction('post-reject');
        try {
            await updateDoc(doc(db, 'marketing_posts', currentPost.id), { status: 'in_progress', feedback: feedback.trim() });
            setIsReviewModalOpen(false);
            setActionFeedback({ kind: 'success', message: 'Content returned for revision with feedback.' });
        } catch (error) {
            console.error('Content revision request failed', error);
            setActionFeedback({ kind: 'error', message: 'The revision request could not be saved. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleSaveCampaign = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !requireCreateAccess()) return;
        const name = campaignForm.name?.trim() || '';
        const budget = Number(campaignForm.budget || 0);
        const spend = Number(campaignForm.spend || 0);
        if (!name || !campaignForm.startDate || !campaignForm.endDate) {
            setActionFeedback({ kind: 'error', message: 'Campaign name, start date, and end date are required.' });
            return;
        }
        if (campaignForm.endDate < campaignForm.startDate) {
            setActionFeedback({ kind: 'error', message: 'Campaign end date must be on or after its start date.' });
            return;
        }
        if (budget < 0 || spend < 0) {
            setActionFeedback({ kind: 'error', message: 'Budget and spend cannot be negative.' });
            return;
        }
        setPendingAction('campaign-create');
        try {
            if (editingCampaignId) {
                const existingCampaign = campaigns.find(campaign => campaign.id === editingCampaignId);
                if (!existingCampaign || existingCampaign.organizationId !== orgId) throw new Error('Campaign tenant mismatch');
                await updateDoc(doc(db, 'campaigns', editingCampaignId), { name, budget, spend, startDate: campaignForm.startDate, endDate: campaignForm.endDate, goals: campaignForm.goals?.trim() || '' });
            } else {
                await addDoc(collection(db, 'campaigns'), { ...campaignForm, name, budget, spend, status: 'planned', organizationId: orgId, createdAt: serverTimestamp(), assets: [] });
            }
            setIsCampaignModalOpen(false);
            setCampaignForm({ name: '', budget: 0, spend: 0, status: 'planned', startDate: '', endDate: '', goals: '' });
            setActionFeedback({ kind: 'success', message: editingCampaignId ? 'Campaign details updated.' : 'Campaign created as planned. Prepare and approve its kit before activation.' });
            setEditingCampaignId(null);
        } catch (error) {
            console.error('Campaign creation failed', error);
            setActionFeedback({ kind: 'error', message: 'The campaign could not be created. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleCampaignStatus = async (campaign: Campaign, status: Campaign['status']) => {
        if (!db || campaign.organizationId !== orgId || !can('marketing.approve') || pendingAction) return;
        if (status === 'active') {
            const kitReady = REQUIRED_CAMPAIGN_ASSETS.every(required => (campaign.assets || []).some(asset => asset.name.toLowerCase().includes(required) && asset.status === 'approved'));
            if (!kitReady) {
                setActionFeedback({ kind: 'error', message: 'Approve every required campaign-kit asset before activating this campaign.' });
                return;
            }
        }
        setPendingAction(`campaign-${campaign.id}`);
        try {
            await updateDoc(doc(db, 'campaigns', campaign.id), { status });
            setActionFeedback({ kind: 'success', message: `Campaign marked ${status}. External publishing and ad delivery remain manual.` });
        } catch (error) {
            console.error('Campaign status update failed', error);
            setActionFeedback({ kind: 'error', message: 'The campaign status could not be updated. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleSaveLead = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !requireCreateAccess()) return;
        const phone = cleanPhone(leadForm.phone || '');
        if (!leadForm.name?.trim() || !leadForm.parentName?.trim() || phone.length < 8) {
            setActionFeedback({ kind: 'error', message: 'Add the child, parent, and a valid phone number with at least 8 digits.' });
            return;
        }
        const duplicate = leads.some(lead => lead.organizationId === orgId && cleanPhone(lead.phone) === phone && !['converted', 'closed'].includes(lead.status));
        if (duplicate) {
            setActionFeedback({ kind: 'error', message: 'An open lead with this phone number already exists. Open the existing record instead.' });
            return;
        }
        setPendingAction('lead-create');
        try {
            await addDoc(collection(db, 'leads'), { ...leadForm, name: leadForm.name.trim(), parentName: leadForm.parentName.trim(), phone: leadForm.phone?.trim(), email: leadForm.email?.trim() || '', organizationId: orgId, createdAt: serverTimestamp() });
            setIsLeadModalOpen(false);
            setLeadForm({ name: '', parentName: '', phone: '', email: '', status: 'new', source: 'Facebook' });
            setActionFeedback({ kind: 'success', message: 'Lead added to the new stage.' });
        } catch (error) {
            console.error('Lead creation failed', error);
            setActionFeedback({ kind: 'error', message: 'The lead could not be created. Try again.' });
        } finally { setPendingAction(null); }
    };

    const handleUpdateLeadStatus = async (id: string, newStatus: Lead['status']) => {
        if (!db || !requireCreateAccess()) return;
        const lead = leads.find(item => item.id === id);
        if (!lead || lead.organizationId !== orgId || lead.status === newStatus) return;
        try {
            await updateDoc(doc(db, 'leads', id), { status: newStatus, timeline: arrayUnion({ date: new Date().toISOString(), type: 'status_change', details: `Pipeline moved from ${lead.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`, author: 'Marketing team' }) });
            setActionFeedback({ kind: 'success', message: `${lead.name} moved to ${newStatus.replace('_', ' ')}.` });
        } catch (error) {
            console.error('Lead stage update failed', error);
            setActionFeedback({ kind: 'error', message: `Could not move ${lead.name}. Try again.` });
        }
    };

    const handleDeleteItem = async (collectionName: string, id: string) => {
        if (!db || !requireCreateAccess()) return;
        let item: MarketingPost | Campaign | Lead | undefined;
        let itemLabel = 'item';
        switch (collectionName) {
            case 'marketing_posts':
                item = marketingPosts.find(post => post.id === id);
                itemLabel = 'content task';
                break;
            case 'campaigns':
                item = campaigns.find(campaign => campaign.id === id);
                itemLabel = 'campaign';
                break;
            case 'leads':
                item = leads.find(lead => lead.id === id);
                itemLabel = 'lead';
                break;
            default:
                setActionFeedback({ kind: 'error', message: 'Unsupported Marketing deletion request.' });
                return;
        }
        if (!item || item.organizationId !== orgId) {
            setActionFeedback({ kind: 'error', message: `This ${itemLabel} is unavailable in the current organization.` });
            return;
        }
        const approved = await confirm({ title: 'Delete item?', message: 'This item will be removed from the Marketing Hub.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
        if (!approved) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
            setActionFeedback({ kind: 'success', message: 'Item deleted.' });
        } catch (error) {
            console.error('Marketing item deletion failed', error);
            setActionFeedback({ kind: 'error', message: 'The item could not be deleted. Try again.' });
        }
    };

    // --- RENDER HELPERS ---
    const renderContentCard = (post: MarketingPost) => (
        <article key={post.id} className="group relative mb-2 flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-900 p-3 transition-colors hover:border-teal-400/30">
            <div className="flex justify-between items-start">
                <span className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{post.platform}</span>
                <button onClick={() => handleDeleteItem('marketing_posts', post.id)} disabled={!canCreateMarketing || pendingAction !== null} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30" aria-label={`Delete ${post.platform} content task`} title="Delete content task"><Trash2 size={14} /></button>
            </div>
            <p className="text-sm text-white font-medium line-clamp-3">{post.content}</p>
            <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                <span>{formatDate(post.date)}</span>
                {post.attachments && post.attachments.length > 0 && <span className="flex items-center gap-1 text-blue-400"><LinkIcon size={10} /> Attached</span>}
            </div>

            {post.feedback && post.status === 'in_progress' && (
                <div className="mt-2 rounded border border-rose-400/20 bg-rose-500/10 p-2 text-xs text-rose-200">
                    <strong className="block text-[9px] uppercase opacity-70">Feedback:</strong> {post.feedback}
                </div>
            )}

            <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-2">
                {post.status !== 'planned' ? (
                    <button onClick={() => handleMoveStatus(post, 'prev')} disabled={!canCreateMarketing || pendingAction !== null} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" aria-label="Move content back"><ArrowLeft size={14} /></button>
                ) : <div></div>}

                {/* Status Specific Actions */}
                {post.status === 'in_progress' && (
                    <button onClick={() => handleMoveStatus(post, 'next')} disabled={!canCreateMarketing || pendingAction !== null} className="flex min-h-8 items-center gap-1 rounded-lg bg-teal-500 px-2 text-xs font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-40">Submit <Upload size={11} /></button>
                )}
                {post.status === 'review' && (
                    can('marketing.approve') ? (
                        <button onClick={() => handleMoveStatus(post, 'next')} disabled={pendingAction !== null} className="flex min-h-8 items-center gap-1 rounded-lg bg-amber-300 px-2 text-xs font-bold text-slate-950 hover:bg-amber-200 disabled:opacity-40">Review <Eye size={11} /></button>
                    ) : (
                        <span className="text-xs text-amber-500 flex items-center gap-1 font-bold bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30"><Clock size={10} /> Waiting Approval</span>
                    )
                )}
                {post.status === 'approved' && (
                    <button onClick={() => handleMoveStatus(post, 'next')} disabled={!canCreateMarketing || pendingAction !== null} className="flex min-h-8 items-center gap-1 rounded-lg bg-teal-500 px-2 text-xs font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-40">Mark published <ClipboardCheck size={11} /></button>
                )}
                {(post.status === 'planned') && (
                    <button onClick={() => handleMoveStatus(post, 'next')} disabled={!canCreateMarketing || pendingAction !== null} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-teal-300 disabled:opacity-30" aria-label="Start content task"><ArrowRight size={14} /></button>
                )}
            </div>
        </article>
    );

    return (
        <div className="flex min-h-0 flex-col gap-4 pb-24 md:h-full md:pb-8">
            {/* Header */}
            <AtlasCommandHeader
                eyebrow="Growth engine"
                title="Marketing Hub"
                description="Plan content, manage campaigns, nurture leads, and convert workshop interest into enrollment."
                icon={Megaphone}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">{filteredContacts.length} contacts</span>}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setIsGrowthWizardOpen(true)} disabled={!canCreateMarketing} title={!canCreateMarketing ? 'Marketing create access is required' : undefined} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 text-sm font-bold text-amber-200 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-40">
                            <TrendingUp size={16} /> Growth wizard
                        </button>
                        <button onClick={() => { setActionFeedback(null); setIsLeadModalOpen(true); }} disabled={!canCreateMarketing} title={!canCreateMarketing ? 'Marketing create access is required' : undefined} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-400 px-3 text-sm font-bold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-40">
                            <Plus size={16} /> Add lead
                        </button>
                    </div>
                }
            />

            {actionFeedback && (
                <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${actionFeedback.kind === 'success' ? 'border-teal-400/25 bg-teal-400/10 text-teal-100' : actionFeedback.kind === 'error' ? 'border-rose-400/25 bg-rose-400/10 text-rose-100' : 'border-amber-300/25 bg-amber-300/10 text-amber-100'}`} role="status">
                    <span>{actionFeedback.message}</span>
                    <button type="button" onClick={() => setActionFeedback(null)} className="shrink-0 rounded p-0.5 text-current opacity-70 hover:opacity-100" aria-label="Dismiss message"><X size={15} /></button>
                </div>
            )}

            {!canCreateMarketing && <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">View-only workspace. You can inspect and export CRM data; creating and moving records requires Marketing create access.</div>}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <AtlasSignalCard label="Open Leads" value={leads.filter(l => !['converted', 'closed'].includes(l.status)).length} icon={Users} tone="teal" detail="Active CRM opportunities" />
                <AtlasSignalCard label="Campaign Spend" value={formatCurrency(campaigns.reduce((sum, c) => sum + (c.spend || 0), 0))} icon={DollarSign} tone="amber" detail={`${campaigns.length} campaigns tracked`} />
                <AtlasSignalCard label="Content Queue" value={marketingPosts.filter(p => p.status !== 'published').length} icon={Calendar} tone="blue" detail="Posts before publish" />
                <AtlasSignalCard label="Booked Leads" value={leads.filter(l => ['workshop_booked', 'demo_booked'].includes(l.status)).length} icon={Phone} tone="emerald" detail="Ready for follow-up" />
            </div>
            <div className="sticky top-0 z-20 flex min-w-0 max-w-full overflow-x-auto whitespace-nowrap rounded-lg border border-white/10 bg-slate-950/95 p-1" role="tablist" aria-label="Marketing workspace">
                {([
                    ['content', 'Content', Calendar],
                    ['campaigns', 'Campaigns', DollarSign],
                    ['leads', 'CRM', Users],
                    ['upsell', 'Growth', TrendingUp]
                ] as const).map(([id, label, Icon]) => (
                    <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors ${activeTab === id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'}`}><Icon size={15} /> {label}</button>
                ))}
            </div>


            {/* CONTENT KANBAN TAB */}
            {
                activeTab === 'content' && (
                    <div className="md:h-full flex flex-col min-h-0">
                        <AtlasSectionHeader title="Content operations" description="Move work through preparation and approval. Publishing to social providers is recorded manually." icon={Calendar} actions={<AtlasActionButton icon={Plus} variant="primary" onClick={() => { setActionFeedback(null); setIsPostModalOpen(true); }} disabled={!canCreateMarketing}>Schedule post</AtlasActionButton>} />
                        <div className="flex-1 overflow-x-auto pb-4">
                            <div className="mt-3 flex h-full min-w-[1000px] gap-3">
                                {['planned', 'in_progress', 'review', 'approved'].map(status => (
                                    <section key={status} className="flex h-full min-w-[240px] flex-1 flex-col rounded-lg border border-white/10 bg-slate-950/50">
                                        <div className={`flex justify-between border-b border-white/10 bg-slate-900 p-3 text-xs font-bold uppercase ${status === 'review' ? 'text-amber-200' : status === 'approved' ? 'text-teal-300' : 'text-slate-400'}`}>
                                            {status === 'approved' ? 'Ready / published' : status.replace('_', ' ')}
                                            <span className="bg-slate-950 px-2 rounded text-white">{marketingPosts.filter(p => (status === 'approved' ? (p.status === 'approved' || p.status === 'published') : p.status === status)).length}</span>
                                        </div>
                                        <div className="flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar">
                                            {marketingPosts
                                                .filter(p => (status === 'approved' ? (p.status === 'approved' || p.status === 'published') : p.status === status))
                                                .map(renderContentCard)}
                                            {marketingPosts.filter(p => (status === 'approved' ? (p.status === 'approved' || p.status === 'published') : p.status === status)).length === 0 && <div className="px-3 py-8 text-center text-xs text-slate-600">No content in this stage.</div>}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CAMPAIGNS TAB */}
            {
                activeTab === 'campaigns' && (
                    <div className="md:h-full flex flex-col min-h-0">
                        <AtlasSectionHeader title="Campaign control" description="Prepare launch assets, approve the kit, then activate the campaign for manual execution." icon={Megaphone} actions={<AtlasActionButton icon={Plus} variant="primary" onClick={openNewCampaign} disabled={!canCreateMarketing}>New campaign</AtlasActionButton>} />
                        <AtlasToolbar className="mt-3" trailing={<span className="text-xs text-slate-500">{visibleCampaigns.length} shown</span>}>
                            <Filter size={14} className="text-slate-500" />
                            <select value={campaignStatusFilter} onChange={event => setCampaignStatusFilter(event.target.value as typeof campaignStatusFilter)} className="h-10 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-teal-400">
                                <option value="all">All statuses</option><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option>
                            </select>
                        </AtlasToolbar>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:overflow-y-auto lg:grid-cols-2 custom-scrollbar">
                            {visibleCampaigns.map(campaign => {
                                const approvedRequired = REQUIRED_CAMPAIGN_ASSETS.filter(required => (campaign.assets || []).some(asset => asset.name.toLowerCase().includes(required) && asset.status === 'approved')).length;
                                const kitReady = approvedRequired === REQUIRED_CAMPAIGN_ASSETS.length;
                                return (
                                <article key={campaign.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-base font-bold text-white">{campaign.name}</h3>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                <span className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-400">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                                                <span className={`rounded border px-2 py-1 text-xs font-bold uppercase ${campaign.status === 'active' ? 'border-teal-400/25 bg-teal-400/10 text-teal-200' : campaign.status === 'completed' ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-amber-300/25 bg-amber-300/10 text-amber-200'}`}>{campaign.status}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteItem('campaigns', campaign.id)} disabled={!canCreateMarketing || pendingAction !== null || campaign.status === 'active'} title={campaign.status === 'active' ? 'Complete the active campaign before deleting it' : 'Delete campaign'} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30" aria-label={`Delete ${campaign.name}`}><Trash2 size={16} /></button>
                                    </div>
                                    <div className="mb-4 grid grid-cols-3 gap-2">
                                        <div className="rounded border border-white/10 bg-slate-950 p-3"><span className="text-[10px] font-bold uppercase text-slate-500">Budget</span><div className="font-mono text-sm text-white">{formatCurrency(campaign.budget)}</div></div>
                                        <div className="rounded border border-white/10 bg-slate-950 p-3"><span className="text-[10px] font-bold uppercase text-slate-500">Spend</span><div className="font-mono text-sm text-white">{formatCurrency(campaign.spend)}</div></div>
                                        <div className="rounded border border-white/10 bg-slate-950 p-3"><span className="text-[10px] font-bold uppercase text-slate-500">Kit</span><div className={`font-mono text-sm ${kitReady ? 'text-teal-300' : 'text-amber-200'}`}>{approvedRequired}/{REQUIRED_CAMPAIGN_ASSETS.length}</div></div>
                                    </div>
                                    <p className="min-h-10 text-sm text-slate-400"><span className="font-bold text-slate-300">Goal:</span> {campaign.goals || 'No campaign goal recorded.'}</p>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                                        <button type="button" disabled title="Attribution reporting requires a connected ad or analytics provider" className="text-xs text-slate-600">Reporting not connected</button>
                                        <div className="flex flex-wrap gap-2">
                                            <AtlasActionButton icon={Pencil} onClick={() => openCampaignEditor(campaign)} disabled={!canCreateMarketing}>Edit</AtlasActionButton>
                                            <AtlasActionButton icon={Briefcase} onClick={() => { setSelectedCampaignForKit(campaign); setIsKitModalOpen(true); }}>Campaign kit</AtlasActionButton>
                                            {campaign.status === 'planned' && <AtlasActionButton icon={ShieldCheck} variant="primary" onClick={() => void handleCampaignStatus(campaign, 'active')} disabled={!can('marketing.approve') || !kitReady || pendingAction !== null} title={!kitReady ? 'Approve all required kit assets first' : 'Activate campaign'}>Activate</AtlasActionButton>}
                                            {campaign.status === 'active' && <AtlasActionButton icon={CheckCircle2} onClick={() => void handleCampaignStatus(campaign, 'completed')} disabled={!can('marketing.approve') || pendingAction !== null}>Complete</AtlasActionButton>}
                                        </div>
                                    </div>
                                </article>
                            );})}
                            {visibleCampaigns.length === 0 && <div className="lg:col-span-2"><AtlasEmptyState icon={Megaphone} title="No campaigns in this view" description="Change the status filter or create a planned campaign with a clear goal and launch kit." action={canCreateMarketing ? <AtlasActionButton icon={Plus} variant="primary" onClick={openNewCampaign}>Create campaign</AtlasActionButton> : undefined} /></div>}
                        </div>
                    </div>
                )
            }

            {/* LEADS CRM TAB (Acquisition) */}
            {
                activeTab === 'leads' && (
                    <div className="md:h-full flex flex-col min-h-0">
                        <AtlasSectionHeader title="Acquisition pipeline" description="Search, qualify, book, and convert every inquiry from one operational record." icon={Users} meta={<span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-bold text-teal-200">{filteredLeadsOnly.length} leads</span>} />
                        <AtlasToolbar className="mt-3" trailing={<><AtlasActionButton icon={Download} onClick={handleExport}>Export view</AtlasActionButton><AtlasActionButton icon={Plus} variant="primary" onClick={() => { setActionFeedback(null); setIsLeadModalOpen(true); }} disabled={!canCreateMarketing}>Add lead</AtlasActionButton></>}>
                            <div className="relative min-w-[190px] flex-1 sm:max-w-xs"><Search size={14} className="pointer-events-none absolute left-3 top-3 text-slate-500" /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search name, phone, source" className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400" /></div>
                            <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-2"><Filter size={13} className="text-slate-500" /><select className="min-w-[130px] bg-transparent text-sm text-white outline-none" value={selectedInterestFilter} onChange={event => setSelectedInterestFilter(event.target.value)}><option value="">All interests</option>{interestOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                            <div className="flex h-10 rounded-lg border border-white/10 bg-slate-950 p-1" aria-label="CRM view">
                                <button onClick={() => setViewMode('board')} className={`flex h-8 w-8 items-center justify-center rounded-md ${viewMode === 'board' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`} aria-label="Board view" title="Board view"><KanbanIcon size={14} /></button>
                                <button onClick={() => setViewMode('table')} className={`flex h-8 w-8 items-center justify-center rounded-md ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`} aria-label="Table view" title="Table view"><TableIcon size={14} /></button>
                            </div>
                        </AtlasToolbar>

                        {/* TABLE VIEW */}
                        {viewMode === 'table' ? (
                            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                                <div className="overflow-auto custom-scrollbar flex-1">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-950 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                                            <tr>
                                                <th className="p-4 border-b border-slate-800">Name</th>
                                                <th className="p-4 border-b border-slate-800">Parent</th>
                                                <th className="p-4 border-b border-slate-800">Contact</th>
                                                <th className="p-4 border-b border-slate-800">Status</th>
                                                <th className="p-4 border-b border-slate-800">Interests</th>
                                                <th className="p-4 border-b border-slate-800 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredLeadsOnly.map((contact, idx) => (
                                                <tr key={`${contact.id}-${idx}`} className="cursor-pointer transition-colors hover:bg-slate-800/50" onClick={() => { setProfileInitialAction(null); setSelectedLeadForProfile(contact); }}>
                                                    <td className="p-4 font-bold text-white">{contact.name}</td>
                                                    <td className="p-4 text-sm text-slate-300">{contact.parentName}</td>
                                                    <td className="p-4 text-sm text-slate-400">{contact.phone}</td>
                                                    <td className="p-4">
                                                        <select value={contact.status} onClick={event => event.stopPropagation()} onChange={event => void handleUpdateLeadStatus(contact.id, event.target.value as Lead['status'])} disabled={!canCreateMarketing} className="h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs font-bold capitalize text-slate-300 outline-none focus:border-teal-400 disabled:opacity-60">{LEAD_STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {contact.interests?.map((tag, i) => (
                                                                <span key={i} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); void handleDeleteItem('leads', contact.id); }} disabled={!canCreateMarketing} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30" aria-label={`Delete ${contact.name}`}><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredLeadsOnly.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-slate-500">No leads match the current search and interest filter.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* KANBAN VIEW */
                            <div className="flex-1 flex flex-col min-h-0 min-w-0 mt-4">
                                {/* Mobile Column Selector */}
                                <div className="mb-3 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-white/10 pb-2 md:hidden">
                                    {LEAD_STAGES.map(stage => (
                                        <button
                                            key={stage.id}
                                            onClick={() => setMobileKanbanColumn(stage.id)}
                                            className={`h-9 rounded-lg px-3 text-xs font-bold transition-colors ${mobileKanbanColumn === stage.id ? 'bg-teal-500 text-slate-950' : 'border border-white/10 bg-slate-900 text-slate-500'}`}
                                        >
                                            {stage.label} ({filteredLeadsOnly.filter(lead => lead.status === stage.id).length})
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-x-auto pb-4">
                                    <div className="flex h-full gap-3 md:min-w-[1960px]">
                                        {LEAD_STAGES.map(stage => (
                                            <div
                                                key={stage.id}
                                                className={`h-full min-w-[268px] flex-1 flex-col rounded-lg border border-white/10 bg-slate-950/50 ${
                                                    mobileKanbanColumn === stage.id ? 'flex' : 'hidden md:flex'
                                                    }`}
                                            >
                                                <div className={`flex justify-between border-b border-white/10 bg-slate-900 p-3 text-xs font-bold uppercase ${stage.tone}`}>
                                                    {stage.label}
                                                    <span className="bg-slate-950 px-2 rounded text-white">
                                                        {filteredLeadsOnly.filter(lead => lead.status === stage.id).length}
                                                    </span>
                                                </div>
                                                <div className="flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar">
                                                    {filteredLeadsOnly
                                                        .filter(lead => lead.status === stage.id)
                                                        .map(lead => (
                                                            <article
                                                                key={lead.id}
                                                                onClick={() => { setProfileInitialAction(null); setSelectedLeadForProfile(lead); }}
                                                                className="cursor-pointer rounded-lg border border-white/10 bg-slate-900 p-3 transition-colors hover:border-teal-400/30"
                                                            >
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h4 className="font-bold text-white text-sm">{lead.name}</h4>
                                                                    <button onClick={(e) => { e.stopPropagation(); void handleDeleteItem('leads', lead.id); }} disabled={!canCreateMarketing} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30" aria-label={`Delete ${lead.name}`}><Trash2 size={12} /></button>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                                                                    <Users size={10} /> {lead.parentName}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mb-3">
                                                                    <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{lead.source}</span>
                                                                    {lead.interests?.slice(0, 2).map((tag, i) => (
                                                                        <span key={i} className="text-[9px] bg-blue-950/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900/30">{tag}</span>
                                                                    ))}
                                                                </div>

                                                                {/* Quick Actions */}
                                                                <div className="flex gap-2 border-t border-slate-800 pt-2 mt-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedLeadForInvite(lead);
                                                                            setSelectedTemplateForInvite('');
                                                                            setIsInviteModalOpen(true);
                                                                        }}
                                                                        disabled={!canCreateMarketing || !cleanPhone(lead.phone)}
                                                                        className="flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    >
                                                                        <Send size={10} /> Invite
                                                                    </button>
                                                                    <button onClick={(event) => { event.stopPropagation(); setProfileInitialAction('call'); setSelectedLeadForProfile(lead); }} disabled={!canCreateMarketing} className="flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40"><Phone size={10} /> Log call</button>
                                                                </div>
                                                            </article>
                                                        ))}
                                                    {filteredLeadsOnly.filter(lead => lead.status === stage.id).length === 0 && <div className="px-3 py-8 text-center text-xs text-slate-600">No leads in this stage.</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* UPSELL GROWTH TAB (Retention) */}
            {
                activeTab === 'upsell' && (
                    <div className="flex min-h-0 flex-col md:h-full">
                        <AtlasSectionHeader title="Student growth" description="Build a reviewable follow-up audience from active enrollments without sending messages automatically." icon={TrendingUp} />
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <button type="button" onClick={() => { setGrowthWizardInitialType('holiday'); setIsGrowthWizardOpen(true); }} disabled={!canCreateMarketing} className="min-h-36 rounded-lg border border-amber-300/20 bg-slate-900 p-4 text-left transition-colors hover:border-amber-300/40 disabled:cursor-not-allowed disabled:opacity-50">
                                <Calendar size={20} className="text-amber-200" /><h3 className="mt-3 text-base font-bold text-white">Fill seasonal programs</h3><p className="mt-1 text-sm leading-6 text-slate-400">Choose a current program or all active students, then create a deduplicated holiday-camp follow-up pipeline.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-200">Build audience <ArrowRight size={13} /></span>
                            </button>
                            <button type="button" onClick={() => { setGrowthWizardInitialType('next_level'); setIsGrowthWizardOpen(true); }} disabled={!canCreateMarketing} className="min-h-36 rounded-lg border border-teal-400/20 bg-slate-900 p-4 text-left transition-colors hover:border-teal-400/40 disabled:cursor-not-allowed disabled:opacity-50">
                                <TrendingUp size={20} className="text-teal-300" /><h3 className="mt-3 text-base font-bold text-white">Move students forward</h3><p className="mt-1 text-sm leading-6 text-slate-400">Create next-program opportunities from a selected enrolled cohort and keep follow-up inside the CRM.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-teal-300">Build audience <ArrowRight size={13} /></span>
                            </button>
                        </div>
                        <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-400"><strong className="text-slate-200">Controlled handoff:</strong> growth campaigns create planned campaign and lead records only. They do not message families or purchase ads.</div>
                    </div>
                )
            }


            {/* Lead Profile Modal */}
            {
                selectedLeadForProfile && (
                    <LeadProfileModal
                        isOpen={!!selectedLeadForProfile}
                        onClose={() => { setSelectedLeadForProfile(null); setProfileInitialAction(null); }}
                        lead={leads.find(lead => lead.id === selectedLeadForProfile.id) || selectedLeadForProfile}
                        onEnroll={() => onEnrollLead && onEnrollLead(leads.find(lead => lead.id === selectedLeadForProfile.id) || selectedLeadForProfile)}
                        initialAction={profileInitialAction}
                    />
                )
            }

            {/* Create Post Modal */}
            <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title="Schedule Post">
                <form onSubmit={handleSavePost} className="space-y-4">
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">This creates an Edufy content task. Publishing remains manual in the selected social platform.</p>
                    {actionFeedback?.kind === 'error' && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{actionFeedback.message}</div>}
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Platform</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={postForm.platform} onChange={e => setPostForm({ ...postForm, platform: e.target.value as any })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option></select></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Content / Caption</label><textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24" value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Planned Date</label><input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={postForm.date} onChange={e => setPostForm({ ...postForm, date: e.target.value })} /></div>
                    <button type="submit" disabled={pendingAction === 'post-create'} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:opacity-50"><Plus size={16} /> {pendingAction === 'post-create' ? 'Creating...' : 'Create task'}</button>
                </form>
            </Modal>

            {/* Work Submission Modal */}
            <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Work for Review">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Please provide a link to the creative assets (Google Drive, Canva, Dropbox).</p>
                    {actionFeedback?.kind === 'error' && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{actionFeedback.message}</div>}
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Asset URL</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={submissionLink} onChange={e => setSubmissionLink(e.target.value)} placeholder="https://..." /></div>
                    <button onClick={handleSubmitWork} disabled={!submissionLink || pendingAction === 'post-submit'} className="h-10 w-full rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50">{pendingAction === 'post-submit' ? 'Submitting...' : 'Submit for review'}</button>
                </div>
            </Modal>

            {/* Admin Review Modal */}
            <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Review Content">
                <div className="space-y-4">
                    {actionFeedback?.kind === 'error' && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{actionFeedback.message}</div>}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <h4 className="text-sm font-bold text-white mb-2">Submission</h4>
                        <p className="text-xs text-slate-400 mb-2">{selectedPost?.content}</p>
                        {selectedPost?.attachments?.map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1"><LinkIcon size={12} /> {link}</a>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleApprovePost} disabled={pendingAction !== null} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-3 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:opacity-50"><CheckCircle2 size={16} /> {pendingAction === 'post-approve' ? 'Approving...' : 'Approve'}</button>
                        <button onClick={handleRejectPost} disabled={pendingAction !== null} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 text-sm font-bold text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"><AlertCircle size={16} /> {pendingAction === 'post-reject' ? 'Returning...' : 'Request revision'}</button>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Feedback (Required for rejection)</label>
                        <textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-20" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What needs to be changed?" />
                    </div>
                </div>
            </Modal>

            {/* INVITE MODAL */}
            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite to Workshop">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Choose an active workshop to prepare a personalized booking message for <strong>{selectedLeadForInvite?.name}</strong>.</p>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Workshop Template</label>
                        <select
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                            value={selectedTemplateForInvite}
                            onChange={e => setSelectedTemplateForInvite(e.target.value)}
                        >
                            <option value="">Select a workshop...</option>
                            {workshopTemplates.filter(t => t.isActive && t.organizationId === orgId && t.shareableSlug).map(t => (
                                <option key={t.id} value={t.id}>{t.title} ({t.duration} min)</option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-500">
                        Edufy will copy a message with the public booking link and open WhatsApp. It will not send the message automatically.
                    </div>
                    {workshopTemplates.filter(template => template.isActive && template.organizationId === orgId && template.shareableSlug).length === 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">No active workshop with a public booking link is available. Create or activate one in Workshops first.</div>}

                    <button
                        onClick={handleGenerateInvite}
                        disabled={!selectedTemplateForInvite || !canCreateMarketing || !cleanPhone(selectedLeadForInvite?.phone)}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send size={16} /> Prepare in WhatsApp
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isCampaignModalOpen} onClose={() => { setIsCampaignModalOpen(false); setEditingCampaignId(null); }} title={editingCampaignId ? 'Edit campaign' : 'New campaign'}>
                <form onSubmit={handleSaveCampaign} className="space-y-4">
                    {actionFeedback?.kind === 'error' && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{actionFeedback.message}</div>}
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Campaign Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Budget</label><input type="number" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={campaignForm.budget} onChange={e => setCampaignForm({ ...campaignForm, budget: Number(e.target.value) })} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Current Spend</label><input type="number" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={campaignForm.spend} onChange={e => setCampaignForm({ ...campaignForm, spend: Number(e.target.value) })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label><input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={campaignForm.startDate} onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">End Date</label><input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={campaignForm.endDate} onChange={e => setCampaignForm({ ...campaignForm, endDate: e.target.value })} /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Goals</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={campaignForm.goals} onChange={e => setCampaignForm({ ...campaignForm, goals: e.target.value })} placeholder="e.g. 20 Enrollments" /></div>
                    <button type="submit" disabled={pendingAction === 'campaign-create'} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:opacity-50">{editingCampaignId ? <Pencil size={16} /> : <Plus size={16} />} {pendingAction === 'campaign-create' ? 'Saving...' : editingCampaignId ? 'Save campaign' : 'Create campaign'}</button>
                </form>
            </Modal>

            <Modal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} title="Add New Lead">
                <form onSubmit={handleSaveLead} className="space-y-4">
                    {actionFeedback?.kind === 'error' && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{actionFeedback.message}</div>}
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Child Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Parent Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.parentName} onChange={e => setLeadForm({ ...leadForm, parentName: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Phone</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Source</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })}><option>Facebook</option><option>Instagram</option><option>Google</option><option>Walk-in</option><option>Referral</option></select></div>
                    </div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-400">Email (optional)</label><input type="email" className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-white" value={leadForm.email || ''} onChange={event => setLeadForm({ ...leadForm, email: event.target.value })} /></div>
                    <button type="submit" disabled={pendingAction === 'lead-create'} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:opacity-50"><Plus size={16} /> {pendingAction === 'lead-create' ? 'Adding...' : 'Add lead'}</button>
                </form>
            </Modal>


            <GrowthWizardModal isOpen={isGrowthWizardOpen} onClose={() => setIsGrowthWizardOpen(false)} initialCampaignType={growthWizardInitialType} />

            {/* Campaign Kit Modal */}
            {
                selectedCampaignForKit && (
                    <CampaignKitModal
                        isOpen={isKitModalOpen}
                        onClose={() => setIsKitModalOpen(false)}
                        campaign={campaigns.find(campaign => campaign.id === selectedCampaignForKit.id) || selectedCampaignForKit}
                    />
                )
            }
        </div >
    );
};
