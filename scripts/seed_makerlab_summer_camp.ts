import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildMakerLabSummerCampTemplate } from '../utils/programTemplates';

const projectId = 'edufy-makerlab';
const organizationId = 'makerlab-academy';
const year = Number(process.argv[2]) || new Date().getFullYear();
const cliConfigPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

if (!fs.existsSync(cliConfigPath)) {
  throw new Error('Firebase CLI login was not found. Run firebase login first.');
}

const cliConfig = JSON.parse(fs.readFileSync(cliConfigPath, 'utf8')) as {
  tokens?: { access_token?: string; expires_at?: number; refresh_token?: string; scope?: string };
};
if (!cliConfig.tokens?.refresh_token || !cliConfig.tokens.scope) throw new Error('The Firebase CLI session cannot be refreshed. Sign in again.');

const npxCache = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
const authModulePath = fs.readdirSync(npxCache)
  .map(folder => path.join(npxCache, folder, 'node_modules', 'firebase-tools', 'lib', 'auth.js'))
  .find(candidate => fs.existsSync(candidate));
if (!authModulePath) throw new Error('firebase-tools is not available in the npm cache. Run npx firebase-tools login:list first.');

const require = createRequire(import.meta.url);
const firebaseAuth = require(authModulePath) as {
  getAccessToken: (refreshToken: string, scopes: string[]) => Promise<{ access_token: string }>;
};
const refreshedTokens = await firebaseAuth.getAccessToken(cliConfig.tokens.refresh_token, cliConfig.tokens.scope.split(' '));
const accessToken = refreshedTokens.access_token;

const draft = buildMakerLabSummerCampTemplate(organizationId, year);
const apiRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

type FirestoreValue = Record<string, unknown>;
const toFirestoreValue = (value: unknown): FirestoreValue => {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value as Record<string, unknown>)
          .filter(([, fieldValue]) => fieldValue !== undefined)
          .map(([key, fieldValue]) => [key, toFirestoreValue(fieldValue)])),
      },
    };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: String(value) };
};

const existingResponse = await fetch(`${apiRoot}:runQuery`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'programs' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'organizationId' }, op: 'EQUAL', value: { stringValue: organizationId } } },
            { fieldFilter: { field: { fieldPath: 'name' }, op: 'EQUAL', value: { stringValue: draft.name } } },
          ],
        },
      },
      limit: 1,
    },
  }),
});
if (!existingResponse.ok) throw new Error(`Program lookup failed (${existingResponse.status}): ${await existingResponse.text()}`);
const existing = await existingResponse.json() as Array<{ document?: unknown }>;

if (existing.some(result => result.document)) {
  console.log(`${draft.name} already exists; no duplicate was created.`);
} else {
  const program = {
    ...draft,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const createResponse = await fetch(`${apiRoot}/programs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(program)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, toFirestoreValue(value)])),
    }),
  });
  if (!createResponse.ok) throw new Error(`Program creation failed (${createResponse.status}): ${await createResponse.text()}`);
  const created = await createResponse.json() as { name: string };
  const programId = created.name.split('/').pop();

  console.log(`Created ${draft.name} as draft (${programId}).`);
}
