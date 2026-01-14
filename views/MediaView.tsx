import React, { useState, useMemo, useEffect } from 'react';
import { Camera, Plus, Upload, Trash2, Image as ImageIcon, X, Database, Calendar, CheckCircle2, ChevronRight, Filter, Search, RotateCcw, Send, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { compressImage } from '../utils/helpers';
import { MOCK_GALLERY } from '../utils/mockData';

export const MediaView = () => {
    const { galleryItems, students, enrollments } = useAppContext();
    const { can, userProfile, user } = useAuth();

    const [viewMode, setViewMode] = useState<'gallery' | 'capture'>('gallery');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // --- STANDARD UPLOAD MODAL STATE (Gallery Mode) ---
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadUrl, setUploadUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [preview, setPreview] = useState<string | null>(null);

    // --- SMART CAPTURE STATE ---
    const [capturingStudent, setCapturingStudent] = useState<{ id: string, name: string } | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [capturePreview, setCapturePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isSeeding, setIsSeeding] = useState(false);
    const [filterStudentId, setFilterStudentId] = useState<string>('All');

    // --- DERIVED PERMISSIONS & FILTERING ---
    const isParent = userProfile?.role === 'parent';
    const isStudent = userProfile?.role === 'student';

    const linkedStudent = React.useMemo(() => {
        if (!user || (!isParent && !isStudent)) return null;
        if (isStudent) return students.find(s => s.loginInfo?.uid === user.uid);
        if (isParent) return students.find(s => s.parentLoginInfo?.uid === user.uid);
        return null;
    }, [user, students, isParent, isStudent]);

    const effectiveFilter = (isParent || isStudent) ? (linkedStudent?.id || 'none') : filterStudentId;

    const filteredItems = galleryItems.filter(item => {
        if (effectiveFilter === 'All') return true;
        if (effectiveFilter === 'none') return false;
        if (item.studentId) {
            return item.studentId === effectiveFilter || can('media.manage');
        }
        return true;
    });

    // --- CAPTURE MODE LOGIC ---
    const dayOfWeek = useMemo(() => {
        const d = new Date(selectedDate);
        return d.toLocaleDateString('en-US', { weekday: 'long' });
    }, [selectedDate]);

    const scheduledStudents = useMemo(() => {
        const dayString = dayOfWeek;
        return enrollments.filter(e => {
            if (e.status !== 'active') return false;
            const student = students.find(s => s.id === e.studentId);
            if (!student || student.status === 'inactive') return false;

            const mainHasClass = e.groupTime?.includes(dayString);
            const secHasClass = e.secondGroupTime?.includes(dayString);
            return mainHasClass || secHasClass;
        }).flatMap(e => {
            const slots = [];
            if (e.groupTime?.includes(dayString)) {
                slots.push({ ...e, displayTime: e.groupTime.replace(dayString, '').trim(), displayGroup: e.groupName || '' });
            }
            if (e.secondGroupTime?.includes(dayString)) {
                slots.push({ ...e, displayTime: e.secondGroupTime.replace(dayString, '').trim(), displayGroup: e.secondGroupName || '' });
            }
            return slots;
        });
    }, [enrollments, students, dayOfWeek]);

    const studentsByTime = useMemo(() => {
        const groups: Record<string, typeof scheduledStudents> = {};
        scheduledStudents.forEach(s => {
            if (!groups[s.displayTime]) groups[s.displayTime] = [];
            groups[s.displayTime].push(s);
        });
        return Object.keys(groups).sort((a, b) => {
            const ta = parseInt(a.replace(':', ''));
            const tb = parseInt(b.replace(':', ''));
            return ta - tb;
        }).map(time => ({ time, students: groups[time] }));
    }, [scheduledStudents]);

    const getStudentPhotosForDate = (studentId: string) => {
        return galleryItems.filter(item => {
            if (item.studentId !== studentId) return false;
            if (!item.createdAt) return false;
            let dateStr = '';
            // @ts-ignore
            if (item.createdAt.toDate) dateStr = item.createdAt.toDate().toISOString().split('T')[0];
            // @ts-ignore
            else dateStr = new Date(item.createdAt).toISOString().split('T')[0];
            return dateStr === selectedDate;
        });
    };

    const captureStats = useMemo(() => {
        let captured = 0;
        scheduledStudents.forEach(s => {
            if (getStudentPhotosForDate(s.studentId).length > 0) captured++;
        });
        return { total: scheduledStudents.length, captured };
    }, [scheduledStudents, galleryItems, selectedDate]);

    // Handle shifting date
    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // --- HANDLERS ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setUploadUrl(compressed);
            setPreview(compressed);
        } catch (err) {
            console.error("Compression failed", err);
            alert("Failed to process image.");
        }
    };

    const handleSaveMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !uploadUrl) return;

        const student = students.find(s => s.id === selectedStudentId);
        await addDoc(collection(db, 'gallery_items'), {
            url: uploadUrl,
            caption,
            type: 'image',
            studentId: selectedStudentId || null,
            studentName: student?.name || null,
            createdAt: serverTimestamp()
        });

        setIsUploadModalOpen(false);
        setUploadUrl('');
        setCaption('');
        setSelectedStudentId('');
        setPreview(null);
    };

    const handleOpenCamera = (student: { id: string, name: string }) => {
        // Fallback for name to prevent modal crash
        setCapturingStudent({ ...student, name: student.name || 'Unknown Maker' });
        setPendingFile(null);
        setCapturePreview(null);
    };

    const handleCaptureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        setPendingFile(file);
        setCapturePreview(objectUrl);
    };

    const handleRetake = () => {
        setPendingFile(null);
        setCapturePreview(null);
    };

    const handleConfirmShare = async () => {
        if (!db || !pendingFile || !capturingStudent) return;
        setIsUploading(true);
        try {
            const compressed = await compressImage(pendingFile);
            await addDoc(collection(db, 'gallery_items'), {
                url: compressed,
                caption: `Daily Showcase - ${selectedDate}`,
                type: 'image',
                studentId: capturingStudent.id,
                studentName: capturingStudent.name,
                createdAt: serverTimestamp()
            });
            handleRetake();
        } catch (err) {
            console.error(err);
            alert("Failed to share photo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!db || !confirm("Delete this photo?")) return;
        await deleteDoc(doc(db, 'gallery_items', id));
    };

    const handleSeedGallery = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            for (const item of MOCK_GALLERY) {
                await addDoc(collection(db, 'gallery_items'), { ...item, createdAt: serverTimestamp() });
            }
        } catch (e) { console.error(e); } finally { setIsSeeding(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-full bg-slate-50 rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4">
            {/* --- TOP HEADER (Sticky) --- */}
            <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 md:px-8 md:py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-3 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)]">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-[#2D2B6B] flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                            <Camera className="text-[#2D2B6B]" size={20} />
                        </div>
                        {viewMode === 'capture' ? 'Smart Capture' : (linkedStudent ? `${(linkedStudent.name || 'My').split(' ')[0]}'s Gallery` : "Academy Gallery")}
                    </h2>
                </div>

                {can('media.manage') && (
                    <div className="flex bg-slate-100 p-1.5 rounded-full border border-slate-200 self-start md:self-auto">
                        <button onClick={() => setViewMode('gallery')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'gallery' ? 'bg-white text-[#2D2B6B] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Gallery</button>
                        <button onClick={() => setViewMode('capture')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'capture' ? 'bg-gradient-to-r from-[#2D2B6B] to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Smart Capture</button>
                    </div>
                )}
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-32">

                {/* --- SMART CAPTURE VIEW --- */}
                {viewMode === 'capture' && can('media.manage') ? (
                    <div className="space-y-8 max-w-3xl mx-auto">

                        {/* Day Selector Card */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/50 relative overflow-hidden">
                            {/* Decorative BG */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <button onClick={() => shiftDate(-1)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-[#2D2B6B] transition-colors"><ArrowLeft size={20} /></button>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{dayOfWeek}</div>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="text-2xl md:text-3xl font-black text-[#2D2B6B] bg-transparent text-center outline-none cursor-pointer tracking-tight"
                                    />
                                </div>
                                <button onClick={() => shiftDate(1)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-[#2D2B6B] transition-colors"><ArrowRight size={20} /></button>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <span className="text-xs font-bold text-slate-500">Progress</span>
                                    <span className="text-xs font-bold text-[#2D2B6B]">{captureStats.captured} of {captureStats.total} Captured</span>
                                </div>
                                <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(79,70,229,0.3)]" style={{ width: `${captureStats.total > 0 ? (captureStats.captured / captureStats.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {scheduledStudents.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calendar size={28} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-medium">No workshops scheduled.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {studentsByTime.map(slot => (
                                    <div key={slot.time} className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-8 px-4 bg-[#2D2B6B] text-white rounded-lg text-sm font-bold font-mono flex items-center shadow-lg shadow-indigo-900/10">
                                                {slot.time}
                                            </div>
                                            <div className="h-px flex-1 bg-slate-200"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-full">{slot.students.length} Makers</span>
                                        </div>

                                        <div className="grid gap-3">
                                            {slot.students.map(student => {
                                                const photos = getStudentPhotosForDate(student.studentId);
                                                const photoCount = photos.length;
                                                const isCaptured = photoCount > 0;
                                                const isComplete = photoCount >= 3;
                                                const initials = (student.studentName || '??').split(' ').map(n => n[0]).join('').slice(0, 2);

                                                return (
                                                    <div
                                                        key={`${student.studentId}-${slot.time}`}
                                                        onClick={() => handleOpenCamera({ id: student.studentId, name: student.studentName || 'Unknown' })}
                                                        className={`group relative bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all cursor-pointer overflow-hidden hover:border-indigo-100 hover:shadow-md ${isComplete ? 'opacity-70 bg-slate-50/50' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-5 pl-2 relative z-10">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold border-2 shrink-0 shadow-sm transition-colors ${isComplete ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                                                    (isCaptured ? 'bg-white border-indigo-200 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400')
                                                                }`}>
                                                                {isCaptured ? (isComplete ? <CheckCircle2 size={24} /> : photoCount) : initials}
                                                            </div>
                                                            <div>
                                                                <div className={`font-bold text-lg leading-tight mb-1 ${isComplete ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                                                    {student.studentName || 'Unknown'}
                                                                </div>
                                                                <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{student.displayGroup}</span>
                                                                    <span>{student.programName}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 relative z-10">
                                                            {isCaptured && !isComplete && (
                                                                <span className="hidden sm:inline-block text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg">
                                                                    {photoCount} / 3 Ready
                                                                </span>
                                                            )}
                                                            <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${isComplete ? 'bg-slate-100 text-slate-400' : 'bg-[#2D2B6B] text-white shadow-indigo-900/20 group-hover:bg-indigo-600'
                                                                }`}>
                                                                <Camera size={22} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* --- GALLERY GRID VIEW (Standard) --- */
                    <>
                        {can('media.manage') && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
                                <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-pink-500/20 text-sm font-bold shrink-0 active:scale-95 transition-transform">
                                    <Plus size={18} /> Upload Media
                                </button>
                                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                                <select value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)} className="bg-white border-0 ring-1 ring-slate-100 text-slate-600 text-sm font-bold rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-[#2D2B6B] shrink-0 shadow-sm min-w-[200px]">
                                    <option value="All">All Makers</option>
                                    {students.filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                            {filteredItems.map(item => (
                                <div key={item.id} className="group relative bg-white rounded-2xl overflow-hidden aspect-square border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                                    <img src={item.url} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#2D2B6B]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <p className="text-white text-sm font-bold line-clamp-2 leading-tight">{item.caption || 'No Caption'}</p>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider">{(item.studentName || 'Unknown').split(' ')[0]}</span>
                                            {can('media.manage') && <button onClick={() => handleDelete(item.id)} className="p-2 bg-white/20 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"><Trash2 size={14} /></button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* --- IMMERSIVE SMART CAPTURE MODAL (Bottom Sheet Style) --- */}
            {capturingStudent && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-[#0f172a]/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full md:max-w-md md:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden flex flex-col h-[90vh] md:h-[85vh] animate-in slide-in-from-bottom duration-300 shadow-2xl">

                        {/* Modal Header */}
                        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 z-[70]">
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-[#2D2B6B] line-clamp-1">{capturingStudent.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`h-1.5 w-1.5 rounded-full ${getStudentPhotosForDate(capturingStudent.id).length >= 3 ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></div>
                                    <span className="text-xs font-bold text-slate-500">
                                        {getStudentPhotosForDate(capturingStudent.id).length} / 3 Photos Captured
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setCapturingStudent(null)} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={20} className="text-slate-500" /></button>
                        </div>

                        {/* Recent Photos Strip */}
                        {getStudentPhotosForDate(capturingStudent.id).length > 0 && (
                            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                                <div className="flex gap-3">
                                    {getStudentPhotosForDate(capturingStudent.id).map(photo => (
                                        <div key={photo.id} className="relative group w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                                            <img src={photo.url} className="w-full h-full object-cover" />
                                            <button onClick={() => handleDelete(photo.id)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Visual Capture Area */}
                        <div className="flex-1 bg-slate-900 relative flex flex-col items-center justify-center overflow-hidden">
                            {capturePreview ? (
                                <img src={capturePreview} className="w-full h-full object-contain" />
                            ) : (
                                // Camera Viewfinder Simulation
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative">

                                    {/* Crosshairs */}
                                    {getStudentPhotosForDate(capturingStudent.id).length < 3 && (
                                        <>
                                            <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-xl"></div>
                                            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/20 rounded-tr-xl"></div>
                                            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-xl"></div>
                                            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-xl"></div>
                                        </>
                                    )}

                                    {getStudentPhotosForDate(capturingStudent.id).length >= 3 ? (
                                        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 animate-in zoom-in-90 duration-300">
                                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                                <CheckCircle2 size={32} className="text-white" />
                                            </div>
                                            <h4 className="text-white font-bold text-xl">Collection Complete</h4>
                                            <p className="text-white/60 text-sm mt-2 font-medium">Please proceed to the next student.</p>
                                        </div>
                                    ) : (
                                        <p className="text-white/40 font-medium tracking-wide text-sm">TAP BUTTON TO CAPTURE</p>
                                    )}
                                </div>
                            )}

                            {/* Floating Controls Overlay */}
                            {!capturePreview && getStudentPhotosForDate(capturingStudent.id).length < 3 && (
                                <div className="absolute inset-x-0 bottom-0 p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                                    <label className="cursor-pointer active:scale-90 transition-transform duration-200">
                                        <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                                            <div className="w-16 h-16 bg-white rounded-full"></div>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleCaptureFile} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Validated Action Bar (Bottom Sheet Footer) */}
                        {capturePreview && (
                            <div className="p-4 bg-white border-t border-slate-100 flex gap-3 pb-8 md:pb-6">
                                <button
                                    onClick={handleRetake}
                                    disabled={isUploading}
                                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:bg-slate-200 transition-colors"
                                >
                                    <RotateCcw size={20} /> Retake
                                </button>
                                <button
                                    onClick={handleConfirmShare}
                                    disabled={isUploading}
                                    className="flex-[2] py-4 bg-[#2D2B6B] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20 active:bg-indigo-900 transition-all"
                                >
                                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <><Send size={20} /> Share Photo</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- STANDARD UPLOAD MODAL --- */}
            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload to Gallery">
                <form onSubmit={handleSaveMedia} className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center relative bg-white">
                        {preview ? (
                            <div className="relative w-full h-48">
                                <img src={preview} className="w-full h-full object-contain rounded-lg" />
                                <button type="button" onClick={() => { setPreview(null); setUploadUrl(''); }} className="absolute top-2 right-2 bg-white text-red-500 p-2 rounded-full shadow-lg"><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <Upload className="w-12 h-12 text-slate-300 mb-3" />
                                <p className="text-sm text-slate-500 font-medium">Tap to upload</p>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tag Maker</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] outline-none" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                            <option value="">-- General --</option>
                            {students.filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Caption</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Title..." /></div>
                    <button type="submit" disabled={!uploadUrl} className="w-full py-3 bg-[#2D2B6B] text-white rounded-xl font-bold disabled:opacity-50">Save</button>
                </form>
            </Modal>
        </div>
    );
};
