import React, { useState } from 'react';
import { School, Clock, Users, ArrowLeft, Mail, Printer, Eye, Phone, Search, ChevronRight, Calendar, Sparkles, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { calculateAge, formatCurrency, generateRosterPrint } from '../utils/helpers';
import { Student, Enrollment } from '../types';

export const ClassesView = () => {
   const { programs, enrollments, students, viewParams, navigateTo, settings } = useAppContext();
   const { classId } = viewParams;

   // State for main view
   const [activeProgramId, setActiveProgramId] = useState<string>('all');
   const [searchQuery, setSearchQuery] = useState('');

   // --- DETAIL VIEW ---
   // --- DETAIL VIEW ---
   if (classId) {
      const program = programs.find(p => p.id === classId.pId);
      const grade = program?.grades?.find(g => g.id === classId.gId);
      const group = grade?.groups?.find(g => g.id === classId.grpId);

      if (!program || !grade || !group) return <div className="p-8 text-center text-slate-400">Class not found</div>;

      const enrolledStudents = enrollments
         .filter(e =>
            e.programId === program.id &&
            ((e.groupId === group.id || (e.gradeName === grade.name && e.groupName === group.name)) || (e.secondGroupId === group.id))
         )
         .map(e => { const s = students.find(s => s.id === e.studentId); return s ? { ...s, enrollment: e } : null; })
         .filter(s => s !== null) as (Student & { enrollment: Enrollment })[];

      const emails = enrolledStudents.map(s => s.email).filter(Boolean).join(',');
      const totalDue = enrolledStudents.reduce((acc, curr) => acc + curr.enrollment.balance, 0);

      return (
         <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Header Card */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110 origin-top-right">
                  <School size={180} className="text-indigo-500" />
               </div>

               <button onClick={() => navigateTo('classes', {})} className="relative z-10 flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors font-medium text-sm group/btn">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center group-hover/btn:bg-slate-700 transition-colors">
                     <ArrowLeft size={14} />
                  </div>
                  Back to Classes
               </button>

               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div>
                     <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">{program.name}</span>
                        <ChevronRight size={14} className="text-slate-600" />
                        <span className="text-slate-400 text-sm font-medium">{grade.name}</span>
                     </div>
                     <h1 className="text-3xl font-bold text-white tracking-tight">{group.name}</h1>
                     <div className="flex flex-wrap gap-4 mt-4 text-sm font-medium text-slate-400">
                        <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                           <Clock size={16} className="text-indigo-400" /> {group.day} • {group.time}
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                           <Users size={16} className="text-emerald-400" /> {enrolledStudents.length} Students
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button onClick={() => { navigator.clipboard.writeText(emails); alert('Emails copied!'); }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-all shadow-lg text-sm font-medium">
                        <Mail size={18} /> Copy Emails
                     </button>
                     <button onClick={() => generateRosterPrint(program.name, grade.name, group.name, `${group.day} ${group.time}`, enrolledStudents, settings.academyName)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/30 text-sm font-medium hover:translate-y-[-1px]">
                        <Printer size={18} /> Print Roster
                     </button>
                  </div>
               </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between">
                  <div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                     <p className="text-xl font-bold text-white mt-1">Calculated elsewhere</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Sparkles size={20} /></div>
               </div>
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between">
                  <div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Outstanding</p>
                     <p className="text-xl font-bold text-amber-400 mt-1">{formatCurrency(totalDue)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock size={20} /></div>
               </div>
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between">
                  <div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Students</p>
                     <p className="text-xl font-bold text-indigo-400 mt-1">{enrolledStudents.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Users size={20} /></div>
               </div>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden flex-1">
               <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     Class Roster
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">Sorted by Name</div>
               </div>

               <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-950/50 text-slate-400 font-semibold sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                        <tr>
                           <th className="p-4 pl-6">Student</th>
                           <th className="p-4">Age</th>
                           <th className="p-4">Parent Contact</th>
                           <th className="p-4 text-right">Status</th>
                           <th className="p-4 w-24 text-center">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {enrolledStudents.map(item => (
                           <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                              <td className="p-4 pl-6">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                                       {item.name.charAt(0)}
                                    </div>
                                    <div>
                                       <div className="font-bold text-white">{item.name}</div>
                                       <div className="text-xs text-slate-500">{item.school || 'No School Listed'}</div>
                                       {item.enrollment.secondGroupId === group.id && <span className="text-[10px] uppercase bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 mt-1 inline-block font-semibold">Secondary</span>}
                                    </div>
                                 </div>
                              </td>
                              <td className="p-4 text-slate-400 font-medium">{calculateAge(item.birthDate)} <span className="text-xs text-slate-500 font-normal">yrs</span></td>
                              <td className="p-4">
                                 <div className="text-slate-300 font-medium">{item.parentName}</div>
                                 <div className="text-xs text-indigo-400 flex items-center gap-1 font-medium mt-0.5"><Phone size={10} /> {item.parentPhone}</div>
                              </td>
                              <td className="p-4 text-right">
                                 {item.enrollment.balance > 0 ?
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                       Due: {formatCurrency(item.enrollment.balance)}
                                    </span>
                                    :
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                       Paid
                                    </span>
                                 }
                              </td>
                              <td className="p-4 text-center">
                                 <button
                                    onClick={(e) => { e.stopPropagation(); navigateTo('student-details', { studentId: item.id }); }}
                                    className="text-slate-500 hover:text-blue-400 p-2 rounded-lg hover:bg-slate-800 transition-all transform hover:scale-110"
                                    title="View Profile"
                                 >
                                    <Eye size={18} />
                                 </button>
                              </td>
                           </tr>
                        ))}
                        {enrolledStudents.length === 0 && (
                           <tr>
                              <td colSpan={5} className="p-12 text-center text-slate-500">
                                 <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><Users size={24} className="text-slate-600" /></div>
                                    <p>No students enrolled in this group yet.</p>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      );
   }

   // --- MAIN VIEW ---
   const allPrograms = programs.filter(p => p.grades && p.grades.length > 0);
   const displayedPrograms = activeProgramId === 'all'
      ? allPrograms
      : allPrograms.filter(p => p.id === activeProgramId);

   // Flatten logic for search
   const filteredPrograms = displayedPrograms.map(prog => ({
      ...prog,
      grades: prog.grades.map(gr => ({
         ...gr,
         groups: gr.groups.filter(gp =>
            gp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            gr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            gp.day.toLowerCase().includes(searchQuery.toLowerCase())
         )
      })).filter(gr => gr.groups.length > 0)
   })).filter(prog => prog.grades.length > 0);

   return (
      <div className="space-y-8 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
         {/* Header & Controls */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
               <h2 className="text-3xl font-bold text-white tracking-tight">Classes & Schedule</h2>
               <p className="text-slate-400 text-sm mt-1">Manage your academic programs, groups, and enrollments.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                     type="text"
                     placeholder="Search groups or days..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-full sm:w-64 transition-all shadow-xl placeholder-slate-600"
                  />
               </div>
            </div>
         </div>

         {/* Tabs */}
         <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar mask-gradient">
            <button
               onClick={() => setActiveProgramId('all')}
               className={`
                        px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border
                        ${activeProgramId === 'all'
                     ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40'
                     : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white hover:bg-slate-800'}
                    `}
            >
               All Programs
            </button>
            {allPrograms.map(prog => (
               <button
                  key={prog.id}
                  onClick={() => setActiveProgramId(prog.id)}
                  className={`
                            px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border
                            ${activeProgramId === prog.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white hover:bg-slate-800'}
                        `}
               >
                  {prog.name}
               </button>
            ))}
         </div>

         {/* Grid */}
         <div className="space-y-10">
            {filteredPrograms.length === 0 ? (
               <div className="text-center py-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800">
                  <Filter className="mx-auto text-slate-600 mb-4" size={48} />
                  <h3 className="text-slate-500 font-medium">No classes found matching your criteria.</h3>
                  <button onClick={() => { setSearchQuery(''); setActiveProgramId('all'); }} className="text-blue-400 font-bold text-sm mt-2 hover:underline">Clear Filters</button>
               </div>
            ) : (
               filteredPrograms.map(program => (
                  <div key={program.id} className="animate-in fade-in duration-500">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                        <h3 className="text-xl font-bold text-slate-200">{program.name}</h3>
                        <span className="bg-slate-800 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-700">
                           {program.grades.reduce((acc, g) => acc + g.groups.length, 0)} Groups
                        </span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {program.grades.flatMap(grade =>
                           grade.groups.map(group => {
                              const count = enrollments.filter(e =>
                                 e.programId === program.id &&
                                 ((e.groupId === group.id || (e.gradeName === grade.name && e.groupName === group.name)) || (e.secondGroupId === group.id))
                              ).length;

                              // Dynamic gradient based on day
                              const isWeekend = group.day.includes('Sat') || group.day.includes('Sun');
                              const cardBg = isWeekend ? 'from-purple-500/10 to-indigo-500/10' : 'from-blue-500/10 to-cyan-500/10';

                              return (
                                 <div
                                    key={group.id}
                                    onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: group.id } })}
                                    className={`
                                                    bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer 
                                                    transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/10 
                                                    hover:border-blue-500/30 hover:-translate-y-1 group relative overflow-hidden
                                                `}
                                 >
                                    {/* Decorative background gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${cardBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                                    <div className="relative z-10 flex justify-between items-start mb-4">
                                       <div>
                                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">{grade.name}</span>
                                          <h4 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{group.name}</h4>
                                       </div>
                                    </div>

                                    <div className="relative z-10 space-y-3">
                                       <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                          <Calendar size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                          {group.day}
                                       </div>
                                       <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                          <Clock size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                          {group.time}
                                       </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-800 relative z-10 flex items-center justify-between">
                                       <div className="flex -space-x-2">
                                          {[...Array(Math.min(3, count))].map((_, i) => <div key={i} className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900"></div>)}
                                          {count > 3 && <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-400">+{count - 3}</div>}
                                          {count === 0 && <span className="text-xs text-slate-600 italic">Empty</span>}
                                       </div>
                                       <div className={`text-xs font-bold px-2 py-1 rounded-md ${count > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                          {count} Students
                                       </div>
                                    </div>

                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                       <ChevronRight className="text-blue-400" size={20} />
                                    </div>
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
   );
};
