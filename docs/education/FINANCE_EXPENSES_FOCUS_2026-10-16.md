# Finance and Expenses — focused school workspace

Date: 2026-10-16. Local candidate on `agent/edufy-school-theme-20261015`; no release or production data mutation.

## Operator flow

- Finance retains its existing task-first collection, verification, history, and accounting routes. The focused change gives its command, task, ledger, and mobile surfaces semantic school colors in light and dark themes.
- Expenses now places period/session selection, the next recurring obligation, and charge cards before the four summary metrics. The next-step action opens the existing payment form only for a due charge and a user with `expenses.manage`; otherwise it navigates to the relevant recurring card or ledger.
- A linked expense with stored `status: pending` now appears as a pending ledger record, not a paid recurring charge. Its action opens the ledger filtered to that exact template; it does not create a duplicate payment. A linked paid expense remains paid. Weekly templates remain manual because their schema has no occurrence schedule.
- If historical edits or concurrent submissions leave several records linked to one template/month, the card says "Review records" instead of arbitrarily choosing paid or pending. The ledger shows only the matching template entries, with a visible way to restore all expenses; records are preserved.
- Month and date defaults use the device's local calendar. The month label is parsed as a local calendar month to avoid timezone rollover.

## Boundaries and proof

Existing Finance and Expenses records, subscription sources, validation, tenant checks, permissions, document generation, exports, and write handlers remain authoritative. This pass changes presentation and the recurring status projection. It does not change Firestore rules, indexes, schema, API, or payment accounting.

`npm run build` and `git diff --check` pass. The TypeScript scan has no `ExpensesView` diagnostic; `FinanceView` retains pre-existing diagnostics, and the only TSX change there is a CSS import. Repository-wide TypeScript remains red from those and other established errors. `node scripts/atlas-loop-agent.js` is the repository agent check. Real signed-in Finance and Expenses review in both themes on desktop and a physical phone is still required. Verify pending, paid, due, duplicate and weekly recurring cases, permission-limited controls, and navigation to the ledger. The local preview is on the same Wi-Fi at port 5202; its IP address can change.
