# Admissions Implementation Plan

## Phase 0 — Complete

Audit contracts, design system, permissions, risks, baseline build/type state, compatibility adapter, stable links, and feature flag. No behavior change.

## Phase 1 — Read-only admissions domain — Complete

- Add a pure admissions domain with legacy mapping, repair flags, stage metadata, due/aging selectors, and representative fixtures.
- Add 30–80 line `modules/admissions/AGENT_CONTEXT.md`.
- Prove that every legacy lead remains visible and no tenant-crossing input is accepted.
- No Firestore writes, rules, indexes, or provider integration.

## Phase 2 — Education UI workspace — Complete

- Add Admissions as a third Students preview mode beside Students and Families.
- Implement Today, Pipeline, and All cases using the read-only projection.
- Add the Family Journey Passport and mobile full-screen case experience.
- Preserve Marketing CRM and default/non-preview UI.

## Phase 3 — Structured activities and next actions — Complete

- Add admission activity/task contracts, application commands, transaction/version safeguards, Firestore rules and indexes.
- Add owner, due time, outcome, loss/dormancy reasons, and audit events.
- Enable call/note/follow-up commands one at a time.

The first completed slice is the internal note command. Call/follow-up/task mutations remain closed and must each receive their own command/rules proof.

## Phase 4 — Workshop connection — Complete

- Normalize stable case links across Workshops and Workshop Action Center.
- Remove React-effect writes and phone-only automatic stage changes after compatibility period.
- Add trial confirmation, attendance/no-show, and post-trial tasks.

Stable booking/case links now cover CRM booking, Workshops conversion, Workshop Action Center conversion, Admissions projection, and CRM profile reads. Workshop status and post-trial outcomes remain separate. Structured task writes remain closed for a future approved command slice.

## Phase 5 — Offer, Finance, and enrollment handoff — Complete

- Snapshot canonical planning/pricing without creating another pricing engine.
- Keep promise, proof, verification, and cleared payment separate.
- Retain originating case through enrollment and link only after successful creation.

Canonical Program-pack snapshots now travel with case-originated enrollments. Promise, proof, verification, check progress, cleared payment, and rejection remain separate facts, and enrollment/payment/lead links commit together.

## Phase 6 — WhatsApp-assisted operations — Complete

- Tenant templates, variable preview, consent, `wa.me` launch, explicit sent/not-sent/result logging, and legacy import compatibility.
- Never infer delivery/read without provider evidence.

The Education UI passport now includes the assistant. Atomic activity and durable consent rules are proven with Auth/Firestore emulators; UI workflows are proven in an isolated browser harness at desktop/mobile sizes. The legacy export importer remains notes-only; migration into the structured ledger is deferred to Phase 8, without inferring message delivery or sender identity.

## Phase 7 — Optional official provider

Add server-side secrets, approved templates, signed/idempotent webhooks, inbound routing, status, retry, and health only after provider/account approval.

Next safe work is provider readiness and account discovery. Do not provision/connect a business account or send messages without explicit authorization. If the optional provider is deferred, hardening and the still-closed scheduled-task command require their own scoped implementation.

## Phase 8 — Migration/reporting/hardening

Dry-run migration, exception queue, reconciliation, pagination, conversion and aging reports, observability, and rollback.

Every phase runs the production build, focused checks, responsive/accessibility QA when UI changes, updates memory, reports actual validation, and stops.
