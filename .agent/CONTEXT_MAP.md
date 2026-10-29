## Design System v1 source of truth — 2026-10-19

Contract: docs/education/design-system-v1/README.md. Canonical scoped tokens: components/education-ui/education-system-v1.css. Typed primitives: components/education-ui/EducationPrimitives.tsx. Form reference: components/students/StudentDetailsForm.tsx and components/enrollment/EnrollmentWizard.tsx. View-state owner: components/education-ui/useWorkspaceViewState.ts. Review harness: scripts/preview-education-system.mjs; evidence: docs/education/pulse-evidence/ds-v1-*.png. Report and rollout gate: docs/education/design-system-v1/IMPLEMENTATION_REPORT.md. Existing domain owners and .agent SOT entries remain authoritative. No module-local palette reinvention.

## Dashboard educational pass complete — 2026-10-19

Dashboard phase: `docs/education/DASHBOARD_EDUCATIONAL_2026-10-19.md`; UI `views/dashboard/EducationDashboardV1.tsx`; scoped palette `views/dashboard/education-dashboard-playful.css`; isolated QA `scripts/preview-pulse-dashboard.mjs`.

## Calendar rendering source of truth — 2026-10-19

`views/CalendarView.tsx` and `views/school-day/education-calendar-playful.css` own the latest weekly/agenda presentation. Existing AppContext session feed, assignment/sync commands and attendance.manage remain authoritative. See `docs/education/CALENDAR_EDUCATIONAL_2026-10-19.md`; synthetic harness `scripts/preview-pulse-calendar.mjs`.

## Current Programs source of truth — 2026-10-19

`docs/education/PROGRAMS_WORKSPACE_2026-10-19.md` documents the complete Programs workspace pass. Implementation: `views/ProgramsView.tsx`, `views/ProgramDetailsView.tsx`, module-scoped `views/programs/education-programs-workspace.css`. Browser evidence: `docs/education/pulse-evidence/programs-workspace-*`. Earlier catalog-only milestones are historical.

## Three-module visual pass complete - 2026-10-19

Students directory/overview, Programs catalog/workspace and Attendance register are complete locally in the approved educational direction. The latest user correction requires neutral metric cards, lime/green identity, blue actions and restrained #FF9600 orange warning cues. Preserve the adopted Notion-style navigation and all domain/write handlers. Current evidence is *-balanced-*.png; earlier saturated orange screenshots are superseded. Read docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md before continuing. Actual app: http://127.0.0.1:5202/. Signed-in read-only desktop navigation was checked; synthetic save tests are separate. No deployment. Full student profile editor styling and later modules remain subsequent scope. Stop at this batch handoff; heartbeat paused.

## Approved rollout - 2026-10-19

The user approved the Pickup visual direction while explicitly preserving the adopted Notion-style navigation and operational UX. Proceed sequentially Students, Programs, Attendance; approval gate is lifted for these modules. Heartbeat is ACTIVE with this updated scope.

Students directory and learner overview are complete locally. Next: Programs, then Attendance. See docs/education/EDUCATIONAL_ROLLOUT_2026-10-19.md. No push/deploy or domain/auth changes.

# Context Map

## Parent accounts and public booking repair — 2026-10-24

Read `docs/parent/PARENT_FAMILY_MODULE_2026-10-24.md`, `docs/workshops/PUBLIC_BOOKING_REPAIR_2026-10-24.md`, `views/ParentsView.tsx`, `api/parent-access/index.js`, `services/publicWorkshopBooking.ts`, and the public booking section of `firestore.rules`. Contact email is never a login identity. New family Auth accounts must use generated MakerLab IDs. Learner links require explicit same-tenant selection and staff relationship verification. Booking and capacity must remain one atomic transaction.

The corrected Parents workspace is family-first: contact groups are review candidates, generated Auth accounts are access credentials inside the group, and one learner may have several explicitly verified caregivers. Secondary-care access uses `parentUids` plus canonical `guardian_links` and must not replace `parentLoginInfo`; use transfer/repair only when changing the primary login.

