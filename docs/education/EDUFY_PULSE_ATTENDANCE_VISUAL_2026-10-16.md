# Pulse Attendance — visual register refinement (2026-10-16)

## Request and scope

The user approved a stronger visual pass after the first functional milestone still felt too close to the previous UI. This pass stays in Attendance on `agent/edufy-pulse-attendance-20261016`. No release or extension to other modules.

## Search / reuse / change

- Reused Education semantic light/dark tokens, Atlas command header, toolbar, actions and empty states.
- Restructured the view into one daily register with a desktop session-time rail, continuous student rows and grouped four-state controls. On mobile, the time marker sits above each session and the status control fills the row.
- Increased title hierarchy, unified filters with the register, reduced emphasis of bulk marking until students are selected, and retained explicit counts and saved/error feedback.
- Removed the old `edu-attendance-v1` structural class from the Pulse root; its earlier school-day card rules no longer compete with this register.
- Changes are limited to the render markup and module CSS. Attendance handlers, eligibility, payloads, authentication, permissions and persistence are unchanged.

## Proof

Synthetic preview uses the actual AbsenceView with isolated data adapters; it does not connect to school records.

- Light and dark visually inspected at 1440, 766 and 390 CSS px. Final horizontal scroll widths equal viewport widths. A tablet summary overflow found during review was fixed.
- Status targets are 44 CSS px on desktop/tablet and 48 CSS px on mobile (browser subpixel readings 43.99/47.99).
- Mobile search/group controls share one row; long student text can wrap. Native date navigation remains available.
- Keyboard focus is visible; the last student is reachable and the page scrolls (observed scrollTop 760, persistent progress at top 0).
- Individual marking retains the previous count while pending, reports success only after simulated acknowledgement, and leaves the student unmarked on simulated failure.
- Selected batch marking confirms one selected student and preserves Sam's existing late exception.
- Search empty state, clear filters and group filtering pass.
- Seven-day navigation reaches a future scheduled session: all 24 status controls are disabled.
- Production build passes. Full TypeScript still reports exactly the same 235 existing diagnostics as the captured baseline, with no additions.

### Visual density tradeoff

With the same fixture, the final first student begins around y=423 desktop/tablet and y=534 mobile, in both themes. The initial compact Pulse milestone was denser (278 desktop/tablet, 397/384 mobile); this refinement deliberately adds a register heading and stronger session structure. It remains substantially above the original mobile baseline (912/918). These are synthetic viewport measurements, not signed-in shell measurements.

## Evidence

`docs/education/pulse-evidence/refined-{desktop,tablet,mobile}-{light,dark}.jpg` contains the six final captures. Original `before-*` and first-milestone `after-*` captures are preserved for comparison.

## View locally

- Actual application: http://127.0.0.1:5202/ — sign in, then open Attendance.
- Isolated visual preview: http://127.0.0.1:5231/?theme=light or `?theme=dark`.
- Restart preview after edits with `node scripts/preview-pulse-attendance.mjs`.

## Acceptance boundary

Real-school persistence, role acceptance and a physical phone still need designated-account review. Synthetic QA is not that acceptance. No production data was changed or deployment performed. Review the Attendance visual direction before proceeding to Classes/Students. Existing credential-reveal follow-up remains separately documented.
