# Admissions Phase 0 Audit

Date: 2026-09-08

## Outcome

Edufy already contains the critical pieces of the family journey, but the current CRM combines lifecycle, communication outcome, and next action in one legacy status. The safest implementation is an Education UI preview inside Students, backed first by a pure compatibility adapter over `Lead`, `Booking`, `Student`, and `Enrollment`. New normalized writes come only after the read model and regression surface are proven.

No production behavior, Firestore rule, index, route, or schema changed in Phase 0.

## Current source contracts

- `types/index.ts`: `Lead` owns identity, source, seven legacy statuses, intake fields, optional notes/tags/interests, and an embedded timeline.
- `types/index.ts`: `Booking` owns workshop slot/template, parent/learner contact, attendance/conversion status, notes, and program interest.
- `context/AppContext.tsx`: streams every tenant lead and booking into the global client context without pagination.
- `App.tsx`: `handleEnrollLead` prefills the existing guided enrollment form, but does not retain the originating lead ID. Successful enrollment therefore cannot reliably mark or link the lead as converted.
- `firestore.rules`: signed-in elevated roles can manage tenant leads; public lead creation is allowlisted, requires a valid program, and forces status `new` plus server time.
- `firestore.indexes.json`: no lead/admissions composite indexes exist yet.

## Lead producers and writers

| Producer/writer | Current behavior | Compatibility concern |
|---|---|---|
| `views/MarketingView.tsx` | manual create; free stage move; WhatsApp invitation; React effect auto-moves matching phone bookings | UI requires `marketing.create`; link launch is not delivery; phone match can connect siblings; effect performs writes |
| `views/PublicEnrollmentView.tsx` | creates `Kiosk Form` lead in `new` with program, pack, schedule, and payment preference | intake preference is not accepted offer, payment, or enrollment |
| `views/marketing/GrowthWizardModal.tsx` | creates up to 450 `Internal Upsell` leads from enrolled students | these are retention/upsell opportunities, not always new-family admissions |
| `views/WorkshopsView.tsx` | pushes booking into lead, merging by normalized phone; marks booking converted | does not consistently persist a stable CRM lead link; shared phone risk |
| `views/dashboard/WorkshopActionCenter.tsx` | similar workshop conversion, but also writes `crmLeadId` and follow-up fields to booking | fields are missing from the current `Booking` type; behavior differs from Workshops |
| `views/marketing/LeadProfileModal.tsx` | transactionally books a deterministic `crm_<slot>_<lead>` booking and updates lead to `workshop_booked`; adds notes/calls | call outcomes force broad statuses; no due date, owner, or explicit next action |
| `views/marketing/ChatImporterModal.tsx` | parses up to 200 exported WhatsApp messages and appends them as `note` timeline events | messages are unstructured; direction, outcome, delivery truth, and stable dedupe ID are absent |
| `views/ProgramDetailsView.tsx` | closes or permanently deletes waiting-list leads | `closed` lacks loss/dormant reason; permanent deletion removes history |

## Lead consumers

- `MarketingView`: table/Kanban, counts, duplicate guard, profile, deletion.
- `DashboardView`: new/stale lead alerts, kiosk pending enrollment alerts, trend, and conversion rate. The current conversion rate counts both `converted` and `closed`, so it is not a trustworthy sales conversion KPI.
- `ProgramsView` and `ProgramDetailsView`: open demand and waiting-list records by program/interest.
- Enrollment Forms and `App.tsx`: prefill enrollment from a lead.
- Workshops and Workshop Action Center: create/update CRM records from workshop families.
- Settings/export/migration tooling: includes the `leads` collection.

## Status and activity risks

- Legacy stages: `new`, `contacted`, `interested`, `workshop_booked`, `demo_booked`, `converted`, `closed`.
- `contacted` can mean follow-up later or no answer.
- `interested` can mean workshop, pricing, or decision interest.
- `closed` can mean lost, dormant, or removed from a waiting list.
- Timeline is an unbounded array; it cannot support scalable paging, assignment, reliable queries, or provider delivery states.
- UI code can freely move between all legacy statuses; transition validation is absent.

## Permission findings

