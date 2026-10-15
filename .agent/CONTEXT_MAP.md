# Context Map

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
