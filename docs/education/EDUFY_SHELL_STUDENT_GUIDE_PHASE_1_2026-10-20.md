# Edufy shell, Student Details and 011Y reference — 2026-10-20

## Outcome

Phase 1 is ready for visual approval. The reference combines one global navigation shell, a reorganized Student Details experience and a contextual animated 011Y guide. Settings, Finance, Expenses and the remaining module migrations stay behind this approval gate.

## Global shell

- Replaced the duplicated sidebar plus global working tabs with a compact rail and an overlay workspace panel.
- Added organization and user scoped pinned modules and recent destinations. A maximum of four pinned modules is retained.
- Stopped reading and rendering `atlas:workspace-tabs:*`; existing stored values remain untouched.
- Added a simplified context bar, profile display controls and a permission-filtered command palette.
- Added `Ctrl/Cmd + K`, arrow key selection, Enter activation, `Escape` close and focus restoration.
- Added a 390 px bottom navigation for Dashboard, Students, Programs, Attendance and More.
- Nested detail views use their own back action and remove the mobile bottom bar.
- Restored each module scroll position when returning from a detail route.

## Student Details

The page now answers: **understand this learner and take the next responsible action**.

- Identity header with three visible working actions.
- Real-state attention strip and matching 011Y guidance.
- Five workspaces: Overview, Learning, Attendance, Finance and Access.
- Academics and Portfolio are combined under Learning without changing their handlers.
- Portal, kiosk and family credentials are contained in Access instead of a permanent sidebar.
- Existing enrollment, payment, schedule, project, credential and confirmation actions remain wired to their original handlers and permissions.
- The complete student editor uses grouped learner, family and care sections, persistent save controls, mobile scrolling and shared form treatment.

## 011Y guide

- `EducationGuide` is the canonical wrapper around `ParentO11Y`.
- It supports hero, compact and inline modes plus welcome, attention, empty, validation, success, complete and contextual states.
- State and message changes increment the Rive cue. Runtime inspection confirmed the Rive `Hit` input receives the cue.
- Guidance text uses `aria-live` for save and validation feedback. Artwork is decorative.
- Compact guidance can be dismissed for the session and reduced motion removes layout movement.
- Dashboard and Student Details now use the contextual guide instead of a fixed mascot cue.

## Verification

- `npm run build` — passed.
- `node scripts/check-education-system.mjs` — 53 token, contrast, module contract and reduced motion checks passed.
- `git diff --check` — passed; line ending notices only.
- Local demo shell checked at 1422 px and 390 px.
- Signed-in school account checked read-only with real Student data at desktop/tablet width and 390 px.
- Light and dark hierarchy checked.
- Workspace panel, outside/`Escape` close and focus restoration checked.
- Command palette mouse and keyboard routing checked.
- Student Overview, Learning, Attendance, Finance and Access checked read-only.
- Full student form opened, scrolled and cancelled on desktop and 390 px; no record was saved.
- No authentication, authorization, schema, financial calculation or production record change.

## Reconciliation boundary

The existing broad generic module CSS changes and unfinished Archive, Communications, Marketing, Media, Settings, Staff Absence, Team, Toolkit, Tools and Workshop Quality edits remain preserved but are not part of this approved reference commit. They must be classified and reconciled module by module after Phase 1 approval.

## Review links

- Signed-in local app: `http://127.0.0.1:5202/`
- Safe local demo: `http://127.0.0.1:5203/`
- Same-Wi-Fi demo: `http://10.145.145.113:5203/`

## Next gate

Stop for visual approval of the shell, Student Details, complete form and 011Y behavior. After approval, continue in order: Settings, Finance, Expenses, then the remaining modules.
