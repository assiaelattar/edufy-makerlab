import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileBadge2,
  GraduationCap,
  Layers3,
  MapPin,
  Minus,
  Plus,
  QrCode,
  Rocket,
  School,
  Sparkles,
  Trash2,
  UsersRound,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import type {
  Grade,
  Group,
  Program,
  ProgramDocumentSetupDraft,
  ProgramPack,
  ProgramRegistrationSetupDraft,
  ProgramRunSetupDraft,
  ProgramScheduleSlot,
} from '../../types';
import type { ProgramFormatPreset } from '../../types/programOperations';
import { buildMakerLabSummerCampTemplate } from '../../utils/programTemplates';
import { Modal } from '../Modal';

interface ProgramSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialProgram: Partial<Program>;
  organizationId: string;
  isEditing: boolean;
  isSaving: boolean;
  externalError?: string;
  onSave: (draft: Partial<Program>) => void;
}

type EnrollmentPolicy = 'fixed_run' | 'rolling_membership' | 'modular';
type ProgramPublicationStatus = 'draft' | 'active';

interface ProgramEnrollmentPolicyFields {
  enrollmentPolicy: EnrollmentPolicy;
  membershipDurationMonths: number;
  allowJoinAnytime: boolean;
  moduleLabel: string;
}

type ProgramSetupSource = Omit<Partial<Program>, 'status' | 'enrollmentPolicy'> & Partial<Omit<ProgramEnrollmentPolicyFields, 'enrollmentPolicy'>> & {
  enrollmentPolicy?: EnrollmentPolicy | NonNullable<Program['enrollmentPolicy']>;
  status?: ProgramPublicationStatus | 'archived';
};

type WizardDraft = Omit<Partial<Program>, 'status' | 'enrollmentPolicy'> & ProgramEnrollmentPolicyFields & {
  status: ProgramPublicationStatus;
  name: string;
  description: string;
  formatPreset: ProgramFormatPreset;
  targetAudience: 'kids' | 'adults';
  runSetup: ProgramRunSetupDraft;
  grades: Grade[];
  packs: ProgramPack[];
  paymentTerms: string[];
  registrationSetup: ProgramRegistrationSetupDraft;
  documentSetup: ProgramDocumentSetupDraft;
  thumbnailUrl: string;
  brochureUrl: string;
};

type ProgramType = NonNullable<Program['type']>;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PRESETS: Array<{
  id: ProgramFormatPreset;
  label: string;
  helper: string;
  type: ProgramType;
  icon: LucideIcon;
}> = [
  { id: 'weekly_academy', label: 'Weekly academy', helper: 'Classes that repeat each week', type: 'Regular Program', icon: CalendarDays },
  { id: 'camp', label: 'Camp', helper: 'Several workshops across a short break', type: 'Holiday Camp', icon: Sparkles },
  { id: 'bootcamp', label: 'Bootcamp', helper: 'An intensive program with custom shifts', type: 'Internship', icon: Rocket },
  { id: 'one_day_workshop', label: 'One-day workshop', helper: 'A single focused learning day', type: 'Workshop', icon: Wand2 },
  { id: 'workshop_series', label: 'Workshop series', helper: 'A set of connected workshop dates', type: 'Workshop', icon: Layers3 },
  { id: 'school_term', label: 'School term', helper: 'A term-based learning program', type: 'Regular Program', icon: School },
  { id: 'custom', label: 'Custom', helper: 'Build the rhythm from scratch', type: 'Regular Program', icon: BookOpen },
];

const ENROLLMENT_POLICIES: Array<{
  id: EnrollmentPolicy;
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  { id: 'fixed_run', label: 'One shared run', helper: 'Everyone follows the same start and end dates.', icon: CalendarDays },
  { id: 'rolling_membership', label: 'Join anytime', helper: 'Each learner starts when they enroll and gets their own end date.', icon: Clock3 },
  { id: 'modular', label: 'Choose parts', helper: 'Families select weeks, modules, or other program parts.', icon: Layers3 },
];

const STEPS = [
  { id: 1, label: 'Format', helper: 'Program idea', icon: Sparkles },
  { id: 2, label: 'Dates', helper: 'Run and place', icon: CalendarDays },
  { id: 3, label: 'Groups', helper: 'Levels and timetable', icon: UsersRound },
  { id: 4, label: 'Offer', helper: 'Pricing and terms', icon: CircleDollarSign },
  { id: 5, label: 'Join', helper: 'Registration and files', icon: QrCode },
  { id: 6, label: 'Review', helper: 'Check and save', icon: CheckCircle2 },
];

const fieldClass = 'h-11 w-full rounded-lg border border-white/10 bg-slate-950/75 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/15';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-400';
const switchClass = 'relative h-6 w-11 shrink-0 rounded-full border border-white/10 transition';

