# Parent credentials Phase 3 — staff issuance and reset

## 2026-10-11 local follow-up — replace an old email invitation

Existing `parentLoginInfo.uid` from the former email setup-link flow blocked `issue`, while `reset` could fail when its guardian link was missing. Student Details now offers **Create new SparkQuest login ID and password** for a recorded account. Staff verify the recorded parent name and relationship again; the trusted endpoint checks the old Auth user, active same-tenant parent profile, exact saved email, all linked students, parent UID references and guardian links. It creates a fresh password account, moves every learner tied to that exact UID in one Firestore transaction, retires the old profile and links, and disables the old Auth user. A failed transaction deletes the newly created Auth user. Ambiguous or foreign links fail closed for manual review. The one-time password is returned only to the staff card. The existing reset remains for a verified account when the login ID should stay the same.

The local `demo-parent-replace-check` Auth/Firestore emulator passed a two-child legacy case with one missing guardian link, old-account denial and new-account sign-in/reset. Root production build and origin smoke passed. No real Ajlane record was inspected or changed. The hosted parent API is still a release gate, so the real-data localhost UI cannot perform this write until a trusted Admin API is deployed and configured.

Status: **implemented locally, NOT RELEASE READY.** No production account, record, rule, index, commit, push, or deployment changed.

## Contract

- Edufy Student Details issues a parent Firebase email/password through `POST /api/parent-access` with a current staff ID token. The endpoint accepts active same-tenant `super_admin`, `owner`, or `admin` profiles, verifies the learner's tenant, and uses Admin SDK for Auth and Firestore. The client never decides account authority.
- Staff confirm the real parent's full name recorded on the learner and the exact parent–learner relationship. The server requires an explicit verification flag and a name matching the current learner record before new issuance. Staff enter a separate alias basis, preview the normalized address, and may use `Ajlane` for `p.ajlane@makerlab.academy` while the verified full name remains the Auth display name and Firestore profile name. Auth collisions receive `-2`, `-3`, and so on; the requested unsuffixed address is not guaranteed until issuance. The 32-character cryptographic password appears only in the response and one-time credentials modal. It is not stored in Firestore or logged. Email verification remains false because no mailbox ownership was proven. Firebase password sign-in needs no setup email.
- Staff may explicitly select an existing verified parent UID from another learner to link a sibling, after confirming the real parent–learner relationship. The server checks its active parent profile, tenant, and existing active exact guardian link. Matching surnames, names, phone numbers, or contact email never merge accounts. Linking does not change that parent's password. An existing learner parent UID blocks a second issue/link.
- Staff reset checks the learner's exact active guardian link and same-tenant active parent profile. It revokes refresh tokens before changing the password, then returns the new password once. Old passwords stop working. Existing student/staff profiles are never converted to parents.
- Canonical learner and learner Auth UID guardian links receive the existing `portfolio`, `enrollments`, `payments`, `gallery`, and `pickup` permissions. Edufy retains guardian/learner facts; the credentials modal, WhatsApp text, print card, and later share text point parents to SparkQuest.
- The enrollment wizard no longer auto-creates or links a parent from the contact email. After enrollment, staff are sent to Student Details to issue or explicitly link parent access. Existing linked parent access is preserved.

## Files and checks

Owned code: `api/parent-access/index.js`, `services/parentAccess.ts`, `modules/parent-access/parentAccess.emulator.mjs`, focused changes in `views/StudentDetailsView.tsx`, `views/student-details/AccessAndAccountsTab.tsx`, `App.tsx`, and `utils/helpers.ts`.

- Isolated `demo-parent-access` Auth/Firestore emulator suite passed on 2026-10-11: separate full parent name `Samira Ajlane` and alias basis `Ajlane`, unsuffixed and collision-suffixed aliases, preserved Auth/profile full name, missing verification and mismatched-name denial, nonparent alias collision, explicit sibling UID link and alias subject, repeated issue denial, unlinked reset denial, parent-role and cross-tenant denial, password reset sign-in, and no plaintext in student/profile/link documents. All test people and records were synthetic.
- Edufy production build passed. Repository-wide TypeScript remains red on broad pre-existing diagnostics; the scoped scan found only the existing `App.tsx` missing `PublicEnrollmentView` reference in touched files. `node --check` on the endpoint and tracked whitespace check passed.

## Release gates

1. Prepare a clean main-based release of the exact endpoint and client changes. The trusted API must be reachable wherever the Edufy client is hosted; a static Hostinger bundle alone cannot issue or reset Auth accounts. Validate environment service credentials and API routing without exposing them.
2. Test an authorized staff account in the deployed environment: issue, close the one-time card, sign in through SparkQuest, link an actual sibling with explicit UID, and reset from Student Details. Test a nonstaff denial. Use only designated nonproduction accounts.
3. Coordinate with the Parent access Phase 2 guardian rules/index and SparkQuest family workspace releases. Pickup's separate release gates remain open. Audit legacy family links and avoid publishing the mixed checkout. The real Ajlane family's parent full name, exact three learner IDs, and parent UID remain unverified here; no account or link was created for Kenza, Nada, or Ali Ajlane. Verify those facts before linking exactly those three records to one parent UID.

The latest issued password remains only in the open learner-profile page state so staff can close and reopen its access card during the same working session. It is never written to Firestore, logs, or browser storage. After staff leave or refresh the profile, no password is recoverable from Edufy and staff must issue a new password through the trusted reset path if it is lost.
