# Education UI — Programs, Students, Pickup focus pass

Date: 2026-10-15. Local candidate on `agent/edufy-school-theme-20261015`; no release or data mutation.

## Product order

1. **Programs** — clarify the next portfolio action from actual readiness, waiting-family and empty-group projections before the catalog metrics. The action opens the existing setup or program details flow.
2. **Students** — retain direct profile access from each learner row, make the separate operational next-step preview explicit, and scroll to its passport on narrow layouts. When a smart view is empty, the passport no longer displays a learner outside that view. The existing filters, family mode, permissions and mutation routes remain.
3. **Pickup** — put live gate handoffs and incoming families before the full daily roster. A real queue summary points to the next safe step; staff verification, selected-picker proof and release commands are unchanged. Legacy `waiting` entries show staff-review guidance because the current dated lifecycle cannot advance them directly.

All three modules use the school workspace's semantic light and dark variables. The Pickup staff desk has its own scoped layout and status colors; the lobby remains a dedicated dark display. Existing tenant-bound selectors, data subscriptions and action handlers remain the source of live data.

## Next modules by operational importance

1. Classes and attendance, then the global schedule: active school-day tasks and exception handling.
2. Admissions and workshops: family conversion and session follow-up.
3. Finance and expenses: collection and reconciliation without losing dense record access.
4. Learning and portfolio, communications, then team/resources/admin: role-specific task flows after daily operations.

Each later module needs a separate task-level pass; shared theme coverage alone is not a finished workflow redesign.

## Verification and acceptance

- `npm run build` passes, with existing bundle/import warnings.
- No TypeScript diagnostics in the touched TSX files; repository-wide `tsc` still has unrelated diagnostics.
- `dailyPickupRoster.smoke.ts` and `pickupLifecycle.smoke.ts` pass with Node's TypeScript stripping.
- `node scripts/atlas-loop-agent.js` runs; this repository has no dedicated agent-check command.
- `git diff --check` passes.
- A designated signed-in school account still needs desktop and phone acceptance of both themes, live data, the Students passport scroll, and Pickup's physical handoff flow. This local worktree has no operator credentials. No pickup release should be executed just for visual QA.
