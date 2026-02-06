import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Bell, Shield, Camera, Save, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword } from 'firebase/auth';

export function Settings() {
    const { user, studentProfile } = useAuth();
    // Migration State
    const [migrationStatus, setMigrationStatus] = useState<string>('');
    const { isSuperAdmin } = useAuth();
    // ... (Keep existing state)

    const handleMigrateData = async () => {
        if (!db) return;
        if (!window.confirm("This will scan for data without an organization (orphaned) and assign it to 'Makerlab Academy'. Continue?")) return;

        setIsLoading(true);
        setMigrationStatus('Starting migration...');

        try {
            const collections = [
                'students', 'programs', 'enrollments', 'payments', 'expenses',
                'classes', 'attendance', 'tasks', 'projects', 'marketing_posts', 'leads'
            ];

            let totalMigrated = 0;

            // We process sequentially to avoid overwhelming browser/connection
            for (const colName of collections) {
                setMigrationStatus(`Scanning ${colName}...`);
                // Note: We deliberately fetch ALL if possible. 
                // Since we are Super Admin and rules allow reading orphans, this should work if we don't apply filters.
                // However, getDocs(collection(db, colName)) might fall back to client-side filtering or fail if rules require index.
                // Given the rules change: match /{collection}/{docId} ... allow read if SuperAdmin... 
                // It should work.

                const snap = await import('firebase/firestore').then(mod => mod.getDocs(mod.collection(db, colName)));

                if (snap.empty) continue;

                const batch = import('firebase/firestore').then(mod => mod.writeBatch(db));
                let batchCount = 0;
                let currentBatch = await batch;

                for (const doc of snap.docs) {
                    const data = doc.data();
                    if (!data.organizationId) {
                        // ORPHAN FOUND
                        import('firebase/firestore').then(mod => currentBatch.update(doc.ref, { organizationId: 'makerlab-academy' }));
                        batchCount++;
                        totalMigrated++;
                    }
                }

                if (batchCount > 0) {
                    setMigrationStatus(`Migrating ${batchCount} records in ${colName}...`);
                    await currentBatch.commit();
                }
            }

            setMigrationStatus(`Migration Complete! Moved ${totalMigrated} orphaned records.`);
            setMessage({ type: 'success', text: `Migration Complete! Restored ${totalMigrated} records.` });

        } catch (e: any) {
            console.error("Migration failed:", e);
            setMigrationStatus(`Error: ${e.message}`);
            setMessage({ type: 'error', text: 'Migration failed. Check console.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-600 mt-1">Manage your account preferences and security.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col">
                    <div className="space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white shadow text-brand-600 font-bold' : 'text-slate-600 hover:bg-slate-100/50'}`}
                        >
                            <User size={18} /> Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-white shadow text-brand-600 font-bold' : 'text-slate-600 hover:bg-slate-100/50'}`}
                        >
                            <Lock size={18} /> Security
                        </button>
                        {isSuperAdmin && (
                            <button
                                onClick={() => setActiveTab('migration' as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === ('migration' as any) ? 'bg-white shadow text-brand-600 font-bold' : 'text-slate-600 hover:bg-slate-100/50'}`}
                            >
                                <Shield size={18} /> Maintenance
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 md:p-12">
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                        >
                            {message.text}
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-6">Profile Information</h2>

                                    <div className="flex flex-col items-center sm:flex-row gap-6 mb-8">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
                                                {photoUrl ? (
                                                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <User size={40} />
                                                    </div>
                                                )}
                                            </div>
                                            <button className="absolute bottom-0 right-0 p-2 bg-brand-600 text-white rounded-full shadow-md hover:bg-brand-700 transition-colors">
                                                <Camera size={14} />
                                            </button>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Avatar URL</label>
                                            <input
                                                type="text"
                                                value={photoUrl}
                                                onChange={(e) => setPhotoUrl(e.target.value)}
                                                placeholder="https://example.com/avatar.jpg"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                            />
                                            <p className="text-xs text-slate-400 mt-2">Email cannot be changed securely from here.</p>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isLoading}
                                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Shield size={20} className="text-brand-600" />
                                        Password & Security
                                    </h2>

                                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-8 text-yellow-800 text-sm">
                                        <p className="font-bold mb-1">Security Note</p>
                                        <p>Make sure to use a strong password including numbers, symbols, and mixed case letters.</p>
                                    </div>

                                    <div className="space-y-6 max-w-md">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={handleUpdatePassword}
                                                disabled={isLoading || !newPassword}
                                                className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-brand-500/20"
                                            >
                                                {isLoading ? 'Updating...' : <><Lock size={18} /> Update Password</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === ('migration' as any) && (
                            <motion.div
                                key="migration"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Shield size={20} className="text-blue-600" />
                                        Data Maintenance (Super Admin)
                                    </h2>

                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-blue-800 text-sm">
                                        <p className="font-bold mb-1">Legacy Data Recovery</p>
                                        <p>Use this tool to recover data that was created before the Multi-Tenant Update. It will search for 'Orphaned' data and assign it to <b>Makerlab Academy</b>.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <h3 className="font-bold text-lg mb-2">Migrate Legacy Data</h3>
                                            <p className="text-slate-600 mb-4 text-sm">This process will populate the 'organizationId' field for all old records.</p>

                                            {migrationStatus && (
                                                <div className="mb-4 p-3 bg-slate-800 text-green-400 font-mono text-xs rounded-lg whitespace-pre-wrap">
                                                    {migrationStatus}
                                                </div>
                                            )}

                                            <button
                                                onClick={handleMigrateData}
                                                disabled={isLoading}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...</> : 'Start Migration'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
