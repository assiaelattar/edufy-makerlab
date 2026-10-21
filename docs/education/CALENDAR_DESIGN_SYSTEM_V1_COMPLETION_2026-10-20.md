# Calendar · Design System v1 focused completion

Scope: `views/CalendarView.tsx`, its scoped stylesheet and isolated fixture only. This is a local Calendar candidate. The signed-in app at `http://127.0.0.1:5202/` runs a separate checkout; its Administrator navigation was read-only and showed **0 sessions in the selected 19–25 October 2026 week**. No school data was written, and no push or deployment occurred.

## Inventory and evidence

Status key: **migrated** uses canonical Design System v1 roles and controls; **retained** preserves an existing domain workflow; **gap** needs separate work. `Synthetic` means the actual Calendar component against in-memory fixture records, never Firebase. `Actual` means signed-in read-only navigation on the separate running checkout.

| Reachable surface or state | Inspected and status | Browser evidence | Explicit boundary |
| --- | --- | --- | --- |
| Global Schedule entry, selected week, previous/Today/next | Migrated header and week navigation; retained route and date handlers | Actual Administrator entry and empty current week; synthetic 1422px and 385px light/dark | Candidate styling against signed-in records awaits integration. |
| Week timetable, seven day columns and session cards | Migrated class/workshop cards, day headers and coverage labels | Synthetic populated desktop and stacked phone, both themes; phone scroll and no page overflow | No actual populated school week was available. |
| Date-grouped Agenda | Migrated; phone defaults to Agenda; canonical tab selection and linked tab panel | Synthetic populated desktop/phone, both themes | No standalone month view exists in this module. |
| Priority coverage action and four weekly totals | Migrated green identity, blue action, neutral measures, orange coverage cue | Synthetic populated/empty and read-only; actual empty state | Totals continue to describe the full selected week, independent of filters. |
| Search, coverage/type selects, result count and Clear filters | Migrated controls; retained filtering | Synthetic combined query/type gave 1 of 6; incompatible search gave no-match; Clear restored results | Filter state is local to the mounted Calendar view. |
| Week date input and date navigation | Migrated field; retained date selection | Synthetic next week empty and Today return; date input exposed with accessible label | Date picker rendering depends on browser platform. |
| Populated assigned/unassigned session detail | Migrated shared Design System dialog and detail surface | Synthetic desktop/phone, light/dark; group, time, current instructor present | Actual session detail could not be opened from the empty real week. |
| Instructor search, available choices, no match, no team | Migrated list, search field and shared empty states | Synthetic search, Clear search, no-team and phone dialog | Team availability comes from existing `teamMembers` data. |
| Assignment pending, success and failure | Retained `attendance.manage`, tenant check and Firestore handler; migrated dialog controls and feedback entry | Synthetic assignment success changed coverage; `save-failure` kept dialog and draft; buttons disabled during request by existing code | Production assignment persistence was not exercised. |
| Remove assignment confirmation, cancel and approve | Retained existing `useConfirm` decision and removal handler | Synthetic cancel preserved assignment; approve removed it | Shared `AlertModal` confirmation/alert presentation still uses legacy Atlas styling outside the Calendar root; foundation owner should migrate it. |
| Sync week pending, success, failure, invalid weekday | Retained group/workshop materialization rules and write batch | Synthetic staged sync showed disabled pending control; success raised 6→7 sessions; failure reported connection error; invalid day reported 1 unrecognized schedule | Actual sync was not clicked. |
| Empty selected week and no matching filters | Migrated shared empty states and recovery actions | Synthetic empty fixture, next week, no-match/clear; actual empty current week | No independent data-loading or fetch-error state is exposed by Calendar; `AppContext` owns hydration/errors. |
| Restricted role / read-only detail | Retained capability check; migrated read-only details | Synthetic `role=readonly`: no sync/assignment controls; session detail remained accessible | No signed-in restricted-role account was used. |
| Legacy `?ui=atlas-legacy` route | Inspected code; shared header/dialog skin applies, while existing reduced-control fallback remains | Code inspection only | Browser acceptance of the explicit rollback route remains open. |

## Design and behavior

The Calendar now opts into `data-edu-system="1"` and reuses `EducationButton`, `EducationTabs`, `EducationStatusPill`, `EducationState` and the shared `Modal` frame. Its stylesheet maps layout and former Atlas classes to canonical `--ds-*` tokens with no module color literals. The established Notion-style shell route, AppContext feeds, group/workshop sync, assignment permissions, tenant check, Firestore commands and messages remain in their existing owners. The Calendar has no standalone edit form or month view; the instructor chooser is its only field-based dialog.

## Verification

- Synthetic preview: `node scripts/preview-pulse-calendar.mjs`, then `http://127.0.0.1:5240/?theme=light` or `?theme=dark`. Scenarios: `empty`, `no-team`, `save-failure`, `assignment-pending`, `sync`, `invalid-day`; append `&role=readonly` for restricted access. Fixture writes stay in memory, and staged assignment/sync offer explicit save/failure controls.
- Browser target overrides: desktop 1440 and phone 390; the in-app browser reported effective `innerWidth` 1422 and 385 CSS px respectively. Document width equaled client width in both themes and in phone Week and Agenda. The long phone timetable and full-height dialog scrolled. Tab and Shift+Tab wrapped inside the dialog, Escape closed it, focus returned to the opener and focused controls had a visible blue outline.
- Synthetic screenshots: `calendar-v1-evidence/calendar-desktop-{light,dark}.png`, `calendar-mobile-{light,dark}.png`, `calendar-mobile-{week,agenda}-light.png`, `calendar-mobile-dialog-dark.png`. All contain fixture records only.
- `node scripts/check-education-system.mjs`: **pass**, 27 token/contrast/dialog/reduced-motion checks. The Calendar and shared CSS include reduced-motion rules; browser emulation of that preference was unavailable in this run.
- `node scripts/test-membership-lifecycle.mjs`: **pass**, including program operational-state coverage used by week sync.
- `git diff --check`: **pass**. Repository TypeScript scan returned existing errors outside Calendar; no `CalendarView` diagnostic was emitted.
- `npm.cmd run build`: the isolated Calendar worktree lacked `@rive-app/webgl2/rive.wasm`; after integration into the coordinator's complete dependency checkout, the production build passed (2,432 modules; existing Firebase mixed-import and large-chunk warnings only).

## Handoff and known issues

The foundation owner should reconcile shared `AlertModal` with Design System v1. A populated signed-in week, real manager sync/assignment, restricted real role, physical phone and exact-width browser acceptance remain open. Calendar has no local loading/error API to style without changing shared data ownership. No schema, rule, API, auth or business-logic change belongs to this phase.
