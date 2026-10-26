## Workshop request → instructor local phase — 2026-10-26

The dated workshop assignment and request/confirmation UI candidate is complete locally. The Instructor Pass projection, French WhatsApp draft and Workshops theme repair are included. Stop at this module boundary; coordinate the Firestore rule and frontend rollout before any live test. See `docs/education/WORKSHOP_REQUEST_TO_INSTRUCTOR_2026-10-26.md`.

---

## Design System v1 Expenses focused completion — 2026-10-20

Expenses has a local canonical workspace across overview, register/detail, recurring charges, insights, templates and financial dialogs. Synthetic populated/empty/failure/permission checks and signed-in Administrator read-only desktop/390px navigation are documented in `docs/education/EXPENSES_DESIGN_SYSTEM_V1_2026-10-20.md`. Stop at this module boundary. Real writes, physical-phone and restricted-role acceptance remain open; no push or deployment.

## Design System v1 visual completion — focused repair complete — 2026-10-20

The signed-in screen recording showed partial migration despite the earlier rollout handoff. The visible Classes, Program detail and Finance gaps are repaired and verified locally with actual loaded data read-only. Shared tabs, registers and status pills now carry the canonical treatment. Read `docs/education/EDUFY_VISUAL_COMPLETION_AUDIT_2026-10-20.md`. Continue module-by-module with Settings, Expenses and remaining legacy-heavy surfaces. Release is held for renewed visual review.

---

## Design System v1 release candidate — shell menus complete — 2026-10-19

The user authorized deployment of the completed module rollout after aligning the left and top menus. Both menus now use the canonical Design System v1 without changing module navigation or retained workspace behavior. Signed-in read-only QA passes at 1440px and 390px in light/dark. Read `docs/education/DESIGN_SYSTEM_NAVIGATION_RELEASE_2026-10-19.md`. Prepare an exact clean `origin/main` release through `$hostinger-main-release`; exclude auth, rules, API, schema and financial logic changes.

---

## Design System v1 local rollout complete — 2026-10-19

The approved local sequence is complete through Learning and Portfolio. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_LEARNING_PORTFOLIO_2026-10-19.md` and `docs/education/DESIGN_SYSTEM_V1_CONSOLIDATED_HANDOFF_2026-10-19.md`. Dashboard, Students/forms, Programs, Attendance, Admissions/Workshops, Finance/Expenses and Learning/Portfolio share the canonical contract; earlier Pickup, Classes and Calendar passes are retained. Builds, shared checks and responsive light/dark read-only QA pass. No production write, push or deploy. The rollout heartbeat can be disabled.

---

## Design System v1 approved rollout — Finance and Expenses complete — 2026-10-19

Finance and Expenses now consume the canonical Design System v1 while preserving all calculations, transaction handlers, invoice rules, accounting exports, permissions and stored records. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_FINANCE_EXPENSES_2026-10-19.md`. Actual signed-in desktop/390px light/dark checks were read-only; no financial form was submitted. Build, shared design checks and service-catalogue checks pass. One restricted Firestore listener still logs `permission-denied` and remains a separate security-rule audit, not a UI change. No production write, push or deploy. Next: Learning and Portfolio, then the consolidated handoff.

---

## Design System v1 approved rollout — Admissions and Workshops complete — 2026-10-19

Admissions and Workshops now consume the canonical Design System v1 without changing the adopted navigation, domain handlers or permissions. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_ADMISSIONS_WORKSHOPS_2026-10-19.md`. Synthetic desktop/390px light/dark checks, empty states, family passport, assistant, calendar, follow-up, template form, history and dialog scrolling pass. Signed-in real-account checks were read-only: 9 inquiries, 3 workshop templates, 32 slots and 2 booked spots. No production write, push or deploy. Next: Finance and Expenses, then Learning and Portfolio.

---

## Design System v1 approved rollout — Programs and Attendance complete — 2026-10-19

The user approved the Dashboard, Students register and complete forms as the shared reference and authorized continued rollout. Programs and Attendance now consume the canonical system, preserve Notion-style working navigation and retain module context by organization/user. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_PROGRAMS_ATTENDANCE_2026-10-19.md`. Build, shared design checks, membership checks, synthetic desktop/390px light/dark QA and signed-in read-only data checks pass. No production writes, push or deploy. Preserve unrelated unfinished Admissions/Workshops files. Next phase: reconcile Admissions/Workshops to Design System v1 before Finance/Expenses and Learning/Portfolio.

