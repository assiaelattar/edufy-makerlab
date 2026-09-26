# Atlas Build Context

Last updated: 2026-09-19

This is the living build context for Atlas, the SaaS evolution of Edufy MakerLab. Before each work loop, read this file first. After each work loop, update it with what changed, what was tested, what remains risky, and the next best module.

## Working Loop

Every implementation loop should follow this rhythm:

1. Read `ATLAS_BUILD_CONTEXT.md`.
2. Pick one module or one cross-cutting foundation.
3. Inspect the current code and rules before changing anything.
4. Think through the product behavior, tenant safety, UI quality, and user flow.
5. Build a focused improvement.
6. Run verification, at minimum `npm.cmd run build`.
7. Update this file with completed work, open issues, and next step.
8. Continue the loop.

The goal is not random redesign. The goal is a high-end SaaS platform that feels coherent, reliable, and premium across every module.

## Atlas Loop Agent

Use `ATLAS_LOOP_AGENT.md` as the loop protocol and `npm run atlas:next` as the local helper command.

Trigger phrases:

- "continue"
- "next step"
- "continue the work"
- "move to the next module"
- "what is next"
- "run the loop"

When one of these appears, the assistant must read this file, follow the loop, build/test, then update this file again.

Connected files:

- `ATLAS_BUILD_CONTEXT.md`
- `ATLAS_LOOP_AGENT.md`
- `ATLAS_SAAS_ARCHITECTURE.md`
- `actionplan.md`
- `scripts/atlas-loop-agent.js`

## Product Vision

Atlas is a multi-tenant SaaS platform for education organizations. It combines operations, learning, finance, CRM, communication, marketplace apps, and AI/agent workflows into one controlled operating system.

Edufy Core is the operational source of truth. SparkQuest and Maker Pro are learning apps connected to Edufy Core. Marketplace apps extend Atlas for specialized education workflows.

The product should feel:

- Premium and serious enough for academy owners and operators.
- Fast and dense enough for daily staff operations.
- Friendly and age-appropriate in student and parent surfaces.
- Safe enough for multi-tenant SaaS.
- Agent-ready through controlled MCP-compatible tools.

## Product Architecture

```txt
Atlas SaaS Platform
  Edufy Core
    ERP / ORT / SAR operations
    Student and parent management
    Enrollment and programs
    Finance and expenses
    Attendance and pickup
    CRM, workshops, marketing
    Staff and internal team ops
    Marketplace
    App Bridge
    Agent / MCP Gateway

  SparkQuest
    LMS for kids and teens, ages 6-17
    Gamified projects, badges, portfolio, review flow

  Maker Pro
    LMS for adults, 18+
    Bootcamps, AI workshops, professional cohorts, certificates

  Marketplace Apps
    Education-specific add-ons and solutions

  Agent / MCP Gateway
    Controlled tools for ChatGPT, Codex, Claude, Azure agents, and future assistants
```

## Core Principles

- Edufy Core owns tenant data and operational truth.
- SparkQuest and Maker Pro must communicate through shared tenant-aware patterns.
- Every business record must carry `organizationId`.
- Every read/write must respect organization, role, permission, and installed app access.
- Public entry points must be narrow and validated.
- Agent/MCP access must never bypass tenant isolation or role permissions.
- UI must be high-end, accessible, responsive, and consistent.
- Avoid fragile Tailwind dynamic class strings like `bg-${color}-500` unless safelisted or mapped.
- Avoid browser `alert()` / `confirm()` in app surfaces; use app modals.

## Current Foundation Status

### Architecture and SaaS Model

- [x] Added `ATLAS_SAAS_ARCHITECTURE.md`.
- [x] Added Atlas product types in `types/index.ts`.
- [x] Added `utils/tenant.ts` helpers.
- [x] Expanded module registry with app, product area, audience, dependencies, plan metadata.
- [x] Expanded app registry with marketplace metadata and agent tool declarations.
- [x] Added `super_admin` and `owner` role concepts.
- [x] Added tenant-aware Firestore rules.
- [ ] Add full SaaS onboarding flow: create organization, owner, subscription, initial modules.
- [ ] Add tenant settings surface for modules, apps, plan, limits, and branding.
- [ ] Add audit logs for sensitive actions.
- [ ] Add server-side functions for privileged account creation and tenant provisioning.

### Security and Rules

- [x] Reworked `firestore.rules` around tenant ownership.
- [x] Added strict tenant helpers: read/create/update/delete tenant doc checks.
- [x] Added public lead and workshop booking validators.
- [x] Added linked parent/student pickup create/update rules.
- [x] Patched major app writes to include `organizationId`.
- [ ] Firebase rules deploy still needs authenticated Firebase CLI.
- [ ] Emulator validation blocked locally because Java is not installed/on PATH.
- [ ] Add automated Firestore rules tests.
- [ ] Review SparkQuest kiosk/public flows against strict rules.

### High-End UI Foundation

- [x] Added global `index.css` Atlas foundation.
- [x] Added shared Atlas marketing/app visual tokens and grid field utility.
- [x] Added shared Atlas command header, signal card, and empty state primitives.
- [x] Updated `index.html` metadata to Atlas by Edufy.
- [x] Removed mobile zoom lock from viewport metadata.
- [x] Rebuilt Admin shell with premium SaaS layout, tenant context, module search, grouped navigation, better mobile menu, and focus/touch polish.
- [x] Upgraded Dashboard command header and key operational metrics.
- [x] Retuned landing/signup/login bridge toward the same ink, teal, amber, cream, and grid visual system.
- [x] Build shared design primitives for command headers, signals, buttons, empty states, toolbars, sections, and workspace tabs.
- [ ] Normalize modal surfaces and forms.
- [ ] Add skeleton/loading states and error states.
- [ ] Complete authenticated visual QA with representative tenant data.

## Module Status

### 1. Admin Shell and Navigation

Status: In progress, improved.

Done:
- Premium Atlas sidebar and top bar.
- Tenant workspace context.
- Module search.
- Marketplace and operator sections.
- Better mobile menu.
- Removed fragile dynamic sidebar color classes.

Left:
- Add keyboard shortcut palette.
- Add tenant switcher for platform admins.
- Add breadcrumbs/deep links per detail page.

Done in the latest rollout:
- Persistent tenant-scoped workspace tabs.
- Pointer and keyboard drag-to-reorder.
- Closable tabs with active-route recovery.
- Collapsible desktop navigation rail.
- Persistent compact/comfortable density.

### 2. Dashboard

Status: Improved.

Done:
- Added command dashboard header.
- Added ops health, data quality, open alerts, tenant-scoped indicators.
- Removed fragile dynamic alert color classes.
- Build passes.

Left:
- Refactor dashboard into smaller components.
- Improve Workshop Action Center styling.
- Add charts with accessible colors and tooltips.
- Add personalized operator task queue.
- Add tenant plan/module health summary.

### 3. Students and Parent Accounts

Status: Improved.

Done:
- Upgraded Students directory into command-style surface.
- Added KPIs: active students, new this month, enrolled count, parent data health.
- Added a deterministic, read-only directory-health model for contact, profile, enrollment, placement, and duplicate-candidate gaps.
- Added a compact repair-queue panel with one-click filters and shared desktop/mobile issue language.
- Separated operational readiness from optional profile enrichment so the academy health score remains actionable.
- Added parent ledger summary.
- Added mobile parent-account view.
- Fixed active enrollment display to show active enrollments only.
- Replaced bulk parent linking browser alert with app modal alert.
- Improved parent statement currency formatting.
- Student Profile: replaced production-risk dynamic badge classes.
- Student Profile: replaced several browser alerts with app modal alerts.
- Student Profile: fixed a hook rule issue where `useAppContext()` was called inside an event handler.

Left:
- Full visual redesign of `StudentDetailsView` admin header and tabs.
- Replace remaining custom confirm modal inside Student Profile with shared `ConfirmContext`.
- Move secondary Firebase user creation to a safe backend function.
- Add guided record repair and duplicate review workflows; current directory health is diagnostic only.
- Introduce first-class household and guardian entities instead of inferring families from phone numbers.
- Add pagination/virtualization for large student lists.
- Add import preview, validation, and duplicate review before writes.

### 4. Programs and Enrollment Forms

Status: Improved.

Done:
- Upgraded Programs header into an Atlas command surface with active, kids, adults, groups, pricing pack, and lead signals.
- Removed duplicate QR modal rendering in `ProgramsView`.
- Replaced Programs image upload browser alerts with app modal alerts.
- Replaced Programs, Program Details, and Enrollment Forms copy-link browser alerts with inline copied feedback.
- Removed dynamic Tailwind class risks from `ProgramsView`, `ProgramDetailsView`, and `PublicEnrollmentView`.
- Improved public enrollment with stable theme maps, inline submission error, loading state, and clearer SparkQuest kids vs Maker Pro adults framing.
- Improved Enrollment Forms header and cards to better match the Atlas admin surface.
- Verified public enrollment leads still carry `organizationId` from the selected program.
- Build passes.

