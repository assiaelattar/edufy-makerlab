# Programs Design System v1 audit — 2026-10-20

## Scope and source of truth

This is a focused local Programs pass on the `a56d360` application baseline. The established Programs workflow, selectors, write handlers and permissions remain the source of truth. The changes stay in the Programs catalog/detail, setup wizard, operations preview and module stylesheet. The synthetic preview contains disposable fixture records; no school record was changed. No push or deployment occurred.

## Page and state inventory

| Surface | Inspected state | Completed in this pass |
| --- | --- | --- |
| Portfolio | Populated, incomplete program, waiting family, search/status controls, empty catalog and view-only role | Attention color follows an actual setup gap; view-only actions remain navigation only. |
| Detail header and overview | Readiness, next action, essentials and pricing disclosure | Priority styling follows readiness or leads; light and dark panel surfaces resolve through theme tokens. |
| Run plan | Delivery preview, dates, checklist, guidance and offer state | Semantic token mapping for preview, readiness and guidance. |
| Groups and schedule | Group summary/status, expanded roster and capacity | Status chips map to success, attention and full roles. |
| Roster | Search, placement filters, unplaced learner, table and mobile cards | Scoped attention and success mapping; controls retained. Started dates now use the existing app formatter in both layouts. |
| Waiting | Waiting family and follow-up action | Waiting status and action use semantic roles. The synthetic fixture has no enrollment callback, so it no longer displays an inert Enroll action. |
| Finance | Program balances and ledger summary | Existing program panel uses theme-aware surfaces and status colors; financial calculations and handlers were untouched. |
| Sharing | Kiosk link, QR, quote, print and brochure setup | Action surfaces, QR and quote dialogs use shared tokens. Quote error focuses the parent name field and links its message with `aria-describedby`. |
| Setup wizard | Format, dates, groups, offer, join, review; edit flow | All six steps were inspected. Selection semantics expose `aria-pressed`; informational callouts and review guidance have readable light/dark text. |
| Next-year rollover | Dialog, selection, validation and synthetic save states | Scoped token mapping for choices, summary and actions. Disposable fixture success and failure paths were exercised after the visual pass. |

## Browser verification

- Synthetic preview: `node scripts/preview-pulse-programs.mjs` at `http://127.0.0.1:5238/`.
- Inspected catalog and all seven detail tabs in light and dark themes; checked six wizard steps, quote error, QR focus return, empty catalog and view-only catalog.
- At 390 CSS px, mobile light/dark catalog and detail had `document.documentElement.scrollWidth === innerWidth`; the wizard remained scrollable with reachable sticky actions. The 390 px view used Chrome DevTools emulation in the in-app browser.
- On the quote error path, the focused element was `#quote-parent`, `aria-invalid=true`, and `aria-describedby=program-quote-error`.
- A signed-in Administrator's existing local app was toured read-only: loaded catalog plus overview, run plan, groups, roster, waiting, finance and sharing rendered with real records. That app serves the base checkout, so this check validates data shapes and navigation rather than the candidate CSS. The original student record and tab were restored afterward. No real-data screenshot was saved.
- At 1440 CSS px, catalog and detail both had `scrollWidth === innerWidth`. Desktop screenshots were captured in the browser's available 1094 CSS px window after viewport reset; the visual 1440 capture was unreliable in this browser's emulation.
- No production enrollment, quote, rollover, pricing or ledger write was performed.

## Interactive acceptance follow-up

