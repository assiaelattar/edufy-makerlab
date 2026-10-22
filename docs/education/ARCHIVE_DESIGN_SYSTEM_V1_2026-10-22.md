# Archive — Design System v1 focused audit (2026-10-22)

## Scope and ownership

The only Archive route is `ArchiveView` (`App.tsx` route `archive`). This branch replaces the unreviewed school-operations bridge presentation with canonical Education controls and Archive-scoped, token-only layout. The resource grid now has an inspectable detail panel with full URL, dates, category, author and direct actions. Search, status, category and sort controls have visible names; card actions no longer depend on hover. The add/edit dialog uses the shared Education fields, inline field errors, pending lock and shared modal behavior. The no-organization view no longer offers an unusable Add action.

Existing `AppContext`, `AuthContext`, `ConfirmContext`, `NotificationContext`, Firestore transactions, organization IDs, URL normalization, payloads, status values and permissions remain authoritative. The synthetic preview aliases all persistence and auth imports to in-memory fixtures. It never calls Firebase. No production record, rule, index, API, credential, deployment or release was changed.

The Archive route now always opts into Design System v1. The former `?ui=atlas-legacy` comparison switch is retired for this module because it left the migrated controls without their canonical styling.

## Reachable inventory

`I` = inspected in source, `M` = migrated or repaired in this branch, `B` = exercised in the isolated browser fixture. “No” is an explicit acceptance gap, not a pass. Exact browser observations are in [the synthetic matrix](pulse-evidence/archive-v1-browser-matrix-2026-10-22.md).

| Archive view or state | I | M | B | Evidence or exact gap |
| --- | --- | --- | --- | --- |
| Restricted role | Yes | Canonical restricted state | Yes | `?role=restricted` showed only the access message; no register or Add action. Actual restricted account remains untested. |
| No selected organization | Yes | Removed Add action | Yes | `?scenario=no-org` showed the organization prompt and no Add action. |
| Header, active/archived/category/current-view measures | Yes | Canonical header and token surfaces | Yes | Populated fixture showed 2 active, 1 archived, 3 categories, 2 in view. Archive/restore changed these counts. |
| Active, Archived and All status lists | Yes | Named filter; retained handler | Yes | Summary control switched to Archived; restored record left that list. All status option was inspected but not browser selected. |
| Search, category, sort and reset | Yes | Named controls and selected state | Yes | “index” returned one card; no-match gave a reset action; Documents returned one card; title Z–A put Program materials first. |
| Resource card and details | Yes | Added persistent details panel and visible action disclosure | Yes | Detail showed description, full URL, author, category, created/updated dates and status; 390px detail had no page overflow. |
| Open resource | Yes | Visible action and invalid-URL feedback | Partial | `?scenario=invalid` rejected a `javascript:` URL with an alert before opening a tab. Valid external navigation and popup-blocked branch were not exercised. |
| Copy resource URL | Yes | Visible action | Yes | Browser clipboard path showed “Link copied”. Clipboard-disabled branch remains untested. |
| Add dialog and required/duplicate validation | Yes | Canonical fields, inline errors, focus to invalid field | Yes | Empty submit marked Title invalid and focused it; existing URL marked URL invalid and focused it. |
| Add pending, failure, retry and success | Yes | Pending lock and draft retention retained | Yes | Pending disabled Cancel/Save; synthetic failure retained all fields; retry added a third active card and closed the dialog. |
| Edit dialog and save | Yes | Canonical fields and action | Yes | Existing values loaded, edited title saved through an isolated transaction and appeared on its card. Edit failure was not separately exercised. |
| Dialog cancel, Escape, Tab and scrolling | Yes | Shared `Modal` retained | Yes | Escape closed and returned focus to Add; Shift+Tab from Close wrapped to Submit and Tab wrapped back; 390×600 dialog body had 552px scroll content within 532px client height. |
| Archive confirmation, cancel, pending, failure and retry | Yes | Visible action menu | Yes | Cancel kept the card active; failure kept the record and showed an alert; retry moved it to Archived and updated counts. |
| Restore | Yes | Visible Archived action | Yes | Restoring the fixture record moved it back to Active. Restore failure was not separately exercised. |
| Delete confirmation, cancel, pending, failure and retry | Yes | Visible destructive action | Yes | Cancel retained record; failure retained record and showed alert; success reduced active cards from three to two. All data was disposable in-memory fixture data. |
| Read-only role | Yes | Canonical status and detail | Yes | `?role=viewer` omitted Add/Edit/Archive/Delete and retained Copy/Open. Actual viewer account remains untested. |
| Loading and empty | Yes | Canonical state panels | Yes | `?scenario=loading` displayed loading state; `?scenario=empty` displayed Add first resource. |
| Listener failure and retry | Yes | No data-layer change | No | `AppContext` exposes global `loading` and `archiveLinks` here but no Archive listener error/retry contract. Implementing a truthful retry needs a separate data-layer phase. |

## Acceptance and limits

Synthetic browser checks at exact 390 CSS px and 1440 CSS px found no page-level horizontal overflow. Light/dark mobile screenshots and a light desktop screenshot were inspected; dark desktop was inspected at the browser's 1600px display and at exact 1440px by DOM width/overflow. The cards, filter rail, detail panel, main page scroll, short-phone dialog scroll, focus wrap/return and reduced-motion media setting were exercised. The category rail is intentionally horizontally scrollable. A long action label initially caused page overflow at phone width; it was shortened to “More actions” and retested at 390px with `scrollWidth === innerWidth`.

The real local app at `http://127.0.0.1:5202/` refused the connection, so there was no signed-in school navigation. Physical phone, real role boundaries, real listener failures and production persistence remain unaccepted. The review fixture is an implementation test, not evidence of a school write.

## Verification

- `npm.cmd run build`: pass; existing Firebase dynamic-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 62 checks pass.
- Focused TypeScript compile of `views/ArchiveView.tsx` with Vite client types: pass.
- `node scripts/preview-archive-v1.mjs`: synthetic fixture served; browser loaded the real Archive component with isolated services.
- `git diff --check`: pass.
- No dedicated repository agent-check script is configured. The Education checker is the relevant gate.

## Handoff, decisions and known issues

This focused report is the Archive handoff/changelog for the phase. The decision is to keep card-level Open, details and a native disclosure for copy/manage actions; full metadata stays in one detail panel without adding a data route or schema. Archive presentation uses only canonical Education colors and components; the shared Toolkit bridge now scopes to Toolkit alone.

Open issues: no Archive-specific listener error/retry signal, no real signed-in or restricted-role acceptance, no physical-phone check, and untested valid external navigation/popup-blocked and clipboard-denied branches. Parent integration should keep this branch local until those acceptance checks are addressed; do not infer deployment readiness from the synthetic matrix.
