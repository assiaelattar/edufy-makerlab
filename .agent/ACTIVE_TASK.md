# Current task boundary — Protected step-review release acceptance

Preserve `reviewProtocolVersion: 1`, proof-bound `stepReviews`, canonical queue/status/feedback derivation, learner resubmission and required-step publication gates. Never trust protocol-v1 nested `steps.status`, `reviewNotes`, or `reviewedAt` as instructor truth. Keep legacy fallback read-compatible without silent backfill.

Phase 2 is complete locally; see docs/sparkquest/REVIEW_SECURITY_PHASE_2.md. Next is designated-account mission and Showcase acceptance, then a clean coordinated SparkQuest client + Firestore rule release. No production test record or bulk migration is automatically authorized.

---

# Current task boundary — Review security release acceptance

Preserve learner creation, ordinary edits, proof submission and resubmission while keeping top-level review history, reviewer identity, feedback, XP and publication staff-controlled. Keep published projects closed to learner writes and route student-project writes by authenticated role. Do not widen project reads, bypass canonical learner identity, deploy the mixed worktree, or treat duplicated nested step review fields as a tamper-proof audit.

Phase 1 is complete locally; see docs/sparkquest/REVIEW_SECURITY_PHASE_1.md. Its protected per-step follow-up is now complete in Phase 2 above.

---

# Current task boundary — Instructor learner workspace acceptance

Preserve canonical learner ownership, source-specific learner reads, shared mission eligibility, additive `targetAudience.additionalStudents`, fresh transactional preservation in class/editor saves, draft gates and awaited assignment failures. Keep projects, available missions and review decisions distinct. Do not invent review history from legacy progress or infer learner identity from personal data. Local write-free fixture: `?designPreview=learnerDesk`.

Phase 1 is complete locally. Next is designated-account acceptance or a separately scoped visual/celebration/guardian/sharing phase, preserving existing unrelated work. No production test-record mutation, identity repair, rules/API changes or deployment is automatically authorized. Details: docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md.

---

# Previous task boundary — Review reliability acceptance

Preserve shared pending-proof selectors, explicit load/error/retry states, direct scoped review reads, proof-bound transactional decisions, idempotent command IDs, immutable stored workflow/review fields, versioned URL/note evidence history, confirmed learner submission and write-free fixtures. Do not restore whole-project learner setDoc saves or cached-project-only review dialogs.

Phase 1 is complete locally; see docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md. Next is designated-account acceptance or the separately scoped instructor student-profile/assignment workspace. No data repair, rule/API changes, public exposure or deployment is automatically authorized.

---

# Previous task boundary — Learner workspace acceptance

Preserve tenant/owner verification independently from new-mission enrollment targeting, current-year pin selection, immutable saved-project previews, read-only historical Field Log, scoped workspace palette, larger navigation, naming failure preservation, and write-free local fixtures.

The approved Phase 1 implementation is complete locally. Next requires direction: designated-account create/upload/review acceptance, or the remaining Pickup/Build Rhythm/nested game UI slice. No deployment, rules/API changes, production cleanup or Electron packaging is authorized automatically. See docs/sparkquest/LEARNER_WORKSPACE_PHASE_1.md.

---

# Previous task boundary — Mission Autopilot acceptance

Preserve the stable tenant/import-key document IDs, atomic workflow/mission creation, frozen snapshots, canonical student ID resolution, explicit requested-file removal, draft-first creation and separate assignment. Same-key existing missions must remain preserved; do not introduce silent updates or enrollment writes.

Next: designated instructor acceptance with the downloaded template, actual image/PDF uploads, optional assignment, learner start/proof/review and immutable snapshots. No release, production-data repair, ZIP bundles or existing-record update behavior is included automatically.

---

# Previous task boundary — Sparkbook learner destinations

The learner destination-shell migration is complete locally. Preserve the field-kit navigation model, visible mobile labels, verified-tenant gallery query, inline arcade/key feedback, accessible key removal dialog, and local-only preview fixtures. Do not restore dynamic Tailwind navigation classes, `makerlab-academy` fallbacks, native touched-surface alerts, or preview writes.

The next safe task is still designated-account end-to-end QA: create one clearly named structured mission, assign it, submit evidence, request a revision, approve it, and prove the frozen workflow snapshot. A later visual pass may migrate nested arcade players/game dialogs, Pickup, and Build Rhythm without changing their domain contracts.

---

