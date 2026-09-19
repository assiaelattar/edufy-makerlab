const destinations = {
  'instagram-post': { label: 'Instagram post', aspectRatio: '4:5' },
  'instagram-story': { label: 'story or reel cover', aspectRatio: '9:16' },
  'website-hero': { label: 'website hero', aspectRatio: '16:9' },
  'website-card': { label: 'website program card', aspectRatio: '4:3' },
  'google-business': { label: 'Google Business update', aspectRatio: '4:3' },
  'paid-ad': { label: 'paid advertisement', aspectRatio: '1:1' }
};

const cleanText = (value, maxLength) => typeof value === 'string'
  ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
  : '';

const cleanList = (value, maxItems = 8) => Array.isArray(value)
  ? value.map(item => cleanText(item, 180)).filter(Boolean).slice(0, maxItems)
  : [];

export function buildCreativePrompt(body, brandDna) {
  const destinationId = cleanText(body?.destination?.id, 40);
  const destination = destinations[destinationId];
  const objective = cleanText(body?.draft?.objective, 500);
  const audience = cleanText(body?.draft?.audience, 220);
  const programName = cleanText(body?.draft?.programName, 160);

  if (!destination || objective.length < 8 || audience.length < 3) {
    throw new Error('Choose a supported destination and add a clear objective and audience.');
  }

  const environments = cleanList(brandDna.environments);
  const signatureDetails = cleanList(brandDna.signatureDetails);
  const safetyRules = cleanList(brandDna.safetyRules, 12);
  const exclusions = cleanList(brandDna.exclusions, 12);

  const prompt = [
    `Create a photorealistic, natural ${destination.label} image in ${destination.aspectRatio} aspect ratio for ${cleanText(brandDna.organizationName, 100)}.`,
    `Business: ${cleanText(brandDna.industry, 120)}. ${cleanText(brandDna.summary, 700)}`,
    programName ? `Campaign context: ${programName}.` : '',
    `Purpose: ${objective}. Audience: ${audience}.`,
    environments.length ? `Environment: ${environments.join('; ')}.` : '',
    brandDna.peopleGuidance ? `People: ${cleanText(brandDna.peopleGuidance, 700)}.` : '',
    `Visual direction: ${cleanText(brandDna.visualStyle, 700)}.`,
    signatureDetails.length ? `Recognizable details: ${signatureDetails.join('; ')}.` : '',
    safetyRules.length ? `Safety requirements: ${safetyRules.join('; ')}.` : '',
    `Composition must suit a ${destination.label} and preserve a practical safe area for later typography. Do not render text, logos, captions, watermarks, or fake interface copy inside the image.`,
    `Avoid: ${exclusions.join('; ')}. Avoid CGI, wax skin, malformed hands, duplicated features, excessive symmetry, cinematic grading, and commercial perfection.`
  ].filter(Boolean).join(' ');

  return { aspectRatio: destination.aspectRatio, prompt };
}
