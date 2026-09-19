import type { Booking, Enrollment, Lead, Student } from '../../../types';

export const ADMISSION_STAGES = [
  'new_inquiry',
  'qualifying',
  'trial_to_plan',
  'trial_booked',
  'trial_completed',
  'enrolled',
  'legacy_closed',
] as const;

export type AdmissionStage = typeof ADMISSION_STAGES[number];

export type AdmissionStageReason =
  | 'active_enrollment'
  | 'completed_workshop'
  | 'booked_workshop'
  | 'legacy_status';

export type AdmissionRepairFlag =
  | 'ambiguous_interest'
  | 'conversion_unverified'
  | 'inactive_booking_evidence'
  | 'lead_tenant_mismatch'
  | 'legacy_closed_reason_missing'
  | 'missing_booking_link'
  | 'missing_contact'
  | 'missing_created_at'
  | 'missing_lead_name'
  | 'missing_next_action'
  | 'missing_parent_name'
  | 'multiple_stable_student_links'
  | 'phone_only_booking_candidate'
  | 'phone_only_student_candidate'
  | 'unknown_legacy_status';

export type AdmissionNextActionKind =
  | 'contact_parent'
  | 'clarify_need'
  | 'offer_trial_or_plan'
  | 'confirm_trial'
  | 'follow_up_after_trial'
  | 'review_enrollment'
  | 'review_closed_reason';

export type AdmissionEvidenceKind = 'legacy' | 'booking' | 'enrollment';

export type AdmissionConfidence = 'verified' | 'provisional' | 'needs_repair';

export type LinkedBookingEvidence = Booking & {
  admissionCaseId?: string;
  crmLeadId?: string;
  leadId?: string;
};

export type LinkedStudentEvidence = Student & {
  admissionCaseId?: string;
  crmLeadId?: string;
  leadId?: string;
  sourceLeadId?: string;
};

export type LinkedEnrollmentEvidence = Enrollment & {
  admissionCaseId?: string;
  crmLeadId?: string;
  leadId?: string;
  sourceLeadId?: string;
};

export interface AdmissionNextAction {
  kind: AdmissionNextActionKind;
  label: string;
  source: 'compatibility_default';
  dueAt: null;
}

export interface AdmissionEvidenceSummary {
  kind: AdmissionEvidenceKind;
  label: string;
  occurredAt: string | null;
  recordId: string;
}

export interface AdmissionCase {
  id: string;
  organizationId: string;
  legacyLeadId: string;
  legacyStatus: string;
  learnerName: string;
  parentName: string;
  phone: string;
  email: string | null;
  source: string;
  programId: string | null;
  interestLabels: string[];
  stage: AdmissionStage;
  stageReason: AdmissionStageReason;
  confidence: AdmissionConfidence;
  createdAt: string | null;
  lastActivityAt: string | null;
  nextAction: AdmissionNextAction;
  repairFlags: AdmissionRepairFlag[];
  evidence: AdmissionEvidenceSummary[];
  linkedBookingIds: string[];
  linkedStudentIds: string[];
  linkedEnrollmentIds: string[];
  phoneCandidateBookingIds: string[];
  phoneCandidateStudentIds: string[];
}

export interface AdmissionProjectionInput {
  tenantId: string;
  leads: ReadonlyArray<Lead>;
  bookings?: ReadonlyArray<LinkedBookingEvidence>;
  students?: ReadonlyArray<LinkedStudentEvidence>;
  enrollments?: ReadonlyArray<LinkedEnrollmentEvidence>;
}

export interface AdmissionProjection {
  cases: AdmissionCase[];
  ignoredLeadIds: string[];
  counts: {
    total: number;
    needsRepair: number;
    awaitingAction: number;
    trial: number;
    enrolled: number;
  };
}

export interface AdaptLeadInput {
  tenantId: string;
  lead: Lead;
  bookings?: ReadonlyArray<LinkedBookingEvidence>;
  students?: ReadonlyArray<LinkedStudentEvidence>;
  enrollments?: ReadonlyArray<LinkedEnrollmentEvidence>;
}
