import React, { useState } from 'react';
import { Plus, Pencil, Clock, Trash2, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../utils/helpers';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Program, ProgramPack, Grade, Group } from '../types';

export const ProgramsView = () => {
    const { programs, navigateTo } = useAppContext();
    const [isProgramModalOpen, setProgramModalOpen] = useState(false);
    const [isEditingProgram, setIsEditingProgram] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    
    const initialProgramForm: Partial<Program> = { name: '', type: 'Regular Program', description: '', status: 'active', packs: [], grades: [] };
    const [programForm, setProgramForm] = useState<Partial<Program>>(initialProgramForm);
    const [tempPack, setTempPack] = useState<ProgramPack>({ name: '', workshopsPerWeek: 1, priceAnnual: 0, priceTrimester: 0, price: 0 });
    const [tempGradeName, setTempGradeName] = useState('');
    const [tempGroup, setTempGroup] = useState<Group>({ id: '', name: '', day: 'Monday', time: '10:00' });

    const openAddProgram = () => {
        setProgramForm(initialProgramForm);
        setIsEditingProgram(false);
        setProgramModalOpen(true);
    };

    const openEditProgram = (program: Program) => {
        setProgramForm(program);
        setSelectedProgram(program);
        setIsEditingProgram(true);
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

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
            <div><h2 className="text-xl font-bold text-white">Academy Programs</h2><p className="text-slate-500 text-sm">Manage educational offerings, pricing and structure</p></div>
            <button onClick={openAddProgram} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center"><Plus size={18} />Add Program</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-4">
            {programs.map(program => (
              <div key={program.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative group">
                <div className="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditProgram(program)} className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:text-white hover:bg-slate-700"><Pencil size={16} /></button>
                </div>
                <div className="p-5 border-b border-slate-800 bg-slate-950/30">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border mb-2 ${program.type === 'Regular Program' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : program.type === 'Holiday Camp' ? 'bg-amber-900/30 text-amber-400 border-amber-900/50' : 'bg-purple-900/30 text-purple-400 border-purple-900/50'}`}>{program.type}</span>
                  <h3 className="text-lg font-bold text-white">{program.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{program.description || "No description."}</p>
                </div>
                <div className="p-5 flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pricing</p>
                    <div className="space-y-2">
                      {program.packs?.map((pack, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded p-2 text-xs flex justify-between items-center"><span className="font-medium text-slate-300">{pack.name}</span><span className="text-emerald-400">{program.type === 'Regular Program' ? formatCurrency(pack.priceAnnual || 0) : formatCurrency(pack.price || 0)}</span></div>
                      ))}
                    </div>
                  </div>
                  {program.grades && program.grades.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Schedule</p>
                      <div className="space-y-2">
                        {program.grades.map(g => (
                          <div key={g.id} className="bg-slate-800/30 rounded p-2 border border-slate-800/50">
                             <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{g.name}</div>
                             <div className="flex flex-wrap gap-1.5 pl-3">
                                 {g.groups?.map(grp => (
                                   <button key={grp.id} onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: g.id, grpId: grp.id }})} className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"><Clock size={10} /> {grp.name}: {grp.day.slice(0,3)} {grp.time}</button>
                                 ))}
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <Modal isOpen={isProgramModalOpen} onClose={() => setProgramModalOpen(false)} title={isEditingProgram ? "Edit Program" : "New Program"} size="lg">
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Program Name</label><input className="w-full p-3 md:p-2 bg-slate-950 border border-slate-800 rounded-lg text-white" value={programForm.name} onChange={e => setProgramForm({...programForm, name: e.target.value})} /></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Type</label><select className="w-full p-3 md:p-2 bg-slate-950 border border-slate-800 rounded-lg text-white" value={programForm.type} onChange={e => setProgramForm({...programForm, type: e.target.value as any})}><option>Regular Program</option><option>Holiday Camp</option><option>Workshop</option></select></div>
                 </div>
                 <div><label className="block text-xs font-medium text-slate-400 mb-1">Description</label><textarea className="w-full p-3 md:p-2 bg-slate-950 border border-slate-800 rounded-lg text-white h-20" value={programForm.description} onChange={e => setProgramForm({...programForm, description: e.target.value})} /></div>
                 
                 <div className="bg-slate-950 p-4 rounded border border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                       <h4 className="text-sm font-bold text-white">Structure & Classes</h4>
                       <button type="button" onClick={() => {
                            const hasDIY = programForm.grades?.some(g => g.name.includes('DIY'));
                            if(!hasDIY) {
                                const newGrade = { id: Date.now().toString(), name: 'DIY Access / Workshop', groups: [] };
                                setProgramForm(prev => ({ ...prev, grades: [...(prev.grades || []), newGrade] }));
                            }
                       }} className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-500 flex items-center gap-1 shadow-lg shadow-purple-900/20">
                           <Plus size={12}/> Add DIY Section
                       </button>
                    </div>
                    <div className="flex gap-2 mb-4"><input placeholder="New Level Name (e.g. Level 1)" className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded text-white text-sm" value={tempGradeName} onChange={e => setTempGradeName(e.target.value)} /><button onClick={addGradeToForm} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm">Add Level</button></div>
                    <div className="space-y-3">
                       {programForm.grades?.map((grade, idx) => (
                          <div key={idx} className={`bg-slate-900 p-3 rounded border ${grade.name.includes('DIY') ? 'border-purple-900/50 bg-purple-900/10' : 'border-slate-800'}`}>
                             <div className="flex justify-between items-center mb-2"><span className={`font-bold text-sm ${grade.name.includes('DIY') ? 'text-purple-300' : 'text-white'}`}>{grade.name}</span><button onClick={() => { const ng = [...(programForm.grades||[])]; ng.splice(idx,1); setProgramForm({...programForm, grades: ng}); }} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button></div>
                             <div className="pl-2 border-l-2 border-slate-800 space-y-2">
                                {grade.groups.map((grp, gIdx) => (
                                   <div key={gIdx} className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded"><span className="text-slate-300">{grp.name} ({grp.day} {grp.time})</span><button onClick={() => { const ng = [...(programForm.grades||[])]; ng[idx].groups.splice(gIdx,1); setProgramForm({...programForm, grades: ng}); }} className="text-slate-500 hover:text-white"><X size={12}/></button></div>
                                ))}
                                <div className="flex flex-wrap gap-2 mt-2"><input placeholder="Group Name" className="flex-1 p-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" value={tempGroup.name} onChange={e => setTempGroup({...tempGroup, name: e.target.value})} /><select className="flex-1 p-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" value={tempGroup.day} onChange={e => setTempGroup({...tempGroup, day: e.target.value})}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d} value={d}>{d}</option>)}</select><input type="time" className="flex-1 p-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" value={tempGroup.time} onChange={e => setTempGroup({...tempGroup, time: e.target.value})} /><button onClick={() => addGroupToGrade(idx)} className="p-1 bg-blue-600 text-white rounded"><Plus size={14}/></button></div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-slate-950 p-4 rounded border border-slate-800">
                    <h4 className="text-sm font-bold text-white mb-3">Pricing Packs</h4>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                       <input placeholder="Pack Name" className="p-2 bg-slate-900 border border-slate-800 rounded text-white text-xs" value={tempPack.name} onChange={e => setTempPack({...tempPack, name: e.target.value})} />
                       {programForm.type === 'Regular Program' ? <><input type="number" placeholder="Annual" className="p-2 bg-slate-900 border border-slate-800 rounded text-white text-xs" value={tempPack.priceAnnual || ''} onChange={e => setTempPack({...tempPack, priceAnnual: Number(e.target.value)})} /><input type="number" placeholder="Trimester" className="p-2 bg-slate-900 border border-slate-800 rounded text-white text-xs" value={tempPack.priceTrimester || ''} onChange={e => setTempPack({...tempPack, priceTrimester: Number(e.target.value)})} /></> : <input type="number" placeholder="Price" className="p-2 bg-slate-900 border border-slate-800 rounded text-white text-xs" value={tempPack.price || ''} onChange={e => setTempPack({...tempPack, price: Number(e.target.value)})} />}
                    </div>
                    <button onClick={() => { if(tempPack.name) { setProgramForm(prev => ({...prev, packs: [...(prev.packs||[]), tempPack]})); setTempPack({name:'', priceAnnual:0, priceTrimester:0, price:0}); } }} className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded mb-3">Add Pack</button>
                    <div className="space-y-1">
                       {programForm.packs?.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800"><span>{p.name}</span><span>{p.priceAnnual ? `${p.priceAnnual} / ${p.priceTrimester}` : p.price} MAD</span></div>
                       ))}
                    </div>
                 </div>

                 <div className="flex justify-end gap-3 pb-safe-bottom"><button onClick={() => setProgramModalOpen(false)} className="px-4 py-3 md:py-2 text-slate-400 hover:text-white">Cancel</button><button onClick={handleSaveProgram} className="px-6 py-3 md:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Save Program</button></div>
              </div>
          </Modal>
        </div>
    );
};
