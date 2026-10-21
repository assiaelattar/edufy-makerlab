# Learning and Portfolio Design System v1 completion — 2026-10-20

## Scope and ownership

This focused worktree changes Learning, its owned project surfaces, Portfolio, and a disposable browser fixture. It does not change the Students register, Student Details, shared Design System foundations, permissions, Firestore collections, XP calculations, or SparkQuest routes. No school record was written and no branch was pushed or deployed.

The 2026-10-19 Learning/Portfolio rollout had already added the canonical outer shell. A screen-level inspection found controls that were still hidden, unreachable, or disconnected inside that shell. This pass completes those reachable paths while retaining their existing handlers.

## Reachable surface inventory

| Surface | Existing path and behavior | This pass | Isolated browser coverage |
| --- | --- | --- | --- |
| Learning route / curriculum factory | Hero, next action, five workflow destinations, station catalog, grade coverage | Preserved data summary; made station actions explicit and keyboard operable; applied scoped token roles | 390px/1440px, light/dark |
| Station drilldown / template list | Open projects, create mission, template actions | Kept existing handlers and working context | Source inspected; station navigation exercised in fixture |
| Project factory dialog | Details, Resources, Workflow, Targeting, Publishing; draft/featured/assigned status | Connected labels, required title, named resource inputs/actions, pressed states, keyboard status choices, due date label, visible save language | Four viewport/theme combinations; five sections, cross-tab required validation, cancel, pending, failure/retry success |
| Studio overview | Learner project cards and summary | Exposed Overview / Commit history / Review queue navigation; mounted managed project dialog for all project actions; removed dead Start session control | Populated project open and mobile dialog |
| Commit history | Search, status filter, project cards | Added filter names and keyboard project-card activation; removed 390px horizontal overflow | Search/filter and keyboard open at 390px |
| Studio review queue | Submitted project cards, review action | Kept existing review handler; navigation now reachable | Populated queue at 390px |
| Direct Review route | Pending list, identity/year reconciliation and review action | Applied scoped canonical review surface; retained reconciliation and review handlers | Populated queue and empty state inspected synthetically |
| Managed student project dialog | Header, mission/resources, three-column board, step controls, history, commit, proof/step edit, submission | Repaired frame, title, stage rail and phone board scrolling; kept learner identity on staff save; made commit and step-edit writes use current form values and retain drafts on failure | Four viewport/theme combinations for managed, history, commit and step-edit dialogs; cancel, pending, failure/retry, incomplete and successful submission exercised |
| Staff Portfolio register inside Learning | Search and learner links | Preserved existing searchable register and clear-search state | Source inspected; register/empty behavior checked in fixture |
| Setup / Workflows | Register, edit/create, phases, default/delete | Fixed dialog reachability, labels, pending state and recoverable save error | Create, simulated failure retaining draft, retry/success |
| Setup / Stations | Register, activation by grade, editor | Fixed dialog reachability, pressed state, labels, pending/error state | Four viewport/theme combinations; cancel, pending, failure/retry success |
| Setup / Badges | Formerly blank tab and unreachable editor | Added badge register, create/edit/delete/seed access; corrected color options; pending/error state | Four viewport/theme combinations; cancel, pending, failure/retry success |
| Learner Portfolio route | Next action, XP/level, published cards, badge collection, external/share actions | Corrected progress and unpublished copy; removed invented badge XP; unified primary action color | Populated and empty at 390px/1440px, light/dark; primary action color checked |
| Restricted Learning state | Staff without `learning.manage` | Shows explicit access state | Fixture role=readonly at 390px |

The old `track` branch and the older learner wizard/selector code still exist in source but are not destinations of the current staff five-step navigation. They were not claimed as browser-covered surfaces. Student Details' embedded portfolio is separately owned.

## Page and dialog matrix

The isolated browser pass covered all four layout combinations: 390px and 1440px, each in light and dark. For every row, the heading was present and document width matched the viewport; for dialogs, the dialog body had no horizontal overflow.

