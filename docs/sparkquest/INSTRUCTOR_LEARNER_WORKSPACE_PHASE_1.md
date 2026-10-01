# Instructor learner workspace — Phase 1

Implemented locally on 2026-10-01 under the request to continue the review/student-management work. No production records were inspected or changed and no release occurred.

## Delivered

- Students directory prioritizes learners awaiting review, uses canonical Edufy records and unambiguous explicit Auth UID aliases, and never merges by name or contact information. Unlinked project counts point instructors back to Projects/Review Inbox rather than inventing a learner record.
- A profile has Projects & progress, Available missions, and a newest-first Review history timeline. Current-year and previous-year builds stay separate; saved step progress and the next recorded step are shown. Pending reviews include all school years and open the newest pending work. Timeline buttons open the saved project history directly.
- Existing supported-project creation, showcases, portfolio imports and guarded detail editing remain accessible. Account credentials, student deletion, enrollment editing and learner identity repair stay in Edufy; they were not added here.
- Assign mission offers a searchable, explicit one-learner confirmation, awaited persistence, inline failure with the selected mission retained, and a saved-result state. Already-available missions, archived missions and inactive/ambiguous learners are not assignable through this picker.
- Bright solid blue, green and amber, clean white cards, readable status/progress controls and responsive layouts are scoped to the learner desk and its assignment dialog. The existing instructor layout and focus-managed dialog are reused; no shared/global theme was replaced.
- Directory, project, catalog and enrollment subscriptions have loading/error/retry states. Failed reads are unknown counts, not empty portfolios. Canonical document IDs override persisted display IDs in touched directory/catalog reads.

## Assignment contract

`project_templates.targetAudience.additionalStudents` contains additive canonical learner IDs (or verified auth-only user IDs). Shared `missionIsVisibleToLearner` evaluates these alongside the unchanged primary class/direct audience, so learner discovery uses the same eligibility contract as the instructor profile.

`services/profileAssignment.ts` freshly reads the mission and selected learner in a Firestore transaction, checks actor role/tenant and learner availability, and appends one recipient without replacing the class audience. Existing featured status and original dispatch metadata are retained; duplicate additions are no-ops. New activation records assignment actor/time. A ready, audience-free draft can be activated for one learner; a draft with a planned audience must be dispatched through Missions first so it cannot accidentally launch to other learners.

General class dispatch and mission-editor saves use a fresh transaction that preserves supplemental recipients, including concurrent additions absent from an old editor snapshot. This phase has no supplemental-unassignment control: the retained list is intentionally additive. It does not provide a per-recipient assignment-event history; it records latest profile assignment attribution.

No enrollment, learner identity, student build, roadmap, review history or XP is written by assignment. It makes the mission available, not started or completed. Tenantless/shared legacy templates must be duplicated into the organization before profile assignment or editing through the tenant-checked writer.

## Validation

- `node node_modules/typescript/bin/tsc --noEmit -p sparkquest/tsconfig.json`: passes.
- All nine `sparkquest/domain/*.smoke.ts` suites pass: 40 new learner-desk assertions; 45 existing review and 70 counted prior regression assertions, plus import/payload suites.
- `domain/profileAssignment.emulator.mjs`: passes against explicit localhost `demo-profile-assignment` Auth/Firestore emulators using existing rules. Tests simultaneous instructors, additive preservation, idempotency, stale-editor/class dispatch preservation, canonical and auth-only recipients, complete/planned/incomplete drafts, inactive/missing/foreign/role denials, actual learner SDK-write denial, and unchanged enrollment/build/review snapshots. No Storage used.
- Standalone SparkQuest and integrated Edufy production builds pass. Existing Firebase mixed-import and large-chunk warnings remain.
- Synthetic browser fixture `?designPreview=learnerDesk` is development + localhost only and runs before providers: no account reads, database writes or uploads. Desktop at 1,422 CSS px: profile progress, assignment success/failure/retry, available-mission update without a new build, previous-year selection, timeline ordering/direct history access, latest-proof approval updating progress/counts/history, read-error unknown states and retry, keyboard trap/Escape/focus restoration pass.
- Phone QA requested 390×844; browser scaling reported 433×937 CSS px. Profile, mission list and assignment picker/confirmation/success have no horizontal overflow; confirmation stays usable and ready-draft assignment updates the list. Viewport override reset afterwards. This is not a claim of exact 390 CSS-px or physical-device coverage.
- Focused whitespace checks pass. The repository has no dedicated `agent:check` script. Its existing Atlas context-reader command ran successfully; it is not a validation suite.

## Boundary and release gate

Stop after this local phase. Real designated instructor/learner acceptance is still required, especially existing account links, production audiences, missing projects and attachment access. Do not bulk-repair identities, backfill history or activate missions as QA without explicit named-record authorization. Client guards do not replace rule hardening for review/audit fields.

Global learner color polish, completion celebrations, guardian tracking, public sharing, API/rule/index changes and deployment were not implemented by this phase. Preserve any unrelated work already present in those areas. No commit, push, deployment, production mutation or Electron packaging occurred.
