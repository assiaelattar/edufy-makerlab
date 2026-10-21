# Students experience changelog

## 2026-10-20 — Register and owned dialogs

- Kept the canonical register as the Students route and disabled its legacy query escape.
- Migrated parent linking and financial statements to the shared Design System v1 dialog treatment without changing commands or financial calculations.
- Gated bulk linking and account figures/actions by existing permissions; cleared transient selection and statement context on tenant change.
- Removed the duplicate legacy floating bulk bar from the canonical register and clarified learner, archived, passport, and family empty states.
- Added synthetic confirmation/save controls for parent linking and archive QA; verified 1440/390 light/dark layouts, keyboard flow, restricted roles, statement filtering/printing, and save failure/retry paths.
- Recorded the full inventory, browser evidence, and remaining integrated checks in `STUDENTS_REGISTER_DS_2026-10-20.md`.

## 2026-10-15 — School-theme passport preview

- The direct learner-row profile route remains. A labelled next-step control opens the operational passport and scrolls to it on a narrow screen.
- A worklist with no matching learners no longer shows an unrelated selected passport.
- The operations desk uses the selected school light/dark theme tokens across its header, worklist, passport, filters, and family surfaces.

## 2026-10-15 — Student roster and profile navigation

- The learner row opens the full profile; a separate eye control previews the operational passport.
- The passport's next action opens the relevant editor field, enrollment wizard, existing class placement editor, or matching-record comparison.
- Student view moved to the left side of the profile hero.
- Student roster and profile surfaces use scoped blue and green gradients with visible keyboard focus.
