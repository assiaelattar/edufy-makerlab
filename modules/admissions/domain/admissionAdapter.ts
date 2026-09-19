import type { Lead } from '../../../types';
import type {
  AdaptLeadInput,
  AdmissionCase,
  AdmissionConfidence,
  AdmissionEvidenceSummary,
  AdmissionNextAction,
  AdmissionProjection,
  AdmissionProjectionInput,
  AdmissionRepairFlag,
  AdmissionStage,
  AdmissionStageReason,
  LinkedBookingEvidence,
  LinkedEnrollmentEvidence,
  LinkedStudentEvidence,
} from './admissionTypes';
import { isBookingStableLinkedToLead, normalizeAdmissionsPhone } from './admissionWorkshopLinks.ts';

const COMPLETED_BOOKING_STATUSES = new Set(['attended', 'feedback_requested', 'converted']);
const BOOKED_BOOKING_STATUSES = new Set(['confirmed', 'reminder_sent']);

const NEXT_ACTION_BY_STAGE: Record<AdmissionStage, AdmissionNextAction> = {
  new_inquiry: { kind: 'contact_parent', label: 'Contact the parent', source: 'compatibility_default', dueAt: null },
  qualifying: { kind: 'clarify_need', label: 'Clarify the family need', source: 'compatibility_default', dueAt: null },
  trial_to_plan: { kind: 'offer_trial_or_plan', label: 'Propose a trial or a plan', source: 'compatibility_default', dueAt: null },
  trial_booked: { kind: 'confirm_trial', label: 'Confirm the trial details', source: 'compatibility_default', dueAt: null },
  trial_completed: { kind: 'follow_up_after_trial', label: 'Follow up after the trial', source: 'compatibility_default', dueAt: null },
  enrolled: { kind: 'review_enrollment', label: 'Review the enrollment record', source: 'compatibility_default', dueAt: null },
  legacy_closed: { kind: 'review_closed_reason', label: 'Review why this case was closed', source: 'compatibility_default', dueAt: null },
};

const toIsoString = (value: unknown): string | null => {
  if (!value) return null;
  try {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    if (typeof value === 'object') {
      const timestamp = value as { toDate?: () => Date; seconds?: number };
      if (typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      }
      if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000).toISOString();
    }
  } catch {
    return null;
  }
  return null;
};

const unique = <T,>(values: T[]) => [...new Set(values)];

const hasExplicitLeadLink = (record: {
  admissionCaseId?: string;
  crmLeadId?: string;
  leadId?: string;
  sourceLeadId?: string;
}, leadId: string) => [record.admissionCaseId, record.crmLeadId, record.leadId, record.sourceLeadId].includes(leadId);

const pushFlag = (flags: AdmissionRepairFlag[], flag: AdmissionRepairFlag) => {
  if (!flags.includes(flag)) flags.push(flag);
};

const latestIso = (values: Array<string | null>) => values
  .filter((value): value is string => Boolean(value))
  .sort((left, right) => right.localeCompare(left))[0] || null;

const mapLegacyStage = (
  status: string,
  hasLinkedBooking: boolean,
  flags: AdmissionRepairFlag[],
): { stage: AdmissionStage; reason: AdmissionStageReason } => {
  switch (status) {
    case 'new':
      return { stage: 'new_inquiry', reason: 'legacy_status' };
    case 'contacted':
      pushFlag(flags, 'missing_next_action');
      return { stage: 'qualifying', reason: 'legacy_status' };
    case 'interested':
      pushFlag(flags, 'ambiguous_interest');
      return { stage: 'trial_to_plan', reason: 'legacy_status' };
    case 'workshop_booked':
    case 'demo_booked':
      if (!hasLinkedBooking) {
        pushFlag(flags, 'missing_booking_link');
        return { stage: 'trial_to_plan', reason: 'legacy_status' };
      }
      return { stage: 'trial_booked', reason: 'legacy_status' };
    case 'converted':
      pushFlag(flags, 'conversion_unverified');
      return { stage: 'trial_to_plan', reason: 'legacy_status' };
    case 'closed':
      pushFlag(flags, 'legacy_closed_reason_missing');
      return { stage: 'legacy_closed', reason: 'legacy_status' };
    default:
      pushFlag(flags, 'unknown_legacy_status');
      return { stage: 'new_inquiry', reason: 'legacy_status' };
  }
};

