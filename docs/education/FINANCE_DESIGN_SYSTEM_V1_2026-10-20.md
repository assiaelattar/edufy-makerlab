# Finance Design System v1 audit — 2026-10-20

Status: **local Finance Design System v1 candidate with broad synthetic browser coverage; real-ledger acceptance remains open.** Scope excludes Expenses and Student Details. No production write, push or deployment occurred.

## Implementation

- The Finance home uses Education surfaces, icons, badges, buttons and progress. Payment, Collections, verification, Transactions, Documents and Reports are direct tasks, with academic-period context in the header and work views.
- Collections, Transactions and the family statement use responsive cards, named filters and blue selection. Open balances and overdue attention use orange. A role without `finance.view_totals` does not see the home total, Reports, Collections aggregate tiles, transaction aggregate summaries or exports.
- The Documents register, service catalogue and nested forms use scoped Education field, label, action and status styling. Formation invoice, service invoice, correction, credit, sequence, accounting export/template and catalogue controls have accessible names. Loading, error, empty and restricted states use Education states; loading/error suppress misleading document totals. Both parent and nested Documents views enforce the existing manager-only ledger boundary.
- Transaction detail now gates receipt printing until funds clear, matching the transaction register. Its section heading uses readable theme ink. Financial calculations, ledger writes, invoice identity and numbering, print/export formats and stored records retain their existing handlers. The preview adapters use only synthetic records.

## Surface inventory and evidence

“Synthetic” means the actual component with isolated identity and service/Firestore boundaries. The signed-in read-only app at `http://127.0.0.1:5202/` is an earlier checkout, so it verifies integration and loaded navigation, not this patch's pixels.

| Surface | UI review and states exercised | Remaining acceptance limit |
| --- | --- | --- |
| Overview, period, six tasks, next steps, no-record and restricted states | Synthetic desktop light/dark and 390px dark; empty, admission-officer/list-only and accountant role previews | Real restricted role and physical-phone pass |
| Collections, student/family grouping, search and filters | Synthetic populated/empty desktop and mobile; signed-in read-only loaded Collections | Real payment entry was deliberately not submitted |
| Family statement, children and payment history | Synthetic 390px dark, scrolling, Escape and focus return | Multi-program record and printed statement output |
| Bulk family payment | Synthetic amount above balance and missing proof rejected; cancel, cash allocation, failed batch retaining dialog, image proof attachment and transfer queue success | Persisted ledger reconciliation and physical check proof |
| Transactions, responsive cards, filters and export entry | Synthetic desktop table and 390px cards; invalid custom range/reset; downloaded XLSX has three synthetic rows | Real signed-in detail route and workbook in the production browser |
| Transaction detail, lifecycle, edit and receipt | Actual detail at 1440px/390px light/dark; pending receipt disabled, cleared receipt enabled; edit cancel; deposit preset and synthetic save/failure; receipt popup contains synthetic learner and amount | Real ledger reconciliation and legacy detail status action need a separate atomicity review |
| Upcoming follow-up and reminder | Populated desktop/390px route and synthetic WhatsApp reminder handoff; no external destination opened | Physical messaging handoff with a real authorized user |
| Reports, chart, month and empty selection | 1440px/390px light/dark entry, empty selection, month drilldown and no-record chart state; synthetic print popup inspected | Physical print/PDF and real-data totals review |
| Documents register and permission | Actual panel desktop light/dark and 390px light/dark; register filter; actual invoice print popup; loading/error/empty; admission-officer and accountant manager boundary | Signed-in role matrix and physical Save as PDF |
| Formation invoice | Actual form synthetic required-field validation, issuance success, failed issue retaining dialog; 390px both themes | Other billing-audience combinations and real numbering concurrency |
| Sequences and credit note | Actual dialogs 390px both themes; synthetic success, failed sequence and credit saves; credit linked to original invoice with net amount adjusted | Real concurrent numbering |
| Accounting export and template import | Actual dialog 390px both themes; invalid range, CSV mapping rejection, saved and failed template; downloaded XLSX has three synthetic accounting rows | Production accounting-package import acceptance |
| Service catalogue | Actual panel synthetic search/status, required name, create, archive, reactivate; service smoke passes | Signed-in manager role and edit-conflict scenario |
| Service invoice and correction | Actual form 390px both themes; cancel leaves no issued draft; unissued preview popup; synthetic issue/correction success and failed issue/correction retaining draft and original amount | Real conflict/concurrent correction and signed-in manager review |

Evidence in `pulse-evidence/`: `finance-v1-overview-desktop-light.png`, `finance-v1-collections-mobile-dark.png`, `finance-v1-statement-mobile-dark.png`, `finance-v1-documents-desktop-light.png`, `finance-v1-formation-mobile-light.png`, `finance-v1-service-invoice-mobile-dark.png`, `finance-v1-reports-desktop-light.png`, `finance-v1-reports-mobile-dark.png`, `finance-v1-follow-up-mobile-dark.png`, and `finance-v1-transaction-detail-mobile-dark.png`. Port 5262 renders the real Documents panel with `theme`, `scenario=empty|loading|error`, `role=readonly|accountant`, `save=failure|correction-failure`; port 5261 renders the Finance workspace and transaction detail with `theme`, `scenario=empty`, `role=readonly|accountant`, `save=failure`.

## Verification

- `npm.cmd run build`: pass (existing Firebase mixed-import and bundle-size warnings).
- `node scripts/check-education-system.mjs`: 27 checks pass.
- `node scripts/test-service-catalogue.mjs`: pass.
- `git diff --check`: pass.
- Signed-in app: Finance home, loaded Collections and Documents register inspected read-only without reload or production writes. The signed-in server uses the earlier checkout.
- The in-app browser's later viewport/click control failed; standalone headless Chromium with explicit 1440px/390px viewports completed the remaining synthetic checks. Finance Reports/follow-up/batch/lifecycle/role checks, Documents dialogs/failure/role/print checks and actual transaction-detail checks passed. Browser-generated payment and accounting XLSX files were opened and inspected, and receipt/report/invoice print-window content was read. No live records or external message destination were used.

## Release boundary

Keep the Finance release hold until real-ledger role/persistence, concurrent numbering/correction, physical print and external handoff checks are complete. The local candidate is reviewable but is not a live Finance sign-off. No Expenses or Student Details files were changed.
