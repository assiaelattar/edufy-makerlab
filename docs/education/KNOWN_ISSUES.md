# Education UI known issues

## 2026-10-16 — Sign-in acceptance

The startup change passes the production build. The repository-wide TypeScript check still reports 634 existing diagnostic lines and none in the three changed TSX files. A designated signed-in staff session is still needed to measure phone/desktop startup time and confirm that the first school view has its student, program and enrollment records. Finance, workshop and other module totals may fill in immediately after the workspace opens. No production account or record was changed during code verification.

## School-day signed-in review

Classes, attendance and Schedule need a designated staff account on desktop and phone to verify real tenant day labels, coverage counts, theme contrast and narrow-screen scrolling. Assignment and attendance writes were not run against production records for visual QA. The local candidate remains unreleased.

## Signed-in acceptance

This worktree has no designated school credentials. A staff account must check Programs, Students and Pickup with real tenant data in both themes on desktop and phone. The local server is available on the same Wi-Fi, but its IP address can change. No pickup release should be executed solely for visual review.

## Repository-wide checks

The production build and touched-file TypeScript scan pass. Whole-repository TypeScript still reports unrelated existing diagnostics; bundle and mixed Firebase import warnings remain. This focus pass does not change those areas.

## Remaining modules

Other modules have a coherent shared shell but should not be described as having a finished task-level redesign. Their order is recorded in `PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.