Left:
- Deeper program creation/editing form redesign.
- Backend-backed public enrollment validation and anti-spam protection.
- Stronger completion next-step messaging by program type.
- More polished empty states for no active programs, no packs, and no slots.
- Visual browser QA when screenshot tooling is available.

### 5. Finance

Status: Functional, not yet high-end.

Done:
- Tenant-aware payment writes already mostly present.

Left:
- Premium finance command view.
- Better parent/family payment workflow.
- Revenue vs expense reporting.
- Payment verification queue.
- Check lifecycle UX.
- Receipt/share UX cleanup.
- Replace browser alerts.
- Add audit trail for payment edits/deletes.

### 6. Expenses

Status: Atlas command surface complete; workflow depth remains.

Done:
- Recurring expense command view.
- Operational signal rail, compact period controls, and guided empty states.
- Shared app confirmations and feedback.

Left:
- Approval/verification flow.
- Better monthly close process.
- Finance dashboard integration.

### 7. Attendance and Schedule

Status: Atlas UI pass complete; rules and export review remain.

Done:
- Daily student attendance and staff absence views use Atlas headers, signals, toolbars, guided empty states, and shared confirmations.
- Unmarked learners remain explicitly unmarked instead of being silently counted as present.

Left:
- Verify rules compatibility for attendance/staff attendance writes.
- Premium class session surface.
- Better absence risk workflow.
- Monthly export.
- Parent/student visibility rules.

### 8. Workshops

Status: Tenant-patched with upgraded Atlas public and operator sharing surfaces.

Done:
- Workshop booking/CRM push patched with `organizationId`.
- Workshop quality build bug fixed.
- Public booking retuned to the paper/ink/teal/amber system with responsive fields and inline submission recovery.
- Fixed recurring workshop generation to preserve local calendar dates instead of shifting selected weekdays through UTC.
- Added Monday-first full weekday controls, shared schedule labels, and explicit weekday names on public session cards and booking confirmation.
- Rebuilt workshop template cards and the parent booking journey with social-image previews, clearer capacity, responsive session tickets, and focused two-step booking.
- Added prewritten WhatsApp invitations and `/w/{slug}` Open Graph share pages with custom or branded fallback images for both Vercel and Hostinger routing.

Left:
- Deeper calendar and booking-history polish.
- Better slot capacity and waitlist logic.
- Better workshop-to-lead conversion workflow.
- Replace browser alerts.
- Firestore rule tests for public booking.

### 9. Marketing and CRM

Status: Partially tenant-patched.

Done:
- Top-level marketing writes patched with `organizationId`.
- Growth wizard and lead profile booking patched.

Left:
- Premium CRM pipeline UI.
- Lead detail redesign.
- Campaign wizard polish.
- WhatsApp template system.
- AI content workflow.
- Replace browser alerts.
- Tenant-safe public invite links.

### 10. Communications

Status: Tenant-patched.

Done:
- Announcements include `organizationId`.
- Announcement query filters by organization.

Left:
- Premium communication center.
- Audience segmentation UX.
- Delivery history.
- WhatsApp/email provider abstraction.
- Replace browser alerts.

### 11. Pickup

Status: Tenant-patched.

Done:
- Admin pickup queue writes include `organizationId`.
- Parent pickup writes include `organizationId`.
- Rules allow linked parent/student pickup create/update.

Left:
- Premium pickup display mode.
- Better parent mobile flow.
- Staff release/confirmation safety.
- Audit log for pickup lifecycle.

### 12. Team and Staff Operations

Status: Tenant-patched.

Done:
- Tasks, projects, messages include `organizationId`.

Left:
- Premium internal ops UI.
- Staff attendance workflow polish.
- Role-based task assignment.
- Notifications and reminders.

### 13. Toolkit, Archive, Media

Status: Tenant-patched.

Done:
- Toolkit assets/tools include `organizationId`.
- Gallery items include `organizationId`.
- Gallery rules are tenant-readable.
- Toolkit, Archive, and Media now share Atlas command headers, compact actions, native confirmation flows, and guided empty states.

Left:
- Replace orphan gallery repair with admin/server migration.
- Fix dynamic badge/color classes in portfolio/media surfaces.
- Premium resource library.
- Better media upload/storage strategy.

### 14. SparkQuest

Status: Connected but needs bridge hardening.

Done:
- Learning module writes patched with `organizationId`.
- Learning templates, badges, stations, workflows, student projects now tenant-aware.

Left:
- Build formal Edufy App Bridge.
- Review SparkQuest direct Firestore access against tenant rules.
- Fix dynamic Tailwind classes in `LearningView`.
- Premium kids UI pass where appropriate.
- Project review queue polish.
- Badge/XP economy.
- Kiosk/session auth strategy.

### 15. Maker Pro

Status: Conceptual/in repo, not fully productized.

Left:
- Define adult participant model distinct from children where needed.
- Bootcamp/cohort module.
- Professional certificate/resume output.
- Adult LMS surface.
- Maker Pro tenant app install behavior.
- Agent tools for cohorts, attendance, certificates, progress.

### 16. Marketplace

Status: Registry foundation started.

Done:
- App registry supports metadata, audience, required permissions, plans, dependencies, agent tools.
- App Store, app details, installed tools, document design, face attendance, paper scanner, social poster, and story generator use the Atlas module contract.

Left:
- Install/uninstall flow with permission checks.
- App detail pages.
- Plan gating.
- Tenant module toggles.
- Marketplace admin publishing model.

### 17. Agent / MCP Gateway

Status: Architecture planned.

Done:
- Architecture doc lists gateway and tool groups.
- App registry has `agentTools` metadata.

Left:
- Design gateway API.
- Build tool permission resolver.
- Add audit log for agent reads/writes.
- Define read-only default mode.
- Add explicit write confirmation flow.
- Connect hosted MCP pattern to Atlas/Edufy.
- Implement tools for students, enrollments, finance, attendance, CRM, workshops, SparkQuest, Maker Pro, marketplace.

## Known Cross-Cutting Risks

- Firebase CLI deploy/rules validation blocked until login on the laptop.
- Java missing/on PATH blocks local Firestore emulator validation.
- Large bundle warnings remain.
- Browser-native dialogs are now concentrated in a small set of marketing child modals and `TestWizardView`; parent and learning surfaces are being normalized in the active rollout.
- Some modules still contain dynamic Tailwind class strings.
- Some account creation flows happen client-side and should move to backend functions.
- SparkQuest and Maker Pro may still access Firestore directly in places that need App Bridge protection.
- No automated test suite yet.
- Public runtime visual/error checks are available; authenticated tenant visual regression coverage is still needed.

## Verification Log

- 2026-09-26: Reframed SparkQuest mission details as a learner-facing STEM engineering journey rather than a project record. The project thumbnail and problem now lead the page; Ask → Imagine → Build → Test → Share establishes the method before materials, resources, guided construction and proof. The shared mission contract still powers instructor authoring, hierarchical assignment, project snapshots and evidence work. Scoped TypeScript, mission smoke suites, SparkQuest production build, desktop/mobile browser QA and the root production build are the release gates; no Firebase rule/index/API or production-data change is included.

- 2026-09-09: Promoted the authenticated Education UI from development preview to the production default, retaining `?ui=atlas-legacy` as a non-persistent rollback. Diagnosed the live old/blank UI as the legacy cache-first `stemflow-erp-v2` service worker serving stale HTML that referenced a deleted asset; the current worker clears old caches, takes control immediately, and the registration bypasses HTTP cache. Added direct history editing for active invoices with preserved numbering, revision conflict protection, same-year dates, credited-document locks, edit preview, and desktop/mobile QA. Focused TypeScript, service smoke, real Auth/Firestore emulator, browser workflow and production build pass.

