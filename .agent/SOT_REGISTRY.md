# Source-of-Truth Registry

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
| `SOT:SPARKQUEST_AUTH_ENTRY` | `sparkquest/context/AuthContext.tsx`, `sparkquest/App.tsx`, `sparkquest/components/LoginView.tsx` | fail-closed authentication, recovery, and learner entry UX | current/local; SparkQuest rescue Phase 1 |
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

Update this table whenever a canonical implementation is introduced or superseded. A planned path is not permission to create it outside the active phase.


## Finance service catalogue — Phase 1

| Key | Canonical file | Purpose | Status |
|---|---|---|---|
| `SOT:SERVICE_CATALOGUE` | `types/serviceCatalogue.ts`, `utils/serviceCatalogue.ts`, `services/serviceCatalogue.ts` | tenant catalogue, source defaults, validation, versioned writes and invoice snapshots | current/local |
| `SOT:SERVICE_CATALOGUE_UI` | `components/finance/ServiceCataloguePanel.tsx`, `ServiceInvoiceModal.tsx`, `service-catalogue.css` | catalogue CRUD/search and rapid service invoicing | current/local |
| `SOT:FINANCE_DOCUMENTS` | `types/finance.ts`, `services/financeDocuments.ts`, `components/finance/FinanceDocumentsPanel.tsx` | existing immutable UI ledger, shared numbering, normalization, credits and register | current/protected |
| `SOT:FINANCE_PRINT_EXPORT` | `utils/financeDocumentGenerator.ts`, `utils/accountingExport.ts` | snapshot print/PDF and existing accounting exports | current/protected |
