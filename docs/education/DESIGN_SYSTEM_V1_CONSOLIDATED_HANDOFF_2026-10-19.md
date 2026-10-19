# Edufy Design System v1 — consolidated local handoff

The approved Notion-inspired school-team workflows and Duolingo-inspired educational character are now established across the planned local rollout. The shared system keeps registers, filters, forms, dialogs, permissions and domain handlers intact while standardizing color meaning, tactile controls, typography, themes and mobile behavior.

## Canonical system

- Owner: `components/education-ui/education-system-v1.css`.
- Opt-in: `data-edu-system="1"`; light/dark continue through the existing school theme.
- Shared behavior: `EducationPrimitives`, `Modal designSystem`, `useWorkspaceViewState` and `useWorkspaceScroll`.
- Meaning: green brand/completion, blue action/selection/info, yellow highlight, orange follow-up/due, purple learning/program context, red destructive/error.
- Module styles arrange layout and map existing classes to shared tokens. They do not define private palettes.

## Rollout status

| Area | Local status | Main evidence |
| --- | --- | --- |
| Dashboard | Approved reference | `DASHBOARD_EDUCATIONAL_2026-10-19.md` |
| Students register, enrollment and complete profile editor | Approved reference | `design-system-v1/IMPLEMENTATION_REPORT.md` |
| Pickup and Classes | Completed earlier local school-workspace passes and retained | `EDUCATIONAL_ROLLOUT_2026-10-19.md`, `EDUFY_PULSE_CLASSES_STUDENTS_2026-10-16.md` |
| Programs | Design System v1 complete | `DESIGN_SYSTEM_ROLLOUT_PROGRAMS_ATTENDANCE_2026-10-19.md` |
| Attendance | Design System v1 complete | `DESIGN_SYSTEM_ROLLOUT_PROGRAMS_ATTENDANCE_2026-10-19.md` |
| Calendar / Global Schedule | Completed and retained | `CALENDAR_EDUCATIONAL_2026-10-19.md` |
| Admissions and Workshops | Design System v1 complete | `DESIGN_SYSTEM_ROLLOUT_ADMISSIONS_WORKSHOPS_2026-10-19.md` |
| Finance and Expenses | Design System v1 complete | `DESIGN_SYSTEM_ROLLOUT_FINANCE_EXPENSES_2026-10-19.md` |
| Learning and Portfolio | Design System v1 complete | `DESIGN_SYSTEM_ROLLOUT_LEARNING_PORTFOLIO_2026-10-19.md` |

## Local commit chain

- `1964ac4` — shared design system and reference flows.
- `0206568` — Programs.
- `da8983a` — Attendance.
- `61765a1` — Admissions and Workshops.
- `551f3b8` — Finance and Expenses.
- Learning and Portfolio: the next focused local commit in this worktree.

Earlier focused Dashboard, Students, Pickup, Programs workspace and Calendar commits remain in history and were preserved rather than rewritten.

## Verification summary

- Every Design System v1 phase passed the production build and the shared token/contrast/reduced-motion check.
- Module-focused tests were retained: membership/program coverage, service catalogue and relevant domain smoke checks.
- Reference and module acceptance covered desktop and 390px mobile, light and dark themes, long forms, dialogs, empty states, focus visibility, scrolling and retained working context.
- Real-account acceptance was read-only. Synthetic fixtures were used only for states that were absent from the signed-in account. No synthetic result is presented as real-school acceptance.

## Remaining release gates

- No push or deployment has occurred from this rollout worktree.
- Run a final physical-phone pass with designated admin/instructor, parent and learner accounts before release. Learner-specific Portfolio and role-specific dashboards still need their exact real-account acceptance.
- Review the restricted Firestore listener that logs `permission-denied` during some signed-in surfaces. The authorized UI continues to load; this rollout intentionally did not change rules or permissions.
- Existing mixed Firebase import and large bundle warnings remain performance follow-ups.
- Production promotion must use the registered release workflow and `origin/main`, with application and MCP changes kept separate.

## Review links

- Actual signed-in local application: `http://127.0.0.1:5202/`.
- Synthetic Design System gallery: `http://127.0.0.1:5246/`.

This handoff closes the planned local module sequence. Authentication, permissions, financial logic, stored records, production data and deployments remain outside this completed UI rollout.