let localId = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++localId}`;

const emptyScheduleBlock = (): ProgramScheduleSlot => ({
  id: makeId('slot'),
  day: 'Monday',
  startTime: '09:00',
  endTime: '10:30',
  shiftLabel: '',
});

const emptyGroup = (): Group => {
  const block = emptyScheduleBlock();
  return {
    id: makeId('group'),
    name: 'Group 1',
    day: block.day,
    time: block.startTime,
    capacity: 12,
    scheduleBlocks: [block],
  };
};

const emptyGrade = (organizationId: string): Grade => ({
  id: makeId('level'),
  organizationId,
  name: 'All levels',
  groups: [emptyGroup()],
});

const addMinutesToTime = (time: string, minutesToAdd: number) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return '';
  const totalMinutes = ((Number(match[1]) * 60) + Number(match[2]) + minutesToAdd) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const cloneGrades = (grades: Grade[] | undefined, organizationId: string): Grade[] => {
  if (!grades?.length) return [emptyGrade(organizationId)];
  return grades.map(grade => ({
    ...grade,
    id: grade.id || makeId('level'),
    organizationId: grade.organizationId || organizationId,
    groups: (grade.groups || []).map(group => {
      const blocks = group.scheduleBlocks?.length
        ? group.scheduleBlocks.map(block => ({ ...block, id: block.id || makeId('slot') }))
        : [{
            id: makeId('slot'),
            day: group.day || 'Monday',
            startTime: group.time || '09:00',
            endTime: addMinutesToTime(group.time || '09:00', 90),
            shiftLabel: '',
          }];
      return {
        ...group,
        id: group.id || makeId('group'),
        capacity: group.capacity ?? 12,
        scheduleBlocks: blocks,
        day: blocks[0]?.day || group.day || '',
        time: blocks[0]?.startTime || group.time || '',
      };
    }),
  }));
};

const inferPreset = (program: Partial<Program>): ProgramFormatPreset => {
  if (program.formatPreset) return program.formatPreset;
  if (program.type === 'Holiday Camp' || program.type === 'Camp') return 'camp';
  if (program.type === 'Workshop') return 'one_day_workshop';
  if (program.type === 'Internship') return 'bootcamp';
  return 'weekly_academy';
};

const createDraft = (program: Partial<Program>, organizationId: string): WizardDraft => {
  const source = program as ProgramSetupSource;
  const sourcePolicy = typeof source.enrollmentPolicy === 'string'
    ? source.enrollmentPolicy
    : source.enrollmentPolicy?.mode || 'fixed_run';
  const preset = inferPreset(program);
  return {
    ...program,
    id: program.id,
    organizationId: program.organizationId || organizationId,
    name: program.name || '',
    description: program.description || '',
    status: source.status === 'draft' ? 'draft' : 'active',
    type: program.type || PRESETS.find(item => item.id === preset)?.type || 'Regular Program',
    formatPreset: preset,
    targetAudience: program.targetAudience || 'kids',
    enrollmentPolicy: sourcePolicy,
    membershipDurationMonths: source.membershipDurationMonths || (typeof source.enrollmentPolicy === 'object' ? source.enrollmentPolicy.membershipDurationMonths : undefined) || 12,
    allowJoinAnytime: sourcePolicy === 'rolling_membership' ? true : (source.allowJoinAnytime ?? (typeof source.enrollmentPolicy === 'object' ? source.enrollmentPolicy.allowJoinAnytime : false)),
    moduleLabel: source.moduleLabel || (typeof source.enrollmentPolicy === 'object' ? source.enrollmentPolicy.moduleLabel : undefined) || 'Module',
    runSetup: {
      name: program.runSetup?.name || '',
      startDate: program.runSetup?.startDate || '',
      endDate: program.runSetup?.endDate || '',
      enrollmentOpenDate: program.runSetup?.enrollmentOpenDate || '',
      enrollmentCloseDate: program.runSetup?.enrollmentCloseDate || '',
      timezone: program.runSetup?.timezone || 'Africa/Casablanca',
      locationName: program.runSetup?.locationName || '',
    },
    grades: cloneGrades(program.grades, program.organizationId || organizationId),
    packs: program.packs?.length ? program.packs.map(pack => ({ ...pack })) : [{ name: 'Standard' }],
    paymentTerms: [...(program.paymentTerms || [])],
    registrationSetup: {
      enabled: program.registrationSetup?.enabled ?? true,
      mode: program.registrationSetup?.mode || 'fast',
      allowWaitlist: program.registrationSetup?.allowWaitlist ?? true,
      requiresReview: program.registrationSetup?.requiresReview ?? true,
      qrEnabled: program.registrationSetup?.qrEnabled ?? true,
    },
    documentSetup: {
      registrationConfirmation: program.documentSetup?.registrationConfirmation ?? true,
      enrollmentAttestation: program.documentSetup?.enrollmentAttestation ?? false,
      completionCertificate: program.documentSetup?.completionCertificate ?? false,
    },
    thumbnailUrl: program.thumbnailUrl || '',
    brochureUrl: program.brochureUrl || '',
  };
};

const isRecurringPrice = (preset: ProgramFormatPreset) => preset === 'weekly_academy' || preset === 'school_term';

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  helper: string;
  icon?: LucideIcon;
}> = ({ checked, onChange, label, helper, icon: Icon }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center gap-3 border-b border-white/[0.07] py-3 text-left last:border-b-0"
  >
    {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${checked ? 'bg-teal-300/12 text-teal-200' : 'bg-white/[0.04] text-slate-500'}`}><Icon size={17} /></span>}
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-white">{label}</span>
      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{helper}</span>
    </span>
    <span className={`${switchClass} ${checked ? 'bg-teal-300' : 'bg-slate-800'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </span>
  </button>
);

export const ProgramSetupWizard: React.FC<ProgramSetupWizardProps> = ({
  isOpen,
  onClose,
  initialProgram,
  organizationId,
  isEditing,
  isSaving,
  externalError,
  onSave,
}) => {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(() => createDraft(initialProgram, organizationId));
  const [stepError, setStepError] = useState('');
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(createDraft(initialProgram, organizationId));
    setStep(1);
    setStepError('');
  }, [isOpen, initialProgram, organizationId]);

  useEffect(() => {
    if (!isOpen) return;
    setStepError('');
    requestAnimationFrame(() => stepHeadingRef.current?.focus({ preventScroll: true }));
  }, [isOpen, step]);

  const totalGroups = useMemo(
    () => draft.grades.reduce((total, grade) => total + grade.groups.length, 0),
    [draft.grades]
  );
  const totalBlocks = useMemo(
    () => draft.grades.reduce((total, grade) => total + grade.groups.reduce((sum, group) => sum + (group.scheduleBlocks?.length || 0), 0), 0),
    [draft.grades]
  );
  const totalCapacity = useMemo(
    () => draft.grades.reduce((total, grade) => total + grade.groups.reduce((sum, group) => sum + (Number(group.capacity) || 0), 0), 0),
    [draft.grades]
  );
  const selectedPreset = PRESETS.find(preset => preset.id === draft.formatPreset) || PRESETS[0];
  const selectedEnrollmentPolicy = ENROLLMENT_POLICIES.find(policy => policy.id === draft.enrollmentPolicy) || ENROLLMENT_POLICIES[0];
  const recurringPrice = isRecurringPrice(draft.formatPreset);

  const updateRun = (patch: Partial<ProgramRunSetupDraft>) => {
    setDraft(previous => ({ ...previous, runSetup: { ...previous.runSetup, ...patch } }));
  };

  const chooseEnrollmentPolicy = (enrollmentPolicy: EnrollmentPolicy) => {
    setDraft(previous => ({
      ...previous,
      enrollmentPolicy,
      allowJoinAnytime: enrollmentPolicy === 'rolling_membership' ? true : enrollmentPolicy === 'modular',
      membershipDurationMonths: previous.membershipDurationMonths || 12,
      moduleLabel: previous.moduleLabel || 'Module',
    }));
  };

  const updateRegistration = (patch: Partial<ProgramRegistrationSetupDraft>) => {
    setDraft(previous => ({ ...previous, registrationSetup: { ...previous.registrationSetup, ...patch } }));
  };

  const updateDocuments = (patch: Partial<ProgramDocumentSetupDraft>) => {
    setDraft(previous => ({ ...previous, documentSetup: { ...previous.documentSetup, ...patch } }));
  };

  const choosePreset = (preset: typeof PRESETS[number]) => {
    setDraft(previous => ({ ...previous, formatPreset: preset.id, type: preset.type }));
  };

  const applyMakerLabCampTemplate = () => {
    const preferredYear = Number((draft.runSetup.startDate || '').slice(0, 4)) || new Date().getFullYear();
    setDraft(createDraft(buildMakerLabSummerCampTemplate(organizationId, preferredYear), organizationId));
    setStepError('');
  };

  const shiftCampDate = (value: string, days: number) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return value;
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const updateCampSession = (sessionIndex: number, patch: Partial<NonNullable<Program['campSetup']>['sessions'][number]>) => {
    setDraft(previous => {
      const currentSession = previous.campSetup?.sessions[sessionIndex];
      if (!previous.campSetup || !currentSession) return previous;
      return {
      ...previous,
      campSetup: {
        ...previous.campSetup,
        sessions: previous.campSetup.sessions.map((session, index) => {
          if (index !== sessionIndex) return session;
          if (!patch.startDate) return { ...session, ...patch };
          return {
            ...session,
            ...patch,
            endDate: shiftCampDate(patch.startDate, 11),
            weeks: session.weeks.map((week, weekIndex) => {
              const weekStart = shiftCampDate(patch.startDate!, weekIndex * 7);
              return { ...week, startDate: weekStart, endDate: shiftCampDate(weekStart, 4) };
            }),
          };
        }),
      },
      grades: patch.name ? previous.grades.map(grade => ({
        ...grade,
        groups: grade.groups.map(group => group.campSessionId === currentSession.id && group.name.startsWith(`${currentSession.name} / `)
          ? { ...group, name: `${patch.name}${group.name.slice(currentSession.name.length)}` }
          : group),
      })) : previous.grades,
    };
    });
  };

  const updateCampShift = (shiftIndex: number, patch: Partial<NonNullable<Program['campSetup']>['shifts'][number]>) => {
    setDraft(previous => {
      const currentShift = previous.campSetup?.shifts[shiftIndex];
      if (!previous.campSetup || !currentShift) return previous;
      const nextShift = { ...currentShift, ...patch };
      return {
        ...previous,
        campSetup: {
          ...previous.campSetup,
          shifts: previous.campSetup.shifts.map((shift, index) => index === shiftIndex ? nextShift : shift),
        },
        grades: previous.grades.map(grade => ({
          ...grade,
          groups: grade.groups.map(group => group.campShiftId !== currentShift.id ? group : {
            ...group,
            name: group.name.endsWith(` / ${currentShift.label}`) ? `${group.name.slice(0, -currentShift.label.length)}${nextShift.label}` : group.name,
            time: nextShift.startTime,
            scheduleBlocks: group.scheduleBlocks?.map(block => ({
              ...block,
              startTime: nextShift.startTime,
              endTime: nextShift.endTime,
              shiftLabel: nextShift.label,
            })),
          }),
        })),
      };
    });
  };

  const updateGrade = (gradeIndex: number, patch: Partial<Grade>) => {
    setDraft(previous => ({
      ...previous,
      grades: previous.grades.map((grade, index) => index === gradeIndex ? { ...grade, ...patch } : grade),
    }));
  };

  const addGrade = () => {
    setDraft(previous => ({ ...previous, grades: [...previous.grades, emptyGrade(previous.organizationId || organizationId)] }));
  };

  const removeGrade = (gradeIndex: number) => {
    setDraft(previous => ({ ...previous, grades: previous.grades.filter((_, index) => index !== gradeIndex) }));
  };

  const addGroup = (gradeIndex: number) => {
    setDraft(previous => ({
      ...previous,
      grades: previous.grades.map((grade, index) => index === gradeIndex
        ? { ...grade, groups: [...grade.groups, { ...emptyGroup(), name: `Group ${grade.groups.length + 1}` }] }
        : grade),
    }));
  };

  const updateGroup = (gradeIndex: number, groupIndex: number, patch: Partial<Group>) => {
    setDraft(previous => ({
      ...previous,
      grades: previous.grades.map((grade, index) => index === gradeIndex
        ? { ...grade, groups: grade.groups.map((group, innerIndex) => innerIndex === groupIndex ? { ...group, ...patch } : group) }
        : grade),
    }));
  };

  const removeGroup = (gradeIndex: number, groupIndex: number) => {
    setDraft(previous => ({
      ...previous,
      grades: previous.grades.map((grade, index) => index === gradeIndex
        ? { ...grade, groups: grade.groups.filter((_, innerIndex) => innerIndex !== groupIndex) }
        : grade),
    }));
  };

  const addScheduleBlock = (gradeIndex: number, groupIndex: number) => {
    const group = draft.grades[gradeIndex]?.groups[groupIndex];
    updateGroup(gradeIndex, groupIndex, { scheduleBlocks: [...(group?.scheduleBlocks || []), emptyScheduleBlock()] });
  };

  const updateScheduleBlock = (gradeIndex: number, groupIndex: number, blockIndex: number, patch: Partial<ProgramScheduleSlot>) => {
    const group = draft.grades[gradeIndex]?.groups[groupIndex];
    if (!group) return;
    const blocks = (group.scheduleBlocks || []).map((block, index) => index === blockIndex ? { ...block, ...patch } : block);
    updateGroup(gradeIndex, groupIndex, {
      scheduleBlocks: blocks,
      day: blocks[0]?.day || '',
      time: blocks[0]?.startTime || '',
    });
  };

  const removeScheduleBlock = (gradeIndex: number, groupIndex: number, blockIndex: number) => {
    const group = draft.grades[gradeIndex]?.groups[groupIndex];
    if (!group) return;
    const blocks = (group.scheduleBlocks || []).filter((_, index) => index !== blockIndex);
    updateGroup(gradeIndex, groupIndex, {
      scheduleBlocks: blocks,
      day: blocks[0]?.day || '',
      time: blocks[0]?.startTime || '',
    });
  };

  const updatePack = (packIndex: number, patch: Partial<ProgramPack>) => {
    setDraft(previous => ({
      ...previous,
      packs: previous.packs.map((pack, index) => index === packIndex ? { ...pack, ...patch } : pack),
    }));
  };

  const addPack = () => {
    setDraft(previous => ({ ...previous, packs: [...previous.packs, { name: `Option ${previous.packs.length + 1}` }] }));
  };

  const removePack = (packIndex: number) => {
    setDraft(previous => ({ ...previous, packs: previous.packs.filter((_, index) => index !== packIndex) }));
  };

  const validateStep = (targetStep = step) => {
    if (targetStep === 1) {
      if (!draft.name.trim()) return 'Give the program a clear name to continue.';
      if (!draft.description.trim()) return 'Add a short description so families understand the program.';
    }
    if (targetStep === 2) {
      if (!draft.runSetup.startDate || !draft.runSetup.endDate) return 'Choose the first and last day of this run.';
      if (draft.runSetup.endDate < draft.runSetup.startDate) return 'The last day must be after the first day.';
      if (draft.runSetup.enrollmentOpenDate && draft.runSetup.enrollmentCloseDate && draft.runSetup.enrollmentCloseDate < draft.runSetup.enrollmentOpenDate) return 'Registration must close after it opens.';
      if (!draft.runSetup.timezone.trim()) return 'Choose the timezone used for this timetable.';
      if (draft.enrollmentPolicy === 'rolling_membership' && (draft.membershipDurationMonths < 1 || draft.membershipDurationMonths > 36)) return 'Choose a membership duration between 1 and 36 months.';
      if (draft.enrollmentPolicy === 'modular' && !draft.moduleLabel.trim()) return 'Name the parts families can choose, such as Week or Module.';
    }
    if (targetStep === 3) {
      if (!draft.grades.length) return 'Add at least one level.';
      for (const grade of draft.grades) {
        if (!grade.name.trim()) return 'Name every level before continuing.';
        if (!grade.groups.length) return `Add at least one group to ${grade.name}.`;
        for (const group of grade.groups) {
          if (!group.name.trim()) return `Name every group in ${grade.name}.`;
          if (!Number(group.capacity) || Number(group.capacity) < 1) return `Enter a capacity for ${group.name}.`;
          if (!group.scheduleBlocks?.length) return `Add at least one class time to ${group.name}.`;
          for (const block of group.scheduleBlocks) {
            if (!block.day || !block.startTime || !block.endTime) return `Complete every class time in ${group.name}.`;
            if (block.endTime <= block.startTime) return `The end time must be later than the start time in ${group.name}.`;
          }
        }
      }
    }
    if (targetStep === 4) {
      if (!draft.packs.length) return 'Add at least one price option.';
      for (const pack of draft.packs) {
        if (!pack.name.trim()) return 'Name every price option.';
        const basePrice = recurringPrice ? Number(pack.priceAnnual || pack.priceTrimester || 0) : Number(pack.price || 0);
        if (basePrice <= 0) return `Enter a price for ${pack.name}.`;
        if (Number(pack.promoPrice || 0) < 0) return `The promotion price for ${pack.name} cannot be negative.`;
      }
    }
    return '';
  };

  const continueForward = () => {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStep(previous => Math.min(6, previous + 1));
  };

  const normalizeDraft = (): Partial<Program> => {
    const { enrollmentPolicy, membershipDurationMonths, allowJoinAnytime, moduleLabel, ...programDraft } = draft;
    return {
    ...programDraft,
    organizationId: draft.organizationId || organizationId,
    name: draft.name.trim(),
    description: draft.description.trim(),
    enrollmentPolicy: {
      mode: enrollmentPolicy,
      membershipDurationMonths: enrollmentPolicy === 'rolling_membership'
        ? Math.min(36, Math.max(1, Number(membershipDurationMonths) || 12))
        : undefined,
      allowJoinAnytime: enrollmentPolicy === 'rolling_membership' ? true : allowJoinAnytime,
      moduleLabel: enrollmentPolicy === 'modular' ? (moduleLabel.trim() || 'Module') : undefined,
    },
    runSetup: {
      ...draft.runSetup,
      name: draft.runSetup.name?.trim() || undefined,
      timezone: draft.runSetup.timezone.trim(),
      locationName: draft.runSetup.locationName?.trim() || undefined,
      enrollmentOpenDate: draft.runSetup.enrollmentOpenDate || undefined,
      enrollmentCloseDate: draft.runSetup.enrollmentCloseDate || undefined,
    },
    grades: draft.grades.map(grade => ({
      ...grade,
      organizationId: grade.organizationId || organizationId,
      name: grade.name.trim(),
      groups: grade.groups.map(group => {
        const blocks = (group.scheduleBlocks || []).map(block => ({
          ...block,
          day: block.day.trim(),
          startTime: block.startTime.trim(),
          endTime: block.endTime.trim(),
          shiftLabel: block.shiftLabel?.trim() || undefined,
        }));
        return {
          ...group,
          name: group.name.trim(),
          capacity: Number(group.capacity),
          scheduleBlocks: blocks,
          day: blocks[0]?.day || '',
          time: blocks[0]?.startTime || '',
        };
      }),
    })),
    packs: draft.packs.map(pack => ({
      ...pack,
      name: pack.name.trim(),
      workshopsPerWeek: pack.workshopsPerWeek ? Number(pack.workshopsPerWeek) : undefined,
      price: pack.price ? Number(pack.price) : undefined,
      priceAnnual: pack.priceAnnual ? Number(pack.priceAnnual) : undefined,
      priceTrimester: pack.priceTrimester ? Number(pack.priceTrimester) : undefined,
      promoPrice: pack.promoPrice ? Number(pack.promoPrice) : undefined,
    })),
    paymentTerms: draft.paymentTerms.map(term => term.trim()).filter(Boolean),
    discountAvailable: draft.packs.some(pack => Number(pack.promoPrice || 0) > 0),
    discountPromoPrice: undefined,
    discountEndDate: draft.discountEndDate || undefined,
    thumbnailUrl: draft.thumbnailUrl.trim() || undefined,
    brochureUrl: draft.brochureUrl.trim() || undefined,
    };
  };

  const finish = () => {
    for (let targetStep = 1; targetStep <= 4; targetStep += 1) {
      const error = validateStep(targetStep);
      if (error) {
        setStep(targetStep);
        setStepError(error);
        return;
      }
    }
    onSave(normalizeDraft());
  };

  const reviewWarnings = [
    !draft.runSetup.locationName?.trim() ? 'Add a location before publishing so families know where to arrive.' : '',
    draft.registrationSetup.enabled && !draft.registrationSetup.qrEnabled ? 'Online registration is on, but QR access is off.' : '',
    !draft.documentSetup.registrationConfirmation ? 'Families will not receive a registration confirmation from this setup.' : '',
    !draft.thumbnailUrl.trim() ? 'A cover image can make the registration page easier to recognize.' : '',
  ].filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit program setup' : 'Create a program'} size="xl">
      <div className="min-h-[34rem]">
        <div className="mb-5 flex gap-2 overflow-x-auto border-b border-white/10 pb-3 lg:hidden">
          {STEPS.map(item => {
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
                aria-label={`Step ${item.id}: ${item.label}`}
                className={`flex h-10 min-w-10 items-center justify-center rounded-lg border transition ${isActive ? 'border-teal-300/40 bg-teal-300 text-slate-950' : isDone ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-300' : 'border-white/10 text-slate-600'}`}
              >
                {isDone ? <Check size={15} /> : <Icon size={15} />}
              </button>
            );
          })}
        </div>

        <div className="grid gap-0 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/10 pr-4 lg:block">
            <div className="sticky top-0">
              <div className="space-y-1">
                {STEPS.map(item => {
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
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${isActive ? 'border-teal-300/35 bg-teal-300/10 text-teal-100' : isDone ? 'border-transparent text-slate-300 hover:bg-white/[0.04]' : 'border-transparent text-slate-600'}`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isActive ? 'bg-teal-300 text-slate-950' : isDone ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.04]'}`}>
                        {isDone ? <Check size={14} /> : <Icon size={14} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.helper}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-[10px] font-black uppercase text-slate-600">Live program brief</p>
                <p className="mt-2 truncate text-sm font-black text-white" title={draft.name}>{draft.name || 'Untitled program'}</p>
                <p className="mt-1 text-xs text-teal-300">{selectedPreset.label}</p>
                <div className="mt-3 space-y-2 text-xs text-slate-500">
                  <p className="flex items-center gap-2"><CalendarDays size={13} /> {draft.runSetup.startDate || 'Dates not set'}</p>
                  <p className="flex items-center gap-2"><UsersRound size={13} /> {totalGroups} {totalGroups === 1 ? 'group' : 'groups'} / {totalCapacity} seats</p>
                  <p className="flex items-center gap-2"><Clock3 size={13} /> {totalBlocks} class {totalBlocks === 1 ? 'time' : 'times'}</p>
                  <p className="flex items-center gap-2"><CircleDollarSign size={13} /> {draft.packs.length} price {draft.packs.length === 1 ? 'option' : 'options'}</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 lg:pl-5">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase text-teal-300">Step {step} of 6</p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-xl font-black text-white outline-none sm:text-2xl">
                {step === 1 && 'What are you running?'}
                {step === 2 && 'When and where?'}
                {step === 3 && 'Build the learning rhythm'}
                {step === 4 && 'Make the offer clear'}
                {step === 5 && 'How can families join?'}
                {step === 6 && 'Ready for your team'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {step === 1 && 'Start with the closest format. You can still customize every detail.'}
                {step === 2 && 'Define this run without changing the reusable program idea.'}
                {step === 3 && 'Create levels, groups, capacity, and every class shift in one place.'}
                {step === 4 && 'Give families simple choices with prices they can understand.'}
                {step === 5 && 'Choose the registration route and documents this program prepares.'}
                {step === 6 && 'Review the plain-language plan before saving it.'}
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={applyMakerLabCampTemplate}
                    className="flex w-full items-center gap-4 rounded-lg border border-teal-300/30 bg-teal-300/[0.08] p-4 text-left transition hover:border-teal-300/50 hover:bg-teal-300/[0.12]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-300 text-slate-950"><Sparkles size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-teal-300">MakerLab ready template</span>
                      <span className="mt-1 block text-sm font-black text-white">Summer Camp / sessions, shifts, weeks, and age groups</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-400">Loads four two-week sessions, morning and afternoon shifts, two age bands, and one-week or full-session pricing.</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-teal-300" />
                  </button>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {PRESETS.map(preset => {
                    const Icon = preset.icon;
                    const selected = draft.formatPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => choosePreset(preset)}
                        aria-pressed={selected}
                        className={`flex min-h-[4.75rem] items-center gap-3 rounded-lg border p-3 text-left transition active:scale-[0.99] ${selected ? 'border-teal-300/45 bg-teal-300/10' : 'border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-white/[0.03]'}`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-teal-300 text-slate-950' : 'bg-white/[0.05] text-slate-400'}`}><Icon size={19} /></span>
                        <span className="min-w-0"><span className="block text-sm font-black text-white">{preset.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{preset.helper}</span></span>
                        {selected && <CheckCircle2 size={17} className="ml-auto shrink-0 text-teal-300" />}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <div><label className={labelClass}>Program name</label><input autoFocus className={fieldClass} value={draft.name} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} placeholder="Robotics Explorers" /></div>
                  <div><label className={labelClass}>For</label><select className={fieldClass} value={draft.targetAudience} onChange={event => setDraft(previous => ({ ...previous, targetAudience: event.target.value as 'kids' | 'adults' }))}><option value="kids">Children</option><option value="adults">Adults</option></select></div>
                  <div className="sm:col-span-2"><label className={labelClass}>Short description</label><textarea className={`${fieldClass} h-24 resize-none py-3 leading-6`} value={draft.description} onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))} placeholder="What will learners make, practice, or achieve?" /></div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className={labelClass}>How do learner dates work?</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ENROLLMENT_POLICIES.map(policy => {
                      const Icon = policy.icon;
                      const selected = draft.enrollmentPolicy === policy.id;
                      return (
                        <button
                          key={policy.id}
                          type="button"
                          onClick={() => chooseEnrollmentPolicy(policy.id)}
                          aria-pressed={selected}
                          className={`flex min-h-[7.5rem] flex-col items-start rounded-lg border p-3 text-left transition active:scale-[0.99] ${selected ? 'border-teal-300/45 bg-teal-300/10' : 'border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-white/[0.03]'}`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-teal-300 text-slate-950' : 'bg-white/[0.05] text-slate-400'}`}><Icon size={17} /></span>
                          <span className="mt-3 text-sm font-black text-white">{policy.label}</span>
                          <span className="mt-1 text-xs leading-5 text-slate-500">{policy.helper}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {draft.enrollmentPolicy === 'rolling_membership' && (
                  <div className="rounded-lg border border-sky-300/20 bg-sky-300/[0.07] p-3">
                    <div className="flex items-start gap-3">
                      <Clock3 size={18} className="mt-0.5 shrink-0 text-sky-300" />
                      <div>
                        <p className="text-sm font-black text-sky-100">StemQuest-style rolling dates</p>
                        <p className="mt-1 text-xs leading-5 text-sky-100/65">The dates below show when the program operates. A learner can join during that window, and Edufy gives them a personal end date based on the day they join.</p>
                      </div>
                    </div>
                    <div className="mt-3 max-w-[13rem]">
                      <label className={labelClass}>Membership duration</label>
                      <div className="relative"><input type="number" min={1} max={36} className={`${fieldClass} pr-16`} value={draft.membershipDurationMonths} onChange={event => setDraft(previous => ({ ...previous, membershipDurationMonths: Number(event.target.value) }))} /><span className="pointer-events-none absolute right-3 top-3.5 text-xs font-bold text-slate-500">months</span></div>
                    </div>
                  </div>
                )}

                {draft.enrollmentPolicy === 'modular' && (
                  <div className="grid gap-4 rounded-lg border border-white/10 bg-slate-950/30 p-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-end">
                    <div><p className="text-sm font-black text-white">Families build their own route</p><p className="mt-1 text-xs leading-5 text-slate-500">Use a simple singular name for each selectable part. Edufy can show choices such as Week 1, Week 2 or Module 1, Module 2.</p></div>
                    <div><label className={labelClass}>Call each part</label><input className={fieldClass} value={draft.moduleLabel} onChange={event => setDraft(previous => ({ ...previous, moduleLabel: event.target.value }))} placeholder="Week or Module" /></div>
                  </div>
                )}

                {draft.enrollmentPolicy !== 'rolling_membership' && (
                  <Toggle
                    checked={draft.allowJoinAnytime}
                    onChange={checked => setDraft(previous => ({ ...previous, allowJoinAnytime: checked }))}
                    label="Allow learners to join after the start"
                    helper={draft.enrollmentPolicy === 'fixed_run' ? 'Late joiners still finish on the shared program end date.' : `Families can select available ${draft.moduleLabel.trim() || 'module'} options after the program starts.`}
                    icon={UsersRound}
                  />
                )}

                {draft.formatPreset === 'camp' && draft.campSetup && (
                  <div className="space-y-4 border-y border-white/10 py-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200"><CalendarDays size={17} /></span>
                      <div>
                        <p className="text-sm font-black text-white">Camp sessions</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Each session contains two selectable weeks. Change the dates here after duplicating the template for a new year.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {draft.campSetup.sessions.map((session, sessionIndex) => (
                        <div key={session.id} className="grid gap-2 rounded-lg border border-white/10 bg-slate-950/30 p-3 sm:grid-cols-[minmax(8rem,1fr)_9rem_9rem]">
                          <div><label className={labelClass}>Session</label><input className={fieldClass} value={session.name} onChange={event => updateCampSession(sessionIndex, { name: event.target.value })} /></div>
                          <div><label className={labelClass}>Starts</label><input type="date" className={fieldClass} value={session.startDate} onChange={event => updateCampSession(sessionIndex, { startDate: event.target.value })} /></div>
                          <div><label className={labelClass}>Ends</label><input type="date" readOnly className={`${fieldClass} cursor-default opacity-70`} value={session.endDate} /></div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {draft.campSetup.shifts.map((shift, shiftIndex) => (
                        <div key={shift.id} className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] gap-2 rounded-lg border border-white/10 bg-slate-950/30 p-3">
                          <div><label className={labelClass}>Shift</label><input className={fieldClass} value={shift.label} onChange={event => updateCampShift(shiftIndex, { label: event.target.value })} /></div>
                          <div><label className={labelClass}>Starts</label><input type="time" className={fieldClass} value={shift.startTime} onChange={event => updateCampShift(shiftIndex, { startTime: event.target.value })} /></div>
                          <div><label className={labelClass}>Ends</label><input type="time" className={fieldClass} value={shift.endTime} onChange={event => updateCampShift(shiftIndex, { endTime: event.target.value })} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className={labelClass}>Run name <span className="font-medium text-slate-600">Optional</span></label><input className={fieldClass} value={draft.runSetup.name || ''} onChange={event => updateRun({ name: event.target.value })} placeholder="Spring 2027 / Week 1 / Cohort A" /></div>
                  <div><label className={labelClass}>{draft.enrollmentPolicy === 'rolling_membership' ? 'Program available from' : 'Starts'}</label><input type="date" className={fieldClass} value={draft.runSetup.startDate} onChange={event => updateRun({ startDate: event.target.value })} /></div>
                  <div><label className={labelClass}>{draft.enrollmentPolicy === 'rolling_membership' ? 'Program available until' : 'Ends'}</label><input type="date" className={fieldClass} value={draft.runSetup.endDate} onChange={event => updateRun({ endDate: event.target.value })} /></div>
                </div>

                <div className="grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                  <div><label className={labelClass}>Registration opens <span className="font-medium text-slate-600">Optional</span></label><input type="date" className={fieldClass} value={draft.runSetup.enrollmentOpenDate || ''} onChange={event => updateRun({ enrollmentOpenDate: event.target.value })} /></div>
                  <div><label className={labelClass}>Registration closes <span className="font-medium text-slate-600">Optional</span></label><input type="date" className={fieldClass} value={draft.runSetup.enrollmentCloseDate || ''} onChange={event => updateRun({ enrollmentCloseDate: event.target.value })} /></div>
                  <div><label className={labelClass}>Timezone</label><input className={fieldClass} value={draft.runSetup.timezone} onChange={event => updateRun({ timezone: event.target.value })} /></div>
                  <div><label className={labelClass}>Location <span className="font-medium text-slate-600">Optional</span></label><div className="relative"><MapPin size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-600" /><input className={`${fieldClass} pl-9`} value={draft.runSetup.locationName || ''} onChange={event => updateRun({ locationName: event.target.value })} placeholder="MakerLab Academy" /></div></div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {draft.grades.map((grade, gradeIndex) => (
                  <div key={grade.id} className="border-b border-white/10 pb-5 last:border-b-0">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1"><label className={labelClass}>Level {gradeIndex + 1}</label><input className={fieldClass} value={grade.name} onChange={event => updateGrade(gradeIndex, { name: event.target.value })} placeholder="Beginner / Ages 8-10" /></div>
                      <button type="button" onClick={() => removeGrade(gradeIndex)} disabled={draft.grades.length === 1} aria-label={`Remove ${grade.name || 'level'}`} title="Remove level" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-red-300/20 hover:bg-red-300/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={16} /></button>
                    </div>

                    <div className="mt-4 space-y-4 border-l-2 border-teal-300/20 pl-3 sm:pl-4">
                      {grade.groups.map((group, groupIndex) => (
                        <div key={group.id} className="space-y-3 rounded-lg border border-white/10 bg-slate-950/30 p-3">
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                            <div><label className={labelClass}>Group</label><input className={fieldClass} value={group.name} onChange={event => updateGroup(gradeIndex, groupIndex, { name: event.target.value })} placeholder="Saturday AM" /></div>
                            <div><label className={labelClass}>Capacity</label><input type="number" min={1} className={fieldClass} value={group.capacity ?? ''} onChange={event => updateGroup(gradeIndex, groupIndex, { capacity: Number(event.target.value) })} /></div>
                            <button type="button" onClick={() => removeGroup(gradeIndex, groupIndex)} disabled={grade.groups.length === 1} aria-label={`Remove ${group.name || 'group'}`} title="Remove group" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-300/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={15} /></button>
                          </div>

                          <div className="space-y-2">
                            {(group.scheduleBlocks || []).map((block, blockIndex) => (
                              <div key={block.id} className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_minmax(6rem,1fr)_auto] sm:items-end">
                                <div><label className={labelClass}>{blockIndex === 0 ? 'Day' : `Day ${blockIndex + 1}`}</label><select className={fieldClass} value={block.day} onChange={event => updateScheduleBlock(gradeIndex, groupIndex, blockIndex, { day: event.target.value })}>{DAYS.map(day => <option key={day}>{day}</option>)}</select></div>
                                <div><label className={labelClass}>Starts</label><input type="time" className={fieldClass} value={block.startTime} onChange={event => updateScheduleBlock(gradeIndex, groupIndex, blockIndex, { startTime: event.target.value })} /></div>
                                <div><label className={labelClass}>Ends</label><input type="time" className={fieldClass} value={block.endTime} onChange={event => updateScheduleBlock(gradeIndex, groupIndex, blockIndex, { endTime: event.target.value })} /></div>
                                <div><label className={labelClass}>Shift <span className="font-medium text-slate-600">Optional</span></label><input className={fieldClass} value={block.shiftLabel || ''} onChange={event => updateScheduleBlock(gradeIndex, groupIndex, blockIndex, { shiftLabel: event.target.value })} placeholder="Morning" /></div>
                                <button type="button" onClick={() => removeScheduleBlock(gradeIndex, groupIndex, blockIndex)} disabled={(group.scheduleBlocks?.length || 0) === 1} aria-label="Remove class time" title="Remove class time" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-300/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"><Minus size={15} /></button>
                              </div>
                            ))}
                          </div>

                          <button type="button" onClick={() => addScheduleBlock(gradeIndex, groupIndex)} className="flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-black text-teal-300 transition hover:bg-teal-300/10"><Plus size={14} /> Add another class time</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addGroup(gradeIndex)} className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-xs font-black text-slate-400 transition hover:border-teal-300/30 hover:text-teal-300"><Plus size={15} /> Add group</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addGrade} className="flex h-11 items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-300/10 px-4 text-sm font-black text-teal-200 transition hover:bg-teal-300/15"><Plus size={16} /> Add level</button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-300/10 text-teal-300"><CircleDollarSign size={19} /></span>
                  <div><p className="text-sm font-black text-white">{recurringPrice ? 'Recurring program prices' : 'One-time program prices'}</p><p className="mt-0.5 text-xs text-slate-500">{recurringPrice ? 'Offer annual and term choices for each pack.' : 'Set one clear price for each option.'}</p></div>
                </div>

                <div className="space-y-4">
                  {draft.packs.map((pack, packIndex) => (
                    <div key={packIndex} className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/30 p-3 sm:grid-cols-2">
                      <div className="sm:col-span-2 flex items-end gap-2">
                        <div className="min-w-0 flex-1"><label className={labelClass}>Price option</label><input className={fieldClass} value={pack.name} onChange={event => updatePack(packIndex, { name: event.target.value })} placeholder="Standard / 2 workshops weekly" /></div>
                        <button type="button" onClick={() => removePack(packIndex)} disabled={draft.packs.length === 1} aria-label={`Remove ${pack.name || 'price option'}`} title="Remove price option" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-300/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={15} /></button>
                      </div>
                      {recurringPrice ? (
                        <>
                          <div><label className={labelClass}>Annual price</label><input type="number" min={0} className={fieldClass} value={pack.priceAnnual ?? ''} onChange={event => updatePack(packIndex, { priceAnnual: Number(event.target.value) })} placeholder="0" /></div>
                          <div><label className={labelClass}>Term price</label><input type="number" min={0} className={fieldClass} value={pack.priceTrimester ?? ''} onChange={event => updatePack(packIndex, { priceTrimester: Number(event.target.value) })} placeholder="0" /></div>
                          <div><label className={labelClass}>Workshops per week <span className="font-medium text-slate-600">Optional</span></label><input type="number" min={1} className={fieldClass} value={pack.workshopsPerWeek ?? ''} onChange={event => updatePack(packIndex, { workshopsPerWeek: Number(event.target.value) })} /></div>
                        </>
                      ) : (
                        <>
                          <div><label className={labelClass}>One-time price</label><input type="number" min={0} className={fieldClass} value={pack.price ?? ''} onChange={event => updatePack(packIndex, { price: Number(event.target.value) })} placeholder="0" /></div>
                          {draft.enrollmentPolicy === 'modular' && <div><label className={labelClass}>{draft.moduleLabel || 'Module'}s included</label><input type="number" min={1} max={2} className={fieldClass} value={pack.includedModuleCount ?? 1} onChange={event => updatePack(packIndex, { includedModuleCount: Number(event.target.value) })} /></div>}
                        </>
                      )}
                      <div><label className={labelClass}>Promotion price <span className="font-medium text-slate-600">Optional</span></label><input type="number" min={0} className={fieldClass} value={pack.promoPrice ?? ''} onChange={event => updatePack(packIndex, { promoPrice: Number(event.target.value) })} placeholder="No promotion" /></div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addPack} className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-xs font-black text-slate-400 transition hover:border-teal-300/30 hover:text-teal-300"><Plus size={15} /> Add price option</button>

                <div className="grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                  <div><label className={labelClass}>Payment terms <span className="font-medium text-slate-600">One per line</span></label><textarea className={`${fieldClass} h-24 resize-none py-3 leading-6`} value={draft.paymentTerms.join('\n')} onChange={event => setDraft(previous => ({ ...previous, paymentTerms: event.target.value.split('\n') }))} placeholder={'Full payment\n50% deposit'} /></div>
                  <div><label className={labelClass}>Promotion ends <span className="font-medium text-slate-600">Optional</span></label><input type="date" className={fieldClass} value={draft.discountEndDate || ''} onChange={event => setDraft(previous => ({ ...previous, discountEndDate: event.target.value }))} /></div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3"><QrCode size={18} className="text-teal-300" /><div><p className="text-sm font-black text-white">Registration</p><p className="text-xs text-slate-500">Control how families discover and request a place.</p></div></div>
                  <div>
                    <Toggle checked={draft.registrationSetup.enabled} onChange={checked => updateRegistration({ enabled: checked })} label="Online registration page" helper="Prepare a mobile page for this program." icon={GraduationCap} />
                    {draft.registrationSetup.enabled && (
                      <>
                        <div className="grid gap-3 border-b border-white/[0.07] py-3 sm:grid-cols-2">
                          <button type="button" onClick={() => updateRegistration({ mode: 'fast' })} className={`rounded-lg border p-3 text-left transition ${draft.registrationSetup.mode === 'fast' ? 'border-teal-300/35 bg-teal-300/10' : 'border-white/10 hover:border-white/20'}`}><p className="text-sm font-black text-white">Fast form</p><p className="mt-1 text-xs leading-5 text-slate-500">Learner, guardian, phone, and chosen run.</p></button>
                          <button type="button" onClick={() => updateRegistration({ mode: 'extended' })} className={`rounded-lg border p-3 text-left transition ${draft.registrationSetup.mode === 'extended' ? 'border-teal-300/35 bg-teal-300/10' : 'border-white/10 hover:border-white/20'}`}><p className="text-sm font-black text-white">Extended form</p><p className="mt-1 text-xs leading-5 text-slate-500">Adds school, medical, consent, and custom details.</p></button>
                        </div>
                        <Toggle checked={draft.registrationSetup.allowWaitlist} onChange={checked => updateRegistration({ allowWaitlist: checked })} label="Keep a waitlist" helper="Continue collecting requests when groups are full." />
                        <Toggle checked={draft.registrationSetup.requiresReview} onChange={checked => updateRegistration({ requiresReview: checked })} label="Review every request" helper="A team member approves the learner before enrollment." />
                        <Toggle checked={draft.registrationSetup.qrEnabled} onChange={checked => updateRegistration({ qrEnabled: checked })} label="Generate a registration QR" helper="Open this program's form from posters and front desk materials." />
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3"><FileBadge2 size={18} className="text-sky-300" /><div><p className="text-sm font-black text-white">Documents</p><p className="text-xs text-slate-500">Prepare documents the team can issue later.</p></div></div>
                  <Toggle checked={draft.documentSetup.registrationConfirmation} onChange={checked => updateDocuments({ registrationConfirmation: checked })} label="Registration confirmation" helper="Confirm that the family's request was received." icon={CheckCircle2} />
                  <Toggle checked={draft.documentSetup.enrollmentAttestation} onChange={checked => updateDocuments({ enrollmentAttestation: checked })} label="Enrollment attestation" helper="Provide proof that the learner joined this program." icon={BadgeCheck} />
                  <Toggle checked={draft.documentSetup.completionCertificate} onChange={checked => updateDocuments({ completionCertificate: checked })} label="Completion certificate" helper="Prepare a certificate after attendance and completion checks." icon={FileBadge2} />
                </div>

                <div className="grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                  <div><label className={labelClass}>Cover image URL <span className="font-medium text-slate-600">Optional</span></label><input type="url" className={fieldClass} value={draft.thumbnailUrl} onChange={event => setDraft(previous => ({ ...previous, thumbnailUrl: event.target.value }))} placeholder="https://..." /></div>
                  <div><label className={labelClass}>Brochure URL <span className="font-medium text-slate-600">Optional</span></label><input type="url" className={fieldClass} value={draft.brochureUrl} onChange={event => setDraft(previous => ({ ...previous, brochureUrl: event.target.value }))} placeholder="https://..." /></div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Program</p><p className="mt-2 font-black text-white">{draft.name}</p><p className="mt-1 text-xs text-slate-500">{selectedPreset.label} for {draft.targetAudience === 'kids' ? 'children' : 'adults'}</p></div>
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Run</p><p className="mt-2 font-black text-white">{draft.runSetup.name || 'Main run'}</p><p className="mt-1 text-xs text-slate-500">{draft.runSetup.startDate} to {draft.runSetup.endDate}</p></div>
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Learning rhythm</p><p className="mt-2 font-black text-white">{totalGroups} {totalGroups === 1 ? 'group' : 'groups'}, {totalCapacity} seats</p><p className="mt-1 text-xs text-slate-500">{draft.grades.length} {draft.grades.length === 1 ? 'level' : 'levels'} and {totalBlocks} scheduled class {totalBlocks === 1 ? 'time' : 'times'}</p></div>
                  <div className="bg-slate-950/90 p-4"><p className="text-[10px] font-black uppercase text-slate-600">Offer</p><p className="mt-2 font-black text-white">{draft.packs.length} price {draft.packs.length === 1 ? 'option' : 'options'}</p><p className="mt-1 text-xs text-slate-500">{recurringPrice ? 'Annual and term pricing' : 'One-time pricing'}</p></div>
                  <div className="bg-slate-950/90 p-4 sm:col-span-2"><p className="text-[10px] font-black uppercase text-slate-600">Enrollment timing</p><p className="mt-2 font-black text-white">{selectedEnrollmentPolicy.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{draft.enrollmentPolicy === 'rolling_membership' ? `Each learner ends ${draft.membershipDurationMonths} months after joining.` : draft.enrollmentPolicy === 'modular' ? `Families choose the ${draft.moduleLabel.trim() || 'Module'} options that fit them.${draft.allowJoinAnytime ? ' They can join after the program starts.' : ''}` : `Everyone follows the shared run dates.${draft.allowJoinAnytime ? ' Late joining is allowed.' : ''}`}</p></div>
                </div>

                <div className="flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-black text-white">Program status</p><p className="mt-1 text-xs text-slate-500">Keep future-year copies private until the team is ready.</p></div>
                  <div className="grid h-10 w-full grid-cols-2 rounded-lg border border-white/10 bg-slate-950/60 p-1 sm:w-52">
                    <button type="button" onClick={() => setDraft(previous => ({ ...previous, status: 'draft' }))} aria-pressed={draft.status === 'draft'} className={`rounded-md text-xs font-black transition ${draft.status === 'draft' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>Draft</button>
                    <button type="button" onClick={() => setDraft(previous => ({ ...previous, status: 'active' }))} aria-pressed={draft.status === 'active'} className={`rounded-md text-xs font-black transition ${draft.status === 'active' ? 'bg-teal-300 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Active</button>
                  </div>
                </div>

                <div className="border-b border-white/10 pb-4">
                  <p className="text-xs font-black uppercase text-slate-600">The family experience</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {draft.registrationSetup.enabled
                      ? `Families can use a ${draft.registrationSetup.mode} registration form${draft.registrationSetup.qrEnabled ? ' or scan its QR code' : ''}. ${draft.registrationSetup.requiresReview ? 'Your team reviews each request before enrollment.' : 'Requests can move ahead without staff review.'}`
                      : 'Online registration is off. Your team will enroll learners from inside Edufy.'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-slate-600">Prepared documents</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.documentSetup.registrationConfirmation && <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1.5 text-xs font-bold text-emerald-200">Registration confirmation</span>}
                    {draft.documentSetup.enrollmentAttestation && <span className="rounded-md border border-sky-300/20 bg-sky-300/10 px-2.5 py-1.5 text-xs font-bold text-sky-200">Enrollment attestation</span>}
                    {draft.documentSetup.completionCertificate && <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2.5 py-1.5 text-xs font-bold text-amber-200">Completion certificate</span>}
                    {!Object.values(draft.documentSetup).some(Boolean) && <span className="text-sm text-slate-500">No documents selected.</span>}
                  </div>
                </div>

                {reviewWarnings.length > 0 ? (
                  <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] p-3">
                    <p className="text-xs font-black text-amber-200">Helpful before publishing</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-100/70">{reviewWarnings.map(warning => <li key={warning} className="flex gap-2"><span aria-hidden="true">-</span><span>{warning}</span></li>)}</ul>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg border border-teal-300/20 bg-teal-300/10 p-3 text-sm text-teal-100"><CheckCircle2 className="mt-0.5 shrink-0" size={18} /><p>This setup has the essentials your team needs to start operating the program.</p></div>
                )}
              </div>
            )}

            {(stepError || externalError) && <div role="alert" className="mt-5 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-sm font-bold text-red-200">{stepError || externalError}</div>}

            <footer className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0F1B2D]/95 py-4 backdrop-blur">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(previous => previous - 1)} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"><ArrowLeft size={16} /> Back</button>
              ) : (
                <button type="button" onClick={onClose} disabled={isSaving} className="h-11 rounded-lg px-3 text-sm font-bold text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50">Cancel</button>
              )}

              {step < 6 ? (
                <button type="button" onClick={continueForward} className="flex h-11 items-center gap-2 rounded-lg bg-teal-300 px-5 text-sm font-black text-slate-950 transition hover:bg-teal-200 active:scale-[0.98]">Continue <ChevronRight size={16} /></button>
              ) : (
                <button type="button" onClick={finish} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-lg bg-teal-300 px-5 text-sm font-black text-slate-950 transition hover:bg-teal-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60">{isSaving ? 'Saving program...' : isEditing ? 'Save program' : 'Create program'} <CheckCircle2 size={17} /></button>
              )}
            </footer>
          </section>
        </div>
      </div>
    </Modal>
  );
};
