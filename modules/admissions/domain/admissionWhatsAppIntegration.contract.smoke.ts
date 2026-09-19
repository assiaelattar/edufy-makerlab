import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const assistant = read('../ui/EducationAdmissionsWhatsAppAssistant.tsx');
const admissions = read('../ui/EducationAdmissionsReadOnlyV1.tsx');
const students = read('../../../views/students/EducationStudentsOperationsV1.tsx');
const communications = read('../../../views/CommunicationsView.tsx');
const contextStore = read('../infrastructure/firebaseAdmissionWhatsAppStore.ts');
const auth = read('../../../context/AuthContext.tsx');
const importer = read('../../../views/marketing/ChatImporterModal.tsx');
const finance = read('../../../views/FinanceView.tsx');
const styles = read('../ui/education-admissions-v1.css');

assert.match(communications, /organizations', organizationId, 'settings', 'communications'/, 'Communications must retain the tenant template library');
assert.match(contextStore, /organizations', organizationId, 'settings', 'communications'/, 'Admissions must reuse the tenant template library');
assert.match(auth, /'admissions\.view', 'admissions\.note', 'admissions\.whatsapp'/, 'Admissions operators must receive the explicit WhatsApp permission');
assert.match(students, /canUseWhatsApp=\{can\('admissions\.whatsapp'\)\}/, 'Students must pass permission into the Admissions surface');
assert.match(admissions, /<EducationAdmissionsWhatsAppAssistant/, 'the family passport must own the assisted-operation entry point');
assert.match(assistant, /role="dialog" aria-modal="true"/, 'the assistant must expose modal semantics');
assert.match(assistant, /event\.key === 'Escape'[\s\S]*?closeRef\.current\(\)/, 'the assistant must close from the keyboard');
assert.match(assistant, /querySelectorAll<HTMLElement>[\s\S]*?event\.shiftKey/, 'keyboard focus must remain inside the open assistant');
assert.match(assistant, /window\.open\([\s\S]*?if \(!opened\)[\s\S]*?no launch was recorded[\s\S]*?recordActivity\('launched'/, 'launch may be recorded only after WhatsApp opens');
assert.match(assistant, /recordMessageState\('operator_confirmed_sent'\)[\s\S]*?>I sent it</, 'sent must remain an explicit operator assertion');
assert.match(assistant, /recordMessageState\('operator_confirmed_not_sent'\)[\s\S]*?>Not sent</, 'not-sent must remain explicit');
assert.match(assistant, /recordActivity\('parent_response_recorded'/, 'parent response must be a separate activity');
assert.doesNotMatch(assistant, /delivered|read receipt|message read/i, 'the assistant must not fabricate provider evidence');
assert.match(importer, /lead\.organizationId !== currentOrganization\.id/, 'the legacy CRM import must retain its tenant boundary');
assert.match(finance, /title="Open WhatsApp reminder"/, 'Finance must describe wa.me actions as opening, not sending');
assert.match(styles, /@container \(max-width: 580px\)[\s\S]*?\.edu-admissions-wa__panel \{[^}]*min-height: 100vh/, 'the assistant must provide a narrow full-screen layout');
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/, 'the Admissions surface must respect reduced motion');

console.log('Admissions WhatsApp integration contract checks passed (17 safeguards).');
