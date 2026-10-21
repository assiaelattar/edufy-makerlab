import React, { useState } from 'react';
import { Camera, Clock3, Database, Radio, ScanFace, ShieldCheck, StopCircle, UserCheck, Users } from 'lucide-react';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../../components/atlas/AtlasSurface';
import '../../components/education-ui/education-system-v1.css';
import './face-attendance-v1.css';

export const FaceAttendanceView = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);

    return (
        <div className={`flex h-full flex-col gap-5 pb-24 md:pb-8 ${new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy' ? 'edu-v1 edu-marketplace-app-v1 edu-face-attendance' : ''}`} data-edu-system={new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy' ? '1' : undefined}>
            <AtlasCommandHeader
                eyebrow="Installed app / Attendance"
                title="FaceID Attendance"
                description="Preview a supervised check-in workspace. Camera and recognition must be connected before scans can be recorded."
                icon={ScanFace}
                badges={
                    <span className="edu-face-attendance__session-badge" data-active={isSessionActive}>
                        <span aria-hidden="true" />
                        {isSessionActive ? 'Preview open' : 'Preview idle'}
                    </span>
                }
                actions={
                    <AtlasActionButton
                        variant={isSessionActive ? 'danger' : 'primary'}
                        icon={isSessionActive ? StopCircle : Camera}
                        onClick={() => setIsSessionActive(active => !active)}
                    >
                        {isSessionActive ? 'End preview' : 'Start preview'}
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Preview" value={isSessionActive ? 'Open' : 'Idle'} detail={isSessionActive ? 'Recognition service required' : 'Camera is not recording'} icon={Radio} tone={isSessionActive ? 'emerald' : 'slate'} />
                <AtlasSignalCard label="Recognized" value="0" detail="This session" icon={UserCheck} tone="teal" />
                <AtlasSignalCard label="Face profiles" value="—" detail="Connect enrollment data" icon={Users} tone="blue" />
                <AtlasSignalCard label="Security" value="Local" detail="Supervised check-in" icon={ShieldCheck} tone="amber" />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.75fr)_340px]">
                <section className="edu-face-attendance__camera-panel flex min-h-[480px] flex-col p-3 sm:p-4">
                    <AtlasSectionHeader
                        title="Recognition camera"
                        description={isSessionActive ? 'Camera and recognition are not connected in this preview.' : 'Open the preview to inspect this supervised check-in workspace.'}
                        icon={Camera}
                        meta={<span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">CAM 01</span>}
                    />

                    <div className="edu-face-attendance__device relative mt-4 aspect-video min-h-[320px] overflow-hidden">
                        <div className="edu-face-attendance__device-grid absolute inset-0" />
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="edu-face-attendance__guide relative flex h-56 w-44 items-center justify-center rounded-[42%]">
                                <span className="absolute -left-px -top-px h-8 w-8 border-l-2 border-t-2" />
                                <span className="absolute -right-px -top-px h-8 w-8 border-r-2 border-t-2" />
                                <span className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2" />
                                <span className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2" />
                                <ScanFace size={54} data-active={isSessionActive} />
                            </div>
                        </div>

                        <div className="edu-face-attendance__device-label absolute left-3 top-3 flex items-center gap-2 px-3 py-2">
                            <span className="edu-face-attendance__device-dot" data-active={isSessionActive} />
                            {isSessionActive ? 'PREVIEW OPEN' : 'CAMERA STANDBY'}
                        </div>
                        <div className="edu-face-attendance__device-label absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 px-3 py-2">
                            <span>{isSessionActive ? 'Recognition service not connected' : 'No video captured'}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 size={12} /> Session 00:00</span>
                        </div>
                    </div>
                </section>

                <aside className="edu-face-attendance__scans flex min-h-[480px] flex-col p-4">
                    <AtlasSectionHeader
                        title="Recent scans"
                        description="Recognized arrivals appear here in order."
                        icon={UserCheck}
                        meta={<span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">0</span>}
                    />

                    <div className="flex flex-1 items-center justify-center py-6">
                        <AtlasEmptyState
                            title={isSessionActive ? 'Waiting for a connection' : 'No scan session connected'}
                            description={isSessionActive ? 'Connect a recognition service before recording arrivals.' : 'This preview does not record attendance scans.'}
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
