import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import type { Credential } from '../types';
import { removeCredentialById, saveCredentialById } from '../domain/credentialCabinet.ts';

const credentialsFrom = (data: Record<string, unknown>) =>
  Array.isArray(data.credentials) ? data.credentials as Credential[] : [];

export const saveCredential = async (db: Firestore, userId: string, credential: Credential) =>
  runTransaction(db, async transaction => {
    const reference = doc(db, 'users', userId);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('The learner profile is unavailable.');
    const current = credentialsFrom(snapshot.data());
    const next = saveCredentialById(current, credential);
    if (next.length !== current.length) transaction.update(reference, { credentials: next });
    return next;
  });

export const deleteCredential = async (db: Firestore, userId: string, credentialId: string) =>
  runTransaction(db, async transaction => {
    const reference = doc(db, 'users', userId);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('The learner profile is unavailable.');
    const current = credentialsFrom(snapshot.data());
    const next = removeCredentialById(current, credentialId);
    if (next.length !== current.length) transaction.update(reference, { credentials: next });
    return next;
  });
