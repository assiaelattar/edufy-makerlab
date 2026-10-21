import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'node_modules/.cache/staff-attendance-v1-ssr.mjs');
await build({
  absWorkingDir: root,
  entryPoints: ['views/StaffAbsenceView.tsx'],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  loader: { '.css': 'empty' },
  plugins: [{ name: 'synthetic-staff-boundaries', setup(builder) {
    builder.onResolve({ filter: /(?:AppContext|AuthContext|ConfirmContext)$|services\/firebase$|^firebase\/firestore$/ }, () => ({ path: resolve(root, 'scripts/fixtures/staff-attendance-v1-adapter.jsx') }));
  } }]
});

let checks = 0;
for (const [scenario, required, absent] of [
  ['', ['Daily team roster', 'Alex Morgan', 'Sam Rivera', 'Noor Example', 'Avery Longname Example'], ['Staff attendance is restricted']],
  ['scenario=empty', ['No staff members yet', '0 awaiting a mark'], ['Alex Morgan']],
  ['role=restricted', ['Staff attendance is restricted'], ['Alex Morgan', 'Daily team roster']]
]) {
  globalThis.location = { search: scenario ? `?${scenario}` : '' };
  globalThis.window = { location: globalThis.location };
  const { StaffAbsenceView } = await import(`${pathToFileURL(output).href}?${scenario || 'populated'}`);
  const html = renderToString(React.createElement(StaffAbsenceView));
  for (const text of required) { assert(html.includes(text), `${scenario || 'populated'} missing ${text}`); checks++; }
  for (const text of absent) { assert(!html.includes(text), `${scenario || 'populated'} unexpectedly contains ${text}`); checks++; }
}
console.log(`Staff Attendance synthetic server render: ${checks} populated, empty and restricted assertions passed.`);
