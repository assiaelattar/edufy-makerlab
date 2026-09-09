# Finance decisions

## 2026-09-09 — independent invoice sequences

- Use one annual counter for formations (`YYYYFnnn`) and another for services (`YYYYSnnn`); credit-note numbering remains unchanged.
- Infer the sequence family of legacy invoices from their explicit marker first, then their stored program/payment context, so a missing counter resumes from persisted history.
- Let organization managers inspect and advance the last-used value. Never allow a manual change to rewind below a persisted or reserved value, preserving uniqueness under concurrent issuance.
- Keep due date in stored/exportable data for compatibility, but omit it and the generic “Document comptable” eyebrow from the printable PDF.

## 2026-09-09 — controlled invoice correction

- Permit managers to correct an active invoice directly from history without consuming a new annual number.
- Preserve immutable identity, sequence, currency and linked program/payment context; only customer snapshot, dates within the numbered year, invoice lines and totals are editable.
- Use an optimistic revision in the existing transaction boundary so stale editors cannot overwrite a newer correction. Credited invoices and credit notes remain locked.

## 2026-09-09 — service catalogue Phase 1

- Separate tenant catalogue; never create fake training programs for services.
- Reuse the current document ledger/counters/credit/print/export; preserve the existing program form as a distinct entry point. Multi-service invoices supported; mixed program-and-service lines are deferred.
- Seed the eight core PDF services, with null prices and explicit application billing defaults. Stable default IDs and an explicit import prevent startup production writes or duplicate imports.
- Keep catalogue edits versioned. Invoice lines contain copied designation/details/quantity/price/tax/unit and source identity/version, with no live catalogue lookup during print/export.
- Match the current server's manager-only invoice permission boundary; do not silently expand the ledger's role grants in an urgent feature.
- Exclude the catalogue from the legacy recursive grant to make schema/version/archive rules enforceable. Preserve all other nested grants.
- Use scoped semantic Atlas CSS, shared Modal, French Finance vocabulary and collapsed optional client fields. No shared design-system changes.
