/**
 * Adaptive Programs domain contracts.
 *
 * Dates and timestamps use ISO-8601 strings so this layer remains independent
 * from Firebase and can be shared by clients, server functions, and tests.
 */

export type ISODate = string;
export type ISODateTime = string;
export type LocalTime = string;
export type TimeZoneId = string;
export type CurrencyCode = string;
export type ActorId = string;

export interface TenantScoped {
  organizationId: string;
}

export interface AuditFields {
  createdAt: ISODateTime;
  createdBy: ActorId;
  updatedAt: ISODateTime;
  updatedBy: ActorId;
}

export type ProgramFormatPreset =
  | 'weekly_academy'
  | 'camp'
  | 'bootcamp'
  | 'one_day_workshop'
  | 'workshop_series'
  | 'school_term'
  | 'custom';

export type ProgramRunStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'full'
  | 'running'
  | 'completed'
  | 'canceled'
  | 'archived';

export type ProgramGroupStatus = 'draft' | 'open' | 'full' | 'active' | 'completed' | 'canceled';
export type WaitlistMode = 'disabled' | 'automatic' | 'approval_required';
export type ScheduleBlockStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ScheduleKind = 'recurring' | 'explicit_dates';
export type ScheduleFrequency = 'daily' | 'weekly' | 'every_two_weeks' | 'monthly';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ShiftKind = 'morning' | 'afternoon' | 'evening' | 'full_day' | 'custom';

export type ClassOccurrenceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'rescheduled';

export type PricingOfferStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';
export type BillingMode = 'one_time' | 'weekly' | 'monthly' | 'term' | 'semester' | 'annual';
export type IncludedUnit = 'week' | 'occurrence' | 'run' | 'material' | 'add_on';
export type CapacityReservationMode = 'none' | 'hold_until_payment' | 'reserve_on_acceptance';

export type DiscountKind =
  | 'promotion'
  | 'sibling'
  | 'scholarship'
  | 'partner'
  | 'early_bird'
  | 'manual';

export type DiscountValueType = 'percentage' | 'fixed_amount';
export type DiscountRuleStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';

export type EnrollmentAgreementStatus =
  | 'draft'
  | 'pending_review'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'canceled'
  | 'rejected';

export type EnrollmentItemKind = 'run' | 'week' | 'group' | 'occurrence_bundle' | 'add_on';
export type EnrollmentItemStatus = 'pending' | 'reserved' | 'active' | 'completed' | 'canceled';
export type RegistrationMode = 'fast' | 'extended';
export type RegistrationPageStatus = 'draft' | 'published' | 'paused' | 'expired' | 'archived';
export type RegistrationReviewMode = 'automatic' | 'staff_review';

export type DocumentTemplateKind =
  | 'registration_confirmation'
  | 'enrollment_attestation'
  | 'attendance_attestation'
  | 'participation_attestation'
  | 'completion_certificate'
  | 'achievement_certificate'
  | 'invoice_reference'
  | 'receipt_reference'
  | 'learner_badge'
  | 'program_card';

export type DocumentTemplateStatus = 'draft' | 'active' | 'archived';
export type IssuedDocumentStatus = 'issued' | 'replaced' | 'revoked' | 'expired';
export type DocumentIssuingMode = 'staff' | 'automation';

export interface ProgramRun extends TenantScoped, AuditFields {
  id: string;
  programId: string;
  academicPeriodId?: string;
  formatPreset: ProgramFormatPreset;
  name: string;
  description?: string;
  startDate: ISODate;
  endDate: ISODate;
  timezone: TimeZoneId;
  enrollmentOpensAt?: ISODateTime;
  enrollmentClosesAt?: ISODateTime;
  campusId?: string;
  locationName?: string;
  status: ProgramRunStatus;
  defaultCapacity?: number;
  waitlistMode: WaitlistMode;
  waitlistCapacity?: number;
  publishedAt?: ISODateTime;
  publishedBy?: ActorId;
  canceledAt?: ISODateTime;
  canceledBy?: ActorId;
  cancellationReason?: string;
  sourceRunId?: string;
  customFields?: Record<string, unknown>;
}

export interface ProgramGroup extends TenantScoped, AuditFields {
  id: string;
  programId: string;
  programRunId: string;
  name: string;
  level?: string;
  track?: string;
  shiftLabel?: string;
  capacity: number;
  enrolledCount: number;
  reservedCount?: number;
  waitlistCount: number;
  waitlistMode?: WaitlistMode;
  instructorIds: string[];
  roomIds: string[];
  resourceIds?: string[];
  status: ProgramGroupStatus;
  notes?: string;
}

