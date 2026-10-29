## Design System v1 source of truth — 2026-10-19

Contract: docs/education/design-system-v1/README.md. Canonical scoped tokens: components/education-ui/education-system-v1.css. Typed primitives: components/education-ui/EducationPrimitives.tsx. Form reference: components/students/StudentDetailsForm.tsx and components/enrollment/EnrollmentWizard.tsx. View-state owner: components/education-ui/useWorkspaceViewState.ts. Review harness: scripts/preview-education-system.mjs; evidence: docs/education/pulse-evidence/ds-v1-*.png. Report and rollout gate: docs/education/design-system-v1/IMPLEMENTATION_REPORT.md. Existing domain owners and .agent SOT entries remain authoritative. No module-local palette reinvention.

## Dashboard educational pass complete — 2026-10-19

`views/dashboard/EducationDashboardV1.tsx` and `education-dashboard-playful.css` own the dashboard presentation. `DashboardView.tsx` retains summary derivation; WorkshopActionCenter retains its domain handlers; App.tsx retains payment form and commands (only a scoped CSS class added). Report: `docs/education/DASHBOARD_EDUCATIONAL_2026-10-19.md`.

## Calendar rendering source of truth — 2026-10-19

`views/CalendarView.tsx` and `views/school-day/education-calendar-playful.css` own the latest weekly/agenda presentation. Existing AppContext session feed, assignment/sync commands and attendance.manage remain authoritative. See `docs/education/CALENDAR_EDUCATIONAL_2026-10-19.md`; synthetic harness `scripts/preview-pulse-calendar.mjs`.

## Current Programs source of truth — 2026-10-19

`docs/education/PROGRAMS_WORKSPACE_2026-10-19.md` documents the complete Programs workspace pass. Implementation: `views/ProgramsView.tsx`, `views/ProgramDetailsView.tsx`, module-scoped `views/programs/education-programs-workspace.css`. Browser evidence: `docs/education/pulse-evidence/programs-workspace-*`. Earlier catalog-only milestones are historical.

# Source-of-Truth Registry

## Approved educational rendering

Module-scoped education-students-playful.css, education-programs-playful.css and education-attendance-playful.css own this visual pass. Existing Education tokens and all domain/command owners remain authoritative. Latest color balance: neutral metrics, lime/green identity, blue actions, limited #FF9600 warnings. See EDUCATIONAL_ROLLOUT_2026-10-19.md.

## Pulse Pickup owners

views/PickupView.tsx and views/pickup/education-pickup-pulse.css own the local gate register. Existing modules/pickup/domain and services remain the lifecycle, daily roster and command authorities. Shared Education tokens remain canonical. Synthetic-only harness: scripts/preview-pulse-pickup.mjs.

## Pulse Classes and Students owners

ClassesView.tsx and education-classes-pulse.css own the itinerary/directory. EducationStudentsOperationsV1.tsx and education-students-pulse.css own the learner worklist. Existing domain selectors, callbacks and shared Education tokens remain canonical.

## Pulse Attendance visual ownership — 2026-10-16

Latest Attendance render/CSS owners remain `views/AbsenceView.tsx` and `views/school-day/education-attendance-pulse.css`; shared tokens, handlers and persistence are unchanged. Read `docs/education/EDUFY_PULSE_ATTENDANCE_VISUAL_2026-10-16.md` and its `refined-*` screenshots before further work. This pass trades some compactness for a clearer register structure; signed-in and physical-phone acceptance remain open. Do not extend the pattern to other modules before the Attendance benchmark is accepted.

## Pulse Attendance — 2026-10-16

`components/education-ui/education-ui-v1.css` remains the semantic token owner; `components/atlas/AtlasSurface.tsx` owns opt-in compact headers. `views/AbsenceView.tsx` and `views/school-day/education-attendance-pulse.css` own the register and pending display. `context/AppContext.tsx` exposes attendance loading/error on its existing listener; it does not alter the main startup gate. See `docs/education/EDUFY_PULSE_ATTENDANCE_2026-10-16.md`.

Education UI Learning and Portfolio focus: `views/LearningView.tsx` owns the instructor entry and existing mission/review/studio destinations; `views/PortfolioView.tsx` owns the learner self-portfolio entry; `views/learning/education-learning-focus.css` owns scoped school-theme and 390 px presentation. `sparkquest/App.tsx` consumes the existing student `?projectId=` link. See `docs/education/LEARNING_PORTFOLIO_FOCUS_2026-10-16.md` and `docs/education/UI_DESIGN_DELIVERY_MAP_2026-10-16.md`.

