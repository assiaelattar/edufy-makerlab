# Admissions Decisions

## ADM-019 — Reuse tenant Communications templates

- Status: accepted
- Decision: Admissions reads the existing organization Communications library and adds tenant-bound starter fallbacks. Missing source names/programs remain unresolved; the operator previews and edits the message.
- Consequence: no parallel template editor or fabricated personalization.

## ADM-020 — Consent is durable workflow state with immutable evidence

- Status: accepted
- Decision: only `consent_updated` can change the transactional `whatsappConsentState` snapshot. Every other WhatsApp activity must match persisted consent; launched/manual-sent require granted consent.
- Consequence: opt-out survives long histories and stale operators cannot overwrite consent through a message event. The immutable ledger preserves the consent-change actor and time.

## ADM-021 — Browser handoff and operator result remain separate

- Status: accepted
- Decision: the assistant reserves a blank browser tab, removes its opener, checks current consent, navigates to WhatsApp, and records the handoff. Sent/not-sent and parent response require explicit operator actions.
- Consequence: a blocked popup records no launch; a failed journal write after navigation is explained accurately. No delivery/read claim is accepted from the client.

## ADM-001 — Students owns the daily Admissions entry

- Status: accepted for implementation
- Decision: add Admissions beside Students and Families in the Education UI preview. Preserve Marketing → Leads until parity and approval.
- Reason: admissions belongs to the learner/family journey, while campaign/content creation remains Marketing.
- Rollback: disable the preview mode; no existing route is removed.

## ADM-002 — Separate lifecycle, next action, and outcome

- Status: accepted
- Decision: never model reminder, no answer, or WhatsApp as lifecycle stages.
- Consequence: Today can be derived from tasks without distorting pipeline reporting.

## ADM-003 — Read-only adapter before schema writes

- Status: accepted
- Decision: Phase 1 is a pure compatibility projection over existing leads/bookings/students/enrollments.
- Consequence: uncertain legacy records remain visible with repair flags; no bulk migration is required to preview the workflow.

## ADM-004 — Education UI is the protected visual authority

- Status: accepted
- Decision: use the existing preview gate, tokens, primitives, and scoped styles. No new global palette, typeface, dependency, or parallel component system.
- Rollback: the current default UI remains unchanged.

## ADM-005 — Honest WhatsApp and Finance states

- Status: accepted
- Decision: `wa.me` means launched, not delivered. A promise/proof is not a cleared payment. Provider/Finance evidence controls stronger states.

## ADM-006 — Stable IDs outrank phone matching

- Status: accepted
- Decision: phone is candidate evidence only. Later phases must persist case links across booking and enrollment.
- Reason: siblings commonly share parent contact details.

## ADM-007 — Deterministic CRM booking IDs are stable evidence

- Status: accepted
- Decision: accept the existing exact `crm_<slot>_<lead>` booking ID as a stable link, alongside explicit case/lead IDs.
- Reason: this ID is created transactionally from both source records and does not depend on family phone matching.

## ADM-008 — Compatibility next actions are suggestions

- Status: accepted
- Decision: Phase 1 next actions use `compatibility_default`, have no owner or due date, and never claim message delivery or completion.
- Consequence: the preview remains useful without inventing workflow truth that the legacy CRM never stored.

## ADM-009 — Today means active follow-up until tasks exist

- Status: accepted
- Decision: Phase 2 Today includes non-terminal cases and orders them deterministically by journey context and recorded activity. It never labels a case due or overdue.
- Reason: the legacy CRM has no structured owner or due date, so an SLA claim would be fabricated.
- Consequence: Phase 3 can replace compatibility triage with real tasks without changing lifecycle stages.

## ADM-010 — Immutable activity ledger plus versioned coordination state

- Status: accepted
- Decision: store each approved activity as an immutable command-ID document and advance a separate case-state version in the same transaction.
- Reason: the ledger preserves who did what while optimistic locking prevents two operators from silently overwriting workflow coordination.

## ADM-011 — Internal note is the first and only Phase 3 write

- Status: accepted
- Decision: the first command records `kind=note`, `channel=internal`, and `outcome=null`; it cannot change stage, task, delivery, payment, enrollment, loss, or dormancy state.
- Consequence: typed call, follow-up, outcome, and task contracts remain closed until separate application and rule slices are proven.

## ADM-012 — Authorization must agree in application code and Firestore rules

- Status: accepted
- Decision: an active same-tenant super admin, owner, admin, or Admission Officer with `admissions.note` must pass the application gate; Firestore independently verifies authenticated role, tenant, actor, lead, reciprocal transaction data, and version.
- Consequence: UI visibility and client-supplied permissions never become the security boundary; custom roles remain closed for this command.

## ADM-013 — Workshop links are explicit and tenant-bound

- Status: accepted
- Decision: a booking links to an Admissions case through `admissionCaseId`, the compatible `crmLeadId`/`leadId`, or the exact deterministic CRM booking ID, always within one organization.
- Consequence: equal phone numbers are repair candidates only and can never merge or advance a case.

## ADM-014 — Workshop conversion persists the relationship both ways

- Status: accepted
- Decision: CRM booking creation and both Workshop conversion surfaces write `admissionCaseId` and `crmLeadId` onto the booking in the same transaction/batch as their existing business update.
- Consequence: new records no longer depend on later phone matching or a background React effect.

## ADM-015 — WhatsApp launch records preparation, not delivery

- Status: accepted
- Decision: opening a prepared workshop reminder or feedback message records `reminderPreparedAt` or `feedbackPreparedAt` while leaving booking status unchanged.
- Consequence: legacy `reminder_sent`/`feedback_requested` values remain readable, but new client-only actions do not claim send, delivery, read, or response state.

## ADM-016 — Program packs remain pricing authority

- Status: accepted
- Decision: an Admissions offer snapshot references the canonical Program, pack, selected plan, and configured pack price fields. The existing guided-enrollment standard-price policy is centralized in a Program utility, not reimplemented in Admissions.
- Consequence: Admissions preserves historical offer context but cannot become a second price catalog or quotation calculator.

## ADM-017 — Financial facts are independent

- Status: accepted
- Decision: promise, proof received, awaiting verification, check in progress, cleared payment, and rejection are reported independently. Only Finance-owned `paid` or `verified` ledger statuses contribute to cleared amount.
- Consequence: proof upload, payment method, WhatsApp activity, or parent intent can never clear a balance.

## ADM-018 — Conversion links commit with enrollment

- Status: accepted
- Decision: enrollment, initial payment records, new-student origin links, and lead conversion links share one batch. The source case is resolved by explicit same-tenant ID and never by phone.
- Consequence: the case is marked converted only after successful enrollment persistence; generic enrollment remains unlinked.
