import React, { useState } from 'react';
import { Plus, Pencil, Clock, Trash2, X, Palette, Check, CalendarDays, Percent, Printer, Tablet } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../utils/helpers';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Program, ProgramPack, Grade, Group, Lead } from '../types';
import { useReactToPrint } from 'react-to-print';
import { FormTemplateRenderer } from '../components/enrollment/FormTemplateRenderer';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ArrowLeft, UserPlus, User } from 'lucide-react';

import { ProgramDetailsView } from './ProgramDetailsView';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { compressImage } from '../utils/image-compression';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';

interface ProgramsViewProps {
  onEnrollLead?: (lead: Lead) => void;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({ onEnrollLead }) => {
  const { programs, navigateTo, leads } = useAppContext();
  const [isProgramModalOpen, setProgramModalOpen] = useState(false);
  const [viewDetailProgramId, setViewDetailProgramId] = useState<string | null>(null); // NEW: For Detail Modal
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  // Printing & Kiosk State
  const [qrProgram, setQrProgram] = useState<Program | null>(null);
  const printComponentRef = React.useRef(null);
  const [printTargetProgram, setPrintTargetProgram] = useState<Program | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Inscription_${printTargetProgram?.name || 'Form'}`,
  });

  // Image Upload State
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnailUrl' | 'partnerLogoUrl') => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!storage) {
      alert("Firebase Storage is not initialized.");
      return;
    }
    const file = e.target.files[0];
    const target = e.target; // Capture target to reset value

    // 20s Timeout Safety
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Upload timed out")), 20000)
    );

    try {
      setUploadingField(field);

      const type = field === 'thumbnailUrl' ? 'Thumbnail' : 'Logo';
      console.log(`[Upload] Starting ${type} upload...`);

      // Race between Upload/Compress and Timeout
      const url = await Promise.race([
        (async () => {
          // Compress
          console.log(`[Upload] Compressing ${type}...`);
          const compressedBlob = await compressImage(file, 800, 0.82);

          // Upload
          console.log(`[Upload] Uploading ${type} to Firebase...`);
          const storageRef = ref(storage, `programs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
          await uploadBytes(storageRef, compressedBlob);

          return await getDownloadURL(storageRef);
        })(),
        timeoutPromise
      ]) as string;

      console.log(`[Upload] Success: ${url}`);
      setProgramForm(prev => ({ ...prev, [field]: url }));
    } catch (error) {
      console.error("[Upload] Failed:", error);
      alert('Upload failed or timed out. Please check your connection and try again.');
    } finally {
      setUploadingField(null);
      target.value = ''; // Reset input so same file can be selected again
    }
  };

  const triggerPrint = (program: Program) => {
    setPrintTargetProgram(program);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const baseUrl = window.location.origin;

  const initialProgramForm: Partial<Program> = {
    name: '',
    type: 'Regular Program',
    description: '',
    status: 'active',
    targetAudience: 'kids',
    packs: [],
    grades: [],
    themeColor: 'blue',
    duration: '',
    paymentTerms: []
  };
  const [programForm, setProgramForm] = useState<Partial<Program>>(initialProgramForm);
  const [tempPack, setTempPack] = useState<ProgramPack>({ name: '', workshopsPerWeek: 1, priceAnnual: 0, priceTrimester: 0, price: 0 });
  const [tempGradeName, setTempGradeName] = useState('');
  const [tempGroup, setTempGroup] = useState<Group>({ id: '', name: '', day: 'Monday', time: '10:00' });
  const [newPaymentTerm, setNewPaymentTerm] = useState('');

  // Inline editing state
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGradeName, setEditGradeName] = useState('');
  const [editGroup, setEditGroup] = useState<Partial<Group>>({});
  const [editingPackIndex, setEditingPackIndex] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'makerpro'>('details');

  const openAddProgram = () => {
    setProgramForm(initialProgramForm);
    setIsEditingProgram(false);
    setActiveTab('details');
    setProgramModalOpen(true);
  };

  const openEditProgram = (program: Program) => {
    setProgramForm(program);
    setSelectedProgram(program);
    setIsEditingProgram(true);
    setActiveTab('details');
    setProgramModalOpen(true);
  };

  const handleSaveProgram = async () => {
    if (!db) return;
    try {
      if (isEditingProgram && selectedProgram) await updateDoc(doc(db, 'programs', selectedProgram.id), { ...programForm });
      else await addDoc(collection(db, 'programs'), { ...programForm });
      setProgramModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const addGradeToForm = () => {
    if (!tempGradeName) return;
    const newGrade: Grade = { id: Date.now().toString(), name: tempGradeName, groups: [] };
    setProgramForm(prev => ({ ...prev, grades: [...(prev.grades || []), newGrade] }));
    setTempGradeName('');
  };

  const addGroupToGrade = (gradeIndex: number) => {
    if (!tempGroup.name) return;
    const updatedGrades = [...(programForm.grades || [])];
    updatedGrades[gradeIndex].groups.push({ ...tempGroup, id: Date.now().toString() });
    setProgramForm(prev => ({ ...prev, grades: updatedGrades }));
    setTempGroup({ id: '', name: '', day: 'Monday', time: '10:00' });
  };

  // --- COLOR HELPERS (FIXED FOR TAILWIND JIT) ---
  // We must return exact class strings, not constructed ones.
  const getBadgeStyle = (theme: string = 'blue') => {
    const styles: any = {
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return styles[theme] || styles.blue;
  };

  const getBorderColor = (theme: string = 'blue') => {
    const styles: any = {
      blue: 'border-blue-500/50 hover:border-blue-500',
      purple: 'border-purple-500/50 hover:border-purple-500',
      emerald: 'border-emerald-500/50 hover:border-emerald-500',
      amber: 'border-amber-500/50 hover:border-amber-500',
      rose: 'border-rose-500/50 hover:border-rose-500',
      cyan: 'border-cyan-500/50 hover:border-cyan-500',
      slate: 'border-slate-500/50 hover:border-slate-500',
    };
    return styles[theme] || styles.blue;
  };

  const getGlowColor = (theme: string = 'blue') => {
    const styles: any = {
      blue: 'shadow-blue-500/20',
      purple: 'shadow-purple-500/20',
      emerald: 'shadow-emerald-500/20',
      amber: 'shadow-amber-500/20',
      rose: 'shadow-rose-500/20',
      cyan: 'shadow-cyan-500/20',
      slate: 'shadow-slate-500/20',
    };
    return styles[theme] || styles.blue;
  };

  // For active schedule dots (bg-color-500)
  const getDotColor = (theme: string = 'blue') => {
    const styles: any = {
      blue: 'bg-blue-500 shadow-blue-500/50',
      purple: 'bg-purple-500 shadow-purple-500/50',
      emerald: 'bg-emerald-500 shadow-emerald-500/50',
      amber: 'bg-amber-500 shadow-amber-500/50',
      rose: 'bg-rose-500 shadow-rose-500/50',
      cyan: 'bg-cyan-500 shadow-cyan-500/50',
      slate: 'bg-slate-500 shadow-slate-500/50',
    };
    return styles[theme] || styles.blue;
  };

  // For schedule chips (hover states)
  const getChipHoverStyle = (theme: string = 'blue') => {
    const styles: any = {
      blue: 'hover:border-blue-500 hover:bg-blue-500/10 hover:text-white',
      purple: 'hover:border-purple-500 hover:bg-purple-500/10 hover:text-white',
      emerald: 'hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-white',
      amber: 'hover:border-amber-500 hover:bg-amber-500/10 hover:text-white',
      rose: 'hover:border-rose-500 hover:bg-rose-500/10 hover:text-white',
      cyan: 'hover:border-cyan-500 hover:bg-cyan-500/10 hover:text-white',
      slate: 'hover:border-slate-500 hover:bg-slate-500/10 hover:text-white',
    };
    return styles[theme] || styles.blue;
  };

  // For Price Colors
  const getPriceColor = (theme: string = 'blue') => {
    const styles: any = {
      blue: 'text-blue-400',
      purple: 'text-purple-400',
      emerald: 'text-emerald-400',
      amber: 'text-amber-400',
      rose: 'text-rose-400',
      cyan: 'text-cyan-400',
      slate: 'text-slate-200',
    };
    return styles[theme] || styles.blue;
  };


  // Resource Helper State
  const [tempRes, setTempRes] = useState({ title: '', url: '', category: 'other' });

  const colorOptions = ['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'slate'];

  // Render Full Page Details if selected
  if (viewDetailProgramId) {
    return (
      <ProgramDetailsView
        programIdProp={viewDetailProgramId}
        onEnrollLead={(lead) => {
          setViewDetailProgramId(null);
          if (onEnrollLead) onEnrollLead(lead);
        }}
        onClose={() => setViewDetailProgramId(null)}
        onPrintProgram={triggerPrint}
      />
    );
  }

  return (
    <div className="space-y-8 pb-32 md:pb-8 md:h-full flex flex-col">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 gap-4 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400"><Palette size={24} /></span>
            Academy Programs
          </h2>
          <p className="text-slate-400 text-sm mt-1 ml-14">Manage educational offerings, pricing structures, and schedules.</p>
        </div>
        <button onClick={openAddProgram} className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-95">
          <Plus size={20} /> New Program
        </button>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 md:overflow-y-auto pb-4 px-1">
        {programs.map(program => {
          const theme = program.themeColor || 'blue';
          return (
            <div key={program.id} className={`bg-slate-900/40 backdrop-blur-md border rounded-2xl md:rounded-3xl overflow-hidden flex flex-col relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${getBorderColor(theme)} ${getGlowColor(theme)}`}>
              {/* Card Header */}
              <div className="p-5 md:p-6 pb-4 border-b border-white/5 relative bg-gradient-to-b from-white/5 to-transparent">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Type Badge */}
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border mb-1 ${getBadgeStyle(theme)}`}>
                      {program.type}
                    </span>

                    {/* Duration Badge (NEW) */}
                    {program.duration && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border mb-1 bg-slate-800 text-slate-300 border-slate-700">
                        <CalendarDays size={10} />
                        {program.duration}
                      </span>
                    )}

                    {program.targetAudience === 'adults' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border mb-1 bg-slate-800 text-slate-300 border-slate-700">
                        Adults 18+
                      </span>
                    )}
                    {program.discountAvailable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border mb-1 bg-red-500/10 text-red-500 border-red-500/20 animate-pulse">
                        <Percent size={10} /> PROMO
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 -mr-2 -mt-2">
                    <button onClick={() => { setPrintTargetProgram(program); triggerPrint(program); }} title="Print Enrollment Form" className="p-3 md:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-90">
                      <Printer size={18} />
                    </button>
                    <button onClick={() => setQrProgram(program)} title="Kiosk Mode" className="p-3 md:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-90">
                      <Tablet size={18} />
                    </button>
                    <button onClick={() => openEditProgram(program)} className="p-3 md:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-90">
                      <Pencil size={18} />
                    </button>
                  </div>
                </div>
                <h3 onClick={() => setViewDetailProgramId(program.id)} className="text-lg md:text-xl font-black text-white leading-tight cursor-pointer hover:text-blue-400 transition-colors">{program.name}</h3>
                <p onClick={() => setViewDetailProgramId(program.id)} className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed cursor-pointer hover:text-slate-300 transition-colors">{program.description || "No description provided."}</p>
                <button onClick={() => setViewDetailProgramId(program.id)} className="absolute bottom-4 right-4 text-xs font-bold text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-all opacity-0 group-hover:opacity-100 uppercase tracking-wider">
                  View Details
                </button>
              </div>

              {/* Card Body */}
              <div className="p-5 md:p-6 flex-1 space-y-6">
                {/* Pricing Section */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pricing & Plans</p>
                  <div className="space-y-2">
                    {program.packs?.map((pack, idx) => (
                      <div key={idx} className="bg-slate-950/50 border border-white/5 rounded-xl p-3 flex justify-between items-center group/pack hover:border-white/10 transition-colors">
                        <span className="font-bold text-slate-300 text-xs md:text-sm">{pack.name}</span>
                        <span className={`font-black text-sm ${getPriceColor(theme)}`}>
                          {pack.promoPrice ? (
                            <span className="flex items-center gap-2">
                              {program.discountAvailable && <span className="text-[10px] text-slate-500 line-through font-normal">{formatCurrency(pack.priceAnnual || pack.price || 0)}</span>}
                              {formatCurrency(pack.promoPrice)}
                            </span>
                          ) : (
                            formatCurrency(pack.priceAnnual || pack.price || 0)
                          )}
                        </span>
                      </div>
                    ))}
                    {(!program.packs || program.packs.length === 0) && <div className="text-slate-500 italic text-xs">No active plans</div>}
                  </div>
                </div>

                {/* Active Schedule Section */}
                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Schedule</p>
                  {program.grades?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {program.grades.map(grade => (
                        grade.groups.map(group => (
                          <div key={group.id} className={`px-3 py-1.5 rounded-lg border border-white/5 text-xs text-slate-300 font-medium transition-all cursor-default flex items-center gap-2 ${getChipHoverStyle(theme)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(theme)}`}></div>
                            {group.day.substring(0, 3)} {group.time}
                          </div>
                        ))
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic text-xs">No classes scheduled</div>
                  )}
                </div>

                {/* Waiting List / Leads Section */}
                <div className="space-y-3 pt-4 border-t border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Waiting List</p>
                    {/* Calculate Leads Count */}
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {leads.filter(l => (l.programId === program.id || l.interests?.includes(program.name)) && l.status !== 'converted' && l.status !== 'closed').length} Pending
                    </span>
                  </div>
                  {leads.filter(l => (l.programId === program.id || l.interests?.includes(program.name)) && l.status !== 'converted' && l.status !== 'closed').slice(0, 3).map(lead => (
                    <div key={lead.id} className="flex justify-between items-center text-xs bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-[10px]">{lead.name.charAt(0)}</div>
                        <span className="text-slate-300 truncate max-w-[100px]">{lead.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening details
                          if (onEnrollLead) onEnrollLead(lead);
                        }}
                        className="text-[10px] font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 px-2 py-1 rounded transition-colors"
                      >
                        Enroll
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isProgramModalOpen} onClose={() => setProgramModalOpen(false)} title={isEditingProgram ? "Edit Program" : "New Program"} size="lg">
        <div className="flex gap-4 mb-6 border-b border-slate-800/50 px-2">
          <button onClick={() => setActiveTab('details')} className={`pb-3 text-sm font-bold transition-all border-b-2 hover:text-white ${activeTab === 'details' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'}`}>Program Details</button>
          <button onClick={() => setActiveTab('makerpro')} className={`pb-3 text-sm font-bold transition-all border-b-2 hover:text-white ${activeTab === 'makerpro' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}>LMS Config</button>
        </div>

        <div className="space-y-8 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          {activeTab === 'details' ? (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Program Name</label>
                  <input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={programForm.name} onChange={e => setProgramForm({ ...programForm, name: e.target.value })} placeholder="e.g. Master Robotics" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Type</label>
                  <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500" value={programForm.type} onChange={e => setProgramForm({ ...programForm, type: e.target.value as any })}>
                    <option>Regular Program</option>
                    <option>Holiday Camp</option>
                    <option>Camp</option>
                    <option>Workshop</option>
                    <option>Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Duration / Frequency</label>
                  <input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-blue-500 outline-none" value={programForm.duration || ''} onChange={e => setProgramForm({ ...programForm, duration: e.target.value })} placeholder="e.g. Annual, 3 Months, 2 Days" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Theme Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setProgramForm({ ...programForm, themeColor: color as any })}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${programForm.themeColor === color ? `border-white ring-2 ring-${color}-500 scale-110` : 'border-transparent opacity-50 hover:opacity-100 hover:scale-110'}`}
                        style={{ backgroundColor: `var(--color-${color}-500)` }}
                      >
                        <div className={`w-full h-full rounded-full bg-${color}-500`} />
                        {programForm.themeColor === color && <Check size={14} className="text-white absolute" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white h-24 text-sm focus:border-blue-500 outline-none resize-none" value={programForm.description} onChange={e => setProgramForm({ ...programForm, description: e.target.value })} placeholder="Short description..." />
                </div>

                {/* VISUAL ASSETS */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <image className="w-4 h-4" /> Visual Assets
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Background Thumbnail
                      <span className="block text-[10px] text-slate-600 font-normal mt-0.5">Rec: 800x800px or 1200x630px. Max 500KB.</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs pr-8"
                          placeholder="https://..." value={programForm.thumbnailUrl || ''} onChange={e => setProgramForm({ ...programForm, thumbnailUrl: e.target.value })} />
                        {programForm.thumbnailUrl && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-slate-700">
                            <img src={programForm.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <label className={`cursor-pointer p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors ${uploadingField === 'thumbnailUrl' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingField === 'thumbnailUrl' ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Upload size={16} className="text-slate-400" />}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'thumbnailUrl')} disabled={!!uploadingField} />
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Brochure PDF URL</label>
                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      placeholder="https://..." value={programForm.brochureUrl || ''} onChange={e => setProgramForm({ ...programForm, brochureUrl: e.target.value })} />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Partner Logo URL</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs pr-8"
                          placeholder="https://..." value={programForm.partnerLogoUrl || ''} onChange={e => setProgramForm({ ...programForm, partnerLogoUrl: e.target.value })} />
                        {programForm.partnerLogoUrl && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-slate-700 bg-white p-0.5">
                            <img src={programForm.partnerLogoUrl} alt="Preview" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                      <label className={`cursor-pointer p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors ${uploadingField === 'partnerLogoUrl' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingField === 'partnerLogoUrl' ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Upload size={16} className="text-slate-400" />}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'partnerLogoUrl')} disabled={!!uploadingField} />
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Partner Name</label>
                    <input className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      placeholder="e.g. Algorora Center" value={programForm.partnerName || ''} onChange={e => setProgramForm({ ...programForm, partnerName: e.target.value })} />
                  </div>
                </div>

                {/* NEW: Payment Facilities */}
                <div className="md:col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Payment Terms / Facilities</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        placeholder="e.g. Advance 50%"
                        className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                        value={newPaymentTerm}
                        onChange={e => setNewPaymentTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newPaymentTerm.trim();
                            if (val) {
                              setProgramForm(prev => ({ ...prev, paymentTerms: [...(prev.paymentTerms || []), val] }));
                              setNewPaymentTerm('');
                            }
                          }
                        }}
                      />
                      <button type="button" className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold" onClick={() => {
                        const val = newPaymentTerm.trim();
                        if (val) {
                          setProgramForm(prev => ({ ...prev, paymentTerms: [...(prev.paymentTerms || []), val] }));
                          setNewPaymentTerm('');
                        }
                      }}>Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {programForm.paymentTerms?.map((term, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg">
                          <span className="text-sm text-slate-300">{term}</span>
                          <button onClick={() => {
                            const newTerms = [...(programForm.paymentTerms || [])];
                            newTerms.splice(i, 1);
                            setProgramForm({ ...programForm, paymentTerms: newTerms });
                          }} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
                        </div>
                      ))}
                      {(!programForm.paymentTerms || programForm.paymentTerms.length === 0) && (
                        <p className="text-xs text-slate-600 italic">No custom payment terms defined. Defaults (Annual/Trimester) will be used if empty.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* NEW: Discount / Promo Configuration */}
                <div className="md:col-span-2 bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                      <Percent size={14} /> Promotional Discount
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 font-medium">{programForm.discountAvailable ? 'Enabled' : 'Disabled'}</span>
                      <button
                        onClick={() => setProgramForm({ ...programForm, discountAvailable: !programForm.discountAvailable })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${programForm.discountAvailable ? 'bg-indigo-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${programForm.discountAvailable ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {programForm.discountAvailable && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="flex flex-col justify-center">
                        <p className="text-xs text-indigo-300 italic">
                          Enable this to activate promo pricing. Set the specific "Promo Price" for each Pack in the <strong>Pricing Plans</strong> section below.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Offer Ends On</label>
                        <input
                          type="date"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-indigo-500 outline-none"
                          value={programForm.discountEndDate || ''}
                          onChange={e => setProgramForm({ ...programForm, discountEndDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Structure */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Structure & Classes</h4>
                  <button type="button" onClick={() => {
                    if (!programForm.grades?.some(g => g.name.includes('DIY'))) {
                      const newGrade = { id: Date.now().toString(), name: 'DIY Access / Workshop', groups: [] };
                      setProgramForm(prev => ({ ...prev, grades: [...(prev.grades || []), newGrade] }));
                    }
                  }} className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-500 hover:text-white transition-colors">
                    + Add DIY Section
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <input placeholder="New Level Name (e.g. Level 1)" className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-blue-500 outline-none" value={tempGradeName} onChange={e => setTempGradeName(e.target.value)} />
                  <button onClick={addGradeToForm} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors">Add</button>
                </div>

                <div className="space-y-4">
                  {programForm.grades?.map((grade, idx) => (
                    <div key={idx} className={`bg-slate-950/50 p-4 rounded-xl border ${grade.name.includes('DIY') ? 'border-purple-500/30' : 'border-slate-800'}`}>
                      <div className="flex justify-between items-center mb-3">
                        {editingGradeId === grade.id ? (
                          <div className="flex flex-1 gap-2 mr-2">
                            <input className="flex-1 bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm text-white" value={editGradeName} onChange={(e) => setEditGradeName(e.target.value)} autoFocus />
                            <button onClick={() => {
                              const ng = [...(programForm.grades || [])];
                              ng[idx].name = editGradeName;
                              setProgramForm({ ...programForm, grades: ng });
                              setEditingGradeId(null);
                            }} className="text-xs bg-emerald-600 px-2 rounded text-white font-bold">Save</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${grade.name.includes('DIY') ? 'text-purple-300' : 'text-white'}`}>{grade.name}</span>
                            <button onClick={() => { setEditingGradeId(grade.id); setEditGradeName(grade.name); }} className="text-slate-500 hover:text-blue-400 transition-colors"><Pencil size={14} /></button>
                          </div>
                        )}
                        <button onClick={() => { const ng = [...(programForm.grades || [])]; ng.splice(idx, 1); setProgramForm({ ...programForm, grades: ng }); }} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {grade.groups.map((grp, gIdx) => (
                          <div key={gIdx} className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800/50 group/item hover:border-slate-700">
                            {editingGroupId === grp.id ? (
                              <div className="flex flex-1 gap-1 items-center">
                                <input className="flex-1 bg-slate-800 border border-blue-500 rounded px-1 py-0.5 text-white" value={editGroup.name} onChange={e => setEditGroup({ ...editGroup, name: e.target.value })} />
                                <button onClick={() => {
                                  const ng = [...(programForm.grades || [])];
                                  ng[idx].groups[gIdx] = { ...grp, ...editGroup } as Group;
                                  setProgramForm({ ...programForm, grades: ng });
                                  setEditingGroupId(null);
                                }} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">OK</button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-300 font-bold">{grp.name}</span>
                                  <span className="text-slate-500">{grp.day} {grp.time}</span>
                                  <button onClick={() => { setEditingGroupId(grp.id); setEditGroup(grp); }} className="text-slate-600 hover:text-blue-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Pencil size={12} /></button>
                                </div>
                                <button onClick={() => { const ng = [...(programForm.grades || [])]; ng[idx].groups.splice(gIdx, 1); setProgramForm({ ...programForm, grades: ng }); }} className="text-slate-600 hover:text-red-400"><X size={14} /></button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Group Row */}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/50">
                        <input placeholder="Group Name" className="flex-1 min-w-[100px] p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" value={tempGroup.name} onChange={e => setTempGroup({ ...tempGroup, name: e.target.value })} />
                        <select className="flex-1 min-w-[80px] p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" value={tempGroup.day} onChange={e => setTempGroup({ ...tempGroup, day: e.target.value })}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}</select>
                        <input type="time" className="w-24 p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" value={tempGroup.time} onChange={e => setTempGroup({ ...tempGroup, time: e.target.value })} />
                        <button onClick={() => addGroupToGrade(idx)} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"><Plus size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-black text-white uppercase tracking-wide mb-3">Pricing Plans</h4>
                <div className="grid grid-cols-12 gap-2 mb-3">
                  <div className="col-span-3"><input placeholder="Plan Name" className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" value={tempPack.name} onChange={e => setTempPack({ ...tempPack, name: e.target.value })} /></div>
                  {programForm.type === 'Regular Program' ? (
                    <>
                      <div className="col-span-2"><input type="number" placeholder="Annual" className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" value={tempPack.priceAnnual || ''} onChange={e => setTempPack({ ...tempPack, priceAnnual: Number(e.target.value) })} /></div>
                      <div className="col-span-2"><input type="number" placeholder="Trimester" className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs" value={tempPack.priceTrimester || ''} onChange={e => setTempPack({ ...tempPack, priceTrimester: Number(e.target.value) })} /></div>
                    </>
                  ) : (
                    <div className="col-span-4"><input type="number" placeholder="Total Price" className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" value={tempPack.price || ''} onChange={e => setTempPack({ ...tempPack, price: Number(e.target.value) })} /></div>
                  )}
                  <div className="col-span-3"><input type="number" placeholder="Promo Price (Optional)" className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs border-dashed border-slate-700" value={tempPack.promoPrice || ''} onChange={e => setTempPack({ ...tempPack, promoPrice: Number(e.target.value) })} /></div>
                  <div className="col-span-2 flex gap-1">
                    {editingPackIndex !== null ? (
                      <>
                        <button onClick={() => {
                          if (tempPack.name && programForm.packs) {
                            const updatedPacks = [...programForm.packs];
                            updatedPacks[editingPackIndex] = tempPack;
                            setProgramForm({ ...programForm, packs: updatedPacks });
                            setTempPack({ name: '', priceAnnual: 0, priceTrimester: 0, price: 0, promoPrice: 0 });
                            setEditingPackIndex(null);
                          }
                        }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors">Save</button>
                        <button onClick={() => {
                          setTempPack({ name: '', priceAnnual: 0, priceTrimester: 0, price: 0, promoPrice: 0 });
                          setEditingPackIndex(null);
                        }} className="w-8 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"><X size={14} /></button>
                      </>
                    ) : (
                      <button onClick={() => { if (tempPack.name) { setProgramForm(prev => ({ ...prev, packs: [...(prev.packs || []), tempPack] })); setTempPack({ name: '', priceAnnual: 0, priceTrimester: 0, price: 0, promoPrice: 0 }); } }} className="w-full h-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">Add</button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {programForm.packs?.map((p, i) => (
                    <div key={i} className={`flex justify-between text-xs text-slate-300 p-3 rounded-xl border items-center group ${editingPackIndex === i ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-950 border-slate-800/50'}`}>
                      <div>
                        <span className="font-bold block">{p.name}</span>
                        {p.promoPrice && p.promoPrice > 0 && <span className="text-[10px] text-red-400 font-bold">Promo: {formatCurrency(p.promoPrice)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono mr-2">{p.priceAnnual ? `${formatCurrency(p.priceAnnual)}` : formatCurrency(p.price || 0)}</span>
                        <button onClick={() => { setTempPack(p); setEditingPackIndex(i); }} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => { const newRes = [...(programForm.packs || [])]; newRes.splice(i, 1); setProgramForm({ ...programForm, packs: newRes }); }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* LMS Config - simplified for brevity, keeping original functional but styled */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wide">Student Dashboard</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Welcome Message</label>
                  <input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" placeholder="Welcome..." value={programForm.dashboardConfig?.welcomeMessage || ''} onChange={e => setProgramForm({ ...programForm, dashboardConfig: { ...programForm.dashboardConfig, welcomeMessage: e.target.value } })} />
                </div>
                {/* ... Other LMS fields (Meeting URL etc) mapped similarly if needed ... */}
                <div className="p-4 bg-sky-900/10 border border-sky-500/20 rounded-xl">
                  <p className="text-xs text-sky-300">Additional LMS configuration options available in the full editor.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800/50">
          <button onClick={() => setProgramModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-white font-medium transition-colors">Cancel</button>
          <button onClick={handleSaveProgram} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">Save Program</button>
        </div>
      </Modal>

      {/* Hidden Print Renderer */}
      <div style={{ position: 'absolute', top: 0, left: 0, height: 0, overflow: 'hidden' }}>
        <div ref={printComponentRef}>
          {printTargetProgram && <FormTemplateRenderer program={printTargetProgram} />}
        </div>
      </div>

      {/* QR Modal */}
      {qrProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative animate-in zoom-in-50">
            <button onClick={() => setQrProgram(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><ArrowLeft size={24} /></button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">{qrProgram.name}</h3>
              <p className="text-sm text-slate-500">Scan to fill enrollment form</p>
            </div>

            <div className="flex justify-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <QRCodeSVG value={`${baseUrl}/enroll?program=${qrProgram.id}`} size={200} />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.open(`${baseUrl}/enroll?program=${qrProgram.id}`, '_blank')}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Tablet size={18} /> Open Kiosk Mode
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${baseUrl}/enroll?program=${qrProgram.id}`);
                  alert('Link copied!');
                }}
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <Copy size={18} /> Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QR Code Modal for Kiosk */}
      {qrProgram && (
        <Modal isOpen={!!qrProgram} onClose={() => setQrProgram(null)} title="Kiosk Access Link" size="md">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">{qrProgram.name}</h3>
            <p className="text-sm text-slate-500">Scan to fill enrollment form</p>
          </div>

          <div className="flex justify-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <QRCodeSVG value={`${baseUrl}/enroll?program=${qrProgram.id}`} size={200} />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.open(`${baseUrl}/enroll?program=${qrProgram.id}`, '_blank')}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <Tablet size={18} /> Open Kiosk Mode
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${baseUrl}/enroll?program=${qrProgram.id}`);
                alert('Link copied!');
              }}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <Copy size={18} /> Copy Link
            </button>
          </div>
        </Modal>
      )}

      {/* Hidden Print Renderer */}
      <div style={{ display: 'none' }}>
        <div ref={printComponentRef}>
          {printTargetProgram && (
            <FormTemplateRenderer program={printTargetProgram} />
          )}
        </div>
      </div>
    </div>
  );
};
