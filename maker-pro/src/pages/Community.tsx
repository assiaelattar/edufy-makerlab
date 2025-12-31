import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Users, Heart, Send, Hash, MoreVertical, Search, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, limit } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string; // Optional
    channel: string;
    createdAt: Timestamp;
}

const CHANNELS = ['General', 'Announcements', 'Tech Support', 'Showcase', 'Jobs'];

export function Community() {
    const { studentProfile } = useAuth();
    const [activeChannel, setActiveChannel] = useState('General');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!db) return;
        const firestore = db;
        setLoading(true);

        const q = query(
            collection(firestore, 'community_messages'),
            where('channel', '==', activeChannel),
            orderBy('createdAt', 'asc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
            setLoading(false);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [activeChannel]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !db || !studentProfile) return;

        const firestore = db;
        try {
            await addDoc(collection(firestore, 'community_messages'), {
                text: newMessage.trim(),
                senderId: studentProfile.id,
                senderName: studentProfile.name,
                senderAvatar: studentProfile.photoUrl || '',
                channel: activeChannel,
                createdAt: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const formatTime = (timestamp: Timestamp) => {
        if (!timestamp) return '';
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
            {/* Sidebar (Channels) */}
            <div className="lg:w-80 flex flex-col gap-4 shrink-0 transition-all duration-300">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Community</h1>
                    <p className="text-slate-500 text-sm mt-1">Connect with other makers.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Find channels..."
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {CHANNELS.map(channel => (
                            <button
                                key={channel}
                                onClick={() => setActiveChannel(channel)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${activeChannel === channel
                                        ? 'bg-brand-50 text-brand-700 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${activeChannel === channel ? 'bg-white/50' : 'bg-slate-100 text-slate-400'}`}>
                                        <Hash className="w-4 h-4" />
                                    </span>
                                    <span className="font-semibold text-sm">{channel}</span>
                                </div>
                                {channel === 'Announcements' && (
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold shrink-0">
                                {studentProfile?.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{studentProfile?.name}</p>
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <Hash className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900">{activeChannel}</h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Users className="w-3 h-3" /> 24 Members
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400">Loading conversation...</div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-600">No messages yet.</p>
                            <p className="text-sm">Be the first to say hello in #{activeChannel}!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.senderId === studentProfile?.id;
                            const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId;

                            return (
                                <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} group animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className="shrink-0 flex flex-col items-center">
                                        {showHeader ? (
                                            msg.senderAvatar ? (
                                                <img src={msg.senderAvatar} alt={msg.senderName} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white" />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${isMe ? 'bg-brand-500' : 'bg-slate-400'}`}>
                                                    {msg.senderName.charAt(0)}
                                                </div>
                                            )
                                        ) : (
                                            <div className="w-10" />
                                        )}
                                    </div>

                                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showHeader && (
                                            <div className="flex items-baseline gap-2 mb-1 px-1">
                                                <span className="text-sm font-bold text-slate-900">{msg.senderName}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{formatTime(msg.createdAt)}</span>
                                            </div>
                                        )}
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                                ? 'bg-brand-600 text-white rounded-tr-sm'
                                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
                        <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors">
                            <PlusIcon />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Message #${activeChannel}...`}
                            className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-slate-900 placeholder:text-slate-400 min-h-[44px]"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-slate-400 mt-2">
                        **Body Press** - Treat everyone with respect.
                    </p>
                </div>
            </div>
        </div>
    );
}

function PlusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="M12 5v14" />
        </svg>
    )
}
