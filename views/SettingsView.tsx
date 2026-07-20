
import React, { useState, useEffect, useRef } from 'react';
import { Settings, FileText, FileSpreadsheet, Download, Upload, RefreshCw, AlertTriangle, Save, CheckCircle2, ToggleLeft, ToggleRight, Users, Shield, Trash2, UserPlus, CheckSquare, Square, Wand2, Key, Loader2, Pencil, Copy, Image as ImageIcon, Globe, User, Lock, Fingerprint, Zap, Printer, Clock, Calendar, Building2, CreditCard, Database, Plug, Boxes, HardDrive, BadgeCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { setDoc, doc, addDoc, collection, serverTimestamp, onSnapshot, deleteDoc, deleteField, updateDoc, writeBatch, getDocs, getDocsFromServer, query, where } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { db, firebaseConfig } from '../services/firebase';
import { AppSettings, UserProfile, RoleDefinition } from '../types';
import { Modal } from '../components/Modal';
import { compressImage } from '../utils/helpers';
import { isBiometricAvailable, registerBiometric, isBiometricEnabled, clearBiometric } from '../utils/biometrics';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState } from '../components/atlas/AtlasSurface';
import { SettingsField, SettingsMetric, SettingsNavigation, SettingsPanel, SettingsToggle, settingsInputClass, type SettingsNavigationItem } from '../components/settings/SettingsUI';

type SettingsSection = 'general' | 'plan' | 'documents' | 'forms' | 'data' | 'api' | 'team' | 'maintenance';

