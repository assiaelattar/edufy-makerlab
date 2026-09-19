import type { AdmissionActor } from '../domain/index.ts';

const PRIVILEGED_ROLES = new Set(['super_admin', 'owner', 'admin']);

export const hasAdmissionPermission = (actor: AdmissionActor, permission: string) => {
  if (actor.status !== 'active') return false;
  if (PRIVILEGED_ROLES.has(actor.role)) return true;
  if (actor.permissions.includes('*') || actor.permissions.includes(permission)) return true;
  const [scope] = permission.split('.');
  return actor.permissions.includes(`${scope}.*`);
};

export const canRecordAdmissionNote = (actor: AdmissionActor, organizationId: string) =>
  actor.organizationId === organizationId
  && (PRIVILEGED_ROLES.has(actor.role) || actor.role === 'admission_officer')
  && hasAdmissionPermission(actor, 'admissions.note');

export const canRecordAdmissionWhatsAppActivity = (actor: AdmissionActor, organizationId: string) =>
  actor.organizationId === organizationId
  && (PRIVILEGED_ROLES.has(actor.role) || actor.role === 'admission_officer')
  && hasAdmissionPermission(actor, 'admissions.whatsapp');