- The disposable fixture now exposes pending Firestore create, update and batch operations with explicit **Simulate saved** and **Simulate failure** controls. They only mutate in-memory example records; no Firebase connection is used.
- Wizard: checked all six steps, required name/description, timezone, group capacity and plan price validation, extended-form and QR choices, review guidance, cancellation, and simulated create failure/retry/success. Failure kept the wizard open with an error; success closed it and added a synthetic program. Date-field validation was not conclusive through browser automation because the browser date control reset its value on re-entry. Corrected the review phrase to “an extended registration form.”
- Sharing: quote opened with parent-name focus; missing parent and negative discount errors focused the relevant field and exposed alert text. Clearing the only plan disabled **Generate quote**. Cancel closed the dialog. QR opened; **Copy Link** changed to **Copied**, and close returned to Sharing. **Add brochure link** opened the edit wizard at step 1; step 5 contains the brochure field. Both URL inputs now have explicit labels, verified in the accessibility tree. The print action opened a browser print document (`Inscription_Form`, containing the synthetic program form), but the browser print surface blocked further automated inspection; print cancellation and physical output remain unverified.
- Rollover: **Clear** changed the selection count to zero and submission showed “Select at least one program setup to copy.” **Select active** restored two selections; an empty academic-period name showed its field error. Cancel closed the dialog and restored focus to **Prepare next year**. A simulated batch failure restored enabled controls and reported “Year setup not completed.” A simulated success produced two draft copies for 2027–2028, each with zero learners, switched the catalog to Draft, and reported that no enrollments were copied.
- Roster and waiting: **Needs placement** filtered five learners to one; **Open learner** navigated to the matching synthetic profile. Waiting **Remove** and **Delete** opened distinct confirmations; cancel preserved the entry. In the view-only fixture, catalog creation and row mutations were absent, waiting Remove/Delete were disabled, and brochure editing was disabled. Read-only sharing still permits QR, quote preparation and print viewing.
- At 390 CSS px, wizard, rollover, quote and QR dialogs had `scrollWidth === innerWidth`. The wizard and rollover retained reachable actions at the bottom, and the quote and QR actions were visible in the viewport. Mobile quote/QR were inspected in dark theme; wizard/rollover in light theme. Desktop quote, QR, wizard and rollover were exercised in the default viewport. No physical-device check was performed.

## Theme matrix and integrated read-only closeout

- The remaining 390px matrix was checked in Chrome against the disposable fixture: wizard and rollover in dark, quote and QR in light. Each had `innerWidth === 390` with `document.documentElement.scrollWidth === 375` (the scrollbar occupies the remaining width), so none overflowed horizontally. The dark wizard scrolled to its invoice choice and retained Cancel/Continue; empty-name validation remained visible. The dark rollover scrolled both its setup list and outer body to the lower explanation with Cancel/Prepare year still reachable. Text and controls remained visually legible in the captured frames.
- Focus entered the dark wizard's step heading, the dark rollover's academic-period input, and the light quote's parent input. The light quote's missing-parent error returned focus to that input and remained readable. Light QR focus settled on the modal container; **Copy Link** changed to **Copied**, and closing returned focus to **Show QR**. Quote and QR actions fit in the 390px viewport without additional scrolling. The quote heading is visually shortened at this width but keeps its full accessible name.
- After integration, a separate signed-in Administrator tab on the current local app (`http://127.0.0.1:5202/`) loaded the real Programs catalog and all seven tabs for a populated program. Overview showed 80% readiness; Run plan rendered a date and offer preview; Groups expanded to full/ready classes; Roster showed 30 learners and one needing placement; Waiting showed the empty state; Finance rendered balances; Sharing rendered kiosk, quote, print and brochure actions. Navigation and one group disclosure were read-only. No real-data screenshot was saved and no school write was made.
- **Roster date follow-up:** the real-data tour exposed a raw ISO timestamp such as `2026-02-16T15:27:24.862Z` in Started. The candidate now uses the app's `formatDate` helper for the desktop cell and mobile card. A synthetic enrollment with `2026-09-14T15:27:24.862Z` displayed as `14 Sept 2026` in light and dark desktop and 390px layouts. The stored value and CSV/Excel export fields remain unchanged. This display fix needs the parent checkout's integrated build and read-only acceptance after merging. A populated real waiting list, print-dialog cancellation, date-control automation and physical-phone scrolling remain outside verified coverage.

## Evidence

All files below are from the synthetic fixture and contain no school data.

