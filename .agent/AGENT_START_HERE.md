## Design System v1 reference review gate — 2026-10-19

The user requested a shared Notion-inspired staff UX with a full Duolingo-inspired visual vocabulary, then explicitly authorized implementation. The dashboard, Students register, enrollment wizard and complete student editor now form the local reference candidate. Read docs/education/design-system-v1/README.md, IMPLEMENTATION_REPORT.md, MODULE_BRIEF.md and ACCEPTANCE.md. Shared foundations evolve the existing Education primitives; data-edu-system="1" opts into canonical tokens. Earlier green/blue-only and neutral-counter instructions are superseded. Local review: http://127.0.0.1:5246/; real app: http://127.0.0.1:5202/. Stop for user visual approval before Programs/Attendance or further module rollout. Heartbeat remains PAUSED. Preserve unrelated unfinished Admissions/Workshops files. No deploy/push/auth/permissions/financial-rule changes or production writes.

# Edufy Agent Start Here

## Active product slice

Edufy Pulse Attendance benchmark: reusable compatible Education/Atlas foundations and an operational Attendance register, per the user master mission. Earlier Family Admissions and other module work remains preserved. See the current ACTIVE_PHASE and Pulse milestone report.

## Read order

1. `.agent/ACTIVE_PHASE.md`
2. `.agent/ACTIVE_TASK.md`
3. `.agent/SOT_REGISTRY.md`
4. `.agent/CONTEXT_MAP.md`
5. `modules/admissions/AGENT_CONTEXT.md`
6. Only the detailed documents required by the task

## Permanent rules

- Preserve the dirty worktree and unrelated user edits.
- Search–Reuse–Prove before creating shared logic.
- Build one phase at a time and stop after its report.
- Keep lifecycle stage, next action, and interaction outcome separate.
- Keep Workshops, Finance, and enrollment as their domain truths.
- Evolve the existing Education primitives and the approved Design System v1 contract; do not create a parallel component stack or module-local palettes.
- Never infer WhatsApp delivery from a link launch.
- Never use phone alone as learner/case identity.
- Do not change Firestore rules, indexes, provider secrets, or deployment without explicit phase scope.
- Run actual validation and record failures honestly.
- Update handoff, changelog, decisions, and known issues before stopping.
