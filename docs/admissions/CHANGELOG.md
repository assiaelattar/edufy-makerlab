# Admissions Changelog

## 2026-09-09 — Phase 6 WhatsApp-assisted operations

- Added a scoped Education UI passport assistant for consent, tenant template preview, message preparation, WhatsApp handoff, manual sent/not-sent confirmation and parent outcomes.
- Reused the Communications template library and the existing phone-formatting policy; missing contact/program facts stay unresolved.
- Added the approved WhatsApp activity command, immutable ledger writes, version checks, idempotency and a durable consent snapshot. Opt-out is checked against persisted state, independently of the recent history window.
- Added active-account, role, tenant and reciprocal transaction rules; optimized repeated rule expressions after the emulator exposed a limit failure.
- Corrected popup handling to detach a blank window before navigation and report logging failures after a successful handoff accurately.
- Added keyboard focus handling, labelled inputs, mobile layout and retry loading. Finance reminder labels now explicitly describe opening WhatsApp.
- All ten Admissions smoke/contract suites pass, along with focused TypeScript, isolated browser workflows/desktop/mobile QA and the Auth/Firestore emulator suite including direct client allow/deny cases.
- Preserved legacy CRM export notes, Workshop preparation semantics, Program/Finance/enrollment ownership and existing data. No provider connection, message send, production write, migration or release was performed.

## 2026-09-09 — Phase 5 offer, Finance, and enrollment handoff

- Added a canonical Program-pack pricing utility that preserves the existing guided-enrollment standard-price behavior without creating an Admissions price catalog.
- Added immutable offer snapshots with tenant/case/source IDs, canonical program and pack references, payment term, price catalog, agreed amount, discount, currency, and quote time.
- Added a pure Finance fact summary that keeps promises, transfer proof, pending verification, check progress, cleared money, and rejection independent; only `paid`/`verified` clear money.
- Preserved lead and stable Workshop case origins through enrollment prefill; generic enrollment and modal close clear the origin, and no phone lookup can recover it.
- Batched enrollment, initial payment documents, new-student origin fields, and source-lead conversion links so the case changes to `converted` only with successful enrollment persistence.
- Kept public enrollment as lead creation and retained Finance-owned transfer/check verification behavior.
- Passed 28 offer/Finance safeguards, 13 enrollment-integration safeguards, 11 Workshop-link scenarios, 22 projection scenarios, focused TypeScript, and the production build with 4,408 modules transformed.
- Preserved rules, indexes, dependencies, provider configuration, existing records, and production state. No migration, deployment, or release was performed.

## 2026-09-09 — Phase 4 stable Workshop connection

- Added one canonical Workshop/Admissions link policy shared by the read projection, CRM Lead Profile, Workshops, and Workshop Action Center.
- Extended the canonical `Booking` contract with `admissionCaseId`, compatible lead IDs, operational timestamps, and follow-up fields already persisted by Workshop surfaces.
- CRM-created bookings now persist both `admissionCaseId` and `crmLeadId`; deterministic `crm_<slot>_<lead>` IDs remain accepted as stable historical evidence.
- Both Workshop conversion paths now resolve only stable same-tenant links, persist both link fields, stop on conflicting/missing links, and block phone-only automatic merges.
- Removed the Marketing React effect that changed a lead to `workshop_booked` from a matching phone number.
- CRM Lead Profile now lists and de-duplicates bookings by stable link instead of parent phone.
- WhatsApp reminder/feedback launches now record only `reminderPreparedAt`/`feedbackPreparedAt`; new actions no longer claim sent or requested status without evidence.
- Passed 22 projection scenarios, 11 workshop-link scenarios, 11 integration safeguards, 16 note-command scenarios, focused Admissions TypeScript, and the production build with 4,406 modules transformed.
- Preserved public unlinked booking, Workshop status ownership, Marketing CRM, Finance, enrollment, existing data, rules, indexes, dependencies, and production state. No migration, deployment, or release was performed.

## 2026-09-09 — Phase 3 structured activity foundation

