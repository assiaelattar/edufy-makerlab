# Module implementation contract

Copy this brief for each module after reference approval. Fill every bracket before assigning work.

## Assignment

- Module and user job: [module; staff role; the decision to complete].
- Owner and allowed files: [one module owner; exact files].
- Canonical data/hooks/commands: [existing owners and permissions].
- Navigation entry/return path: [working view and retained context].
- Reference version: Edufy Design System v1 + approved screenshot names.

## Required inventory

List every landing view, register, detail tab, filter, form, editor, dialog, menu, confirmation, notification, empty/loading/error state and mobile variant. Mark each as reused, migrated, not applicable or unfinished. A finished landing page does not imply a finished module.

For every workflow record: staff intent → entry → relevant information → action → pending state → success/failure → return context. Put high-priority work first; preserve existing domain semantics and permission checks. Never invent actions unsupported by real hooks.

## Implementation rules

1. Read the current `.agent` context, this design contract and the three approved references. Search existing components before creating anything.
2. Reuse typed primitives and shared tokens. Module CSS owns arrangement only. No hardcoded palettes, new global theme rules or copied component implementations.
3. Keep table/profile/next-step actions distinct. Retain relevant filters and scroll context when returning from detail; scope ephemeral state by organization and signed-in user.
4. Cover the complete form journey, including dialogs, keyboard focus, required indicators, saving, validation, failure/retry and cancellation. Do not replace the existing persistence handler.
5. Keep real-account checks read-only. Perform writes only in isolated synthetic/emulator QA. Do not store production records or screenshots in evidence.
6. Request missing shared variants from the foundation owner. A module owner must not change protected shared components or business logic to solve a local styling problem.

## Coordination

One foundation owner integrates component changes and maintains tokens, gallery and reference captures. Module owners can work in parallel only after the reference gate and with disjoint file boundaries. Shared component additions land first and are versioned; dependent module work then consumes that version. No automatic agent spawning or messaging is implied by this document.

## Required handoff

- Page/form/dialog inventory with completion status.
- Reused components and any approved shared additions.
- Build, relevant domain checks and browser results from ACCEPTANCE.md.
- Light/dark desktop/mobile screenshots, synthetic source identified.
- Local preview URL and manual review steps.
- Known gaps and real-account acceptance still required.
- Focused local commit; no push/deploy. Update `.agent` context and the design changelog.

Stop at the assigned module boundary. Never claim visual acceptance on behalf of the user.
