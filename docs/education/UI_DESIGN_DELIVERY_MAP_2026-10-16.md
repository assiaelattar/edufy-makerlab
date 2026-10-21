# Edufy school UI — release source and local candidates

Checked 2026-10-16. Public Edufy at `https://edufy.makerlab.academy/` answered HTTP 200. `origin/main` is `c8806f7`; this designer worktree continues from its own equivalent school-theme commits and is not a deployment source. The public bundle was not authenticated or compared byte-for-byte with Git main, so "main" below means code on the release branch, not a signed-in production acceptance.

| Area | `origin/main` release source | Designer checkout |
| --- | --- | --- |
| School shell and Dashboard | Light default, dark option, school-day navigation and login data readiness | Same design direction; local loading parity from `c8806f7` |
| Programs, Students, Pickup | Task-level school operations passes already on main | Corresponding focused passes preserved |
| Classes, Attendance, Schedule | School-day task passes already on main | Earlier passes preserved; local Pulse Attendance benchmark now supersedes the Attendance presentation |
| Admissions, Workshops | Shared shell and earlier module baseline | Family priority and attended-booking follow-up in local commit `42e0f95` |
| Finance, Expenses | Existing task-first Finance and baseline Expenses | Recurring obligation focus and light/dark treatment in local commit `c465dc1` |
| Learning, Portfolio | Shared school shell and module baseline | Instructor next action and learner portfolio continuation, this new local phase |
| Communications, Team, Resources, Admin and other modules | Shared shell and compatibility styles | No task-level redesign claimed in this phase |

Release and real-account acceptance are separate from this map. The new Learning/Portfolio phase is documented in `LEARNING_PORTFOLIO_FOCUS_2026-10-16.md`.

Pulse first benchmark: `EDUFY_PULSE_ATTENDANCE_2026-10-16.md`, on `agent/edufy-pulse-attendance-20261016`. This new local phase was not released; the remote-main evidence above is the earlier check, not a new production verification.
