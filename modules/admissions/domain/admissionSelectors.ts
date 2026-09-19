import type { AdmissionCase, AdmissionStage } from './admissionTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

const TODAY_STAGE_PRIORITY: Record<AdmissionStage, number> = {
  new_inquiry: 0,
  trial_completed: 1,
  qualifying: 2,
  trial_to_plan: 3,
  trial_booked: 4,
  enrolled: 5,
  legacy_closed: 6,
};

export const getAdmissionCaseAgeDays = (admissionCase: AdmissionCase, now: Date = new Date()) => {
  const anchor = admissionCase.lastActivityAt || admissionCase.createdAt;
  if (!anchor) return null;
  const anchorTime = new Date(anchor).getTime();
  if (Number.isNaN(anchorTime)) return null;
  return Math.max(0, Math.floor((now.getTime() - anchorTime) / DAY_MS));
};

export const isAdmissionCaseOlderThan = (
  admissionCase: AdmissionCase,
  thresholdDays: number,
  now: Date = new Date(),
) => {
  const ageDays = getAdmissionCaseAgeDays(admissionCase, now);
  return ageDays !== null && ageDays > Math.max(0, thresholdDays);
};

export const getAdmissionStageCounts = (cases: ReadonlyArray<AdmissionCase>) => cases.reduce(
  (counts, admissionCase) => {
    counts[admissionCase.stage] += 1;
    return counts;
  },
  {
    new_inquiry: 0,
    qualifying: 0,
    trial_to_plan: 0,
    trial_booked: 0,
    trial_completed: 0,
    enrolled: 0,
    legacy_closed: 0,
  } satisfies Record<AdmissionStage, number>,
);

export const isAdmissionCaseActive = (admissionCase: AdmissionCase) =>
  admissionCase.stage !== 'enrolled' && admissionCase.stage !== 'legacy_closed';

/**
 * Compatibility-only triage. These cases have no structured task or due date,
 * so this selector deliberately exposes active follow-up without implying SLA,
 * overdue, or promised timing.
 */
export const selectAdmissionTodayCases = (cases: ReadonlyArray<AdmissionCase>) => cases
  .filter(isAdmissionCaseActive)
  .sort((left, right) => {
    const stageDifference = TODAY_STAGE_PRIORITY[left.stage] - TODAY_STAGE_PRIORITY[right.stage];
    if (stageDifference !== 0) return stageDifference;

    const leftAnchor = left.lastActivityAt || left.createdAt;
    const rightAnchor = right.lastActivityAt || right.createdAt;
    if (leftAnchor && rightAnchor) {
      const ageDifference = new Date(leftAnchor).getTime() - new Date(rightAnchor).getTime();
      if (!Number.isNaN(ageDifference) && ageDifference !== 0) return ageDifference;
    }
    if (leftAnchor && !rightAnchor) return -1;
    if (!leftAnchor && rightAnchor) return 1;
    return left.id.localeCompare(right.id);
  });

export const searchAdmissionCases = (cases: ReadonlyArray<AdmissionCase>, query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...cases];
  return cases.filter(admissionCase => [
    admissionCase.learnerName,
    admissionCase.parentName,
    admissionCase.phone,
    admissionCase.email,
    admissionCase.source,
    admissionCase.programId,
    admissionCase.legacyStatus,
    ...admissionCase.interestLabels,
  ].filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedQuery));
};
