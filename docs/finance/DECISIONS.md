# Finance decisions

## 2026-10-20 — Finance completion boundary

- Enforce manager-only Documents access inside the panel as well as the parent Finance view, matching the existing document-ledger persistence rules even when mounted directly.
- Keep receipt controls visible but disabled until payment status is paid or verified in both register and detail, with a reason in the button title.
- Use isolated headless Chromium for exact responsive and file/print checks when the in-app browser viewport/control layer cannot dispatch reliably. Maintain synthetic service boundaries and keep real-account navigation read-only.
- Defer the legacy detail status action's separate payment/enrollment writes to a ledger-safety phase; this UI pass does not rewrite financial persistence.

## 2026-10-20 — Nested Documents visual boundary

- Keep document form styling scoped to the Finance panel so shared Education primitives and other modules are unaffected.
- Use actual document and service components in an isolated browser preview with substituted context/service boundaries; synthetic saves cannot reach the production ledger.
- Suppress document summary totals while the register is loading or has failed. Hide aggregate transaction totals from roles without `finance.view_totals`, while retaining their authorized record list.
- Keep Finance acceptance and release on hold until the listed role, output and browser checks are complete.

## 2026-10-20 — Finance Design System v1 candidate

- Show six Finance jobs directly, with the selected academic period in the header and working view.
- Use shared Education primitives for Finance surfaces, status, progress and actions; use blue for selection and orange for outstanding attention.
- Render statement records as cards on narrow screens and preserve the existing desktop tables and print/export paths.
- Keep the Finance visual pass scoped to view code and isolated QA fixtures. Financial formulas, write handlers, tenant permissions and document identity remain under existing domain ownership.
- Hold full module acceptance until all document and dialog states and real signed-in roles have been reviewed.

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