---

## Design System v1 reference review gate — 2026-10-19

The user requested a shared Notion-inspired staff UX with a full Duolingo-inspired visual vocabulary, then explicitly authorized implementation. The dashboard, Students register, enrollment wizard and complete student editor now form the local reference candidate. Read docs/education/design-system-v1/README.md, IMPLEMENTATION_REPORT.md, MODULE_BRIEF.md and ACCEPTANCE.md. Shared foundations evolve the existing Education primitives; data-edu-system="1" opts into canonical tokens. Earlier green/blue-only and neutral-counter instructions are superseded. Local review: http://127.0.0.1:5246/; real app: http://127.0.0.1:5202/. Stop for user visual approval before Programs/Attendance or further module rollout. Heartbeat remains PAUSED. Preserve unrelated unfinished Admissions/Workshops files. No deploy/push/auth/permissions/financial-rule changes or production writes.

## Dashboard educational pass complete — 2026-10-19

User redirected work to Dashboard before later modules. School/admin dashboard is complete locally, including full action/timetable disclosure, balanced light/dark styling, readable task dates, workshop follow-up dialog clipping fix and scoped payment-form details. Read `docs/education/DASHBOARD_EDUCATIONAL_2026-10-19.md` for evidence and limits. Build and desktop/390px browser checks pass; actual payment/detail navigation was read-only. No production writes/push/deploy. Notion-style navigation and domain handlers preserved. Stop at this phase handoff; heartbeat remains paused. Later role dashboards and remaining module forms are separate scope.

## Calendar educational pass complete — 2026-10-19

The user requested continuation after Programs. Calendar / Global Schedule is complete locally: balanced light/dark styling, weekly timetable and date-grouped agenda, session/coverage/type filtering, week date jump and searchable instructor details. Read `docs/education/CALENDAR_EDUCATIONAL_2026-10-19.md` for verification and limits. Build passes; 390px and desktop browser checks pass. Real-account read-only integration shows an empty current week; populated assignment tests use isolated fixtures only. Preserve existing sync/assignment handlers, Notion-style navigation and Programs work. No push/deploy or production writes. Next: Admissions / Workshops. Stop at this phase handoff; heartbeat remains paused.

## Programs full workspace pass complete — 2026-10-19

The user resumed work specifically on Programs, roster and all program tabs. This pass is complete locally. Read `docs/education/PROGRAMS_WORKSPACE_2026-10-19.md` for scope, previews and verification. All seven tabs, setup, quote/QR and next-year dialogs use the restrained educational palette; roster has search and placement filters. Shared dialogs now remain mounted from detail, and closing setup retains the selected tab. Preserve the Notion-style navigation, neutral metrics, green identity, blue actions and small #FF9600 warning cues. Real-account read-only verification covered a 30-learner roster and its one unplaced learner; committed evidence is synthetic only. Build passed. No deploy/push/domain writes. This supersedes earlier Programs initial-pass notes below. Stop at this Programs handoff; heartbeat remains paused.

## Three-module visual pass complete - 2026-10-19

Students directory/overview, Programs catalog/workspace and Attendance register are complete locally in the approved educational direction. The latest user correction requires neutral metric cards, lime/green identity, blue actions and restrained #FF9600 orange warning cues. Preserve the adopted Notion-style navigation and all domain/write handlers. Current evidence is *-balanced-*.png; earlier saturated orange screenshots are superseded. Read docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md before continuing. Actual app: http://127.0.0.1:5202/. Signed-in read-only desktop navigation was checked; synthetic save tests are separate. No deployment. Full student profile editor styling and later modules remain subsequent scope. Stop at this batch handoff; heartbeat paused.

