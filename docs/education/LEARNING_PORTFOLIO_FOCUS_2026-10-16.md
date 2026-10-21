# Learning and Portfolio — focused school workspace

Date: 2026-10-16. Local candidate on `agent/edufy-school-theme-20261015`; no production release or data mutation.

## Operator and learner flow

- The instructor Learning entry now leads with one action derived from existing project and template state: review submitted evidence, create the first mission, inspect active studio work, or open published portfolios. The existing mission form, review tab, portfolio tab and studio remain the destinations. Five signal counts follow the action.
- The Learning command, signals and route use the school light/dark variables rather than hard-coded colors. At narrow widths the route scrolls horizontally within its own bounds; the action and count cards remain readable.
- The learner's Portfolio now places an actual continuation ahead of level metrics: an editable in-progress project, a submitted project awaiting review, published work, or the first-project route. Project buttons use SparkQuest's existing `?projectId=` deep link, which `sparkquest/App.tsx` consumes only for a signed-in student. The focus is therefore shown only for the student portfolio audience; staff with a Maker Pro portfolio route retain their existing view.
- No project status, submission, review decision, identity match, permission, tenant selector, Firestore write, or SparkQuest component was changed.

## Checks and acceptance

- Production build passes with existing bundle/import warnings.
- Repository-wide TypeScript remains red on established errors. The LearningView diagnostics are in unchanged legacy code; PortfolioView has no diagnostic.
- A temporary write-free visual fixture, removed after inspection, showed light and dark surfaces at a measured 390 CSS px with `documentElement.scrollWidth === clientWidth === 390`; buttons reached 44 px. The fixture exposed a dark-theme button-background defect, which was corrected before the final check. This checks the focused layout, not signed-in data behavior.
- A designated instructor and learner must check the real task counts, role-specific destinations, both themes and phone scrolling. In particular, the instructor should inspect submitted work and the learner should open their own in-progress/submitted project. No production records were edited for visual QA.
- The local preview serves `http://127.0.0.1:5202/`, but the current Windows Public-network firewall blocks its LAN address. A narrow port-5202/LocalSubnet rule was attempted and returned access denied, so phone access requires the operator's administrator action or a return to a network profile that already permits the preview.
