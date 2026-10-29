## 2026-10-20 — Learning and Portfolio remaining acceptance

The full local 390px/1440px light/dark page/dialog matrix and nested save paths passed only in a synthetic fixture. The older `Proof of Work Required` dialog is unreachable from the current staff-managed path; reachable step evidence editing was tested. Real school loading/listener errors, learner-specific data and permissions, real write outcomes, SparkQuest destinations and physical-phone behavior remain unverified. Keep the release hold; see `LEARNING_PORTFOLIO_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`.

## 2026-10-20 — Learning and Portfolio acceptance boundary

This isolated branch has synthetic browser coverage only. An authenticated staff and learner read-only tour, real populated/empty/error data, external SparkQuest destinations, permission combinations and physical-phone behavior remain unverified. No real write was attempted. The `track` source branch and old learner wizard are not destinations of the current staff navigation. Repository-wide TypeScript still reports existing `ProjectTemplate.stepResources`, optional Firestore `db` and legacy `StationType` errors in Learning files; production build and 27 Education checks pass. See `LEARNING_PORTFOLIO_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`.

## 2026-10-20 — Expenses acceptance boundary

No blocking issue was found in exercised Expenses UI paths. The current signed-in October 2026 ledger has no expenses, so populated records, receipt viewing, save/failure flows and delete confirmation were checked synthetically. Real financial writes and deletion were not performed. AppContext does not expose optional Expenses listener failure as a distinct module error, so the module-level error state is only validated with a fixture. Real restricted-role, physical-phone and populated-ledger acceptance remain open. See `EXPENSES_DESIGN_SYSTEM_V1_2026-10-20.md`.

## 2026-10-20 — Settings acceptance still open

The signed-in Administrator read-only category audit now covers all seven available Settings categories and loaded school panels on desktop and at 390 CSS pixels. Five staff accounts, four role views, and add/edit dialogs were inspected without submitting changes. Super-admin, learner and restricted-role sessions, real empty/error states, consequential confirmations and a physical phone remain unchecked. Isolated CSV and logo inputs pass valid, invalid, no-selection and mocked failure checks through local fixtures. Synthetic screenshots cover 1440px/390px light/dark categories and role/state branches. The uncommitted expanded Design System checker and shared module bridge belong to other in-progress module work; the focused Settings commit relies only on its own stylesheet. See `SETTINGS_DESIGN_SYSTEM_V1_2026-10-20.md`.

## 2026-10-20 — Full visual completion remains module-specific

The recording-visible Classes, Programs and Finance inconsistencies are repaired locally, but untouched Settings, Expenses and remaining legacy-heavy pages still need a page/form/dialog inventory and signed-in visual audit. The focused real-account check was read-only; no financial or domain write was accepted. Existing large-bundle warnings remain.

## 2026-10-19 — Design System v1

Design System v1 awaits visual acceptance and physical-phone review. Repository-wide TypeScript has pre-existing errors outside the changed files. Synthetic saves and real-account read-only checks are separate; no real save acceptance claimed. Unfinished Admissions/Workshops work is preserved. Existing profile tabs/payment dialogs/later modules are not covered by the three-reference milestone.

## Dashboard educational pass complete — 2026-10-19

No blocker in exercised Dashboard UI paths. Real payment saving, transfer upload, WhatsApp and workshop conversion remain untested by design. The synthetic dashboard passes fixture summaries and does not validate real data calculations. Other role dashboards and module forms remain separate scope. Existing bundle warnings remain. See `DASHBOARD_EDUCATIONAL_2026-10-19.md`.

## Calendar educational pass — 2026-10-19

No blocker found in exercised Calendar UI paths. Current real-account week has no sessions, so populated-session and assignment checks were synthetic only. Real synchronization and assignment acceptance remain untested. Existing large bundle warning remains. See `CALENDAR_EDUCATIONAL_2026-10-19.md`.

## Programs full workspace — 2026-10-19

No blocking issue found in the exercised Programs UI paths. Real-account saves, enrollment conversion, financial writes, rollover execution and printing were deliberately not exercised; they are not certified by synthetic navigation checks. Existing large-bundle warning remains. Refresh an already-open local app tab to load the latest detail code. See `PROGRAMS_WORKSPACE_2026-10-19.md`.

# Education UI known issues

## Three-module visual pass complete - 2026-10-19

Students directory/overview, Programs catalog/workspace and Attendance register are complete locally in the approved educational direction. The latest user correction requires neutral metric cards, lime/green identity, blue actions and restrained #FF9600 orange warning cues. Preserve the adopted Notion-style navigation and all domain/write handlers. Current evidence is *-balanced-*.png; earlier saturated orange screenshots are superseded. Read docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md before continuing. Actual app: http://127.0.0.1:5202/. Signed-in read-only desktop navigation was checked; synthetic save tests are separate. No deployment. Full student profile editor styling and later modules remain subsequent scope. Stop at this batch handoff; heartbeat paused.