const buildEvidence = (
  lead: Lead,
  bookings: ReadonlyArray<LinkedBookingEvidence>,
  enrollments: ReadonlyArray<LinkedEnrollmentEvidence>,
): AdmissionEvidenceSummary[] => {
  const legacyTimeline = Array.isArray(lead.timeline) ? lead.timeline : [];
  const timelineEvidence = legacyTimeline.map((event, index): AdmissionEvidenceSummary => ({
    kind: 'legacy',
    label: event.details || event.type || 'Legacy activity',
    occurredAt: toIsoString(event.date),
    recordId: `${lead.id}:timeline:${index}`,
  }));
  const bookingEvidence = bookings.map((booking): AdmissionEvidenceSummary => ({
    kind: 'booking',
    label: `Workshop booking · ${String(booking.status || 'unknown').replace(/_/g, ' ')}`,
    occurredAt: toIsoString(booking.bookedAt),
    recordId: booking.id,
  }));
  const enrollmentEvidence = enrollments.map((enrollment): AdmissionEvidenceSummary => ({
    kind: 'enrollment',
    label: `Enrollment · ${enrollment.programName || enrollment.programId || 'program not recorded'}`,
    occurredAt: toIsoString(enrollment.createdAt) || toIsoString(enrollment.startDate),
    recordId: enrollment.id,
  }));

  return [...timelineEvidence, ...bookingEvidence, ...enrollmentEvidence]
    .sort((left, right) => (right.occurredAt || '').localeCompare(left.occurredAt || ''));
};

export const adaptLeadToAdmissionCase = ({
  tenantId,
  lead,
  bookings = [],
  students = [],
  enrollments = [],
}: AdaptLeadInput): AdmissionCase => {
  const flags: AdmissionRepairFlag[] = [];
  const leadStatus = String((lead as { status?: unknown }).status || '');
  const leadOrganizationId = String((lead as { organizationId?: unknown }).organizationId || '');
  const evidenceTenantId = leadOrganizationId === tenantId ? tenantId : '__tenant_mismatch__';

  if (leadOrganizationId !== tenantId) pushFlag(flags, 'lead_tenant_mismatch');

  const tenantBookings = bookings.filter(booking => booking.organizationId === evidenceTenantId);
  const tenantStudents = students.filter(student => student.organizationId === evidenceTenantId);
  const tenantEnrollments = enrollments.filter(enrollment => enrollment.organizationId === evidenceTenantId);

  const linkedBookings = tenantBookings.filter(booking =>
    isBookingStableLinkedToLead(booking, lead.id));
  const linkedStudents = tenantStudents.filter(student => hasExplicitLeadLink(student, lead.id));
  const linkedStudentIds = new Set(linkedStudents.map(student => student.id));
  const linkedEnrollments = tenantEnrollments.filter(enrollment =>
    hasExplicitLeadLink(enrollment, lead.id) || linkedStudentIds.has(enrollment.studentId));
  const activeEnrollments = linkedEnrollments.filter(enrollment => enrollment.status === 'active');

  activeEnrollments.forEach(enrollment => linkedStudentIds.add(enrollment.studentId));
  if (linkedStudentIds.size > 1) pushFlag(flags, 'multiple_stable_student_links');

  const normalizedLeadPhone = normalizeAdmissionsPhone(lead.phone);
  const phoneCandidateBookings = normalizedLeadPhone
    ? tenantBookings.filter(booking => !linkedBookings.includes(booking) && normalizeAdmissionsPhone(booking.phoneNumber) === normalizedLeadPhone)
    : [];
  const phoneCandidateStudents = normalizedLeadPhone
    ? tenantStudents.filter(student => !linkedStudentIds.has(student.id) && normalizeAdmissionsPhone(student.parentPhone) === normalizedLeadPhone)
    : [];

  if (phoneCandidateBookings.length > 0) pushFlag(flags, 'phone_only_booking_candidate');
  if (phoneCandidateStudents.length > 0) pushFlag(flags, 'phone_only_student_candidate');

  const learnerName = String(lead.name || '').trim();
  const parentName = String(lead.parentName || '').trim();
  const phone = String(lead.phone || '').trim();
  const createdAt = toIsoString(lead.createdAt);

  if (!learnerName) pushFlag(flags, 'missing_lead_name');
  if (!parentName) pushFlag(flags, 'missing_parent_name');
  if (!phone && !lead.email) pushFlag(flags, 'missing_contact');
  if (!createdAt) pushFlag(flags, 'missing_created_at');

  const completedBooking = linkedBookings.find(booking => COMPLETED_BOOKING_STATUSES.has(String(booking.status)));
  const bookedWorkshop = linkedBookings.find(booking => BOOKED_BOOKING_STATUSES.has(String(booking.status)));

  let stageResult: { stage: AdmissionStage; reason: AdmissionStageReason };
  if (activeEnrollments.length > 0) {
    stageResult = { stage: 'enrolled', reason: 'active_enrollment' };
  } else if (completedBooking) {
    stageResult = { stage: 'trial_completed', reason: 'completed_workshop' };
  } else if (bookedWorkshop) {
    stageResult = { stage: 'trial_booked', reason: 'booked_workshop' };
  } else {
    stageResult = mapLegacyStage(leadStatus, linkedBookings.length > 0, flags);
    if (linkedBookings.length > 0 && (leadStatus === 'workshop_booked' || leadStatus === 'demo_booked')) {
      pushFlag(flags, 'inactive_booking_evidence');
    }
  }

  const evidence = buildEvidence(lead, linkedBookings, linkedEnrollments);
  const lastActivityAt = latestIso([createdAt, ...evidence.map(item => item.occurredAt)]);
  const confidence: AdmissionConfidence = flags.length > 0
    ? 'needs_repair'
    : stageResult.reason === 'legacy_status' ? 'provisional' : 'verified';

  return {
    id: lead.id,
    organizationId: leadOrganizationId,
    legacyLeadId: lead.id,
    legacyStatus: leadStatus || 'missing',
    learnerName: learnerName || 'Learner name missing',
    parentName: parentName || 'Parent name missing',
    phone,
    email: lead.email || null,
    source: String(lead.source || 'Source not recorded'),
    programId: lead.programId || null,
    interestLabels: unique([...(lead.interests || []), ...(lead.tags || [])].filter(Boolean)),
    stage: stageResult.stage,
    stageReason: stageResult.reason,
    confidence,
    createdAt,
    lastActivityAt,
    nextAction: NEXT_ACTION_BY_STAGE[stageResult.stage],
    repairFlags: flags,
    evidence,
    linkedBookingIds: linkedBookings.map(booking => booking.id),
    linkedStudentIds: [...linkedStudentIds],
    linkedEnrollmentIds: linkedEnrollments.map(enrollment => enrollment.id),
    phoneCandidateBookingIds: phoneCandidateBookings.map(booking => booking.id),
    phoneCandidateStudentIds: phoneCandidateStudents.map(student => student.id),
  };
};