export const SettingsView = () => {
    const { settings: globalSettings, teamMembers, students, programs, enrollments, payments } = useAppContext();
    const { can, roles: authRoles, createSecondaryUser: createAuthUser, userProfile, user, currentOrganization, isSuperAdmin } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const [settings, setSettings] = useState<AppSettings>(globalSettings);
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsSection>('general');
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const justSaved = useRef(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(globalSettings.logoUrl || null);
    const canManageSettings = ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');
    const canManageTeam = ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');
    const canManageIntegrations = ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');
    const canAssignRole = (roleId: string) => {
        if (['student', 'parent'].includes(roleId)) return false;
        if (userProfile?.role === 'super_admin') return true;
        if (userProfile?.role === 'owner') return !['super_admin', 'owner'].includes(roleId);
        return !['super_admin', 'owner', 'admin'].includes(roleId);
    };

    // Biometric State
    const [canUseBiometrics, setCanUseBiometrics] = useState(false);
    const [biometricActive, setBiometricActive] = useState(false);

    useEffect(() => {
        isBiometricAvailable().then(setCanUseBiometrics);
        setBiometricActive(isBiometricEnabled());
    }, []);

    const handleToggleBiometric = async () => {
        if (isBiometricEnabled()) {
            const isConfirmed = await confirm({ title: 'Disable biometric login?', message: 'FaceID or TouchID will no longer be available on this device.', confirmText: 'Disable', cancelText: 'Cancel', variant: 'warning' });
            if (isConfirmed) {
                clearBiometric();
                setBiometricActive(false);
            }
        } else {
            if (!userProfile?.email) return;
            const success = await registerBiometric(userProfile.email);
            if (success) {
                setBiometricActive(true);
                showAlert("Success", "FaceID/TouchID Enabled! You can now use it to login.", "success");
            }
        }
    };

    // Sync state when global settings change (Fixes persistence issue)
    useEffect(() => {
        if (!isDirty) {
            if (justSaved.current) {
                // If we just saved, the global settings might still be stale.
                // We trust our local state for now and reset the flag.
                justSaved.current = false;
                return;
            }
            setSettings(globalSettings);
            setLogoPreview(globalSettings.logoUrl || null);
        }
    }, [globalSettings, isDirty]);

    useEffect(() => {
        if (!db || !currentOrganization?.id || !canManageIntegrations) return;
        return onSnapshot(doc(db, 'organizations', currentOrganization.id, 'integrations', 'secrets'), snapshot => {
            if (!snapshot.exists()) return;
            const data = snapshot.data() as Pick<AppSettings, 'apiConfig'>;
            setSettings(current => ({ ...current, apiConfig: data.apiConfig || current.apiConfig }));
        });
    }, [canManageIntegrations, currentOrganization?.id]);

    useEffect(() => {
        if (!isDirty) return;
        const preventAccidentalClose = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', preventAccidentalClose);
        return () => window.removeEventListener('beforeunload', preventAccidentalClose);
    }, [isDirty]);

    const updateSettings = (newSettings: AppSettings) => {
        if (!canManageSettings) return;
        setSettings(newSettings);
        setIsDirty(true);
    };

    // Team & Access State
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState('admission_officer');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [isProcessingTeam, setIsProcessingTeam] = useState(false);
    const [newUser, setNewUser] = useState({ uid: '', email: '', name: '', role: 'admission_officer', password: '', workHours: { start: '', end: '' } });

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

    const openCreateTeamMember = () => {
        setIsEditingUser(false);
        setNewUser({ uid: '', email: '', name: '', role: 'admission_officer', password: '', workHours: { start: '', end: '' } });
        setIsUserModalOpen(true);
    };


    // --- STUDENT VIEW CHECK ---
    const isStudent = userProfile?.role === 'student';

    // Defined Permissions List for the Matrix
    const AVAILABLE_PERMISSIONS = [
        { id: 'dashboard.view', label: 'View dashboard', group: 'Workspace' },
        { id: 'students.view', label: 'View students', group: 'Students & programs' },
        { id: 'students.edit', label: 'Edit student profiles', group: 'Students & programs' },
        { id: 'students.enroll', label: 'Enroll students', group: 'Students & programs' },
        { id: 'students.delete', label: 'Delete students', group: 'Students & programs' },
        { id: 'programs.view', label: 'View programs', group: 'Students & programs' },
        { id: 'programs.create', label: 'Create programs', group: 'Students & programs' },
        { id: 'programs.edit', label: 'Edit programs', group: 'Students & programs' },
        { id: 'classes.view', label: 'View classes', group: 'Classes & learning' },
        { id: 'attendance.manage', label: 'Manage attendance', group: 'Classes & learning' },
        { id: 'workshops.manage', label: 'Manage workshops', group: 'Classes & learning' },
        { id: 'finance.view', label: 'View finance records', group: 'Finance' },
        { id: 'finance.view_totals', label: 'View financial totals', group: 'Finance' },
        { id: 'finance.record_payment', label: 'Record payments', group: 'Finance' },
        { id: 'expenses.view', label: 'View expenses', group: 'Finance' },
        { id: 'expenses.manage', label: 'Manage expenses', group: 'Finance' },
        { id: 'team.view', label: 'View team and tasks', group: 'Organization' },
        { id: 'team.create', label: 'Create tasks', group: 'Organization' },
        { id: 'team.assign_others', label: 'Assign tasks', group: 'Organization' },
        { id: 'marketing.view', label: 'View marketing', group: 'Marketing' },
        { id: 'marketing.create', label: 'Create content', group: 'Marketing' },
        { id: 'marketing.approve', label: 'Approve content', group: 'Marketing' },
        { id: 'settings.view', label: 'View settings', group: 'Administration' },
        { id: 'settings.manage', label: 'Manage workspace settings', group: 'Administration' },
        { id: 'settings.manage_team', label: 'Manage team and roles', group: 'Administration' },
    ];

    useEffect(() => {
        if (activeTab !== 'team' || !db || isStudent || !currentOrganization?.id) return;
        const unsubRoles = onSnapshot(collection(db, 'organizations', currentOrganization.id, 'roles'), (snap) => {
            const tenantOverrides = snap.docs.map(d => ({ ...d.data(), id: d.id } as RoleDefinition));
            setRoles(authRoles.map(baseRole => tenantOverrides.find(role => role.id === baseRole.id) || baseRole));
        }, () => setRoles(authRoles));
        return () => { unsubRoles(); };
    }, [activeTab, authRoles, currentOrganization?.id, isStudent]);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization?.id || isSaving || !canManageSettings) return;

        const academyName = settings.academyName.trim();
        const academicYear = settings.academicYear.trim().replace('/', '-');
        if (!academyName) {
            await showAlert('Academy name required', 'Enter the name families and staff should see across the workspace.', 'warning');
            return;
        }
        if (!/^\d{4}-\d{4}$/.test(academicYear)) {
            await showAlert('Check the academic year', 'Use a year range such as 2026-2027.', 'warning');
            return;
        }
        
        setIsSaving(true);
        try {
            const normalizedSettings = { ...settings, academyName, academicYear };
            const { apiConfig, ...workspaceSettings } = normalizedSettings;
            const batch = writeBatch(db);
            batch.set(doc(db, 'organizations', currentOrganization.id, 'settings', 'global'), { ...workspaceSettings, apiConfig: deleteField() }, { merge: true });
            if (apiConfig) {
                batch.set(doc(db, 'organizations', currentOrganization.id, 'integrations', 'secrets'), { apiConfig, updatedAt: serverTimestamp() }, { merge: true });
            }
            batch.set(doc(db, 'organizations', currentOrganization.id), {
                name: academyName,
                ...(settings.logoUrl ? { logoUrl: settings.logoUrl } : {}),
                updatedAt: serverTimestamp()
            }, { merge: true });
            await batch.commit();
            
            justSaved.current = true;
            setSettings(normalizedSettings);
            setIsDirty(false);
            await showAlert('Workspace updated', 'Your organization settings are now active across Edufy.', 'success');
        } catch (err: any) {
            console.error(err);
            await showAlert('Settings not saved', err.message || 'Check your connection and organization access, then try again.', 'danger');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentOrganization?.id) return;

        try {
            const compressed = await compressImage(file, 500, 0.85); // Improved for High DPI
            setLogoPreview(compressed);
            updateSettings({ ...settings, logoUrl: compressed });
        } catch (err: any) {

            console.error(err);
            showAlert('Error', `Failed to process or save logo image: ${err.message}`, 'danger');
        }
    };

    const handleDocumentLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentOrganization?.id) return;

        try {
            const compressed = await compressImage(file, 1500, 0.95); // High Res for Print
            updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, logoUrl: compressed } });
        } catch (err: any) {
            console.error(err);
            showAlert('Error', `Failed to process or save logo image: ${err.message}`, 'danger');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization?.id || !canManageTeam) return;
        setIsProcessingTeam(true);

        try {
            if (!canAssignRole(newUser.role)) throw new Error('You cannot assign this organization role.');
            if (isEditingUser && newUser.uid) {
                const existingMember = teamMembers.find(member => member.uid === newUser.uid && member.organizationId === currentOrganization.id);
                if (!existingMember) throw new Error('This team member is not part of the active organization.');
                await updateDoc(doc(db, 'users', newUser.uid), {
                    name: newUser.name,
                    role: newUser.role,
                    workHours: (newUser.workHours?.start && newUser.workHours?.end) ? newUser.workHours : null,
                });
                showAlert('Team member updated', `${newUser.name} now has the selected access.`, 'success');
            } else {
                const tempPassword = newUser.password || Math.random().toString(36).slice(-8);
                const uid = await createAuthUser(newUser.email, tempPassword);

                await setDoc(doc(db, 'users', uid), {
                    uid,
                    organizationId: currentOrganization.id,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                    status: 'active',
                    workHours: (newUser.workHours?.start && newUser.workHours?.end) ? newUser.workHours : null,
                    createdAt: serverTimestamp()
                });

                setShowCredentials({ email: newUser.email, password: tempPassword });
            }
            setIsUserModalOpen(false);
            setNewUser({ uid: '', email: '', name: '', role: 'admission_officer', password: '', workHours: { start: '', end: '' } });
        } catch (err: any) {
            console.error(err);
            showAlert("Error", `Error: ${err.message}`, "danger");
        } finally {
            setIsProcessingTeam(false);
        }
    };

    const handleDeleteUser = async (uid: string, email: string) => {
        if (!currentOrganization?.id || !canManageTeam) return;
        if (uid === user?.uid) {
            await showAlert('Your account stays active', 'Ask another organization owner to manage your access.', 'warning');
            return;
        }
        const member = teamMembers.find(candidate => candidate.uid === uid && candidate.organizationId === currentOrganization.id);
        if (!member) {
            await showAlert('Team member unavailable', 'This profile does not belong to the active organization.', 'warning');
            return;
        }
        const isConfirmed = await confirm({ title: `Delete ${email}?`, message: 'The profile data will be deleted immediately. The Firebase login account must still be removed manually.', confirmText: 'Delete profile', cancelText: 'Cancel', variant: 'danger' });
        if (!isConfirmed) return;
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'users', uid));
            showAlert("Success", "User profile deleted.", "success");
        } catch (err) {
            console.error(err);
            showAlert("Error", "Failed to delete user profile.", "danger");
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!canManageTeam || !teamMembers.some(member => member.email === email && member.organizationId === currentOrganization?.id)) return;
        const isConfirmed = await confirm({ title: 'Send password reset?', message: `Send a password reset email to ${email}.`, confirmText: 'Send email', cancelText: 'Cancel', variant: 'info' });
        if (!isConfirmed) return;
        
        const appName = `SecondaryReset_${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);
        try {
            await sendPasswordResetEmail(secondaryAuth, email);
            showAlert("Success", `Password reset email sent to ${email}.`, "success");
        } catch (err: any) {
            showAlert("Error", `Error: ${err.message}`, "danger");
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
        if (!db || !currentOrganization?.id || !canManageTeam) return;
        const isConfirmed = await confirm({ title: 'Create demo team?', message: "Create three demo users with the temporary password 'stemflow123'.", confirmText: 'Create users', cancelText: 'Cancel', variant: 'warning' });
        if (!isConfirmed) return;

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
                        uid,
                        organizationId: currentOrganization.id,
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
        showAlert("Demo Users Created", results, "success");
    };

    const togglePermission = async (roleId: string, permission: string) => {
        if (!db || !currentOrganization?.id || !canManageTeam) return;
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        let newPermissions = role.permissions.includes(permission)
            ? role.permissions.filter(p => p !== permission)
            : [...role.permissions, permission];

        // Optimistic Update
        const updatedRoles = roles.map(r => r.id === roleId ? { ...r, permissions: newPermissions } : r);
        setRoles(updatedRoles);

        await setDoc(doc(db, 'organizations', currentOrganization.id, 'roles', roleId), { ...role, id: roleId, permissions: newPermissions, updatedAt: serverTimestamp() }, { merge: true });
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

    const downloadWorkspaceExport = () => {
        if (!currentOrganization?.id) return;
        const payload = {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            organization: { id: currentOrganization.id, name: currentOrganization.name, slug: currentOrganization.slug },
            settings,
            students,
            programs,
            enrollments,
            payments
        };
        const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${currentOrganization.slug || 'edufy'}-workspace-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    };

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentOrganization?.id || !canManageSettings) return;
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
                        name, parentPhone, email: email || '', parentName: parentName || '', address: address || '', school: school || '', birthDate: birthDate || '', medicalInfo: medicalInfo || '', status: 'active', organizationId: currentOrganization.id, createdAt: serverTimestamp()
                    });
                    successCount++;
                } catch (err) { errorCount++; }
            }
            setIsImporting(false);
            showAlert("Import Complete", `Success: ${successCount}\nFailed/Skipped: ${errorCount}`, "info");
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
            showAlert("Success", `Write Connection Successful!\nCreated doc: _connection_test/${testId}`, "success");
        } catch (err: any) {
            showAlert("Error", `Connection Test Failed: ${err.message}`, "danger");
        }
    };

    const handleRecreateOrg = async () => {
        if (!db || !user) return;
        const isConfirmed = await confirm({ title: 'Recreate the default organization?', message: "Only continue when Debug Info shows the Organization ID as N/A.", confirmText: 'Recreate', cancelText: 'Cancel', variant: 'warning' });
        if (!isConfirmed) return;

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
            showAlert("Success", "Organization Recreated! Please refresh the page to see the correct Organization ID.", "success");
        } catch (e: any) {
            showAlert("Error", "Error: " + e.message, "danger");
        }
    };

    const handleMigrateAcademicYear = async () => {
        if (!db) return;
        const shouldMigrate = await confirm({ title: 'Migrate the academic year?', message: 'Move all 2024-2025 records to 2025-2026. This cannot be undone.', confirmText: 'Migrate records', cancelText: 'Cancel', variant: 'warning' });
        if (!shouldMigrate) return;

        setIsMigrating(true);
        setMigrationResult('Starting Academic Year Migration...');

        try {
            const collectionsToScan = ['enrollments', 'payments', 'expenses', 'classes', 'attendance', 'tasks'];
            let updatedCount = 0;

            for (const colName of collectionsToScan) {
                const q = collection(db, colName);
                const snapshot = await getDocsFromServer(q);

                const batch = writeBatch(db);
                let batchCount = 0;

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.session === '2024-2025') {
                        batch.update(docSnap.ref, { session: '2025-2026' });
                        batchCount++;
                        updatedCount++;
                    }
                });

                if (batchCount > 0) {
                    await batch.commit();
                }
            }

            await setDoc(doc(db, 'settings', 'global'), { academicYear: '2025-2026' }, { merge: true });
            updateSettings({ ...settings, academicYear: '2025-2026' });

            setMigrationResult(`Success! Migrated ${updatedCount} records to 2025-2026.`);
            showAlert("Success", `Migrated ${updatedCount} records to 2025-2026.`, "success");
        } catch (e: any) {
            setMigrationResult(`Error: ${e.message}`);
            showAlert("Error", "Migration failed: " + e.message, "danger");
        } finally {
            setIsMigrating(false);
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
            const userWantsToMigrate = await confirm({ title: 'Force organization migration?', message: `${report}\n\nMove every listed record to makerlab-academy. This changes ownership across organizations.`, confirmText: 'Force migration', cancelText: 'Cancel', variant: 'danger' });

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
                        batch.update(doc(db!, colName, docSnap.id), { organizationId: 'makerlab-academy' });
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
            showAlert('Migration complete', `Moved ${totalUpdated} documents to your account.`, 'success');

        } catch (err: any) {
            console.error("Migration/Analysis Failed:", err);
            setMigrationResult(`Error: ${err.message}`);
            showAlert('Migration failed', err.message, 'danger');
        } finally {
            setIsMigrating(false);
        }
    };

    const handleRepairFinancials = async () => {
        if (!db || !currentOrganization?.id || !isSuperAdmin) return;
        const isConfirmed = await confirm({ title: 'Recalculate enrollment totals?', message: 'Rebuild financial totals from program pricing and payments to repair invalid balances.', confirmText: 'Recalculate', cancelText: 'Cancel', variant: 'warning' });
        if (!isConfirmed) return;

        setIsRepairing(true);
        setMigrationResult('Fetching Data...');

        try {
            const orgId = currentOrganization.id;
            const progsSnap = await getDocsFromServer(query(collection(db, 'programs'), where('organizationId', '==', orgId)));
            const progs = progsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            const paySnap = await getDocsFromServer(query(collection(db, 'payments'), where('organizationId', '==', orgId)));
            const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            const enrollSnap = await getDocsFromServer(query(collection(db, 'enrollments'), where('organizationId', '==', orgId)));

            let updatedCount = 0;
            let batch = writeBatch(db);
            let opCount = 0;
            const BATCH_LIMIT = 450;

            for (const docSnap of enrollSnap.docs) {
                const enr = docSnap.data();
                let totalAmount = enr.totalAmount;
                if (!totalAmount || isNaN(totalAmount)) {
                    const prog = progs.find((p: any) => p.id === enr.programId);
                    if (prog) {
                        const pack = prog.packs?.find((p: any) => p.name === enr.packName);
                        if (pack) {
                            totalAmount = pack.priceAnnual || pack.price || 0;
                        } else {
                            totalAmount = prog.packs?.[0]?.price || 0;
                        }
                    } else {
                        totalAmount = 0;
                    }
                }

                const enrPayments = payments.filter((p: any) => p.enrollmentId === docSnap.id);
                const paidAmount = enrPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                const balance = totalAmount - paidAmount;
                if (enr.totalAmount !== totalAmount || enr.paidAmount !== paidAmount || enr.balance !== balance) {
                    batch.update(doc(db, 'enrollments', docSnap.id), {
                        totalAmount,
                        paidAmount,
                        balance
                    });
                    opCount++;
                    updatedCount++;
                }

                if (opCount === BATCH_LIMIT) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            }

            if (opCount > 0) {
                await batch.commit();
            }

            setMigrationResult(`Fixed ${updatedCount} enrollments.`);
            showAlert('Repair complete', `Updated ${updatedCount} enrollment records.`, 'success');

        } catch (err: any) {
            console.error(err);
            showAlert('Repair failed', err.message, 'danger');
        } finally {
            setIsRepairing(false);
        }
    };


    // --- RENDER: STUDENT SETTINGS ---
    if (isStudent) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8 h-full animate-in fade-in slide-in-from-bottom-4">
                <AtlasCommandHeader
                    eyebrow="Personal settings"
                    title="My Account"
                    description="Manage your sign-in, profile information, and account security."
                    icon={User}
                />

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
                                className={`min-h-10 px-4 py-2 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${biometricActive ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-teal-500 hover:bg-teal-400 text-slate-950'}`}
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
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-teal-400 outline-none"
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
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-teal-400 outline-none"
                                    value={passwordForm.confirm}
                                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                    placeholder="Repeat password"
                                />
                            </div>
                            <button type="submit" className="w-full min-h-10 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">Update password</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    const team = teamMembers.filter(member => !['student', 'parent'].includes(member.role));
    const enabledModules = Object.entries(currentOrganization?.modules || {}).filter(([, enabled]) => enabled === true).length;
    const planName = currentOrganization?.subscription?.planId || (currentOrganization?.status === 'trial' ? 'Trial' : 'Legacy');
    const configurableRoles = roles.filter(role => !['super_admin', 'owner', 'admin', 'student', 'parent'].includes(role.id));
    const assignableRoles = roles.filter(role => canAssignRole(role.id));
    const selectedRole = configurableRoles.find(role => role.id === selectedRoleId) || configurableRoles[0];
    const settingsSections: SettingsNavigationItem<SettingsSection>[] = [
        { id: 'general', label: 'Workspace', description: 'Identity and operations', icon: Building2 },
        { id: 'plan', label: 'Plan & apps', description: 'Subscription and limits', icon: CreditCard },
        { id: 'documents', label: 'Documents', description: 'Invoices and certificates', icon: Printer },
        { id: 'forms', label: 'Enrollment form', description: 'Family information', icon: FileText },
        { id: 'data', label: 'Data', description: 'Import and portability', icon: Database },
        { id: 'api', label: 'Integrations', description: 'Connected services', icon: Plug },
        ...(canManageTeam ? [{ id: 'team' as const, label: 'Team & access', description: 'People and permissions', icon: Users, badge: `${team.length}` }] : []),
        ...(isSuperAdmin ? [{ id: 'maintenance' as const, label: 'Platform tools', description: 'Diagnostics and repair', icon: AlertTriangle }] : [])
    ];

    // --- RENDER: ADMIN SETTINGS ---
    return (
        <div className="atlas-settings-workspace mx-auto flex w-full max-w-[1320px] min-w-0 flex-col gap-4 pb-24 md:pb-8">
            <div className="atlas-settings-commandbar sticky top-0 z-20 flex min-w-0 flex-col gap-4 border-b px-1 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="atlas-accent-well flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"><Settings size={17} /></span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="atlas-data-label atlas-text-accent">Workspace controls</span>
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${isDirty ? 'text-amber-200' : 'text-emerald-300'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-amber-300' : 'bg-emerald-400'}`} />
                                {isDirty ? 'Unsaved changes' : 'Up to date'}
                            </span>
                        </div>
                        <h2 className="atlas-text-strong mt-1 truncate text-lg font-black leading-tight">
                            {settings.academyName || currentOrganization?.name || 'Academy workspace'}
                        </h2>
                        <p className="atlas-text-subtle mt-1 text-xs">Identity, operating defaults, documents, and access.</p>
                    </div>
                </div>
                <AtlasActionButton
                    icon={isSaving ? Loader2 : Save}
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={isSaving || !isDirty || !canManageSettings}
                    className={`shrink-0 self-start sm:self-center ${isSaving ? '[&_svg]:animate-spin' : ''}`}
                >
                    {isSaving ? 'Saving...' : 'Save changes'}
                </AtlasActionButton>
            </div>

            <SettingsNavigation items={settingsSections} activeId={activeTab} onChange={setActiveTab} mode="mobile" />

            <div className="flex min-h-[480px] min-w-0 items-start gap-5 xl:gap-7">
                <SettingsNavigation items={settingsSections} activeId={activeTab} onChange={setActiveTab} mode="desktop" />
                <main className="min-w-0 flex-1">

                {/* API TAB */}
                {activeTab === 'api' && (
                    <div className="space-y-4">
                        <SettingsPanel title="Connected services" description="Organization credentials are stored separately from everyday workspace settings." icon={Plug} status={<span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2 py-0.5 text-[10px] font-bold text-teal-200">Admin only</span>}>
                            <div className="space-y-3">
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-300/10 text-sky-300"><Wand2 size={17} /></span>
                                            <div><p className="atlas-text-strong text-sm font-bold">Google Gemini</p><p className="atlas-text-subtle mt-0.5 text-xs">Image and creative generation</p></div>
                                        </div>
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${settings.apiConfig?.googleApiKey ? 'text-emerald-300' : 'text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${settings.apiConfig?.googleApiKey ? 'bg-emerald-400' : 'bg-slate-600'}`} />{settings.apiConfig?.googleApiKey ? 'Configured' : 'Not connected'}</span>
                                    </div>
                                    <div className="mt-4"><SettingsField label="API key" hint="Saved in the active organization integration vault."><input type="password" autoComplete="off" disabled={!canManageIntegrations} className={`${settingsInputClass} font-mono`} value={settings.apiConfig?.googleApiKey || ''} onChange={event => updateSettings({ ...settings, apiConfig: { ...settings.apiConfig, googleApiKey: event.target.value } })} placeholder="AIza..." /></SettingsField></div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-300"><Zap size={17} /></span><div><p className="atlas-text-strong text-sm font-bold">OpenAI</p><p className="atlas-text-subtle mt-0.5 text-xs">Assistant and automation services</p></div></div>
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${settings.apiConfig?.openaiApiKey ? 'text-emerald-300' : 'text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${settings.apiConfig?.openaiApiKey ? 'bg-emerald-400' : 'bg-slate-600'}`} />{settings.apiConfig?.openaiApiKey ? 'Configured' : 'Optional'}</span>
                                    </div>
                                    <div className="mt-4"><SettingsField label="API key"><input type="password" autoComplete="off" disabled={!canManageIntegrations} className={`${settingsInputClass} font-mono`} value={settings.apiConfig?.openaiApiKey || ''} onChange={event => updateSettings({ ...settings, apiConfig: { ...settings.apiConfig, openaiApiKey: event.target.value } })} placeholder="sk-..." /></SettingsField></div>
                                </div>
                            </div>
                        </SettingsPanel>
                        <div className="flex items-start gap-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100/80"><Shield size={16} className="mt-0.5 shrink-0 text-amber-300" /><span>Only organization owners and authorized administrators can load or change integration credentials.</span></div>
                    </div>
                )}

                {false && activeTab === 'api' && (
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
                                    <Wand2 size={16} className="text-teal-400" /> OpenAI (Coming Soon)
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">For Chatbot Persona</span>
                                </h4>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">API Key</label>
                                    <input
                                        type="password"
                                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-teal-400 outline-none font-mono text-sm"
                                        value={settings.apiConfig?.openaiApiKey || ''}
                                        onChange={e => setSettings({ ...settings, apiConfig: { ...settings.apiConfig, openaiApiKey: e.target.value } })}
                                        placeholder="sk-..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div>
                        {!canManageSettings && <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs text-amber-200">You can review workspace settings. An organization owner can make changes.</div>}
                        <div className="atlas-settings-summary mb-5 grid grid-cols-2 overflow-hidden rounded-lg border md:grid-cols-4">
                            <SettingsMetric label="Workspace" value={currentOrganization?.status || 'Active'} detail={currentOrganization?.slug} icon={BadgeCheck} />
                            <SettingsMetric label="Academic year" value={settings.academicYear} detail="Operating year" icon={Calendar} />
                            <SettingsMetric label="Team" value={team.length} detail="Staff accounts" icon={Users} />
                            <SettingsMetric label="Apps" value={enabledModules} detail="Enabled modules" icon={Boxes} />
                        </div>

                        <SettingsPanel title="Workspace identity" description="The name and mark shown to staff and families." icon={Building2}>
                            <div className="grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)]">
                                <div>
                                    <span className="atlas-text-muted mb-1.5 block text-xs font-bold">Academy logo</span>
                                    <label className={`group relative flex aspect-square w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-slate-950/55 transition-colors ${canManageSettings ? 'cursor-pointer hover:border-teal-300/45' : 'cursor-not-allowed opacity-60'}`}>
                                        {logoPreview ? <img src={logoPreview} alt={`${settings.academyName} logo`} className="h-full w-full object-contain p-2" /> : <ImageIcon className="text-slate-600" size={28} />}
                                        {canManageSettings && <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-950/85 py-1.5 text-[10px] font-bold text-slate-300 opacity-0 transition-opacity group-hover:opacity-100"><Upload size={11} /> Replace</span>}
                                        <input type="file" accept="image/*" disabled={!canManageSettings} onChange={handleLogoUpload} className="hidden" />
                                    </label>
                                </div>
                                <div className="grid content-start gap-x-4 gap-y-5 lg:grid-cols-2">
                                    <SettingsField label="Academy name" required hint="Used across the workspace and family-facing documents.">
                                        <input disabled={!canManageSettings} className={settingsInputClass} value={settings.academyName} onChange={event => updateSettings({ ...settings, academyName: event.target.value })} />
                                    </SettingsField>
                                    <SettingsField label="Academic year" required hint="Use a range such as 2026-2027.">
                                        <input disabled={!canManageSettings} className={settingsInputClass} value={settings.academicYear} onChange={event => updateSettings({ ...settings, academicYear: event.target.value })} />
                                    </SettingsField>
                                </div>
                            </div>
                        </SettingsPanel>

                        <SettingsPanel title="Regional operations" description="Defaults used by schedules, finance, and reports." icon={Globe}>
                            <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                                <SettingsField label="Language">
                                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-slate-950/55 p-1">
                                        {([['en', 'English'], ['fr', 'Francais']] as const).map(([value, label]) => <button key={value} type="button" disabled={!canManageSettings} onClick={() => updateSettings({ ...settings, language: value })} className={`h-8 rounded-md text-xs font-bold transition-colors ${settings.language === value ? 'bg-teal-400 text-slate-950' : 'text-slate-500 hover:bg-white/[0.05] hover:text-white'}`}>{label}</button>)}
                                    </div>
                                </SettingsField>
                                <SettingsField label="Currency">
                                    <select disabled={!canManageSettings} className={settingsInputClass} value={settings.currency || 'MAD'} onChange={event => updateSettings({ ...settings, currency: event.target.value })}>
                                        <option value="MAD">MAD - Moroccan dirham</option><option value="EUR">EUR - Euro</option><option value="USD">USD - US dollar</option>
                                    </select>
                                </SettingsField>
                                <SettingsField label="Time zone">
                                    <select disabled={!canManageSettings} className={settingsInputClass} value={settings.timezone || 'Africa/Casablanca'} onChange={event => updateSettings({ ...settings, timezone: event.target.value })}>
                                        <option value="Africa/Casablanca">Casablanca</option><option value="Europe/Paris">Paris</option><option value="UTC">UTC</option>
                                    </select>
                                </SettingsField>
                                <SettingsField label="Week starts on">
                                    <select disabled={!canManageSettings} className={settingsInputClass} value={settings.weekStartsOn ?? 1} onChange={event => updateSettings({ ...settings, weekStartsOn: Number(event.target.value) as 0 | 1 | 6 })}>
                                        <option value={1}>Monday</option><option value={6}>Saturday</option><option value={0}>Sunday</option>
                                    </select>
                                </SettingsField>
                                <SettingsField label="Workday starts"><input type="time" disabled={!canManageSettings} className={settingsInputClass} value={settings.defaultWorkHours?.start || '09:00'} onChange={event => updateSettings({ ...settings, defaultWorkHours: { start: event.target.value, end: settings.defaultWorkHours?.end || '18:00' } })} /></SettingsField>
                                <SettingsField label="Workday ends"><input type="time" disabled={!canManageSettings} className={settingsInputClass} value={settings.defaultWorkHours?.end || '18:00'} onChange={event => updateSettings({ ...settings, defaultWorkHours: { start: settings.defaultWorkHours?.start || '09:00', end: event.target.value } })} /></SettingsField>
                            </div>
                        </SettingsPanel>

                        <SettingsPanel title="Family contact & sign-in" description="Receipt support details and security for this device." icon={Shield}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <SettingsField label="Receipt contact" hint="Phone or email shown when a family needs help."><input disabled={!canManageSettings} className={settingsInputClass} value={settings.receiptContact || ''} onChange={event => updateSettings({ ...settings, receiptContact: event.target.value })} placeholder="finance@academy.com" /></SettingsField>
                                <SettingsField label="Receipt footer"><textarea disabled={!canManageSettings} className={`${settingsInputClass} min-h-20 resize-y`} value={settings.receiptFooter || ''} onChange={event => updateSettings({ ...settings, receiptFooter: event.target.value })} /></SettingsField>
                                {canUseBiometrics && <div className="md:col-span-2"><SettingsToggle checked={biometricActive} onChange={handleToggleBiometric} label="Biometric sign-in on this device" description="Use the device authenticator for your Edufy account." /></div>}
                            </div>
                        </SettingsPanel>
                    </div>
                )}

                {/* Legacy general markup retained temporarily for data compatibility. */}
                {false && activeTab === 'general' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">General Configuration</h3></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">System Language</label>
                                <div className="flex gap-3">
                                    <button onClick={() => updateSettings({ ...settings, language: 'en' })} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${settings.language === 'en' ? 'bg-teal-500 border-teal-400 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                                        <span className="text-lg">🇺🇸</span> English
                                    </button>
                                    <button onClick={() => updateSettings({ ...settings, language: 'fr' })} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${settings.language === 'fr' ? 'bg-teal-500 border-teal-400 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
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
                                        {logoPreview ? <img src={logoPreview || undefined} alt="Preview" className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-700" />}
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
                                <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <Clock size={14} className="text-red-400" /> Standard Work Hours
                                </label>
                                <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Start Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full bg-transparent text-white font-bold outline-none"
                                            value={settings.defaultWorkHours?.start || '09:00'}
                                            onChange={e => updateSettings({ ...settings, defaultWorkHours: { ...settings.defaultWorkHours, start: e.target.value, end: settings.defaultWorkHours?.end || '18:00' } })}
                                        />
                                    </div>
                                    <div className="w-px h-8 bg-slate-800"></div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">End Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full bg-transparent text-white font-bold outline-none"
                                            value={settings.defaultWorkHours?.end || '18:00'}
                                            onChange={e => updateSettings({ ...settings, defaultWorkHours: { ...settings.defaultWorkHours, start: settings.defaultWorkHours?.start || '09:00', end: e.target.value } })}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">Default schedule for all team members unless overridden individually.</p>
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

                {activeTab === 'plan' && (
                    <div className="space-y-4">
                        <SettingsPanel
                            title="Subscription"
                            description="Your Edufy plan and workspace standing."
                            icon={CreditCard}
                            status={<span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold capitalize text-emerald-300">{currentOrganization?.subscription?.status || currentOrganization?.status || 'active'}</span>}
                        >
                            <div className="atlas-settings-summary atlas-settings-summary--two-column grid grid-cols-2 overflow-hidden rounded-lg border">
                                <SettingsMetric label="Plan" value={planName} detail={currentOrganization?.subscription?.interval ? `Billed ${currentOrganization.subscription.interval}ly` : 'Workspace plan'} icon={BadgeCheck} />
                                <SettingsMetric label="Students" value={currentOrganization?.limits?.students || 'Flexible'} detail="Plan allowance" icon={Users} />
                                <SettingsMetric label="Storage" value={currentOrganization?.limits?.storage ? `${currentOrganization.limits.storage} GB` : 'Flexible'} detail="Plan allowance" icon={HardDrive} />
                                <SettingsMetric label="Apps" value={enabledModules} detail="Currently enabled" icon={Boxes} />
                            </div>
                            {currentOrganization?.subscription?.nextBillingDate && <div className="atlas-text-muted mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs"><Calendar size={14} className="text-teal-300" /> Next billing date: {currentOrganization.subscription.nextBillingDate.toDate?.().toLocaleDateString() || 'Available in billing'}</div>}
                        </SettingsPanel>

                        <SettingsPanel title="Enabled apps" description="Products available inside this organization." icon={Boxes}>
                            <div className="divide-y divide-white/10">
                                {Object.entries(currentOrganization?.modules || {}).filter(([, enabled]) => enabled === true).map(([moduleId]) => (
                                    <div key={moduleId} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="atlas-accent-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"><Boxes size={16} /></span>
                                            <div className="min-w-0"><p className="atlas-text-strong truncate text-sm font-bold">{moduleId === 'erp' ? 'Edufy ERP' : moduleId === 'makerPro' ? 'Maker Pro' : moduleId === 'sparkQuest' ? 'SparkQuest' : moduleId.replace(/[-_]/g, ' ')}</p><p className="atlas-text-subtle text-xs">Available to this workspace</p></div>
                                        </div>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 size={14} /> Active</span>
                                    </div>
                                ))}
                                {enabledModules === 0 && <AtlasEmptyState title="No apps enabled" description="The workspace owner can manage products from the Edufy app catalog." icon={Boxes} />}
                            </div>
                        </SettingsPanel>

                        <SettingsPanel title="Workspace reference" description="Identifiers used for support and tenant isolation." icon={Shield}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SettingsField label="Organization ID"><input className={`${settingsInputClass} font-mono`} readOnly value={currentOrganization?.id || ''} /></SettingsField>
                                <SettingsField label="Workspace slug"><input className={`${settingsInputClass} font-mono`} readOnly value={currentOrganization?.slug || ''} /></SettingsField>
                            </div>
                        </SettingsPanel>
                    </div>
                )}

                {/* DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <SettingsPanel title="Document identity" description="The legal identity used on invoices, receipts, attestations, and certificates." icon={Printer}>
                            <div className="grid gap-5 md:grid-cols-[128px_minmax(0,1fr)]">
                                <div>
                                    <span className="atlas-text-muted mb-1.5 block text-xs font-bold">Print logo</span>
                                    <label className={`group relative flex aspect-square w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-slate-950/55 ${canManageSettings ? 'cursor-pointer hover:border-teal-300/45' : 'cursor-not-allowed opacity-60'}`}>
                                        {settings.documentConfig?.logoUrl ? <img src={settings.documentConfig.logoUrl} alt="Document logo" className="h-full w-full object-contain p-2" /> : <Printer className="text-slate-600" size={26} />}
                                        {canManageSettings && <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-950/85 py-1.5 text-[10px] font-bold text-slate-300 opacity-0 transition-opacity group-hover:opacity-100"><Upload size={11} /> Replace</span>}
                                        <input type="file" accept="image/*" disabled={!canManageSettings} onChange={handleDocumentLogoUpload} className="hidden" />
                                    </label>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2"><SettingsField label="Legal organization name" hint={`Falls back to ${settings.academyName}.`}><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.headerName || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, headerName: event.target.value } })} /></SettingsField></div>
                                    <SettingsField label="Document email"><input type="email" disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.email || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, email: event.target.value } })} /></SettingsField>
                                    <SettingsField label="Document phone"><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.phone || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, phone: event.target.value } })} /></SettingsField>
                                    <SettingsField label="Website"><input type="url" disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.website || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, website: event.target.value } })} /></SettingsField>
                                    <SettingsField label="Address"><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.address || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, address: event.target.value } })} /></SettingsField>
                                </div>
                            </div>
                        </SettingsPanel>
                        <SettingsPanel title="Invoice identifiers" description="Official registration details printed on financial documents." icon={FileText}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SettingsField label="ICE / Tax ID"><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.taxId || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, taxId: event.target.value } })} /></SettingsField>
                                <SettingsField label="RC / Registration ID"><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.regId || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, regId: event.target.value } })} /></SettingsField>
                                <SettingsField label="Patente"><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.patente || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, patente: event.target.value } })} /></SettingsField>
                                <SettingsField label="CNSS"><input disabled={!canManageSettings} className={settingsInputClass} value={settings.documentConfig?.cnss || ''} onChange={event => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, cnss: event.target.value } })} /></SettingsField>
                            </div>
                        </SettingsPanel>
                    </div>
                )}

                {false && activeTab === 'documents' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">Document Settings</h3></div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-500 mb-4">Configure the details that appear on formal documents (Invoices, Certificates).</p>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Legal Organization Name</label>
                                <input
                                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none"
                                    value={settings.documentConfig?.headerName || ''}
                                    onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, headerName: e.target.value } })}
                                    placeholder={settings.academyName}
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Leave empty to use Academy Name.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Document Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                        {settings.documentConfig?.logoUrl ? <img src={settings.documentConfig?.logoUrl} alt="Doc Logo" className="w-full h-full object-contain" /> : <Printer className="text-slate-700" />}
                                    </div>
                                    <div className="flex-1">
                                        <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors w-fit">
                                            <Upload size={16} /> Upload Document Logo
                                            <input type="file" accept="image/*" onChange={handleDocumentLogoUpload} className="hidden" />
                                        </label>
                                        <p className="text-[10px] text-slate-500 mt-2">Specific logo for invoices/certificates (e.g. higher resolution or black & white).</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.address || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, address: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Website</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.website || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, website: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.email || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, email: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.phone || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, phone: e.target.value } })} />
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-4"></div>
                            <h4 className="text-sm font-bold text-white mb-2">Legal Identifiers (For Invoices)</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">ICE (Tax ID)</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.taxId || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, taxId: e.target.value } })} placeholder="e.g. 002798577000063" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">RC (Reg ID)</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.regId || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, regId: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Patente</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.patente || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, patente: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">CNSS</label>
                                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:border-blue-500 outline-none" value={settings.documentConfig?.cnss || ''} onChange={e => updateSettings({ ...settings, documentConfig: { ...settings.documentConfig, cnss: e.target.value } })} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FORMS TAB */}
                {activeTab === 'forms' && (
                    <SettingsPanel title="Enrollment form" description="Choose what families provide when registering a learner." icon={FileText}>
                        <div className="space-y-3">
                            {([
                                ['parentName', 'Parent or guardian name', 'Connect the learner to their primary guardian.'],
                                ['email', 'Email address', 'Used for confirmations and family communication.'],
                                ['address', 'Home address', 'Collect the learner household address.'],
                                ['school', 'Current school', 'Record the learner current school.'],
                                ['birthDate', 'Date of birth', 'Supports age-aware groups and documents.'],
                                ['medicalInfo', 'Medical notes', 'Collect allergies or other essential care information.']
                            ] as const).map(([field, label, description]) => {
                                const config = settings.studentFormConfig[field];
                                return (
                                    <div key={field} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[minmax(0,1fr)_150px_150px] sm:items-center">
                                        <div><p className="atlas-text-strong text-sm font-bold">{label}</p><p className="atlas-text-subtle mt-0.5 text-xs leading-5">{description}</p></div>
                                        <SettingsToggle checked={config.active} disabled={!canManageSettings} onChange={() => updateSettings({ ...settings, studentFormConfig: { ...settings.studentFormConfig, [field]: { active: !config.active, required: config.active ? false : config.required } } })} label="Visible" />
                                        <SettingsToggle checked={config.required} disabled={!canManageSettings || !config.active} tone="amber" onChange={() => updateSettings({ ...settings, studentFormConfig: { ...settings.studentFormConfig, [field]: { ...config, required: !config.required } } })} label="Required" />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex items-start gap-2 rounded-lg border border-teal-300/15 bg-teal-300/[0.06] px-3 py-2.5 text-xs text-teal-100/80"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-teal-300" /><span>Name and parent phone remain part of the core registration flow so every learner can be identified and contacted.</span></div>
                    </SettingsPanel>
                )}

                {false && activeTab === 'forms' && (
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
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <SettingsMetric label="Students" value={students.length} icon={Users} />
                            <SettingsMetric label="Programs" value={programs.length} icon={Calendar} />
                            <SettingsMetric label="Enrollments" value={enrollments.length} icon={FileText} />
                            <SettingsMetric label="Payments" value={payments.length} icon={CreditCard} />
                        </div>
                        <SettingsPanel title="Import students" description="Add learner records to this organization from a structured CSV file." icon={Upload} actions={<AtlasActionButton icon={Download} onClick={downloadCSVTemplate}>CSV template</AtlasActionButton>}>
                            <label className={`relative flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-colors ${canManageSettings ? 'cursor-pointer hover:border-teal-300/45 hover:bg-teal-300/[0.04]' : 'cursor-not-allowed opacity-60'}`}>
                                <input type="file" accept=".csv" onChange={handleBulkImport} disabled={isImporting || !canManageSettings} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                                <span className="atlas-accent-well flex h-11 w-11 items-center justify-center rounded-lg border">{isImporting ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}</span>
                                <span className="atlas-text-strong mt-3 text-sm font-bold">{isImporting ? 'Importing students...' : 'Choose a CSV file'}</span>
                                <span className="atlas-text-subtle mt-1 text-xs">Name and parent phone are required.</span>
                            </label>
                        </SettingsPanel>
                        <SettingsPanel title="Workspace export" description="Download the current tenant data for portability and controlled backups." icon={FileSpreadsheet} actions={<AtlasActionButton icon={Download} onClick={downloadWorkspaceExport}>Export JSON</AtlasActionButton>}>
                            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-4">
                                <Shield size={18} className="mt-0.5 shrink-0 text-teal-300" />
                                <div><p className="atlas-text-strong text-sm font-bold">Organization-scoped export</p><p className="atlas-text-subtle mt-1 text-xs leading-5">Includes workspace settings, students, programs, enrollments, and payments currently loaded for {settings.academyName}.</p></div>
                            </div>
                        </SettingsPanel>
                    </div>
                )}

                {false && activeTab === 'data' && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30"><h3 className="font-bold text-white">Data Management</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <div><h4 className="text-sm font-medium text-white mb-1">Bulk Student Upload</h4><p className="text-xs text-slate-500">Import students via CSV.</p></div>
                                <button onClick={downloadCSVTemplate} className="text-xs flex items-center gap-1 text-teal-300 border border-slate-700 px-3 py-1.5 rounded-lg bg-slate-800 hover:border-teal-400/40"><Download size={12} /> Download template</button>
                            </div>
                            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-teal-400/60 hover:bg-slate-800/30 transition-colors cursor-pointer relative">
                                <input type="file" accept=".csv" onChange={handleBulkImport} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                                {isImporting ? <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" /> : <Upload className="w-8 h-8 text-slate-500" />}
                                <span className="text-sm font-medium text-slate-300 mt-2">{isImporting ? 'Importing...' : 'Upload CSV'}</span>
                            </div>
                            <div className="bg-amber-950/10 border border-amber-900/30 p-3 rounded flex gap-3 items-start"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-xs text-amber-200/80">Ensure CSV matches template. Required: Name, ParentPhone.</p></div>
                        </div>
                    </div>
                )}

                {/* TEAM TAB (RBAC) */}
                {activeTab === 'team' && (
                    <div className="space-y-4">
                        <SettingsPanel title="Team members" description="Staff accounts with access to this organization." icon={Users} actions={<AtlasActionButton icon={UserPlus} variant="primary" onClick={openCreateTeamMember}>Add member</AtlasActionButton>}>
                            {team.length === 0 ? (
                                <AtlasEmptyState title="No staff accounts yet" description="Add the first team member and choose the role that matches their work." icon={Users} action={<AtlasActionButton icon={UserPlus} variant="primary" onClick={openCreateTeamMember}>Add member</AtlasActionButton>} />
                            ) : (
                                <div className="divide-y divide-white/10">
                                    {team.map(member => (
                                        <div key={member.uid || member.email} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-black text-teal-200">{member.name?.slice(0, 1).toUpperCase() || 'U'}</span>
                                                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="atlas-text-strong truncate text-sm font-bold">{member.name}</p>{member.uid === user?.uid && <span className="rounded bg-teal-300/10 px-1.5 py-0.5 text-[10px] font-bold text-teal-200">You</span>}</div><p className="atlas-text-subtle truncate text-xs">{member.email}</p></div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold capitalize text-slate-300">{member.role.replace(/_/g, ' ')}</span>
                                                <span className={`hidden items-center gap-1.5 text-xs font-bold md:flex ${member.status === 'active' ? 'text-emerald-300' : 'text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'}`} />{member.status}</span>
                                                <div className="flex items-center gap-1">
                                                    {canAssignRole(member.role) && <button type="button" onClick={() => { setNewUser({ uid: member.uid || '', email: member.email, name: member.name, role: member.role, password: '', workHours: member.workHours || { start: '', end: '' } }); setIsEditingUser(true); setIsUserModalOpen(true); }} aria-label={`Edit ${member.name}`} title="Edit member" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"><Pencil size={15} /></button>}
                                                    <button type="button" onClick={() => handleResetPassword(member.email)} aria-label={`Reset password for ${member.name}`} title="Send password reset" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-amber-300"><Key size={15} /></button>
                                                    {!['owner', 'admin', 'super_admin'].includes(member.role) && member.uid !== user?.uid && <button type="button" onClick={() => handleDeleteUser(member.uid!, member.email)} aria-label={`Delete ${member.name}`} title="Delete member" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition-colors hover:border-rose-300/25 hover:bg-rose-300/10 hover:text-rose-300"><Trash2 size={15} /></button>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isSuperAdmin && <div className="mt-4 border-t border-white/10 pt-4"><AtlasActionButton icon={Wand2} variant="quiet" disabled={isProcessingTeam} onClick={handleSeedTeam}>{isProcessingTeam ? 'Creating demo team...' : 'Create demo team'}</AtlasActionButton></div>}
                        </SettingsPanel>

                        <SettingsPanel title="Role permissions" description="Choose one role, then set only the access needed for that job." icon={Shield} status={<span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2 py-0.5 text-[10px] font-bold text-teal-200">Organization policy</span>}>
                            {configurableRoles.length === 0 ? <AtlasEmptyState title="Roles are loading" icon={Loader2} /> : <>
                                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                                    {configurableRoles.map(role => <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className={`h-9 shrink-0 rounded-lg border px-3 text-xs font-bold transition-colors ${selectedRole?.id === role.id ? 'border-teal-300/30 bg-teal-300/10 text-teal-200' : 'border-white/10 bg-white/[0.025] text-slate-400 hover:text-white'}`}>{role.label}</button>)}
                                </div>
                                {selectedRole && <div className="mt-3">
                                    <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2.5"><p className="atlas-text-strong text-sm font-bold">{selectedRole.label}</p><p className="atlas-text-subtle mt-0.5 text-xs">{selectedRole.description}</p></div>
                                    <div className="space-y-4">
                                        {Array.from(new Set(AVAILABLE_PERMISSIONS.map(permission => permission.group))).map(group => (
                                            <div key={group}>
                                                <p className="atlas-text-subtle mb-2 text-[10px] font-bold uppercase tracking-wider">{group}</p>
                                                <div className="grid gap-2 md:grid-cols-2">
                                                    {AVAILABLE_PERMISSIONS.filter(permission => permission.group === group).map(permission => {
                                                        const isAllowed = selectedRole.permissions.includes('*') || selectedRole.permissions.includes(permission.id) || selectedRole.permissions.includes(`${permission.id.split('.')[0]}.*`);
                                                        return <SettingsToggle key={permission.id} checked={isAllowed} disabled={!canManageTeam} onChange={() => togglePermission(selectedRole.id, permission.id)} label={permission.label} />;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>}
                            </>}
                        </SettingsPanel>
                    </div>
                )}

                {false && activeTab === 'team' && (
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
                                    <button onClick={() => { setIsEditingUser(false); setNewUser({ uid: '', email: '', name: '', role: 'admission_officer', password: '', workHours: { start: '', end: '' } }); setIsUserModalOpen(true); }} className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
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
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-teal-950/50 text-teal-300 border border-teal-900' :
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
                    <div className="space-y-4">
                        <SettingsPanel title="Workspace diagnostics" description="Connection and repair tools for the active organization." icon={Zap} status={<span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">Platform access</span>}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={handleTestConnection} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-4 text-left transition-colors hover:border-teal-300/25 hover:bg-teal-300/[0.04]"><span className="atlas-accent-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"><RefreshCw size={16} /></span><span><span className="atlas-text-strong block text-sm font-bold">Test database</span><span className="atlas-text-subtle mt-0.5 block text-xs">Verify an authenticated tenant write.</span></span></button>
                                <button type="button" disabled={isRepairing} onClick={handleRepairFinancials} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-4 text-left transition-colors hover:border-teal-300/25 hover:bg-teal-300/[0.04] disabled:opacity-50"><span className="atlas-accent-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">{isRepairing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}</span><span><span className="atlas-text-strong block text-sm font-bold">Recalculate financials</span><span className="atlas-text-subtle mt-0.5 block text-xs">Repair enrollment totals from tenant payments.</span></span></button>
                            </div>
                            <div className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-slate-950/45 p-3 font-mono text-[11px] text-slate-400 sm:grid-cols-2"><span>User: {user?.uid || 'N/A'}</span><span>Organization: {currentOrganization?.id || 'N/A'}</span></div>
                            {migrationResult && <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 font-mono text-xs text-emerald-300">{migrationResult}</div>}
                        </SettingsPanel>
                        <SettingsPanel title="Legacy recovery" description="One-time migration tools for pre-SaaS MakerLab data." icon={AlertTriangle}>
                            <div className="flex flex-wrap gap-2">
                                <AtlasActionButton icon={RefreshCw} disabled={isMigrating} onClick={handleMigrateData}>{isMigrating ? 'Migrating...' : 'Analyze legacy data'}</AtlasActionButton>
                                <AtlasActionButton icon={Building2} onClick={handleRecreateOrg}>Recreate default organization</AtlasActionButton>
                            </div>
                        </SettingsPanel>
                    </div>
                )}

                {false && activeTab === 'maintenance' && isSuperAdmin && (
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2"><Zap className="text-amber-500" size={18} /> System Maintenance</h3>
                                <p className="text-xs text-slate-500">Tools for system migration and repairs.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-amber-950/15 border border-amber-900/40 p-5 rounded-lg">
                                <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-2">Data migration tools</h4>
                                <p className="text-sm text-slate-400 mb-4">
                                    Migrate legacy Single-Tenant data to the new 'Makerlab Academy' Organization.
                                    This will scan all collections and assign `organizationId: 'makerlab-academy'` to any orphaned documents.
                                </p>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleMigrateData}
                                        disabled={isMigrating}
                                        className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
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

                                    <button onClick={handleMigrateAcademicYear} disabled={isMigrating} className="bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-200 border border-white/10 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                                        <Calendar size={16} /> Shift to 25/26
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
                </main>
            </div>


            {/* Add/Edit User Modal */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={isEditingUser ? "Edit team member" : "Add team member"}>
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3"><span className="atlas-accent-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"><Users size={16} /></span><div><p className="atlas-text-strong text-sm font-bold">{currentOrganization?.name}</p><p className="atlas-text-subtle mt-0.5 text-xs">This account will only access the active organization.</p></div></div>

                    <SettingsField label="Full name" required><input required className={settingsInputClass} value={newUser.name} onChange={event => setNewUser({ ...newUser, name: event.target.value })} placeholder="Jane Doe" /></SettingsField>
                    <SettingsField label="Email address" required><input required type="email" disabled={isEditingUser} className={settingsInputClass} value={newUser.email} onChange={event => setNewUser({ ...newUser, email: event.target.value })} placeholder="jane@academy.com" /></SettingsField>

                    {!isEditingUser && (
                        <SettingsField label="Temporary password" hint="Leave empty and Edufy will generate one.">
                            <div className="relative">
                                <input type="text" className={`${settingsInputClass} pr-12 font-mono`} value={newUser.password} onChange={event => setNewUser({ ...newUser, password: event.target.value })} placeholder="Auto-generated" />
                                <button type="button" onClick={() => setNewUser({ ...newUser, password: Math.random().toString(36).slice(-8) })} aria-label="Generate temporary password" title="Generate password" className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-teal-200"><Wand2 size={15} /></button>
                            </div>
                        </SettingsField>
                    )}

                    <SettingsField label="Role" hint={assignableRoles.find(role => role.id === newUser.role)?.description}>
                        <select className={settingsInputClass} value={newUser.role} onChange={event => setNewUser({ ...newUser, role: event.target.value })}>
                            {assignableRoles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </SettingsField>

                    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                        <div className="mb-3 flex items-center gap-2"><Clock size={14} className="text-teal-300" /><span className="atlas-text-strong text-xs font-bold">Custom work hours</span><span className="atlas-text-subtle text-[10px]">Optional</span></div>
                        <div className="grid grid-cols-2 gap-3">
                            <SettingsField label="Starts"><input type="time" className={settingsInputClass} value={newUser.workHours?.start || ''} onChange={event => setNewUser({ ...newUser, workHours: { start: event.target.value, end: newUser.workHours?.end || '' } })} /></SettingsField>
                            <SettingsField label="Ends"><input type="time" className={settingsInputClass} value={newUser.workHours?.end || ''} onChange={event => setNewUser({ ...newUser, workHours: { start: newUser.workHours?.start || '', end: event.target.value } })} /></SettingsField>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-white/10 pt-4"><AtlasActionButton onClick={() => setIsUserModalOpen(false)}>Cancel</AtlasActionButton><AtlasActionButton type="submit" variant="primary" icon={isProcessingTeam ? Loader2 : isEditingUser ? Save : UserPlus} disabled={isProcessingTeam} className={isProcessingTeam ? '[&_svg]:animate-spin' : ''}>{isProcessingTeam ? 'Saving...' : isEditingUser ? 'Save member' : 'Create member'}</AtlasActionButton></div>
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
                                <button onClick={async () => { await navigator.clipboard.writeText(`Email: ${showCredentials?.email}\nPassword: ${showCredentials?.password}`); showAlert('Credentials copied', 'The email and temporary password are ready to share securely.', 'success'); }} aria-label="Copy credentials" title="Copy credentials" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Copy size={16} /></button>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowCredentials(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">Done</button>
                </div>
            </Modal>
        </div >
    );
};
