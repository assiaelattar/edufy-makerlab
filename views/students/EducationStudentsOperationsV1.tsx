import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Eye,
  GraduationCap,
  Link2,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import type { StudentDirectoryFilter } from '../../components/students/StudentDirectoryHealth';
import type { AdmissionProjection } from '../../modules/admissions/domain';
import { EducationAdmissionsReadOnlyV1 } from '../../modules/admissions/ui/EducationAdmissionsReadOnlyV1';
import { formatCurrency } from '../../utils/helpers';
import { STUDENT_DIRECTORY_ISSUE_LABELS } from '../../utils/studentIdentity';
import './education-students-operations-v1.css';

type ViewMode = 'students' | 'parents';
type WorkspaceMode = ViewMode | 'admissions';
type SmartView = 'attention' | StudentDirectoryFilter;

type DirectorySummary = {
  totalRecords: number;
  healthyRecords: number;
  missingContacts: number;
  missingProfile: number;
  noEnrollment: number;
  unassignedGroup: number;
  duplicateGroups: number;
};

type ParentAccount = {
  phone: string;
  parentName: string;
  children: { student: any; enrollments: any[] }[];
  totalBalance: number;
  totalPaid: number;
  totalExpected: number;
};

type Props = {
  students: any[];
  enrollments: any[];
  programs: any[];
  admissionProjection: AdmissionProjection;
  filteredStudents: any[];
  parentAccounts: ParentAccount[];
  parentLedger: { totalBalance: number; familiesWithBalance: number };
  directoryHealth: { records: Map<string, { issues: Array<keyof typeof STUDENT_DIRECTORY_ISSUE_LABELS> }> };
  directorySummary: DirectorySummary;
  stats: { total: number; active: number; inactive: number; newThisMonth: number; enrolled: number; dataHealth: number };
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterProgramId: string;
  setFilterProgramId: (value: string) => void;
  filterGradeName: string;
  setFilterGradeName: (value: string) => void;
  filterDay: string;
  setFilterDay: (value: string) => void;
  filterAudience: 'all' | 'kids' | 'adults';
  setFilterAudience: (value: 'all' | 'kids' | 'adults') => void;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  directoryFilter: StudentDirectoryFilter;
  setDirectoryFilter: (value: StudentDirectoryFilter) => void;
  selectedProgram: any;
  availableDays: string[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  allFilteredSelected: boolean;
  toggleSelectAll: () => void;
  can: (permission: string) => boolean;
  onAddStudent: () => void;
  onEditStudent: (student: any) => void;
  onQuickEnroll: (studentId?: string) => void;
  onViewProfile: (studentId: string) => void;
  onToggleStudentStatus: (student: any) => void;
  onLinkParent: () => void;
  onOpenParentStatement: (parent: ParentAccount) => void;
};

const SMART_VIEWS: Array<{ id: SmartView; label: string }> = [
  { id: 'attention', label: 'Needs action' },
  { id: 'contact', label: 'Contact gaps' },
  { id: 'profile', label: 'Profile details' },
  { id: 'enrollment', label: 'Not enrolled' },
  { id: 'placement', label: 'Needs a class' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'all', label: 'All learners' },
];

const hasOperationalIssue = (issues: Array<keyof typeof STUDENT_DIRECTORY_ISSUE_LABELS>) =>
  issues.some(issue => issue !== 'missing_profile');

const getInitials = (name?: string) => (name || 'Student')
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const getDate = (value: any) => {
  if (!value) return 'Date not recorded';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString();
};

const EducationStudentsOperationsV1: React.FC<Props> = ({
  students,
  enrollments,
  programs,
  admissionProjection,
  filteredStudents,
  parentAccounts,
  parentLedger,
  directoryHealth,
  directorySummary,
  stats,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  filterProgramId,
  setFilterProgramId,
  filterGradeName,
  setFilterGradeName,
  filterDay,
  setFilterDay,
  filterAudience,
  setFilterAudience,
  showArchived,
  setShowArchived,
  directoryFilter,
  setDirectoryFilter,
  selectedProgram,
  availableDays,
  hasActiveFilters,
  clearFilters,
  selectedIds,
  setSelectedIds,
  allFilteredSelected,
  toggleSelectAll,
  can,
  onAddStudent,
  onEditStudent,
  onQuickEnroll,
  onViewProfile,
  onToggleStudentStatus,
  onLinkParent,
  onOpenParentStatement,
}) => {
  const [smartView, setSmartView] = useState<SmartView>('attention');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedFamilyPhone, setSelectedFamilyPhone] = useState<string>('');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(viewMode);

  const changeWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    if (mode !== 'admissions') setViewMode(mode);
  };

  const headingCopy = workspaceMode === 'students'
    ? {
      eyebrow: 'School community · student operations',
      title: 'Who needs you today?',
      description: 'Start with learners who need a decision. Search only when you already know who you are looking for.',
    }
    : workspaceMode === 'parents'
      ? {
        eyebrow: 'School community · family accounts',
        title: 'Keep every family understood.',
        description: 'See siblings, balances, and contact context together before opening a statement.',
      }
      : {
        eyebrow: 'Family journey · admissions preview',
        title: 'Know the family’s next step.',
        description: 'See every inquiry from first contact through trial and enrollment, with ambiguous legacy evidence clearly marked.',
      };

  const attentionStudents = useMemo(() => filteredStudents.filter(student => {
    const issues = directoryHealth.records.get(student.id)?.issues || [];
    return hasOperationalIssue(issues);
  }), [filteredStudents, directoryHealth]);

  const visibleStudents = smartView === 'attention' ? attentionStudents : filteredStudents;
  const selectedStudent = visibleStudents.find(student => student.id === selectedStudentId)
    || filteredStudents.find(student => student.id === selectedStudentId)
    || visibleStudents[0]
    || filteredStudents[0]
    || null;
  const selectedFamily = parentAccounts.find(parent => parent.phone === selectedFamilyPhone)
    || parentAccounts[0]
    || null;

  useEffect(() => {
    if (!selectedStudentId && visibleStudents[0]) setSelectedStudentId(visibleStudents[0].id);
  }, [selectedStudentId, visibleStudents]);

  useEffect(() => {
    if (!selectedFamilyPhone && parentAccounts[0]) setSelectedFamilyPhone(parentAccounts[0].phone);
  }, [selectedFamilyPhone, parentAccounts]);

  const issueCounts = useMemo(() => {
    const activeStudents = students.filter(student => student.status !== 'inactive');
    return {
      attention: activeStudents.filter(student => hasOperationalIssue(directoryHealth.records.get(student.id)?.issues || [])).length,
      all: directorySummary.totalRecords,
      contact: directorySummary.missingContacts,
      profile: directorySummary.missingProfile,
      enrollment: directorySummary.noEnrollment,
      placement: directorySummary.unassignedGroup,
      duplicates: directorySummary.duplicateGroups,
    };
  }, [students, directoryHealth, directorySummary]);

  const activeFilterCount = [
    filterProgramId,
    filterGradeName,
    filterDay,
    filterAudience !== 'all' ? filterAudience : '',
    showArchived ? 'archived' : '',
    directoryFilter !== 'all' ? directoryFilter : '',
  ].filter(Boolean).length;

  const handleSmartView = (view: SmartView) => {
    setSmartView(view);
    setShowArchived(false);
    setDirectoryFilter(view === 'attention' ? 'all' : view);
    setSelectedIds([]);
    setSelectedStudentId('');
  };

  const selectedIssues = selectedStudent
    ? (directoryHealth.records.get(selectedStudent.id)?.issues || [])
    : [];
  const selectedEnrollments = selectedStudent
    ? enrollments.filter(enrollment => enrollment.studentId === selectedStudent.id && enrollment.status === 'active')
    : [];
  const selectedBalance = selectedEnrollments.reduce(
    (sum, enrollment) => sum + Math.max(0, (enrollment.totalAmount || 0) - (enrollment.paidAmount || 0)),
    0,
  );
  const selectedPrimaryEnrollment = selectedEnrollments[0];

  const nextAction = useMemo(() => {
    if (!selectedStudent) return null;
    if (selectedStudent.status === 'inactive') return { label: 'Reactivate this learner', action: () => onToggleStudentStatus(selectedStudent), button: 'Reactivate' };
    if (selectedIssues.includes('missing_contact')) return { label: 'Add the missing family contact', action: () => onEditStudent(selectedStudent), button: 'Fix contact' };
    if (selectedIssues.includes('no_enrollment')) return { label: 'Choose a program and enroll', action: () => onQuickEnroll(selectedStudent.id), button: 'Enroll now' };
    if (selectedIssues.includes('unassigned_group')) return { label: 'Place this learner in a class', action: () => onQuickEnroll(selectedStudent.id), button: 'Choose class' };
    if (selectedIssues.includes('possible_duplicate')) return { label: 'Review the possible duplicate', action: () => onViewProfile(selectedStudent.id), button: 'Review' };
    if (selectedIssues.includes('missing_profile')) return { label: 'Complete the learner profile', action: () => onEditStudent(selectedStudent), button: 'Complete' };
    return { label: 'Review the complete learner record', action: () => onViewProfile(selectedStudent.id), button: 'Open profile' };
  }, [selectedStudent, selectedIssues, onEditStudent, onQuickEnroll, onToggleStudentStatus, onViewProfile]);

  const readinessSteps = selectedStudent ? [
    { label: 'Contact', ready: !selectedIssues.includes('missing_contact') },
    { label: 'Profile', ready: !selectedIssues.includes('missing_profile') },
    { label: 'Enrolled', ready: !selectedIssues.includes('no_enrollment') },
    { label: 'Class', ready: !selectedIssues.includes('unassigned_group') },
    { label: 'Identity', ready: !selectedIssues.includes('possible_duplicate') },
  ] : [];

  return (
    <div className="edu-student-ops" data-testid="education-students-operations-v1">
      <section className="edu-student-ops__heading" aria-labelledby="student-ops-title">
        <div>
          <span className="edu-student-ops__eyebrow">{headingCopy.eyebrow}</span>
          <h1 id="student-ops-title">{headingCopy.title}</h1>
          <p>{headingCopy.description}</p>
        </div>
        <div className="edu-student-ops__heading-tools">
          <div className="edu-student-ops__mode" role="group" aria-label="Community view">
            <button type="button" aria-pressed={workspaceMode === 'students'} onClick={() => changeWorkspaceMode('students')}>Students</button>
            <button type="button" aria-pressed={workspaceMode === 'parents'} onClick={() => changeWorkspaceMode('parents')}>Families</button>
            <button type="button" aria-pressed={workspaceMode === 'admissions'} onClick={() => changeWorkspaceMode('admissions')}>Admissions</button>
          </div>
          {workspaceMode !== 'admissions' && can('students.enroll') && <button className="edu-student-ops__button" type="button" onClick={() => onQuickEnroll()}><Zap size={16} />Quick enroll</button>}
          {workspaceMode !== 'admissions' && can('students.edit') && <button className="edu-student-ops__button edu-student-ops__button--primary" type="button" onClick={onAddStudent}><Plus size={17} />Add student</button>}
        </div>
      </section>

      {workspaceMode === 'students' ? (
        <>
          <section className="edu-student-ops__priority-grid" aria-label="Student priorities">
            <button type="button" className="edu-student-ops__priority edu-student-ops__priority--lime" onClick={() => handleSmartView('attention')}>
              <span><small>Operational readiness</small><strong>{issueCounts.attention} record{issueCounts.attention === 1 ? '' : 's'} block daily work</strong></span>
              <span className="edu-student-ops__priority-icon"><ShieldCheck size={20} /></span>
              <span className="edu-student-ops__priority-meta">Resolve contact, enrollment, class, or identity gaps <ChevronRight size={15} /></span>
            </button>
            <button type="button" className="edu-student-ops__priority" onClick={() => handleSmartView('enrollment')}>
              <span><small>Enrollment decisions</small><strong>{directorySummary.noEnrollment} learner{directorySummary.noEnrollment === 1 ? '' : 's'} need a program</strong></span>
              <span className="edu-student-ops__priority-icon"><GraduationCap size={20} /></span>
              <span className="edu-student-ops__priority-meta">Move from record to enrollment <ChevronRight size={15} /></span>
            </button>
            <button type="button" className="edu-student-ops__priority edu-student-ops__priority--ink" onClick={() => handleSmartView('placement')}>
              <span><small>Ready to place</small><strong>{directorySummary.unassignedGroup} learner{directorySummary.unassignedGroup === 1 ? '' : 's'} need the right class</strong></span>
              <span className="edu-student-ops__priority-icon"><MapPin size={20} /></span>
              <span className="edu-student-ops__priority-meta">Match by program, level and day <ChevronRight size={15} /></span>
            </button>
          </section>

          <section className="edu-student-ops__desk" aria-label="Student operations desk">
            <div className="edu-student-ops__roster">
              <div className="edu-student-ops__section-heading">
                <div><h2>Smart roster</h2><p>An explainable worklist, ordered around the job.</p></div>
                <span>{visibleStudents.length} shown</span>
              </div>

              <div className="edu-student-ops__search-row">
                <label className="edu-student-ops__search">
                  <Search size={18} aria-hidden="true" />
                  <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Find a student, family, phone or program" aria-label="Search students" />
                  {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={16} /></button>}
                </label>
                <button type="button" className="edu-student-ops__filter-trigger" aria-expanded={showAdvancedFilters} onClick={() => setShowAdvancedFilters(value => !value)}>
                  <SlidersHorizontal size={17} />Filters{activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
                </button>
              </div>

              <div className="edu-student-ops__smart-views" role="group" aria-label="Smart roster views">
                {SMART_VIEWS.map(view => (
                  <button key={view.id} type="button" aria-pressed={smartView === view.id} onClick={() => handleSmartView(view.id)}>
                    {view.label}<span>{issueCounts[view.id]}</span>
                  </button>
                ))}
              </div>

              {showAdvancedFilters && (
                <div className="edu-student-ops__advanced" aria-label="Advanced student filters">
                  <div className="edu-student-ops__advanced-head"><div><strong>Refine this roster</strong><span>These filters narrow the active smart view.</span></div>{hasActiveFilters && <button type="button" onClick={clearFilters}>Reset all</button>}</div>
                  <div className="edu-student-ops__advanced-grid">
                    <label><span>Program</span><select value={filterProgramId} onChange={event => { setFilterProgramId(event.target.value); setFilterGradeName(''); setFilterDay(''); }}><option value="">All programs</option>{programs.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select><ChevronDown size={14} /></label>
                    <label><span>Audience</span><select value={filterAudience} onChange={event => setFilterAudience(event.target.value as 'all' | 'kids' | 'adults')}><option value="all">All ages</option><option value="kids">Kids & teens</option><option value="adults">Adult learners</option></select><ChevronDown size={14} /></label>
                    <label><span>Level</span><select value={filterGradeName} disabled={!selectedProgram} onChange={event => setFilterGradeName(event.target.value)}><option value="">All levels</option>{selectedProgram?.grades?.map((grade: any) => <option key={grade.id} value={grade.name}>{grade.name}</option>)}</select><ChevronDown size={14} /></label>
                    <label><span>Class day</span><select value={filterDay} disabled={availableDays.length === 0} onChange={event => setFilterDay(event.target.value)}><option value="">All days</option>{availableDays.map(day => <option key={day} value={day}>{day}</option>)}</select><ChevronDown size={14} /></label>
                    <button type="button" className="edu-student-ops__archive-filter" aria-pressed={showArchived} onClick={() => { setShowArchived(value => !value); setDirectoryFilter('all'); setSmartView('all'); }}><Archive size={15} />{showArchived ? 'Showing archived' : `Archived · ${stats.inactive}`}</button>
                  </div>
                  {hasActiveFilters && <div className="edu-student-ops__filter-summary"><Sparkles size={14} />Active filters are applied to the roster. <button type="button" onClick={clearFilters}>Clear filters</button></div>}
                </div>
              )}

              <div className="edu-student-ops__selection-row">
                <label><input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />Select all shown</label>
                {selectedIds.length > 0 && <button type="button" onClick={onLinkParent}><Link2 size={15} />Link parent info for {selectedIds.length}</button>}
              </div>

              <div className="edu-student-ops__student-list">
                {visibleStudents.length === 0 ? (
                  <div className="edu-student-ops__empty"><Search size={22} /><strong>No learners match this view</strong><span>Try another smart view or clear the advanced filters.</span>{hasActiveFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>
                ) : visibleStudents.map(student => {
                  const issues = directoryHealth.records.get(student.id)?.issues || [];
                  const operationalIssues = issues.filter(issue => issue !== 'missing_profile');
                  const activeEnrollments = enrollments.filter(enrollment => enrollment.studentId === student.id && enrollment.status === 'active');
                  const primaryIssue = operationalIssues[0] || issues[0];
                  const firstIssue = primaryIssue ? STUDENT_DIRECTORY_ISSUE_LABELS[primaryIssue] : 'Record ready';
                  const isSelected = selectedStudent?.id === student.id;
                  return (
                    <div key={student.id} className="edu-student-ops__student-row" data-selected={isSelected}>
                      <label className="edu-student-ops__row-check" onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${student.name}`} checked={selectedIds.includes(student.id)} onChange={() => setSelectedIds(current => current.includes(student.id) ? current.filter(id => id !== student.id) : [...current, student.id])} /></label>
                      <button type="button" className="edu-student-ops__student-main" aria-pressed={isSelected} onClick={() => setSelectedStudentId(student.id)}>
                        <span className="edu-student-ops__avatar">{getInitials(student.name)}</span>
                        <span className="edu-student-ops__student-copy"><strong>{student.name}</strong><span>{firstIssue}{activeEnrollments[0]?.programName ? ` · ${activeEnrollments[0].programName}` : ''}</span></span>
                        <span className="edu-student-ops__row-action">{issues.includes('missing_contact') ? 'Fix contact' : issues.includes('no_enrollment') ? 'Enroll' : issues.includes('unassigned_group') ? 'Choose class' : issues.includes('possible_duplicate') ? 'Review' : issues.length ? 'Complete' : 'Ready'}<ChevronRight size={15} /></span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="edu-student-ops__passport" aria-label="Selected student operational passport">
              {selectedStudent ? (
                <>
                  <div className="edu-student-ops__passport-top">
                    <span className="edu-student-ops__passport-label">Student passport · one operational view</span>
                    <div className="edu-student-ops__passport-person"><span>{getInitials(selectedStudent.name)}</span><div><h2>{selectedStudent.name}</h2><p>{selectedStudent.status === 'inactive' ? 'Archived learner' : `Active learner · joined ${getDate(selectedStudent.createdAt)}`}</p></div></div>
                  </div>
                  <div className="edu-student-ops__passport-body">
                    {nextAction && <div className="edu-student-ops__next-action"><span><Sparkles size={17} /></span><div><small>Next best action</small><strong>{nextAction.label}</strong></div><button type="button" onClick={nextAction.action}>{nextAction.button}</button></div>}

                    <div className="edu-student-ops__facts">
                      <div><small>Family contact</small><strong>{selectedStudent.parentName || 'Not recorded'}</strong><span>{selectedStudent.parentPhone || selectedStudent.email || 'Contact needed'}</span></div>
                      <div><small>Program & class</small><strong>{selectedPrimaryEnrollment?.programName || 'No active program'}</strong><span>{selectedPrimaryEnrollment?.gradeName || selectedPrimaryEnrollment?.groupTime || 'Placement needed'}</span></div>
                      <div><small>Account</small><strong>{selectedBalance > 0 ? `${formatCurrency(selectedBalance)} due` : 'No balance due'}</strong><span>{selectedEnrollments.length} active enrollment{selectedEnrollments.length === 1 ? '' : 's'}</span></div>
                      <div><small>Record</small><strong>{selectedIssues.length ? `${selectedIssues.length} item${selectedIssues.length === 1 ? '' : 's'} to review` : 'Ready for daily work'}</strong><span>{selectedStudent.school || 'School not recorded'}</span></div>
                    </div>

                    <div className="edu-student-ops__readiness">
                      <div><strong>Operational readiness</strong><span>{readinessSteps.filter(step => step.ready).length} of {readinessSteps.length} ready</span></div>
                      <div className="edu-student-ops__readiness-track">
                        {readinessSteps.map(step => <span key={step.label} data-ready={step.ready}><i>{step.ready ? <Check size={12} /> : <Circle size={10} />}</i><b>{step.label}</b></span>)}
                      </div>
                    </div>

                    <div className="edu-student-ops__passport-actions">
                      <button type="button" onClick={() => onViewProfile(selectedStudent.id)}><Eye size={15} />Open profile</button>
                      {can('students.edit') && <button type="button" onClick={() => onEditStudent(selectedStudent)}><Pencil size={15} />Edit record</button>}
                      {selectedStudent.status !== 'inactive' && can('students.enroll') && <button type="button" onClick={() => onQuickEnroll(selectedStudent.id)}><GraduationCap size={15} />Enroll</button>}
                      {can('students.delete') && <button type="button" className="edu-student-ops__status-action" onClick={() => onToggleStudentStatus(selectedStudent)}>{selectedStudent.status === 'inactive' ? <RefreshCw size={15} /> : <Archive size={15} />}{selectedStudent.status === 'inactive' ? 'Reactivate' : 'Archive'}</button>}
                    </div>
                  </div>
                </>
              ) : <div className="edu-student-ops__empty edu-student-ops__empty--passport"><UsersRound size={24} /><strong>No learner selected</strong><span>Choose a learner from the smart roster.</span></div>}
            </aside>
          </section>
        </>
      ) : workspaceMode === 'parents' ? (
        <section className="edu-student-ops__family-layout" aria-label="Family accounts">
          <div className="edu-student-ops__family-roster">
            <div className="edu-student-ops__family-summary">
              <div><small>Family accounts</small><strong>{parentAccounts.length}</strong><span>Active households inferred from contact records</span></div>
              <div><small>Families with balance</small><strong>{parentLedger.familiesWithBalance}</strong><span>{formatCurrency(parentLedger.totalBalance)} outstanding</span></div>
            </div>
            <label className="edu-student-ops__search"><Search size={18} /><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Find a family by name or phone" aria-label="Search families" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={16} /></button>}</label>
            <div className="edu-student-ops__family-list">
              {parentAccounts.length === 0 ? <div className="edu-student-ops__empty"><UsersRound size={22} /><strong>No family accounts match</strong><span>Try another parent name or phone number.</span></div> : parentAccounts.map(parent => (
                <button key={parent.phone} type="button" aria-pressed={selectedFamily?.phone === parent.phone} onClick={() => setSelectedFamilyPhone(parent.phone)}>
                  <span className="edu-student-ops__avatar">{getInitials(parent.parentName)}</span>
                  <span><strong>{parent.parentName}</strong><small>{parent.phone} · {parent.children.length} learner{parent.children.length === 1 ? '' : 's'}</small></span>
                  <b data-due={parent.totalBalance > 0}>{parent.totalBalance > 0 ? formatCurrency(parent.totalBalance) : 'Settled'}</b>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>

          <aside className="edu-student-ops__family-passport">
            {selectedFamily ? <>
              <div className="edu-student-ops__family-passport-head"><span><UsersRound size={18} /></span><div><small>Family account</small><h2>{selectedFamily.parentName}</h2><p>{selectedFamily.phone}</p></div></div>
              <div className="edu-student-ops__family-money"><div><small>Expected</small><strong>{formatCurrency(selectedFamily.totalExpected)}</strong></div><div><small>Paid</small><strong>{formatCurrency(selectedFamily.totalPaid)}</strong></div><div data-due={selectedFamily.totalBalance > 0}><small>Balance</small><strong>{formatCurrency(selectedFamily.totalBalance)}</strong></div></div>
              <div className="edu-student-ops__children"><div><strong>Learners in this family</strong><span>{selectedFamily.children.length} connected</span></div>{selectedFamily.children.map(child => <button key={child.student.id} type="button" onClick={() => onViewProfile(child.student.id)}><span className="edu-student-ops__avatar">{getInitials(child.student.name)}</span><span><strong>{child.student.name}</strong><small>{child.enrollments[0]?.programName || 'No active enrollment'}</small></span><ChevronRight size={16} /></button>)}</div>
              <div className="edu-student-ops__family-actions"><button type="button" onClick={() => onOpenParentStatement(selectedFamily)}><WalletCards size={16} />Open statement</button><button type="button" onClick={() => onOpenParentStatement(selectedFamily)}><MessageSquare size={16} />Review account</button></div>
            </> : <div className="edu-student-ops__empty"><UsersRound size={22} /><strong>No family selected</strong></div>}
          </aside>
        </section>
      ) : (
        <EducationAdmissionsReadOnlyV1 projection={admissionProjection} programs={programs} canUseWhatsApp={can('admissions.whatsapp')} />
      )}
    </div>
  );
};

export default EducationStudentsOperationsV1;
