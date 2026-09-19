import { generateImage } from 'ai';
import { requireCreativeUser } from './_lib/appAuth.js';
import { chatgptForCreativeRequest } from './_lib/chatgpt.js';
import { buildCreativePrompt } from './_lib/prompt.js';
import { methodNotAllowed, sendJson, serverError } from '../agent/_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const appAccess = await requireCreativeUser(req, res);
  if (!appAccess) return;

  let production;
  try {
    production = buildCreativePrompt(req.body, appAccess.brandDna);
  } catch (error) {
    return sendJson(res, 400, { code: 'CREATIVE_BRIEF_INVALID', error: error.message });
  }

  let openai;
  try {
    openai = await chatgptForCreativeRequest(req);
  } catch {
    return sendJson(res, 401, { code: 'CHATGPT_CONNECTION_REQUIRED', error: 'Connect ChatGPT to generate a new image.' });
  }

  try {
    const modelId = process.env.ATLAS_CREATIVE_IMAGE_MODEL || 'gpt-image-2';
    const result = await generateImage({
      model: openai.image(modelId),
      prompt: production.prompt,
      aspectRatio: production.aspectRatio,
      n: 1,
      maxRetries: 1
    });

    return sendJson(res, 200, {
      dataUrl: `data:${result.image.mediaType};base64,${result.image.base64}`,
      mediaType: result.image.mediaType,
      prompt: production.prompt,
      qaNote: `Generated from the saved ${appAccess.brandDna.organizationName} Brand DNA. Review people, equipment, safety, and anatomy before approval.`
    });
  } catch (error) {
    return serverError(res, error, 'The image could not be generated. No asset was saved.');
  }
}
