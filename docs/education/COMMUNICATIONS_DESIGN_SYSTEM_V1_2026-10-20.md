# Communications — Design System v1 focused completion

Date: 2026-10-20. Branch: `agent/edufy-communications-ds-20261020`, based on `d92be59`. This is a local Communications-only candidate. The bridge commit's broad CSS was inspected; this pass adds a module-scoped presentation layer and uses the shared Education tabs and state controls.

## Staff job and source of truth

Staff inspect tenant-scoped publication history and the template library, compose one message, select all active students or active program segments, then choose either a dashboard post or operator-assisted WhatsApp drafts. Existing `AppContext` students/programs/enrollments, `AuthContext.can('marketing.create')`, the organization settings transaction, the `announcements` query/write, `ConfirmContext`, `Modal`, and `wa.me` draft launch remain authoritative. A draft launch is not delivery evidence. Email and scheduled delivery are unavailable.

The visible workflow now has a canonical green identity header, blue action and selection controls, quiet white/dark surfaces, a shared tab rail, and a single scoped CSS owner at `views/communications/education-communications-v1.css`. The inherited family-journey light bridge is no longer imported by this view. Loading and load failure hide stale content; a retry reloads the tenant workspace. Local compose, filter, tab and queue state resets when the organization or signed-in user changes. Program option counts now include only active students, matching the selected audience. Search inputs and the category filter have accessible names, and the draft queue announces recipient progression. The parent-phone metric names recorded phone data without implying valid delivery.

## Reachable inventory

`I` = inspected in source; `M` = migrated or confirmed against Design System v1; `B` = exercised in the isolated browser fixture. A dash is an explicit gap. Evidence names below refer to synthetic PNGs in `pulse-evidence/`.

| Surface or state | I | M | B | Evidence or limit |
| --- | :---: | :---: | :---: | --- |
| Entry header, organization identity, action, four summaries | ✓ | ✓ | ✓ | Overview captures at 1440/390, light/dark; actual signed-in counts inspected read-only |
| Overview channel readiness and audience-health context | ✓ | ✓ | ✓ | All four layout/theme combinations; available/manual/unavailable meanings retained |
| Recent dashboard posts and reusable-template shortcuts | ✓ | ✓ | ✓ | Populated and zero-record fixture; links open History or load Compose |
| Shared Overview/Compose/Templates/History tabs | ✓ | ✓ | ✓ | All 16 tab/viewport/theme combinations measured; selected state and panel labels checked |
| Compose title, body, character limit and required labels | ✓ | ✓ | ✓ | `compose-390-light`; editable draft remains on failed save |
| Personalization tokens and unresolved bracket-field notice | ✓ | ✓ | ✓ | Token notice and per-recipient substitution inspected; dashboard publication remains disabled with personalization tokens |
| All-active and selected-program audience controls | ✓ | ✓ | ✓ | Program count excludes inactive learner; checkbox changes 0 to 2 selected in fixture |
| Audience preview, parent context and missing-phone warning | ✓ | ✓ | ✓ | Three active synthetic learners, one missing phone; contact data stays in the fixture only |
| Template category and save to library | ✓ | ✓ | ✓ | Blank-title/content alert, pending disabled state, first-save failure, retained draft, retry success |
| Dashboard publish confirmation, pending, failure and success | ✓ | ✓ | ✓ | Cancellation kept draft; first write failed; retry created local-memory post and returned to History |
| Disabled email and schedule actions | ✓ | ✓ | ✓ | Disabled and labeled in Compose; no unsupported provider path added |
| WhatsApp queue open, personalized preview and progress | ✓ | ✓ | ✓ | `queue-390-dark`; two synthetic recipients, phone and message preview |
| Queue skip, draft launch, completion, Escape and focus return | ✓ | ✓ | ✓ | `window.open` intercepted; no external WhatsApp call; Tab/Shift+Tab contained in modal |
| WhatsApp invalid-phone and popup-blocked alerts | ✓ | ✓ | — | Existing handlers inspected; not triggered in the browser fixture |
| Template catalogue, search, category filter, tags and use | ✓ | ✓ | ✓ | `templates-390-dark`; search and category filter each narrowed to one card; use returns to Compose |
| Starter-template confirmation and idempotent transaction | ✓ | ✓ | ✓ | Empty fixture added six templates in local memory; cancellation path inspected in handler |
| Template deletion confirmation, cancellation and success | ✓ | ✓ | ✓ | Cancel preserved card; accepted deletion removed only synthetic card |
| History register, search, no-match and no-post states | ✓ | ✓ | ✓ | `history-1440-dark`; no-match reset and empty organization fixture |
| Loading, data failure and retry | ✓ | ✓ | ✓ | `scenario=loading` held action disabled; `scenario=error` showed retry, then loaded data |
| View-only role | ✓ | ✓ | ✓ | `role=readonly`; publish/template changes disabled; inspection remains available |
| Tenant/user context change | ✓ | ✓ | — | Source guard prevents stale tenant data from rendering and clears local draft/filter state; a live tenant switch was not exercised |

## Browser evidence and acceptance

Start the isolated fixture with `node scripts/preview-pulse-communications.mjs`, then open `http://127.0.0.1:5247/?theme=light`. Query options are `theme=light|dark`, `scenario=empty|loading|error`, `role=readonly`, `save=error`, and `confirm=accept|cancel`. Restart the fixture server after source edits. `getDoc`, `getDocs`, `runTransaction`, `addDoc`, confirmations and WhatsApp launch are synthetic local-memory boundaries; no Firebase or messaging service is contacted.

The eight captures are `ds-v1-communications-{1440,390}-{light,dark}.png`, `compose-390-light`, `templates-390-dark`, `history-1440-dark`, and `queue-390-dark`. Browser measurements for every tab at 1440px and 390px in both themes found no document-level horizontal overflow: `scrollWidth` was 1425–1440 at 1440 and 375 at 390. The tab rail is intentionally horizontally scrollable on phone. Overview/Compose/Templates extend vertically; short History content fits the desktop viewport. The 390px queue fills the viewport with a scrolling body and reachable actions. Reduced-motion emulation matched and set the tab transition to `0s`. Escape closed the queue and returned focus to its opener; Tab and Shift+Tab wrapped within the dialog.

The signed-in local app at `http://127.0.0.1:5202/` was navigated read-only on 2026-10-20 as Administrator. All four tabs loaded at 1440px and 390px, including a populated template library and one historical post. At 1440px the page had no horizontal overflow; at 390px the shell's content scroll container remained scrollable and the page width was 390px. No production screenshot, contact detail, form submission, messaging launch, or school-data write was captured or performed. The actual restricted role and dark-theme real-account experience remain separate acceptance checks.

## Verification and open limits

- `npm.cmd run build`: passed. Existing Firebase mixed static/dynamic import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 62 checks passed.
- `git diff --check`: passed. No dedicated repository `agent:check` command or Communications domain smoke suite exists.
- Repository-wide `npx.cmd tsc --noEmit --pretty false` reports 235 existing unrelated diagnostics, including `App.tsx` and Maker Pro; the Communications file had zero diagnostics in the run. This is not a clean repository-wide type-check claim.
- The synthetic fixture checked write outcomes only in local memory. Real message delivery, provider integration, actual school-account saves, popup-blocked/invalid-phone behavior, and physical-phone acceptance remain open. Bracket placeholders are warned about but retain the existing action semantics.

No shared token, permission, schema, rule, API, provider, release, or production-record change was made. The module report contains this pass's handoff, decision and known-issue record; the integrating parent chat owns shared `.agent` and education-wide changelog updates. No push or deployment occurred.
