# Admissions Offer, Finance, and Enrollment Handoff

## Ownership

- Programs owns the price catalog on each `ProgramPack`.
- The enrollment wizard owns fee agreement and final enrollment creation.
- Finance owns payment evidence, verification, cleared totals, receipts, and reconciliation.
- Admissions retains the stable case relationship and reads these domain facts; it does not recalculate them.

## Offer snapshot

When enrollment starts from a same-tenant Admissions case, the successful enrollment stores an immutable `offerSnapshot` containing:

- Admissions case and source lead IDs;
- canonical program ID/name and exact pack name;
- selected payment plan;
- all positive price fields configured on that Program pack;
- the existing guided-enrollment standard price field and amount;
- agreed amount, non-negative discount, MAD currency, and quote time.

The snapshot contains no payment or enrollment status. It is embedded on the resulting enrollment so historical context remains stable if Program pricing changes later.

## Financial facts

These facts are intentionally independent:

| Fact | Evidence | Does it clear balance? |
|---|---|---|
| Promise | enrollment payment promise | No |
| Proof received | transfer has `proofUrl` | No |
| Awaiting verification | payment is `pending_verification` | No |
| Check in progress | `check_received` or `check_deposited` | No |
| Cleared payment | Finance status is `paid` or `verified` | Yes |
| Rejected | `check_bounced` | No |

The pure Admissions summary reports each amount separately. It never derives clearance from a promise, uploaded proof, payment method, or WhatsApp interaction.

## Successful enrollment boundary

Lead prefill records a tenant-bound origin object using the explicit lead ID. Workshop prefill carries this object only when the shared stable-link resolver returns a same-tenant case. Phone matches are never used.

The enrollment, initial payment ledger records, new-student origin fields, and lead conversion link are committed in one Firestore batch. The lead receives `convertedStudentId`, `enrollmentId`, `convertedAt`, and a conversion timeline entry only when that batch succeeds. Cash starts cleared; transfers start pending verification; checks start received.

Student/auth preparation still precedes this batch in the legacy wizard. If the final batch fails, a prepared learner/account record can remain and must be reviewed before retrying; it does not receive an Admissions origin link or successful enrollment claim.

## Compatibility

- Generic student and class enrollment clears any previous Admissions origin.
- Closing the wizard clears the origin.
- Public enrollment continues to create a lead only.
- Existing enrollments and payments remain readable because every new field is optional.
- No migration, rules/index change, provider integration, or production write is required.
