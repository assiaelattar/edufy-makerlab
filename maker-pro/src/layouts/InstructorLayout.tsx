import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, LogOut, Settings, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InstructorLayout = () => {
    const { studentProfile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/instructor-dashboard' },
        { icon: BookOpen, label: 'Curriculum', path: '/instructor/curriculum' }, // Shows list of programs to edit
        { icon: Users, label: 'Roster', path: '/instructor/roster' }, // Shows list of programs to view roster
        { icon: Award, label: 'Announcements', path: '/instructor/announcements' },
        { icon: Settings, label: 'Settings', path: '/instructor/settings' },
    ];

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-30">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
                            M
                        </div>
                        <div className="font-bold text-lg tracking-tight">MakerPro</div>
                    </div>

                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 font-medium'
                                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-auto p-6 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            {studentProfile?.photoUrl ? (
                                <img src={studentProfile.photoUrl} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="font-bold">{studentProfile?.name?.charAt(0) || 'I'}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{studentProfile?.name || 'Instructor'}</div>
                            <div className="text-xs text-slate-500 truncate">{studentProfile?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ml-64">
                <Outlet />
            </div>
        </div>
    );
};
