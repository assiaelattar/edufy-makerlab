# Finance known issues

## 2026-10-20 — Expanded Finance candidate acceptance

- The signed-in app at port 5202 serves an earlier checkout. Its Finance home, loaded Collections and Documents register were inspected read-only, but this patch's styling was verified in synthetic previews.
- The dedicated Documents preview now covers nested success, failure, loading, error, empty and manager-boundary states at 390px in both themes. Synthetic invoice, receipt and report print windows and downloaded payment/accounting XLSX rows were inspected; physical Save as PDF and import into a real accounting package remain open.
- Synthetic transfer proof attachment, failed family batch, transaction-detail destination, lifecycle success/failure, follow-up reminder interception, and Reports desktop/empty states passed in standalone Chromium. Real persisted reconciliation, actual role claims, concurrent sequence/correction behavior, external reminder handoff and physical-phone/print behavior remain open.
- The legacy `ActivityDetailsView` status action still updates payment and enrollment in separate writes. The Finance transaction editor uses an atomic path; this older detail action needs a separate ledger-safety review before real lifecycle sign-off. No production write was made in this pass.
- Aggregate transaction summaries are now gated by `finance.view_totals`. Individual permitted payment and family rows retain amounts under the existing `finance.view` contract; any broader amount restriction requires a separate permission decision.

## 2026-10-20 — Design System v1 acceptance gaps

- The earlier candidate's login and Documents-stub limitations were superseded by the expanded pass above. Its remaining output, role and responsive gaps are consolidated there.
- Repository-wide TypeScript reports errors in `FinanceView.tsx` for context/settings typings and filter callbacks; these areas predate this visual patch. Production build passes. Keep this type debt visible until separately resolved.

## Existing constraints retained

- Nested Finance documents, counters and accounting templates are organization-manager-only in current Firestore rules, although existing Finance UI grants include accountant/admission officer permissions. New service features deliberately match actual persistence: active owners, admins and super admins. Enabling non-manager staff requires an explicit permission-alignment phase across all invoice transactions and rules.
- The ledger's existing rules are permissive for organization managers; application-level document immutability does not constitute a comprehensive server-enforced invoice-ledger hardening project. This phase adds strict catalogue rules only.
- Existing issued/credited documents are not a payment-allocation ledger. Service invoices preserve this behavior and do not synthesize payments, balances, statuses or participant enrollments.
- Repository-wide TypeScript has pre-existing failures outside the changed service/Finance files. Production build passes with existing chunk/import warnings.
- Shared Modal's existing focus behavior is preserved (Escape and focus return); a global focus-trap upgrade is outside this phase.
- Invoice corrections record the latest revision number and update time but do not yet expose a human-readable field-by-field revision log. Use an avoir for accounting cancellation; credited documents remain locked.
- Sequence management can safely advance a counter but cannot rewind it. If an incorrect value was advanced too far, recovery needs an audited administrative migration rather than risking reuse of an already reserved number.

## Phase 1 limits

- Source PDF has no prices/tax rates. Staff must set prices; 20% TVA is an editable application default. Currency follows existing organization settings and is snapshotted on issuance.
- Program and service invoice entry points share a register but are separate forms. Mixed training/service documents, stored drafts, recurring invoices, discount models and client master-data CRUD are deferred.
- Client selection is based on previous tenant invoice snapshots. New clients can be entered directly; saving an invoice preserves their billing details.
- Browser verification uses actual components with isolated persistence/identity, not production authentication. Real transaction/security behavior is separately emulator-tested.
- Local rules and UI must be released together through the authorized release workflow in a future task. No production import or deployment happened here.