- 2026-09-05: Rebranded the compact public workshop booking flow around MakerLab Academy rather than the Edufy application shell. The supplied red-and-black MakerLab wordmark is used directly, while the page now follows the public website's cool-mist, paper, deep-navy, and orange action system plus its `Design · Code · Build` signature. Production build and read-only browser QA passed at 390px and 1440px; the date chooser and form still fit within 390x844 with zero horizontal overflow and no booking submission.
- 2026-09-05: Simplified the public workshop booking journey into a single-viewport mobile flow: six compact weekday/date tickets with progressive disclosure, a concise selected-session summary, paired child/age inputs, and collapsed optional notes. Production build and read-only browser QA passed at 390px and 1440px with zero horizontal overflow; both the date chooser and details form fit within the 390x844 viewport, and no booking was submitted.
- 2026-09-05: Follow-up Open Graph verification found that an existing workshop used a Google Drive sharing-page URL, which social crawlers received as HTML instead of an image. Workshop image URLs now normalize supported Drive links to direct image responses, and copied/WhatsApp links include a content-derived preview version so stale pre-deployment cards are not reused. The production build passed; crawler and live deployment checks remain part of the release gate.
- 2026-09-05: `npm.cmd run build` passed after the workshop recurrence, parent booking, WhatsApp sharing, and Open Graph rollout. A live read-only Monday/Thursday template rendered 17 upcoming sessions using only those weekdays at desktop and 390px mobile, with zero mobile horizontal overflow. The Vercel Open Graph handler returned the live title, image, Monday/Thursday schedule, canonical `/w/` URL, and booking redirect; the Hostinger PHP route was added but could not be syntax-checked locally because PHP is not installed.
- 2026-09-03: `npm.cmd run build` passed after separating reusable on-demand company programs from dated runs and separating the billed company from an optional beneficiary company on finance documents. Local demo QA confirmed that selecting Company defaults to On demand, reduces the wizard from six to four steps, and removes Dates and Groups; no program or invoice was saved.
- 2026-09-03: `npm.cmd run build` passed after extending company-aware finance with configurable billing units (hour, workshop, half-day, day, package, participant, group), duration/session metadata, planned/delivered/manual calculation modes, and invoice line snapshots. The full TypeScript workspace still reports the pre-existing maker-pro and SparkQuest diagnostics; no diagnostics matched the new finance or program billing files.
- 2026-09-03: `npm.cmd run build` passed after adding company-aware invoicing, annual transaction-safe sequences, linked credit notes, durable invoice history, and configurable accounting exports. A focused invoice-plus-credit test generated six balanced journal entries; desktop and 390px mobile UI review passed without writing finance data.
- 2026-09-01: `npm.cmd run build` passed after converting the public enrollment page into a four-step mobile-first flow, restoring the MakerLab public logo fallback, replacing card with bank transfer, adding copyable CIH RIB details, and adding a printable pending pre-enrollment receipt. Browser QA passed at 375px portrait, 812px landscape, and 1440px desktop with no horizontal overflow; the copy action returned the exact 24-digit RIB. Final submission was not triggered during QA to avoid creating a production lead.
- 2026-09-01: `npm.cmd run build` passed after aligning public enrollment lead fields with Firestore rules, adding accurate offline/permission error messages, removing stale app-shell caching, forcing dark mode before first paint, replacing the legacy MakerLab PWA identity with Atlas, and splitting the public form from the full admin bundle. The public route rendered against the live StemQuest program in production-preview mode. Firebase rules deployment and Hostinger release remain pending.
- 2026-09-01: `npm.cmd run build` passed after replacing Hostinger-incompatible `/enroll` kiosk links with root query URLs and retaining legacy route compatibility. Live HTTP checks confirmed the old deep link returns 404 while the root query URL returns the Atlas app shell.
- 2026-07-20: `npm.cmd run build` passed after adding the reusable MakerLab Summer Camp template, session/week/shift/age-band enrollment routing, public QR registration choices, and year-safe duplication. The MakerLab 2026 draft was seeded idempotently without enrollments.
- 2026-07-18: `npm.cmd run build` passed after landing/login visual coherence pass and Finance command header work. Existing warnings remain: large chunks and Firebase dynamic/static import mix.
- 2026-07-18: `npm.cmd run build` passed after extracting Atlas surface primitives and wiring Finance/Students headers to them. Existing warnings remain: large chunks and Firebase dynamic/static import mix.
- 2026-07-18: `npm.cmd run build` passed after applying Atlas command primitives to Programs and Workshops. Existing warnings remain: large chunks and Firebase dynamic/static import mix.
- 2026-07-18: `npm.cmd run build` passed after applying Atlas command primitives to Marketing and Communications. Existing warnings remain: large chunks and Firebase dynamic/static import mix.
- 2026-07-18: `npm.cmd run build` passed after draggable workspace tabs, density controls, collapsible navigation, Public Booking, Core Academic, Student Detail, and Installed Apps rollout. Existing warnings remain: large chunks and Firebase dynamic/static import mix.
- 2026-07-18: `npm.cmd run build` passed after Finance/Expenses modal cleanup. Existing warnings remain: large chunks and Firebase dynamic/static import mix.
- 2026-07-17: `npm.cmd run build` passed after tenant rules and app write patches.
- 2026-07-17: Firebase rules dry-run blocked by missing Firebase CLI authentication.
- 2026-07-17: `npm.cmd run build` passed after Admin shell, Dashboard, Students, and Student Profile changes.
- 2026-07-17: `npm.cmd run atlas:next` verified the Atlas Loop Agent summary and next-module checklist.
- 2026-07-17: Pre-build system check passed. `npm.cmd run build` is green; Programs/Enrollment scan confirmed remaining dynamic Tailwind classes, browser alerts, and public enrollment polish work.
- 2026-07-17: `npm.cmd run build` passed after Programs and Enrollment Forms improvements. Targeted scan found no dynamic Tailwind or browser alert issues in `ProgramsView`, `ProgramDetailsView`, `PublicEnrollmentView`, or `EnrollmentFormsView`.

## Latest Completed Work

### 2026-09-01 - Parent Pre-Enrollment And Transfer Flow

- Replaced the long public enrollment form with a calm four-step learner, program, payment, and review sequence with explicit progress, Back navigation, focused step headings, mobile-sized inputs, and accurate inline recovery.
- Restored the MakerLab Academy logo as the public enrollment fallback without changing the authenticated Atlas product identity.
- Replaced the obsolete card preference with cash, check, and bank transfer choices.
- Added copyable CIH Bank transfer details for MakerLab Academy and verified that Copy RIB returns `230780282542321100290015` without spaces.
- Added a bilingual pending pre-enrollment receipt available after a successful request through the browser's print/save-as-PDF flow. The receipt includes the request reference, learner, program, pack, schedule, payment preference, estimated fee, transfer details when relevant, and a clear statement that it is not proof of payment or confirmed enrollment.
- Kept payment confirmation honest: cash and check require on-site receipt/validation, while bank transfers require academy verification. The public form still creates a lead only and does not record a payment.
- `npm.cmd run build` passes. Mobile portrait, mobile landscape, and desktop browser QA report no horizontal overflow. No production lead was created during QA.

### 2026-09-01 - Public Enrollment Reliability And Dark-First Startup

- Fixed the public enrollment contract mismatch that caused Firebase to reject structured grade, group, camp session, shift, and module selections while the UI incorrectly reported a connection problem.
- Added field-aware Firestore validation while keeping older public lead payloads compatible.
- Added accurate submission recovery messages for real offline, interrupted, permission, and invalid-data failures; inputs are trimmed before write.
- Removed the service worker's cache-first app-shell strategy, cleared legacy caches on activation, and forced worker update checks so normal refreshes receive the current build.
- Split public enrollment from the full authenticated application entry, reducing the public form's initial compressed JavaScript from roughly 960 KB to roughly 290 KB.
- Forced the authenticated workspace to dark mode before React paints and removed the unfinished theme toggle.
- Replaced the legacy MakerLab installed-app manifest and M icon with Atlas identity, and shortened the boot-screen exit delay.
- `npm.cmd run build` passes. Production-preview QA loaded the live StemQuest form with the dark root theme and without runtime form errors. Firebase rules deployment and Hostinger release remain pending.

### 2026-09-01 - Hostinger-Safe Public Enrollment Links

- Centralized public enrollment link generation around `/?mode=enroll&program=...`, which loads reliably through Hostinger's static root route.
- Updated Programs, Program Details, Enrollment Forms, copied links, kiosk actions, and QR codes to use the shared URL builder.
- Added query-mode routing while preserving `/enroll` compatibility for environments that already provide SPA rewrites.
- Confirmed the reported production deep link returns HTTP 404 and the replacement root query URL returns HTTP 200.
- `npm.cmd run build` passes. Existing Firebase dynamic/static import and large bundle warnings remain.

### 2026-07-20 - Structured Summer Camp Template

- Added a reusable MakerLab Summer Camp template with four two-week sessions, two shifts, two age bands, and one-week or full-session pricing.
- Mapped each selectable camp week to its own capacity and attendance group while preserving the current enrollment model.
- Added guided camp choices to staff enrollment and the public QR registration form.
- Added year-safe duplication for camp session and week dates without copying enrollments.
- Seeded `MakerLab Summer Camp 2026` as a draft for the `makerlab-academy` organization.

### 2026-07-17 - SaaS Tenant Foundation

- Added Atlas architecture plan.
- Added tenant-aware types and helpers.
- Expanded module and app registries.
- Rebuilt Firestore rules around tenant isolation.
- Patched major writes to include `organizationId`.
- Patched public enrollment and workshop booking flows.

### 2026-07-17 - Premium Shell and Dashboard