export interface ScheduleExclusion {
  date: ISODate;
  reason?: string;
}

export interface ScheduleOverride {
  date: ISODate;
  startTime?: LocalTime;
  endTime?: LocalTime;
  roomId?: string;
  instructorIds?: string[];
  status?: 'scheduled' | 'canceled' | 'rescheduled';
  reason?: string;
}

export interface ExplicitScheduleDate {
  date: ISODate;
  startTime: LocalTime;
  endTime: LocalTime;
  roomId?: string;
  instructorIds?: string[];
  label?: string;
}

export interface ScheduleBlockBase extends TenantScoped, AuditFields {
  id: string;
  programId: string;
  programRunId: string;
  programGroupId: string;
  name: string;
  kind: ScheduleKind;
  timezone: TimeZoneId;
  shift: ShiftKind;
  shiftLabel?: string;
  roomId?: string;
  instructorIds: string[];
  resourceIds?: string[];
  exclusions?: ScheduleExclusion[];
  overrides?: ScheduleOverride[];
  status: ScheduleBlockStatus;
}

export interface RecurringScheduleBlock extends ScheduleBlockBase {
  kind: 'recurring';
  frequency: ScheduleFrequency;
  interval: number;
  weekdays: Weekday[];
  recurrenceStartDate: ISODate;
  recurrenceEndDate: ISODate;
  startTime: LocalTime;
  endTime: LocalTime;
}

export interface ExplicitDateScheduleBlock extends ScheduleBlockBase {
  kind: 'explicit_dates';
  dates: ExplicitScheduleDate[];
}

export type ScheduleBlock = RecurringScheduleBlock | ExplicitDateScheduleBlock;

export interface ClassOccurrence extends TenantScoped, AuditFields {
  id: string;
  programId: string;
  programRunId: string;
  programGroupId: string;
  scheduleBlockId: string;
  date: ISODate;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  timezone: TimeZoneId;
  status: ClassOccurrenceStatus;
  roomId?: string;
  instructorIds: string[];
  resourceIds?: string[];
  title?: string;
  deliveryNotes?: string;
  completedAt?: ISODateTime;
  completedBy?: ActorId;
  canceledAt?: ISODateTime;
  canceledBy?: ActorId;
  cancellationReason?: string;
  sourceOccurrenceId?: string;
  rescheduledToOccurrenceId?: string;
}

export interface PricingOfferInclusion {
  unit: IncludedUnit;
  quantity: number;
  programRunIds?: string[];
  programGroupIds?: string[];
  addOnId?: string;
  label?: string;
}

export interface PricingOffer extends TenantScoped, AuditFields {
  id: string;
  programId: string;
  name: string;
  description?: string;
  currency: CurrencyCode;
  baseAmount: number;
  billingMode: BillingMode;
  included: PricingOfferInclusion[];
  eligibleProgramRunIds?: string[];
  eligibleProgramGroupIds?: string[];
  salesOpensAt?: ISODateTime;
  salesClosesAt?: ISODateTime;
  capacityReservationMode: CapacityReservationMode;
  taxInclusive?: boolean;
  taxRate?: number;
  taxCode?: string;
  invoiceLabel?: string;
  status: PricingOfferStatus;
  sortOrder?: number;
}

export interface DiscountRule extends TenantScoped, AuditFields {
  id: string;
  name: string;
  description?: string;
  kind: DiscountKind;
  valueType: DiscountValueType;
  value: number;
  currency?: CurrencyCode;
  eligibleProgramIds?: string[];
  eligiblePricingOfferIds?: string[];
  validFrom?: ISODateTime;
  validUntil?: ISODateTime;
  totalUsageLimit?: number;
  perHouseholdUsageLimit?: number;
  currentUsageCount?: number;
  couponCode?: string;
  requiresApproval: boolean;
  status: DiscountRuleStatus;
}

export interface AppliedDiscount {
  discountRuleId?: string;
  kind: DiscountKind;
  label: string;
  valueType: DiscountValueType;
  value: number;
  amountApplied: number;
  reason?: string;
  approvedBy?: ActorId;
  approvedAt?: ISODateTime;
}

export interface EnrollmentItem extends TenantScoped, AuditFields {
  id: string;
  enrollmentAgreementId: string;
  programId: string;
  programRunId?: string;
  programGroupId?: string;
  pricingOfferId?: string;
  kind: EnrollmentItemKind;
  label: string;
  quantity: number;
  unitAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  occurrenceIds?: string[];
  addOnId?: string;
  serviceStartDate?: ISODate;
  serviceEndDate?: ISODate;
  status: EnrollmentItemStatus;
}

