# Parent access legacy login hotfix — 2026-10-15

## Problem and cause

Edufy's learner record can contain a parent contact email from the older enrollment/invitation flow. The UI presented it as a SparkQuest login. The password route accepted only `p.*@makerlab.academy` and required a matching Firebase Auth user. Replacement also required a complete active old parent account and a recorded parent name. Platform super admins stored under `atlas-platform` were rejected for MakerLab learners by the API's same-tenant check.

## Focused fix

- A true active platform `super_admin` may manage an existing target organization. Other staff remain limited to their own organization.
- Staff must confirm the real parent relationship and enter a real parent name. A learner surname or historical “family” label is no longer enough to issue a new login.
- Replacement accepts a recorded legacy parent pointer whose old Auth user or parent profile is missing, or whose old email is external. It checks every linked learner, parent UID reference, guardian link, learner Auth UID, name, tenant and existing account role before moving siblings together. Conflicts fail closed. A staff account is handled only by the separate staff-link repair path and remains active.
- The student page directs external legacy emails to new MakerLab login creation. The verified parent name defaults the login alias; staff can edit the alias. The existing-account directory is explained as active SparkQuest logins only. Errors keep the form open.
- “Display parent access card” issues a new password after staff verification when the previous card is no longer in page memory. The old password is invalidated. No plaintext parent password is stored for redisplay.
- Live UI follow-up: a one-word enrollment value such as a surname is treated as an unverified family label. The replacement form asks for the parent's verified full name while suggesting the existing family alias. The server accepts that name correction across all learners linked to the same legacy login and updates each learner's parent name when issuing the new account. A one-word replacement name is rejected.

## Verification and release

Synthetic Auth/Firestore emulator cases pass for platform admin permission, cross-tenant denial, missing old Auth/profile, external old Auth/profile, a mistaken platform-admin parent link, multiple linked learners, old password invalidation, and no plaintext in family records. The Edufy Vite production build passes with the declared SparkQuest dependencies installed. Repository-wide `tsc --noEmit` has unrelated pre-existing errors; a focused check of the touched views is used for this hotfix. The live release status must be verified separately for the Vercel API and Hostinger client.

The one-word family-name follow-up also passes the isolated Auth/Firestore emulator with two linked learners and the Edufy production build. This follow-up requires its own Hostinger client and Vercel API release; the prior live build does not contain it.