| Learning page family | Four-combination result |
| --- | --- |
| Curriculum, Studio, Reviews, staff Portfolios, Setup | Pass |
| Studio Overview, Commit history, Review queue | Pass |
| Setup Workflows, Stations, Badges | Pass |
| Portfolio populated, Portfolio empty | Pass |

| Reachable dialog | Four-combination result |
| --- | --- |
| Project factory; managed student project; project history; save version; edit step | Pass |
| Review submission; workflow editor; station editor; badge editor | Pass |

The managed project mobile capture shows the full title and all four stages without clipping. The older `Proof of Work Required` dialog remains in source but is unreachable from the current staff-managed path; the reachable step evidence editor was tested. No browser coverage is claimed for that legacy dialog.

## Interaction evidence

| Path | Isolated result |
| --- | --- |
| Project factory | Cancel caused no write; missing title/description from Publishing returned to Details with visible error; pending disabled both save controls; simulated failure retained the draft; retry created a template. |
| Managed project save | Commit and step edit retained current input on simulated failure and persisted the current values on retry. The saved project retained the learner's ID and name when edited by staff. Older history entries without snapshots show disabled `Snapshot unavailable`. |
| Submission | Incomplete project showed `Mission incomplete` with no write. Complete project disabled submit while pending; simulated failure left the project open with an alert; retry saved `submitted` and showed `Project submitted`. |
| Review | Cancel caused no write. Request Changes retained feedback and dialog after simulated failure; retry saved status and feedback. Approve & Publish saved `published` with feedback. |
| Setup | Workflow, station and badge blank-create, cancel, pending, failure and retry-success paths passed with synthetic writes. |
| Portfolio/register | Populated and empty Portfolio were inspected; staff register search/no-result/clear, restricted Learning state and reduced-motion board transition were also checked. |

## Evidence and checks

- Local, disposable preview: `node scripts/preview-pulse-learning.mjs`, `http://127.0.0.1:5248/`. Its Firebase/Auth/AppContext/SparkQuest adapters return example-only objects, `example.invalid` identities and pending synthetic writes; it cannot reach school records. Query parameters select `page=learning|portfolio`, `theme=light|dark`, `scenario=empty`, and `role=readonly|staff|student`.
- Representative synthetic captures: [Curriculum mobile light](pulse-evidence/learning-curriculum-mobile-light-synthetic-2026-10-20.png), [managed project mobile dark](pulse-evidence/learning-project-mobile-dark-synthetic-2026-10-20.png), [badge editor desktop dark](pulse-evidence/learning-badge-desktop-dark-synthetic-2026-10-20.png), [Portfolio populated mobile light](pulse-evidence/portfolio-populated-mobile-light-synthetic-2026-10-20.png), and [Portfolio empty desktop dark](pulse-evidence/portfolio-empty-desktop-dark-synthetic-2026-10-20.png).
- All interaction writes above were held, rejected, and resolved by a disposable fixture. These outcomes are not Firestore acceptance.
- `npm.cmd run build` passed. `node scripts/check-education-system.mjs` passed 27 token, contrast, dialog and reduced-motion checks. `node scripts/atlas-loop-agent.js` and `git diff --check` passed.
- `npx.cmd tsc --noEmit` remains red on repository-wide existing diagnostics. In assigned files, the pre-existing issues are `ProjectTemplate.stepResources`, optional Firestore `db` overloads and legacy `StationType` comparisons. The newly introduced optional-name checks were corrected before handoff. The production build does not run TypeScript checking.

## Acceptance boundary

The current worktree was not loaded into an authenticated school session. Real populated and learner-specific records, real write results, external SparkQuest destinations, physical phone behavior and actual permission combinations still need signed-in read-only review or explicit authorized write testing. The fixture does not simulate AppContext listener/loading failures. The legacy proof dialog, legacy learner wizard and `track` branch are outside reachable staff browser coverage. Keep the rollout release hold until those gates and the user's visual review are complete.

The build retains the existing Firebase mixed static/dynamic import and large chunk warnings; this pass does not change bundling.