- Added global Atlas CSS foundation.
- Updated app metadata and font stack.
- Rebuilt Admin layout.
- Upgraded Dashboard command surface.
- Removed fragile dynamic Tailwind classes in dashboard alert rendering.

### 2026-07-17 - Students and Student Profile

- Upgraded Students directory command surface.
- Added parent ledger and data health KPIs.
- Added mobile parent-account list.
- Fixed active enrollment display.
- Replaced selected browser alerts with app modals.
- Removed dynamic badge classes in Student Profile.
- Fixed hook usage inside student access generation.

### 2026-07-17 - Atlas Loop Agent

- Added `ATLAS_LOOP_AGENT.md`.
- Added `scripts/atlas-loop-agent.js`.
- Added `npm run atlas:next`.
- Connected the agent protocol to this living build context.

### 2026-07-17 - Pre-Build System Check

- Verified the loop agent still points to Programs and Enrollment Forms.
- Verified the production build passes before starting the next module.
- Confirmed current known warnings are bundle-size and Firebase dynamic/static import warnings.
- Confirmed the next module still needs dynamic Tailwind cleanup and alert/modal cleanup.

### 2026-07-17 - Programs and Enrollment Forms

- Upgraded the Programs admin header with SaaS catalog metrics.
- Cleaned production-risk dynamic Tailwind class patterns in program and public enrollment views.
- Removed duplicate QR modal behavior.
- Added inline copied feedback for enrollment links.
- Added app modal alerts for program upload failures.
- Improved public enrollment for SparkQuest kids vs Maker Pro adults.
- Added inline public form submission errors and loading protection.
- Upgraded Enrollment Forms header and active-program cards.

### 2026-07-18 - Finance and Expenses Safety Pass

- Replaced the Finance balance recalculation browser confirm with the shared app confirmation modal.
- Replaced Expenses browser alerts/confirms with shared app alerts and confirmations.
- Added error feedback for recurring expense payment, expense save, template save/delete, expense delete, and receipt upload failures.
- Replaced Student Finance receipt-sharing browser alerts with shared app warning modals.
- Verified targeted scan finds no native `alert()` or `confirm()` usage in `FinanceView`, `ExpensesView`, or `student-details/FinanceTab`.
- `npm.cmd run build` passes.

### 2026-07-18 - UI Coherence Pass

- Added shared Atlas CSS tokens for ink, teal, amber, cream, paper, and grid surfaces.
- Added shared `AtlasCommandHeader`, `AtlasSignalCard`, and `AtlasEmptyState` primitives.
- Aligned the landing page shell, fixed header, hero grid, and primary calls to action with the Atlas SaaS app palette.
- Retuned login/signup and parent/admin access screens from blue/indigo portal styling to the Atlas ink/teal/amber system.
- Removed mismatched abstract blur background treatment from login/signup and replaced it with the shared Atlas app shell/grid.
- Reduced oversized custom card rounding in login/signup toward the app's tighter SaaS geometry.
- Added a Finance Command header and operator signal strip for verification queue, check exposure, collection risk, and family balance watchlist.
- Refactored Finance and Students command headers to use the shared Atlas header primitive.
- Refactored Programs and Workshops onto `AtlasCommandHeader` and `AtlasSignalCard` for consistent module entry surfaces.
- Replaced Workshops native copy/delete/CRM browser dialogs with shared app modal alerts and confirmations.
- Refactored Marketing and Communications onto `AtlasCommandHeader` and `AtlasSignalCard`.
- Replaced Marketing native approval/delete/rejection dialogs with shared app modal feedback and confirmations.
- Replaced Communications native prompt/alert/confirm flows with app modal validation, confirmations, and success/error feedback.
- Refactored Calendar, Pickup, and Team onto the shared Atlas command header and operational signal rail.
- Fixed escaped Calendar template interpolations that prevented today, event, instructor, and assignment states from rendering correctly.
- Replaced Calendar sync/assignment and Pickup/Team destructive browser dialogs with shared app feedback and confirmations.
- Tightened Calendar, Pickup, and Team controls, empty states, active tabs, and primary actions around the Atlas teal/amber/ink system.
- Fixed the landing header’s unsupported translucent background class so the Edufy wordmark and demo action keep reliable contrast on mobile.
- Added `ATLAS_DESIGN_SYSTEM.md` with the Atlas service-desk visual, interaction, responsive, motion, and module contract.
- Added `ATLAS_MULTI_AGENT_ROLLOUT.md` with strict shared-file ownership, module assignments, acceptance gates, and staged merge order.
- Added persistent, tenant-scoped workspace tabs with pointer and keyboard drag-to-reorder, close behavior, and horizontal mobile scrolling.
- Added a collapsible desktop navigation rail and persistent comfortable/compact density controls.
- Expanded Atlas primitives with shared section headers, toolbars, and action buttons.
- Refactored Expenses onto the Atlas command header, operational signals, compact period controls, recurring obligation section, and guided empty state.
- Refactored Classes, Review, Instructor Dashboard, and Portfolio into compact academic service workspaces.
- Unified Student Detail and its Academics, Access, Attendance, Finance, and Portfolio tabs around a persistent identity and status layer.
- Refactored Toolkit, Archive, Media, Settings, SaaS Admin, App Store, Workshop Quality, Program Details, and Activity Details onto the Atlas module contract.
- Refactored Tools and the installed document, attendance, scanner, social, and story apps into responsive work surfaces with explicit capability states.
- Removed automatic browser notification-permission prompting and tenant-scoped the authenticated booking notification listener.
- Retuned Public Booking to the standalone Atlas public theme and replaced its native submission alert with inline recovery.
- `npm.cmd run build` passes.

### 2026-07-18 - Full Module Rollout

- Adapted Core Academic: Classes, Review, Instructor Dashboard, Portfolio, Program Details, Activity Details, and Workshop Quality.
- Unified Student Detail and every record tab around a persistent identity and status layer.
- Adapted Learning, Factory, Studio, Arcade, Commit Feed, project modals, and the standalone Project Wizard.
- Adapted Parent Dashboard, Parent Login, project evidence viewing, public enrollment, enrollment forms, and public booking.
- Adapted Settings, SaaS Admin, App Store, App Details, Tools, and all installed app workspaces.
- Adapted Media, Toolkit, Archive, student/staff attendance, Dashboard, and Workshop Action Center.
- Adapted the marketing workflow modals and removed the call-outcome browser prompt in favor of an in-app controlled flow.
- Aligned Admin, Instructor, Student, and Parent shells with the Atlas navigation and status language.
- Added accessible shared dialogs and notifications with Escape handling, focus restoration, keyboard-operable rows, and compact responsive layouts.
- Removed browser-native dialogs from the app source and routed feedback through `ConfirmContext` or inline states.
- Gated role and notification listeners on authenticated tenant context so public pages do not trigger permission or notification prompts.
- Public landing, booking, and enrollment states pass mobile overflow and console-error checks.
- Production build passes; existing Firebase import and large bundle warnings remain.

### 2026-07-19 - MakerLab Finance Operations Pass

- Reframed Finance as a daily collections workspace around open balances, transfer verification, check processing, and family follow-up.
- Replaced the oversized summary area with a compact metric strip and actionable payment exception queues.
- Added clear Collections, Payment Ledger, and Due & Reminders work modes with a sticky toolbar and compact filters.
- Defaulted Collections to unpaid accounts, sorted open balances by risk, expanded parent/contact search, and kept row actions visible.
- Added explicit payment lifecycle actions for transfer verification, check deposit, check clearance, and bounced-check review.
- Kept receipts unavailable until a payment is cleared and retained validated transaction editing for ledger reconciliation.
- Tenant-scoped reconciliation and session correction, gated both maintenance actions by settings permissions, and added discrepancy preview before writes.
- Separated command-center revenue from hidden ledger filters so headline collected revenue remains truthful.
- Verified the module against authenticated MakerLab Academy data at desktop and 390px mobile widths with no document-level horizontal overflow.
- Fixed shared command-header title wrapping and mobile MAD amount sizing.
- Production build passes. Browser QA still reports missing Firestore composite indexes for notification, booking, archive, message, and workshop evaluation listeners.

### 2026-07-19 - MakerLab Finance Workspace Simplification

- Replaced the duplicated Finance navigation with one persistent four-mode workspace: Collections, Payments, Due, and Reports.
- Removed the global KPI and queue wall so Finance opens directly into the daily Collections ledger with one primary action: Record payment.
- Scoped summaries and controls to their working mode: collection health stays with Collections, payment exceptions stay with Payments, and month review stays with Reports.
- Promoted Reports from an overlay into a real workspace with its own month and program controls, printable monthly detail, and keyboard-operable history rows.
- Prevented hidden audience and report-month state from changing totals or clearing filters in another workspace.
- Fixed the ledger toolbar's sticky containment and kept workspace changes at the current navigation position.
- Reworked Collections and Payments tables for phone widths by retaining the decisive identity, amount, balance, and action fields while progressively hiding secondary columns.
- Verified all four modes with authenticated MakerLab Academy records at 1536px and 390px widths; document width remains equal to viewport width.
- `npm.cmd run build` passes. Existing large-chunk and Firebase dynamic/static import warnings remain.