## Latest Pulse continuation — Programs next

Read docs/education/EDUFY_PULSE_PICKUP_2026-10-16.md. Pickup is complete locally; continue Programs without repeating earlier passes. Preserve existing lifecycle handlers and separate local synthetic checks from real-school acceptance.

## Pulse module continuation

Read docs/education/EDUFY_PULSE_CLASSES_STUDENTS_2026-10-16.md and its module preview harness. Continue Pickup next under the user’s explicit automatic-progression authorization; retain synthetic-versus-real acceptance boundaries.

## Pulse Attendance visual refinement — 2026-10-16

Latest Attendance render/CSS owners remain `views/AbsenceView.tsx` and `views/school-day/education-attendance-pulse.css`; shared tokens, handlers and persistence are unchanged. Read `docs/education/EDUFY_PULSE_ATTENDANCE_VISUAL_2026-10-16.md` and its `refined-*` screenshots before further work. This pass trades some compactness for a clearer register structure; signed-in and physical-phone acceptance remain open. Do not extend the pattern to other modules before the Attendance benchmark is accepted.

## Pulse Attendance milestone

Read `docs/education/EDUFY_PULSE_AUDIT_2026-10-16.md`, `docs/education/EDUFY_PULSE_ATTENDANCE_2026-10-16.md`, `views/AbsenceView.tsx`, `views/school-day/education-attendance-pulse.css`, the shared Education tokens, AtlasSurface and the Attendance listener in AppContext. Reproduce isolated UI/readiness with `scripts/preview-pulse-attendance.mjs` (`--baseline`, `--provider`). Preserve write payloads and membership selectors. Signed-in acceptance precedes Classes/Students.

Education UI Learning and Portfolio focus: read `docs/education/LEARNING_PORTFOLIO_FOCUS_2026-10-16.md`, `docs/education/UI_DESIGN_DELIVERY_MAP_2026-10-16.md`, `views/LearningView.tsx`, `views/PortfolioView.tsx`, `views/learning/education-learning-focus.css`, and the existing `views/learning/education-learning-v1.css`. Keep student-project identity, tenant, status, review and SparkQuest behavior in their current owners. Signed-in light/dark phone acceptance remains pending.

Education UI Finance and Expenses focus: read `docs/education/FINANCE_EXPENSES_FOCUS_2026-10-16.md`, `views/FinanceView.tsx`, `views/ExpensesView.tsx`, `views/finance/education-finance-focus.css`, and `components/finance/AGENT_CONTEXT.md`. Preserve payment and expense write controls, stored status, tenant boundaries and document generation. Signed-in light/dark phone acceptance remains pending.

Education UI Admissions and Workshops focus: read `docs/education/ADMISSIONS_WORKSHOPS_FOCUS_2026-10-15.md`, `modules/admissions/AGENT_CONTEXT.md`, `modules/admissions/domain/admissionSelectors.ts`, the Admissions UI/CSS, `views/WorkshopsView.tsx`, and `views/programs/education-workshops-focus.css`. Keep booking, enrollment, CRM, family link and WhatsApp truth in their existing owners. Signed-in light/dark phone review remains pending.

Education UI Classes, attendance and schedule focus: read `docs/education/CLASSES_ATTENDANCE_SCHEDULE_FOCUS_2026-10-15.md`, `EDUCATION_UI_SYSTEM_MAP.md`, the three view owners, `utils/schoolSchedule.ts`, `utils/membershipLifecycle.ts`, and `views/school-day/education-school-day-v1.css`. Keep class/attendance records and instructor assignment writes under their current selectors and permissions. Signed-in light/dark phone review remains pending.

Education UI Programs, Students, Pickup focus: read `docs/education/PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`, `docs/education/DECISIONS.md`, `docs/education/KNOWN_ISSUES.md`, `EDUCATION_UI_SYSTEM_MAP.md`, the three view owners and their scoped CSS. Keep existing selectors, permissions and Pickup lifecycle commands. Signed-in light/dark phone acceptance remains pending.

