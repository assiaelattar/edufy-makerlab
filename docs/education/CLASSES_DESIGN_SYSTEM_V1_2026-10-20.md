# Classes Design System v1 audit — 2026-10-20

## Scope and source of truth

This focused Classes pass is based on `f04f978` in `agent/edufy-classes-ds-audit-20261020`. `views/ClassesView.tsx` owns the directory, group detail, roster and learner-access dialog; `views/school-day/education-classes-pulse.css` owns only Classes presentation. Program, enrollment, student, attendance, finance and authentication selectors and handlers remain authoritative in their existing files. The Notion-style school navigation and the canonical Education System v1 tokens/primitives remain the UI contract. There are no data model, permission, financial calculation, API, rule or production-record changes.

The isolated preview is `node scripts/preview-classes-ds.mjs` at `http://127.0.0.1:5257/`. Its `scripts/fixtures/classes-ds-*` records and simulated print/clipboard outcomes never connect to Firebase. Screenshots below contain only those synthetic records.

## Exhaustive Classes surface inventory

Status legend: **I** source inspected; **M** changed in this pass; **B** browser tested in the synthetic fixture; **R** signed-in app navigated read-only. “Gap” names any acceptance not proved by that row. The signed-in app at port 5202 serves a separate base checkout, so **R** establishes real-data integration and route availability, not visual acceptance of this candidate patch.

| Reachable surface or state | Status | Evidence and result | Explicit gap |
| --- | --- | --- | --- |
| Classes directory header; Weekly schedule and Take attendance routes | I, B, R | Directory desktop/phone matrix; signed-in Classes route loaded. Existing navigation callbacks retained. | Destination Schedule and Attendance workflows belong to their modules. |
| Today itinerary; chronological group links | I, B, R | Fixture showed two same-day groups and opened the exact group roster. Signed-in account showed one scheduled group and opened its populated roster. | Timezone/day rollover on a physical device was not exercised. |
| No classes today | I, B | `?scenario=empty` showed the no-today message and Open schedule action. | Empty signed-in tenant not available. |
| Directory summary: programs, groups, active enrollments | I, B, R | Fixture counts and signed-in loaded counts rendered; summary remained neutral. | Underlying count definitions were preserved, not redefined. |
| Search field and no-match result | I, M, B | Canonical search styling; “no such group” showed the clear-filters state; clear restored all groups. | Search does not index learner names by design. |
| Program filter rail and selected state | I, M, B | Selected state is blue, exposed with `aria-pressed`; Creative coding narrowed the directory and remained selected after opening a group and returning. | Organization/user scope resets are owned by the parent workspace, not this view. |
| Program sections, grade/group rows, zero and populated counts | I, M, B, R | Canonical status pills and token styling; synthetic zero/one/four learner groups and signed-in populated sections rendered. | Program creation/editing belongs to Programs. |
| No active groups; Open programs | I, B | `?scenario=empty` rendered the directory empty state and route action. | Real empty organization unavailable. |
| Valid class detail; back route and session facts | I, B, R | Four synthetic learners, one secondary placement, session and outstanding summary; signed-in 11-learner roster. | Actual data acceptance used the separate base checkout. |
| Missing/deleted class ID | I, M, B | `?view=missing` renders canonical `EducationState` with a back action. | No real deletion was performed. |
| Desktop roster table: profile, age, contact, balance | I, M, B, R | Desktop light/dark evidence; missing birth date now says “Age not listed” instead of a bare “yrs”; due/paid and profile controls remain. Signed-in roster exposed the missing-age case that prompted the fix. | No real learner profile was edited. |
| Mobile roster cards and secondary-group cue | I, M, B, R | Phone light/dark evidence; shared status pills and secondary-group label shown. Signed-in 390px view showed 11 cards with no page overflow. | Physical-phone gestures and zoom remain untested. |
| Empty class roster and Add student action | I, B | `?scenario=roster-empty` showed the empty roster action; synthetic callback received the exact program/grade/group IDs. | The external enrollment wizard belongs to Students and was not submitted. |
| Read-only role on directory/detail | I, B | `?role=readonly` omitted Add student and Print learner access; navigation, profile viewing, copying and roster print remained per existing permissions. | A real restricted staff login was unavailable. |
| More class actions disclosure and keyboard dismissal | I, B | Desktop/phone light/dark; Escape closed the disclosure; visible focus and dialog return were checked. | Native screen-reader narration was not checked. |
| Copy emails: success, clipboard failure, no addresses | I, B | Synthetic clipboard modes showed “Emails copied,” “Emails not copied,” and “No emails to copy”; no real contact data entered the clipboard. | Actual browser clipboard permissions vary by deployment origin. |
| Print roster action | I, B | Menu and enabled/disabled states inspected; existing `generateRosterPrint` handler retained. | The browser print document, blocked-popup feedback and physical print were not accepted in this pass. |
| Print learner access dialog: selection, ready and not-ready rows | I, M, B | All four screenshot combinations; select-all chose two ready learners; unready rows stayed disabled and linked to profile. `?scenario=access-none` gave explicit setup guidance and disabled printing. | Password validity after reset remains an account-management truth; the dialog warns about it. |
| Access dialog cancel, focus trap, Escape and scroll | I, B | At phone width the full-height dialog kept its header and print control reachable. Shift+Tab from the container landed on the final enabled control, Tab returned to Close, and Escape restored focus to the action menu. | A physical keyboard with a phone was not tested. |
| Access print: success, blocked window, thrown error | I, B | Disposable `?print=success/blocked/error` modes used the real handler with synthetic popup objects. Success closed the dialog; blocked/error left the selection available for retry and showed the appropriate alert. `groupAccessPrint.smoke.mjs` passed. | No real credential card was printed or distributed. |
| Alert/confirmation system | I, B | Copy and access-print alerts were inspected in synthetic modes. Classes has no destructive confirmation or save form of its own. | Confirmation UI for downstream enrollment/profile changes is outside Classes. |
| Loading, data error and permission-denied reads | I | Classes receives already-hydrated context arrays and does not own loading/error flags or a local retry. The parent application gates initial data and read permissions. | These global states need an integrated app-level fixture or designated restricted account; no local false state was added. |