### 2026-07-19 - MakerLab Finance Assistant Redesign

- Replaced the ledger-first Finance entry screen with a task-first assistant that tells school staff what needs attention today.
- Added four plain-language, icon-led tasks: Record a payment, Families to collect from, Verify payments, and Payment history.
- Added a short next-steps queue that only surfaces late families, transfers awaiting verification, and checks awaiting processing.
- Moved reports, all-account review, and balance reconciliation under a permission-aware Reports and tools disclosure.
- Replaced the persistent four-workspace switcher with a clear Finance home return inside every focused workflow.
- Reset Finance scrolling whenever a task opens or returns home so users never land midway down a previous screen.
- Made family collection the default mental model, used children as the family identity when parent names are missing, and simplified financial labels to agreed fee, received, and remaining.
- Hid payment-history date, method, and status controls behind More filters while keeping active review filters visible.
- Rebuilt Record payment as progressive disclosure: Student or Family, target search, visible remaining balance, amount/date, icon-based method, contextual check or transfer details, then one final action.
- Hardened payment search against incomplete enrollment names found in live MakerLab records.
- Verified the assistant home at 1536px and 390px, confirmed two-column mobile task cards and zero document overflow, and exercised the preselected student payment flow without writing data.
- `npm.cmd run build` passes. Existing large-chunk and Firebase dynamic/static import warnings remain.

### 2026-07-19 - MakerLab Programs Operations Pass

- Replaced crowded program cards with a calm operational list showing current-session learners, groups, plans, demand, and one contextual next action.
- Reduced the overview to three truthful signals: running programs, current learners, and programs needing setup.
- Added a Needs Setup filter and sorted incomplete or high-demand programs first.
- Centralized program readiness so Programs, Enrollment Forms, Program Details, and public enrollment use the same positive-price and valid-schedule rules.
- Prevented archived or incomplete programs from accepting submissions through stale public enrollment links.
- Added optional group seat capacity with validation while preserving legacy groups as roster-only until a limit is configured.
- Rebuilt Program Details around one next-best-action banner, a five-step readiness checklist, group schedule and capacity status, roster placement, waiting families, finance, and sharing.
- Scoped program rosters and financials to the active tenant and academic session.
- Kept quote generation, QR enrollment, printing, and brochure access inside Sharing instead of crowding the program list.
- Fixed program open/close transitions so the module returns to the top instead of preserving a stale detail-page scroll position.
- Verified authenticated MakerLab data at desktop and 390px mobile widths with no document-level horizontal overflow or new React runtime warnings.
- Production build passes; existing Firebase import, bundle size, and missing composite-index warnings remain.

### 2026-07-19 - Atlas Light Theme Foundation

- Added a tenant-scoped light/dark preference that uses the system theme only on first visit and persists every explicit choice.
- Added accessible icon controls in the desktop top bar and a labeled theme action in the mobile navigation drawer.
- Converted the fixed shell and shared Atlas command headers, signals, toolbars, empty states, section headers, and actions to semantic theme tokens.
- Added a scoped compatibility bridge for existing ERP slate surfaces, tables, controls, row hovers, dividers, and finance status colors while modules migrate to semantic primitives.
- Marked Finance, Programs, Students, and Classes as core themed modules and removed Finance's forced dark browser control styling.
- Verified Finance in both themes at desktop and 390px mobile widths, including persisted preference and zero document overflow.
- Spot-checked Programs, Students, and Classes in authenticated light mode and corrected remaining translucent dark panels.
- Production build passes; the known bundle warnings and missing Firestore composite indexes remain.

### 2026-07-19 - Students Directory Health v1

- Replaced the single missing-parent warning with one deterministic directory-health model shared by summary counts, filters, and row badges.
- Added read-only queues for missing contact, profile enrichment, no active enrollment, missing class placement, and possible duplicate records.
- Kept duplicate detection conservative: exact normalized email, name plus birth date, or name plus parent phone within one organization; no records are merged automatically.
- Defined operational readiness from critical daily-work gaps while keeping parent name, birth date, and school enrichment visible as a separate queue.
- Verified against authenticated MakerLab Academy data: 140 active records, 132 ready for daily work, 5 missing contact phones, 2 without active enrollment, 1 missing group placement, and no exact duplicate groups detected.
- Exercised the Contact Details queue end to end: the count reported 5 and the filtered directory returned exactly 5 records plus the table header.
- `npm.cmd run build` passes. The changed Students slice has no TypeScript errors; the repository-wide typecheck still fails on pre-existing errors across Maker Pro, SparkQuest, and older ERP screens.
- Desktop visual QA passed with live data. Dedicated mobile viewport QA remains open for this slice.

### 2026-07-19 - Guided Enrollment Experience v2

- Replaced the old dense Student / Program / Payments modal with a four-step Learner / Class / Fees / Review route and a persistent enrollment summary.
- Made the generic Quick enroll entry existing-learner-first, while Add student and lead/prospect conversion explicitly open new-learner mode.
- Added existing learner search, the missing parent name/email inputs, required-field guidance from tenant settings, and inline recovery instead of alert-driven step validation.
- Limited class selection to enrollment-ready programs, flattened grade/group choices into understandable weekly class options, exposed live roster/capacity state, and disabled full groups.
- Added save-boundary protection for archived programs, full groups, duplicate class enrollments, second enrollments in the same program, invalid fees, overpayments, and oversized payment schedules.
- Corrected duplicate detection so a shared family phone does not classify siblings as the same learner; a match now requires email or name plus phone/birth date evidence.
- Made first payment and payment schedules optional progressive disclosures and added a final review before any write.
- Corrected Finance truth: only cash clears the enrollment balance immediately; checks and transfers remain visibly pending verification.
- Preserved prefilled enrollment from class groups, student details, leads, and workshop prospects.
- `npm.cmd run build` passes and the changed enrollment slice has no TypeScript errors. Existing bundle warnings and repository-wide legacy type errors remain.
- Authenticated desktop/mobile visual QA is still required because the available local browser session was signed out. No test enrollment was written.

### 2026-07-19 - Adaptive Programs Direction And Enrollment Focus Fix

- Added `ATLAS_PROGRAM_ARCHITECTURE.md` as the canonical direction for weekly academy programs, camps, repeated weeks, bootcamps, one-day workshops, workshop series, school terms, and custom center schedules.
- Defined the separation between Program, dated Program Run, roster Group, Schedule Block, generated Class Occurrence, Pricing Offer, Enrollment Agreement, and Enrollment Item.
- Reserved `academicPeriod`, `programRun`, and `classOccurrence` as separate concepts so the ambiguous legacy `session` label is not extended.
- Defined an autopilot setup route: Format, Dates, Groups and Timetable, Offer, Registration and Documents, Review and Publish.
- Added generated run-specific registration pages, fast/extended form modes, source-aware QR codes, capacity/waitlist behavior, consent, duplicate review, and anti-spam requirements to the roadmap.
- Added branded enrollment/attendance attestations, completion certificates, template versioning, evidence snapshots, numbering, revocation, bulk issue review, and minimal public QR verification.
- Defined attendance against dated Class Occurrences so daily camps, recurring classes, custom bootcamp shifts, reschedules, and makeup sessions share one reliable model.
- Added a compatibility-first migration strategy so existing MakerLab programs keep working while new entities are introduced.
- Fixed the shared `Modal` focus lifecycle that was stealing focus from controlled inputs on every rerender. Inline `onClose` callbacks no longer restart the modal effect, and existing autofocus targets are preserved.

### 2026-07-19 - Adaptive Programs Foundation Phase One

- Added tenant-scoped, Firebase-independent contracts for Program Runs, roster Groups, recurring and explicit Schedule Blocks, Class Occurrences, Pricing Offers, Discount Rules, multi-item Enrollment Agreements, registration pages, and issued documents.
- Added a pure compatibility adapter that translates every legacy MakerLab program into an in-memory run, groups, weekly schedule blocks, family offers, and upcoming dated class occurrences.
- Kept the adapter read-only: it creates no Firestore collections, migrations, attendance records, or enrollment writes.
- Added a Program Plan tab as the default Program Details workspace, with run dates, inferred format, delivery groups, family offers, the next six class dates, and plain-language readiness gaps.
- Added explicit safe-preview language so operators understand that current records remain untouched until the guided setup is reviewed and published.
- Mapped legacy annual, trimester, and one-time prices into separate offer previews while preserving promotional pricing behavior.
- `npm.cmd run build` passes, changed-file TypeScript checks pass, and diff checks pass. Existing bundle-size and Firebase import warnings remain.
- Authenticated visual QA remains open because the available local browser session is signed out.

