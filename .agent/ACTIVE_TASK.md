## Workshop assignment visibility follow-up — 2026-10-26

Local candidate and alert inbox complete. Port 5192 now serves the current worktree. Next: release integration and a real account check in the current Pass, followed by background push planning if closed-app delivery is required. See the workshop handoff document.

---

## Workshop request → instructor handoff — 2026-10-26

Local candidate implemented and verified. Next task: coordinated rules/client release and designated real-account acceptance. Preserve the worktree until release integration. Details and gaps: `docs/education/WORKSHOP_REQUEST_TO_INSTRUCTOR_2026-10-26.md`.

---

## Learning and Portfolio focused QA complete locally — 2026-10-20

The isolated follow-up fixes nested project and review save behavior and documents the complete synthetic page/dialog matrix in `docs/education/LEARNING_PORTFOLIO_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`. Parent integration should include both focused commits. Keep the release hold for authenticated and physical-phone acceptance. No push, deployment or school write.

---

## Focused Learning and Portfolio branch complete locally — 2026-10-20

The Learning and Portfolio Design System v1 screen, form, dialog and state inventory is complete in `docs/education/LEARNING_PORTFOLIO_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`. This isolated branch includes only assigned module code and a synthetic QA fixture. Build, 27 Education checks and diff checks pass. Real signed-in and physical-phone acceptance remain a release gate. Do not push or deploy from this branch; the parent integration task owns the wider rollout.

---

## Completed focused task — Expenses Design System v1 — 2026-10-20

The Expenses page/form/dialog inventory, canonical implementation, synthetic browser QA and signed-in read-only tour are complete locally. Read `docs/education/EXPENSES_DESIGN_SYSTEM_V1_2026-10-20.md` and the latest handoff. Stop at Expenses; preserve unrelated dirty module work. No production write, push or deployment.

## Current task — complete the visual migration screen by screen — 2026-10-20

The user paused release after a signed-in recording exposed legacy components inside the new shell. The recording-visible Classes, Program detail and Finance inconsistencies are repaired locally; see `docs/education/EDUFY_VISUAL_COMPLETION_AUDIT_2026-10-20.md`. Next, audit Settings, Expenses and remaining legacy-heavy modules at page/form/dialog level. Reuse canonical primitives and the locked color roles; preserve data hooks, handlers and permissions. Do not deploy until the user has reviewed the corrected experience.

---

## Completed task — Design System v1 consolidated handoff — 2026-10-19

Learning and Portfolio are complete under the shared Design System v1. The project factory is accessible from Curriculum, all Learning dialogs use the shared mobile-safe frame, and staff portfolios now have a retained searchable register. Actual signed-in checks were read-only; learner-specific Portfolio remains a real-account release gate. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_LEARNING_PORTFOLIO_2026-10-19.md` and `docs/education/DESIGN_SYSTEM_V1_CONSOLIDATED_HANDOFF_2026-10-19.md`. No further module in the authorized local sequence remains. Do not push or deploy without a separate release request.

---

## Next task — Learning and Portfolio under Design System v1 — 2026-10-19

Dashboard, Students, Programs, Attendance, Admissions, Workshops, Finance and Expenses are complete under the approved shared contract. Next, inventory and migrate Learning and Portfolio without changing project ownership, teacher/student permissions, review handlers, SparkQuest routes or records. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_FINANCE_EXPENSES_2026-10-19.md`, the Design System v1 package and the Learning module context before editing. Keep real-account checks read-only and synthetic writes isolated. Then produce the consolidated rollout handoff. No push or deploy.

---

## Next task — Finance and Expenses under Design System v1 — 2026-10-19

