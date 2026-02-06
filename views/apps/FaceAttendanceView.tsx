
import React from 'react';
import { Camera, Users, ShieldCheck, ScanFace } from 'lucide-react';

export const FaceAttendanceView = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <ScanFace size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">FaceID Attendance</h1>
                    <p className="text-slate-400">Automate classroom entry with secure face recognition.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 bg-black rounded-xl overflow-hidden relative aspect-video border border-slate-800 shadow-2xl">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
                                <Camera size={32} className="text-indigo-400" />
                            </div>
                            <p className="text-indigo-300 font-mono text-sm">Camera Feed Inactive</p>
                        </div>
                    </div>
                    {/* Overlay UI */}
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-green-400 border border-green-900/50 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live System
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Recent Scans</h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                    <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="h-3 w-24 bg-slate-800 rounded mb-1"></div>
                                        <div className="h-2 w-12 bg-slate-800 rounded"></div>
                                    </div>
                                    <div className="text-green-500"><ShieldCheck size={16} /></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                        Start Session
                    </button>
                    <button className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 transition-all">
                        Manage Database
                    </button>
                </div>
            </div>
        </div>
    );
};
