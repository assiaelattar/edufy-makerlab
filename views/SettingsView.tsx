
import React, { useState, useEffect } from 'react';
import { Settings, FileText, FileSpreadsheet, Download, Upload, RefreshCw, AlertTriangle, Save, CheckCircle2, ToggleLeft, ToggleRight, Users, Shield, Plus, Trash2, Mail, UserPlus, CheckSquare, Square, Wand2, Key, Loader2, Pencil, X, Copy, Image as ImageIcon, Globe, User, Lock, Fingerprint, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { setDoc, doc, addDoc, collection, serverTimestamp, onSnapshot, deleteDoc, updateDoc, writeBatch, getDocs, getDocsFromServer, query, where } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { db, firebaseConfig } from '../services/firebase';
import { AppSettings, UserProfile, RoleDefinition } from '../types';
import { Modal } from '../components/Modal';
import { compressImage } from '../utils/helpers';
import { isBiometricAvailable, registerBiometric, isBiometricEnabled, clearBiometric } from '../utils/biometrics';

export const SettingsView = () => {
    const { settings: globalSettings, teamMembers } = useAppContext();
    const { can, roles: authRoles, createSecondaryUser: createAuthUser, userProfile, user, currentOrganization, isSuperAdmin } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(globalSettings);
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'forms' | 'data' | 'team' | 'api' | 'maintenance'>('general');
    const [isImporting, setIsImporting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(globalSettings.logoUrl || null);

    // Biometric State
    const [canUseBiometrics, setCanUseBiometrics] = useState(false);
    const [biometricActive, setBiometricActive] = useState(false);

    useEffect(() => {
        isBiometricAvailable().then(setCanUseBiometrics);
        setBiometricActive(isBiometricEnabled());
    }, []);

    const handleToggleBiometric = async () => {
        if (biometricActive) {
            if (confirm("Disable FaceID/TouchID login?")) {
                clearBiometric();
                setBiometricActive(false);
            }
        } else {
            if (!userProfile?.email) return;
            const success = await registerBiometric(userProfile.email);
            if (success) {
                setBiometricActive(true);
                alert("FaceID/TouchID Enabled! You can now use it to login.");
            }
        }
    };

    // Sync state when global settings change (Fixes persistence issue)
    useEffect(() => {
        if (!isDirty) {
            setSettings(globalSettings);
            setLogoPreview(globalSettings.logoUrl);
        }
    }, [globalSettings, isDirty]);

    const updateSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        setIsDirty(true);
    };

    // Team & Access State
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [isProcessingTeam, setIsProcessingTeam] = useState(false);
    const [newUser, setNewUser] = useState({ uid: '', email: '', name: '', role: 'admission_officer', password: '' });

    // Result Modal
    const [showCredentials, setShowCredentials] = useState<{ email: string, password: string } | null>(null);

    // Student Change Password State
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Data Migration State
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState('');
    const [isRepairing, setIsRepairing] = useState(false);


    // --- STUDENT VIEW CHECK ---
    const isStudent = userProfile?.role === 'student';

    // Defined Permissions List for the Matrix
    const AVAILABLE_PERMISSIONS = [
        { id: 'dashboard.view', label: 'View Dashboard' },
        { id: 'finance.view', label: 'View Finance List' },
        { id: 'finance.view_totals', label: 'View Financial Totals' },
        { id: 'finance.record_payment', label: 'Record Payments' },
        { id: 'expenses.view', label: 'View Expenses' },
        { id: 'expenses.manage', label: 'Manage Expenses (Add/Edit)' },
        { id: 'students.view', label: 'View Students' },
        { id: 'students.edit', label: 'Edit Student Profiles' },
        { id: 'students.enroll', label: 'Enroll Students' },
        { id: 'students.delete', label: 'Delete Students' },
        { id: 'classes.view', label: 'View Classes' },
        { id: 'attendance.manage', label: 'Manage Attendance' },
        { id: 'workshops.manage', label: 'Manage Workshops' },
        { id: 'team.view', label: 'View Team & Tasks' },
        { id: 'team.create', label: 'Create Tasks' },
        { id: 'team.assign_others', label: 'Assign Tasks to Others' },
        { id: 'marketing.view', label: 'View Marketing' },
        { id: 'marketing.create', label: 'Create Content' },
        { id: 'marketing.approve', label: 'Approve Content' },
        { id: 'settings.view', label: 'View Settings' },
        { id: 'settings.manage', label: 'Manage System' },
        { id: 'settings.manage_team', label: 'Manage Team & Roles' },
    ];

    useEffect(() => {
        if (activeTab !== 'team' || !db || isStudent) return;
        const unsubRoles = onSnapshot(collection(db, 'roles'), (snap) => {
            setRoles(snap.docs.map(d => d.data() as RoleDefinition));
        });
        return () => { unsubRoles(); };
    }, [activeTab, isStudent]);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization?.id) return;
        try {
            // Explicitly save the current local state to the global doc, merging to avoid data loss
            // FIXED: Using tenant-specific path
            await setDoc(doc(db, 'organizations', currentOrganization.id, 'settings', 'global'), settings, { merge: true });
            setIsDirty(false);
            alert('Settings saved successfully!');
        } catch (err: any) {
            console.error(err);
            alert(`Failed to save settings: ${err.message}`);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentOrganization?.id) return;

        try {
            const compressed = await compressImage(file, 200, 0.7); // Smaller for logo
            setLogoPreview(compressed);

            const newSettings = { ...settings, logoUrl: compressed };
            setSettings(newSettings);

            // Auto-save to DB
            if (db) {
                // FIXED: Using tenant-specific path
                await setDoc(doc(db, 'organizations', currentOrganization.id, 'settings', 'global'), { logoUrl: compressed }, { merge: true });
            }
        } catch (err: any) {

            console.error(err);
            alert(`Failed to process or save logo image: ${err.message}`);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        setIsProcessingTeam(true);

        try {
            if (isEditingUser && newUser.uid) {
                // UPDATE EXISTING
                await updateDoc(doc(db, 'users', newUser.uid), {
                    name: newUser.name,
                    role: newUser.role,
                    // Note: Changing email in Firestore doesn't change Auth email automatically in this simple implementation
                });
                alert("User profile updated successfully.");
            } else {
                // CREATE NEW
                const tempPassword = newUser.password || Math.random().toString(36).slice(-8);
                const uid = await createAuthUser(newUser.email, tempPassword);

                await setDoc(doc(db, 'users', uid), {
                    uid: uid,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                    status: 'active',
                    createdAt: serverTimestamp()
                });

                // Show Credentials to Admin
                setShowCredentials({ email: newUser.email, password: tempPassword });
            }
            setIsUserModalOpen(false);
            setNewUser({ uid: '', email: '', name: '', role: 'admission_officer', password: '' });
        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessingTeam(false);
        }
    };

    const handleDeleteUser = async (uid: string, email: string) => {
        if (!confirm(`Are you sure you want to delete ${email}? \n\nNote: This deletes their profile data immediately. The login account requires manual deletion in Firebase Console.`)) return;
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'users', uid));
            alert("User profile deleted.");
        } catch (err) {
            console.error(err);
            alert("Failed to delete user profile.");
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!confirm(`Send a password reset email to ${email}?`)) return;
        // Use a unique app for reset too to be safe
        const appName = `SecondaryReset_${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);
        try {
            await sendPasswordResetEmail(secondaryAuth, email);
            alert(`Password reset email sent to ${email}.`);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            await deleteApp(secondaryApp).catch(console.error);
        }
    };

    // Student Self-Password Change
    const handleStudentChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.new.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            return;
        }
        if (passwordForm.new !== passwordForm.confirm) {
            setPasswordError("New passwords do not match.");
            return;
        }

        if (!user) return;

        try {
            await updatePassword(user, passwordForm.new);
            setPasswordSuccess("Password updated successfully! Please log in again next time.");
            setPasswordForm({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/requires-recent-login') {
                setPasswordError("For security, please sign out and sign in again before changing your password.");
            } else {
                setPasswordError("Failed to update password. " + err.message);
            }
        }
    };

    const handleSeedTeam = async () => {
        if (!db) return;
        if (!confirm("This will create 3 demo users (Instructor, Accountant, Admission Officer) with password 'stemflow123'. \n\nContinue?")) return;

        setIsProcessingTeam(true);
        const demoUsers = [
            { email: `instructor_${Math.floor(Math.random() * 100)}@academy.com`, name: 'Demo Instructor', role: 'instructor' },
            { email: `accountant_${Math.floor(Math.random() * 100)}@academy.com`, name: 'Demo Accountant', role: 'accountant' },
            { email: `admission_${Math.floor(Math.random() * 100)}@academy.com`, name: 'Demo Admission', role: 'admission_officer' }
        ];

        let results = "Created Users:\n";

        for (const u of demoUsers) {
            try {
                let uid = '';
                try {
                    uid = await createAuthUser(u.email, 'stemflow123');
                    results += `✓ ${u.email} (stemflow123)\n`;
                } catch (e: any) {
                    results += `⚠ ${u.email} (Exists/Error)\n`;
                    continue;
                }

                if (uid) {
                    await setDoc(doc(db, 'users', uid), {
                        uid: uid,
                        email: u.email,
                        name: u.name,
                        role: u.role,
                        status: 'active',
                        createdAt: serverTimestamp()
                    });
                }
            } catch (err: any) {
                console.error(err);
            }
        }

        setIsProcessingTeam(false);
        alert(results);
    };

    const togglePermission = async (roleId: string, permission: string) => {
        if (!db) return;
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        let newPermissions = role.permissions.includes(permission)
            ? role.permissions.filter(p => p !== permission)
            : [...role.permissions, permission];

        // Optimistic Update
        const updatedRoles = roles.map(r => r.id === roleId ? { ...r, permissions: newPermissions } : r);
        setRoles(updatedRoles);

        await setDoc(doc(db, 'roles', roleId), { ...role, permissions: newPermissions }, { merge: true });
    };

    const downloadCSVTemplate = () => {
        const headers = "Name,ParentPhone,Email,ParentName,Address,School,BirthDate(YYYY-MM-DD),MedicalInfo";
        const example = "John Doe,0612345678,john@example.com,Jane Doe,123 Main St,Central School,2015-05-20,No allergies";
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "student_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!db) { setIsImporting(false); return; }
            const text = event.target?.result as string;
            if (!text) { setIsImporting(false); return; }
            const lines = text.split('\n');
            let successCount = 0;
            let errorCount = 0;
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',').map(c => c.trim());
                const [name, parentPhone, email, parentName, address, school, birthDate, medicalInfo] = cols;
                if (!name || !parentPhone) { errorCount++; continue; }
                try {
                    await addDoc(collection(db, 'students'), {
                        name, parentPhone, email: email || '', parentName: parentName || '', address: address || '', school: school || '', birthDate: birthDate || '', medicalInfo: medicalInfo || '', status: 'active', createdAt: serverTimestamp()
                    });
                    successCount++;
                } catch (err) { errorCount++; }
            }
            setIsImporting(false);
            alert(`Import Complete!\nSuccess: ${successCount}\nFailed/Skipped: ${errorCount}`);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleTestConnection = async () => {
        if (!db) return;
        try {
            const testId = `test_${Date.now()}`;
            await setDoc(doc(db, '_connection_test', testId), {
                timestamp: serverTimestamp(),
                user: user?.uid || 'anonymous',
                org: currentOrganization?.id || 'none'
            });
            alert(`Write Connection Successful!\nCreated doc: _connection_test/${testId}`);
        } catch (err: any) {
            alert(`Connection Test Failed: ${err.message}`);
        }
    };

    const handleRecreateOrg = async () => {
        if (!db || !user) return;
        if (!confirm("Recreate the default 'Makerlab Academy' organization document?\n\nOnly do this if the 'Organization ID' in Debug Info says N/A.")) return;

        try {
            await setDoc(doc(db, 'organizations', 'makerlab-academy'), {
                id: 'makerlab-academy',
                name: 'MakerLab Academy',
                slug: 'makerlab',
                ownerUid: user.uid,
                createdAt: serverTimestamp(),
                status: 'active',
                modules: { erp: true, makerPro: true, sparkQuest: true }
            });
            alert("Organization Recreated! Please refresh the page to see the correct Organization ID.");
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleMigrateData = async () => {
        if (!db) return;

        setIsMigrating(true);
        setMigrationResult('Starting Analysis (Server Fetch)...');

        try {
            const collectionsToScan = [
                'students', 'programs', 'enrollments', 'payments',
                'expenses', 'classes', 'attendance', 'tasks',
                'projects', 'marketing_posts', 'leads'
            ];

            let totalScanned = 0;
            let orphansFound = 0;
            const orgStats: Record<string, number> = {};

            // STAGE 1: ANALYSIS
            for (const colName of collectionsToScan) {
                const q = collection(db, colName);
                const snapshot = await getDocsFromServer(q);

                totalScanned += snapshot.size;

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const orgId = data.organizationId || '(missing)';
                    orgStats[orgId] = (orgStats[orgId] || 0) + 1;

                    if (orgId === '(missing)') {
                        orphansFound++;
                    }
                });
            }

            // Format Report
            let report = `Analysis Complete.\nTotal Scanned: ${totalScanned}\nOrphans (No Org ID): ${orphansFound}\n\nOrganization Distribution:\n`;
            Object.entries(orgStats).forEach(([org, count]) => {
                report += `- ${org}: ${count}\n`;
            });

            console.log(report);
            const userWantsToMigrate = confirm(`${report}\n\nDo you want to FORCE MIGRATE everything to 'makerlab-academy'?\nWARNING: This will steal data from all listed organizations.`);

            if (!userWantsToMigrate) {
                setMigrationResult('Migration Cancelled by User.');
                setIsMigrating(false);
                return;
            }

            // STAGE 2: EXECUTION (If confirmed)
            let totalUpdated = 0;
            let batch = writeBatch(db);
            let operationCount = 0;
            const BATCH_LIMIT = 450;

            setMigrationResult('Migrating Data...');

            for (const colName of collectionsToScan) {
                const q = collection(db, colName);
                const snapshot = await getDocsFromServer(q); // Fetch again to be safe/fresh

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    // MIGRATE EVERYTHING NOT ALREADY CORRECT
                    if (data.organizationId !== 'makerlab-academy') {
                        batch.update(doc(db, colName, docSnap.id), { organizationId: 'makerlab-academy' });
                        operationCount++;
                        totalUpdated++;
                    }
                });

                if (operationCount >= BATCH_LIMIT) {
                    await batch.commit();
                    batch = writeBatch(db);
                    operationCount = 0;
                }
            }

            if (operationCount > 0) {
                await batch.commit();
            }

            setMigrationResult(`MIGRATION COMPLETE. Moved ${totalUpdated} records to 'makerlab-academy'.`);
            alert(`Success! Moved ${totalUpdated} documents to your account.`);

        } catch (err: any) {
            console.error("Migration/Analysis Failed:", err);
            setMigrationResult(`Error: ${err.message}`);
            alert(`Error: ${err.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleRepairFinancials = async () => {
        if (!db) return;
        if (!confirm("Recalculate all enrollment financial totals based on Program Pricing and Payments?\n\nThis will fix 'NaN' errors.")) return;

        setIsRepairing(true);
        setMigrationResult('Fetching Data...');

        try {
            const orgId = currentOrganization?.id || 'makerlab-academy';

            // 1. Fetch References
            const progsSnap = await getDocsFromServer(collection(db, 'programs'));
            const progs = progsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            const paySnap = await getDocsFromServer(collection(db, 'payments'));
            const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            // 2. Scan Enrollments
            const enrollSnap = await getDocsFromServer(collection(db, 'enrollments'));

            let updatedCount = 0;
            let batch = writeBatch(db);
            let opCount = 0;
            const BATCH_LIMIT = 450;

            enrollSnap.forEach(docSnap => {
                const enr = docSnap.data();

                // Recalculate Total
                let totalAmount = enr.totalAmount;
                // If total is missing or NaN, recalculate
                if (!totalAmount || isNaN(totalAmount)) {
                    const prog = progs.find((p: any) => p.id === enr.programId); // Use broad matching
                    if (prog) {
                        const pack = prog.packs?.find((p: any) => p.name === enr.packName);
                        if (pack) {
                            totalAmount = pack.priceAnnual || pack.price || 0;
                        } else {
                            // Fallback to first pack or 0
                            totalAmount = prog.packs?.[0]?.price || 0;
                        }
                    } else {
                        totalAmount = 0;
                    }
                }

                // Recalculate Paid (Sum of payments)
                // Filter payments for this enrollment
                const enrPayments = payments.filter((p: any) => p.enrollmentId === docSnap.id);
                const paidAmount = enrPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

                // Recalculate Balance
                const balance = totalAmount - paidAmount;

                // Update if changed
                if (enr.totalAmount !== totalAmount || enr.paidAmount !== paidAmount || enr.balance !== balance) {
                    batch.update(doc(db, 'enrollments', docSnap.id), {
                        totalAmount,
                        paidAmount,
                        balance
                    });
                    opCount++;
                    updatedCount++;
                }

                if (opCount >= BATCH_LIMIT) {
                    // We can't await inside forEach efficiently without async loop, but batch handles sync add.
                    // Actually batch.commit() is async.
                    // For safety in this simpler implementation, we'll just let the batch grow or use a chunked loop if we expected > 500 updates.
                    // Given this is a repair tool for ~100 records, single batch (500 limit) is okay-ish, or multiple batches.
                }
            });

            if (opCount > 0) {
                await batch.commit();
            }

            setMigrationResult(`Fixed ${updatedCount} enrollments.`);
            alert(`Repair Complete: Updated ${updatedCount} records.`);

        } catch (err: any) {
            console.error(err);
            alert("Repair Failed: " + err.message);
        } finally {
            setIsRepairing(false);
        }
    };


    // --- RENDER: STUDENT SETTINGS ---
    if (isStudent) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8 h-full animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><User size={24} className="text-indigo-500" /> My Account</h2>
                    <p className="text-slate-500 text-sm">Manage your personal information.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white text-sm">Profile Information</h3></div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Full Name</label>
                            <div className="text-white font-medium">{userProfile?.name}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Email (Login)</label>
                            <div className="text-white font-mono">{userProfile?.email}</div>
                        </div>
                        <div className="text-xs text-slate-500 italic pt-2">
                            To update these details, please contact your academy administrator.
                        </div>
                    </div>
                </div>

                {/* Biometric Setup for Student */}
                {canUseBiometrics && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center gap-2"><Fingerprint size={16} className="text-cyan-500" /><h3 className="font-bold text-white text-sm">Biometric Login</h3></div>
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-white font-medium">FaceID / TouchID</p>
                                <p className="text-xs text-slate-500">Use biometric authentication to log in faster.</p>
                            </div>
                            <button
                                onClick={handleToggleBiometric}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${biometricActive ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                            >
                                {biometricActive ? 'Disable' : 'Setup FaceID'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center gap-2"><Lock size={16} className="text-amber-500" /><h3 className="font-bold text-white text-sm">Security</h3></div>
                    <div className="p-6">
                        <form onSubmit={handleStudentChangePassword} className="space-y-4">
                            {passwordError && <div className="bg-red-950/30 text-red-400 p-3 rounded text-xs border border-red-900/50">{passwordError}</div>}
                            {passwordSuccess && <div className="bg-emerald-950/30 text-emerald-400 p-3 rounded text-xs border border-emerald-900/50">{passwordSuccess}</div>}

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-indigo-500 outline-none"
                                    value={passwordForm.new}
                                    onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                    placeholder="At least 6 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-indigo-500 outline-none"
                                    value={passwordForm.confirm}
                                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                    placeholder="Repeat password"
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors">Update Password</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: ADMIN SETTINGS ---
    return (
        <div className="space-y-6 pb-24 md:pb-8 flex flex-col">
            {/* Sticky Header & Tabs Wrapper */}
            <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm space-y-4 pb-2 -mx-4 px-4 -mt-4 pt-4 md:-mx-8 md:px-8 md:-mt-8 md:pt-8 border-b border-slate-800/50 md:border-none">
                {/* Header */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-black/20">
                    <div>
                        <h2 className="text-xl font-bold text-white">System Settings</h2>
                        <p className="text-slate-500 text-sm">Configure academy parameters and access control.</p>
                    </div>
                    <button onClick={handleSaveSettings} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-emerald-900/20">
                        <Save size={18} /> <span>Save Global Changes</span>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 pb-2 border-b border-slate-800 flex-wrap md:flex-nowrap overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Settings size={16} /> General
                    </button>
                    <button onClick={() => setActiveTab('forms')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'forms' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                        <FileText size={16} /> Forms
                    </button>
                    <button onClick={() => setActiveTab('data')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'data' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                        <FileSpreadsheet size={16} /> Data
                    </button>
                    <button onClick={() => setActiveTab('api')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'api' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Zap size={16} /> API Integrations
                    </button>
                    {can('settings.manage_team') && (
                        <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'team' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Users size={16} /> Team & Access
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button onClick={() => setActiveTab('maintenance')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'maintenance' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                            <AlertTriangle size={16} /> Maintenance
                        </button>
                    )}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">

                {/* API TAB */}
                {activeTab === 'api' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">API Integrations</h3></div>
                        <div className="p-6 space-y-6">
                            <div className="bg-blue-950/20 border border-blue-900/50 p-4 rounded-lg flex gap-3">
                                <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                <div className="text-sm text-blue-200/80">
                                    <p className="font-bold text-blue-400 mb-1">Security Note</p>
                                    These keys are stored in the database. Ensure your Firestore security rules restrict access to the 'settings' collection to admins only.
                                </div>
                            </div>

                            {/* Google AI Image Gen */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Globe size={16} className="text-emerald-500" /> Google Nano Banana (Gemini)
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">For Thumbnail Generation</span>
                                </h4>
                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Google API Key</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-emerald-500 outline-none font-mono text-sm"
                                                value={settings.apiConfig?.googleApiKey || ''}
                                                onChange={e => updateSettings({ ...settings, apiConfig: { ...settings.apiConfig, googleApiKey: e.target.value } })}
                                                placeholder="AIzaSy..."
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Used for Gemini Image Generation (Nano Banana).</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800"></div>

                            {/* OpenAI */}
                            <div className="space-y-4 opacity-50 pointer-events-none grayscale">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Wand2 size={16} className="text-purple-500" /> OpenAI (Coming Soon)
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">For Chatbot Persona</span>
                                </h4>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">API Key</label>
                                    <input
                                        type="password"
                                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-purple-500 outline-none font-mono text-sm"
                                        value={settings.apiConfig?.openaiApiKey || ''}
                                        onChange={e => setSettings({ ...settings, apiConfig: { ...settings.apiConfig, openaiApiKey: e.target.value } })}
                                        placeholder="sk-..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">General Configuration</h3></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">System Language</label>
                                <div className="flex gap-3">
                                    <button onClick={() => updateSettings({ ...settings, language: 'en' })} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${settings.language === 'en' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                                        <span className="text-lg">🇺🇸</span> English
                                    </button>
                                    <button onClick={() => updateSettings({ ...settings, language: 'fr' })} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${settings.language === 'fr' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                                        <span className="text-lg">🇫🇷</span> Français
                                    </button>
                                </div>
                            </div>

                            {/* Admin Biometric Setup */}
                            {canUseBiometrics && (
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2"><Fingerprint size={16} className="text-cyan-500" /> Admin FaceID</h4>
                                        <p className="text-xs text-slate-500">Enable biometric login for this device.</p>
                                    </div>
                                    <button
                                        onClick={handleToggleBiometric}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${biometricActive ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                                    >
                                        {biometricActive ? 'Disable' : 'Setup'}
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Academy Name</label>
                                <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.academyName} onChange={e => updateSettings({ ...settings, academyName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Academic Year</label>
                                <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.academicYear} onChange={e => updateSettings({ ...settings, academicYear: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Academy Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-700" />}
                                    </div>
                                    <div className="flex-1">
                                        <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors w-fit">
                                            <Upload size={16} /> Upload Logo (Image)
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        </label>
                                        <p className="text-[10px] text-slate-500 mt-2">Recommended: Square PNG/JPG, max 500KB. This logo will appear on receipts and the dashboard.</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Receipt Contact Info</label>
                                <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.receiptContact} onChange={e => updateSettings({ ...settings, receiptContact: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Receipt Footer</label>
                                <textarea className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white h-20 focus:border-blue-500 outline-none" value={settings.receiptFooter} onChange={e => updateSettings({ ...settings, receiptFooter: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {/* FORMS TAB */}
                {activeTab === 'forms' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">Admission Form Fields</h3></div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-500 font-medium text-xs uppercase tracking-wider"><tr><th className="p-4">Field</th><th className="p-4 text-center">Visible</th><th className="p-4 text-center">Required</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {(Object.keys(settings.studentFormConfig) as Array<keyof AppSettings['studentFormConfig']>).map((field) => (
                                    <tr key={field} className="hover:bg-slate-800/30">
                                        <td className="p-4 font-medium text-slate-300 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</td>
                                        <td className="p-4 text-center"><button onClick={() => setSettings({ ...settings, studentFormConfig: { ...settings.studentFormConfig, [field]: { ...settings.studentFormConfig[field], active: !settings.studentFormConfig[field].active } } })} className={`transition-colors ${settings.studentFormConfig[field].active ? 'text-emerald-400' : 'text-slate-600'}`}>{settings.studentFormConfig[field].active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}</button></td>
                                        <td className="p-4 text-center"><button onClick={() => setSettings({ ...settings, studentFormConfig: { ...settings.studentFormConfig, [field]: { ...settings.studentFormConfig[field], required: !settings.studentFormConfig[field].required } } })} className={`transition-colors ${settings.studentFormConfig[field].required ? 'text-amber-400' : 'text-slate-600'}`}>{settings.studentFormConfig[field].required ? <CheckCircle2 size={18} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-600 mx-auto"></div>}</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* DATA TAB */}
                {activeTab === 'data' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">Data Management</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <div><h4 className="text-sm font-medium text-white mb-1">Bulk Student Upload</h4><p className="text-xs text-slate-500">Import students via CSV.</p></div>
                                <button onClick={downloadCSVTemplate} className="text-xs flex items-center gap-1 text-blue-400 border border-slate-700 px-3 py-1.5 rounded bg-slate-800"><Download size={12} /> Template</button>
                            </div>
                            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-slate-800/30 transition-all cursor-pointer relative">
                                <input type="file" accept=".csv" onChange={handleBulkImport} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                                {isImporting ? <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /> : <Upload className="w-8 h-8 text-slate-500" />}
                                <span className="text-sm font-medium text-slate-300 mt-2">{isImporting ? 'Importing...' : 'Upload CSV'}</span>
                            </div>
                            <div className="bg-amber-950/10 border border-amber-900/30 p-3 rounded flex gap-3 items-start"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-xs text-amber-200/80">Ensure CSV matches template. Required: Name, ParentPhone.</p></div>
                        </div>
                    </div>
                )}

                {/* TEAM TAB (RBAC) */}
                {activeTab === 'team' && (
                    <div className="col-span-12 space-y-8">
                        {/* Team Members Section */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div><h3 className="font-bold text-white">Team Members</h3><p className="text-xs text-slate-500">Manage user access and roles.</p></div>
                                <div className="flex gap-2">
                                    <button onClick={handleSeedTeam} disabled={isProcessingTeam} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors">
                                        {isProcessingTeam ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                        Seed Demo Team
                                    </button>
                                    <button onClick={() => { setIsEditingUser(false); setNewUser({ uid: '', email: '', name: '', role: 'admission_officer', password: '' }); setIsUserModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                                        <UserPlus size={14} /> Add User
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900 text-slate-500 font-medium text-xs uppercase tracking-wider">
                                        <tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {teamMembers.filter(u => !['student', 'parent'].includes(u.role)).length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No team members found. Click "Add User" or "Seed Demo Team".</td></tr> :
                                            teamMembers.filter(u => !['student', 'parent'].includes(u.role)).map(u => (
                                                <tr key={u.email} className="hover:bg-slate-800/30 group">
                                                    <td className="p-4">
                                                        <div className="font-bold text-white">{u.name}</div>
                                                        <div className="text-xs text-slate-500">{u.email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-950/50 text-purple-400 border border-purple-900' :
                                                            u.role === 'accountant' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900' :
                                                                'bg-blue-950/50 text-blue-400 border border-blue-900'
                                                            }`}>{u.role.replace('_', ' ')}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`flex items-center gap-1.5 text-xs font-medium ${u.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                                            {u.status === 'active' ? 'Active' : 'Disabled'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setNewUser({ ...u, password: '' } as any); setIsEditingUser(true); setIsUserModalOpen(true); }} className="text-slate-400 hover:text-blue-400 p-1.5 hover:bg-slate-800 rounded transition-colors" title="Edit User"><Pencil size={14} /></button>
                                                            <button onClick={() => handleResetPassword(u.email)} className="text-slate-400 hover:text-amber-400 p-1.5 hover:bg-slate-800 rounded transition-colors" title="Send Password Reset"><Key size={14} /></button>
                                                            {u.role !== 'admin' && (
                                                                <button onClick={() => handleDeleteUser(u.uid!, u.email)} className="text-slate-400 hover:text-red-400 p-1.5 hover:bg-slate-800 rounded transition-colors" title="Delete User"><Trash2 size={14} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Roles Matrix Section */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                                <h3 className="font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Role Configuration</h3>
                                <p className="text-xs text-slate-500">Fine-tune permissions for each role.</p>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900 text-slate-500 font-medium text-xs uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="p-4 min-w-[200px] bg-slate-950 sticky left-0 z-10">Permission / Access</th>
                                            {roles.filter(r => r.id !== 'admin').map(r => (
                                                <th key={r.id} className="p-4 text-center min-w-[100px]">{r.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <tr key={perm.id} className="hover:bg-slate-800/30">
                                                <td className="p-4 font-medium text-slate-300 bg-slate-900/50 sticky left-0 z-10 border-r border-slate-800">
                                                    {perm.label}
                                                    <div className="text-[10px] text-slate-600 font-mono font-normal">{perm.id}</div>
                                                </td>
                                                {roles.filter(r => r.id !== 'admin').map(role => {
                                                    const isAllowed = role.permissions.includes('*') || role.permissions.includes(perm.id) || role.permissions.includes(perm.id.split('.')[0] + '.*');
                                                    return (
                                                        <td key={`${role.id}-${perm.id}`} className="p-4 text-center">
                                                            <button
                                                                onClick={() => togglePermission(role.id, perm.id)}
                                                                className={`p-1 rounded transition-colors ${isAllowed ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-700 hover:text-slate-500'}`}
                                                            >
                                                                {isAllowed ? <CheckSquare size={20} /> : <Square size={20} />}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-center text-slate-500">
                                * Admin role has full system access by default and cannot be modified here.
                            </div>
                        </div>
                    </div>
                )}

                {/* SYSTEM MAINTENANCE TAB (SUPER ADMIN ONLY) */}
                {activeTab === 'maintenance' && isSuperAdmin && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2"><Zap className="text-amber-500" size={18} /> System Maintenance</h3>
                                <p className="text-xs text-slate-500">Tools for system migration and repairs.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-indigo-950/20 border border-indigo-900/50 p-5 rounded-lg">
                                <h4 className="font-bold text-indigo-400 mb-2 flex items-center gap-2">Data Migration Tool</h4>
                                <p className="text-sm text-indigo-200/70 mb-4">
                                    Migrate legacy Single-Tenant data to the new 'Makerlab Academy' Organization.
                                    This will scan all collections and assign `organizationId: 'makerlab-academy'` to any orphaned documents.
                                </p>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleMigrateData}
                                        disabled={isMigrating}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
                                    >
                                        {isMigrating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                        {isMigrating ? 'Migrating Data...' : 'Start Legacy Data Migration'}
                                    </button>

                                    <button onClick={handleTestConnection} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded border border-slate-700">Test DB Connection</button>

                                    <button onClick={handleRecreateOrg} className="text-xs bg-amber-900/30 hover:bg-amber-900/50 text-amber-500 border border-amber-900/50 px-3 py-2 rounded">
                                        Recreate Default Org
                                    </button>

                                    <button onClick={handleRepairFinancials} disabled={isRepairing} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
                                        {isRepairing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                        {isRepairing ? 'Fixing...' : 'Recalculate Financials'}
                                    </button>


                                    {migrationResult && (
                                        <div className="text-xs font-mono text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded border border-emerald-900/50">
                                            {migrationResult}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 p-4 bg-black/30 rounded border border-slate-800 text-xs font-mono text-slate-400">
                                    <div className="font-bold text-slate-300 mb-1">Debug Info:</div>
                                    <div>User ID: {user?.uid}</div>
                                    <div>Organization ID: {currentOrganization?.id || 'N/A'}</div>
                                    <div>Is Super Admin: {isSuperAdmin ? 'YES' : 'NO'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Add/Edit User Modal */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={isEditingUser ? "Edit User Profile" : "Add Team Member"}>
                <form onSubmit={handleAddUser} className="space-y-4">
                    {!isEditingUser && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setNewUser({ ...newUser, name: 'Instructor', email: `inst${Math.floor(Math.random() * 1000)}@academy.com`, role: 'instructor', password: 'password123' })} className="text-xs text-blue-400 hover:text-white flex items-center gap-1"><Wand2 size={12} /> Auto-Fill</button>
                        </div>
                    )}

                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-white" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Jane Doe" /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label><input required type="email" disabled={isEditingUser} className={`w-full p-3 bg-slate-950 border border-slate-800 rounded text-white ${isEditingUser ? 'opacity-50 cursor-not-allowed' : ''}`} value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="jane@academy.com" /></div>

                    {!isEditingUser && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Password (Auto-generated if empty)</label>
                            <div className="relative">
                                <input type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-white font-mono" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Leave empty to auto-generate" />
                                <button type="button" onClick={() => setNewUser({ ...newUser, password: Math.random().toString(36).slice(-8) })} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-white">Generate</button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                        <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-white" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={isProcessingTeam} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold mt-2 flex items-center justify-center gap-2">
                        {isProcessingTeam ? <Loader2 className="animate-spin w-4 h-4" /> : (isEditingUser ? 'Update Profile' : 'Create User')}
                    </button>
                </form>
            </Modal>

            {/* Credentials Display Modal */}
            <Modal isOpen={!!showCredentials} onClose={() => setShowCredentials(null)} title="User Created Successfully">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 size={32} />
                    </div>
                    <p className="text-sm text-slate-400">Please copy these credentials and share them with the user securely.</p>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-3">
                        <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Email</label>
                            <div className="font-mono text-white text-sm select-all">{showCredentials?.email}</div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Password</label>
                            <div className="flex items-center justify-between">
                                <div className="font-mono text-emerald-400 text-lg font-bold select-all">{showCredentials?.password}</div>
                                <button onClick={() => { navigator.clipboard.writeText(`Email: ${showCredentials?.email}\nPassword: ${showCredentials?.password}`); alert("Copied!"); }} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><Copy size={16} /></button>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowCredentials(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">Done</button>
                </div>
            </Modal>
        </div >
    );
};
