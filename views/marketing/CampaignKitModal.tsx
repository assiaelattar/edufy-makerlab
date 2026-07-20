import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    Briefcase,
    CheckCircle2,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    Link as LinkIcon,
    ShieldCheck,
    Plus,
    Trash2,
    X
} from 'lucide-react';
import { arrayRemove, arrayUnion, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { Campaign, CampaignAsset } from '../../types';

interface CampaignKitModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign;
}

const REQUIRED_ASSETS = [
    { name: 'Landing Page', type: 'link' },
    { name: 'Ad Creative (Square)', type: 'image' },
    { name: 'Ad Creative (Story)', type: 'image' },
    { name: 'Ad Copy', type: 'document' }
];

export const CampaignKitModal: React.FC<CampaignKitModalProps> = ({ isOpen, onClose, campaign }) => {
    const { confirm } = useConfirm();
    const { currentOrganization, can } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [newAsset, setNewAsset] = useState<Partial<CampaignAsset>>({ name: '', type: 'link', url: '', status: 'draft' });
    const [previewAsset, setPreviewAsset] = useState<CampaignAsset | null>(null);
    const [pendingAssetId, setPendingAssetId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
    const canCreate = can('marketing.create');
    const canApprove = can('marketing.approve');
    const isCurrentTenant = Boolean(currentOrganization?.id && campaign.organizationId === currentOrganization.id);

    const missingAssets = useMemo(() => {
        const existingNames = campaign.assets?.map(asset => asset.name.toLowerCase()) || [];
        return REQUIRED_ASSETS.filter(required => !existingNames.some(name => name.includes(required.name.toLowerCase())));
    }, [campaign.assets]);
    const approvedRequiredCount = useMemo(() => REQUIRED_ASSETS.filter(required =>
        campaign.assets?.some(asset => asset.name.toLowerCase().includes(required.name.toLowerCase()) && asset.status === 'approved')
    ).length, [campaign.assets]);

    const handleAddAsset = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !campaign.id || isSaving) return;
        if (!canCreate || !isCurrentTenant) {
            setFeedback({ kind: 'error', message: 'You do not have permission to change this campaign kit.' });
            return;
        }
        const assetName = newAsset.name?.trim() || '';
        const assetUrl = newAsset.url?.trim() || '';
        try {
            const parsedUrl = new URL(assetUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported protocol');
        } catch {
            setFeedback({ kind: 'error', message: 'Enter a complete http or https URL for this asset.' });
            return;
        }
        const duplicate = campaign.assets?.some(asset => asset.name.trim().toLowerCase() === assetName.toLowerCase() || asset.url === assetUrl);
        if (duplicate) {
            setFeedback({ kind: 'error', message: 'An asset with this name or URL is already in the campaign kit.' });
            return;
        }

        const asset: CampaignAsset = {
            id: crypto.randomUUID(),
            name: assetName,
            type: newAsset.type as any,
            url: assetUrl,
            status: 'ready'
        };

        setIsSaving(true);
        setFeedback(null);
        try {
            await updateDoc(doc(db, 'campaigns', campaign.id), { assets: arrayUnion(asset) });
            setIsAdding(false);
            setNewAsset({ name: '', type: 'link', url: '', status: 'draft' });
            setFeedback({ kind: 'success', message: `${asset.name} was added to the campaign kit.` });
        } catch (error) {
            console.error('Error adding asset:', error);
            setFeedback({ kind: 'error', message: 'The asset could not be added. Check the link and try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAsset = async (asset: CampaignAsset) => {
        if (asset.status === 'approved' && !canApprove) {
            setFeedback({ kind: 'error', message: 'An approver must return this asset to ready before it can be removed.' });
            return;
        }
        const accepted = await confirm({
            title: 'Remove campaign asset?',
            message: `${asset.name} will be removed from this campaign kit. The original file or link will not be deleted.`,
            confirmText: 'Remove asset',
            cancelText: 'Keep asset',
            variant: 'danger'
        });
        if (!accepted || !db) return;
        if (!canCreate || !isCurrentTenant) {
            setFeedback({ kind: 'error', message: 'You do not have permission to remove this asset.' });
            return;
        }

        setPendingAssetId(asset.id);
        setFeedback(null);
        try {
            await updateDoc(doc(db, 'campaigns', campaign.id), { assets: arrayRemove(asset) });
            if (previewAsset?.id === asset.id) setPreviewAsset(null);
            setFeedback({ kind: 'success', message: `${asset.name} was removed from the campaign kit.` });
        } catch (error) {
            console.error('Error removing asset:', error);
            setFeedback({ kind: 'error', message: 'The asset could not be removed. Try again.' });
        } finally {
            setPendingAssetId(null);
        }
    };

    const handleAssetApproval = async (asset: CampaignAsset, status: CampaignAsset['status']) => {
        if (!db || !canApprove || !isCurrentTenant || pendingAssetId) return;
        setPendingAssetId(asset.id);
        setFeedback(null);
        try {
            const campaignRef = doc(db, 'campaigns', campaign.id);
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(campaignRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== currentOrganization?.id) throw new Error('campaign-unavailable');
                const assets = (snapshot.data().assets || []) as CampaignAsset[];
                if (!assets.some(item => item.id === asset.id)) throw new Error('asset-unavailable');
                transaction.update(campaignRef, { assets: assets.map(item => item.id === asset.id ? { ...item, status } : item) });
            });
            setPreviewAsset({ ...asset, status });
            setFeedback({ kind: 'success', message: `${asset.name} marked ${status}.` });
        } catch (error) {
            console.error('Error updating asset approval:', error);
            setFeedback({ kind: 'error', message: 'The asset approval state could not be updated. Try again.' });
        } finally {
            setPendingAssetId(null);
        }
    };

    const handleQuickAddTemplate = (templateName: string, type: string) => {
        setNewAsset({ name: templateName, type: type as any, url: '', status: 'draft' });
        setIsAdding(true);
        setFeedback(null);
    };

    const assetIcon = (type: string) => {
        if (type === 'image') return <ImageIcon size={16} />;
        if (type === 'video' || type === 'document') return <FileText size={16} />;
        return <LinkIcon size={16} />;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Campaign kit: ${campaign.name}`}>
            <div className="flex h-[min(76vh,640px)] flex-col gap-3 text-slate-900">
                <header className="shrink-0 rounded-lg border border-slate-800 bg-[#08111F] px-4 py-3 text-white">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-400/30 bg-[#0F1B2D] text-teal-300"><Briefcase size={18} /></div>
                            <div><p className="text-[10px] font-bold uppercase text-teal-300">Asset workspace</p><h2 className="text-base font-bold">Prepare every launch asset</h2></div>
                        </div>
                        <div className="flex items-center gap-2">
                            {missingAssets.length === 0 && approvedRequiredCount === REQUIRED_ASSETS.length ? (
                                <span className="flex items-center gap-1 rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-xs font-bold text-teal-200"><CheckCircle2 size={13} /> Launch ready</span>
                            ) : (
                                <span className="flex items-center gap-1 rounded-full border border-[#F2C766]/30 bg-[#F2C766]/10 px-2 py-1 text-xs font-bold text-[#F2C766]"><AlertTriangle size={13} /> {missingAssets.length ? `${missingAssets.length} missing` : `${approvedRequiredCount}/${REQUIRED_ASSETS.length} approved`}</span>
                            )}
                            <button type="button" onClick={() => { setIsAdding(value => !value); setFeedback(null); }} disabled={!canCreate || !isCurrentTenant} title={!canCreate ? 'Marketing create access is required' : undefined} className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isAdding ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-[#14B8A6] text-[#08111F] hover:bg-teal-300'}`}>
                                {isAdding ? <X size={16} /> : <Plus size={16} />} {isAdding ? 'Cancel' : 'Add asset'}
                            </button>
                        </div>
                    </div>
                </header>

                {feedback && <div className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'success' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">{feedback.message}</div>}
                {(!canCreate || !isCurrentTenant) && <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">View-only campaign kit. Asset preparation requires Marketing create access in this organization.</div>}

                {isAdding && (
                    <form onSubmit={handleAddAsset} className="shrink-0 rounded-lg border border-slate-800 bg-[#0F1B2D] p-3 text-white">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div><label htmlFor="asset-name" className="mb-1 block text-xs font-bold text-slate-300">Asset name</label><input id="asset-name" className="h-10 w-full rounded-lg border border-slate-600 bg-[#08111F] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#14B8A6]" placeholder="Landing Page V1" value={newAsset.name} onChange={event => setNewAsset({ ...newAsset, name: event.target.value })} required /></div>
                            <div><label htmlFor="asset-type" className="mb-1 block text-xs font-bold text-slate-300">Type</label><select id="asset-type" className="h-10 w-full rounded-lg border border-slate-600 bg-[#08111F] px-3 text-sm text-white outline-none focus:border-[#14B8A6]" value={newAsset.type} onChange={event => setNewAsset({ ...newAsset, type: event.target.value as any })}><option value="link">Link / URL</option><option value="image">Image (URL)</option><option value="video">Video (URL)</option><option value="document">Document (Google Doc/PDF)</option></select></div>
                            <div className="sm:col-span-2"><label htmlFor="asset-url" className="mb-1 block text-xs font-bold text-slate-300">URL or link</label><input id="asset-url" type="url" className="h-10 w-full rounded-lg border border-slate-600 bg-[#08111F] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#14B8A6]" placeholder="https://..." value={newAsset.url} onChange={event => setNewAsset({ ...newAsset, url: event.target.value })} required /></div>
                        </div>
                        <div className="mt-3 flex justify-end"><button type="submit" disabled={isSaving} className="h-10 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save asset'}</button></div>
                    </form>
                )}

                <div className="relative flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
                    <aside className={`w-full min-h-0 overflow-y-auto pr-1 custom-scrollbar md:w-[38%] ${previewAsset ? 'hidden md:block' : 'block'}`} aria-label="Campaign assets">
                        {missingAssets.length > 0 && (
                            <section className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <h3 className="text-xs font-bold text-amber-900">Required for launch</h3>
                                <div className="mt-2 space-y-1.5">
                                    {missingAssets.map(required => (
                                        <button key={required.name} type="button" onClick={() => handleQuickAddTemplate(required.name, required.type)} disabled={!canCreate || !isCurrentTenant} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
                                            <span className="truncate">{required.name}</span><Plus size={14} className="shrink-0 text-amber-700" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="space-y-1.5">
                            {campaign.assets?.map(asset => (
                                <div key={asset.id} role="button" tabIndex={0} onClick={() => setPreviewAsset(asset)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setPreviewAsset(asset); }} className={`group flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 outline-none transition-colors focus:ring-2 focus:ring-teal-200 ${previewAsset?.id === asset.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'}`}>
                                    <div className="flex min-w-0 items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{assetIcon(asset.type)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{asset.name}</p><p className={`text-[10px] font-bold uppercase ${asset.status === 'approved' ? 'text-teal-700' : 'text-slate-400'}`}>{asset.type} / {asset.status}</p></div></div>
                                    <button type="button" onClick={event => { event.stopPropagation(); void handleDeleteAsset(asset); }} disabled={!canCreate || !isCurrentTenant || pendingAssetId === asset.id} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label={`Remove ${asset.name}`} title={`Remove ${asset.name}`}><Trash2 size={15} /></button>
                                </div>
                            ))}
                            {(!campaign.assets || campaign.assets.length === 0) && (
                                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center"><Briefcase size={24} className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-700">No assets added yet</p><p className="mt-1 text-xs text-slate-500">Start with one of the required launch assets above.</p></div>
                            )}
                        </div>
                    </aside>

                    <section className={`min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-800 bg-[#08111F] ${previewAsset ? 'absolute inset-0 z-10 flex md:static' : 'hidden md:flex'} flex-col`} aria-label="Asset preview">
                        {!previewAsset ? (
                            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center text-slate-500"><Briefcase size={30} /><p className="mt-2 text-sm font-bold text-slate-300">Select an asset to preview</p><p className="mt-1 text-xs">Links that block embedded previews can still be opened directly.</p></div>
                        ) : (
                            <>
                                <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#0F1B2D] px-3 py-1.5">
                                    <div className="flex min-w-0 items-center gap-2"><button type="button" onClick={() => setPreviewAsset(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden" aria-label="Back to asset list"><ArrowLeft size={17} /></button><h3 className="truncate text-sm font-bold text-white">{previewAsset.name}</h3></div>
                                    <div className="flex items-center gap-1">
                                        {canApprove && previewAsset.status !== 'approved' && <button type="button" onClick={() => void handleAssetApproval(previewAsset, 'approved')} disabled={pendingAssetId === previewAsset.id} className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-amber-200 hover:bg-slate-800 disabled:opacity-40"><ShieldCheck size={13} /> Approve</button>}
                                        {canApprove && previewAsset.status === 'approved' && <button type="button" onClick={() => void handleAssetApproval(previewAsset, 'ready')} disabled={pendingAssetId === previewAsset.id} className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40">Return to ready</button>}
                                        <a href={previewAsset.url} target="_blank" rel="noreferrer" className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-teal-300 hover:bg-slate-800">Open <ExternalLink size={13} /></a>
                                    </div>
                                </div>
                                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
                                    {previewAsset.type === 'image' ? <img src={previewAsset.url} alt={previewAsset.name} className="max-h-full max-w-full object-contain" /> : previewAsset.type === 'video' ? <iframe src={previewAsset.url} className="h-full w-full" allowFullScreen title="Video preview" /> : <iframe src={previewAsset.url} className="h-full w-full bg-white" title="Link preview" />}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </Modal>
    );
};
