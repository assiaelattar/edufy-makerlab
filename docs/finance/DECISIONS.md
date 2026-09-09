# Finance decisions

## 2026-09-09 — service catalogue Phase 1

- Separate tenant catalogue; never create fake training programs for services.
- Reuse the current document ledger/counters/credit/print/export; preserve the existing program form as a distinct entry point. Multi-service invoices supported; mixed program-and-service lines are deferred.
- Seed the eight core PDF services, with null prices and explicit application billing defaults. Stable default IDs and an explicit import prevent startup production writes or duplicate imports.
- Keep catalogue edits versioned. Invoice lines contain copied designation/details/quantity/price/tax/unit and source identity/version, with no live catalogue lookup during print/export.
- Match the current server's manager-only invoice permission boundary; do not silently expand the ledger's role grants in an urgent feature.
- Exclude the catalogue from the legacy recursive grant to make schema/version/archive rules enforceable. Preserve all other nested grants.
- Use scoped semantic Atlas CSS, shared Modal, French Finance vocabulary and collapsed optional client fields. No shared design-system changes.
