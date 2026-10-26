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
