# Education UI known issues

## School-day signed-in review

Classes, attendance and Schedule need a designated staff account on desktop and phone to verify real tenant day labels, coverage counts, theme contrast and narrow-screen scrolling. Assignment and attendance writes were not run against production records for visual QA. The local candidate remains unreleased.

## Signed-in acceptance

This worktree has no designated school credentials. A staff account must check Programs, Students and Pickup with real tenant data in both themes on desktop and phone. The local server is available on the same Wi-Fi, but its IP address can change. No pickup release should be executed solely for visual review.

## Repository-wide checks

The production build and touched-file TypeScript scan pass. Whole-repository TypeScript still reports unrelated existing diagnostics; bundle and mixed Firebase import warnings remain. This focus pass does not change those areas.

## Remaining modules

Other modules have a coherent shared shell but should not be described as having a finished task-level redesign. Their order is recorded in `PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.
