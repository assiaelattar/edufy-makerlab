import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Layers3,
  MessageCircle,
  Rows3,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import type { AdmissionCase, AdmissionProjection, AdmissionRepairFlag, AdmissionStage } from '../domain';
import {
  ADMISSION_STAGES,
  getAdmissionCaseAgeDays,
  getAdmissionStageCounts,
  searchAdmissionCases,
  selectAdmissionTodayCases,
} from '../domain';
import { EducationAdmissionsWhatsAppAssistant } from './EducationAdmissionsWhatsAppAssistant';
import './education-admissions-v1.css';

type ProgramSummary = { id: string; name: string };
type WorkspaceView = 'today' | 'pipeline' | 'all';
type AllStageFilter = 'all' | AdmissionStage;

const STAGE_META: Record<AdmissionStage, { label: string; shortLabel: string }> = {
  new_inquiry: { label: 'New inquiry', shortLabel: 'Inquiry' },
  qualifying: { label: 'Needs qualification', shortLabel: 'Qualify' },
  trial_to_plan: { label: 'Trial or plan decision', shortLabel: 'Trial / plan' },
  trial_booked: { label: 'Trial booked', shortLabel: 'Booked' },
  trial_completed: { label: 'Trial completed', shortLabel: 'Completed' },
  enrolled: { label: 'Enrolled', shortLabel: 'Enrolled' },
  legacy_closed: { label: 'Legacy closed', shortLabel: 'Closed' },
};

const VIEW_COPY: Record<WorkspaceView, { eyebrow: string; title: string; description: string }> = {
  today: {
    eyebrow: 'Today · active follow-up',
    title: 'Families still waiting for a next step.',
    description: 'An honest triage of active legacy cases. No task date means no case is labelled due or overdue.',
  },
  pipeline: {
    eyebrow: 'Pipeline · journey position',
    title: 'See every stage without dragging a board.',
    description: 'Choose a stage to review its families. Verified workshop and enrollment evidence outranks legacy labels.',
  },
  all: {
    eyebrow: 'All cases · complete inventory',
    title: 'Every projected family stays findable.',
    description: 'Search the full tenant-safe inventory, then narrow by stage or compatibility repairs.',
  },
};

const REPAIR_LABELS: Record<AdmissionRepairFlag, string> = {
  ambiguous_interest: 'Interest needs classification',
  conversion_unverified: 'Conversion has no enrollment link',
  inactive_booking_evidence: 'Linked booking is no longer active',
  lead_tenant_mismatch: 'Lead tenant does not match',
  legacy_closed_reason_missing: 'Closed reason is missing',
  missing_booking_link: 'Workshop booking link is missing',
  missing_contact: 'Family contact is missing',
  missing_created_at: 'Creation date is missing',
  missing_lead_name: 'Learner name is missing',
  missing_next_action: 'No structured next action',
  missing_parent_name: 'Parent name is missing',
  multiple_stable_student_links: 'Multiple learner links need review',
  phone_only_booking_candidate: 'Workshop candidate matched by phone only',
  phone_only_student_candidate: 'Learner candidate matched by phone only',
  unknown_legacy_status: 'Unknown legacy status',
};

const JOURNEY_STAGES: Array<{ stage: AdmissionStage; label: string }> = [
  { stage: 'new_inquiry', label: 'Inquiry' },
  { stage: 'qualifying', label: 'Family need' },
  { stage: 'trial_to_plan', label: 'Trial or plan' },
  { stage: 'trial_booked', label: 'Trial booked' },
  { stage: 'trial_completed', label: 'Trial complete' },
  { stage: 'enrolled', label: 'Enrollment' },
];

const formatActivityAge = (admissionCase: AdmissionCase) => {
  const ageDays = getAdmissionCaseAgeDays(admissionCase);
  if (ageDays === null) return 'Activity date missing';
  if (ageDays === 0) return 'Activity recorded today';
  if (ageDays === 1) return '1 day since recorded activity';
  return `${ageDays} days since recorded activity`;
};

