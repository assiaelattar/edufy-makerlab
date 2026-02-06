import React, { useState, useMemo } from 'react';
import { Users, ArrowLeft, Mail, Phone, Printer, Pencil, BookOpen, Plus, ArrowRightLeft, Wallet, Settings, Eye, CreditCard, Trash2, Calendar, AlertCircle, XCircle, Clock, Save, AlertTriangle, Loader2, Key, MessageCircle, Image as ImageIcon, ExternalLink, RefreshCw, Trophy, Zap, Code, Rocket, Target, Star, CheckCircle2, LayoutDashboard, UserPlus, Copy, Share2, Award, Shield, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, calculateAge, generateStudentSchedulePrint, formatCurrency, generateReceipt, generateAccessCardPrint, generateMakerResume, getEmbedSrc, generateCredentialsPrint, getDaysUntilBirthday } from '../utils/helpers';
import { updateDoc, doc, deleteDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Modal } from '../components/Modal';
import { Enrollment, Payment, StudentProject } from '../types';
import { getTheme } from '../utils/theme';
import Tabs from '../components/Tabs';
import { AcademicsTab } from './student-details/AcademicsTab';
import { FinanceTab } from './student-details/FinanceTab';
import { PortfolioTab } from './student-details/PortfolioTab';
import { AttendanceTab } from './student-details/AttendanceTab';
import { AccessAndAccountsTab } from './student-details/AccessAndAccountsTab';

