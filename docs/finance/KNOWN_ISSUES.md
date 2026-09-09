# Finance known issues

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
