# Atlas ERP Action Plan

Last updated: 2026-07-19

## Objective

Turn Edufy Core into the dependable operating system used to run MakerLab Academy today, then harden it into a multi-tenant SaaS product. The immediate focus is the daily academy loop: students and families, admissions, programs, classes, attendance, and finance.

This plan measures working capability, not screen count. A module graduates only when a school operator can complete the core job simply, safely, and without leaving the module to repair missing context.

## Module Graduation Standard

Each module moves through four levels:

1. **Visible**: routes and screens exist.
2. **Usable**: the main workflow works with clear empty, loading, error, and confirmation states.
3. **Operational**: records connect across modules, permissions are enforced, repair queues exist, and reporting is trustworthy.
4. **SaaS-ready**: tenant isolation, plan limits, audit events, server-side privileged actions, automated tests, and production monitoring are in place.

No module is considered complete because it looks polished. UI quality and operational depth are both release gates.

## Execution Order

### 1. Students and Family Records

Outcome: one trustworthy identity and household directory for every academy workflow.

- [x] Command-style student and parent directory.
- [x] Active enrollment and parent balance context.
- [ ] Unified data-health model for missing contact, incomplete profile, enrollment, placement, and duplicate risk.
- [ ] One-click repair queue filters with clear record-level issue labels.
- [ ] Household and guardian entities with relationships, preferred contact, authorized pickup, and billing responsibility.
- [ ] Duplicate review workflow with preview, safe merge, undo window, and audit event.
- [ ] Import preview with validation, tenant checks, duplicate detection, and row-level errors.
- [ ] Pagination or virtualization for large directories.
- [ ] Move student and parent account provisioning to a privileged backend function.

Graduation gate: staff can find, create, repair, enroll, contact, and understand a student or family from one coherent workflow without unsafe client-side identity operations.

### 2. Admissions and Enrollment Hub

Outcome: every inquiry moves through one visible pipeline from lead to active learner.

- [ ] Consolidate public forms, leads, enrollment review, placement, pricing, consent, and account activation.
- [ ] Add stages, owner, next action, aging, source, and loss reason.
- [ ] Create enrollment from an approved application without duplicate student records.
- [ ] Add document and consent checklist with status and expiry.
- [ ] Reserve program/group capacity during placement.
- [ ] Generate run-specific mobile registration pages with fast and extended form modes.
- [ ] Generate purpose-specific QR links with campaign attribution, expiry, and waitlist behavior.
- [ ] Add server-side public submission validation, duplicate review, consent, and anti-spam protection.
- [ ] Add conversion and aging reports by program and source.

Graduation gate: an operator can process a new family end to end and the resulting student, enrollment, schedule, and finance records agree.

### 3. Programs, Classes, Schedule, and Attendance

Outcome: turn program definitions into conflict-free daily delivery.

Foundation status (2026-07-19): the adaptive run/group/schedule/occurrence/pricing/enrollment/document contracts now exist. Legacy MakerLab programs translate into a Program Plan, while the guided setup wizard now stores run dates, multi-block timetables, registration preferences, and document choices inside the compatible program record. Dedicated operational collections, enrollment routing, and occurrence-based attendance remain gated work.

- [ ] Separate program catalog, cohort/group, class occurrence, room, and instructor concepts.
- [ ] Add dated Program Runs so camps, repeated weeks, bootcamp intakes, and school terms share one structure.
- [ ] Separate roster groups from recurring/explicit schedule blocks and generate dated class occurrences.
- [ ] Add format presets for weekly academy, camp, bootcamp, one-day workshop, workshop series, school term, and custom.
- [x] Add fixed-run, rolling-membership, and modular enrollment timing policies with learner-specific service dates.
- [x] Add protected delete/archive, single-program duplication, and batch academic-year rollover without enrollments.
- [ ] Add capacity, waitlist, room, instructor, and schedule conflict checks.
- [ ] Support recurring class generation, exceptions, holidays, rescheduling, and makeup sessions.
- [ ] Separate pricing offers, included weeks/occurrences, add-ons, and discount rules from program scheduling.
- [ ] Provide a fast daily attendance roster with late, absent, excused, and makeup states.
- [ ] Record attendance against the actual workshop/class occurrence, not only the program or group.
- [ ] Connect attendance to family communication and student history.
- [ ] Add class completion and instructor handoff notes.
- [ ] Add branded registration confirmations, enrollment/attendance attestations, and completion certificates.
- [ ] Add document numbering, evidence snapshots, bulk issue review, revocation, and public QR verification.

Graduation gate: a coordinator can plan the term and an instructor can run today without spreadsheets or duplicate entry.

### 4. Finance Phase 2

Outcome: make every family balance understandable and every payment traceable.

- [x] Simplified finance home and payment recording flow.
- [x] Family ledger context and receipt generation.
- [ ] Invoice and installment schedule entities independent of enrollment totals.
- [ ] Allocate payments to invoices/installments with partial payment support.
- [ ] Discounts, scholarships, refunds, credits, write-offs, and reversals with permissions.
- [ ] Cash-session close, reconciliation, and discrepancy workflow.
- [ ] Aging, collections queue, promised payment follow-up, and family statement history.
- [ ] Immutable finance audit trail and exportable period reports.

Graduation gate: an owner can explain any balance, reconcile the day, and trace every change without manual reconstruction.

### 5. CRM and Communications

Outcome: give staff one shared relationship history and actionable follow-up queue.

