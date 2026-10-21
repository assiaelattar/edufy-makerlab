# Shared confirmation and alert · Design System v1

Local focused completion on `agent/edufy-confirm-modal-ds-20261020` from `a812834`. Scope is the shared `AlertModal` presentation and its isolated fixture. `ConfirmContext` and all Calendar/Finance module source remain unchanged. No school record, credential, rule, permission, schema, finance calculation, push or deployment changed.

## Inventory

Status key: **migrated** means the shared presentation now consumes canonical Design System v1 tokens; **preserved** means the existing `confirm`/`alert` promise and callback decision is unchanged; **gap** means acceptance needs another environment or a separate API task. All interactive evidence below uses `scripts/preview-confirm-modal-v1.mjs` with in-memory outcomes and no Firebase import.

| Reachable assigned state | Status | Browser evidence and boundary |
| --- | --- | --- |
| Info, success, warning, danger confirmations | Migrated; preserved boolean resolve | All four accents and titles inspected in light/dark desktop and phone layout families. Cancel resolved false in every combination; opener focus return was separately verified by keyboard and outside click. Representative approve resolved true. Danger uses red soft action, warning orange, success green, info blue. |
| Info, success, warning, danger alerts | Migrated; preserved void resolve | All four rendered as named `alertdialog`, focused OK first and acknowledged through OK in both themes and layout families. Outside click also acknowledged an alert, matching the prior close path. |
| Confirmation cancel, approve, header close, Escape, backdrop click | Migrated focus behavior; preserved outcome | Calendar fixture cancel retained assignment and approve removed it in memory. Escape resolved false, Tab/Shift+Tab wrapped through dialog controls, and opener focus returned. Header close and backdrop invoke the same existing cancel callback. |
| Long text and scrolling | Migrated | At exact 390 CSS px, the dialog measured exactly 390 px wide with no clipping. Its body scrolled 3,308 px of content within a 589 px region; footer remained at 839 px of an 844 px viewport, with no page overflow. Body scroll lock restored after close. |
| Disabled, pending, success and failure caller states | Preserved at caller boundary | Restricted fixture disabled Calendar and Finance openers. Finance synthetic approval disabled its opener during pending work, then showed a danger failure alert and reported no record changed. Success confirmation and success alert variants were also inspected. Shared `confirm`/`alert` has no pending/disabled option; callers own those states. |
| Calendar remove-assignment and unavailable/success feedback | Synthetically audited; call sites preserved | `CalendarView` uses warning confirmation with “Keep assignment” and “Remove assignment”; alerts cover warning and success. Fixture reproduced both decisions. Real populated week and real role remain a Calendar acceptance gate. |
| Finance reconcile/session correction and documents/invoice feedback | Synthetically audited; call sites preserved | `FinanceView` uses warning confirmations for balances and academic sessions; `FinanceDocumentsPanel` and `InvoiceModal` use success/warning/danger alerts. Fixture exercised warning approve, disabled pending, failure alert and cancel. No ledger write occurred. |
| Other `useConfirm` consumers | Presentation inherited; domain code unmodified | Source inventory found shared consumers across App, Attendance, Expenses, Students, Settings, Programs, Learning, Pickup and other modules. Their domain-specific outcomes were not replayed in this focused fixture. |

## Design and behavior

The dialog opts into `data-edu-system="1"` and imports the canonical token sheet. Its info/success/warning/danger roles map to blue/green/orange/red. The new stylesheet uses only `--ds-*` tokens for color, Nunito and DM Sans typography, 2 px outlines, 4 px button depth, a 44 px icon/close target and 48 px actions. Phone layout uses a full-height scrolling sheet. Reduced motion removes entrance and button transitions.

`AlertModal` retains the same props and callback routes. `ConfirmContext` still resolves confirmations to `true`/`false` and alerts to `void`. Initial focus goes to cancel for confirmations and OK for alerts. The top dialog contains Tab and Shift+Tab, Escape invokes close, and closing restores the opener. Backdrop click retains the original close behavior. Dialog titles and messages have generated, stable ARIA references. Existing nested dialogs remain under the shared layer.

## Verification

- Synthetic browser: 16 confirmation and 16 alert combinations across requested 1440/390 viewport settings and light/dark. The in-app browser scaled those settings to effective 1600/433 CSS px during interactive input; `document.scrollWidth === innerWidth` throughout. A read-only device-metrics inspection confirmed exact 1440 and 390 CSS px geometry. Exact 390 footer, body-scroll and page-width values are above. The exact-metrics override did not support reliable clicks in this browser, so interactions used its ordinary responsive viewport control.
- Keyboard: initial focus, forward and reverse wrap, Escape, outside click, focus return and body scroll restoration passed. Reduced-motion emulation reported `animation-duration: 0s` and button `transition-duration: 0s`.
- `npm.cmd run build`: passed, 2,432 transformed modules. Existing Firebase mixed-import and large-chunk warnings remain. Initial build with another checkout's incomplete dependency folder failed to locate `@rive-app/webgl2/rive.wasm`; rerun with a complete dependency checkout passed. No dependency or lockfile changed.
- `node scripts/check-education-system.mjs`: passed, 27 checks. `node scripts/test-membership-lifecycle.mjs`: passed. Focused strict TypeScript for `AlertModal`/`ConfirmContext` and Finance catalogue sources: passed. Bundled Finance service-catalogue domain smoke: passed. `git diff --check`: passed.
- No repository `agent:check` command exists. The shared Education System checker is the applicable design check.

## Decision and remaining acceptance

Keep pending and disabled state with the caller, since the public confirmation/alert API has no pending option and this task preserves API semantics. The synthetic fixture proves callback outcomes only in memory. Signed-in app navigation and any real Calendar or Finance write remain separate read-only/integration gates; a real restricted account, physical phone, real populated week/ledger and exact-width interactive browser input were not exercised. The parent integration owner can add this report to the central handoff, changelog, decisions and known-issues files after merging the focused commit.
