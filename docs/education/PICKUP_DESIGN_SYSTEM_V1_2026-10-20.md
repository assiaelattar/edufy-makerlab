# Pickup Design System v1 audit — 20 October 2026

## Scope and outcome

Pickup is the reference module for the school staff Design System v1. This pass covers its desk, live queue, scheduled roster, verification form, arrival confirmation, lobby, feedback, empty and restricted states at desktop and phone widths. The connected family and learner pickup journeys in SparkQuest were inventoried and inspected as separate mobile surfaces. They retain their own mobile design system; no family or learner command, permission, data model, or styling was changed here.

The staff view now uses the shared `--ds-*` token vocabulary and the `data-edu-system="1"` scope. Module CSS arranges existing controls and content. Blue denotes selection and action, green denotes identity or completed handoff, orange denotes attention at the gate, and purple denotes optional learner readiness. The older Pickup palette sheets are no longer imported by `PickupView`; the scoped arrangement sheet is the sole Pickup-specific stylesheet in the modern view. The existing nonmodern Atlas path is retained.

## Surface inventory

| Surface and state | Status | Evidence and remaining boundary |
| --- | --- | --- |
| Staff command area, 011Y, live counts | Migrated and browser checked | Light/dark desktop and phone; 011Y remains contextual on desktop and the desk comes first on phone. |
| Staff live queue: at gate, incoming, released, ready and status labels | Migrated and browser checked | Real `PickupView` rendered with synthetic records; text and color both indicate state. |
| Search, clear, no match, and status filters | Migrated and browser checked | Desktop selected filters and phone disclosure; phone selection closes disclosure and preserves the selected state. No-match search renders a named message. |
| Today's scheduled workshop roster and authorized picker selector | Migrated and browser checked | Scheduled learners stay visible; an unlinked family has a disabled action and explanation. |
| Staff physical-arrival confirmation | Reused and browser checked | Cancel leaves the synthetic entry incoming; confirm advances it to the gate. Existing command and permission checks are preserved. |
| Identity verification form and verified release | Migrated and browser checked | Shared field/button controls; method, 8-character note and explicit checkbox are required. Cancel returns focus to the opener. Synthetic success supplied verification evidence and moved the record to Released; failure kept the draft and checkbox. |
| Staff success and failure messages | Migrated and browser checked | Shared notice styling; dismiss action remains. |
| Staff lobby display | Migrated and browser checked | Light/dark phone and desktop. `role="dialog"`, Escape, Tab containment, exit button, focus restoration and internal scrolling checked. |
| Empty queue and empty scheduled roster | Migrated and browser checked | Synthetic `scenario=empty`. |
| Missing organization and read-only role | Migrated and browser checked | Organization selection state and no arrival/release controls for restricted fixture. Real role enforcement still needs account acceptance. |
| Legacy undated record warning | Migrated and browser checked | Synthetic `scenario=legacy` shows reconciliation instructions in orange. The existing command guard blocks a replacement record for the affected learner. |
| Atlas fallback route | Reused and browser checked | `?ui=atlas-legacy` still renders its prior structure at 390 px without horizontal overflow. |
| Staff data loading and transport failure | Existing app data layer; not exercised in this fixture | This view receives AppContext collections rather than a module-specific loading/error prop. Command failure was exercised; data-fetch loading/retry needs real integration or an expanded synthetic adapter. |
| Family schedule, authorized picker, announce/on-the-way and arrive | Inspected and browser checked; separate mobile system | SparkQuest synthetic family preview at 390 px; one family has no pickup entry, another has an arrived entry. No school writes. |
| Family private notes, cancellation, receipt confirmation | Inspected and browser checked; separate mobile system | Synthetic note send, required cancellation reason and selected-picker receipt were exercised. Notes are available after arrival in the preview. Real identity and persistence remain unverified. |
| Learner schedule, authorized picker, progress and optional ready action | Inspected and browser checked; separate mobile system | Learner preview at 390 px with an arrived entry; layout and guidance checked. Authenticated learner-ready command was not available in this preview. |
| Learner pickup notification, loading and error states | Source inventoried; not browser checked | `PickupNotification` shares the learner listener and `PickupSchedule` accepts loading/error inputs. These need an authenticated or expanded fixture check. |

