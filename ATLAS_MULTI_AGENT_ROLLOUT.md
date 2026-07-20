# Atlas Multi-Agent UI Rollout

This rollout adapts Edufy modules to the Atlas UI system without allowing parallel work to damage shared behavior or overwrite unrelated changes.

## Integration Owner

The integration owner is the only worker allowed to edit:

- `index.css`
- `components/layouts/AdminLayout.tsx`
- `components/atlas/*`
- package and lock files
- shared modal, context, registry, type, and routing files
- Atlas design and build documentation

The integration owner builds the foundation, assigns disjoint module groups, reviews every returned patch, and runs the final build and visual checks.

## Agent Rules

1. Read `ATLAS_DESIGN_SYSTEM.md` before editing.
2. Edit only the explicitly assigned view files.
3. Preserve business logic, permissions, organization scoping, and existing changes.
4. Use existing Atlas primitives. Do not create local copies of shared components.
5. Do not add dependencies, global CSS, tokens, or registry changes.
6. Replace native `alert`, `confirm`, and `prompt` only inside assigned files using the shared confirmation context.
7. Run `npm.cmd run build` before returning.
8. Report changed files, verification, and residual risk.

## Acceptance Gate

Every module group must pass:

- Production build.
- `git diff --check` for assigned files.
- Native-dialog scan for assigned files.
- No writes outside assigned scope.
- Command header and compact primary actions where appropriate.
- Responsive behavior from 320px mobile to wide desktop.
- Visible keyboard focus and accessible labels for icon controls.
- Empty, loading, error, and permission states remain understandable.
- No decorative orbs, nested cards, oversized in-app headings, or broad entrance motion.

## Current ERP Feature Wave

The visual rollout is complete. This wave focuses on Edufy ERP operational depth, not Maker Pro or SparkQuest.

### Students

- `views/StudentsView.tsx`
- `views/StudentDetailsView.tsx`
- Student Academics, Access, Attendance, and Portfolio tabs

### Programs and Enrollment

- `views/ProgramsView.tsx`
- `views/ProgramDetailsView.tsx`
- `views/EnrollmentFormsView.tsx`

### Finance and Expenses

- `views/FinanceView.tsx`
- `views/ExpensesView.tsx`
- Student Finance tab

### Attendance and Schedule

- `views/ClassesView.tsx`
- `views/CalendarView.tsx`
- `views/AbsenceView.tsx`
- `views/StaffAbsenceView.tsx`

### Workshops

- `views/WorkshopsView.tsx`
- `views/WorkshopQualityView.tsx`
- Workshop Action Center and report modal

### CRM and Marketing

- `views/MarketingView.tsx`
- Lead, campaign, chat import, and campaign kit workflows

### Integration-Owned In This Wave

- Fixed desktop ERP shell and stable scrollbar gutter.
- Route-level scroll reset and focus management.
- Cross-module contract review and production verification.

## Planned ERP Waves

### Wave 2: Daily Operations

- Communications
- Pickup
- Team and staff operations
- Toolkit, media, and archive

### Wave 3: Platform Operations

- Settings and roles
- SaaS administration
- Marketplace and installed tools
- Audit trail and privileged server workflows

## Merge Order

1. Shared foundation.
2. Smallest module group first.
3. Attendance and other high-frequency workflows.
4. Settings and platform administration.
5. Cross-module responsive visual review.
6. Final production build and runtime log review.

Never merge all module groups at once. A passing build after each group keeps regressions attributable and reversible.