### 2026-07-19 - Guided Program Setup Wizard

- Replaced the long all-at-once Program editor with a six-step setup route: Format, Dates, Groups, Offer, Join and Documents, and Review.
- Added icon-led presets for weekly academy, camp, bootcamp, one-day workshop, workshop series, school term, and custom programs.
- Added a persistent desktop program brief and compact mobile progress strip so operators always know what has been configured.
- Added run name, start/end dates, enrollment window, timezone, and location with academic-year defaults for new and legacy programs.
- Added level and group setup with capacity plus multiple weekday/time/shift blocks per group.
- Preserved compatibility by synchronizing every group's first schedule block to the legacy `day` and `time` fields used by Classes and Enrollment.
- Added progressive pricing for recurring and one-time formats, optional promotion pricing, payment terms, registration mode, waitlist, review, QR, and document choices.
- Added step-level validation, final plain-language review, non-mutating edit prefills, and a save-boundary cleanup that strips unsupported `undefined` values before Firestore writes.
- Updated the Program Operations adapter to prefer wizard run dates, format presets, locations, and every configured timetable block.
- `npm.cmd run build` passes and the changed Programs wizard slice has no TypeScript errors. Authenticated desktop/mobile interaction QA remains open because the local browser session is signed out.

### 2026-07-19 - Program Lifecycle And Enrollment Timing

- Added three independent enrollment policies: fixed run, rolling membership, and modular selection.
- Added the policy choice to Program Setup Dates with plain examples, rolling duration from 1 to 36 months, optional late joining, and a configurable modular part label.
- Added learner service start/end dates to enrollment records. Rolling memberships calculate their end date from the learner's actual join timestamp; fixed runs preserve shared Program Run boundaries.
- Added a draft lifecycle state so future programs can be prepared without opening enrollment or operational classes.
- Added one-click setup duplication that opens a source-linked draft in the Program wizard and never copies enrollments.
- Added a Prepare Next Year flow with target label/start/end, active-program selection, one atomic batch, duplicate-period protection, and explicit confirmation that learners, payments, attendance, and enrollments are excluded.
- Added protected deletion: programs without enrollment history may be permanently deleted by authorized roles; programs with history can only be archived.
- Added enrollment-policy labels to Program lists, details, Enrollment class selection, and Enrollment review.
- Added pure lifecycle utilities for academic-period calculation, date shifting, duplicate drafts, leap-safe month addition, and enrollment service periods.
- Production build passes and lifecycle smoke checks cover a 12-month StemQuest membership, leap-day clamping, and a source-linked future-year duplicate.

### 2026-07-19 - SaaS Settings Control Center

- Replaced the crowded horizontal settings tabs with a stable desktop settings rail and compact mobile section navigation.
- Added focused Workspace, Plan and Apps, Documents, Enrollment Form, Data, Integrations, Team and Access, and Platform Tools sections.
- Added tenant plan, status, limits, enabled apps, workspace identifiers, locale, currency, time zone, week start, and default work-hour visibility.
- Made workspace edits atomic: organization branding and tenant settings now save together with validation, dirty state, and accidental-close protection.
- Added organization-scoped JSON export and kept CSV learner import bound to the active tenant.
- Moved integration credentials out of general settings into an administrator-only organization integration document.
- Added organization IDs to created staff accounts and ownership checks before edits, password resets, and deletions.
- Moved role customizations into organization-scoped overrides and merged them with platform role defaults at authentication time.
- Tightened Firestore rules for organizations, settings, integration secrets, tenant users, and platform role definitions.
- Production build, focused TypeScript checks, and diff checks pass. Authenticated desktop and 390px mobile QA passed for Workspace, Plan and Apps, and Team and Access with no document-level horizontal overflow or test writes.

### 2026-09-01 - Program Roster Export And Waiting-List Controls

- Added always-visible CSV and Excel roster exports plus matching actions in the Program Roster tab.
- Exported active academic-year learner, parent, school, group, schedule, plan, placement, and period data with UTF-8 CSV and a filterable Excel worksheet.
- Added Remove and Delete actions to program waiting-list cards. Remove closes and preserves the CRM record; Delete permanently removes only the lead record after confirmation.
- Added tenant and role guards, pending states, and app-native success/error feedback.
- Verified both 30-row Make & Go exports and both waiting-list confirmation paths without changing production records.
- `npm.cmd run build` passes. The existing large App bundle warning remains.

### 2026-08-03 - Atlas Creative Studio Foundation

- Replaced the MakerLab-specific Social Poster entry with Atlas Creative Studio while preserving the installed-app ID for tenant compatibility.
- Added one shared creative engine with versioned Brand DNA stored per organization; MakerLab receives a realistic academy starter while other tenants begin from a neutral draft.
- Added identity, industry, voice, palette, visual direction, environments, people policy, signature details, exclusions, safety rules, and approved terminology to the tenant profile.
- Built a four-step production route for destination, message, visual source, and review across social posts, stories, website imagery, Google Business, and paid ads.
- Added an approved Gallery-photo path, a clean image download, and a browser-rendered branded layout export without requiring AI generation.
- Added module-scoped Sign in with ChatGPT for new-image generation. Connecting is separate from Edufy login and never starts a generation by itself.
- Added a secured creative endpoint that verifies Firebase identity, active organization membership, role permission, installed-app entitlement, and an approved server-loaded Brand DNA before reading ChatGPT credentials.
- Kept Firebase and ChatGPT credentials on separate request boundaries; no access token is logged or persisted by Atlas.
- Added a development-only demo workspace entry for local UI QA without changing production login behavior or promoting the demo user to platform super admin.
- Verified the complete guided route at desktop and 390px mobile widths, including message input stability, zero document overflow, Gallery empty state, Brand DNA approval guard, and ChatGPT connection fallback.
- Production build and diff checks pass. No image generation was executed and no OpenAI usage was consumed during QA.

### 2026-08-03 - Marketplace Add-On Approval Loop

- Made tenant add-on requests durable across refreshes and account switching instead of keeping the Requested state only in browser memory.
- Added organization identity to new request records while retaining compatibility with older request documents through their Firestore parent path.
- Added a dedicated Requests inbox to the Super Admin control plane with a prominent pending count, request context, approval, rejection, and recent decisions.
- Connected approval to the tenant subscription add-on grant so the capability becomes available in the tenant Marketplace immediately.
- Kept workspace activation as a separate tenant choice: after approval, an authorized tenant administrator or Super Admin can use Add to place the app in navigation.
- Connected direct grants from Tenant access management to matching pending requests so the founder cannot grant access while leaving a stale request behind.
- Production build, focused TypeScript checks, and diff checks pass. The live MakerLab request was not mutated during QA.

### 2026-08-18 - Edufy School-Day Visual Foundation

- Repositioned the customer-facing admin experience from a technical Atlas/SaaS command surface to a calm Edufy school-day workspace while preserving Atlas as the internal platform foundation.
- Made light the default for school workspaces without a saved preference and preserved every tenant-scoped explicit light or dark choice.
- Added shared semantic light/dark tokens for paper, navy, rows, borders, shadows, and mint, sky, peach, lilac, and sun school-category tones.
- Rebuilt the owner shell language around Today, School, Learning, Office, Team, Settings, More tools, open pages, and school workspace concepts.
- Reworked owner navigation, tenant identity, search, profile, top bar, workspace tabs, compact rail, mobile drawer, and theme controls against the same semantic theme system.
- Rebuilt the owner home around a greeting, academic-session selector, primary school actions, active students, attendance, payments, follow-ups, a real school-day timeline, decision queue, finance activity, student-record health, family interest, birthdays, and existing workshop follow-up.
- Preserved navigation and actions for payment, enrollment, attendance, finance, communications, tasks, marketing, student profiles, and workshops; no data model, Firebase write, or permission behavior changed.
- Verified authenticated MakerLab data at 1440px desktop and 390px mobile in both light and dark themes. Both document and module content reported zero horizontal overflow, the mobile theme control remained reachable, and theme persistence worked.
- `npm.cmd run build` passes. Existing Firebase dynamic/static import and large bundle warnings remain.
- Remaining migration: convert secondary module-local dark utilities and modal surfaces to semantic school-day primitives instead of relying on the scoped light-theme compatibility bridge.

### 2026-08-18 - Edufy School-Day Visual Expression Pass

