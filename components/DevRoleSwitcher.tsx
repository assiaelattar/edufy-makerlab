import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, GraduationCap, UserCircle, AlertTriangle } from 'lucide-react';

export const DevRoleSwitcher = () => {
    const { switchRole, userProfile } = useAuth();

    const roles = [
        { id: 'admin', icon: Shield, label: 'Admin', color: 'bg-red-600' },
        { id: 'instructor', icon: Users, label: 'Instructor', color: 'bg-blue-600' },
        { id: 'student', icon: GraduationCap, label: 'Student', color: 'bg-green-600' },
        { id: 'parent', icon: UserCircle, label: 'Parent', color: 'bg-purple-600' }
    ];

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 bg-slate-900/90 p-2 rounded-full border border-slate-700 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={10} /> Dev Mode
            </div>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            {roles.map(r => (
                <button
                    key={r.id}
                    onClick={() => switchRole(r.id as any)}
                    className={`p-2 rounded-full transition-all duration-300 group relative ${userProfile?.role === r.id ? r.color + ' text-white scale-110 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title={`Switch to ${r.label}`}
                >
                    <r.icon size={18} />

                    {/* Tooltip */}
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 font-bold">
                        {r.label}
                    </span>
                </button>
            ))}
        </div>
    );
};