# Previous task boundary — SparkQuest Phase 6 instructor-workflow release gate

The deep instructor workflow polish is complete locally. Preserve the authenticated actor and tenant on every project/configuration write, the shared instructor UI primitives, inline async failures, accessible confirmation/rejection dialogs, and explicit production-safe state classes. Do not restore anonymous sign-in, the `makerlab-academy` fallback, native destructive prompts, render-time Blob URL generation, or the embedded dark gamification shell.

The next safe task is designated-account QA: verify every instructor route at desktop and phone widths, create a clearly named test draft, assign it by grade/group/direct learner, confirm learner visibility and submission review, then delete only those designated test records. Coordinate any deployment with the pending Phase 3 Firestore/Storage release gate.

---

# Previous task boundary — SparkQuest Phase 5 instructor-workspace release gate

The instructor workspace coherence pass is complete locally. Preserve `FactoryPage.tsx` as the shared instructor UI source, the Operate/Build/Configure navigation model, tenant-bound configuration writes, canonical mission audience labels, and the class-progress path built from the Factory data layer. Do not restore raw grade-page Firestore reads, debug UI, fake assignment enrollments, unfinished impersonation/migration controls, or default-tenant fallbacks.

The next safe task is designated-account QA: verify every instructor route at desktop and phone widths, create a clearly named test draft, assign it by grade/group/direct learner, confirm learner visibility and submission review, then delete only those designated test records. Coordinate any deployment with the pending Phase 3 Firestore/Storage release gate.

---

# Previous task boundary — SparkQuest Phase 4 instructor-pipeline release gate

The instructor mission creation and assignment pipeline is complete locally. Preserve the canonical mission audience contract, tenant/audit fields, direct learner authority, and the rule that assignment never mutates Edufy enrollments. Do not restore personal-data learner merging, fake mission enrollments, localhost fallbacks, or the browser-global reset action.

The next safe task is release QA with designated test accounts: desktop/phone visual verification, create a test draft mission, assign by grade/group/direct learner, confirm learner visibility, and clean up only those designated test records. Coordinate any client deployment with the still-pending Phase 3 Firestore/Storage rule gate.

---

# Previous task boundary — SparkQuest Phase 3 production-readiness gate

Phase 3 is complete locally. Preserve demand-driven student startup, canonical learner ownership, direct-assignment priority, current-year project creation, non-retryable permission handling, resumable Storage uploads, and the scoped Storage path. Do not restore base64 evidence, enrollment-gated personal projects, hidden modal listeners, or broad student subscriptions.

The next safe task requires explicit release scope: obtain/run the Storage emulator runtime and prove upload/read/delete denials, review Firestore plus Storage rule deltas, then release the client and both rule sets together. Verify with a designated test learner and instructor after deployment. No production learner data repair or real-account test project creation is authorized by this phase.

The Phase 2 launch-session retention and read-only reconciliation gates remain open and must not be silently bundled with data repair.

---

# Previous task boundary — SparkQuest production-readiness gate

Phase 2 is complete locally. Preserve the one-time code exchange, exact-origin binding, issue/exchange revalidation, staff non-impersonation, default-off write flag, and PII-free reconciliation report. Do not restore raw `token` URLs or direct `?projectId=` Edufy launches.

The next safe task requires explicit production-readiness scope: prove issue/exchange/replay/revocation against isolated Auth and Firestore emulators, define retention for `app_launch_sessions`, then prepare an API/client release plan. Run the production reconciliation only with explicit authorization; it is read-only but accesses sensitive learner records. Do not repair or migrate records from the report without a later reviewed plan.

---

# Previous task boundary — SparkQuest rescue

Phase 1 is complete locally. Preserve `utils/appUrls.ts` and `sparkquest/domain/studentIdentity.ts` as the URL and learner-identity sources of truth. Do not restore anonymous kiosk access, demo/base64 bridges, default organization IDs, first-match profile selection, personal-data identity matching, project-title deduplication, or client-side user-profile repair.

Phase 2 was completed locally under the current boundary above. Existing `focus_sessions` and snapshot-listener permission errors still require a separate rules/data audit.

---

# Previous task boundary — Post-release verification

The consolidated Edufy operations/UI release is live on `origin/main` and Hostinger at commit `6652af16fd18f285436ece1984594c61d7c73e82`. The release includes the compact Education UI shell, Programs pause/resume controls, lifecycle-aware attendance/finance filtering, legacy school-cohort date inference, CRM template-slot and urgent custom-demo booking, and the existing invoice/service catalogue features from the prior main baseline. Existing records are preserved; no migration or production write was performed.

