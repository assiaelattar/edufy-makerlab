import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { VirtualSlot } from '../utils/helpers';
import type { WorkshopTemplate } from '../types';

export type PublicBookingForm = {
  parentName: string;
  phone: string;
  kidName: string;
  kidAge: string;
  kidInterests: string;
};

export const publicWorkshopSlotId = (templateId: string, slot: Pick<VirtualSlot, 'dateStr' | 'startTime'>) =>
  `public_${`${templateId}_${slot.dateStr}_${slot.startTime}`.replace(/[^A-Za-z0-9_-]/g, '-')}`;

export const createPublicWorkshopBooking = async (
  firestore: Firestore,
  template: WorkshopTemplate,
  selectedSlot: VirtualSlot,
  bookingId: string,
  bookingForm: PublicBookingForm
) => {
  const slotId = selectedSlot.slotId || publicWorkshopSlotId(template.id, selectedSlot);
  const slotRef = doc(firestore, 'workshop_slots', slotId);
  const bookingRef = doc(firestore, 'bookings', bookingId);

  await runTransaction(firestore, async transaction => {
    const slotSnapshot = await transaction.get(slotRef);
    // Public clients cannot read booking documents. The slot records the last
    // atomic booking id so an ambiguous network retry can succeed without
    // exposing another family's booking details or incrementing capacity.
    if (slotSnapshot.exists() && slotSnapshot.data().lastBookingId === bookingId) return;

    const capacity = slotSnapshot.exists() ? Number(slotSnapshot.data().capacity || 0) : Number(selectedSlot.capacity || template.capacityPerSlot);
    const bookedCount = slotSnapshot.exists() ? Number(slotSnapshot.data().bookedCount || 0) : 0;
    if (slotSnapshot.exists() && (
      slotSnapshot.data().organizationId !== template.organizationId ||
      slotSnapshot.data().workshopTemplateId !== template.id ||
      slotSnapshot.data().status === 'cancelled'
    )) throw Object.assign(new Error('Cette séance n’est plus disponible.'), { code: 'slot-unavailable' });
    if (capacity <= 0 || bookedCount >= capacity) throw Object.assign(new Error('Cette séance est complète.'), { code: 'slot-full' });

    const nextSlot = {
      organizationId: template.organizationId,
      workshopTemplateId: template.id,
      date: selectedSlot.dateStr,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      capacity,
      bookedCount: bookedCount + 1,
      status: bookedCount + 1 >= capacity ? 'full' : 'available',
      lastBookingId: bookingId
    };
    if (slotSnapshot.exists()) transaction.update(slotRef, {
      bookedCount: nextSlot.bookedCount,
      status: nextSlot.status,
      lastBookingId: bookingId
    });
    else transaction.set(slotRef, nextSlot);

    transaction.set(bookingRef, {
      organizationId: template.organizationId,
      workshopSlotId: slotId,
      workshopTemplateId: template.id,
      parentName: bookingForm.parentName.trim(),
      phoneNumber: bookingForm.phone.trim(),
      kidName: bookingForm.kidName.trim(),
      kidAge: Number(bookingForm.kidAge || 0),
      kidInterests: bookingForm.kidInterests.trim(),
      status: 'confirmed',
      bookedAt: serverTimestamp()
    });
  });
  return { bookingId, slotId };
};
