# Admissions Workshop Links

## Canonical relationship

A workshop booking belongs to an Admissions case only when stable evidence exists:

1. `booking.admissionCaseId` — canonical link;
2. `booking.crmLeadId` or `booking.leadId` — accepted compatibility links;
3. exact deterministic CRM booking ID `crm_<slotId>_<leadId>` — accepted historical evidence.

The lead and booking must belong to the same organization. If explicit fields disagree, or the linked lead is missing from the active tenant, conversion stops for repair.

## Phone evidence

Parent phone is never a case identifier. A same-tenant phone match is surfaced only as a candidate that blocks automatic merge. This protects siblings and shared household contacts from being attached to the wrong learner.

Public workshop bookings begin unlinked because they have no trusted case context. Converting an unlinked booking may create a new lead only when no phone-only candidate exists. Existing candidates require explicit review first.

## Producers and consumers

- CRM Lead Profile creates deterministic booking IDs and now writes both `admissionCaseId` and `crmLeadId`.
- Workshops conversion resolves an existing stable link or creates a new lead, then writes both link fields back to the booking.
- Workshop Action Center uses the same rule and writes the same link fields.
- Admissions projection and CRM Lead Profile consume the shared stable-link predicate.
- Marketing no longer runs a render effect that advances lead status from a phone match.

## Workshop and communication facts

Booking status remains Workshop-owned. Confirmation, attendance/no-show, follow-up completion, and Admissions conversion remain separate fields/actions.

Opening a `wa.me` link records only `reminderPreparedAt` or `feedbackPreparedAt`. It does not write `reminder_sent`, `feedback_requested`, delivery, read, or response evidence. Legacy values remain readable during compatibility.

## No migration

This phase does not backfill existing bookings. Deterministic IDs and compatibility link fields remain readable; phone-only records stay visible as repair candidates.
