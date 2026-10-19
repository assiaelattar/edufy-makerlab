# Design System v1 — local reference implementation

Date: 2026-10-19. Status: reference candidate ready for user review; broader rollout is gated.

## Delivered

- Canonical six-color token ramps and light/dark themes, shared action hierarchy/status/accent types, fields, form sections, icons, badges, notices, states, toolbar, view tabs, action disclosure and detail panel.
- Dashboard leads with the action queue; welcome uses the adopted 011Y. Program focus is purple, verification attention yellow, follow-up orange; primary actions remain blue. Supporting metrics use soft contextual surfaces.
- Students consumes canonical tokens and detail-panel primitive. Search, filters, selected operational view and scroll position are cached only in memory, scoped by organization and user; returning from a profile restores the working context.
- Existing four-step enrollment UI uses the shared dialog and buttons; labels are linked to inputs, learner-mode choices expose pressed state and errors receive focus. Existing validation, prices, payment handlers and final command remain unchanged.
- Full student-details editor extracted into StudentDetailsForm: eight existing fields grouped into learner, family and school/care sections; pending save, disabled duplicate submit, retained draft on error and retry feedback. Existing Firestore payload construction and update target are unchanged.
- Modal focus containment and opener restoration corrected, including autofocus children. The shared Rive renderer redraws its still frame after pause/resize.
- Live gallery and reusable module brief/acceptance contract. Original unfinished Admissions/Workshops changes are preserved outside this milestone.

## Review links

- Review: http://127.0.0.1:5246/ — dashboard, Students, student forms and component gallery; theme switch in the top bar.
- Phone on the same network: http://192.168.1.55:5246/ — server listens on 0.0.0.0; physical phone/firewall reachability still needs the user's check.
- Real local app: http://127.0.0.1:5202/ — existing authenticated school workspace.
- Start review server: `node scripts/preview-education-system.mjs`. Reload rebuilds the synthetic bundle. Query parameters: `page=dashboard|students|forms|gallery`, `theme=light|dark`, `scenario=empty`, `role=readonly`, `save=error` (first save fails, retry succeeds).

## Verification

- Production builds pass; existing mixed Firebase import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 20 checks pass, including all six soft-surface text contrasts in both themes, normal/muted text, primary button text and token/reduced-motion contracts.
- Repository-wide `tsc --noEmit` fails on existing errors outside the changed files (including PublicEnrollmentView and Maker Pro dependency/type errors). No diagnostics were reported for the changed application files in that run. This is not a clean repository-wide type-check claim.
- Atlas context reader ran. The repository has no dedicated agent-check command. `git diff --check` passes.
- Browser: desktop plus a 390 CSS-pixel phone viewport; both themes; no page-level horizontal overflow. Intended filter/navigation rails can scroll horizontally. The mobile editor has one scrolling body and usable footer controls.
- Synthetic enrollment: empty required-name validation, learner entry, program/pack/class selection, Fees, Review, pending submission and completion feedback. No financial transaction was performed.
- Synthetic editor: all eight fields, pending state, failed-save message with draft retained, retry; Tab/Shift+Tab containment, Escape and opener focus restoration. Empty/read-only register states and reduced motion checked.
- Register: searched learner → profile preview → Back to students retains the query and matching row; scroll position restores. This uses the actual StudentsView component with synthetic boundaries.
- Signed-in local read-only integration: shared dashboard root/tokens/priority order and loaded mascot; populated Students register; six labeled enrollment entry fields; eight-field student editor across three sections. Forms were cancelled. No production writes or production screenshots were saved.
- Browser error log was empty during the reference checks.

## Evidence and boundaries

Synthetic captures are `docs/education/pulse-evidence/ds-v1-*.png`. The gallery uses actual app components with isolated data boundaries. The intermediate student profile is explicitly a synthetic preview, while the real app keeps its existing complete profile. Loading/error/restricted patterns are demonstrated in the gallery; no data-loader or authorization changes were made.

Visual acceptance, physical-phone review, and real-account save acceptance remain separate user gates. Existing unrelated TypeScript failures are not repaired by this UI milestone. Full student-profile tabs, payment dialogs and later-module forms are outside this three-reference phase. No push, deployment, auth/rule change or production mutation occurred. The heartbeat remains PAUSED and its instructions now reference the full-palette v1 contract instead of the superseded neutral-counter direction.
