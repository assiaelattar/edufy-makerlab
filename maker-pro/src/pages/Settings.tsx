import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Bell, Shield, Camera, Save, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword } from 'firebase/auth';

export function Settings() {
    const { user, studentProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile State
    const [name, setName] = useState(studentProfile?.name || user?.displayName || '');
    const [photoUrl, setPhotoUrl] = useState(studentProfile?.photoUrl || user?.photoURL || '');

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsLoading(true);
        setMessage(null);
        try {
            await updateProfile(user, { displayName: name, photoURL: photoUrl });
            // Update Firestore if student profile exists
            if (studentProfile && db) {
                await updateDoc(doc(db, 'students', studentProfile.id), {
                    name,
                    photoUrl
                });
            }
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!user) return;
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        setIsLoading(true);
        setMessage(null);
        try {
            await updatePassword(user, newPassword);
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Failed to update password. You may need to re-login.' });
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
                        {/* <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-white shadow text-brand-600 font-bold' : 'text-slate-600 hover:bg-slate-100/50'}`}
                        >
                            <Bell size={18} /> Notifications
                        </button> */}
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
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
