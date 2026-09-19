# Admissions Permissions Matrix

The app permission and Firestore role boundary must both each approve an operation. UI visibility is never the security boundary.

| Role | Read workflow | Add internal note | Create/complete task | Change stage | WhatsApp/provider | Payment/enrollment |
|---|---:|---:|---:|---:|---:|---:|
| Super admin | yes | yes | closed | closed | closed | closed |
| Owner | yes | yes | closed | closed | closed | closed |
| Admin | yes | yes | closed | closed | closed | closed |
| Admission Officer | yes | yes with `admissions.note` | closed | closed | closed | closed |
| Accountant | no | no | no | no | no | Finance only |
| Instructor | no | no | no | no | no | no |
| Content Manager | no | no | no | no | no | no |
| Parent / Student / Guest | no | no | no | no | no | no |

## Current permission keys

- `admissions.view`: assigned to the default Admission Officer for future visibility gating.
- `admissions.note`: required by the application command for an Admission Officer.
- Super admin, owner, and admin retain the existing application-wide implicit access behavior.

Firestore additionally restricts Admissions documents to `super_admin`, `owner`, `admin`, and `admission_officer` profiles in the same organization. A custom role carrying an app permission remains denied until rules support tenant role-definition lookup safely.

## Deny paths

- inactive actor;
- missing `admissions.note` for Admission Officer;
- role outside the approved operator set;
- actor organization differs from command organization;
- lead or workflow state belongs to another organization;
- actor ID differs from `request.auth.uid`;
- mutation of an existing activity;
- deletion of workflow state or an existing activity;
- every task write during this slice.
