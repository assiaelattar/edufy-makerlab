import type { Credential } from '../types.ts';

export const uniqueCredentialsById = (credentials: Credential[]) => {
  const byId = new Map<string, Credential>();
  credentials.forEach(credential => {
    if (credential.id && !byId.has(credential.id)) byId.set(credential.id, credential);
  });
  return Array.from(byId.values());
};

export const saveCredentialById = (credentials: Credential[], credential: Credential) => {
  const current = uniqueCredentialsById(credentials);
  return current.some(item => item.id === credential.id) ? current : [...current, credential];
};

export const removeCredentialById = (credentials: Credential[], credentialId: string) =>
  uniqueCredentialsById(credentials).filter(credential => credential.id !== credentialId);
