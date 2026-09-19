import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const leadProfile = read('../../../views/marketing/LeadProfileModal.tsx');
const marketing = read('../../../views/MarketingView.tsx');
const workshops = read('../../../views/WorkshopsView.tsx');
const actionCenter = read('../../../views/dashboard/WorkshopActionCenter.tsx');
const bookingTypes = read('../../../types/index.ts');

assert.match(leadProfile, /isBookingStableLinkedToLead\(booking, lead\.id\)/, 'lead profile must list bookings through stable evidence');
assert.match(leadProfile, /admissionCaseId: lead\.id,[\s\S]*?crmLeadId: lead\.id/, 'CRM booking creation must persist both canonical and compatibility links');
assert.doesNotMatch(marketing, /Workshop booking detected; pipeline moved/, 'render effects must not advance leads from phone matches');
assert.doesNotMatch(marketing, /cleanPhone\(b\.phoneNumber\) === leadPhone/, 'Marketing must not identify a case by phone');
assert.match(workshops, /resolveBookingAdmissionLead\(booking, leads, orgId\)/, 'Workshop conversion must resolve only stable links');
assert.match(actionCenter, /resolveBookingAdmissionLead\(booking, leads, currentOrganization\.id\)/, 'Action Center conversion must resolve only stable links');
assert.match(workshops, /admissionCaseId: (?:existingLead|leadRef)\.id/g, 'Workshop conversion must persist the canonical link');
assert.match(actionCenter, /admissionCaseId: leadRef\.id/, 'Action Center conversion must persist the canonical link');
assert.match(actionCenter, /reminderPreparedAt: serverTimestamp\(\)/, 'opening WhatsApp may record preparation only');
assert.doesNotMatch(actionCenter, /\? \{ status: 'reminder_sent'/, 'opening WhatsApp must not claim a sent reminder');
assert.match(bookingTypes, /admissionCaseId\?: string;[\s\S]*?crmLeadId\?: string;/, 'Booking must expose stable admission links in its canonical type');

console.log('Admissions workshop integration contract checks passed (11 safeguards).');
