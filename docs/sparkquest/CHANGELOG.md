# SparkQuest Mission Experience — Changelog

## 2026-09-26

- Granted the Firebase Storage service agent the dedicated `roles/firebaserules.firestoreServiceAgent` bridge role after production IAM inspection proved it was missing and blocking otherwise-valid uploads.
- Verified the active Storage rules match the repository, then compiled and released Storage and Firestore rules together.
- Reproduced the live permission failure with a legacy learner project that has no `organizationId`, then proved the safe one-time ownership repair.
- Made every learner project save restore the verified Edufy organization and canonical learner identity before Firestore synchronization.
- Made missing tenant fields safe in Firestore rules and added a lean learner-only ownership check so SparkQuest requests stay below the rules expression limit.
- Expanded the isolated Firebase pipeline from 22 to 27 assertions, including the expected denial before tenant repair and the successful media/link submission afterward.
- Reproduced the complete learner showcase transaction in isolated Firebase emulators: screenshot upload, download URL, external link, project cover/media update and `submitted` review status.
- Clarified the learner action as “Submit showcase for review”, prevented duplicate submissions and added upload-versus-save progress plus actionable permission errors.
- Confirmed submitted showcases enter the instructor review queue before becoming published portfolio work.
- Promoted the project thumbnail to the main visual build target with a local STEM fallback illustration.
- Reordered the learner page around problem → engineering cycle → tool bench → project plan → test/proof → skills.
- Added the Ask → Imagine → Build → Test → Share method using calm semantic colors and modern icons.
- Tightened typography and copy so younger learners can scan the mission before reading details.

## 2026-09-25

- Added a canonical, backward-compatible mission brief and readiness projection.
- Connected authoring, assignment, learner preview, project creation snapshot and workspace context.
- Added hierarchy-aware program, grade, group and learner assignment controls.
- Reworked the student mission detail page into a challenge → route → proof → resources → readiness flow.
- Reimagined the learner page as an icon-led, color-coded mission path with concise cards and restrained motion.
- Fixed mission-details scrolling inside SparkQuest’s body-locked application shell.
- Added a development-only representative mission preview for desktop and mobile QA.
- Preserved the existing evidence and resource upload paths.