## Programs visual milestone - 2026-10-19

Students and Programs are complete locally in the approved educational style. Next: Attendance. Preserve Notion-style navigation, existing workflows and handlers. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md for synthetic evidence and acceptance limits.


## Approved rollout - 2026-10-19

The user approved the Pickup visual direction while explicitly preserving the adopted Notion-style navigation and operational UX. Proceed sequentially Students, Programs, Attendance; approval gate is lifted for these modules. Heartbeat is ACTIVE with this updated scope.

Students directory and learner overview are complete locally. Next: Programs, then Attendance. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md. No push/deploy or domain/auth changes.


## 2026-10-19 - Pickup full palette revision

Palette revision is ready for user review. Validation remains synthetic; actual school-account and physical-phone acceptance are pending. Other modules and heartbeat stay paused.

## 2026-10-19 — Pickup educational style study

Pickup style study awaits final visual acceptance. Browser checks use synthetic data; real-school and physical-phone checks remain pending. The reused Rive runtime adds its WASM and licensed animation assets; no new dependency was added.

## 2026-10-16 — Pickup acceptance boundary

Pickup local synthetic checks are complete. Signed-in school-account and physical-phone acceptance remain pending; the isolated harness does not prove Firestore persistence/rules or real-app-shell layout. Existing 235 TypeScript diagnostics remain unchanged. No release performed.

## 2026-10-16 — Classes and Students acceptance

Synthetic checks and captures pass. Signed-in filters, role/persistence acceptance and physical-phone review remain pending. The existing 235 TypeScript diagnostics are unchanged. See docs/education/EDUFY_PULSE_CLASSES_STUDENTS_2026-10-16.md.

## 2026-10-16 — Refined Attendance acceptance

Latest Attendance render/CSS owners remain `views/AbsenceView.tsx` and `views/school-day/education-attendance-pulse.css`; shared tokens, handlers and persistence are unchanged. Read `docs/education/EDUFY_PULSE_ATTENDANCE_VISUAL_2026-10-16.md` and its `refined-*` screenshots before further work. This pass trades some compactness for a clearer register structure; signed-in and physical-phone acceptance remain open. Do not extend the pattern to other modules before the Attendance benchmark is accepted.

## Pulse Attendance acceptance and credential finding

Actual-view and real-AppProvider synthetic browser checks pass; signed-in school-account persistence, permissions, large-batch partial failures and physical-phone acceptance remain unverified. Initial offline Attendance waits for a server snapshot. Existing 235 TypeScript errors and Tailwind CDN/build warnings remain.

Security finding reported immediately: `views/student-details/AccessAndAccountsTab.tsx` reveals the stored learner `loginInfo.initialPassword` on Show. No credential value was accessed. Secure server-issued reset/invitation and retention review require a separate authentication change; the current UI milestone does not remove or migrate credentials.

## Learning and Portfolio signed-in review

The 390 px light/dark check used a write-free visual fixture. A real instructor must verify submitted counts, mission creation and portfolio routing; a learner must verify their own project deep link and submitted state. This designer checkout has no designated school credentials. Portfolio's existing email/UID matching was not changed in this UI phase, and the broader Learning and Review internals retain their earlier TypeScript diagnostics and workflow limitations.

The current Wi-Fi address changed during this phase and Windows reports the network as Public. The local Vite preview responds on loopback, but the LAN address times out. A subnet-limited inbound rule for port 5202 was denied because this process lacks administrator rights; the physical-phone check therefore remains unavailable until the operator restores LAN access.

## Finance and Expenses signed-in review

A designated school account must review Finance and Expenses in both themes on desktop and phone, including real paid, pending, due and weekly recurring examples. This local phase did not write or edit a production ledger record. The Expenses summary retains its established accounting aggregation of stored records, including pending entries; any change to financial interpretation requires a separate finance-domain decision.

## Local preview after loading parity

The local build and HTTP/Vite response prove that the copied loading code is served, but they do not prove a signed-in school's records appear in the intended order on a physical phone. A designated staff account must check that essential data appears before entry and optional module data arrives afterward.

## Admissions and Workshops signed-in review

A designated school account must verify the family priority, attended-booking queue, exact workshop title/date, light/dark contrast and phone scrolling with real records. Contact, enrollment and CRM writes were not exercised against production data during this visual phase. Existing legacy cases can have missing contact or booking links; the established repair flags and guarded actions remain the source of truth.

