# Student Details — Design System v1 completion audit

Date: 2026-10-20. Scope: the Student Details route and its local child workspaces, forms and dialogs. This is an isolated local candidate; it has not been pushed or deployed.

## What changed

- Brought Overview, Learning, Attendance, Finance and Access child surfaces into the existing `data-edu-system="1"` contract. The styling uses the approved neutral records, green learner identity, blue operations, orange attention and purple learning cues in both school themes.
- Kept the real student, enrollment, project, attendance and finance selectors and their existing write handlers. The 011Y priority is derived from actual missing contact, balance and attendance state. The student preview uses recorded skills and published projects; it no longer invents XP or a level.
- Used the shared Design System modal frame for Student Details, enrollment certificates, payment proof, parent access and quick access. Added accessible names to icon actions and labels to edit fields. Learning's nested choice now has `aria-pressed`; the primary section tabs retain keyboard tab semantics.
- Matched visible edit, enrollment, deletion, PIN and quick-link controls to the route's existing permission checks. The read-only synthetic role shows the record without mutation controls.
- Fixed two narrow-screen issues: focus no longer scrolls the hero internally after the editor closes, and a failed-save alert remains above the sticky form footer.

## Page, form and dialog inventory

“Browser” below means the isolated synthetic browser fixture at `http://127.0.0.1:5271/`. Source inspection is stated where the fixture cannot open an App-owned workflow. No row implies a production write.

| Surface | Migration and check | Evidence or remaining gap |
| --- | --- | --- |
| Profile header, back action, 011Y priority, overview cards and family details | Migrated and browser checked in populated, attention, empty and read-only states; desktop light and 390 px dark. | `evidence/student-details/desktop-light-readonly.png`, `mobile-390-dark-overview.png`. Back/scroll restoration belongs to the parent shell and still needs a signed-in route check. |
| Main Overview/Learning/Attendance/Finance/Access tabs | Migrated; keyboard ArrowRight selected Learning with visible focus. Mobile tabs scroll within their own strip; page `scrollWidth` 373 at `innerWidth` 390. | Browser DOM and visual check. |
| Learning enrollments, empty state and enrollment record actions | Migrated; populated and empty browser states checked. New/edit/delete controls follow existing permissions. | Browser check. The App-owned new-enrollment wizard is outside this fixture; use the existing `scripts/preview-education-system.mjs` forms preview and signed-in acceptance. |
| Enrollment edit and certificate dialogs | Shared modal styling and form labels applied; enrollment edit and both certificate dialogs opened and inspected, Escape closing checked. | Synthetic browser check. No enrollment or certificate write was submitted. |
| Learning portfolio, student project preview and project detail dialog | Migrated; portfolio subtab, keyboard-accessible project card and detail dialog checked. Student preview displays recorded skills and projects. | Synthetic browser check. SparkQuest destination and real student identity remain a signed-in acceptance item. |
| Attendance history and summary | Migrated; populated and empty browser states checked. Absence/late attention uses orange semantic status. | Synthetic browser check; real register totals still need school-record review. |
| Finance balance, promise schedule and payment history | Migrated visually; populated and empty browser states checked. No calculation or transaction handler changed. | Synthetic browser check. `mobile-390-dark-access.png` records adjacent tab treatment; real financial totals need signed-in read-only review. |
| Invoice, payment edit, payment proof and payment audit | Invoice opened, inspected and cancelled with focus returned to “Open invoice”; payment edit opened. Payment proof and audit are source-inspected with shared surface treatment. | No proof URL in fixture, so proof rendering remains untested. No invoice or payment submission. The App-owned record-payment form is outside this fixture. |
| Access cards, classroom PIN and parent account status | Migrated; populated, no-access and read-only browser states checked. Read-only hides learner PIN creation and quick access; parent management is disabled by its established role rule. | `mobile-390-dark-access.png`; no credential generation or sharing. Existing stored `loginInfo.initialPassword` exposure remains a separate security issue. |
| Parent choice/password and manual/one-click quick-access dialogs | Shared modal styling; parent choice, QR and one-click validation/success checked against stub services. | Synthetic browser check only. No parent account was issued or external link sent. |
| Schedule print, credentials card and confirmation dialogs | Shared modal frame and action styling applied; source inspected. | Print/share and credential issue were not run, avoiding side effects. |
| Complete student editor | Shared modal/form retained; mobile scroll, sticky footer, focus and synthetic failed save checked. Failed save keeps the draft and shows an alert above the footer. | `mobile-390-dark-save-failure.png`; successful persistence requires authorized signed-in test data. |

## Validation

- `npm.cmd run build`: passed, 2,429 modules. Existing mixed Firebase import and large chunk warnings remain.
- `node scripts/check-education-system.mjs`: passed, 27 checks.
- `git diff --check`: passed.
- No `agent:check` script exists in this repository; the focused Design System check above is the available repository gate for this slice.
- Browser fixture: desktop and 390 px mobile, light and dark, populated/attention/empty/no-access/read-only/failed-save variants. At exact `innerWidth` 390, document `scrollWidth` was 373. `prefers-reduced-motion: reduce` made tested tab and action transitions `1e-05s`. Invoice cancel returned focus to its opener. No school service is connected to the fixture.

## Acceptance boundary

The actual local app at `http://127.0.0.1:5202/` showed the public MakerLab Academy landing page in this browser session; no designated signed-in school session was available. Therefore this pass does **not** claim real-account Student Details visual, data, route restoration or permission acceptance. A staff reviewer should inspect populated and empty records in both themes on desktop and a physical phone, return to the Students register to confirm filter/scroll restoration, and exercise safe test-record saves only in an authorized non-production environment. Existing large-bundle warnings and the previously documented retained learner password issue are outside this UI migration.

Preview command: `node scripts/preview-student-details.mjs`; URL: `http://127.0.0.1:5271/?theme=light` (also `theme=dark`, `scenario=empty`, `attention`, `no-access`, `readonly`, or `failure`). The fixture's names, contacts and payments are invented examples; all service writes are stubbed.
