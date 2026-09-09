import { collection, doc, onSnapshot, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { CatalogueService, ServiceValues } from '../types/serviceCatalogue';
import { defaultServices, validateService } from '../utils/serviceCatalogue';

const catalogue = (db: Firestore, organizationId: string) => {
  if (!organizationId || organizationId.includes('/')) throw new Error('Organisation invalide.');
  return collection(db, 'organizations', organizationId, 'serviceCatalogue');
};

export const subscribeServiceCatalogue = (db: Firestore, organizationId: string, onData: (services: CatalogueService[]) => void, onError: (error: Error) => void) => onSnapshot(catalogue(db, organizationId), snapshot => onData(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogueService))), onError);

// Expected-version writes prevent silent overwrites by two operators. Version 0 is a bundled default.
export const saveCatalogueService = async (db: Firestore, organizationId: string, id: string | undefined, expectedVersion: number, values: ServiceValues) => {
  const normalized = validateService(values);
  if (id?.includes('/')) throw new Error('Service invalide.');
  const ref = id ? doc(catalogue(db, organizationId), id) : doc(catalogue(db, organizationId));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    if ((current.data()?.version ?? 0) !== expectedVersion) throw new Error('Ce service a été modifié. Fermez puis rouvrez sa fiche.');
    transaction.set(ref, { ...normalized, organizationId, version: expectedVersion + 1, createdAt: current.data()?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() });
  });
  return ref.id;
};

// Explicit, repeatable import: existing edits and archived defaults are never overwritten.
export const importDefaultServices = async (db: Firestore, organizationId: string) => runTransaction(db, async transaction => {
  const defaults = defaultServices(organizationId);
  const refs = defaults.map(service => doc(catalogue(db, organizationId), service.id));
  const existing = await Promise.all(refs.map(ref => transaction.get(ref)));
  let count = 0;
  defaults.forEach((service, index) => {
    if (existing[index].exists()) return;
    const { id, version, organizationId: ignored, ...values } = service;
    transaction.set(refs[index], { ...validateService(values), organizationId, version: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    count++;
  });
  return count;
});
