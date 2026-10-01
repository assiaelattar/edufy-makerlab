# SparkQuest Rescue — Phase 1

Completed locally on 2026-09-23. No release or production mutation was performed.

## Decision

Do not restart the whole application. SparkQuest has valuable project, mission, portfolio, review, arcade, and instructor workflows, but its entry and identity layers were unsafe and inconsistent. The chosen strategy is a controlled rebuild around the existing product: stabilize boundaries first, then redesign workflow slices behind those boundaries.

## Phase 1 objective

Make URL routing, sign-in, learner identity, tenant identity, and project ownership explicit and fail closed. Replace the disliked login experience with a distinctive MakerLab project-workshop entry without expanding into a full application redesign.

## Delivered

- One environment-aware application URL resolver that refuses configured localhost links on public hosts.
- A canonical learner identity contract based only on Firebase UID, organization ID, and a verified student record.
- Removal of anonymous kiosk access, demo impersonation, base64 user bridges, default tenant fallbacks, and client-side identity repair.
- Exact project ownership and tenant checks before loading a requested project.
- Removal of same-name/email/phone learner merging and project-title deduplication.
- Canonical student, organization, and program IDs on newly created projects.
- A new responsive login and account-recovery experience built around the MakerLab “project bench” journey.
- A local-host-only login preview for visual QA.
- Removal of global Firebase debug exposure in the browser.

## Evidence

- SparkQuest TypeScript check passed.
- URL contract smoke: 6 assertions passed.
- Student identity contract smoke: 11 assertions passed.
- SparkQuest production build passed: 2,215 modules.
- Edufy production build passed: 4,427 modules.
- Authenticated read-only browser QA reached the existing learner dashboard.
- Login QA passed at desktop, 768 px, and 390 px; final phone document width equals its 390 px viewport.

Known Firebase mixed-import and large-bundle warnings remain. Live read-only QA also exposed existing `focus_sessions`/snapshot permission failures; Phase 1 did not change rules or production data.

## Phase boundary

Stop here. The next phase must explicitly scope the secure Edufy-to-SparkQuest launch/session exchange and production learner/project reconciliation. Do not solve those by restoring client-side fallbacks.
