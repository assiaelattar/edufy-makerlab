import React, { useState, useEffect, useMemo } from 'react';
import { Mail, MessageCircle, Plus, Search, Trash2, Send, Save, FileText, CheckCircle2, Users, AlertCircle, Clock, Filter, Phone, Calendar, X, Play, SkipForward, CheckSquare } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { Modal } from '../components/Modal';
import { CommunicationTemplate, Announcement } from '../types';
import { formatDate } from '../utils/helpers';

// --- SEED DATA ---
const MOCK_TEMPLATES = [
    { title: "Marche Verte", category: 'holiday', tags: ['novembre', 'national'], content: "Bonjour chers parents,\n\nÀ l’occasion de la glorieuse Marche Verte, MakerLab Academy souhaite à vous et à vos enfants une excellente fête. C'est l'occasion de célébrer notre histoire et nos valeurs.\n\n⚠️ Rappel : L'académie sera fermée le [Date]. Reprise des cours le [Date].\n\nBonne fête à tous ! 🇲🇦" },
    { title: "Fête de l'Indépendance", category: 'holiday', tags: ['novembre', 'national'], content: "Chers parents, nous célébrons aujourd'hui la Fête de l'Indépendance du Maroc. Nous souhaitons une journée pleine de fierté à toutes nos familles.\n\nNote : Pas de cours ce [Jour]. À très vite pour de nouvelles découvertes ! 🇲🇦" },
    { title: "Manifeste de l'Indépendance", category: 'holiday', tags: ['janvier', 'national'], content: "Bonjour à tous,\n\nEn commémoration de la présentation du Manifeste de l'Indépendance, l'académie sera fermée ce 11 janvier. Profitez de ce jour férié en famille ! 🚀" },
    { title: "Nouvel An", category: 'holiday', tags: ['janvier', 'new_year'], content: "Bonne année ! 🎉 Toute l'équipe de MakerLab vous souhaite santé, bonheur et réussite. Que cette année soit placée sous le signe de l'innovation et de la créativité pour nos petits génies ! 🤖" },
    { title: "Aïd Moubarak", category: 'holiday', tags: ['religieux'], content: "Chers parents, toute l'équipe pédagogique vous présente ses meilleurs vœux à l'occasion de l'Aïd. Que cette fête vous apporte joie et sérénité. ✨\n\n📅 Info Pratique : L'académie sera en pause du [Date début] au [Date fin]. Reprise des activités le [Date de reprise]." },
    { title: "Ramadan - Horaires", category: 'news', tags: ['ramadan', 'horaires'], content: "Ramadan Moubarak à toutes nos familles ! 🌙\n\nPour s'adapter au rythme de ce mois sacré, voici nos horaires aménagés :\n🕒 Mercredi 15h-17h / Samedi 10h-13h\n\nMerci de votre confiance !" },
    { title: "Vacances d'Hiver", category: 'news', tags: ['decembre', 'vacances'], content: "C'est l'heure de la pause hivernale ! ❄️\n\nBravo à tous nos élèves pour leurs progrès en Coding/Robotique ce trimestre. L'académie sera fermée pour les vacances du [Date] au [Date].\n\n💡 Défi Vacances : Demandez à votre enfant de vous expliquer comment fonctionne les boucles en programmation !\n\nBonnes fêtes de fin d'année ! ☃️" },
    { title: "Rentrée Scolaire", category: 'news', tags: ['septembre', 'rentrée'], content: "C'est la rentrée chez MakerLab Academy ! 🚀\n\nNous sommes impatients de retrouver nos futurs ingénieurs ce [Jour de la semaine].\nAu programme cette année : Robotique, IA, et Coding créatif.\n\nN'oubliez pas le cahier et la clé USB. À très vite !" },
    { title: "Invitation Demo Day", category: 'event', tags: ['event', 'invitation'], content: "Sujet : 🤖 Venez voir les créations de vos enfants !\n\nChers parents, vous êtes invités à notre Demo Day le [Date] à [Heure].\nVos enfants présenteront leurs projets finaux (robots, jeux vidéo, apps). C'est un moment fort pour valoriser leur travail. Votre présence est leur plus belle récompense !\n\nHâte de vous y voir." },
    { title: "Annulation Cours (Urgent)", category: 'urgent', tags: ['urgent', 'meteo'], content: "⚠️ Important : En raison de [la météo / travaux / raison urgente], les cours de ce [Jour] sont annulés/reportés.\n\nUne séance de rattrapage sera organisée le [Date]. Merci de votre compréhension." },
    { title: "Rappel Paiement", category: 'reminder', tags: ['admin', 'paiement'], content: "Bonjour ! La fin du trimestre approche. 📅\n\nPour garantir la place de {{student_name}} pour le prochain module, les réinscriptions sont ouvertes jusqu'au [Date].\nMerci de passer à l'administration ou de procéder par virement.\n\nMerci pour votre soutien à l'éducation STEM !" },
];

