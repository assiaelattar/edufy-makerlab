import React, { useState, useMemo, useEffect } from 'react';
import { Camera, Plus, Upload, Trash2, Image as ImageIcon, X, Database, Calendar, CheckCircle2, ChevronRight, Filter, Search, RotateCcw, Send, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { compressImage } from '../utils/helpers';
import { MOCK_GALLERY } from '../utils/mockData';

export const MediaView = () => {
    const { galleryItems, students, enrollments } = useAppContext();
    const { can, userProfile, user, currentOrganization } = useAuth(); // Added currentOrganization

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

    // --- NEW SEARCH & MANAGE STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [isManageMode, setIsManageMode] = useState(false); // For safe deletion

    // --- DERIVED PERMISSIONS & FILTERING ---
    const isParent = userProfile?.role === 'parent';
    const isStudent = userProfile?.role === 'student';

    const linkedStudent = React.useMemo(() => {
        if (!user || (!isParent && !isStudent)) return null;
        if (isStudent) return students.find(s => s.loginInfo?.uid === user.uid);
        if (isParent) return students.find(s => s.parentLoginInfo?.uid === user.uid);
        return null;
    }, [user, students, isParent, isStudent]);

    // Derived Filter Logic
    const filteredItems = useMemo(() => {
        let items = galleryItems;

        // 1. Role Restriction
        if (isParent || isStudent) {
            const myId = linkedStudent?.id;
            if (!myId) return [];
            items = items.filter(i => i.studentId === myId);
        }

        // 2. Search Query (Smart Filter)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter(i =>
                (i.studentName && i.studentName.toLowerCase().includes(query)) ||
                (i.caption && i.caption.toLowerCase().includes(query))
            );
        }

        return items;
    }, [galleryItems, isParent, isStudent, linkedStudent, searchQuery]);


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
            organizationId: currentOrganization?.id || 'makerlab-academy', // ADDED ORG ID
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

    const [orphanedCount, setOrphanedCount] = useState(0);

    // --- ORPHAN SCANNER (Auto-Detect) ---
    useEffect(() => {
        if (!db) return;
        const scanOrphans = async () => {
            // Check if there are items without organizationId
            const snap = await getDocs(collection(db, 'gallery_items'));
            const count = snap.docs.filter(d => !d.data().organizationId).length;
            setOrphanedCount(count);
            if (count > 0 && process.env.NODE_ENV === 'development') {
                console.log(`Found ${count} orphaned gallery items.`);
            }
        };
        scanOrphans();
    }, [db]);

    const handleResultMigration = async () => {
        if (!db || !currentOrganization) return;
        setIsSeeding(true);
        try {
            const snap = await getDocs(collection(db, 'gallery_items'));
            const batch = writeBatch(db);
            let count = 0;

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.organizationId) {
                    batch.update(doc(db, 'gallery_items', docSnap.id), {
                        organizationId: currentOrganization.id
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                alert(`Restored ${count} photos!`);
                setOrphanedCount(0);
                window.location.reload();
            }
        } catch (e) { console.error(e); alert("Restore failed"); }
        finally { setIsSeeding(false); }
    };

    const handleSeedGallery = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            for (const item of MOCK_GALLERY) {
                await addDoc(collection(db, 'gallery_items'), { ...item, organizationId: currentOrganization?.id || 'makerlab-academy', createdAt: serverTimestamp() });
            }
        } catch (e) { console.error(e); } finally { setIsSeeding(false); }
    };

    // --- MIGRATION UTILITY ---
    const handleMigrateGallery = async () => {
        if (!db || !currentOrganization) return;
        if (!confirm("This will scan ALL gallery items and assign them to this academy. Continue?")) return;

        setIsSeeding(true);
        try {
            // 1. Fetch ALL items (using special rule access or client-side filter if possible)
            // Note: Since we can't query "missing organizationId" easily without index, we might need to rely on the fact 
            // that we can READ them via the new rule, but they are filtered out by AppContext.
            // We need to fetch DIRECTLY here.

            const snap = await getDocs(collection(db, 'gallery_items'));
            const batch = writeBatch(db);
            let count = 0;

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.organizationId) {
                    batch.update(doc(db, 'gallery_items', docSnap.id), {
                        organizationId: currentOrganization.id
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                alert(`Successfully repaired ${count} photos! Reloading...`);
                window.location.reload();
            } else {
                alert("No orphaned photos found. Everything looks correct!");
            }

        } catch (e) {
            console.error(e);
            alert("Migration failed. Check console.");
        } finally {
            setIsSeeding(false);
        }
    };

    const handleConfirmShare = async () => {
        if (!db || !pendingFile || !capturingStudent) return;
        setIsUploading(true);
        try {
            const compressed = await compressImage(pendingFile);
            await addDoc(collection(db, 'gallery_items'), {
                organizationId: currentOrganization?.id || 'makerlab-academy', // ADDED ORG ID
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
        if (!db || !confirm("Are you sure you want to delete this photo permanently?")) return;
        await deleteDoc(doc(db, 'gallery_items', id));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-full bg-slate-900 rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 border border-slate-800 shadow-2xl">
            {/* --- TOP HEADER (Sticky) --- */}
            <div className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 md:px-8 md:py-6 border-b border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-lg">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                            <Camera className="text-indigo-400" size={20} />
                        </div>
                        {viewMode === 'capture' ? 'Smart Capture' : (linkedStudent ? `${(linkedStudent.name || 'My').split(' ')[0]}'s Gallery` : "Academy Gallery")}
                    </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {/* View Switcher */}
                    {can('media.manage') && (
                        <div className="flex bg-slate-800 p-1.5 rounded-full border border-slate-700 self-start md:self-auto shrink-0">
                            <button onClick={() => setViewMode('gallery')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'gallery' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}>Gallery</button>
                            <button onClick={() => setViewMode('capture')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'capture' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}>Smart Capture</button>
                        </div>
                    )}

                    {/* Search Bar (Only in Gallery Mode) */}
                    {viewMode === 'gallery' && (
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search student..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar pb-32">

                {/* ORPHAN RESTORE BANNER */}
                {orphanedCount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/50 rounded-2xl p-4 flex items-center justify-between shadow-lg mb-6 animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500"><Database size={20} /></div>
                            <div>
                                <h4 className="text-amber-200 font-bold text-sm">Missing Photos Detected</h4>
                                <p className="text-amber-500/80 text-xs">Found {orphanedCount} photos from the old system.</p>
                            </div>
                        </div>
                        <button onClick={handleResultMigration} className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-900/20">
                            Restore Now
                        </button>
                    </div>
                )}

                {/* --- SMART CAPTURE VIEW --- */}
                {viewMode === 'capture' && can('media.manage') ? (
                    <div className="space-y-8 max-w-3xl mx-auto">

                        {/* Day Selector Card */}
                        <div className="bg-slate-800/50 rounded-[2rem] p-6 shadow-xl border border-slate-700 relative overflow-hidden backdrop-blur-sm">
                            {/* Decorative BG */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <button onClick={() => shiftDate(-1)} className="p-3 hover:bg-slate-700 rounded-2xl text-slate-500 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{dayOfWeek}</div>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="text-2xl md:text-3xl font-black text-white bg-transparent text-center outline-none cursor-pointer tracking-tight"
                                    />
                                </div>
                                <button onClick={() => shiftDate(1)} className="p-3 hover:bg-slate-700 rounded-2xl text-slate-500 hover:text-white transition-colors"><ArrowRight size={20} /></button>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <span className="text-xs font-bold text-slate-400">Progress</span>
                                    <span className="text-xs font-bold text-indigo-400">{captureStats.captured} of {captureStats.total} Captured</span>
                                </div>
                                <div className="relative h-5 bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-700">
                                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(79,70,229,0.3)]" style={{ width: `${captureStats.total > 0 ? (captureStats.captured / captureStats.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {scheduledStudents.length === 0 ? (
                            <div className="text-center py-24 bg-slate-800/30 rounded-[2.5rem] border border-slate-800 border-dashed">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                    <Calendar size={28} className="text-slate-500" />
                                </div>
                                <p className="text-slate-500 font-medium">No workshops scheduled.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {studentsByTime.map(slot => (
                                    <div key={slot.time} className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-8 px-4 bg-indigo-600 text-white rounded-lg text-sm font-bold font-mono flex items-center shadow-lg shadow-indigo-500/20 border border-indigo-500/50">
                                                {slot.time}
                                            </div>
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">{slot.students.length} Makers</span>
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
                                                        className={`group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer overflow-hidden hover:border-indigo-500/50 hover:bg-slate-800 hover:shadow-indigo-500/10 ${isComplete ? 'opacity-50' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-5 pl-2 relative z-10">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold border-2 shrink-0 shadow-sm transition-colors ${isComplete ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                                (isCaptured ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-700/50 border-transparent text-slate-500')
                                                                }`}>
                                                                {isCaptured ? (isComplete ? <CheckCircle2 size={24} /> : photoCount) : initials}
                                                            </div>
                                                            <div>
                                                                <div className={`font-bold text-lg leading-tight mb-1 ${isComplete ? 'text-slate-500 line-through decoration-slate-700' : 'text-white'}`}>
                                                                    {student.studentName || 'Unknown'}
                                                                </div>
                                                                <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                                    <span className="bg-slate-700/50 border border-slate-700 px-2 py-0.5 rounded-md">{student.displayGroup}</span>
                                                                    <span>{student.programName}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 relative z-10">
                                                            {isCaptured && !isComplete && (
                                                                <span className="hidden sm:inline-block text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                                                                    {photoCount} / 3 Ready
                                                                </span>
                                                            )}
                                                            <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-lg border border-white/5 ${isComplete ? 'bg-slate-800 text-slate-600' : 'bg-indigo-600 text-white shadow-indigo-500/30 group-hover:bg-indigo-500'
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
                            <div className="flex items-center justify-between">
                                <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-6 py-2.5 rounded-2xl shadow-lg shadow-pink-600/20 text-sm font-bold shrink-0 active:scale-95 transition-transform hover:brightness-110">
                                    <Plus size={18} /> Upload
                                </button>

                                {/* Manage/Delete Toggle */}
                                <div className="flex gap-2">
                                    {isManageMode && (
                                        <button
                                            onClick={handleMigrateGallery}
                                            disabled={isSeeding}
                                            className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                                            title="Fix Invisible Photos"
                                        >
                                            <Database size={16} /> Fix Data
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsManageMode(!isManageMode)}
                                        className={`p-2.5 rounded-xl transition-all ${isManageMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
                                        title="Manage / Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                            {filteredItems.length === 0 ? (
                                <div className="col-span-full py-20 text-center">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                        <ImageIcon size={30} className="text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 font-medium">No photos found.</p>
                                </div>
                            ) : filteredItems.map(item => (
                                <div key={item.id} className="group relative bg-slate-800 rounded-2xl overflow-hidden aspect-square border border-slate-700 shadow-md transition-all hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-500/50">
                                    <img src={item.url} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <p className="text-white text-sm font-bold line-clamp-2 leading-tight drop-shadow-md">{item.caption || 'No Caption'}</p>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">{(item.studentName || 'Unknown').split(' ')[0]}</span>
                                            {can('media.manage') && isManageMode && (
                                                <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors border border-red-400"><Trash2 size={14} /></button>
                                            )}
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
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full md:max-w-md md:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden flex flex-col h-[90vh] md:h-[85vh] animate-in slide-in-from-bottom duration-300 shadow-2xl border border-slate-800">

                        {/* Modal Header */}
                        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10 z-[70]">
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-white line-clamp-1">{capturingStudent.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`h-1.5 w-1.5 rounded-full ${getStudentPhotosForDate(capturingStudent.id).length >= 3 ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></div>
                                    <span className="text-xs font-bold text-slate-400">
                                        {getStudentPhotosForDate(capturingStudent.id).length} / 3 Photos Captured
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setCapturingStudent(null)} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors border border-slate-700"><X size={20} className="text-slate-400" /></button>
                        </div>

                        {/* Recent Photos Strip */}
                        {getStudentPhotosForDate(capturingStudent.id).length > 0 && (
                            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 overflow-x-auto">
                                <div className="flex gap-3">
                                    {getStudentPhotosForDate(capturingStudent.id).map(photo => (
                                        <div key={photo.id} className="relative group w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-700 shadow-sm">
                                            <img src={photo.url} className="w-full h-full object-cover" />
                                            <button onClick={() => handleDelete(photo.id)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Visual Capture Area */}
                        <div className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-hidden">
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
                                        <p className="text-white/40 font-medium tracking-wide text-sm animate-pulse">TAP BUTTON TO CAPTURE</p>
                                    )}
                                </div>
                            )}

                            {/* Floating Controls Overlay */}
                            {!capturePreview && getStudentPhotosForDate(capturingStudent.id).length < 3 && (
                                <div className="absolute inset-x-0 bottom-0 p-8 pb-12 bg-gradient-to-t from-black to-transparent flex justify-center">
                                    <label className="cursor-pointer active:scale-95 transition-transform duration-200">
                                        <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:bg-white/30 transition-colors">
                                            <div className="w-16 h-16 bg-white rounded-full shadow-inner"></div>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleCaptureFile} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Validated Action Bar (Bottom Sheet Footer) */}
                        {capturePreview && (
                            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3 pb-8 md:pb-6">
                                <button
                                    onClick={handleRetake}
                                    disabled={isUploading}
                                    className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold flex items-center justify-center gap-2 active:bg-slate-700 transition-colors border border-slate-700 hover:text-white"
                                >
                                    <RotateCcw size={20} /> Retake
                                </button>
                                <button
                                    onClick={handleConfirmShare}
                                    disabled={isUploading}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all hover:bg-indigo-500"
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
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center relative bg-slate-800/50 hover:bg-slate-800/80 transition-colors">
                        {preview ? (
                            <div className="relative w-full h-48">
                                <img src={preview} className="w-full h-full object-contain rounded-lg" />
                                <button type="button" onClick={() => { setPreview(null); setUploadUrl(''); }} className="absolute top-2 right-2 bg-slate-900 text-red-500 p-2 rounded-full shadow-lg border border-slate-700"><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <Upload className="w-12 h-12 text-slate-500 mb-3" />
                                <p className="text-sm text-slate-400 font-medium">Tap to upload</p>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Tag Maker</label>
                        <select className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                            <option value="">-- General --</option>
                            {students.filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Caption</label><input className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Title..." /></div>
                    <button type="submit" disabled={!uploadUrl} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Save</button>
                </form>
            </Modal>
        </div>
    );
};