Dashboard, Students, Programs, Attendance, Admissions and Workshops are complete under the approved shared contract. Next, inventory and migrate Finance and Expenses without changing financial calculations, transaction handlers, exports, permissions or records. Then continue to Learning and Portfolio. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_ADMISSIONS_WORKSHOPS_2026-10-19.md`, the Design System v1 package and current module context before editing. Keep real-account checks read-only and synthetic writes isolated. No push or deploy.

---

## Next task — Admissions/Workshops reconciliation under Design System v1 — 2026-10-19

Programs and Attendance are complete under the approved shared contract. Next, inspect and reconcile the already-started Admissions/Workshops changes without discarding them, then proceed to Finance/Expenses and Learning/Portfolio. Use `data-edu-system="1"`, canonical tokens and primitives, retained working context, complete form/dialog inventories and synthetic versus real read-only acceptance boundaries. Read `docs/education/DESIGN_SYSTEM_ROLLOUT_PROGRAMS_ATTENDANCE_2026-10-19.md`. No push/deploy/auth/permissions/financial-rule changes or production writes.

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

# Current task — Continue Programs after verified Pickup (2026-10-16)

Pickup local Pulse pass is complete: compact gate register, inline verification, visible arrival actions, persistent scheduled roster and coordinated light/dark lobby. See docs/education/EDUFY_PULSE_PICKUP_2026-10-16.md and pulse-evidence/pickup-* for checks and synthetic-versus-real acceptance boundaries. Next is Programs, then Calendar, Admissions/Workshops, Finance/Expenses and Learning/Portfolio. Attendance, Classes and Students are already complete locally. Continue automatically under the user’s authorization; no push, deployment, auth/rule changes or production writes. Preview http://127.0.0.1:5236/?theme=light; actual local app http://127.0.0.1:5202/. Heartbeat poursuivre-edufy-pulse remains active.

---

# Current task — Pickup follows completed Classes and Students (2026-10-16)

The user explicitly authorized automatic local progression after each completed UI milestone. Attendance, Classes and Students have completed their current local Pulse passes; next is Pickup, followed by Programs, Calendar, Admissions/Workshops, Finance/Expenses and Learning/Portfolio. Preserve the shared Education/Atlas themes, handlers, permissions and production records. Read docs/education/EDUFY_PULSE_CLASSES_STUDENTS_2026-10-16.md for evidence and limitations. Real-school acceptance is still pending; it does not block the now-authorized local UI progression. No push or deployment. Heartbeat poursuivre-edufy-pulse is active every 30 minutes; disable when the listed local passes are complete.

---

# Current task boundary — Review refined Attendance register

The approved visual refinement is implemented locally: a session-time rail, continuous daily register, grouped status controls, stronger typography and coordinated light/dark layouts. Actual handlers and data contracts are unchanged. Synthetic responsive and save/error/batch checks pass. See `docs/education/EDUFY_PULSE_ATTENDANCE_VISUAL_2026-10-16.md` for captures, density tradeoff and verification. Preview: `http://127.0.0.1:5231/?theme=light`; actual app: `http://127.0.0.1:5202/` then Attendance. Real-school and physical-phone acceptance remain. Stop at this report before extending to Classes/Students; no release authorized.

---

# Current task boundary — Pulse Attendance local acceptance

Preserve the compact register, existing attendance write payloads/eligibility, pending-status display guard, server-snapshot readiness flag, shared semantic tokens and light/dark modes. Real-school persistence/roles remain an acceptance gate. Do not release, change authentication, or treat synthetic QA as real data acceptance. The stored learner-password reveal is a separately recorded security follow-up. Report this first milestone, then continue Classes only after its gate.

---

# Current task boundary — Local quick-access build and verification

Complete the Edufy parent/learner manual and one-click link/QR UI, the trusted recipient issue endpoint, and recipient branch of the existing SparkQuest one-time exchange. Prove exact staff/tenant/recipient link checks, replay and expiry policy, and both application builds. Stop after reporting the local build and release requirements; do not alter production family records or deploy without coordinated acceptance.

---

# Previous task boundary — Release the daily Pickup roster correction

Promote the focused daily roster, optional learner-ready transition, matching Firestore rules and parent/learner copy as one coordinated production release. Verify GitHub main, Hostinger Edufy, Vercel SparkQuest and deployed Firestore rules. Do not create synthetic scheduled queue records or production family test data. Preserve authorized-picker verification, exact tenant and guardian links, selected-picker receipt, atomic events and private notes.

