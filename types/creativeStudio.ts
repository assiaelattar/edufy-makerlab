export type CreativeDestinationId =
  | 'instagram-post'
  | 'instagram-story'
  | 'website-hero'
  | 'website-card'
  | 'google-business'
  | 'paid-ad';

export type CreativeLanguage = 'English' | 'French' | 'Arabic';
export type CreativeVisualSource = 'gallery' | 'generate';

export interface CreativeDestination {
  id: CreativeDestinationId;
  label: string;
  shortLabel: string;
  description: string;
  aspectRatio: `${number}:${number}`;
  width: number;
  height: number;
}

export interface TenantBrandDna {
  version: number;
  status: 'draft' | 'ready';
  organizationName: string;
  industry: string;
  summary: string;
  voice: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  visualStyle: string;
  environments: string[];
  peopleGuidance: string;
  signatureDetails: string[];
  exclusions: string[];
  safetyRules: string[];
  approvedTerms: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface CreativeStudioDraft {
  destinationId: CreativeDestinationId;
  objective: string;
  audience: string;
  callToAction: string;
  language: CreativeLanguage;
  programId?: string;
  programName?: string;
  visualSource: CreativeVisualSource;
  galleryItemId?: string;
  galleryImageUrl?: string;
}

export interface CreativeGenerationRequest {
  destination: CreativeDestination;
  draft: CreativeStudioDraft;
  brandDna: TenantBrandDna;
}

export interface CreativeGenerationResult {
  dataUrl: string;
  mediaType: string;
  prompt: string;
  qaNote: string;
}
