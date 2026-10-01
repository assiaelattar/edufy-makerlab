# SparkQuest Rescue Phase 4 — Instructor mission dispatch

Completed locally on 2026-09-24.

## Objective

Make the instructor path coherent and safe from mission creation through assignment and learner visibility. An assignment must target an Edufy grade, one or more groups, or canonical learner IDs without creating or rewriting enrollment records.

## Implemented

- Replaced the disconnected dashboard cards with a mission-dispatch board showing draft, assigned, in-progress, and review stages.
- Reworked the mission library around one clear create/assign workflow, meaningful status filters, audience summaries, and accessible controls.
- Rebuilt assignment as a two-step audience and review flow supporting whole-grade, selected-group, and specific-student delivery.
- Removed the former assignment behavior that created fake `enrollments` using the mission ID as `programId`.
- Added one canonical mission-assignment domain contract shared by instructor writes and learner visibility checks.
- Direct student targeting uses canonical learner document IDs and remains authoritative when grade/group metadata changes.
- Mission creation and updates now persist the instructor organization, creator/audit timestamps, and fail clearly when required title or audience fields are missing.
- Programs, enrollments, projects, users, and students used by the instructor pipeline remain tenant-scoped. Learner/user lists no longer merge identities using name, email, phone, or birth date.
- Removed the instructor localhost fallback and unsafe reset-data navigation action.
- Added keyboard focus, 44px interaction targets, inline errors, loading feedback, responsive modal layout, and reduced-motion handling.

## Validation

- Mission audience domain smoke: 7 assertions passed.
- SparkQuest TypeScript: `npm.cmd exec tsc -- --noEmit` passed.
- SparkQuest production build: 2,216 modules passed.
- Auth + Firestore emulator: 7 pipeline assertions passed, including instructor mission creation, learner visibility, project creation/update, focus history, and cross-learner denial.
- `git diff --check -- sparkquest` passed.

Existing Firebase mixed static/dynamic import and large initial-chunk warnings remain.

## Release boundary

No real learner, enrollment, mission, or project record was created or changed. No Firestore/Storage rule, index, API, Git commit, push, Hostinger release, or client deployment was performed. The existing production `student_projects` permission hotfix remains live; this Phase 4 instructor/client work is local only.

Before production release, visually verify the instructor account at desktop and phone widths, run the assignment flow with designated test records, and coordinate the client with the still-pending Phase 3 Firestore/Storage rule release.
