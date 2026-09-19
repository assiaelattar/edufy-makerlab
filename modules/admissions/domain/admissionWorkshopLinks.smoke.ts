import assert from 'node:assert/strict';
import { makeBooking, makeLead } from './admissionAdapter.fixtures.ts';
import {
  findBookingPhoneCandidateLeadIds,
  getExplicitBookingLeadIds,
  isBookingStableLinkedToLead,
  resolveBookingAdmissionLead,
} from './admissionWorkshopLinks.ts';

const lead = makeLead({ id: 'lead-1' });
const sibling = makeLead({ id: 'lead-2', name: 'Learner Two' });
const otherTenant = makeLead({ id: 'lead-other', organizationId: 'org-2' });

assert.deepEqual(getExplicitBookingLeadIds(makeBooking({ admissionCaseId: 'lead-1', crmLeadId: 'lead-1' })), ['lead-1']);
assert.equal(isBookingStableLinkedToLead(makeBooking({ admissionCaseId: 'lead-1' }), lead.id), true);
assert.equal(isBookingStableLinkedToLead(makeBooking({ crmLeadId: 'lead-1' }), lead.id), true);
assert.equal(isBookingStableLinkedToLead(makeBooking({ id: 'crm_slot-1_lead-1' }), lead.id), true);
assert.equal(isBookingStableLinkedToLead(makeBooking(), lead.id), false, 'matching phone must not be a stable link');

assert.equal(resolveBookingAdmissionLead(makeBooking({ admissionCaseId: lead.id }), [lead], 'org-1').status, 'linked');
assert.equal(resolveBookingAdmissionLead(makeBooking({ admissionCaseId: otherTenant.id }), [lead, otherTenant], 'org-1').status, 'missing');
assert.equal(resolveBookingAdmissionLead(makeBooking({ admissionCaseId: lead.id, crmLeadId: sibling.id }), [lead, sibling], 'org-1').status, 'conflict');
assert.equal(resolveBookingAdmissionLead(makeBooking(), [lead], 'org-1').status, 'unlinked');
assert.deepEqual(findBookingPhoneCandidateLeadIds(makeBooking(), [lead, sibling, otherTenant], 'org-1'), ['lead-1', 'lead-2']);
assert.deepEqual(findBookingPhoneCandidateLeadIds(makeBooking({ admissionCaseId: lead.id }), [lead, sibling], 'org-1'), ['lead-2'], 'a sibling phone match stays a candidate, never another stable link');

console.log('Admissions workshop link smoke checks passed (11 scenarios).');
