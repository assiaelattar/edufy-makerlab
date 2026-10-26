# Workshop request → instructor handoff (2026-10-26)

## Current-main integration note

The clean release candidate is based on the newer public booking repair. It retains the single Firestore transaction, deterministic slot ID, idempotent attempt ID, capacity guard and French translation protection from `main`. The request status is set inside that transaction. The candidate rule permits both `confirmed` and `requested` during the client transition; tightening to `requested` is a separate later rules release after old clients have stopped submitting. No production rule or frontend has been deployed from this candidate.

Current-main integration checks: the production build passed with 2,968 modules, the Education design check passed all 62 checks, the Instructor Pass schedule, WhatsApp URL and Admissions adapter smokes passed, and the local Firestore emulator passed both `requested` and legacy `confirmed` public creates plus idempotency, capacity and tenant denials. The integration restored the group, workshop-template and class-session type declarations required by the feature. The transitional `firestore.rules` change is a protected release path and remains pending explicit approval under `$hostinger-main-release`.

## Changelog

- Public workshop submissions and staff-created CRM workshop requests now create `requested` bookings and tell families or staff that the session needs confirmation. Requested places continue to count against capacity.
- Workshops Calendar now assigns an active instructor from the current organization to a dated, materialized slot. The booking status can become `confirmed` only after the slot has an assignment. Dashboard confirmations route staff to Workshops for that step.
- A separate WhatsApp button opens a French confirmation draft with the exact workshop title, child, local date, start/end time and venue. MakerLab messages include the supplied lab map link. Opening the link does not mark the message sent.
- A requested booking must move through confirmation before attendance, reminder or later follow-up states.
- Instructor Pass is included in the current UI checkout and reads the same tenant-scoped workshop slots. A dated slot assignment overrides the template default and appears only for the assigned instructor, including a paused template with an existing slot. Ad hoc assigned slots are included.
- Program Details now assigns an active same-organization instructor to each grade group. The change updates the latest `grades` document in a Firestore transaction. Instructor Pass projects the group's weekly blocks for that UID; a materialized class session with an explicit instructor or cancellation still takes precedence.
- Corrected the Workshops Design System selector that targeted `data-edu-theme` on `body` even though the theme lives on the Education shell. This restores readable light/dark session cards.

## Decisions

- Instructor assignment belongs to the dated `workshop_slots` record so different occurrences may have different instructors. The picker uses active same-organization team accounts, not a fixed Ayoub account.
- STEMQuest group assignment belongs to the program's grade/group record and is saved with a transaction to avoid overwriting concurrent roster/schedule edits.
- Public requests hold a place until staff cancels or confirms them. This preserves the existing capacity behavior.
- WhatsApp remains a manual redirect. Edufy records the booking status, not a claimed message delivery.
- A new public booking is a request; existing confirmed bookings retain their historical status.

## Verification

- `npm.cmd run build`: passed (2,965 modules; existing chunk/dynamic-import warnings).
- `node scripts/check-education-system.mjs`: 62 checks passed.
- Instructor Pass schedule smoke: group week, unassigned materialized-session fallback, reassignment from Ayoub to Ahmed, dated workshop override, ad hoc slot and other-tenant exclusion passed.
- Workshop confirmation URL smoke: French date, 18:00–19:30 interval, Moroccan phone normalization, MakerLab map and invalid phone passed.
- Admissions adapter smoke: existing 22 scenarios passed; added requested-booking stage assertion.
- Isolated Workshops fixture: light and dark populated calendar visually reviewed, instructor dropdown includes Ayoub and another instructor, and local-only selection saved. No school data or WhatsApp message was sent.
- Isolated Programs fixture: Groups & schedule displayed both instructor options and saved a different instructor for the Explorers group in local memory. No school program was changed.
- `git diff --check`: passed. Repository-wide TypeScript still has pre-existing errors; the touched-path filter found no new error from this change.

## Known issues and release gate

- This is a **local candidate**, not a live release. The public client now writes `requested`; production Firestore rules currently accept only `confirmed`. Publishing the client or rules alone would break one version of public booking. Release must coordinate a transitional rule, client deployment, and final rule tightening, then test a real public request.
- Real-account acceptance is still needed with Ahmed and two different active instructors. Check organization roles, WhatsApp app handoff on a phone, and live listener timing. No production booking was changed during this pass.
- Template-wide default instructor editing remains separate work. This pass covers dated workshop and STEMQuest group assignment with the Pass projection.

## Handoff

Continue with coordinated Firestore/frontend release only after reviewing the exact rule rollout. Then create a disposable real public request, assign a non-Ayoub instructor, confirm it, inspect the French WhatsApp draft without sending, and verify only that instructor's Pass receives the workshop. Assign one STEMQuest grade group to a different instructor and verify that person's weekly Pass.
