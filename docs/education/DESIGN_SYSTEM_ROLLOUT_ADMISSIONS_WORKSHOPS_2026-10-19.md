# Edufy Design System v1 — Admissions and Workshops rollout

Local milestone completed on 2026-10-19 under the approved school-team design contract.

## Shared contract applied

- Admissions and Workshops opt into `data-edu-system="1"` and use the canonical token owner.
- Green carries school identity and completion, blue carries operational actions, purple carries family journeys and selected learning context, orange is limited to follow-up/review, and red remains reserved for errors or destructive actions.
- Existing sidebar navigation, data hooks, permission checks, admission projections, workshop booking logic, enrollment conversion and public-link behavior remain authoritative.
- Tabs, searches, selected admission stage and selected family are retained in tab memory. The scope follows the organization and signed-in user where the parent workspace provides that identity.
- Workshop forms, history and performance-report dialogs use the shared full-height mobile dialog frame and preserve their existing validation and submit handlers.

## Admissions inventory

| Surface | Status |
| --- | --- |
| Family follow-up priority and evidence summaries | Migrated |
| Today, Pipeline and All cases working views | Migrated |
| Search, stage and record-review filters | Migrated and retained |
| Family list selection | Migrated and retained |
| Family journey passport | Migrated; mobile focus trap, Escape and focus return verified |
| Linked workshop and enrollment evidence | Migrated |
| Compatibility/detail review notices | Migrated with restrained orange |
| WhatsApp assistant | Migrated; consent and factual activity boundaries preserved |
| Empty and permission-restricted behavior | Preserved and verified |

## Workshops inventory

| Surface | Status |
| --- | --- |
| Workshop priority and four operational summaries | Migrated |
| Calendar and daily agenda | Migrated |
| Expandable session and attendee controls | Migrated |
| Family follow-up register | Migrated with search |
| Workshop template catalog | Migrated with search |
| Create/edit complete workshop form | Migrated to the shared dialog frame |
| One-time and weekly scheduling controls | Migrated |
| Public booking state and invitation preview | Migrated |
| Booking history dialog | Migrated with search |
| Performance report form | Migrated to the shared dialog frame |
| Empty calendar, follow-up and template states | Preserved and verified |

## Verification

- `npm run build`: pass. Existing Firebase mixed-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 20 token, contrast and reduced-motion checks pass.
- `node scripts/test-membership-lifecycle.mjs`: membership, attendance, renewal and cohort checks pass.
- `git diff --check`: pass.
- Synthetic browser QA: desktop and 390px; light/dark; Admissions populated and empty states; family passport; assistant; Workshops calendar, follow-up, search, templates, create form, history and empty states. Long dialogs scroll and close with keyboard/focus restoration.
- No synthetic messaging, booking change, CRM conversion or AI evaluation reaches Firebase. The fixture disables those paths; only local-memory template writes are available and none were submitted during this pass.
- Signed-in real-account read-only check: Admissions loaded 9 family inquiries. Workshops loaded 3 templates, 32 schedule slots and 2 booked spots. No messaging, status, enrollment, template, report or booking write was triggered.

## Evidence and previews

- Admissions light: `http://127.0.0.1:5244/?theme=light&module=admissions`
- Admissions dark: `http://127.0.0.1:5244/?theme=dark&module=admissions`
- Workshops light: `http://127.0.0.1:5244/?theme=light&module=workshops`
- Workshops dark: `http://127.0.0.1:5244/?theme=dark&module=workshops`
- Empty states add `&scenario=empty`.
- Actual signed-in app: `http://127.0.0.1:5202/`.
- Committed captures: `pulse-evidence/admissions-*-mobile-dark.png`, `pulse-evidence/workshops-*-mobile-*.png` and `pulse-evidence/ds-v1-workshops-mobile-dark.png`. All captures use synthetic records.

## Boundary

This is a local UI milestone. No deployment, push, authentication change, permission change, financial-rule change or production write occurred. Physical-phone acceptance and any real write acceptance remain separate. Next rollout phase: Finance and Expenses, followed by Learning and Portfolio.