Parent legacy login repair: read `docs/parent/PARENT_ACCESS_LEGACY_LOGIN_HOTFIX_2026-10-15.md`, `docs/parent/CREDENTIALS_PHASE_3_2026-10-10.md`, `api/parent-access/index.js`, `services/parentAccess.ts`, the Student Details parent access components, and the synthetic emulator. Release through the registered Edufy app only; Vercel trusted API and Hostinger static client are distinct deployment targets.

# Pickup lifecycle

Read `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`, `sparkquest/AGENT_CONTEXT.md`, decisions and known issues. Canonical files are `modules/pickup/domain/pickupLifecycle.ts`, `modules/pickup/services/pickupCommands.ts`, `sparkquest/services/{parentPickupCommands,studentPickupCommands}.ts`, `sparkquest/components/{ParentPickupControl,PickupSchedule,PickupPrivateNotes}.tsx`, `views/PickupView.tsx`, `firestore.rules` and `firestore.indexes.json`. Run the lifecycle smoke, parent-command and rule emulator suites only against explicit localhost demo emulators, then the full four-role local UI flow, SparkQuest TypeScript and both production builds.

Protected step review: read `docs/sparkquest/REVIEW_SECURITY_PHASE_2.md`, both earlier review reports, SparkQuest context, decisions and known issues. Run the review, learner-pipeline and profile-assignment emulators only against explicit localhost demo services, all domain suites, scoped TypeScript, both builds and the write-free `?designPreview=reviewLoop` browser flow.

Review security: read `docs/sparkquest/REVIEW_SECURITY_PHASE_1.md`, Review reliability, SparkQuest context, decisions and known issues. Run `domain/projectReview.emulator.mjs`, `domain/profileAssignment.emulator.mjs` and `domain/studentPipeline.emulator.mjs` only with explicit localhost demo emulators; Storage may be excluded only when recording that limitation. Then run all domain suites, scoped TypeScript and both builds.

Instructor learner workspace: read `docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md`, SparkQuest context, decisions and known issues. Run `domain/instructorLearner.smoke.ts`, `domain/profileAssignment.emulator.mjs` only in explicit localhost demo Auth/Firestore emulators, all other domain suites, scoped TypeScript and both builds. Write-free DEV localhost preview: `?designPreview=learnerDesk`.

Review reliability: read `docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md`, SparkQuest context, decisions and known issues. Run `domain/projectReview.smoke.ts`, `domain/projectReview.emulator.mjs` only in explicit localhost demo Auth/Firestore emulators, plus all existing domain suites, scoped TypeScript and both builds. Local write-free acceptance: `?designPreview=reviewLoop`.

Learner workbench/desktop Phase 1: read `docs/sparkquest/LEARNER_WORKSPACE_PHASE_1.md`, `sparkquest/AGENT_CONTEXT.md`, decisions and known issues. Use `sparkquest/domain/learnerWorkbench.smoke.ts` plus existing identity/assignment/content/workflow smokes; previews are documented in the phase report.

