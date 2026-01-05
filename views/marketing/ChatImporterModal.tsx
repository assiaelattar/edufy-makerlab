import React, { useState } from 'react';
import { MessageSquare, Upload, ArrowRight, User, Calendar, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Lead } from '../../types';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface ChatImporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
}

export const ChatImporterModal: React.FC<ChatImporterModalProps> = ({ isOpen, onClose, lead }) => {
    const [rawText, setRawText] = useState('');
    const [parsedMessages, setParsedMessages] = useState<any[]>([]);
    const [step, setStep] = useState(1);

    // Basic regex for "Date, Time - Name: Message" format common in WhatsApp exports or copy-paste
    // This is a naive parser; valid for formats like "12/05/2024, 14:30 - Mom: Hello"
    const parseChat = () => {
        const lines = rawText.split('\n');
        const messages: any[] = [];

        lines.forEach(line => {
            // Check for pattern: Date/Time dash Name colon Message
            // Regex allows flexibility in date formats
            // Matches: [12/12/2024, 10:00] Name: Msg  OR  12/12/2024, 10:00 - Name: Msg
            const match = line.match(/^\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4},?\s\d{1,2}:\d{2})\]?\s-?\s?([^:]+):\s(.+)$/);

            if (match) {
                messages.push({
                    date: match[1], // Keep original string for now, or parse to ISO
                    author: match[2].trim(),
                    content: match[3].trim()
                });
            } else if (messages.length > 0 && line.trim()) {
                // Append multiline messages to previous
                messages[messages.length - 1].content += `\n${line.trim()}`;
            }
        });

        setParsedMessages(messages);
        if (messages.length > 0) setStep(2);
        else alert("Could not parse messages. Please check format.");
    };

    const handleImport = async () => {
        if (!db) return;

        // Convert parsed messages to timeline events
        const events = parsedMessages.map(msg => ({
            date: new Date().toISOString(), // In real app, we'd try to parse 'msg.date' to a real date object
            type: 'note', // Using 'note' type for now as 'chat' isn't fully defined or we misuse 'note'
            details: `[WhatsApp Import] ${msg.author}: ${msg.content}`,
            author: 'System'
        }));

        try {
            await updateDoc(doc(db, 'leads', lead.id), {
                timeline: arrayUnion(...events)
            });
            alert(`Imported ${events.length} messages.`);
            onClose();
            setRawText('');
            setParsedMessages([]);
            setStep(1);
        } catch (error) {
            console.error("Import failed", error);
            alert("Failed to import.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import WhatsApp Chat">
            <div className="flex flex-col h-[500px]">
                {/* Stepper */}
                <div className="flex items-center justify-center gap-4 mb-6 text-sm">
                    <span className={`font-bold ${step === 1 ? 'text-purple-500' : 'text-slate-500'}`}>1. Paste Log</span>
                    <ArrowRight size={14} className="text-slate-300" />
                    <span className={`font-bold ${step === 2 ? 'text-purple-500' : 'text-slate-500'}`}>2. Verify & Import</span>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                    {step === 1 ? (
                        <div className="flex-1 flex flex-col space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-700">
                                <strong>Instructions:</strong> Open WhatsApp Web, select the messages (or 'Select All' in chat), copy, and paste here.
                            </div>
                            <textarea
                                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder={`[12/05/2024, 09:15] Parent: Is there a spot?\n[12/05/2024, 09:20] Me: Yes, available.`}
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                            />
                            <button onClick={parseChat} disabled={!rawText.trim()} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50">
                                Preview Import
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-slate-700">Preview ({parsedMessages.length} Messages)</h4>
                                <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600">Edit Text</button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                {parsedMessages.map((msg, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                            <User size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-xs font-bold text-slate-800">{msg.author}</span>
                                                <span className="text-[10px] text-slate-400">{msg.date}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 mt-auto">
                                <button onClick={handleImport} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 size={16} /> Confirm Import to Timeline
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
