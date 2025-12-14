import React, { useMemo } from 'react';
import { Trophy, Star, Rocket, Award, Grid, Calendar, Share2, BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { STUDIO_THEME } from '../utils/studioTheme';
import { formatDate } from '../utils/helpers';
import { generateBridgeToken } from '../utils/authHelpers';

export const PortfolioView = () => {
    const { studentProjects, badges, students, t } = useAppContext();
    const { userProfile } = useAuth();

    // 1. Get My Projects
    const myProjects = useMemo(() => {
        if (!userProfile) return [];
        // Match student by email to get their Firestore ID
        const matchedStudent = students.find(s => s.email === userProfile.email || s.loginInfo?.email === userProfile.email);

        // Filter projects matching either the Auth UID or the Firestore ID
        return studentProjects.filter(p =>
            p.studentId === userProfile.uid ||
            (matchedStudent && p.studentId === matchedStudent.id)
        );
    }, [studentProjects, userProfile, students]);

    const publishedProjects = myProjects.filter(p => p.status === 'published');

    // 2. Calculate Stats
    const xp = publishedProjects.length * 150 + myProjects.length * 50;
    const level = Math.floor(xp / 500) + 1;
    const progress = ((xp % 500) / 500) * 100;

    // 3. Get Earned Badges (Unique)
    const myBadges = useMemo(() => {
        if (!userProfile) return [];
        const student = students.find(s => s.id === userProfile.uid || s.email === userProfile.email);
        const badgeIds = student?.badges || [];
        return badges.filter(b => badgeIds.includes(b.id));
    }, [students, userProfile, badges]);

    const studioClass = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');

    return (
        <div className="space-y-8 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">

            {/* Header / Hero Stats */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-slate-100 flex items-center justify-center text-4xl font-black text-indigo-900">
                        {userProfile?.name?.charAt(0) || 'Me'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-4xl font-black text-indigo-900 mb-2">{userProfile?.name}'s Portfolio</h1>
                        <p className="text-slate-500 text-lg mb-6">Master Maker Level {level}</p>

                        {/* XP Bar */}
                        <div className="max-w-md mx-auto md:mx-0 bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 shadow-[0_0_15px_rgba(251,191,36,0.5)]" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">{Math.round(progress)}% to next level</div>
                    </div>

                    {/* Stat Cards */}
                    <div className="flex gap-4">
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-w-[100px] text-center">
                            <Trophy size={24} className="mx-auto text-amber-500 mb-2" strokeWidth={2.5} />
                            <div className="text-2xl font-black text-indigo-900">{myBadges.length}</div>
                            <div className="text-xs font-bold text-indigo-400 uppercase">Badges</div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-w-[100px] text-center">
                            <Rocket size={24} className="mx-auto text-cyan-500 mb-2" strokeWidth={2.5} />
                            <div className="text-2xl font-black text-indigo-900">{publishedProjects.length}</div>
                            <div className="text-xs font-bold text-indigo-400 uppercase">Shipped</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Projects */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-3">
                        <Grid size={28} className="text-purple-500" /> My Projects
                    </h2>

                    {publishedProjects.length === 0 ? (
                        <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">No Published Projects Yet</h3>
                            <p className="text-slate-400">Complete tasks and missions to fill your portfolio!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {publishedProjects.map(p => (
                                <div key={p.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                                        {p.mediaUrls?.[0] ? (
                                            <img src={p.mediaUrls[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt={p.title} />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300"><BookOpen size={32} /></div>
                                        )}
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-wider shadow-sm">
                                            {p.station || 'General'}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-black text-indigo-900 text-lg mb-1 truncate">{p.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                            <Calendar size={12} /> {formatDate(p.createdAt)}
                                        </div>

                                        {/* Badges Earned for this project */}
                                        {p.earnedBadgeIds && p.earnedBadgeIds.length > 0 && (
                                            <div className="flex gap-1 mb-4">
                                                {p.earnedBadgeIds.map(bid => {
                                                    const b = badges.find(bg => bg.id === bid);
                                                    if (!b) return null;
                                                    return (
                                                        <div key={bid} className={`w-6 h-6 rounded-full bg-${b.color}-100 flex items-center justify-center text-${b.color}-600 border border-white shadow-sm`} title={b.name}>
                                                            <Award size={12} />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}


                                        <div className="flex gap-2">
                                            <button className="flex-1 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                                <Share2 size={16} /> Share
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!userProfile) return;
                                                    const token = generateBridgeToken(userProfile);
                                                    window.open(`http://localhost:3000/?token=${token}&projectId=${p.id}`, '_blank');
                                                }}
                                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm transition-transform hover:scale-105 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                            >
                                                <Rocket size={16} strokeWidth={2.5} /> Open
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Col: Badges Collection */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-3">
                        <Award size={28} className="text-amber-500" /> Badge Collection
                    </h2>

                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm min-h-[400px]">
                        {myBadges.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <Award size={48} className="mx-auto opacity-20 mb-4" />
                                <p>Start completing missions to earn badges!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {myBadges.map(badge => (
                                    <div key={badge.id} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer text-center">
                                        <div className={`w-16 h-16 rounded-2xl bg-${badge.color}-100 flex items-center justify-center text-${badge.color}-600 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                            {/* Ideally render actual icon based on string name, using Award for now */}
                                            <Award size={32} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-700 text-xs leading-tight mb-1">{badge.name}</div>
                                            <div className="text-[10px] text-slate-400">100 XP</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
