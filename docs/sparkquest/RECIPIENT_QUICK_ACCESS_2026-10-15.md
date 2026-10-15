# Parent and learner quick access — local build

Edufy's learner profile now offers two distinct SparkQuest sharing paths for each existing account:

- **Manual link and QR:** reusable role-specific sign-in page, with the recorded login ID shown on the card. The recipient enters the existing password. No password or session token is embedded in the QR.
- **One-click link and QR:** staff first confirm the recipient's identity and relationship, then request a five-minute, single-use launch URL. Edufy can copy, open a reviewed WhatsApp share, display, or print that QR. A used or expired code cannot be reused.

The trusted Edufy API verifies the staff Firebase session, active tenant, enabled SparkQuest module, exact recipient Auth UID and role, active user profile, and linked learner. A parent needs matching `parentLoginInfo`, `parentUids`, and an active exact `guardian_links` document. A learner needs one matching student record and pointer. The API stores only a SHA-256 hash of a random launch code in `app_launch_sessions` and records the issuer UID, target UID, tenant, role, learner and expiry. SparkQuest exchanges the code from its own allowed origin; the server revalidates the recipient and issuer, atomically consumes the code, and returns a Firebase custom token in the response body. The Firebase token is never put in the URL or QR.

The existing manual password path stays available. Student Showcase deletion still requires recent password reauthentication; a custom-token sign-in alone does not satisfy that rule. Staff should not open a recipient's one-click URL in their own browser. Printed quick QR cards expire after five minutes; only manual QR cards are reusable.

## Release boundary

No Firestore rule or index change is needed because the API uses Firebase Admin and the signed-in recipients retain their existing UID and rules. The new Edufy UI and Vercel API must be released from the same commit. SparkQuest's existing `?launch=` client can exchange the new recipient code through the updated API; verify this on a designated parent and learner device before claiming production acceptance. API origin configuration must allow the Edufy Hostinger origin, and the SparkQuest exchange origin must remain allowlisted. No production family credentials or records were changed during this build.

## Local verification

- `node modules/sparkquest/domain/recipientAccessPolicy.smoke.mjs`: 17 identity/tenant/role assertions pass.
- `node modules/sparkquest/domain/sparkquestPhase2.smoke.mjs`: 28 existing launch, origin, expiry and replay assertions pass.
- SparkQuest `tsc --noEmit`: pass.
- Root Edufy and standalone SparkQuest production builds: pass.
- Root repository-wide `tsc --noEmit` still reports existing errors in `App.tsx` (`PublicEnrollmentView`) and `maker-pro/`; it reports no diagnostics in the new quick-access files.
- No repository `agent:check` command is configured.
