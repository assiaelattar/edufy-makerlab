
import React, { useState } from 'react';
import { ArcadeContentManager } from '../../sparkquest/components/admin/ArcadeContentManager';
import { ArcadeGameManager } from '../../sparkquest/components/admin/ArcadeGameManager';
import { Monitor, Video, Gamepad2, Library, Sparkles } from 'lucide-react';
import { AtlasCommandHeader, AtlasSignalCard, AtlasToolbar } from '../../components/atlas/AtlasSurface';

export const ArcadeManagerView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LIBRARY' | 'ARCADE'>('LIBRARY');

    return (
        <div className="space-y-5 pb-10 animate-in fade-in duration-200">
            <AtlasCommandHeader
                eyebrow="SparkQuest operations"
                title="Arcade library"
                description="Curate the videos and playable challenges available to learners in Arcade mode."
                icon={Monitor}
                badges={<span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">Student-facing</span>}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Content lane" value="Video" detail="Learning media library" icon={Video} tone="teal" onClick={() => setActiveTab('LIBRARY')} />
                <AtlasSignalCard label="Play lane" value="Games" detail="Interactive arcade catalog" icon={Gamepad2} tone="amber" onClick={() => setActiveTab('ARCADE')} />
                <AtlasSignalCard label="Current surface" value={activeTab === 'LIBRARY' ? 'Library' : 'Arcade'} detail="Ready to manage" icon={Library} tone="blue" />
                <AtlasSignalCard label="Experience" value="SparkQuest" detail="Connected learner mode" icon={Sparkles} tone="slate" />
            </div>

            <AtlasToolbar>
                <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/70 p-1 sm:w-auto">
                    <button
                        onClick={() => setActiveTab('LIBRARY')}
                        className={`flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition-colors ${activeTab === 'LIBRARY' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
                    >
                        <Video size={18} /> Video Library
                    </button>
                    <button
                        onClick={() => setActiveTab('ARCADE')}
                        className={`flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition-colors ${activeTab === 'ARCADE' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
                    >
                        <Gamepad2 size={18} /> Arcade Games
                    </button>
                </div>
            </AtlasToolbar>

            <section className="min-h-[500px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/55 p-3 sm:p-5">
                    {activeTab === 'LIBRARY' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="rounded-lg border border-white/10 bg-slate-900 p-3 sm:p-5">
                                <ArcadeContentManager />
                            </div>
                        </div>
                    )}
                    {activeTab === 'ARCADE' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="rounded-lg border border-white/10 bg-slate-900 p-3 sm:p-5">
                                <ArcadeGameManager />
                            </div>
                        </div>
                    )}
            </section>
        </div>
    );
};
