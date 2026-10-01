import { doc, runTransaction, serverTimestamp, Timestamp, type Firestore } from 'firebase/firestore';
import type { ProcessTemplate } from '../types';
import { importDocumentId, materializeImport, type ImportCatalog, type ImportDraft } from '../domain/missionImport.ts';
import { createWorkflowSnapshot } from '../domain/workflowPipeline.ts';
import { omitUndefinedDeep } from '../domain/firestorePayload.ts';
import { getMissionReadiness } from '../domain/missionContent.ts';

/** A mission and its custom workflow are committed together, under one stable key. */
export async function persistImportedMission(db: Firestore, organizationId: string, actorId: string, draft: ImportDraft, catalog: ImportCatalog, source: string) {
  if (!actorId || !organizationId) throw new Error('Refresh your instructor session before importing.');
  const { mission, workflow, dueDate } = materializeImport(draft, catalog);
  const id = await importDocumentId(organizationId, draft.importKey);
  const missionRef = doc(db, 'project_templates', id);
  const workflowId = workflow ? `${id}-workflow` : mission.defaultWorkflowId;
  const fingerprint = await importDocumentId(organizationId, JSON.stringify({ mission, workflow, dueDate }));
  return runTransaction(db, async transaction => {
    const existing = await transaction.get(missionRef);
    if (existing.exists()) {
      if (existing.data().organizationId !== organizationId || existing.data().importKey !== draft.importKey.trim()) throw new Error('This import key is unavailable in your organization.');
      return { id, state: 'exists' as const, message: existing.data().importHash === fingerprint ? 'Already imported. Existing mission kept.' : 'This key already exists with different content. Existing mission kept; use a new key to create a copy.' };
    }
    let selectedWorkflow: ProcessTemplate | undefined = workflow ? { ...workflow, id: workflowId } : undefined;
    if (!workflow && workflowId) {
      const snapshot = await transaction.get(doc(db, 'process_templates', workflowId));
      if (!snapshot.exists()) throw new Error('The selected workflow was removed. Choose another workflow.');
      const stored = snapshot.data();
      if (stored.organizationId && stored.organizationId !== organizationId) throw new Error('The selected workflow belongs to another organization.');
      selectedWorkflow = { ...stored, id: workflowId } as ProcessTemplate;
    }
    if (selectedWorkflow && !selectedWorkflow.phases?.length) throw new Error('Add at least one phase to the workflow.');
    if (workflow && selectedWorkflow) transaction.set(doc(db, 'process_templates', workflowId), omitUndefinedDeep({ ...selectedWorkflow, organizationId, createdBy: actorId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    transaction.set(missionRef, omitUndefinedDeep({
      ...mission, defaultWorkflowId: workflowId || '',
      ...(selectedWorkflow ? { workflowSnapshot: createWorkflowSnapshot(selectedWorkflow) } : {}),
      ...(dueDate ? { dueDate: Timestamp.fromDate(new Date(`${dueDate}T23:59:59Z`)) } : {}),
      status: 'draft', organizationId, createdBy: actorId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      importKey: draft.importKey.trim(), importSource: source.slice(0, 200), importHash: fingerprint, importedAt: serverTimestamp(),
    }));
    return { id, state: 'created' as const, message: 'Draft created.' };
  });
}

export async function publishImportedMission(db: Firestore, organizationId: string, actorId: string, id: string) {
  if (!organizationId || !actorId) throw new Error('Refresh your instructor session before assigning.');
  return runTransaction(db, async transaction => {
    const ref = doc(db, 'project_templates', id);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().organizationId !== organizationId || !snapshot.data().importKey) throw new Error('This imported mission could not be verified.');
    const mission = snapshot.data();
    if (mission.status === 'assigned') return;
    if (mission.status !== 'draft') throw new Error('Open the mission editor to change this mission’s publishing state.');
    if (!getMissionReadiness(mission).publishReady || !mission.workflowSnapshot?.phases?.length) throw new Error('Complete the goal, outcome, workflow, and audience before assigning.');
    transaction.update(ref, { status: 'assigned', assignedBy: actorId, assignedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}
