# Education UI decisions

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
