## 2026-10-20 — Learning project write and review behavior

Use current form values when saving a commit or step edit, and keep the editor open with its draft after a failed write. A staff edit of an existing learner project retains the project's learner ID/name. Submission and review controls expose pending state; failed review keeps feedback. Treat review status as saved after its write succeeds even if a later badge/notification side effect fails, and ask the reviewer to inspect the project before retrying. Historical versions without a step snapshot cannot offer Restore. See `LEARNING_PORTFOLIO_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`.

## 2026-10-20 — Learning and Portfolio interaction contract

Keep the five Learning workflow destinations and their existing data/permission handlers. Expose Studio's three existing views and mount the managed student project dialog at the staff Learning root so card actions remain reachable. Setup owns workflow, station and badge editors regardless of the selected setup tab; a failed save retains the draft with inline feedback. Use module-scoped Design System CSS and accessible control names without changing portfolio XP or badge rules. See `LEARNING_PORTFOLIO_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`.

## 2026-10-20 — Expenses workspace contract

Keep the five working views inside Expenses: overview, expense register, recurring charges, category insights and templates. Use canonical Education primitives and a scoped Expenses stylesheet; preserve existing payment/expense/template handlers, role and tenant checks, CSV fields and financial formulas. Treat weekly recurring templates as manual because their stored shape lacks an occurrence weekday/count. Separate synthetic write verification from signed-in read-only inspection. See `EXPENSES_DESIGN_SYSTEM_V1_2026-10-20.md`.

## 2026-10-20 — Settings owns its Design System styling

Settings uses canonical Education primitives with `views/settings/education-settings-v1.css` scoped under `edu-settings-v1`. It does not import the separate untracked shared module bridge. Keep the existing tenant, auth, role, import/export and repair handlers; show pending, success, error and permission states next to their controls. Treat signed-in read-only integration as a separate acceptance gate from the synthetic write-flow preview. See `SETTINGS_DESIGN_SYSTEM_V1_2026-10-20.md`.

## 2026-10-20 — Legacy components are incomplete migration

When a page uses the new shell but retains generic tables, tabs, buttons or saturated module heroes, treat it as unfinished rather than a valid module variation. Reuse canonical tabs, registers, status pills and actions. Keep green for identity, blue for operations, orange for attention, purple for program/category context and dense records neutral. Component semantics and workflow hierarchy take priority over page-level CSS decoration.

## 2026-10-19 — Design System v1

The user chose one shared six-color palette, contextual 011Y and dashboard + register + full form validation. Adopt canonical shared tokens and typed action/status/accent variants; one foundation owner, disjoint module ownership after visual approval. No further rollout until the reference is accepted.

## Dashboard educational pass complete — 2026-10-19

Keep the dashboard as an operational entry point with the adopted navigation. Neutral metrics, lime focus area, blue actions, orange attention only. Preserve all summary calculations and domain handlers. Use progressive disclosure instead of silently truncating queues. Fix dialog clipping locally through animation fill/overflow, without changing the shared Modal component. Payment styling applies to its existing form via one scoped class.

## Calendar educational pass — 2026-10-19

Keep weekly totals independent of visible filters. Default phone screens to Agenda; retain Week as an explicit choice. Reuse one session-card renderer and the existing assignment modal/handlers. Use orange for missing coverage cues, green for identity/today and blue for actions/classes. See `CALENDAR_EDUCATIONAL_2026-10-19.md`.

## Programs full workspace — 2026-10-19

Programs extends the approved navigation and domain workflows. Keep dialogs outside catalog/detail conditional rendering. Roster filters affect display only; exports stay full-roster with an explicit label. Existing edit/enrollment capabilities gate UI controls. Orange signals attention through small accents, not solid repeated metrics. See `PROGRAMS_WORKSPACE_2026-10-19.md`.

# Education UI decisions

## Three-module visual pass complete - 2026-10-19

Students directory/overview, Programs catalog/workspace and Attendance register are complete locally in the approved educational direction. The latest user correction requires neutral metric cards, lime/green identity, blue actions and restrained #FF9600 orange warning cues. Preserve the adopted Notion-style navigation and all domain/write handlers. Current evidence is *-balanced-*.png; earlier saturated orange screenshots are superseded. Read docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md before continuing. Actual app: http://127.0.0.1:5202/. Signed-in read-only desktop navigation was checked; synthetic save tests are separate. No deployment. Full student profile editor styling and later modules remain subsequent scope. Stop at this batch handoff; heartbeat paused.


## Programs visual milestone - 2026-10-19

Students and Programs are complete locally in the approved educational style. Next: Attendance. Preserve Notion-style navigation, existing workflows and handlers. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md for synthetic evidence and acceptance limits.


