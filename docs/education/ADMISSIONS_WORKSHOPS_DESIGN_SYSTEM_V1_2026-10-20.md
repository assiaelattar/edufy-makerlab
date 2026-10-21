# Admissions and Workshops — Design System v1 focused completion

Date: 2026-10-20. Branch: `agent/edufy-admissions-workshops-ds-20261020`, based on `a812834`. This is a local, synthetic-data UI handoff. The prior 2026-10-19 rollout remains the visual foundation.

## What changed

- Workshop Calendar session cards now have one native disclosure button and separate attendee controls. The button names the session, date, time and reserved capacity. Expanded controls are no longer nested in a button-like container.
- Calendar attendee contact, enrollment and CRM controls, and quality analysis, now respect the existing `workshops.manage` gate in restricted views. Read-only Follow-up and Templates views explain the available scope. Existing write handlers and the permission source remain unchanged.
- Template and Follow-up searches retain independent values within the existing organization/user workspace scope when staff switch tabs.
- An Admissions register with zero projected cases now says there are no inquiries. The filter-specific reset remains available only when cases exist.
- The isolated fixture provides delayed assistant loading, a first-save failure followed by local-memory retry success, and cancelled confirmation feedback. It still blocks Firebase, messaging, booking status, conversion, evaluation and deletion writes.

## Reachable surface inventory

`I` = source inspected; `M` = consuming the existing Design System v1 (with this pass's repairs where stated); `B` = exercised in the isolated browser fixture. A dash in `B` is an explicit coverage gap.

| Surface or state | I | M | B | Evidence / gap |
| --- | :---: | :---: | :---: | --- |
| Admissions priority, counts and Today register | ✓ | ✓ | ✓ | 1440/390 light/dark captures; populated and zero cases |
| Pipeline stages and All cases tabs | ✓ | ✓ | ✓ | Browser tab navigation, stage/search visibility; no data mutation |
| Search, review filter and selected family | ✓ | ✓ | ✓ | Fixture selected case, empty search and reset; independent from domain projection |
| Family journey passport and linked evidence | ✓ | ✓ | ✓ | 390 dark passport capture; full-height scroll, Escape and focus return |
| Evidence expansion and repair notices | ✓ | ✓ | ✓ | Seven recorded synthetic items and phone-only candidate flags inspected |
| WhatsApp assistant consent, template preview and activity history | ✓ | ✓ | ✓ | Synthetic loaded assistant; actual message/activity writes disabled |
| WhatsApp assistant loading and load failure/retry | ✓ | ✓ | ✓ | `scenario=loading` resolved; `scenario=error` showed retry and disabled actions; expected fixture error was logged |
| Admissions restricted and zero-case states | ✓ | ✓ | ✓ | `role=readonly`; empty copy corrected; no write action exposed |
| Workshop priority, four summaries and working tabs | ✓ | ✓ | ✓ | 1440/390 light/dark captures; tab navigation and priority action |
| Calendar month/day planning and zero-session day | ✓ | ✓ | ✓ | Date selection, selected day agenda and empty scenario |
| Session detail and attendee status/action controls | ✓ | ✓ | ✓ | Native disclosure, keyboard access, enabled/disabled controls; restricted role checked |
| Attended family Follow-up register, search and empty state | ✓ | ✓ | ✓ | Populated, empty, restricted; separate query retained after tab changes |
| Template catalog, booking state, link preview/share/copy | ✓ | ✓ | ✓ | Active/paused cards and disabled paused link controls inspected; external page/WhatsApp launch not exercised |
| Workshop booking history, search and empty state | ✓ | ✓ | ✓ | Populated and empty history, name search, Escape and opener focus return |
| Create/edit workshop form, one-time/weekly planning and preview | ✓ | ✓ | ✓ | Required title validation, weekly day selection, date, preview, cancellation, long mobile form scroll; edit path inspected but not saved |
| Template pending, failure, retry and success | ✓ | ✓ | ✓ | `save=error`: buttons disabled during pending, draft retained on failure, retry created synthetic local-memory template |
| Template deletion and booking cancellation confirmations | ✓ | ✓ | ✓ | Synthetic confirm returns Cancel; template/booking state did not change |
| Enrollment and CRM confirmation paths | ✓ | ✓ | ✓ | Synthetic confirmation cancellation kept the booking unchanged; successful conversion and resulting records were not tested |
| Performance report form, validation and unavailable evaluator | ✓ | ✓ | ✓ | Responsive scroll, required fields, disabled submit with no key, Escape/focus return; evaluator result/write unavailable |
| Workshop module data loading or feed failure | ✓ | — | — | `AppContext` exposes no module-specific loader/error contract to these pages. Do not show a fake empty state for a failed feed. Separate data-layer work is needed. |
| Signed-in school account and restricted real role | ✓ | — | — | No current-source authenticated server or real account was available in this isolated worktree. The 2026-10-19 signed-in read-only report is historical, not fresh proof for this commit. |

## Browser and visual evidence

The fixture renders the actual Admissions and Workshops components with synthetic records only: `http://127.0.0.1:5244/?module=admissions|workshops&theme=light|dark`. Add `scenario=empty`, `scenario=loading`, `scenario=error`, `role=readonly` or `save=error` as applicable. Restart `node scripts/preview-pulse-admissions-workshops.mjs` after editing source.

The eight `docs/education/pulse-evidence/ds-v1-aw-20261020-{admissions,workshops}-{1440,390}-{light,dark}.png` files are exact CSS-viewport first-fold captures. Extra captures show `admissions-passport-390-dark`, `workshops-form-390-light` and `workshops-restricted-390-dark`. In all eight viewport/theme combinations, measured `documentElement.scrollWidth` equaled 1440 or 390 respectively; page height exceeded the viewport and vertical scrolling worked. At 390px the passport filled the viewport, and the workshop form dialog body measured 1775px of scroll content within 776px of visible body height. No page-level horizontal overflow was found. Browser interaction checks ran at the responsive layout; keyboard Escape returned focus to the opener for the passport, assistant, history and report dialogs. Reduced-motion emulation matched and shortened the Admissions priority transition to `0.00001s`.

The preview intentionally logs two errors when their synthetic failure scenarios are invoked: the first template save and the assistant history load. Both surfaced recoverable feedback. No production records or credentials appear in the captures.

## Verification

- `npm.cmd run build`: pass. Existing mixed Firebase import and large-chunk warnings remain. The first attempt with the base checkout's incomplete shared `node_modules` failed on missing `@rive-app/webgl2`; `npm.cmd ci --ignore-scripts` in this worktree restored declared dependencies and the build passed.
- `node scripts/check-education-system.mjs`: 27 checks passed.
- Admissions adapter/selectors: 22 scenarios; workshop links: 11; offer/Finance facts: 28; workshop integration contract: 11; enrollment integration contract: 13. All passed with Node 24.
- `git diff --check`: pass. No repository `agent:check` command exists; the Education System checker and focused domain checks serve this module handoff.

## Decisions and limits

The existing Admissions projection, Workshop booking and enrollment handlers, authorization hooks, storage schemas, financial rules, public-link semantics and production records remain authoritative. A phone-only match remains a candidate, never an automatic family link. WhatsApp link launch is not delivery evidence. This pass adds no shared component, token palette, API, rule or index change.

The module still uses legacy Tailwind utility colors beneath the canonical scoped token bridge; further visual simplification should happen only with a shared foundation decision. Real school-account navigation, physical-phone review, external public booking/share behavior and real write acceptance remain open for the integrating parent chat. No push or deployment occurred.