---

# Previous task boundary — Coordinated pickup production release

Release the locally accepted five-step pickup lifecycle as one coordinated client and Firestore change. Preserve exact tenant and guardian links, learner-only readiness, selected-picker-only receipt, staff verification evidence, immutable initiator identity, atomic transition events, append-only audit records and the initiating-parent ↔ exact-learner private note boundary. Verify both public clients and the deployed Firestore configuration after promotion. No separate pickup account is required; use existing family accounts and authorized Edufy staff roles. See `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`.

---

# Previous task boundary — Edufy legacy parent name release

Release the focused one-word surname correction after the original parent-access hotfix. The Admin Student page now requests a verified full parent name when an older enrollment record contains only a family name; replacing the old login updates all linked siblings. The Auth/Firestore emulator and Edufy build pass. Keep Hostinger client and Vercel API on the same commit, preserve unrelated worktrees, and do not rotate a real family password merely to test. Authenticated acceptance with a designated account remains open. See `docs/parent/PARENT_ACCESS_LEGACY_LOGIN_HOTFIX_2026-10-15.md`.

---

# Previous task boundary — Parent access acceptance after real-family sign-in

The designated operator verified the parent relationship, issued a one-time password in local Edufy, and confirmed the real parent home opens in local SparkQuest. The trusted Vercel API is live; GitHub main is `91038cf`. Edufy Hostinger still serves an older client bundle. Keep the exact UID/tenant/guardian evidence gates, read-only family journey and direct staff sharing. For later sharing, reissue a new password; do not persist or reveal the previous password. Next release work is to verify Hostinger's client update and separately coordinate the SparkQuest public client. See `.agent/LAST_HANDOFF.md`.

---

# Previous task boundary — Parent family release acceptance

Released candidate 2026-10-12: one parent password action handles verified modern reset and consistent legacy repair, with a missing-name prompt and a server-verified same-organization parent directory. Auth/Firestore emulator and Edufy build pass. Do not issue or change a real parent password without staff confirmation of the exact parent and learner relationship.

Local follow-up candidate: exact-email legacy parent lookup/recovery and direct HTTPS parent API routing have been implemented and tested with synthetic accounts. Staff can recover a recorded `p.*@makerlab.academy` login lacking its modern profile/guardian links, fill a missing verified parent name, and issue a one-time password without changing the login ID. The signed-in local SparkQuest view was rechecked on 2026-10-11: all three AAJLANE children are visible at 390px, and KENZA's Journey opens. The SparkQuest UI/UX Design thread received the user's broader mobile-first Duolingo-style brief. Keep the follow-up local until coordinated API/client release acceptance; no real legacy family recovery has been run.

