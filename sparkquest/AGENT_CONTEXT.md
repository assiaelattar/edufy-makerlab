# SparkQuest Agent Context

Read this file before changing SparkQuest, then read `../docs/sparkquest/RESCUE_PHASE_1.md` through `RESCUE_PHASE_6.md`, `DECISIONS.md`, and `KNOWN_ISSUES.md`.

## Product boundary

SparkQuest is a learner application connected to Edufy Core. Edufy owns learner, tenant, program, and enrollment truth. SparkQuest may present and extend that truth, but it must not infer authorization from names, email addresses, phone numbers, project titles, or a default tenant.

## Current canonical contracts

- Application URLs: `utils/appUrls.ts`; SparkQuest consumes them through `utils/config.ts`. The standalone Vercel project uploads only `sparkquest/`, so this file must stay byte-for-byte aligned with `../utils/appUrls.ts`. Likewise, `domain/pickupLifecycle.ts` mirrors `../modules/pickup/domain/pickupLifecycle.ts` for family pickup state. Check both pairs before a release.
- Authenticated learner identity: `domain/studentIdentity.ts`.
- Authentication/profile resolution: `context/AuthContext.tsx`.
- Project selection and creation: `components/ProjectSelector.tsx` and `hooks/useMissionData.ts`.
- Instructor mission creation and assignment: `components/factory/ProjectEditor.tsx`, `components/factory/AssignMissionModal.tsx`, `context/FactoryContext.tsx`, and `domain/missionAssignment.ts`.
- Instructor workspace UI: `components/InstructorFactory.tsx`, `components/factory/FactoryPage.tsx`, and the route components in `components/factory/`.
- Factory Dispatch visual phase: `components/factory/FactoryDashboard.tsx`, `factory-dispatch.css`, and the localhost-only `?designPreview=factoryDispatch` synthetic fixture. Overview review rows derive from canonical `reviewQueue`; direct actions keep the existing review and mission editor contracts. Acceptance boundary: `../docs/sparkquest/FACTORY_DISPATCH_2026-10-08.md`.
- Instructor deep workflows: `components/admin/GamificationManager.tsx` and the mission/import/portfolio/review components under `components/factory/`.
- Student workflow/evidence: `components/StudentWizard.tsx`, `services/api.ts`, and `../storage.rules`.
- Student dashboard experience: `components/LearnerWorkbench.tsx`, `student-dashboard-experience.css`, and `ProjectSelector.tsx`; write-free fixture `?designPreview=workbench`, acceptance boundary `../docs/sparkquest/STUDENT_DASHBOARD_2026-10-09.md`. Preserve canonical progress, project ownership, and read-only station label resolution.
- Student maker journey: `components/LearnerJourneyNav.tsx`, `learner-journey.css`, `LearnerWorkbench.tsx`, `ProjectSelector.tsx`, `StudentMissionDetails.tsx`, `StudentWizard.tsx`, and shared `ParentO11Y.tsx`; write-free fixtures `?designPreview=workbench|studio`. Preserve the existing learner actions and domain selectors. See `../docs/sparkquest/STUDENT_JOURNEY_2026-10-12.md`.
- Resource and tool learning: `domain/resourceLearning.ts`, `domain/resourceQuizCsv.ts`, `components/ResourceLibrary.tsx`, `components/ResourceLearningGate.tsx`, `components/ResourceViewerModal.tsx`, `services/resourceLibrary.ts`, and `public/templates/resource-quiz-template.csv`; acceptance and limits: `../docs/sparkquest/RESOURCE_LIBRARY_MASTERY_GATES_2026-10-03.md`. Preserve explicit versioned gates, optional-resource behavior, frozen mission/step resources, tenant-scoped shelf access, external-only tool launching, and CSV normalization into the canonical quiz model.
- Review reliability: `domain/projectReview.ts`, `services/projectReview.ts`, `components/factory/ReviewInbox.tsx`, `ReviewModal.tsx`; acceptance and limits: `../docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md`. Preserve transaction fingerprints and write-free `?designPreview=reviewLoop` fixtures.
- Review security: `../firestore.rules` role-routed learner project create/update helpers and `domain/projectReview.emulator.mjs`; Phase 1 boundary: `../docs/sparkquest/REVIEW_SECURITY_PHASE_1.md`. Preserve learner proof/resubmission while keeping top-level review/audit truth staff-controlled; Phase 2 below supersedes its nested-step limitation.
- Protected step review: `domain/projectReview.ts`, `types.ts`, `services/projectReview.ts`, learner/instructor review consumers and `../firestore.rules`; acceptance: `../docs/sparkquest/REVIEW_SECURITY_PHASE_2.md`. Preserve protocol-v1 proof fingerprints, protected step state, legacy compatibility and coordinated client/rules release ordering.
- Learner review integration: roadmap, final submission and Field Log use canonical proof-bound step approval; project-level changes requests return to an editable plan and final resubmission. Current local acceptance and open real-account gate: `../docs/sparkquest/REVIEW_INTEGRATION_ACCEPTANCE_2026-10-07.md`.
- Instructor learner desk: `domain/instructorLearner.ts`, `services/profileAssignment.ts`, `components/factory/InstructorLearnerWorkspace.tsx`, `StudentManager.tsx`; additive recipient eligibility remains in `domain/missionAssignment.ts`. Preserve transactional audience merging, source-specific canonical learner reads and write-free `?designPreview=learnerDesk`. Limits: `../docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md`.
- Demand-driven student subscriptions: `context/FactoryContext.tsx`, `context/FocusSessionContext.tsx`, and `components/PickupSchedule.tsx`.
- Login and account-recovery entry surfaces: `components/LoginView.tsx`, `App.tsx`, and `sparkquest.css`.
- Parent family journey: `components/ParentFamilyWorkspace.tsx`, `hooks/useParentFamily.ts`, `domain/parentFamily.ts`, `domain/parentFamilyOperations.ts`, `components/ParentPickupControl.tsx`, `services/parentPickupCommands.ts`, and the constrained Pickup rule boundary in `../firestore.rules`. Local synthetic preview: `?designPreview=family`; pickup release evidence: `../docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`.
- Secure launch policy: `../modules/sparkquest/domain/sparkquestLaunchPolicy.js`.
- Identity reconciliation: `../modules/sparkquest/domain/identityReconciliation.js`.
- Server endpoints: `../api/app-bridge/sparkquest/*`; browser exchange: `services/appBridge.ts`.

