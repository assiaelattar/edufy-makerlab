# Finance module context

Service Catalogue Phase 1 is complete locally. Read `docs/finance/SERVICE_CATALOGUE_PHASE_1.md`, `DECISIONS.md` and `KNOWN_ISSUES.md` before edits.

- Preserve both existing program and payment invoice flows. Do not represent a service as a program/enrollment.
- `services/financeDocuments.ts` owns numbering, normalization, snapshots, issuance and credits. `FinanceDocumentsPanel.tsx` is the register; `InvoiceModal.tsx` is the existing payment invoice flow.
- Catalogue canonical boundaries: `types/serviceCatalogue.ts`, `utils/serviceCatalogue.ts`, `services/serviceCatalogue.ts`. Stable eight-entry defaults use PDF p4–12, without invented prices. Reads never seed production.
- ServiceCataloguePanel owns catalogue CRUD/search. ServiceInvoiceModal owns temporary editable invoice lines and reuses existing persistence, print and export. Print/export must never resolve current catalogue defaults for a historical invoice.
- Respect the existing manager-only nested ledger rule boundary. New catalogue rules exclude the legacy recursive grant and enforce active profile, organization, schema, version and archive-only lifecycle.
- Keep scoped Atlas CSS; preserve shared Modal and Education design system.
- Test through `scripts/test-service-catalogue.mjs`, demo-only emulator mode, focused TypeScript, the isolated browser smoke and build. Update `.agent` handoff and `docs/finance` before stopping. No implicit release or production import.