- Increased the owner dashboard's visual warmth with full-surface mint, sky, peach, lilac, pink, and ink cards instead of relying on small colored accents.
- Added an asymmetric bento rhythm: compact student and attendance cards, a wider high-contrast payments card, and a compact attention card with stronger visual priority.
- Refined card geometry with 23-30px sculpted corners, fine highlight edges, soft layered shadows, clipped decorative rings, and richer light and dark ambient gradients.
- Added scoped Framer Motion reveals, card lift, timeline movement, chart growth, current-class pulse, and slow hero ambience without adding or modifying dependencies.
- Kept all motion transform/opacity-based and disabled it through `prefers-reduced-motion` and the React reduced-motion preference.
- Verified authenticated MakerLab data at 1440px desktop and 390px mobile in light and dark themes. The narrow layout has zero document-level horizontal overflow; its internal 16px scroll-width delta is the intentionally reserved scrollbar gutter, with no protruding content elements.
- `npm.cmd run build` passes. Existing Firebase dynamic/static import and large bundle warnings remain.

### 2026-08-18 - App-Wide Modern Component System

- Promoted the reference language from a dashboard treatment into the shared authenticated Edufy component system used across more than 40 module and detail surfaces.
- Added Edufy Volt and Electric Blue tokens, 28px appliance-panel geometry, 18-20px list rows, layered card shadows, lime active navigation, lime action capsules, and calmer cool-mist canvases.
- Rebuilt the shared command header, signal cards, icon wells, toolbars, actions, section treatment, and empty states so existing Students, Programs, Finance, Attendance, Workshops, Marketing, Communications, Team, Apps, and other modules inherit the system automatically.
- Normalized legacy authenticated panels, slate alpha surfaces, fields, select controls, text areas, tables, list rows, and action cards through the scoped module compatibility layer, including previously unmapped translucent navy values.
- Reworked the shared Modal, AlertModal, and SuccessModal surfaces for semantic light/dark colors, sculpted desktop geometry, modern close controls, blurred backdrops, and accessible focus behavior without changing their workflows.
- Upgraded the custom Settings command bar, workspace summaries, and form controls so the settings surface belongs to the same component family.
- Verified Dashboard, Students, Finance, Programs, the Program wizard, and Settings in authenticated local UI review. Light and dark mobile checks at 390px reported zero document overflow; desktop checks reported zero document and module overflow.
- No application records were written during UI QA. The local browser still reports the existing Firestore snapshot-listener permission error; this styling pass did not change rules, queries, or data access.
- `npm.cmd run build` passes. Existing Firebase dynamic/static import and large bundle warnings remain.

### 2026-09-01 - Program Roster CSV And Excel Export

- Added CSV and Excel download actions to the always-visible Program Details header and the Roster tab, with responsive controls that remain usable on mobile.
- Exported the active academic-year roster in the same unplaced-first order shown in Edufy, including learner, parent contact, school, level, primary and additional groups and schedules, plan, start date, placement, and academic year.
- Added UTF-8 BOM output for reliable French names in CSV, safe descriptive filenames, useful Excel column widths, and a filterable Roster worksheet.
- Verified both downloads against the populated Make & Go program: CSV contained 30 roster rows plus its header, and Excel contained the same 30 rows across 16 columns with an autofilter.
- `npm.cmd run build` passes. The existing large App bundle warning remains.

### 2026-09-01 - Program Waiting-List Removal Controls

- Added Remove and Delete actions to each family card in a program's Waiting tab, while retaining the existing Enroll now action.
- Remove is the safe default: it closes the lead and preserves its CRM timeline; Delete permanently removes only the lead/waiting record.
- Added current-tenant and role-permission guards, pending-state protection, clear confirmation copy, and success/error feedback for both actions.
- Verified the controls on the populated Make & Go waiting list and confirmed both warning dialogs without mutating live records.
- Confirmed the CSV roster and Excel roster actions are visible and enabled in the always-visible Program Details header while Program plan is still selected.
- `npm.cmd run build` passes. The existing large App bundle warning remains.

### 2026-09-03 - Company Invoicing And Accounting Export Foundation

- Added a program-level billing audience so each new program explicitly targets either individual billing or company billing.
- Added company billing snapshots with one invoice recipient and any number of named participants, keeping the participant identities available for future attestations and certificates.
- Added an organization-scoped, append-only invoice register with transactional annual numbering such as `20260001`, idempotent payment-origin invoices, printable documents, and full linked credit notes instead of invoice deletion.
- Reconnected the legacy payment invoice action to the durable register and annual sequence.
- Added balanced accounting-entry generation and Excel/CSV export using the 18-column MakerLab reference layout, plus user-uploaded software templates with editable column mappings and account defaults.
- Stored finance documents, corporate enrollments, counters, and custom accounting templates under the active organization. Firestore rules were intentionally not changed in this loop; production immutability and non-admin finance access still require an explicitly approved server/rules hardening pass.
- `npm.cmd run build` passes. Focused accounting checks produced six balanced entries for an invoice and its credit note (`240 MAD` debit and credit totals). Desktop and 390px mobile UI review passed without creating finance records.

### 2026-09-03 - Configurable Training Billing Units

- Added reusable billing profiles to programs with hour, workshop, half-day, day, package, participant, and group units.
- Added configurable hours per unit, sessions per unit, invoice label, and calculation source (planned, delivered, or manual), with a default definition of one day = two three-hour workshops.
- Added invoice-level overrides so a company contract can charge one workshop, one day, half a day, several units, or a fixed package without changing the source program.
- Stored unit label, hours, session count, and calculation mode in each invoice line and exposed those fields to accounting template mappings and printable documents.
- Preserved legacy programs and payment-origin invoices through safe defaults when no billing profile exists.
- `npm.cmd run build` passes. No finance records were written during this loop.

### 2026-09-03 - On-Demand Company Programs And Beneficiaries

- Added Scheduled, On demand, and Hybrid delivery models so a reusable company training program no longer requires client dates, groups, or a timetable at catalog creation.
- Made Company default to On demand for new programs, reduced that wizard route from six steps to four, disabled public registration, removed generated groups, and kept dates and academic-period data out of the saved program.
- Preserved the dated StemQuest workflow for scheduled programs and restored Dates and Groups when an operator explicitly selects Scheduled or Hybrid.
- Separated the company invoiced by MakerLab from an optional company where the training was delivered. No reseller margin, downstream price, or downstream invoice is stored.
- Added beneficiary identity to the durable invoice snapshot, corporate enrollment, printed invoice, register search, register row, accounting label, and custom accounting export mappings.
- Updated program readiness so an active On-demand program with pricing is ready for client missions instead of being incorrectly flagged as missing a schedule.
- `npm.cmd run build` passes. Local demo QA covered the Company → On demand wizard transition and finance invoice form without saving records.

### 2026-09-06 - Education UI System Dashboard Preview

- Added a namespaced Education UI component layer with semantic surfaces, actions, section headers, and accessible progress indicators.
- Reworked the Admin Dashboard as a daily school command center: schedule and attendance first, actionable follow-ups second, then collections, operational readiness, family interest, birthdays, and the live workshop follow-up queue.
- Preserved the dashboard's existing data derivations, academic-session selector, navigation callbacks, permissions, payment modal, student creation flow, and live Workshop Action Center.
- Kept the migration reversible: the new dashboard is available only in development at `?ui=education-v1`; the legacy dashboard remains the default in development and production.
- Scoped the new styles under `.edu-v1` so the module does not restyle shared legacy pages.
- Verified authenticated desktop, 375px phone, and phone-landscape layouts with no document-level horizontal overflow. New dashboard controls meet the 44px minimum target, and the existing payment dialog opens and closes without writing a record.
- `npm.cmd run build` passes. Focused TypeScript output contains no errors for the new dashboard, primitives, or bridge. The repository-wide TypeScript check still reports unrelated pre-existing errors.
- Added `EDUCATION_UI_SYSTEM_MAP.md` to record the component vocabulary, module archetypes, safety boundary, and approval gate before the Students module begins.
- Expanded the preview from a page-only treatment into a complete authenticated Education UI shell. The development-only route now replaces the former dark Atlas navigation with a campus spine, searchable contextual drawer, redesigned top bar and tabs, compact rail, workspace organizer, and five-item mobile navigation.
- Preserved permission-filtered modules, tenant context, installed apps, favorites and hidden-module preferences, compact and density preferences, notifications, sign-out, workspace tab activation/closing/reordering, and all existing module routes.
- Verified that navigation from Dashboard to Students retains the new shell, then returned to Dashboard without writing application data. Desktop expanded/compact, 375px phone, and 844px phone-landscape states have zero document-level horizontal overflow and no undersized interactive controls within the new shell.

### 2026-09-07 - Full Education UI Application Preview

