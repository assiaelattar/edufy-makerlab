import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const entry = fileURLToPath(new URL('../utils/membershipLifecycle.smoke.ts', import.meta.url));
const output = `${root}/node_modules/.cache/membership-lifecycle.smoke.mjs`;
await build({ absWorkingDir: root, entryPoints: [entry], outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
const result = spawnSync(process.execPath, [output], { cwd: root, env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
