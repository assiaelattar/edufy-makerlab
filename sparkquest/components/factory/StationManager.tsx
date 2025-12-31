
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Station } from '../../types';
import { Settings, Zap, Edit2, Check, X } from 'lucide-react';

// MOCK_GRADES removed - now using real data from useFactoryData


export const StationManager: React.FC = () => {
    const { stations, actions, availableGrades } = useFactoryData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Default form state for new stations
    const defaultForm: Partial<Station> = {
        label: '',
        description: '',
        color: 'blue',
        activeForGradeIds: []
    };

    const [form, setForm] = useState<Partial<Station>>(defaultForm);

    const handleEdit = (station: Station) => {
        setEditingId(station.id);
        setIsCreating(false);
        // Convert timestamps to Date objects for the form if needed, 
        // but for input type="date" we need YYYY-MM-DD strings
        setForm({ ...station });
    };

    const handleCreate = () => {
        setEditingId(null);
        setIsCreating(true);
        setForm(defaultForm);
    };

    const handleSave = async () => {
        if (editingId) {
            await actions.updateStation(editingId, form);
            setEditingId(null);
        } else if (isCreating) {
            if (!form.label) return alert("Station Name is required");
            await actions.addStation(form as any);
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this station?")) {
            await actions.deleteStation(id);
            if (editingId === id) setEditingId(null);
        }
    };

    const toggleGrade = async (station: Station, gradeId: string) => {
        await actions.toggleStationActivation(station.id, gradeId, stations);
    };

    // Helper to format date for input
    const formatDateForInput = (dateVal: any) => {
        if (!dateVal) return '';
        const d = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
        return d.toISOString().split('T')[0];
    };

    // Helper to parser date from input
    const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
        if (!val) {
            setForm(prev => ({ ...prev, [field]: null }));
            return;
        }
        // Create date at noon to avoid timezone issues shifting the day
        const d = new Date(val);
        d.setHours(12, 0, 0, 0);
        setForm(prev => ({ ...prev, [field]: d }));
    };

    const renderEditor = () => (
        <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
                <h4 className="text-xl font-black text-slate-800">
                    {isCreating ? 'Create New Station' : 'Edit Station'}
                </h4>
                <button
                    onClick={() => { setEditingId(null); setIsCreating(false); }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-4">
                {/* Name & Color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Station Name</label>
                        <input
                            className="w-full text-lg font-bold text-slate-800 border-b-2 border-indigo-100 focus:border-indigo-500 outline-none py-2 transition-colors"
                            value={form.label || ''}
                            onChange={e => setForm({ ...form, label: e.target.value })}
                            placeholder="e.g. Robotics Lab"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Color Theme</label>
                        <select
                            className="w-full p-2 bg-slate-50 rounded-lg font-bold text-slate-600 border border-slate-200 outline-none"
                            value={form.color || 'blue'}
                            onChange={e => setForm({ ...form, color: e.target.value })}
                        >
                            <option value="blue">Blue</option>
                            <option value="indigo">Indigo</option>
                            <option value="purple">Purple</option>
                            <option value="emerald">Emerald</option>
                            <option value="amber">Amber</option>
                            <option value="rose">Rose</option>
                            <option value="slate">Slate</option>
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                    <textarea
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none resize-none h-24 font-medium text-slate-600 transition-colors"
                        value={form.description || ''}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="What will students learn here?"
                    />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-600 outline-none"
                            value={formatDateForInput(form.startDate)}
                            onChange={e => handleDateChange('startDate', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-600 outline-none"
                            value={formatDateForInput(form.endDate)}
                            onChange={e => handleDateChange('endDate', e.target.value)}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {!isCreating && (
                        <button
                            onClick={() => editingId && handleDelete(editingId)}
                            className="px-4 py-2 text-red-400 hover:text-red-600 font-bold text-sm mr-auto"
                        >
                            Delete Station
                        </button>
                    )}
                    <button
                        onClick={() => { setEditingId(null); setIsCreating(false); }}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
                    >
                        {isCreating ? 'Create Station' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Station Command</h3>
                    <p className="text-slate-500 font-medium">Activate learning zones for your classes.</p>
                </div>
                {!isCreating && !editingId && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:-translate-y-1 transition-all"
                    >
                        <Zap size={18} className="text-yellow-400" fill="currentColor" />
                        New Station
                    </button>
                )}
            </div>

            {isCreating && <div className="max-w-2xl mx-auto">{renderEditor()}</div>}

            <div className="grid grid-cols-1 gap-4">
                {stations.map(station => {
                    if (editingId === station.id) {
                        return <div key={station.id} className="max-w-2xl mx-auto w-full">{renderEditor()}</div>;
                    }

                    return (
                        <div key={station.id} className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-slate-300 transition-all group">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 bg-${station.color || 'blue'}-50`}>
                                        ⚡
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                            {station.label}
                                            {(station.startDate || station.endDate) && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">
                                                    Scheduled
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-sm text-slate-500">{station.description || 'No description provided.'}</p>
                                    </div>
                                </div>

                                <button onClick={() => handleEdit(station)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <Edit2 size={20} />
                                </button>
                            </div>

                            {/* Grade Toggles */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active for Grades</label>
                                    {station.startDate && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                            {new Date(station.startDate.seconds * 1000).toLocaleDateString()} - {station.endDate ? new Date(station.endDate.seconds * 1000).toLocaleDateString() : 'Forever'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {availableGrades.length === 0 && <span className="text-xs text-slate-400 italic">No grades found in active programs.</span>}

                                    {availableGrades.map(grade => {
                                        const isActive = station.activeForGradeIds?.includes(grade.id);
                                        return (
                                            <button
                                                key={grade.id}
                                                onClick={() => toggleGrade(station, grade.id)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all ${isActive
                                                    ? `bg-${station.color || 'blue'}-500 text-white border-${station.color || 'blue'}-500 shadow-md`
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                    }`}
                                            >
                                                {grade.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {availableGrades.length > 0 && (
                                    <p className="mt-3 text-[10px] text-slate-400 max-w-lg">
                                        Note: A grade can only have <strong>one</strong> station active at a time. activating this station will automatically deactivate others for that grade.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