## Guardrails

- Require a real Firebase session, an organization ID, and one verified student record.
- Require project ownership plus organization match before opening a project.
- Never restore the old anonymous kiosk, demo-token, base64 bridge, or client-side `users.studentId` repair paths.
- Do not silently merge learners/projects by matching personal data or titles.
- Do not add a default `makerlab-academy` organization fallback.
- Do not edit Firestore rules, indexes, APIs, or production data without an explicitly scoped phase and security proof.
- Keep the local `?preview=login` route local-host-only; it is a visual QA aid, not an authentication bypass.
- Never accept a Firebase custom token from a URL. Accept only a short-lived one-time `launch` code and remove it from history after exchange.
- Keep `EDUFY_ENABLE_APP_BRIDGE_WRITES` disabled outside an explicitly approved production or isolated-emulator environment.
- Run reconciliation before migration; report IDs/issues only and never auto-repair.
- Keep personal project creation independent of enrollment availability; enrollment may target missions but cannot become learner identity.
- Keep new projects on the current academic year and keep uploaded file bodies out of Firestore.
- Assignment must update the mission audience; never model a mission assignment as an Edufy enrollment.
- Do not deploy the Phase 3 client without the reviewed Firestore and Storage rules.

## Verification

Run:

```powershell
npx tsc --noEmit
node ../utils/appUrls.smoke.ts
node domain/studentIdentity.smoke.ts
node ../modules/sparkquest/domain/sparkquestPhase2.smoke.mjs
npm.cmd run build
```

For the learner pipeline, also run `domain/studentPipeline.emulator.mjs` through isolated Auth/Firestore/Storage emulators. Also build the Edufy root before release, test the login at phone and tablet widths, and confirm zero horizontal overflow.
