
import React, { useState } from 'react';
import { ArcadeContentManager } from '../../sparkquest/components/admin/ArcadeContentManager';
import { ArcadeGameManager } from '../../sparkquest/components/admin/ArcadeGameManager';
import { Monitor, Video, Gamepad2 } from 'lucide-react';

export const ArcadeManagerView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LIBRARY' | 'ARCADE'>('LIBRARY');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Arcade Command Center</h1>
                    <p className="text-slate-500">Manage educational content and games for SparkQuest Arcade Mode.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('LIBRARY')}
                        className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${activeTab === 'LIBRARY' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-slate-400 border-transparent hover:text-indigo-500 hover:bg-slate-50'}`}
                    >
                        <Video size={18} /> Video Library
                    </button>
                    <button
                        onClick={() => setActiveTab('ARCADE')}
                        className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${activeTab === 'ARCADE' ? 'text-purple-600 border-purple-600 bg-purple-50/50' : 'text-slate-400 border-transparent hover:text-purple-500 hover:bg-slate-50'}`}
                    >
                        <Gamepad2 size={18} /> Arcade Games
                    </button>
                </div>

                <div className="p-6 bg-slate-50/50 min-h-[500px]">
                    {activeTab === 'LIBRARY' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl">
                                <ArcadeContentManager />
                            </div>
                        </div>
                    )}
                    {activeTab === 'ARCADE' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl">
                                <ArcadeGameManager />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
