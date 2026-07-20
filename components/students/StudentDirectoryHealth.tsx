import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Contact,
  GraduationCap,
  ListFilter,
  MapPin,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export type StudentDirectoryFilter =
  | 'all'
  | 'contact'
  | 'profile'
  | 'enrollment'
  | 'placement'
  | 'duplicates';

export interface StudentDirectoryHealthProps {
  totalRecords: number;
  healthyRecords: number;
  missingContacts: number;
  missingProfile: number;
  noEnrollment: number;
  unassignedGroup: number;
  duplicateGroups: number;
  activeFilter: StudentDirectoryFilter;
  onFilter: (filter: StudentDirectoryFilter) => void;
}

const FILTERS = [
  {
    id: 'all',
    label: 'All records',
    description: 'Show the complete student directory',
    icon: ListFilter,
    countKey: 'totalRecords',
  },
  {
    id: 'contact',
    label: 'Contact details',
    description: 'Missing parent or guardian contact details',
    icon: Contact,
    countKey: 'missingContacts',
  },
  {
    id: 'profile',
    label: 'Profile details',
    description: 'Student profiles that need more information',
    icon: AlertCircle,
    countKey: 'missingProfile',
  },
  {
    id: 'enrollment',
    label: 'Not enrolled',
    description: 'Active students without a current enrollment',
    icon: GraduationCap,
    countKey: 'noEnrollment',
  },
  {
    id: 'placement',
    label: 'Needs a class',
    description: 'Enrolled students not assigned to a class group',
    icon: MapPin,
    countKey: 'unassignedGroup',
  },
  {
    id: 'duplicates',
    label: 'Possible duplicates',
    description: 'Record groups that may refer to the same student',
    icon: ScanSearch,
    countKey: 'duplicateGroups',
  },
] as const satisfies ReadonlyArray<{
  id: StudentDirectoryFilter;
  label: string;
  description: string;
  icon: LucideIcon;
  countKey: keyof Pick<
    StudentDirectoryHealthProps,
    | 'totalRecords'
    | 'missingContacts'
    | 'missingProfile'
    | 'noEnrollment'
    | 'unassignedGroup'
    | 'duplicateGroups'
  >;
}>;

const StudentDirectoryHealth: React.FC<StudentDirectoryHealthProps> = ({
  totalRecords,
  healthyRecords,
  missingContacts,
  missingProfile,
  noEnrollment,
  unassignedGroup,
  duplicateGroups,
  activeFilter,
  onFilter,
}) => {
  const safeTotal = Math.max(0, totalRecords);
  const safeHealthy = Math.min(Math.max(0, healthyRecords), safeTotal);
  const healthRate = safeTotal === 0 ? 100 : Math.round((safeHealthy / safeTotal) * 100);
  const values = {
    totalRecords: safeTotal,
    missingContacts: Math.max(0, missingContacts),
    missingProfile: Math.max(0, missingProfile),
    noEnrollment: Math.max(0, noEnrollment),
    unassignedGroup: Math.max(0, unassignedGroup),
    duplicateGroups: Math.max(0, duplicateGroups),
  };

  return (
    <section
      aria-labelledby="student-directory-health-title"
      className="atlas-surface border-y py-4 sm:py-5"
    >
      <div className="flex flex-col gap-5 px-1 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-start gap-3 lg:w-64 lg:shrink-0">
          <div className="atlas-accent-well mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
            <ShieldCheck size={18} aria-hidden={true} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="student-directory-health-title" className="atlas-text-strong text-sm font-bold">
                Directory health
              </h2>
              <span className="atlas-text-strong text-sm font-black tabular-nums">{healthRate}%</span>
            </div>
            <p className="atlas-text-muted mt-1 text-xs leading-5">
              {safeHealthy} of {safeTotal} records are ready for daily work.
            </p>
            <div
              className="atlas-surface-muted mt-2 h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Student directory health"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={healthRate}
            >
              <div
                className="h-full rounded-full bg-teal-400 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${healthRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hidden h-14 w-px bg-white/10 lg:block" aria-hidden={true} />

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {FILTERS.map(filter => {
            const Icon = filter.icon;
            const count = values[filter.countKey];
            const isActive = activeFilter === filter.id;
            const isClear = filter.id !== 'all' && count === 0;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilter(filter.id)}
                aria-pressed={isActive}
                aria-label={`${filter.label}: ${count}`}
                title={filter.description}
                className={`atlas-interactive flex min-h-16 min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'atlas-accent-well shadow-sm'
                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? 'bg-teal-300/15' : 'atlas-surface-muted'
                  }`}
                >
                  {isClear ? (
                    <CheckCircle2 size={16} className="text-emerald-400" aria-hidden={true} />
                  ) : (
                    <Icon
                      size={16}
                      className={filter.id === 'all' || isActive ? 'text-teal-300' : 'atlas-text-muted'}
                      aria-hidden={true}
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="atlas-text-strong block text-base font-black tabular-nums leading-none">
                    {count}
                  </span>
                  <span className="atlas-text-muted mt-1 block truncate text-[11px] font-semibold leading-4">
                    {filter.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StudentDirectoryHealth;
