# Current phase override — SparkQuest mission experience contract

Release-approved on 2026-09-26. The mission-authoring wizard, instructor preview, learner briefing, project creation snapshot and workspace assignment share one backward-compatible `MissionBrief` contract. The learner must review the mission journey before a project document is created. The urgent showcase repair adds client UX and a full emulator regression while deploying the already-reviewed Firestore/Storage rules required by the learner pipeline; it introduces no rule broadening, index/API change or production data migration. See `docs/sparkquest/MISSION_EXPERIENCE_PHASE_7.md`.

---

# Current phase override — Education UI coherence and compact navigation

Completed locally on 2026-09-17. The authenticated Education shell now uses one compact desktop workbar instead of stacked title and workspace-tab rows. Mobile keeps only the compact contextual header, drawer trigger and bottom quick navigation; the workspace-tab strip and density controls are hidden. The desktop sidebar, content spacing and navigation items are denser without changing routes, permissions or callbacks. Atlas command surfaces, KPI cards and actions now share a restrained white/Volt system across unfinished modules, with module colors retained as small semantic signals. Expenses recurring-payment actions use the shared action primitive. Production build and authenticated desktop/mobile browser checks pass. No release was requested or performed.

---

# Current phase override — StemQuest membership attendance and school cohorts

Completed locally on 2026-09-17. Attendance now resolves enrollment coverage for the selected date, hides expired rolling memberships from current/future rosters, preserves historical attendance, and exposes an operational renewal queue. Fixed programs close operationally after their shared end date without mutating stored history. MakerLab rolling programs remain evergreen even when legacy program-level end dates exist; each learner keeps an individual membership clock. Legacy records are handled conservatively. See `docs/programs/STEMQUEST_MEMBERSHIP_ATTENDANCE.md`.

---

# Previous override — Education UI production activation and Finance invoice correction

Completed locally on 2026-09-09 under the explicit request to finish the design implementation and edit invoices from history. Education UI is now the authenticated default with `?ui=atlas-legacy` rollback; the stale cache-first worker is replaced. Active invoices can be corrected without changing their number, with revision conflicts, cross-year date changes, credit notes and credited invoices blocked. Formation and service invoices use independent editable annual sequences (`2026F001` / `2026S001`) that resume from history; printable PDFs omit due date and “Document comptable”. Focused TypeScript, smoke, browser and emulator checks pass. Release must use the clean `origin/main` Hostinger workflow.

---

# Previous override — Finance Service Catalogue Phase 1

Completed locally on 2026-09-09 under the explicit urgent service-invoicing request. See `docs/finance/SERVICE_CATALOGUE_PHASE_1.md` for scope, evidence and validation. Includes a separate catalogue, the eight PDF defaults, editable service invoice snapshots, existing-ledger integration and strict catalogue rules. No release or production data writes.

Stop at this boundary. The previous Admissions phase below is retained as history; no provider work was started.

---

# Active Phase

## Phase

Phase 6 — WhatsApp-assisted operations.

## Status

Complete on 2026-09-09. Optional Phase 7 provider readiness is next.

## Objective

Make parent follow-up visible through tenant templates, preview, durable consent, explicit WhatsApp handoff, manual sent/not-sent confirmation and parent outcomes.

## Completed scope

- Reuse Communications templates, existing phone formatting and scoped Education UI.
- Add one validated WhatsApp activity command with immutable, versioned, idempotent persistence.
- Add and prove matching Firestore consent/activity rules while keeping task mutations closed.
- Preserve Workshop, Finance, enrollment and legacy CRM import compatibility.

## Result and stop condition

- Assistant integrated into the development-only Admissions passport.
- Consent survives long histories and is checked against persisted state.
- All ten Admissions smoke/contract suites and focused TypeScript pass.
- Auth/Firestore emulators prove all valid states, a valid direct batch and malicious/unauthorized write denials.
- Isolated browser workflow, desktop/mobile, keyboard and screenshots verified.
- Production build passes (4,418 modules); existing Firebase import/large-chunk warnings remain.
- No provider connection, production message/data write, migration, deployment or release occurred.

Stop at this phase boundary. Follow ACTIVE_TASK before beginning provider work.