The designated AAJLANE parent signed in locally and now sees the three user-verified children NADA, ALI, and KENZA. The older KENZA login was disabled after a separately authorized, emulator-tested transfer. The local phone selector now shows all three children. The broader Duolingo-style, mobile-first parent UX pass is assigned to **SparkQuest UI/UX Design**. No Git push or Hostinger release has occurred; preserve the API/rules compatibility and do not treat Vercel API deployment as Edufy Hostinger or SparkQuest client release. See `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

Preserve the staff-issued one-time SparkQuest parent credential, exact guardian and tenant links, separate gallery permission, read-only parent project/record/Pickup surfaces and learner-only Pickup update exception. The local Phase 4 implementation is complete; see docs/sparkquest/PARENT_FAMILY_MOBILE_PHASE_4_2026-10-11.md. Firebase Admin secret, API, rules and indexes are provisioned; the user authorized designated real-family account repair and three-child linking. Next is the broader parent mobile UX pass and coordinated GitHub/Hostinger/SparkQuest client release after local acceptance.

---

# Previous task boundary — Protected step-review release acceptance

Preserve `reviewProtocolVersion: 1`, proof-bound `stepReviews`, canonical queue/status/feedback derivation, learner resubmission and required-step publication gates. Never trust protocol-v1 nested `steps.status`, `reviewNotes`, or `reviewedAt` as instructor truth. Keep legacy fallback read-compatible without silent backfill.

Phase 2 is complete locally; see docs/sparkquest/REVIEW_SECURITY_PHASE_2.md. Next is designated-account mission and Showcase acceptance, then a clean coordinated SparkQuest client + Firestore rule release. No production test record or bulk migration is automatically authorized.

---

# Current task boundary — Review security release acceptance

Preserve learner creation, ordinary edits, proof submission and resubmission while keeping top-level review history, reviewer identity, feedback, XP and publication staff-controlled. Keep published projects closed to learner writes and route student-project writes by authenticated role. Do not widen project reads, bypass canonical learner identity, deploy the mixed worktree, or treat duplicated nested step review fields as a tamper-proof audit.

Phase 1 is complete locally; see docs/sparkquest/REVIEW_SECURITY_PHASE_1.md. Its protected per-step follow-up is now complete in Phase 2 above.

---

# Current task boundary — Instructor learner workspace acceptance

Preserve canonical learner ownership, source-specific learner reads, shared mission eligibility, additive `targetAudience.additionalStudents`, fresh transactional preservation in class/editor saves, draft gates and awaited assignment failures. Keep projects, available missions and review decisions distinct. Do not invent review history from legacy progress or infer learner identity from personal data. Local write-free fixture: `?designPreview=learnerDesk`.

Phase 1 is complete locally. Next is designated-account acceptance or a separately scoped visual/celebration/guardian/sharing phase, preserving existing unrelated work. No production test-record mutation, identity repair, rules/API changes or deployment is automatically authorized. Details: docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md.

---

# Previous task boundary — Review reliability acceptance

Preserve shared pending-proof selectors, explicit load/error/retry states, direct scoped review reads, proof-bound transactional decisions, idempotent command IDs, immutable stored workflow/review fields, versioned URL/note evidence history, confirmed learner submission and write-free fixtures. Do not restore whole-project learner setDoc saves or cached-project-only review dialogs.

Phase 1 is complete locally; see docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md. Next is designated-account acceptance or the separately scoped instructor student-profile/assignment workspace. No data repair, rule/API changes, public exposure or deployment is automatically authorized.

---

# Previous task boundary — Learner workspace acceptance

Preserve tenant/owner verification independently from new-mission enrollment targeting, current-year pin selection, immutable saved-project previews, read-only historical Field Log, scoped workspace palette, larger navigation, naming failure preservation, and write-free local fixtures.

The approved Phase 1 implementation is complete locally. Next requires direction: designated-account create/upload/review acceptance, or the remaining Pickup/Build Rhythm/nested game UI slice. No deployment, rules/API changes, production cleanup or Electron packaging is authorized automatically. See docs/sparkquest/LEARNER_WORKSPACE_PHASE_1.md.

---

# Previous task boundary — Mission Autopilot acceptance

Preserve the stable tenant/import-key document IDs, atomic workflow/mission creation, frozen snapshots, canonical student ID resolution, explicit requested-file removal, draft-first creation and separate assignment. Same-key existing missions must remain preserved; do not introduce silent updates or enrollment writes.

Next: designated instructor acceptance with the downloaded template, actual image/PDF uploads, optional assignment, learner start/proof/review and immutable snapshots. No release, production-data repair, ZIP bundles or existing-record update behavior is included automatically.

---

# Previous task boundary — Sparkbook learner destinations

The learner destination-shell migration is complete locally. Preserve the field-kit navigation model, visible mobile labels, verified-tenant gallery query, inline arcade/key feedback, accessible key removal dialog, and local-only preview fixtures. Do not restore dynamic Tailwind navigation classes, `makerlab-academy` fallbacks, native touched-surface alerts, or preview writes.

The next safe task is still designated-account end-to-end QA: create one clearly named structured mission, assign it, submit evidence, request a revision, approve it, and prove the frozen workflow snapshot. A later visual pass may migrate nested arcade players/game dialogs, Pickup, and Build Rhythm without changing their domain contracts.

---

# Previous task boundary — SparkQuest Phase 6 instructor-workflow release gate

The deep instructor workflow polish is complete locally. Preserve the authenticated actor and tenant on every project/configuration write, the shared instructor UI primitives, inline async failures, accessible confirmation/rejection dialogs, and explicit production-safe state classes. Do not restore anonymous sign-in, the `makerlab-academy` fallback, native destructive prompts, render-time Blob URL generation, or the embedded dark gamification shell.

The next safe task is designated-account QA: verify every instructor route at desktop and phone widths, create a clearly named test draft, assign it by grade/group/direct learner, confirm learner visibility and submission review, then delete only those designated test records. Coordinate any deployment with the pending Phase 3 Firestore/Storage release gate.

---

# Previous task boundary — SparkQuest Phase 5 instructor-workspace release gate

The instructor workspace coherence pass is complete locally. Preserve `FactoryPage.tsx` as the shared instructor UI source, the Operate/Build/Configure navigation model, tenant-bound configuration writes, canonical mission audience labels, and the class-progress path built from the Factory data layer. Do not restore raw grade-page Firestore reads, debug UI, fake assignment enrollments, unfinished impersonation/migration controls, or default-tenant fallbacks.

The next safe task is designated-account QA: verify every instructor route at desktop and phone widths, create a clearly named test draft, assign it by grade/group/direct learner, confirm learner visibility and submission review, then delete only those designated test records. Coordinate any deployment with the pending Phase 3 Firestore/Storage release gate.

---

# Previous task boundary — SparkQuest Phase 4 instructor-pipeline release gate

The instructor mission creation and assignment pipeline is complete locally. Preserve the canonical mission audience contract, tenant/audit fields, direct learner authority, and the rule that assignment never mutates Edufy enrollments. Do not restore personal-data learner merging, fake mission enrollments, localhost fallbacks, or the browser-global reset action.

The next safe task is release QA with designated test accounts: desktop/phone visual verification, create a test draft mission, assign by grade/group/direct learner, confirm learner visibility, and clean up only those designated test records. Coordinate any client deployment with the still-pending Phase 3 Firestore/Storage rule gate.

---

# Previous task boundary — SparkQuest Phase 3 production-readiness gate

Phase 3 is complete locally. Preserve demand-driven student startup, canonical learner ownership, direct-assignment priority, current-year project creation, non-retryable permission handling, resumable Storage uploads, and the scoped Storage path. Do not restore base64 evidence, enrollment-gated personal projects, hidden modal listeners, or broad student subscriptions.

The next safe task requires explicit release scope: obtain/run the Storage emulator runtime and prove upload/read/delete denials, review Firestore plus Storage rule deltas, then release the client and both rule sets together. Verify with a designated test learner and instructor after deployment. No production learner data repair or real-account test project creation is authorized by this phase.

The Phase 2 launch-session retention and read-only reconciliation gates remain open and must not be silently bundled with data repair.

---

# Previous task boundary — SparkQuest production-readiness gate

Phase 2 is complete locally. Preserve the one-time code exchange, exact-origin binding, issue/exchange revalidation, staff non-impersonation, default-off write flag, and PII-free reconciliation report. Do not restore raw `token` URLs or direct `?projectId=` Edufy launches.

The next safe task requires explicit production-readiness scope: prove issue/exchange/replay/revocation against isolated Auth and Firestore emulators, define retention for `app_launch_sessions`, then prepare an API/client release plan. Run the production reconciliation only with explicit authorization; it is read-only but accesses sensitive learner records. Do not repair or migrate records from the report without a later reviewed plan.

---

# Previous task boundary — SparkQuest rescue

Phase 1 is complete locally. Preserve `utils/appUrls.ts` and `sparkquest/domain/studentIdentity.ts` as the URL and learner-identity sources of truth. Do not restore anonymous kiosk access, demo/base64 bridges, default organization IDs, first-match profile selection, personal-data identity matching, project-title deduplication, or client-side user-profile repair.

Phase 2 was completed locally under the current boundary above. Existing `focus_sessions` and snapshot-listener permission errors still require a separate rules/data audit.

---

# Previous task boundary — Post-release verification

The consolidated Edufy operations/UI release is live on `origin/main` and Hostinger at commit `6652af16fd18f285436ece1984594c61d7c73e82`. The release includes the compact Education UI shell, Programs pause/resume controls, lifecycle-aware attendance/finance filtering, legacy school-cohort date inference, CRM template-slot and urgent custom-demo booking, and the existing invoice/service catalogue features from the prior main baseline. Existing records are preserved; no migration or production write was performed.

Validation passed: production build, membership lifecycle smoke, service catalogue smoke, remote `main` SHA, live HTML bundle hash and deployed feature markers. The automatic deployment ledger could not be updated because the environment denied write access to the skill-owned ledger; record this manually if required. The temporary release worktree should be removed when filesystem permissions allow it.

The next task must be explicitly scoped; do not treat the mixed local worktree as release-ready. Preserve `.env`, unrelated Admissions/provider work and local-only experiments.

---

# Current task boundary — Education UI coherence

The global UI coherence pass is complete locally. Continue from the compact single-row desktop shell and single-layer mobile navigation; do not restore the former stacked workspace-tab row. `components/education-ui/education-role-surfaces-v1.css` is the final product-wide coherence layer and intentionally loads after module styles. Dedicated module styles may keep semantic color, but large KPI surfaces should remain neutral unless a workflow-specific redesign justifies an exception.

No release, production data mutation, rule/index/API change or navigation callback change is part of this task. A later module-by-module workflow redesign may deepen Learning, Family Journey, Team, Resources and Platform without replacing this shared baseline.

---

# Current task boundary — StemQuest membership attendance

The non-destructive program lifecycle slice is live on `origin/main` and Hostinger at commit `fe1cd1a44996aa6b91f9b61a3f220d736f31c1dc`. Fixed programs derive `finished` after their shared end date; rolling MakerLab programs remain evergreen and use personal membership dates. Use `utils/membershipLifecycle.ts` as the canonical coverage policy and preserve date-sensitive historical attendance. Do not convert fixed school cohorts into individual renewals.

No follow-up is required for existing data. The next optional product step is an explicit prefilled “renew membership” action; automated family messaging remains a separate authorization and consent scope.

---

# Previous task boundary — Education UI and Finance completion

Implementation and local QA are complete. Promote only the approved final Education UI, cache recovery, invoice correction, independent F/S sequence management and clean-PDF deltas from the current `origin/main`; do not merge the divergent feature branch or include `.env`, unrelated Admissions work, provider code, production data, or additional rules/index/API changes.

After release, verify the remote SHA, the live uncached HTML and `sw.js`, then verify a fresh browser renders the new Edufy shell. An authenticated live invoice write is not part of release verification.

---

# Previous task boundary — Service Catalogue

The urgent local service-catalogue/invoicing phase is complete. Read `docs/finance/SERVICE_CATALOGUE_PHASE_1.md`, `docs/finance/DECISIONS.md` and `docs/finance/KNOWN_ISSUES.md` before continuation. No deployment, import into production or expansion of invoice staff permissions is authorized by this phase completion. A future staff-access phase must align the existing invoice UI permissions with document/counter/enrollment/credit-note backend rules together.

The previous Admissions next-task instructions are preserved below for a separately requested Admissions continuation.

---

# Active Task

## Next safe task

Phase 7 is optional official WhatsApp provider readiness. Inspect existing server/communications capabilities and identify the available approved provider/business account before implementing a connection. Account provisioning, secrets, provider subscriptions and real message sending are not authorized by a generic phase continuation.

The assisted wa.me workflow is complete as a development preview. The original daily-operations need still has a separate gap: scheduled tasks (owner/due date/completion) and editable lifecycle transitions remain closed. If the optional provider is deferred, scope this operational command slice or Phase 8 hardening explicitly instead of implying these features already exist.

## Required context

- docs/admissions/WHATSAPP_ASSISTED_OPERATIONS.md
- docs/admissions/IMPLEMENTATION_PLAN.md
- docs/admissions/DECISIONS.md
- docs/admissions/KNOWN_ISSUES.md
- modules/admissions/AGENT_CONTEXT.md
- Current command, persistence and Firestore rules/emulator tests
- Existing Communications and API handlers relevant to the selected provider

## Guardrails

- Keep launch, operator sent confirmation, provider delivery/read and inbound parent response distinct.
- Preserve tenant/case identity, durable consent/opt-out and idempotency.
- No browser provider secrets or phone-only case matching.
- Do not deploy local rules or the development preview implicitly.
- Preserve the mixed worktree and unrelated changes, especially .env.
- Run scoped security/behavior tests and update handoff before closing the next phase.
# Current task boundary — Parent login repair and release

Complete the focused parent access hotfix in an isolated worktree. Verify synthetic Auth/Firestore family and tenant behavior, build Edufy, then release only the reviewed app paths if the registered release gates pass. Do not mutate a real family's account as a test. Record the API and Hostinger client release status separately. Resume multi-tenant ownership work after this phase.

---
## Current task — user review of Phase 1 reference — 2026-10-20

Present the local global shell, Student Details, complete student form and animated 011Y guide for visual approval. Use `http://127.0.0.1:5202/` for the signed-in real-data read-only review and `http://127.0.0.1:5203/` for the safe demo. Do not begin Settings, Finance or Expenses until approval. Read `docs/education/EDUFY_SHELL_STUDENT_GUIDE_PHASE_1_2026-10-20.md`. No deploy or push.