## Workflow checks

1. Staff scans the live gate queue, opens a named learner verification form, records identity method and a note, confirms the authorized picker, and submits the existing release command. While pending, submission is disabled. Success updates the synthetic queue and shows a success notice; simulated command failure leaves the form values available for retry. Cancel keeps the queue context and restores focus.
2. Staff marks an incoming family as physically arrived. The confirmation dialog can cancel without changing status or confirm into the gate queue. The authorized picker and dated roster are kept in view.
3. Staff opens the lobby from the command area. Scheduled learners and current statuses are shown without an action to release. Escape or Exit returns to the desk and restores focus to Open lobby display.
4. Family chooses an authorized picker, announces travel and arrival, reads the dated journey, sends a private note after arrival, can cancel with a reason, and confirms receipt after release. These were synthetic SparkQuest interactions; they do not prove backend writes.
5. Learner sees the dated workshop/pickup schedule and pickup progress. Optional learner readiness and notification behavior remain an authenticated acceptance item.

## Verification and evidence

- Production `npm run build` passed (2,431 modules). Existing Firebase static/dynamic import and large-chunk warnings remain.
- Full repository TypeScript still reports 235 existing diagnostics, matching the previous Pickup baseline; none names `PickupView.tsx` or the Pickup fixture. No changed-code diagnostic was found.
- `node scripts/check-education-system.mjs`: 27 token, contrast, dialog and reduced-motion checks passed.
- `pickupLifecycle.smoke.ts` and `dailyPickupRoster.smoke.ts` passed. `git diff --check` passed.
- Chrome synthetic preview: 1440 × 900 and 390 × 844 CSS px in light and dark; no page-level horizontal overflow. The desk, roster, form and lobby scroll; mobile filter disclosure works. Reduced-motion media emulation applied and the scoped controls report zero animation and transition duration.
- Read-only signed-in local app check: Pickup route opened and live queue/scheduled counts rendered. No action was submitted and no production screenshot was retained.
- Fixture source: `scripts/fixtures/pulse-pickup.jsx` and `scripts/fixtures/pulse-pickup-adapter.jsx`. Run `node scripts/preview-pulse-pickup.mjs`, then open `http://127.0.0.1:5236/?theme=light` or `?theme=dark`. Extra fixture states: `&scenario=empty`, `&scenario=no-org`, `&scenario=legacy`, `&role=readonly`. The fixture uses synthetic names and callbacks only.
- SparkQuest family preview was inspected via `?designPreview=family` (also `&pickupState=arrived` and `&pickupState=released`); learner via `?designPreview=pickupLearner&pickupState=arrived`. These routes use synthetic preview records.

| Capture | Light | Dark |
| --- | --- | --- |
| Staff desk, desktop | [light](pulse-evidence/pickup-ds-v1-desktop-light-2026-10-20.png) | [dark](pulse-evidence/pickup-ds-v1-desktop-dark-2026-10-20.png) |
| Staff desk, 390 px | [light](pulse-evidence/pickup-ds-v1-mobile-light-2026-10-20.png) | [dark](pulse-evidence/pickup-ds-v1-mobile-dark-2026-10-20.png) |
| Identity form, 390 px | [light](pulse-evidence/pickup-ds-v1-mobile-form-light-2026-10-20.png) | [dark](pulse-evidence/pickup-ds-v1-mobile-form-dark-2026-10-20.png) |
| Lobby, 390 px | [light](pulse-evidence/pickup-ds-v1-mobile-lobby-light-2026-10-20.png) | [dark](pulse-evidence/pickup-ds-v1-mobile-lobby-dark-2026-10-20.png) |

[Learner pickup preview at 390 px](pulse-evidence/pickup-learner-mobile-arrived-2026-10-20.png). All captures in this report contain synthetic records.

## Acceptance still required

- Visual review of the integrated Pickup candidate remains open; module work continues under the user's existing authorization.
- Signed-in school roles, tenant changes, actual command persistence, selected-picker receipt and notes authorization, network failure/retry, and a physical phone check. The real-account review in this pass was read-only.
- Authenticated learner-ready and notification behavior; staff collection loading/error/retry states.

This branch is a focused local Pickup commit for integration. No push or deployment is part of this handoff.
