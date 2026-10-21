# Team decisions

## 2026-10-20

- Keep Team persistence, permissions, tenant filtering and account creation in their existing owners. Presentation changes stay in TeamView and a new Team-only stylesheet; the old stylesheet is shared with Staff Absence and Media and remains untouched.
- Use the shared `ConfirmProvider` in the fixture so staff and project confirmations render as they do in the app.
- Show task due dates where work is assigned and completed; a due date already existed in the task payload but lacked a form control.
- Use 2×2 mobile tabs and vertically stacked task lanes so every destination and status is visible without horizontal page scrolling.

## 2026-10-21

- Keep clipboard checks deterministic in the isolated fixture. Record the payload shape and success/failure outcome without using the system clipboard or storing copied credentials.
- Give the project detail its own Team-scoped surface and text tokens after mobile review exposed weak light-theme contrast.
