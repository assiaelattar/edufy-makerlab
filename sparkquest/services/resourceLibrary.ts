import { arrayUnion, collection, doc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
import type { Resource, ResourceLibraryItem } from '../types.ts';
import { omitUndefinedDeep } from '../domain/firestorePayload.ts';
import { validateLibraryResource } from '../domain/resourceLearning.ts';

interface ResourceActor { uid: string; organizationId: string; role: string }

const assertInstructor = (actor: ResourceActor) => {
  if (!actor.uid || !actor.organizationId || !['owner', 'super_admin', 'admin', 'instructor'].includes(actor.role)) throw new Error('A verified instructor session is required.');
};

const hash = (value: string) => {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return (output >>> 0).toString(36);
};

export const resourceLibraryId = (organizationId: string, resource: Resource) => resource.libraryId || `resource-${hash(`${organizationId}:${resource.url.trim().toLowerCase()}`)}`;

export const asMissionResource = (item: ResourceLibraryItem): Resource => ({
  id: item.id,
  libraryId: item.id,
  title: item.title,
  type: item.type,
  url: item.url,
  description: item.description || '',
  tags: item.tags || [],
  mimeType: item.mimeType,
  thumbnailUrl: item.thumbnailUrl,
  toolAccess: item.toolAccess,
  requiredForProgress: item.requiredForProgress === true,
  quiz: item.quiz,
});

export async function saveResourceLibraryItem(db: Firestore, resource: Resource, actor: ResourceActor) {
  assertInstructor(actor);
  validateLibraryResource(resource);
  const id = resourceLibraryId(actor.organizationId, resource);
  const ref = doc(db, 'resource_library', id);
  await setDoc(ref, omitUndefinedDeep({
    ...resource,
    id,
    libraryId: id,
    organizationId: actor.organizationId,
    status: 'active',
    createdBy: actor.uid,
    updatedAt: serverTimestamp(),
  }), { merge: true });
  return id;
}

export async function archiveResourceLibraryItem(db: Firestore, id: string, actor: ResourceActor) {
  assertInstructor(actor);
  await updateDoc(doc(db, 'resource_library', id), { status: 'archived', organizationId: actor.organizationId, updatedAt: serverTimestamp() });
}

export async function syncMissionResourcesToLibrary(db: Firestore, missionId: string, resources: Resource[], actor: ResourceActor) {
  assertInstructor(actor);
  const unique = new Map<string, Resource>();
  resources.filter(resource => resource?.url && resource?.title).forEach(resource => unique.set(resourceLibraryId(actor.organizationId, resource), resource));
  if (!unique.size) return [];
  const batch = writeBatch(db);
  unique.forEach((resource, id) => {
    batch.set(doc(collection(db, 'resource_library'), id), omitUndefinedDeep({
      ...resource,
      id,
      libraryId: id,
      organizationId: actor.organizationId,
      status: 'active',
      createdBy: actor.uid,
      sourceMissionIds: arrayUnion(missionId),
      updatedAt: serverTimestamp(),
    }), { merge: true });
  });
  await batch.commit();
  return [...unique.keys()];
}
