# Edufy thread release — 2026-10-21

This release promotes the reviewed local Settings, Student Details and main Attendance quality passes onto current `origin/main`. It also includes the connected 011Y guide and the recorded Classes, Program detail, Finance, service catalogue and notification Design System fixes from this thread. The existing navigation v2 and Attendance renewal panel already on `main` are retained.

The scope changes app presentation and the already reviewed Student Details learner loading, owner checks and atomic payment-edit behavior. It does not change a public API, stored schema, Firestore rules/indexes, provider secrets or the separate Edufy MCP service. Synthetic screenshots and review fixtures contain invented data only.

Release checks in a clean main-based worktree: production build, 27 Design System checks, Attendance membership checks, Student Details payment-edit smoke and `git diff --check` passed. Existing Firebase mixed-import and large bundle warnings remain. Signed-in designated-role saves, real-school persistence and physical-phone review remain acceptance work as recorded in the module reports. No production record was written during preparation.
