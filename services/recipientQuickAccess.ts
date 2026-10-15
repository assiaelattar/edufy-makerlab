import { auth } from './firebase';

export interface RecipientQuickLink {
  launchUrl: string;
  expiresAt: string;
}

const endpointUrl = () => {
  const configured = String(import.meta.env.VITE_PARENT_ACCESS_API_ORIGIN || 'https://edufy-makerlab.vercel.app').trim();
  const origin = new URL(configured);
  const local = ['localhost', '127.0.0.1'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !(import.meta.env.DEV && local && origin.protocol === 'http:')) ||
      origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('The secure account service origin is invalid.');
  }
  return `${origin.origin}/api/app-bridge/sparkquest/share`;
};

export const issueRecipientQuickLink = async (request: {
  studentId: string;
  organizationId: string;
  role: 'parent' | 'student';
}): Promise<RecipientQuickLink> => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in to Edufy before creating a quick access link.');
  const response = await fetch(endpointUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Edufy-Id-Token': token,
      'X-Edufy-Organization-Id': request.organizationId,
    },
    body: JSON.stringify({ studentId: request.studentId, role: request.role, identityVerified: true }),
    cache: 'no-store',
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The secure account service is not available at the configured address.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || typeof payload.launchUrl !== 'string' || typeof payload.expiresAt !== 'string') {
    throw new Error(payload?.error?.message || 'Could not create the one-click link.');
  }
  return { launchUrl: payload.launchUrl, expiresAt: payload.expiresAt };
};
