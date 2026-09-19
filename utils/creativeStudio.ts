import type {
  CreativeDestination,
  CreativeDestinationId,
  CreativeGenerationRequest,
  TenantBrandDna
} from '../types/creativeStudio';

export const CREATIVE_DESTINATIONS: CreativeDestination[] = [
  { id: 'instagram-post', label: 'Instagram post', shortLabel: 'Post', description: 'A portrait feed asset with room for a concise message.', aspectRatio: '4:5', width: 1080, height: 1350 },
  { id: 'instagram-story', label: 'Story or reel cover', shortLabel: 'Story', description: 'A vertical asset designed for mobile-first attention.', aspectRatio: '9:16', width: 1080, height: 1920 },
  { id: 'website-hero', label: 'Website hero', shortLabel: 'Hero', description: 'A wide, inspectable image with useful copy space.', aspectRatio: '16:9', width: 1600, height: 900 },
  { id: 'website-card', label: 'Website program card', shortLabel: 'Card', description: 'A close, readable subject for catalog and program pages.', aspectRatio: '4:3', width: 1200, height: 900 },
  { id: 'google-business', label: 'Google Business update', shortLabel: 'Google', description: 'A credible local-business image grounded in the organization.', aspectRatio: '4:3', width: 1200, height: 900 },
  { id: 'paid-ad', label: 'Paid advertisement', shortLabel: 'Ad', description: 'A focused campaign visual with a clear action.', aspectRatio: '1:1', width: 1080, height: 1080 }
];

const compactList = (value: string[] | undefined, limit = 8) => (value || [])
  .map(item => item.trim())
  .filter(Boolean)
  .slice(0, limit);

export const getDestination = (id: CreativeDestinationId) =>
  CREATIVE_DESTINATIONS.find(item => item.id === id) || CREATIVE_DESTINATIONS[0];

export const createTenantStarterBrandDna = (
  organizationId: string,
  organizationName: string,
  logoColors?: { primary?: string; secondary?: string; accent?: string }
): TenantBrandDna => {
  const isMakerLab = organizationId.toLowerCase().includes('makerlab') || organizationName.toLowerCase().includes('makerlab');

  if (isMakerLab) {
    return {
      version: 1,
      status: 'ready',
      organizationName,
      industry: 'STEAM academy and educational makerspace',
      summary: 'A practical Casablanca makerspace where children and teenagers learn by designing, coding, building, testing, and presenting real projects.',
      voice: 'Warm, capable, practical, optimistic, and specific. Celebrate real effort and progress without sounding childish or futuristic.',
      primaryColor: logoColors?.primary || '#F36C2D',
      secondaryColor: logoColors?.secondary || '#1677B8',
      accentColor: logoColors?.accent || '#F2C766',
      visualStyle: 'Believable documentary photography with natural 35mm to 50mm camera behavior, mixed daylight and practical light, readable tools, natural skin, and useful imperfections.',
      environments: ['Real MakerLab Academy space in Casablanca', 'White walls and worktops', 'Orange wall fields and educational graphics', 'Blue, red, and black practical chairs'],
      peopleGuidance: 'Fictional Moroccan and North African children aged 7 to 17 in ordinary modern clothing, collaborating naturally. Mentors guide without taking over. Use authorized references only when preserving a real identity.',
      signatureDetails: ['Hand-built 3 mm MDF prototypes', 'Visible practical cables and works in progress', 'Accurate micro:bit, Arduino, FDM printer, DJI Tello, or NEJE Max equipment'],
      exclusions: ['LEGO or toy-brick systems', 'Humanoid or industrial robots', 'Holograms, neon sci-fi labs, or showroom perfection', 'Fake readable code, impossible wiring, plastic skin, or posed stock smiles'],
      safetyRules: ['Protective glasses for every person near an active laser', 'No hands near active cutting or hot printer parts', 'No exposed mains wiring or unsupervised hazardous tools'],
      approvedTerms: ['learn by building', 'project-based learning', 'young makers', 'robotics', 'coding', 'digital fabrication']
    };
  }

  return {
    version: 1,
    status: 'draft',
    organizationName,
    industry: 'Education organization',
    summary: '',
    voice: 'Clear, welcoming, trustworthy, and useful.',
    primaryColor: logoColors?.primary || '#1FC7C7',
    secondaryColor: logoColors?.secondary || '#16324F',
    accentColor: logoColors?.accent || '#F2C766',
    visualStyle: '',
    environments: [],
    peopleGuidance: '',
    signatureDetails: [],
    exclusions: ['Generic stock-photo poses', 'Random text or watermarks', 'Unsafe or implausible activity'],
    safetyRules: [],
    approvedTerms: []
  };
};

export const normalizeBrandDna = (dna: TenantBrandDna): TenantBrandDna => ({
  ...dna,
  organizationName: dna.organizationName.trim().slice(0, 100),
  industry: dna.industry.trim().slice(0, 120),
  summary: dna.summary.trim().slice(0, 700),
  voice: dna.voice.trim().slice(0, 500),
  visualStyle: dna.visualStyle.trim().slice(0, 700),
  peopleGuidance: dna.peopleGuidance.trim().slice(0, 700),
  environments: compactList(dna.environments),
  signatureDetails: compactList(dna.signatureDetails),
  exclusions: compactList(dna.exclusions, 12),
  safetyRules: compactList(dna.safetyRules, 12),
  approvedTerms: compactList(dna.approvedTerms, 12)
});

export const getBrandReadiness = (dna: TenantBrandDna) => {
  const checks = [
    Boolean(dna.organizationName.trim()),
    Boolean(dna.industry.trim()),
    dna.summary.trim().length >= 40,
    dna.voice.trim().length >= 20,
    dna.visualStyle.trim().length >= 30,
    dna.environments.length > 0,
    dna.exclusions.length > 0
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100), ready: completed === checks.length };
};

export const compileCreativePrompt = ({ destination, draft, brandDna }: CreativeGenerationRequest) => {
  const programContext = draft.programName ? `Campaign context: ${draft.programName}.` : '';
  const safety = brandDna.safetyRules.length ? `Safety requirements: ${brandDna.safetyRules.join('; ')}.` : '';
  const people = brandDna.peopleGuidance ? `People: ${brandDna.peopleGuidance}.` : '';

  return [
    `Create a photorealistic, natural ${destination.label.toLowerCase()} image in ${destination.aspectRatio} aspect ratio for ${brandDna.organizationName}.`,
    `Business: ${brandDna.industry}. ${brandDna.summary}`,
    programContext,
    `Purpose: ${draft.objective}. Audience: ${draft.audience}.`,
    `Environment: ${brandDna.environments.join('; ')}.`,
    people,
    `Visual direction: ${brandDna.visualStyle}.`,
    `Recognizable details: ${brandDna.signatureDetails.join('; ')}.`,
    safety,
    `Composition must suit ${destination.label} and preserve a practical safe area for later typography. Do not render text, logos, captions, watermarks, or fake interface copy inside the image.`,
    `Avoid: ${brandDna.exclusions.join('; ')}. Avoid CGI, wax skin, malformed hands, duplicated features, excessive symmetry, cinematic grading, and commercial perfection.`
  ].filter(Boolean).join(' ');
};

export const splitListInput = (value: string) => value
  .split(/\r?\n|,/)
  .map(item => item.trim())
  .filter(Boolean);

export const joinListInput = (value: string[]) => value.join('\n');
