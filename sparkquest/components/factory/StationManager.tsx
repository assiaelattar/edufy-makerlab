
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Station } from '../../types';
import { Settings, Zap, Edit2, Check, X } from 'lucide-react';

// Common grades map (normally fetched, we'll mock for toggling logic as detailed grade data needs context)
const MOCK_GRADES = [
    { id: 'g1', name: 'Grade 1' },
    { id: 'g2', name: 'Grade 2' },
    { id: 'g3', name: 'Grade 3' },
    { id: 'g4', name: 'Grade 4' },
    { id: 'g5', name: 'Grade 5' },
];

export const StationManager: React.FC = () => {
    const { stations, actions } = useFactoryData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Station>>({});

    const handleEdit = (station: Station) => {
        setEditingId(station.id);
        setForm({ ...station });
    };

    const handleSave = async () => {
        if (!editingId) return;
        await actions.updateStation(editingId, form);
        setEditingId(null);
    };

    const toggleGrade = async (station: Station, gradeId: string) => {
        await actions.toggleStationActivation(station.id, gradeId, stations);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Station Command</h3>
                    <p className="text-slate-500 font-medium">Activate learning zones for your classes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {stations.map(station => (
                    <div key={station.id} className={`bg-white border-2 rounded-2xl p-6 transition-all ${editingId === station.id ? 'border-indigo-500 shadow-xl scale-[1.02]' : 'border-slate-100 hover:border-slate-300'}`}>
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 bg-${station.color}-50`}>
                                    {/* Icon */} ⚡
                                </div>
                                {editingId === station.id ? (
                                    <div className="flex flex-col gap-2">
                                        <input
                                            className="text-lg font-black text-slate-800 border-b border-indigo-500 outline-none"
                                            value={form.label}
                                            onChange={e => setForm({ ...form, label: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                className="text-xs font-bold p-1 bg-slate-100 rounded"
                                                value={form.color}
                                                onChange={e => setForm({ ...form, color: e.target.value })}
                                            >
                                                <option value="blue">Blue</option>
                                                <option value="indigo">Indigo</option>
                                                <option value="slate">Slate</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800">{station.label}</h4>
                                        <p className="text-sm text-slate-500">{station.description}</p>
                                    </div>
                                )}
                            </div>

                            {editingId === station.id ? (
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                                    <button onClick={handleSave} className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-500/30"><Check size={20} /></button>
                                </div>
                            ) : (
                                <button onClick={() => handleEdit(station)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                    <Edit2 size={20} />
                                </button>
                            )}
                        </div>

                        {/* Grade Toggles */}
                        <div className="bg-slate-50 rounded-xl p-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Active for Grades</label>
                            <div className="flex flex-wrap gap-2">
                                {MOCK_GRADES.map(grade => {
                                    const isActive = station.activeForGradeIds?.includes(grade.id);
                                    return (
                                        <button
                                            key={grade.id}
                                            onClick={() => toggleGrade(station, grade.id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all ${isActive
                                                ? `bg-${station.color}-500 text-white border-${station.color}-500 shadow-md`
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                }`}
                                        >
                                            {grade.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
