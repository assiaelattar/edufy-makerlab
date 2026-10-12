export type PickupStatus = 'on_the_way' | 'arrived' | 'released' | 'confirmed' | 'cancelled' | 'exception';

export const pickupEntryId = (organizationId: string, studentId: string, sessionDate: string): string => {
  if (!organizationId || !studentId || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    throw new Error('A tenant, learner and dated session are required.');
  }
  return `${organizationId}_${studentId}_${sessionDate}_daily`;
};

/** Rules use request.time's UTC date, so IDs must use the same boundary. */
export const pickupSessionDate = (now = new Date()): string => now.toISOString().slice(0, 10);

export const isCanonicalPickupEntry = (entry: { id: string; organizationId: string; studentId: string; sessionDate?: string }): boolean =>
  Boolean(entry.organizationId && entry.studentId && entry.sessionDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.sessionDate) &&
    entry.id === pickupEntryId(entry.organizationId, entry.studentId, entry.sessionDate));

export const previousPickupDate = (sessionDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) throw new Error('Invalid pickup date.');
  return new Date(Date.parse(`${sessionDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
};

export const canAdvancePickup = (from: PickupStatus, to: PickupStatus): boolean =>
  (from === 'on_the_way' && to === 'arrived') ||
  (from === 'arrived' && to === 'released') ||
  (from === 'released' && to === 'confirmed') ||
  (['on_the_way', 'arrived'].includes(from) && to === 'cancelled') ||
  (['on_the_way', 'arrived', 'released'].includes(from) && to === 'exception');

export const isAuthorizedPicker = (pickerName: string, parentName: string, authorizedPickups: string[] = []): boolean =>
  pickerName.length > 0 && (pickerName === parentName || authorizedPickups.includes(pickerName));

export const selectDatedPickup = <T extends { id: string; organizationId: string; studentId: string; sessionDate?: string }>(
  entries: T[], organizationId: string, studentId: string, sessionDate: string
): T | null => entries.find(entry => entry.id === pickupEntryId(organizationId, studentId, sessionDate) &&
  entry.organizationId === organizationId && entry.studentId === studentId && entry.sessionDate === sessionDate) || null;

export const selectOpenPickup = <T extends { id: string; organizationId: string; studentId: string; sessionDate?: string; status: string }>(
  entries: T[], organizationId: string, studentId: string, sessionDate: string
): T | null => selectDatedPickup(entries, organizationId, studentId, sessionDate) ||
  (() => {
    const previous = selectDatedPickup(entries, organizationId, studentId, previousPickupDate(sessionDate));
    return previous && ['on_the_way', 'arrived'].includes(previous.status) ? previous : null;
  })();
