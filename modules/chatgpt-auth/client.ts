import { openaiAuthHeaders } from '@openai-oauth/react';

export {
  SignInWithChatGPT,
  useSignInWithChatGPT
} from '@openai-oauth/react';
export type { SignInWithChatGPTState } from '@openai-oauth/react';

export async function fetchWithChatGPT(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const authHeaders = await openaiAuthHeaders();

  Object.entries(authHeaders).forEach(([name, value]) => headers.set(name, value));
  return fetch(input, { ...init, headers });
}
