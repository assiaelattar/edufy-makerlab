import assert from 'node:assert/strict';
import { adaptLeadToAdmissionCase, projectAdmissionCases } from './admissionAdapter.ts';
import { makeBooking, makeEnrollment, makeLead, makeStudent, timestamp } from './admissionAdapter.fixtures.ts';
import { getAdmissionCaseAgeDays, getAdmissionStageCounts, isAdmissionCaseOlderThan, searchAdmissionCases, selectAdmissionTodayCases } from './admissionSelectors.ts';

const expectedLegacyStages = {
  new: 'new_inquiry',
  contacted: 'qualifying',
  interested: 'trial_to_plan',
  workshop_booked: 'trial_to_plan',
  demo_booked: 'trial_to_plan',
  converted: 'trial_to_plan',
  closed: 'legacy_closed',
} as const;

Object.entries(expectedLegacyStages).forEach(([status, expectedStage]) => {
  const result = adaptLeadToAdmissionCase({
    tenantId: 'org-1',
    lead: makeLead({ status: status as ReturnType<typeof makeLead>['status'] }),
  });
  assert.equal(result.stage, expectedStage, `${status} should map to ${expectedStage}`);
});

const confirmedBooking = makeBooking({ crmLeadId: 'lead-1', status: 'confirmed' });
assert.equal(adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'new' }),
  bookings: [confirmedBooking],
}).stage, 'trial_booked', 'confirmed linked booking should outrank legacy status');

const attendedBooking = makeBooking({ crmLeadId: 'lead-1', status: 'attended' });
assert.equal(adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'new' }),
  bookings: [attendedBooking],
}).stage, 'trial_completed', 'attended linked booking should outrank legacy status');

const enrollmentResult = adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'new' }),
  bookings: [attendedBooking],
  students: [makeStudent({ crmLeadId: 'lead-1' })],
  enrollments: [makeEnrollment()],
});
assert.equal(enrollmentResult.stage, 'enrolled', 'active enrollment should outrank workshop evidence');
assert.equal(enrollmentResult.stageReason, 'active_enrollment');

const crossTenantResult = adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'new' }),
  bookings: [makeBooking({ organizationId: 'org-2', crmLeadId: 'lead-1', status: 'attended' })],
  students: [makeStudent({ organizationId: 'org-2', crmLeadId: 'lead-1' })],
  enrollments: [makeEnrollment({ organizationId: 'org-2', crmLeadId: 'lead-1' })],
});
assert.equal(crossTenantResult.stage, 'new_inquiry', 'cross-tenant evidence must be ignored');
assert.deepEqual(crossTenantResult.linkedBookingIds, []);
assert.deepEqual(crossTenantResult.linkedEnrollmentIds, []);

const phoneOnlyResult = adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'new' }),
  bookings: [makeBooking({ status: 'attended' })],
  students: [makeStudent()],
  enrollments: [makeEnrollment()],
});
assert.equal(phoneOnlyResult.stage, 'new_inquiry', 'phone matches must not advance the lifecycle');
assert(phoneOnlyResult.repairFlags.includes('phone_only_booking_candidate'));
assert(phoneOnlyResult.repairFlags.includes('phone_only_student_candidate'));
assert.deepEqual(phoneOnlyResult.linkedBookingIds, []);
assert.deepEqual(phoneOnlyResult.linkedStudentIds, []);

const deterministicBooking = makeBooking({
  id: 'crm_slot-1_lead-1',
  workshopSlotId: 'slot-1',
  status: 'confirmed',
});
assert.equal(adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'new' }),
  bookings: [deterministicBooking],
}).stage, 'trial_booked', 'CRM deterministic booking ID should be accepted as a stable link');

const missingFields = adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ name: '', parentName: '', phone: '', email: undefined, createdAt: undefined as never }),
});
assert.equal(missingFields.id, 'lead-1', 'records with missing fields must remain visible');
assert(missingFields.repairFlags.includes('missing_lead_name'));
assert(missingFields.repairFlags.includes('missing_parent_name'));
assert(missingFields.repairFlags.includes('missing_contact'));
assert(missingFields.repairFlags.includes('missing_created_at'));

const unknownStatus = adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead({ status: 'future_status' as never }),
});
assert.equal(unknownStatus.stage, 'new_inquiry');
assert(unknownStatus.repairFlags.includes('unknown_legacy_status'));

const projection = projectAdmissionCases({
  tenantId: 'org-1',
  leads: [makeLead({ id: 'visible-1' }), makeLead({ id: 'visible-2', status: 'closed' }), makeLead({ id: 'other', organizationId: 'org-2' })],
});
assert.equal(projection.cases.length, 2, 'every tenant lead should be projected exactly once');
assert.deepEqual(projection.ignoredLeadIds, ['other']);
assert.equal(new Set(projection.cases.map(item => item.legacyLeadId)).size, 2);

const datedCase = adaptLeadToAdmissionCase({
  tenantId: 'org-1',
  lead: makeLead(),
});
assert.equal(getAdmissionCaseAgeDays(datedCase, new Date('2026-09-04T09:00:00.000Z')), 3);
assert.equal(isAdmissionCaseOlderThan(datedCase, 2, new Date('2026-09-04T09:00:00.000Z')), true);
assert.equal(getAdmissionStageCounts(projection.cases).legacy_closed, 1);
assert.equal(searchAdmissionCases(projection.cases, 'parent one').length, 2);
assert.deepEqual(selectAdmissionTodayCases(projection.cases).map(item => item.id), ['visible-1'], 'Today must include active cases and exclude closed cases');

const triageCases = [
  adaptLeadToAdmissionCase({ tenantId: 'org-1', lead: makeLead({ id: 'qualify', status: 'contacted' }) }),
  adaptLeadToAdmissionCase({ tenantId: 'org-1', lead: makeLead({ id: 'newer', status: 'new', createdAt: timestamp('2026-09-02T09:00:00.000Z') }) }),
  adaptLeadToAdmissionCase({ tenantId: 'org-1', lead: makeLead({ id: 'older', status: 'new', createdAt: timestamp('2026-08-30T09:00:00.000Z') }) }),
];
assert.deepEqual(selectAdmissionTodayCases(triageCases).map(item => item.id), ['older', 'newer', 'qualify'], 'Today triage should be deterministic without inventing due dates');
assert(triageCases.every(item => item.nextAction.dueAt === null), 'compatibility triage must retain null due dates');

console.log(`Admissions adapter and selector smoke checks passed (${Object.keys(expectedLegacyStages).length + 15} scenarios).`);
