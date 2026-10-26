import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { deleteApp as deleteAdminApp } from 'firebase-admin/app';
// @ts-expect-error The production admin helper is JavaScript and intentionally has no declaration file.
import { getDb, getFirebaseAdminApp } from '../../api/agent/_lib/firebaseAdmin.js';
import { createPublicWorkshopBooking, publicWorkshopSlotId } from '../../services/publicWorkshopBooking.ts';
import type { VirtualSlot } from '../../utils/helpers.ts';
import type { WorkshopTemplate } from '../../types/index.ts';

assert(process.env.FIRESTORE_EMULATOR_HOST);
assert(process.env.GCLOUD_PROJECT?.startsWith('demo-'));

const adminDb = getDb();
const app = initializeApp({ apiKey: 'demo-key', authDomain: 'localhost', projectId: process.env.GCLOUD_PROJECT });
const firestore = getFirestore(app);
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
connectFirestoreEmulator(firestore, host, Number(port));

const template = {
  id: 'public-demo', organizationId: 'org-a', title: 'Atelier Démo', capacityPerSlot: 2,
  duration: 60, isActive: true, shareableSlug: 'atelier-demo'
} as WorkshopTemplate;
const slot = {
  workshopTemplateId: template.id, templateTitle: template.title, dateStr: '2030-05-20',
  startTime: '10:00', endTime: '11:00', capacity: 2, bookedCount: 0, status: 'available'
} as VirtualSlot;
const form = { parentName: 'Parent Demo', phone: '0600000000', kidName: 'Learner Demo', kidAge: '9', kidInterests: 'Robotics' };

await adminDb.doc(`workshop_templates/${template.id}`).set({
  organizationId: template.organizationId, title: template.title, capacityPerSlot: template.capacityPerSlot,
  duration: template.duration, isActive: true, shareableSlug: template.shareableSlug
});

const first = await createPublicWorkshopBooking(firestore, template, slot, 'public-attempt-one', form);
assert.equal(first.slotId, publicWorkshopSlotId(template.id, slot));
assert.equal((await adminDb.doc('bookings/public-attempt-one').get()).data()?.status, 'requested');
let storedSlot = (await getDoc(doc(firestore, 'workshop_slots', first.slotId))).data();
assert.equal(storedSlot?.bookedCount, 1);
assert.equal(storedSlot?.lastBookingId, 'public-attempt-one');

// The same browser attempt is a no-op after an uncertain response.
await createPublicWorkshopBooking(firestore, template, slot, 'public-attempt-one', form);
storedSlot = (await getDoc(doc(firestore, 'workshop_slots', first.slotId))).data();
assert.equal(storedSlot?.bookedCount, 1);
assert.equal((await getDocs(query(collection(firestore, 'workshop_slots'), where('workshopTemplateId', '==', template.id)))).size, 1);

await createPublicWorkshopBooking(firestore, template, { ...slot, slotId: first.slotId, bookedCount: 1 }, 'public-attempt-two', { ...form, kidName: 'Second Learner' });
storedSlot = (await getDoc(doc(firestore, 'workshop_slots', first.slotId))).data();
assert.equal(storedSlot?.bookedCount, 2);
assert.equal(storedSlot?.status, 'full');
assert.equal((await adminDb.collection('bookings').where('workshopSlotId', '==', first.slotId).get()).size, 2);

// A previously published client may still submit `confirmed` during the rollout.
const legacyTemplate = { ...template, id: 'legacy-public-demo', capacityPerSlot: 1 };
await adminDb.doc(`workshop_templates/${legacyTemplate.id}`).set({
  organizationId: legacyTemplate.organizationId, title: legacyTemplate.title, capacityPerSlot: 1,
  duration: legacyTemplate.duration, isActive: true, shareableSlug: 'legacy-public-demo'
});
const legacyBookingId = 'legacy-public-attempt';
const legacySlotId = publicWorkshopSlotId(legacyTemplate.id, slot);
await runTransaction(firestore, async transaction => {
  transaction.set(doc(firestore, 'workshop_slots', legacySlotId), {
    organizationId: legacyTemplate.organizationId, workshopTemplateId: legacyTemplate.id,
    date: slot.dateStr, startTime: slot.startTime, endTime: slot.endTime,
    capacity: 1, bookedCount: 1, status: 'full', lastBookingId: legacyBookingId
  });
  transaction.set(doc(firestore, 'bookings', legacyBookingId), {
    organizationId: legacyTemplate.organizationId, workshopSlotId: legacySlotId, workshopTemplateId: legacyTemplate.id,
    parentName: form.parentName, phoneNumber: form.phone, kidName: form.kidName,
    kidAge: Number(form.kidAge), kidInterests: form.kidInterests,
    status: 'confirmed', bookedAt: serverTimestamp()
  });
});
assert.equal((await adminDb.doc(`bookings/${legacyBookingId}`).get()).data()?.status, 'confirmed');

await assert.rejects(
  createPublicWorkshopBooking(firestore, template, { ...slot, slotId: first.slotId, bookedCount: 2, status: 'full' }, 'public-attempt-three', form),
  (error: Error & { code?: string }) => error.code === 'slot-full'
);
assert.equal((await getDoc(doc(firestore, 'workshop_slots', first.slotId))).data()?.bookedCount, 2);
assert.equal((await adminDb.collection('bookings').where('workshopSlotId', '==', first.slotId).get()).size, 2);

// A public client cannot pair a booking with a template from another tenant.
const wrongTemplate = { ...template, id: 'foreign-template', organizationId: 'org-b', shareableSlug: 'foreign' } as WorkshopTemplate;
await adminDb.doc(`workshop_templates/${wrongTemplate.id}`).set({ organizationId: 'org-b', title: 'Foreign', capacityPerSlot: 2, duration: 60, isActive: true, shareableSlug: 'foreign' });
await assert.rejects(createPublicWorkshopBooking(firestore, { ...wrongTemplate, organizationId: 'org-a' }, { ...slot, workshopTemplateId: wrongTemplate.id }, 'public-foreign', form));

console.log('Public booking emulator: requested and legacy confirmed creates, atomic slot creation, one-count retry, capacity limit, full-session rejection, and tenant validation passed.');
await deleteApp(app);
await deleteAdminApp(getFirebaseAdminApp());
