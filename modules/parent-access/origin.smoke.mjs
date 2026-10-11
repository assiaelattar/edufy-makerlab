import assert from 'node:assert/strict';
import handler from '../../api/parent-access/index.js';

const invoke = async (method, origin) => {
  const req = { method, headers: origin ? { origin } : {} };
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
  await handler(req, res);
  return res;
};

process.env.EDUFY_PARENT_ACCESS_ALLOWED_ORIGINS = 'https://edufy.makerlab.academy';
const preflight = await invoke('OPTIONS', 'https://edufy.makerlab.academy');
assert.equal(preflight.statusCode, 200);
assert.equal(preflight.headers['Access-Control-Allow-Origin'], 'https://edufy.makerlab.academy');
assert.match(preflight.headers['Access-Control-Allow-Headers'], /Authorization/);
const denied = await invoke('POST', 'https://untrusted.example');
assert.equal(denied.statusCode, 403);
assert.equal(denied.headers['Access-Control-Allow-Origin'], undefined);
const unconfigured = await invoke('OPTIONS', 'https://edufy-makerlab.vercel.app');
assert.equal(unconfigured.statusCode, 403);
console.log('Parent-access origin policy: allowlisted preflight and denied origins passed.');