| Work | Read |
|---|---|
| Phase 0 evidence | `docs/admissions/PHASE_0_AUDIT.md` |
| Phased roadmap | `docs/admissions/IMPLEMENTATION_PLAN.md` |
| Education UI direction | `docs/admissions/DESIGN_DIRECTION.md`, `ATLAS_DESIGN_SYSTEM.md`, `EDUCATION_UI_SYSTEM_MAP.md` |
| Domain decisions | `docs/admissions/DECISIONS.md` |
| Risks | `docs/admissions/KNOWN_ISSUES.md` |
| History | `docs/admissions/CHANGELOG.md`, `.agent/LAST_HANDOFF.md` |
| Current lead/booking types | `types/index.ts` |
| Current CRM | `views/MarketingView.tsx`, `views/marketing/*` |
| Students preview | `views/StudentsView.tsx`, `views/students/EducationStudentsOperationsV1.tsx` |
| Students navigation and design | `docs/students/CHANGELOG.md`, `docs/students/DECISIONS.md`, `docs/students/KNOWN_ISSUES.md`, `views/StudentDetailsView.tsx` |
| Workshop integration | `views/WorkshopsView.tsx`, `views/dashboard/WorkshopActionCenter.tsx` |
| Enrollment integration | `App.tsx`, `views/PublicEnrollmentView.tsx` |
| StemQuest membership and attendance | `docs/programs/STEMQUEST_MEMBERSHIP_ATTENDANCE.md`, `utils/membershipLifecycle.ts`, `utils/programLifecycle.ts`, `views/AbsenceView.tsx`, `components/programs/ProgramSetupWizard.tsx` |
| Offer/Finance/enrollment contract | `docs/admissions/OFFER_FINANCE_ENROLLMENT.md`, `modules/admissions/domain/admissionOffer.ts`, `utils/programPackPricing.ts` |
| Authorization/data | `context/AuthContext.tsx`, `context/AppContext.tsx`, `firestore.rules`, `firestore.indexes.json` |
| WhatsApp assistant | `docs/admissions/WHATSAPP_ASSISTED_OPERATIONS.md`, `modules/admissions/ui/EducationAdmissionsWhatsAppAssistant.tsx`, `views/CommunicationsView.tsx` |
| SparkQuest rescue | `sparkquest/AGENT_CONTEXT.md`, `docs/sparkquest/RESCUE_PHASE_1.md` through `docs/sparkquest/RESCUE_PHASE_6.md`, `docs/sparkquest/DECISIONS.md`, `docs/sparkquest/KNOWN_ISSUES.md` |
| SparkQuest parent family and Pickup | `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`, `docs/sparkquest/PARENT_FAMILY_MOBILE_PHASE_4_2026-10-11.md`, `sparkquest/components/ParentFamilyWorkspace.tsx`, `sparkquest/components/ParentPickupControl.tsx`, `modules/pickup/`, `firestore.rules` |


## Finance service catalogue

Read `components/finance/AGENT_CONTEXT.md`, `docs/finance/SERVICE_CATALOGUE_PHASE_1.md`, `docs/finance/DECISIONS.md`, `docs/finance/KNOWN_ISSUES.md`, and `docs/finance/CHANGELOG.md` for service work. Tests are `components/finance/serviceCatalogue.{smoke.ts,emulator.ts,browser.smoke.mjs}`; local bundle runner is `scripts/test-service-catalogue.mjs`.
# Pickup daily roster correction

- Product and acceptance: `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`
- Daily schedule projection: `modules/pickup/domain/dailyPickupRoster.ts`
- Staff/lobby UI: `views/PickupView.tsx`
- Mirrored client contracts: `modules/pickup/domain/pickupLifecycle.ts`, `sparkquest/domain/pickupLifecycle.ts`
- Security authority: `firestore.rules`
- Learner and family surfaces: `sparkquest/components/PickupSchedule.tsx`, `sparkquest/components/ParentPickupControl.tsx`
## Current context — Phase 1 shell, Student Details and 011Y review — 2026-10-20

Read `docs/education/EDUFY_SHELL_STUDENT_GUIDE_PHASE_1_2026-10-20.md` before continuing. The current gate covers the global shell, command palette, mobile navigation, Student Details, full student editor and animated contextual 011Y. Preserve broad unfinished module edits but do not treat them as approved. Await user visual approval, then continue Settings → Finance → Expenses. No deploy or push.

## Pickup receipt and workshop prompts — 2026-10-29

`docs/pickup/AUDIT_2026-10-29.md` records the active contract. Parent notices: `sparkquest/components/ParentPickupNotice.tsx`; learner reminders: `sparkquest/components/LearnerWorkshopReminder.tsx`; admin idle/route policy: `components/pickup/PickupWorkshopReminder.tsx`; timetable signal: `sparkquest/domain/workshopPickupTiming.ts`. Existing lifecycle/rules/command adapters remain authoritative.
