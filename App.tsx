
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
import { FinanceView, computeAcademicYear } from './views/FinanceView';
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
import { ArchiveView } from './views/ArchiveView';
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
import { StaffAbsenceView } from './views/StaffAbsenceView';
import { ParentLoginView } from './views/ParentLoginView';
import { LandingView } from './views/website/LandingView';
import { WorkshopQualityView } from './views/WorkshopQualityView';
import { SaasAdminView } from './views/SaasAdminView';
import { AppStoreView } from './views/AppStoreView';
import { AppDetailsView } from './views/AppDetailsView';
import { getAppById } from './services/appRegistry';
import { Modal } from './components/Modal';
import { Logo } from './components/Logo';
import { NotificationDropdown } from './components/NotificationDropdown';

import { addDoc, collection, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { formatCurrency, compressImage, calculateAge, normalizePhone } from './utils/helpers';
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
    const { currentView, navigateTo, viewParams, loading: appLoading, settings, students, programs, enrollments, payments, t } = useAppContext();
    const { user, signOut, can, loading: authLoading, userProfile, createSecondaryUser, currentOrganization, isSuperAdmin } = useAuth();
    const { requestPermission } = useNotifications();
    const { alert: showAlert } = useConfirm();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- ROUTING STATE ---
    const [locationHash, setLocationHash] = useState(window.location.hash);
    const [locationPath, setLocationPath] = useState(window.location.pathname);

    useEffect(() => {
        const handleLocationChange = () => {
            setLocationHash(window.location.hash);
            setLocationPath(window.location.pathname);
        };
        window.addEventListener('hashchange', handleLocationChange);
        window.addEventListener('popstate', handleLocationChange);
        return () => {
            window.removeEventListener('hashchange', handleLocationChange);
            window.removeEventListener('popstate', handleLocationChange);
        };
    }, []);


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

    // Parent Bulk Payment States
    const [paymentMode, setPaymentMode] = useState<'individual' | 'parent'>('individual');
    const [parentPaymentSearchQuery, setParentPaymentSearchQuery] = useState('');
    const [selectedParentAccount, setSelectedParentAccount] = useState<any>(null);
    const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);

    const parentAccounts = useMemo(() => {
        const map = new Map<string, {
            phone: string;
            parentName: string;
            children: { student: any; enrollment: any }[];
            totalBalance: number;
            totalPaid: number;
            totalExpected: number;
        }>();

        enrollments.forEach(e => {
            if (e.status !== 'active') return;
            const student = students.find(s => s.id === e.studentId);
            if (!student || student.status === 'inactive') return;

            const phoneStr = normalizePhone(student.parentPhone || '');
            const key = phoneStr || `solo-${e.id}`;

            if (!map.has(key)) {
                map.set(key, {
                    phone: phoneStr,
                    parentName: student.parentName || 'Unknown Parent',
                    children: [],
                    totalBalance: 0,
                    totalPaid: 0,
                    totalExpected: 0
                });
            }

            const entry = map.get(key)!;
            entry.children.push({ student, enrollment: e });
            entry.totalBalance += (e.balance || 0);
            entry.totalPaid += (e.paidAmount || 0);
            entry.totalExpected += (e.totalAmount || 0);
        });

        return Array.from(map.values()).sort((a, b) => b.totalBalance - a.totalBalance);
    }, [enrollments, students]);

    // --- SAAS ROUTE GUARD ---
    // Fixes issue where logging out from Super Admin (on saas-admin view) 
    // and logging in as Org Admin keeps the restricted view active.
    useEffect(() => {
        if (!authLoading && !appLoading && userProfile) {
            // Guard SaaS Admin View
            if (currentView === 'saas-admin' && !isSuperAdmin) {
                console.warn("Unauthorized access to SaaS Admin. Redirecting to Dashboard.");
                navigateTo('dashboard');
            }
        }
    }, [currentView, isSuperAdmin, authLoading, appLoading, userProfile]);

    // --- ONE-TIME AUTO-REPAIR FOR MISMATCHED PAYMENT DOCUMENTS ---
    useEffect(() => {
        if (!authLoading && !appLoading && userProfile && (userProfile.role === 'admin' || isSuperAdmin) && db && payments.length > 0) {
            const runMigration = async () => {
                if (!db) return;
                if ((window as any).__paymentsMigrated) return;
                (window as any).__paymentsMigrated = true;
                
                const mismatched = payments.filter(p => p.method === 'virement' && p.status === 'check_received');
                if (mismatched.length === 0) return;
                
                console.log(`[Migration] Found ${mismatched.length} mismatched virement payments. Repairing...`);
                for (const p of mismatched) {
                    try {
                        await updateDoc(doc(db, 'payments', p.id), {
                            status: 'pending_verification'
                        });
                        console.log(`[Migration] Successfully repaired payment ${p.id}`);
                    } catch (err) {
                        console.error(`[Migration] Failed to repair payment ${p.id}:`, err);
                    }
                }
            };
            runMigration();
        }
    }, [authLoading, appLoading, userProfile, isSuperAdmin, payments]);

    // --- DYNAMIC TITLE UPDATE ---
    useEffect(() => {
        if (settings.academyName) {
            document.title = settings.academyName;
        }
    }, [settings.academyName]);

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
    
    // Payment Promises (Contracts) State
    const [enrollPaymentPromises, setEnrollPaymentPromises] = useState<{ month: string; amount: string; id: number }[]>([]);
    const [currentPromise, setCurrentPromise] = useState({ month: new Date().toISOString().slice(0, 7), amount: '' });

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
            setEnrollPaymentPromises([]);
            setCurrentPromise({ month: new Date().toISOString().slice(0, 7), amount: '' });

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

    const handlePrintParentPaymentReceipt = (account: any, appliedPayments: any[], totalAmount: number, method: string, date: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert("Warning", "Please allow popups to print receipts.", "warning");
            return;
        }

        const logoHtml = settings?.logoUrl
            ? `<div class="logo-container"><img src="${settings.logoUrl}" alt="Logo" /></div>`
            : `<div class="logo-placeholder">${settings?.academyName?.charAt(0) || 'M'}</div>`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Parent Payment Receipt - ${account.parentName || 'Parent'}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
                <style>
                    @media print {
                        @page { margin: 20mm; size: A4; }
                        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .container { border: none !important; box-shadow: none !important; padding: 0 !important; }
                    }
                    body { font-family: 'Inter', sans-serif; color: #0f172a; background: #f8fafc; padding: 40px 0; margin: 0; }
                    .container { max-width: 650px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
                    .logo-container img { height: 60px; width: auto; object-fit: contain; }
                    .logo-placeholder { width: 50px; height: 50px; background: #2563eb; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; }
                    .company-details { margin-top: 10px; }
                    .company-name { font-size: 18px; font-weight: 700; }
                    .company-meta { font-size: 12px; color: #64748b; }
                    .title-area { text-align: right; }
                    .title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 5px 0; color: #10b981; }
                    .subtitle { font-size: 12px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .info-group { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px; }
                    .info-val { font-size: 14px; font-weight: 600; }
                    .data-table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
                    .data-table th { font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; }
                    .data-table td { font-size: 13px; padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    .text-right { text-align: right; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    .totals-section { display: flex; flex-direction: column; align-items: flex-end; margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 15px; }
                    .totals-row { display: flex; justify-content: space-between; width: 260px; margin-bottom: 8px; font-size: 13px; }
                    .totals-label { color: #64748b; }
                    .totals-val { font-weight: 600; font-family: 'JetBrains Mono', monospace; }
                    .grand-total { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
                    .grand-total .totals-label { font-size: 15px; font-weight: 700; color: #0f172a; }
                    .grand-total .totals-val { font-size: 20px; font-weight: 800; color: #2563eb; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div>
                            ${logoHtml}
                            <div class="company-details">
                                <div class="company-name">${settings?.academyName || 'MakerLab Academy'}</div>
                                <div class="company-meta">${settings?.academicYear || 'Current Year'}</div>
                            </div>
                        </div>
                        <div class="title-area">
                            <h1 class="title">Receipt of Payment</h1>
                            <div class="subtitle">DATE: ${new Date(date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-group">
                            <div class="info-label">Bill To / Parent</div>
                            <div class="info-val">${account.parentName || 'Parent Account'}</div>
                            <div style="font-size:12px; color:#64748b; margin-top:4px;">Phone: ${account.phone || 'N/A'}</div>
                        </div>
                        <div class="info-group">
                            <div class="info-label">Payment Mode & Status</div>
                            <div class="info-val" style="text-transform: capitalize;">${method}</div>
                            <div style="font-size:12px; color:#64748b; margin-top:4px;">Status: Approved / Paid</div>
                        </div>
                    </div>

                    <div class="section-title" style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 30px; margin-bottom: 15px;">Payment Distribution</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Child</th>
                                <th>Program</th>
                                <th class="text-right">Amount Applied</th>
                                <th class="text-right">Remaining Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${appliedPayments.map((p: any) => {
                                const child = account.children.find((c: any) => c.enrollment.id === p.enrollmentId);
                                return `
                                    <tr>
                                        <td style="font-weight:600;">${child?.student.name || p.studentName}</td>
                                        <td>${child?.enrollment.programName || 'Program'}</td>
                                        <td class="text-right font-mono" style="color:#10b981; font-weight:600;">${formatCurrency(p.amount)}</td>
                                        <td class="text-right font-mono">${formatCurrency(child ? Math.max(0, (child.enrollment.balance || 0) - p.amount) : 0)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="totals-row grand-total">
                            <span class="totals-label">Total Amount Paid:</span>
                            <span class="totals-val">${formatCurrency(totalAmount)}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <div>${settings?.receiptFooter || ''}</div>
                        <div>${settings?.receiptContact || ''}</div>
                        <div style="margin-top:10px; font-size:9px; color:#cbd5e1;">Generated electronically on ${new Date().toLocaleString()}</div>
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;

        if (paymentMode === 'parent') {
            if (!selectedParentAccount) { showAlert("Validation Error", "Please select a parent account", "warning"); return; }
            const amountPaid = Number(paymentForm.amount);
            if (isNaN(amountPaid) || amountPaid <= 0) { showAlert("Validation Error", "Please enter a valid payment amount", "warning"); return; }

            setIsSubmittingPayment(true);
            try {
                let status = 'paid';
                if (paymentForm.method === 'check') status = 'check_received';
                if (paymentForm.method === 'virement') status = 'pending_verification';

                let remainingToDistribute = amountPaid;
                const childrenWithBalance = [...selectedParentAccount.children]
                    .filter((c: any) => (c.enrollment.balance || 0) > 0)
                    .sort((a, b) => new Date(a.enrollment.createdAt || 0).getTime() - new Date(b.enrollment.createdAt || 0).getTime());

                const createdPayments: any[] = [];

                for (const child of childrenWithBalance) {
                    if (remainingToDistribute <= 0) break;
                    const owed = child.enrollment.balance || 0;
                    const applied = Math.min(owed, remainingToDistribute);

                    const docRef = await addDoc(collection(db, 'payments'), {
                        enrollmentId: child.enrollment.id,
                        studentName: child.enrollment.studentName,
                        amount: applied,
                        date: paymentForm.date,
                        method: paymentForm.method,
                        status: status,
                        organizationId: child.enrollment.organizationId || currentOrganization?.id || 'makerlab-academy',
                        checkNumber: paymentForm.method === 'check' ? paymentForm.checkNumber : null,
                        bankName: paymentForm.method === 'check' ? paymentForm.bankName : null,
                        depositDate: paymentForm.method === 'check' ? paymentForm.depositDate : null,
                        proofUrl: paymentForm.method === 'virement' ? paymentForm.proofUrl : null,
                        session: computeAcademicYear(new Date(paymentForm.date)),
                        createdAt: serverTimestamp()
                    });

                    createdPayments.push({
                        id: docRef.id,
                        enrollmentId: child.enrollment.id,
                        studentName: child.enrollment.studentName,
                        amount: applied
                    });

                    if (status === 'paid') {
                        const newPaid = (child.enrollment.paidAmount || 0) + applied;
                        const newBalance = (child.enrollment.totalAmount || 0) - newPaid;
                        await updateDoc(doc(db, 'enrollments', child.enrollment.id), {
                            paidAmount: newPaid,
                            balance: newBalance
                        });
                    }

                    remainingToDistribute -= applied;
                }

                // Apply remaining to first child if overpaid
                if (remainingToDistribute > 0 && selectedParentAccount.children.length > 0) {
                    const child = selectedParentAccount.children[0];
                    const docRef = await addDoc(collection(db, 'payments'), {
                        enrollmentId: child.enrollment.id,
                        studentName: child.enrollment.studentName,
                        amount: remainingToDistribute,
                        date: paymentForm.date,
                        method: paymentForm.method,
                        status: status,
                        organizationId: child.enrollment.organizationId || currentOrganization?.id || 'makerlab-academy',
                        checkNumber: paymentForm.method === 'check' ? paymentForm.checkNumber : null,
                        bankName: paymentForm.method === 'check' ? paymentForm.bankName : null,
                        depositDate: paymentForm.method === 'check' ? paymentForm.depositDate : null,
                        proofUrl: paymentForm.method === 'virement' ? paymentForm.proofUrl : null,
                        session: computeAcademicYear(new Date(paymentForm.date)),
                        createdAt: serverTimestamp()
                    });

                    createdPayments.push({
                        id: docRef.id,
                        enrollmentId: child.enrollment.id,
                        studentName: child.enrollment.studentName,
                        amount: remainingToDistribute
                    });

                    if (status === 'paid') {
                        const newPaid = (child.enrollment.paidAmount || 0) + remainingToDistribute;
                        const newBalance = (child.enrollment.totalAmount || 0) - newPaid;
                        await updateDoc(doc(db, 'enrollments', child.enrollment.id), {
                            paidAmount: newPaid,
                            balance: newBalance
                        });
                    }
                }

                setIsPaymentModalOpen(false);
                setPaymentForm(prev => ({ ...prev, amount: 0, checkNumber: '', bankName: '', depositDate: '', proofUrl: '' }));
                setParentPaymentSearchQuery('');
                setSelectedParentAccount(null);
                
                showAlert("Success", "Parent bulk payment recorded successfully!", "success");

                // Auto Print Receipt
                handlePrintParentPaymentReceipt(selectedParentAccount, createdPayments, amountPaid, paymentForm.method, paymentForm.date);
            } catch (err) {
                console.error("Failed to record parent payment:", err);
                showAlert("Error", "Failed to record parent payment", "danger");
            } finally {
                setIsSubmittingPayment(false);
            }
            return;
        }

        // Original Individual Payment Logic
        if (!paymentForm.enrollmentId) { showAlert("Validation Error", "Please select a student/enrollment", "warning"); return; }
        setIsSubmittingPayment(true);
        try {
            const enrollment = enrollments.find(e => e.id === paymentForm.enrollmentId);
            if (!enrollment) throw new Error("Enrollment not found");

            let status = 'paid';
            if (paymentForm.method === 'check') status = 'check_received';
            if (paymentForm.method === 'virement') status = 'pending_verification';

            await addDoc(collection(db, 'payments'), {
                enrollmentId: paymentForm.enrollmentId,
                studentName: enrollment.studentName,
                amount: Number(paymentForm.amount),
                date: paymentForm.date,
                method: paymentForm.method,
                status: status,
                organizationId: enrollment.organizationId || currentOrganization?.id || 'makerlab-academy',
                checkNumber: paymentForm.method === 'check' ? paymentForm.checkNumber : null,
                bankName: paymentForm.method === 'check' ? paymentForm.bankName : null,
                depositDate: paymentForm.method === 'check' ? paymentForm.depositDate : null,
                proofUrl: paymentForm.method === 'virement' ? paymentForm.proofUrl : null,
                session: computeAcademicYear(new Date(paymentForm.date)),
                createdAt: serverTimestamp()
            });

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

    const handleAddPromise = () => {
        if (!currentPromise.amount || Number(currentPromise.amount) <= 0 || !currentPromise.month) return;
        setEnrollPaymentPromises([...enrollPaymentPromises, { ...currentPromise, id: Date.now() }]);
        setCurrentPromise({ month: new Date().toISOString().slice(0, 7), amount: '' });
    };

    const handleRemovePromise = (id: number) => {
        setEnrollPaymentPromises(enrollPaymentPromises.filter(p => p.id !== id));
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
                    ...enrollStudentForm,
                    status: 'active',
                    organizationId: currentOrganization?.id || 'makerlab-academy', // SaaS Fix
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

                // Format: w.fakir@slug.edu
                const domain = currentOrganization?.slug ? `${currentOrganization.slug}.edu` : 'makerlab.academy';
                const username = `${firstNameChar}.${lastName}`;
                const email = `${username}@${domain}`;
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
                    organizationId: currentOrganization?.id || null, // FIX: Ensure SaaS Access
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
                            organizationId: currentOrganization?.id || null, // FIX: Ensure SaaS Access
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
                paymentPromises: enrollPaymentPromises.map(p => ({ month: p.month, amount: Number(p.amount) })),
                status: 'active',
                startDate: new Date().toISOString(),
                // Auto-detect session from enrollment date (Sept-June rule)
                session: computeAcademicYear(new Date()),
                organizationId: currentOrganization?.id || 'makerlab-academy', // SaaS Fix
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
                    status: p.method === 'cash' ? 'paid' : p.method === 'virement' ? 'pending_verification' : 'check_received',
                    // Use payment date to determine session, not the admin's current setting
                    session: computeAcademicYear(new Date(p.date || new Date().toISOString())),
                    organizationId: currentOrganization?.id || 'makerlab-academy', // SaaS Fix
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
    if (locationPath.includes('mode=booking') || window.location.search.includes('mode=booking')) return <PublicBookingView />;
    if (locationPath === '/enroll') return <PublicEnrollmentView />;
    if (locationPath === '/parent-portal' || locationHash === '#parent') return <ParentLoginView />;

    if (authLoading || appLoading || (user && !userProfile)) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    if (!user) {
        if (locationHash === '#login' || locationPath === '/login') return <LoginView />;
        if (locationHash === '#signup') return <LoginView />; // LoginView handles toggle inside, or we can pass prop if needed
        return <LandingView />;
    }

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
            case 'staff-attendance': return <StaffAbsenceView />;
            case 'marketing': return <MarketingView onEnrollLead={handleEnrollLead} />;
            case 'schedule': return <CalendarView />; // NEW

            // SAAS GUARDED ROUTES
            case 'learning': return userProfile?.role === 'student' || currentOrganization?.modules?.makerPro ? <LearningView /> : <DashboardView onRecordPayment={handleOpenPaymentModal} />; // Fallback to Dashboard if disabled
            case 'toolkit': return <ToolkitView />;
            case 'archive': return <ArchiveView />;
            case 'media': return <MediaView />;
            case 'portfolio': return userProfile?.role === 'student' || currentOrganization?.modules?.makerPro ? <PortfolioView /> : <DashboardView onRecordPayment={handleOpenPaymentModal} />;
            case 'review': return <ReviewView />;
            case 'pickup': return <PickupView />;
            case 'parent-dashboard': return <ParentDashboardView />;
            case 'test-design': return <TestDesignView />;
            case 'test-wizard': return <TestWizardView />;
            case 'arcade-mgr': return <ArcadeManagerView />;
            case 'communications': return <CommunicationsView />;
            case 'enrollment-forms': return <EnrollmentFormsView onEnrollLead={handleEnrollLead} />;
            case 'saas-admin': return <SaasAdminView />;
            case 'app-store': return <AppStoreView />;
            case 'app-details': return <AppDetailsView />;
            case 'workshop-quality': return <WorkshopQualityView />;
            case 'saas-app': {
                const appId = viewParams?.appId;
                if (!appId) return <div>App ID missing</div>;
                const app = getAppById(appId);
                if (!app) return <div>App not found</div>;
                const Component = app.component;
                return <Component />;
            }
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

                    {/* Payment Mode Selector */}
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                setPaymentMode('individual');
                                setPaymentForm(prev => ({ ...prev, studentId: '', enrollmentId: '', amount: 0 }));
                                setSelectedParentAccount(null);
                            }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${paymentMode === 'individual' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Individual Student
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setPaymentMode('parent');
                                setPaymentForm(prev => ({ ...prev, studentId: '', enrollmentId: '', amount: 0 }));
                                setSelectedParentAccount(null);
                            }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${paymentMode === 'parent' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Parent Account (Family)
                        </button>
                    </div>

                    {/* Student Selector (Combobox) */}
                    {paymentMode === 'individual' && (
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
                    )}

                    {/* Parent Account Selector */}
                    {paymentMode === 'parent' && (
                        <div className="relative">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Select Parent Account</label>
                            {selectedParentAccount ? (
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-white font-bold text-sm flex items-center gap-1.5">
                                                <Users size={16} className="text-blue-450" />
                                                {selectedParentAccount.parentName || 'Parent Account'}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">Phone: {selectedParentAccount.phone || 'No phone'}</div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setSelectedParentAccount(null);
                                                setPaymentForm(prev => ({ ...prev, amount: 0 }));
                                            }} 
                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    
                                    <div className="border-t border-slate-900 pt-2 space-y-1.5">
                                        {selectedParentAccount.children.map((c: any, i: number) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-slate-400 font-medium">{c.student.name} <span className="text-[10px] text-slate-650">({c.enrollment.programName})</span></span>
                                                <span className={`font-mono ${c.enrollment.balance > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{formatCurrency(c.enrollment.balance)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-xs font-bold border-t border-dashed border-slate-850 pt-2 mt-2">
                                            <span className="text-white">Family Solde Balance</span>
                                            <span className={`font-mono ${selectedParentAccount.totalBalance > 0 ? 'text-red-405' : 'text-emerald-450'}`}>{formatCurrency(selectedParentAccount.totalBalance)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none"
                                        placeholder="Search parent name or phone..."
                                        value={parentPaymentSearchQuery}
                                        onChange={(e) => { setParentPaymentSearchQuery(e.target.value); setIsParentDropdownOpen(true); }}
                                        onFocus={() => setIsParentDropdownOpen(true)}
                                    />
                                    {isParentDropdownOpen && parentPaymentSearchQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 custom-scrollbar">
                                            {parentAccounts
                                                .filter(p => 
                                                    (p.parentName || '').toLowerCase().includes(parentPaymentSearchQuery.toLowerCase()) ||
                                                    (p.phone || '').includes(parentPaymentSearchQuery)
                                                )
                                                .map((account, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedParentAccount(account);
                                                            setPaymentForm(prev => ({ ...prev, amount: account.totalBalance }));
                                                            setIsParentDropdownOpen(false);
                                                            setParentPaymentSearchQuery('');
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-none"
                                                    >
                                                        <div className="font-bold text-white text-sm flex items-center gap-1.5"><Users size={14} className="text-blue-400" /> {account.parentName}</div>
                                                        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                                                            <span>{account.children.length} child(ren) &middot; {account.phone || 'No phone'}</span>
                                                            <span className={account.totalBalance > 0 ? 'text-amber-400' : 'text-emerald-450'}>Solde: {formatCurrency(account.totalBalance)}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            {parentAccounts.filter(p => (p.parentName || '').toLowerCase().includes(parentPaymentSearchQuery.toLowerCase()) || (p.phone || '').includes(parentPaymentSearchQuery)).length === 0 && (
                                                <div className="p-3 text-slate-500 text-xs text-center">No parent accounts found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

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
                                    {/* Payment Plan Selection */}
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Payment Format / Plan</label>
                                        <div className="grid grid-cols-5 gap-2 mb-4">
                                            {[
                                                { id: 'full', label: 'Full' },
                                                { id: 'monthly', label: 'Month' },
                                                { id: 'trimester', label: 'Tri' },
                                                { id: 'semestre', label: 'Sem' },
                                                { id: 'annual', label: 'Year' }
                                            ].map(plan => (
                                                <button
                                                    key={plan.id}
                                                    type="button"
                                                    onClick={() => setEnrollProgramForm({ ...enrollProgramForm, paymentPlan: plan.id as any })}
                                                    className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${enrollProgramForm.paymentPlan === plan.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/20' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                                                >
                                                    {plan.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

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

                                {/* Payment Promises / Contract */}
                                {enrollProgramForm.paymentPlan !== 'full' && (
                                    <div className="bg-indigo-950/20 border border-indigo-900/50 p-4 rounded-xl mb-4 space-y-3">
                                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex justify-between items-center">
                                            <span>Payment Contract (Promises)</span>
                                            <span className="text-slate-400 font-normal">
                                                Promised: {formatCurrency(enrollPaymentPromises.reduce((s, p) => s + Number(p.amount), 0))} / {formatCurrency(remainingBalance)}
                                            </span>
                                        </div>
                                        {enrollPaymentPromises.length > 0 && (
                                            <div className="space-y-2">
                                                {enrollPaymentPromises.map((p, idx) => (
                                                    <div key={p.id} className="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800 text-sm">
                                                        <div className="text-slate-300"><span className="text-indigo-400 font-mono text-xs">{p.month}</span> • {formatCurrency(Number(p.amount))}</div>
                                                        <button onClick={() => handleRemovePromise(p.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-end gap-2 mt-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-slate-500 block mb-1">Month</label>
                                                <input type="month" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm focus:border-indigo-500 outline-none" value={currentPromise.month} onChange={e => setCurrentPromise({ ...currentPromise, month: e.target.value })} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] text-slate-500 block mb-1">Amount</label>
                                                <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm focus:border-indigo-500 outline-none" value={currentPromise.amount} onChange={e => setCurrentPromise({ ...currentPromise, amount: e.target.value })} placeholder="0.00" />
                                            </div>
                                            <button onClick={handleAddPromise} disabled={!currentPromise.amount || !currentPromise.month} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"><Plus size={18} /></button>
                                        </div>
                                    </div>
                                )}

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
                                    if (enrollmentStep === 2 && !enrollProgramForm.groupId) return showAlert("Validation Error", "Group selection is required", "warning");
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

import { ModuleProvider } from './context/ModuleContext';

const App = () => {
    return (
        <AuthProvider>
            <ModuleProvider>
                <ConfirmProvider>
                    <NotificationProvider>
                        <AppProvider>
                            <ThemeProvider>
                                <AppContent />
                            </ThemeProvider>
                        </AppProvider>
                    </NotificationProvider>
                </ConfirmProvider>
            </ModuleProvider>
        </AuthProvider>
    );
};

export default App;
