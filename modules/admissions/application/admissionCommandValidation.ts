import {
  AdmissionCommandError,
  type AdmissionCommandClock,
} from './admissionCommandTypes.ts';

const SAFE_DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const requireAdmissionDocumentId = (value: string, label: string) => {
  if (!SAFE_DOCUMENT_ID.test(value)) {
    throw new AdmissionCommandError('INVALID_COMMAND', `${label} must be a safe document ID.`);
  }
};

export const admissionCommandFingerprint = (value: string) => {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }
  return `${(left >>> 0).toString(16).padStart(8, '0')}${(right >>> 0).toString(16).padStart(8, '0')}`;
};

export const normalizeAdmissionCommandBody = (body: string, label: string) => {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized || normalized.length > 2000) {
    throw new AdmissionCommandError('INVALID_COMMAND', `${label} must contain between 1 and 2,000 characters.`);
  }
  return normalized;
};

export const resolveAdmissionOccurredAt = (
  clock: AdmissionCommandClock | undefined,
  requestedOccurredAt?: string,
) => {
  const now = clock?.now() || new Date();
  const occurredAt = requestedOccurredAt || now.toISOString();
  const occurredAtTime = new Date(occurredAt).getTime();
  if (Number.isNaN(occurredAtTime)) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'The activity time is invalid.');
  }
  if (occurredAtTime > now.getTime() + 5 * 60 * 1000) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'The activity time cannot be more than five minutes in the future.');
  }
  return { now, occurredAt };
};
