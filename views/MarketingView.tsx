
import React, { useState } from 'react';
import { Megaphone, Calendar, DollarSign, Users, Plus, Send, Eye, Trash2, MoreHorizontal, Search, Filter, ArrowRight, ArrowLeft, CheckCircle2, Clock, LayoutGrid, List, Upload, Link as LinkIcon, AlertCircle, Check, X as XIcon, Download, Table as TableIcon, Kanban as KanbanIcon, TrendingUp, Briefcase, Phone } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { addDoc, collection, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MarketingPost, Campaign, Lead, Program } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';

import { LeadProfileModal } from './marketing/LeadProfileModal'; // New Modal
import { GrowthWizardModal } from './marketing/GrowthWizardModal'; // New Wizard
import { CampaignKitModal } from './marketing/CampaignKitModal'; // New Kit Modal


interface MarketingViewProps {
    onEnrollLead?: (lead: Lead) => void;
}

export const MarketingView: React.FC<MarketingViewProps> = ({ onEnrollLead }) => {
    const { marketingPosts, campaigns, leads, programs, students, bookings } = useAppContext(); // Get students for unified view
    const { userProfile, can } = useAuth();
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

    // --- LEADS STATE ---
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', parentName: '', phone: '', email: '', status: 'new', source: 'Facebook' });

    // --- LEADS FILTER & PROFILE STATE ---
    const [selectedInterestFilter, setSelectedInterestFilter] = useState('');
    const [selectedLeadForProfile, setSelectedLeadForProfile] = useState<Lead | null>(null);
    const [mobileKanbanColumn, setMobileKanbanColumn] = useState<Lead['status']>('new'); // Mobile View State

    // Auto-Status Listener (Sync bookings to lead status)
    React.useEffect(() => {
        if (!leads.length || !bookings.length) return;

        leads.forEach(lead => {
            if (['new', 'contacted', 'interested'].includes(lead.status)) {
                const leadPhone = lead.phone.replace(/\D/g, '');
                if (!leadPhone) return;

                const hasBooking = bookings.some(b => b.phoneNumber && b.phoneNumber.replace(/\D/g, '') === leadPhone);
                if (hasBooking) {
                    console.log(`Auto-updating lead ${lead.name} to workshop_booked`);
                    handleUpdateLeadStatus(lead.id, 'workshop_booked');
                }
            }
        });
    }, [bookings, leads]); // Safe dependency as status change removes from candidate set

    // --- INVITE STATE ---
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedLeadForInvite, setSelectedLeadForInvite] = useState<Lead | null>(null);
    const [selectedTemplateForInvite, setSelectedTemplateForInvite] = useState<string>('');
    const { workshopTemplates } = useAppContext();
    const [isGrowthWizardOpen, setIsGrowthWizardOpen] = useState(false);

    const handleGenerateInvite = () => {
        if (!selectedLeadForInvite || !selectedTemplateForInvite) return;
        const template = workshopTemplates.find(t => t.id === selectedTemplateForInvite);
        if (!template) return;

        const message = `Hello ${selectedLeadForInvite.parentName}! We noticed ${selectedLeadForInvite.name} is interested in tech. We'd love to invite them to our "${template.title}" workshop at Edufy MakerLab. \n\nBook a free demo spot here: https://makerlab.academy/book-demo?ref=${selectedLeadForInvite.id}&tmpl=${template.id}\n\nSee you there!`;

        // Copy to clipboard
        navigator.clipboard.writeText(message);

        // Open WhatsApp
        const waLink = `https://wa.me/${selectedLeadForInvite.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');

        setIsInviteModalOpen(false);
        // Optional: Update status to 'contacted' if it was 'new'
        if (selectedLeadForInvite.status === 'new') {
            handleUpdateLeadStatus(selectedLeadForInvite.id, 'contacted');
        }
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
    const filteredContacts = unifiedContacts.filter(c => {
        if (!selectedInterestFilter) return true;
        if (selectedInterestFilter === 'Active Student' && c.type === 'student') return true;
        return c.interests?.some(i => i === selectedInterestFilter) || false;
    });

    const filteredLeadsOnly = leads.filter(l => {
        if (!selectedInterestFilter) return true;
        return l.interests?.some(i => i === selectedInterestFilter) || false;
    });

    // --- EXPORT HANDLER ---
    const handleExport = () => {
        const dataToExport = filteredContacts.map(c => ({
            Name: c.name,
            Parent: c.parentName,
            Phone: c.phone,
            Type: c.type.toUpperCase(),
            Status: c.status,
            Source: c.source,
            Interests: c.interests?.join(', ') || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");
        XLSX.writeFile(wb, "Makerlab_Contacts_Export.xlsx");
    };

    // --- CONTENT HANDLERS ---
    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        await addDoc(collection(db, 'marketing_posts'), { ...postForm, createdAt: serverTimestamp(), attachments: [], feedback: '' });
        setIsPostModalOpen(false);
        setPostForm({ platform: 'instagram', content: '', date: new Date().toISOString().split('T')[0], status: 'planned' });
    };

    const handleMoveStatus = async (post: MarketingPost, direction: 'next' | 'prev') => {
        if (!db) return;
        const flow: MarketingPost['status'][] = ['planned', 'in_progress', 'review', 'approved', 'published'];
        const currentIndex = flow.indexOf(post.status);
        const nextStatus = flow[currentIndex + 1];
        const prevStatus = flow[currentIndex - 1];

        if (direction === 'next') {
            // Logic checks
            if (post.status === 'in_progress') {
                // Must attach work to move to review
                setSelectedPostId(post.id);
                setIsSubmitModalOpen(true);
                return;
            }
            if (post.status === 'review') {
                // Only users with approval permission can approve
                if (!can('marketing.approve')) {
                    alert("You do not have permission to approve content. Please wait for an administrator.");
                    return;
                }
                // Open Review Modal
                setSelectedPost(post);
                setFeedback('');
                setIsReviewModalOpen(true);
                return;
            }
            if (nextStatus) await updateDoc(doc(db, 'marketing_posts', post.id), { status: nextStatus });
        } else {
            if (prevStatus) await updateDoc(doc(db, 'marketing_posts', post.id), { status: prevStatus });
        }
    };

    const handleSubmitWork = async () => {
        if (!db || !selectedPostId || !submissionLink) return;
        await updateDoc(doc(db, 'marketing_posts', selectedPostId), {
            status: 'review',
            attachments: [submissionLink] // Simple array for now
        });
        setIsSubmitModalOpen(false);
        setSubmissionLink('');
        setSelectedPostId(null);
    };

    const handleApprovePost = async () => {
        if (!db || !selectedPost) return;
        await updateDoc(doc(db, 'marketing_posts', selectedPost.id), { status: 'approved' });
        setIsReviewModalOpen(false);
    };

    const handleRejectPost = async () => {
        if (!db || !selectedPost) return;
        if (!feedback) return alert("Please provide feedback for rejection.");
        await updateDoc(doc(db, 'marketing_posts', selectedPost.id), {
            status: 'in_progress',
            feedback: feedback
        });
        setIsReviewModalOpen(false);
    };

    // --- CAMPAIGN HANDLERS ---
    const handleSaveCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        await addDoc(collection(db, 'campaigns'), { ...campaignForm, createdAt: serverTimestamp() });
        setIsCampaignModalOpen(false);
        setCampaignForm({ name: '', budget: 0, spend: 0, status: 'planned', startDate: '', endDate: '', goals: '' });
    };

    // --- LEAD HANDLERS ---
    const handleSaveLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        await addDoc(collection(db, 'leads'), { ...leadForm, createdAt: serverTimestamp() });
        setIsLeadModalOpen(false);
        setLeadForm({ name: '', parentName: '', phone: '', email: '', status: 'new', source: 'Facebook' });
    };

    const handleUpdateLeadStatus = async (id: string, newStatus: Lead['status']) => {
        if (!db) return;
        await updateDoc(doc(db, 'leads', id), { status: newStatus });
    };

    const handleDeleteItem = async (collectionName: string, id: string) => {
        if (!db || !confirm('Are you sure?')) return;
        await deleteDoc(doc(db, collectionName, id));
    };

    // --- RENDER HELPERS ---
    const renderContentCard = (post: MarketingPost) => (
        <div key={post.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm hover:border-purple-500/50 transition-all group relative flex flex-col gap-2 mb-3">
            <div className="flex justify-between items-start">
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${post.platform === 'instagram' ? 'text-pink-400 border-pink-900/50 bg-pink-950/30' : post.platform === 'facebook' ? 'text-blue-400 border-blue-900/50 bg-blue-950/30' : 'text-slate-400 border-slate-800 bg-slate-950'}`}>{post.platform}</span>
                <button onClick={() => handleDeleteItem('marketing_posts', post.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
            </div>
            <p className="text-sm text-white font-medium line-clamp-3">{post.content}</p>
            <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                <span>{formatDate(post.date)}</span>
                {post.attachments && post.attachments.length > 0 && <span className="flex items-center gap-1 text-blue-400"><LinkIcon size={10} /> Attached</span>}
            </div>

            {post.feedback && post.status === 'in_progress' && (
                <div className="bg-red-950/20 border border-red-900/30 p-2 rounded text-xs text-red-300 mt-2">
                    <strong className="block text-[9px] uppercase opacity-70">Feedback:</strong> {post.feedback}
                </div>
            )}

            <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-2">
                {post.status !== 'planned' ? (
                    <button onClick={() => handleMoveStatus(post, 'prev')} className="p-1 hover:bg-slate-800 rounded text-slate-500"><ArrowLeft size={14} /></button>
                ) : <div></div>}

                {/* Status Specific Actions */}
                {post.status === 'in_progress' && (
                    <button onClick={() => handleMoveStatus(post, 'next')} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1">Submit <Upload size={10} /></button>
                )}
                {post.status === 'review' && (
                    can('marketing.approve') ? (
                        <button onClick={() => handleMoveStatus(post, 'next')} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center gap-1">Review <Eye size={10} /></button>
                    ) : (
                        <span className="text-xs text-amber-500 flex items-center gap-1 font-bold bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30"><Clock size={10} /> Waiting Approval</span>
                    )
                )}
                {post.status === 'approved' && (
                    <button onClick={() => handleMoveStatus(post, 'next')} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded flex items-center gap-1">Publish <Send size={10} /></button>
                )}
                {(post.status === 'planned') && (
                    <button onClick={() => handleMoveStatus(post, 'next')} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-blue-400"><ArrowRight size={14} /></button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-24 md:pb-8 md:h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Megaphone className="w-6 h-6 text-purple-500" /> Marketing Hub</h2>
                    <p className="text-slate-500 text-sm">Manage content, track campaigns, and nurture leads.</p>
                </div>
            </div>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto whitespace-nowrap min-w-0 max-w-full">
                <button onClick={() => setActiveTab('content')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'content' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><Calendar size={16} /> Content</button>
                <button onClick={() => setActiveTab('campaigns')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'campaigns' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><DollarSign size={16} /> Campaigns</button>
                <button onClick={() => setActiveTab('leads')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'leads' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><Users size={16} /> CRM</button>
                <button onClick={() => setActiveTab('upsell')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'upsell' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><TrendingUp size={16} /> Growth</button>
            </div>


            {/* CONTENT KANBAN TAB */}
            {
                activeTab === 'content' && (
                    <div className="md:h-full flex flex-col min-h-0">
                        <div className="flex justify-end mb-4 shrink-0">
                            <button onClick={() => setIsPostModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> Schedule Post</button>
                        </div>
                        <div className="flex-1 overflow-x-auto pb-4">
                            <div className="flex gap-4 min-w-[1000px] h-full">
                                {['planned', 'in_progress', 'review', 'approved'].map(status => (
                                    <div key={status} className="flex-1 flex flex-col min-w-[240px] bg-slate-950/50 rounded-xl border border-slate-800 h-full">
                                        <div className={`p-3 font-bold text-xs uppercase tracking-wider border-b border-slate-800 bg-slate-900 rounded-t-xl flex justify-between ${status === 'review' ? 'text-purple-400 border-purple-900/50' : status === 'approved' ? 'text-emerald-400 border-emerald-900/50' : 'text-slate-400'}`}>
                                            {status.replace('_', ' ')}
                                            <span className="bg-slate-950 px-2 rounded text-white">{marketingPosts.filter(p => (status === 'approved' ? (p.status === 'approved' || p.status === 'published') : p.status === status)).length}</span>
                                        </div>
                                        <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                            {marketingPosts
                                                .filter(p => (status === 'approved' ? (p.status === 'approved' || p.status === 'published') : p.status === status))
                                                .map(renderContentCard)}
                                            {marketingPosts.filter(p => p.status === status).length === 0 && <div className="text-center text-slate-600 text-xs italic py-4">No posts</div>}
                                        </div>
                                    </div>
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
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setIsCampaignModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> New Campaign</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:overflow-y-auto custom-scrollbar">
                            {campaigns.map(campaign => (
                                <div key={campaign.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-400">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                                                <span className={`text-xs px-2 py-1 rounded border font-bold uppercase ${campaign.status === 'active' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{campaign.status}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteItem('campaigns', campaign.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                            <span className="text-[10px] uppercase text-slate-500 font-bold">Budget</span>
                                            <div className="text-white font-mono">{formatCurrency(campaign.budget)}</div>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                            <span className="text-[10px] uppercase text-slate-500 font-bold">Spend</span>
                                            <div className="text-white font-mono">{formatCurrency(campaign.spend)}</div>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                            <span className="text-[10px] uppercase text-slate-500 font-bold">ROI</span>
                                            <div className="text-emerald-400 font-mono">--%</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-xs text-slate-500 mb-4">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                                        <span className="flex items-center gap-1"><DollarSign size={12} /> Budget: ${formatCurrency(campaign.budget)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                                        <button className="text-xs text-slate-400 hover:text-white">View Report</button>
                                        <button
                                            onClick={() => { setSelectedCampaignForKit(campaign); setIsKitModalOpen(true); }}
                                            className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <Briefcase size={12} /> Kit
                                        </button>
                                    </div>
                                    <div className="text-sm text-slate-400"><span className="font-bold text-slate-300">Goals:</span> {campaign.goals}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* LEADS CRM TAB (Acquisition) */}
            {
                activeTab === 'leads' && (
                    <div className="md:h-full flex flex-col min-h-0">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-white">Acquisition Pipeline</h3>
                            {/* View Toggle */}
                            <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                                <button onClick={() => setViewMode('board')} className={`p-1.5 rounded ${viewMode === 'board' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}><KanbanIcon size={14} /></button>
                                <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}><TableIcon size={14} /></button>
                            </div>

                            {/* Smart Filter */}
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                                <Filter size={12} className="text-slate-500" />
                                <select
                                    className="bg-transparent text-xs text-white border-none focus:ring-0 cursor-pointer outline-none min-w-[120px]"
                                    value={selectedInterestFilter}
                                    onChange={e => setSelectedInterestFilter(e.target.value)}
                                >
                                    <option value="">All Interests</option>
                                    {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    <option value="Holiday Camp">Holiday Camp</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {/* Quick Add Placeholder - to be enhanced */}
                            <button onClick={handleExport} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-700"><Download size={14} /> Export</button>
                            <button onClick={() => setIsLeadModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> Quick Add Lead</button>
                        </div>

                        {/* TABLE VIEW */}
                        {viewMode === 'table' ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 mt-4">
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
                                                <tr key={`${contact.id}-${idx}`} className="hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => setSelectedLeadForProfile(contact)}>
                                                    <td className="p-4 font-bold text-white">{contact.name}</td>
                                                    <td className="p-4 text-sm text-slate-300">{contact.parentName}</td>
                                                    <td className="p-4 text-sm text-slate-400">{contact.phone}</td>
                                                    <td className="p-4">
                                                        <span className={`text-xs px-2 py-1 rounded ${contact.status === 'converted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                                                            {contact.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {contact.interests?.map((tag, i) => (
                                                                <span key={i} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('leads', contact.id); }} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* KANBAN VIEW */
                            <div className="flex-1 flex flex-col min-h-0 min-w-0 mt-4">
                                {/* Mobile Column Selector */}
                                <div className="md:hidden flex overflow-x-auto gap-2 mb-4 pb-2 border-b border-slate-800 whitespace-nowrap">
                                    {['new', 'contacted', 'workshop_booked', 'demo_booked', 'converted'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setMobileKanbanColumn(status as any)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${mobileKanbanColumn === status ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                                        >
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-x-auto pb-4">
                                    <div className="flex gap-4 md:min-w-[1200px] h-full">
                                        {['new', 'contacted', 'workshop_booked', 'demo_booked', 'converted'].map(status => (
                                            <div
                                                key={status}
                                                className={`flex-1 flex-col min-w-[280px] bg-slate-950/50 rounded-xl border border-slate-800 h-full ${
                                                    // Mobile Logic: Show only selected column, or all on desktop
                                                    mobileKanbanColumn === status ? 'flex' : 'hidden md:flex'
                                                    }`}
                                            >
                                                <div className={`p-3 font-bold text-xs uppercase tracking-wider border-b border-slate-800 bg-slate-900 rounded-t-xl flex justify-between ${status === 'new' ? 'text-blue-400 border-blue-900/50' : status === 'converted' ? 'text-emerald-400 border-emerald-900/50' : 'text-slate-400'}`}>
                                                    {status.replace('_', ' ')}
                                                    <span className="bg-slate-950 px-2 rounded text-white">
                                                        {filteredLeadsOnly.filter(l => (status === 'demo_booked' ? (l.status === 'workshop_booked' || l.status === 'demo_booked') : l.status === status)).length}
                                                    </span>
                                                </div>
                                                <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                                    {filteredLeadsOnly
                                                        .filter(l => (status === 'demo_booked' ? (l.status === 'workshop_booked' || l.status === 'demo_booked') : l.status === status))
                                                        .map(lead => (
                                                            <div
                                                                key={lead.id}
                                                                onClick={() => setSelectedLeadForProfile(lead)}
                                                                className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-sm hover:border-blue-500/50 transition-all cursor-pointer group relative"
                                                            >
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h4 className="font-bold text-white text-sm">{lead.name}</h4>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('leads', lead.id); }} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
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
                                                                            setIsInviteModalOpen(true);
                                                                        }}
                                                                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1"
                                                                    >
                                                                        <Send size={10} /> Invite
                                                                    </button>
                                                                    <button className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1"><Phone size={10} /> Call</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {filteredLeadsOnly.filter(l => (status === 'demo_booked' ? (l.status === 'workshop_booked' || l.status === 'demo_booked') : l.status === status)).length === 0 && <div className="text-center text-slate-600 text-xs italic py-4">No leads</div>}
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
                    <div className="md:h-full flex flex-col min-h-0 flex-center text-center p-8">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl mx-auto">
                            <TrendingUp size={48} className="mx-auto text-purple-500 mb-4" />
                            <h3 className="text-2xl font-bold text-white mb-2">Student Growth Engine</h3>
                            <p className="text-slate-400 mb-6">Launch targeted campaigns to your active students. Promote holiday camps, advanced workshops, or new semester enrollments.</p>

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 cursor-pointer hover:border-purple-500 transition-colors">
                                    <h4 className="font-bold text-white mb-1">Holiday Camps</h4>
                                    <p className="text-xs text-slate-500">Target students by age or current program to upsell seasonal camps.</p>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 cursor-pointer hover:border-purple-500 transition-colors">
                                    <h4 className="font-bold text-white mb-1">Next Level Unlock</h4>
                                    <p className="text-xs text-slate-500">Auto-target students finishing 'Level 1' programs.</p>
                                </div>
                            </div>



                            <button onClick={() => setIsGrowthWizardOpen(true)} className="mt-6 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto"><Plus size={18} /> Create Growth Campaign</button>
                        </div>
                    </div>
                )
            }


            {/* Lead Profile Modal */}
            {
                selectedLeadForProfile && (
                    <LeadProfileModal
                        isOpen={!!selectedLeadForProfile}
                        onClose={() => setSelectedLeadForProfile(null)}
                        lead={selectedLeadForProfile}
                        onEnroll={() => onEnrollLead && onEnrollLead(selectedLeadForProfile)}
                    />
                )
            }

            {/* Create Post Modal */}
            <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title="Schedule Post">
                <form onSubmit={handleSavePost} className="space-y-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Platform</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={postForm.platform} onChange={e => setPostForm({ ...postForm, platform: e.target.value as any })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option></select></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Content / Caption</label><textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24" value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Planned Date</label><input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={postForm.date} onChange={e => setPostForm({ ...postForm, date: e.target.value })} /></div>
                    <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold">Create Task</button>
                </form>
            </Modal>

            {/* Work Submission Modal */}
            <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Work for Review">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Please provide a link to the creative assets (Google Drive, Canva, Dropbox).</p>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Asset URL</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={submissionLink} onChange={e => setSubmissionLink(e.target.value)} placeholder="https://..." /></div>
                    <button onClick={handleSubmitWork} disabled={!submissionLink} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed">Submit for Review</button>
                </div>
            </Modal>

            {/* Admin Review Modal */}
            <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Review Content">
                <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <h4 className="text-sm font-bold text-white mb-2">Submission</h4>
                        <p className="text-xs text-slate-400 mb-2">{selectedPost?.content}</p>
                        {selectedPost?.attachments?.map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1"><LinkIcon size={12} /> {link}</a>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleApprovePost} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Approve & Publish</button>
                        <button onClick={() => { if (!feedback) alert("Enter feedback first"); else handleRejectPost(); }} className="py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center justify-center gap-2"><AlertCircle size={16} /> Reject</button>
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
                    <p className="text-sm text-slate-400">Select a workshop template to generate a personalized invitation for <strong>{selectedLeadForInvite?.name}</strong>.</p>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Workshop Template</label>
                        <select
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                            value={selectedTemplateForInvite}
                            onChange={e => setSelectedTemplateForInvite(e.target.value)}
                        >
                            <option value="">Select a workshop...</option>
                            {workshopTemplates.filter(t => t.isActive).map(t => (
                                <option key={t.id} value={t.id}>{t.title} ({t.duration} min)</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-500 italic">
                        "Hello {selectedLeadForInvite?.parentName}! We noticed {selectedLeadForInvite?.name} is interested in tech..."
                    </div>

                    <button
                        onClick={handleGenerateInvite}
                        disabled={!selectedTemplateForInvite}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Send size={16} /> Generate Link & Open WhatsApp
                    </button>
                </div>
            </Modal>

            {/* Other Modals (Campaign, Lead) - same as before... */}
            <Modal isOpen={isCampaignModalOpen} onClose={() => setIsCampaignModalOpen(false)} title="New Campaign">
                <form onSubmit={handleSaveCampaign} className="space-y-4">
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
                    <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold">Create Campaign</button>
                </form>
            </Modal>

            <Modal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} title="Add New Lead">
                <form onSubmit={handleSaveLead} className="space-y-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Child Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Parent Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.parentName} onChange={e => setLeadForm({ ...leadForm, parentName: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Phone</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Source</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })}><option>Facebook</option><option>Instagram</option><option>Google</option><option>Walk-in</option><option>Referral</option></select></div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold">Add Lead</button>
                </form>
            </Modal>


            <GrowthWizardModal isOpen={isGrowthWizardOpen} onClose={() => setIsGrowthWizardOpen(false)} />

            {/* Campaign Kit Modal */}
            {
                selectedCampaignForKit && (
                    <CampaignKitModal
                        isOpen={isKitModalOpen}
                        onClose={() => setIsKitModalOpen(false)}
                        campaign={selectedCampaignForKit}
                    />
                )
            }
        </div >
    );
};