| View | Evidence |
| --- | --- |
| Mobile light catalog | [mobile-light-catalog.png](../qa/programs-ds-audit-20261020/mobile-light-catalog.png) |
| Mobile dark catalog | [mobile-dark-catalog.png](../qa/programs-ds-audit-20261020/mobile-dark-catalog.png) |
| Mobile light detail | [mobile-light-detail.png](../qa/programs-ds-audit-20261020/mobile-light-detail.png) |
| Mobile dark sharing | [mobile-dark-sharing.png](../qa/programs-ds-audit-20261020/mobile-dark-sharing.png) |
| Mobile dark wizard | [mobile-dark-wizard.png](../qa/programs-ds-audit-20261020/mobile-dark-wizard.png) |
| Desktop light detail | [desktop-light-detail.jpg](../qa/programs-ds-audit-20261020/desktop-light-detail.jpg) |
| Desktop dark detail | [desktop-dark-detail.jpg](../qa/programs-ds-audit-20261020/desktop-dark-detail.jpg) |
| Quote validation | [desktop-dark-quote-validation.jpg](../qa/programs-ds-audit-20261020/desktop-dark-quote-validation.jpg) |
| Mobile light wizard acceptance | [mobile-light-wizard-qa.png](../qa/programs-ds-audit-20261020/mobile-light-wizard-qa.png) |
| Mobile light rollover | [mobile-light-rollover-qa.png](../qa/programs-ds-audit-20261020/mobile-light-rollover-qa.png) |
| Mobile dark quote | [mobile-dark-quote-qa.png](../qa/programs-ds-audit-20261020/mobile-dark-quote-qa.png) |
| Mobile dark QR | [mobile-dark-qr-qa.png](../qa/programs-ds-audit-20261020/mobile-dark-qr-qa.png) |
| Mobile dark wizard closeout | [mobile-dark-wizard-followup.png](../qa/programs-ds-audit-20261020/mobile-dark-wizard-followup.png) |
| Mobile dark rollover closeout | [mobile-dark-rollover-followup.png](../qa/programs-ds-audit-20261020/mobile-dark-rollover-followup.png) |
| Mobile light quote closeout | [mobile-light-quote-followup.png](../qa/programs-ds-audit-20261020/mobile-light-quote-followup.png) |
| Mobile light QR closeout | [mobile-light-qr-followup.png](../qa/programs-ds-audit-20261020/mobile-light-qr-followup.png) |
| Desktop light roster date | [desktop-light-roster-date.png](../qa/programs-ds-audit-20261020/desktop-light-roster-date.png) |
| Desktop dark roster date | [desktop-dark-roster-date.png](../qa/programs-ds-audit-20261020/desktop-dark-roster-date.png) |
| Mobile light roster date | [mobile-light-roster-date.png](../qa/programs-ds-audit-20261020/mobile-light-roster-date.png) |
| Mobile dark roster date | [mobile-dark-roster-date.png](../qa/programs-ds-audit-20261020/mobile-dark-roster-date.png) |

## Checks and acceptance boundary

- `node scripts/check-education-system.mjs`: 27 token, contrast, dialog-contract and reduced-motion checks passed.
- In the integrated checkout, the expanded Education System suite passed all 62 checks. No dedicated `agent:check` command is configured in this repository; the Programs scope used the Education System suite, browser QA and focused diff checks.
- `git diff --check`: passed after the final cleanup.
- The isolated audit worktree could not complete a production build because its linked `node_modules` lacks `@rive-app/webgl2/rive.wasm`. After integrating the roster display fix, the parent design checkout passed `npm.cmd run build` with complete dependencies (2,434 modules; existing Firebase mixed-import and large-chunk warnings only) and all 62 Education System checks.
- Whole-repository `tsc --noEmit` reports existing unrelated errors, including `App.tsx` and `maker-pro`; filtering its diagnostics for the four touched TSX files returned none. It is not a pass/fail gate for this focused visual patch.
- The integrated candidate had signed-in read-only acceptance with real populated Programs data across the catalog and seven tabs before the roster display fix. Actual production writes, a populated real waiting list, print cancellation, date-control automation, and physical-phone scrolling remain outside this audit.
