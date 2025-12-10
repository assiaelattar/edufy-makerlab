import React, { useState } from 'react';
import { School, Clock, Users, ArrowLeft, Mail, Printer, UserPlus, Eye, ArrowRightLeft, Phone, Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { calculateAge, formatCurrency, generateRosterPrint } from '../utils/helpers';
import { Student, Enrollment } from '../types';

export const ClassesView = () => {
    const { programs, enrollments, students, viewParams, navigateTo, settings } = useAppContext();
    const { classId } = viewParams;
    const [quickGroupModal, setQuickGroupModal] = useState(false);

    if (classId) {
      // Detail View: Class Roster
      const program = programs.find(p => p.id === classId.pId);
      const grade = program?.grades?.find(g => g.id === classId.gId);
      const group = grade?.groups?.find(g => g.id === classId.grpId);
      if (!program || !grade || !group) return <div>Class not found</div>;
      
      const enrolledStudents = enrollments
        .filter(e => 
            e.programId === program.id && 
            (
                (e.groupId === group.id || (e.gradeName === grade.name && e.groupName === group.name)) ||
                (e.secondGroupId === group.id)
            )
        )
        .map(e => { const s = students.find(s => s.id === e.studentId); return s ? { ...s, enrollment: e } : null; })
        .filter(s => s !== null) as (Student & { enrollment: Enrollment })[];
      
      const emails = enrolledStudents.map(s => s.email).filter(Boolean).join(',');

      return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><School size={120} className="text-blue-500"/></div>
              <button onClick={() => navigateTo('classes', {})} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"><ArrowLeft size={16}/> Back to All Classes</button>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
                <div>
                   <h1 className="text-2xl font-bold text-white">{program.name}</h1>
                   <div className="flex flex-wrap gap-3 mt-2 text-sm font-medium">
                      <span className="text-blue-400 bg-blue-950/30 px-3 py-1 rounded-full border border-blue-900">{grade.name}</span>
                      <span className="text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-900 flex items-center gap-1"><Clock size={14}/> {group.day} {group.time}</span>
                   </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                   <button onClick={() => { navigator.clipboard.writeText(emails); alert('Emails copied to clipboard'); }} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"><Mail size={18}/> Copy Emails</button>
                   <button onClick={() => generateRosterPrint(program.name, grade.name, group.name, `${group.day} ${group.time}`, enrolledStudents, settings.academyName)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20"><Printer size={18}/> Print Roster</button>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                 <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2"><Users size={18} className="text-slate-400"/> Enrolled Students ({enrolledStudents.length})</h3>
                 </div>
                 
                 <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-950 text-slate-400 font-semibold">
                          <tr><th className="p-4">Student</th><th className="p-4">Age</th><th className="p-4">Parent Contact</th><th className="p-4 text-right">Status</th><th className="p-4 w-24 text-right">Actions</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800">
                          {enrolledStudents.map(item => (
                            <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                               <td className="p-4">
                                   <div className="font-medium text-white">{item.name}</div>
                                   <div className="text-xs text-slate-500">{item.school}</div>
                                   {item.enrollment.secondGroupId === group.id && <span className="text-[10px] uppercase bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/50 mt-1 inline-block">DIY / Secondary</span>}
                               </td>
                               <td className="p-4 text-slate-400">{calculateAge(item.birthDate) || '-'}</td>
                               <td className="p-4"><div className="text-slate-300">{item.parentName}</div><div className="text-xs text-blue-400 flex items-center gap-1"><Phone size={10}/> {item.parentPhone}</div></td>
                               <td className="p-4 text-right">{item.enrollment.balance > 0 ? <span className="text-amber-400 text-xs font-bold bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">Due: {formatCurrency(item.enrollment.balance)}</span> : <span className="text-emerald-400 text-xs font-bold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">Paid</span>}</td>
                               <td className="p-4 text-right">
                                   <div className="flex justify-end gap-1">
                                      <button onClick={() => navigateTo('student-details', { studentId: item.id })} className="text-slate-500 hover:text-blue-400 p-1.5 rounded hover:bg-slate-800 transition-colors" title="View Profile"><Eye size={16}/></button>
                                   </div>
                               </td>
                            </tr>
                          ))}
                          {enrolledStudents.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">No students enrolled in this group yet.</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>
              <div className="space-y-4 hidden md:block">
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Class Summary</h3>
                    <div className="space-y-3">
                       <div className="flex justify-between text-sm"><span className="text-slate-400">Enrolled</span><span className="text-white font-medium">{enrolledStudents.length}</span></div>
                       <div className="h-px bg-slate-800 my-2"></div>
                       <div className="flex justify-between text-sm"><span className="text-slate-400">Total Due</span><span className="text-amber-400 font-medium">{formatCurrency(enrolledStudents.reduce((s, i) => s + i.enrollment.balance, 0))}</span></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">
         <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold text-white">Classes & Groups</h2>
            <p className="text-slate-500 text-sm">Overview of all active classes and student distribution.</p>
         </div>
         <div className="space-y-8">
            {programs.filter(p => p.grades && p.grades.length > 0).map(program => (
               <div key={program.id}>
                  <h3 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2"><div className="w-2 h-6 bg-blue-600 rounded-full"></div> {program.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                     {program.grades.flatMap(grade => 
                        (
                          <div key={grade.id} className="contents">
                             {grade.groups.map(group => {
                                const count = enrollments.filter(e => 
                                    e.programId === program.id && 
                                    (
                                        (e.groupId === group.id || (e.gradeName === grade.name && e.groupName === group.name)) ||
                                        (e.secondGroupId === group.id)
                                    )
                                ).length;

                                return (
                                  <div key={group.id} onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: group.id }})} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer transition-all group relative overflow-hidden active:scale-95 duration-100">
                                      <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div><h4 className="font-bold text-white text-lg">{grade.name}</h4><p className="text-blue-400 text-sm font-medium">{group.name}</p></div>
                                        <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-300">{group.day.slice(0,3)} {group.time}</div>
                                      </div>
                                      <div className="mt-4 flex items-center justify-between relative z-10">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(3, count))].map((_, i) => <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border border-slate-900"></div>)}
                                            {count > 3 && <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[8px] text-white">+{count-3}</div>}
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium">{count} Students</span>
                                      </div>
                                      <div className="absolute -bottom-4 -right-4 text-slate-800 opacity-20 group-hover:opacity-30 transition-opacity rotate-12"><School size={80}/></div>
                                  </div>
                                );
                             })}
                          </div>
                        )
                     )}
                  </div>
               </div>
            ))}
         </div>
      </div>
    );
};
