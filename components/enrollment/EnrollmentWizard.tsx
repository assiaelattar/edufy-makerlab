import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { Enrollment, Program, Student } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { getProgramReadiness } from '../../utils/program-readiness';
import { Modal } from '../Modal';

export type EnrollmentLearnerMode = 'existing' | 'new';

export interface EnrollmentStudentDraft {
  name: string;
  parentPhone: string;
  parentName: string;
  birthDate: string;
  email: string;
  school: string;
}

export interface EnrollmentProgramDraft {
  programId: string;
  packName: string;
  gradeId: string;
  groupId: string;
  paymentPlan: string;
  secondGroupId: string;
  campSessionId: string;
  campShiftId: string;
  moduleIds: string[];
}

export interface EnrollmentPaymentDraft {
  amount: string;
  method: string;
  checkNumber: string;
  bankName: string;
  depositDate: string;
  date: string;
}

export interface EnrollmentPayment extends EnrollmentPaymentDraft {
  id: number;
}

export interface EnrollmentPromiseDraft {
  month: string;
  amount: string;
}

export interface EnrollmentPromise extends EnrollmentPromiseDraft {
  id: number;
}

interface EnrollmentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  learnerMode: EnrollmentLearnerMode;
  setLearnerMode: React.Dispatch<React.SetStateAction<EnrollmentLearnerMode>>;
  selectedStudentId: string | null;
  setSelectedStudentId: React.Dispatch<React.SetStateAction<string | null>>;
  studentForm: EnrollmentStudentDraft;
  setStudentForm: React.Dispatch<React.SetStateAction<EnrollmentStudentDraft>>;
  programForm: EnrollmentProgramDraft;
  setProgramForm: React.Dispatch<React.SetStateAction<EnrollmentProgramDraft>>;
  students: Student[];
  programs: Program[];
  enrollments: Enrollment[];
  selectedProgram?: Program;
  standardTuition: number;
  negotiatedPrice: number;
  setNegotiatedPrice: React.Dispatch<React.SetStateAction<number>>;
  payments: EnrollmentPayment[];
  currentPayment: EnrollmentPaymentDraft;
  setCurrentPayment: React.Dispatch<React.SetStateAction<EnrollmentPaymentDraft>>;
  onAddPayment: () => void;
  onRemovePayment: (id: number) => void;
  promises: EnrollmentPromise[];
  currentPromise: EnrollmentPromiseDraft;
  setCurrentPromise: React.Dispatch<React.SetStateAction<EnrollmentPromiseDraft>>;
  onAddPromise: () => void;
  onRemovePromise: (id: number) => void;
  totalPayingNow: number;
  remainingBalance: number;
  remainingToSchedule: number;
  pendingPayingNow: number;
  discountAmount: number;
  discountPercent: number;
  requiredStudentFields: {
    parentName: boolean;
    birthDate: boolean;
  };
  isSubmitting: boolean;
  onFinish: () => void;
}

const steps = [
  { id: 1, label: 'Learner', helper: 'Choose the student', icon: UserRound },
  { id: 2, label: 'Class', helper: 'Choose the program', icon: CalendarDays },
  { id: 3, label: 'Fees', helper: 'Agree the payment', icon: Wallet },
  { id: 4, label: 'Review', helper: 'Check and enroll', icon: CheckCircle2 },
];

const paymentPlans = [
  { id: 'full', label: 'Pay in full', helper: 'One balance' },
  { id: 'monthly', label: 'Monthly', helper: 'Every month' },
  { id: 'trimester', label: 'Per term', helper: 'Three-month rhythm' },
  { id: 'semestre', label: 'Per semester', helper: 'Two installments' },
  { id: 'annual', label: 'Annual plan', helper: 'Year agreement' },
] as const;

const getProgramAccessSummary = (program?: Program) => {
  if (!program?.enrollmentPolicy || program.enrollmentPolicy.mode === 'fixed_run') return 'Shared program dates';
  if (program.enrollmentPolicy.mode === 'rolling_membership') return `${program.enrollmentPolicy.membershipDurationMonths || 12}-month membership from joining date`;
  return `Choose by ${program.enrollmentPolicy.moduleLabel?.trim() || 'module'}`;
};

const fieldClass = 'h-11 w-full rounded-lg border border-white/10 bg-slate-950/75 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/15';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-400';