- Added canonical activity, next-action task, interaction outcome, dormancy/loss reason, actor, audit, and optimistic-version contracts without changing legacy leads.
- Added the first narrowly scoped command, `recordAdmissionNote`: internal immutable note only, 1–2,000 normalized characters, explicit tenant/case/lead/actor, safe IDs, expected version, and deterministic replay fingerprint.
- Added in-memory and Firebase transaction stores. The Firebase transaction creates the activity and advances workflow case state atomically; stale versions and reused command IDs with different content fail safely.
- Added strict tenant-scoped Firestore rules for workflow state and activities, kept all task writes closed, and added the three composite indexes needed by future state/activity/task queries.
- Assigned `admissions.view` and `admissions.note` to the default Admission Officer role while preserving independent server-side role and tenant enforcement.
- Passed 22 projection scenarios, 16 note-command scenarios, 14 rules/index safeguards, and 8 Auth + Firestore emulator allow/deny scenarios.
- Focused Admissions TypeScript and `npm.cmd run build` pass; 4,405 modules transformed. Existing Firebase import and large-chunk warnings remain unrelated.
- No UI write, lifecycle mutation, WhatsApp/provider action, message-delivery claim, payment/enrollment action, migration, dependency, production data change, deployment, or release was made.

## 2026-09-08 — Phase 2 read-only operations workspace

- Added Today, Pipeline, and All cases as keyboard-accessible Admissions views inside the existing Education UI preview.
- Defined Today as active non-terminal follow-up and explicitly avoided due/overdue language while legacy tasks have no due dates.
- Added a deterministic Today selector, with enrolled and legacy-closed cases excluded and 22 total adapter/selector smoke scenarios passing.
- Added a wrapping seven-stage pipeline that keeps zero-count states visible without horizontal drag.
- Added full-inventory stage and repair filters; All cases opens with every one of the 51 tenant-projected leads searchable.
- Preserved the 58/42 desktop desk, sticky Family Journey Passport, fixed narrow-screen passport, stable-versus-phone evidence, and repair explanations.
- Authenticated QA confirmed Today 50, Pipeline 40/2/8/0/0/0/1, All cases 51/51, search empty/reset, zero horizontal overflow, and Escape dismissal of the narrow passport.
- Default Students and Marketing CRM stayed unchanged. No CRM write, message, payment, enrollment, rule, index, schema, dependency, or production data change was made.
- Focused Admissions TypeScript, the 22-scenario smoke harness, and `npm.cmd run build` pass. Existing Firebase import, large-chunk, Tailwind CDN, and snapshot-permission diagnostics remain unrelated.

## 2026-09-08 — Phase 1 canonical projection

- Added typed, Firebase-independent Admissions stages, evidence summaries, repair flags, compatibility next actions, and projection counts.
- Added stable evidence precedence: active enrollment, completed workshop, booked workshop, then conservative legacy status mapping.
- Kept cross-tenant evidence out and surfaced phone-only workshop/student matches as repair candidates rather than identity.
- Added deterministic fixtures plus a no-dependency smoke harness covering 19 status, precedence, missing-data, tenant, phone, deterministic-booking, projection, search, stage-count, and aging scenarios.
- Added Admissions beside Students and Families only inside `?ui=education-v1`.
- Added the read-only compatibility worklist and Family Journey Passport with a mobile full-screen panel.
- Authenticated QA projected all 51 tenant leads, with 46 visible repair cases. Desktop and narrow mobile had zero document overflow; search empty/restoration and passport open/close passed.
- Firestore writes, rules, indexes, schemas, dependencies, production data, and the default interface remained unchanged.

## 2026-09-08 — Phase 0 audit and design foundation

- Created repository runtime context and durable Admissions documentation.
- Mapped lead producers, consumers, status writers, permissions, rules, indexes, Workshop/Finance/enrollment boundaries, and legacy risks.
- Recorded the read-only compatibility adapter and stable-link strategy.
- Grounded the module in the development-only Education UI preview and defined the Family Journey Passport design direction.
- Ran the production build successfully.
- Ran the repository-wide TypeScript check and recorded existing failures; no failures were introduced because no application code changed.
- Firestore rules, indexes, schemas, routes, dependencies, production data, and application behavior were unchanged.
