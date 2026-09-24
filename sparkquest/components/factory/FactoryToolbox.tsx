import React, { useDeferredValue, useState, useEffect } from 'react';
import { Hammer, Plus, ExternalLink, Trash2, Search, Cpu, Box, CheckSquare, RotateCcw } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Modal } from '../Modal';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ToolLink, Asset } from '../../types';
import { FactoryEmptyState, FactoryPageHeader, FactoryToolbar, factoryButton } from './FactoryPage';
import { useAuth } from '../../context/AuthContext';

// Mock Data for seeding (Copied from ToolkitView)
const MOCK_TOOLS: any[] = []; // Omitted for brevity, can import or empty
const MOCK_ASSETS: any[] = [];

export const FactoryToolbox = () => {
    // Get students from Factory Data
    const { students } = useFactoryData();
    const { userProfile } = useAuth();
    const organizationId = userProfile?.organizationId;
    // Local state for tools and assets
    const [toolLinks, setToolLinks] = useState<ToolLink[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);

    const [activeTab, setActiveTab] = useState<'digital' | 'inventory'>('digital');
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);
    const [toolForm, setToolForm] = useState<Partial<ToolLink>>({ title: '', url: '', category: 'other', description: '' });

    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [assetForm, setAssetForm] = useState<Partial<Asset>>({ name: '', category: 'robotics', status: 'available', serialNumber: '', notes: '' });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [assignStudentId, setAssignStudentId] = useState('');

    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // Fetch Tools & Assets
    useEffect(() => {
        if (!db || !organizationId) return;
        const unsubTools = onSnapshot(query(collection(db, 'tool_links'), where('organizationId', '==', organizationId)), (snap) => {
            setToolLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolLink)));
        });
        const unsubAssets = onSnapshot(query(collection(db, 'assets'), where('organizationId', '==', organizationId)), (snap) => {
            setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        });
        return () => {
            unsubTools();
            unsubAssets();
        };
    }, [organizationId]);

    // --- HANDLERS ---

    const handleSaveTool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !organizationId) return;
        await addDoc(collection(db, 'tool_links'), {
            ...toolForm,
            organizationId,
            createdAt: serverTimestamp()
        });
        setIsToolModalOpen(false);
        setToolForm({ title: '', url: '', category: 'other', description: '' });
    };

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !organizationId) return;
        await addDoc(collection(db, 'assets'), {
            ...assetForm,
            organizationId,
            createdAt: serverTimestamp()
        });
        setIsAssetModalOpen(false);
        setAssetForm({ name: '', category: 'robotics', status: 'available', serialNumber: '', notes: '' });
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !selectedAsset || !assignStudentId) return;

        const student = students.find(s => s.id === assignStudentId);

        await updateDoc(doc(db, 'assets', selectedAsset.id), {
            status: 'in_use',
            assignedTo: assignStudentId,
            assignedToName: student?.name || 'Unknown'
        });
        setIsCheckoutModalOpen(false);
        setSelectedAsset(null);
        setAssignStudentId('');
    };

    const handleCheckIn = async (asset: Asset) => {
        if (!db) return;
        if (!confirm(`Return ${asset.name} to inventory?`)) return;

        await updateDoc(doc(db, 'assets', asset.id), {
            status: 'available',
            assignedTo: null,
            assignedToName: null
        });
    };

    const handleDeleteTool = async (id: string) => {
        if (!db || !confirm("Delete this tool link?")) return;
        await deleteDoc(doc(db, 'tool_links', id));
    };

    const handleDeleteAsset = async (id: string) => {
        if (!db || !confirm("Delete this asset from inventory?")) return;
        await deleteDoc(doc(db, 'assets', id));
    };

    const toolCategories = ['All', 'robotics', 'coding', 'design', 'engineering', 'multimedia', 'other'];
    const assetCategories = ['All', 'robotics', 'computer', 'tools', 'other'];

    const filteredTools = toolLinks.filter(t => {
        const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
        const matchesSearch = t.title.toLowerCase().includes(deferredSearchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(deferredSearchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const filteredAssets = assets.filter(a => {
        const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter;
        const matchesSearch = a.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) || (a.serialNumber || '').toLowerCase().includes(deferredSearchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex h-full flex-col space-y-6">
            <FactoryPageHeader
                icon={Hammer}
                eyebrow="Studio resources"
                title="Tools and hardware inventory"
                description="Keep approved digital resources and checkout-ready equipment in one operational view."
                actions={<div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                    <button onClick={() => { setActiveTab('digital'); setCategoryFilter('All'); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'digital' ? 'bg-white text-[#2D2B6B] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <ExternalLink size={16} /> Resources
                    </button>
                    <button onClick={() => { setActiveTab('inventory'); setCategoryFilter('All'); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white text-[#2D2B6B] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Box size={16} /> Hardware
                    </button>
                </div>}
            />

            {/* Sub-Header & Actions */}
            <FactoryToolbar className="sm:flex-wrap xl:flex-nowrap">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={activeTab === 'digital' ? "Search resources..." : "Search inventory (Name, Serial)..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-[#2D2B6B] focus:border-[#2D2B6B] focus:ring-1 focus:ring-[#2D2B6B] outline-none shadow-sm placeholder:text-slate-400"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
                    {(activeTab === 'digital' ? toolCategories : assetCategories).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${categoryFilter === cat ? 'bg-[#2D2B6B] text-white border-[#2D2B6B] shadow-md shadow-indigo-900/20' : 'bg-white text-slate-500 border-slate-200 hover:border-[#2D2B6B] hover:text-[#2D2B6B]'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <button onClick={() => activeTab === 'digital' ? setIsToolModalOpen(true) : setIsAssetModalOpen(true)} className={factoryButton.primary}>
                    <Plus size={18} /> Add {activeTab === 'digital' ? 'Link' : 'Item'}
                </button>
            </FactoryToolbar>

            {/* --- VIEW: DIGITAL RESOURCES --- */}
            {activeTab === 'digital' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTools.map(tool => (
                        <div key={tool.id} className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                            <button onClick={() => handleDeleteTool(tool.id)} className="absolute right-2 top-2 grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${tool.title}`}><Trash2 size={16} /></button>
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${tool.category === 'robotics' ? 'bg-cyan-50 text-cyan-600 border-2 border-cyan-100' :
                                    tool.category === 'coding' ? 'bg-pink-50 text-pink-600 border-2 border-pink-100' :
                                        tool.category === 'design' ? 'bg-orange-50 text-orange-600 border-2 border-orange-100' :
                                            tool.category === 'engineering' ? 'bg-yellow-50 text-yellow-600 border-2 border-yellow-100' :
                                                'bg-slate-50 text-slate-500 border-2 border-slate-100'
                                    }`}>
                                    <span className="text-lg font-black">{tool.title.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#2D2B6B] text-base line-clamp-1">{tool.title}</h3>
                                    <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full border ${tool.category === 'robotics' ? 'bg-cyan-50 text-cyan-600 border-cyan-200' :
                                        tool.category === 'coding' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                                            tool.category === 'design' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                tool.category === 'engineering' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                    'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>{tool.category}</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-3 leading-relaxed">{tool.description || 'No description provided.'}</p>
                            <a href={tool.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 hover:bg-[#2D2B6B] hover:text-white border border-slate-100 hover:border-[#2D2B6B] rounded-xl text-xs font-bold text-[#2D2B6B] transition-all group-hover:shadow-lg group-hover:shadow-indigo-900/10">
                                Open Resource <ExternalLink size={14} />
                            </a>
                        </div>
                    ))}
                    {filteredTools.length === 0 && <FactoryEmptyState icon={Search} title="No resources match" description="Change the search or category, or add an approved link to this toolbox." />}
                </div>
            )}

            {/* --- VIEW: HARDWARE INVENTORY --- */}
            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredAssets.map(asset => {
                        const isAvailable = asset.status === 'available';
                        return (
                            <div key={asset.id} className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                                <button onClick={() => handleDeleteAsset(asset.id)} className="absolute right-2 top-2 grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${asset.name}`}><Trash2 size={16} /></button>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[#2D2B6B]"><Cpu size={24} /></div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold border ${isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {asset.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[#2D2B6B] text-lg mb-1">{asset.name}</h3>
                                <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">SN: {asset.serialNumber || 'N/A'}</p>

                                {asset.status === 'in_use' && (
                                    <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-[#2D2B6B] shadow-sm">
                                            {asset.assignedToName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned To</div>
                                            <div className="text-xs text-[#2D2B6B] font-bold truncate max-w-[120px]">{asset.assignedToName}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-slate-50">
                                    {isAvailable ? (
                                        <button onClick={() => { setSelectedAsset(asset); setIsCheckoutModalOpen(true); }} className="w-full py-3 bg-[#2D2B6B] hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/10">
                                            <CheckSquare size={16} /> Check Out
                                        </button>
                                    ) : (
                                        <button onClick={() => handleCheckIn(asset)} className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                            <RotateCcw size={16} /> Return Item
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {filteredAssets.length === 0 && <FactoryEmptyState icon={Box} title="No inventory items match" description="Change the search or category, or add the first hardware item." />}
                </div>
            )}

            {/* Tool Modal, Asset Modal, Checkout Modal - Same as ToolkitView */}
            <Modal isOpen={isToolModalOpen} onClose={() => setIsToolModalOpen(false)} title="Add Resource">
                <form onSubmit={handleSaveTool} className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Tool Name</label><input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={toolForm.title} onChange={e => setToolForm({ ...toolForm, title: e.target.value })} placeholder="e.g. Arduino IDE" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">URL Link</label><input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={toolForm.url} onChange={e => setToolForm({ ...toolForm, url: e.target.value })} placeholder="https://..." /></div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none capitalize" value={toolForm.category} onChange={e => setToolForm({ ...toolForm, category: e.target.value as any })}>
                            {toolCategories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Description</label><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none h-24" value={toolForm.description} onChange={e => setToolForm({ ...toolForm, description: e.target.value })} /></div>
                    <button type="submit" className="w-full py-3 bg-[#2D2B6B] hover:bg-indigo-800 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20">Save to Toolkit</button>
                </form>
            </Modal>

            <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Add Hardware Asset">
                <form onSubmit={handleSaveAsset} className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Item Name</label><input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="e.g. Lego Spike Prime #5" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none capitalize" value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value as any })}>
                                {assetCategories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Serial / ID</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={assetForm.serialNumber} onChange={e => setAssetForm({ ...assetForm, serialNumber: e.target.value })} placeholder="Optional" /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Notes</label><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none h-24" value={assetForm.notes} onChange={e => setAssetForm({ ...assetForm, notes: e.target.value })} /></div>
                    <button type="submit" className="w-full py-3 bg-[#2D2B6B] hover:bg-indigo-800 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20">Add to Inventory</button>
                </form>
            </Modal>

            <Modal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} title={`Check Out: ${selectedAsset?.name}`}>
                <form onSubmit={handleCheckout} className="space-y-4">
                    <p className="text-sm text-slate-500">Assign this item to a student. They are responsible for returning it.</p>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Select Student</label>
                        <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)}>
                            <option value="">-- Choose Student --</option>
                            {students.filter((s: any) => s.role === 'student').sort((a: any, b: any) => a.name.localeCompare(b.name)).map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" disabled={!assignStudentId} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg shadow-blue-900/20">Confirm Assignment</button>
                </form>
            </Modal>
        </div>
    );
};