const MONTHS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

export const CommunicationsView = () => {
    const { students, enrollments, programs } = useAppContext();
    const [activeTab, setActiveTab] = useState<'overview' | 'compose' | 'templates' | 'history'>('overview');

    // Data State
    const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [templateFilter, setTemplateFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');

    // Compose State
    const [messageForm, setMessageForm] = useState({
        title: '',
        content: '',
        targetType: 'all' as 'all' | 'program' | 'grade' | 'specific',
        targetIds: [] as string[]
    });

    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    // Bulk Sender State
    const [isBulkSenderOpen, setIsBulkSenderOpen] = useState(false);
    const [currentBulkIndex, setCurrentBulkIndex] = useState(0);

    // Fetch Templates & History
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        if (!db) return;
        setLoading(true);
        try {
            // Fetch Templates
            const tempSnap = await getDocs(collection(db, 'communication_templates'));
            const tempData = tempSnap.docs.map(d => ({ id: d.id, ...d.data() } as CommunicationTemplate));
            setTemplates(tempData);

            // Fetch Announcements History
            const annSnap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
            const annData = annSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
            setAnnouncements(annData);
        } catch (err) {
            console.error("Error fetching comms data:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- RECIPIENT LOGIC ---
    const recipients = useMemo(() => {
        let list = students.filter(s => s.status === 'active' && s.parentPhone);

        if (messageForm.targetType === 'program' && messageForm.targetIds.length > 0) {
            list = list.filter(s => enrollments.some(e => e.studentId === s.id && e.status === 'active' && messageForm.targetIds.includes(e.programId)));
        }

        return list;
    }, [students, enrollments, messageForm.targetType, messageForm.targetIds]);

    const reachableCount = useMemo(() => students.filter(s => s.status === 'active' && s.parentPhone).length, [students]);

    // Update selected students when recipients change
    useEffect(() => {
        setSelectedStudents(recipients.map(s => s.id));
    }, [recipients]);

    // --- TEMPLATE HANDLERS ---
    const handleSaveTemplate = async () => {
        if (!messageForm.title || !messageForm.content) return alert("Title and Content required");
        if (!db) return;

        const name = prompt("Enter template name:", messageForm.title);
        if (!name) return;

        try {
            const newTemp: any = {
                title: name,
                content: messageForm.content,
                category: 'news',
                tags: [],
                createdAt: serverTimestamp()
            };
            const ref = await addDoc(collection(db, 'communication_templates'), newTemp);
            setTemplates([...templates, { ...newTemp, id: ref.id }]);
            alert("Template saved!");
        } catch (err) {
            console.error(err);
        }
    };

    const handleLoadTemplate = (t: CommunicationTemplate) => {
        setMessageForm(prev => ({ ...prev, content: t.content, title: t.title }));
        setActiveTab('compose');
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm("Delete this template?")) return;
        if (!db) return;
        await deleteDoc(doc(db, 'communication_templates', id));
        setTemplates(templates.filter(t => t.id !== id));
    };

    const handleSeedTemplates = async () => {
        if (!db) return;
        if (!confirm("Add default STEM templates?")) return;

        let count = 0;
        for (const t of MOCK_TEMPLATES) {
            // Check duplicates
            if (templates.some(ex => ex.title === t.title)) continue;

            await addDoc(collection(db, 'communication_templates'), {
                ...t,
                createdAt: serverTimestamp()
            });
            count++;
        }
        fetchData(); // Refresh
        alert(`Added ${count} new templates.`);
    };

    // --- SENDING HANDLERS ---
    const generateMessage = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return '';

        let text = messageForm.content;
        text = text.replace(/{{student_name}}/g, student.name);
        text = text.replace(/{{parent_name}}/g, student.parentName || 'Parent');
        return text;
    };

    const handleSendWhatsApp = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student || !student.parentPhone) return;

        let phone = student.parentPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '212' + phone.substring(1);

        const msg = generateMessage(studentId);
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCreateAnnouncement = async () => {
        if (!messageForm.title || !messageForm.content) return alert("Title and content required");
        if (!db) return;

        if (!confirm(`Ready to publish this announcement to ${selectedStudents.length} students on their Dashboard?`)) return;

        try {
            await addDoc(collection(db, 'announcements'), {
                title: messageForm.title,
                content: messageForm.content,
                targetAudience: { type: messageForm.targetType, ids: messageForm.targetIds },
                status: 'sent',
                sentCount: selectedStudents.length,
                createdAt: serverTimestamp()
            });
            alert("Announcement Published to Dashboard!");
            setMessageForm({ title: '', content: '', targetType: 'all', targetIds: [] });
            setActiveTab('history');
        } catch (err) {
            console.error(err);
            alert("Error publishing announcement.");
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesType = templateFilter === 'all' || t.category === templateFilter;
            const matchesMonth = monthFilter === 'all' || t.tags?.includes(monthFilter);
            return matchesType && matchesMonth;
        });
    }, [templates, templateFilter, monthFilter]);


    // --- BULK SENDER RENDERER ---
    const currentStudent = recipients[currentBulkIndex];
    const progressPerc = recipients.length > 0 ? ((currentBulkIndex) / recipients.length) * 100 : 0;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Communications</h1>
                    <p className="text-slate-500">Send updates via WhatsApp and publish dashboard announcements.</p>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">

                {/* Sidebar */}
                <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        <CheckSquare size={18} /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'compose' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Send size={18} /> Compose New
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'templates' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        <FileText size={18} /> Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Clock size={18} /> History
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">

                    {activeTab === 'overview' && (
                        <div className="p-8 h-full overflow-y-auto">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Overview</h2>

                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl"><Users size={24} /></div>
                                        <div className="text-white/70 text-sm font-bold">Total Reachable</div>
                                    </div>
                                    <div className="text-4xl font-black mb-1">{reachableCount}</div>
                                    <div className="text-white/70 text-sm">Active students with Whatsapp</div>
                                </div>
                                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={24} /></div>
                                        <div className="text-slate-400 text-sm font-bold">Sent History</div>
                                    </div>
                                    <div className="text-4xl font-black text-slate-800 mb-1">{announcements.length}</div>
                                    <div className="text-slate-500 text-sm">Announcements published</div>
                                    import default from './../../vite.config';
                                </div>
                                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-violet-100 text-violet-600 rounded-xl"><FileText size={24} /></div>
                                        <div className="text-slate-400 text-sm font-bold">Templates</div>
                                    </div>
                                    <div className="text-4xl font-black text-slate-800 mb-1">{templates.length}</div>
                                    <div className="text-slate-500 text-sm">Ready to use</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <button onClick={() => setActiveTab('compose')} className="p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl text-left transition-all group">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Send size={20} />
                                    </div>
                                    <div className="font-bold text-slate-800 group-hover:text-blue-700">Send Message</div>
                                </button>
                                <button onClick={() => setActiveTab('templates')} className="p-4 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 border border-slate-200 rounded-xl text-left transition-all group">
                                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                        <Plus size={20} />
                                    </div>
                                    <div className="font-bold text-slate-800 group-hover:text-violet-700">New Template</div>
                                </button>
                            </div>

                            {/* Recent Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Recent Announcements */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Announcements</h3>
                                    <div className="space-y-3">
                                        {announcements.slice(0, 3).map(a => (
                                            <div key={a.id} className="p-4 border border-slate-100 rounded-xl flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                                    <CheckCircle2 size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 truncate">{a.title}</div>
                                                    <div className="text-xs text-slate-500">{formatDate(a.createdAt)} • {a.sentCount} Students</div>
                                                </div>
                                            </div>
                                        ))}
                                        {announcements.length === 0 && <div className="text-slate-400 text-sm italic">No recent activity</div>}
                                    </div>
                                </div>

                                {/* Popular Templates */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Popular Templates</h3>
                                    <div className="space-y-3">
                                        {templates.slice(0, 3).map(t => (
                                            <div key={t.id} className="p-4 border border-slate-100 rounded-xl flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleLoadTemplate(t)}>
                                                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center shrink-0">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 truncate">{t.title}</div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">{t.category}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'compose' && (
                        <div className="flex h-full">
                            {/* Editor */}
                            <div className="flex-1 p-6 border-r border-slate-100 flex flex-col overflow-y-auto">
                                <h2 className="text-xl font-bold text-slate-800 mb-6">Compose Message</h2>

                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Title (Internal & Dashboard)</label>
                                        <input
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                                            placeholder="e.g. Eid Holiday Announcement"
                                            value={messageForm.title}
                                            onChange={e => setMessageForm({ ...messageForm, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Message Content</label>
                                        <textarea
                                            className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-blue-500 transition-colors resize-none min-h-[300px]"
                                            placeholder="Type your message here... Use {{student_name}} for personalization."
                                            value={messageForm.content}
                                            onChange={e => setMessageForm({ ...messageForm, content: e.target.value })}
                                        />
                                        <div className="mt-2 flex gap-2">
                                            <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 font-mono cursor-pointer hover:bg-slate-200" onClick={() => setMessageForm(p => ({ ...p, content: p.content + ' {{student_name}} ' }))}>{'{{student_name}}'}</span>
                                            <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 font-mono cursor-pointer hover:bg-slate-200" onClick={() => setMessageForm(p => ({ ...p, content: p.content + ' {{parent_name}} ' }))}>{'{{parent_name}}'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-between items-center pt-6 border-t border-slate-100">
                                    <button onClick={handleSaveTemplate} className="text-sm font-bold text-slate-400 hover:text-blue-600 flex items-center gap-2">
                                        <Save size={16} /> Save as Template
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setCurrentBulkIndex(0); setIsBulkSenderOpen(true); }} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2">
                                            <MessageCircle size={18} /> Bulk WhatsApp
                                        </button>
                                        <button onClick={handleCreateAnnouncement} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
                                            <Send size={18} /> Publish to Dashboard
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recipients & Preview */}
                            <div className="w-96 bg-slate-50 p-6 flex flex-col border-l border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Users size={18} /> Audience</h3>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1">Filter By</label>
                                        <select
                                            className="w-full p-2 rounded-lg bg-white border border-slate-200 text-sm font-medium"
                                            value={messageForm.targetType}
                                            onChange={e => setMessageForm({ ...messageForm, targetType: e.target.value as any, targetIds: [] })}
                                        >
                                            <option value="all">All Active Students</option>
                                            <option value="program">By Program</option>
                                        </select>
                                    </div>

                                    {messageForm.targetType === 'program' && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 block mb-1">Select Programs</label>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {programs.map(p => (
                                                    <label key={p.id} className="flex items-center gap-2 p-2 rounded bg-white border border-slate-200 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded text-blue-600"
                                                            checked={messageForm.targetIds.includes(p.id)}
                                                            onChange={e => {
                                                                if (e.target.checked) setMessageForm(prev => ({ ...prev, targetIds: [...prev.targetIds, p.id] }));
                                                                else setMessageForm(prev => ({ ...prev, targetIds: prev.targetIds.filter(id => id !== p.id) }));
                                                            }}
                                                        />
                                                        <span className="text-xs font-bold truncate">{p.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 bg-blue-100/50 rounded-xl border border-blue-200 text-blue-800 text-xs font-bold flex justify-between items-center">
                                        <span>Recipients</span>
                                        <span className="bg-white px-2 py-0.5 rounded shadow-sm">{recipients.length}</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden flex flex-col">
                                    <h3 className="font-bold text-slate-700 mb-2 text-sm">Preview List</h3>
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {recipients.map(s => (
                                            <div key={s.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-700 truncate">{s.name}</div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Phone size={10} /> {s.parentPhone || 'No Phone'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSendWhatsApp(s.id)}
                                                    className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"
                                                    title="Send via WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="p-8 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Message Templates</h2>
                                <div className="flex gap-3">
                                    <select
                                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
                                        value={monthFilter}
                                        onChange={e => setMonthFilter(e.target.value)}
                                    >
                                        <option value="all">All Months</option>
                                        {MONTHS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                                    </select>
                                    <select
                                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
                                        value={templateFilter}
                                        onChange={e => setTemplateFilter(e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="holiday">Holidays</option>
                                        <option value="news">News</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="reminder">Reminders</option>
                                        <option value="event">Events</option>
                                    </select>
                                    <button onClick={handleSeedTemplates} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-bold flex items-center gap-2">
                                        <Plus size={14} /> Add Defaults
                                    </button>
                                </div>
                            </div>

                            {templates.length === 0 && !loading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-blue-500">
                                        <FileText size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Templates Yet</h3>
                                    <p className="text-slate-500 mb-8 max-w-md text-center">Get started quickly by loading our pre-made set of French templates for holidays, events, and announcements.</p>
                                    <button
                                        onClick={handleSeedTemplates}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Plus size={20} /> Load Starter Templates
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
                                    {filteredTemplates.map(t => (
                                        <div key={t.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl group hover:shadow-md transition-all flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-500 text-xs font-bold uppercase tracking-wider">{t.category}</div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-lg mb-2">{t.title}</h3>
                                            {t.tags && t.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {t.tags.map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] text-slate-500 font-bold">{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1 whitespace-pre-wrap">{t.content}</p>
                                            <button onClick={() => handleLoadTemplate(t)} className="w-full py-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-200 transition-colors">Use Template</button>
                                        </div>
                                    ))}
                                    <button onClick={() => { setActiveTab('compose'); setMessageForm({ title: '', content: '', targetType: 'all', targetIds: [] }); }} className="p-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all min-h-[200px]">
                                        <Plus size={32} className="mb-2" />
                                        <span className="font-bold">Create New</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Announcement History</h2>
                            <div className="space-y-4">
                                {announcements.map(a => (
                                    <div key={a.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{a.title}</h3>
                                            <p className="text-sm text-slate-500">{a.content.substring(0, 60)}...</p>
                                            <div className="mt-1 flex gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <span>{formatDate(a.createdAt)}</span>
                                                <span>•</span>
                                                <span>{a.sentCount} Recipients</span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Published
                                        </div>
                                    </div>
                                ))}
                                {announcements.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">No announcements sent yet.</div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* BULK SENDER MODAL */}
            {isBulkSenderOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <MessageCircle className="text-emerald-500" /> Bulk WhatsApp Sender
                                </h3>
                                <p className="text-xs text-slate-500">Sending to {recipients.length} students</p>
                            </div>
                            <button onClick={() => setIsBulkSenderOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-8 flex flex-col items-center text-center">
                            {currentStudent ? (
                                <>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
                                        <div className="h-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${progressPerc}%` }} />
                                    </div>

                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
                                        {currentStudent.name.charAt(0)}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{currentStudent.name}</h2>
                                    <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
                                        <Phone size={14} /> {currentStudent.parentPhone || "No Phone Number"}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <button
                                            onClick={() => {
                                                setCurrentBulkIndex(prev => Math.min(prev + 1, recipients.length - 1));
                                            }}
                                            className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex flex-col items-center gap-2 transition-colors"
                                        >
                                            <SkipForward size={24} />
                                            <span>Skip</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleSendWhatsApp(currentStudent.id);
                                                // Auto advance after small delay to allow generic UX flow
                                                setTimeout(() => {
                                                    if (currentBulkIndex < recipients.length - 1) {
                                                        setCurrentBulkIndex(prev => prev + 1);
                                                    } else {
                                                        alert("All messages processed!");
                                                        setIsBulkSenderOpen(false);
                                                    }
                                                }, 1000);
                                            }}
                                            disabled={!currentStudent.parentPhone}
                                            className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex flex-col items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={24} />
                                            <span>Open & Next</span>
                                        </button>
                                    </div>

                                    <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 w-full text-left">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Message Preview</p>
                                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                            {generateMessage(currentStudent.id)}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12">
                                    <CheckCircle2 size={64} className="text-emerald-500 mb-4 mx-auto" />
                                    <h3 className="text-xl font-bold text-slate-800">All Done!</h3>
                                    <p className="text-slate-500">You have reached the end of the list.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
