# StemQuest membership and school cohort attendance

Implemented locally on 2026-09-17. The policy is intentionally derived at read time: no existing program, enrollment, student, payment, attendance record, or history entry is deleted or rewritten.

Released to `origin/main` and verified live on Hostinger on 2026-09-17 as commit `fe1cd1a44996aa6b91f9b61a3f220d736f31c1dc`.

## Operating model

- MakerLab memberships use `rolling_membership`. Each learner starts on their enrollment date and receives an individual end date from the program membership duration.
- A rolling MakerLab program is evergreen. Any old program-level end date is preserved for compatibility but does not close the program or expire every member together.
- School terms use `fixed_run`. Semester 1 or semester 2 has one shared start and end date for every learner in the cohort.
- A fixed program becomes operationally `finished` after its shared end date. New enrollment links, forms, weekly session generation and current rosters close automatically, while its records remain available as history.
- Attendance uses the selected attendance date. A learner is shown only when that date falls inside the enrollment coverage, so historical attendance remains available while expired memberships disappear from current and future rosters.
- The Attendance page shows active students with expired rolling memberships in a dedicated renewal queue and links each row to the student profile.
- Fixed school cohorts never create individual renewal tasks. Once the shared term ends, the cohort simply leaves later attendance rosters.

## Source of truth

- `utils/membershipLifecycle.ts`: legacy-safe coverage resolution, attendance eligibility and renewal queue selection.
- `utils/programLifecycle.ts`: canonical service-period calculation when a new enrollment is created.
- `utils/program-readiness.ts`: derived operational state and enrollment-open policy.
- `App.tsx`: enrollment persistence; fixed cohorts now save the shared start date and academic session.
- `components/programs/ProgramSetupWizard.tsx`: School term enforces one shared run and explains semester behavior.
- `views/AbsenceView.tsx`: coverage-gated roster and renewal queue.
- `views/ProgramsView.tsx`, `views/EnrollmentFormsView.tsx`, `views/ClassesView.tsx`, `views/CalendarView.tsx`, and `views/DashboardView.tsx`: derived finished/evergreen state across enrollment, rosters and schedule materialization.

## Compatibility decisions

- For fixed cohorts, the program shared run dates are authoritative so a later data-entry date cannot extend a finished semester.
- For rolling memberships, personal enrollment dates are authoritative and any legacy program end date is ignored.
- Legacy StemQuest records without `enrollmentMode` are treated as rolling MakerLab memberships unless their program is a school/company cohort.
- An expired enrollment is not shown as due when a newer active rolling enrollment exists for the same learner and program.
- Expired rolling memberships no longer count as active duplicates or consume class capacity, so the existing guided enrollment flow can create the renewal record.
- Inactive students and dropped/completed enrollments are excluded.

## Known boundaries

- A legacy rolling membership with no end date uses the program duration; if neither policy nor a recognizable StemQuest program is available, Edufy preserves the existing roster behavior instead of guessing.
- The renewal queue is operational visibility only. Renewal still uses the existing guided enrollment flow.
- The queue currently lives on Attendance; a separate CRM campaign or automated reminder workflow was not added.

## Validation

- `node scripts/test-membership-lifecycle.mjs` passes coverage, historical attendance, expired membership, legacy compatibility, evergreen rolling programs, fixed-program auto-close, renewed-membership deduplication and school-cohort assertions.
- `npm.cmd run build` passes (4,424 modules) with the existing Firebase dynamic-import and large-chunk warnings.
- Repository-wide `tsc --noEmit` still reports legacy errors outside this slice. The focused filter reports no remaining diagnostics in `membershipLifecycle`, `ProgramSetupWizard`, or `AbsenceView` after the local Firestore narrowing fix.
