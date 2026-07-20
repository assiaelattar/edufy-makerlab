import React, { useState } from 'react';
import { Camera, Clock3, Database, Radio, ScanFace, ShieldCheck, StopCircle, UserCheck, Users } from 'lucide-react';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../../components/atlas/AtlasSurface';

export const FaceAttendanceView = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Installed app / Attendance"
                title="FaceID Attendance"
                description="Run a clear, supervised check-in session with recognition status and recent scans kept together."
                icon={ScanFace}
                badges={
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${isSessionActive ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isSessionActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {isSessionActive ? 'Session open' : 'Session idle'}
                    </span>
                }
                actions={
                    <AtlasActionButton
                        variant={isSessionActive ? 'danger' : 'primary'}
                        icon={isSessionActive ? StopCircle : Camera}
                        onClick={() => setIsSessionActive(active => !active)}
                    >
                        {isSessionActive ? 'End session' : 'Start session'}
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Session" value={isSessionActive ? 'Open' : 'Idle'} detail={isSessionActive ? 'Recognition service required' : 'Camera is not recording'} icon={Radio} tone={isSessionActive ? 'emerald' : 'slate'} />
                <AtlasSignalCard label="Recognized" value="0" detail="This session" icon={UserCheck} tone="teal" />
                <AtlasSignalCard label="Face profiles" value="—" detail="Connect enrollment data" icon={Users} tone="blue" />
                <AtlasSignalCard label="Security" value="Local" detail="Supervised check-in" icon={ShieldCheck} tone="amber" />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.75fr)_340px]">
                <section className="flex min-h-[480px] flex-col rounded-lg border border-white/10 bg-slate-950/65 p-3 sm:p-4">
                    <AtlasSectionHeader
                        title="Recognition camera"
                        description={isSessionActive ? 'Keep one person centered within the guide for a clear check-in.' : 'Start a session when the classroom entrance is ready.'}
                        icon={Camera}
                        meta={<span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">CAM 01</span>}
                    />

                    <div className="relative mt-4 aspect-video min-h-[320px] overflow-hidden rounded-lg border border-white/10 bg-black">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.035)_1px,transparent_1px)] bg-[size:32px_32px]" />
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="relative flex h-56 w-44 items-center justify-center rounded-[42%] border border-teal-300/30">
                                <span className="absolute -left-px -top-px h-8 w-8 border-l-2 border-t-2 border-teal-300" />
                                <span className="absolute -right-px -top-px h-8 w-8 border-r-2 border-t-2 border-teal-300" />
                                <span className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-teal-300" />
                                <span className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-teal-300" />
                                <ScanFace size={54} className={isSessionActive ? 'text-teal-300' : 'text-slate-700'} />
                            </div>
                        </div>

                        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
                            <span className={`h-2 w-2 rounded-full ${isSessionActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            {isSessionActive ? 'SESSION OPEN' : 'CAMERA STANDBY'}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/70 px-3 py-2 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
                            <span>{isSessionActive ? 'Recognition service not connected' : 'No video captured'}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 size={12} /> Session 00:00</span>
                        </div>
                    </div>
                </section>

                <aside className="flex min-h-[480px] flex-col rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader
                        title="Recent scans"
                        description="Recognized arrivals appear here in order."
                        icon={UserCheck}
                        meta={<span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">0</span>}
                    />

                    <div className="flex flex-1 items-center justify-center py-6">
                        <AtlasEmptyState
                            title={isSessionActive ? 'Ready for the first arrival' : 'No session running'}
                            description={isSessionActive ? 'A recognized student will appear here with a check-in time.' : 'Start a session to begin recording attendance scans.'}
                            icon={isSessionActive ? ScanFace : Clock3}
                        />
                    </div>

                    <AtlasActionButton icon={Database} className="w-full" disabled title="Connect attendance profiles to enable this action">
                        Manage face profiles
                    </AtlasActionButton>
                </aside>
            </div>
        </div>
    );
};
