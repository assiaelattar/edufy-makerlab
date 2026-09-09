# Finance changelog

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