export interface EnrollmentAgreement extends TenantScoped, AuditFields {
  id: string;
  learnerId: string;
  householdId?: string;
  guardianId?: string;
  currency: CurrencyCode;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  depositAmount?: number;
  appliedDiscounts: AppliedDiscount[];
  itemIds: string[];
  paymentArrangementId?: string;
  sourceRegistrationPageId?: string;
  sourceCampaign?: string;
  consentRecordIds?: string[];
  requiredDocumentIds?: string[];
  submittedAt?: ISODateTime;
  reviewedAt?: ISODateTime;
  reviewedBy?: ActorId;
  acceptedAt?: ISODateTime;
  acceptedBy?: ActorId;
  canceledAt?: ISODateTime;
  canceledBy?: ActorId;
  cancellationReason?: string;
  status: EnrollmentAgreementStatus;
  notes?: string;
}

export interface RegistrationFieldConfig {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'file';
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  sortOrder: number;
}

export interface RegistrationConsentConfig {
  id: string;
  title: string;
  text: string;
  required: boolean;
  version: string;
}

export interface RegistrationPageConfig extends TenantScoped, AuditFields {
  id: string;
  programId: string;
  programRunIds: string[];
  pricingOfferIds: string[];
  defaultProgramGroupId?: string;
  slug: string;
  title: string;
  description?: string;
  locale: string;
  mode: RegistrationMode;
  reviewMode: RegistrationReviewMode;
  status: RegistrationPageStatus;
  fields: RegistrationFieldConfig[];
  consents: RegistrationConsentConfig[];
  allowWaitlist: boolean;
  allowSaveAndContinue: boolean;
  duplicateDetectionEnabled: boolean;
  antiSpamEnabled: boolean;
  campaignSource?: string;
  confirmationMessage?: string;
  paymentLinkUrl?: string;
  qrCodeUrl?: string;
  publishedAt?: ISODateTime;
  publishedBy?: ActorId;
  expiresAt?: ISODateTime;
}

export interface DocumentEligibilityRule {
  minimumAttendancePercentage?: number;
  requiredOccurrenceIds?: string[];
  requiredMilestoneIds?: string[];
  requiresInstructorApproval?: boolean;
  requiresPaymentCompletion?: boolean;
  requiredConsentIds?: string[];
}

export interface DocumentSignatory {
  name: string;
  title?: string;
  signatureImageUrl?: string;
  sortOrder: number;
}

export interface DocumentTemplate extends TenantScoped, AuditFields {
  id: string;
  kind: DocumentTemplateKind;
  name: string;
  description?: string;
  version: number;
  locale: string;
  status: DocumentTemplateStatus;
  numberingPattern: string;
  backgroundAssetUrl?: string;
  logoUrl?: string;
  signatories: DocumentSignatory[];
  variables: string[];
  eligibility: DocumentEligibilityRule;
  publicVerificationEnabled: boolean;
  createdFromTemplateId?: string;
  activatedAt?: ISODateTime;
  activatedBy?: ActorId;
}

export interface IssuedDocumentEvidence {
  attendancePercentage?: number;
  attendedOccurrenceIds?: string[];
  completedOccurrenceIds?: string[];
  completedMilestoneIds?: string[];
  instructorApprovalBy?: ActorId;
  instructorApprovalAt?: ISODateTime;
  paymentPolicySatisfied?: boolean;
  consentRecordIds?: string[];
  capturedAt: ISODateTime;
}

export interface IssuedDocument extends TenantScoped, AuditFields {
  id: string;
  documentTemplateId: string;
  templateVersion: number;
  kind: DocumentTemplateKind;
  learnerId: string;
  learnerDisplayName: string;
  enrollmentAgreementId?: string;
  programId: string;
  programRunId?: string;
  issueNumber: string;
  issuedAt: ISODateTime;
  issuingMode: DocumentIssuingMode;
  issuedBy: ActorId;
  evidence: IssuedDocumentEvidence;
  verificationToken: string;
  verificationQrCodeUrl?: string;
  fileUrl: string;
  fileHash?: string;
  status: IssuedDocumentStatus;
  replacesDocumentId?: string;
  replacedByDocumentId?: string;
  revokedAt?: ISODateTime;
  revokedBy?: ActorId;
  revocationReason?: string;
  expiresAt?: ISODateTime;
}
