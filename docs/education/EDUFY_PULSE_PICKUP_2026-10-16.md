# Pulse Pickup — 2026-10-16

## Delivered

Pickup now opens directly on the gate register. The large hero, five signal cards and duplicate priority card have become a compact heading and inline operational counts. Status filters expose their selected state; All pickups correctly describes the existing set, which includes released learners awaiting family confirmation.

Handoffs use continuous learner rows, with the authorized picker alongside a named verification action. Identity verification expands within the row and focuses its first field. Incoming arrivals have a visible Mark arrived label. The scheduled roster remains present throughout pickup, in compact rows on desktop and stacked controls on mobile. The lobby now follows the selected school theme; its former light-mode dark override has been neutralized locally.

Existing AppContext queue/students/enrollments/programs, tenant projections, exact staff role checks, dated-record guards, authorized-picker validation, command calls, verification requirements, voice announcements and release evidence are unchanged. No authentication, rules, production data or financial logic changed.

## Verification

- Production build passed; existing chunk-size warnings remain.
- Full TypeScript: 235 pre-existing diagnostics, identical to the prior baseline. No new diagnostics.
- Existing pickupLifecycle.smoke.ts and dailyPickupRoster.smoke.ts pass under Node 24.
- Synthetic browser: incoming and learner-ready filters, no-match search and clear search; physical-arrival confirmation and callback; release disabled before note/confirmation; verified release callback with evidence; failed command keeps learner in queue and displays failure.
- Restricted-role fixture has no arrival or release controls. Missing organization, empty queue/roster and legacy reconciliation warnings render correctly.
- Lobby opens and exits, with light/dark mobile captures. Scheduled learners remain visible; the lobby has its own scrolling list.
- Light/dark desk at 1440, 766 and 390 CSS px: document scrollWidth equals clientWidth. First learner starts at 388, 436 and 609 px respectively. Light baseline: 638, 956 and 1234 px; dark baseline: 634, 952 and 1230 px. These measurements exclude the real app sidebar/header because this is an isolated view harness.
- Evidence: pulse-evidence/pickup-{before,after}-{desktop,tablet,mobile}-{light,dark}.jpg plus two lobby mobile captures (406 CSS px).
- Repository context reader scripts/atlas-loop-agent.js ran; its parser still selects historical Admissions headings. This is not a test suite. Current top-of-file phase instructions govern continuation.

## Preview and boundaries

- Isolated synthetic preview: http://127.0.0.1:5236/?theme=light and ?theme=dark.
- Actual local app: http://127.0.0.1:5202/ — sign in and choose Pickup.
- Reproduce: node scripts/preview-pulse-pickup.mjs. Add --baseline for port 5237 using PickupView from commit 6cb44ab. Restart after source edits.
- The harness imports the real view and pure roster/lifecycle selectors. Context, identity, confirmation and pickup commands are synthetic adapters; no Firebase connection or school writes occur. Success in the harness proves frontend behavior, not backend persistence or real authorization enforcement.
- Signed-in school-account and physical-phone acceptance remain pending. No push or deployment.

## Next module

Pickup local pass is complete. Continue Programs next, then Calendar, Admissions/Workshops, Finance/Expenses and Learning/Portfolio. Preserve Attendance, Classes and Students. Heartbeat poursuivre-edufy-pulse remains active and must be disabled after the listed local passes are complete.
