# Review security — Phase 1

Implemented locally on 2026-10-01 as the release-gate continuation of Review reliability Phase 1. This phase hardens the `student_projects` Firestore boundary; it does not deploy rules, mutate production records, or replace designated-account acceptance.

## Delivered

- Learner project creation must begin without instructor review history, reviewer identity, feedback, XP, or publication timestamps.
- A learner cannot create a project directly as `published` or `changes_requested`.
- Learner updates preserve `reviewHistory`, `reviewedAt`, `reviewedById`, `reviewedByName`, `feedback`, `xpReward`, and `publishedAt` exactly as stored.
- Published projects are read-only through the learner rule path. Learners cannot self-publish or forge a `changes_requested` decision, while a legitimate project already in `changes_requested` may be edited and resubmitted.
- Student-project create/update rules route by role so instructor/admin tenant writes retain their existing boundary and learner writes use only the constrained owner/migration path.
- Review decisions are limited to instructor/administrator roles; other elevated tenant roles may keep ordinary non-review access but cannot seed or change review truth/status.
- The real review emulator now attempts direct SDK forgery for feedback, reviewer identity, history, XP, publication timestamp/status, and review status; every attempt is denied. It also proves a normal learner edit remains allowed before completing revision, resubmission, step approval, final submission, and publication.

## Verification

- Isolated localhost demo Auth/Firestore review emulator passes the full proof → inbox → revision → resubmission → concurrent decision → publish sequence, including direct learner attacks, a non-review staff decision denial, and legitimate learner edits.
- Instructor profile-assignment emulator passes concurrent additive assignment, preservation, role, tenant, identity, and draft-gate coverage.
- Learner pipeline Auth/Firestore emulator passes 14 assertions with Storage explicitly excluded from this rule regression.
- All nine SparkQuest domain suites pass: 155 counted assertions plus the import and Firestore-payload suites.
- Scoped SparkQuest TypeScript passes.
- Standalone SparkQuest production build passes with 2,244 modules; integrated Edufy production build passes with 4,445 modules. Existing Firebase mixed-import, Tailwind CDN, and large-bundle warnings remain.

## Boundary and next gate

The top-level review/audit fields are protected locally and `reviewHistory` remains the canonical durable decision record. The legacy `steps` array limitation described in the original Phase 1 boundary is superseded locally by Review Security Phase 2, which adds a protected proof-bound `stepReviews` map for protocol-v1 projects. See `REVIEW_SECURITY_PHASE_2.md`.

Before release, run one designated instructor/learner acceptance against real tenant links and attachments. Then promote the reviewed client plus the exact coordinated Firestore rule delta from a clean `origin/main` release worktree. Do not deploy the current mixed working tree wholesale.
