import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8');
const indexes = JSON.parse(readFileSync(new URL('../../../firestore.indexes.json', import.meta.url), 'utf8')) as {
  indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order: string }> }>;
};

const requireRule = (pattern: RegExp, message: string) => assert.match(rules, pattern, message);

requireRule(/function isAdmissionsOperator\(\)[\s\S]*?'owner', 'admin', 'admission_officer'/, 'only approved operational roles should reach Admissions writes');
requireRule(/request\.resource\.data\.actorId == request\.auth\.uid/, 'activity actor must be the authenticated user');
requireRule(/request\.resource\.data\.kind == 'note'/, 'Phase 3 first slice must only admit note activities');
requireRule(/request\.resource\.data\.channel == 'internal'/, 'the first slice must not claim phone or WhatsApp activity');
requireRule(/request\.resource\.data\.outcome == null/, 'an internal note must not claim a contact outcome');
requireRule(/function validAdmissionWhatsAppActivityCreate\(activityId\)/, 'WhatsApp activity must have its own strict rule branch');
requireRule(/request\.resource\.data\.kind == 'follow_up'/, 'WhatsApp activity must remain a follow-up fact, not a lifecycle stage');
requireRule(/request\.resource\.data\.channel == 'whatsapp'/, 'the WhatsApp branch must use the WhatsApp channel');
requireRule(/'consent_updated',[\s\S]*?'prepared',[\s\S]*?'launched',[\s\S]*?'operator_confirmed_sent',[\s\S]*?'operator_confirmed_not_sent',[\s\S]*?'parent_response_recorded'/, 'every assisted-operation state must remain explicit');
requireRule(/request\.resource\.data\.consentState in \['unknown', 'granted', 'opted_out'\]/, 'consent and opt-out evidence must be explicit');
requireRule(/communicationState == 'parent_response_recorded'[\s\S]*?request\.resource\.data\.outcome in/, 'only a recorded parent response may carry an outcome');
requireRule(/communicationState in \['launched', 'operator_confirmed_sent'\][\s\S]*?consentState != 'granted'/, 'launch and manual sent confirmation require granted consent');
assert.doesNotMatch(rules, /deliveredAt|readAt/, 'client rules must expose no delivery or read claim');
requireRule(/request\.resource\.data\.version == resource\.data\.version \+ 1/, 'workflow state updates must use monotonic versions');
requireRule(/request\.resource\.data\.lastActivityKind in \['note', 'follow_up'\]/, 'workflow state must accept only approved note and follow-up activity kinds');
requireRule(/activity\.kind == request\.resource\.data\.lastActivityKind/, 'case state kind must match the atomic activity');
requireRule(/getAfter[\s\S]*?lastCommandId == activityId/, 'activity and case state must be committed together');
requireRule(/match \/admission_activities\/\{activityId\}[\s\S]*?allow update, delete: if false;/, 'activities must be immutable');
requireRule(/allow get: if isAdmissionsOperator\(\) && \(resource == null \|\| canReadAdmissionDoc\(\)\)/, 'idempotent transactions may probe missing docs without exposing cross-tenant records');
requireRule(/match \/admission_case_states\/\{caseId\}[\s\S]*?allow delete: if false;/, 'workflow state must not be deletable');
requireRule(/match \/admission_tasks\/\{taskId\}[\s\S]*?allow write: if false;/, 'task writes must remain closed');
requireRule(/admissionLeadMatchesOrg\(request\.resource\.data\.legacyLeadId, request\.resource\.data\.organizationId\)/, 'activity creation must verify lead tenancy');

const activityIndex = indexes.indexes.find(index => index.collectionGroup === 'admission_activities');
assert(activityIndex, 'admission activity timeline index must exist');
assert.deepEqual(activityIndex.fields.map(field => field.fieldPath), ['organizationId', 'admissionCaseId', 'occurredAt']);

const taskIndex = indexes.indexes.find(index => index.collectionGroup === 'admission_tasks');
assert(taskIndex, 'Today task index must be defined before task writes open');
assert.deepEqual(taskIndex.fields.map(field => field.fieldPath), ['organizationId', 'status', 'dueAt']);

console.log('Admissions Firestore contract checks passed (24 safeguards).');