export const EnrollmentWizard: React.FC<EnrollmentWizardProps> = ({
  isOpen,
  onClose,
  step,
  setStep,
  learnerMode,
  setLearnerMode,
  selectedStudentId,
  setSelectedStudentId,
  studentForm,
  setStudentForm,
  programForm,
  setProgramForm,
  students,
  programs,
  enrollments,
  selectedProgram,
  standardTuition,
  negotiatedPrice,
  setNegotiatedPrice,
  payments,
  currentPayment,
  setCurrentPayment,
  onAddPayment,
  onRemovePayment,
  promises,
  currentPromise,
  setCurrentPromise,
  onAddPromise,
  onRemovePromise,
  totalPayingNow,
  remainingBalance,
  remainingToSchedule,
  pendingPayingNow,
  discountAmount,
  discountPercent,
  requiredStudentFields,
  isSubmitting,
  onFinish,
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [stepError, setStepError] = useState('');
  const [showPaymentEntry, setShowPaymentEntry] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const selectedStudent = useMemo(
    () => students.find(student => student.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const readyPrograms = useMemo(
    () => programs.filter(program => getProgramReadiness(program).isReady),
    [programs]
  );

  const matchingStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return students
      .filter(student => student.status === 'active')
      .filter(student => {
        if (!query) return true;
        return [student.name, student.parentName, student.parentPhone, student.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 7);
  }, [studentSearch, students]);

  const groupChoices = useMemo(() => selectedProgram?.grades.flatMap(grade =>
    grade.groups.map(group => {
      const rosterSize = enrollments.filter(enrollment =>
        enrollment.status === 'active'
        && enrollment.programId === selectedProgram.id
        && enrollment.groupId === group.id
      ).length;
      const capacity = group.capacity && group.capacity > 0 ? group.capacity : null;
      return {
        grade,
        group,
        rosterSize,
        capacity,
        seatsLeft: capacity === null ? null : Math.max(0, capacity - rosterSize),
        isFull: capacity !== null && rosterSize >= capacity,
      };
    })
  ) || [], [enrollments, selectedProgram]);

  const selectedGroupChoice = groupChoices.find(choice => choice.group.id === programForm.groupId);
  const selectedPack = selectedProgram?.packs.find(pack => pack.name === programForm.packName);
  const selectedSecondGroup = groupChoices.find(choice => choice.group.id === programForm.secondGroupId);
  const isStructuredCamp = selectedProgram?.formatPreset === 'camp' && Boolean(selectedProgram.campSetup?.sessions.length);
  const selectedCampSession = selectedProgram?.campSetup?.sessions.find(session => session.id === programForm.campSessionId);
  const selectedCampShift = selectedProgram?.campSetup?.shifts.find(shift => shift.id === programForm.campShiftId);
  const selectedCampWeeks = selectedCampSession?.weeks.filter(week => programForm.moduleIds.includes(week.id)) || [];
  const displayStudentName = selectedStudent?.name || studentForm.name || 'Learner not chosen';
  const paymentScheduleTotal = promises.reduce((sum, promise) => sum + Number(promise.amount || 0), 0);

  useEffect(() => {
    if (!isOpen) return;
    setStepError('');
    setStudentSearch('');
    setShowPaymentEntry(payments.length > 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setStepError('');
    requestAnimationFrame(() => stepHeadingRef.current?.focus({ preventScroll: true }));
  }, [isOpen, step]);

  const chooseLearnerMode = (mode: EnrollmentLearnerMode) => {
    setLearnerMode(mode);
    setStepError('');
    if (mode === 'new') setSelectedStudentId(null);
  };

  const selectProgram = (program: Program) => {
    const defaultPack = program.packs.length === 1 ? program.packs[0].name : '';
    setProgramForm(previous => ({
      ...previous,
      programId: program.id,
      packName: defaultPack,
      gradeId: '',
      groupId: '',
      secondGroupId: '',
      campSessionId: '',
      campShiftId: '',
      moduleIds: [],
    }));
  };

  const updateCampSelection = (patch: Partial<EnrollmentProgramDraft>) => {
    if (!selectedProgram?.campSetup) return;
    setProgramForm(previous => {
      const next = { ...previous, ...patch };
      const pack = selectedProgram.packs.find(item => item.name === next.packName);
      const session = selectedProgram.campSetup?.sessions.find(item => item.id === next.campSessionId);
      const includedWeeks = Math.max(1, Number(pack?.includedModuleCount || 1));
      let moduleIds = next.moduleIds.filter(moduleId => session?.weeks.some(week => week.id === moduleId));
      if (includedWeeks >= 2 && session) moduleIds = session.weeks.slice(0, includedWeeks).map(week => week.id);
      if (includedWeeks === 1 && moduleIds.length > 1) moduleIds = moduleIds.slice(0, 1);

      const grade = selectedProgram.grades.find(item => item.id === next.gradeId);
      const matchingGroups = (grade?.groups || []).filter(group =>
        group.campSessionId === next.campSessionId
        && group.campShiftId === next.campShiftId
        && moduleIds.includes(group.campWeekId || '')
      );

      return {
        ...next,
        moduleIds,
        groupId: matchingGroups[0]?.id || '',
        secondGroupId: matchingGroups[1]?.id || '',
      };
    });
  };

  const selectGroup = (gradeId: string, groupId: string) => {
    setProgramForm(previous => ({ ...previous, gradeId, groupId }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (learnerMode === 'existing' && !selectedStudentId) return 'Choose an existing learner to continue.';
      if (learnerMode === 'new' && !studentForm.name.trim()) return 'Enter the learner name to continue.';
      if (learnerMode === 'new' && !studentForm.parentPhone.trim()) return 'Enter a family phone number to continue.';
      if (learnerMode === 'new' && requiredStudentFields.parentName && !studentForm.parentName.trim()) return 'Enter the parent or guardian name to continue.';
      if (learnerMode === 'new' && requiredStudentFields.birthDate && !studentForm.birthDate) return 'Enter the learner birth date to continue.';
    }
    if (step === 2) {
      if (!programForm.programId) return 'Choose a program to continue.';
      if (!programForm.packName) return 'Choose a fee option to continue.';
      if (isStructuredCamp) {
        if (!programForm.gradeId) return 'Choose the learner age group.';
        if (!programForm.campSessionId) return 'Choose a camp session.';
        if (!programForm.campShiftId) return 'Choose morning or afternoon.';
        const requiredWeeks = Math.max(1, Number(selectedPack?.includedModuleCount || 1));
        if (programForm.moduleIds.length !== requiredWeeks) return `Choose ${requiredWeeks === 1 ? 'one week' : 'both weeks'} for this camp pack.`;
      }
      if (!programForm.groupId) return 'Choose a class time to continue.';
      if (selectedGroupChoice?.isFull) return 'This class is full. Choose another class time.';
    }
    if (step === 3) {
      if (!Number.isFinite(negotiatedPrice) || negotiatedPrice <= 0) return 'Enter the agreed tuition fee.';
      if (totalPayingNow > negotiatedPrice) return 'Today\'s payments cannot be higher than the agreed fee.';
      if (paymentScheduleTotal > remainingToSchedule) return 'The payment schedule is higher than the amount still to arrange.';
    }
    return '';
  };

  const continueForward = () => {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStep(previous => Math.min(4, previous + 1));
  };

  const addPayment = () => {
    const amount = Number(currentPayment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStepError('Enter the amount received today.');
      return;
    }
    if (amount > remainingToSchedule) {
      setStepError('This payment is higher than the amount still due.');
      return;
    }
    if (currentPayment.method === 'check' && (!currentPayment.checkNumber.trim() || !currentPayment.bankName.trim() || !currentPayment.depositDate)) {
      setStepError('Add the check number, bank, and deposit date.');
      return;
    }
    setStepError('');
    onAddPayment();
  };

  const addPromise = () => {
    const amount = Number(currentPromise.amount);
    if (!currentPromise.month || !Number.isFinite(amount) || amount <= 0) {
      setStepError('Choose a month and amount for the payment schedule.');
      return;
    }
    if (paymentScheduleTotal + amount > remainingToSchedule) {
      setStepError('This schedule would be higher than the amount still to arrange.');
      return;
    }
    setStepError('');
    onAddPromise();
  };

  const finish = () => {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    onFinish();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enroll a student" size="5xl">
      <div className="grid min-h-[34rem] gap-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-white/10 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {steps.map(item => {
              const Icon = item.icon;
              const isActive = item.id === step;
              const isDone = item.id < step;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => isDone && setStep(item.id)}
                  disabled={!isDone && !isActive}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex min-w-[9rem] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition lg:min-w-0 ${
                    isActive
                      ? 'border-teal-300/35 bg-teal-300/10 text-teal-100'
                      : isDone
                        ? 'border-transparent text-slate-300 hover:bg-white/[0.04]'
                        : 'border-transparent text-slate-600'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-teal-300 text-slate-950' : isDone ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.04]'}`}>
                    {isDone ? <Check size={16} /> : <Icon size={16} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black">{item.label}</span>
                    <span className="mt-0.5 hidden truncate text-[10px] text-slate-500 lg:block">{item.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 hidden border-t border-white/10 pt-5 lg:block">
            <p className="text-[10px] font-black uppercase text-slate-600">Enrollment route</p>
            <p className="mt-2 truncate text-sm font-black text-white">{displayStudentName}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{selectedProgram?.name || 'Program not chosen'}</p>
            {selectedGroupChoice && <p className="mt-1 truncate text-xs text-slate-500">{selectedGroupChoice.group.day} at {selectedGroupChoice.group.time}</p>}
            {negotiatedPrice > 0 && <p className="mt-3 text-lg font-black text-teal-300">{formatCurrency(negotiatedPrice)}</p>}
          </div>
        </aside>

        <section className="min-w-0 pt-5 lg:pl-6 lg:pt-0">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase text-teal-300">Step {step} of 4</p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-xl font-black text-white outline-none sm:text-2xl">
                {step === 1 && 'Who is joining?'}
                {step === 2 && 'Choose the right class'}
                {step === 3 && 'Agree the fee'}
                {step === 4 && 'Ready to enroll'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {step === 1 && 'Find the learner first to avoid creating the same profile twice.'}
                {step === 2 && 'Pick the program, fee option, and weekly class time.'}
                {step === 3 && 'Set the agreement, then record a payment only when money was received.'}
                {step === 4 && 'Check the learner, class, and balance before saving.'}
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div className="grid h-11 grid-cols-2 rounded-lg border border-white/10 bg-slate-950/60 p-1">
                  <button type="button" onClick={() => chooseLearnerMode('existing')} className={`flex items-center justify-center gap-2 rounded-md text-xs font-black transition ${learnerMode === 'existing' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                    <Search size={15} /> Find learner
                  </button>
                  <button type="button" onClick={() => chooseLearnerMode('new')} className={`flex items-center justify-center gap-2 rounded-md text-xs font-black transition ${learnerMode === 'new' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                    <UserPlus size={15} /> New learner
                  </button>
                </div>

                {learnerMode === 'existing' ? (
                  selectedStudent ? (
                    <div className="flex items-center gap-4 border-y border-white/10 py-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-300/12 text-sm font-black text-teal-200">
                        {selectedStudent.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-white">{selectedStudent.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{selectedStudent.parentName || 'Family contact'} / {selectedStudent.parentPhone || 'No phone'}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedStudentId(null)} className="h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/[0.05]">Change</button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                        <input autoFocus type="search" className={`${fieldClass} pl-10`} placeholder="Search learner, parent, or phone" value={studentSearch} onChange={event => setStudentSearch(event.target.value)} />
                      </div>
                      <div className="mt-3 divide-y divide-white/[0.07] border-y border-white/10">
                        {matchingStudents.length === 0 ? (
                          <div className="py-8 text-center">
                            <p className="text-sm font-bold text-slate-300">No learner found</p>
                            <button type="button" onClick={() => chooseLearnerMode('new')} className="mt-2 text-xs font-black text-teal-300">Create a new learner</button>
                          </div>
                        ) : matchingStudents.map(student => {
                          const activeEnrollmentCount = enrollments.filter(enrollment => enrollment.studentId === student.id && enrollment.status === 'active').length;
                          return (
                            <button key={student.id} type="button" onClick={() => setSelectedStudentId(student.id)} className="flex min-h-14 w-full items-center gap-3 px-2 py-2 text-left transition hover:bg-white/[0.04]">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-black text-slate-300">{student.name.slice(0, 1).toUpperCase()}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-white">{student.name}</span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">{student.parentPhone || 'No phone'} / {activeEnrollmentCount} active enrollment{activeEnrollmentCount === 1 ? '' : 's'}</span>
                              </span>
                              <ChevronRight size={16} className="text-slate-600" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><label className={labelClass}>Learner full name *</label><input autoFocus className={fieldClass} value={studentForm.name} onChange={event => setStudentForm(previous => ({ ...previous, name: event.target.value }))} /></div>
                    <div><label className={labelClass}>Parent or guardian *</label><input className={fieldClass} value={studentForm.parentName} onChange={event => setStudentForm(previous => ({ ...previous, parentName: event.target.value }))} /></div>
                    <div><label className={labelClass}>Family phone *</label><input inputMode="tel" className={fieldClass} value={studentForm.parentPhone} onChange={event => setStudentForm(previous => ({ ...previous, parentPhone: event.target.value }))} /></div>
                    <div><label className={labelClass}>Birth date{requiredStudentFields.birthDate ? ' *' : ''}</label><input type="date" className={fieldClass} value={studentForm.birthDate} onChange={event => setStudentForm(previous => ({ ...previous, birthDate: event.target.value }))} /></div>
                    <div><label className={labelClass}>School</label><input className={fieldClass} value={studentForm.school} onChange={event => setStudentForm(previous => ({ ...previous, school: event.target.value }))} /></div>
                    <div className="sm:col-span-2"><label className={labelClass}>Parent email <span className="font-medium text-slate-600">Optional</span></label><input type="email" className={fieldClass} value={studentForm.email} onChange={event => setStudentForm(previous => ({ ...previous, email: event.target.value }))} placeholder="Used for parent access" /></div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className={labelClass}>Program</p>
                  {readyPrograms.length === 0 ? (
                    <div className="border-y border-amber-300/20 py-6 text-center text-sm text-amber-200">No program is ready for enrollment. Add pricing and a valid class schedule first.</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {readyPrograms.map(program => {
                        const readiness = getProgramReadiness(program);
                        const startingPrice = Math.min(...program.packs.map(pack => Math.max(pack.priceAnnual || 0, pack.priceTrimester || 0, pack.price || 0, pack.promoPrice || 0)).filter(price => price > 0));
                        const isSelected = program.id === programForm.programId;
                        return (
                          <button key={program.id} type="button" onClick={() => selectProgram(program)} aria-pressed={isSelected} className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition ${isSelected ? 'border-teal-300/45 bg-teal-300/10' : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'}`}>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-teal-300 text-slate-950' : 'bg-white/[0.05] text-slate-400'}`}><GraduationCap size={18} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-white">{program.name}</span>
                              <span className="mt-1 block text-xs text-slate-500">{readiness.validGroups.length} class{readiness.validGroups.length === 1 ? '' : 'es'} / from {formatCurrency(startingPrice)}</span>
                              <span className="mt-0.5 block text-[10px] font-bold text-sky-300">{getProgramAccessSummary(program)}</span>
                            </span>
                            {isSelected && <CheckCircle2 size={17} className="text-teal-300" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedProgram && (
                  <>
                    <div>
                      <p className={labelClass}>Fee option</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedProgram.packs.map(pack => {
                          const price = Math.max(pack.priceAnnual || 0, pack.priceTrimester || 0, pack.price || 0, pack.promoPrice || 0);
                          const isSelected = pack.name === programForm.packName;
                          return (
                            <button key={pack.name} type="button" onClick={() => isStructuredCamp ? updateCampSelection({ packName: pack.name, moduleIds: [] }) : setProgramForm(previous => ({ ...previous, packName: pack.name }))} aria-pressed={isSelected} className={`flex min-h-14 items-center justify-between rounded-lg border px-3 py-2 text-left transition ${isSelected ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 hover:bg-white/[0.04]'}`}>
                              <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{pack.name}</span>{isStructuredCamp && <span className="mt-0.5 block text-[10px] font-bold text-slate-500">{pack.includedModuleCount === 2 ? 'Both weeks' : 'Choose one week'}</span>}</span>
                              <span className="ml-3 shrink-0 text-sm font-black text-teal-300">{formatCurrency(price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isStructuredCamp ? (
                    <div className="space-y-5 border-t border-white/10 pt-5">
                      <div>
                        <p className={labelClass}>Age group</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedProgram.grades.map(grade => {
                            const selected = programForm.gradeId === grade.id;
                            return <button key={grade.id} type="button" onClick={() => updateCampSelection({ gradeId: grade.id })} className={`min-h-12 rounded-lg border px-3 text-left text-sm font-bold transition ${selected ? 'border-teal-300/40 bg-teal-300/10 text-white' : 'border-white/10 text-slate-300 hover:bg-white/[0.04]'}`}>{grade.name}</button>;
                          })}
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Camp session</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedProgram.campSetup!.sessions.map(session => {
                            const selected = programForm.campSessionId === session.id;
                            return (
                              <button key={session.id} type="button" onClick={() => updateCampSelection({ campSessionId: session.id, moduleIds: [] })} className={`rounded-lg border p-3 text-left transition ${selected ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 hover:bg-white/[0.04]'}`}>
                                <span className="block text-sm font-black text-white">{session.name}</span>
                                <span className="mt-1 block text-xs text-slate-500">{session.startDate} to {session.endDate}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Shift</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedProgram.campSetup!.shifts.map(shift => {
                            const selected = programForm.campShiftId === shift.id;
                            return <button key={shift.id} type="button" onClick={() => updateCampSelection({ campShiftId: shift.id })} className={`flex min-h-12 items-center justify-between rounded-lg border px-3 text-left transition ${selected ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 hover:bg-white/[0.04]'}`}><span className="text-sm font-black text-white">{shift.label}</span><span className="text-xs font-bold text-slate-500">{shift.startTime} - {shift.endTime}</span></button>;
                          })}
                        </div>
                      </div>

                      {selectedCampSession && selectedPack && (
                        <div>
                          <p className={labelClass}>{selectedPack.includedModuleCount === 2 ? 'Weeks included' : 'Choose a week'}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {selectedCampSession.weeks.map(week => {
                              const selected = programForm.moduleIds.includes(week.id);
                              const fixed = selectedPack.includedModuleCount === 2;
                              return (
                                <button key={week.id} type="button" disabled={fixed} onClick={() => updateCampSelection({ moduleIds: [week.id] })} className={`rounded-lg border p-3 text-left transition ${selected ? 'border-amber-300/35 bg-amber-300/10' : 'border-white/10 hover:bg-white/[0.04]'} disabled:cursor-default`}>
                                  <span className="block text-sm font-black text-white">{week.label}</span>
                                  <span className="mt-1 block text-xs text-slate-500">{week.startDate} to {week.endDate}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {programForm.groupId && (
                        <div className="flex items-center gap-3 rounded-lg border border-teal-300/20 bg-teal-300/[0.07] p-3">
                          <CheckCircle2 size={18} className="shrink-0 text-teal-300" />
                          <p className="text-xs leading-5 text-teal-100">Atlas matched {selectedCampWeeks.map(week => week.label).join(' + ')}, {selectedCampShift?.label.toLowerCase()}, and {selectedProgram.grades.find(grade => grade.id === programForm.gradeId)?.name} to the correct attendance group{programForm.secondGroupId ? 's' : ''}.</p>
                        </div>
                      )}
                    </div>
                    ) : (
                    <div className="space-y-4">
                    <div>
                      <p className={labelClass}>Weekly class</p>
                      <div className="divide-y divide-white/[0.07] border-y border-white/10">
                        {groupChoices.map(choice => {
                          const isSelected = choice.group.id === programForm.groupId;
                          return (
                            <button key={choice.group.id} type="button" disabled={choice.isFull} onClick={() => selectGroup(choice.grade.id, choice.group.id)} aria-pressed={isSelected} className={`flex min-h-16 w-full items-center gap-3 px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${isSelected ? 'bg-teal-300/10' : 'hover:bg-white/[0.04]'}`}>
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-teal-300 text-slate-950' : 'bg-white/[0.05] text-slate-400'}`}><Clock3 size={17} /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-white">{choice.group.name} <span className="font-medium text-slate-500">/ {choice.grade.name}</span></span>
                                <span className="mt-1 block text-xs text-slate-500">{choice.group.day} at {choice.group.time}</span>
                              </span>
                              <span className={`shrink-0 text-xs font-bold ${choice.isFull ? 'text-red-300' : choice.seatsLeft !== null && choice.seatsLeft <= 3 ? 'text-amber-300' : 'text-slate-500'}`}>
                                {choice.capacity === null ? `${choice.rosterSize} enrolled` : choice.isFull ? 'Full' : `${choice.seatsLeft} seats left`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <details className="border-t border-white/10 pt-4" open={Boolean(programForm.secondGroupId)}>
                      <summary className="cursor-pointer text-xs font-bold text-slate-400">Add a second weekly class <span className="font-medium text-slate-600">Optional</span></summary>
                      <select className={`${fieldClass} mt-3`} value={programForm.secondGroupId} onChange={event => setProgramForm(previous => ({ ...previous, secondGroupId: event.target.value }))}>
                        <option value="">No second class</option>
                        {groupChoices.filter(choice => choice.group.id !== programForm.groupId && !choice.isFull).map(choice => <option key={choice.group.id} value={choice.group.id}>{choice.group.name} / {choice.group.day} {choice.group.time}</option>)}
                      </select>
                    </details>
                    </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <p className={labelClass}>Payment agreement</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {paymentPlans.map(plan => {
                      const isSelected = programForm.paymentPlan === plan.id;
                      return (
                        <button key={plan.id} type="button" onClick={() => setProgramForm(previous => ({ ...previous, paymentPlan: plan.id }))} aria-pressed={isSelected} className={`min-h-16 rounded-lg border px-2 py-2 text-left transition ${isSelected ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 hover:bg-white/[0.04]'}`}>
                          <span className="block text-xs font-black text-white">{plan.label}</span>
                          <span className="mt-1 block text-[10px] text-slate-500">{plan.helper}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 border-y border-white/10 py-5 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-end">
                  <div>
                    <label className={labelClass}>Agreed tuition fee</label>
                    <div className="relative">
                      <input type="number" min={0} className={`${fieldClass} pr-16 text-lg font-black`} value={negotiatedPrice || ''} onChange={event => setNegotiatedPrice(Number(event.target.value))} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">MAD</span>
                    </div>
                    {standardTuition > 0 && <p className="mt-1.5 text-xs text-slate-500">Listed fee {formatCurrency(standardTuition)}{discountAmount > 0 ? ` / ${discountPercent}% reduction` : ''}</p>}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] font-black uppercase text-slate-600">Open balance</p>
                    <p className={`mt-1 text-xl font-black ${remainingBalance > 0 ? 'text-amber-200' : 'text-emerald-300'}`}>{formatCurrency(Math.max(0, remainingBalance))}</p>
                    {pendingPayingNow > 0 && <p className="mt-1 text-[10px] font-bold text-sky-300">{formatCurrency(pendingPayingNow)} awaiting verification</p>}
                  </div>
                </div>

                <div>
                  <button type="button" onClick={() => setShowPaymentEntry(previous => !previous)} aria-expanded={showPaymentEntry} className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left transition ${showPaymentEntry ? 'border-teal-300/35 bg-teal-300/10' : 'border-white/10 hover:bg-white/[0.04]'}`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-teal-300"><Banknote size={17} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-black text-white">Record a payment today</span><span className="mt-0.5 block text-xs text-slate-500">Only use this when money or a check was received.</span></span>
                    <span className="text-xs font-black text-teal-300">{showPaymentEntry ? 'Hide' : 'Add'}</span>
                  </button>

                  {showPaymentEntry && (
                    <div className="mt-4 space-y-4 border-l-2 border-teal-300/25 pl-4">
                      {payments.length > 0 && (
                        <div className="divide-y divide-white/[0.07] border-y border-white/10">
                          {payments.map(payment => (
                            <div key={payment.id} className="flex items-center gap-3 py-2.5">
                              <ReceiptText size={16} className="text-emerald-300" />
                              <div className="min-w-0 flex-1"><p className="text-sm font-black text-white">{formatCurrency(Number(payment.amount))}</p><p className="text-xs capitalize text-slate-500">{payment.method === 'virement' ? 'Bank transfer' : payment.method}</p></div>
                              <button type="button" onClick={() => onRemovePayment(payment.id)} aria-label="Remove payment" title="Remove payment" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-400/10 hover:text-red-300"><Trash2 size={15} /></button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div><label className={labelClass}>Amount received</label><input type="number" min={0} className={fieldClass} value={currentPayment.amount} onChange={event => setCurrentPayment(previous => ({ ...previous, amount: event.target.value }))} /></div>
                        <div><label className={labelClass}>Method</label><select className={fieldClass} value={currentPayment.method} onChange={event => setCurrentPayment(previous => ({ ...previous, method: event.target.value }))}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Bank transfer</option></select></div>
                        <div><label className={labelClass}>Date received</label><input type="date" className={fieldClass} value={currentPayment.date} onChange={event => setCurrentPayment(previous => ({ ...previous, date: event.target.value }))} /></div>
                      </div>

                      {currentPayment.method === 'check' && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div><label className={labelClass}>Check number</label><input className={fieldClass} value={currentPayment.checkNumber} onChange={event => setCurrentPayment(previous => ({ ...previous, checkNumber: event.target.value }))} /></div>
                          <div><label className={labelClass}>Bank</label><input className={fieldClass} value={currentPayment.bankName} onChange={event => setCurrentPayment(previous => ({ ...previous, bankName: event.target.value }))} /></div>
                          <div><label className={labelClass}>Deposit date</label><input type="date" className={fieldClass} value={currentPayment.depositDate} onChange={event => setCurrentPayment(previous => ({ ...previous, depositDate: event.target.value }))} /></div>
                        </div>
                      )}

                      <button type="button" onClick={addPayment} className="flex h-10 items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-300/10 px-4 text-xs font-black text-teal-200 hover:bg-teal-300/15"><Plus size={15} /> Add payment</button>
                    </div>
                  )}
                </div>

                {programForm.paymentPlan !== 'full' && (
                  <details className="border-t border-white/10 pt-4" open={promises.length > 0}>
                    <summary className="cursor-pointer text-xs font-bold text-slate-400">Add a payment schedule <span className="font-medium text-slate-600">Optional</span></summary>
                    <div className="mt-4 space-y-3">
                      {promises.length > 0 && <div className="divide-y divide-white/[0.07] border-y border-white/10">{promises.map(promise => <div key={promise.id} className="flex items-center gap-3 py-2"><CalendarDays size={15} className="text-sky-300" /><span className="flex-1 text-sm text-slate-300">{promise.month}</span><span className="text-sm font-black text-white">{formatCurrency(Number(promise.amount))}</span><button type="button" onClick={() => onRemovePromise(promise.id)} aria-label="Remove scheduled payment" className="p-2 text-slate-500 hover:text-red-300"><Trash2 size={14} /></button></div>)}</div>}
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div><label className={labelClass}>Month</label><input type="month" className={fieldClass} value={currentPromise.month} onChange={event => setCurrentPromise(previous => ({ ...previous, month: event.target.value }))} /></div>
                        <div><label className={labelClass}>Amount</label><input type="number" min={0} className={fieldClass} value={currentPromise.amount} onChange={event => setCurrentPromise(previous => ({ ...previous, amount: event.target.value }))} /></div>
                        <button type="button" onClick={addPromise} aria-label="Add scheduled payment" title="Add scheduled payment" className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-400 text-slate-950"><Plus size={18} /></button>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Learner</p><p className="mt-2 font-black text-white">{displayStudentName}</p><p className="mt-1 text-xs text-slate-500">{selectedStudent ? 'Existing profile' : 'New profile will be created'}</p></div>
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Program</p><p className="mt-2 font-black text-white">{selectedProgram?.name}</p><p className="mt-1 text-xs text-slate-500">{selectedPack?.name}</p><p className="mt-1 text-[10px] font-bold text-sky-300">{getProgramAccessSummary(selectedProgram)}</p></div>
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Class</p><p className="mt-2 font-black text-white">{selectedGroupChoice?.group.name}</p><p className="mt-1 text-xs text-slate-500">{selectedGroupChoice?.group.day} at {selectedGroupChoice?.group.time}{selectedSecondGroup ? ` / plus ${selectedSecondGroup.group.day}` : ''}</p></div>
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Fee agreement</p><p className="mt-2 font-black text-white">{formatCurrency(negotiatedPrice)}</p><p className="mt-1 text-xs capitalize text-slate-500">{paymentPlans.find(plan => plan.id === programForm.paymentPlan)?.label || programForm.paymentPlan}</p></div>
                </div>

                <div className="flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-bold text-slate-400">Received today</p><p className="mt-1 text-lg font-black text-emerald-300">{formatCurrency(totalPayingNow)}</p></div>
                  <ChevronRight className="hidden text-slate-700 sm:block" />
                  <div className="sm:text-right"><p className="text-xs font-bold text-slate-400">Open balance</p><p className={`mt-1 text-lg font-black ${remainingBalance > 0 ? 'text-amber-200' : 'text-emerald-300'}`}>{formatCurrency(Math.max(0, remainingBalance))}</p>{pendingPayingNow > 0 && <p className="mt-1 text-[10px] font-bold text-sky-300">{formatCurrency(pendingPayingNow)} pending verification</p>}</div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-100">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                  <p>The enrollment will join this learner to the selected class, apply {getProgramAccessSummary(selectedProgram).toLowerCase()}, and open the agreed balance in Finance.</p>
                </div>
              </div>
            )}

            {stepError && <div role="alert" className="mt-5 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-sm font-bold text-red-200">{stepError}</div>}

            <footer className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0F1B2D]/95 py-4 backdrop-blur">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(previous => previous - 1)} className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-400 transition hover:bg-white/[0.04] hover:text-white"><ArrowLeft size={16} /> Back</button>
              ) : (
                <button type="button" onClick={onClose} className="h-11 rounded-lg px-3 text-sm font-bold text-slate-400 transition hover:bg-white/[0.04] hover:text-white">Cancel</button>
              )}

              {step < 4 ? (
                <button type="button" onClick={continueForward} className="flex h-11 items-center gap-2 rounded-lg bg-teal-300 px-5 text-sm font-black text-slate-950 transition hover:bg-teal-200 active:scale-[0.98]">Continue <ChevronRight size={16} /></button>
              ) : (
                <button type="button" onClick={finish} disabled={isSubmitting} className="flex h-11 items-center gap-2 rounded-lg bg-teal-300 px-5 text-sm font-black text-slate-950 transition hover:bg-teal-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Creating enrollment...' : 'Create enrollment'} <CheckCircle2 size={17} /></button>
              )}
            </footer>
          </div>
        </section>
      </div>
    </Modal>
  );
};