## Approved rollout - 2026-10-19

The user approved the Pickup visual direction while explicitly preserving the adopted Notion-style navigation and operational UX. Proceed sequentially Students, Programs, Attendance; approval gate is lifted for these modules. Heartbeat is ACTIVE with this updated scope.

Students directory and learner overview are complete locally. Next: Programs, then Attendance. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md. No push/deploy or domain/auth changes.


## 2026-10-19 - Pickup full palette revision

Use the supplied palette across labeled Pickup statuses: orange arrivals, blue incoming, purple learner-ready, green released, yellow attention. Keep this scoped to Pickup until final user acceptance.

## 2026-10-19 — Pickup educational style study

The user rejected the classical rendering and requested the supplied Duolingo visual direction on Pickup only. Preserve the workflow and adopted mascot. Await final acceptance before extending the style; heartbeat remains paused.

## 2026-10-16 — Pickup register priority

Use the approved Attendance register direction for Pickup: preserve handoff state and security controls, remove duplicate metrics, keep scheduled learners discoverable. Scope all visual corrections to Pickup; use shared theme tokens. Programs follows this completed local milestone.

## 2026-10-16 — Reuse the operational Pulse language

Use real session times to structure Classes, and real learner issue categories to structure Students. Avoid decorative dashboard cards above the working lists. User authorized automatic local progression; release remains separate.

## 2026-10-16 — Use a session rail and continuous register

Latest Attendance render/CSS owners remain `views/AbsenceView.tsx` and `views/school-day/education-attendance-pulse.css`; shared tokens, handlers and persistence are unchanged. Read `docs/education/EDUFY_PULSE_ATTENDANCE_VISUAL_2026-10-16.md` and its `refined-*` screenshots before further work. This pass trades some compactness for a clearer register structure; signed-in and physical-phone acceptance remain open. Do not extend the pattern to other modules before the Attendance benchmark is accepted.

## 2026-10-16 — Edufy Pulse migration

Pulse is an internal evolution of the existing Education/Atlas system, not a new public brand or component library. Retain the approved blue, DM Sans, light/dark foundations; add compatible tokens and an opt-in compact header. Attendance is the first complete benchmark per the supplied mission. Keep all counts but let the working roster lead. Wait for write acknowledgement before changing locally affected displayed statuses. Expose readiness from the existing Attendance listener so a cached empty response is not a markable roster; do not move Attendance into the overall login gate. See `EDUFY_PULSE_ATTENDANCE_2026-10-16.md`.

## 2026-10-16 — Learning and Portfolio

- After daily operations and Finance/Expenses, make the instructor Learning entry act on existing submitted projects before aggregate counts. Reuse its review, curriculum, studio and portfolio routes.
- Keep Portfolio's next-step focus to learners. Staff may reach the Portfolio route through Maker Pro, but its self-project selector does not represent an instructor-wide queue.
- Use SparkQuest's existing student `?projectId=` route for an owned project; do not change SparkQuest routing, status or review workflow in this visual phase.
- Scope the two-theme and 390 px work to Learning/Portfolio surfaces. Keep identity reconciliation and all mutation handlers untouched.

See `LEARNING_PORTFOLIO_FOCUS_2026-10-16.md` and `UI_DESIGN_DELIVERY_MAP_2026-10-16.md`.

## 2026-10-16 — Finance and Expenses

- Follow Admissions and Workshops with Finance and Expenses because collection and recurring obligations affect daily school operations.
- Preserve Finance's existing task-first routing; place Expenses' actual recurring obligations before its aggregate metrics.
- Derive paid/pending status from the stored expense record. A pending linked expense routes to ledger review instead of offering a second payment.
- Use the shared school theme tokens for both light and dark; keep the existing expense validation and permission-gated write handlers.

See `FINANCE_EXPENSES_FOCUS_2026-10-16.md`.

## 2026-10-16 — Preview follows the live loading contract

- Carry the exact live loading repair into the designer checkout before further visual review. Four essential school snapshots gate entry; optional module listeners hydrate afterward.
- Preserve the current Admissions and Workshops UI commit. Treat real-account data arrival on the phone as an acceptance check, not as proof from an HTTP response.

## 2026-10-15 — Family conversion workflow

- After school-day operations, prioritize Admissions and Workshops. Use the canonical tenant-safe Today selector for a family's next conversation, and attended bookings for Workshop follow-up.
- Keep "time since activity" separate from a due date. A legacy lead without a task date must never be presented as overdue.
- Use existing WhatsApp, enrollment and CRM actions after an operator click. Do not infer delivery, merge families by phone, or create enrollment/Finance facts inside a visual pass.
- Use school theme tokens for focused surfaces; keep the passport and the full workshop calendar available.

