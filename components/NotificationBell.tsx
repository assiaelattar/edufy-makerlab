import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
    onNotificationClick?: (projectId?: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNotificationClick }) => {
    const { projectNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
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
            // Extract project ID from link if present
            const projectId = link.split('/').pop();
            onNotificationClick(projectId);
        }

        setIsOpen(false);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'error':
                return '❌';
            default:
                return '📢';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
                <Bell size={22} className="text-slate-300" />

                {/* Badge */}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <span className="text-[10px] font-black text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </div>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-2xl z-50 max-h-[500px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="p-4 border-b-2 border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
                        <div>
                            <h3 className="font-black text-white flex items-center gap-2">
                                <Bell size={18} className="text-cyan-400" />
                                Notifications
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 px-3 py-1.5 bg-cyan-900/20 rounded-lg border border-cyan-500/30 hover:bg-cyan-900/30 transition-colors"
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {projectNotifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell size={28} className="text-slate-600" />
                                </div>
                                <p className="text-slate-400 text-sm font-medium">No notifications yet</p>
                                <p className="text-slate-500 text-xs mt-1">We'll notify you when something happens</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {projectNotifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification.id, notification.link)}
                                        className={`w-full p-4 text-left hover:bg-slate-800/50 transition-colors ${!notification.read ? 'bg-slate-800/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="text-2xl shrink-0">{getNotificationIcon(notification.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className={`text-sm font-bold ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 bg-cyan-400 rounded-full shrink-0 mt-1"></div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-medium">
                                                    {notification.createdAt && formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