## Programs visual milestone - 2026-10-19

Students and Programs are complete locally in the approved educational style. Next: Attendance. Preserve Notion-style navigation, existing workflows and handlers. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md for synthetic evidence and acceptance limits.

## Approved rollout - 2026-10-19

The user approved the Pickup visual direction while explicitly preserving the adopted Notion-style navigation and operational UX. Proceed sequentially Students, Programs, Attendance; approval gate is lifted for these modules. Heartbeat is ACTIVE with this updated scope.

Students directory and learner overview are complete locally. Next: Programs, then Attendance. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md. No push/deploy or domain/auth changes.

## Palette review update - 2026-10-19

Pickup now uses prominent reference orange for arrivals, blue for incoming, purple for ready, green for released and yellow for attention. Build and synthetic desktop/mobile light/dark checks pass. See docs/education/PICKUP_STYLE_STUDY_2026-10-19.md. Await final acceptance; other modules and heartbeat remain paused.

# Current review — Educational Pickup style (2026-10-19)

The user requested an educational Duolingo-inspired Pickup study, then the reference colors. See docs/education/PICKUP_STYLE_STUDY_2026-10-19.md. The local review uses the adopted 011Y mascot, rounded typography and sampled green/blue/lime/navy colors. Await final acceptance before other modules. Heartbeat poursuivre-edufy-pulse remains PAUSED.

---

# User review gate — 2026-10-19

The user requested viewing a completed page and confirming the final UI/UX before implementing the design across other modules. Automatic progression is paused (heartbeat poursuivre-edufy-pulse status PAUSED). Pickup is the completed review page: http://127.0.0.1:5236/?theme=light or theme=dark, synthetic data only. Await explicit design acceptance before continuing Programs or later modules. Programs preparation currently consists only of uncommitted synthetic preview harness files; no Programs application UI was changed. Preserve those files.

---

# Current phase — Pickup complete; Programs next (2026-10-16)

Pickup local Pulse pass is complete: compact gate register, inline verification, visible arrival actions, persistent scheduled roster and coordinated light/dark lobby. See docs/education/EDUFY_PULSE_PICKUP_2026-10-16.md and pulse-evidence/pickup-* for checks and synthetic-versus-real acceptance boundaries. Next is Programs, then Calendar, Admissions/Workshops, Finance/Expenses and Learning/Portfolio. Attendance, Classes and Students are already complete locally. Continue automatically under the user’s authorization; no push, deployment, auth/rule changes or production writes. Preview http://127.0.0.1:5236/?theme=light; actual local app http://127.0.0.1:5202/. Heartbeat poursuivre-edufy-pulse remains active.

---

# Current phase — Automatic Pulse module rollout (2026-10-16)

The user explicitly authorized automatic local progression after each completed UI milestone. Attendance, Classes and Students have completed their current local Pulse passes; next is Pickup, followed by Programs, Calendar, Admissions/Workshops, Finance/Expenses and Learning/Portfolio. Preserve the shared Education/Atlas themes, handlers, permissions and production records. Read docs/education/EDUFY_PULSE_CLASSES_STUDENTS_2026-10-16.md for evidence and limitations. Real-school acceptance is still pending; it does not block the now-authorized local UI progression. No push or deployment. Heartbeat poursuivre-edufy-pulse is active every 30 minutes; disable when the listed local passes are complete.

---

# Current phase — Pulse Attendance visual refinement (2026-10-16)

The approved visual refinement is implemented locally: a session-time rail, continuous daily register, grouped status controls, stronger typography and coordinated light/dark layouts. Actual handlers and data contracts are unchanged. Synthetic responsive and save/error/batch checks pass. See `docs/education/EDUFY_PULSE_ATTENDANCE_VISUAL_2026-10-16.md` for captures, density tradeoff and verification. Preview: `http://127.0.0.1:5231/?theme=light`; actual app: `http://127.0.0.1:5202/` then Attendance. Real-school and physical-phone acceptance remain. Stop at this report before extending to Classes/Students; no release authorized.

