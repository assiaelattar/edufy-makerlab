
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, Users, School, BookOpen, Wallet, CalendarCheck, Wrench, Settings, Search, X, LogOut, Menu, Bell, CheckCircle2, ChevronRight, ChevronDown, ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, TrendingDown, Home, Box, Hammer, Camera, Car, Trophy, Sparkles, Rocket, UserRound, Banknote, FileText, Landmark, CalendarDays } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThemeProvider } from './sparkquest/context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { getModuleById } from './services/moduleRegistry';
import { ModuleProvider, useModuleContext } from './context/ModuleContext';
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
import { EnrollmentWizard, type EnrollmentLearnerMode } from './components/enrollment/EnrollmentWizard';
import { AtlasBootScreen } from './components/AtlasBootScreen';

import { addDoc, collection, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { formatCurrency, compressImage, normalizePhone } from './utils/helpers';
import { resolveEnrollmentServicePeriod } from './utils/programLifecycle';
import { isPublicEnrollmentRequest } from './utils/publicEnrollment';
import { ViewState } from './types';
import { AdminLayout } from './components/layouts/AdminLayout';
import { InstructorLayout } from './components/layouts/InstructorLayout';



const StudentNavigation = ({ currentView, navigateTo }: { currentView: string, navigateTo: any }) => {
    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Lobby' },
        { id: 'learning', icon: BookOpen, label: 'Studio' },
        { id: 'portfolio', icon: Trophy, label: 'Portfolio' },
        { id: 'media', icon: Camera, label: 'Gallery' },
        { id: 'test-wizard', icon: Sparkles, label: 'New Project' },
    ];

    return (
        <div className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-lg -translate-x-1/2">
            <div className="grid h-16 grid-cols-6 items-stretch rounded-lg border border-white/10 bg-[#08111F] p-1.5 shadow-[0_18px_48px_rgba(8,17,31,0.24)]">
                {menuItems.map(item => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigateTo(item.id)}
                            className={`flex min-w-0 flex-col items-center justify-center rounded-md px-1 transition-colors ${isActive ? 'bg-teal-400/15 text-teal-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="mt-1 w-full truncate text-center text-[9px] font-bold">{item.label}</span>
                        </button>
                    )
                })}

                {/* Settings */}
                <button onClick={() => navigateTo('settings')} className={`flex min-w-0 flex-col items-center justify-center rounded-md px-1 transition-colors ${currentView === 'settings' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`} aria-label="Settings" aria-current={currentView === 'settings' ? 'page' : undefined}>
                    <Settings size={20} />
                    <span className="mt-1 text-[9px] font-bold">Settings</span>
                </button>
            </div>
        </div>
    );
}

const AppContent = () => {
    const { currentView, navigateTo, viewParams, loading: appLoading, settings, students, programs, enrollments, payments, t } = useAppContext();
    const { user, signOut, can, loading: authLoading, userProfile, createSecondaryUser, currentOrganization, isSuperAdmin } = useAuth();
    const { isModuleEnabled, getEntitlement } = useModuleContext();
    const { requestPermission } = useNotifications();
    const { alert: showAlert, confirm } = useConfirm();

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


    const isStudent = userProfile?.role === 'student';
    const isParent = userProfile?.role === 'parent';
    const isInstructor = userProfile?.role === 'instructor';

    // --- ENROLLMENT WIZARD STATE ---
    const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
    const [quickEnrollStudentId, setQuickEnrollStudentId] = useState<string | null>(null);
    const [enrollmentLearnerMode, setEnrollmentLearnerMode] = useState<EnrollmentLearnerMode>('existing');
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
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);

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

    const selectedPaymentEnrollment = paymentForm.enrollmentId
        ? enrollments.find(enrollment => enrollment.id === paymentForm.enrollmentId)
        : undefined;
    const hasSelectedPaymentTarget = paymentMode === 'parent'
        ? Boolean(selectedParentAccount)
        : Boolean(paymentForm.studentId && selectedPaymentEnrollment);

    // --- SAAS ROUTE GUARD ---
    // Fixes issue where logging out from Super Admin (on saas-admin view) 
    // and logging in as Org Admin keeps the restricted view active.
    useEffect(() => {
        if (!authLoading && !appLoading && userProfile) {
            // Guard SaaS Admin View
            if (currentView === 'saas-admin' && !isSuperAdmin) {
                console.warn("Unauthorized access to SaaS Admin. Redirecting to Dashboard.");
                navigateTo('dashboard');
            } else if (currentView === 'dashboard' && isSuperAdmin && (userProfile.role !== 'super_admin' || currentOrganization?.id === 'atlas-platform')) {
                navigateTo('saas-admin');
            }
        }
    }, [currentView, isSuperAdmin, authLoading, appLoading, userProfile, currentOrganization?.id]);

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
    const [enrollProgramForm, setEnrollProgramForm] = useState({ programId: '', packName: '', gradeId: '', groupId: '', paymentPlan: 'full', secondGroupId: '', campSessionId: '', campShiftId: '', moduleIds: [] as string[] });
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
        return Math.max(
            selectedPack.priceAnnual || 0,
            selectedPack.priceTrimester || 0,
            selectedPack.price || 0,
            selectedPack.promoPrice || 0
        );
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
                setEnrollProgramForm({ programId: '', packName: '', gradeId: '', groupId: '', paymentPlan: 'full', secondGroupId: '', campSessionId: '', campShiftId: '', moduleIds: [] });
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
    const clearedPayingNow = useMemo(() => enrollPayments
        .filter(payment => payment.method === 'cash')
        .reduce((sum, payment) => sum + Number(payment.amount), 0), [enrollPayments]);
    const pendingPayingNow = totalPayingNow - clearedPayingNow;

    const remainingBalance = negotiatedPrice - clearedPayingNow;
    const remainingToSchedule = negotiatedPrice - totalPayingNow;
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

        setShowPaymentDetails(false);
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
            secondGroupId: '',
            campSessionId: '',
            campShiftId: '',
            moduleIds: []
        });

        // Reset student form for fresh entry
        setEnrollStudentForm({ name: '', parentPhone: '', parentName: '', birthDate: '', email: '', school: '' });
        setQuickEnrollStudentId(null);
        setEnrollmentLearnerMode('new');
        preserveEnrollmentFormRef.current = true; // Preserve the program form we just set
        setIsEnrollmentModalOpen(true);
    };

    const handleFinishEnrollment = async () => {
        if (!db || !currentOrganization) {
            await showAlert('Organization required', 'Select an organization before creating an enrollment.', 'warning');
            return;
        }

        const enrollmentGroup = selectedGrade?.groups.find(group => group.id === enrollProgramForm.groupId);
        if (!selectedProgram || !selectedPack || !selectedGrade || !enrollmentGroup) {
            await showAlert('Enrollment details incomplete', 'Choose a program, pricing pack, grade, and group before finishing enrollment.', 'warning');
            return;
        }

        if (selectedProgram.status !== 'active') {
            await showAlert('Program unavailable', `This program is ${selectedProgram.status} and cannot accept a new enrollment.`, 'warning');
            return;
        }

        if (!quickEnrollStudentId && (!enrollStudentForm.name.trim() || !enrollStudentForm.parentPhone.trim())) {
            await showAlert('Student details incomplete', 'Add the student name and family phone number before finishing enrollment.', 'warning');
            return;
        }

        if (!quickEnrollStudentId && settings.studentFormConfig.parentName.required && !enrollStudentForm.parentName.trim()) {
            await showAlert('Parent details incomplete', 'Add the parent or guardian name before finishing enrollment.', 'warning');
            return;
        }

        if (!quickEnrollStudentId && settings.studentFormConfig.birthDate.required && !enrollStudentForm.birthDate) {
            await showAlert('Birth date required', 'Add the learner birth date before finishing enrollment.', 'warning');
            return;
        }

        if (!Number.isFinite(negotiatedPrice) || negotiatedPrice <= 0) {
            await showAlert('Fee agreement required', 'Enter a valid tuition fee before finishing enrollment.', 'warning');
            return;
        }

        if (totalPayingNow > negotiatedPrice) {
            await showAlert('Payment is too high', 'Payments received today cannot be higher than the agreed tuition fee.', 'warning');
            return;
        }

        const scheduledPaymentTotal = enrollPaymentPromises.reduce((sum, promise) => sum + Number(promise.amount || 0), 0);
        if (scheduledPaymentTotal > remainingToSchedule) {
            await showAlert('Payment schedule is too high', 'Scheduled payments cannot be higher than the remaining balance.', 'warning');
            return;
        }

        const selectedStudentRecord = quickEnrollStudentId
            ? students.find(student => student.id === quickEnrollStudentId)
            : undefined;
        if (quickEnrollStudentId && (!selectedStudentRecord || selectedStudentRecord.organizationId !== currentOrganization.id)) {
            await showAlert('Learner unavailable', 'The selected learner does not belong to the active organization. Choose the learner again.', 'danger');
            return;
        }

        if (quickEnrollStudentId) {
            const duplicateClassEnrollment = enrollments.find(enrollment =>
                enrollment.status === 'active'
                && enrollment.studentId === quickEnrollStudentId
                && enrollment.programId === selectedProgram.id
                && enrollment.groupId === enrollmentGroup.id
            );
            if (duplicateClassEnrollment) {
                await showAlert('Already in this class', `${selectedStudentRecord?.name || 'This learner'} already has an active enrollment in ${enrollmentGroup.name}.`, 'warning');
                return;
            }

            const existingProgramEnrollment = enrollments.find(enrollment =>
                enrollment.status === 'active'
                && enrollment.studentId === quickEnrollStudentId
                && enrollment.programId === selectedProgram.id
            );
            if (existingProgramEnrollment) {
                const continueWithSecondEnrollment = await confirm({
                    title: 'Another enrollment in this program',
                    message: `${selectedStudentRecord?.name || 'This learner'} is already enrolled in ${selectedProgram.name}. Add a separate enrollment for ${enrollmentGroup.name}?`,
                    confirmText: 'Add enrollment',
                    cancelText: 'Review learner',
                    variant: 'warning'
                });
                if (!continueWithSecondEnrollment) return;
            }
        }

        const groupRosterSize = enrollments.filter(enrollment =>
            enrollment.status === 'active'
            && enrollment.programId === selectedProgram.id
            && enrollment.groupId === enrollmentGroup.id
        ).length;
        if (enrollmentGroup.capacity && groupRosterSize >= enrollmentGroup.capacity) {
            await showAlert('Class is full', `${enrollmentGroup.name} has reached its ${enrollmentGroup.capacity}-learner capacity. Choose another class time.`, 'warning');
            return;
        }

        setIsSubmittingEnrollment(true);
        try {
            let finalStudentId = quickEnrollStudentId;
            let studentName = enrollStudentForm.name;
            const existingStudentRecord = quickEnrollStudentId ? students.find(student => student.id === quickEnrollStudentId) : undefined;
            let studentAccessCreated = Boolean(existingStudentRecord?.loginInfo?.uid);
            let parentAccessCreated = Boolean(existingStudentRecord?.parentLoginInfo?.uid);
            let parentAccessFailed = false;

            // 1. Create Student if New
            if (!finalStudentId) {
                // DUPLICATE CHECK
                const normalizedCandidateName = studentName.trim().toLowerCase().replace(/\s+/g, ' ');
                const normalizedCandidatePhone = normalizePhone(enrollStudentForm.parentPhone);
                const normalizedCandidateEmail = enrollStudentForm.email.trim().toLowerCase();
                const duplicateStudent = students.find(student => {
                    const sameName = student.name.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedCandidateName;
                    const samePhone = Boolean(normalizedCandidatePhone && normalizePhone(student.parentPhone) === normalizedCandidatePhone);
                    const sameBirthDate = Boolean(enrollStudentForm.birthDate && student.birthDate === enrollStudentForm.birthDate);
                    const sameEmail = Boolean(normalizedCandidateEmail && student.email?.trim().toLowerCase() === normalizedCandidateEmail);
                    return sameEmail || (sameName && (samePhone || sameBirthDate));
                });

                if (duplicateStudent) {
                    const confirmDuplicate = await confirm({
                        title: 'Possible duplicate student',
                        message: `${duplicateStudent.name} has matching identity details. Create another learner record anyway?`,
                        confirmText: 'Create duplicate',
                        cancelText: 'Review records',
                        variant: 'warning'
                    });
                    if (!confirmDuplicate) {
                        setIsSubmittingEnrollment(false);
                        return;
                    }
                }

                const sRef = await addDoc(collection(db, 'students'), {
                    ...enrollStudentForm,
                    status: 'active',
                    organizationId: currentOrganization.id,
                    createdAt: serverTimestamp()
                });
                finalStudentId = sRef.id;
            } else {
                // If quick enrolling existing student, fetch name
                const existingStudent = students.find(s => s.id === finalStudentId);
                if (existingStudent) studentName = existingStudent.name;
            }

            // 1.5 Generate Student Account (Auto-Provisioning)
            if (!studentAccessCreated) {
                try {
                    const names = (studentName || '').trim().split(' ');
                    const firstNameChar = names[0].charAt(0).toLowerCase();
                    const lastName = names.length > 1 ? names[names.length - 1].toLowerCase() : names[0].toLowerCase();
                    const domain = currentOrganization.slug ? `${currentOrganization.slug}.edu` : 'makerlab.academy';
                    const username = `${firstNameChar}.${lastName}`;
                    const email = `${username}@${domain}`;
                    const password = Math.random().toString(36).slice(-6);
                    const uid = await createSecondaryUser(email, password);

                    await setDoc(doc(db, 'users', uid), {
                        uid,
                        email,
                        name: studentName,
                        role: 'student',
                        status: 'active',
                        organizationId: currentOrganization.id,
                        createdAt: serverTimestamp()
                    });

                    await updateDoc(doc(db, 'students', finalStudentId), {
                        loginInfo: { username, email, initialPassword: password, uid }
                    });
                    studentAccessCreated = true;
                } catch (error) {
                    console.error('Failed to auto-generate student account:', error);
                }
            }

            // 1.6 Generate Parent Account independently so an existing student login cannot block it.
            if (enrollStudentForm.email && !parentAccessCreated) {
                try {
                    const parentEmail = enrollStudentForm.email;
                    const parentPassword = Math.random().toString(36).slice(-8);
                    const parentUid = await createSecondaryUser(parentEmail, parentPassword);

                    await setDoc(doc(db, 'users', parentUid), {
                        uid: parentUid,
                        email: parentEmail,
                        name: enrollStudentForm.parentName || 'Parent',
                        role: 'parent',
                        status: 'active',
                        organizationId: currentOrganization.id,
                        createdAt: serverTimestamp()
                    });

                    await updateDoc(doc(db, 'students', finalStudentId), {
                        parentLoginInfo: { email: parentEmail, initialPassword: parentPassword, uid: parentUid }
                    });
                    parentAccessCreated = true;
                } catch (error) {
                    console.error('Failed to generate parent account:', error);
                    parentAccessFailed = true;
                }
            }

            // 2. Create Enrollment
            const selectedGroup = enrollmentGroup;

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

            const joinedAt = new Date().toISOString();
            const servicePeriod = resolveEnrollmentServicePeriod(selectedProgram, joinedAt);
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
                moduleIds: enrollProgramForm.moduleIds,
                moduleNames: selectedProgram.campSetup?.sessions
                    .flatMap(session => session.weeks)
                    .filter(week => enrollProgramForm.moduleIds.includes(week.id))
                    .map(week => week.label) || [],
                paymentPlan: enrollProgramForm.paymentPlan,
                totalAmount: negotiatedPrice, // Use the Negotiated Price
                discountAmount: discountAmount > 0 ? discountAmount : 0, // Store discount
                paidAmount: initialCleared,
                balance: negotiatedPrice - initialCleared,
                paymentPromises: enrollPaymentPromises.map(p => ({ month: p.month, amount: Number(p.amount) })),
                status: 'active',
                startDate: joinedAt,
                serviceStartDate: servicePeriod.startDate,
                ...(servicePeriod.endDate ? { endDate: servicePeriod.endDate, serviceEndDate: servicePeriod.endDate } : {}),
                enrollmentMode: servicePeriod.mode,
                // Auto-detect session from enrollment date (Sept-June rule)
                session: computeAcademicYear(new Date()),
                organizationId: currentOrganization.id,
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
                    organizationId: currentOrganization.id,
                    createdAt: serverTimestamp()
                });
            }

            setIsEnrollmentModalOpen(false);
            const accessSummary = studentAccessCreated
                ? parentAccessCreated
                    ? 'Student and parent access were created.'
                    : parentAccessFailed
                        ? 'Student access was created. Parent access still needs attention in the student record.'
                        : 'Student access was created.'
                : 'Enrollment was saved. Student access still needs to be created from the student record.';
            await showAlert('Enrollment created', accessSummary, 'success');
        } catch (err) {
            console.error(err);
            await showAlert('Enrollment not completed', 'The enrollment could not be processed. No success was recorded; review the details and try again.', 'danger');
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

        const leadPrimaryGroup = lead.selectedGroupId
            ? programs.flatMap(program => program.grades).flatMap(grade => grade.groups).find(group => group.id === lead.selectedGroupId)
            : undefined;
        const leadGrade = lead.selectedGradeId
            ? programs.flatMap(program => program.grades).find(grade => grade.id === lead.selectedGradeId)
            : undefined;

        setEnrollProgramForm({
            programId,
            packName,
            gradeId: leadGrade?.id || gradeId,
            groupId: leadPrimaryGroup?.id || groupId,
            paymentPlan: 'full', // Default, or infer if lead has it
            secondGroupId: lead.secondGroupId || '',
            campSessionId: lead.campSessionId || '',
            campShiftId: lead.campShiftId || '',
            moduleIds: lead.moduleIds || []
        });

        // Reset ID to ensure creating NEW student
        setQuickEnrollStudentId(null);
        setEnrollmentLearnerMode('new');

        // Open Modal (Preserving the data we just set)
        preserveEnrollmentFormRef.current = true;
        setIsEnrollmentModalOpen(true);
    };

    // Routing
    if (locationPath.includes('mode=booking') || window.location.search.includes('mode=booking')) return <PublicBookingView />;
    if (isPublicEnrollmentRequest({ pathname: locationPath, search: window.location.search })) return <PublicEnrollmentView />;
    if (locationPath === '/parent-portal' || locationHash === '#parent') return <ParentLoginView />;

    if (authLoading || appLoading || (user && !userProfile)) {
        const loadingMessage = authLoading
            ? 'Securing your Atlas session'
            : user && !userProfile
                ? 'Connecting your academy'
                : 'Preparing your academy workspace';

        return <AtlasBootScreen message={loadingMessage} />;
    }

    if (!user) {
        if (locationHash === '#login' || locationPath === '/login') return <LoginView />;
        if (locationHash === '#signup') return <LoginView />; // LoginView handles toggle inside, or we can pass prop if needed
        return <LandingView />;
    }

    const renderView = () => {
        const registeredModule = getModuleById(currentView);
        if (registeredModule && !isModuleEnabled(registeredModule.id)) {
            return <DashboardView onRecordPayment={handleOpenPaymentModal} />;
        }

        switch (currentView) {
            case 'dashboard': return <DashboardView onRecordPayment={handleOpenPaymentModal} />;
            case 'students': return <StudentsView onAddStudent={() => { setQuickEnrollStudentId(null); setEnrollmentLearnerMode('new'); setIsEnrollmentModalOpen(true); }} onEditStudent={(s) => navigateTo('student-details', { studentId: s.id })} onQuickEnroll={(id) => { setQuickEnrollStudentId(id || null); setEnrollmentLearnerMode('existing'); setIsEnrollmentModalOpen(true); }} onViewProfile={(id) => navigateTo('student-details', { studentId: id })} />;
            case 'classes': return <ClassesView onEnroll={handleEnrollFromGroup} />;
            case 'programs': return <ProgramsView onEnrollLead={handleEnrollLead} />;
            case 'finance': return <FinanceView onRecordPayment={handleOpenPaymentModal} />;
            case 'expenses': return <ExpensesView />;
            case 'tools': return <ToolsView />;
            case 'settings': return <SettingsView />;
            case 'student-details': return <StudentDetailsView onEditStudent={() => { }} onQuickEnroll={(id) => { setQuickEnrollStudentId(id); setEnrollmentLearnerMode('existing'); setIsEnrollmentModalOpen(true); }} onRecordPayment={(id) => handleOpenPaymentModal(id)} />;
            case 'activity-details': return <ActivityDetailsView />;
            case 'workshops': return <WorkshopsView onConvertProspect={(p) => { setQuickEnrollStudentId(null); setEnrollmentLearnerMode('new'); setEnrollStudentForm({ name: p.childName, parentName: p.parentName, parentPhone: p.parentPhone, email: '', birthDate: '', school: '' }); preserveEnrollmentFormRef.current = true; setIsEnrollmentModalOpen(true); }} />;
            case 'attendance': return <AbsenceView />;
            case 'team': return <TeamView />;
            case 'staff-attendance': return <StaffAbsenceView />;
            case 'marketing': return <MarketingView onEnrollLead={handleEnrollLead} />;
            case 'schedule': return <CalendarView />; // NEW

            // SAAS GUARDED ROUTES
            case 'learning': return <LearningView />;
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
                if (!getEntitlement(appId)?.active) return <AppStoreView />;
                const Component = app.component;
                return <Component />;
            }
            default: return <DashboardView onRecordPayment={handleOpenPaymentModal} />;
        }
    };

    // --- PARENT LAYOUT ---
    if (isParent) {
        return (
            <div className="min-h-[100dvh] bg-[#F7F1E4] text-slate-800 font-sans selection:bg-teal-500/25">
                <ParentDashboardView />
            </div>
        );
    }

    // --- STUDENT LAYOUT ---
    if (isStudent) {
        return (
            <div className="flex h-[100dvh] overflow-hidden bg-[#F7F1E4] font-spark selection:bg-teal-400/25 selection:text-[#08111F]">
                {/* Desktop Sidebar (SparkQuest Themed) */}
                <aside className="relative z-20 hidden w-64 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#08111F] text-slate-300 md:flex">
                    {/* Brand / Profile */}
                    <div className="flex items-center gap-3 border-b border-white/10 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-400/15 text-lg font-black text-teal-200">
                                {userProfile?.name?.charAt(0) || 'S'}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-black text-white">{userProfile?.name || 'Student'}</h2>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F2C766]">Student workspace</span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 overflow-y-auto p-3 no-scrollbar">
                        {[
                            { id: 'dashboard', icon: Home, label: 'Lobby' },
                            { id: 'learning', icon: BookOpen, label: 'Studio' },
                            { id: 'portfolio', icon: Trophy, label: 'Portfolio' },
                            { id: 'media', icon: Camera, label: 'Gallery' },
                            { id: 'test-wizard', icon: Sparkles, label: 'New Project' },
                        ].map(item => {
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => navigateTo(item.id as ViewState)}
                                    className={`relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${isActive
                                        ? 'bg-teal-400/15 text-teal-100'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-teal-300" />}
                                    <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            );
                        })}

                    </nav>

                    {/* Bottom Actions */}
                    <div className="mt-auto space-y-1 border-t border-white/10 p-3">
                        <button onClick={() => navigateTo('settings')} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
                            <Settings size={20} /> Settings
                        </button>
                        <button onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-rose-400/10 hover:text-rose-200">
                            <LogOut size={20} /> Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Mobile Header (SparkQuest Themed) */}
                    <header className="z-30 mx-3 mt-3 flex min-h-14 shrink-0 items-center justify-between rounded-lg border border-[#D8D2C5] bg-white px-3 text-[#08111F] shadow-sm md:hidden">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#08111F] font-black text-[#F2C766]">
                                {settings.academyName.charAt(0)}
                            </div>
                            <span className="max-w-[12rem] truncate text-sm font-black">{settings.academyName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationDropdown />
                            <button onClick={signOut} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600" aria-label="Sign out"><LogOut size={20} /></button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-3 pb-24 custom-scrollbar md:p-6 md:pb-6">
                        <div className="max-w-7xl mx-auto h-full flex flex-col">
                            {/* View Container with SparkQuest Style */}
                            <div className="flex-1">
                                {renderView()}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Bottom Dock (Hidden on Desktop) */}
                    <div className="md:hidden">
                        <StudentNavigation currentView={currentView} navigateTo={navigateTo} />
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
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record a payment" size="lg">
                <form onSubmit={handleSubmitPayment} className="mx-auto w-full max-w-xl space-y-5">
                    <div>
                        <p className="text-sm font-semibold text-white">Who is this payment for?</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Choose one student or pay for several children in the same family.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-[#08111F] p-1" role="group" aria-label="Payment for">
                        <button
                            type="button"
                            aria-pressed={paymentMode === 'individual'}
                            onClick={() => {
                                setPaymentMode('individual');
                                setPaymentForm(prev => ({ ...prev, studentId: '', enrollmentId: '', amount: 0 }));
                                setSelectedParentAccount(null);
                                setShowPaymentDetails(false);
                            }}
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${paymentMode === 'individual' ? 'bg-white text-[#08111F] shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                            Student
                        </button>
                        <button
                            type="button"
                            aria-pressed={paymentMode === 'parent'}
                            onClick={() => {
                                setPaymentMode('parent');
                                setPaymentForm(prev => ({ ...prev, studentId: '', enrollmentId: '', amount: 0 }));
                                setSelectedParentAccount(null);
                                setShowPaymentDetails(false);
                            }}
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${paymentMode === 'parent' ? 'bg-white text-[#08111F] shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Users className="h-4 w-4" aria-hidden="true" />
                            Family
                        </button>
                    </div>

                    {paymentMode === 'individual' && (
                        <div className="relative">
                            {selectedPaymentEnrollment ? (
                                <div className="overflow-hidden rounded-lg border border-teal-300/25 bg-teal-400/10" aria-live="polite">
                                    <div className="flex items-start justify-between gap-3 p-4">
                                        <div className="flex min-w-0 gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-300/15 text-teal-200">
                                                <UserRound className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-white">{selectedPaymentEnrollment.studentName}</p>
                                                <p className="mt-0.5 truncate text-xs text-slate-400">{selectedPaymentEnrollment.programName}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPaymentForm({ ...paymentForm, studentId: '', enrollmentId: '' });
                                                setShowPaymentDetails(false);
                                            }}
                                            className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-teal-200 hover:bg-teal-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-t border-teal-300/15 bg-[#08111F]/30 px-4 py-3">
                                        <span className="text-xs font-medium text-slate-300">Remaining balance</span>
                                        <span className="text-base font-black tabular-nums text-[#F2C766]">{formatCurrency(selectedPaymentEnrollment.balance)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="payment-student-search" className="mb-2 block text-sm font-semibold text-white">Find the student</label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                                        <input
                                            id="payment-student-search"
                                            type="search"
                                            autoComplete="off"
                                            className="min-h-12 w-full rounded-lg border border-white/10 bg-[#08111F] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                                            placeholder="Type a student name"
                                            value={paymentSearchQuery}
                                            onInput={(event) => { setPaymentSearchQuery((event.target as HTMLInputElement).value); setIsDropdownOpen(true); }}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            aria-expanded={Boolean(isDropdownOpen && paymentSearchQuery)}
                                            aria-controls="payment-student-results"
                                        />
                                        {isDropdownOpen && paymentSearchQuery && (
                                            <div id="payment-student-results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-[#08111F] p-1 shadow-2xl custom-scrollbar">
                                                {enrollments
                                                    .filter(enrollment => {
                                                    if (enrollment.status !== 'active') return false;
                                                    const student = students.find(item => item.id === enrollment.studentId);
                                                    if (!student || student.status === 'inactive') return false;
                                                    return (enrollment.studentName || student.name || '').toLowerCase().includes(paymentSearchQuery.toLowerCase());
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
                                                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-bold text-white">{enrollment.studentName}</span>
                                                            <span className="block truncate text-xs text-slate-400">{enrollment.programName}</span>
                                                        </span>
                                                        <span className="shrink-0 text-right">
                                                            <span className="block text-[10px] font-bold uppercase text-slate-500">Remaining</span>
                                                            <span className={`block text-xs font-bold tabular-nums ${enrollment.balance > 0 ? 'text-[#F2C766]' : 'text-teal-300'}`}>{formatCurrency(enrollment.balance)}</span>
                                                        </span>
                                                    </button>
                                                ))}
                                            {enrollments.filter(enrollment => enrollment.status === 'active' && (enrollment.studentName || students.find(student => student.id === enrollment.studentId)?.name || '').toLowerCase().includes(paymentSearchQuery.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-6 text-center text-sm text-slate-400">No active enrollment matches this name.</div>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {paymentMode === 'parent' && (
                        <div className="relative">
                            {selectedParentAccount ? (
                                <div className="overflow-hidden rounded-lg border border-teal-300/25 bg-teal-400/10" aria-live="polite">
                                    <div className="flex items-start justify-between gap-3 p-4">
                                        <div className="flex min-w-0 gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-300/15 text-teal-200">
                                                <Users className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-white">{selectedParentAccount.parentName || 'Family account'}</p>
                                                <p className="mt-0.5 text-xs text-slate-400">{selectedParentAccount.children.length} {selectedParentAccount.children.length === 1 ? 'child' : 'children'} &middot; {selectedParentAccount.phone || 'No phone'}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedParentAccount(null);
                                                setPaymentForm(prev => ({ ...prev, amount: 0 }));
                                                setShowPaymentDetails(false);
                                            }}
                                            className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-teal-200 hover:bg-teal-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    <div className="space-y-2 border-t border-teal-300/15 bg-[#08111F]/30 px-4 py-3">
                                        {selectedParentAccount.children.map((child: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between gap-3 text-xs">
                                                <span className="min-w-0 truncate text-slate-300">{child.student.name} <span className="text-slate-500">&middot; {child.enrollment.programName}</span></span>
                                                <span className="shrink-0 font-bold tabular-nums text-slate-300">{formatCurrency(child.enrollment.balance)}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                                            <span className="text-xs font-medium text-slate-300">Family balance</span>
                                            <span className="text-base font-black tabular-nums text-[#F2C766]">{formatCurrency(selectedParentAccount.totalBalance)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="payment-family-search" className="mb-2 block text-sm font-semibold text-white">Find the family</label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                                        <input
                                            id="payment-family-search"
                                            type="search"
                                            autoComplete="off"
                                            className="min-h-12 w-full rounded-lg border border-white/10 bg-[#08111F] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                                            placeholder="Type a parent name or phone"
                                            value={parentPaymentSearchQuery}
                                            onInput={(event) => { setParentPaymentSearchQuery((event.target as HTMLInputElement).value); setIsParentDropdownOpen(true); }}
                                            onFocus={() => setIsParentDropdownOpen(true)}
                                            aria-expanded={Boolean(isParentDropdownOpen && parentPaymentSearchQuery)}
                                            aria-controls="payment-family-results"
                                        />
                                        {isParentDropdownOpen && parentPaymentSearchQuery && (
                                            <div id="payment-family-results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-[#08111F] p-1 shadow-2xl custom-scrollbar">
                                                {parentAccounts
                                                    .filter(account =>
                                                    (account.parentName || '').toLowerCase().includes(parentPaymentSearchQuery.toLowerCase()) ||
                                                    (account.phone || '').includes(parentPaymentSearchQuery)
                                                )
                                                .map((account, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedParentAccount(account);
                                                            setPaymentForm(prev => ({ ...prev, amount: account.totalBalance }));
                                                            setIsParentDropdownOpen(false);
                                                            setParentPaymentSearchQuery('');
                                                        }}
                                                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-bold text-white">{account.parentName}</span>
                                                            <span className="block truncate text-xs text-slate-400">{account.children.length} {account.children.length === 1 ? 'child' : 'children'} &middot; {account.phone || 'No phone'}</span>
                                                        </span>
                                                        <span className="shrink-0 text-right">
                                                            <span className="block text-[10px] font-bold uppercase text-slate-500">Balance</span>
                                                            <span className={`block text-xs font-bold tabular-nums ${account.totalBalance > 0 ? 'text-[#F2C766]' : 'text-teal-300'}`}>{formatCurrency(account.totalBalance)}</span>
                                                        </span>
                                                    </button>
                                                ))}
                                            {parentAccounts.filter(p => (p.parentName || '').toLowerCase().includes(parentPaymentSearchQuery.toLowerCase()) || (p.phone || '').includes(parentPaymentSearchQuery)).length === 0 && (
                                                <div className="px-3 py-6 text-center text-sm text-slate-400">No family matches this search.</div>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {hasSelectedPaymentTarget && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                        <div>
                            <div className="mb-2 flex items-end justify-between gap-3">
                                <label htmlFor="payment-amount" className="text-sm font-semibold text-white">Amount received</label>
                                <span className="text-xs text-slate-500">Moroccan dirham</span>
                            </div>
                            <div className="relative">
                                <input
                                    id="payment-amount"
                                    required
                                    type="number"
                                    inputMode="decimal"
                                    className="min-h-16 w-full rounded-lg border border-white/10 bg-[#08111F] px-4 pr-16 text-2xl font-black tabular-nums text-white outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                                    value={paymentForm.amount}
                                    onChange={event => setPaymentForm({ ...paymentForm, amount: Number(event.target.value) })}
                                />
                                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">MAD</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
                            <label htmlFor="payment-date" className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                Payment date
                            </label>
                            <input
                                id="payment-date"
                                required
                                type="date"
                                className="min-h-10 rounded-lg border border-white/10 bg-[#08111F] px-3 text-sm text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                                value={paymentForm.date}
                                onChange={event => setPaymentForm({ ...paymentForm, date: event.target.value })}
                            />
                        </div>

                        <fieldset>
                            <legend className="mb-2 text-sm font-semibold text-white">How did they pay?</legend>
                            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
                                {([
                                    { value: 'cash', label: 'Cash', icon: Banknote },
                                    { value: 'check', label: 'Check', icon: FileText },
                                    { value: 'virement', label: 'Transfer', icon: Landmark }
                                ] as const).map(method => {
                                    const MethodIcon = method.icon;
                                    const isSelected = paymentForm.method === method.value;
                                    return (
                                        <button
                                            key={method.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => {
                                                setPaymentForm({ ...paymentForm, method: method.value });
                                                setShowPaymentDetails(false);
                                            }}
                                            className={`group flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${isSelected ? 'border-teal-300/60 bg-teal-400/15 text-teal-100' : 'border-white/10 bg-[#08111F] text-slate-400 hover:border-white/20 hover:text-white'}`}
                                        >
                                            <MethodIcon className={`h-5 w-5 transition-transform motion-reduce:transition-none ${isSelected ? 'text-teal-300' : 'text-slate-500 group-hover:-translate-y-0.5 group-hover:text-slate-300 motion-reduce:transform-none'}`} aria-hidden="true" />
                                            {method.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
                            <p className="text-xs leading-5 text-slate-300">
                                {paymentForm.method === 'cash'
                                    ? "Cash is confirmed now and the remaining balance updates immediately."
                                    : paymentForm.method === 'check'
                                        ? "The check is saved as received. The balance updates after it clears."
                                        : "The transfer is saved for verification. The balance updates after approval."
                                }
                            </p>
                        </div>

                        {paymentForm.method !== 'cash' && (
                        <div className="rounded-lg border border-white/10 bg-[#08111F]">
                            <button
                                type="button"
                                onClick={() => setShowPaymentDetails(current => !current)}
                                aria-expanded={showPaymentDetails}
                                aria-controls="payment-extra-details"
                                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 text-left text-sm font-bold text-slate-200 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                            >
                                <span className="flex items-center gap-2">
                                    {paymentForm.method === 'check'
                                        ? <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                        : <Landmark className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    }
                                    {paymentForm.method === 'check' ? 'Add check details' : 'Attach transfer proof'}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform motion-reduce:transition-none ${showPaymentDetails ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>

                            {showPaymentDetails && (
                                <div id="payment-extra-details" className="space-y-4 border-t border-white/10 p-4 animate-in fade-in slide-in-from-top-1">
                    {paymentForm.method === 'check' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor="payment-check-number" className="mb-1.5 block text-xs font-semibold text-slate-300">Check number</label>
                                <input id="payment-check-number" className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0F1B2D] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" value={paymentForm.checkNumber} onChange={event => setPaymentForm({ ...paymentForm, checkNumber: event.target.value })} placeholder="Example: 739201" />
                            </div>
                            <div>
                                <label htmlFor="payment-bank-name" className="mb-1.5 block text-xs font-semibold text-slate-300">Bank</label>
                                <input id="payment-bank-name" className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0F1B2D] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" value={paymentForm.bankName} onChange={event => setPaymentForm({ ...paymentForm, bankName: event.target.value })} placeholder="Bank name" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="payment-deposit-date" className="mb-1.5 block text-xs font-semibold text-slate-300">Expected deposit date</label>
                                <input id="payment-deposit-date" type="date" className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0F1B2D] px-3 text-sm text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" value={paymentForm.depositDate} onChange={event => setPaymentForm({ ...paymentForm, depositDate: event.target.value })} />
                            </div>
                        </div>
                    )}

                    {paymentForm.method === 'virement' && (
                        <div>
                            <span className="mb-2 block text-xs font-semibold text-slate-300">Transfer proof</span>
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#0F1B2D] px-3 text-xs font-bold text-slate-200 transition-colors hover:border-white/20 hover:bg-white/5 focus-within:ring-2 focus-within:ring-teal-400">
                                    <Upload className="h-4 w-4" aria-hidden="true" />
                                    Choose image
                                    <input type="file" accept="image/*" className="sr-only" onChange={handleProofUpload} />
                                </label>
                                {paymentForm.proofUrl && (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-teal-300"><ImageIcon className="h-4 w-4" aria-hidden="true" /> Image attached</span>
                                )}
                            </div>
                            {paymentForm.proofUrl && (
                                <div className="mt-3 h-28 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0F1B2D]">
                                    <img src={paymentForm.proofUrl} className="h-full w-full object-cover" alt="Transfer proof preview" />
                                </div>
                            )}
                        </div>
                    )}

                                </div>
                            )}
                        </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmittingPayment}
                            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-3 text-sm font-black text-[#04111B] shadow-lg shadow-black/20 transition-colors hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1B2D] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Wallet className="h-5 w-5" aria-hidden="true" />
                            {isSubmittingPayment ? 'Recording payment...' : 'Record payment'}
                        </button>
                    </div>
                    )}
                </form>
            </Modal>

            <EnrollmentWizard
                isOpen={isEnrollmentModalOpen}
                onClose={() => {
                    setIsEnrollmentModalOpen(false);
                    setQuickEnrollStudentId(null);
                }}
                step={enrollmentStep}
                setStep={setEnrollmentStep}
                learnerMode={enrollmentLearnerMode}
                setLearnerMode={setEnrollmentLearnerMode}
                selectedStudentId={quickEnrollStudentId}
                setSelectedStudentId={setQuickEnrollStudentId}
                studentForm={enrollStudentForm}
                setStudentForm={setEnrollStudentForm}
                programForm={enrollProgramForm}
                setProgramForm={setEnrollProgramForm}
                students={students}
                programs={programs}
                enrollments={enrollments}
                selectedProgram={selectedProgram}
                standardTuition={standardTuition}
                negotiatedPrice={negotiatedPrice}
                setNegotiatedPrice={setNegotiatedPrice}
                payments={enrollPayments}
                currentPayment={currentEnrollPayment}
                setCurrentPayment={setCurrentEnrollPayment}
                onAddPayment={handleAddEnrollmentPayment}
                onRemovePayment={handleRemoveEnrollmentPayment}
                promises={enrollPaymentPromises}
                currentPromise={currentPromise}
                setCurrentPromise={setCurrentPromise}
                onAddPromise={handleAddPromise}
                onRemovePromise={handleRemovePromise}
                totalPayingNow={totalPayingNow}
                remainingBalance={remainingBalance}
                remainingToSchedule={remainingToSchedule}
                pendingPayingNow={pendingPayingNow}
                discountAmount={discountAmount}
                discountPercent={discountPercent}
                requiredStudentFields={{
                    parentName: Boolean(settings.studentFormConfig.parentName.required),
                    birthDate: Boolean(settings.studentFormConfig.birthDate.required)
                }}
                isSubmitting={isSubmittingEnrollment}
                onFinish={handleFinishEnrollment}
            />

        </Layout>
    );
};

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