- Default `admission_officer` has Students, enrollment, Finance recording, Workshops, and Programs permissions, but no `marketing.view` or `marketing.create`.
- The current CRM write UI checks `marketing.create`, so the role best suited to admissions cannot operate it.
- Firestore tenant helpers authorize broad elevated roles rather than domain-specific admissions permissions. UI permission checks are therefore not sufficient security boundaries.
- Phase 1 may use a deliberate compatibility read permission. New writes must wait for explicit admissions permissions and rules tests.

## Education UI protected layer

- Preview gate: development only at `?ui=education-v1`.
- Root scope: `.edu-v1` plus `education-ui-v1-active`; new module styles must be locally scoped.
- Canonical primitives: `EducationSurface`, `EducationButton`, `EducationKicker`, `EducationSectionHeader`, and `EducationProgress`.
- Canonical tokens: canvas `#eef0ed`, paper `#ffffff`, ink `#111111`, Volt `#c8ff3d`, warm/orange, lilac, semantic success/danger/info, DM Sans/Inter, JetBrains Mono for operational metadata.
- Students preview is a focused operations desk in `views/students/EducationStudentsOperationsV1.tsx`; Admissions should become a sibling mode inside this experience, not a new top-level visual language.
- Do not add global tokens, dependencies, or theme-specific React branches. Prefer a scoped `education-admissions-v1.css` file.

## Compatibility adapter specification

Create a pure `adaptLeadToAdmissionCase` in Phase 1. Inputs: one lead and tenant-filtered linked bookings/students/enrollments. Output: a read-only admission projection plus repair flags.

Precedence:

1. Linked active enrollment and learner ID → `enrolled`.
2. Linked attended workshop booking → `trial_completed` unless enrollment exists.
3. Linked confirmed/reminder-sent workshop booking → `trial_booked`.
4. Otherwise map legacy lead status conservatively.
5. Never infer payment, offer acceptance, delivery, or loss reason from free text.

Provisional mapping:

- `new` → `new_inquiry`.
- `contacted` → `qualifying` plus `missing_next_action` when no structured task exists.
- `interested` → `trial_to_plan` with `ambiguous_interest` unless linked evidence proves a later state.
- `workshop_booked` / `demo_booked` → `trial_booked` only when a booking exists; otherwise `missing_booking_link`.
- `converted` → `enrolled` only with stable student/enrollment evidence; otherwise `conversion_unverified`.
- `closed` → visible `legacy_closed` repair state; do not guess lost or dormant.

The adapter is deterministic, tenant-safe, has no Firestore writes, and preserves unknown records in an exception queue.

## Stable-link strategy

- Add optional `admissionCaseId`/`crmLeadId` links consistently to bookings in a later write phase.
- Retain deterministic CRM-created booking IDs.
- Store originating lead/case ID through enrollment modal state, then link only after the enrollment write succeeds.
- Phone normalization remains search/duplicate-candidate evidence, never identity.
- Public forms retain program IDs; no price/payment/enrollment truth is inferred from preferences.

## Feature flag and rollout

- Phase 1/2 UI exists only when `import.meta.env.DEV` and `ui=education-v1`, following the current preview pattern.
- The default interface and Marketing CRM remain untouched.
- The first Admissions surface is read-only and derives all facts in memory.
- Enable writes one command at a time after rules, indexes, permission mapping, and tests exist.
- Preserve Marketing → Leads until the Students Admissions workflow is approved and parity is demonstrated.

## Baseline validation

- `npm.cmd run build`: passed on 2026-09-08; 4,398 modules transformed.
- Existing warnings: Firebase dynamic/static import overlap and main App chunk above 1,000 kB.
- `npx.cmd tsc --noEmit --pretty false`: failed on existing repository-wide diagnostics across Maker Pro, SparkQuest, and older ERP files. Relevant existing diagnostics include Firestore possibly undefined in `MarketingView.tsx` and `GrowthWizardModal.tsx`, and `String.replaceAll` target support in `PublicEnrollmentView.tsx`.
- No automated application or Firestore rules test script is present in `package.json`.
- No browser QA or data mutation was performed in Phase 0.

## Phase 1 readiness gate

Phase 1 may begin only with a read-only domain module, representative fixtures, adapter/selector tests using the available test approach or a minimal no-dependency harness, and an Education UI preview entry. No Firestore schema/rules/index changes and no CRM write replacement are allowed in Phase 1.
