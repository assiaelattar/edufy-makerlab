
import React, { useState, useEffect, useRef } from 'react';
import '../components/education-ui/education-system-v1.css';
import './settings/education-settings-v1.css';
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
import { EducationButton, EducationBadge, EducationNotice, EducationState, EducationStatusPill } from '../components/education-ui/EducationPrimitives';
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
    const [importFeedback, setImportFeedback] = useState<{ status: 'info' | 'success' | 'danger'; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<{ status: 'success' | 'danger'; message: string } | null>(null);
    const [integrationError, setIntegrationError] = useState(false);
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
            setIntegrationError(false);
            if (!snapshot.exists()) return;
            const data = snapshot.data() as Pick<AppSettings, 'apiConfig'>;
            setSettings(current => ({ ...current, apiConfig: data.apiConfig || current.apiConfig }));
        }, () => setIntegrationError(true));
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
        setSaveFeedback(null);
    };

    // Team & Access State
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState('admission_officer');
    const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null);
    const [roleLoadState, setRoleLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [roleFeedback, setRoleFeedback] = useState<{ status: 'success' | 'danger'; message: string } | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [isProcessingTeam, setIsProcessingTeam] = useState(false);
    const [teamError, setTeamError] = useState('');
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
        setTeamError('');
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
        setRoleLoadState('loading');
        const unsubRoles = onSnapshot(collection(db, 'organizations', currentOrganization.id, 'roles'), (snap) => {
            const tenantOverrides = snap.docs.map(d => ({ ...d.data(), id: d.id } as RoleDefinition));
            setRoles(authRoles.map(baseRole => tenantOverrides.find(role => role.id === baseRole.id) || baseRole));
            setRoleLoadState('ready');
        }, () => { setRoles(authRoles); setRoleLoadState('error'); });
        return () => { unsubRoles(); };
    }, [activeTab, authRoles, currentOrganization?.id, isStudent]);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization?.id || isSaving || !canManageSettings) return;

        const academyName = settings.academyName.trim();
        const academicYear = settings.academicYear.trim().replace('/', '-');
        if (!academyName) {
            setSaveFeedback({ status: 'danger', message: 'Enter the academy name before saving.' });
            await showAlert('Academy name required', 'Enter the name families and staff should see across the workspace.', 'warning');
            return;
        }
        if (!/^\d{4}-\d{4}$/.test(academicYear)) {
            setSaveFeedback({ status: 'danger', message: 'Use an academic year such as 2026-2027 before saving.' });
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
            setSaveFeedback({ status: 'success', message: 'Workspace changes saved and active.' });
            await showAlert('Workspace updated', 'Your organization settings are now active across Edufy.', 'success');
        } catch (err: any) {
            console.error(err);
            setSaveFeedback({ status: 'danger', message: 'Settings were not saved. Your edits are still here; check the connection and try again.' });
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
            const message = err?.message || 'The selected file is not a supported image.';
            setSaveFeedback({ status: 'danger', message: `Academy logo could not be processed. ${message}` });
            showAlert('Logo not updated', message, 'danger');
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
            const message = err?.message || 'The selected file is not a supported image.';
            setSaveFeedback({ status: 'danger', message: `Document logo could not be processed. ${message}` });
            showAlert('Document logo not updated', message, 'danger');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization?.id || !canManageTeam) return;
        setTeamError('');
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
            setTeamError(err.message || 'Team member could not be saved. Your draft is still here.');
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

        setRoleFeedback(null);
        try {
            await setDoc(doc(db, 'organizations', currentOrganization.id, 'roles', roleId), { ...role, id: roleId, permissions: newPermissions, updatedAt: serverTimestamp() }, { merge: true });
            setRoleFeedback({ status: 'success', message: `${role.label} permissions saved.` });
        } catch (error) {
            setRoles(roles);
            setRoleFeedback({ status: 'danger', message: 'Role permissions could not be saved. Your change was reverted; try again.' });
        }
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
        setImportFeedback({ status: 'info', message: `Importing ${file.name}…` });
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!db) { setIsImporting(false); setImportFeedback({ status: 'danger', message: 'Import is unavailable. Check the connection and try again.' }); e.target.value = ''; return; }
            const text = event.target?.result as string;
            if (!text) { setIsImporting(false); setImportFeedback({ status: 'danger', message: 'The selected file is empty or could not be read.' }); e.target.value = ''; return; }
            const lines = text.split('\n');
            if (!lines.slice(1).some(line => line.trim())) { setIsImporting(false); setImportFeedback({ status: 'danger', message: 'The CSV has no learner rows to import.' }); e.target.value = ''; return; }
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
            setImportFeedback({ status: errorCount ? 'danger' : 'success', message: `${successCount} imported · ${errorCount} failed or skipped. Review the source file before retrying.` });
            showAlert("Import Complete", `Success: ${successCount}\nFailed/Skipped: ${errorCount}`, "info");
            e.target.value = '';
        };
        reader.onerror = () => { setIsImporting(false); setImportFeedback({ status: 'danger', message: 'The file could not be read. Choose the CSV again.' }); e.target.value = ''; };
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
            <div className="edu-settings-v1 edu-settings-personal" data-edu-system="1">
                <header className="edu-settings-hero"><span className="edu-settings-hero__icon"><User size={22} /></span><div><span className="edu-settings-kicker">Personal settings</span><h1>My account</h1><p>Manage sign-in and account security.</p></div></header>
                <SettingsPanel title="Profile information" description="Your academy administrator manages these details." icon={User} accent="purple">
                    <dl className="edu-settings-facts"><div><dt>Full name</dt><dd>{userProfile?.name || 'Not provided'}</dd></div><div><dt>Email login</dt><dd>{userProfile?.email || 'Not provided'}</dd></div></dl>
                </SettingsPanel>
                {canUseBiometrics && <SettingsPanel title="Biometric sign-in" description="Use the device authenticator for faster login." icon={Fingerprint} accent="blue"><SettingsToggle checked={biometricActive} onChange={handleToggleBiometric} label="Face ID or Touch ID" description={biometricActive ? 'Enabled on this device' : 'Available on this device'} /></SettingsPanel>}
                <SettingsPanel title="Password" description="Choose a new password for your account." icon={Lock} accent="yellow">
                    <form onSubmit={handleStudentChangePassword} className="edu-settings-form">
                        {passwordError && <EducationNotice status="danger">{passwordError}</EducationNotice>}
                        {passwordSuccess && <EducationNotice status="success">{passwordSuccess}</EducationNotice>}
                        <SettingsField label="New password" required><input type="password" autoComplete="new-password" className={settingsInputClass} value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} placeholder="At least 6 characters" /></SettingsField>
                        <SettingsField label="Confirm new password" required><input type="password" autoComplete="new-password" className={settingsInputClass} value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder="Repeat password" /></SettingsField>
                        <EducationButton type="submit" variant="primary" icon={Save}>Update password</EducationButton>
                    </form>
                </SettingsPanel>
            </div>
        );
    }

    const team = teamMembers.filter(member => !['student', 'parent'].includes(member.role));
    const enabledModules = Object.entries(currentOrganization?.modules || {}).filter(([, enabled]) => enabled === true).length;
    const planName = currentOrganization?.subscription?.planId || (currentOrganization?.status === 'trial' ? 'Trial' : 'Legacy');
    const configurableRoles = roles.filter(role => !['super_admin', 'owner', 'admin', 'student', 'parent'].includes(role.id));
    const assignableRoles = roles.filter(role => canAssignRole(role.id));
    const selectedRole = configurableRoles.find(role => role.id === selectedRoleId) || configurableRoles[0];
    const selectedMember = team.find(member => (member.uid || member.email) === selectedMemberUid) || null;
    const sectionInsight: Record<SettingsSection, { status: 'success' | 'info' | 'attention' | 'warning' | 'neutral'; label: string; action: string }> = {
        general: !settings.academyName?.trim() || !settings.academicYear?.trim()
            ? { status: 'attention', label: 'Needs setup', action: 'Add the academy name and academic year.' }
            : { status: 'success', label: 'Configured', action: 'Review identity and operating defaults when your school changes.' },
        plan: { status: 'info', label: currentOrganization?.subscription?.status || currentOrganization?.status || 'Workspace plan', action: 'Review limits and enabled apps for this organization.' },
        documents: settings.documentConfig?.headerName || settings.documentConfig?.taxId
            ? { status: 'success', label: 'Configured', action: 'Check printed identity and registration details before issuing documents.' }
            : { status: 'attention', label: 'Needs setup', action: 'Add the legal identity used on invoices and certificates.' },
        forms: { status: 'info', label: 'Family intake', action: 'Review which optional fields families can see and which are required.' },
        data: { status: 'info', label: 'Ready to export', action: 'Download a backup or review the CSV format before importing.' },
        api: settings.apiConfig?.googleApiKey || settings.apiConfig?.openaiApiKey
            ? { status: 'success', label: 'Connected', action: 'Review the configured service keys and save any changes.' }
            : { status: 'neutral', label: 'Optional', action: 'Add a service key only when this organization needs that integration.' },
        team: { status: team.length ? 'success' : 'attention', label: `${team.length} staff account${team.length === 1 ? '' : 's'}`, action: team.length ? 'Select a member for access details or review role permissions.' : 'Add the first staff account with a job-appropriate role.' },
        maintenance: { status: 'warning', label: 'Platform access', action: 'Use diagnostics only when investigating a specific support issue.' }
    };
    const settingsSections: SettingsNavigationItem<SettingsSection>[] = [
        { id: 'general', label: 'Workspace', description: 'Identity and operations', icon: Building2, badge: sectionInsight.general.label, status: sectionInsight.general.status },
        { id: 'plan', label: 'Plan & apps', description: 'Subscription and limits', icon: CreditCard },
        { id: 'documents', label: 'Documents', description: 'Invoices and certificates', icon: Printer, badge: sectionInsight.documents.label, status: sectionInsight.documents.status },
        { id: 'forms', label: 'Enrollment form', description: 'Family information', icon: FileText },
        { id: 'data', label: 'Data', description: 'Import and portability', icon: Database },
        { id: 'api', label: 'Integrations', description: 'Connected services', icon: Plug },
        ...(canManageTeam ? [{ id: 'team' as const, label: 'Team & access', description: 'People and permissions', icon: Users, badge: `${team.length}`, status: sectionInsight.team.status }] : []),
        ...(isSuperAdmin ? [{ id: 'maintenance' as const, label: 'Platform tools', description: 'Diagnostics and repair', icon: AlertTriangle }] : [])
    ];
    const selectSettingsSection = (section: SettingsSection) => {
        setActiveTab(section);
        requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            document.getElementById('settings-content')?.closest('.edu-shell-v1__content-inner')?.scrollTo(0, 0);
        });
    };

    // --- RENDER: ADMIN SETTINGS ---
    return (
        <div className="edu-settings-v1" data-edu-system="1" data-testid="education-settings-v1">
            <div className="edu-settings-hero">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="edu-settings-hero__icon"><Settings size={22} /></span>
                    <div className="min-w-0">
                        <span className="edu-settings-kicker">Workspace controls</span>
                        <h1>Settings</h1>
                        <p>{settings.academyName || currentOrganization?.name || 'Academy workspace'} · Identity, operations and access</p>
                    </div>
                </div>
                <EducationButton
                    icon={isSaving ? Loader2 : Save}
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={isSaving || !isDirty || !canManageSettings}
                >
                    {isSaving ? 'Saving...' : 'Save changes'}
                </EducationButton>
            </div>
            <div className="edu-settings-save" role="status" aria-live="polite">
                <EducationStatusPill status={saveFeedback?.status || (isDirty ? 'warning' : 'success')}>{isSaving ? 'Saving' : isDirty ? 'Unsaved changes' : saveFeedback?.status === 'danger' ? 'Needs attention' : saveFeedback?.status === 'success' ? 'Saved' : 'Up to date'}</EducationStatusPill>
                <span>{saveFeedback?.message || (isDirty ? 'Your edits stay on this page until you save.' : 'Select a category to review its configuration.')}</span>
            </div>

            <SettingsNavigation items={settingsSections} activeId={activeTab} onChange={selectSettingsSection} mode="mobile" />

            <div className="flex min-h-[480px] min-w-0 items-start gap-5 xl:gap-7">
                <SettingsNavigation items={settingsSections} activeId={activeTab} onChange={selectSettingsSection} mode="desktop" />
                <main id="settings-content" className="edu-settings-main">
                <div className="edu-settings-category-heading"><div><span className="edu-settings-kicker">{settingsSections.find(section => section.id === activeTab)?.description}</span><h2>{settingsSections.find(section => section.id === activeTab)?.label}</h2><p>{sectionInsight[activeTab].action}</p></div><EducationStatusPill status={sectionInsight[activeTab].status}>{sectionInsight[activeTab].label}</EducationStatusPill></div>

                {/* API TAB */}
                {activeTab === 'api' && (
                    <div className="space-y-4">
                        <SettingsPanel title="Connected services" description="Organization credentials are stored separately from everyday workspace settings." icon={Plug} accent="blue" status={<EducationStatusPill status="info">Admin only</EducationStatusPill>}>
                            {integrationError && <EducationNotice status="danger">Integration status could not be loaded. Check your connection and reopen this category.</EducationNotice>}
                            <div className="space-y-3">
                                <div className="edu-settings-service">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span className="edu-settings-icon-well flex h-9 w-9 shrink-0 items-center justify-center"><Wand2 size={17} /></span>
                                            <div><p className="edu-settings-text-strong text-sm font-bold">Google Gemini</p><p className="edu-settings-text-subtle mt-0.5 text-xs">Image and creative generation</p></div>
                                        </div>
                                        <EducationStatusPill status={settings.apiConfig?.googleApiKey ? 'success' : 'neutral'}>{settings.apiConfig?.googleApiKey ? 'Configured' : 'Not connected'}</EducationStatusPill>
                                    </div>
                                    <div className="mt-4"><SettingsField label="API key" hint="Saved in the active organization integration vault."><input type="password" autoComplete="off" disabled={!canManageIntegrations} className={`${settingsInputClass} font-mono`} value={settings.apiConfig?.googleApiKey || ''} onChange={event => { if (document.activeElement === event.currentTarget) updateSettings({ ...settings, apiConfig: { ...settings.apiConfig, googleApiKey: event.target.value } }); }} placeholder="AIza..." /></SettingsField></div>
                                </div>
                                <div className="edu-settings-service">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3"><span className="edu-settings-icon-well flex h-9 w-9 shrink-0 items-center justify-center"><Zap size={17} /></span><div><p className="edu-settings-text-strong text-sm font-bold">OpenAI</p><p className="edu-settings-text-subtle mt-0.5 text-xs">Assistant and automation services</p></div></div>
                                        <EducationStatusPill status={settings.apiConfig?.openaiApiKey ? 'success' : 'neutral'}>{settings.apiConfig?.openaiApiKey ? 'Configured' : 'Optional'}</EducationStatusPill>
                                    </div>
                                    <div className="mt-4"><SettingsField label="API key"><input type="password" autoComplete="off" disabled={!canManageIntegrations} className={`${settingsInputClass} font-mono`} value={settings.apiConfig?.openaiApiKey || ''} onChange={event => { if (document.activeElement === event.currentTarget) updateSettings({ ...settings, apiConfig: { ...settings.apiConfig, openaiApiKey: event.target.value } }); }} placeholder="sk-..." /></SettingsField></div>
                                </div>
                            </div>
                        </SettingsPanel>
                        <EducationNotice status="info">Only organization owners and authorized administrators can load or change integration credentials.</EducationNotice>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div>
                        {!canManageSettings && <EducationNotice status="warning">You can review workspace settings. An organization owner can make changes.</EducationNotice>}
                        <div className="edu-settings-summary mb-5 grid grid-cols-2 overflow-hidden rounded-lg border md:grid-cols-4">
                            <SettingsMetric label="Workspace" value={currentOrganization?.status || 'Active'} detail={currentOrganization?.slug} icon={BadgeCheck} />
                            <SettingsMetric label="Academic year" value={settings.academicYear} detail="Operating year" icon={Calendar} />
                            <SettingsMetric label="Team" value={team.length} detail="Staff accounts" icon={Users} />
                            <SettingsMetric label="Apps" value={enabledModules} detail="Enabled modules" icon={Boxes} />
                        </div>

                        <SettingsPanel title="Workspace identity" description="The name and mark shown to staff and families." icon={Building2}>
                            <div className="grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)]">
                                <div>
                                    <span className="edu-settings-text-muted mb-1.5 block text-xs font-bold">Academy logo</span>
                                    <label className="edu-settings-logo-picker">
                                        {logoPreview ? <img src={logoPreview} alt={`${settings.academyName} logo`} /> : <ImageIcon size={28} />}
                                        <span>Change logo</span>
                                        <input type="file" accept="image/*" aria-label="Upload academy logo" disabled={!canManageSettings} onChange={handleLogoUpload} className="edu-settings-file-input" />
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
                                    <div className="edu-settings-segmented" role="group" aria-label="Language">
                                        {([['en', 'English'], ['fr', 'Français']] as const).map(([value, label]) => <button key={value} type="button" disabled={!canManageSettings} aria-pressed={settings.language === value} onClick={() => updateSettings({ ...settings, language: value })}>{label}</button>)}
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
                {activeTab === 'plan' && (
                    <div className="space-y-4">
                        <SettingsPanel
                            title="Subscription"
                            description="Your Edufy plan and workspace standing."
                            icon={CreditCard}
                            status={<EducationStatusPill status="success">{currentOrganization?.subscription?.status || currentOrganization?.status || 'active'}</EducationStatusPill>}
                        >
                            <div className="edu-settings-summary edu-settings-summary--two-column grid grid-cols-2 overflow-hidden rounded-lg border">
                                <SettingsMetric label="Plan" value={planName} detail={currentOrganization?.subscription?.interval ? `Billed ${currentOrganization.subscription.interval}ly` : 'Workspace plan'} icon={BadgeCheck} />
                                <SettingsMetric label="Students" value={currentOrganization?.limits?.students || 'Flexible'} detail="Plan allowance" icon={Users} />
                                <SettingsMetric label="Storage" value={currentOrganization?.limits?.storage ? `${currentOrganization.limits.storage} GB` : 'Flexible'} detail="Plan allowance" icon={HardDrive} />
                                <SettingsMetric label="Apps" value={enabledModules} detail="Currently enabled" icon={Boxes} />
                            </div>
                            {currentOrganization?.subscription?.nextBillingDate && <div className="edu-settings-inline-note"><Calendar size={16} /> Next billing date: {currentOrganization.subscription.nextBillingDate.toDate?.().toLocaleDateString() || 'Available in billing'}</div>}
                        </SettingsPanel>

                        <SettingsPanel title="Enabled apps" description="Products available inside this organization." icon={Boxes}>
                            <div className="divide-y divide-white/10">
                                {Object.entries(currentOrganization?.modules || {}).filter(([, enabled]) => enabled === true).map(([moduleId]) => (
                                    <div key={moduleId} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="edu-settings-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"><Boxes size={16} /></span>
                                            <div className="min-w-0"><p className="edu-settings-text-strong truncate text-sm font-bold">{moduleId === 'erp' ? 'Edufy ERP' : moduleId === 'makerPro' ? 'Maker Pro' : moduleId === 'sparkQuest' ? 'SparkQuest' : moduleId.replace(/[-_]/g, ' ')}</p><p className="edu-settings-text-subtle text-xs">Available to this workspace</p></div>
                                        </div>
                                        <EducationStatusPill status="success">Active</EducationStatusPill>
                                    </div>
                                ))}
                                {enabledModules === 0 && <EducationState title="No apps enabled" description="The workspace owner can manage products from the Edufy app catalog." />}
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
                                    <span className="edu-settings-text-muted mb-1.5 block text-xs font-bold">Print logo</span>
                                    <label className="edu-settings-logo-picker">
                                        {settings.documentConfig?.logoUrl ? <img src={settings.documentConfig.logoUrl} alt="Document logo" /> : <Printer size={26} />}
                                        <span>Change print logo</span>
                                        <input type="file" accept="image/*" aria-label="Upload document logo" disabled={!canManageSettings} onChange={handleDocumentLogoUpload} className="edu-settings-file-input" />
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
                                    <div key={field} className="edu-settings-form-row">
                                        <div><p className="edu-settings-text-strong text-sm font-bold">{label}</p><p className="edu-settings-text-subtle mt-0.5 text-xs leading-5">{description}</p></div>
                                        <SettingsToggle checked={config.active} disabled={!canManageSettings} onChange={() => updateSettings({ ...settings, studentFormConfig: { ...settings.studentFormConfig, [field]: { active: !config.active, required: config.active ? false : config.required } } })} label="Visible" />
                                        <SettingsToggle checked={config.required} disabled={!canManageSettings || !config.active} tone="amber" onChange={() => updateSettings({ ...settings, studentFormConfig: { ...settings.studentFormConfig, [field]: { ...config, required: !config.required } } })} label="Required" />
                                    </div>
                                );
                            })}
                        </div>
                        <EducationNotice status="info">Name and parent phone remain part of the core registration flow so every learner can be identified and contacted.</EducationNotice>
                    </SettingsPanel>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <SettingsMetric label="Students" value={students.length} icon={Users} />
                            <SettingsMetric label="Programs" value={programs.length} icon={Calendar} />
                            <SettingsMetric label="Enrollments" value={enrollments.length} icon={FileText} />
                            <SettingsMetric label="Payments" value={payments.length} icon={CreditCard} />
                        </div>
                        <SettingsPanel title="Import students" description="Add learner records to this organization from a structured CSV file." icon={Upload} accent="blue" actions={<EducationButton icon={Download} onClick={downloadCSVTemplate}>CSV template</EducationButton>}>
                            {importFeedback && <EducationNotice status={importFeedback.status}>{importFeedback.message}</EducationNotice>}
                            <EducationNotice status="warning">Check names and parent phone numbers in the CSV before importing. Each accepted row creates a learner record.</EducationNotice>
                            <label className={`edu-settings-upload ${canManageSettings ? '' : 'edu-settings-upload--disabled'}`}>
                                <input type="file" accept=".csv" onChange={handleBulkImport} disabled={isImporting || !canManageSettings} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                                <span className="edu-settings-icon-well flex h-11 w-11 items-center justify-center rounded-lg border">{isImporting ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}</span>
                                <span className="edu-settings-text-strong mt-3 text-sm font-bold">{isImporting ? 'Importing students...' : 'Choose a CSV file'}</span>
                                <span className="edu-settings-text-subtle mt-1 text-xs">Name and parent phone are required.</span>
                            </label>
                        </SettingsPanel>
                        <SettingsPanel title="Workspace export" description="Download the current tenant data for portability and controlled backups." icon={FileSpreadsheet} accent="blue" actions={<EducationButton icon={Download} onClick={downloadWorkspaceExport}>Export JSON</EducationButton>}>
                            <div className="edu-settings-inline-note">
                                <Shield size={18} />
                                <div><p className="edu-settings-text-strong text-sm font-bold">Organization-scoped export</p><p className="edu-settings-text-subtle mt-1 text-xs leading-5">Includes workspace settings, students, programs, enrollments, and payments currently loaded for {settings.academyName}.</p></div>
                            </div>
                        </SettingsPanel>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-4">
                        <SettingsPanel title="Team members" description="Select a staff member to inspect their access and available actions." icon={Users} accent="blue" actions={<EducationButton icon={UserPlus} variant="primary" onClick={openCreateTeamMember}>Add member</EducationButton>}>
                            {team.length === 0 ? (
                                <EducationState title="No staff accounts yet" description="Add the first team member and choose the role that matches their work."><EducationButton icon={UserPlus} variant="primary" onClick={openCreateTeamMember}>Add member</EducationButton></EducationState>
                            ) : (
                                <div className="edu-settings-team-layout">
                                    <div className="edu-settings-team-register" aria-label="Staff register">
                                        {team.map(member => <button key={member.uid || member.email} type="button" className="edu-settings-team-row" aria-pressed={(member.uid || member.email) === selectedMemberUid} onClick={() => setSelectedMemberUid(member.uid || member.email)}>
                                            <span className="edu-settings-team-avatar">{member.name?.slice(0, 1).toUpperCase() || 'U'}</span>
                                            <span className="edu-settings-team-row__copy"><strong>{member.name || member.email}</strong><small>{member.email}</small></span>
                                            <EducationStatusPill status={member.status === 'active' ? 'success' : 'neutral'}>{member.status || 'unknown'}</EducationStatusPill>
                                        </button>)}
                                    </div>
                                    <aside className="edu-settings-member-detail" aria-label="Team member details">
                                        {selectedMember ? <>
                                            <div className="edu-settings-member-detail__heading"><h3>{selectedMember.name || selectedMember.email}</h3><EducationBadge status={selectedMember.status === 'active' ? 'success' : 'neutral'}>{selectedMember.role.replace(/_/g, ' ')}</EducationBadge></div>
                                            <dl className="edu-settings-facts"><div><dt>Email</dt><dd>{selectedMember.email}</dd></div><div><dt>Work hours</dt><dd>{selectedMember.workHours?.start && selectedMember.workHours?.end ? `${selectedMember.workHours.start}–${selectedMember.workHours.end}` : 'Organization default'}</dd></div><div><dt>Account</dt><dd>{selectedMember.uid === user?.uid ? 'Your account' : 'Staff account'}</dd></div></dl>
                                            <div className="edu-settings-member-actions">
                                                {canAssignRole(selectedMember.role) && <EducationButton icon={Pencil} onClick={() => { setTeamError(''); setNewUser({ uid: selectedMember.uid || '', email: selectedMember.email, name: selectedMember.name, role: selectedMember.role, password: '', workHours: selectedMember.workHours || { start: '', end: '' } }); setIsEditingUser(true); setIsUserModalOpen(true); }}>Edit member</EducationButton>}
                                                <EducationButton icon={Key} onClick={() => handleResetPassword(selectedMember.email)}>Send password reset</EducationButton>
                                            </div>
                                            {!['owner', 'admin', 'super_admin'].includes(selectedMember.role) && selectedMember.uid !== user?.uid && <details className="edu-settings-disclosure"><summary>Danger zone · profile removal</summary><div className="edu-settings-disclosure__body"><EducationNotice status="danger">Removing this profile does not remove the Firebase login account. Confirm the account separately before continuing.</EducationNotice><EducationButton icon={Trash2} status="danger" onClick={() => handleDeleteUser(selectedMember.uid!, selectedMember.email)}>Delete profile</EducationButton></div></details>}
                                        </> : <EducationState title="Select a team member" description="Choose a staff account to see its role, hours and available actions." />}
                                    </aside>
                                </div>
                            )}
                            {isSuperAdmin && <details className="edu-settings-disclosure"><summary>Advanced team tools</summary><EducationButton icon={Wand2} variant="quiet" disabled={isProcessingTeam} onClick={handleSeedTeam}>{isProcessingTeam ? 'Creating demo team...' : 'Create demo team'}</EducationButton></details>}
                        </SettingsPanel>

                        <SettingsPanel title="Role permissions" description="Choose one role, then set only the access needed for that job." icon={Shield} status={<EducationStatusPill status="info">Organization policy</EducationStatusPill>}>
                            {roleFeedback && <EducationNotice status={roleFeedback.status}>{roleFeedback.message}</EducationNotice>}
                            {roleLoadState === 'error' && <EducationNotice status="warning">Live role overrides could not load. Showing the standard roles; reopen this category to retry.</EducationNotice>}
                            {roleLoadState === 'loading' ? <EducationState kind="loading" title="Loading roles" description="Reading this organization's access policy." /> : configurableRoles.length === 0 ? <EducationState title="No configurable roles" description="There are no staff roles available to edit for this organization." /> : <>
                                <div className="edu-settings-role-rail" aria-label="Roles">
                                    {configurableRoles.map(role => <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} aria-pressed={selectedRole?.id === role.id} className="edu-settings-role-chip">{role.label}</button>)}
                                </div>
                                {selectedRole && <div className="mt-3">
                                    <div className="edu-settings-role-intro"><strong>{selectedRole.label}</strong><p>{selectedRole.description}</p></div>
                                    <div className="space-y-4">
                                        {Array.from(new Set(AVAILABLE_PERMISSIONS.map(permission => permission.group))).map(group => (
                                            <div key={group}>
                                                <p className="edu-settings-text-subtle mb-2 text-[10px] font-bold uppercase tracking-wider">{group}</p>
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

                {activeTab === 'maintenance' && isSuperAdmin && (
                    <div className="space-y-4">
                        <SettingsPanel title="Workspace diagnostics" description="Connection and repair tools for the active organization." icon={Zap} status={<EducationStatusPill status="warning">Platform access</EducationStatusPill>}>
                            <details className="edu-settings-disclosure"><summary>Show diagnostics and repair tools</summary><div className="edu-settings-disclosure__body grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={handleTestConnection} className="edu-settings-tool"><span className="edu-settings-icon-well flex h-9 w-9 shrink-0 items-center justify-center"><RefreshCw size={16} /></span><span><span className="edu-settings-text-strong block text-sm font-bold">Test database</span><span className="edu-settings-text-subtle mt-0.5 block text-xs">Verify an authenticated tenant write.</span></span></button>
                                <button type="button" disabled={isRepairing} onClick={handleRepairFinancials} className="edu-settings-tool"><span className="edu-settings-icon-well flex h-9 w-9 shrink-0 items-center justify-center">{isRepairing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}</span><span><span className="edu-settings-text-strong block text-sm font-bold">Recalculate financials</span><span className="edu-settings-text-subtle mt-0.5 block text-xs">Repair enrollment totals from tenant payments.</span></span></button>
                            </div></details>
                            <div className="edu-settings-debug"><span>User: {user?.uid || 'N/A'}</span><span>Organization: {currentOrganization?.id || 'N/A'}</span></div>
                            {migrationResult && <EducationNotice status="info">{migrationResult}</EducationNotice>}
                        </SettingsPanel>
                        <SettingsPanel title="Legacy recovery" description="One-time migration tools for pre-SaaS MakerLab data." icon={AlertTriangle} accent="orange">
                            <details className="edu-settings-disclosure"><summary>Show legacy recovery actions</summary><div className="edu-settings-disclosure__body"><EducationNotice status="warning">These tools can change organization ownership. Use them only for a documented support case.</EducationNotice><div className="edu-settings-action-row"><EducationButton icon={RefreshCw} disabled={isMigrating} onClick={handleMigrateData}>{isMigrating ? 'Migrating...' : 'Analyze legacy data'}</EducationButton><EducationButton icon={Building2} status="danger" onClick={handleRecreateOrg}>Recreate default organization</EducationButton></div></div></details>
                        </SettingsPanel>
                    </div>
                )}

                </main>
            </div>


            {/* Add/Edit User Modal */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={isEditingUser ? "Edit team member" : "Add team member"} designSystem={true}>
                <form onSubmit={handleAddUser} className="edu-settings-dialog-form">
                    <EducationNotice status="info">This account will only access {currentOrganization?.name || 'the active organization'}.</EducationNotice>
                    {teamError && <EducationNotice status="danger">{teamError} Your entered details remain available for correction or retry.</EducationNotice>}

                    <SettingsField label="Full name" required><input required className={settingsInputClass} value={newUser.name} onChange={event => setNewUser({ ...newUser, name: event.target.value })} placeholder="Jane Doe" /></SettingsField>
                    <SettingsField label="Email address" required><input required type="email" disabled={isEditingUser} className={settingsInputClass} value={newUser.email} onChange={event => setNewUser({ ...newUser, email: event.target.value })} placeholder="jane@academy.com" /></SettingsField>

                    {!isEditingUser && (
                        <SettingsField label="Temporary password" hint="Leave empty and Edufy will generate one.">
                            <div className="relative">
                                <input type="text" aria-label="Temporary password" className={`${settingsInputClass} pr-12 font-mono`} value={newUser.password} onChange={event => setNewUser({ ...newUser, password: event.target.value })} placeholder="Auto-generated" />
                                <button type="button" onClick={() => setNewUser({ ...newUser, password: Math.random().toString(36).slice(-8) })} aria-label="Generate temporary password" title="Generate password" className="edu-settings-generate"><Wand2 size={15} /></button>
                            </div>
                        </SettingsField>
                    )}

                    <SettingsField label="Role" hint={assignableRoles.find(role => role.id === newUser.role)?.description}>
                        <select className={settingsInputClass} value={newUser.role} onChange={event => setNewUser({ ...newUser, role: event.target.value })}>
                            {assignableRoles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </SettingsField>

                    <details className="edu-settings-disclosure"><summary>Custom work hours · optional</summary><div className="edu-settings-disclosure__body grid grid-cols-2 gap-3">
                            <SettingsField label="Starts"><input type="time" className={settingsInputClass} value={newUser.workHours?.start || ''} onChange={event => setNewUser({ ...newUser, workHours: { start: event.target.value, end: newUser.workHours?.end || '' } })} /></SettingsField>
                            <SettingsField label="Ends"><input type="time" className={settingsInputClass} value={newUser.workHours?.end || ''} onChange={event => setNewUser({ ...newUser, workHours: { start: newUser.workHours?.start || '', end: event.target.value } })} /></SettingsField>
                        </div></details>

                    <div className="edu-settings-dialog-actions"><EducationButton onClick={() => setIsUserModalOpen(false)}>Cancel</EducationButton><EducationButton type="submit" variant="primary" icon={isProcessingTeam ? Loader2 : isEditingUser ? Save : UserPlus} disabled={isProcessingTeam}>{isProcessingTeam ? 'Saving...' : isEditingUser ? 'Save member' : 'Create member'}</EducationButton></div>
                </form>
            </Modal>

            {/* Credentials Display Modal */}
            <Modal isOpen={!!showCredentials} onClose={() => setShowCredentials(null)} title="Team member created" designSystem={true}>
                <div className="edu-settings-dialog-form"><EducationNotice status="success">The account is ready. Copy the credentials and share them securely.</EducationNotice><dl className="edu-settings-facts"><div><dt>Email</dt><dd className="select-all">{showCredentials?.email}</dd></div><div><dt>Temporary password</dt><dd className="select-all">{showCredentials?.password}</dd></div></dl><div className="edu-settings-dialog-actions"><EducationButton icon={Copy} onClick={async () => { await navigator.clipboard.writeText(`Email: ${showCredentials?.email}\nPassword: ${showCredentials?.password}`); showAlert('Credentials copied', 'The email and temporary password are ready to share securely.', 'success'); }}>Copy credentials</EducationButton><EducationButton variant="primary" onClick={() => setShowCredentials(null)}>Done</EducationButton></div></div>
            </Modal>
        </div >
    );
};
