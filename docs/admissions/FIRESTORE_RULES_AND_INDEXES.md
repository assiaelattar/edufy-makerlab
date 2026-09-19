# Admissions Firestore Rules and Indexes

## Rule boundary

Phase 3 introduces three top-level tenant-scoped collections:

- `admission_case_states`: active approved operators can read; create/update only through an approved note or WhatsApp transaction; delete denied.
- `admission_activities`: active approved operators can read; strict internal-note and WhatsApp shapes can be created; update/delete denied.
- `admission_tasks`: approved operators can read; every write denied until a task command receives its own approval.

The activity and case state use reciprocal `getAfter` checks. This requires them to be committed atomically and ensures organization, case, legacy lead, command ID, occurrence time, and next version agree. The linked legacy lead must exist in the same tenant. A consent update controls the durable consent snapshot; other WhatsApp events must match the persisted consent. Admissions uses a direct role/tenant check to stay within the Firestore expression budget.

Initial transactions may read a nonexistent activity/state document. Rules allow this missing-document read only to an approved Admissions operator; existing documents still require same-tenant evidence.

## Indexes

- `admission_case_states`: `organizationId ASC`, `updatedAt DESC`.
- `admission_activities`: `organizationId ASC`, `admissionCaseId ASC`, `occurredAt DESC`.
- `admission_tasks`: `organizationId ASC`, `status ASC`, `dueAt ASC`.

The task index is prepared before writes open so a future real Today queue can query owned/due work without an invented client-side SLA.

## Verification

- `admissionRules.contract.smoke.ts` checks the committed rule/index structure without external tooling.
- `admissionRules.emulator.ts` is an Auth + Firestore emulator suite using existing Firebase client/admin dependencies. It proves note creation/replay, all six WhatsApp states and a valid direct client batch; denies activity mutation, state deletion, task creation, Instructor/disabled-account writes, cross-tenant access, fabricated delivery/actor/consent, and opt-out bypass. It also proves that persisted consent survives a history window of 30 activities.
- Run with Firebase CLI: `firebase emulators:exec --only auth,firestore --project demo-edufy-admissions "node --experimental-strip-types modules/admissions/infrastructure/admissionRules.emulator.ts"`.

The suite passed locally on 2026-09-09 using a temporary portable Java runtime: 8 allow/deny scenarios covered authorized creation and replay, immutable activity/state protections, closed task writes, Instructor denial, and cross-tenant denial. No Admissions UI write control or production release was added in this phase.
