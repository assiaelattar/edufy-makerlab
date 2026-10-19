# Edufy Design System v1 — Finance and Expenses rollout

Local milestone completed on 2026-10-19 under the approved school-team design contract.

## Experience contract applied

- Finance and Expenses opt into `data-edu-system="1"`, the canonical palette and the shared dialog frame.
- Green carries the financial workspace identity and confirmed completion. Blue carries operational actions and selection. Orange appears only for due, pending or review work. Purple identifies invoicing and service documents. Red remains reserved for errors or destructive controls.
- Existing collection, balance, verification, follow-up, reporting, invoice, credit-note, export, recurring charge and expense handlers remain authoritative.
- The selected working view, search, session, month, program and relevant ledger filters are retained in browser-tab memory for the signed-in organization/user. Returning to the module also restores its scroll position.
- No calculation, invoice numbering, accounting export, tenant boundary, permission, stored status or write contract changed.

## Finance inventory

| Surface | Status |
| --- | --- |
| Finance priority and task launcher | Migrated |
| Collection, verification, history, follow-up and report workspaces | Migrated |
| Family and learner balance registers | Migrated |
| Desktop tables and mobile record cards | Migrated |
| Search, session, month, program, method and status filters | Migrated and retained |
| Parent bulk payment form | Migrated to shared dialog frame |
| Parent statement dialog | Migrated to shared dialog frame |
| Transaction correction form | Migrated to shared dialog frame |
| Invoice/accounting register | Migrated with purple document context |
| Training invoice form | Migrated; long-form mobile scrolling and focus containment preserved |
| Service catalogue and service invoice forms | Migrated to shared controls/dialogs |
| Empty, loading, error and permission-restricted behavior | Preserved |

## Expenses inventory

| Surface | Status |
| --- | --- |
| Selected-period next action | Migrated |
| Recurring obligation cards | Migrated with status-specific roles |
| Scheduled/manual/paid/due/pending/review states | Preserved and restyled |
| Expense ledger, search and category filters | Migrated and retained |
| Period totals and category breakdown | Migrated |
| Ad-hoc expense form | Migrated to shared mobile dialog frame |
| Recurring payment form | Migrated to shared mobile dialog frame |
| Recurring charge manager | Migrated to shared mobile dialog frame |
| Receipt viewer | Migrated to shared dialog frame |
| CSV export availability and disabled empty state | Preserved |

## Verification

- `npm run build`: pass. Existing Firebase mixed-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 20 token, contrast and reduced-motion checks pass.
- `node scripts/test-service-catalogue.mjs`: catalogue domain, snapshot, totals, print and export checks pass.
- `node scripts/atlas-loop-agent.js`: repository context read succeeds.
- `git diff --check`: pass. The new module stylesheet contains no local hex palette literals.
- Browser QA used the actual signed-in local app at desktop and 390px mobile in light and dark themes. Finance task navigation, invoice register, long invoice form, Expenses recurring states, ledger empty state and ad-hoc expense form were checked. Escape closes dialogs and restores focus. No form was submitted.
- Real-account read-only evidence: Finance loaded 4 retained invoices, 2 companies, 1 participant and MAD 46,440 net invoiced. Expenses loaded 6 due recurring charges and an empty October ledger. No payment, invoice, credit note, service, expense or template write was triggered.

## Evidence

- `pulse-evidence/finance-invoices-desktop-light.png`
- `pulse-evidence/finance-invoices-desktop-dark.png`
- `pulse-evidence/finance-invoices-mobile-dark.png`
- `pulse-evidence/expenses-desktop-light.png`
- `pulse-evidence/expenses-mobile-dark.png`
- `pulse-evidence/expenses-form-mobile-dark.png`
- Signed-in local app: `http://127.0.0.1:5202/`.

These captures contain the signed-in local school data visible during read-only acceptance. They remain local and are not published.

## Known issue and boundary

The signed-in browser log still contains Firestore `permission-denied` entries from restricted snapshot listeners while the authorized Finance and Expenses surfaces continue to load. This pass does not change permissions or security rules; investigate that listener separately before a release if the intended role should receive it.

This is a local UI milestone. No deployment, push, authentication change, permission change, financial-rule change or production write occurred. Next rollout phase: Learning and Portfolio, followed by the consolidated Design System v1 handoff.
