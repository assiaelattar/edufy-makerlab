# Current task boundary — Post-release verification

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
