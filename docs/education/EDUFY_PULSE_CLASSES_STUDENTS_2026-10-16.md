# Pulse Classes and Students — 2026-10-16

## Authorization

The user approved continuing after Attendance and explicitly requested automatic progression after each finished local step. This overrides the earlier stop-before-Classes gate for local UI work. Real-account acceptance remains a release gate. No push or deployment is authorized.

## Delivered

Classes now opens with a chronological itinerary of every scheduled group today, each linked to its own roster. Academy counts are inline; the program directory uses compact group rows. Search and program selection retain their original projections, and selected program filters expose aria-pressed. The class roster reuses a compact header and inline summary while retaining contacts, account balances, enrollment and print controls.

Students now opens with a compact heading, separate community tabs, one record-review summary and the learner directory. The former three large priority cards have been removed; all focused worklists remain available. The selected learner overview uses the shared school theme. Mobile preview retains its existing scroll-to-overview behavior and now has a Back to list action that restores focus to the directory. Primary actions, permission checks and domain callbacks are preserved.

Both modules use existing Education/Atlas tokens. There are no new dependencies, schemas, rules, authentication changes or production writes.

## Verification

- Production build passed (21.52 seconds; existing bundle warnings remain). Subsequent isolated preview compilation also passed after contrast-only CSS adjustments.
- Full TypeScript: 235 pre-existing diagnostics, exactly matching the baseline; no new diagnostics.
- Classes: today's group opens the exact program/level/group roster; search empty state and clear filters work; Creative coding filter shows Digital creators.
- Students: Contact gaps selects Sam and Add phone calls the existing field-specific callback; Needs a class selects Charlie and Choose class calls the correct enrollment callback; no-match search and clear search pass.
- Mobile learner preview and Back to list pass, including focus restoration to pulse-students-roster.
- Restricted-role fixture exposes no Add student, Edit record or Archive buttons.
- Light/dark at 1440, 766 and 390 CSS px: document scrollWidth equals clientWidth for both modules. Program/worklist strips intentionally scroll within their own container.
- Original and revised captures saved under pulse-evidence/{classes,students}-{before,after}-{desktop,tablet,mobile}-{light,dark}.jpg. Before uses commit 9d9c789 with the same synthetic fixtures.
- Browser automation was interrupted by an app restart. Local servers were restarted and the remaining checks/captures completed afterward.

## Reproduce and view

Actual application: http://127.0.0.1:5202/ — sign in, then Classes or Students.

Isolated preview: http://127.0.0.1:5234/?module=classes&theme=light or ?module=students&theme=light. Replace theme with dark for the second theme.

Run node scripts/preview-pulse-modules.mjs; add --baseline for port 5235. The harness imports actual view components, canonical learner health and schedule selectors, and synthetic adapters. Students container filtering is simplified in the fixture; it does not prove all live StudentsView filters or backend persistence. Admissions is stubbed because it is outside this phase. No school records or credentials are used.

## Automatic continuation

Heartbeat poursuivre-edufy-pulse is active in this chat, every 30 minutes. Continue the next unfinished local module, preserving the existing work: Pickup, Programs, Calendar, Admissions/Workshops, Finance/Expenses, Learning/Portfolio. Report meaningful completion/failures, then disable the heartbeat after the list is done. Do not repeat Attendance, Classes or Students unless a concrete regression requires it.

Signed-in school-account and physical-phone acceptance remain pending. Local browser acceptance is not production acceptance.