---

# Current phase — Edufy Pulse Attendance benchmark (2026-10-16)

The user supplied the Pulse master mission. First milestone: compatible Education/Atlas foundations and a complete Attendance UX on isolated branch `agent/edufy-pulse-attendance-20261016`, preserving earlier module work. Local implementation and synthetic browser verification are complete; signed-in school-account and physical-phone acceptance remain. Stop at this milestone report before Classes/Students. No release authorization. See `docs/education/EDUFY_PULSE_ATTENDANCE_2026-10-16.md`.

---

# Current phase override — Parent and learner quick access (2026-10-15)

Build staff-issued, single-use SparkQuest links and QR codes for verified parents and learners from the Edufy learner profile, retaining reusable manual login QR cards. Preserve exact UID, tenant and guardian links, parent relationship verification, current password entry, and Showcase password reauthentication. Release and real-account acceptance are separate gates. See `docs/sparkquest/RECIPIENT_QUICK_ACCESS_2026-10-15.md`.

---

# Previous phase override — Daily Pickup roster correction and coordinated release (updated 2026-10-15)

Pickup now projects every active learner scheduled for the current weekday from canonical enrollments and group times, keeping the learner visible in Edufy and the lobby before a parent starts the audited queue. Live queue states overlay that roster. The learner-ready action is optional; verified staff release is valid from `arrived` or `ready`. Domain smoke, SparkQuest TypeScript, both builds and Firebase 10/12 Auth/Firestore emulator suites pass. Release Edufy, SparkQuest and Firestore rules together, then verify both public clients and the deployed rule behavior. See `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`.

---

# Previous phase override — Live pickup lifecycle release (updated 2026-10-15)

The canonical pickup lifecycle is implemented and locally accepted across family, learner and staff roles. Parents select an active authorized picker and announce/arrive; learners receive live status, exchange private notes with the initiating parent, pack and tidy, then mark ready; Edufy staff verify and release; only the selected picker confirms receipt. Each transition has an atomic immutable audit event. Both clients, Firestore rules and indexes are in the coordinated release scope explicitly requested by the user. See `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`.

Release gate: promote the focused commit from the clean `origin/main` worktree, deploy Edufy through Hostinger, deploy the linked SparkQuest Vercel project, deploy Firestore rules/indexes, then verify public assets and remote SHA. No production family record is created by the release itself.

---

# Current phase override — Parent access real-account acceptance (2026-10-12)

The designated real parent account was issued by the operator through local Edufy and signed into local SparkQuest. Its legacy profile was repaired with exact UID, tenant and guardian-link checks; learner work remained in place. Missing parent legal names now use a family display label inferred from the learner name, with the exact recorded login alias taking precedence for surname-first names. Staff relationship verification remains required. Parent passwords are never stored for redisplay; staff can reissue a fresh password and the old one stops working. Auth/Firestore parent emulator and clean Edufy build pass. Focused commits `c2288e8` and `91038cf` reached GitHub main and Vercel production. Hostinger still serves an older Edufy bundle, so its client release is pending. Stop here; do not infer that the separate SparkQuest public client is released from the local sign-in.

---

# Previous phase override — Parent family mobile journey Phase 4

Follow-up local repair candidate on 2026-10-11: exact-login recovery for older recorded parent accounts and direct HTTPS parent API routing are implemented with synthetic Auth/Firestore verification. No real family account was recovered or changed during this follow-up. The broader parent mobile UX redesign belongs to the SparkQuest UI/UX Design thread; this worktree only verifies KENZA visibility at phone width and repairs the account-management path. Stop before any deployment or production-data action.