## School-day signed-in review

Classes, attendance and Schedule need a designated staff account on desktop and phone to verify real tenant day labels, coverage counts, theme contrast and narrow-screen scrolling. Assignment and attendance writes were not run against production records for visual QA. The local candidate remains unreleased.

## Signed-in acceptance

This worktree has no designated school credentials. A staff account must check Programs, Students and Pickup with real tenant data in both themes on desktop and phone. The local server is available on the same Wi-Fi, but its IP address can change. No pickup release should be executed solely for visual review.

## Repository-wide checks

The production build and touched-file TypeScript scan pass. Whole-repository TypeScript still reports unrelated existing diagnostics; bundle and mixed Firebase import warnings remain. This focus pass does not change those areas.

## Remaining modules

Other modules have a coherent shared shell but should not be described as having a finished task-level redesign. Their order is recorded in `PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.
## 2026-10-20 — Phase 1 acceptance boundary

Visual approval and a physical-phone review remain pending. Real-account checks were read-only; no student form, payment, enrollment or credential action was submitted. Existing large bundle and mixed Firebase import warnings remain. Broad generic module edits are preserved outside the focused Phase 1 commit and require later module-by-module reconciliation.

## 2026-10-20 — Programs integration acceptance

The Programs synthetic preview confirms light/dark layouts, empty and view-only catalog, all detail tabs and quote validation at desktop and 390 CSS px. The signed-in base app was toured read-only with real records; candidate styling against real data, restricted role branches, physical phone behavior and synthetic write success/failure paths remain unverified. This isolated worktree cannot complete a production build with its current linked dependencies because `@rive-app/webgl2/rive.wasm` is absent; run the final build after integration in a checkout with complete dependencies.

## Student Details Design System v1 acceptance boundary — 2026-10-20

The isolated fixture proves visual and interaction states, including the App-owned new-enrollment/record-payment markup and synthetic payment-proof URL. No designated signed-in school session was available in this follow-up. Real tenant data, return-to-Students filter/scroll restoration, physical-phone behavior and actual App submit handlers remain unverified; no school write was attempted. The individual-payment handler currently relies on native required fields and enrollment selection, without a positive-amount, check-detail or transfer-proof gate. Any financial validation change needs its own domain review. The downstream Activity Details proof overlay has no explicit Close control and needs keyboard/focus review. The previously recorded learner `loginInfo.initialPassword` exposure remains an authentication/security follow-up outside this visual migration; no credential value was accessed in the fixture or a school account.
## 2026-10-20 — Attendance acceptance boundary

Synthetic checks cover individual and batch saves, failure/retry, clear/cancel, permission display and responsive layouts. Real writes, restricted-role sign-in, actual report print/WhatsApp handoff, shared confirmation focus containment, multi-chunk batch failure and physical-phone testing remain open. FaceID Attendance is a visual preview with no connected recognition or scan persistence. See `ATTENDANCE_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`.
## 2026-10-22 — Toolkit acceptance boundary

The isolated Toolkit fixture covers visual states and in-memory actions, but the signed-in local app was unavailable for a real-account read-only check. Real admin/restricted role, physical phone, external provider and consequential write acceptance remain open. AppContext lacks an error callback for `assets` and `tool_links` listeners, so a dataset-specific Firestore failure cannot be surfaced through Toolkit alone. Clipboard rejection is available in the fixture but was not exercised. See `TOOLKIT_DESIGN_SYSTEM_V1_2026-10-22.md`.

## 2026-10-26 — Workshop request release gate

The current-main candidate is locally verified but not live. `firestore.rules` is a protected release path under `$hostinger-main-release`; deploy the transitional public-booking status rule and same-tenant `class_sessions` read rule before the client. Ayoub's existing dated workshop appeared on the signed-in local Pass, but fresh two-instructor, alert, cancellation and physical-phone acceptance remain open. Closed-app push notifications are not configured; the durable inbox is the delivery record. Template-wide default instructor editing is outside this slice. See `WORKSHOP_REQUEST_TO_INSTRUCTOR_2026-10-26.md`.
## 2026-10-29 — Instructor Pass release acceptance

The repaired `class_sessions` rule and app are local until coordinated release. Real Ayoub/second-instructor assignment, reassignment, alert timing, and phone acceptance are still unverified. Pass notifications while the app is closed require a later push implementation; the current in-app inbox is durable and optional browser notifications work while the Pass is open.

## 2026-10-30 — Public landing release boundary

The light, screenshot-free public landing is verified locally through the isolated preview fixture and production build. Live CDN/browser-cache verification remains required after this release. Existing Firebase mixed-import and large-chunk warnings remain unrelated.

\r\n
