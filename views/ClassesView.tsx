import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CalendarCheck, ChevronRight, CircleDollarSign, ClipboardCheck, Clock, Eye, Filter, Layers3, Mail, Phone, Plus, Printer, School, Search, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { EducationActionMenu, EducationButton, EducationNotice, EducationRegister, EducationState, EducationStatusPill } from '../components/education-ui/EducationPrimitives';
import { Modal } from '../components/Modal';
import { calculateAge, formatCurrency, generateRosterPrint } from '../utils/helpers';
import { config } from '../utils/config';
import { hasPrintableLearnerAccess, printGroupAccessCards } from '../utils/groupAccessPrint';
import { Enrollment, Student } from '../types';
import { getProgramOperationalState } from '../utils/programLifecycle';
import { isEnrollmentEligibleForAttendance } from '../utils/membershipLifecycle';
import { format } from 'date-fns';
import { getSchoolWeekdayIndex } from '../utils/schoolSchedule';
import './school-day/education-school-day-v1.css';
import './school-day/education-classes-pulse.css';

const formatStudentAge = (birthDate?: string) => {
   const age = calculateAge(birthDate);
   return age === null || !Number.isFinite(age) ? 'Age not listed' : `${age} yrs`;
};

export const ClassesView = ({ onEnroll }: { onEnroll?: (programId: string, gradeId: string, groupId: string) => void }) => {
   const { programs, enrollments, students, viewParams, navigateTo, settings } = useAppContext();
   const { can, currentOrganization } = useAuth();
   const { alert } = useConfirm();
   const { classId } = viewParams;
   const [activeProgramId, setActiveProgramId] = useState('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [isAccessPrintOpen, setIsAccessPrintOpen] = useState(false);
   const [selectedAccessIds, setSelectedAccessIds] = useState<string[]>([]);
   const groupKey = classId ? `${classId.pId}/${classId.gId}/${classId.grpId}` : '';
   useEffect(() => {
      setIsAccessPrintOpen(false);
      setSelectedAccessIds([]);
   }, [groupKey]);
   const showEducationSchoolDayV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';

   const today = format(new Date(), 'yyyy-MM-dd');
   const allPrograms = useMemo(() => programs.filter(program => ['running', 'upcoming', 'evergreen'].includes(getProgramOperationalState(program, today)) && program.grades?.length > 0), [programs, today]);
   const totalGroups = useMemo(() => allPrograms.reduce((total, program) => total + program.grades.reduce((sum, grade) => sum + grade.groups.length, 0), 0), [allPrograms]);
   const activeEnrollments = useMemo(() => enrollments.filter(enrollment => enrollment.status === 'active').length, [enrollments]);
   const todaysGroups = useMemo(() => allPrograms.filter(program => ['running', 'evergreen'].includes(getProgramOperationalState(program, today))).flatMap(program => program.grades.flatMap(grade => grade.groups
      .filter(group => getSchoolWeekdayIndex(group.day) === new Date().getDay())
      .map(group => ({ program, grade, group }))))
      .sort((first, second) => first.group.time.localeCompare(second.group.time)), [allPrograms, today]);

   if (classId) {
      const program = programs.find(item => item.id === classId.pId);
      const grade = program?.grades?.find(item => item.id === classId.gId);
      const group = grade?.groups?.find(item => item.id === classId.grpId);

      if (!program || !grade || !group) {
         return <div className="edu-classes-v1" data-edu-system="1"><EducationState title="Class not found" description="Return to Classes and choose another group."><EducationButton icon={ArrowLeft} onClick={() => navigateTo('classes', {})}>Back to classes</EducationButton></EducationState></div>;
      }

      const enrolledStudents = enrollments
          .filter(enrollment => isEnrollmentEligibleForAttendance(enrollment, program, today) && enrollment.programId === program.id && ((enrollment.groupId === group.id || (enrollment.gradeName === grade.name && enrollment.groupName === group.name)) || enrollment.secondGroupId === group.id))
         .map(enrollment => {
            const student = students.find(item => item.id === enrollment.studentId);
            return student ? { ...student, enrollment } : null;
         })
         .filter(Boolean)
         .sort((first, second) => first!.name.localeCompare(second!.name)) as (Student & { enrollment: Enrollment })[];
      const emails = Array.from(new Set(enrolledStudents.map(student => student.email?.trim()).filter(Boolean))).join(',');
      const totalDue = enrolledStudents.reduce((total, student) => total + student.enrollment.balance, 0);
      const accessCandidates = Array.from(new Map(enrolledStudents.map(student => [student.id, student])).values());
      const readyAccessStudents = accessCandidates.filter(student => hasPrintableLearnerAccess(student, currentOrganization?.id || ''));
      const readyAccessIds = new Set(readyAccessStudents.map(student => student.id));
      const selectedAccessStudents = readyAccessStudents.filter(student => selectedAccessIds.includes(student.id));

      const handlePrintAccess = async () => {
         if (!can('students.edit') || !currentOrganization?.id) {
            await alert('Access printing unavailable', 'Only staff who manage student records can print account credentials.', 'warning');
            return;
         }
         if (selectedAccessStudents.length === 0) {
            await alert('Select learners', 'Choose at least one learner with printable access.', 'warning');
            return;
         }
         try {
            const opened = printGroupAccessCards(selectedAccessStudents, {
               organizationId: currentOrganization.id,
               academyName: settings.academyName || currentOrganization.name || 'Edufy',
               programName: program.name,
               gradeName: grade.name,
               groupName: group.name,
               loginUrl: config.sparkQuestUrl,
            });
            if (!opened) {
               await alert('Print window blocked', 'Allow pop-ups for Edufy, then try printing the access cards again.', 'warning');
               return;
            }
            setIsAccessPrintOpen(false);
            setSelectedAccessIds([]);
         } catch (error) {
            await alert('Access cards could not be printed', error instanceof Error ? error.message : 'Check the learner accounts and try again.', 'danger');
         }
      };

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
         <div className={`atlas-module atlas-classes-module space-y-5 pb-24 md:pb-8 ${showEducationSchoolDayV1 ? 'edu-v1 edu-classes-v1 edu-classes-pulse' : ''}`} data-edu-system={showEducationSchoolDayV1 ? '1' : undefined} data-testid={showEducationSchoolDayV1 ? 'education-class-roster-v1' : undefined}>
            <AtlasCommandHeader
               density={showEducationSchoolDayV1 ? 'compact' : 'default'}
               eyebrow={`${program.name} / ${grade.name}`}
               title={group.name}
               description={showEducationSchoolDayV1 ? `${group.day} at ${group.time}` : `${group.day} at ${group.time}. Keep the roster, family contacts, and account follow-up together.`}
               icon={School}
               badges={<EducationStatusPill status="info">{enrolledStudents.length} students</EducationStatusPill>}
               actions={(
                  <>
                     <EducationButton icon={ArrowLeft} variant="quiet" onClick={() => navigateTo('classes', {})}>Classes</EducationButton>
                     <EducationButton icon={ClipboardCheck} onClick={() => navigateTo('attendance')}>Take attendance</EducationButton>
                     {can('students.enroll') && <EducationButton icon={Plus} variant="primary" onClick={handleEnroll}>Add student</EducationButton>}
                     <EducationActionMenu label="More class actions">
                        <EducationButton icon={Mail} variant="quiet" onClick={copyEmails}>Copy emails</EducationButton>
                        <EducationButton icon={Printer} variant="quiet" disabled={enrolledStudents.length === 0} title={enrolledStudents.length === 0 ? 'Add a student before printing the roster' : 'Print class roster'} onClick={() => generateRosterPrint(program.name, grade.name, group.name, `${group.day} ${group.time}`, enrolledStudents, settings.academyName)}>Print roster</EducationButton>
                        {can('students.edit') && <EducationButton icon={Printer} variant="quiet" disabled={accessCandidates.length === 0} title="Review this group's learner accounts and print ready access cards" onClick={() => { setSelectedAccessIds([]); setIsAccessPrintOpen(true); }}>Print learner access</EducationButton>}
                     </EducationActionMenu>
                  </>
               )}
            />

            {showEducationSchoolDayV1 ? <dl className="pulse-classes-facts" aria-label="Class summary"><div><dt>Students</dt><dd>{enrolledStudents.length}</dd></div><div><dt>Outstanding</dt><dd>{formatCurrency(totalDue)}</dd></div><div><dt>Session</dt><dd>{group.day} · {group.time}</dd></div></dl> : <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
               <AtlasSignalCard label="Roster" value={enrolledStudents.length} detail="Active learners in this group" icon={Users} tone="teal" />
               <AtlasSignalCard label="Outstanding" value={formatCurrency(totalDue)} detail={totalDue > 0 ? 'Family follow-up is needed' : 'All balances are settled'} icon={CircleDollarSign} tone={totalDue > 0 ? 'amber' : 'emerald'} />
               <AtlasSignalCard label="Session" value={group.day} detail={group.time} icon={Clock} tone="blue" />
            </div>}

            <EducationRegister className="edu-classes-v1__register" title="Class roster" description="Family contact, learner profile and account status in one working view." icon={Users} actions={<EducationStatusPill status="info">{enrolledStudents.length} learners</EducationStatusPill>}>
               {enrolledStudents.length === 0 ? (
                  <div className="p-4">
                     <AtlasEmptyState title="Build this roster" description="Add the first learner to connect attendance, family contact, and class records." icon={Users} action={can('students.enroll') ? <AtlasActionButton icon={Plus} variant="primary" onClick={handleEnroll}>Add student</AtlasActionButton> : undefined} />
                  </div>
               ) : (
                  <>
                  {showEducationSchoolDayV1 && (
                     <div className="edu-classes-v1__mobile-roster mt-4 md:hidden" aria-label="Class roster cards">
                        {enrolledStudents.map(student => (
                           <article key={student.id}>
                              <div className="edu-classes-v1__mobile-roster-head">
                                 <div className="edu-classes-v1__mobile-avatar">{student.name.charAt(0)}</div>
                                 <div>
                                    <strong>{student.name}</strong>
                                    <span>{student.school || 'School not listed'} · {formatStudentAge(student.birthDate)}</span>
                                 </div>
                                 {student.enrollment.balance > 0 ? <EducationStatusPill status="warning">Due {formatCurrency(student.enrollment.balance)}</EducationStatusPill> : <EducationStatusPill status="success">Paid</EducationStatusPill>}
                              </div>
                              {student.enrollment.secondGroupId === group.id && <EducationStatusPill status="info">Secondary group</EducationStatusPill>}
                              <div className="edu-classes-v1__mobile-contact">
                                 <span>{student.parentName || 'Parent not listed'}</span>
                                 <span><Phone size={13} />{student.parentPhone || 'No phone'}</span>
                              </div>
                              <button type="button" onClick={() => navigateTo('student-details', { studentId: student.id })}>
                                 Open student profile <ChevronRight size={16} />
                              </button>
                           </article>
                        ))}
                     </div>
                  )}
                  <div className={`edu-classes-v1__table-wrap overflow-x-auto custom-scrollbar ${showEducationSchoolDayV1 ? 'hidden md:block' : ''}`}>
                     <table className="edu-classes-v1__table w-full min-w-[760px] text-left text-sm">
                        <thead>
                           <tr><th className="p-3">Student</th><th className="p-3">Age</th><th className="p-3">Family contact</th><th className="p-3 text-right">Account</th><th className="w-20 p-3 text-center">Open</th></tr>
                        </thead>
                        <tbody>
                           {enrolledStudents.map(student => (
                              <tr key={student.id}>
                                 <td className="p-3">
                                    <div className="flex items-center gap-3">
                                       <div className="edu-classes-v1__avatar">{student.name.charAt(0)}</div>
                                       <div className="min-w-0"><div className="truncate font-bold">{student.name}</div><div className="truncate text-xs">{student.school || 'School not listed'}</div>{student.enrollment.secondGroupId === group.id && <EducationStatusPill status="info">Secondary group</EducationStatusPill>}</div>
                                    </div>
                                 </td>
                                 <td className="p-3">{formatStudentAge(student.birthDate)}</td>
                                 <td className="p-3"><div className="font-medium">{student.parentName || 'Parent not listed'}</div><div className="edu-classes-v1__phone"><Phone size={13} />{student.parentPhone || 'No phone'}</div></td>
                                 <td className="p-3 text-right">{student.enrollment.balance > 0 ? <EducationStatusPill status="warning">Due {formatCurrency(student.enrollment.balance)}</EducationStatusPill> : <EducationStatusPill status="success">Paid</EducationStatusPill>}</td>
                                 <td className="p-3 text-center"><EducationButton icon={Eye} variant="quiet" onClick={() => navigateTo('student-details', { studentId: student.id })} title="View student profile" aria-label={`View ${student.name}`}>Open</EducationButton></td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  </>
               )}
            </EducationRegister>
            <Modal designSystem isOpen={isAccessPrintOpen} onClose={() => setIsAccessPrintOpen(false)} title={`Print access · ${group.name}`} size="lg">
               <div className="edu-classes-access space-y-4">
                  <p className="edu-classes-access__intro">Select learners whose portal access cards you want to hand out in this class.</p>
                  {readyAccessStudents.length === 0 && <EducationNotice status="attention">No learner in this group has printable access yet. Open a learner profile to review account setup.</EducationNotice>}
                  <div className="edu-classes-access__select-all">
                     <label>
                        <input type="checkbox" checked={readyAccessStudents.length > 0 && selectedAccessStudents.length === readyAccessStudents.length} disabled={readyAccessStudents.length === 0} onChange={() => setSelectedAccessIds(selectedAccessStudents.length === readyAccessStudents.length ? [] : readyAccessStudents.map(student => student.id))} />
                        Select all ready ({readyAccessStudents.length})
                     </label>
                     <span>{selectedAccessStudents.length} selected</span>
                  </div>
                  <div className="edu-classes-access__list">
                     {accessCandidates.map(student => {
                        const ready = readyAccessIds.has(student.id);
                        return (
                           <div key={student.id} className="edu-classes-access__row" data-ready={ready}>
                              <label>
                                 <input type="checkbox" checked={ready && selectedAccessIds.includes(student.id)} disabled={!ready} onChange={() => setSelectedAccessIds(previous => previous.includes(student.id) ? previous.filter(id => id !== student.id) : [...previous, student.id])} aria-label={`Select ${student.name} access card`} />
                                 <span><strong>{student.name}</strong><small>{ready ? student.loginInfo!.email : student.organizationId !== currentOrganization?.id ? 'Account is outside this organization' : student.status === 'inactive' ? 'Learner record is inactive' : !student.loginInfo?.email ? 'Learner access not created' : !student.loginInfo?.uid ? 'Account link is incomplete' : 'Printable password unavailable'}</small></span>
                              </label>
                              {!ready && <EducationButton variant="quiet" onClick={() => { setIsAccessPrintOpen(false); navigateTo('student-details', { studentId: student.id }); }}>Open profile</EducationButton>}
                           </div>
                        );
                     })}
                  </div>
                  <EducationNotice status="warning">The printout contains saved initial passwords, which may be outdated after a reset. Check access before distribution, collect unused pages, and hand each card to the correct learner or guardian.</EducationNotice>
                  <EducationButton icon={Printer} variant="primary" disabled={selectedAccessStudents.length === 0} onClick={handlePrintAccess} className="edu-classes-access__print">Print {selectedAccessStudents.length} access card{selectedAccessStudents.length === 1 ? '' : 's'}</EducationButton>
               </div>
            </Modal>
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
      <div className={`atlas-module atlas-classes-module space-y-5 pb-24 md:pb-8 ${showEducationSchoolDayV1 ? 'edu-v1 edu-classes-v1 edu-classes-pulse' : ''}`} data-edu-system={showEducationSchoolDayV1 ? '1' : undefined} data-testid={showEducationSchoolDayV1 ? 'education-classes-v1' : undefined}>
         <AtlasCommandHeader density={showEducationSchoolDayV1 ? 'compact' : 'default'} eyebrow="Teaching day" title={showEducationSchoolDayV1 ? 'Classes' : 'Classes & schedule'} description={showEducationSchoolDayV1 ? undefined : 'Move from program structure to the live roster without losing context.'} icon={School} actions={<><AtlasActionButton icon={CalendarCheck} onClick={() => navigateTo('schedule')}>Weekly schedule</AtlasActionButton><AtlasActionButton icon={ClipboardCheck} variant="primary" onClick={() => navigateTo('attendance')}>Take attendance</AtlasActionButton></>} />

         {showEducationSchoolDayV1 && <section className="pulse-classes-today" aria-label="Today's classes">
            <div className="pulse-classes-section-title"><div><span>{format(new Date(), 'EEEE, d MMMM')}</span><h2>Today’s classes</h2></div><b>{todaysGroups.length} scheduled</b></div>
            {todaysGroups.length > 0 ? <div className="pulse-classes-timeline">{todaysGroups.map(({program,grade,group}) => <button type="button" key={`${program.id}/${grade.id}/${group.id}`} onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: group.id } })} aria-label={`Open ${group.name} roster at ${group.time}`}><time>{group.time}</time><span><strong>{group.name}</strong><small>{program.name} · {grade.name}</small></span><span className="pulse-classes-open">Open roster <ChevronRight size={16}/></span></button>)}</div> : <AtlasEmptyState title="No classes today" description="Browse the groups below or check the weekly schedule." icon={Calendar} action={<AtlasActionButton onClick={() => navigateTo('schedule')}>Open schedule</AtlasActionButton>}/>}
         </section>}

         {showEducationSchoolDayV1 ? <dl className="pulse-classes-facts" aria-label="Class directory summary"><div><dt>Programs</dt><dd>{allPrograms.length}</dd></div><div><dt>Groups</dt><dd>{totalGroups}</dd></div><div><dt>Active enrollments</dt><dd>{activeEnrollments}</dd></div></dl> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AtlasSignalCard label="Programs" value={allPrograms.length} detail="With scheduled groups" icon={Layers3} tone="teal" />
            <AtlasSignalCard label="Groups" value={totalGroups} detail="Available class rosters" icon={School} tone="blue" />
            <AtlasSignalCard label="Active enrollments" value={activeEnrollments} detail="Across the academy" icon={Users} tone="emerald" />
         </div>}

         <AtlasToolbar
            leading={<div className="edu-classes-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search classes" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search groups, grades, or days" /></div>}
         >
            <div className="edu-classes-filters custom-scrollbar" role="group" aria-label="Filter classes by program">
               <button type="button" aria-pressed={activeProgramId === 'all'} onClick={() => setActiveProgramId('all')}>All programs</button>
               {allPrograms.map(program => <button type="button" key={program.id} aria-pressed={activeProgramId === program.id} onClick={() => setActiveProgramId(program.id)}>{program.name}</button>)}
            </div>
         </AtlasToolbar>

         {filteredPrograms.length === 0 ? (
            <AtlasEmptyState title={allPrograms.length === 0 ? 'No active class groups' : 'No classes match these filters'} description={allPrograms.length === 0 ? 'Create an active program with at least one scheduled group to start building rosters.' : 'Clear the search and program filter to return to the complete schedule.'} icon={allPrograms.length === 0 ? School : Filter} action={allPrograms.length === 0 ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => navigateTo('programs')}>Open programs</AtlasActionButton> : <AtlasActionButton onClick={() => { setSearchQuery(''); setActiveProgramId('all'); }}>Clear filters</AtlasActionButton>} />
         ) : (
            <div className="space-y-8">
               {filteredPrograms.map(program => (
                  <section key={program.id} className="pulse-classes-directory space-y-4">
                     <AtlasSectionHeader title={program.name} description="Choose a group to open its working roster." icon={Layers3} meta={<EducationStatusPill status="neutral">{program.grades.reduce((total, grade) => total + grade.groups.length, 0)} groups</EducationStatusPill>} />
                     <div className={showEducationSchoolDayV1 ? 'pulse-classes-groups' : 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'}>
                        {program.grades.flatMap(grade => grade.groups.map(group => {
                           const count = enrollments.filter(enrollment => isEnrollmentEligibleForAttendance(enrollment, program, today) && enrollment.programId === program.id && ((enrollment.groupId === group.id || (enrollment.gradeName === grade.name && enrollment.groupName === group.name)) || enrollment.secondGroupId === group.id)).length;
                           return (
                              <button type="button" key={group.id} onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: group.id } })} className="pulse-classes-group group min-h-[176px] rounded-lg border border-white/10 bg-slate-900/70 p-4 text-left transition-colors hover:border-teal-300/35 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                 <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase text-teal-300">{grade.name}</span><h4 className="mt-1 text-base font-black text-white">{group.name}</h4></div><ChevronRight size={18} className="text-slate-600 transition-colors group-hover:text-teal-300" /></div>
                                 <div className="mt-5 space-y-2 text-sm text-slate-400"><div className="flex items-center gap-2"><Calendar size={15} className="text-slate-500" />{group.day}</div><div className="flex items-center gap-2"><Clock size={15} className="text-slate-500" />{group.time}</div></div>
                                 <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="text-xs text-slate-500">Roster</span><EducationStatusPill status={count > 0 ? 'success' : 'neutral'}>{count} {count === 1 ? 'student' : 'students'}</EducationStatusPill></div>
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
