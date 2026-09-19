// Isolated UI QA: real component/domain/command, in-memory boundaries, no Firebase or WhatsApp network.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { chromium } = await import(process.env.ADMISSIONS_PLAYWRIGHT_PATH
  ? pathToFileURL(process.env.ADMISSIONS_PLAYWRIGHT_PATH).href : 'playwright');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const mocks = `
  export const db = {};
  const permissions = ['admissions.view', 'admissions.whatsapp'];
  export const useAuth = () => ({ currentOrganization: { id: 'org-test', name: 'Test Academy' }, userProfile: { uid: 'operator', status: 'active', role: 'admission_officer' }, roleDefinition: { permissions }, can: () => true });
  window.qa = { version: 0, consent: 'unknown', activities: [], opened: 0, blocked: false, closed: 0, revokeOnLoad: false };
  window.open = () => window.qa.blocked ? null : { opener: null, location: { replace: () => { window.qa.opened++; } }, close: () => { window.qa.closed++; } };
  export const loadAdmissionWhatsAppContext = async () => {
    if (window.qa.revokeOnLoad) window.qa.consent = 'opted_out';
    return { caseVersion: window.qa.version, consentState: window.qa.consent, activities: window.qa.activities.slice(0, 30), templates: [{ id: 'planning', title: 'Planning', source: 'starter', organizationId: 'org-test', content: 'Bonjour {{parent_name}}, le planning pour {{student_name}}.' }] };
  };
  export class FirebaseAdmissionWhatsAppStore {
    async recordWhatsAppActivityAtomically(m) {
      if (m.expectedVersion !== window.qa.version) throw new Error('STALE_VERSION');
      window.qa.version++;
      if (m.communicationState === 'consent_updated') window.qa.consent = m.consentState;
      window.qa.activities.unshift({ ...m, id: m.commandId, channel: 'whatsapp', caseVersion: window.qa.version });
      return { activityId: m.commandId, caseVersion: window.qa.version, replayed: false };
    }
  }
`;
const bundle = await build({
  stdin: { contents: `
    import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { EducationAdmissionsWhatsAppAssistant } from './modules/admissions/ui/EducationAdmissionsWhatsAppAssistant';
    const admissionCase = { id: 'lead-test', legacyLeadId: 'lead-test', organizationId: 'org-test', parentName: 'Sara', learnerName: 'Adam', phone: '212600000001', repairFlags: [] };
    function App() { const [open, setOpen] = useState(false); return <div className="edu-admissions-v1"><button onClick={() => setOpen(true)}>Open assistant</button><EducationAdmissionsWhatsAppAssistant admissionCase={admissionCase} programName="Robotics" isOpen={open} onClose={() => setOpen(false)} /></div>; }
    createRoot(document.getElementById('root')).render(<App />);
  `, loader: 'tsx', resolveDir: root },
  bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"test"' },
  plugins: [{ name: 'isolated-boundaries', setup(builder) {
    builder.onResolve({ filter: /(?:context\/AuthContext|services\/firebase|infrastructure\/firebaseAdmissionWhatsAppStore)$/ }, () => ({ path: 'boundaries', namespace: 'qa' }));
    builder.onLoad({ filter: /.*/, namespace: 'qa' }, () => ({ contents: mocks, loader: 'js' }));
  } }],
});
const css = readFileSync(new URL('./education-admissions-v1.css', import.meta.url), 'utf8');
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].text); return; }
  response.setHeader('Content-Type', 'text/html');
  response.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial}${css}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button', { name: 'Open assistant', exact: true }).click();
  const launch = page.getByRole('button', { name: 'Open WhatsApp', exact: true });
  await page.getByLabel('Message preview').waitFor();
  assert(await launch.isDisabled(), 'unknown consent blocks launch');
  assert.equal(await page.getByLabel('Message preview').inputValue(), 'Bonjour Sara, le planning pour Adam.');
  await page.getByRole('button', { name: 'Granted', exact: true }).click();
  await page.getByRole('button', { name: 'Save consent', exact: true }).click();
  await page.waitForFunction(() => window.qa.consent === 'granted');
  await launch.click();
  await page.waitForFunction(() => window.qa.activities.some(a => a.communicationState === 'launched'));
  assert.equal(await page.evaluate(() => window.qa.opened), 1);
  assert.equal(await page.evaluate(() => window.qa.activities.filter(a => a.communicationState === 'operator_confirmed_sent').length), 0);
  await page.getByRole('button', { name: 'I sent it', exact: true }).click();
  await page.waitForFunction(() => window.qa.activities.some(a => a.communicationState === 'operator_confirmed_sent'));
  await page.getByLabel('Parent response notes').fill('Parent requested a call on Friday.');
  await page.getByRole('button', { name: 'Record parent response', exact: true }).click();
  await page.waitForFunction(() => window.qa.activities.some(a => a.outcome === 'asked_to_follow_up'));
  await page.evaluate(() => { window.qa.blocked = true; });
  const version = await page.evaluate(() => window.qa.version);
  await launch.click();
  await page.getByRole('alert').filter({ hasText: 'no launch was recorded' }).waitFor();
  assert.equal(await page.evaluate(() => window.qa.version), version);
  await page.evaluate(() => { window.qa.blocked = false; window.qa.revokeOnLoad = true; });
  await launch.click();
  await page.getByRole('alert').filter({ hasText: 'Consent changed' }).waitFor();
  assert.equal(await page.evaluate(() => window.qa.opened), 1, 'revoked consent must stop external navigation');
  assert(await launch.isDisabled());
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Open assistant');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: 'Open assistant', exact: true }).click();
    await page.getByLabel('Message preview').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `no overflow at ${width}`);
    if (process.env.ADMISSIONS_QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.ADMISSIONS_QA_SCREENSHOTS}/admissions-whatsapp-${width}.png` });
    await page.locator('.edu-admissions-wa__panel').locator('button:not(:disabled), select:not(:disabled), textarea:not(:disabled)').last().focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close WhatsApp assistant');
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  console.log('Admissions WhatsApp browser QA passed: preview, consent, launch/result separation, response, blocked popup, concurrent opt-out, focus return/trap, desktop/mobile overflow. All boundaries mocked; no external messages or data writes.');
} finally {
  await browser?.close();
  server.close();
}
