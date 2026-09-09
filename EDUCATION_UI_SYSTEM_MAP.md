# Edufy Education UI System Map

This map keeps the visual migration deliberate and reversible. Each module must preserve its existing data, permissions, and actions while its information architecture is redesigned around the operator's real job.

## Shared component vocabulary

| Primitive | Purpose | Current use |
| --- | --- | --- |
| `EducationSurface` | Semantic white, lime, warm, dark, and outline surfaces | Dashboard metrics and work areas |
| `EducationButton` | Primary, secondary, and quiet actions with consistent states | Dashboard quick actions and section actions |
| `EducationKicker` | Short contextual labels | Dashboard sections |
| `EducationSectionHeader` | Title, explanation, and one clear action | School day, finance, and workshop sections |
| `EducationProgress` | Accessible, text-backed readiness indicators | Operations readiness |

The Education UI is the default for authenticated workspaces. Module styles use `.edu-v1` roots and the compatibility bridge is scoped by the authenticated body class; public routes remain unchanged. `?ui=atlas-legacy` provides a temporary, non-persistent rollback.

## Module migration status

| Module | UX archetype | Status | Safety boundary |
| --- | --- | --- | --- |
| Admin shell | One responsive school-workspace navigation plus closable workspace tabs | Production default | All permission and route callbacks are preserved |
| Dashboard | Daily school command center | Production default | Existing selectors, derived data, actions, and dialogs are preserved |
| Students and families | Action-first operations desk with learner and household passports | Focused redesign approved | Existing filters, search, records, bulk actions, family statements, and profile routes are preserved |
| Student profile | Learner record, signals, access, and action timeline | Focused redesign approved | Existing tabs, account actions, and record workflows are preserved |
| Classes and attendance | Session-first school-day workspace | Focused redesign complete | Existing class, roster, attendance, and absence behavior is preserved |
| Global schedule | Weekly planning and conflict workspace | Focused redesign complete | Existing event navigation and scheduling behavior is preserved |
| Programs and workshops | Program operations, capacity, quality, and workshop pipeline | Programs focused redesign complete; workshops pending | Existing program, roster, quality, and follow-up actions are preserved |
| Finance and expenses | Collection, invoicing, verification, and reconciliation workspace | Finance focused redesign complete; expenses pending | Existing finance permissions, records, forms, and exports are preserved |
| Learning and portfolio | Learning lifecycle, evidence, portfolio, and review workspace | Shell integrated; deep redesign pending | Existing curriculum, portfolio, and review actions are preserved |
| Family journey | Marketing, communications, enrollment forms, and pickup flow | Shell integrated; deep redesign pending | Existing CRM, messaging, form, and pickup actions are preserved |
| Team operations | Team directory, staff attendance, and media library | Shell integrated; deep redesign pending | Existing staff, absence, project, privacy, and gallery behavior is preserved |
| Resources | Toolkit and archive workspace | Shell integrated; deep redesign pending | Existing resource and archive actions are preserved |
| Admin and platform | Settings, admin tools, Marketplace, and SaaS administration | Shell integrated; deep redesign pending | Existing tenant, entitlement, app, and platform controls are preserved |
| Role and public surfaces | Instructor, parent, student, login, booking, and enrollment experiences | Compatibility pass only; deep redesign pending | Existing authentication and public form behavior is preserved |
| Installed apps | Shared marketplace-app frame with app-specific task flows | Compatibility pass only; app-specific redesign pending | Existing app implementations and entitlements are preserved |

## Dashboard UX contract

- Answer “What requires attention today?” before presenting analytics.
- Keep the school-day timeline and attendance action above the fold.
- Show only actionable follow-ups in the attention queue.
- Connect finance signals to existing finance routes and filters.
- Preserve live workshop follow-up actions instead of replacing them with decorative mock data.
- Retain academic-session selection and reuse the dashboard's existing derived data.

## Application shell UX contract

- Use one persistent, searchable sidebar on desktop and one drawer on smaller screens; never render a second icon rail.
- Keep the full permission-filtered module map in the same navigation surface, with the five most frequent destinations mirrored in the mobile bottom bar.
- Preserve favorites, hidden modules, installed apps, tenant context, notifications, density, compact mode, workspace tabs, tab closing, and drag reordering.
- Use one light Education UI canvas across navigation and module content instead of retaining the previous dark Atlas frame.
- Production activation: authenticated workspaces use Education UI by default from 2026-09-09. `?ui=atlas-legacy` remains a temporary non-persistent rollback route.
- Keep every navigation target and module callback unchanged so the shell redesign cannot alter business behavior.
- Adapt at 900px: the sidebar becomes a drawer and a five-item bottom bar provides frequent destinations.

## Approval gate

The shell, Dashboard, Students, Student profile, Programs, Program details, and Finance now have focused UX redesigns in production. The remaining modules are connected through the compatibility layer but must not be described as finished until each receives the same workflow-level pass.

## Focused module contract

- Students starts with real operational blockers instead of a generic directory: contact gaps, enrollment decisions, class placement, and duplicate review. Optional profile cleanup remains available as a separate smart view instead of inflating the urgent queue.
- The smart roster keeps direct search, Program/Audience/Level/Day/Archived filters, active-filter feedback, reset, multi-select, parent linking, and all existing mutations. Selecting a learner updates a persistent operational passport rather than navigating away immediately.
- Families is a first-class mode with household search, sibling context, expected/paid/balance signals, learner profile routes, and the existing statement workflow.
- Student profiles keep actions, signals, learning, finance, attendance, portfolio, and access in one command center.
- Programs starts with portfolio health and next actions; each program opens into readiness, schedule, roster, waiting list, finance, and sharing without returning to the legacy visual hierarchy.
- Finance starts with the operator's job rather than a ledger: record, collect, verify, find history, or prepare accounting. Desktop keeps dense tables where useful; mobile uses purpose-built balance and transaction cards.
