# Review security — Phase 2

Implemented locally on 2026-10-01 as the protected per-step continuation of Review Security Phase 1. This phase removes duplicated `steps.status`, `steps.reviewNotes`, and `steps.reviewedAt` from the trust boundary for new learner projects. It does not deploy rules or mutate production records.

## Delivered

- New learner-created projects must carry `reviewProtocolVersion: 1`; all active learner creation paths now write it.
- Instructor step decisions write a protected top-level `stepReviews` map. Each entry stores outcome, feedback, reviewer, review time, and an exact fingerprint of the submitted proof.
- Learner saves preserve `stepReviews` and `reviewProtocolVersion` from the stored record. Firestore rules reject direct attempts to create or modify canonical per-step review state.
- Review queues derive pending work from the current proof fingerprint. Changing proof after approval makes it pending again even if the learner sets the nested status to `done`.
- Final publication requires canonical approval for every required step in protocol-v1 projects. A forged nested `done`/review note cannot unlock publication.
- Student Studio, saved mission details, and instructor review surfaces derive status and feedback from canonical state. Learner-authored nested `reviewNotes` are ignored for protocol-v1 projects.
- Legacy projects without the protocol keep their historical status fallback. Once a new instructor step decision adopts protocol v1, required steps must use canonical approvals going forward; no silent production migration occurs.

## Verification

- Project review domain suite passes 59 assertions, including nested status/note tampering, proof changes after approval, canonical feedback, publication denial, resubmission, and legacy compatibility.
- All nine SparkQuest domain suites pass: 169 counted assertions plus import and Firestore-payload suites.
- Isolated localhost Auth/Firestore review emulator proves missing-protocol create denial, protected map/version denial, nested tamper neutralization, valid revision/resubmission/concurrent approval/final publication, non-review staff denial, and role/tenant/owner boundaries.
- Learner pipeline emulator passes 14 assertions with protocol-v1 creation; profile-assignment emulator passes its concurrency, preservation, identity, role and tenant suite. Storage was explicitly excluded from these rule regressions.
- Scoped SparkQuest TypeScript passes.
- Standalone SparkQuest production build passes with 2,244 modules; integrated Edufy build passes with 4,445 modules. Existing Firebase mixed-import and large-bundle warnings remain.
- Write-free local Chrome QA completes revision → resubmission → approval → final publication with three decisions, zero desktop horizontal overflow, and a visible 412px-wide dialog with zero phone overflow.

## Release boundary

No production data, Firestore rule deployment, index/API change, commit, push, Hostinger/Vercel release, or Electron package occurred. Before release, use designated instructor/learner accounts to prove one real tenant-scoped mission and one Showcase attachment path. Promote the client and exact rules together from a clean `origin/main` release worktree; do not deploy the mixed development checkout wholesale.

Existing projects are not backfilled automatically. If production acceptance finds an old project that needs continued review, an instructor decision may adopt protocol v1 organically. Any bulk migration requires a separately audited plan.
