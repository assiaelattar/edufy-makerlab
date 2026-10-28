# Parent multi-child account repair — 2026-10-26

## Observed break

Two learners in the same reported family currently point to separate `p.*@makerlab.academy` Auth UIDs. Their recorded parent labels also differ: one is a family label and the other appears to contain a learner's name. The existing Edufy transfer path rejected any verified destination name differing from the source learner's old parent label. The UI locked a two-word recorded label, so staff could not correct it in the same flow. The directory hid otherwise active accounts whose canonical guardian links were incomplete.

## Focused local repair

- Staff choose the exact destination account and explicitly verify the real relationship. Selecting a directory account fills its parent label. Exact-email lookup obtains the account label without treating the source learner's old label as verified.
- A single-child source account may transfer despite a stale parent label. The transaction still checks its exact UID, email, organization, Auth role, sole learner, current links, and unchanged source record; it checks an active linked destination profile in the same organization. It updates the transferred learner's parent label to the verified destination label, adds canonical guardian links, retires the old links and account, then revokes and disables its Auth login. A learner with no parent login may be linked to that exact account with the same verified label correction.
- The directory now displays active parent profiles and orphan recorded login pointers backed by exact learner IDs even if guardian links or the profile are missing. These rows are marked for recovery and cannot be used as a transfer destination until repaired.
- The UI emphasizes checking an existing family login before creating a separate suffix account.

## Acceptance boundary

The local signed-in Edufy screen confirmed the two learner records and different suffix logins read-only. Its parent-access API call fails because the localhost origin is not allowed by the hosted trusted API; this is a local integration limitation, not evidence that the parent credentials are invalid. No real family Auth or Firestore record was changed. The target login for the real consolidation requires exact staff selection and the user's confirmation. The SparkQuest family view already reads canonical `guardian_links` by exact parent UID and organization, so both children should appear after a valid transfer; this still needs a real parent-session check.

The isolated `demo-parent-access` Auth/Firestore emulator suite passes, including stale-name transfer, linking an unissued sibling with a stale label, recoverable-directory and orphan-pointer coverage, cross-tenant/role denials, password rotation and old-account retirement. The Edufy production build passes. The repository-wide TypeScript check still fails in unrelated legacy modules; it is not a clean release gate. SparkQuest parent-family and family-operations smoke checks pass. Release requires coordinated trusted API and Edufy client deployment; no SparkQuest client change is needed for this focused repair.

## Main-based integration — 2026-10-26

The focused commit was integrated into a separate clean worktree based on `origin/main` at `578098d`. Its newer family-first directory behavior, generated-login format check, and duplicate-login confirmation remain in place. The integrated API passes `node --check`, the Edufy production build passes, and the Auth/Firestore parent suite passes with both test clients explicitly using `demo-parent-access` (`FIREBASE_PROJECT_ID=demo-parent-access`). The first emulator attempt used the API's default project ID and failed at demo sign-in; aligning the demo IDs resolved that test setup error. Diff checks pass. No production account, API, client, rule, or data was changed.

The user chose to keep the release local pending acceptance. Before any publication, confirm the exact DAKY login that must survive, have designated staff verify the real relationship and transfer path, check both learners in the retained parent's SparkQuest session, and complete the open physical-phone role checks. `api/parent-access/index.js` is a protected release path and requires explicit release scope approval.

## New DAKY account direction — 2026-10-28

The user chose to create one **new** MakerLab parent account for Kamyl and Nassym and remove both older logins. The earlier transfer plan is superseded. The local main-based candidate now adds `replaceFamily` to the trusted parent API and a button in the Parents workspace for a duplicate-login care group. Staff must verify the caregiver for both learners and select their exact records. Each source login must be a distinct active MakerLab parent Auth account linked to only that learner in the same tenant; other learners, learner Auth identities, conflicting guardian links, or changed records stop the operation before any replacement. The operation creates one new Auth login, moves both primary parent pointers and guardian links in one Firestore transaction, preserves student records and secondary caregivers, retires old profile/link records for audit, then revokes and deletes both old Auth users. If Auth deletion fails after the Firestore transaction, the response flags incomplete retirement for administrator review instead of claiming a clean result. The new password is returned once and not stored in Firestore.

The synthetic `demo-parent-access` suite now covers the two DAKY-like siblings with stale parent labels, denial when an old UID serves a third child, the new parent sign-in and read access to both learner records, and deletion of the two old Auth users. The suite and Edufy production build pass locally. No live DAKY account has been created, moved or deleted. The currently open Edufy Vercel browser tab is signed out; the local page on port 5191 is unavailable. The new API and UI must be released together before designated staff can verify and run the live operation. Afterward, validate both children in the real SparkQuest parent session and confirm the old logins cannot sign in.

### Decision and known issue

- Decision: retire the old Firestore profiles and guardian links for audit, but delete the old Firebase Auth users after the atomic learner move. This removes sign-in while retaining an account-change trail. If deletion fails, the API reports incomplete retirement and staff must review it before sharing the credentials.
- Known issue: a care group inferred from contact data may not contain both DAKY learners. The Parents workspace therefore also lets staff search and select the other exact learner in the Add learner dialog, then choose the replacement action. This is a staff-verified selection, not an automatic surname merge.
- Release gate: new API and UI are local only. Do not run the real family operation until the correct build is live and the two source accounts and learners have been verified in the signed-in Edufy workspace.

### Integration review — 2026-10-28

The replacement path was reviewed on the main-based release branch after commits `6939f59` and `01b0c16`. A focused follow-up makes old-login retirement attempt token revocation, disabling, and deletion independently. A forced demo failure of both revocation and disabling still reached Auth deletion, and the full parent emulator suite passed. API syntax and diff checks pass. The candidate remains local under the user's release hold; no production account or API was changed.

If an old Auth account still cannot be deleted, the staff credentials card withholds the new password and directs an administrator to finish cleanup before issuing a fresh password. It does not offer a copy action in that state.

### Publication authorization — 2026-10-28

The user approved publishing the reviewed Parent Access API and Edufy client correction. The earlier local release hold is lifted for this code release only. The real DAKY account replacement is a separate staff action after live verification, exact record review, and relationship confirmation; deployment itself makes no family-record change. The workshop/Instructor Pass candidate remains outside this release.
