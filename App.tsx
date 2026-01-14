
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, Users, School, BookOpen, Wallet, CalendarCheck, Wrench, Settings, Search, X, LogOut, Menu, Bell, CheckCircle2, ChevronRight, ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, TrendingDown, Home, Box, Hammer, Camera, Car, Trophy, Sparkles, Rocket } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThemeProvider } from './sparkquest/context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { getEnabledModules } from './services/moduleRegistry';
import { Lead } from './types'; // Import Lead type
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { ClassesView } from './views/ClassesView';
import { ProgramsView } from './views/ProgramsView';
import { FinanceView } from './views/FinanceView';
import { ExpensesView } from './views/ExpensesView';
import { ToolsView } from './views/ToolsView';
import { SettingsView } from './views/SettingsView';
import { StudentDetailsView } from './views/StudentDetailsView';
import { ActivityDetailsView } from './views/ActivityDetailsView';
import { WorkshopsView } from './views/WorkshopsView';
import { PublicBookingView } from './views/PublicBookingView';
import { AbsenceView } from './views/AbsenceView';
import { TeamView } from './views/TeamView';
import { MarketingView } from './views/MarketingView';
import { LearningView } from './views/LearningView';
import { ToolkitView } from './views/ToolkitView';
import { MediaView } from './views/MediaView';
import { PickupView } from './views/PickupView';
import { PortfolioView } from './views/PortfolioView';
import { ReviewView } from './views/ReviewView';
import { ParentDashboardView } from './views/ParentDashboardView';
import { TestDesignView } from './views/TestDesignView';
import { TestWizardView } from './views/TestWizardView';
import { ArcadeManagerView } from './views/learning/ArcadeManagerView';
import { CommunicationsView } from './views/CommunicationsView';
import { EnrollmentFormsView } from './views/EnrollmentFormsView';
import { PublicEnrollmentView } from './views/PublicEnrollmentView';
import { CalendarView } from './views/CalendarView'; // NEW
import { LoginView } from './views/LoginView';
import { ParentLoginView } from './views/ParentLoginView';
import { Modal } from './components/Modal';
import { Logo } from './components/Logo';
import { NotificationDropdown } from './components/NotificationDropdown';

import { addDoc, collection, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { formatCurrency, compressImage, calculateAge } from './utils/helpers';
import { getStudentTheme } from './utils/theme';
import { ViewState } from './types';
import { AdminLayout } from './components/layouts/AdminLayout';
import { InstructorLayout } from './components/layouts/InstructorLayout';



const StudentNavigation = ({ currentView, navigateTo, theme, signOut, userProfile }: { currentView: string, navigateTo: any, theme: any, signOut: any, userProfile: any }) => {
    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Lobby' },
        { id: 'learning', icon: BookOpen, label: 'Studio' },
        { id: 'portfolio', icon: Trophy, label: 'Portfolio' },
        { id: 'media', icon: Camera, label: 'Gallery' },
        { id: 'test-wizard', icon: Sparkles, label: 'New Project' },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-2 shadow-2xl flex justify-between items-center border border-white/20 ring-1 ring-black/5">
                {menuItems.slice(0, 5).map(item => { // Show first 5 + Quest logic
                    const isActive = currentView === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigateTo(item.id)}
                            className={`
                                flex flex-col items-center justify-center py-2 rounded-2xl transition-all duration-300 w-full
                                ${isActive
                                    ? 'text-blue-600 bg-blue-50 scale-105 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }
                            `}
                        >
                            <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "animate-pulse" : ""} />
                            {isActive && <span className="text-[9px] font-black mt-1 uppercase tracking-wider">{item.label}</span>}
                        </button>
                    )
                })}

                {/* Settings */}
                <button onClick={() => navigateTo('settings')} className="flex flex-col items-center justify-center py-2 rounded-2xl text-slate-400 hover:text-slate-600 w-full">
                    <Settings size={22} />
                </button>
            </div>
        </div>
    );
}

