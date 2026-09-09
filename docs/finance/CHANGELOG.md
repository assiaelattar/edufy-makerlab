# Finance changelog

## 2026-09-09 — Service Catalogue Phase 1

- Added typed, tenant-scoped service catalogue with eight source-derived defaults, explicit idempotent import, versioned create/edit/archive/reactivation and searchable UI.
- Added the service-invoice workflow using existing client snapshots, editable multiline service snapshots, multi-line totals, unissued preview, idempotent issue, confirmation and print/PDF.
- Extended optional Finance line fields and shared print rendering. Service descriptions are searchable in the register; program price input restored.
- Added enforceable catalogue rules while retaining the current ledger permission grants.
- Added domain/print/export, real Auth/Firestore emulator and isolated browser checks. Focused TypeScript and production build pass; unrelated global TypeScript failures documented.
- Preserved Admissions and all unrelated dirty-worktree changes; no staging, commit, push, deployment, external message or production data mutation.
