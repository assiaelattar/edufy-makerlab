# Parent family account repair — 2026-10-24

## Contract

- A parent contact email is contact data only. It is stored as `Student.parentEmail`, never used as an Auth identity, matching key, or duplicate-learner signal.
- Every newly issued parent account uses a generated `p.*@makerlab.academy` sign-in ID.
- One verified parent account may expose multiple explicitly selected learners in the same organization.
- Phone, surname, and contact email groups are review aids. They never merge accounts or prove a relationship.
- Learners already assigned to another UID must use the existing verified transfer or repair flow.

## Implementation

`views/ParentsView.tsx` provides the Parents directory and detail workspace: contact data, explicit learner selection, trusted account choice, one-time credential issuance, password reset, billing summary, statement printing, Finance navigation, and links into the learner Access tab.

`api/parent-access/index.js` adds `issueFamily` and `linkFamily`. The trusted endpoint validates staff role, organization, relationship confirmation, parent name, exact selected learner IDs, existing account state, and generated MakerLab login format. A single Firestore transaction writes every learner pointer and guardian link. If a new Auth user cannot be committed, it is deleted.

Enrollment no longer treats a shared parent email as a duplicate learner. New contact emails are stored in `parentEmail`; legacy `student.email` values remain readable as contact data and are not rewritten.

## Verification

- Root production build passed.
- Parent Auth/Firestore emulator passed generated-login issuance for two siblings, contact-email preservation, a third sibling linked to the same UID, family-session reads for all three children, conflicting-name denial, cross-organization denial, duplicate-login protection, legacy transfer/repair, password invalidation, and role checks.
- Repository-wide TypeScript retains existing diagnostics. The changed application files have no new diagnostics; the only changed-test diagnostic was annotated because the production Admin helper is JavaScript.

No real family record is changed by this release. Staff must verify the exact parent and retained account before transferring an existing learner.