export const StudentDetailsView = ({
    onEditStudent,
    onQuickEnroll,
    onRecordPayment
}: {
    onEditStudent: (student: any) => void;
    onQuickEnroll: (id: string) => void;
    onRecordPayment: (id: string) => void;
}) => {
    const { students, enrollments, programs, payments, attendanceRecords, studentProjects, navigateTo, settings, viewParams, sendNotification, badges } = useAppContext();
    const { createSecondaryUser, userProfile, currentOrganization } = useAuth();

    const { studentId } = viewParams;
    const isStudentRole = userProfile?.role === 'student';
    const [viewMode, setViewMode] = useState<'admin' | 'student_preview'>('admin');

    // Rich Project Modal State
    const [selectedProject, setSelectedProject] = useState<StudentProject | null>(null);

    // Credentials Modal State
    const [credentialsModal, setCredentialsModal] = useState<{ isOpen: boolean, data: { name: string, email: string, pass: string, role: string } | null }>({ isOpen: false, data: null });

    const student = useMemo(() => {
        if (isStudentRole && userProfile) {
            return students.find(s => s.email === userProfile.email || s.loginInfo?.email === userProfile.email) || students.find(s => s.id === studentId);
        }
        return students.find(s => s.id === studentId);
    }, [students, studentId, userProfile, isStudentRole]);

    const [editEnrollment, setEditEnrollment] = useState<Partial<Enrollment> | null>(null);
    const [editPayment, setEditPayment] = useState<Partial<Payment> | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showParentPassword, setShowParentPassword] = useState(false);
    const [isGeneratingAccess, setIsGeneratingAccess] = useState(false);
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', type: 'danger', isLoading: false, action: async () => { } });
    const [activeTab, setActiveTab] = useState('Academics');

    if (!student) return <div className="p-8 text-center text-slate-500">Student profile not found.</div>;

    // --- NEW: Local Edit State ---
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<typeof student>>({});

    const handleEditClick = () => {
        setEditFormData({
            name: student.name,
            birthDate: student.birthDate,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            email: student.email,
            address: student.address,
            school: student.school,
            medicalInfo: student.medicalInfo,
        });
        setIsEditingStudent(true);
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !student.id) return;
        try {
            // Remove undefined values to prevent Firestore errors
            const cleanData: any = {};
            Object.keys(editFormData).forEach(key => {
                const value = editFormData[key as keyof typeof editFormData];
                if (value !== undefined) {
                    cleanData[key] = value;
                }
            });

            await updateDoc(doc(db, 'students', student.id), cleanData);
            setIsEditingStudent(false);
            alert("Student details updated successfully!");
        } catch (err: any) {
            console.error("Error updating student:", err);
            alert("Failed to update student details.");
        }
    };

    // ... [Calculations for enrollments, payments, etc. same as before] ...
    const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
    const studentPayments = payments.filter(p => studentEnrollments.some(e => e.id === p.enrollmentId));
    const publishedProjects = studentProjects.filter(p => p.studentId === student.id && p.status === 'published');
    const studentAttendance = attendanceRecords.filter(r => r.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const absenceCount = studentAttendance.filter(r => r.status === 'absent').length;
    const lateCount = studentAttendance.filter(r => r.status === 'late').length;

    const isAdult = studentEnrollments.some(e => {
        const prog = programs.find(p => p.id === e.programId);
        return prog?.targetAudience === 'adults';
    });

    // ... [renderProjectModal same as before] ...
    const renderProjectModal = () => (
        <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={selectedProject?.title || ''} size="lg">
            {selectedProject && (
                <div className="space-y-6">
                    {/* RICH MEDIA DISPLAY */}
                    <div className="w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                        {selectedProject.embedUrl && getEmbedSrc(selectedProject.embedUrl) ? (
                            <div className="aspect-video w-full">
                                <iframe
                                    src={getEmbedSrc(selectedProject.embedUrl)!}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : selectedProject.mediaUrls?.[0] ? (
                            <img src={selectedProject.mediaUrls[0]} className="w-full max-h-[400px] object-cover" />
                        ) : (
                            <div className="h-48 flex items-center justify-center text-slate-600"><ImageIcon size={48} /></div>
                        )}
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="flex-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border mb-2 inline-block ${getTheme(selectedProject.station).bgSoft} ${getTheme(selectedProject.station).text} ${getTheme(selectedProject.station).border}`}>
                                {getTheme(selectedProject.station).label}
                            </span>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                        </div>
                        {selectedProject.externalLink && (
                            <a href={selectedProject.externalLink} target="_blank" rel="noopener noreferrer" className="shrink-0 p-3 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl transition-colors">
                                <ExternalLink size={20} />
                            </a>
                        )}
                    </div>

                    {/* ENGINEERING PROCESS TIMELINE */}
                    <div className="border-t border-slate-800 pt-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Engineering Journey</h4>
                        <div className="space-y-3 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                            {selectedProject.steps?.map((step, idx) => {
                                let statusColor = 'bg-slate-800 text-slate-500';
                                let icon = <span className="text-xs font-bold">{idx + 1}</span>;

                                if (step.status === 'done') {
                                    statusColor = 'bg-emerald-600 text-white';
                                    icon = <CheckCircle2 size={16} />;
                                } else if (step.status === 'PENDING_REVIEW') {
                                    statusColor = 'bg-amber-500 text-white animate-pulse';
                                    icon = <Clock size={16} />;
                                } else if (step.status === 'REJECTED') {
                                    statusColor = 'bg-red-500 text-white';
                                    icon = <XCircle size={16} />;
                                }

                                return (
                                    <div key={step.id} className="relative flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center shrink-0 z-10 ${statusColor}`}>
                                            {icon}
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="text-sm font-medium text-slate-200">{step.title}</div>
                                                {step.status === 'PENDING_REVIEW' && <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">In Review</span>}
                                                {step.status === 'REJECTED' && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Action Required</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* INSTRUCTOR FEEDBACK */}
                    {selectedProject.instructorFeedback && (
                        <div className="bg-indigo-950/30 border border-indigo-900/50 p-4 rounded-xl flex gap-3">
                            <MessageCircle className="text-indigo-400 shrink-0" size={20} />
                            <div>
                                <h4 className="text-xs font-bold text-indigo-400 uppercase mb-1">Instructor Feedback</h4>
                                <p className="text-sm text-indigo-200">{selectedProject.instructorFeedback}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );

    // --- STUDENT PORTAL VIEW (Gamified Dashboard) ---
    if (isStudentRole || viewMode === 'student_preview') {
        const skills = Array.from(new Set(publishedProjects.flatMap(p => p.skillsAcquired)));
        const activeCourses = studentEnrollments.filter(e => e.status === 'active');
        const level = Math.floor(publishedProjects.length / 3) + 1;
        const xp = publishedProjects.length * 100;

        return (
            <div className="space-y-8 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">
                {!isStudentRole && (
                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl flex justify-between items-center shadow-lg border border-indigo-400/50">
                        <div className="flex items-center gap-2 text-sm font-bold"><Eye size={18} /> Preview Mode: Viewing as Student</div>
                        <button onClick={() => setViewMode('admin')} className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"><ArrowLeft size={14} /> Exit Preview</button>
                    </div>
                )}

                <div className="relative rounded-3xl overflow-hidden border border-indigo-500/30 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-1 shadow-xl shadow-cyan-500/20">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-4xl font-bold text-white">{student.name.charAt(0)}</div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full border-4 border-slate-900 shadow-sm flex items-center gap-1"><Star size={12} fill="currentColor" /> Lvl {level}</div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{student.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-sm backdrop-blur-sm border border-white/10 flex items-center gap-2"><Trophy size={14} className="text-amber-400" /> {xp} XP Earned</span>
                                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-sm backdrop-blur-sm border border-white/10 flex items-center gap-2"><Rocket size={14} className="text-cyan-400" /> {publishedProjects.length} Projects Shipped</span>
                            </div>
                            <p className="text-indigo-200 max-w-xl italic">"Creativity is intelligence having fun."</p>
                        </div>
                        <div className="relative z-10">
                            <button onClick={() => generateMakerResume(student, publishedProjects, settings)} className="px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-white/10 transition-all active:scale-95">
                                <Printer size={18} /> Maker Resume
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Calendar className="text-blue-500" /> My Classes</h3>
                            {activeCourses.length === 0 ? <p className="text-slate-500 text-sm">No active classes.</p> :
                                <div className="space-y-3">{activeCourses.map(e => (
                                    <div key={e.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800/50">
                                        <div className="font-bold text-white text-sm">{e.programName}</div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-xs text-slate-400">{e.gradeName}</div>
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50 flex items-center gap-1"><Clock size={12} /> {e.groupTime?.split(' ')[0] || 'Weekly'}</span>
                                        </div>
                                    </div>
                                ))}</div>
                            }
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Award className="text-purple-500" /> Badges Earned</h3>
                            <div className="flex flex-wrap gap-3">
                                {(!student.badges || student.badges.length === 0) ? <p className="text-slate-500 text-sm">Complete projects to earn badges!</p> :
                                    student.badges.map(badgeId => {
                                        const badge = badges.find(b => b.id === badgeId);
                                        if (!badge) return null;
                                        const Icon = (LucideIcons[badge.icon as keyof typeof LucideIcons] || LucideIcons.Award) as React.ElementType;
                                        return (
                                            <div key={badgeId} className={`px-3 py-2 bg-${badge.color}-950/30 text-${badge.color}-400 text-xs font-bold rounded-xl border border-${badge.color}-500/30 flex items-center gap-2`} title={badge.description}>
                                                <Icon size={16} /> {badge.name}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap className="text-amber-500" /> Skills Unlocked</h3>
                            <div className="flex flex-wrap gap-2">
                                {skills.length === 0 ? <p className="text-slate-500 text-sm">Submit projects to earn skill badges!</p> : skills.map(skill => (
                                    <span key={skill} className="px-3 py-1.5 bg-slate-800 text-cyan-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1"><CheckCircle2 size={12} className="text-cyan-500" /> {skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><BookOpen className="text-pink-500" /> My Project Portfolio</h3>
                                <button onClick={() => navigateTo('learning')} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors">Go to Studio</button>
                            </div>
                            {publishedProjects.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600"><Target size={32} /></div>
                                    <h4 className="text-white font-bold">No projects yet</h4>
                                    <p className="text-slate-500 text-sm mt-1 mb-4">Go to the Learning Studio to start building!</p>
                                    <button onClick={() => navigateTo('learning')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20">Start a Project</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {publishedProjects.map(p => (
                                        <div key={p.id} onClick={() => setSelectedProject(p)} className="group bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer">
                                            <div className="h-40 bg-slate-900 relative overflow-hidden">
                                                {p.mediaUrls?.[0] ? <img src={p.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={p.title} /> : <div className="flex items-center justify-center h-full text-slate-700"><ImageIcon size={32} /></div>}
                                                {p.embedUrl ? <div className="absolute top-3 right-3 bg-red-600 text-white p-1.5 rounded-lg shadow-lg"><Zap size={14} /></div> : p.externalLink && <div className="absolute top-3 right-3 bg-black/60 text-white p-1.5 rounded-lg"><ExternalLink size={14} /></div>}
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{p.title}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>
                                                <div className="flex flex-wrap gap-1">{p.skillsAcquired.slice(0, 3).map(s => <span key={s} className="text-[10px] bg-indigo-950/50 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-900/30">{s}</span>)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {renderProjectModal()}
            </div>
        );
    }

    // --- ADMIN / STAFF VIEW ---

    // Existing Student Access Generator
    const handleGenerateAccess = async () => {
        if (!db || !student) return;
        const isRegenerating = !!student.loginInfo;
        if (isRegenerating) { if (!confirm("Are you sure you want to regenerate access? This will create a NEW account and password. The previous login will stop working.")) return; }
        setIsGeneratingAccess(true);
        try {
            const names = (student.name || '').trim().split(' ').map((n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const firstName = names[0];
            const lastName = names.length > 1 ? names[names.length - 1] : names[0];

            // Format: firstname.lastname@makerlab.academy (e.g. walid.fakir@makerlab.academy)
            const baseUsername = `${firstName}.${lastName}`;
            const domain = 'makerlab.academy';

            const password = Math.random().toString(36).slice(-8);
            let uid = '';
            let finalEmail = '';

            // Recursive function to find available email
            const createUniqueUser = async (attempt: number): Promise<{ uid: string, email: string }> => {
                const currentEmail = attempt === 0
                    ? `${baseUsername}@${domain}`
                    : `${baseUsername}${attempt}@${domain}`;

                try {
                    const newUid = await createSecondaryUser(currentEmail, password);
                    return { uid: newUid, email: currentEmail };
                } catch (err: any) {
                    if (err.message?.includes('email-already-in-use') || err.code === 'auth/email-already-in-use') {
                        // Retry with next number
                        return createUniqueUser(attempt + 1);
                    }
                    throw err;
                }
            };

            const result = await createUniqueUser(0);
            uid = result.uid;
            finalEmail = result.email;

            const username = finalEmail.split('@')[0];

            await setDoc(doc(db, 'users', uid), {
                uid,
                organizationId: currentOrganization?.id || student.organizationId,
                email: finalEmail,
                name: student.name,
                role: 'student',
                status: 'active',
                createdAt: serverTimestamp()
            });
            await updateDoc(doc(db, 'students', student.id), { loginInfo: { username, email: finalEmail, initialPassword: password, uid } });

            // Send Notification
            const { sendNotification } = useAppContext();
            try {
                await sendNotification(uid, 'Welcome to Edufy!', 'Your student portal account has been created.', 'success');
            } catch (e) {
                console.error("Failed to send notification", e);
            }

            alert(`Access ${isRegenerating ? 'Regenerated' : 'Generated'} Successfully!\nEmail: ${finalEmail}\nPassword: ${password}`);
        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally { setIsGeneratingAccess(false); }
    };

    // NEW: Create Parent Access
    const handleCreateParentAccess = async () => {
        if (!db || !student) return;

        // Check if regenerating
        if (student.parentLoginInfo) {
            if (!confirm("Are you sure you want to regenerate access? This will create a NEW password for the parent account if we cannot recover the old one. If the parent knows their password, you don't need to do this.")) return;
        }

        setIsGeneratingAccess(true);
        try {
            const names = (student.name || '').trim().split(' ');
            const lastName = names.length > 1 ? names[names.length - 1].toLowerCase() : names[0].toLowerCase();
            const parentEmail = `p.${lastName}@makerlab.academy`;
            const parentName = student.parentName || "Parent";
            const password = Math.random().toString(36).slice(-8);

            let uid = student.parentLoginInfo?.uid;
            let isExistingUser = false;

            // 1. Try to create the user
            try {
                uid = await createSecondaryUser(parentEmail, password);
                // If successful, it's a new user
            } catch (e: any) {
                if (e.message?.includes('already exists') || e.code === 'auth/email-already-in-use') {
                    // User exists. Find their UID from Firestore 'users' collection
                    const q = (await import('firebase/firestore')).query(
                        (await import('firebase/firestore')).collection(db, 'users'),
                        (await import('firebase/firestore')).where('email', '==', parentEmail)
                    );
                    const querySnap = await (await import('firebase/firestore')).getDocs(q);

                    if (!querySnap.empty) {
                        uid = querySnap.docs[0].id;
                        isExistingUser = true;
                    } else {
                        alert(`Account ${parentEmail} exists in Auth but not in Users database. Please contact support to fix this inconsistency.`);
                        setIsGeneratingAccess(false);
                        return;
                    }
                } else {
                    throw e; // Rethrow other errors
                }
            }

            if (!uid) {
                alert("Could not obtain User ID.");
                setIsGeneratingAccess(false);
                return;
            }

            // 2. Update Student Record
            const newParentLoginInfo = {
                email: parentEmail,
                initialPassword: isExistingUser ? '********' : password,
                uid
            };

            await updateDoc(doc(db, 'students', student.id), { parentLoginInfo: newParentLoginInfo });

            // 3. Ensure User Profile Exists/Is Updated
            await setDoc(doc(db, 'users', uid), {
                uid,
                organizationId: currentOrganization?.id || student.organizationId,
                email: parentEmail,
                name: parentName,
                role: 'parent',
                status: 'active',
                // Don't overwrite createdAt if existing
                ...(isExistingUser ? {} : { createdAt: serverTimestamp() })
            }, { merge: true });

            if (isExistingUser) {
                alert(`Successfully linked existing parent account (${parentEmail}).\nThe parent can log in with their existing password.`);
            } else {
                setCredentialsModal({
                    isOpen: true,
                    data: { name: parentName, email: parentEmail, pass: password, role: 'Parent' }
                });
            }

        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsGeneratingAccess(false);
        }
    };

    const initiateDeleteEnrollment = (enrollmentId: string) => {
        const hasPayments = payments.some(p => p.enrollmentId === enrollmentId);
        if (hasPayments) { alert("Cannot delete enrollment because payments have been recorded. Please delete the associated payments first to ensure financial accuracy."); return; }
        setConfirmModal({ isOpen: true, title: "Delete Enrollment", message: "Are you sure you want to delete this enrollment? This action cannot be undone and will remove the student from class lists.", type: 'danger', isLoading: false, action: async () => { if (!db) return; await deleteDoc(doc(db, 'enrollments', enrollmentId)); } });
    };

    const initiateDeletePayment = (payment: Payment) => {
        setConfirmModal({ isOpen: true, title: "Delete Payment Record", message: `Are you sure you want to delete this payment of ${formatCurrency(payment.amount)}? \n\nIf this payment was 'Paid' or 'Verified', the student's debt will increase.`, type: 'danger', isLoading: false, action: async () => { if (!db) return; if (['paid', 'verified'].includes(payment.status)) { const enrollment = enrollments.find(e => e.id === payment.enrollmentId); if (enrollment) { await updateDoc(doc(db, 'enrollments', enrollment.id), { paidAmount: increment(-payment.amount), balance: increment(payment.amount) }); } } await deleteDoc(doc(db, 'payments', payment.id)); } });
    };

    const handleExecuteConfirm = async () => {
        setConfirmModal((prev: any) => ({ ...prev, isLoading: true }));
        try { await confirmModal.action(); setConfirmModal((prev: any) => ({ ...prev, isOpen: false, isLoading: false })); } catch (err) { console.error(err); alert("An error occurred."); setConfirmModal((prev: any) => ({ ...prev, isLoading: false })); }
    };

    const handleSaveEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !editEnrollment || !editEnrollment.id) return;
        try { const original = enrollments.find(en => en.id === editEnrollment.id); if (!original) return; let updates: any = { ...editEnrollment }; if (editEnrollment.totalAmount !== undefined) { updates.balance = Number(editEnrollment.totalAmount) - (original.paidAmount || 0); } await updateDoc(doc(db, 'enrollments', editEnrollment.id), updates); setEditEnrollment(null); alert("Enrollment updated successfully."); } catch (err) { console.error(err); alert("Failed to update enrollment."); }
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !editPayment || !editPayment.id) return;
        const originalPayment = payments.find(p => p.id === editPayment.id);
        if (!originalPayment) return;
        try { await updateDoc(doc(db, 'payments', editPayment.id), editPayment); if (editPayment.amount && editPayment.amount !== originalPayment.amount && ['paid', 'verified'].includes(originalPayment.status)) { const diff = Number(editPayment.amount) - originalPayment.amount; const enrollment = enrollments.find(e => e.id === originalPayment.enrollmentId); if (enrollment) { await updateDoc(doc(db, 'enrollments', enrollment.id), { paidAmount: increment(diff), balance: increment(-diff) }); } } setEditPayment(null); alert("Payment updated."); } catch (err) { console.error(err); }
    };

    const handleShareReceipt = async (paymentId: string) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'payments', paymentId) as any, {
                receiptSharedAt: serverTimestamp() as any
            });
        } catch (error) {
            console.error("Error sharing receipt:", error);
        }
    };

    const handleShareSchedule = async () => {
        if (!db) return;
        if (!student.parentPhone) return alert("Parent phone number is missing.");

        // Track sharing
        try {
            await updateDoc(doc(db, 'students', student.id) as any, {
                lastScheduleSharedAt: serverTimestamp() as any
            });
        } catch (error) {
            console.error("Error tracking schedule share:", error);
        }

        let phone = student.parentPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '212' + phone.substring(1);

        const msg = `Hello! Here is the weekly schedule for ${student.name} at MakerLab Academy.\n\nYou can access the student portal here:\n${window.location.origin}\n\nLogin Email: ${student.loginInfo?.email || 'N/A'}\nPassword: ${student.loginInfo?.initialPassword || '********'}\n\nSee you in class! 🚀`;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const shareCredentialsWhatsApp = () => {
        if (!student.loginInfo || !student.parentPhone) return alert("Missing login info or parent phone.");
        const msg = `Hello! Here are the login credentials for ${student.name}'s student portal:\n\nLink: ${window.location.origin}\nEmail: ${student.loginInfo.email}\nPassword: ${student.loginInfo.initialPassword || '********'}`;
        window.open(`https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };



    const handleImpersonate = () => {
        if (!student.loginInfo?.email) {
            alert("Student does not have login credentials.");
            return;
        }

        // Create a bridge token payload
        const payload = {
            uid: student.loginInfo.uid || student.id,
            email: student.loginInfo.email,
            role: 'student',
            name: student.name,
            photoURL: null
        };

        const bridgeToken = btoa(JSON.stringify(payload));

        // Determine SparkQuest URL 
        // Logic: If on localhost, assume SparkQuest is on :3000 (standard vite dev port for 2nd app) or :5174? 
        // Better: Use a config or assume localhost:3000 for dev, and production URL for prod.
        const isLocal = window.location.hostname === 'localhost';
        const sparkQuestUrl = isLocal
            ? 'http://localhost:3000'
            : 'https://sparkquest-makerlab.vercel.app';

        window.open(`${sparkQuestUrl}/?token=${bridgeToken}`, '_blank');
    };

    return (
        <div className="space-y-6 flex flex-col animate-in fade-in slide-in-from-right-4">
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

                <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
                            <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-3xl font-bold text-white">
                                {student.name.charAt(0)}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-white tracking-tight">{student.name}</h1>
                                {student.status === 'inactive' && (
                                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm mt-2">
                                <span className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors" title="Email">
                                    <Mail size={14} className="text-indigo-500" /> {student.email || 'No email'}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors" title="Parent Phone">
                                    <Phone size={14} className="text-indigo-500" /> {student.parentPhone}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors" title="Date of Birth">
                                    <Calendar size={14} className="text-indigo-500" />
                                    {student.birthDate ? (
                                        <>
                                            {student.birthDate} <span className="text-xs bg-slate-800 px-1.5 rounded text-slate-500">({calculateAge(student.birthDate)} yo)</span>
                                            {(() => {
                                                const days = getDaysUntilBirthday(student.birthDate);
                                                if (days !== null && days <= 21) {
                                                    return (
                                                        <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 ${days === 0 ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/50' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
                                                            {days === 0 ? <><Sparkles size={12} /> Happy Birthday!</> : <><Clock size={12} /> {days} days left</>}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </>
                                    ) : (
                                        <span className="text-slate-600 italic">No DOB Set</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm mt-1">
                                <span className="flex items-center gap-1.5">
                                    <Users size={14} className="text-slate-600" /> <span className="text-slate-500">Parent:</span> <span className={!student.parentName ? "text-slate-600 italic" : "text-slate-300"}>{student.parentName || 'Not Listed'}</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="flex items-center gap-1.5">
                                    <BookOpen size={14} className="text-slate-600" /> <span className={!student.school ? "text-slate-600 italic" : "text-slate-300"}>{student.school || 'No School Listed'}</span>
                                </span>
                            </div>
                            {student.medicalInfo ? (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-red-950/30 border border-red-900/50 rounded-lg text-red-200 text-xs font-bold animate-pulse">
                                    <AlertCircle size={14} className="text-red-500" /> Medical Info: {student.medicalInfo}
                                </div>
                            ) : (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-800/30 border border-slate-800 rounded-lg text-slate-500 text-xs">
                                    <Shield size={14} className="text-emerald-500/50" /> No Medical Alerts
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={handleImpersonate} title="Login as Student (SparkQuest)" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-900/30 transition-all hover:scale-105 active:scale-95">
                            <Rocket size={18} />
                        </button>
                        <button onClick={() => setViewMode('student_preview')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95 text-sm font-bold">
                            <LayoutDashboard size={18} /> <span className="hidden sm:inline">Portal Preview</span>
                        </button>
                        <button onClick={() => generateStudentSchedulePrint(student, studentEnrollments, settings)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all hover:border-slate-600 text-sm font-medium">
                            <Printer size={18} /> <span className="hidden sm:inline">Schedule</span>
                        </button>
                        <button
                            onClick={handleShareSchedule}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-sm font-bold ${student.lastScheduleSharedAt ? 'bg-emerald-700 text-emerald-100 shadow-emerald-900/10' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
                            title={student.lastScheduleSharedAt ? `Last shared: ${formatDate(((student.lastScheduleSharedAt as any).toDate ? (student.lastScheduleSharedAt as any).toDate() : student.lastScheduleSharedAt) as any)}` : "Share via WhatsApp"}
                        >
                            {student.lastScheduleSharedAt ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
                            <span className="hidden sm:inline">{student.lastScheduleSharedAt ? 'Shared' : 'Share'}</span>
                        </button>
                        <button onClick={handleEditClick} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all hover:border-slate-600 text-sm font-medium">
                            <Pencil size={18} /> <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={() => navigateTo('students')} className="flex-none flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all" title="Back to Directory">
                            <ArrowLeft size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



                <div className="lg:col-span-2 space-y-6">

                    <Tabs tabs={[

                        { label: 'Academics', icon: 'A', color: 'bg-sky-600' },

                        { label: 'Finance', icon: 'F', color: 'bg-emerald-600' },

                        { label: 'Portfolio', icon: 'P', color: 'bg-amber-600' },

                        { label: 'Attendance', icon: 'A', color: 'bg-red-600' }

                    ]}>

                        <AcademicsTab
                            studentEnrollments={studentEnrollments}
                            onQuickEnroll={onQuickEnroll}
                            navigateTo={navigateTo as any}
                            setEditEnrollment={setEditEnrollment}
                            initiateDeleteEnrollment={initiateDeleteEnrollment}
                            studentId={student.id}
                        />
                        <FinanceTab
                            studentPayments={studentPayments}
                            studentEnrollments={studentEnrollments}
                            student={student}
                            onRecordPayment={onRecordPayment}
                            navigateTo={navigateTo as any}
                            setEditPayment={setEditPayment}
                            initiateDeletePayment={initiateDeletePayment}
                            settings={settings}
                            onShareReceipt={handleShareReceipt}
                        />
                        <PortfolioTab
                            publishedProjects={publishedProjects}
                            setSelectedProject={setSelectedProject}
                        />
                        <AttendanceTab
                            studentAttendance={studentAttendance}
                            absenceCount={absenceCount}
                            lateCount={lateCount}
                        />

                    </Tabs>

                </div>


                <div className="space-y-6">
                    <AccessAndAccountsTab
                        student={student}
                        handleGenerateAccess={handleGenerateAccess}
                        handleCreateParentAccess={handleCreateParentAccess}
                        isGeneratingAccess={isGeneratingAccess}
                        generateAccessCardPrint={generateAccessCardPrint}
                        shareCredentialsWhatsApp={shareCredentialsWhatsApp}
                        setCredentialsModal={setCredentialsModal}
                        settings={settings}
                        isAdult={isAdult}
                    />
                </div>
            </div>
            {renderProjectModal()}
            <Modal isOpen={!!editEnrollment} onClose={() => setEditEnrollment(null)} title="Edit Enrollment Details">
                <form onSubmit={handleSaveEnrollment} className="space-y-4">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-4">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Program</div>
                        <div className="text-white font-medium">{editEnrollment?.programName}</div>
                        <div className="text-sm text-slate-400">{editEnrollment?.gradeName}</div>
                    </div>

                    {/* Group Selection */}
                    {editEnrollment && programs.find(p => p.id === editEnrollment.programId) && (
                        <div className="space-y-4">
                            {/* Grade/Level Selection */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Level / Grade</label>
                                <select
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                    value={editEnrollment.gradeId || ''}
                                    onChange={(e) => {
                                        const program = programs.find(p => p.id === editEnrollment.programId);
                                        if (!program) return;
                                        const selectedGrade = program.grades.find(g => g.id === e.target.value);

                                        if (selectedGrade) {
                                            setEditEnrollment(prev => prev ? ({
                                                ...prev,
                                                gradeId: selectedGrade.id,
                                                gradeName: selectedGrade.name,
                                                groupId: '', // Reset group when level changes
                                                groupName: '',
                                                groupTime: ''
                                            }) : null);
                                        }
                                    }}
                                >
                                    <option value="">Select Level</option>
                                    {programs
                                        .find(p => p.id === editEnrollment.programId)
                                        ?.grades.map(g => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Group / Schedule</label>
                                <select
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                    value={editEnrollment.groupId || ''}
                                    onChange={(e) => {
                                        const program = programs.find(p => p.id === editEnrollment.programId);
                                        if (!program) return;
                                        const grade = program.grades.find(g => g.id === editEnrollment.gradeId);
                                        if (!grade) return;

                                        const selectedGroup = grade.groups.find(g => g.id === e.target.value);
                                        if (selectedGroup) {
                                            setEditEnrollment(prev => prev ? ({
                                                ...prev,
                                                groupId: selectedGroup.id,
                                                groupName: selectedGroup.name,
                                                groupTime: `${selectedGroup.day} ${selectedGroup.time}`
                                            }) : null);
                                        }
                                    }}
                                >
                                    <option value="">Select Group</option>
                                    {programs
                                        .find(p => p.id === editEnrollment.programId)
                                        ?.grades.find(g => g.id === editEnrollment.gradeId)
                                        ?.groups.map(g => (
                                            <option key={g.id} value={g.id}>
                                                {g.name} — {g.day} {g.time}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Second Group (DIY/Extra) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Extra Workshop / DIY (Optional)</label>
                                <select
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                    value={editEnrollment.secondGroupId || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) {
                                            setEditEnrollment(prev => prev ? ({
                                                ...prev,
                                                secondGroupId: undefined,
                                                secondGroupName: undefined,
                                                secondGroupTime: undefined
                                            }) : null);
                                            return;
                                        }

                                        const program = programs.find(p => p.id === editEnrollment.programId);
                                        if (!program) return;
                                        const grade = program.grades.find(g => g.id === editEnrollment.gradeId);
                                        if (!grade) return;

                                        const selectedGroup = grade.groups.find(g => g.id === val);
                                        if (selectedGroup) {
                                            setEditEnrollment(prev => prev ? ({
                                                ...prev,
                                                secondGroupId: selectedGroup.id,
                                                secondGroupName: selectedGroup.name,
                                                secondGroupTime: `${selectedGroup.day} ${selectedGroup.time}`
                                            }) : null);
                                        }
                                    }}
                                >
                                    <option value="">-- No Extra Workshop --</option>
                                    {programs
                                        .find(p => p.id === editEnrollment.programId)
                                        ?.grades.find(g => g.id === editEnrollment.gradeId)
                                        ?.groups.map(g => (
                                            <option key={g.id} value={g.id}>
                                                {g.name} — {g.day} {g.time}
                                            </option>
                                        ))
                                    }
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1">For 'Innovator' plans with 2 sessions per week.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Negotiated Price (Total Tuition)</label>
                        <input
                            type="number"
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold text-lg"
                            value={editEnrollment?.totalAmount || 0}
                            onChange={e => setEditEnrollment(prev => prev ? ({ ...prev, totalAmount: Number(e.target.value) }) : null)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Changing this will automatically recalculate the remaining balance.</p>
                    </div>

                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </form>
            </Modal>
            <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Edit Payment Record">
                <form onSubmit={handleSavePayment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount</label><input type="number" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold" value={editPayment?.amount || 0} onChange={e => setEditPayment(prev => prev ? ({ ...prev, amount: Number(e.target.value) }) : null)} /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={editPayment?.date || ''} onChange={e => setEditPayment(prev => prev ? ({ ...prev, date: e.target.value }) : null)} /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Method</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={editPayment?.method} onChange={e => setEditPayment(prev => prev ? ({ ...prev, method: e.target.value as any }) : null)}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Transfer</option></select></div>
                    {editPayment?.method === 'check' && (<div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded border border-slate-800"><div><label className="text-xs text-slate-500 block mb-1">Check No.</label><input className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm" value={editPayment.checkNumber || ''} onChange={e => setEditPayment(prev => prev ? ({ ...prev, checkNumber: e.target.value }) : null)} /></div><div><label className="text-xs text-slate-500 block mb-1">Bank</label><input className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm" value={editPayment.bankName || ''} onChange={e => setEditPayment(prev => prev ? ({ ...prev, bankName: e.target.value }) : null)} /></div></div>)}
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Save size={16} /> Save Changes</button>
                </form>
            </Modal>
            <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal((prev: any) => ({ ...prev, isOpen: false }))} title={confirmModal.title} size="md">
                <div className="space-y-6"><div className="flex items-start gap-4"><div className={`p-3 rounded-full ${confirmModal.type === 'danger' ? 'bg-red-900/20 text-red-500' : 'bg-amber-900/20 text-amber-500'}`}><AlertTriangle size={24} /></div><div><p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{confirmModal.message}</p></div></div><div className="flex justify-end gap-3 pt-2"><button onClick={() => setConfirmModal((prev: any) => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancel</button><button onClick={handleExecuteConfirm} disabled={confirmModal.isLoading} className={`px-5 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20'}`}>{confirmModal.isLoading && <Loader2 size={16} className="animate-spin" />} Confirm</button></div></div>
            </Modal>

            {/* CREDENTIALS POPUP */}
            <Modal isOpen={credentialsModal.isOpen} onClose={() => setCredentialsModal({ isOpen: false, data: null })} title="Access Credentials Created">
                {credentialsModal.data && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Account Ready</h3>
                            <p className="text-slate-400 text-sm">Share these details with the {credentialsModal.data.role.toLowerCase()}.</p>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Key size={80} /></div>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Login Email</label>
                                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                                        <code className="text-white font-mono text-sm">{credentialsModal.data.email}</code>
                                        <button onClick={() => navigator.clipboard.writeText(credentialsModal.data!.email)} className="text-slate-500 hover:text-white p-1"><Copy size={14} /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Password</label>
                                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                                        <code className="text-emerald-400 font-mono text-lg font-bold">{credentialsModal.data.pass}</code>
                                        <button onClick={() => navigator.clipboard.writeText(credentialsModal.data!.pass)} className="text-slate-500 hover:text-white p-1"><Copy size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    const msg = `Hello! Login for ${settings.academyName}:\nLink: ${window.location.origin}\nEmail: ${credentialsModal.data!.email}\nPassword: ${credentialsModal.data!.pass}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Share2 size={16} /> WhatsApp
                            </button>
                            <button
                                onClick={() => generateCredentialsPrint(credentialsModal.data!.name, credentialsModal.data!.email, credentialsModal.data!.pass, credentialsModal.data!.role, settings)}
                                className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700"
                            >
                                <Printer size={16} /> Print Card
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* EDIT STUDENT MODAL */}
            <Modal isOpen={isEditingStudent} onClose={() => setIsEditingStudent(false)} title="Edit Student Details">
                <form onSubmit={handleSaveStudent} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                value={editFormData.name || ''}
                                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                value={editFormData.birthDate || ''}
                                onChange={e => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Parent Name</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                value={editFormData.parentName || ''}
                                onChange={e => setEditFormData({ ...editFormData, parentName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Parent Phone</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                value={editFormData.parentPhone || ''}
                                onChange={e => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Email (Optional)</label>
                        <input
                            type="email"
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                            value={editFormData.email || ''}
                            onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">School</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                value={editFormData.school || ''}
                                onChange={e => setEditFormData({ ...editFormData, school: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                value={editFormData.address || ''}
                                onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Medical Info / Allergies</label>
                        <textarea
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white h-24"
                            value={editFormData.medicalInfo || ''}
                            onChange={e => setEditFormData({ ...editFormData, medicalInfo: e.target.value })}
                            placeholder="e.g. Peanut allergy, Asthma..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsEditingStudent(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};
