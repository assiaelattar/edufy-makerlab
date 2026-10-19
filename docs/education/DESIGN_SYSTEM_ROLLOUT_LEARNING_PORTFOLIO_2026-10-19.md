# Edufy Design System v1 — Learning and Portfolio rollout

Local milestone completed on 2026-10-19 under the approved school-team design contract.

## Experience contract applied

- Learning and Portfolio opt into `data-edu-system="1"`, the canonical palette and the shared responsive dialog frame.
- Purple identifies learning and portfolio context. Blue carries operational actions, selection and the next task. Green remains completion. Orange appears only on review, identity or reconciliation work. Red remains destructive/error only.
- Curriculum, Studio, Review, Portfolios and Setup remain one persistent working route. The selected route, studio view, project filters, portfolio search and scroll position are scoped to the signed-in organization/user.
- Project ownership, project status, review, publish, reconciliation, SparkQuest launch, permission and Firestore write handlers are unchanged.

## Learning inventory

| Surface | Status |
| --- | --- |
| Learning priority and real signal counts | Migrated |
| Curriculum, Studio, Review, Portfolios and Setup route | Migrated and retained |
| Curriculum factory, station catalog and grade coverage | Migrated |
| Project register and review queue | Migrated |
| Mission/project create and edit form | Migrated; five steps, mobile scroll and shared dialog behavior verified |
| Workflow, station and badge forms | Migrated to shared dialog frame |
| Submission review, proof and success dialogs | Migrated to shared dialog frame |
| Empty, loading, error and permission behavior | Preserved |

## Portfolio inventory

| Surface | Status |
| --- | --- |
| Staff published-portfolio register | Rebuilt as a searchable working register |
| Active learner count and published-project ordering | Added from existing loaded records |
| Legacy reconciliation attention | Preserved with restrained orange semantics |
| Learner Portfolio hero and next action | Migrated |
| XP, level, shipped and in-progress summaries | Migrated to documented semantic roles |
| Published project gallery, sharing and open actions | Migrated; handlers preserved |
| Badge collection and empty states | Migrated |

## Important interaction correction

The project factory and submission review dialogs were previously mounted only inside the Setup route. A Curriculum action could set its open state without rendering the dialog. Both dialogs now remain mounted at the Learning workspace level, so Create a mission/Create project works from Curriculum while preserving the same handlers. Escape closes the project form and restores focus to its opener.

## Verification

- `npm run build`: pass. Existing Firebase mixed-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 20 token, contrast and reduced-motion checks pass.
- `node scripts/atlas-loop-agent.js`: repository context read succeeds.
- `git diff --check`: pass. The Learning module stylesheet contains no local hex palette literals.
- Actual signed-in browser QA used the local app in light and dark themes at desktop and 390px mobile. Curriculum navigation, mission form steps, long-form scrolling, Escape/focus return, Portfolio search/empty/recovery behavior and mobile register layout were checked without submitting a form.
- Actual read-only data loaded 28 mission templates, 502 learner projects, 33 submitted projects, 144 family-ready projects, 89 identity checks and 188 active learner portfolios. No project, review, publish, badge, station, workflow or reconciliation write was triggered.
- The learner-specific `PortfolioView` was verified by build and code-path inspection. A real student account was not used in this pass, so learner project opening/sharing remains a separate real-account acceptance check.

## Evidence

- `pulse-evidence/learning-desktop-light.png`
- `pulse-evidence/learning-desktop-dark.png`
- `pulse-evidence/learning-mobile-dark.png`
- `pulse-evidence/learning-mission-form-mobile-dark.png`
- `pulse-evidence/learning-portfolios-desktop-light.png`
- `pulse-evidence/learning-portfolios-mobile-light.png`
- Signed-in local app: `http://127.0.0.1:5202/`.

These captures contain signed-in local school data visible during read-only acceptance. They remain local and are not published.

## Boundary

This is a local UI milestone. No deployment, push, authentication change, permission change, project rule change or production write occurred. The recurring rollout automation can now stop because the listed local module sequence is complete.
