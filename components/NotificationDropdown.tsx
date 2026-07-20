import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown = () => {
    const { notifications, unreadNotificationsCount, markAsRead, markAllAsRead, navigateTo } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelId = 'atlas-notification-panel';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

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
                // Links without a view target remain non-navigating notifications.
            }
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className="text-teal-400" aria-hidden="true" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-300" aria-hidden="true" />;
            case 'error': return <XCircle size={16} className="text-rose-400" aria-hidden="true" />;
            default: return <Info size={16} className="text-teal-300" aria-hidden="true" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={unreadNotificationsCount > 0 ? `Notifications, ${unreadNotificationsCount} unread` : 'Notifications'}
                aria-expanded={isOpen}
                aria-controls={panelId}
                title="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-slate-300 transition-colors duration-150 hover:border-white/10 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08111F]"
            >
                <Bell size={20} aria-hidden="true" />
                {unreadNotificationsCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-2.5 w-2.5 rounded-full border-2 border-[#08111F] bg-rose-400" aria-hidden="true" />
                )}
            </button>

            {isOpen && (
                <>
                    {/* Mobile Backdrop / Overlay */}
                    <div className="fixed inset-0 z-40 bg-[#020711]/80 md:hidden" onClick={() => setIsOpen(false)} aria-hidden="true" />

                    {/* Dropdown / Modal */}
                    <div
                        id={panelId}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Notifications"
                        className="fixed inset-x-3 bottom-3 top-16 z-50 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0F1B2D] shadow-2xl md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:h-auto md:max-h-[min(600px,calc(100vh-6rem))] md:w-96"
                    >
                        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#08111F] px-3 py-2">
                            <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
                                Notifications
                                {unreadNotificationsCount > 0 && <span className="rounded-full bg-rose-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#08111F]">{unreadNotificationsCount}</span>}
                            </h3>
                            <div className="flex shrink-0 items-center gap-1">
                                {unreadNotificationsCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => markAllAsRead()}
                                        className="flex h-9 items-center gap-1.5 rounded-lg border border-teal-400/20 bg-teal-400/10 px-2.5 text-xs font-bold text-teal-300 transition-colors duration-150 hover:bg-teal-400/15 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                                    >
                                        <Check size={14} aria-hidden="true" /> Mark all read
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 md:hidden"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close notifications"
                                    title="Close notifications"
                                >
                                    <X size={18} aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-slate-400">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#08111F] text-slate-500">
                                        <Bell size={20} aria-hidden="true" />
                                    </span>
                                    <p>No notifications yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/10">
                                    {notifications.map(notification => (
                                        <button
                                            type="button"
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`block w-full p-3 text-left transition-colors duration-150 hover:bg-white/5 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400 ${!notification.read ? 'bg-teal-400/5' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#08111F]">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${!notification.read ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                                                        {notification.message}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="font-mono text-[10px] text-slate-500">
                                                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                                        </span>
                                                        {notification.link && <ExternalLink size={11} className="text-slate-500" aria-hidden="true" />}
                                                    </div>
                                                </div>
                                                {!notification.read && (
                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-400" aria-label="Unread" />
                                                )}
                                            </div>
                                        </button>
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
