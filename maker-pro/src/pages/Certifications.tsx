import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Share2, Printer, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Badge } from '../types';

export function Certifications() {
    const { studentProfile } = useAuth();
    const { enrollments, loading: studentLoading } = useStudentData();
    const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
    const [loadingBadges, setLoadingBadges] = useState(true);

    // Fetch Badges details
    useEffect(() => {
        const fetchBadges = async () => {
            if (!studentProfile?.badges || studentProfile.badges.length === 0 || !db) {
                setLoadingBadges(false);
                return;
            }
            const firestore = db;
            try {
                const badgePromises = studentProfile.badges.map((id: string) => getDoc(doc(firestore, 'badges', id)));
                const badgeSnaps = await Promise.all(badgePromises);
                const badgesData = badgeSnaps.map(snap => ({ id: snap.id, ...snap.data() } as Badge));
                setEarnedBadges(badgesData);
            } catch (err) {
                console.error("Failed to fetch badges", err);
            } finally {
                setLoadingBadges(false);
            }
        };
        fetchBadges();
    }, [studentProfile]);

    const completedEnrollments = enrollments.filter(e => e.status === 'completed');
    const loading = studentLoading || loadingBadges;

    const handlePrint = (title: string, date: string, issuer: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Certificate - ${title}</title>
                <style>
                    body { font-family: 'Georgia', serif; text-align: center; padding: 50px; border: 20px solid #2D2B6B; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }
                    h1 { font-size: 48px; color: #2D2B6B; margin-bottom: 20px; }
                    p { font-size: 24px; color: #555; margin: 10px 0; }
                    .name { font-size: 36px; font-weight: bold; margin: 30px 0; border-bottom: 2px solid #ccc; display: inline-block; padding-bottom: 10px; }
                    .logo { font-size: 20px; font-weight: bold; color: #aaa; margin-top: 50px; }
                </style>
            </head>
            <body>
                <p>This certifies that</p>
                <div class="name">${studentProfile?.name || 'Student'}</div>
                <p>has successfully completed the program</p>
                <h1>${title}</h1>
                <p>Issued by ${issuer} on ${date}</p>
                <div class="logo">MAKERLAB ACADEMY OFFICALLY VERIFIED</div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading certifications...</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Certifications</h1>
                <p className="text-slate-600 mt-1">Verified credentials and certifications earned from your programs.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Program Certificates */}
                {completedEnrollments.map(enrollment => (
                    <motion.div
                        key={enrollment.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                        <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-brand-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-brand-500/50">
                                    <Award className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-serif tracking-wide mb-1">{enrollment.programName}</h2>
                                <p className="text-slate-400 text-sm uppercase tracking-widest">MakerLab Academy</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Completed On</p>
                                    <p className="font-semibold text-slate-900">{enrollment.startDate ? new Date(enrollment.startDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                                    <p className="font-semibold text-green-600 uppercase">Verified</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handlePrint(enrollment.programName, new Date().toLocaleDateString(), "MakerLab Academy")}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Certificate
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Badge Certificates (if any) */}
                {earnedBadges.map(badge => (
                    <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center text-white relative">
                            <div className="absolute inset-0 bg-white/10 opacity-50 backdrop-blur-sm" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center mb-4">
                                    {badge.icon ? <img src={badge.icon} className="w-8 h-8" alt="icon" /> : <Award className="w-8 h-8" />}
                                </div>
                                <h2 className="text-xl font-bold mb-1">{badge.name}</h2>
                                <p className="text-white/80 text-sm">Skill Badge</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-sm mb-4">{badge.description}</p>
                            <button className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg font-medium transition-colors">
                                <Share2 className="w-4 h-4" /> Share Badge
                            </button>
                        </div>
                    </motion.div>
                ))}

                {/* Empty State */}
                {completedEnrollments.length === 0 && earnedBadges.length === 0 && (
                    <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No certifications yet</h3>
                        <p className="text-slate-500 max-w-sm mb-6">Complete your enrolled programs or earn badges to see them here.</p>

                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-400 w-1/3" />
                            </div>
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>Progress tracked automatically</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
