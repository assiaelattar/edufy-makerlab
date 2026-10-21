# Marketing — Design System v1 focused module pass

Date: 2026-10-20; focused follow-up: 2026-10-21. Branch: `agent/edufy-marketing-ds-20261020`, based on `6b9a06f`. This is a Marketing-only local candidate. The shared school-ops CSS bridge was treated as a starting point. No Team or shared foundation file was changed.

## Staff job and source of truth

Marketing has one landing workspace with four tabs: Content, Campaigns, CRM, and Growth. The four signal cards at the top are its overview and metrics; there is no separate reporting view or connected attribution provider. `AppContext` tenant feeds, `AuthContext.can`, the existing Firestore handlers, `ConfirmContext`, and Workshops/Admissions stable booking links remain authoritative. This pass adjusts presentation and local interaction clarity. Opening a WhatsApp draft no longer silently changes a new lead to `contacted`; the UI continues to say that sending remains under the operator's control.

The module now has scoped Design System v1 layout rules, meaningful status colors, a board that does not compress the tab rail, readable campaign facts, canonical dialog frames, linked form labels, minimum control targets, selected view states, and explicit keyboard controls for CRM records and campaign assets. The nested dialogs retain their existing data handlers, tenant checks, and drafts after failed saves. The Growth wizard resets its step and audience when reopened.

## Reachable inventory

`I` means inspected in source; `M` means migrated or confirmed against the v1 contract; `B` means exercised in the isolated browser fixture. `—` is an explicit browser gap. Every row's actual school status is `U`: the signed-in local app at `127.0.0.1:5202` refused the connection, so none of these rows has real-account acceptance.

| Surface or state | I | M | B | Actual | Evidence or explicit gap |
| --- | :---: | :---: | :---: | :---: | --- |
| Entry header, four overview signals, growth/add lead actions | ✓ | ✓ | ✓ | U | Populated, zero-record and view-only fixtures; 1440 light/dark and 390 light/dark inspected |
| Content stages: planned, in progress, review, ready/published | ✓ | ✓ | ✓ | U | `content-1440-light`, `content-390-light`; review fixture and published label inspected |
| Content per-stage and whole-queue empty states | ✓ | ✓ | ✓ | U | `scenario=empty`; view-only message avoids an unavailable create action |
| Content start/back and status movement | ✓ | ✓ | ✓ | U | In-progress → planned and planned → in-progress changed the synthetic record; pending, failure and retry feedback observed. Other transitions use the separate submission/review/publish controls below; their complete success matrix is still open |
| Schedule-post form, required content/date, cancel and pending | ✓ | ✓ | ✓ | U | Blank submit focused content; failed save kept caption, retry succeeded and returned focus to opener |
| Submit-work asset URL form | ✓ | ✓ | ✓ | U | Named URL field, pending disabled state and failed save retained the URL |
| Content approval and revision dialog | ✓ | ✓ | ✓ | U | Review fixture, required revision feedback alert, pending/failed save with retained feedback; `role=creator` shows Waiting Approval |
| Mark published external confirmation | ✓ | ✓ | ✓ | U | Cancel kept approved; confirmed write showed pending/failure, retry changed status to published and added the external badge |
| Content deletion confirmation | ✓ | ✓ | ✓ | U | Cancel kept record; confirmed failure kept record and retry removed it into whole-queue empty state |
| Campaign cards: goal, dates, budget, spend, kit readiness, status | ✓ | ✓ | ✓ | U | `campaigns-1440-dark`; ready and incomplete kit variants |
| Campaign status filter and no-match/empty view | ✓ | ✓ | ✓ | U | Empty read-only fixture and `All statuses` filter inspected; filtered no-match not clicked |
| New/edit campaign form | ✓ | ✓ | ✓ | U | `New campaign` at 390; named fields, numeric minimums, date minimum, Escape/focus return. Edit failure kept draft and retry changed the campaign name; failure wording was corrected |
| Campaign activate/complete actions and pending feedback | ✓ | ✓ | ✓ | U | Ready kit enabled Activate; failure/retry changed planned → active, then Complete changed active → completed. Active deletion stayed disabled |
| Campaign delete restriction and confirmation | ✓ | ✓ | ✓ | U | Active deletion disabled; completed campaign confirmation cancel preserved record and confirmed success removed it |
| Campaign kit list, required templates and empty state | ✓ | ✓ | ✓ | U | 1440 light kit; missing assets and ready fixture inspected |
| Campaign asset add form and URL validation | ✓ | ✓ | ✓ | U | Named fields; pending disabled save, simulated failure, draft retained |
| Campaign asset preview, external link and mobile return | ✓ | ✓ | ✓ | U | Preview button displayed the link pane and Approve action; external link launch and phone return remain untested |
| Campaign asset approval, return and remove confirmation | ✓ | ✓ | ✓ | U | Approval pending/failure/retry changed kit 0/4 → 1/4; return changed it to ready; removal cancel/failure/retry removed asset and showed kit empty state |
| CRM search, interest filter, export and board/table switch | ✓ | ✓ | ✓ | U | Search no-match reduced lead count to zero; board/table switched. Export file and filtered interest interaction remain untested |
| CRM table: lead profile, status change, interests and delete | ✓ | ✓ | ✓ | U | `crm-table-1440-dark`; profile button and status selector inspected. Browser control stopped before a status write |
| CRM board: seven stages, mobile stage rail, lead actions | ✓ | ✓ | ✓ | U | `crm-interested-390-dark`; Interested stage, open profile, Invite and Log call controls |
| CRM zero-result board and table states | ✓ | ✓ | ✓ | U | `scenario=empty` and a typed no-match search inspected on the board; table no-match was not repeated |
| Add-lead form and validation | ✓ | ✓ | ✓ | U | Blank submit focused child name; pending and failed save retained child, parent and phone draft |
| Lead profile header, timeline, notes and Workshops tab | ✓ | ✓ | ✓ | U | Phone-width dialog and timeline inspected in browser; fixture has no booking history |
| Lead call outcome and note forms | ✓ | ✓ | ✓ | U | Call save pending/failure; note save pending/success in local fixture |
| Lead available-slot and custom-demo booking panels | ✓ | ✓ | ✓ | U | Empty available-slot state and all custom-demo fields opened; browser control stopped before a booking write |
| Workshop invite dialog and WhatsApp draft handoff | ✓ | ✓ | ✓ | U | Template selection and disabled draft action inspected; external `wa.me` launch not tested |
| Chat import paste, preview and verification | ✓ | ✓ | ✓ | U | One recognized synthetic message previewed; pending and failed import retained pasted text |
| Growth cards and three-step audience wizard | ✓ | ✓ | ✓ | U | Goal, audience, review, eligibility and pending/failure at 390 dark; draft retained |
| Growth zero-eligible and view-only restrictions | ✓ | ✓ | ✓ | U | `scenario=empty&role=readonly`; create actions disabled. Dedicated `scenario=zero-eligible` fixture added but browser control stopped before its review step |
| Loading and data-fetch failure/retry | ✓ | — | — | U | `AppContext` does not expose a Marketing-specific loading/error/retry contract. No fabricated state was added locally |
| Keyboard focus, dialog containment/return and reduced motion | ✓ | ✓ | ✓ | U | Tab reached dialog close, Escape returned focus to New campaign; reduced-motion media query gave `0s` transition |

