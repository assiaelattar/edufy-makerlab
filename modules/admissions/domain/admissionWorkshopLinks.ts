import type { Booking, Lead } from '../../../types';

export type AdmissionLinkedBooking = Booking & {
  admissionCaseId?: string;
  crmLeadId?: string;
  leadId?: string;
};

export type BookingLeadResolution =
  | { status: 'unlinked'; lead: null; leadIds: [] }
  | { status: 'linked'; lead: Lead; leadIds: [string] }
  | { status: 'missing'; lead: null; leadIds: [string] }
  | { status: 'conflict'; lead: null; leadIds: string[] };

const uniqueIds = (values: Array<string | null | undefined>) => [...new Set(
  values.map(value => String(value || '').trim()).filter(Boolean),
)];

export const normalizeAdmissionsPhone = (value: string | null | undefined) => (value || '').replace(/\D/g, '');

export const getExplicitBookingLeadIds = (booking: AdmissionLinkedBooking) => uniqueIds([
  booking.admissionCaseId,
  booking.crmLeadId,
  booking.leadId,
]);

export const isDeterministicCrmBookingForLead = (booking: AdmissionLinkedBooking, leadId: string) =>
  Boolean(booking.workshopSlotId && booking.id === `crm_${booking.workshopSlotId}_${leadId}`);

export const isBookingStableLinkedToLead = (booking: AdmissionLinkedBooking, leadId: string) =>
  getExplicitBookingLeadIds(booking).includes(leadId) || isDeterministicCrmBookingForLead(booking, leadId);

export const resolveBookingAdmissionLead = (
  booking: AdmissionLinkedBooking,
  leads: ReadonlyArray<Lead>,
  organizationId: string,
): BookingLeadResolution => {
  const explicitIds = getExplicitBookingLeadIds(booking);
  if (explicitIds.length > 1) return { status: 'conflict', lead: null, leadIds: explicitIds };

  const tenantLeads = leads.filter(lead => lead.organizationId === organizationId);
  const deterministicIds = tenantLeads
    .filter(lead => isDeterministicCrmBookingForLead(booking, lead.id))
    .map(lead => lead.id);
  const leadIds = uniqueIds([...explicitIds, ...deterministicIds]);

  if (leadIds.length === 0) return { status: 'unlinked', lead: null, leadIds: [] };
  if (leadIds.length > 1) return { status: 'conflict', lead: null, leadIds };

  const lead = tenantLeads.find(candidate => candidate.id === leadIds[0]) || null;
  return lead
    ? { status: 'linked', lead, leadIds: [leadIds[0]] }
    : { status: 'missing', lead: null, leadIds: [leadIds[0]] };
};

export const findBookingPhoneCandidateLeadIds = (
  booking: AdmissionLinkedBooking,
  leads: ReadonlyArray<Lead>,
  organizationId: string,
) => {
  const phone = normalizeAdmissionsPhone(booking.phoneNumber);
  if (!phone) return [];

  return leads
    .filter(lead => lead.organizationId === organizationId)
    .filter(lead => !isBookingStableLinkedToLead(booking, lead.id))
    .filter(lead => normalizeAdmissionsPhone(lead.phone) === phone)
    .map(lead => lead.id);
};
