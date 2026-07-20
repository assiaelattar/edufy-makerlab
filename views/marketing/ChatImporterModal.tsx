import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardPaste, User } from 'lucide-react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { Lead } from '../../types';

interface ChatImporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
}

interface ParsedMessage {
    date: string;
    author: string;
    content: string;
}

const MAX_IMPORT_MESSAGES = 200;

const toImportedIsoDate = (source: string) => {
    const match = source.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return new Date().toISOString();
    const [, day, month, rawYear, rawHour, minute, meridiem] = match;
    const year = Number(rawYear) < 100 ? 2000 + Number(rawYear) : Number(rawYear);
    let hour = Number(rawHour);
    if (meridiem?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (meridiem?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    const parsed = new Date(year, Number(month) - 1, Number(day), hour, Number(minute));
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const ChatImporterModal: React.FC<ChatImporterModalProps> = ({ isOpen, onClose, lead }) => {
    const { currentOrganization, userProfile, can } = useAuth();
    const [rawText, setRawText] = useState('');
    const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
    const [step, setStep] = useState<1 | 2>(1);
    const [isImporting, setIsImporting] = useState(false);
    const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

    const resetAndClose = () => {
        if (isImporting) return;
        setRawText('');
        setParsedMessages([]);
        setStep(1);
        setFeedback(null);
        onClose();
    };

    const parseChat = () => {
        const messages: ParsedMessage[] = [];

        rawText.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\[?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4},?\s\d{1,2}:\d{2}(?:\s?(?:AM|PM))?)\]?\s-?\s?([^:]+):\s(.+)$/i);
            if (match) {
                messages.push({ date: match[1], author: match[2].trim(), content: match[3].trim() });
            } else if (messages.length > 0 && line.trim()) {
                messages[messages.length - 1].content += `\n${line.trim()}`;
            }
        });

        if (messages.length > MAX_IMPORT_MESSAGES) {
            setParsedMessages([]);
            setFeedback({ kind: 'error', message: `This export contains ${messages.length} messages. Import 200 or fewer at a time to keep the lead record reliable.` });
            return;
        }
        setParsedMessages(messages);
        if (messages.length > 0) {
            setFeedback(null);
            setStep(2);
        } else {
            setFeedback({ kind: 'error', message: 'No messages were recognized. Check the date, sender, and message format.' });
        }
    };

    const handleImport = async () => {
        if (!db || isImporting) return;
        if (!can('marketing.create') || !currentOrganization?.id || lead.organizationId !== currentOrganization.id) {
            setFeedback({ kind: 'error', message: 'You do not have permission to import activity into this lead.' });
            return;
        }
        const existingDetails = new Set((lead.timeline || []).map(event => event.details));
        const events = parsedMessages.map(message => ({
            date: toImportedIsoDate(message.date),
            type: 'note',
            details: `[WhatsApp export | ${message.date}] ${message.author}: ${message.content}`,
            author: userProfile?.name || 'Imported chat'
        })).filter(event => !existingDetails.has(event.details));

        if (events.length === 0) {
            setFeedback({ kind: 'error', message: 'Every recognized message is already present in this lead timeline.' });
            return;
        }

        setIsImporting(true);
        setFeedback(null);
        try {
            await updateDoc(doc(db, 'leads', lead.id), { timeline: arrayUnion(...events) });
            const duplicateCount = parsedMessages.length - events.length;
            setFeedback({ kind: 'success', message: `${events.length} messages imported${duplicateCount ? `; ${duplicateCount} duplicates skipped` : ''}.` });
            window.setTimeout(() => {
                resetAndClose();
            }, 650);
        } catch (error) {
            console.error('Import failed', error);
            setFeedback({ kind: 'error', message: 'The chat could not be imported. Your pasted text is still here.' });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={resetAndClose} title="Import WhatsApp chat">
            <div className="flex h-[min(68vh,520px)] flex-col gap-4 text-slate-900">
                <header className="shrink-0 rounded-lg border border-slate-800 bg-[#08111F] px-4 py-3 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-400/30 bg-[#0F1B2D] text-teal-300"><ClipboardPaste size={19} /></div>
                        <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-teal-300">Timeline import</p><h2 className="truncate text-base font-bold">Bring conversation history into {lead.name}</h2></div>
                    </div>
                </header>

                <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-bold">
                    <div className={`flex h-10 items-center justify-center rounded-lg border px-2 ${step === 1 ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>1. Paste chat</div>
                    <ArrowRight size={14} className="text-slate-300" />
                    <div className={`flex h-10 items-center justify-center rounded-lg border px-2 ${step === 2 ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-400'}`}>2. Verify</div>
                </div>

                {feedback && <div className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'success' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">{feedback.message}</div>}

                <div className="min-h-0 flex-1">
                    {step === 1 ? (
                        <div className="flex h-full flex-col gap-3">
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                                Paste an exported chat. Edufy reads the text locally and adds recognized messages to this lead; it does not connect to WhatsApp or send messages.
                            </p>
                            <label htmlFor="chat-import-text" className="sr-only">Pasted WhatsApp chat</label>
                            <textarea
                                id="chat-import-text"
                                className="min-h-40 flex-1 resize-none rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-slate-400 focus:border-[#14B8A6] focus:ring-2 focus:ring-teal-100"
                                placeholder={'[12/05/2024, 09:15] Parent: Is there a spot?\n[12/05/2024, 09:20] Me: Yes, available.'}
                                value={rawText}
                                onChange={event => { setRawText(event.target.value); setFeedback(null); }}
                            />
                            <button type="button" onClick={parseChat} disabled={!rawText.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50">
                                Preview messages <ArrowRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <div><h3 className="text-sm font-bold">Import preview</h3><p className="text-xs text-slate-500">{parsedMessages.length} messages will become timeline notes.</p></div>
                                <button type="button" onClick={() => { setStep(1); setFeedback(null); }} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={14} /> Edit text</button>
                            </div>
                            <div className="min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 custom-scrollbar">
                                {parsedMessages.map((message, index) => (
                                    <article key={`${message.date}-${index}`} className="flex gap-3 py-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><User size={14} /></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col justify-between gap-0.5 sm:flex-row sm:items-baseline"><span className="text-xs font-bold text-slate-900">{message.author}</span><span className="font-mono text-[10px] text-slate-400">{message.date}</span></div>
                                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{message.content}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <button type="button" onClick={handleImport} disabled={isImporting || parsedMessages.length === 0 || !can('marketing.create')} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50">
                                <CheckCircle2 size={16} /> {isImporting ? 'Importing...' : 'Import to timeline'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