## Browser evidence and verification

Start the isolated preview with `node scripts/preview-marketing-v1.mjs`; open `http://127.0.0.1:5254/`. Options: `theme=light|dark`, `scenario=empty|zero-eligible`, `role=readonly|creator`, `post=review|approved`, `kit=ready`, and `campaign=active`. The preview bundles the actual Marketing components and intercepts Auth, AppContext, ConfirmContext and Firestore with synthetic fixtures. Pending writes are resolved through the preview's `Simulate success` and `Simulate failure` buttons; successful writes now update the fixture snapshot so the resulting list/status can be inspected. No school record is contacted. The one asset preview loads the public example.com page inside its existing iframe; no provider handoff was opened. Restart the server after editing the fixture source.

Synthetic captures in `pulse-evidence/`:

- `marketing-v1-{content,campaigns,crm,growth}-{1440,390}-{light,dark}.png` (16-tab matrix)
- `marketing-v1-campaign-form-{1440,390}-{light,dark}.png` (four dialog layouts)
- `marketing-v1-kit-{1440,390}-{light,dark}.png` (four campaign kit dialog layouts)
- `marketing-v1-crm-interested-390-dark.png`
- `marketing-v1-crm-table-1440-dark.png`
- `marketing-v1-growth-detail-390-dark.png`

The browser was exercised at exact 1440 and 390 CSS-pixel widths in light and dark for each of the four workspace tabs, the campaign form, and the campaign kit. All 16 tab combinations were measured: the 1440 document width equaled 1440 and the 390 document width was 373. The tab and board rails intentionally scroll inside the page. Main-page vertical scrolling, phone-height dialogs, keyboard focus and reduced motion were observed. The console errors during simulated failure buttons were expected catches from the fixture; their visible retry messages appeared in the respective dialogs. On 2026-10-21 browser control was disabled in Work settings mid-follow-up. CRM status writes/export, custom-demo booking, zero-eligible review and the distinct CRM profile/import and Growth dialog viewport/theme matrix could not be completed. Earlier phone-width profile/import interactions and the `growth-detail-390-dark` capture remain the only nested-dialog browser evidence.

`npm.cmd run build` passed with the repository's mixed Firebase import and large-chunk warnings. `node scripts/check-education-system.mjs` passed 62 checks. Admissions workshop and WhatsApp integration contract smokes passed 11 and 17 safeguards. `git diff --check` passed. The repository has no dedicated agent-check command. Repository-wide `tsc --noEmit` reports 234 diagnostics, with zero in changed Marketing files; this is not a clean repository-wide type-check claim.

## Limits and handoff

Real signed-in navigation, physical-phone review, restricted real-role behavior, live save confirmation, and provider handoffs remain open. The synthetic fixture mirrors local writes only; it does not prove Firestore persistence or server-returned snapshots. Campaign attribution reporting remains deliberately unavailable. Marketing-specific data loading/error/retry states require an AppContext contract and shared foundation coordination; this module pass does not invent them. No push, deployment, rules, schema, financial calculation, credential, or production-data change occurred. The integrating parent owns shared `.agent` and education-wide changelog updates.
