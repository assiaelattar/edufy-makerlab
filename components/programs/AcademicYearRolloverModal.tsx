import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarRange,
  Check,
  Copy,
  FolderOpen,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { Program, ProgramAcademicPeriod, ProgramEnrollmentMode } from '../../types';
import { Modal } from '../Modal';

interface AcademicYearRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: Program[];
  defaultPeriod: ProgramAcademicPeriod;
  isSaving: boolean;
  onPrepare: (request: { period: ProgramAcademicPeriod; programIds: string[] }) => void;
}

type PeriodErrors = Partial<Record<keyof ProgramAcademicPeriod | 'programIds', string>>;

const fieldClass =
  'h-11 w-full rounded-lg border border-white/10 bg-slate-950/75 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/15 disabled:cursor-not-allowed disabled:opacity-60';

const enrollmentModeContent: Record<ProgramEnrollmentMode, { label: string; helper: string }> = {
  fixed_run: {
    label: 'Fixed period',
    helper: 'Learners join the dated program run',
  },
  rolling_membership: {
    label: 'Rolling membership',
    helper: 'Each learner follows their own membership dates',
  },
  modular: {
    label: 'Modular enrollment',
    helper: 'Learners choose individual modules',
  },
};

const getEnrollmentPolicy = (program: Program) => {
  const mode = program.enrollmentPolicy?.mode || 'fixed_run';
  const content = enrollmentModeContent[mode];

  if (mode === 'rolling_membership') {
    const months = program.enrollmentPolicy?.membershipDurationMonths;
    return {
      ...content,
      helper: months
        ? `Join anytime, ${months} month${months === 1 ? '' : 's'} from each start date`
        : 'Join anytime with learner-specific membership dates',
    };
  }

  if (mode === 'modular' && program.enrollmentPolicy?.moduleLabel) {
    return {
      ...content,
      helper: `Learners choose by ${program.enrollmentPolicy.moduleLabel.toLowerCase()}`,
    };
  }

  return content;
};

const validate = (period: ProgramAcademicPeriod, selectedCount: number): PeriodErrors => {
  const errors: PeriodErrors = {};

  if (!period.label.trim()) errors.label = 'Enter a name for the new academic period.';
  if (!period.startDate) errors.startDate = 'Choose when the academic period starts.';
  if (!period.endDate) errors.endDate = 'Choose when the academic period ends.';
  if (period.startDate && period.endDate && period.endDate <= period.startDate) {
    errors.endDate = 'The end date must be after the start date.';
  }
  if (selectedCount === 0) errors.programIds = 'Select at least one program setup to copy.';

  return errors;
};

