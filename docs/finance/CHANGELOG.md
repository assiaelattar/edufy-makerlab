# Finance changelog

## 2026-10-29 — Parent reminder configuration

- Added opt-in tenant reminder rules in Settings for lead days and the due day of monthly payment promises.
- SparkQuest Parent shows a contextual in-app reminder for an unpaid scheduled amount or installment plan; verified ledger payments clear it.
- The current academic year remains the default Finance period even when only older sessions have records. Edufy notification cards now use a light Education-style surface.

## 2026-10-20 — Finance browser completion follow-up

- Verified Reports, populated follow-up, bulk family payment proof/failure, transaction lifecycle/detail/receipt and nested Documents dialogs with standalone Chromium at 1440px and 390px in light/dark themes.
- Inspected synthetic receipt/report/invoice print windows and parsed downloaded payment and accounting XLSX files. Exercised failed formation/service/credit issue, failed correction and failed template save without production writes.
- Aligned the nested Documents manager boundary with the ledger, disabled uncleared receipts in the detail view, and improved the detail heading's theme contrast.
- Recorded remaining real-ledger, role, print and concurrency acceptance limits in the Finance audit.

## 2026-10-20 — Expanded Documents and Finance review

- Applied scoped Design System fields, labels, actions and states to the real Documents panel and nested formation invoice, credit note, sequences, accounting export, service catalogue and service-invoice forms.
- Added synthetic browser adapters for the full Documents panel, including isolated success, failure, loading, error, empty and restricted scenarios; no Firebase records are read or written by the fixture.
- Improved accessible names for invoice/document controls and guarded aggregate transaction totals for roles without `finance.view_totals`.
- Inspected the signed-in earlier-checkout Finance home, Collections and Documents read-only. Full acceptance remains open as recorded in the Education audit; no release action occurred.

## 2026-10-20 — Education workspace visual candidate

- Replaced the Finance landing area with shared Education surfaces, controls, direct task entry and explicit academic-period context.
- Aligned Collections and Transactions selection and outstanding-balance presentation with Design System v1 semantics.
- Added responsive family-statement cards and shared document register states and actions while retaining the existing desktop table and financial handlers.
- Added an isolated Finance UI preview for populated, empty, restricted and synthetic save states; documented the remaining browser and visual acceptance gaps in `docs/education/FINANCE_DESIGN_SYSTEM_V1_2026-10-20.md`.
- Made no change to calculations, invoice numbering, exports, permissions, schema, production data or release state.

## 2026-09-09 — Separate formation/service sequences and cleaner PDF

- Split annual invoice numbering into independent formation (`2026F001`) and service (`2026S001`) sequences.
- Added automatic recovery from the latest saved invoice plus a manager screen to inspect and safely advance each sequence.
- Kept invoice numbers unique by refusing to move a sequence below a number already used or reserved.
- Removed the due-date line and “Document comptable” wording from generated invoice PDFs.
- Extended domain, browser and real Auth/Firestore emulator coverage for the new numbering and controls.

## 2026-09-09 — Invoice corrections from history

- Added a **Modifier** action for active invoices in the Finance document history.
- Reused the service invoice workspace for prefilled customer, date and line corrections while preserving the invoice ID, number, sequence and hidden program/payment references.
- Added transaction-safe revision checks, same-sequence-year enforcement and locks for credit notes and credited invoices.
- Added edit-preview language and desktop/mobile browser coverage; focused TypeScript, browser, emulator and production build checks pass.

## 2026-09-09 — Service Catalogue Phase 1

- Added typed, tenant-scoped service catalogue with eight source-derived defaults, explicit idempotent import, versioned create/edit/archive/reactivation and searchable UI.
- Added the service-invoice workflow using existing client snapshots, editable multiline service snapshots, multi-line totals, unissued preview, idempotent issue, confirmation and print/PDF.
- Extended optional Finance line fields and shared print rendering. Service descriptions are searchable in the register; program price input restored.
- Added enforceable catalogue rules while retaining the current ledger permission grants.
- Added domain/print/export, real Auth/Firestore emulator and isolated browser checks. Focused TypeScript and production build pass; unrelated global TypeScript failures documented.
- Preserved Admissions and all unrelated dirty-worktree changes; no staging, commit, push, deployment, external message or production data mutation.
