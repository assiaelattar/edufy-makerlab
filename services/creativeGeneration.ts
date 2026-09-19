import type { User } from 'firebase/auth';
import type { CreativeGenerationRequest, CreativeGenerationResult } from '../types/creativeStudio';
import { fetchWithChatGPT } from '../modules/chatgpt-auth/client';

export class CreativeGenerationError extends Error {
  code: string;

  constructor(message: string, code = 'CREATIVE_GENERATION_FAILED') {
    super(message);
    this.name = 'CreativeGenerationError';
    this.code = code;
  }
}

export const generateCreativeAsset = async (
  request: CreativeGenerationRequest,
  user: User,
  organizationId: string
): Promise<CreativeGenerationResult> => {
  const idToken = await user.getIdToken();
  const response = await fetchWithChatGPT('/api/creative/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-edufy-id-token': idToken,
      'x-edufy-organization-id': organizationId
    },
    body: JSON.stringify(request)
  });

  const payload = await response.json().catch(() => null) as (CreativeGenerationResult & { code?: string; error?: string }) | null;
  if (!response.ok || !payload) {
    throw new CreativeGenerationError(
      payload?.error || 'The creative service could not generate this asset.',
      payload?.code || 'CREATIVE_GENERATION_FAILED'
    );
  }

  return payload;
};