export const AcademicYearRolloverModal = ({
  isOpen,
  onClose,
  programs,
  defaultPeriod,
  isSaving,
  onPrepare,
}: AcademicYearRolloverModalProps) => {
  const formId = useId();
  const wasOpenRef = useRef(false);
  const [period, setPeriod] = useState<ProgramAcademicPeriod>({ ...defaultPeriod });
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setPeriod({ ...defaultPeriod });
      setSelectedProgramIds(new Set(programs.filter(program => program.status === 'active').map(program => program.id)));
      setHasSubmitted(false);
    }

    wasOpenRef.current = isOpen;
  }, [defaultPeriod, isOpen, programs]);

  const activePrograms = useMemo(
    () => programs.filter(program => program.status === 'active'),
    [programs],
  );
  const selectedCount = selectedProgramIds.size;
  const errors = useMemo(
    () => validate(period, selectedCount),
    [period, selectedCount],
  );
  const selectedAllActive = activePrograms.length > 0
    && activePrograms.every(program => selectedProgramIds.has(program.id));

  const updatePeriod = (field: keyof ProgramAcademicPeriod, value: string) => {
    setPeriod(current => ({ ...current, [field]: value }));
  };

  const toggleProgram = (programId: string) => {
    setSelectedProgramIds(current => {
      const next = new Set(current);
      if (next.has(programId)) next.delete(programId);
      else next.add(programId);
      return next;
    });
  };

  const selectActivePrograms = () => {
    setSelectedProgramIds(new Set(activePrograms.map(program => program.id)));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    if (Object.keys(errors).length > 0 || isSaving) return;

    onPrepare({
      period: {
        label: period.label.trim(),
        startDate: period.startDate,
        endDate: period.endDate,
      },
      programIds: programs
        .filter(program => selectedProgramIds.has(program.id))
        .map(program => program.id),
    });
  };

  const safeClose = isSaving ? () => undefined : onClose;

  return (
    <Modal isOpen={isOpen} onClose={safeClose} title="Prepare a new academic year" size="lg">
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="space-y-4"
        aria-busy={isSaving}
        noValidate
      >
        <section className="overflow-hidden rounded-lg border border-teal-300/20 bg-teal-300/[0.04]">
          <div className="flex items-start gap-3 border-b border-teal-300/10 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-300/10 text-teal-200">
              <CalendarRange className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white">Set the new operating period</h4>
              <p className="mt-0.5 text-xs leading-5 text-slate-400">
                These dates become the starting point for every copied program setup.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-label`} className="mb-1.5 block text-xs font-bold text-slate-300">
                Academic period name
              </label>
              <input
                id={`${formId}-label`}
                value={period.label}
                onChange={event => updatePeriod('label', event.target.value)}
                placeholder="2027-2028"
                className={fieldClass}
                disabled={isSaving}
                aria-invalid={hasSubmitted && Boolean(errors.label)}
                aria-describedby={hasSubmitted && errors.label ? `${formId}-label-error` : undefined}
                autoFocus
              />
              {hasSubmitted && errors.label && (
                <p id={`${formId}-label-error`} className="mt-1.5 text-xs font-medium text-rose-300">
                  {errors.label}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-start`} className="mb-1.5 block text-xs font-bold text-slate-300">
                Starts
              </label>
              <input
                id={`${formId}-start`}
                type="date"
                value={period.startDate}
                onChange={event => updatePeriod('startDate', event.target.value)}
                className={fieldClass}
                disabled={isSaving}
                aria-invalid={hasSubmitted && Boolean(errors.startDate)}
                aria-describedby={hasSubmitted && errors.startDate ? `${formId}-start-error` : undefined}
              />
              {hasSubmitted && errors.startDate && (
                <p id={`${formId}-start-error`} className="mt-1.5 text-xs font-medium text-rose-300">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-end`} className="mb-1.5 block text-xs font-bold text-slate-300">
                Ends
              </label>
              <input
                id={`${formId}-end`}
                type="date"
                value={period.endDate}
                min={period.startDate || undefined}
                onChange={event => updatePeriod('endDate', event.target.value)}
                className={fieldClass}
                disabled={isSaving}
                aria-invalid={hasSubmitted && Boolean(errors.endDate)}
                aria-describedby={hasSubmitted && errors.endDate ? `${formId}-end-error` : undefined}
              />
              {hasSubmitted && errors.endDate && (
                <p id={`${formId}-end-error`} className="mt-1.5 text-xs font-medium text-rose-300">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/35">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300">
                <Copy className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white">Choose program setups</h4>
                <p className="mt-0.5 text-xs text-slate-500">{selectedCount} of {programs.length} selected</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={selectActivePrograms}
                disabled={isSaving || activePrograms.length === 0 || selectedAllActive}
                className="h-8 rounded-md px-2.5 text-xs font-bold text-teal-200 transition hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select active
              </button>
              <button
                type="button"
                onClick={() => setSelectedProgramIds(new Set())}
                disabled={isSaving || selectedCount === 0}
                className="h-8 rounded-md px-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          {programs.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-9 text-center">
              <FolderOpen className="h-7 w-7 text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-slate-300">No program setups available</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Create a program setup before preparing an academic year.
              </p>
            </div>
          ) : (
            <div className="max-h-64 divide-y divide-white/[0.06] overflow-y-auto custom-scrollbar">
              {programs.map(program => {
                const isSelected = selectedProgramIds.has(program.id);
                const policy = getEnrollmentPolicy(program);

                return (
                  <label
                    key={program.id}
                    className={`group flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                      isSelected ? 'bg-teal-300/[0.055]' : 'hover:bg-white/[0.035]'
                    } ${isSaving ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        isSelected
                          ? 'border-teal-300 bg-teal-300 text-slate-950'
                          : 'border-white/20 bg-slate-950 text-transparent group-hover:border-white/35'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProgram(program.id)}
                      disabled={isSaving}
                      className="sr-only"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-100">{program.name}</span>
                        {program.status !== 'active' && (
                          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            {program.status}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{policy.helper}</span>
                    </span>

                    <span className="hidden shrink-0 rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[11px] font-bold text-slate-400 sm:block">
                      {policy.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {hasSubmitted && errors.programIds && (
            <p className="border-t border-rose-300/10 bg-rose-400/[0.06] px-4 py-2.5 text-xs font-medium text-rose-300">
              {errors.programIds}
            </p>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] px-4 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-emerald-100">Setup only, with a clean operational year</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Program structure, groups, schedules, pricing, and registration settings can be copied. Learners,
              enrollments, payments, and attendance are never copied.
            </p>
          </div>
        </div>

        <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-white/10 bg-[#0F1B2D]/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-500 sm:text-left">
            {selectedCount > 0 ? `${selectedCount} setup${selectedCount === 1 ? '' : 's'} ready to prepare` : 'Choose the setups to carry forward'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 flex-1 rounded-lg border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 flex-[1.6] items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 text-sm font-bold text-[#06141B] transition hover:bg-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1B2D] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Preparing...
                </>
              ) : (
                <>
                  Prepare year
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