Education UI Finance and Expenses focus: `views/FinanceView.tsx` owns the existing collection and verification task routes; `views/ExpensesView.tsx` owns recurring obligation projection, ledger navigation and expense controls; `views/finance/education-finance-focus.css` owns shared light/dark presentation. The stored expense status and existing write handlers remain canonical. See `docs/education/FINANCE_EXPENSES_FOCUS_2026-10-16.md`.

Education UI Admissions and Workshops focus: `modules/admissions/ui/EducationAdmissionsReadOnlyV1.tsx` and `education-admissions-v1.css` own the family priority and passport expression; the canonical order and evidence remain in `modules/admissions/domain/admissionSelectors.ts` and its adapter. `views/WorkshopsView.tsx` and `views/programs/education-workshops-focus.css` own attended-booking follow-up and the existing calendar, enrollment and CRM action entry points. See `docs/education/ADMISSIONS_WORKSHOPS_FOCUS_2026-10-15.md`.

Education UI school-day focus: `views/ClassesView.tsx`, `views/AbsenceView.tsx`, and `views/CalendarView.tsx` own the daily class, attendance and weekly coverage flows; `utils/schoolSchedule.ts` normalizes English/French weekday labels; `views/school-day/education-school-day-v1.css` owns scoped light/dark presentation. Eligibility remains in `utils/membershipLifecycle.ts`, and schedule writes retain their existing permission boundary. See `docs/education/CLASSES_ATTENDANCE_SCHEDULE_FOCUS_2026-10-15.md`.

