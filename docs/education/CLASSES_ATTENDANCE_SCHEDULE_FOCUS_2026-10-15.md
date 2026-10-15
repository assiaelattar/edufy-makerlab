# Education UI — Classes, attendance and schedule focus

Date: 2026-10-15. Local candidate on `agent/edufy-school-theme-20261015`; no release or production data change.

## Operator flow

1. Classes starts with the real groups scheduled on the device's local day. The primary action opens attendance; a secondary action opens the first class roster. Group counts now follow the same date-sensitive attendance eligibility used inside each roster.
2. Attendance starts with the selected day's remaining marks, session count and a direct jump to the existing roster. The action clears visual filters before jumping so the full pending roster is visible. Future dates remain read-only. English and French weekday labels in enrollment schedules resolve to the same selected day.
3. Schedule starts with the first unassigned session and its actual date/time, or the next session when coverage is set. Assignment and week sync controls appear only for attendance managers; other staff can inspect session details. The week grid and existing assignment/sync writes remain.

The three screens keep the blue school palette restrained to primary focus and use semantic surfaces in the light and dark themes. The `?ui=atlas-legacy` rollback skips the new priority strips. No schema, permission, API, Firestore rule or index changed.

## Verification and acceptance

- `npm run build` passes with the repository's existing Firebase import and large-chunk warnings.
- `git diff --check` passes; scoped TypeScript emits no diagnostics in changed files. Repository-wide TypeScript has existing errors outside this phase.
- A weekday smoke checks French/English Tuesday schedules and rejects a Monday schedule on Tuesday.
- Signed-in staff desktop and phone acceptance remains pending for actual tenant records, theme contrast, attendance marking, instructor assignment and mobile scroll. The local candidate has no operator credentials; these actions were not run against real records.

Next priority: Admissions and Workshops, after this phase's signed-in review.