- [ ] Unified family timeline across leads, messages, payments, attendance, and notes.
- [ ] Assigned conversations, templates, consent, delivery status, and retry handling.
- [ ] Operational triggers for absence, overdue balance, schedule change, and enrollment follow-up.
- [ ] Provider adapters for email, SMS, and WhatsApp with tenant-level configuration.

Graduation gate: staff know who needs a response, why, and what happened previously.

### 6. Reports and Command Center

Outcome: make the academy's operating health visible and actionable.

- [ ] Role-based task queue for owner, coordinator, finance, and instructor.
- [ ] Trusted KPIs with definitions, drill-downs, date ranges, and exports.
- [ ] Enrollment, retention, attendance, revenue, collection, capacity, and instructor views.
- [ ] Data-quality and integration-health reports.

Graduation gate: every headline number is traceable to records and every alert opens the relevant work queue.

### 7. SaaS Control Plane

Outcome: safely operate many education organizations from one platform.

- [ ] Server-side tenant and owner provisioning.
- [ ] Enforce plan entitlements and limits in backend/rules, not only navigation.
- [ ] Tenant branding, module configuration, billing state, and suspension behavior.
- [x] Tenant-scoped settings control center with branding, operational defaults, plan/app visibility, documents, enrollment fields, data portability, integration vault, and team access.
- [x] Organization-scoped role overrides merged with platform role defaults.
- [ ] Immutable audit log for sensitive writes and impersonation.
- [ ] Firestore index manifest, rules tests, backup/restore runbook, monitoring, and incident logging.

Graduation gate: a tenant can be provisioned, upgraded, limited, suspended, restored, and audited without direct database repair.

### 8. Automation and AI

Outcome: assist operators after the source-of-truth workflows are reliable.

- [ ] Controlled automation center with trigger, condition, action, approval, run history, and retry.
- [ ] Read-only operational copilot grounded in tenant-scoped records.
- [ ] Draft communications and summaries requiring human approval.
- [ ] MCP/agent tools with explicit permissions, write modes, rate limits, and audit events.

Graduation gate: automations are observable and reversible, and no agent can bypass tenant or role boundaries.

## Current Delivery Slice

**Students and Family Records: Directory Health v1**

- [x] Add deterministic, read-only issue detection for active students.
- [x] Show contact, profile, enrollment, placement, and duplicate candidate counts.
- [x] Let operators filter directly from the health panel.
- [x] Show the same issue language on desktop and mobile student rows.
- [x] Preserve all existing search, enrollment, archive, selection, and parent-ledger workflows.
- [ ] Build and visually verify desktop and mobile with representative tenant data.
- [x] Record follow-up risks in `ATLAS_BUILD_CONTEXT.md`.

Excluded from this slice: automatic merging, destructive cleanup, new authentication accounts, and schema migrations.

**Enrollment Experience v2**

- [x] Replace the dense three-form modal with a calm four-step learner, class, fees, and review route.
- [x] Make Quick enroll find an existing learner first; make Add student explicitly create a new learner.
- [x] Include parent name, phone, email, birth date, and school in new-learner enrollment.
- [x] Show only enrollment-ready programs and expose class capacity before placement.
- [x] Block duplicate enrollment in the same class and warn before a second enrollment in the same program.
- [x] Stop treating siblings who share one family phone as duplicate students.
- [x] Make first payment and payment schedule optional progressive disclosures.
- [x] Keep cash-cleared balance separate from checks and transfers awaiting verification.
- [x] Add a final review that connects the learner, class, fee agreement, payment today, and Finance balance.
- [x] Preserve prefilled entry from student profiles, class groups, leads, and workshop prospects.
- [x] Production build and changed-slice TypeScript checks pass.
- [ ] Complete authenticated desktop and mobile visual QA; the available local browser session was signed out.

Still excluded: automatic account provisioning migration, invoice generation, and destructive enrollment merging.

## Cross-Cutting Release Gates

Every capability slice must pass these checks:

- Tenant: every record read and write is scoped by `organizationId`.
- Permission: sensitive actions have role/permission checks in UI and backend/rules.
- Safety: destructive and financial actions are confirmed, auditable, and recoverable where possible.
- UX: the primary job is obvious, compact, responsive, keyboard reachable, and does not require training.
- States: loading, empty, error, success, and disabled behavior are deliberate.
- Connections: downstream records update or expose an explicit repair state.
- Scale: list views have a path to pagination/virtualization and avoid repeated full scans on render.
- Verification: production build passes; focused workflow QA is recorded; automated coverage grows with risk.

## Multi-Agent Working Rules

- The lead agent owns shared models, routing, integration, verification, and final review.
- Worker agents receive narrow, disjoint file scopes and cannot rewrite shared architecture.
- One agent owns one module slice at a time; cross-module contracts remain lead-owned.
- Automatic merging, schema migration, rules changes, auth, and finance writes are never delegated as low-risk work.
- Every worker result is reviewed before integration, followed by a full build and focused workflow QA.

## Known Production Risks

- Privileged student/parent user creation still runs from the client.
- Household identity is inferred from phone numbers; there is no guardian/household entity yet.
- Plan/module limits are represented but not comprehensively enforced server-side.
- Firestore rules lack automated test coverage and several production queries need declared indexes.
- No general automated application test suite exists yet.
- Finance totals are useful operational summaries but are not yet a complete invoice-ledger model.