Education UI three-module focus: `views/ProgramsView.tsx` and `views/programs/education-programs-v1.css` own portfolio priority; `views/students/EducationStudentsOperationsV1.tsx` and its CSS own learner preview and theme behavior; `views/PickupView.tsx` and `views/pickup/education-pickup-v1.css` own the staff desk order and visual hierarchy. Shared theme tokens remain in `components/education-ui/education-ui-v1.css`. See `docs/education/PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.

Recipient quick access: `modules/sparkquest/domain/recipientAccessPolicy.js` defines staff/recipient identity checks; `api/app-bridge/sparkquest/share.js` issues five-minute codes; `api/app-bridge/sparkquest/exchange.js` consumes them; `views/student-details/RecipientQuickAccess.tsx` presents manual and one-click QR sharing. See `docs/sparkquest/RECIPIENT_QUICK_ACCESS_2026-10-15.md`.

Daily Pickup roster and handoff contract: `modules/pickup/domain/dailyPickupRoster.ts` projects attendance-eligible enrollments into the current workshop-day roster; `views/PickupView.tsx` overlays `pickup_queue` live states for staff and lobby. `modules/pickup/domain/pickupLifecycle.ts` and `sparkquest/domain/pickupLifecycle.ts` are byte-identical transition mirrors. `firestore.rules` authorizes verified staff release from `arrived` or `ready`. See `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`.

Parent account provisioning and historical link repair: `api/parent-access/index.js` (staff/tenant authority, Auth and family transactions), `views/student-details/AccessAndAccountsTab.tsx` and `views/StudentDetailsView.tsx` (verified staff flow and ephemeral credentials card), `modules/parent-access/parentAccess.emulator.mjs` (synthetic proof). See `docs/parent/PARENT_ACCESS_LEGACY_LOGIN_HOTFIX_2026-10-15.md`.

Student maker journey: `sparkquest/components/LearnerJourneyNav.tsx`, `learner-journey.css`, `LearnerWorkbench.tsx`, `ProjectSelector.tsx`, `StudentMissionDetails.tsx`, `StudentWizard.tsx`, and `studio-build-experience.css` compose the focused learner stops, saved-step focus, and contextual build/editor guide over existing canonical project selectors and actions. `ParentO11Y.tsx` remains the shared mascot renderer. See `docs/sparkquest/STUDENT_JOURNEY_2026-10-12.md`.

Protected step review: `sparkquest/domain/projectReview.ts` (`stepSubmissionFingerprint`, canonical step state/status/approval selectors), `sparkquest/types.ts` (`ProjectStepReviewState`), `sparkquest/services/projectReview.ts` (preservation), `firestore.rules` (protocol/map immutability), and learner/instructor consumers. Current/local; docs/sparkquest/REVIEW_SECURITY_PHASE_2.md. Legacy projects retain fallback until an instructor decision adopts protocol v1.

Review security: `firestore.rules` (`learnerCreatesUnreviewedProject`, `learnerPreservesProjectReviewTruth`, role-routed student-project writes) plus `sparkquest/domain/projectReview.emulator.mjs` (direct SDK denial and valid review-loop proof). Current/local; docs/sparkquest/REVIEW_SECURITY_PHASE_1.md and Phase 2 above. Top-level and protocol-v1 proof-bound step review fields are canonical.

Instructor learner workspace: `sparkquest/domain/instructorLearner.ts` (canonical directory, enrollment/mission/history projections and additive assignment patch); `sparkquest/services/profileAssignment.ts` (fresh source-specific learner/mission transaction and audience-preserving editor/class saves); `components/factory/InstructorLearnerWorkspace.tsx`, `StudentManager.tsx`, `context/FactoryContext.tsx` (profile, dialog, read integration). Current/local; docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md. Shared learner visibility remains in `domain/missionAssignment.ts`.

Review reliability: `sparkquest/domain/projectReview.ts` (queue, safe media detection, proof versions, submission/save fingerprints and decision patches); `sparkquest/services/projectReview.ts` (fresh-read review/learner/editor transactions); `components/factory/ReviewInbox.tsx`, `ReviewModal.tsx`, `StudentManager.tsx`, `StudentProjectModal.tsx`, `context/FactoryContext.tsx`, `components/StudentWizard.tsx` (UI/read/save integration). Current/local; docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md.

Learner workbench: `sparkquest/domain/learnerWorkbench.ts` (lane/year/progress/ownership/pin selectors), `sparkquest/components/LearnerWorkbench.tsx`, `ProjectSelector.tsx`, `StudentPortfolio.tsx`, `StudentMissionDetails.tsx` (owned-build/Field Log integration). Learner workspace Phase 1: `Sidebar.tsx`, `SidebarItem.tsx`, `NameMissionDialog.tsx`, `StudentWizard.tsx`, scoped `.sq-desktop-workspace` CSS. Current/local; see docs/sparkquest/LEARNER_WORKSPACE_PHASE_1.md.

Mission CSV import: `sparkquest/domain/missionImport.ts` (normalization/completion/reference/asset contract), `sparkquest/services/missionImport.ts` (atomic stable-key persistence and explicit assignment), `sparkquest/components/factory/MissionImportWizard.tsx` plus `ProjectImporter.tsx` (instructor wizard and tenant-bound integration). Current/local; see docs/sparkquest/MISSION_AUTOPILOT.md.

| Key | Canonical file | Purpose | Status |
|---|---|---|---|
| `SOT:EDUCATION_UI_TOKENS` | `components/education-ui/education-ui-v1.css` | preview visual tokens | current/protected |
| `SOT:EDUCATION_UI_PRIMITIVES` | `components/education-ui/EducationPrimitives.tsx` | preview components | current/protected |
| `SOT:STUDENTS_PREVIEW` | `views/students/EducationStudentsOperationsV1.tsx` | Students/Family operations UX | current/protected |
| `SOT:LEGACY_LEAD` | `types/index.ts` (`Lead`) | persisted lead contract | current |
| `SOT:LEGACY_BOOKING` | `types/index.ts` (`Booking`) | workshop contract | current; known type drift |
| `SOT:LEAD_READS` | `context/AppContext.tsx` | current tenant listener | current |
| `SOT:CRM_UI` | `views/MarketingView.tsx` | legacy CRM entry/pipeline | current/protected |
| `SOT:CRM_PROFILE` | `views/marketing/LeadProfileModal.tsx` | calls, notes, workshop booking | current/protected |
| `SOT:WHATSAPP_IMPORT` | `views/marketing/ChatImporterModal.tsx` | legacy import | current/protected |
| `SOT:AUTHORIZATION` | `context/AuthContext.tsx` | role permissions | current; Admissions view/note/whatsapp keys assigned |
| `SOT:FIRESTORE_RULES` | `firestore.rules` | tenant data access | current/protected; strict Admissions activity gate and local SparkQuest review-field hardening added |
| `SOT:ENROLLMENT` | `App.tsx` guided enrollment | final conversion | current/protected |
| `SOT:MEMBERSHIP_LIFECYCLE` | `utils/membershipLifecycle.ts`, `utils/programLifecycle.ts` | enrollment coverage, attendance eligibility, rolling renewal detection and shared cohort periods | current/local |
| `SOT:MEMBERSHIP_ATTENDANCE_UI` | `views/AbsenceView.tsx`, `components/programs/ProgramSetupWizard.tsx` | renewal visibility and fixed school-semester setup | current/local |
| `SOT:ADMISSION_CASE` | `modules/admissions/domain/*` | typed read projection, evidence precedence, repair and age/search selectors | current |
| `SOT:ADMISSIONS_PREVIEW` | `modules/admissions/ui/EducationAdmissionsReadOnlyV1.tsx` | development-only Today, non-drag Pipeline, All cases, and family passport | current; Phase 2 complete |
| `SOT:ADMISSION_ACTIVITY` | `modules/admissions/domain/admissionWorkflowTypes.ts` | activity, task, outcome, reason, actor, audit, and version contracts | current; Phase 3 |
| `SOT:ADMISSION_TRANSITION` | `modules/admissions/application/*` | validated, authorized, versioned, idempotent commands | current; internal note and WhatsApp activity |
| `SOT:ADMISSION_PERSISTENCE` | `modules/admissions/infrastructure/*`, `firestore.rules`, `firestore.indexes.json` | atomic workflow persistence and tenant security proof | current; Phase 3 |
| `SOT:ADMISSION_WORKSHOP_LINK` | `modules/admissions/domain/admissionWorkshopLinks.ts` | stable tenant-bound booking/case resolution and phone-candidate detection | current; Phase 4 |
| `SOT:PROGRAM_PACK_PRICING` | `utils/programPackPricing.ts`, `types/index.ts` (`ProgramPack`) | canonical pack price catalog and guided-enrollment standard-price policy | current; Phase 5 |
| `SOT:ADMISSION_OFFER_HANDOFF` | `modules/admissions/domain/admissionOffer.ts`, `App.tsx` guided enrollment | immutable offer snapshot, separate Finance facts, and stable successful-enrollment links | current; Phase 5 |

| `SOT:ADMISSION_WHATSAPP` | `modules/admissions/domain/admissionWhatsApp.ts`, `modules/admissions/application/recordAdmissionWhatsAppActivity.ts`, `modules/admissions/infrastructure/firebaseAdmissionWhatsAppStore.ts` | template preview, explicit events, durable consent and atomic activity logging | Phase 6 |
| `SOT:WHATSAPP_PHONE` | `utils/whatsappPhone.ts` (re-exported by `utils/helpers.ts`) | existing destination-formatting policy | current |
| `SOT:APP_URLS` | `utils/appUrls.ts`, `utils/config.ts`, `sparkquest/utils/config.ts` | environment-safe Edufy/SparkQuest application links | current/local; SparkQuest rescue Phase 1 |
| `SOT:SPARKQUEST_STUDENT_IDENTITY` | `sparkquest/domain/studentIdentity.ts`, `sparkquest/services/studentIdentity.ts` | verified tenant-bound auth/student/project identity contract and Firestore resolver | current/released; learner account-link hotfix |
| `SOT:SPARKQUEST_AUTH_ENTRY` | `sparkquest/context/AuthContext.tsx`, `sparkquest/App.tsx`, `sparkquest/components/LoginView.tsx`, `sparkquest/components/ParentLoginView.tsx` | fail-closed authentication, recovery, and learner/parent entry UX | current; dedicated parent entry |
| `SOT:SPARKQUEST_LAUNCH_POLICY` | `modules/sparkquest/domain/sparkquestLaunchPolicy.js`, `api/app-bridge/sparkquest/{launch,exchange}.js` | short-lived one-time launch authorization and exchange | current/local; SparkQuest rescue Phase 2 |
| `SOT:SPARKQUEST_RECONCILIATION` | `modules/sparkquest/domain/identityReconciliation.js`, `api/app-bridge/sparkquest/reconciliation.js` | tenant-scoped read-only user/student/project link report | current/local; SparkQuest rescue Phase 2 |
| `SOT:SPARKQUEST_STUDENT_PIPELINE` | `sparkquest/components/ProjectSelector.tsx`, `sparkquest/components/StudentWizard.tsx`, `sparkquest/context/FactoryContext.tsx`, `sparkquest/context/FocusSessionContext.tsx` | learner mission targeting, project creation, progress and demand-driven loading | current/local; SparkQuest rescue Phase 3 |
| `SOT:SPARKQUEST_UPLOADS` | `sparkquest/services/api.ts`, `storage.rules`, `firebase.json` | resumable evidence uploads and tenant/user/project Storage authorization | current/local; SparkQuest rescue Phase 3; Storage emulator proof pending |
| `SOT:SPARKQUEST_MISSION_ASSIGNMENT` | `sparkquest/domain/missionAssignment.ts`, `sparkquest/components/factory/AssignMissionModal.tsx`, `sparkquest/context/FactoryContext.tsx` | tenant-bound grade/group/learner mission assignment and shared learner visibility contract | current/local; SparkQuest rescue Phase 4 |
| `SOT:SPARKQUEST_INSTRUCTOR_UI` | `sparkquest/components/factory/FactoryPage.tsx`, `sparkquest/components/InstructorFactory.tsx` | shared instructor page primitives, navigation, responsive actions, and empty states | current/local; SparkQuest rescue Phase 5 |
| `SOT:SPARKQUEST_CLASS_PROGRESS` | `sparkquest/components/factory/GradeProjectFilter.tsx`, `sparkquest/components/factory/StudentManager.tsx` | canonical program/grade/group mission progress and learner portfolio/review navigation | current/local; SparkQuest rescue Phase 5 |
| `SOT:SPARKQUEST_INSTRUCTOR_WORKFLOWS` | `sparkquest/components/admin/GamificationManager.tsx`, `sparkquest/components/factory/{ProjectEditor,ProjectImporter,StudentProjectImporter,StudentProjectModal,ReviewModal}.tsx` | tenant-aware reward/configuration, mission authoring, import, portfolio editing, and review interactions | current/local; SparkQuest rescue Phase 6 |
| `SOT:SPARKQUEST_LEARNER_REWARDS` | `sparkquest/components/SparkStore.tsx`, `sparkquest/context/ThemeContext.tsx`, `sparkquest/sparkquest.css` | learner reward exchange, collectible ownership/equip actions, and Sparkbook presentation | current/local; Sparkbook learner expansion |
| `SOT:SPARKQUEST_LEARNER_PORTFOLIO` | `sparkquest/components/StudentPortfolio.tsx`, `sparkquest/sparkquest.css` | tenant-bound learner project archive, proof summary, skills, and Sparkbook field-log presentation | current/local; Sparkbook learner expansion |
| `SOT:SPARKQUEST_LEARNER_DESTINATIONS` | `sparkquest/components/arcade/ArcadeView.tsx`, `sparkquest/components/StudentGallery.tsx`, `sparkquest/components/CredentialWallet.tsx`, `sparkquest/components/AvatarSelector.tsx` | learner play, evidence, tool-key, and maker-identity destination shells | current/local; Sparkbook learner expansion |
| `SOT:SPARKQUEST_LEARNER_NAVIGATION` | `sparkquest/components/Sidebar.tsx`, `sparkquest/components/SidebarItem.tsx`, `sparkquest/components/MobileNavigation.tsx` | desktop field-kit index and mobile primary/secondary destination navigation | current/local; Sparkbook learner expansion |
| `SOT:SPARKQUEST_PARENT_FAMILY` | `sparkquest/components/ParentFamilyJourney.tsx`, `sparkquest/components/ParentFamilyWorkspace.tsx`, `sparkquest/components/ParentFamilyLoading.tsx`, `sparkquest/components/ParentO11Y.tsx`, `sparkquest/components/ParentPickupExperience.tsx`, `sparkquest/components/ParentPickupControl.tsx`, `sparkquest/components/PickupPrivateNotes.tsx`, `sparkquest/hooks/useParentFamily.ts`, `sparkquest/hooks/useParentSound.ts`, `sparkquest/domain/parentImage.ts`, `sparkquest/domain/parentFamily.ts`, `sparkquest/domain/parentFamilyOperations.ts`, `sparkquest/domain/parentNextWorkshop.ts`, `sparkquest/domain/parentUpcoming.ts` | verified guardian-linked, child-specific mobile journey, media, records, weekly workshop, live pickup commands and private learner notes, parent install shell and opt-in sound | current; connected parent mobile portal |
| `SOT:EDUFY_PARENT_ACCOUNTS` | `views/ParentsView.tsx`, `views/parents/education-parents-v1.css`, `api/parent-access/index.js`, `services/parentAccess.ts`, `modules/parent-access/parentAccess.emulator.mjs` | family-first staff workspace, generated MakerLab logins, explicit primary and additional-care learner links, account repair routing, and family billing context | current; 2026-10-24 care-group correction |
| `SOT:PUBLIC_WORKSHOP_BOOKING` | `views/PublicBookingView.tsx`, `services/publicWorkshopBooking.ts`, `modules/workshops/publicBooking.emulator.ts`, `firestore.rules` | French public booking presentation and atomic idempotent booking/capacity transaction | current; 2026-10-24 repair |
| `SOT:PICKUP_LIFECYCLE` | `modules/pickup/domain/pickupLifecycle.ts`, `modules/pickup/services/pickupCommands.ts`, `sparkquest/domain/pickupLifecycle.ts`, `sparkquest/services/parentPickupCommands.ts`, `sparkquest/services/studentPickupCommands.ts`, `views/PickupView.tsx`, `sparkquest/components/ParentPickupControl.tsx`, `sparkquest/components/PickupSchedule.tsx`, `sparkquest/components/PickupPrivateNotes.tsx`, `firestore.rules`, `firestore.indexes.json` | tenant-bound selected-picker lifecycle, learner readiness, private parent/learner notes, staff verification/release and atomic immutable audit events | current; coordinated release updated 2026-10-15 |

Update this table whenever a canonical implementation is introduced or superseded. A planned path is not permission to create it outside the active phase.


## Finance service catalogue — Phase 1

| Key | Canonical file | Purpose | Status |
|---|---|---|---|
| `SOT:SERVICE_CATALOGUE` | `types/serviceCatalogue.ts`, `utils/serviceCatalogue.ts`, `services/serviceCatalogue.ts` | tenant catalogue, source defaults, validation, versioned writes and invoice snapshots | current/local |
| `SOT:SERVICE_CATALOGUE_UI` | `components/finance/ServiceCataloguePanel.tsx`, `ServiceInvoiceModal.tsx`, `service-catalogue.css` | catalogue CRUD/search and rapid service invoicing | current/local |
| `SOT:FINANCE_DOCUMENTS` | `types/finance.ts`, `services/financeDocuments.ts`, `components/finance/FinanceDocumentsPanel.tsx` | existing immutable UI ledger, shared numbering, normalization, credits and register | current/protected |
| `SOT:FINANCE_PRINT_EXPORT` | `utils/financeDocumentGenerator.ts`, `utils/accountingExport.ts` | snapshot print/PDF and existing accounting exports | current/protected |
## Phase 1 shell and learner reference — 2026-10-20

Global shell ownership: `components/layouts/EducationAdminShellV1.tsx` and `components/layouts/education-navigation-v2.css`. Organization/user preferences and module scroll restoration: `components/layouts/AdminLayout.tsx`. Guide contract: `components/education-ui/EducationGuide.tsx` and `education-guide.css`; Rive rendering remains in `sparkquest/components/ParentO11Y.tsx`. Learner experience: `views/StudentDetailsView.tsx` and `views/student-details/education-student-details-v1.css`; existing domain tabs and handlers remain authoritative. Report: `docs/education/EDUFY_SHELL_STUDENT_GUIDE_PHASE_1_2026-10-20.md`.

## Programs Design System v1 acceptance — 2026-10-20

`docs/education/PROGRAMS_DESIGN_SYSTEM_V1_2026-10-20.md` records the latest Programs visual and interactive acceptance, synthetic evidence, decisions and remaining limits. `components/programs/ProgramSetupWizard.tsx`, `components/programs/AcademicYearRolloverModal.tsx`, `views/ProgramsView.tsx`, `views/ProgramDetailsView.tsx` and module-scoped CSS retain presentation ownership; existing AppContext, AuthContext, Firestore handlers and enrollment domain logic remain authoritative. The disposable QA harness is `scripts/preview-pulse-programs.mjs` with `scripts/fixtures/pulse-programs-adapter.jsx`.

## Pickup receipt and workshop prompts — 2026-10-29

`docs/pickup/AUDIT_2026-10-29.md` records the active contract. Parent notices: `sparkquest/components/ParentPickupNotice.tsx`; learner reminders: `sparkquest/components/LearnerWorkshopReminder.tsx`; admin idle/route policy: `components/pickup/PickupWorkshopReminder.tsx`; timetable signal: `sparkquest/domain/workshopPickupTiming.ts`. Existing lifecycle/rules/command adapters remain authoritative.
