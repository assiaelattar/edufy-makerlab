# Staff Attendance / Absence — Design System v1 focused candidate (2026-10-21)

## Scope and ownership

This branch changes only the Staff Attendance view, its scoped presentation, and an isolated synthetic preview. The route is `staff-attendance` in `App.tsx`; `services/moduleRegistry.tsx` requires `team.view`. The existing `AppContext` team and staff-attendance listeners, Firestore writes, status rules, time calculations, tenant IDs and schemas remain the owners of data and behavior. This branch did not push, deploy, or write a school record.

The shared school-operations CSS bridge from `d92be59` was only a visual starting point. This pass makes the status controls and card hierarchy explicit with the canonical Design System tokens, fixes a report-filter leak, adds a module permission state, and improves input names and save feedback. The independent report search prevents a Daily status filter from silently excluding staff from the monthly report. The selected report month now follows the same local date as the Daily page.

## Reachable inventory and verification status

`I` means source inspected; `M` means migrated or repaired in this branch; `S` means an isolated synthetic path exists but was not browser exercised; `B` means browser exercised. The local browser tool reported **“Local browser use is disabled in Work settings”**. Accordingly no row claims `B`, no screenshot is represented as evidence, and the four viewport/theme combinations remain open.

| Page or state | I | M | S | B | Evidence or exact gap |
| --- | --- | --- | --- | --- | --- |
| Daily header, four measures and team roster | Yes | Scoped status cards and tokens | Populated and empty records | No | Production bundle builds; no rendered viewport inspection. |
| Previous/next day, date picker, Today and future lock | Yes | Retained existing handlers | Fixture dates and future navigation | No | Future inputs/actions remain disabled in source; keyboard and 390px layout unverified. |
| Name/role search, status filter, clear and no-match state | Yes | Added accessible control names and distinct no-staff copy | Populated/empty fixture | No | No browser interaction or focus check. |
| Present, late, absent, leave and excused marking | Yes | Scoped semantic pressed-state colors, visible status text and pending lock | Simulated pending/success/failure | No | Existing Firestore payload and late conversion retained; no click or real write exercised. |
| Arrival/departure form, save times, worked/overtime display | Yes | Taller save control and pending lock | Simulated pending/success/failure | No | Existing working-status gate and `timeUtils` retained; form scrolling and draft retention not browser verified. |
| Clear mark confirmation, cancel, success and failure | Yes | Pending lock retained | In-memory confirmation and delete outcomes | No | The fixture uses a synthetic confirmation panel; it does not prove the production ConfirmContext dialog's focus trap. |
| Confirm unmarked bulk action and confirmation | Yes | Prevents bulk start during a single save and locks row edits during bulk save | In-memory batch success/failure | No | Existing unmarked-only batch and unchanged marked records retained; no browser action exercised. |
| Monthly report, month picker, rows and horizontal table scroll | Yes | Separate report search and no-match state; local month | Populated/empty report | No | Explicit table scroll container exists; 390px scroll and report figures not browser verified. |
| Export disabled state | Yes | Retained | Visible fixture path | No | Export remains intentionally unavailable; no file is produced. |
| Restricted permission state | Yes | Added `team.view` access state consistent with module registry | `?role=restricted` | No | Route/access rendering not browser verified. |
| Loading and listener failure | Yes | No change | Not simulated | No | `AppContext` exposes `staffAttendanceRecords` without module loading/error flags, and its optional listener has no error callback. A truthful module loading/retry state needs a separate data-layer change. |
| Instructor coverage assignment | Yes | No change | No path | No | This page records presence and hours only. Schedule coverage assignment belongs to Calendar; there is no reachable Staff Attendance cover workflow to claim migrated. |

## Verification run

- `npm.cmd run build`: **pass** after `npm ci --ignore-scripts`; existing dynamic-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: **62 checks pass**, including token contrast, opt-in and reduced-motion source contract.
- `node scripts/preview-staff-attendance-v1.mjs`: fixture server started; HTTP `GET /` and `GET /staff-attendance-v1.js` both returned **200**. This proves bundling/serving, not rendering or interaction.
- `node scripts/test-staff-attendance-v1.mjs`: **12 assertions pass** from server rendering the actual view with isolated populated, empty and restricted fixtures. This verifies rendered text and access gating, not CSS layout or interactions.
- `git diff --check`: **pass**.
- Focused `tsc` on `views/StaffAbsenceView.tsx` with the repository's Vite client types: **pass**. No dedicated repository agent-check script is configured.
- Repository-wide `npx tsc --noEmit --pretty false`: **fails** in pre-existing broad application and `maker-pro` code, including `App.tsx` missing `PublicEnrollmentView`, missing `papaparse` and unrelated Firestore/TeamView typing. This is not a clean type gate for this module.

## Acceptance boundary

The candidate still needs a real browser pass at **1440px and 390px, light and dark** for Daily and Monthly layouts, future/no-match/empty/restricted states, scrolling and no page overflow, visible keyboard focus, tab navigation, reduced motion, confirmation cancel and pending/success/failure fixture paths. Actual signed-in navigation must be read-only. School persistence, restricted-role behavior, listener failure, and physical-phone behavior remain unverified. Do not describe this module as page-by-page accepted until those checks are recorded.