- Extended the Education UI preview from the dashboard into the complete Edufy experience: shell, core school operations, learning, finance, family journey, team operations, resources, platform administration, installed apps, role-specific workspaces, login, booking, and enrollment surfaces.
- Corrected the navigation architecture after review: removed the parallel black icon rail and retained one white responsive sidebar/drawer. The horizontal strip now represents closable, reorderable open-workspace tabs only, while the mobile layout uses the same drawer plus five frequent destinations in the bottom bar.
- Reframed modules around operator expectations instead of applying a visual skin: school-day action flow for Classes and Attendance, learner-and-family exploration for Students, lifecycle and evidence for Learning, collection and reconciliation for Finance, acquisition-to-pickup continuity for the family journey, and task-focused administration for Settings, Marketplace, and SaaS controls.
- Preserved existing data sources, permissions, routes, callbacks, filters, dialogs, exports, workspace preferences, installed-app entitlements, authentication, and public form behavior. No application records were written during visual QA.
- Added shared Education primitives and narrowly scoped compatibility styles for remaining legacy utility classes. The preview is still available only in development with `?ui=education-v1`; the default development route and production application remain on the current approved interface.
- Audited the major admin modules through the real navigation and confirmed their intended preview roots, page titles, and zero document-level horizontal overflow. Desktop, phone portrait, phone landscape, drawer, and mobile bottom-navigation states were reviewed, including Students, Learning, Finance, Programs, Workshops, Marketing, Communications, Pickup, Team, Staff Attendance, Gallery, Admin Tools, Settings, Marketplace, and an installed app.
- Kept reduced-motion support and accessible progress/interaction semantics in the shared system. The preview intentionally follows the supplied light Education system; a separate dark-theme expression was not introduced.
- `npm.cmd run build` passes. Existing Firebase dynamic/static import and large bundle warnings remain; the existing Firestore snapshot-listener permission message remains unrelated to this presentation-only preview.
- Updated `EDUCATION_UI_SYSTEM_MAP.md` to record the single-navigation contract and complete module coverage. The next step is user review and targeted refinement, not another partial navigation or page-by-page skin pass.

### 2026-09-07 - Students Operations Redesign v2

- Replaced the preview's generic Students directory treatment with an action-first operations desk behind `?ui=education-v1`; the default interface remains unchanged.
- Separated operational blockers from optional profile cleanup. Needs Action now counts contact, enrollment, class-placement, and duplicate-identity gaps, while Profile Details remains a dedicated smart roster view.
- Added a persistent learner passport with next-best action, family contact, program/class, balance, record state, five-step readiness, and existing profile/edit/enroll/archive callbacks.
- Reframed Families as a household workspace with sibling context, expected/paid/balance signals, family search, learner profile routes, and the existing statement flow.
- Preserved search, Program/Audience/Level/Class day/Archived filters, filter badges and reset, directory issue filters, bulk selection, parent linking, permission checks, and all existing dialogs and mutations.
- Added content-container breakpoints so the module responds to the usable area beside Edufy navigation, including readable horizontal smart views and stacked narrow layouts.
- Authenticated local QA verified 11 operational blockers, 148 profile-detail records, advanced filter selection/reset, family search, and Students/Families switching without writing application data.
- `npm.cmd run build` passes. Existing Firebase import and large bundle warnings remain unrelated to this redesign.

### 2026-09-08 - Family Admissions Phase 0

- Received approval to build the pre-enrollment family journey and to use the new Education UI system.
- Audited every current lead producer and major consumer, legacy status/timeline behavior, workshop conversion, enrollment handoff, permissions, Firestore rules/indexes, and the development-only Education UI preview.
- Confirmed that Admission Officers currently lack the Marketing permissions used by the CRM, while Firestore lead writes remain broadly available to elevated tenant roles.
- Confirmed two critical linking gaps: workshop conversion still uses phone matching in multiple paths, and enrollment prefill does not retain the originating lead ID.
- Defined a conservative, read-only legacy adapter as Phase 1, plus stable-link, feature-flag, migration, and regression boundaries.
- Defined the Education UI direction as a follow-up desk with a Family Journey Passport, using existing tokens/primitives and locally scoped CSS rather than another design system.
- Added `.agent/`, `modules/admissions/AGENT_CONTEXT.md`, and durable documentation under `docs/admissions/`.
- No application behavior, data model, Firestore rule/index, route, dependency, or production data changed.
- `npm.cmd run build` passes with the existing Firebase import and large-chunk warnings. The repository-wide TypeScript check still fails on pre-existing Maker Pro, SparkQuest, and older ERP diagnostics.

### 2026-09-08 - Family Admissions Phase 1 Read Projection

- Added a Firebase-independent Admissions domain with canonical read stages, evidence precedence, repair flags, compatibility next actions, and age/search/stage-count selectors.
- Projected active enrollment above completed workshop, completed workshop above booked workshop, and stable evidence above conservative legacy status mapping.
- Accepted explicit case/lead links and the existing deterministic `crm_<slot>_<lead>` booking ID. Phone matches remain visible candidates and never advance identity or lifecycle.
- Added 19 executable adapter/selector smoke scenarios covering all seven legacy statuses, precedence, cross-tenant rejection, missing data, unknown status, phone-only candidates, deterministic booking identity, full projection, search, counts, and aging.
- Added Admissions beside Students and Families only in the development Education UI preview, with a read-only compatibility queue and Family Journey Passport using locally scoped Education UI styles.
- Added a full-screen mobile passport with a visible Back control after QA found that a stacked passport would otherwise sit below the complete lead list.
- Authenticated QA projected all 51 tenant leads and made 46 repair cases visible. Desktop and narrow mobile had zero document overflow; search empty/restoration, mobile passport open/close, and minimum visible control checks passed.
- Verified that the default development UI has no Admissions entry or preview surface. No CRM write, message, payment, enrollment, rule, index, schema, dependency, or production data change was made.
- `npm.cmd run build` passes with 4,404 transformed modules and the existing Firebase import and large-chunk warnings. Focused Admissions TypeScript passes; repository-wide TypeScript remains blocked by pre-existing unrelated diagnostics.

## Immediate Next Loop

Current approval gate: Admissions Phase 3 only. Phase 2 completed on 2026-09-08.

Why:
- The compatibility projection is proven against fixtures and the current tenant data.
- Operators now need complete Today, Pipeline, and All cases read workflows before any mutation contract is introduced.
- Marketing CRM, Workshops, Finance, enrollment, and all Firestore writes remain protected.

Target checklist:

- [ ] Add Today without claiming due/overdue truth where no structured task exists.
- [ ] Add a complete non-drag Pipeline and All cases view over the proven projection.
- [ ] Keep repair flags, age, stable evidence, and phone-only candidates inspectable.
- [ ] Preserve the default interface and Marketing CRM; add no writes, messages, rules, or indexes.
- [ ] Run focused checks and the production build.
- [x] Complete desktop/mobile, keyboard, and mobile passport QA; update memory and stop for Phase 2 review.

### 2026-09-08 - Family Admissions Phase 2 Read-Only Workspace

- Completed the development-only Admissions workspace with Today, Pipeline, and All cases on top of the Phase 1 tenant-safe projection.
- Today exposes 50 active non-terminal family cases and explicitly says that no due/overdue claim is possible until structured tasks exist.
- Pipeline presents all seven canonical stages in a wrapping grid with observed counts 40/2/8/0/0/0/1 and no horizontal drag.
- All cases opens with all 51 projected tenant leads, supports full search plus stage/repair filters, and keeps ambiguous records visible by default.
- Preserved the 58/42 desktop workbench, Family Journey Passport, full-screen narrow passport, repair flags, and stable-versus-phone-only evidence.
- Added deterministic active-case triage selectors and expanded the executable domain harness from 19 to 22 scenarios.
- Authenticated desktop and 778px narrow QA found zero document/workspace/pipeline/passport overflow, no visible Admissions control below 38px, successful search empty/reset, and successful Escape dismissal of the passport.
- Default Students remained unchanged outside `?ui=education-v1`; Marketing CRM, Firebase rules/indexes, schemas, dependencies, and production data were untouched. No application record was written.
- Focused Admissions TypeScript and `npm.cmd run build` pass with the existing Firebase import and large-chunk warnings. The existing Tailwind CDN and Firestore snapshot-listener console diagnostics remain unrelated.
- Next safe loop: Phase 3 contracts and proof for structured activities and next actions. Do not expose a write UI before authorization, idempotency/version, and rules gates pass.


## 2026-09-09 — urgent Finance service catalogue phase

Added a tenant service catalogue using the eight Future Makers 2026 PDF services and a rapid multi-service invoice form on the existing Finance ledger. Editable invoice snapshots, annual numbering, credit notes and print/export are preserved. Source prices are unspecified, and no defaults are written on startup. Local schema/version/archive rules retain the existing organization-manager permission boundary.

Domain, real emulator, isolated browser, focused TypeScript and production build pass. Global TypeScript errors outside the changed Finance files and existing build warnings remain. Next work requires a new explicit scope; staff permission alignment is documented, not silently broadened. No production mutation or release occurred. See `docs/finance/SERVICE_CATALOGUE_PHASE_1.md` and `.agent/LAST_HANDOFF.md`.
