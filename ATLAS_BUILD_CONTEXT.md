# Atlas Build Context

Last updated: 2026-09-05

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

- 2026-09-05: `npm.cmd run build` passed after the workshop recurrence, parent booking, WhatsApp sharing, and Open Graph rollout. A live read-only Monday/Thursday template rendered 17 upcoming sessions using only those weekdays at desktop and 390px mobile, with zero mobile horizontal overflow. The Vercel Open Graph handler returned the live title, image, Monday/Thursday schedule, canonical `/w/` URL, and booking redirect; the Hostinger PHP route was added but could not be syntax-checked locally because PHP is not installed.
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

## Immediate Next Loop

Recommended next module: Adaptive Programs foundation, phase two.

Why:
- Enrollment now needs a stable destination model for dated runs, repeated camp weeks, custom shifts, and actual class occurrences.
- The current nested grade/group/day/time structure cannot support MakerLab's real camp and bootcamp operations cleanly.
- Registration pages, QR links, attendance, pricing, attestations, and certificates must share the same run and occurrence identities.

Target checklist:

- [x] Add ProgramRun, ProgramGroup, ScheduleBlock, ClassOccurrence, PricingOffer, and EnrollmentAgreement contracts with tenant-scoped compatibility adapters.
- [x] Convert existing MakerLab programs into a non-destructive compatibility preview.
- [x] Build the first writable autopilot setup slice: format preset, run dates, groups, multi-block timetable, offer, registration, documents, and review.
- [ ] Connect the guided enrollment route to Program Runs and capacity-aware groups while retaining legacy fallback.
- [x] Generate occurrence previews without writing attendance records until the operator publishes the run.
- [x] Define registration-page and document-template contracts before adding public writes.
- [ ] Add automated Firestore rules and high-value workflow tests.
- [ ] Add the missing Firestore composite indexes observed in authenticated QA.
- [ ] Add audit metadata to sensitive finance, expense, settings, and account actions.

Next best loop:

- Adaptive Programs foundation and compatibility layer.
- Program setup autopilot and run-specific registration pages.
- Occurrence-based classes, attendance, and document eligibility.
- Students and family record repair.
- Finance phase two: invoices, refunds/credits, cash close, provider reconciliation, and immutable audit history.