Completed locally on 2026-10-11 after the user clarified that parents receive academy-issued SparkQuest credentials and need a mobile, read-only view of each child's MakerLab journey. The candidate adds child switching, project briefs/resources/proof/reviews, gallery moments, payment and attendance detail, and view-only Pickup. Parent Pickup writes are denied in the reviewed rules. TypeScript, both builds, family smokes, demo Auth/Firestore emulator and 375px browser preview pass. A later interactive local acceptance issued a password through Edufy, signed into SparkQuest, linked a sibling, and checked all parent sections against one isolated demo project. See docs/sparkquest/PARENT_FAMILY_MOBILE_PHASE_4_2026-10-11.md and PARENT_LOCAL_ACCEPTANCE_2026-10-11.md.

Stop at this boundary. No production data, deployment, rule/index release or real family link occurred. The trusted API still needs its Firebase Admin identity, route proof, coordinated release and designated nonproduction acceptance.

---

# Previous phase override — SparkQuest review security Phase 2

Implemented locally on 2026-10-01 under explicit continuation. New learner projects require review protocol v1; instructor step decisions write protected proof-bound canonical state, queues and learner/instructor UI derive from it, and final publication requires canonical approval for every required step. Nested learner tampering cannot forge feedback, approval, or publication. Nine domain suites (169 counted assertions plus import/payload), review/learner/profile emulators, scoped TypeScript, both builds and desktop/412px browser QA pass. See docs/sparkquest/REVIEW_SECURITY_PHASE_2.md.

Stop at this boundary. No production data, rule deployment, index/API change, commit, push, Vercel/Hostinger release, or Electron package occurred. Designated-account mission + Showcase acceptance and a clean coordinated client/rules release remain required. Legacy records are compatibility-read and not bulk-migrated.

---

# Current phase override — SparkQuest review security Phase 1

Implemented locally on 2026-10-01 under the explicitly continued review-release priority. Learner creates/updates can no longer forge top-level feedback, reviewer identity, history, XP, publication timestamps/status, or a changes-requested decision; normal create/edit/proof/resubmission remains available. The full review emulator, profile-assignment emulator, 14-assertion learner pipeline, nine domain suites, scoped TypeScript and both production builds pass. See docs/sparkquest/REVIEW_SECURITY_PHASE_1.md.

Stop at this boundary. No production record, rule deployment, index/API change, commit, push, Vercel/Hostinger release, or Electron package occurred. Designated-account review acceptance and a clean coordinated client/rules release remain required. The dynamic-step limitation was subsequently resolved locally by Phase 2 above.

---

# Current phase override — Instructor learner workspace Phase 1

Implemented locally on 2026-10-01 under explicit continuation of review/student management. Canonical directory, saved current/previous-year progress, all-year pending reviews, direct review history, profile mission assignment, concurrent additive-audience preservation and scoped vivid surfaces are complete. Nine domain suites (40 new desk assertions), scoped TypeScript, isolated localhost demo Auth/Firestore assignment persistence/concurrency/denials, both builds and desktop/phone/keyboard fixture QA pass. See docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md.

Stop at this boundary. No production data, rule/index/API changes, public exposure, release or Electron packaging. Real account acceptance and review-field security hardening remain release gates. Other product phases or existing unrelated sharing/parent work require separate scope.

---

# Previous phase override — Review reliability Phase 1

Implemented locally on 2026-10-01 after explicit review-first approval. Dedicated newest-first inbox, proof-first live reader, transactional decisions/history, versioned resubmissions, stale learner/editor guards, confirmed final submission and canonical profile review access are complete. Scoped TypeScript, eight domain suites, localhost demo Auth/Firestore persistence/concurrency tests, desktop/phone/keyboard browser QA and both builds pass. See docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md.

Stop at this boundary. No production records, rules/indexes/APIs, public shares, release or Electron packaging were changed. Designated-account acceptance and review-field rule hardening remain release gates; student-management/assignment, vivid visual polish, celebration, parents and public sharing are later phases.

---

# Previous phase override — Learner desktop workspace Phase 1

