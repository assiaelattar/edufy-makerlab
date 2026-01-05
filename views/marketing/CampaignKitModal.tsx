import React, { useState, useMemo } from 'react';
import { Briefcase, Plus, Trash2, ExternalLink, Image as ImageIcon, Link as LinkIcon, FileText, X, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Campaign, CampaignAsset } from '../../types';
import { updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface CampaignKitModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign;
}

const REQUIRED_ASSETS = [
    { name: 'Landing Page', type: 'link' },
    { name: 'Ad Creative (Square)', type: 'image' },
    { name: 'Ad Creative (Story)', type: 'image' },
    { name: 'Ad Copy', type: 'document' }, // Or text/link
];

export const CampaignKitModal: React.FC<CampaignKitModalProps> = ({ isOpen, onClose, campaign }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newAsset, setNewAsset] = useState<Partial<CampaignAsset>>({
        name: '',
        type: 'link',
        url: '',
        status: 'draft'
    });

    // State for previewing assets inside the modal
    const [previewAsset, setPreviewAsset] = useState<CampaignAsset | null>(null);

    // Calculate missing assets based on name matching (loose check)
    const missingAssets = useMemo(() => {
        const existingNames = campaign.assets?.map(a => a.name.toLowerCase()) || [];
        return REQUIRED_ASSETS.filter(req => !existingNames.some(n => n.includes(req.name.toLowerCase())));
    }, [campaign.assets]);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !campaign.id) return;

        const asset: CampaignAsset = {
            id: crypto.randomUUID(),
            name: newAsset.name || 'Untitled Asset',
            type: newAsset.type as any,
            url: newAsset.url || '',
            status: 'ready'
        };

        try {
            await updateDoc(doc(db, 'campaigns', campaign.id), {
                assets: arrayUnion(asset)
            });
            setIsAdding(false);
            setNewAsset({ name: '', type: 'link', url: '', status: 'draft' });
        } catch (error) {
            console.error("Error adding asset:", error);
            alert("Failed to add asset.");
        }
    };

    const handleDeleteAsset = async (asset: CampaignAsset) => {
        if (!confirm('Remove this asset?')) return;
        if (!db) return;

        await updateDoc(doc(db, 'campaigns', campaign.id), {
            assets: arrayRemove(asset)
        });
        if (previewAsset?.id === asset.id) setPreviewAsset(null);
    };

    const handleQuickAddTemplate = (templateName: string, type: string) => {
        setNewAsset({ name: templateName, type: type as any, url: '', status: 'draft' });
        setIsAdding(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Campaign Kit: ${campaign.name}`}>
            <div className="flex flex-col h-[80vh] md:h-[600px]">
                {/* Header / Stats */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 flex justify-between items-center shrink-0">
                    <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={18} className="text-purple-600" /> Assets Manager</h4>
                        <div className="flex items-center gap-2 mt-1">
                            {missingAssets.length === 0 ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> Kit Complete</span>
                            ) : (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} /> {missingAssets.length} Required Assets Missing</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${isAdding ? 'bg-slate-200 text-slate-600' : 'bg-purple-600 text-white hover:bg-purple-500'}`}
                    >
                        {isAdding ? <X size={16} /> : <Plus size={16} />} <span className="hidden md:inline">{isAdding ? 'Cancel' : 'Add Asset'}</span>
                    </button>
                </div>

                {/* Add Form */}
                {isAdding && (
                    <form onSubmit={handleAddAsset} className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4 shrink-0 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Asset Name</label>
                                <input
                                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white text-sm"
                                    placeholder="e.g. Landing Page V1"
                                    value={newAsset.name}
                                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                                <select
                                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white text-sm"
                                    value={newAsset.type}
                                    onChange={e => setNewAsset({ ...newAsset, type: e.target.value as any })}
                                >
                                    <option value="link">Link / URL</option>
                                    <option value="image">Image (URL)</option>
                                    <option value="video">Video (URL)</option>
                                    <option value="document">Document (Google Doc/PDF)</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-slate-400 mb-1">URL / Link</label>
                            <input
                                className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white text-sm"
                                placeholder="https://..."
                                value={newAsset.url}
                                onChange={e => setNewAsset({ ...newAsset, url: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-sm">Save Asset</button>
                    </form>
                )}

                {/* Main Content Area: Split View (List | Preview) */}
                <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 relative">

                    {/* List - Hidden on mobile if preview is active */}
                    <div className={`w-full md:w-1/3 overflow-y-auto custom-scrollbar space-y-2 pr-2 ${previewAsset ? 'hidden md:block' : 'block'}`}>
                        {/* Missing Assets Template */}
                        {missingAssets.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
                                <h5 className="text-xs font-bold text-amber-800 mb-2">Required for Launch:</h5>
                                <div className="space-y-2">
                                    {missingAssets.map((req, idx) => (
                                        <div key={idx} onClick={() => handleQuickAddTemplate(req.name, req.type)} className="flex items-center justify-between bg-white p-2 rounded border border-amber-200 cursor-pointer hover:border-amber-400 transition-colors group">
                                            <span className="text-xs text-slate-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> {req.name}</span>
                                            <Plus size={12} className="text-amber-500 opacity-0 group-hover:opacity-100" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!campaign.assets || campaign.assets.length === 0) && missingAssets.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm italic">No assets.</div>
                        )}

                        {campaign.assets?.map((asset, idx) => (
                            <div
                                key={idx}
                                onClick={() => setPreviewAsset(asset)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all group ${previewAsset === asset ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-slate-200 hover:border-purple-300'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`p-2 rounded-lg ${asset.type === 'image' ? 'bg-blue-100 text-blue-600' : asset.type === 'video' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {asset.type === 'image' ? <ImageIcon size={14} /> :
                                                asset.type === 'video' ? <FileText size={14} /> :
                                                    <LinkIcon size={14} />}
                                        </div>
                                        <div className="truncate">
                                            <div className="font-bold text-sm text-slate-800 truncate">{asset.name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{asset.type}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset); }}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Preview Pane - Full screen on mobile if active */}
                    <div className={`flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative flex flex-col ${previewAsset ? 'flex h-full absolute inset-0 md:static z-10' : 'hidden md:flex'}`}>
                        {!previewAsset ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                <Briefcase size={48} className="mb-4 opacity-20" />
                                <p>Select an asset to preview</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <button onClick={() => setPreviewAsset(null)} className="md:hidden text-slate-400"><ArrowLeft size={18} /></button>
                                        <h5 className="font-bold text-white text-sm truncate">{previewAsset.name}</h5>
                                    </div>
                                    <a href={previewAsset.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0">
                                        Open Original <ExternalLink size={10} />
                                    </a>
                                </div>
                                <div className="flex-1 overflow-hidden bg-black flex items-center justify-center relative">
                                    {previewAsset.type === 'image' ? (
                                        <img src={previewAsset.url} alt={previewAsset.name} className="max-w-full max-h-full object-contain" />
                                    ) : previewAsset.type === 'video' ? (
                                        <iframe src={previewAsset.url} className="w-full h-full" frameBorder="0" allowFullScreen title="Video Preview" />
                                    ) : (
                                        // Generic Embed / Iframe for links
                                        // Note: Some sites block iframing (X-Frame-Options). 
                                        // For MVP we try iframe, if fails user uses "Open Original"
                                        <iframe src={previewAsset.url} className="w-full h-full bg-white" title="Link Preview" />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </Modal>
    );
};
