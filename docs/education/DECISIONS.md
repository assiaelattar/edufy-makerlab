## 2026-10-21 — Preserve newer main work during thread promotion

Keep the already released navigation v2 and Attendance renewal panel when promoting this thread's Settings, Student Details, Attendance and connected visual corrections. Carry only the reviewed app delta; do not promote the long-lived feature branch or unrelated checkout changes.

# Education UI decisions

## 2026-10-21 — Promote the global shell independently

- Release the reviewed navigation v2 as a focused presentation cut after the user identified the older live menu. Preserve module handlers and leave module-specific acceptance candidates outside the cut.


## 2026-10-20 — Selective release promotion

- Promote reviewed school modules by explicit final file delta from the coordinator branch into current `main`; never merge its complete history. Preserve business handlers, record shapes and permission sources.
- Exclude the unreviewed school-operations bridge and modules with independent data, role or cross-product release gates. Keep API, rules, indexes, SparkQuest and MCP changes out of this app-only release.

## 2026-10-20 — Release scope

- Carry only the reviewed Programs roster date display fix from the UI coordinator branch into a clean current-main candidate. Keep the unfinished school-operations bridge and module work with open acceptance gates out of this release cut.

## 2026-10-16 — Startup readiness

- Keep the first successful Firestore snapshots for settings, students, programs and enrollments as the school workspace gate. A successful empty collection is valid.
- Subscribe to other module collections after this gate; their live snapshots continue updating the open workspace.
- Keep plan, catalog and organization entitlement checks before showing modules. Add-on request status can hydrate afterward.
- A long wait alone is not a failed connection. Offer a page reload only when an actual auth or required-data error is reported.

## 2026-10-15 — School-day operational priority

- Follow Programs, Students and Pickup with Classes, attendance and Schedule as one school-day phase. Use existing live selectors and the local device date.
- Surface only the actual next action: today's class/roster, selected-day attendance marks or unassigned instructor coverage. Keep metrics below the action.
- Reuse a small weekday normalizer across these screens so French and English labels have the same attendance and planning interpretation.
- Preserve existing write handlers and enforce their current manager permission in visible schedule controls. Keep light/dark styles scoped to school-day modules.

See `CLASSES_ATTENDANCE_SCHEDULE_FOCUS_2026-10-15.md`.

## 2026-10-15 — First three operational modules

- Prioritize Programs, Students and Pickup in that order for this local candidate. The next operational pass is Classes and attendance, then Schedule.
- Derive each lead action from the module's existing tenant-scoped projections; do not introduce showcase counts or write new records for visual design.
- Keep the school workspace's light and dark tokens. Scope module expression to its real task: portfolio setup, learner next step, or verified gate handoff.
- Keep the full learner profile route on the learner row. Use a separate labelled preview for the selected passport.
- Keep Pickup's authorization and state transitions intact. Bring dated live handoffs before the full roster and surface incompatible legacy waiting records as staff review.

See `PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.
