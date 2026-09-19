# Edufy Agent Start Here

## Active product slice

Family Admissions: make the journey from parent inquiry through trial, planning/pricing, payment verification, and enrollment visible and actionable inside Students.

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
- Use the Education UI preview and scoped module styles; do not add a design system.
- Never infer WhatsApp delivery from a link launch.
- Never use phone alone as learner/case identity.
- Do not change Firestore rules, indexes, provider secrets, or deployment without explicit phase scope.
- Run actual validation and record failures honestly.
- Update handoff, changelog, decisions, and known issues before stopping.
