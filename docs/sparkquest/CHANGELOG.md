# SparkQuest changelog

## 2026-10-11 — Interactive local parent acceptance

- Connected local Edufy, its trusted parent API, and local SparkQuest to one isolated Firebase demo project. Seeded Noor as an unissued learner for the user's own account creation test.
- Issued and used a one-time parent password through the real two-app UI, then linked a sibling through Edufy and checked child-specific SparkQuest views.
- Added a guarded local seed and development-only CSP allowance for emulator requests. Both production builds omit the demo endpoint strings.
- See PARENT_LOCAL_ACCEPTANCE_2026-10-11.md. Nothing was pushed or deployed.

## 2026-10-11 — Parent family mobile journey Phase 4

- Clarified that staff issue a one-time password and email-shaped SparkQuest login ID; no parent email inbox or setup link is required.
- Added child switching and mobile Journey, Moments, Records, and view-only Pickup destinations, with saved project briefs, resources, proof/reviews, gallery, payment and attendance detail.
- Restricted parent Pickup writes in Firestore while preserving authorized reads and learner updates.
- TypeScript, both production builds, family smokes, isolated Auth/Firestore permissions and 375px browser preview pass. Local candidate only; see PARENT_FAMILY_MOBILE_PHASE_4_2026-10-11.md.

## 2026-10-01 — Review security Phase 2

- New learner projects require protocol v1 and instructor step decisions write a protected proof-bound `stepReviews` map.
- Queue, learner feedback/status, instructor status and final publication use canonical state rather than learner-writable nested review fields.
- Changed proof re-enters review; nested status/note tampering cannot forge approval or unlock publication.
- Legacy records retain explicit compatibility without bulk migration.
- 59 review assertions, all nine domain suites, three emulator pipelines, scoped TypeScript, both builds and desktop/412px browser QA pass. Local only; real-account acceptance and clean coordinated release remain open.

## 2026-10-01 — Review security Phase 1

- Firestore learner creates cannot seed review history, reviewer identity, feedback, XP, publication time, `published`, or `changes_requested`.
- Learner updates preserve top-level instructor truth, cannot self-publish, and cannot reopen published projects; legitimate edit/proof/resubmission remains allowed.
- Student-project writes route by role, preserving the existing instructor/admin tenant path.
- Non-review staff roles retain ordinary tenant access but cannot seed or change review truth/status.
- Direct SDK attack coverage added to the full review emulator; review, profile-assignment and learner-pipeline emulators pass.
- Nine domain suites, scoped TypeScript and both production builds pass. Local only; designated-account acceptance and clean coordinated client/rules release remain open. Details: REVIEW_SECURITY_PHASE_1.md.

## 2026-10-01 — Instructor learner workspace Phase 1

- Canonical learner directory, saved current/previous-year project progress, all-year pending reviews and direct newest-first history access.
- Searchable, confirmed profile assignment with awaited save/retry, additive audiences and transactional preservation during subsequent class dispatch/editor saves.
- Explicit directory/catalog/enrollment read failures, inactive/ambiguous identity gates, unlinked-project warning and scoped vivid desktop/phone surfaces.
- 40 new domain assertions, all nine domain suites, isolated Auth/Firestore persistence/concurrency/denial checks, scoped TypeScript, both builds and desktop/phone/keyboard fixture QA pass.
- Local only; no production mutation or release. Limits and acceptance: INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md.

## 2026-10-01 — Review reliability Phase 1

- Dedicated newest-first review inbox and independent scoped project reader, with load/error/retry states and consistent pending-proof counters.
- Proof-first saved roadmap, media, explanation and review/version history with separate step and final decisions.
- Proof-bound transactional reviews, idempotency, stale learner/editor guards and preservation of stored instructor/snapshot truth.
- Confirmed learner final submission; canonical profile/Auth UID grouping and explicit accessible progress/review buttons.
- 45 domain assertions, all prior domain suites, localhost demo Auth/Firestore service/concurrency tests, TypeScript, both builds and desktop/phone/keyboard browser QA pass.
- Local only. Real acceptance, review-field rule hardening and subsequent product phases remain open. Details: REVIEW_RELIABILITY_PHASE_1.md.
