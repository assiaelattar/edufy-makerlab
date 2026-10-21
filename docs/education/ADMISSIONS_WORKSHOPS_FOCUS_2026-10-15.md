# Education UI — Admissions and Workshops focus

Date: 2026-10-15. Local candidate on `agent/edufy-school-theme-20261015`; no release or production data change.

## Operator flow

1. Admissions opens with the first active family selected by the existing tenant-safe Today projection. The action opens its Family Journey Passport, including on a narrow screen. The priority explicitly reports time since recorded activity and never invents a due date. Existing Today, Pipeline, All cases, repair flags, verified evidence and optional WhatsApp assistant remain intact.
2. Workshops opens with the count of families whose workshop booking is recorded as attended and still has open follow-up. A dedicated list exposes the family, workshop and saved session date before the existing contact, enrollment and CRM actions. When follow-up is clear, the priority points to the next generated session in the selected calendar window. The calendar, templates, capacity and booking actions remain accessible.
3. The priority and working surfaces use restrained school blue and neutral light/dark tokens. The older workshop calendar and family passport keep their full information. The `?ui=atlas-legacy` rollback does not show the new Workshop priority or Follow-up tab.

The follow-up queue reads actual tenant-bound bookings. Contact opens WhatsApp only after an operator click; it does not claim a message was sent. Enrollment and CRM actions retain their existing confirmation, exact-link checks and write handlers. This phase changes no schema, permission, API, Firebase rule or index.

## Verification and acceptance

- `npm run build` passes with existing bundle/import warnings.
- `git diff --check` passes; no TypeScript diagnostics occur in changed TSX files. Repository-wide TypeScript still has unrelated existing diagnostics.
- Admissions adapter/selector smoke passes 22 scenarios; workshop-link smoke passes 11 scenarios.
- A designated school account still needs desktop and physical-phone review of real families, booking statuses, light/dark contrast, follow-up actions and mobile scrolling. No production family was contacted, enrolled or changed during local visual review.

Next priority after this phase: Finance and Expenses.
