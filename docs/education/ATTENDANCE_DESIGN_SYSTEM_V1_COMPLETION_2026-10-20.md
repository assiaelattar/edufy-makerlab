# Attendance Design System v1 — focused completion

Date: 2026-10-20. Scope: daily Attendance register, learner Attendance history, and the separately installed FaceID Attendance preview. Local UI only; no school-data mutation, push or deployment.

## Inventory and evidence

Status key: **migrated** means the local component uses the canonical Design System v1 presentation; **preserved** means the existing workflow/handler remains authoritative. Browser checks used the actual components with the isolated fixture at `http://127.0.0.1:5231/`. The signed-in app at `http://127.0.0.1:5202/` was inspected read-only and runs a different checkout.

| Surface or state | Inspected / local status | Browser evidence | Gap |
| --- | --- | --- | --- |
| Attendance entry, date controls and daily progress | Inspected; migrated | Synthetic 1440/390 light/dark; signed-in 11 scheduled places, one session | Real-school write acceptance open |
| Continuous session rail and learner register | Inspected; migrated; unselected controls now have canonical tactile outlines | Synthetic populated two-session fixture in four viewport/theme combinations; signed-in register read-only | Physical-phone acceptance open |
| Search and group filter | Inspected; preserved | Synthetic no-match/clear and Inventors filter (two rows) | Real-account filter interaction not repeated |
| Previous/next day, today, future preview | Inspected; preserved | Synthetic next-day navigation to 2026-10-27 locked all marks | Native date picker not exercised on a physical phone |
| Present/late/absent/excused marks | Inspected; migrated; existing write payload unchanged | Synthetic pending, failure, retry and acknowledged success; late exception retained | No production mark submitted |
| Individual clear confirmation | Inspected; preserved | Synthetic cancel, failed delete retaining late, retry and acknowledged clear | Fixture confirmation is a semantic stand-in, not the shared modal focus trap |
| Session selection and batch confirmation | Inspected; preserved | Synthetic select, cancel, pending, success and failure; existing exception retained | Multi-chunk partial-save path above 400 rows not browser exercised |
| Save success/error feedback | Inspected; migrated | Synthetic live feedback for individual and batch outcomes | Real connection failure not induced |
| No sessions / no filter matches | Inspected; migrated | Synthetic `scenario=empty` and no-match search | None for UI state |
| Loading / read error / permission restriction | Inspected; migrated to shared EducationState | Synthetic `scenario=loading`, `error`, `permission` at 390px dark; no overflow | Restricted signed-in role not available; data-layer authorization untouched |
| Membership renewal disclosure and learner link | Inspected; migrated from legacy amber card to neutral register with orange due cue | Synthetic expanded renewal at 390px dark; signed-in one renewal, disclosure not opened | Linked profile navigation only synthetically verified by existing handler |
| Learner profile Attendance tab, counts and four statuses | Inspected; migrated status cues and action controls | Synthetic four-record/empty history at desktop and 390px in both themes; signed-in one-record profile read-only | Real print/share not invoked |
| Learner Attendance report print and WhatsApp share | Inspected; preserved handlers and disabled empty state | Synthetic buttons available for records and disabled when empty | Print output and external WhatsApp handoff not accepted in this pass |
| Installed FaceID Attendance idle/open preview | Inspected; migrated to scoped canonical surfaces and clearer preview copy | Synthetic desktop/390px light/dark, idle/open toggle, no overflow | Recognition service, camera and scan persistence are not connected in existing app |
| FaceID recent scans and manage-profiles disabled state | Inspected; migrated visual shell; preserved disabled control | Synthetic idle/open text and disabled manage-profiles button | No actual scans or profile management available |

No Attendance-specific editor, export menu or additional dialog exists in these surfaces. The learner print action is the Attendance export path. Main register confirmations are provided by the existing shared ConfirmContext and were not altered.

## Workflow and visual decisions

The working order remains date → progress → searchable register → session actions → renewal follow-up. Green identifies Attendance, blue drives operations and selection, purple labels session/learning context, orange marks late and renewal follow-up, red marks absence/errors, and dense learner rows stay neutral. The profile history uses red for absent, orange for late, green for present and purple for excused. The FaceID app now calls its local-only toggle a **preview** so it does not imply a live camera or recorded check-in.

Reused `EducationBadge`, `EducationButton`, `EducationState`, `EducationStatusPill`, existing Atlas layout primitives, shared tokens and the existing workspace-state helper. No new shared component, schema, role, hook, Firestore command, attendance calculation or enrollment rule was introduced.

## Verification

- Synthetic browser: exact 1440 and 390 CSS-pixel viewport checks in light/dark for register, learner history and FaceID layout families. No page-level horizontal overflow; the long register and FaceID page scroll. Keyboard Tab from search exposes a visible group-filter outline. Reduced-motion emulation removes decorative mark-button transition.
- Signed-in read-only app: populated Attendance register (11 places, one session, one renewal) and one-record learner Attendance history at desktop and 390px. No screenshots of school records retained.
- `npm.cmd run build`: pass; existing mixed Firebase import and large-chunk warnings remain.
- `node scripts/check-education-system.mjs`: 27 checks pass on this branch.
- `node scripts/test-membership-lifecycle.mjs`: pass.
- `node scripts/atlas-loop-agent.js`: context reader pass; repository has no dedicated agent-check command.
- `npx.cmd tsc --noEmit --pretty false`: repository-wide check exits nonzero with 235 existing diagnostics; none name the changed Attendance application files.
- `git diff --check`: pass.

Preview queries: `?page=register|history|face&theme=light|dark`. Register scenarios: `scenario=empty|loading|error|permission|renewal`; history uses `scenario=empty`. The server uses actual components and isolated mock Firebase operations. Browser screenshots were inspected in the local browser but not committed; committed older `pulse-evidence/ds-v1-attendance-*` captures predate this focused repair.

## Remaining acceptance

Real Attendance writes, restricted-role sign-in, actual print/WhatsApp output, shared confirmation focus containment, a physical phone and connected FaceID recognition remain unverified. These require their own safe acceptance path; synthetic outcomes are not production persistence evidence.
