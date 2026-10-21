# Programs workspace — 2026-10-19

## Result

Completed the user-requested Programs detail pass in `agent/edufy-pulse-attendance-20261016`. The catalog opens the complete operational workspace: Overview, Run plan, Groups & schedule, Roster, Waiting, Finance and Sharing. The adopted sidebar and working-set navigation remain intact.

- Module-scoped light/dark styling for tab content, tables, mobile cards, form fields, setup wizard, quote, QR and next-year dialogs. Neutral metrics; lime/green identity; blue actions; #FF9600 used as a small warning cue with pale attention surfaces.
- Roster search matches learner, group and plan. Placement filtering, result counts, clear filters and a dedicated no-match state work in desktop and mobile layouts. Exports explicitly continue to include the entire roster.
- Fixed the early return in ProgramsView that prevented shared quote/QR dialogs and print renderers from mounting while a program detail was open.
- Editing setup keeps the current program and tab mounted; closing the dialog restores the workspace context.
- Detail edit/pause controls now use the existing programs.edit capability, and waiting enrollment uses students.enroll. Permission definitions, backend rules and domain handlers are unchanged.
- Run-plan copy describes projected dates and delivery readiness in school-facing language. Existing projections, financial calculations, export and save handlers are preserved.
- Corrected rollover light footer and hidden checkmarks on unchecked options. Quote fields now have associated labels.

## Verification

| Check | Result |
| --- | --- |
| Production build | PASS; 19.17 seconds, existing large-chunk warning |
| All seven tabs, light and dark | PASS at 390 CSS px and 1440/1456 CSS px; page and panel widths equal scroll widths |
| Roster interactions | PASS: name search, combined search/placement, no-match state, clear, unplaced first, learner navigation |
| Groups | PASS: existing level/group layout and Open class handoff with program/level/group IDs |
| Sharing | PASS: QR opens from detail, Escape restores focus; quote opens and closes without losing selected tab |
| Setup | PASS: six edit steps through Review; new-program required-name validation; no save executed |
| Next-year preparation | PASS: open/cancel, phone layout, checked versus unchecked states; no preparation submitted |
| Existing view-only capabilities | PASS: edit/pause/remove/delete/enroll disabled in synthetic readonly role |
| Actual signed-in app | Read-only check after refresh: real 30-learner roster; placement filter shows 1 of 30; clear restores full list; no horizontal overflow at 1422 CSS px |
| Repository checks | git diff --check; atlas-loop-agent context reader executed (not a test suite) |

## Preview

- Actual app: http://127.0.0.1:5202/ — Programs → open a program → Roster or another tab.
- Same Wi-Fi phone: http://192.168.1.55:5202/ (Wi-Fi 2 address verified this session).
- Synthetic preview: http://127.0.0.1:5238/?theme=light or `?theme=dark`.
- Synthetic preview runner: `node scripts/preview-pulse-programs.mjs`; current process session 17932. Restart after source edits.

## Evidence

All committed screenshots use synthetic records only, under `docs/education/pulse-evidence/`:

- `programs-workspace-roster-light.png`
- `programs-workspace-roster-mobile-dark.png`
- `programs-workspace-groups-light.png`
- `programs-workspace-finance-dark.png`
- `programs-workspace-run-plan-dark.png`
- `programs-workspace-sharing-mobile-dark.png`
- `programs-workspace-quote-light.png`
- `programs-workspace-quote-mobile-light.png`
- `programs-workspace-setup-light.png`
- `programs-workspace-rollover-mobile-light.png`

## Acceptance boundary

This is a verified local UI milestone, not a production release. No push/deploy, authentication changes, financial logic changes or production writes occurred. Saves, enrollment conversion, deletion, annual rollover execution and physical printing were not exercised against the real account. Read-only real-account checks are separate from synthetic UI QA. Browser emulation does not replace acceptance on the user's physical phone. The heartbeat remains paused; this turn completes Programs only.
