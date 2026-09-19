import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const app = read('../../../App.tsx');
const workshops = read('../../../views/WorkshopsView.tsx');
const finance = read('../../../views/FinanceView.tsx');
const publicEnrollment = read('../../../views/PublicEnrollmentView.tsx');

assert.match(app, /setEnrollmentAdmissionOrigin\(\{[\s\S]*?admissionCaseId: lead\.id,[\s\S]*?sourceLeadId: lead\.id/, 'lead prefill must retain its stable case ID');
assert.match(app, /normalizeAdmissionPaymentPlan\(lead\.paymentPlan \|\| lead\.preferredPaymentTerm\)/, 'lead prefill must retain a compatible requested payment term');
assert.match(app, /buildAdmissionOfferSnapshot\(\{[\s\S]*?program: selectedProgram,[\s\S]*?packName: selectedPack\.name,[\s\S]*?paymentPlan: enrollProgramForm\.paymentPlan/, 'successful enrollment must snapshot canonical Program pricing references');
assert.match(app, /enrollmentBatch\.set\(enrollmentRef,[\s\S]*?admissionCaseId:[\s\S]*?sourceLeadId:[\s\S]*?offerSnapshot/, 'the enrollment must retain case and offer provenance');
assert.match(app, /enrollmentBatch\.set\(paymentRef,[\s\S]*?status: p\.method === 'cash' \? 'paid' : p\.method === 'virement' \? 'pending_verification' : 'check_received'/, 'initial payment states must remain Finance-safe');
assert.match(app, /enrollmentBatch\.update\(doc\(db, 'leads', originatingLead\.id\), \{[\s\S]*?status: 'converted'/, 'the originating lead changes only in the enrollment batch');
assert.match(app, /await enrollmentBatch\.commit\(\)/, 'enrollment, payments, and origin links must commit atomically');
assert.doesNotMatch(app, /leads\.find\([^\n]*normalizePhone/, 'enrollment origin must not be recovered by phone');
assert.match(workshops, /resolveBookingAdmissionLead\(booking, leads, currentOrganization\.id\)/, 'Workshop enrollment prefill must use stable tenant-bound evidence');
assert.match(workshops, /admissionCaseId: resolution\.lead\.id,[\s\S]*?sourceLeadId: resolution\.lead\.id/, 'Workshop enrollment prefill must carry the stable case when linked');
assert.match(finance, /\['paid', 'verified'\]\.includes\(currentPayment\.status\)/, 'Finance remains responsible for cleared payment calculation');
assert.match(publicEnrollment, /addDoc\(collection\(db, 'leads'\)/, 'the public form must continue creating an inquiry');
assert.doesNotMatch(publicEnrollment, /collection\(db, 'enrollments'\)/, 'the public form must not claim successful enrollment');

console.log('Admissions enrollment integration contract checks passed (13 safeguards).');