See `ADMISSIONS_WORKSHOPS_FOCUS_2026-10-15.md`.

## 2026-10-15 — School-day operational priority

- Follow Programs, Students and Pickup with Classes, attendance and Schedule as one school-day phase. Use existing live selectors and the local device date.
- Surface only the actual next action: today's class/roster, selected-day attendance marks or unassigned instructor coverage. Keep metrics below the action.
- Reuse a small weekday normalizer across these screens so French and English labels have the same attendance and planning interpretation.
- Preserve existing write handlers and enforce their current manager permission in visible schedule controls. Keep light/dark styles scoped to school-day modules.

See `CLASSES_ATTENDANCE_SCHEDULE_FOCUS_2026-10-15.md`.

## 2026-10-15 — First three operational modules

- Prioritize Programs, Students and Pickup in that order for this local candidate. The next operational pass is Classes and attendance, then Schedule.
- Derive each lead action from the module's existing tenant-scoped projections; do not introduce showcase counts or write new records for visual design.
- Keep the school workspace's light and dark tokens. Scope module expression to its real task: portfolio setup, learner next step, or verified gate handoff.
- Keep the full learner profile route on the learner row. Use a separate labelled preview for the selected passport.
- Keep Pickup's authorization and state transitions intact. Bring dated live handoffs before the full roster and surface incompatible legacy waiting records as staff review.

See `PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.
## 2026-10-20 — One global shell and contextual 011Y

Use a compact persistent rail with an overlay workspace panel. Pages own only local module tabs. Stop consuming global working tabs. Nested mobile details rely on a page back action and temporarily remove the bottom navigation. `EducationGuide` is the only new 011Y integration contract; page state changes drive short Rive reactions and a stable resting expression. Phase 1 approval precedes Settings, Finance and Expenses.

## 2026-10-20 — Programs semantic status and theme scope

Use orange attention only for an actual setup gap, unplaced learner or waiting follow-up. Keep routine program structure on neutral surfaces, with existing green identity and blue actions. Resolve older Programs utility colors through module-scoped Design System tokens in every detail tab and portal dialog; leave financial/enrollment data interpretation and write handlers unchanged. Do not show an Enroll action where the host has no enrollment callback.

## 2026-10-20 — Student Details visual contract

Use the existing Design System v1 opt-in and semantic tokens inside Student Details child surfaces. Keep source selectors, calculations, handlers and the parent App-owned enrollment/payment workflows in their current owners. Derive the 011Y next step from recorded student state; display only recorded skills/projects in the learner preview. Match visible write controls to the route's existing permissions. The isolated fixture is visual and interaction evidence, while signed-in school data remains its own acceptance gate. See `STUDENT_DETAILS_DESIGN_SYSTEM_V1_2026-10-20.md`.

The follow-up fixture mounts the actual enrollment wizard and extracts the payment modal JSX from `App.tsx` at build time. Its callbacks deliberately stub persistence and model only the App handler's existing validation gates. Keep financial calculation, payment clearance and enrollment authority in their existing App/domain owners. This fixture is not evidence of real submit-handler or school-data acceptance.
## 2026-10-20 — Attendance presentation and preview truth

Keep the daily Attendance register's date, session, selection and write handlers as the sole operational path. Use neutral record surfaces and canonical status colors, with orange limited to late/renewal follow-up. In the installed FaceID app, label the local toggle as a preview because its camera, recognition and scan persistence are not connected. See `ATTENDANCE_DESIGN_SYSTEM_V1_COMPLETION_2026-10-20.md`.
## 2026-10-22 — Toolkit Design System v1 scope

Toolkit opts into the canonical Education System on both routes, including under the legacy-shell query. Use Education primitives and Toolkit-scoped token layout; retain organization/role guards, Firestore transactions and external provider boundaries. Keep synthetic write verification distinct from signed-in read-only acceptance. See `TOOLKIT_DESIGN_SYSTEM_V1_2026-10-22.md`.

## 2026-10-26 — Workshop request transition

Keep a newly submitted public booking and its capacity increment in one idempotent transaction, with status `requested`. During rollout, allow both `confirmed` and `requested` in the public create rule so an open older client remains functional. Assign instructors to dated workshop slots and program groups; confirmation requires an assigned active instructor. A dated slot remains authoritative if the reusable template later changes day or time. Persist instructor alerts atomically with assignment and booking changes; browser notifications supplement the Pass inbox only while it is open. Grant same-tenant staff read access to `class_sessions` for Pass projection; leave its write permissions unchanged. Open WhatsApp as a manual draft without recording delivery. See `WORKSHOP_REQUEST_TO_INSTRUCTOR_2026-10-26.md`.
