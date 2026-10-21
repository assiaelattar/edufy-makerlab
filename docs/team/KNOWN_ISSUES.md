# Team known issues

## 2026-10-20

- Real school-account read-only review could not run because `127.0.0.1:5202` refused connection.
- TeamView receives no per-listener error from AppContext. Its action failures are visible, but data-listener error/retry requires a shared data-layer contract and was outside Team ownership.
- Real account creation, edits, task/project persistence, chat delivery, clipboard behavior and physical-phone acceptance remain unverified.
- The synthetic follow-up exercised task move/edit/delete, task and project search, credentials copy feedback, and empty project detail. These remain unverified against a signed-in school account.
