# SparkQuest Agent Context

Read this file before changing SparkQuest, then read `../docs/sparkquest/RESCUE_PHASE_1.md` through `RESCUE_PHASE_6.md`, `DECISIONS.md`, and `KNOWN_ISSUES.md`.

## Product boundary

SparkQuest is a learner application connected to Edufy Core. Edufy owns learner, tenant, program, and enrollment truth. SparkQuest may present and extend that truth, but it must not infer authorization from names, email addresses, phone numbers, project titles, or a default tenant.

## Current canonical contracts

- Application URLs: `../utils/appUrls.ts`; SparkQuest consumes them through `utils/config.ts`.
- Authenticated learner identity: `domain/studentIdentity.ts`.
- Authentication/profile resolution: `context/AuthContext.tsx`.
- Project selection and creation: `components/ProjectSelector.tsx` and `hooks/useMissionData.ts`.
- Instructor mission creation and assignment: `components/factory/ProjectEditor.tsx`, `components/factory/AssignMissionModal.tsx`, `context/FactoryContext.tsx`, and `domain/missionAssignment.ts`.
- Instructor workspace UI: `components/InstructorFactory.tsx`, `components/factory/FactoryPage.tsx`, and the route components in `components/factory/`.
- Instructor deep workflows: `components/admin/GamificationManager.tsx` and the mission/import/portfolio/review components under `components/factory/`.
- Student workflow/evidence: `components/StudentWizard.tsx`, `services/api.ts`, and `../storage.rules`.
- Demand-driven student subscriptions: `context/FactoryContext.tsx`, `context/FocusSessionContext.tsx`, and `components/PickupSchedule.tsx`.
- Login and account-recovery entry surfaces: `components/LoginView.tsx`, `App.tsx`, and `sparkquest.css`.
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