Implemented locally on 2026-10-01 under explicit user approval. Pinned workbench, historical Field Log, canonical owned-build visibility, larger desktop navigation, scoped calm palette, naming and Showcase forms are complete. TypeScript, 70 domain assertions, both production builds, and keyboard/desktop/phone fixture QA pass. No production mutation or release occurred. See docs/sparkquest/LEARNER_WORKSPACE_PHASE_1.md.

Stop at this phase boundary. Designated-account acceptance and remaining Pickup/Build Rhythm/nested game polish are separate next steps, not automatic authorization.

---

# Previous phase override — Mission Autopilot import

Implemented locally on 2026-09-30 under the explicit CSV-to-mission wizard request. Full mission content, friendly/nested workflows, reference resolution, missing-section guidance, uploads, learner previews, draft creation and explicit assignment are integrated. Imports use tenant-scoped stable IDs and atomic workflow/mission transactions. Domain/browser fixture checks, TypeScript, Auth/Firestore persistence/security emulators and both builds pass. No production writes, rules/indexes/APIs, commit, push or deployment occurred.

Stop at this implementation boundary. Designated instructor upload/assignment and learner start/review acceptance remain the release gate. See docs/sparkquest/MISSION_AUTOPILOT.md.

---

# Previous phase override — Sparkbook learner destinations

Completed locally on 2026-09-30. Play Lab, Evidence Wall, Key Cabinet, maker profile, and desktop/mobile learner navigation now share the established Sparkbook system. The gallery fails closed without a verified organization; touched feedback and deletion use app states rather than native dialogs. Development previews, TypeScript, standalone build, and desktop/phone interaction and overflow QA pass. No production write, rule/index/API change, commit, push, or deployment occurred.

Stop at this boundary. Designated instructor/learner end-to-end mission QA remains the release gate. Nested arcade tools, Pickup, and Build Rhythm are later visual follow-ups.

---

# Previous phase override — SparkQuest rescue Phase 6

Completed locally on 2026-09-24. Rewards/contests/orders, mission editing, imports, student portfolio editing, and review now share the instructor mission-workshop system with accessible dialogs, inline failures, explicit loading and destructive states, and no hover-only primary controls. Instructor project tools no longer switch to anonymous authentication or invent a default tenant; gamification writes carry tenant/audit metadata. TypeScript, assignment smoke, 13 Auth/Firestore emulator assertions, standalone SparkQuest build, and Edufy root build pass. No production record, rule, release, or deployment changed. See `docs/sparkquest/RESCUE_PHASE_6.md`.

Stop at this boundary. A designated instructor session is still required for desktop/phone visual QA and clearly named test-record assignment/review verification before any release.

---

# Previous phase override — SparkQuest rescue Phase 5

Completed locally on 2026-09-24. The full instructor session now shares a compact mission-workshop design, workflow-based navigation, responsive controls, and actionable empty states. Templates and class progress read canonical mission audiences; Students is a focused portfolio/review surface; configuration writes and Toolbox data are tenant-bound. TypeScript, assignment smoke, 13 Auth/Firestore emulator assertions, standalone SparkQuest build, and Edufy root build pass. No production record, rule, release, or deployment changed. See `docs/sparkquest/RESCUE_PHASE_5.md`.

Stop at this boundary. A designated instructor session is still required for desktop/phone visual QA and real test-record assignment verification before any release.

---

# Previous phase override — SparkQuest rescue Phase 4

Completed locally on 2026-09-24. The instructor overview and mission library now follow one mission-dispatch lifecycle. Assignment updates a mission's grade/group/canonical learner audience and never writes enrollments. Mission writes carry the instructor tenant and audit fields; learner visibility shares the same tested domain contract. Assignment smoke, TypeScript, production build, and the seven-assertion Auth/Firestore pipeline emulator pass. No production record, rule, release, or deployment changed. See `docs/sparkquest/RESCUE_PHASE_4.md`.

Stop at this boundary. Production release still requires designated instructor/learner visual and write QA plus the coordinated Phase 3 client/Firestore/Storage release gate.

---

# Previous phase override — SparkQuest rescue Phase 3