---
# Current task — Parent and care-group experience correction (2026-10-24)

Complete the user-requested family-first Parents module correction and coordinated Edufy client/trusted API release. Preserve generated MakerLab login IDs, explicit relationship verification, tenant boundaries, existing primary family logins, Finance ownership and real family records. Verify the release without creating or modifying a production family.

## Parent multi-child account repair — 2026-10-26

Local candidate fixes the legacy parent-name conflict during exact-account sibling transfer and shows recoverable family logins in the staff directory. Synthetic emulator, SparkQuest family smokes and Edufy build passed in the source checkout. The integrated release candidate remains local under the user's current release hold. No production family write was made. Before a coordinated API/client release, confirm the exact DAKY login to retain and complete staff and parent-session acceptance. See `docs/parent/MULTI_CHILD_ACCOUNT_REPAIR_2026-10-26.md`.

---
## Current parent-family task — new shared DAKY account (2026-10-28)

The user directed one new SparkQuest parent account for Kamyl and Nassym DAKY and deletion of their two old Auth logins. A focused local `replaceFamily` candidate is implemented and passes the demo Auth/Firestore suite and Edufy build. No production family record changed. Next: coordinated trusted API and Edufy client release, designated staff identity/relationship check against exact learner records, live replacement, then real SparkQuest two-child and old-login denial acceptance. Read `docs/parent/MULTI_CHILD_ACCOUNT_REPAIR_2026-10-26.md`. Preserve the separate UI release hold and do not mix unrelated module changes.

---
## Parent Access code release approved — 2026-10-28

The user explicitly lifted the local hold for the DAKY correction and authorized publication of the trusted Parent Access API with the Edufy client. Release only the reviewed parent-account commits through the registered `origin/main` process. Do not create, move, or delete the real DAKY accounts as a deployment test; the signed-in staff workflow and SparkQuest two-child/old-login acceptance follow publication. The separate workshop and wider UI candidates remain outside this release.

---
## Active task — Instructor Pass production integration, 2026-10-29

Complete the coordinated Edufy/Instructor Pass release from the clean integration worktree. The app and Firestore rules must be promoted together. After deployment, verify a dated workshop and a STEMQuest group on real instructor accounts, including reassignment and alert visibility. Keep unrelated dirty checkouts untouched. See `docs/education/WORKSHOP_REQUEST_TO_INSTRUCTOR_2026-10-26.md`.

---

\r\n