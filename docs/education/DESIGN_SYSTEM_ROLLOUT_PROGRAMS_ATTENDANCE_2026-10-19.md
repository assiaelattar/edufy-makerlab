# Edufy Design System v1 — Programs and Attendance rollout

Local milestone completed on 2026-10-19 after the user approved the Dashboard, Students register and student forms as the shared reference.

## Shared contract applied

- Both modules opt into `data-edu-system="1"` and import the canonical token owner.
- The palette keeps its fixed roles: green identity/completion, blue operational action, yellow highlight, orange follow-up/late, purple learning context/excused and red error/absence.
- Registers and form fields stay on quiet surfaces. Color is concentrated in icons, selected states, next actions and feedback.
- Search, filters, selected program tab and roster query are retained in tab memory, scoped by organization and signed-in user.
- Existing hooks, permissions, writes, financial calculations, exports and public links remain the domain owners.

## Programs inventory

| Surface | Status |
| --- | --- |
| Portfolio header, priority, metrics, filters, empty state and cards | Migrated |
| Program overview | Migrated |
| Run plan | Migrated |
| Groups and schedule | Migrated |
| Roster, search, placement filter and exports | Migrated |
| Waiting list | Migrated |
| Finance | Migrated |
| Sharing, link and QR access | Migrated |
| Complete six-step setup wizard | Migrated to the shared dialog frame |
| Quote and QR dialogs | Migrated to the shared dialog frame |
| Academic-year preparation | Migrated to the shared dialog frame |
| Archived, paused and draft notices | Migrated |

Return behavior is verified: closing a program restores the portfolio query/filter, and reopening the same program restores its selected tab and roster query.

## Attendance inventory

| Surface | Status |
| --- | --- |
| Date navigation and server readiness states | Migrated |
| Daily progress and four status summaries | Migrated |
| Search and group filtering | Migrated |
| Session rail and continuous learner register | Migrated |
| Individual present/late/absent/excused controls | Migrated |
| Batch selection and confirmation | Migrated |
| Pending, saved and failure/retry feedback | Migrated |
| Empty, no-session, future-date and permission/read errors | Preserved and styled |
| Membership renewal disclosure | Migrated |

## Verification

- `npm run build`: pass. Existing Firebase mixed-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 20 token, contrast and reduced-motion checks pass.
- `node scripts/test-membership-lifecycle.mjs`: attendance eligibility, coverage, renewals and cohort checks pass.
- `node scripts/atlas-loop-agent.js`: context reader pass; repository has no dedicated agent-check command.
- `git diff --check`: pass.
- Full repository TypeScript check was started but remained non-terminating beyond the useful verification window and was stopped. The production build compiled all changed files successfully. Earlier baseline diagnostics remain outside these modules.
- Programs synthetic browser QA: desktop and 390px; light/dark; catalog, all seven tabs, roster filtering, close/reopen state restoration, setup form scrolling and shared dialog behavior. No save, export, delete, pause or rollover action was submitted.
- Attendance synthetic browser QA: desktop and 390px; light/dark; populated register, individual save success, injected save failure with retry-ready state, filters and selected status rendering. Fixture writes never reach school data.
- Signed-in real-account read-only check: Programs loaded 10 records with 6 active and 87 active learner placements; Attendance loaded 32 scheduled places across 4 sessions. No control that writes, exports, messages or changes configuration was used.

## Evidence and previews

- Programs: `http://127.0.0.1:5238/?theme=light` and `?theme=dark`.
- Attendance: `http://127.0.0.1:5231/?theme=light` and `?theme=dark`.
- Actual signed-in app: `http://127.0.0.1:5202/`.
- Captures: `pulse-evidence/ds-v1-programs-*.png` and `pulse-evidence/ds-v1-attendance-*.png`. All committed captures use synthetic records.

## Boundary

This is a local UI milestone. No deployment, push, authentication change, permission change, financial-rule change or production write occurred. Physical-phone acceptance and any real write acceptance remain separate. Unfinished Admissions/Workshops changes were preserved and excluded from this milestone.
