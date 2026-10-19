# Edufy Design System v1 — workspace menus and release candidate

Date: 2026-10-19  
Scope: school workspace shell, approved module rollout, release preparation

## What changed

- The left menu now uses the canonical Edufy Design System v1 roles: green identifies the school workspace, blue marks the selected destination, neutral surfaces carry the module hierarchy, and purple identifies the signed-in profile.
- The top menu now separates the page identity and controls from the open workspace tabs. The tab strip remains horizontally scrollable and keeps the existing retained-workspace behavior.
- The mobile shell keeps the same information architecture. It uses a compact top bar, a tactile quick menu and a scrollable left drawer instead of compressing the desktop menu.
- Existing module routes, open-tab state, permissions, authentication, data hooks and write handlers are unchanged.

## Verification

- `npm.cmd run build`: pass.
- Signed-in school account, read-only browser QA: pass.
- Desktop 1440 px: light and dark pass.
- Mobile 390 px: light content shell and dark open drawer pass.
- The active destination remains visible, the left drawer scrolls independently, the top tab strip remains scrollable, and the main page retains vertical scrolling.

Evidence:

- `pulse-evidence/navigation-desktop-light.png`
- `pulse-evidence/navigation-desktop-dark.png`
- `pulse-evidence/navigation-mobile-light.png`
- `pulse-evidence/navigation-mobile-drawer-dark.png`

## Release boundary

The release candidate consists of the completed Edufy Design System v1 rollout for Dashboard, Students and forms, Programs, Attendance, Pickup, Calendar, Admissions and Workshops, Finance and Expenses, Learning and Portfolio, plus the canonical shell menus described above. No authentication, permission-rule, API, schema or financial-logic change belongs to this release.
