import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CalendarCheck, ChevronRight, CircleDollarSign, ClipboardCheck, Clock, Eye, Filter, Layers3, Mail, Phone, Plus, Printer, School, Search, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { calculateAge, formatCurrency, generateRosterPrint } from '../utils/helpers';
import { Enrollment, Student } from '../types';

export const ClassesView = ({ onEnroll }: { onEnroll?: (programId: string, gradeId: string, groupId: string) => void }) => {
   const { programs, enrollments, students, viewParams, navigateTo, settings } = useAppContext();
   const { can } = useAuth();
   const { alert } = useConfirm();
   const { classId } = viewParams;
   const [activeProgramId, setActiveProgramId] = useState('all');
   const [searchQuery, setSearchQuery] = useState('');

   const allPrograms = useMemo(() => programs.filter(program => program.status === 'active' && program.grades?.length > 0), [programs]);
   const totalGroups = useMemo(() => allPrograms.reduce((total, program) => total + program.grades.reduce((sum, grade) => sum + grade.groups.length, 0), 0), [allPrograms]);
   const activeEnrollments = useMemo(() => enrollments.filter(enrollment => enrollment.status === 'active').length, [enrollments]);

   if (classId) {
      const program = programs.find(item => item.id === classId.pId);
      const grade = program?.grades?.find(item => item.id === classId.gId);
      const group = grade?.groups?.find(item => item.id === classId.grpId);

      if (!program || !grade || !group) {
         return <AtlasEmptyState title="Class not found" description="Return to Classes and choose another group." icon={School} action={<AtlasActionButton icon={ArrowLeft} onClick={() => navigateTo('classes', {})}>Back to classes</AtlasActionButton>} />;
      }

      const enrolledStudents = enrollments
         .filter(enrollment => enrollment.status === 'active' && enrollment.programId === program.id && ((enrollment.groupId === group.id || (enrollment.gradeName === grade.name && enrollment.groupName === group.name)) || enrollment.secondGroupId === group.id))
         .map(enrollment => {
            const student = students.find(item => item.id === enrollment.studentId);
            return student ? { ...student, enrollment } : null;
         })
         .filter(Boolean)
         .sort((first, second) => first!.name.localeCompare(second!.name)) as (Student & { enrollment: Enrollment })[];
      const emails = Array.from(new Set(enrolledStudents.map(student => student.email?.trim()).filter(Boolean))).join(',');
      const totalDue = enrolledStudents.reduce((total, student) => total + student.enrollment.balance, 0);

      const copyEmails = async () => {
         if (!emails) {
            alert('No emails to copy', 'Add family email addresses before copying this list.', 'warning');
            return;
         }
         try {
            await navigator.clipboard.writeText(emails);
            alert('Emails copied', 'The class email list is ready to paste.', 'success');
         } catch (error) {
            console.error(error);
            alert('Emails not copied', 'Clipboard access is unavailable. Try again from a secure browser window.', 'danger');
         }
      };

      const handleEnroll = () => {
         if (onEnroll) {
            onEnroll(program.id, grade.id, group.id);
            return;
         }
         alert('Enrollment unavailable', 'Open Students and start a new enrollment from there.', 'warning');
      };

      return (
         <div className="atlas-module atlas-classes-module space-y-5 pb-24 md:pb-8">
            <AtlasCommandHeader
               eyebrow={`${program.name} / ${grade.name}`}
               title={group.name}
               description={`${group.day} at ${group.time}. Keep the roster, family contacts, and account follow-up together.`}
               icon={School}
               badges={<span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-slate-300">{enrolledStudents.length} students</span>}
               actions={(
                  <>
                     <AtlasActionButton icon={ArrowLeft} variant="quiet" onClick={() => navigateTo('classes', {})}>Classes</AtlasActionButton>
                     <AtlasActionButton icon={Mail} onClick={copyEmails}>Copy emails</AtlasActionButton>
                     <AtlasActionButton icon={Printer} disabled={enrolledStudents.length === 0} title={enrolledStudents.length === 0 ? 'Add a student before printing the roster' : 'Print class roster'} onClick={() => generateRosterPrint(program.name, grade.name, group.name, `${group.day} ${group.time}`, enrolledStudents, settings.academyName)}>Print roster</AtlasActionButton>
                     <AtlasActionButton icon={ClipboardCheck} onClick={() => navigateTo('attendance')}>Take attendance</AtlasActionButton>
                     {can('students.enroll') && <AtlasActionButton icon={Plus} variant="primary" onClick={handleEnroll}>Add student</AtlasActionButton>}
                  </>
               )}
            />

            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
               <AtlasSignalCard label="Roster" value={enrolledStudents.length} detail="Active learners in this group" icon={Users} tone="teal" />
               <AtlasSignalCard label="Outstanding" value={formatCurrency(totalDue)} detail={totalDue > 0 ? 'Family follow-up is needed' : 'All balances are settled'} icon={CircleDollarSign} tone={totalDue > 0 ? 'amber' : 'emerald'} />
               <AtlasSignalCard label="Session" value={group.day} detail={group.time} icon={Clock} tone="blue" />
            </div>

            <section className="flex min-h-0 flex-col rounded-lg border border-white/10 bg-slate-950/45 p-4">
               <AtlasSectionHeader title="Class roster" description="Family contact and account status at a glance." icon={Users} meta={<span className="text-xs text-slate-500">Sorted by name</span>} />
               {enrolledStudents.length === 0 ? (
                  <div className="mt-4">
                     <AtlasEmptyState title="Build this roster" description="Add the first learner to connect attendance, family contact, and class records." icon={Users} action={can('students.enroll') ? <AtlasActionButton icon={Plus} variant="primary" onClick={handleEnroll}>Add student</AtlasActionButton> : undefined} />
                  </div>
               ) : (
                  <div className="mt-4 overflow-x-auto custom-scrollbar">
                     <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-950/95 text-[11px] font-bold uppercase text-slate-500">
                           <tr><th className="p-3">Student</th><th className="p-3">Age</th><th className="p-3">Family contact</th><th className="p-3 text-right">Account</th><th className="w-20 p-3 text-center">Open</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.07] text-slate-300">
                           {enrolledStudents.map(student => (
                              <tr key={student.id} className="transition-colors hover:bg-white/[0.03]">
                                 <td className="p-3">
                                    <div className="flex items-center gap-3">
                                       <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xs font-black text-teal-200">{student.name.charAt(0)}</div>
                                       <div className="min-w-0"><div className="truncate font-bold text-white">{student.name}</div><div className="truncate text-xs text-slate-500">{student.school || 'School not listed'}</div>{student.enrollment.secondGroupId === group.id && <span className="mt-1 inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-200">Secondary group</span>}</div>
                                    </div>
                                 </td>
                                 <td className="p-3 font-mono text-slate-400">{calculateAge(student.birthDate)} yrs</td>
                                 <td className="p-3"><div className="font-medium text-slate-200">{student.parentName || 'Parent not listed'}</div><div className="mt-0.5 flex items-center gap-1 text-xs text-teal-300"><Phone size={11} />{student.parentPhone || 'No phone'}</div></td>
                                 <td className="p-3 text-right">{student.enrollment.balance > 0 ? <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-200">Due {formatCurrency(student.enrollment.balance)}</span> : <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">Paid</span>}</td>
                                 <td className="p-3 text-center"><button type="button" onClick={() => navigateTo('student-details', { studentId: student.id })} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60" title="View student profile" aria-label={`View ${student.name}`}><Eye size={17} /></button></td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </section>
         </div>
      );
   }

   const displayedPrograms = activeProgramId === 'all' ? allPrograms : allPrograms.filter(program => program.id === activeProgramId);
   const query = searchQuery.trim().toLowerCase();
   const filteredPrograms = displayedPrograms.map(program => ({
      ...program,
      grades: program.grades.map(grade => ({
         ...grade,
         groups: grade.groups.filter(group => !query || program.name?.toLowerCase().includes(query) || group.name?.toLowerCase().includes(query) || grade.name?.toLowerCase().includes(query) || group.day?.toLowerCase().includes(query))
      })).filter(grade => grade.groups.length > 0)
   })).filter(program => program.grades.length > 0);

   return (
      <div className="atlas-module atlas-classes-module space-y-5 pb-24 md:pb-8">
         <AtlasCommandHeader eyebrow="Academic operations" title="Classes & schedule" description="Move from program structure to the live roster without losing context." icon={School} badges={<span className="rounded-full border border-teal-300/20 bg-teal-400/10 px-2.5 py-1 text-[10px] font-bold text-teal-200">{totalGroups} groups</span>} actions={<AtlasActionButton icon={CalendarCheck} onClick={() => navigateTo('schedule')}>Weekly schedule</AtlasActionButton>} />

         <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AtlasSignalCard label="Programs" value={allPrograms.length} detail="With scheduled groups" icon={Layers3} tone="teal" />
            <AtlasSignalCard label="Groups" value={totalGroups} detail="Available class rosters" icon={School} tone="blue" />
            <AtlasSignalCard label="Active enrollments" value={activeEnrollments} detail="Across the academy" icon={Users} tone="emerald" />
         </div>

         <AtlasToolbar
            leading={<div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search groups, grades, or days" className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950/70 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20" /></div>}
         >
            <div className="flex w-full gap-2 overflow-x-auto pb-1 custom-scrollbar">
               <button type="button" onClick={() => setActiveProgramId('all')} className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-bold transition-colors ${activeProgramId === 'all' ? 'border-teal-300/30 bg-teal-400/15 text-teal-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'}`}>All programs</button>
               {allPrograms.map(program => <button type="button" key={program.id} onClick={() => setActiveProgramId(program.id)} className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-bold transition-colors ${activeProgramId === program.id ? 'border-teal-300/30 bg-teal-400/15 text-teal-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'}`}>{program.name}</button>)}
            </div>
         </AtlasToolbar>

         {filteredPrograms.length === 0 ? (
            <AtlasEmptyState title={allPrograms.length === 0 ? 'No active class groups' : 'No classes match these filters'} description={allPrograms.length === 0 ? 'Create an active program with at least one scheduled group to start building rosters.' : 'Clear the search and program filter to return to the complete schedule.'} icon={allPrograms.length === 0 ? School : Filter} action={allPrograms.length === 0 ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => navigateTo('programs')}>Open programs</AtlasActionButton> : <AtlasActionButton onClick={() => { setSearchQuery(''); setActiveProgramId('all'); }}>Clear filters</AtlasActionButton>} />
         ) : (
            <div className="space-y-8">
               {filteredPrograms.map(program => (
                  <section key={program.id} className="space-y-4">
                     <AtlasSectionHeader title={program.name} description="Choose a group to open its working roster." icon={Layers3} meta={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">{program.grades.reduce((total, grade) => total + grade.groups.length, 0)} groups</span>} />
                     <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {program.grades.flatMap(grade => grade.groups.map(group => {
                           const count = enrollments.filter(enrollment => enrollment.status === 'active' && enrollment.programId === program.id && ((enrollment.groupId === group.id || (enrollment.gradeName === grade.name && enrollment.groupName === group.name)) || enrollment.secondGroupId === group.id)).length;
                           return (
                              <button type="button" key={group.id} onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: group.id } })} className="group min-h-[176px] rounded-lg border border-white/10 bg-slate-900/70 p-4 text-left transition-colors hover:border-teal-300/35 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                 <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase text-teal-300">{grade.name}</span><h4 className="mt-1 text-base font-black text-white">{group.name}</h4></div><ChevronRight size={18} className="text-slate-600 transition-colors group-hover:text-teal-300" /></div>
                                 <div className="mt-5 space-y-2 text-sm text-slate-400"><div className="flex items-center gap-2"><Calendar size={15} className="text-slate-500" />{group.day}</div><div className="flex items-center gap-2"><Clock size={15} className="text-slate-500" />{group.time}</div></div>
                                 <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="text-xs text-slate-500">Roster</span><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${count > 0 ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}>{count} students</span></div>
                              </button>
                           );
                        }))}
                     </div>
                  </section>
               ))}
            </div>
         )}
      </div>
   );
};
