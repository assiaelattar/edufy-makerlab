import React, { useState, useEffect } from 'react';
import { Hammer, Plus, ExternalLink, Trash2, Search, Cpu, Box, CheckSquare, RotateCcw, Database } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Modal } from '../Modal';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ToolLink, Asset } from '../../types';

// Mock Data for seeding (Copied from ToolkitView)
const MOCK_TOOLS: any[] = []; // Omitted for brevity, can import or empty
const MOCK_ASSETS: any[] = [];

export const FactoryToolbox = () => {
    // Get students from Factory Data
    const { students } = useFactoryData();
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

    // Fetch Tools & Assets
    useEffect(() => {
        if (!db) return;
        const unsubTools = onSnapshot(collection(db, 'tool_links'), (snap) => {
            setToolLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolLink)));
        });
        const unsubAssets = onSnapshot(collection(db, 'assets'), (snap) => {
            setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        });
        return () => {
            unsubTools();
            unsubAssets();
        };
    }, []);

    // --- HANDLERS ---

    const handleSaveTool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        await addDoc(collection(db, 'tool_links'), {
            ...toolForm,
            createdAt: serverTimestamp()
        });
        setIsToolModalOpen(false);
        setToolForm({ title: '', url: '', category: 'other', description: '' });
    };

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        await addDoc(collection(db, 'assets'), {
            ...assetForm,
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
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const filteredAssets = assets.filter(a => {
        const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter;
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || (a.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-8 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-[#2D2B6B] flex items-center gap-3"><Hammer className="text-orange-500" size={28} /> Maker Toolbox</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage digital resources and hardware inventory.</p>
                </div>
                <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button onClick={() => { setActiveTab('digital'); setCategoryFilter('All'); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'digital' ? 'bg-white text-[#2D2B6B] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <ExternalLink size={16} /> Resources
                    </button>
                    <button onClick={() => { setActiveTab('inventory'); setCategoryFilter('All'); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white text-[#2D2B6B] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Box size={16} /> Hardware
                    </button>
                </div>
            </div>

            {/* Sub-Header & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
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

                <button onClick={() => activeTab === 'digital' ? setIsToolModalOpen(true) : setIsAssetModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white px-6 py-3 rounded-xl transition-colors shadow-lg shadow-pink-500/30 text-sm font-bold w-full sm:w-auto justify-center">
                    <Plus size={18} /> Add {activeTab === 'digital' ? 'Link' : 'Item'}
                </button>

                <button
                    onClick={() => {
                        if (!confirm("SECURE DEVICE?\n\nThis will wipe all saved emails ('Remember Me') and sign you out.\nUse this when leaving a public device.")) return;
                        localStorage.removeItem('sparkquest_remember_email');
                        localStorage.removeItem('sparkquest_session_start');
                        // Reload to clear auth state via firebase
                        window.location.reload();
                    }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors border border-slate-700 text-sm font-bold w-full sm:w-auto justify-center"
                    title="Clear saved data & Logout"
                >
                    <Database size={18} /> <span className="hidden sm:inline">Secure</span>
                </button>
            </div>

            {/* --- VIEW: DIGITAL RESOURCES --- */}
            {activeTab === 'digital' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
                    {filteredTools.map(tool => (
                        <div key={tool.id} className="bg-white border border-slate-100 hover:border-[#2D2B6B]/30 hover:shadow-xl hover:-translate-y-1 p-6 rounded-[2rem] transition-all group relative flex flex-col shadow-sm">
                            <button onClick={() => handleDeleteTool(tool.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
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
                    {filteredTools.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="mb-6 font-medium">No tools found matching your criteria.</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- VIEW: HARDWARE INVENTORY --- */}
            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
                    {filteredAssets.map(asset => {
                        const isAvailable = asset.status === 'available';
                        return (
                            <div key={asset.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl hover:-translate-y-1 transition-all group relative shadow-sm">
                                <button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
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
                    {filteredAssets.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                            <Box size={48} className="mb-4 opacity-20" />
                            <p className="mb-6 font-medium">No inventory items found.</p>
                        </div>
                    )}
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
