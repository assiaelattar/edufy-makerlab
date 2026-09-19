import assert from 'node:assert/strict';
import type { AdmissionActivity } from './admissionWorkflowTypes.ts';
import {
  buildAdmissionWhatsAppUrl,
  deriveAdmissionWhatsAppConsent,
  getAdmissionWhatsAppStarterTemplates,
  renderAdmissionWhatsAppTemplate,
  toAdmissionWhatsAppTemplates,
  validateAdmissionMessageBody,
} from './admissionWhatsApp.ts';

const starters = getAdmissionWhatsAppStarterTemplates('org-1');
assert.equal(starters.length, 3);
assert(starters.every(template => template.organizationId === 'org-1'));
assert(starters.every(template => template.source === 'starter'));

const tenantTemplates = toAdmissionWhatsAppTemplates('org-1', [
  { id: 'tenant-1', title: '  Tenant follow-up  ', content: 'Hello {{parent_name}}', category: 'reminder' },
  { id: 'empty', title: '', content: 'Ignored', category: 'news' },
]);
assert.equal(tenantTemplates.length, 1);
assert.equal(tenantTemplates[0].title, 'Tenant follow-up');
assert.equal(tenantTemplates[0].source, 'tenant_library');

const preview = renderAdmissionWhatsAppTemplate(starters[1], 'org-1', {
  parentName: 'Sara',
  learnerName: 'Adam',
  programName: 'Robotics',
  academyName: 'MakerLab',
});
assert.equal(preview.ready, true);
assert.match(preview.body, /Sara/);
assert.match(preview.body, /Adam/);
assert.match(preview.body, /Robotics/);
assert.equal(preview.unresolvedTokens.length, 0);

const missingVariable = renderAdmissionWhatsAppTemplate(starters[1], 'org-1', {
  parentName: 'Sara',
  learnerName: 'Adam',
});
assert.equal(missingVariable.ready, false);
assert.deepEqual(missingVariable.unresolvedTokens, ['{{program_name}}']);
assert.throws(() => renderAdmissionWhatsAppTemplate(starters[0], 'org-2', {}), /another organization/);

assert.equal(validateAdmissionMessageBody('Hello [date]').ready, false);
assert.equal(validateAdmissionMessageBody('Hello {{unknown}}').ready, false);
assert.equal(validateAdmissionMessageBody('x'.repeat(2001)).ready, false);
assert.equal(validateAdmissionMessageBody('  Ready message  ').body, 'Ready message');

const url = buildAdmissionWhatsAppUrl('+212 600-000-000', 'Bonjour Sara');
assert.match(url, /^https:\/\/wa\.me\/212600000000\?text=/);
assert.throws(() => buildAdmissionWhatsAppUrl('123', 'Bonjour'), /valid parent phone/);
assert.throws(() => buildAdmissionWhatsAppUrl('+212600000000', 'Bonjour [parent]'), /Resolve every message variable/);

const activity = (occurredAt: string, consentState: 'unknown' | 'granted' | 'opted_out'): AdmissionActivity => ({
  id: occurredAt,
  organizationId: 'org-1',
  admissionCaseId: 'lead-1',
  legacyLeadId: 'lead-1',
  kind: 'follow_up',
  channel: 'whatsapp',
  body: `Consent ${consentState}`,
  outcome: null,
  communicationState: 'consent_updated',
  consentState,
  templateId: 'consent',
  occurredAt,
  actorId: 'operator-1',
  caseVersion: 1,
  commandFingerprint: '0123456789abcdef',
  createdAt: occurredAt,
});
assert.equal(deriveAdmissionWhatsAppConsent([]), 'unknown');
assert.equal(deriveAdmissionWhatsAppConsent([
  activity('2026-09-09T09:00:00.000Z', 'granted'),
  activity('2026-09-09T10:00:00.000Z', 'opted_out'),
]), 'opted_out');

console.log('Admissions WhatsApp domain smoke checks passed (22 safeguards).');
