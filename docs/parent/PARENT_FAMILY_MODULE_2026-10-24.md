# Parent family account repair — 2026-10-24

## Contract

- A parent contact email is contact data only. It is stored as `Student.parentEmail`, never used as an Auth identity, matching key, or duplicate-learner signal.
- Every newly issued parent account uses a generated `p.*@makerlab.academy` sign-in ID.
- One verified parent account may expose multiple explicitly selected learners in the same organization.
- Phone, surname, and contact email groups are review aids. They never merge accounts or prove a relationship.
- A learner may have an additional verified caregiver without losing their existing primary family login. Changing the primary login or retiring a duplicate still uses the transfer or repair flow.

## Implementation

`views/ParentsView.tsx` now treats the family or care group as the primary staff record. Contact-phone candidates are displayed once for review even when earlier attempts created several Auth UIDs; every generated login appears inside that record's Access tab. The Design System v1 workspace has Learners, Access and Billing tabs, responsive family cards, a prominent Add learner action, one-time credential issuance, password reset, statement printing, Finance navigation and direct learner Access repair links. Contact grouping remains presentation evidence only and never writes or merges accounts automatically.

`api/parent-access/index.js` provides `issueFamily` and `linkFamily`. The trusted endpoint validates staff role, organization, relationship confirmation, parent name, exact selected learner IDs, verified generated MakerLab login format and the destination account. A single Firestore transaction writes every guardian link. Learners without a primary family login receive the selected login; learners who already have one keep it and gain the selected caregiver through `parentUids` and exact guardian links. Directory reads include both primary and additional-care learners. If a new Auth user cannot be committed, it is deleted.

Enrollment no longer treats a shared parent email as a duplicate learner. New contact emails are stored in `parentEmail`; legacy `student.email` values remain readable as contact data and are not rewritten.

## Verification

- Root production build passed.
- Parent Auth/Firestore emulator passed generated-login issuance for siblings, contact-email preservation, additional caregiver access to a learner who retains another primary login, directory visibility, SparkQuest reads for every linked learner, cross-organization denial, duplicate-login protection, legacy transfer/repair, password invalidation, and role checks.
- Repository-wide TypeScript retains existing diagnostics. The changed application files have no new diagnostics; the only changed-test diagnostic was annotated because the production Admin helper is JavaScript.

No real family record is changed by this release. Staff must verify the exact parent and retained account before transferring an existing learner.