## Visual and interaction decisions

- The access dialog now uses `Modal designSystem`, `EducationButton`, `EducationNotice`, canonical inputs and module-scoped layout classes. Its fixed dark Tailwind colors and teal-only controls are removed, while the print handler and authorization check are unchanged.
- Directory search and program filters use shared color roles. The selected filter is blue; grade remains purple, paid green, balances due orange, errors red, and dense records neutral.
- Mobile roster cards show the secondary-group marker and use the same status pills as the desktop table. Missing birth dates display a named absence. The existing roster sorting, attendance eligibility and enrollment membership selectors are untouched.
- The unavailable-class fallback uses the canonical `EducationState`. The adopted shell, sidebar and navigation structure were not changed.

## Browser and check evidence

The synthetic matrix used an effective 1440 CSS px desktop viewport and approximately 390 CSS px phone viewport. In every captured directory, roster and access-dialog combination, `document.documentElement.scrollWidth === clientWidth`. The page scrolled vertically; filter rails and dialog content had their own intended scrolling. The reduced-motion emulation matched and the access button's transition duration was `0s`. Focus and keyboard checks are described above.

| Layout | Light | Dark |
| --- | --- | --- |
| Directory desktop | [PNG](../qa/classes-ds-audit-20261020/directory-desktop-light.png) | [PNG](../qa/classes-ds-audit-20261020/directory-desktop-dark.png) |
| Directory phone | [PNG](../qa/classes-ds-audit-20261020/directory-mobile-light.png) | [PNG](../qa/classes-ds-audit-20261020/directory-mobile-dark.png) |
| Roster desktop | [PNG](../qa/classes-ds-audit-20261020/roster-desktop-light.png) | [PNG](../qa/classes-ds-audit-20261020/roster-desktop-dark.png) |
| Roster phone | [PNG](../qa/classes-ds-audit-20261020/roster-mobile-light.png) | [PNG](../qa/classes-ds-audit-20261020/roster-mobile-dark.png) |
| Access dialog desktop | [PNG](../qa/classes-ds-audit-20261020/access-desktop-light.png) | [PNG](../qa/classes-ds-audit-20261020/access-desktop-dark.png) |
| Access dialog phone | [PNG](../qa/classes-ds-audit-20261020/access-mobile-light.png) | [PNG](../qa/classes-ds-audit-20261020/access-mobile-dark.png) |

The signed-in Administrator tour at `http://127.0.0.1:5202/` was read-only: Classes directory, a current-day group, a populated 11-learner roster and 390px card layout loaded with no page overflow. No school-data screenshot was saved. The base app showed missing birth dates as “yrs”; this candidate's synthetic browser and production build verified the “Age not listed” repair. No enrollment, attendance, clipboard copy, print, account or financial action ran against school records.

- `npm.cmd run build`: passed after final source changes; existing Firebase mixed-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 27 checks passed on this baseline.
- `node scripts/test-membership-lifecycle.mjs`: passed.
- `node utils/groupAccessPrint.smoke.mjs`: passed.
- `node scripts/atlas-loop-agent.js`: context reader passed; no dedicated `agent:check` script exists.
- Whole-repository `tsc --noEmit` emitted 622 existing diagnostic lines; filtering for Classes and its fixture files found none. This is not a repository-wide typecheck pass.
- `git diff --check`: passed.

## Handoff, changelog, decisions and known issues

**Handoff:** Integrate this focused Classes commit into the coordinating checkout and rerun the integrated Education checker/build. The synthetic preview may be started with `node scripts/preview-classes-ds.mjs`; restart it after source edits because it bundles once at launch. Release remains held for the coordinator's visual review.

**Changelog:** Canonicalized filters, missing-class state and learner-access dialog; unified mobile/desktop roster status; named missing age; added isolated fixture modes and 12 synthetic captures.

**Decisions:** Retain the current operator navigation, existing roster eligibility and permission checks, direct profile route, printed credential policy and financial balance display. No local loading or error claim was added because the data layer owns those states.

**Known issues:** Real restricted-role and physical-phone acceptance, global Classes data error/retry behavior, actual print/clipboard permissions, printed credentials after password reset and this candidate's signed-in visual acceptance remain open. The existing roster-print helper silently returns when popups are blocked; changing that shared print contract is outside this focused visual patch.

No push, deployment or production write occurred.
