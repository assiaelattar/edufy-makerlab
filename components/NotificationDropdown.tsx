import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown = () => {
    const { notifications, unreadNotificationsCount, markAsRead, markAllAsRead, navigateTo } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: any) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            // Handle internal navigation if link starts with /
            // For now, assume simple view navigation logic or external
            // If link is like "student-details?studentId=123"
            // We need to parse it.
            // For MVP, let's assume the link is a full URL or we handle specific patterns.
            // Or we can just use window.location for simplicity if it's a real URL.
            // Let's try to use navigateTo if possible.

            // Example link: "student-details:studentId=123"
            if (notification.link.includes(':')) {
                const [view, paramsStr] = notification.link.split(':');
                const params: any = {};
                if (paramsStr) {
                    paramsStr.split('&').forEach((p: string) => {
                        const [key, val] = p.split('=');
                        params[key] = val;
                    });
                }
                navigateTo(view as any, params);
            } else {
                // Fallback
                console.log("Navigating to", notification.link);
            }
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'error': return <XCircle size={16} className="text-red-500" />;
            default: return <Info size={16} className="text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
            >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Mobile Backdrop / Overlay */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />

                    {/* Dropdown / Modal */}
                    <div className="fixed inset-x-4 top-20 bottom-20 z-50 flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-80 md:h-auto md:max-h-[600px] md:bottom-auto">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                Notifications
                                {unreadNotificationsCount > 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadNotificationsCount}</span>}
                            </h3>
                            <div className="flex items-center gap-2">
                                {unreadNotificationsCount > 0 && (
                                    <button
                                        onClick={() => markAllAsRead()}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                                    >
                                        <Check size={12} /> Mark all
                                    </button>
                                )}
                                <button className="md:hidden text-slate-400" onClick={() => setIsOpen(false)}><XCircle size={20} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                                    <Bell size={32} className="opacity-20" />
                                    <p>No notifications yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800/50">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-4 hover:bg-slate-800/50 transition-colors cursor-pointer ${!notification.read ? 'bg-slate-800/20' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 shrink-0">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${!notification.read ? 'text-white font-medium' : 'text-slate-400'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] text-slate-600">
                                                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                                        </span>
                                                        {notification.link && <ExternalLink size={10} className="text-slate-600" />}
                                                    </div>
                                                </div>
                                                {!notification.read && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
