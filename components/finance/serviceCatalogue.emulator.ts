import assert from 'node:assert/strict';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, doc, getDoc, getDocs, collection, updateDoc, deleteDoc, setDoc, serverTimestamp, terminate } from 'firebase/firestore';
import { importDefaultServices, saveCatalogueService } from '../../services/serviceCatalogue';
import { defaultServices, snapshotService } from '../../utils/serviceCatalogue';
import { createFullCreditNote, issueFinanceInvoice, loadFinanceInvoiceSequences, saveFinanceInvoiceSequences, updateFinanceInvoice } from '../../services/financeDocuments';

const projectId = process.env.GCLOUD_PROJECT || 'demo-edufy-services';
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:') || !process.env.FIREBASE_AUTH_EMULATOR_HOST?.startsWith('127.0.0.1:')) throw new Error('Local demo emulators required.');
const admin = initializeAdminApp({ projectId });
const adminDb = getAdminFirestore(admin);
const adminAuth = getAdminAuth(admin);
await adminDb.doc('platformSettings/core').set({ bootstrapComplete: true });
const identities = [
  { uid: 'owner-one', role: 'owner', organizationId: 'one', status: 'active' },
  { uid: 'owner-two', role: 'owner', organizationId: 'two', status: 'active' },
  { uid: 'accountant', role: 'accountant', organizationId: 'one', status: 'active' },
  { uid: 'disabled', role: 'admin', organizationId: 'one', status: 'disabled' },
];
const apps: ReturnType<typeof initializeApp>[] = [];
const stores: ReturnType<typeof getFirestore>[] = [];
const denied = (promise: Promise<unknown>) => assert.rejects(promise, (error: any) => error.code === 'permission-denied');
try {
  for (const identity of identities) {
    const email = `${identity.uid}@example.test`, password = 'Local-service-test-2026!';
    await adminAuth.createUser({ uid: identity.uid, email, password });
    await adminDb.doc(`users/${identity.uid}`).set(identity);
    const app = initializeApp({ projectId, apiKey: 'fake-api-key' }, identity.uid); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    await signInWithEmailAndPassword(auth, email, password);
    const store = getFirestore(app); const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':'); connectFirestoreEmulator(store, host, Number(port)); stores.push(store);
  }
  const [owner, other, accountant, disabled] = stores;
  assert.equal(await importDefaultServices(owner, 'one'), 8);
  assert.equal(await importDefaultServices(owner, 'one'), 0);
  const service = { ...defaultServices('one')[0], unitPrice: 1200 };
  const ref = doc(owner, 'organizations/one/serviceCatalogue', service.id);
  await saveCatalogueService(owner, 'one', service.id, 1, { ...service, name: 'Custom service' });
  await assert.rejects(saveCatalogueService(owner, 'one', service.id, 1, service), /modifié/);
  assert.equal(await importDefaultServices(owner, 'one'), 0);
  assert.equal((await getDoc(ref)).data()?.name, 'Custom service');
  await saveCatalogueService(owner, 'one', service.id, 2, { ...service, status: 'archived' });
  assert.equal((await getDoc(ref)).data()?.status, 'archived');
  await saveCatalogueService(owner, 'one', service.id, 3, service);
  for (const store of [other, accountant, disabled]) {
    await denied(getDocs(collection(store, 'organizations/one/serviceCatalogue')));
    await denied(setDoc(doc(store, 'organizations/one/serviceCatalogue/illegal'), { organizationId: 'one' }));
  }
  await denied(deleteDoc(ref));
  await denied(updateDoc(ref, { name: 'Bypassed version', updatedAt: serverTimestamp() }));
  await denied(updateDoc(ref, { organizationId: 'two', version: 5, updatedAt: serverTimestamp() }));
  await denied(updateDoc(ref, { quantity: -1, version: 5, updatedAt: serverTimestamp() }));
  await denied(updateDoc(ref, { arbitrary: 'extra', version: 5, updatedAt: serverTimestamp() }));
  await denied(setDoc(doc(owner, `organizations/one/serviceCatalogue/${service.id}/nested/escape`), { bypass: true }));
  const input = { organizationId: 'one', issueDate: '2026-09-09', currency: 'MAD', customer: { type: 'company' as const, name: 'Local client' }, participants: [], idempotencyKey: 'services-test', lines: [{ ...snapshotService(service, 'one'), quantity: 2, details: 'Agreed mission scope' }, { ...snapshotService(defaultServices('one')[1], 'one'), unitPrice: 500, taxRate: 0 }] };
  const invoice = await issueFinanceInvoice(owner, input);
  const replay = await issueFinanceInvoice(owner, input);
  assert.equal(invoice.id, replay.id); assert.equal(invoice.number, '2026S001'); assert.equal(invoice.sequenceType, 'service'); assert.equal(invoice.total, 3380);
  assert.equal((await getDocs(collection(owner, 'organizations/one/corporateEnrollments'))).size, 0, 'services never create training enrollments');
  await saveCatalogueService(owner, 'one', service.id, 4, { ...service, description: 'Changed afterwards', unitPrice: 9999 });
  const stored = (await getDoc(doc(owner, 'organizations/one/financeDocuments', invoice.id))).data()!;
  assert.equal(stored.lines[0].details, 'Agreed mission scope'); assert.equal(stored.lines[0].unitPrice, 1200);
  const edited = await updateFinanceInvoice(owner, { organizationId: 'one', invoiceId: invoice.id, expectedRevision: 0, issueDate: invoice.issueDate, dueDate: invoice.issueDate, serviceDate: invoice.issueDate, customer: { ...invoice.customer, name: 'Corrected client' }, lines: [{ ...snapshotService(service, 'one'), quantity: 2, unitPrice: 1000, details: 'Corrected scope' }, { ...snapshotService(defaultServices('one')[1], 'one'), unitPrice: 500, taxRate: 0 }] });
  assert.equal(edited.id, invoice.id); assert.equal(edited.number, invoice.number); assert.equal(edited.total, 2900); assert.equal(edited.revision, 1);
  await assert.rejects(updateFinanceInvoice(owner, { organizationId: 'one', invoiceId: invoice.id, expectedRevision: 0, issueDate: invoice.issueDate, customer: invoice.customer, lines: input.lines }), /modified elsewhere/);
  await assert.rejects(updateFinanceInvoice(owner, { organizationId: 'one', invoiceId: invoice.id, expectedRevision: 1, issueDate: '2027-01-01', customer: invoice.customer, lines: input.lines }), /year/);
  await denied(updateFinanceInvoice(other, { organizationId: 'one', invoiceId: invoice.id, expectedRevision: 1, issueDate: invoice.issueDate, customer: invoice.customer, lines: input.lines }));
  const program = await issueFinanceInvoice(owner, { ...input, idempotencyKey: 'program-test', programId: 'training', programName: 'Training', participants: [{ id: 'p', name: 'Participant' }], lines: [{ description: 'Formation', quantity: 1, unitPrice: 100, taxRate: 20 }] });
  assert.equal(program.number, '2026F001'); assert.equal(program.sequenceType, 'formation'); assert(program.corporateEnrollmentId);
  const initialSequences = await loadFinanceInvoiceSequences(owner, 'one', 2026);
  assert.deepEqual({ formation: initialSequences.formation.lastUsed, service: initialSequences.service.lastUsed }, { formation: 1, service: 1 });
  const advancedSequences = await saveFinanceInvoiceSequences(owner, 'one', 2026, { formation: 14, service: 9 });
  assert.equal(advancedSequences.formation.nextNumber, '2026F015'); assert.equal(advancedSequences.service.nextNumber, '2026S010');
  const nextService = await issueFinanceInvoice(owner, { ...input, idempotencyKey: 'services-next' });
  const nextProgram = await issueFinanceInvoice(owner, { ...input, idempotencyKey: 'program-next', programId: 'training', programName: 'Training', participants: [{ id: 'p2', name: 'Participant 2' }] });
  assert.equal(nextService.number, '2026S010'); assert.equal(nextProgram.number, '2026F015');
  await assert.rejects(saveFinanceInvoiceSequences(owner, 'one', 2026, { formation: 1, service: 1 }), /ne peut pas revenir/);
  const credit = await createFullCreditNote(owner, 'one', edited, 'Test correction');
  assert.deepEqual(credit.lines, edited.lines); assert.equal(credit.total, edited.total);
  assert.equal((await getDoc(doc(owner, 'organizations/one/financeDocuments', invoice.id))).data()?.status, 'credited');
  await assert.rejects(updateFinanceInvoice(owner, { organizationId: 'one', invoiceId: invoice.id, expectedRevision: 1, issueDate: invoice.issueDate, customer: invoice.customer, lines: input.lines }), /credited/);
  await denied(getDocs(collection(other, 'organizations/one/financeDocuments')));
  await denied(issueFinanceInvoice(accountant, { ...input, idempotencyKey: 'denied' }));
  console.log('Service emulator checks passed: catalogue versioning, F/S sequence resume and safe adjustment, invoice issue/edit/concurrency, program enrollment, credit locks, tenant/role/disabled/invalid/nested/delete denial.');
} finally {
  await Promise.all(stores.map(store => terminate(store)));
  await Promise.all(apps.map(app => deleteApp(app)));
  await deleteAdminApp(admin);
}
