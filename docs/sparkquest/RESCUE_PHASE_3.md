# SparkQuest Rescue Phase 3 — Student pipeline and performance

Completed locally on 2026-09-24. A narrow production `student_projects` create/update permission hotfix was deployed later that day; the rest of this phase remains local.

## Objective

Make the signed-in learner path fast and coherent: see instructor missions, create a personal project, progress through its steps, attach evidence, and use focus history without permission-error noise.

## Implemented

- Removed the artificial boot delay and lazy-loaded the student wizard, instructor factory, enhanced project details, and parent showcase.
- Reduced student startup subscriptions to the two catalogues the learner flow actually needs. Focus history now loads only when the productivity dashboard opens, and the closed pickup modal no longer creates a Firestore listener.
- Started independent project, enrollment, program, station, and template reads concurrently.
- Made an explicit student assignment authoritative before grade/group filtering, while using the latest active enrollment only as fallback targeting context. New work always uses the current academic year.
- Allowed verified learners to start personal and showcase projects even when a current-year enrollment record is missing. Project ownership still requires the canonical tenant-bound learner identity.
- Stopped retrying permanent Firestore permission/auth/argument failures.
- Replaced base64 evidence writes inside project documents with resumable Firebase Storage uploads. Firestore stores the resulting URL only.
- Added tenant/user/project-scoped Storage rules and canonical learner support for `focus_sessions` in Firestore rules.
- Added an isolated student-pipeline emulator scenario covering instructor mission creation, learner visibility, project creation, step/evidence metadata updates, focus history, and cross-learner denial.

## Validation

- `npm.cmd run build` passed: 2,215 modules.
- Initial production JavaScript is now 1,106.68 kB / 291.84 kB gzip, down from approximately 1,416 kB / 365 kB gzip. StudentWizard and InstructorFactory are separate chunks.
- Auth + Firestore emulator: 7 assertions passed.
- Signed-in local browser: dashboard ready in approximately 3.2 seconds after reload; New Project and Showcase Project are enabled; no fresh Firestore permission errors appeared.
- The existing Tailwind CDN development warning and Firebase mixed static/dynamic import warning remain.

## Security and release boundary

No production learner/project record was created or changed. On 2026-09-24, only the canonical learner-owned `student_projects` create/update rule was promoted to the default Firestore database as ruleset `80bea234-b931-4202-8de5-50d7c1c32a25`. It compiled without errors or warnings and was verified after release. No application bundle, Storage rule, index, API, Git commit, push, or Hostinger release was published. The live account was used only for read-only dashboard verification.

The Storage emulator could not be executed because the required Storage rules runtime JAR was not cached and network download was unavailable. Upload code and rules build locally, but Storage authorization still needs emulator proof before release. Production will not receive the new focus/upload policy until the reviewed Firestore and Storage rules are deployed together with the client.

Stop at this boundary. The next phase is a production-readiness/release gate, not another client fallback.
