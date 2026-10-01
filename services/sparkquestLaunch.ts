import type { User } from 'firebase/auth';
import { config } from '../utils/config';

type SparkQuestLaunchResponse = {
  ok: true;
  launchUrl: string;
  expiresAt: string;
};

const endpointUrl = () => new URL('/api/app-bridge/sparkquest/launch', config.erpUrl).toString();

export const requestSparkQuestLaunch = async ({
  user,
  organizationId,
  projectId,
}: {
  user: User;
  organizationId: string;
  projectId?: string;
}): Promise<SparkQuestLaunchResponse> => {
  if (!organizationId) throw new Error('Choose an Edufy workspace before opening SparkQuest.');
  const idToken = await user.getIdToken();
  const response = await fetch(endpointUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Edufy-Id-Token': idToken,
      'X-Edufy-Organization-Id': organizationId,
    },
    body: JSON.stringify({ projectId: projectId || null }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.launchUrl) {
    throw new Error(payload?.error?.message || 'SparkQuest could not create a secure launch.');
  }
  return payload;
};
