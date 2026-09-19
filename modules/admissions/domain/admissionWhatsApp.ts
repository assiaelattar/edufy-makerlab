import type { CommunicationTemplate } from '../../../types';
import type {
  AdmissionActivity,
  AdmissionWhatsAppConsentState,
} from './admissionWorkflowTypes';

export interface AdmissionWhatsAppTemplate {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  source: 'tenant_library' | 'starter';
}

export interface AdmissionWhatsAppVariables {
  parentName?: string | null;
  learnerName?: string | null;
  programName?: string | null;
  academyName?: string | null;
}

export interface AdmissionMessagePreview {
  body: string;
  unresolvedTokens: string[];
  ready: boolean;
}

const STARTERS = [
  {
    id: 'admissions_trial_follow_up',
    title: "Après l'atelier d'essai",
    content: "Bonjour {{parent_name}}, merci pour la participation de {{student_name}} à l'atelier d'essai. Souhaitez-vous recevoir le planning et les formules disponibles ?",
  },
  {
    id: 'admissions_planning_pricing',
    title: 'Planning et tarifs',
    content: 'Bonjour {{parent_name}}, voici le suivi pour {{student_name}} concernant {{program_name}}. Je peux vous présenter les créneaux et la formule adaptée. Quel moment vous convient pour en discuter ?',
  },
  {
    id: 'admissions_decision_follow_up',
    title: 'Relance décision',
    content: 'Bonjour {{parent_name}}, je reviens vers vous concernant le parcours de {{student_name}}. Avez-vous pu consulter les informations envoyées ? Je reste disponible pour vos questions.',
  },
] as const;

const unique = (values: string[]) => [...new Set(values)];

export const getAdmissionWhatsAppStarterTemplates = (organizationId: string): AdmissionWhatsAppTemplate[] => STARTERS.map(template => ({
  ...template,
  organizationId,
  source: 'starter',
}));

export const toAdmissionWhatsAppTemplates = (
  organizationId: string,
  templates: ReadonlyArray<CommunicationTemplate>,
): AdmissionWhatsAppTemplate[] => templates
  .filter(template => Boolean(template.id && template.title?.trim() && template.content?.trim()))
  .map(template => ({
    id: template.id,
    organizationId,
    title: template.title.trim(),
    content: template.content.trim(),
    source: 'tenant_library',
  }));

export const validateAdmissionMessageBody = (body: string): AdmissionMessagePreview => {
  const normalizedBody = body.replace(/\r\n/g, '\n').trim();
  const unresolvedHandlebars = normalizedBody.match(/{{\s*[^{}]+\s*}}/g) || [];
  const unresolvedBrackets = normalizedBody.match(/\[[^\]\n]+\]/g) || [];
  const unresolvedTokens = unique([...unresolvedHandlebars, ...unresolvedBrackets]);
  return {
    body: normalizedBody,
    unresolvedTokens,
    ready: normalizedBody.length > 0 && normalizedBody.length <= 2000 && unresolvedTokens.length === 0,
  };
};

export const renderAdmissionWhatsAppTemplate = (
  template: AdmissionWhatsAppTemplate,
  organizationId: string,
  variables: AdmissionWhatsAppVariables,
): AdmissionMessagePreview => {
  if (!organizationId || template.organizationId !== organizationId) {
    throw new Error('The message template belongs to another organization.');
  }

  const values: Record<string, string> = {
    parent_name: String(variables.parentName || '').trim(),
    student_name: String(variables.learnerName || '').trim(),
    learner_name: String(variables.learnerName || '').trim(),
    program_name: String(variables.programName || '').trim(),
    academy_name: String(variables.academyName || '').trim(),
  };
  const body = template.content.replace(/{{\s*([a-z_]+)\s*}}/gi, (token, key: string) => values[key.toLowerCase()] || token);
  return validateAdmissionMessageBody(body);
};

export const buildAdmissionWhatsAppUrl = (phone: string, message: string) => {
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const preview = validateAdmissionMessageBody(message);
  if (normalizedPhone.length < 8) throw new Error('A valid parent phone number is required.');
  if (!preview.ready) throw new Error('Resolve every message variable before opening WhatsApp.');
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(preview.body)}`;
};

export const deriveAdmissionWhatsAppConsent = (
  activities: ReadonlyArray<AdmissionActivity>,
): AdmissionWhatsAppConsentState => [...activities]
  .filter(activity => activity.channel === 'whatsapp' && activity.communicationState === 'consent_updated')
  .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0]?.consentState || 'unknown';