const formatDate = (value: string | null) => {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not recorded'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

export const EducationAdmissionsReadOnlyV1 = ({
  projection,
  programs,
  canUseWhatsApp,
}: {
  projection: AdmissionProjection;
  programs: ProgramSummary[];
  canUseWhatsApp: boolean;
}) => {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('today');
  const [query, setQuery] = useState('');
  const [repairOnly, setRepairOnly] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<AdmissionStage>('new_inquiry');
  const [allStage, setAllStage] = useState<AllStageFilter>('all');
  const [selectedId, setSelectedId] = useState('');
  const [isMobilePassportOpen, setIsMobilePassportOpen] = useState(false);
  const [isWhatsAppAssistantOpen, setIsWhatsAppAssistantOpen] = useState(false);

  const programNames = useMemo(() => new Map(programs.map(program => [program.id, program.name])), [programs]);
  const stageCounts = useMemo(() => getAdmissionStageCounts(projection.cases), [projection.cases]);
  const todayCases = useMemo(() => selectAdmissionTodayCases(projection.cases), [projection.cases]);
  const searchedCases = useMemo(() => searchAdmissionCases(projection.cases, query), [projection.cases, query]);
  const visibleCases = useMemo(() => {
    const viewCases = workspaceView === 'today'
      ? selectAdmissionTodayCases(searchedCases)
      : workspaceView === 'pipeline'
        ? searchedCases.filter(admissionCase => admissionCase.stage === pipelineStage)
        : allStage === 'all'
          ? searchedCases
          : searchedCases.filter(admissionCase => admissionCase.stage === allStage);
    return repairOnly ? viewCases.filter(admissionCase => admissionCase.repairFlags.length > 0) : viewCases;
  }, [allStage, pipelineStage, repairOnly, searchedCases, workspaceView]);

  const selectedCase = visibleCases.find(admissionCase => admissionCase.id === selectedId)
    || visibleCases[0]
    || null;

  useEffect(() => {
    if (visibleCases.length === 0) {
      setSelectedId('');
      return;
    }
    if (!visibleCases.some(admissionCase => admissionCase.id === selectedId)) {
      setSelectedId(visibleCases[0].id);
    }
  }, [selectedId, visibleCases]);

  useEffect(() => {
    if (!isMobilePassportOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobilePassportOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobilePassportOpen]);

  const changeWorkspaceView = (view: WorkspaceView) => {
    setWorkspaceView(view);
    setQuery('');
    setRepairOnly(false);
    setAllStage('all');
    setIsMobilePassportOpen(false);
    setIsWhatsAppAssistantOpen(false);
  };

  const resetCurrentView = () => {
    setQuery('');
    setRepairOnly(false);
    if (workspaceView === 'all') setAllStage('all');
  };

  const selectedJourneyIndex = selectedCase?.stage === 'legacy_closed'
    ? -1
    : JOURNEY_STAGES.findIndex(item => item.stage === selectedCase?.stage);
  const selectedProgram = selectedCase?.programId ? programNames.get(selectedCase.programId) : null;
  const viewCopy = VIEW_COPY[workspaceView];

  return (
    <section className="edu-admissions-v1" data-testid="education-admissions-read-only-v1" aria-label="Admissions workspace">
      <div className="edu-admissions-v1__status-line">
        <div><span>Legacy cases visible</span><strong>{projection.counts.total}</strong></div>
        <div><span>Active follow-up</span><strong>{todayCases.length}</strong></div>
        <div><span>Trial journey</span><strong>{projection.counts.trial}</strong></div>
        <div data-attention={projection.counts.needsRepair > 0}><span>Needs review</span><strong>{projection.counts.needsRepair}</strong></div>
        <p><ShieldCheck size={15} />Evidence-based projection · controlled activity logging</p>
      </div>

      <nav className="edu-admissions-v1__view-tabs" role="tablist" aria-label="Admissions workspace views">
        <button type="button" role="tab" aria-selected={workspaceView === 'today'} aria-controls="admissions-workbench" onClick={() => changeWorkspaceView('today')}><Clock3 size={16} /><span>Today</span><b>{todayCases.length}</b></button>
        <button type="button" role="tab" aria-selected={workspaceView === 'pipeline'} aria-controls="admissions-workbench" onClick={() => changeWorkspaceView('pipeline')}><Layers3 size={16} /><span>Pipeline</span><b>{projection.counts.total}</b></button>
        <button type="button" role="tab" aria-selected={workspaceView === 'all'} aria-controls="admissions-workbench" onClick={() => changeWorkspaceView('all')}><Rows3 size={16} /><span>All cases</span><b>{projection.counts.total}</b></button>
      </nav>

      <div className="edu-admissions-v1__workbench" id="admissions-workbench" role="tabpanel" data-view={workspaceView}>
        <div className="edu-admissions-v1__queue">
          <header className="edu-admissions-v1__queue-head">
            <div><span>{viewCopy.eyebrow}</span><h2>{viewCopy.title}</h2><p>{viewCopy.description}</p></div>
            <b>{visibleCases.length} shown</b>
          </header>

          {workspaceView === 'today' && (
            <div className="edu-admissions-v1__honesty-note">
              <Clock3 size={17} aria-hidden="true" />
              <div><strong>Active, not overdue</strong><span>The legacy CRM stores no due dates. This queue prioritizes an honest next conversation, not an invented deadline.</span></div>
            </div>
          )}

          <label className="edu-admissions-v1__search">
            <Search size={18} aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Find a learner, parent, phone, program or source" aria-label="Search admission cases" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear admissions search"><X size={16} /></button>}
          </label>

          {workspaceView === 'pipeline' && (
            <div className="edu-admissions-v1__pipeline-control">
              <div className="edu-admissions-v1__control-label"><div><strong>Journey stage</strong><span>All seven canonical states stay visible, including empty ones.</span></div><small>{stageCounts[pipelineStage]} in stage</small></div>
              <div className="edu-admissions-v1__stage-grid" role="group" aria-label="Choose a pipeline stage">
                {ADMISSION_STAGES.map(stage => (
                  <button key={stage} type="button" aria-pressed={pipelineStage === stage} onClick={() => setPipelineStage(stage)}>
                    <span>{STAGE_META[stage].shortLabel}</span><b>{stageCounts[stage]}</b>
                  </button>
                ))}
              </div>
            </div>
          )}

          {workspaceView === 'all' && (
            <div className="edu-admissions-v1__all-controls" aria-label="All case filters">
              <label><span>Journey stage</span><div><select value={allStage} onChange={event => setAllStage(event.target.value as AllStageFilter)} aria-label="Filter all cases by stage"><option value="all">Every stage · {projection.counts.total}</option>{ADMISSION_STAGES.map(stage => <option key={stage} value={stage}>{STAGE_META[stage].label} · {stageCounts[stage]}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></div></label>
              <div><span>Compatibility</span><button type="button" aria-pressed={repairOnly} onClick={() => setRepairOnly(value => !value)}><AlertTriangle size={15} />{repairOnly ? 'Showing needs review' : `Needs review · ${projection.counts.needsRepair}`}</button></div>
            </div>
          )}

          {workspaceView !== 'all' && (
            <div className="edu-admissions-v1__review-filter">
              <button type="button" aria-pressed={repairOnly} onClick={() => setRepairOnly(value => !value)}><AlertTriangle size={15} />{repairOnly ? 'Showing needs review only' : `Filter needs review · ${projection.counts.needsRepair}`}</button>
              <span>Repair flags narrow this view; they never hide a family by default.</span>
            </div>
          )}

          <div className="edu-admissions-v1__case-list" id="admissions-case-list" aria-live="polite">
            {visibleCases.length === 0 ? (
              <div className="edu-admissions-v1__empty"><Search size={24} /><strong>No family matches this view</strong><span>Clear the search or choose another journey stage.</span><button type="button" onClick={resetCurrentView}>Reset this view</button></div>
            ) : visibleCases.map(admissionCase => (
              <button
                key={admissionCase.id}
                type="button"
                className="edu-admissions-v1__case"
                data-selected={selectedCase?.id === admissionCase.id}
                aria-pressed={selectedCase?.id === admissionCase.id}
                onClick={() => {
                  setSelectedId(admissionCase.id);
                  setIsMobilePassportOpen(true);
                  setIsWhatsAppAssistantOpen(false);
                }}
              >
                <span className="edu-admissions-v1__avatar">{getInitials(admissionCase.learnerName)}</span>
                <span className="edu-admissions-v1__case-copy">
                  <strong>{admissionCase.learnerName}</strong>
                  <small>{admissionCase.parentName} · {selectedProgramFor(admissionCase, programNames)}</small>
                  <em>{formatActivityAge(admissionCase)}</em>
                </span>
                <span className="edu-admissions-v1__case-state">
                  <b data-repair={admissionCase.repairFlags.length > 0}>{STAGE_META[admissionCase.stage].shortLabel}</b>
                  <small>{admissionCase.repairFlags.length > 0 ? `${admissionCase.repairFlags.length} to review` : admissionCase.confidence}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <aside className="edu-admissions-v1__passport" data-mobile-open={isMobilePassportOpen} aria-label="Selected family journey passport">
          {selectedCase ? (
            <>
              <div className="edu-admissions-v1__passport-top">
                <button type="button" className="edu-admissions-v1__passport-close" onClick={() => setIsMobilePassportOpen(false)} aria-label="Close family journey passport"><X size={16} /><span>Back</span></button>
                <span>Family journey passport · safe workflow</span>
                <div><i>{getInitials(selectedCase.learnerName)}</i><div><h2>{selectedCase.learnerName}</h2><p>{selectedCase.parentName} · {selectedCase.phone || selectedCase.email || 'Contact not recorded'}</p></div></div>
                <b data-repair={selectedCase.repairFlags.length > 0}>{STAGE_META[selectedCase.stage].label}</b>
              </div>

              <div className="edu-admissions-v1__passport-body">
                <div className="edu-admissions-v1__next-action">
                  <span><Sparkles size={17} /></span>
                  <div><small>Suggested from the legacy stage</small><strong>{selectedCase.nextAction.label}</strong><em>No due date exists in the legacy CRM.</em></div>
                </div>

                <button type="button" className="edu-admissions-v1__whatsapp-action" onClick={() => setIsWhatsAppAssistantOpen(true)} disabled={!canUseWhatsApp || !selectedCase.phone}>
                  <MessageCircle size={17} />
                  <span><strong>WhatsApp assistant</strong><small>{!selectedCase.phone ? 'Parent phone missing' : canUseWhatsApp ? 'Preview, open, and record the result' : 'Permission required'}</small></span>
                  <ChevronRight size={16} />
                </button>

                <div className="edu-admissions-v1__journey" data-closed={selectedCase.stage === 'legacy_closed'}>
                  <div><strong>Family journey</strong><span>{selectedCase.stage === 'legacy_closed' ? 'Closed legacy state needs a reason' : 'Verified evidence outranks legacy labels'}</span></div>
                  <ol>
                    {JOURNEY_STAGES.map((item, index) => {
                      const state = selectedCase.stage === 'legacy_closed' ? 'future' : index < selectedJourneyIndex ? 'complete' : index === selectedJourneyIndex ? 'current' : 'future';
                      return <li key={item.stage} data-state={state}><i>{state === 'complete' ? <Check size={12} /> : state === 'current' ? <Sparkles size={11} /> : <Circle size={9} />}</i><span>{item.label}</span></li>;
                    })}
                  </ol>
                </div>

                <div className="edu-admissions-v1__facts">
                  <div><small>Interest</small><strong>{selectedProgram || selectedCase.interestLabels[0] || 'Not classified'}</strong><span>{selectedCase.source}</span></div>
                  <div><small>Legacy record</small><strong>{selectedCase.legacyStatus.replace(/_/g, ' ')}</strong><span>Created {formatDate(selectedCase.createdAt)}</span></div>
                  <div><small>Workshop evidence</small><strong>{selectedCase.linkedBookingIds.length} stable link{selectedCase.linkedBookingIds.length === 1 ? '' : 's'}</strong><span>{selectedCase.phoneCandidateBookingIds.length} phone-only candidate{selectedCase.phoneCandidateBookingIds.length === 1 ? '' : 's'}</span></div>
                  <div><small>Enrollment evidence</small><strong>{selectedCase.linkedEnrollmentIds.length} linked record{selectedCase.linkedEnrollmentIds.length === 1 ? '' : 's'}</strong><span>{selectedCase.linkedStudentIds.length} learner link{selectedCase.linkedStudentIds.length === 1 ? '' : 's'}</span></div>
                </div>

                {selectedCase.repairFlags.length > 0 ? (
                  <div className="edu-admissions-v1__repairs">
                    <div><AlertTriangle size={16} /><strong>Compatibility review</strong><span>{selectedCase.repairFlags.length} item{selectedCase.repairFlags.length === 1 ? '' : 's'}</span></div>
                    <ul>{selectedCase.repairFlags.map(flag => <li key={flag}>{REPAIR_LABELS[flag]}</li>)}</ul>
                  </div>
                ) : (
                  <div className="edu-admissions-v1__verified"><ShieldCheck size={17} /><div><strong>No compatibility repair detected</strong><span>Lifecycle stages remain evidence-based.</span></div></div>
                )}

                <div className="edu-admissions-v1__evidence">
                  <div><Clock3 size={15} /><strong>Recorded evidence</strong><span>{selectedCase.evidence.length}</span></div>
                  {selectedCase.evidence.length === 0 ? <p>No timeline, workshop, or enrollment evidence is linked.</p> : <ul>{selectedCase.evidence.slice(0, 5).map(item => <li key={`${item.kind}:${item.recordId}`}><i data-kind={item.kind}>{item.kind}</i><span><strong>{item.label}</strong><small>{formatDate(item.occurredAt)}</small></span></li>)}</ul>}
                </div>
              </div>
            </>
          ) : <div className="edu-admissions-v1__empty edu-admissions-v1__empty--passport"><UserRound size={25} /><strong>No family selected</strong><span>The passport appears when a projected case is available.</span></div>}
        </aside>
      </div>
      {selectedCase && <EducationAdmissionsWhatsAppAssistant key={`${selectedCase.organizationId}:${selectedCase.id}`} admissionCase={selectedCase} programName={selectedProgram || ''} isOpen={isWhatsAppAssistantOpen} onClose={() => setIsWhatsAppAssistantOpen(false)} />}
    </section>
  );
};

const selectedProgramFor = (admissionCase: AdmissionCase, programNames: Map<string, string>) =>
  (admissionCase.programId ? programNames.get(admissionCase.programId) : null)
  || admissionCase.interestLabels[0]
  || 'Interest not classified';
