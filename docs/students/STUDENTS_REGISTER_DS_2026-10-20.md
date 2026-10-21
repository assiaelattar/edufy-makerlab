# Students register Design System v1 audit — 2026-10-20

## Boundary and result

This worktree owns `StudentsView`, the operational register and its scoped CSS. Student Details, the shared shell and primitives, Enrollment Wizard, Admissions, and other modules were not edited. The canonical Students workspace is now the only reachable register route; `?ui=atlas-legacy` no longer opens the duplicate directory. Existing profile, enrollment, status, parent-link, and statement commands and financial calculations remain in place.

The parent-link and financial-statement dialogs use the shared Design System v1 frame. Parent linking uses shared fields and buttons, keyboard-operable contact suggestions, replacement guidance, confirmation, and retained draft on failure. Bulk selection requires `students.edit`; account facts and statement actions require `finance.view`. Selection clears when tenant, roster filters, search, or view changes. An open statement closes on tenant change. The canonical register no longer renders the duplicate legacy floating bulk bar. Empty learner, archived, passport, and family states now have contextual copy.

## Surface inventory and browser acceptance

All browser results below use the local synthetic fixture at `http://127.0.0.1:5246/`. Its confirmation, save, failure, and success controls are stubs in `scripts/fixtures/education-system-adapter.jsx`; they never connect to a school record. The signed-in application for this worktree was not exercised. `Inspected` means route/source ownership and behavior were reviewed; `Synthetic` means the named browser interaction was observed.

| Surface / state | Source | Synthetic browser result | Remaining integrated check |
| --- | --- | --- | --- |
| Students landing, summary, Add student, Quick enroll | Inspected | 1440/390 light/dark layouts inspected; actions present | Follow existing App/Enrollment Wizard entry in signed-in tenant |
| Directory rows and exact profile route | Inspected | Search for Sam returned one row; profile opened; Back retained search and passport context | Verify real profile route and scroll restoration |
| Smart views | Inspected | All 6, needs action 3, contact gaps 1, profile details 0, not enrolled 1, needs class 1, duplicates 0 | Counts with tenant records |
| Advanced search and filters | Inspected | Disclosure, program, level/day, adult zero result, clear, archive zero result, and selection reset observed | Archived record and reactivation data path |
| Bulk selection and parent-link entry | Inspected | Row selection, clear, one inline action, and no duplicate floating bar observed | Staff role policy at route/data layer |
| Operational passport, next step and readiness | Inspected | Selected record, next-step preview, facts, and 390 scroll observed | Each issue type with designated records |
| Duplicate comparison | Inspected | No duplicate fixture record; read-only navigation retained | Real candidate comparison; no merge exists |
| Families list, search, inferred household and learner route | Inspected | Five families; search one and zero result; clear; selected detail; phone layout | Validate family identity against designated accounts |
| Family balance and statement entry | Inspected | Two-program Noor account: expected MAD 1,400, paid MAD 1,050, balance MAD 350; 390/1440 light/dark | Confirm ledger against tenant finance records |
| Parent-link dialog, lookup and validation | Inspected | Four viewport/theme captures; contact suggestion selected; required fields, invalid phone, replacement summary observed | Real directory contact matching |
| Parent-link keyboard and save states | Inspected | Escape, focus restore, Shift+Tab/Tab wrap, cancel, pending disabled actions, failure draft retention, retry success observed | Persistence and alert behavior in signed-in tenant |
| Statement program filter, breakdown and print | Inspected | Both programs total MAD 350; Robotics-only MAD 250; phone body scrolled to footer; generated print tab inspected | Printer-specific output and tenant data |
| Archive confirmation and alerts | Inspected | Cancel, pending, simulated failure, retry, simulated success status observed | Real archived record, reactivation, and list refresh |
| Restricted roles | Inspected | `role=students-only` hid balances and statement; `role=readonly` hid edit, enrollment, bulk and finance actions | Authorization enforced by real role/data rules |
| Empty learners, archived, families, passport | Inspected | `scenario=empty` and archived zero-result copy/action checked | Actual empty tenant and archived record |
| Loading, data error/retry, no Students permission | Inspected upstream ownership | No local route-level fixture for these AppContext states | App/route owner acceptance |
| Admissions tab, Student Details and Enrollment Wizard implementation | Inspected as entry boundaries | Tab/entry controls visible; implementations outside this module | Owning module acceptance |

## Visual and interaction evidence

The `docs/students/evidence/` folder contains 1440 and 390 px light/dark captures for the register, family view, parent-link dialog, and statement; plus the synthetic print tab, read-only role, finance-restricted role, and empty roster. No page-level horizontal overflow was observed at either viewport. The phone statement body scrolled to its Close/Print footer, and the phone parent-link body stayed within the 844 px viewport. The dark family due/settled labels were corrected to semantic ink colors and visually rechecked. In Chrome reduced-motion emulation, the module button transition dropped from 0.14 s to approximately 0 s; the emulation was reset afterward.

## Verification

- `npm.cmd ci --ignore-scripts --prefer-offline --no-audit --no-fund` installed this isolated worktree's dependencies without changing package manifests.
- `npm.cmd run build`: passed, 2,432 modules transformed. Existing Firebase mixed-import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 27 token, contrast, dialog-contract and reduced-motion checks passed.
- `git diff --check`: passed.
- Repository-wide `tsc --noEmit` reported six known diagnostics outside these Students files; a filtered run found zero diagnostics in either changed Students TypeScript file.
- No production school-data write, push, or deployment occurred.

## Limits and handoff

The synthetic write stub confirms UI timing and error handling, not Firestore persistence or a refreshed archived list. Reactivation has no inactive fixture record and was source reviewed only. Family grouping still infers households from normalized phone; a shared phone is not verified family identity. Student-specific finance/contact authorization at the route and data layer, loading/error states, and signed-in tenant acceptance remain with the relevant owners. The available signed-in localhost app served another checkout and was not used as evidence for this branch.
