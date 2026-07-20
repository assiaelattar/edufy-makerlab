import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Bell, CheckCheck, CheckCircle2, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../context/NotificationContext';

interface NotificationBellProps {
    onNotificationClick?: (projectId?: string) => void;
}

const notificationStyles: Record<string, { icon: React.ReactNode; surface: string }> = {
    success: {
        icon: <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" />,
        surface: 'bg-[#14B8A6]/10',
    },
    warning: {
        icon: <AlertTriangle className="h-4 w-4 text-[#F2C766]" />,
        surface: 'bg-[#F2C766]/10',
    },
    error: {
        icon: <AlertCircle className="h-4 w-4 text-[#FB7185]" />,
        surface: 'bg-[#FB7185]/10',
    },
    info: {
        icon: <Info className="h-4 w-4 text-[#2DD4BF]" />,
        surface: 'bg-[#14B8A6]/10',
    },
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNotificationClick }) => {
    const { projectNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notificationId: string, link?: string) => {
        await markAsRead(notificationId);

        if (link && onNotificationClick) {
            const projectId = link.split('/').pop();
            onNotificationClick(projectId);
        }

        setIsOpen(false);
    };

    const getNotificationStyle = (type: string) => notificationStyles[type] ?? notificationStyles.info;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#08111F] bg-[#FB7185] px-1 text-[10px] font-black leading-none text-[#08111F]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 z-50 mt-2 flex max-h-[min(32rem,calc(100vh-5rem))] w-[calc(100vw-1.5rem)] max-w-96 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0F1B2D] shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200"
                    role="dialog"
                    aria-label="Notifications"
                >
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div className="min-w-0">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                                <Bell className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
                                Notifications
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => markAllAsRead()}
                                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 text-xs font-bold text-[#2DD4BF] transition-colors hover:bg-[#14B8A6]/20 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                            >
                                <CheckCheck className="h-4 w-4" />
                                <span className="hidden sm:inline">Mark all read</span>
                                <span className="sm:hidden">Read all</span>
                            </button>
                        )}
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain">
                        {projectNotifications.length === 0 ? (
                            <div className="px-5 py-10 text-center">
                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                                    <Bell className="h-5 w-5 text-slate-500" />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-300">No notifications yet</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">Updates about your work will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/10">
                                {projectNotifications.map((notification) => {
                                    const styles = getNotificationStyle(notification.type);

                                    return (
                                        <button
                                            type="button"
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification.id, notification.link)}
                                            className={`w-full px-4 py-3 text-left transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#14B8A6] ${
                                                !notification.read ? 'bg-[#14B8A6]/5' : ''
                                            }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.surface}`}>
                                                    {styles.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start gap-2">
                                                        <h4 className={`min-w-0 flex-1 break-words text-sm font-bold leading-5 ${
                                                            !notification.read ? 'text-white' : 'text-slate-300'
                                                        }`}>
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.read && (
                                                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#14B8A6]" aria-label="Unread" />
                                                        )}
                                                    </div>
                                                    <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                                                        {notification.message}
                                                    </p>
                                                    {notification.createdAt && (
                                                        <p className="mt-1.5 font-mono text-[10px] leading-4 text-slate-500">
                                                            {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