const PRIORITY_BY_STAGE: Record<AdmissionStage, number> = {
  new_inquiry: 0,
  trial_completed: 1,
  qualifying: 2,
  trial_to_plan: 3,
  trial_booked: 4,
  legacy_closed: 5,
  enrolled: 6,
};

export const projectAdmissionCases = ({
  tenantId,
  leads,
  bookings = [],
  students = [],
  enrollments = [],
}: AdmissionProjectionInput): AdmissionProjection => {
  const tenantLeads = leads.filter(lead => lead.organizationId === tenantId);
  const ignoredLeadIds = leads.filter(lead => lead.organizationId !== tenantId).map(lead => lead.id);
  const cases = tenantLeads
    .map(lead => adaptLeadToAdmissionCase({ tenantId, lead, bookings, students, enrollments }))
    .sort((left, right) => {
      const repairDifference = Number(right.repairFlags.length > 0) - Number(left.repairFlags.length > 0);
      if (repairDifference !== 0) return repairDifference;
      const stageDifference = PRIORITY_BY_STAGE[left.stage] - PRIORITY_BY_STAGE[right.stage];
      if (stageDifference !== 0) return stageDifference;
      return (right.lastActivityAt || '').localeCompare(left.lastActivityAt || '');
    });

  return {
    cases,
    ignoredLeadIds,
    counts: {
      total: cases.length,
      needsRepair: cases.filter(item => item.repairFlags.length > 0).length,
      awaitingAction: cases.filter(item => item.stage !== 'enrolled' && item.stage !== 'legacy_closed').length,
      trial: cases.filter(item => item.stage === 'trial_booked' || item.stage === 'trial_completed').length,
      enrolled: cases.filter(item => item.stage === 'enrolled').length,
    },
  };
};