Completed locally on 2026-09-24. The learner startup path is demand-driven, major workflow surfaces are split, independent dashboard reads run concurrently, direct learner mission assignments override stale grade/group metadata, and verified learners can create personal/showcase projects without a current-year enrollment. Evidence uploads now use resumable tenant/user/project-scoped Storage instead of base64 Firestore fields. Auth + Firestore emulators pass seven pipeline assertions, and signed-in local browser QA reaches the dashboard in approximately 3.2 seconds with no fresh Firestore permission errors. Storage emulator proof remains blocked by the unavailable runtime JAR. No production write, rule deployment, release, or migration occurred. See `docs/sparkquest/RESCUE_PHASE_3.md`.

Stop at this boundary. The next phase requires Storage emulator proof and an explicitly approved, coordinated client/Firestore/Storage release.

---

# Previous phase override — SparkQuest rescue Phase 2

Completed locally on 2026-09-24. Edufy project launches now request a 90-second server-issued opaque code; only its SHA-256 hash is stored, SparkQuest exchanges it from an exact allowed origin, access is revalidated, and the session is atomically consumed before a Firebase custom token is returned in the response body. Raw URL tokens are rejected. Staff retain their own identity. A tenant-scoped read-only reconciliation endpoint reports user/student/project link issues without PII. Real session writes remain disabled by default, the production report was not run, and no rules, indexes, production data, migration, release, or deployment changed. See `docs/sparkquest/RESCUE_PHASE_2.md`.

Stop at this boundary. Production enablement requires emulator proof, retention policy, a separately approved API/client release, and an explicitly authorized read-only live reconciliation before any repair.

---

# Previous phase override — SparkQuest rescue Phase 1

Completed locally on 2026-09-23. SparkQuest now has environment-safe Edufy links, verified tenant-bound learner identity, exact project ownership checks, fail-closed account recovery, and a redesigned responsive MakerLab project-workshop login. Anonymous kiosk, demo/base64 bridge, default-tenant, personal-data merge, project-title dedupe, and browser-side identity-repair paths were removed. Focused contracts, both production builds, and desktop/tablet/phone visual QA pass. No rule, index, API, production-data, release, or deployment change occurred. See `docs/sparkquest/RESCUE_PHASE_1.md`.

The Phase 1 boundary was continued by the Phase 2 override above.

---

# Previous phase override — Education UI coherence and compact navigation

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
# Current phase override — Parent access legacy login hotfix (2026-10-15)

The user requested urgent repair of Edufy parent account creation before resuming multi-tenant work. Scope: platform super admin authorization, conversion of legacy recorded contact emails or orphan Auth pointers into a new academy login, verified parent naming, and repeatable card display by issuing a new password. Preserve exact UID/family/tenant checks and no plaintext password storage. See `docs/parent/PARENT_ACCESS_LEGACY_LOGIN_HOTFIX_2026-10-15.md`. Stop after focused validation and release assessment; multi-tenant ownership remediation is the next separate phase.

---
## Phase 1 approval gate — global shell, Student Details and 011Y — 2026-10-20

The Notion-inspired global shell, reorganized Student Details experience and animated contextual 011Y guide are complete locally. Read `docs/education/EDUFY_SHELL_STUDENT_GUIDE_PHASE_1_2026-10-20.md`. Build, Design System checks and signed-in read-only desktop/390 px browser checks pass. Stop for the user's visual approval before Settings, Finance, Expenses or remaining module migration. Keep broad generic module edits unpublished and preserved for later reconciliation. No deploy, push, auth, permission, schema, financial-rule or production-record change.

---
# Parent multi-child account repair — 2026-10-26

The focused local repair allows a verified staff transfer from a single-child legacy parent login with a stale parent label into an exact existing family account. The directory exposes recoverable accounts rather than hiding them. The isolated Auth/Firestore emulator and Edufy build pass. No real family record has been changed. See `docs/parent/MULTI_CHILD_ACCOUNT_REPAIR_2026-10-26.md`; keep this phase local until coordinated API/client release and real parent acceptance.

---
