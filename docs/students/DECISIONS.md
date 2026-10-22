# Students experience decisions

## 2026-10-22

- Never infer shared parent identity from a surname or a shared phone. A same-alias login is a review candidate, not an automatic link.
- Block accidental issue/replace when an active same-tenant account already uses the alias; let authorized staff confirm a genuinely distinct parent explicitly. Existing families use the exact verified account and guardian-link path.
- Do not alter real DAKY accounts until the exact retained login and parent identity are verified. Preserve learner records and existing sessions during diagnosis.

## 2026-10-20

- Keep the canonical Students directory as the only reachable register route; retain existing App entry handlers for enrollment and Student Details.
- Use `students.edit` for bulk parent-link controls and `finance.view` for account totals/statements. Reuse existing confirmation and persistence commands.
- Treat selection and an open family statement as tenant-specific transient context. Clear selection when roster filters change so a hidden record cannot be linked inadvertently.
- Keep mutation QA inside the synthetic education-system fixture with controllable confirmation, pending, failure, and success states. The fixture never connects to Firestore, so signed-in persistence remains a separate acceptance step.

## 2026-10-15

- Keep profile navigation and passport preview as separate actions. A roster row always opens the learner profile.
- Route missing-field and class-placement actions through the existing editors, using explicit route intent. The enrollment wizard remains the action only when no active enrollment exists.
- Compare possible duplicates read-only. Merging records requires its own audited workflow and cannot be inferred from a name or phone match.
- Keep palette changes inside Students surfaces; do not replace the tenant theme or shared Education UI tokens.