Validation passed: production build, membership lifecycle smoke, service catalogue smoke, remote `main` SHA, live HTML bundle hash and deployed feature markers. The automatic deployment ledger could not be updated because the environment denied write access to the skill-owned ledger; record this manually if required. The temporary release worktree should be removed when filesystem permissions allow it.

The next task must be explicitly scoped; do not treat the mixed local worktree as release-ready. Preserve `.env`, unrelated Admissions/provider work and local-only experiments.

---

# Current task boundary — Education UI coherence

The global UI coherence pass is complete locally. Continue from the compact single-row desktop shell and single-layer mobile navigation; do not restore the former stacked workspace-tab row. `components/education-ui/education-role-surfaces-v1.css` is the final product-wide coherence layer and intentionally loads after module styles. Dedicated module styles may keep semantic color, but large KPI surfaces should remain neutral unless a workflow-specific redesign justifies an exception.

No release, production data mutation, rule/index/API change or navigation callback change is part of this task. A later module-by-module workflow redesign may deepen Learning, Family Journey, Team, Resources and Platform without replacing this shared baseline.

---

# Current task boundary — StemQuest membership attendance

The non-destructive program lifecycle slice is live on `origin/main` and Hostinger at commit `fe1cd1a44996aa6b91f9b61a3f220d736f31c1dc`. Fixed programs derive `finished` after their shared end date; rolling MakerLab programs remain evergreen and use personal membership dates. Use `utils/membershipLifecycle.ts` as the canonical coverage policy and preserve date-sensitive historical attendance. Do not convert fixed school cohorts into individual renewals.

No follow-up is required for existing data. The next optional product step is an explicit prefilled “renew membership” action; automated family messaging remains a separate authorization and consent scope.

---

# Previous task boundary — Education UI and Finance completion

Implementation and local QA are complete. Promote only the approved final Education UI, cache recovery, invoice correction, independent F/S sequence management and clean-PDF deltas from the current `origin/main`; do not merge the divergent feature branch or include `.env`, unrelated Admissions work, provider code, production data, or additional rules/index/API changes.

After release, verify the remote SHA, the live uncached HTML and `sw.js`, then verify a fresh browser renders the new Edufy shell. An authenticated live invoice write is not part of release verification.

---

# Previous task boundary — Service Catalogue

The urgent local service-catalogue/invoicing phase is complete. Read `docs/finance/SERVICE_CATALOGUE_PHASE_1.md`, `docs/finance/DECISIONS.md` and `docs/finance/KNOWN_ISSUES.md` before continuation. No deployment, import into production or expansion of invoice staff permissions is authorized by this phase completion. A future staff-access phase must align the existing invoice UI permissions with document/counter/enrollment/credit-note backend rules together.

The previous Admissions next-task instructions are preserved below for a separately requested Admissions continuation.

---

# Active Task

## Next safe task

Phase 7 is optional official WhatsApp provider readiness. Inspect existing server/communications capabilities and identify the available approved provider/business account before implementing a connection. Account provisioning, secrets, provider subscriptions and real message sending are not authorized by a generic phase continuation.

The assisted wa.me workflow is complete as a development preview. The original daily-operations need still has a separate gap: scheduled tasks (owner/due date/completion) and editable lifecycle transitions remain closed. If the optional provider is deferred, scope this operational command slice or Phase 8 hardening explicitly instead of implying these features already exist.

## Required context

- docs/admissions/WHATSAPP_ASSISTED_OPERATIONS.md
- docs/admissions/IMPLEMENTATION_PLAN.md
- docs/admissions/DECISIONS.md
- docs/admissions/KNOWN_ISSUES.md
- modules/admissions/AGENT_CONTEXT.md
- Current command, persistence and Firestore rules/emulator tests
- Existing Communications and API handlers relevant to the selected provider

## Guardrails

- Keep launch, operator sent confirmation, provider delivery/read and inbound parent response distinct.
- Preserve tenant/case identity, durable consent/opt-out and idempotency.
- No browser provider secrets or phone-only case matching.
- Do not deploy local rules or the development preview implicitly.
- Preserve the mixed worktree and unrelated changes, especially .env.
- Run scoped security/behavior tests and update handoff before closing the next phase.
