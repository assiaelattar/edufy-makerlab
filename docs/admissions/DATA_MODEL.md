# Admissions Structured Workflow Model

Phase 3 adds workflow truth beside the legacy read projection. It does not migrate or rewrite `leads`.

## Collections

### `admission_case_states/{admissionCaseId}`

One transactional coordination record per projected case.

| Field | Meaning |
|---|---|
| `organizationId` | immutable tenant boundary |
| `admissionCaseId` | immutable stable case ID; currently the legacy lead ID |
| `legacyLeadId` | immutable explicit source link; never inferred from phone |
| `version` | integer optimistic-lock version, starting at 1 |
| `openNextActionId` | structured task link or `null`; notes cannot change it |
| `lastActivityAt` / `lastActivityKind` | latest accepted workflow activity |
| `lastCommandId` | idempotency/audit link to the atomic activity |
| `createdAt/By`, `updatedAt/By` | server time and authenticated actor |

### `admission_activities/{commandId}`

Immutable activity ledger. The command ID is the document ID, making replays deterministic.

The first enabled shape is `kind=note`, `channel=internal`, `outcome=null`. Phase 6 also enables `kind=follow_up`, `channel=whatsapp` through its own validated command/rules branch. Call and task mutations remain closed.

WhatsApp activities carry `communicationState` (consent_updated, prepared, launched, operator_confirmed_sent, operator_confirmed_not_sent, parent_response_recorded), `consentState` (unknown, granted, opted_out), and `templateId`. Only a parent-response event carries an interaction outcome. Each activity retains its immutable body, actor and command fingerprint.

Case state additionally stores optional `whatsappConsentState`; absence means unknown. Only an atomic consent activity may change it. Notes and other WhatsApp events preserve it. This snapshot prevents history pagination from discarding consent and lets rules reject forged or outdated consent assertions.

### `admission_tasks/{taskId}`

Reserved structured next-action model with owner, due time, status, outcome, dormancy/loss reason, version, and audit actor. Reads are scoped to admissions operators; all writes remain denied in this slice.

## Invariants

- Lifecycle stage, activity, next action, and outcome are separate facts.
- Every write carries the tenant, case, legacy lead, actor, and case version.
- A command replay with the same ID and fingerprint returns the original result without another write.
- Reusing a command ID with different content fails with `IDEMPOTENCY_CONFLICT`.
- A stale expected version fails with `STALE_VERSION`.
- Activity creation and case-state version advancement occur in one Firestore transaction.
- Activities are immutable; case state and tasks cannot be deleted.
- Phone matches are never accepted as identity evidence.
- Notes cannot claim contact, delivery, payment, enrollment, task completion, loss, or dormancy.

## First command

`recordAdmissionNote` accepts 1–2,000 trimmed characters and an optional valid occurrence time no more than five minutes in the future. It creates one internal immutable note and advances only the workflow coordination version. No UI write control is exposed in Phase 3.
