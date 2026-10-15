# School sign-in readiness — local candidate

## Changelog

- Removed the 2.5-second timer that opened the operational workspace before its first Firestore reads completed.
- The school account now resolves its user profile, role and real organization before the app can open.
- The dashboard waits for settings and the first role-relevant records: students, programs, enrollments, and, for school administrators, finance, workshops, attendance, tasks, leads and learner projects.
- A required read failure displays a specific retryable error instead of an empty dashboard. Missing or unassigned organizations display an access message.
- The operational context remounts when the user or organization changes, so records from the previous account cannot appear while the next one loads.

## Decisions

- Firestore's first snapshot is the readiness signal. An empty successful collection is valid; a timer or a failed collection is not.
- The public virtual demo remains outside the real-account readiness gate.
- Existing permissions, Firestore rules, API contracts and production records are unchanged.

## Known issues and acceptance

- This candidate needs a signed-in school-account check on a physical phone and desktop. The agent has no operator credentials for that account.
- Repository-wide TypeScript still has pre-existing diagnostics; the changed readiness code has no new scoped diagnostics. The existing missing `PublicEnrollmentView` reference in `App.tsx` is unrelated to this change.
- The local production build and whitespace check pass. No push or deployment was performed.
