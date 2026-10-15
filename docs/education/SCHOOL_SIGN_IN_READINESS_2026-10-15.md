# School sign-in readiness — local candidate

## 2026-10-16 follow-up

The first candidate gated startup on fourteen role-dependent Firestore collections, which caused long waits for unrelated modules. Startup now waits for settings, students, programs and enrollments. Remaining listeners start after that gate, so their data continues to arrive live. Add-on request status no longer holds the module entitlement check; plan, catalog and organization access remain gated. The boot screen shows a long-wait status after eight seconds but offers Retry only for an actual error; reloading during an ordinary slow read had restarted the entire process. Signed-in timing and data acceptance are still required.

## Changelog

- Removed the 2.5-second timer that opened the operational workspace before its first Firestore reads completed.
- The school account now resolves its user profile, role and real organization before the app can open.
- The dashboard waits for settings and the first role-relevant records: students, programs, enrollments, and, for school administrators, finance, workshops, attendance, tasks, leads and learner projects.
- A required read failure displays a specific retryable error instead of an empty dashboard. Missing or unassigned organizations display an access message.
- The operational context remounts when the user or organization changes, so records from the previous account cannot appear while the next one loads.
- The dashboard accepts English and French weekday names in existing class records and includes both primary and second group sessions on the same day.

## Decisions

- Firestore's first snapshot is the readiness signal. An empty successful collection is valid; a timer or a failed collection is not.
- The public virtual demo remains outside the real-account readiness gate.
- Existing permissions, Firestore rules, API contracts and production records are unchanged.

## Known issues and acceptance

- This candidate needs a signed-in school-account check on a physical phone and desktop. The agent has no operator credentials for that account.
- Repository-wide TypeScript still has pre-existing diagnostics; the changed readiness code has no new scoped diagnostics. The existing missing `PublicEnrollmentView` reference in `App.tsx` is unrelated to this change.
- The local production build and whitespace check pass. No push or deployment was performed.
