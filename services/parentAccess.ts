import { auth } from './firebase';
import { config } from '../utils/config';

export type ParentAccessAction = 'issue' | 'link' | 'transfer' | 'reset' | 'replace' | 'repairStaffLink';

export interface ParentAccessResult {
  action: ParentAccessAction;
  email: string;
  password?: string;
  linkedLearnerCount?: number;
}

const parentAccessEndpoint = (): string => {
  const configuredOrigin = String(import.meta.env.VITE_PARENT_ACCESS_API_ORIGIN || config.erpUrl).trim();
  let url: URL;
  try { url = new URL(configuredOrigin); }
  catch { throw new Error('Parent access API origin is invalid.'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(import.meta.env.DEV && local && url.protocol === 'http:')) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Parent access API origin must be an HTTPS origin.');
  }
  return `${url.origin}/api/parent-access`;
};

export const manageParentAccess = async (request: {
  action: ParentAccessAction;
  studentId: string;
  organizationId: string;
  parentName?: string;
  aliasBasis?: string;
  relationshipVerified?: boolean;
  reuseParentUid?: string;
}): Promise<ParentAccessResult> => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in to Edufy before managing parent access.');
  const result = await fetch(parentAccessEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
    cache: 'no-store'
  }).catch(() => { throw new Error('The secure parent account service is unavailable. Check its API connection before retrying.'); });
  if (!result.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The secure parent account service is not available at the configured API address.');
  }
  const payload = await result.json().catch(() => ({}));
  if (!result.ok || !payload.ok) {
    const error = new Error(payload.error || 'Parent access could not be updated.') as Error & { code?: string };
    error.code = payload.code;
    throw error;
  }
  return payload as ParentAccessResult;
};
