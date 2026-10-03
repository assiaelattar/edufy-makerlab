import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./groupAccessPrint.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { buildGroupAccessPrintHtml, hasPrintableLearnerAccess, printGroupAccessCards } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const learner = {
  id: 'learner-1',
  organizationId: 'org-1',
  status: 'active',
  name: 'Alex <script>alert(1)</script>',
  loginInfo: { email: 'alex@example.test', initialPassword: 'A&B<12', uid: 'user-1' },
};
const context = {
  organizationId: 'org-1',
  academyName: 'MakerLab & Co',
  programName: 'STEM',
  gradeName: 'Level 1',
  groupName: 'Monday group',
  loginUrl: 'https://sparkquest.example.test/login',
};

assert.equal(hasPrintableLearnerAccess(learner, 'org-1'), true);
assert.equal(hasPrintableLearnerAccess(learner, 'org-2'), false);
assert.equal(hasPrintableLearnerAccess({ ...learner, status: 'inactive' }, 'org-1'), false);
assert.equal(hasPrintableLearnerAccess({ ...learner, loginInfo: { ...learner.loginInfo, uid: '' } }, 'org-1'), false);
assert.equal(hasPrintableLearnerAccess({ ...learner, loginInfo: { ...learner.loginInfo, initialPassword: '' } }, 'org-1'), false);

const html = buildGroupAccessPrintHtml([learner, learner], context);
assert.equal((html.match(/class="access-card"/g) || []).length, 1, 'duplicate enrollment prints one card');
assert.match(html, /Alex &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.doesNotMatch(html, /<h2>Alex <script>/);
assert.match(html, /A&amp;B&lt;12/);
assert.match(html, /MakerLab &amp; Co/);
assert.match(html, /https:\/\/sparkquest\.example\.test\/login/);
assert.throws(() => buildGroupAccessPrintHtml([{ ...learner, loginInfo: { ...learner.loginInfo, initialPassword: '' } }], context));
assert.throws(() => buildGroupAccessPrintHtml([{ ...learner, organizationId: 'org-2' }], context));
assert.throws(() => buildGroupAccessPrintHtml([learner], { ...context, loginUrl: 'javascript:alert(1)' }));

let printedHtml = '';
globalThis.window = { open: () => ({ document: { write: value => { printedHtml = value; }, close: () => {} } }) };
assert.equal(printGroupAccessCards([learner], context), true);
assert.match(printedHtml, /learner access/);
globalThis.window = { open: () => null };
assert.equal(printGroupAccessCards([learner], context), false);

console.log('Group access print smoke passed');
