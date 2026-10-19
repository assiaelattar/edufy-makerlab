# Edufy Design System v1 — approved reference and rollout contract

Status: the user approved the Dashboard, Students register, enrollment wizard and complete student editor on 2026-10-19. Programs, Attendance, Admissions, Workshops, Finance, Expenses, Learning and Portfolio now consume this contract. The planned local rollout is complete; see `../DESIGN_SYSTEM_V1_CONSOLIDATED_HANDOFF_2026-10-19.md`. This document supersedes earlier instructions to reduce the interface to green/blue or neutral-only counters. It evolves the existing Education primitives; it is not a second component stack.

## Product contract

The audience is school staff. Prioritize decisions, today's sessions and follow-up; then supporting measurements. Preserve the adopted sidebar, working views, filters and contextual navigation. A learner record opens its profile; its separate next-step control previews the operational passport. Returning restores view context. Forms explain the current step, expose required fields and retain edits after failure.

The visual character is rounded, colorful and tactile: Nunito headings and prominent labels, DM Sans body/data, outlined cards, solid button depth, expressive but meaningful icons. Use the adopted 011Y in welcome, onboarding, empty or completion contexts, never as an obstruction to a register. No invented points, streaks or school performance scores.

## Canonical owners

- `components/education-ui/education-system-v1.css`: scoped tokens, semantic color ramps, theme behavior and shared controls. Opt in with `data-edu-system="1"`; the existing `data-edu-theme` selects light/dark.
- `components/education-ui/EducationPrimitives.tsx`: shared Education components and typed action/status/accent contracts.
- `components/Modal.tsx`: common dialog behavior; `designSystem` opts into this frame. `StudentDetailsForm` is the reusable full profile editor. EnrollmentWizard owns the existing four-step journey.

The legacy token bridge lives only in the shared stylesheet. Module styles may arrange layout, map old classes to shared tokens and add responsive behavior. They must not define new color literals, copied palettes or independent button systems. Unmigrated modules retain their styling until explicitly adopted.

## Palette and balance

| Token | Base | Meaning |
| --- | --- | --- |
| green | #58CC02 | Brand and completion |
| blue | #1CB0F6 | Primary operational actions, selection, information |
| yellow | #FFC800 | Attention and highlights |
| orange | #FF9600 | Follow-up and time-sensitive attention |
| purple | #CE82FF | Learning and program context |
| red | #FF4B4B | Errors and destructive actions |

Each color has base, edge, soft and ink tokens. Use ink on soft surfaces, `--ds-on-color` on saturated fills. The six colors are available across the app; do not force six colors into every screen. Red is reserved for an actual error/danger. Selection stays blue even when the selected filter concerns orange attention items. Status labels/icons remain present independently of color.

Large colored areas express identity or meaningful context: the green welcome, purple program focus, and small softly tinted summaries. Working registers and form fields retain readable surface backgrounds. Use orange to identify follow-up, not to color every metric. Do not recolor ordinary profile avatars as if the person themselves were an error.

Light and dark use the same base hues and meanings; soft/ink ramps adapt for contrast. Never place the light-theme dark ink on a dark soft surface.

## Geometry, typography and motion

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 px. Cards 24 px radius, controls 12–14 px, buttons at least 44 px high.
- Headings: Nunito 800–900; page title 28–40 px depending on space; section headings 20–24 px. Body: DM Sans 14–16 px; labels 13–14 px. Avoid uppercase paragraphs and mono text for normal instructions.
- Two-pixel outlines, four-pixel lower button borders; press translates by two pixels. Avoid floating gradients and oversized soft shadows.
- Short 120–160 ms state transitions. Reduced-motion removes decorative movement. The Rive renderer pauses after its greeting and redraws a still frame after resize; it does not loop continuously.
- Mobile keeps work order intact, stacks form fields, exposes filters through disclosure and uses a full-height scrolling dialog. Horizontal scrolling is limited to explicit tab/filter rails, not the page.

## Component contracts

| Concern | Reuse |
| --- | --- |
| Action hierarchy | EducationButton: primary / secondary / quiet |
| Meaning | EducationStatus: neutral / success / info / attention / warning / danger |
| Illustration/category | EducationAccent: green / blue / yellow / orange / purple / red |
| Structure | EducationSurface, EducationSectionHeader, EducationToolbar, EducationTabs, EducationDetailPanel |
| Contextual actions | EducationActionMenu: native disclosure, ordinary tab stops, Escape/focus return |
| Feedback | EducationBadge, EducationNotice, EducationState, EducationProgress |
| Forms | EducationField, EducationFormSection, StudentDetailsForm |
| Dialogs | Modal with designSystem; named title, Escape, focus containment/restore |
| Register/detail pattern | Students reference: persistent filters, separate row/profile and next-step actions, operational passport |

Selection and destructive actions use semantic props, not arbitrary accents. Form components own presentation and accessibility; existing hooks/handlers remain the only owners of authorization, validation and persistence. Existing EnrollmentWizard props are preserved. Modal gains only an optional presentation opt-in. No public API, stored schema, permission, authentication or financial-rule migration is introduced.

## Review and rollout

Run `node scripts/preview-education-system.mjs`, then open http://127.0.0.1:5246/. Switch Dashboard / Students / Student forms / Design system and use the theme button. This server binds to the local network for phone review and serves only synthetic data. Reload rebuilds the fixture bundle.

The real app remains at http://127.0.0.1:5202/. The preview renders actual Dashboard, Students, EnrollmentWizard and StudentDetailsForm components with isolated data boundaries. The profile between the register and editor is explicitly a fixture; the actual application retains its full profile.

Dashboard, Students and both forms are the approved reference. Programs, Attendance, Admissions, Workshops, Finance, Expenses, Learning and Portfolio now consume the contract; see the four `DESIGN_SYSTEM_ROLLOUT_*_2026-10-19.md` reports and `../DESIGN_SYSTEM_V1_CONSOLIDATED_HANDOFF_2026-10-19.md`. Further agents receive MODULE_BRIEF.md, the gallery and ACCEPTANCE.md. New module work should reuse this package rather than inventing colors or interaction patterns.
