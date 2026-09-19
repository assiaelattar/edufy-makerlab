import { createOpenAIOAuth } from '@openai-oauth/ai-sdk';
import { openaiCredentials } from '@openai-oauth/react/server';

const getRequestUrl = req => {
  const protocol = req.headers?.['x-forwarded-proto'] || 'http';
  const host = req.headers?.host || '127.0.0.1';
  return `${protocol}://${host}${req.url || '/api/creative/generate'}`;
};

export const toWebRequest = req => {
  const headers = new Headers();
  Object.entries(req.headers || {}).forEach(([name, value]) => {
    if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
    else if (typeof value === 'string') headers.set(name, value);
  });

  const body = req.method === 'GET' || req.method === 'HEAD'
    ? undefined
    : JSON.stringify(req.body || {});

  return new Request(getRequestUrl(req), { method: req.method || 'POST', headers, body });
};

export async function chatgptForCreativeRequest(req) {
  const credentials = openaiCredentials(toWebRequest(req));
  await credentials.getSession();
  return createOpenAIOAuth(credentials);
}
