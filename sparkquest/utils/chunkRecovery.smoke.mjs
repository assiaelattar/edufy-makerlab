import assert from 'node:assert/strict';
import { isChunkLoadError, recoverFromChunkError } from './chunkRecovery.ts';

const values = new Map();
let reloads = 0;
globalThis.window = {
  sessionStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
  location: { reload: () => { reloads += 1; } },
};

assert.equal(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/StudentWizard-old.js')), true);
assert.equal(isChunkLoadError(new Error('Unable to preload CSS for /assets/old.css')), true);
assert.equal(isChunkLoadError(new Error('Permission denied')), false);
assert.equal(recoverFromChunkError(), true);
assert.equal(reloads, 1);
assert.equal(recoverFromChunkError(), true);
assert.equal(reloads, 1);

const freshPage = await import('./chunkRecovery.ts?fresh-page');
assert.equal(freshPage.recoverFromChunkError(), false);
assert.equal(reloads, 1);

console.log('Chunk recovery smoke: stale imports reload once; repeated failure stays on recovery screen.');
