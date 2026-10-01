# SparkQuest Rescue — Phase 2

Completed locally on 2026-09-24. No production report, production write, rule/index change, migration, release, or deployment was performed.

## Objective

Replace raw project links and custom tokens in URLs with a short-lived, server-issued Edufy-to-SparkQuest launch exchange. Add a tenant-scoped, read-only reconciliation report for user, learner, and project identity links before any migration is considered.

## Launch contract

1. The signed-in Edufy browser sends its fresh Firebase ID token, selected organization ID, and optional project ID to the App Bridge.
2. The server verifies the Firebase token, active user profile, active organization, SparkQuest entitlement, learning permission, learner link, project tenant, and project ownership.
3. The server creates a random 256-bit launch code, stores only its SHA-256 hash, and gives it a 90-second expiry.
4. The browser opens SparkQuest with only the opaque one-time code.
5. SparkQuest exchanges the code from its exact allowed origin. The server rechecks current access, atomically consumes the session, and returns a Firebase custom token in the HTTPS response body.
6. SparkQuest removes the code from browser history and resolves the learner again through the Phase 1 identity contract.

Staff always retain their own Firebase identity. A staff launch never signs the staff member in as a learner. Raw custom tokens are no longer accepted from URL query parameters.

## Reconciliation contract

The authorized read-only endpoint analyzes only records carrying the selected `organizationId`. It returns document IDs and issue codes—not learner names, emails, phones, or credentials—and checks:

- student records missing an Auth UID;
- duplicated Auth UID links;
- missing, inactive, or wrong-role user profiles;
- disagreement between `users.studentId` and the canonical student document;
- student users without exactly one linked learner;
- projects with missing, unknown, or ambiguous owners;
- projects still using the accepted legacy Auth UID alias.

Records outside the tenant are counted as excluded but never included in issue detail.

## Safety gates

- App Bridge session writes are disabled unless the server-only `EDUFY_ENABLE_APP_BRIDGE_WRITES=true` flag is explicitly configured.
- The local default remains disabled, preventing authenticated local UI testing from writing launch sessions to production.
- `app_launch_sessions` remains server-only under the existing default-deny Firestore rule; no rule change was needed.
- Exchange responses are no-store, origin restricted, and contain no token in a URL or log.

## Evidence

- Phase 2 domain smoke: 28 assertions covering code entropy/shape, hashing, expiry, replay rejection, origin binding, tenant/app/role checks, learner/project ownership, non-impersonating staff access, and reconciliation findings.
- HTTP guard checks passed for missing auth, invalid code, disallowed origin, and the disabled-write safety gate.
- All three server endpoints import successfully.
- SparkQuest TypeScript passed.
- SparkQuest production build passed: 2,216 modules.
- Edufy production build passed: 4,428 modules.
- Existing signed-in SparkQuest dashboard remained functional after hot reload.
- Invalid launch browser QA showed the account-repair screen and removed the launch code from the address.

Existing Firebase mixed-import and bundle-size warnings remain.

## Production audit status

The Edufy MakerLab data connector was unavailable, so the production reconciliation endpoint was not executed and no claim is made about live record health. The endpoint is ready for an authorized read-only run after deployment, but deployment is outside this phase.

## Next boundary

Before enabling the bridge in production, run it against isolated Auth/Firestore emulators, add a cleanup/retention policy for expired launch-session audit records, deploy the API separately from client changes, and perform one explicitly authorized read-only reconciliation. Data repair or migration remains a later approval gate.
