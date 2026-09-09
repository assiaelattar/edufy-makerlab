# Service Catalogue — urgent Phase 1

Date: 2026-09-09. Local implementation; no release or production data changes.

## Scope and audit

The explicit urgent service-invoicing request supersedes the completed Admissions Phase 6 as the current work slice. Admissions provider work is untouched. The phase boundary is a complete catalogue and service-invoice workflow on the existing Finance document ledger, without changing payment allocation, training enrollment, role grants, invoice numbering or deployment.

Read before implementation: the five BuildPack runtime entry files, repository AGENTS, Admissions AGENT_CONTEXT, ATLAS_BUILD_CONTEXT, Finance section of actionplan, ATLAS_DESIGN_SYSTEM and EDUCATION_UI_SYSTEM_MAP. The mixed dirty worktree was preserved; no files were staged or committed.

Search–Reuse–Prove findings:

- `FinanceDocumentsPanel.tsx` already owns the invoice register and program form. `InvoiceModal.tsx` separately invoices existing payments. Both call `issueFinanceInvoice`.
- `services/financeDocuments.ts` owns annual counters, idempotency, calculation/normalization, issuance, corporate enrollment and full credit notes. It already accepts multiple lines and invoices without a program.
- `utils/financeDocumentGenerator.ts` and `utils/accountingExport.ts` own print/PDF and exports. The new flow uses both existing mechanisms. Per-line details are escaped and rendered on print output.
- Existing persisted documents copy customer/line values. The new optional service metadata fits this contract; no migration is needed.
- Finance UI permits financial operators, but the existing nested Firestore ledger is granted only through `canManageTenantOrg`. This phase preserves that backend permission boundary. New service actions are visible to active owner/admin/super_admin users, not accountants/admission officers. See KNOWN_ISSUES before expanding staff access.
- The existing program invoice form stored a unit price but exposed no price input. A focused field was added; the rest of the program workflow remains in place.

## Source catalogue

Read all 18 pages of `C:/Users/user/Downloads/Future_Makers_AI_Services_Catalogue_2026.pdf` with pypdf. Visually checked the service map on p4. The eight primary service names are on p4 and their deliverables on p5–12. Embedded defaults preserve those names and deliverables with page provenance:

1. AI Content Studio
2. Chatbots + Personas
3. Voice AI
4. Workflow Automation
5. Specialized AI Agents
6. Web + Applications
7. CRM + Business Systems
8. AI Strategy + Deployment

The engagement paths on p15 are cross-service packages, not additional primary catalogue entries. No prices or tax rates appear in the PDF. Default prices are null (the UI asks for a price); quantity 1, unit Forfait and 20% editable TVA are application defaults, not source claims. A positive price is required at issuance. No extraction step is missing.

## Operator workflow

Finance → invoices → **Catalogue de services**: searchable active/archived list, create/edit, archive/reactivate, direct Facturer action. Eight bundled defaults appear after a successful tenant catalogue read. No startup write occurs. **Enregistrer les services par défaut** explicitly imports missing defaults only, using stable IDs; existing edits/archives survive repeated imports.

**Nouvelle facture de services**: select a client from this organization's existing invoice snapshots or enter a new client; add one or more active services; edit line designation, multiline details, quantity, unit label, price and TVA; review totals; optionally open a clearly unissued print preview; issue using the existing annual sequence; open print/PDF from the saved confirmation or history. Optional contact/address/legal details and dates are collapsed for speed. No participant or program is required and no corporate enrollment is created. Training invoices remain a separate button in the same register.

Catalogue selection copies primitive line values plus service ID/name/version. Subsequent catalogue changes do not affect selected drafts or saved invoices. A per-form idempotency key survives failed issuance retries. Shared normalization drives both service preview and saved totals. NaN, infinity, nonpositive price/quantity and TVA outside 0–100 are rejected. This ledger has no discount field; none was invented.

## Persistence and security

- New collection: `organizations/{organizationId}/serviceCatalogue/{serviceId}`.
- Validated service whitelist, immutable organization/createdAt, version increments and server updatedAt. Stale edits are rejected. Archives replace deletion.
- Explicit rules retain the existing organization-manager access boundary and require an active profile. New catalogue rules reject invalid types/ranges, extra fields, deletes and nested bypass attempts.
- The pre-existing recursive organization rule excludes only `serviceCatalogue`; other nested collections keep their existing grants. The service tests prove normal program issuance, counters, corporate enrollments and credit notes still work.
- No Firestore indexes changed. No rules deployed. Catalogue listener/form state is reset across organization switches; late invoice completion cannot insert an old-organization record into the current register.

## Validation

- `node scripts/test-service-catalogue.mjs`: domain, defaults, archive override, cross-tenant selection, snapshots, validation, rounding, escaped print preview and balanced accounting export.
- Auth/Firestore emulators with `demo-edufy-services`: repeatable imports, optimistic edits/archive/reactivation, snapshot persistence, idempotent issuance, sequence sharing with a training invoice, corporate enrollment compatibility, full credit note, role/tenant/disabled-account/invalid-field/delete/nested-bypass denials.
- `serviceCatalogue.browser.smoke.mjs`: real panel/forms/normalizer/print with mocked identity/persistence and blocked external requests. Catalogue search/edit/archive/reactivate, client selection, two edited service lines, no-write review/preview, failed-save retry, issuance, print, program entry, tenant switch, permission gating, Escape/focus return and zero horizontal overflow at 1440/390 in light/dark themes pass. Uses actual scoped CSS and local equivalents of the shared Modal's Tailwind layout utilities; it is an isolated harness, not a production-authenticated browser session.
- Focused strict TypeScript for service domain/persistence, Finance document generation and test harnesses passes. Repository-wide TypeScript remains failing (708 diagnostic output lines in pre-existing areas); no diagnostics reference the changed Finance/service files.
- Production Vite build passes; existing Firebase static/dynamic import and large chunk warnings remain.
- No repository `agent:check` command exists. Scoped checks and tracked-boundary whitespace checks were used.

### Reproduce

Use the existing project Node installation and dependencies. Test output is written only under ignored `node_modules/.cache/services`.

```powershell
node scripts/test-service-catalogue.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false --strict --skipLibCheck --target ES2020 --moduleResolution bundler --module ESNext --jsx react-jsx --esModuleInterop types/serviceCatalogue.ts utils/serviceCatalogue.ts services/serviceCatalogue.ts services/financeDocuments.ts utils/financeDocumentGenerator.ts components/finance/serviceCatalogue.smoke.ts components/finance/serviceCatalogue.emulator.ts
npm.cmd run build
```

For browser QA set `SERVICES_PLAYWRIGHT_PATH` to an installed Playwright `index.mjs`, optionally `SERVICES_QA_SCREENSHOTS`, and run `node components/finance/serviceCatalogue.browser.smoke.mjs`. The existing cached runtime is recorded in `.agent/LAST_HANDOFF.md`'s previous Admissions section.

For rules QA reuse the portable Java 21 and Firebase emulator cache in the parent workspace `.qa-runtime` (see previous Admissions handoff). Run Firebase CLI `emulators:exec --only auth,firestore --project demo-edufy-services "node scripts/test-service-catalogue.mjs --emulator"`. The harness requires demo project IDs and localhost Auth/Firestore endpoints, rejecting accidental production execution.

## Stop boundary

Stop after this local phase. Release, production import, generalized customer CRM, invoice payment allocation, arbitrary file import, recurring billing, discounts and expanded staff permissions are not part of this phase.