const AppContent = () => {
    const { currentView, navigateTo, viewParams, loading: appLoading, settings, students, programs, enrollments, t } = useAppContext();
    const { user, signOut, can, loading: authLoading, userProfile, createSecondaryUser } = useAuth();
    const { requestPermission } = useNotifications();
    const { alert: showAlert } = useConfirm();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- STUDENT THEME LOGIC ---
    const isStudent = userProfile?.role === 'student';
    const isParent = userProfile?.role === 'parent';
    const isInstructor = userProfile?.role === 'instructor';

    const currentStudent = useMemo(() => {
        if (!isStudent || !userProfile) return null;
        return students.find(s => s.email === userProfile.email || s.loginInfo?.email === userProfile.email);
    }, [students, userProfile, isStudent]);

    const studentAge = useMemo(() => currentStudent ? calculateAge(currentStudent.birthDate) : 12, [currentStudent]);
    const studentTheme = getStudentTheme(studentAge);

    // --- ENROLLMENT WIZARD STATE ---
    const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
    const [quickEnrollStudentId, setQuickEnrollStudentId] = useState<string | null>(null);
    const [enrollmentStep, setEnrollmentStep] = useState(1);
    const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);

    // --- PAYMENT MODAL STATE ---
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        studentId: '',
        enrollmentId: '',
        amount: 0,
        method: 'cash' as 'cash' | 'check' | 'virement',
        date: new Date().toISOString().split('T')[0],
        // Check specific
        checkNumber: '',
        bankName: '',
        depositDate: '',
        // Virement specific
        proofUrl: '' // Base64 string
    });
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // --- ENROLLMENT FORM DATA ---
    const [enrollStudentForm, setEnrollStudentForm] = useState({ name: '', parentPhone: '', parentName: '', birthDate: '', email: '', school: '' });
    const [enrollProgramForm, setEnrollProgramForm] = useState({ programId: '', packName: '', gradeId: '', groupId: '', paymentPlan: 'full', secondGroupId: '' });
    const [negotiatedPrice, setNegotiatedPrice] = useState<number>(0);

    // Multi-Payment State for Enrollment
    const [enrollPayments, setEnrollPayments] = useState<any[]>([]);
    const [currentEnrollPayment, setCurrentEnrollPayment] = useState({
        amount: '',
        method: 'cash',
        checkNumber: '',
        bankName: '',
        depositDate: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Helper to get selected program details for enrollment
    const selectedProgram = useMemo(() => programs.find(p => p.id === enrollProgramForm.programId), [programs, enrollProgramForm.programId]);
    const selectedPack = useMemo(() => selectedProgram?.packs.find(p => p.name === enrollProgramForm.packName), [selectedProgram, enrollProgramForm.packName]);
    const selectedGrade = useMemo(() => selectedProgram?.grades.find(g => g.id === enrollProgramForm.gradeId), [selectedProgram, enrollProgramForm.gradeId]);

    const standardTuition = useMemo(() => {
        if (!selectedProgram || !selectedPack) return 0;
        return selectedProgram.type === 'Regular Program' ? (selectedPack.priceAnnual || 0) : (selectedPack.price || 0);
    }, [selectedProgram, selectedPack]);

    // Sync negotiated price with standard price when pack changes
    useEffect(() => {
        setNegotiatedPrice(standardTuition);
    }, [standardTuition]);

    // Flag to prevent clearing form when opening with pre-filled data
    const preserveEnrollmentFormRef = useRef(false);

    // Initialize Enrollment Wizard
    useEffect(() => {
        if (isEnrollmentModalOpen) {
            setEnrollmentStep(quickEnrollStudentId ? 2 : 1);

            // Only reset forms if NOT explicitly preserved (e.g. coming from Lead or Prospect)
            if (!preserveEnrollmentFormRef.current) {
                setEnrollStudentForm({ name: '', parentPhone: '', parentName: '', birthDate: '', email: '', school: '' });
                setEnrollProgramForm({ programId: '', packName: '', gradeId: '', groupId: '', paymentPlan: 'full', secondGroupId: '' });
            }

            // Always reset payments on new session
            setEnrollPayments([]);
            setCurrentEnrollPayment({ amount: '', method: 'cash', checkNumber: '', bankName: '', depositDate: '', date: new Date().toISOString().split('T')[0] });

            // Reset flag for next time (after this render effect runs)
            preserveEnrollmentFormRef.current = false;
        }
    }, [isEnrollmentModalOpen, quickEnrollStudentId]);

    // Calculate totals from added payments list
    const totalPayingNow = useMemo(() => enrollPayments.reduce((sum, p) => sum + Number(p.amount), 0), [enrollPayments]);

    const remainingBalance = negotiatedPrice - totalPayingNow;
    const discountAmount = standardTuition - negotiatedPrice;
    const discountPercent = standardTuition > 0 ? Math.round((discountAmount / standardTuition) * 100) : 0;

    // --- PAYMENT HANDLERS ---

    const handleOpenPaymentModal = (studentId?: string) => {
        setPaymentForm({
            studentId: studentId || '',
            enrollmentId: '',
            amount: 0,
            method: 'cash',
            date: new Date().toISOString().split('T')[0],
            checkNumber: '',
            bankName: '',
            depositDate: '',
            proofUrl: ''
        });

        // If student provided, try to find active enrollment
        if (studentId) {
            const activeEnrollment = enrollments.find(e => e.studentId === studentId && e.status === 'active');
            if (activeEnrollment) {
                setPaymentForm(prev => ({
                    ...prev,
                    studentId,
                    enrollmentId: activeEnrollment.id,
                    amount: activeEnrollment.balance // Pre-fill remaining balance
                }));
            }
        } else {
            setPaymentSearchQuery('');
        }

        setIsPaymentModalOpen(true);
    };

    const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setPaymentForm(prev => ({ ...prev, proofUrl: compressed }));
        } catch (err) {
            console.error(err);
            showAlert("Error", "Error uploading proof.", "danger");
        }
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!paymentForm.enrollmentId) { showAlert("Validation Error", "Please select a student/enrollment", "warning"); return; }

        setIsSubmittingPayment(true);
        try {
            const enrollment = enrollments.find(e => e.id === paymentForm.enrollmentId);
            if (!enrollment) throw new Error("Enrollment not found");

            // Determine Status based on Method
            let status = 'paid'; // Default for Cash
            if (paymentForm.method === 'check') status = 'check_received';
            if (paymentForm.method === 'virement') status = 'pending_verification';

            // Record Payment
            await addDoc(collection(db, 'payments'), {
                enrollmentId: paymentForm.enrollmentId,
                studentName: enrollment.studentName,
                amount: Number(paymentForm.amount),
                date: paymentForm.date,
                method: paymentForm.method,
                status: status,
                // Optional fields based on method
                checkNumber: paymentForm.method === 'check' ? paymentForm.checkNumber : null,
                bankName: paymentForm.method === 'check' ? paymentForm.bankName : null,
                depositDate: paymentForm.method === 'check' ? paymentForm.depositDate : null,
                proofUrl: paymentForm.method === 'virement' ? paymentForm.proofUrl : null,

                session: settings.academicYear, // Tag with Current Session
                createdAt: serverTimestamp()
            });

            // IMPORTANT: Only update balance immediately if CASH.
            // Checks and Virements update balance when status changes to 'paid'/'verified'.
            if (status === 'paid') {
                const newPaid = (enrollment.paidAmount || 0) + Number(paymentForm.amount);
                const newBalance = (enrollment.totalAmount || 0) - newPaid;

                await updateDoc(doc(db, 'enrollments', enrollment.id), {
                    paidAmount: newPaid,
                    balance: newBalance
                });
            }

            setIsPaymentModalOpen(false);
            showAlert("Success", "Payment recorded successfully!", "success");
        } catch (err) {
            console.error(err);
            showAlert("Error", "Failed to record payment", "danger");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    // --- ENROLLMENT HANDLER ---
    const handleAddEnrollmentPayment = () => {
        if (!currentEnrollPayment.amount || Number(currentEnrollPayment.amount) <= 0) return;
        setEnrollPayments([...enrollPayments, { ...currentEnrollPayment, id: Date.now() }]);
        // Reset form
        setCurrentEnrollPayment({
            amount: '',
            method: 'cash',
            checkNumber: '',
            bankName: '',
            depositDate: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleRemoveEnrollmentPayment = (id: number) => {
        setEnrollPayments(enrollPayments.filter(p => p.id !== id));
    };

    const handleEnrollFromGroup = (programId: string, gradeId: string, groupId: string) => {
        const selectedProgram = programs.find(p => p.id === programId);
        // Default to first pack or empty
        const defaultPack = selectedProgram && selectedProgram.packs.length > 0 ? selectedProgram.packs[0].name : '';

        setEnrollProgramForm({
            programId,
            gradeId,
            groupId,
            packName: defaultPack,
            paymentPlan: 'full',
            secondGroupId: ''
        });

        // Reset student form for fresh entry
        setEnrollStudentForm({ name: '', parentPhone: '', parentName: '', birthDate: '', email: '', school: '' });
        setQuickEnrollStudentId(null);
        preserveEnrollmentFormRef.current = true; // Preserve the program form we just set
        setIsEnrollmentModalOpen(true);
    };

    const handleFinishEnrollment = async () => {
        if (!db) return;
        setIsSubmittingEnrollment(true);
        try {
            let finalStudentId = quickEnrollStudentId;
            let studentName = enrollStudentForm.name;

            // 1. Create Student if New
            if (!finalStudentId) {
                // DUPLICATE CHECK
                const isDuplicate = students.some(s =>
                    s.name.trim().toLowerCase() === studentName.trim().toLowerCase() ||
                    (s.parentPhone && enrollStudentForm.parentPhone && s.parentPhone.replace(/\D/g, '') === enrollStudentForm.parentPhone.replace(/\D/g, ''))
                );

                if (isDuplicate) {
                    const confirmDuplicate = window.confirm("A student with this Name or Phone Number already exists. Are you sure you want to create a duplicate?");
                    if (!confirmDuplicate) {
                        setIsSubmittingEnrollment(false);
                        return;
                    }
                }

                const sRef = await addDoc(collection(db, 'students'), {
                    ...enrollStudentForm,
                    status: 'active',
                    createdAt: serverTimestamp()
                });
                finalStudentId = sRef.id;
            } else {
                // If quick enrolling existing student, fetch name
                const existingStudent = students.find(s => s.id === finalStudentId);
                if (existingStudent) studentName = existingStudent.name;
            }

            // 1.5 Generate Student Account (Auto-Provisioning)
            try {
                // NAME PARSING LOGIC FOR CUSTOM EMAIL
                const names = (studentName || '').trim().split(' ');
                const firstNameChar = names[0].charAt(0).toLowerCase();
                const lastName = names.length > 1 ? names[names.length - 1].toLowerCase() : names[0].toLowerCase();

                // Format: w.fakir@makerlab.academy
                const username = `${firstNameChar}.${lastName}`;
                const email = `${username}@makerlab.academy`;
                const password = Math.random().toString(36).slice(-6);

                // Create Auth User
                const uid = await createSecondaryUser(email, password);

                // Create User Profile Doc
                await setDoc(doc(db, 'users', uid), {
                    uid,
                    email,
                    name: studentName,
                    role: 'student',
                    status: 'active',
                    createdAt: serverTimestamp()
                });

                // Link credentials to Student Doc
                await updateDoc(doc(db, 'students', finalStudentId), {
                    loginInfo: {
                        username,
                        email,
                        initialPassword: password, // Store initially for printing cards
                        uid
                    }
                });

                // 1.6 Generate Parent Account
                if (enrollStudentForm.email) {
                    try {
                        const parentEmail = enrollStudentForm.email;
                        const parentPassword = Math.random().toString(36).slice(-8);

                        // Create Auth User
                        const parentUid = await createSecondaryUser(parentEmail, parentPassword);

                        // Create User Profile
                        await setDoc(doc(db, 'users', parentUid), {
                            uid: parentUid,
                            email: parentEmail,
                            name: enrollStudentForm.parentName || 'Parent',
                            role: 'parent',
                            status: 'active',
                            createdAt: serverTimestamp()
                        });

                        // Link to Student
                        await updateDoc(doc(db, 'students', finalStudentId), {
                            parentLoginInfo: {
                                email: parentEmail,
                                initialPassword: parentPassword,
                                uid: parentUid
                            }
                        });
                    } catch (parentErr) {
                        console.error("Failed to generate parent account:", parentErr);
                        // If email exists, we effectively skip auto-creation (manual linking required later)
                    }
                }

            } catch (e) {
                console.error("Failed to auto-generate student account:", e);
                // Proceed with enrollment even if account gen fails
            }

            // 2. Create Enrollment
            const selectedGroup = selectedGrade?.groups.find(g => g.id === enrollProgramForm.groupId);

            // Handle Second Group (DIY)
            let secondGroupData = {};
            if (enrollProgramForm.secondGroupId) {
                const diyGrade = selectedProgram?.grades.find(g => g.groups.some(grp => grp.id === enrollProgramForm.secondGroupId));
                const diyGroup = diyGrade?.groups.find(g => g.id === enrollProgramForm.secondGroupId);
                if (diyGroup) {
                    secondGroupData = {
                        secondGroupId: diyGroup.id,
                        secondGroupName: diyGroup.name,
                        secondGroupTime: `${diyGroup.day} ${diyGroup.time}`
                    };
                }
            }

            // Calculate Initial Paid Amount (Only CASH counts as cleared immediately)
            const initialCleared = enrollPayments
                .filter(p => p.method === 'cash')
                .reduce((sum, p) => sum + Number(p.amount), 0);

            const enrollmentRef = await addDoc(collection(db, 'enrollments'), {
                studentId: finalStudentId,
                studentName: studentName,
                programId: selectedProgram?.id,
                programName: selectedProgram?.name,
                packName: selectedPack?.name,
                gradeId: selectedGrade?.id,
                gradeName: selectedGrade?.name,
                groupId: selectedGroup?.id,
                groupName: selectedGroup?.name,
                groupTime: selectedGroup ? `${selectedGroup.day} ${selectedGroup.time}` : null,
                ...secondGroupData,
                paymentPlan: enrollProgramForm.paymentPlan,
                totalAmount: negotiatedPrice, // Use the Negotiated Price
                discountAmount: discountAmount > 0 ? discountAmount : 0, // Store discount
                paidAmount: initialCleared,
                balance: negotiatedPrice - initialCleared,
                status: 'active',
                startDate: new Date().toISOString(),
                session: settings.academicYear, // Tag with Current Session
                createdAt: serverTimestamp()
            });

            // 3. Record All Payments
            for (const p of enrollPayments) {
                await addDoc(collection(db, 'payments'), {
                    enrollmentId: enrollmentRef.id,
                    studentName: studentName,
                    amount: Number(p.amount),
                    date: p.date || new Date().toISOString(),
                    method: p.method,
                    checkNumber: p.checkNumber || null,
                    bankName: p.bankName || null,
                    depositDate: p.depositDate || null,
                    status: p.method === 'cash' ? 'paid' : 'check_received',
                    session: settings.academicYear,
                    createdAt: serverTimestamp()
                });
            }

            setIsEnrollmentModalOpen(false);
            showAlert("Success", "Enrollment Successful! Student account created.", "success");
        } catch (err) {
            console.error(err);
            showAlert("Error", "Error processing enrollment.", "danger");
        } finally {
            setIsSubmittingEnrollment(false);
        }
    };

    // --- SMART ENROLLMENT FROM LEAD ---
    const handleEnrollLead = (lead: Lead) => {
        // 1. Pre-fill Student Details
        setEnrollStudentForm({
            name: lead.name,
            parentName: lead.parentName,
            parentPhone: lead.phone,
            email: lead.email || '',
            birthDate: '', // Lead might not have this, leave blank
            school: '' // Lead might not have this
        });

        // 2. Pre-fill Program Details
        // Try to find the program
        // Assuming lead.programId is stored, or we match by name if needed. 
        // The Kiosk form usually saves programId if built correctly, or we infer from 'interests' if legacy.
        // But the user said "Kiosk form", so likely we have structured data. 
        // Checking lead type definition might be good, but assuming standard fields for now.
        // If the lead from Kiosk saves 'programId' and 'selectedPack' and 'selectedSlot'.

        let programId = lead.programId || '';
        let packName = lead.selectedPack || '';
        let gradeId = '';
        let groupId = '';

        // If we have a slot string like "Wednesday 14:00", try to find it in the program's structure
        if (programId && lead.selectedSlot) {
            const prog = programs.find(p => p.id === programId);
            if (prog) {
                // Try to find a group matching the slot string
                // Iterate all grades -> all groups
                for (const grade of prog.grades) {
                    const match = grade.groups.find(g =>
                        `${g.day} ${g.time}` === lead.selectedSlot ||
                        g.name === lead.selectedSlot
                    );
                    if (match) {
                        gradeId = grade.id;
                        groupId = match.id;
                        break;
                    }
                }
            }
        }

        setEnrollProgramForm({
            programId,
            packName,
            gradeId,
            groupId,
            paymentPlan: 'full', // Default, or infer if lead has it
            secondGroupId: ''
        });

        // Reset ID to ensure creating NEW student
        setQuickEnrollStudentId(null);

        // Open Modal (Preserving the data we just set)
        preserveEnrollmentFormRef.current = true;
        setIsEnrollmentModalOpen(true);
    };

    // Permission-based Module Filtering
    const modules = getEnabledModules().filter(m => !m.requiredPermission || can(m.requiredPermission));

    // Routing
    if (window.location.search.includes('mode=booking')) return <PublicBookingView />;
    if (window.location.pathname === '/enroll') return <PublicEnrollmentView />;
    if (window.location.pathname === '/parent-portal') return <ParentLoginView />;
    if (authLoading || appLoading || (user && !userProfile)) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!user) return <LoginView />;

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <DashboardView onRecordPayment={handleOpenPaymentModal} />;
            case 'students': return <StudentsView onAddStudent={() => { setQuickEnrollStudentId(null); setIsEnrollmentModalOpen(true); }} onEditStudent={(s) => navigateTo('student-details', { studentId: s.id })} onQuickEnroll={(id) => { setQuickEnrollStudentId(id || null); setIsEnrollmentModalOpen(true); }} onViewProfile={(id) => navigateTo('student-details', { studentId: id })} />;
            case 'classes': return <ClassesView onEnroll={handleEnrollFromGroup} />;
            case 'programs': return <ProgramsView onEnrollLead={handleEnrollLead} />;
            case 'finance': return <FinanceView onRecordPayment={handleOpenPaymentModal} />;
            case 'expenses': return <ExpensesView />;
            case 'tools': return <ToolsView />;
            case 'settings': return <SettingsView />;
            case 'student-details': return <StudentDetailsView onEditStudent={() => { }} onQuickEnroll={(id) => { setQuickEnrollStudentId(id); setIsEnrollmentModalOpen(true); }} onRecordPayment={(id) => handleOpenPaymentModal(id)} />;
            case 'activity-details': return <ActivityDetailsView />;
            case 'workshops': return <WorkshopsView onConvertProspect={(p) => { setQuickEnrollStudentId(null); setEnrollStudentForm({ name: p.childName, parentName: p.parentName, parentPhone: p.parentPhone, email: '', birthDate: '', school: '' }); preserveEnrollmentFormRef.current = true; setIsEnrollmentModalOpen(true); }} />;
            case 'attendance': return <AbsenceView />;
            case 'team': return <TeamView />;
            case 'marketing': return <MarketingView onEnrollLead={handleEnrollLead} />;
            case 'schedule': return <CalendarView />; // NEW
            case 'learning': return <LearningView />;
            case 'toolkit': return <ToolkitView />;
            case 'media': return <MediaView />;
            case 'portfolio': return <PortfolioView />;
            case 'review': return <ReviewView />;
            case 'pickup': return <PickupView />;
            case 'parent-dashboard': return <ParentDashboardView />;
            case 'test-design': return <TestDesignView />;
            case 'test-wizard': return <TestWizardView />;
            case 'arcade-mgr': return <ArcadeManagerView />;
            case 'communications': return <CommunicationsView />;
            case 'enrollment-forms': return <EnrollmentFormsView onEnrollLead={handleEnrollLead} />;
            default: return <DashboardView onRecordPayment={handleOpenPaymentModal} />;
        }
    };

    // --- PARENT LAYOUT ---
    if (isParent) {
        return (
            <div className="min-h-[100dvh] bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/30">
                <ParentDashboardView />
            </div>
        );
    }

    // --- STUDENT LAYOUT ---
    if (isStudent) {
        return (
            <div className="flex h-[100dvh] bg-slate-100 font-spark overflow-hidden selection:bg-blue-200 selection:text-blue-900">
                {/* Desktop Sidebar (SparkQuest Themed) */}
                <aside className="hidden md:flex w-72 bg-white flex-col text-slate-600 shrink-0 m-4 rounded-[2.5rem] relative z-20 shadow-xl border-b-[8px] border-slate-200 overflow-hidden">
                    {/* Brand / Profile */}
                    <div className="p-8 pb-4 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 p-1 mb-4 shadow-lg animate-float">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl font-black text-indigo-600 border-4 border-white/50">
                                {userProfile?.name?.charAt(0) || 'S'}
                            </div>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 text-center">{userProfile?.name}</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Student Explorer</span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
                        {[
                            { id: 'dashboard', icon: Home, label: 'Lobby' },
                            { id: 'learning', icon: BookOpen, label: 'Studio' },
                            { id: 'portfolio', icon: Trophy, label: 'Portfolio' },
                            { id: 'media', icon: Camera, label: 'Gallery' },
                            { id: 'test-wizard', icon: Sparkles, label: 'New Project (Test)' },
                        ].map(item => {
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => navigateTo(item.id as ViewState)}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all relative group font-bold ${isActive
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105 btn-3d'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <item.icon size={24} strokeWidth={isActive ? 3 : 2.5} className="shrink-0" />
                                    <span className="truncate text-lg">{item.label}</span>
                                </button>
                            );
                        })}

                    </nav>

                    {/* Bottom Actions */}
                    <div className="p-6 mt-auto space-y-2">
                        <button onClick={() => navigateTo('settings')} className="w-full flex items-center gap-3 px-6 py-3 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold">
                            <Settings size={20} /> Settings
                        </button>
                        <button onClick={signOut} className="w-full flex items-center gap-3 px-6 py-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm font-bold">
                            <LogOut size={20} /> Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Mobile Header (SparkQuest Themed) */}
                    <header className="md:hidden p-4 flex justify-between items-center bg-white text-slate-800 shrink-0 z-30 shadow-sm mx-4 mt-4 rounded-2xl border-b-4 border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-black shadow-md">
                                {settings.academyName.charAt(0)}
                            </div>
                            <span className="font-black text-lg tracking-tight">{settings.academyName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationDropdown />
                            <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={24} /></button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32 md:pb-8">
                        <div className="max-w-7xl mx-auto h-full flex flex-col">
                            {/* View Container with SparkQuest Style */}
                            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 flex-1 border-white border shadow-sm">
                                {renderView()}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Bottom Dock (Hidden on Desktop) */}
                    <div className="md:hidden">
                        <StudentNavigation currentView={currentView} navigateTo={navigateTo} theme={studentTheme} signOut={signOut} userProfile={userProfile} />
                    </div>
                </main>
            </div>
        );
    }


    // --- LAYOUT SELECTION ---
    const Layout = isInstructor ? InstructorLayout : AdminLayout;

    return (
        <Layout>
            {renderView()}

            {/* --- GLOBAL PAYMENT MODAL --- */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Payment" size="md">
                {/* ... (Payment Modal Content - No Changes) ... */}
                <form onSubmit={handleSubmitPayment} className="space-y-5">

                    {/* Student Selector (Combobox) */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Select Student & Program</label>
                        {paymentForm.studentId && paymentForm.enrollmentId ? (
                            <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <div>
                                    <div className="text-white font-bold text-sm">{enrollments.find(e => e.id === paymentForm.enrollmentId)?.studentName}</div>
                                    <div className="text-xs text-slate-400">{enrollments.find(e => e.id === paymentForm.enrollmentId)?.programName}</div>
                                </div>
                                <button type="button" onClick={() => setPaymentForm({ ...paymentForm, studentId: '', enrollmentId: '' })} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Change</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none"
                                    placeholder="Search active student..."
                                    value={paymentSearchQuery}
                                    onChange={(e) => { setPaymentSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                />
                                {isDropdownOpen && paymentSearchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 custom-scrollbar">
                                        {enrollments
                                            .filter(e => {
                                                if (e.status !== 'active') return false;
                                                const student = students.find(s => s.id === e.studentId);
                                                if (!student || student.status === 'inactive') return false;

                                                return e.studentName.toLowerCase().includes(paymentSearchQuery.toLowerCase());
                                            })
                                            .map(enrollment => (
                                                <button
                                                    key={enrollment.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setPaymentForm({ ...paymentForm, studentId: enrollment.studentId, enrollmentId: enrollment.id, amount: enrollment.balance });
                                                        setIsDropdownOpen(false);
                                                        setPaymentSearchQuery('');
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-none"
                                                >
                                                    <div className="font-bold text-white text-sm">{enrollment.studentName}</div>
                                                    <div className="flex justify-between text-xs text-slate-400">
                                                        <span>{enrollment.programName}</span>
                                                        <span className={enrollment.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}>Due: {formatCurrency(enrollment.balance)}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        {enrollments.filter(e => e.status === 'active' && e.studentName.toLowerCase().includes(paymentSearchQuery.toLowerCase())).length === 0 && (
                                            <div className="p-3 text-slate-500 text-xs text-center">No active enrollments found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Payment Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Amount (MAD)</label>
                            <input required type="number" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold text-lg focus:border-emerald-500 outline-none" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                            <input required type="date" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['cash', 'check', 'virement'].map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setPaymentForm({ ...paymentForm, method: m as any })}
                                    className={`py-2 rounded-lg text-xs font-bold capitalize border transition-all ${paymentForm.method === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                                >
                                    {m === 'virement' ? 'Transfer' : m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Method Specific Fields */}
                    {paymentForm.method === 'check' && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Check No.</label><input className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" value={paymentForm.checkNumber} onChange={e => setPaymentForm({ ...paymentForm, checkNumber: e.target.value })} placeholder="e.g. 739201" /></div>
                                <div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Bank</label><input className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" value={paymentForm.bankName} onChange={e => setPaymentForm({ ...paymentForm, bankName: e.target.value })} placeholder="e.g. BMCE" /></div>
                            </div>
                            <div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Deposit Date (Encaissement)</label><input type="date" className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" value={paymentForm.depositDate} onChange={e => setPaymentForm({ ...paymentForm, depositDate: e.target.value })} /></div>
                        </div>
                    )}

                    {paymentForm.method === 'virement' && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 animate-in slide-in-from-top-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Proof of Transfer (Screenshot)</label>
                                <div className="flex items-center gap-3">
                                    <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors">
                                        <Upload size={14} /> Upload Image
                                        <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                                    </label>
                                    {paymentForm.proofUrl && (
                                        <div className="text-emerald-400 text-xs flex items-center gap-1"><ImageIcon size={14} /> Image Attached</div>
                                    )}
                                </div>
                                {paymentForm.proofUrl && (
                                    <div className="mt-2 w-full h-24 bg-slate-900 rounded border border-slate-800 overflow-hidden">
                                        <img src={paymentForm.proofUrl} className="w-full h-full object-cover" alt="Proof" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-900/30 flex gap-3 items-start">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-200/80">
                            {paymentForm.method === 'cash'
                                ? "Cash payments are immediately marked as PAID and will update the student's balance."
                                : paymentForm.method === 'check'
                                    ? "Checks are recorded as RECEIVED. Balance updates only after the check clears (Encaissé)."
                                    : "Transfers are recorded as PENDING. Verify the transfer in dashboard to update balance."
                            }
                        </p>
                    </div>

                    <button type="submit" disabled={isSubmittingPayment} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        {isSubmittingPayment ? 'Processing...' : 'Confirm Payment'}
                    </button>
                </form>
            </Modal>

            {/* --- ENROLLMENT WIZARD MODAL (Enhanced) --- */}
            <Modal isOpen={isEnrollmentModalOpen} onClose={() => setIsEnrollmentModalOpen(false)} title="Student Enrollment" size="lg">
                {/* ... (Enrollment Modal Content - No Changes) ... */}
                <div className="flex flex-col h-full">
                    {/* Wizard Steps Header */}
                    <div className="flex items-center justify-between mb-6 px-4">
                        <div className={`flex-1 text-center border-b-2 pb-2 ${enrollmentStep >= 1 ? 'border-blue-500 text-blue-400 font-bold' : 'border-slate-800 text-slate-600'}`}>1. Student</div>
                        <div className={`flex-1 text-center border-b-2 pb-2 ${enrollmentStep >= 2 ? 'border-blue-500 text-blue-400 font-bold' : 'border-slate-800 text-slate-600'}`}>2. Program</div>
                        <div className={`flex-1 text-center border-b-2 pb-2 ${enrollmentStep >= 3 ? 'border-blue-500 text-blue-400 font-bold' : 'border-slate-800 text-slate-600'}`}>3. Payments</div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-1">
                        {/* STEP 1: STUDENT INFO */}
                        {enrollmentStep === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs text-slate-400 block mb-1 font-semibold">Full Name *</label><input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollStudentForm.name} onChange={e => setEnrollStudentForm({ ...enrollStudentForm, name: e.target.value })} /></div>
                                    <div><label className="text-xs text-slate-400 block mb-1 font-semibold">Parent Phone *</label><input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollStudentForm.parentPhone} onChange={e => setEnrollStudentForm({ ...enrollStudentForm, parentPhone: e.target.value })} /></div>
                                    <div><label className="text-xs text-slate-400 block mb-1 font-semibold">Date of Birth</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollStudentForm.birthDate} onChange={e => setEnrollStudentForm({ ...enrollStudentForm, birthDate: e.target.value })} /></div>
                                    <div><label className="text-xs text-slate-400 block mb-1 font-semibold">School</label><input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollStudentForm.school} onChange={e => setEnrollStudentForm({ ...enrollStudentForm, school: e.target.value })} /></div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PROGRAM SELECTION */}
                        {enrollmentStep === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Select Program</label>
                                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollProgramForm.programId} onChange={e => setEnrollProgramForm({ ...enrollProgramForm, programId: e.target.value, packName: '', gradeId: '', groupId: '' })}>
                                        <option value="">-- Choose Program --</option>
                                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                {selectedProgram && (
                                    <>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1 font-semibold">Select Pack</label>
                                            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollProgramForm.packName} onChange={e => setEnrollProgramForm({ ...enrollProgramForm, packName: e.target.value })}>
                                                <option value="">-- Choose Pack --</option>
                                                {selectedProgram.packs.map(p => <option key={p.name} value={p.name}>{p.name} - {formatCurrency(p.price || p.priceAnnual || 0)}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1 font-semibold">Level / Grade</label>
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollProgramForm.gradeId} onChange={e => setEnrollProgramForm({ ...enrollProgramForm, gradeId: e.target.value, groupId: '' })}>
                                                    <option value="">-- Choose Level --</option>
                                                    {selectedProgram.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1 font-semibold">Group / Time</label>
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollProgramForm.groupId} onChange={e => setEnrollProgramForm({ ...enrollProgramForm, groupId: e.target.value })}>
                                                    <option value="">-- Choose Group --</option>
                                                    {selectedGrade?.groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.day} {g.time})</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Secondary / DIY Slot Selection */}
                                        <div className="pt-4 border-t border-slate-800 mt-2">
                                            <label className="text-xs text-slate-400 block mb-1 font-semibold">Secondary Workshop (DIY) - Optional</label>
                                            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={enrollProgramForm.secondGroupId} onChange={e => setEnrollProgramForm({ ...enrollProgramForm, secondGroupId: e.target.value })}>
                                                <option value="">-- None --</option>
                                                {selectedProgram.grades.flatMap(g => g.groups).map(g => (
                                                    <option key={g.id} value={g.id}>{g.name} ({g.day} {g.time})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* STEP 3: PAYMENT (Multi-Entry + Negotiated Price) */}
                        {enrollmentStep === 3 && (
                            <div className="space-y-4">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 space-y-3">
                                    {/* Price Negotiation Field */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Final Negotiated Price (MAD)</label>
                                            {discountAmount > 0 && (
                                                <span className="bg-emerald-950/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-900/50 flex items-center gap-1">
                                                    <TrendingDown size={10} /> Discount Applied: -{formatCurrency(discountAmount)} ({discountPercent}%)
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold text-lg focus:border-blue-500 outline-none hover:border-slate-700 transition-colors"
                                            value={negotiatedPrice}
                                            onChange={e => setNegotiatedPrice(Number(e.target.value))}
                                        />
                                        {standardTuition !== negotiatedPrice && (
                                            <div className="text-xs text-slate-500 mt-1 text-right">
                                                Standard Price: <span className="line-through">{formatCurrency(standardTuition)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-800"></div>

                                    <div className="flex justify-between text-sm text-emerald-400 font-bold mb-1">
                                        <span>Total Paying Now</span>
                                        <span>{formatCurrency(totalPayingNow)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Remaining Balance</span>
                                        <span className={`${remainingBalance > 0 ? 'text-red-400' : 'text-slate-500'} font-bold`}>{formatCurrency(remainingBalance)}</span>
                                    </div>
                                </div>

                                {/* Payment List */}
                                {enrollPayments.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Payments to Record</label>
                                        {enrollPayments.map((p, idx) => (
                                            <div key={p.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-sm shadow-sm">
                                                <div>
                                                    <div className="font-bold text-slate-200">{formatCurrency(p.amount)} <span className="text-slate-500 font-normal text-xs capitalize">via {p.method}</span></div>
                                                    {p.method === 'check' && <div className="text-[10px] text-slate-500">Check #{p.checkNumber} • Deposit: {p.depositDate}</div>}
                                                </div>
                                                <button onClick={() => handleRemoveEnrollmentPayment(p.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Payment Form */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                                    <div className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2"><Plus size={12} /> Add Payment</div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[10px] text-slate-500 block mb-1 font-semibold">Amount</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm font-bold focus:border-blue-500 outline-none" value={currentEnrollPayment.amount} onChange={e => setCurrentEnrollPayment({ ...currentEnrollPayment, amount: e.target.value })} placeholder="0.00" /></div>
                                            <div><label className="text-[10px] text-slate-500 block mb-1 font-semibold">Method</label><select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" value={currentEnrollPayment.method} onChange={e => setCurrentEnrollPayment({ ...currentEnrollPayment, method: e.target.value })}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Bank Transfer</option></select></div>
                                        </div>

                                        {currentEnrollPayment.method === 'check' && (
                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 animate-in slide-in-from-top-1 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><input className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:bg-slate-800 focus:border-blue-500 outline-none transition-colors" placeholder="Check No." value={currentEnrollPayment.checkNumber} onChange={e => setCurrentEnrollPayment({ ...currentEnrollPayment, checkNumber: e.target.value })} /></div>
                                                    <div><input className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:bg-slate-800 focus:border-blue-500 outline-none transition-colors" placeholder="Bank Name" value={currentEnrollPayment.bankName} onChange={e => setCurrentEnrollPayment({ ...currentEnrollPayment, bankName: e.target.value })} /></div>
                                                </div>
                                                <div><label className="text-[10px] text-slate-500 block mb-1">Deposit Date</label><input type="date" className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:bg-slate-800 focus:border-blue-500 outline-none transition-colors" value={currentEnrollPayment.depositDate} onChange={e => setCurrentEnrollPayment({ ...currentEnrollPayment, depositDate: e.target.value })} /></div>
                                            </div>
                                        )}

                                        <button onClick={handleAddEnrollmentPayment} disabled={!currentEnrollPayment.amount} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-md">Add to List</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Wizard Footer */}
                    <div className="flex justify-between pt-4 border-t border-slate-800 mt-4">
                        {enrollmentStep > 1 ? (
                            <button onClick={() => setEnrollmentStep(s => s - 1)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Back</button>
                        ) : (
                            <button onClick={() => setIsEnrollmentModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                        )}

                        {enrollmentStep < 3 ? (
                            <button
                                onClick={() => {
                                    if (enrollmentStep === 1 && !enrollStudentForm.name && !quickEnrollStudentId) return showAlert("Validation Error", "Name is required", "warning");
                                    if (enrollmentStep === 2 && !enrollProgramForm.programId) return showAlert("Validation Error", "Program is required", "warning");
                                    setEnrollmentStep(s => s + 1);
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                            >
                                Next Step <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishEnrollment}
                                disabled={isSubmittingEnrollment}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                            >
                                {isSubmittingEnrollment ? 'Processing...' : 'Confirm Enrollment'} <CheckCircle2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

        </Layout>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <ConfirmProvider>
                <NotificationProvider>
                    <AppProvider>
                        <ThemeProvider>
                            <AppContent />
                        </ThemeProvider>
                    </AppProvider>
                </NotificationProvider>
            </ConfirmProvider>
        </AuthProvider>
    );
};

export default App;
